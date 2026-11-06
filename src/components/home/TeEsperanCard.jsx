import { useEffect, useMemo, useState } from 'react'
import { subscribeAssignedPending, subscribeUsers } from '../../lib/firestore'
import { useChatNotifications } from '../../hooks/useChatNotifications'
import { useTaskAlerts } from '../../hooks/useTaskAlerts'
import PersonAvatar from '../chat/PersonAvatar'
import { userLabel, ago } from '../../lib/chat'
import CardHeader, { CARD_PAD, CARD_RADIUS } from './CardHeader'

// "Te esperan": las personas que dependen de ti ahora, con su cara. Junta lo que
// hoy está repartido entre la campana, el chat y Workspace: una tarea que te
// asignaron y espera tu respuesta, una mención o mensaje sin leer, un comentario
// en una tarea tuya. No existe si nadie te espera (nada de "0 pendientes").
export default function TeEsperanCard({ uid, onNavigate }) {
  const chat = useChatNotifications(uid, onNavigate)
  const taskAlerts = useTaskAlerts(uid, onNavigate)
  const [pending, setPending] = useState([])
  const [users, setUsers] = useState([])
  useEffect(() => (uid && uid !== 'preview' ? subscribeAssignedPending(uid, setPending) : undefined), [uid])
  useEffect(() => subscribeUsers(setUsers), [])

  const rows = useMemo(() => {
    const uidOf = (name) => users.find((u) => userLabel(u) === name || u.displayName === name)?.id
    const out = []
    for (const t of pending) {
      out.push({
        key: `p:${t.id}`,
        uid: t.lastAssignedByUid || uidOf(t.lastAssignedBy),
        name: t.lastAssignedBy,
        verb: 'te asignó',
        what: t.title,
        tail: 'espera tu respuesta',
        at: t.updatedAt?.toMillis?.() || Date.now(),
        urgent: true,
        onClick: () => onNavigate?.('workspace', { type: 'task', id: t.id }),
      })
    }
    for (const c of chat.filter((i) => !i.reminder)) {
      out.push({ key: c.key, uid: uidOf(c.from), name: c.from, text: c.text, at: c.at, time: c.time, onClick: c.onClick })
    }
    for (const a of taskAlerts) {
      out.push({ key: a.key, uid: undefined, name: undefined, text: a.text, at: a.at, time: a.time, onClick: a.onClick })
    }
    return out.sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent) || b.at - a.at).slice(0, 4)
  }, [pending, chat, taskAlerts, users, onNavigate])

  if (rows.length === 0) return null
  const total = pending.length + chat.filter((i) => !i.reminder).length + taskAlerts.length

  return (
    <div className={`ador-glass ador-grain ${CARD_RADIUS} ${CARD_PAD}`}>
      <CardHeader label="Te esperan" count={total} dot="#F4EEE2" />
      <ul className="ador-stagger mt-2 divide-y divide-white/[0.06]">
        {rows.map((r) => (
          <li key={r.key}>
            <button type="button" onClick={r.onClick} className="flex w-full items-center gap-3.5 py-3 text-left">
              <PersonAvatar uid={r.uid} name={r.name || '·'} size={42} />
              <span className="min-w-0 flex-1 text-[14.5px] leading-snug text-[#D8D8D8]">
                {r.verb ? (
                  <>
                    <span className="font-medium text-[#F5F5F5]">{(r.name || 'Alguien').split(' ')[0]}</span> {r.verb} <span className="text-[#F5F5F5]">{r.what}</span>
                    <span className="block text-[12.5px] text-[#F4EEE2]">{r.tail}</span>
                  </>
                ) : (
                  <span className="line-clamp-2">{r.text}</span>
                )}
              </span>
              {r.time && <span className="flex-shrink-0 text-[12px] text-[#767676]">{r.time}</span>}
              {!r.time && r.at ? <span className="flex-shrink-0 text-[12px] text-[#767676]">{ago(Date.now() - r.at)}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
