export function guardarDraftLocal(draftId, total) {
  localStorage.setItem('ventas_draft', JSON.stringify({ draftId, total, ts: Date.now() }));
}
export function leerDraftLocal() {
  try {
    return JSON.parse(localStorage.getItem('ventas_draft') || 'null');
  } catch {
    return null;
  }
}
export function limpiarDraftLocal() {
  localStorage.removeItem('ventas_draft');
}