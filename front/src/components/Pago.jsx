import React, { useState } from 'react';

export default function Pago({ draft, onPagar }) {
  const [loading, setLoading] = useState(false);
  const disabled = !draft;
  async function pagar() {
    setLoading(true);
    await onPagar();
    setLoading(false);
  }
  return (
    <div className="card">
      <h3>Pago (Stripe test)</h3>
      <button disabled={disabled || loading} onClick={pagar}>
        {loading ? 'Procesando...' : 'Procesar Pago'}
      </button>
      {!disabled && <p>Monto a cobrar: S/ {draft.totalPagar}</p>}
      <p>Método: TARJETA (visa test)</p>
    </div>
  );
}