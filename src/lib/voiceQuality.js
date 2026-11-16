// Calidad de las notas de voz, por dispositivo.
//  · "voz"  — el procesado del sistema (eco, ruido y nivel automático): suena parejo y fuerte,
//             pero en algunos teléfonos cambia a "modo llamada" y recorta los agudos.
//  · "alta" — sin procesar, 48 kHz y más bits, con volumen compensado: voz natural y nítida.
//    Es la que se usa si nadie eligió otra cosa.
const KEY = 'ador_voice_quality'
export const VOICE_QUALITIES = [
  { id: 'voz', label: 'Voz', hint: 'Parejo y fuerte. Puede sonar como radio en algunos teléfonos.' },
  { id: 'alta', label: 'Alta fidelidad', hint: 'Sin procesar, más nítido y natural.' },
]
export function readVoiceQuality() {
  try {
    // Alta fidelidad por defecto: lo que cada quien elija a mano se respeta.
    return localStorage.getItem(KEY) === 'voz' ? 'voz' : 'alta'
  } catch {
    return 'alta'
  }
}
export function saveVoiceQuality(id) {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* sin almacenamiento: queda en alta fidelidad */
  }
}
