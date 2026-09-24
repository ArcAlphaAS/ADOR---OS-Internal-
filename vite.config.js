import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Each build gets an id, baked into the app (__BUILD_ID__) and published as
// /version.json. The open app checks that file now and then; when it no
// longer matches, a newer version is live and it offers "Actualizar"
// (hooks/useAppUpdate.js) — so nobody has to close and reopen the app.
const BUILD_ID = String(Date.now())

function versionFile() {
  return {
    name: 'ador-version-file',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_ID }) })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), versionFile()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  server: {
    port: Number(process.env.PORT) || 5173,
  },
})
