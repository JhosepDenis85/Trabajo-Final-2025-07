import React, { useState } from 'react';
import PasarelaPago from './components/PasarelaPago';
import MisCompras from './components/MisCompras';

export default function App() {
  const [token, setToken] = useState('');

  return (
    <div>
      <div style={{ background: '#000', color: '#fff', padding: '10px 18px', fontSize: 18, fontWeight: 600 }}>
        Pasarela de Pago - Frontend
      </div>
      <div style={{ maxWidth: 1150, margin: '25px auto' }}>
        <label style={{ fontSize: 12, fontWeight: 'bold' }}>Token JWT (pegar después de autenticación)</label>
        <textarea
          style={{ width: '100%', height: 60, fontSize: 11 }}
            value={token}
            onChange={e => setToken(e.target.value.trim())}
            placeholder="Pegue aquí el JWT obtenido del Signin / OAuth"
        />
        <PasarelaPago token={token} />
        <MisCompras token={token} />
      </div>
    </div>
  );
}