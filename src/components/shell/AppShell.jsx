import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ModulePlaceholder from './ModulePlaceholder'
import HomeScreen from '../home/HomeScreen'

const MODULE_LABELS = {
  inicio: 'Inicio',
  workspace: 'Workspace',
  objetivos: 'Objetivos',
  calendario: 'Calendario',
  clientes: 'Clientes',
  conocimiento: 'Conocimiento',
  comunidad: 'Comunidad',
  chat: 'Chat',
  news: 'News',
  directorio: 'Directorio',
  'ador-ia': 'ADOR IA',
}

export default function AppShell({ user, onSignOut, onUpdateDisplayName, onResetPassword }) {
  const [activeModule, setActiveModule] = useState('inicio')

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden bg-[#0A0A0A]"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at 50% 30%, rgba(30,95,173,0.06) 0%, transparent 60%)',
      }}
    >
      <TopBar
        user={user}
        onSignOut={onSignOut}
        onUpdateDisplayName={onUpdateDisplayName}
        onResetPassword={onResetPassword}
        activeModule={activeModule}
        onNavigate={setActiveModule}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar activeModule={activeModule} onNavigate={setActiveModule} />

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            {activeModule === 'inicio' ? (
              <HomeScreen key="inicio" user={user} onNavigate={setActiveModule} />
            ) : (
              <ModulePlaceholder key={activeModule} name={MODULE_LABELS[activeModule]} />
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
