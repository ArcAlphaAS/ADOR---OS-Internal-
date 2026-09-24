// Google Drive in ADOR OS — files live in the company's Drive, never here.
//
// Two things use it:
//   - Archivos: Google's own file picker (pickDriveFiles). You choose a file
//     from Drive — or upload one from your computer into Drive right there —
//     and ADOR OS stores only its link and name. PDFs, Excel, contracts…
//     all without Firebase Storage (which now needs a billing account).
//   - Respaldo: "Exportar todo" writes a JSON file into a "ADOR OS —
//     Respaldos" folder in the admin's Drive (uploadBackupToDrive).
//
// Same Google connection as Calendario and Meet (users/{uid}.googleCalendar,
// one refresh token); the scope is `drive.file`, so ADOR OS can only see
// what you pick or what it created. Connections made before Drive was added
// don't have it — DriveNeedsConnectError tells the UI to reconnect once.
import { getUserProfile, saveUserProfile, getDriveFolder } from './firestore'
import { buildAuthUrl, exchangeCode, refreshAccessToken, isReconnectError, fetchPrimaryCalendarEmail, assertCompanyGoogleAccount, DRIVE_SCOPE, isGoogleCalendarConfigured } from './googleCalendar'

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY
// The Google Cloud project number (same project as Firebase). Public — the
// picker uses it to grant ADOR OS access to the files you choose.
const APP_ID = import.meta.env.VITE_GOOGLE_APP_ID || '610980815690'
const BACKUP_FOLDER = 'ADOR OS — Respaldos'

export const isDriveConfigured = isGoogleCalendarConfigured

export class DriveNeedsConnectError extends Error {
  constructor(message = 'Conecta Google Drive para continuar.') {
    super(message)
    this.name = 'DriveNeedsConnectError'
  }
}

export function hasDriveScope(saved) {
  return Boolean(saved?.scopes && saved.scopes.includes(DRIVE_SCOPE))
}

// ---- Connection ----

// Sends you to Google's consent screen. `returnTo` is the module to reopen
// on the way back (AppShell finishes the connection — finishDriveConnect).
export async function connectDrive(uid, returnTo = 'inicio') {
  const profile = uid && uid !== 'preview' ? await getUserProfile(uid) : null
  window.location.href = buildAuthUrl(`drive:${returnTo}`, profile?.email)
}

// If the page was just opened by Google's redirect for a Drive connection
// (`?code=…&state=drive:module`), spend the code: check it's the company
// account, save the connection, clean the URL. Returns
// { handled: false } | { handled: true, ok: true } | { handled: true, error }.
export async function finishDriveConnect(uid) {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state') || ''
  if (!code || !state.startsWith('drive:')) return { handled: false }
  for (const k of ['code', 'scope', 'state', 'authuser', 'prompt', 'iss']) url.searchParams.delete(k)
  window.history.replaceState({}, '', url.toString())
  if (!uid || uid === 'preview') return { handled: true, error: 'Inicia sesión con tu cuenta real para conectar Google.' }
  try {
    const { accessToken, refreshToken, expiresIn, scope } = await exchangeCode(code)
    const email = await fetchPrimaryCalendarEmail(accessToken).catch(() => null)
    await assertCompanyGoogleAccount(uid, email, refreshToken)
    await saveUserProfile(uid, { googleCalendar: { refreshToken, connectedEmail: email, scopes: scope || '', connectedAt: new Date().toISOString() } })
    tokenCache = { uid, token: accessToken, expiresAt: Date.now() + expiresIn * 1000, refreshToken }
    return { handled: true, ok: hasDriveScope({ scopes: scope }), error: hasDriveScope({ scopes: scope }) ? null : 'Google no concedió el acceso a Drive — vuelve a intentarlo y marca la casilla de Drive.' }
  } catch (error) {
    return { handled: true, error: error.message }
  }
}

// ---- Access token (memory only, never stored) ----
let tokenCache = null // { uid, token, expiresAt, refreshToken }

export async function getDriveToken(uid) {
  if (!isDriveConfigured) throw new Error('La conexión con Google no está configurada en esta versión.')
  if (!uid || uid === 'preview') throw new DriveNeedsConnectError('Inicia sesión con tu cuenta real para usar Google Drive.')
  if (tokenCache?.uid === uid && tokenCache.expiresAt > Date.now() + 30000) return tokenCache.token
  const profile = await getUserProfile(uid)
  const saved = profile?.googleCalendar
  if (!saved?.refreshToken || !hasDriveScope(saved)) throw new DriveNeedsConnectError()
  try {
    const { accessToken, expiresIn } = await refreshAccessToken(saved.refreshToken)
    tokenCache = { uid, token: accessToken, expiresAt: Date.now() + expiresIn * 1000, refreshToken: saved.refreshToken }
    return accessToken
  } catch (error) {
    if (isReconnectError(error)) throw new DriveNeedsConnectError('Tu conexión con Google venció — vuelve a conectarla.')
    throw error
  }
}

async function driveFetch(token, url, init = {}) {
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const raw = data.error?.message || ''
    if (/has not been used|is disabled|SERVICE_DISABLED|accessNotConfigured/i.test(raw)) {
      throw new Error('Falta activar "Google Drive API" en la consola de Google (proyecto de ADOR OS).')
    }
    if (res.status === 401 || /insufficient|scope/i.test(raw)) throw new DriveNeedsConnectError()
    throw new Error(raw || 'Error al hablar con Google Drive.')
  }
  return data
}

// ---- Picker ----
let pickerReady = null
function loadPicker() {
  if (pickerReady) return pickerReady
  pickerReady = new Promise((resolve, reject) => {
    const done = () => window.gapi.load('picker', { callback: resolve, onerror: () => reject(new Error('No se pudo cargar el selector de Google Drive.')) })
    if (window.gapi) return done()
    const script = document.createElement('script')
    script.src = 'https://apis.google.com/js/api.js'
    script.async = true
    script.onload = done
    script.onerror = () => {
      pickerReady = null
      reject(new Error('No se pudo cargar el selector de Google Drive (¿sin conexión?).'))
    }
    document.head.appendChild(script)
  })
  return pickerReady
}

// Opens Google's own Drive picker: "Mi unidad / Compartidos / Recientes"
// plus a "Subir" tab that uploads from your computer straight into Drive.
// Resolves with the chosen files as small link records, or [] if cancelled.
//
// With the company folder set (Configuración → Carpeta de ADOR en Drive),
// the picker opens on it first and "Subir" uploads straight into it.
export async function pickDriveFiles(uid, { multiple = false, title = 'Elige un archivo de Google Drive', folderOnly = false } = {}) {
  if (!API_KEY) throw new Error('Falta la clave VITE_GOOGLE_API_KEY para el selector de Google Drive.')
  const [token, , companyFolder] = await Promise.all([getDriveToken(uid), loadPicker(), folderOnly ? null : getDriveFolder().catch(() => null)])
  const { google } = window
  return new Promise((resolve) => {
    const builder = new google.picker.PickerBuilder()
      .setTitle(title)
      .setLocale('es')
      .setOAuthToken(token)
      .setDeveloperKey(API_KEY)
      .setAppId(APP_ID)
      .enableFeature(google.picker.Feature.SUPPORT_DRIVES)
    if (folderOnly) {
      // Choosing the company folder itself: folders only, selectable.
      builder
        .addView(new google.picker.DocsView(google.picker.ViewId.FOLDERS).setIncludeFolders(true).setSelectFolderEnabled(true).setMimeTypes('application/vnd.google-apps.folder'))
        .addView(new google.picker.DocsView(google.picker.ViewId.FOLDERS).setEnableDrives(true).setIncludeFolders(true).setSelectFolderEnabled(true).setMimeTypes('application/vnd.google-apps.folder'))
    } else {
      if (companyFolder?.fileId) builder.addView(new google.picker.DocsView(google.picker.ViewId.DOCS).setParent(companyFolder.fileId).setIncludeFolders(true).setLabel(companyFolder.name || 'ADOR'))
      builder
        .addView(new google.picker.DocsView(google.picker.ViewId.DOCS).setIncludeFolders(true).setSelectFolderEnabled(false))
        .addView(new google.picker.DocsView(google.picker.ViewId.DOCS).setEnableDrives(true).setIncludeFolders(true))
      const upload = new google.picker.DocsUploadView().setIncludeFolders(true)
      if (companyFolder?.fileId) upload.setParent(companyFolder.fileId)
      builder.addView(upload)
    }
    builder
      .setCallback((data) => {
        if (data.action === google.picker.Action.PICKED) {
          resolve(
            (data.docs || []).map((d) => ({
              fileId: d.id,
              name: d.name,
              mimeType: d.mimeType,
              url: d.url,
              iconUrl: d.iconUrl || null,
              sizeBytes: d.sizeBytes ? Number(d.sizeBytes) : null,
            }))
          )
        } else if (data.action === google.picker.Action.CANCEL) {
          resolve([])
        }
      })
    if (multiple) builder.enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
    builder.build().setVisible(true)
  })
}

// Human label for a Drive file's type, from its MIME type.
export function driveFileKind(mimeType = '') {
  if (mimeType === 'application/pdf') return 'PDF'
  if (/spreadsheet|excel|sheet/.test(mimeType)) return 'Hoja de cálculo'
  if (/presentation|powerpoint|slides/.test(mimeType)) return 'Presentación'
  if (/document|word|msword/.test(mimeType)) return 'Documento'
  if (mimeType.startsWith('image/')) return 'Imagen'
  if (mimeType.startsWith('video/')) return 'Video'
  if (mimeType === 'application/vnd.google-apps.folder') return 'Carpeta'
  return 'Archivo'
}

// ---- Backup upload ----
// Backups go to "Respaldos" inside the company folder when one is set and
// this person's connection can write there (they chose it, or it's shared
// with them and ADOR OS was granted it); otherwise to "ADOR OS — Respaldos"
// in their own Drive, as before.
async function findOrCreateBackupFolder(token) {
  const company = await getDriveFolder().catch(() => null)
  if (company?.fileId) {
    try {
      const q = encodeURIComponent(`name='Respaldos' and '${company.fileId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`)
      const found = await driveFetch(token, `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&pageSize=1&supportsAllDrives=true&includeItemsFromAllDrives=true`)
      if (found.files?.[0]) return found.files[0].id
      const created = await driveFetch(token, 'https://www.googleapis.com/drive/v3/files?fields=id&supportsAllDrives=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Respaldos', mimeType: 'application/vnd.google-apps.folder', parents: [company.fileId] }),
      })
      return created.id
    } catch (error) {
      if (error instanceof DriveNeedsConnectError) throw error
      // No access to the company folder from this connection — fall back.
    }
  }
  const q = encodeURIComponent(`name='${BACKUP_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`)
  const found = await driveFetch(token, `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&pageSize=1`)
  if (found.files?.[0]) return found.files[0].id
  const created = await driveFetch(token, 'https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: BACKUP_FOLDER, mimeType: 'application/vnd.google-apps.folder' }),
  })
  return created.id
}

// Uploads the backup JSON into the "ADOR OS — Respaldos" folder of the
// admin's own Drive. Returns { id, name, webViewLink }.
export async function uploadBackupToDrive(uid, fileName, jsonText) {
  const token = await getDriveToken(uid)
  const folderId = await findOrCreateBackupFolder(token)
  const boundary = `ador-${Date.now().toString(36)}`
  const metadata = { name: fileName, mimeType: 'application/json', parents: [folderId] }
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    jsonText,
    `--${boundary}--`,
    '',
  ].join('\r\n')
  return driveFetch(token, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink&supportsAllDrives=true', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  })
}
