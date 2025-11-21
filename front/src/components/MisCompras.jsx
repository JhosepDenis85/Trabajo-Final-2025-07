import React, { useState, useEffect } from 'react';
import { apiGetMisCompras } from '../services/api';

const apiBase = import.meta.env.VITE_API_BASE;

export default function MisCompras({ token }) {
  const [status, setStatus] = useState('');
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const limit = 5;

  const cargar = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await apiGetMisCompras(token, apiBase, { status: status || undefined, page, limit });
      setData(r);
    } catch {
      setData({ message: 'Error cargando compras' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [token, status, page]);

  return (
    <div style={{ marginTop: 40 }}>
      <h2 style={{ marginBottom: 10 }}>Mis Compras (Estados)</h2>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <select value={status} onChange={e => { setPage(1); setStatus(e.target.value); }}>
          <option value=''>-- Todos los estados --</option>
          <option value='PENDIENTE_DE_PAGO'>PENDIENTE_DE_PAGO</option>
          <option value='PAGADO'>PAGADO</option>
          <option value='RECHAZADO'>RECHAZADO</option>
          <option value='ERROR_PASARELA'>ERROR_PASARELA</option>
        </select>
        <button onClick={() => cargar()} disabled={loading || !token}>
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>
      {!token && <p>Pegue su JWT para ver compras.</p>}
      {data?.message && <p style={{ color: '#c00' }}>{data.message}</p>}
      {data && data.compras && (
        <div>
          <p style={{ fontSize: 12 }}>
            Página {data.pagination.page} de {data.pagination.pages} | Total: {data.pagination.total}
          </p>
          <p style={{ fontSize: 12 }}>
            Resumen: PENDIENTE {data.resumenEstados.PENDIENTE_DE_PAGO} | PAGADO {data.resumenEstados.PAGADO} | RECHAZADO {data.resumenEstados.RECHAZADO} | ERROR {data.resumenEstados.ERROR_PASARELA}
          </p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {data.compras.map(o => (
              <li key={o.draftId} style={{ border: '1px solid #e1e1e1', borderRadius: 6, padding: 12, marginBottom: 10 }}>
                <strong>Estado:</strong> {o.status} {o.orderId ? `| OrderId: ${o.orderId}` : ''} <br />
                <strong>Total:</strong> S/ {o.total?.toFixed(2)} <br />
                <strong>Items:</strong>
                <ul style={{ paddingLeft: 18, marginTop: 4 }}>
                  {o.items.map(it => (
                    <li key={it.code}>{it.name} x {it.quantity} – S/ {(it.quantity * it.price).toFixed(2)}</li>
                  ))}
                </ul>
                <span style={{ fontSize: 11, color: '#555' }}>
                  Creado: {o.createdAt ? new Date(o.createdAt).toLocaleString() : 'N/D'}
                </span>
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', gap: 8 }}>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
            <button disabled={page >= data.pagination.pages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
          </div>
        </div>
      )}
    </div>
  );
}