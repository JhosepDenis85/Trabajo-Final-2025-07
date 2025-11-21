import React from 'react';

export default function StripePayment({ draft }) {
  if (!draft) return null;
  return (
    <div className="card">
      <h3>Stripe (Modo Demo)</h3>
      <p>El backend confirma automáticamente con pm_card_visa.</p>
      <p>Draft: {draft.orderDraftId}</p>
      <p>Total: S/ {draft.totalPagar}</p>
    </div>
  );
}