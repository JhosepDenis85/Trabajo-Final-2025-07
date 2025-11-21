import React from 'react';

export default function EstadoPedido({ pago, confirmacion, eventos }) {
  return (
    <div className="card">
      <h3>Estado Pago / Pedido</h3>
      <pre>{JSON.stringify({ pago, confirmacion }, null, 2)}</pre>
      <h4>Eventos Socket:</h4>
      <pre>{JSON.stringify(eventos, null, 2)}</pre>
    </div>
  );
}