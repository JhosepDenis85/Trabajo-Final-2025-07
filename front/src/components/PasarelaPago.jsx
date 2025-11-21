import React, { useState, useEffect, useCallback } from 'react';
import { Elements, useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiGetDraft, apiCreateIntent, apiMarkStatus, getUserId } from '../services/api';
import { guardarDraftLocal, leerDraftLocal } from '../config/database/database';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PK);
const apiBase = import.meta.env.VITE_API_BASE;

function PaymentForm({ clientSecret, onPaid, email }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const pagar = async () => {
    if (!stripe || !elements || !clientSecret) return;
    setProcessing(true);
    setErrorMsg('');
    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: { email }
        },
        receipt_email: email
      });
      if (error) setErrorMsg(error.message);
      else onPaid(paymentIntent);
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ marginTop: 18 }}>
      <CardElement
        options={{
          style: {
            base: { fontSize: '14px', color: '#222', '::placeholder': { color: '#9e9e9e' } },
            invalid: { color: '#fa755a' }
          }
        }}
      />
      <button
        onClick={pagar}
        disabled={!stripe || processing}
        style={{
          marginTop: 24,
          width: '100%',
          padding: '18px 26px',
          fontSize: 22,
          background: '#0069d9',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          letterSpacing: '1px'
        }}
      >
        {processing ? 'Procesando...' : 'PAGAR'}
      </button>
      {errorMsg && <p style={{ color: '#c00', fontSize: 12, marginTop: 8 }}>{errorMsg}</p>}
    </div>
  );
}

export default function PasarelaPago({ token }) {
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [draft, setDraft] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [msg, setMsg] = useState('');
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [creatingIntent, setCreatingIntent] = useState(false);

  useEffect(() => {
    if (token) {
      const extracted = getUserId(token);
      if (extracted) setUserId(extracted);
    }
  }, [token]);

  const cargarDraft = useCallback(async () => {
    if (!token) return;
    setLoadingDraft(true);
    setMsg('');
    try {
      const data = await apiGetDraft(token, apiBase, userId || null);
      if (data.orderDraftId) {
        setDraft(data);
        guardarDraftLocal(data.orderDraftId, data.totalPagar);
      } else {
        setMsg(data.message || 'Error al cargar carrito');
      }
    } catch {
      setMsg('Error red al cargar carrito');
    } finally {
      setLoadingDraft(false);
    }
  }, [token, userId]);

  useEffect(() => {
    const local = leerDraftLocal();
    if (local && !draft) cargarDraft();
  }, [draft, cargarDraft]);

  const crearIntento = async () => {
    if (!draft?.orderDraftId || !email) return;
    setCreatingIntent(true);
    setMsg('');
    try {
      const data = await apiCreateIntent(token, apiBase, userId || null, draft.orderDraftId, email);
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setMsg('Intento creado. Ingrese datos de tarjeta.');
      } else {
        setMsg(data.message || 'No se pudo crear intento');
      }
    } catch {
      setMsg('Error red creando intento');
    } finally {
      setCreatingIntent(false);
    }
  };

  const onPaid = async (pi) => {
    setMsg(`Stripe: ${pi.status}. Validando...`);
    const r = await apiMarkStatus(token, apiBase, userId || null, draft.orderDraftId, 'PAGADO');
    if (r.estado === 'PAGADO') setMsg('Pedido pagado y confirmado.');
    else setMsg(r.message || 'No confirmado');
  };

  return (
    <div style={{ maxWidth: 1150, margin: '35px auto', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ marginBottom: 30 }}>Pasarela de Pago - Supermercado</h1>
      <div style={{ display: 'flex', gap: 42 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, fontWeight: 'bold' }}>Token JWT (solo lectura)</label>
          <textarea
            style={{ width: '100%', height: 70, fontSize: 11 }}
            value={token || ''}
            readOnly
            placeholder="Pegue JWT"
          />
          <label style={{ fontSize: 12, fontWeight: 'bold', marginTop: 14, display: 'block' }}>Correo autenticado (Gmail)</label>
          <input
            style={{ width: '100%', padding: 11, border: '1px solid #ccc', borderRadius: 4 }}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value.trim())}
            placeholder="correo@gmail.com"
          />
          <button
            onClick={cargarDraft}
            disabled={!token || loadingDraft}
            style={{
              marginTop: 16,
              padding: '10px 20px',
              background: '#111',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            {loadingDraft ? 'Cargando...' : 'Refrescar Carrito'}
          </button>
          <div style={{ marginTop: 30 }}>
            <h2 style={{ margin: '0 0 14px 0', fontSize: 20 }}>Importe Total de la Compra</h2>
            <div style={{ fontSize: 46, fontWeight: 600 }}>
              {draft ? `${draft.totalPagar.toFixed(2)} PEN` : '0.00 PEN'}
            </div>
            <div style={{
              marginTop: 20,
              fontSize: 13,
              maxHeight: 210,
              overflowY: 'auto',
              border: '1px solid #eee',
              padding: 14,
              borderRadius: 6
            }}>
              {draft?.productos?.length ? (
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                  {draft.productos.map(p => (
                    <li key={p.code}>{p.name} x {p.quantity} – S/ {(p.price * p.quantity).toFixed(2)}</li>
                  ))}
                </ul>
              ) : <p>Sin datos de carrito.</p>}
            </div>
          </div>
        </div>
        <div style={{ flex: 1, background: '#fff', border: '1px solid #dcdcdc', borderRadius: 8, padding: 32 }}>
          <h2 style={{ marginTop: 0 }}>Método de Pago (Stripe)</h2>
          {!clientSecret && (
            <button
              onClick={crearIntento}
              disabled={!draft || !email || creatingIntent}
              style={{
                width: '100%',
                padding: '16px 24px',
                background: '#007bff',
                color: '#fff',
                fontSize: 16,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer'
              }}
            >
              {creatingIntent ? 'Creando intento...' : 'Generar Intento de Pago'}
            </button>
          )}
          {clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm clientSecret={clientSecret} onPaid={onPaid} email={email} />
            </Elements>
          )}
          <p style={{ marginTop: 14, fontSize: 11, color: '#555' }}>
            Draft: {draft?.orderDraftId || '(sin)'} | ClientSecret: {clientSecret ? clientSecret.slice(0, 28) + '...' : '(sin)'}
          </p>
          {msg && <p style={{ fontSize: 13 }}>{msg}</p>}
        </div>
      </div>
    </div>
  );
}