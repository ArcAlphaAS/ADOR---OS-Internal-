// Un color por sección, en pequeño (como los iconos de los ajustes de iOS): el punto
// junto al título, los iconos de "Más", la barra de avance de Workspace. Todo lo demás
// se queda neutro (negro, gris y marfil).
export const MODULE_COLORS = {
  inicio: '#F4EEE2',
  workspace: '#0A84FF',
  chat: '#BF5AF2',
  clientes: '#FF9F0A',
  objetivos: '#FF453A',
  finanzas: '#30D158',
  calendario: '#FF375F',
  conocimiento: '#64D2FF',
  news: '#FFD60A',
  directorio: '#5E5CE6',
  'ador-ia': '#BF5AF2',
  admin: '#8E8E93',
}
export const MODULE_LABELS = {
  inicio: 'Inicio', workspace: 'Workspace', chat: 'Comunicación', clientes: 'Clientes', objetivos: 'Objetivos', finanzas: 'Finanzas',
  calendario: 'Calendario', conocimiento: 'Conocimiento', news: 'News', directorio: 'Directorio', 'ador-ia': 'ADOR IA', admin: 'Administración',
}
export const MODULE_ORDER = ['inicio', 'workspace', 'objetivos', 'clientes', 'finanzas', 'chat', 'calendario', 'conocimiento', 'news', 'directorio', 'ador-ia', 'admin']
export const moduleColor = (id) => MODULE_COLORS[id] || '#F4EEE2'
