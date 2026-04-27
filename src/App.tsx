import { useState } from 'react'
import type { ViewId, FRCViewId, ScoutingRecord, FRCScoutingRecord } from './types'
import { PitScoutingView } from './views/PitScoutingView'
import { GraphQLView } from './views/GraphQLView'
import { ApiView } from './views/ApiView'
import { TierListView } from './views/TierListView'
import { FRCPitScoutingView } from './views/FRCPitScoutingView'
import { TBAView } from './views/TBAView'
import { StatboticsView } from './views/StatboticsView'
import { FRCTierListView } from './views/FRCTierListView'
import { ModeChooser } from './components/ModeChooser'
import './App.css'

const FTC_NAV: { id: ViewId; label: string; icon: string }[] = [
  { id: 'pitscouting', label: 'Pit Scouting', icon: '🔧' },
  { id: 'graphql',     label: 'GraphQL',      icon: '⬡' },
  { id: 'api',         label: 'REST API',      icon: '☁' },
  { id: 'tierlist',    label: 'Tier List',     icon: '🏅' },
]

const FRC_NAV: { id: FRCViewId; label: string; icon: string }[] = [
  { id: 'pitscouting', label: 'Pit Scouting',   icon: '🔧' },
  { id: 'tba',         label: 'Blue Alliance',   icon: '🔵' },
  { id: 'statbotics',  label: 'Statbotics',      icon: '📊' },
  { id: 'tierlist',    label: 'Tier List',        icon: '🏅' },
]

export default function App() {
  const [mode, setMode] = useState<'ftc' | 'frc' | null>(null)
  const [ftcView, setFtcView] = useState<ViewId>('pitscouting')
  const [frcView, setFrcView] = useState<FRCViewId>('pitscouting')
  const [ftcRecords, setFtcRecords] = useState<ScoutingRecord[]>([])
  const [frcRecords, setFrcRecords] = useState<FRCScoutingRecord[]>([])

  if (mode === null) return <ModeChooser onSelect={setMode} />

  if (mode === 'ftc') {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-brand">
            <span className="brand-logo">⬡</span>
            <div className="brand-text">
              <span className="brand-name">FTC Pit Analyzer</span>
              <span className="brand-sub">OVERTURE · FTCCMP1GOOD · 2025</span>
            </div>
          </div>
          <nav className="app-nav">
            {FTC_NAV.map(n => (
              <button
                key={n.id}
                className={`nav-btn${ftcView === n.id ? ' active' : ''}`}
                onClick={() => setFtcView(n.id)}
              >
                <span className="nav-icon">{n.icon}</span>
                <span className="nav-label">{n.label}</span>
              </button>
            ))}
          </nav>
          <button className="btn btn-outline mode-switch-btn" onClick={() => setMode(null)}>
            ⬡ Switch Program
          </button>
        </header>
        <main className="app-main" key={ftcView}>
          {ftcView === 'pitscouting' && <PitScoutingView records={ftcRecords} onLoad={setFtcRecords} />}
          {ftcView === 'graphql'     && <GraphQLView />}
          {ftcView === 'api'         && <ApiView />}
          {ftcView === 'tierlist'    && <TierListView records={ftcRecords} />}
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header app-header-frc">
        <div className="header-brand">
          <span className="brand-logo brand-logo-frc">⬡</span>
          <div className="brand-text">
            <span className="brand-name">FRC Pit Analyzer</span>
            <span className="brand-sub">OVERTURE · FRC · 2025</span>
          </div>
        </div>
        <nav className="app-nav">
          {FRC_NAV.map(n => (
            <button
              key={n.id}
              className={`nav-btn${frcView === n.id ? ' active frc-active' : ''}`}
              onClick={() => setFrcView(n.id)}
            >
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-label">{n.label}</span>
            </button>
          ))}
        </nav>
        <button className="btn btn-outline mode-switch-btn" onClick={() => setMode(null)}>
          ⬡ Switch Program
        </button>
      </header>
      <main className="app-main" key={frcView}>
        {frcView === 'pitscouting' && <FRCPitScoutingView records={frcRecords} onLoad={setFrcRecords} />}
        {frcView === 'tba'         && <TBAView />}
        {frcView === 'statbotics'  && <StatboticsView />}
        {frcView === 'tierlist'    && <FRCTierListView records={frcRecords} />}
      </main>
    </div>
  )
}
