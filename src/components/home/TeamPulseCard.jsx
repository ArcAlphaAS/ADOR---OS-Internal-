import { useTeamActivity } from '../../hooks/useTeamActivity'
import { usePerson } from '../chat/PersonAvatar'
import PersonAvatar from '../chat/PersonAvatar'
import { ago } from '../../lib/chat'
import CardHeader, { CARD_PAD, CARD_RADIUS } from './CardHeader'

// "Hoy en el equipo": lo que la gente de ADOR acaba de hacer, con su cara y su
// nombre. Calma a propósito: filas amplias, un solo color, sin cifras sueltas.
function Row({ item }) {
  const first = usePerson(item.uids[0])
  const second = usePerson(item.uids[1])
  const who = [first.name, second.name].filter(Boolean).map((n) => n.split(' ')[0]).join(' y ') || 'El equipo'
  return (
    <li className="flex items-center gap-4 py-3.5">
      <PersonAvatar uid={item.uids[0]} size={44} />
      <p className="min-w-0 flex-1 text-[15px] leading-snug text-[#D8D8D8]">
        <span className="font-medium text-[#F5F5F5]">{who}</span> {item.verb} <span className="text-[#F5F5F5]">{item.what}</span>
      </p>
      <span className="flex-shrink-0 text-[12px] text-[#767676]">{ago(Date.now() - item.at)}</span>
    </li>
  )
}

export default function TeamPulseCard() {
  const { items, loaded } = useTeamActivity()
  return (
    <div className={`ador-glass ador-grain h-full ${CARD_RADIUS} ${CARD_PAD}`}>
      <CardHeader label="Hoy en el equipo" />
      {!loaded ? (
        <div className="mt-4 flex flex-col gap-3">
          {[0, 1, 2].map((i) => <div key={i} className="ador-skeleton h-11 w-full rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-5 text-[15px] font-light text-[#8A8A8A]">Todo tranquilo por ahora. Lo que el equipo vaya cerrando aparecerá aquí.</p>
      ) : (
        <ul className="ador-stagger mt-2 divide-y divide-white/[0.06]">
          {items.map((it) => <Row key={it.key} item={it} />)}
        </ul>
      )}
    </div>
  )
}
