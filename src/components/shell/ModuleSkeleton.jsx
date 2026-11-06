import LoadingMark from '../common/LoadingMark'

// Lo que muestra un módulo mientras llega su código: la pantallita de carga de
// ADOR OS, centrada. Aparece solo si la espera dura más de un parpadeo.
export default function ModuleSkeleton() {
  return <LoadingMark full />
}
