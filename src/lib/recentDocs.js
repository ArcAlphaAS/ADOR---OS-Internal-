// Los últimos documentos que abriste, solo en este dispositivo (no se guarda nada
// en la base de datos). Máximo 6, el más reciente primero.
const KEY = 'ador_recent_docs'
export function readRecentDocs() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}
export function pushRecentDoc(id) {
  try {
    localStorage.setItem(KEY, JSON.stringify([id, ...readRecentDocs().filter((x) => x !== id)].slice(0, 6)))
  } catch {
    // sin almacenamiento: no pasa nada
  }
}
