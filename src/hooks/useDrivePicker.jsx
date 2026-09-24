import { useState } from 'react'
import { createPortal } from 'react-dom'
import { auth } from '../firebase'
import { pickDriveFiles, connectDrive, DriveNeedsConnectError } from '../lib/googleDrive'
import { useToast } from './useToast'

// "Adjuntar desde Google Drive", reusable anywhere (Clientes → Documentos,
// Finanzas → comprobante, Comunicación, Conocimiento). Uses the signed-in
// Firebase user, so screens don't have to pass it down.
//
//   const drive = useDrivePicker('clientes')
//   const files = await drive.pick({ multiple: true })   // [] if cancelled
//   ... {drive.prompt}   // renders the one-time "Conectar Google Drive" ask
//
// `returnTo` is the module Google should bring you back to after connecting.
export function useDrivePicker(returnTo) {
  const [needsConnect, setNeedsConnect] = useState(null)
  const [busy, setBusy] = useState(false)
  const showToast = useToast()
  const uid = auth?.currentUser?.uid

  const pick = async (options) => {
    setBusy(true)
    try {
      return await pickDriveFiles(uid, options)
    } catch (error) {
      if (error instanceof DriveNeedsConnectError) setNeedsConnect(error.message)
      else showToast(error.message)
      return []
    } finally {
      setBusy(false)
    }
  }

  const prompt = needsConnect
    ? createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-[10px]" onClick={() => setNeedsConnect(null)}>
          <div className="ador-modal-surface ador-grain w-[400px] rounded-[24px] p-7" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[15px] font-semibold text-[#F5F5F5]">Conecta Google Drive</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[#9A9A9A]">
              {needsConnect} Los archivos se quedan en el Drive de la empresa; ADOR OS solo guarda el enlace. El permiso es el mínimo de Google: ADOR OS solo verá los archivos que tú elijas.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setNeedsConnect(null)} className="rounded-xl px-4 py-2 text-[13px] text-[#888888] hover:text-[#F5F5F5]">
                Ahora no
              </button>
              <button type="button" onClick={() => connectDrive(uid, returnTo)} className="rounded-xl bg-[#1E5FAD] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#2A6FC2]">
                Conectar Google
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null

  return { pick, busy, prompt }
}
