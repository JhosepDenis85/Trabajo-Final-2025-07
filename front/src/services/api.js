function decodeUserIdFromJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.id || payload._id || null;
  } catch {
    return null;
  }
}

export function getUserId(token) {
  return decodeUserIdFromJWT(token);
}

export async function apiGetDraft(token, base, userId) {
  const url = userId ? `${base}/pasarela/${userId}/carrito` : `${base}/pasarela/mi/carrito`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}

export async function apiCreateIntent(token, base, userId, orderDraftId, email) {
  const url = userId ? `${base}/pasarela/${userId}/intent` : `${base}/pasarela/mi/intent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ orderDraftId, email })
  });
  return res.json();
}

export async function apiMarkStatus(token, base, userId, orderDraftId, nuevoEstado) {
  const url = userId ? `${base}/pasarela/${userId}/estado` : `${base}/pasarela/mi/estado`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ orderDraftId, nuevoEstado })
  });
  return res.json();
}

// NUEVO: obtener compras realizadas (estados)
export async function apiGetMisCompras(token, base, { status, page, limit, userIdAdmin } = {}) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);
  if (userIdAdmin) params.append('userId', userIdAdmin); // solo admin
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${base}/mis-compras${qs}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}