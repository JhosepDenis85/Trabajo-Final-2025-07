import React from 'react';

export default function Carrito({ draft }) {
  if (!draft) return <div className="card">Sin draft</div>;
  return (
    <div className="card">
      <h3>Carrito (Draft: {draft.orderDraftId})</h3>
      <ul>
        {draft.productos?.map((p, i) => (
          <li key={`${p.code}-${i}`}>{p.name} x {p.quantity} = S/ {p.subtotal}</li>
        ))}
      </ul>
      <p>Subtotal: S/ {draft.subtotal}</p>
      <p>Descuentos: S/ {draft.descuentos}</p>
      <p>Envío: S/ {draft.envio}</p>
      <h4>Total: S/ {draft.totalPagar}</h4>
      <p>Estado: <span className="badge">{draft.estado}</span></p>
    </div>
  );
}