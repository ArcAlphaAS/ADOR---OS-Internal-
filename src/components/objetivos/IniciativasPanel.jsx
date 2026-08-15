import { priorityMeta } from '../../lib/workspace'
import Avatar from '../shell/Avatar'

// The "Focus Board" from the user's spec — what each person is actually
// doing this week that's moving an Objetivo forward. Deliberately not a
// parallel task list: every row here is a real Workspace task (tagged via
// Task Detail Panel's "Objetivo vinculado" field), so there's exactly one
// place to mark it done. Lives in the lateral rail, same slot pattern as
// Workspace's DecisionesPanel.
export default function IniciativasPanel({ tasks }) {
  return (
    <div className="ador-glass ador-grain rounded-2xl px-5 py-5">
      <span
        className="font-medium text-[#444444]"
        style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}
      >
        Iniciativas
      </span>

      {tasks.length === 0 ? (
        <p className="mt-4 text-[13px] font-light text-[#444444]">
          Sin tareas vinculadas todavía. Conéctalas desde el detalle de una tarea en Workspace.
        </p>
      ) : (
        <div className="mt-3 flex flex-col divide-y divide-white/[0.06]">
          {tasks.map((t) => {
            const priority = priorityMeta(t.priority)
            return (
              <div key={t.id} className="flex flex-col gap-1.5 py-3 first:pt-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] text-[#F5F5F5]">{t.title}</p>
                  {priority && (
                    <span
                      className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ background: `${priority.color}22`, color: priority.color }}
                    >
                      {priority.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="truncate text-[11px] text-[#1E5FAD]">{t.objetivoTitle}</span>
                  <div className="flex flex-shrink-0" style={{ marginLeft: 4 }}>
                    {t.assignees.slice(0, 3).map((u, i) => (
                      <div key={u.id} style={{ marginLeft: i === 0 ? 0 : -6, zIndex: 3 - i }}>
                        <Avatar displayName={u.displayName} email={u.email} size={18} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
