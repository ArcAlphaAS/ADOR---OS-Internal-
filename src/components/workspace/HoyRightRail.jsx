import { useEffect, useState } from 'react'
import { weekRange } from '../../lib/weeklySummary'
import { getUserProfile, saveUserProfile } from '../../lib/firestore'
import { ArrowLeftIcon, ArrowRightIcon, PlusIcon, NoteIcon, CalendarIcon, TargetIcon, EditIcon } from '../icons'

// Right rail added next to Hoy per a reference image the user shared — a
// week strip, a day-progress donut, a personal weekly-focus card, and a
// small functional action list. Scoped down from the reference in three
// explicit ways the user confirmed before this was built: no keyboard
// shortcuts on Quick Actions, no real calendar events (Calendario is still
// a placeholder module — this is a date widget only), and no task-
// duration/minutes field anywhere.

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

// Just the current week, one row — narrowed from an earlier full-month
// version after direct feedback that the reference image only showed a
// single week strip, not a month grid. Navigable by week instead of month.
export function MiniCalendar() {
  const [offset, setOffset] = useState(0)
  const today = new Date()
  const anchor = new Date(today)
  anchor.setDate(anchor.getDate() + offset * 7)
  const { start } = weekRange(anchor)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
  const label = `${days[0].toLocaleDateString('es', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('es', { day: 'numeric', month: 'short' })}`

  return (
    <div className="ador-glass ador-grain rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-semibold capitalize text-[#F5F5F5]">{label}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOffset((o) => o - 1)}
            className="flex h-6 w-6 items-center justify-center rounded-full text-[#888888] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5]"
          >
            <ArrowLeftIcon size={12} />
          </button>
          <button
            type="button"
            onClick={() => setOffset((o) => o + 1)}
            className="flex h-6 w-6 items-center justify-center rounded-full text-[#888888] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5]"
          >
            <ArrowRightIcon size={12} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((d, i) => {
          const isToday = d.toDateString() === today.toDateString()
          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-medium text-[#444444]">{WEEKDAYS[i]}</span>
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-[12px]"
                style={{
                  background: isToday ? '#1E5FAD' : 'transparent',
                  color: isToday ? '#F5F5F5' : '#888888',
                  fontWeight: isToday ? 600 : 400,
                }}
              >
                {d.getDate()}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Same completed/total numbers as the header's stats line, just as a ring
// instead of text — the reference's clearest borrow, since a filled ring
// reads faster than a fraction at a glance.
export function ProgressDonut({ completed, total }) {
  const pct = total > 0 ? completed / total : 0
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct)

  return (
    <div className="ador-glass ador-grain flex items-center gap-4 rounded-2xl p-4">
      <svg width="84" height="84" viewBox="0 0 84 84" className="flex-shrink-0 -rotate-90">
        <circle cx="42" cy="42" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
        <circle
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke="#1E5FAD"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <div>
        <p className="text-[13px] font-semibold text-[#F5F5F5]">Progreso del día</p>
        <p className="mt-1.5 text-[20px] font-semibold text-[#F5F5F5]">
          {completed}
          <span className="text-[13px] font-normal text-[#444444]">/{total}</span>
        </p>
        <p className="text-[11px] text-[#888888]">completadas</p>
      </div>
    </div>
  )
}

// A PERSONAL weekly focus — deliberately distinct from the company-wide
// North Star Objetivo in the Objetivos module (see CLAUDE.md §12/§14):
// Objetivos tracks ADOR's big quarterly goals, this is "what are you, the
// individual, focused on this week." You write the one-line intention
// yourself (stored on `users/{uid}.weeklyGoal`, keyed by the Monday of the
// week it was set so it naturally goes stale into a fresh prompt the
// following week — same "one target at a time" precedent as Finanzas'
// quarterlyTarget); the progress bar is entirely live-derived from your own
// tasks due or completed this week, never hand-ticked — matching this
// app's blanket rule against manually-tracked progress wherever a real
// number can be computed instead.
function weekKeyOf(date = new Date()) {
  return weekRange(date).start.toISOString().slice(0, 10)
}

export function ObjetivoSemanaCard({ userId, tasks = [] }) {
  const [goal, setGoal] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const weekKey = weekKeyOf()

  useEffect(() => {
    if (!userId || userId === 'preview') {
      setLoaded(true)
      return
    }
    getUserProfile(userId).then((profile) => {
      setGoal(profile?.weeklyGoal || null)
      setLoaded(true)
    })
  }, [userId])

  const currentTitle = goal?.weekKey === weekKey ? goal.title : ''

  const save = async () => {
    const title = draft.trim()
    setEditing(false)
    if (!title) return
    setGoal({ title, weekKey })
    if (userId && userId !== 'preview') await saveUserProfile(userId, { weeklyGoal: { title, weekKey } })
  }

  const { start, end } = weekRange()
  const mine = tasks.filter((t) => (t.assignedTo || []).includes(userId))
  const completedThisWeek = mine.filter((t) => {
    const c = t.completedAt?.toDate?.()
    return c && c >= start && c <= end
  }).length
  const dueThisWeekOpen = mine.filter((t) => {
    if (t.status === 'completado') return false
    const d = t.dueDate?.toDate?.()
    return d && d >= start && d <= end
  }).length
  const total = completedThisWeek + dueThisWeekOpen
  const pct = total > 0 ? Math.round((completedThisWeek / total) * 100) : null

  if (!loaded) return null

  return (
    <div className="ador-glass ador-grain rounded-2xl p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TargetIcon size={15} className="text-[#B8860B]" />
          <span className="text-[13px] font-semibold text-[#F5F5F5]">Objetivo de la semana</span>
        </div>
        {!editing && currentTitle && (
          <button
            type="button"
            onClick={() => {
              setDraft(currentTitle)
              setEditing(true)
            }}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[#444444] transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#F5F5F5]"
          >
            <EditIcon size={12} />
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <input
            autoFocus
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="¿Cuál es tu enfoque esta semana?"
            className="w-full rounded-lg border border-white/[0.14] bg-[#141414] px-2.5 py-1.5 text-[13px] text-[#F5F5F5] placeholder:text-[#444444] outline-none focus:border-[#1E5FAD]/50"
          />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setEditing(false)} className="text-[11px] text-[#888888] hover:text-[#F5F5F5]">
              Cancelar
            </button>
            <button type="button" onClick={save} className="text-[11px] font-medium text-[#1E5FAD] hover:underline">
              Guardar
            </button>
          </div>
        </div>
      ) : currentTitle ? (
        <>
          <p className="text-[13px] leading-relaxed text-[#F5F5F5]">{currentTitle}</p>
          {pct === null ? (
            <p className="mt-2 text-[11px] text-[#666666]">Sin tareas con fecha esta semana todavía.</p>
          ) : (
            <>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: '#1E5FAD' }} />
              </div>
              <p className="mt-1.5 text-[11px] text-[#888888]">
                {completedThisWeek} de {total} tareas de esta semana completadas
              </p>
            </>
          )}
        </>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <p className="text-[12px] leading-relaxed text-[#666666]">Define tu enfoque personal de esta semana.</p>
          <button
            type="button"
            onClick={() => {
              setDraft('')
              setEditing(true)
            }}
            className="text-[12px] font-medium text-[#1E5FAD] hover:underline"
          >
            + Definir enfoque
          </button>
        </div>
      )}
    </div>
  )
}

function QuickAction({ Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors duration-150 hover:bg-white/[0.05]"
    >
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[#1E5FAD]">
        <Icon size={14} />
      </span>
      <span className="text-[13px] text-[#F5F5F5]">{label}</span>
    </button>
  )
}

// Deliberately no keyboard shortcuts here (dropped per direct feedback) —
// every action is a plain, functional click: focus the in-page capture
// input, open Mis Pendientes' inline add row, or navigate to Calendario.
export function QuickActionsCard({ onNewTask, onNewNote, onNavigate }) {
  return (
    <div className="ador-glass ador-grain rounded-2xl p-3">
      <span className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-[#444444]">Quick Actions</span>
      <div className="flex flex-col gap-0.5 pt-1">
        <QuickAction Icon={PlusIcon} label="Nueva tarea" onClick={onNewTask} />
        <QuickAction Icon={NoteIcon} label="Nueva nota" onClick={onNewNote} />
        {onNavigate && <QuickAction Icon={CalendarIcon} label="Ver calendario" onClick={() => onNavigate('calendario')} />}
      </div>
    </div>
  )
}
