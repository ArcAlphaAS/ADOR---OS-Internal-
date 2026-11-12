// Un tono por sección, en pequeño: el punto junto al título, los iconos de "Más", la barra
// de avance de Workspace. Son tonos apagados y de la misma intensidad (nada de colores de
// sistema brillantes): sobre el negro y el marfil de ADOR se leen como un matiz, no como
// una etiqueta. El dorado se reserva a lo importante, por eso ninguna sección lo usa.
// Para dejarlas todas neutras basta poner '#F4EEE2' en cada una.
export const MODULE_COLORS = {
  inicio: '#F4EEE2',
  workspace: '#8FA3BF',
  chat: '#A99BC2',
  clientes: '#C4A484',
  objetivos: '#C79088',
  finanzas: '#88AD92',
  calendario: '#C79AA8',
  conocimiento: '#86AEB8',
  news: '#B9B08E',
  directorio: '#929AC4',
  'ador-ia': '#B7A4CC',
  admin: '#8E8E93',
}
export const MODULE_LABELS = {
  inicio: 'Inicio', workspace: 'Workspace', chat: 'Comunicación', clientes: 'Clientes', objetivos: 'Objetivos', finanzas: 'Finanzas',
  calendario: 'Calendario', conocimiento: 'Conocimiento', news: 'News', directorio: 'Directorio', 'ador-ia': 'ADOR IA', admin: 'Administración',
}
export const MODULE_ORDER = ['inicio', 'workspace', 'objetivos', 'clientes', 'finanzas', 'chat', 'calendario', 'conocimiento', 'news', 'directorio', 'ador-ia', 'admin']
export const moduleColor = (id) => MODULE_COLORS[id] || '#F4EEE2'
