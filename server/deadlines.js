// Recordatorios de fechas límite, con la app cerrada. Un cron de Cloudflare
// (cada 30 min, ver wrangler.jsonc) revisa las tareas con fecha cercana y envía
// un aviso push a quien las tiene asignadas: «Mañana vence…», «Hoy vence…»,
// «Venció ayer…». Cada aviso sale una sola vez por tarea (se marca en
// tasks/{id}.deadlineSent).
//
// El servidor no tiene una cuenta de Google propia: entra a Firebase como una
// cuenta de servicio de ADOR OS (un correo y contraseña normales, dados de alta
// en allowedEmails) con las variables FIREBASE_API_KEY, BOT_EMAIL y BOT_PASSWORD.
// Sin ellas no hace nada.
import { firestore, sendPush, inDnd } from './push.js'

const LIMA_OFFSET_H = 5 // Lima es UTC-5 todo el año (sin horario de verano)
const DAY = 86400000

export const limaDay = (ms) => new Date(ms - LIMA_OFFSET_H * 3600000).toISOString().slice(0, 10)
export const limaHour = (ms) => new Date(ms - LIMA_OFFSET_H * 3600000).getUTCHours()
const dayDiff = (dueMs, nowMs) => Math.round((Date.parse(`${limaDay(dueMs)}T00:00:00Z`) - Date.parse(`${limaDay(nowMs)}T00:00:00Z`)) / DAY)

// Qué aviso toca ahora para una tarea (o null). Cada uno a su hora, en hora de Lima.
export function stageFor(dueMs, nowMs) {
  const d = dayDiff(dueMs, nowMs)
  const h = limaHour(nowMs)
  if (d === 1 && h >= 16) return 'd1'
  if (d === 0 && h >= 8) return 'd0'
  if (d === -1 && h >= 9) return 'over1'
  if (d === -3 && h >= 9) return 'over3'
  return null
}

const COPY = {
  d1: (t) => ({ title: 'Mañana vence una tarea', body: `«${t}» — todavía estás a tiempo. ¿La adelantas hoy? 💪` }),
  d0: (t) => ({ title: `Hoy vence «${t}»`, body: 'Un último empujón y la cierras ✅' }),
  over1: (t) => ({ title: `«${t}» venció ayer`, body: '¿La cerramos o movemos la fecha? Tú decides.' }),
  over3: (t) => ({ title: `«${t}» lleva 3 días vencida`, body: 'Si ya no aplica, ciérrala o cámbiale la fecha.' }),
}

async function signIn(env) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${env.FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: env.BOT_EMAIL, password: env.BOT_PASSWORD, returnSecureToken: true }),
  })
  if (!res.ok) throw new Error(`Inicio de sesión del servicio: ${res.status}`)
  return (await res.json()).idToken
}

export async function runDeadlineReminders(env) {
  if (!env.FIREBASE_API_KEY || !env.BOT_EMAIL || !env.BOT_PASSWORD || !env.VAPID_PRIVATE_KEY) return { skipped: true }
  const now = Date.now()
  const fs = firestore(env, await signIn(env))

  // Tareas con fecha entre hace 4 días y dentro de 2 días: todo lo que puede tocar hoy.
  const tasks = await fs.queryRange('tasks', 'dueDate', new Date(now - 4 * DAY).toISOString(), new Date(now + 2 * DAY).toISOString())
  const todo = []
  for (const t of tasks) {
    if (t.status === 'completado' || !t.dueDate) continue
    const stage = stageFor(t.dueDate, now)
    if (!stage || t.deadlineSent?.[stage]) continue
    const people = (t.assignedTo || []).filter((u) => !(t.pendingConfirmations || []).includes(u))
    if (people.length) todo.push({ t, stage, people })
  }
  if (!todo.length) return { sent: 0 }

  const subs = await fs.list('pushSubscriptions')
  const uids = [...new Set(todo.flatMap((x) => x.people))]
  const presence = await fs.getMany(uids.map((u) => `presence/${u}`))

  let sent = 0
  for (const { t, stage, people } of todo) {
    const note = { ...COPY[stage](String(t.title || 'Tarea').slice(0, 80)), tag: `deadline:${t.id}:${stage}`, url: `/?open=workspace&task=${t.id}` }
    let delivered = false
    for (const s of subs) {
      if (!people.includes(s.uid) || !s.endpoint || !s.keys?.p256dh || !s.keys?.auth) continue
      if (inDnd(presence[`presence/${s.uid}`], now)) continue
      try {
        const status = await sendPush(s, note, env)
        if (status === 404 || status === 410) await fs.remove(`pushSubscriptions/${s.id}`)
        else if (status < 300) {
          sent++
          delivered = true
        }
      } catch {
        // un dispositivo malo no frena a los demás
      }
    }
    // Se marca aunque nadie tenga el aviso activado: si no, saldría de golpe cuando lo active.
    if (delivered || !subs.some((s) => people.includes(s.uid))) await fs.markFlag(`tasks/${t.id}`, 'deadlineSent', stage)
  }
  return { sent }
}

// Ejecución manual (Administración → Datos → "Probar avisos de fecha"): comprueba
// que la cuenta de servicio y las variables están bien y envía lo que toque ahora.
// Solo para quien tiene sesión en ADOR OS (el token se prueba con una lectura).
export async function deadlinesRun({ method, headers }, env) {
  if (method !== 'POST') return { status: 405, json: { error: 'Method not allowed' } }
  const auth = headers.authorization || ''
  if (!auth.startsWith('Bearer ') || !env.FIREBASE_PROJECT_ID) return { status: 401, json: { error: 'Falta la sesión.' } }
  try {
    await firestore(env, auth.slice(7)).getMany(['settings/seasons'])
  } catch {
    return { status: 401, json: { error: 'Sesión no válida.' } }
  }
  const missing = ['FIREBASE_API_KEY', 'BOT_EMAIL', 'BOT_PASSWORD', 'VAPID_PRIVATE_KEY'].filter((k) => !env[k])
  if (missing.length) return { status: 200, json: { ok: false, missing } }
  try {
    const result = await runDeadlineReminders(env)
    return { status: 200, json: { ok: true, ...result } }
  } catch (e) {
    return { status: 200, json: { ok: false, error: e.message } }
  }
}
