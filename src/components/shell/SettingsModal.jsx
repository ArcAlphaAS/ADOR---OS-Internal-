import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { subscribeUserProfile, subscribeMaintenance, recordBackup, subscribeDriveFolder, setDriveFolder } from '../../lib/firestore'
import { useDrivePicker } from '../../hooks/useDrivePicker'
import { isAdmin } from '../../lib/permissions'
import { exportAllData, backupFileName } from '../../lib/backup'
import { uploadBackupToDrive, connectDrive, DriveNeedsConnectError } from '../../lib/googleDrive'

const COLLECTION_LABELS = {
  clients: 'clientes',
  tasks: 'tareas',
  chatChannels: 'canales',
  chatDms: 'mensajes directos',
  knowledgeDocs: 'documentos',
  expenses: 'gastos',
  incomes: 'ingresos',
  objetivos: 'objetivos',
  directoryPeople: 'directorio',
}

// "Carpeta de ADOR en Drive" (admins): the company's shared folder — made in
// one partner's Drive and shared with the others as Editor. Once chosen,
// uploads from ADOR OS (Google's picker "Subir" tab) land in it and backups
// go to its "Respaldos" subfolder. See lib/googleDrive.js.
function DriveFolderSection({ user }) {
  const [profile, setProfile] = useState(null)
  const [folder, setFolder] = useState(null)
  const [error, setError] = useState('')
  const drive = useDrivePicker('inicio')
  useEffect(() => (user?.uid && user.uid !== 'preview' ? subscribeUserProfile(user.uid, setProfile) : undefined), [user?.uid])
  useEffect(() => subscribeDriveFolder(setFolder), [])
  if (!profile || !isAdmin(profile)) return null

  const choose = async () => {
    setError('')
    const [picked] = await drive.pick({ folderOnly: true, title: 'Elige la carpeta de ADOR (compartida con tus socios)' })
    if (!picked) return
    try {
      await setDriveFolder({ fileId: picked.fileId, name: picked.name, url: picked.url })
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="ador-glass w-full rounded-xl px-4 py-3">
      <span className="block text-[13px] font-medium text-[#F5F5F5]">Carpeta de ADOR en Drive</span>
      <span className="mt-0.5 block text-[12px] leading-relaxed text-[#888888]">
        {folder
          ? 'Lo que se sube desde ADOR OS va aquí, y los respaldos a su subcarpeta “Respaldos”.'
          : 'Crea una carpeta “ADOR” en tu Drive, compártela con tus socios como Editor y elígela aquí. Así los archivos son de la empresa, no de una persona.'}
      </span>
      {folder && (
        <a href={folder.url} target="_blank" rel="noopener noreferrer" className="mt-1.5 block truncate text-[12px] text-[#6FA3E0] hover:underline">
          📁 {folder.name}
        </a>
      )}
      <button type="button" onClick={choose} disabled={drive.busy} className="mt-2.5 rounded-lg border border-white/[0.12] px-3 py-1.5 text-[12px] text-[#DDDDDD] hover:border-white/[0.25] disabled:opacity-50">
        {drive.busy ? 'Abriendo Google Drive…' : folder ? 'Cambiar carpeta' : 'Elegir carpeta'}
      </button>
      {error && <p className="mt-2 text-[12px] text-[#EF8A88]">{error}</p>}
      {drive.prompt}
    </div>
  )
}

// "Exportar todo" (admins only): reads every collection and saves one JSON
// file to "ADOR OS — Respaldos" in your Google Drive. See lib/backup.js
// for what's in it and what's deliberately left out.
function BackupSection({ user }) {
  const [profile, setProfile] = useState(null)
  const [maintenance, setMaintenance] = useState({})
  const [state, setState] = useState({ phase: 'idle' }) // idle | working | done | needsConnect | error

  useEffect(() => (user?.uid && user.uid !== 'preview' ? subscribeUserProfile(user.uid, setProfile) : undefined), [user?.uid])
  useEffect(() => subscribeMaintenance(setMaintenance), [])

  if (!profile || !isAdmin(profile)) return null
  const last = maintenance.lastBackup
  const lastAt = last?.at?.toDate?.()

  const run = async () => {
    setState({ phase: 'working', label: 'Leyendo datos…' })
    try {
      const backup = await exportAllData((name) => setState({ phase: 'working', label: `Leyendo ${COLLECTION_LABELS[name] || name}…` }))
      setState({ phase: 'working', label: 'Guardando en tu Google Drive…' })
      const file = await uploadBackupToDrive(user.uid, backupFileName(), JSON.stringify(backup, null, 1))
      await recordBackup({ by: user.displayName || user.email, link: file.webViewLink, documentCount: backup.documentCount }).catch(() => {})
      setState({ phase: 'done', link: file.webViewLink, count: backup.documentCount })
    } catch (error) {
      if (error instanceof DriveNeedsConnectError) setState({ phase: 'needsConnect', message: error.message })
      else setState({ phase: 'error', message: error.message })
    }
  }

  return (
    <div className="ador-glass w-full rounded-xl px-4 py-3">
      <span className="block text-[13px] font-medium text-[#F5F5F5]">Respaldo de datos</span>
      <span className="mt-0.5 block text-[12px] leading-relaxed text-[#888888]">
        Guarda una copia completa de ADOR OS en Google Drive (en la carpeta de ADOR si está elegida; si no, en “ADOR OS — Respaldos” de tu Drive).
      </span>
      {lastAt && (
        <span className="mt-1.5 block text-[11px] text-[#777777]">
          Último: {lastAt.toLocaleDateString('es', { day: 'numeric', month: 'short' })} {lastAt.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })} · {last.by}
          {last.link && (
            <a href={last.link} target="_blank" rel="noopener noreferrer" className="ml-1.5 text-[#6FA3E0] hover:underline">
              abrir
            </a>
          )}
        </span>
      )}

      <div className="mt-2.5">
        {state.phase === 'working' ? (
          <span className="flex items-center gap-2 text-[12px] text-[#AAAAAA]">
            <span className="h-3 w-3 animate-spin rounded-full border border-white/60 border-t-transparent" /> {state.label}
          </span>
        ) : state.phase === 'needsConnect' ? (
          <span className="flex flex-col gap-1.5">
            <span className="text-[12px] text-[#AAAAAA]">{state.message} Solo pide permiso para los archivos que ADOR OS crea o que tú eliges.</span>
            <button type="button" onClick={() => connectDrive(user.uid, 'inicio')} className="self-start rounded-lg bg-[#1E5FAD] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#2A6FC2]">
              Conectar Google Drive
            </button>
          </span>
        ) : (
          <button type="button" onClick={run} className="rounded-lg bg-[#1E5FAD] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#2A6FC2]">
            Exportar todo a Drive
          </button>
        )}
        {state.phase === 'done' && (
          <p className="mt-2 text-[12px] text-[#8FD19A]">
            Listo — {state.count} registros guardados.{' '}
            {state.link && (
              <a href={state.link} target="_blank" rel="noopener noreferrer" className="underline">
                Ver en Drive
              </a>
            )}
          </p>
        )}
        {state.phase === 'error' && <p className="mt-2 text-[12px] text-[#EF8A88]">{state.message}</p>}
      </div>
    </div>
  )
}

export default function SettingsModal({ user, onClose, onResetPassword, onShowOnboarding }) {
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const handleResetPassword = async () => {
    if (!user?.email) return
    setError('')
    setStatus('')
    setSending(true)
    try {
      await onResetPassword(user.email)
      setStatus('Te enviamos un correo para restablecer tu contraseña.')
    } catch {
      setError('No pudimos enviar el correo.')
    } finally {
      setSending(false)
    }
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[10px]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ador-modal-surface ador-grain w-[380px] rounded-[28px] p-8">
          <h2 className="text-[15px] font-semibold text-[#F5F5F5]">Configuración</h2>
          <p className="mt-1 text-[13px] text-[#888888]">{user?.email}</p>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                onClose()
                onShowOnboarding()
              }}
              className="ador-glass w-full rounded-xl px-4 py-3 text-left transition-colors duration-150 hover:bg-white/[0.06]"
            >
              <span className="block text-[13px] font-medium text-[#F5F5F5]">Conoce ADOR OS</span>
              <span className="mt-0.5 block text-[12px] text-[#888888]">Un repaso rápido de cada módulo</span>
            </button>

            <button
              type="button"
              onClick={handleResetPassword}
              disabled={sending}
              className="ador-glass w-full rounded-xl px-4 py-3 text-left transition-colors duration-150 hover:bg-white/[0.06] disabled:opacity-60"
            >
              <span className="block text-[13px] font-medium text-[#F5F5F5]">Cambiar contraseña</span>
              <span className="mt-0.5 block text-[12px] text-[#888888]">
                Te enviaremos un correo para restablecerla
              </span>
            </button>

            <DriveFolderSection user={user} />
            <BackupSection user={user} />

            {status && <p className="mt-1 px-1 text-[12px] text-[#888888]">{status}</p>}
            {error && <p className="mt-1 px-1 text-[12px] text-[#888888]">{error}</p>}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-[13px] text-[#888888] transition-colors hover:text-[#F5F5F5]"
            >
              Cerrar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )
}
