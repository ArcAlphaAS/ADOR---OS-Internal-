import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ModulePlaceholder from './ModulePlaceholder'
import HomeScreen from '../home/HomeScreen'
import ClientesModule from '../clientes/ClientesModule'
import FinanzasModule from '../finanzas/FinanzasModule'
import WorkspaceModule from '../workspace/WorkspaceModule'

const MODULE_LABELS = {
  inicio: 'Inicio',
  workspace: 'Workspace',
  objetivos: 'Objetivos',
  calendario: 'Calendario',
  clientes: 'Clientes',
  finanzas: 'Finanzas',
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
            ) : activeModule === 'workspace' ? (
              <WorkspaceModule key="workspace" user={user} />
            ) : activeModule === 'clientes' ? (
              <ClientesModule key="clientes" user={user} />
            ) : activeModule === 'finanzas' ? (
              <FinanzasModule key="finanzas" user={user} />
            ) : (
              <ModulePlaceholder key={activeModule} name={MODULE_LABELS[activeModule]} />
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
