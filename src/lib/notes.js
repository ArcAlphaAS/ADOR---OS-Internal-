// Zero-cost keyword categorizer for quick-capture notes — same family as
// lib/adorIA.js's rule-based engine, not an LLM call (see the 2026-09-16
// conversation: the user wanted live, AI-level "understand as you type"
// suggestions, but is still not comfortable connecting Gemini even with the
// billing risk explained away — same standing preference as ADOR IA). This
// is deliberately just a hint shown after saving, always overridable, never
// a blocker to capturing the note in the first place.
export const CATEGORIES = {
  tarea: { label: 'Tarea', module: 'Workspace', color: '#1E5FAD' },
  gasto: { label: 'Gasto', module: 'Finanzas', color: '#EF5350' },
  ingreso: { label: 'Ingreso', module: 'Finanzas', color: '#4CAF50' },
  objetivo: { label: 'Objetivo', module: 'Objetivos', color: '#B8860B' },
  cliente: { label: 'Cliente', module: 'Clientes', color: '#1E5FAD' },
  nota: { label: 'Nota', module: null, color: '#666666' },
}

const RULES = [
  { category: 'gasto', words: ['pagar', 'pago de', 'factura', 'comprar', 'gasto', 'gastar', 'recibo'] },
  { category: 'ingreso', words: ['cobrar', 'cobro de', 'cobré', 'ingreso de', 'me pagaron', 'nos pagaron'] },
  { category: 'objetivo', words: ['meta', 'objetivo', 'trimestre', 'north star', 'métrica norte'] },
  { category: 'cliente', words: ['cliente', 'spc', ' sp ', 'contactar a', 'llamar a', 'seguimiento a', 'intervención'] },
  {
    category: 'tarea',
    words: ['tengo que', 'hay que', 'llamar', 'enviar', 'terminar', 'revisar', 'ordenar', 'preparar', 'coordinar', 'agendar', 'reunión', 'reunirme'],
  },
]

export function suggestCategory(text) {
  const q = text.toLowerCase()
  for (const rule of RULES) {
    if (rule.words.some((w) => q.includes(w))) return rule.category
  }
  return 'nota'
}
