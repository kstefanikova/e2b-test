import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import MetadataBar from './components/MetadataBar'
import LifecycleTimeline from './components/LifecycleTimeline'
import MetricsPanel from './components/MetricsPanel'
import RuntimeLogs from './components/RuntimeLogs'

export default function App() {
  const [paused, setPaused] = useState(false)
  const [killed, setKilled] = useState(false)
  const [logHighlight, setLogHighlight] = useState(null) // { type, fromLabel, toLabel, label }

  const handleKill = () => {
    setKilled(true)
    setPaused(false)
  }

  const effectivelyPaused = paused || killed

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header paused={paused} killed={killed} onTogglePause={() => setPaused(p => !p)} onKill={handleKill} onRestore={() => setKilled(false)} />
        <div className="border-t border-[#D6D6D6]" />
        <MetadataBar paused={effectivelyPaused} killed={killed} />
        <LifecycleTimeline paused={effectivelyPaused} killed={killed} onSegmentClick={setLogHighlight} />
        {/* Combined metrics + logs section */}
        <div className="flex-1 min-h-0 flex flex-col px-6 pt-8 pb-4">
          <MetricsPanel paused={effectivelyPaused} />
          <div className="flex-1 min-h-0 flex flex-col -mx-px">
            <RuntimeLogs paused={effectivelyPaused} killed={killed} logHighlight={logHighlight} onClearHighlight={() => setLogHighlight(null)} />
          </div>
        </div>
      </div>
    </div>
  )
}
