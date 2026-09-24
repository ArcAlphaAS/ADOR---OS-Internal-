import { Component } from 'react'
import { reportError } from '../../lib/errorLog'

// If a module crashes while rendering, show a calm "algo falló" card with a
// Reintentar button instead of a blank screen — the rest of ADOR OS (top
// bar, sidebar, chat notifications) keeps working. The error is reported to
// Administración → Errores (lib/errorLog.js). `resetKey` (the module id)
// clears the error when you move to another module.
export default class ModuleErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    reportError(error, { source: 'render' })
    if (info?.componentStack) console.error(info.componentStack)
  }

  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex h-full items-center justify-center p-10">
        <div className="ador-glass ador-grain max-w-[420px] rounded-2xl p-7 text-center">
          <p className="text-[15px] font-semibold text-[#F5F5F5]">Algo falló en esta sección</p>
          <p className="mt-2 text-[13px] leading-relaxed text-[#888888]">
            Ya quedó registrado para revisarlo. El resto de ADOR OS sigue funcionando — puedes reintentar o ir a otra sección.
          </p>
          <button type="button" onClick={() => this.setState({ error: null })} className="ador-btn-primary mt-5 rounded-xl px-4 py-2 text-[13px] font-medium">
            Reintentar
          </button>
        </div>
      </div>
    )
  }
}
