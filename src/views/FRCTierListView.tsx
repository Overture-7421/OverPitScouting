import { useState, useEffect, useCallback } from 'react'
import type { FRCScoutingRecord, TierLevel, TierState } from '../types'
import { computeFRCScore, frcScoreToTier } from '../utils/frcScore'
import { TIER_META } from '../constants'

interface Props {
  records: FRCScoutingRecord[]
}

const TIERS: TierLevel[] = ['S', 'A', 'B', 'C', 'NO']

function buildInitialState(records: FRCScoutingRecord[]): TierState {
  const state: TierState = { S: [], A: [], B: [], C: [], NO: [], unranked: [] }
  records.forEach(r => {
    const tier = frcScoreToTier(computeFRCScore(r))
    state[tier].push(r.team_number)
  })
  return state
}

function chassisIcon(chassis: string): string {
  if (chassis === 'Swerve') return '🔄'
  if (chassis === 'Mecanum') return '⚙️'
  return '🚗'
}

function specIcon(spec: string): string {
  const map: Record<string, string> = { Score: '⚽', Feed: '🤲', Steal: '🦹', Defend: '🛡️', Overall: '⭐' }
  return map[spec] ?? ''
}

export function FRCTierListView({ records }: Props) {
  const [tiers, setTiers] = useState<TierState>({ S: [], A: [], B: [], C: [], NO: [], unranked: [] })
  const [dragging, setDragging] = useState<{ team: number; from: TierLevel | 'unranked' } | null>(null)
  const [dragOver, setDragOver] = useState<TierLevel | 'unranked' | null>(null)
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [noteTeam, setNoteTeam] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [scoreMap, setScoreMap] = useState<Record<number, number>>({})

  const reset = useCallback(() => {
    if (records.length === 0) {
      setTiers({ S: [], A: [], B: [], C: [], NO: [], unranked: [] })
      return
    }
    const s: Record<number, number> = {}
    records.forEach(r => { s[r.team_number] = computeFRCScore(r) })
    setScoreMap(s)
    setTiers(buildInitialState(records))
  }, [records])

  useEffect(() => { reset() }, [reset])

  function moveTeam(team: number, from: TierLevel | 'unranked', to: TierLevel | 'unranked') {
    if (from === to) return
    setTiers(prev => {
      const next = { ...prev } as TierState
      if (from === 'unranked') next.unranked = prev.unranked.filter(t => t !== team)
      else next[from] = prev[from].filter(t => t !== team)
      if (to === 'unranked') next.unranked = [...prev.unranked, team]
      else next[to] = [...prev[to], team]
      return next
    })
  }

  function handleDrop(to: TierLevel | 'unranked') {
    if (!dragging) return
    moveTeam(dragging.team, dragging.from, to)
    setDragging(null)
    setDragOver(null)
  }

  function getRecord(team: number): FRCScoutingRecord | undefined {
    return records.find(r => r.team_number === team)
  }

  function exportTiers() {
    const lines = ['Team,Tier,Score,Notes']
    TIERS.forEach(t => {
      tiers[t].forEach(team => {
        lines.push(`${team},${t},${scoreMap[team] ?? ''},${(notes[team] ?? '').replace(',', ';')}`)
      })
    })
    tiers.unranked.forEach(team => {
      lines.push(`${team},Unranked,${scoreMap[team] ?? ''},${(notes[team] ?? '').replace(',', ';')}`)
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'frc_tier_list.csv'
    a.click()
  }

  if (records.length === 0) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: 48 }}>🏅</div>
        <h2>No FRC Data Yet</h2>
        <p style={{ color: '#64748b' }}>Upload a CSV in Pit Scouting to auto-rank teams</p>
      </div>
    )
  }

  const allTeams = [...TIERS.flatMap(t => tiers[t]), ...tiers.unranked]
  const visibleSearch = search ? allTeams.filter(t => String(t).includes(search)) : null

  function renderChip(team: number, zone: TierLevel | 'unranked') {
    const rec = getRecord(team)
    const score = scoreMap[team] ?? 0
    const meta = zone !== 'unranked' ? TIER_META[zone] : null
    const isSearchHidden = visibleSearch && !visibleSearch.includes(team)
    if (isSearchHidden) return null

    return (
      <div
        key={team}
        className={`team-chip${dragging?.team === team ? ' dragging' : ''}`}
        style={{ borderColor: meta?.color ?? '#4b5563' }}
        draggable
        onDragStart={() => setDragging({ team, from: zone })}
        onDragEnd={() => { setDragging(null); setDragOver(null) }}
        onClick={() => setNoteTeam(noteTeam === team ? null : team)}
      >
        <div className="team-chip-top">
          <strong style={{ fontSize: 14, color: meta?.color ?? '#9ca3af' }}>{team}</strong>
          <span className="chip-score">{score}pt</span>
        </div>
        <div className="chip-details">
          {rec && (
            <>
              <span title="Chassis">{chassisIcon(rec.mech_chassis_type)}</span>
              {rec.prog_path_planner === 'Si' && <span title="Path Planner">📍</span>}
              {rec.elec_canivore === 'Si' && <span title="CANivore">⚡</span>}
              {rec.robot_specialization && <span title={`Spec: ${rec.robot_specialization}`}>{specIcon(rec.robot_specialization)}</span>}
              {rec.elec_battery_peak === 'Si' && <span title="Battery Peak">🔋</span>}
            </>
          )}
        </div>
        {notes[team] && <div className="chip-note">{notes[team]}</div>}
        {noteTeam === team && (
          <textarea
            className="chip-textarea"
            placeholder="Add notes…"
            value={notes[team] ?? ''}
            onClick={e => e.stopPropagation()}
            onChange={e => setNotes(n => ({ ...n, [team]: e.target.value }))}
            onDragStart={e => e.stopPropagation()}
            autoFocus
          />
        )}
      </div>
    )
  }

  function renderZone(zone: TierLevel | 'unranked') {
    const teams = zone === 'unranked' ? tiers.unranked : tiers[zone]
    const meta = zone !== 'unranked' ? TIER_META[zone] : null

    return (
      <div
        key={zone}
        className={`tier-row${zone === 'unranked' ? ' tier-unranked' : ''}${dragOver === zone ? ' drag-target' : ''}`}
        style={{ borderLeftColor: meta?.color ?? '#4b5563', boxShadow: dragOver === zone ? `0 0 0 2px ${meta?.color ?? '#4b5563'}` : undefined }}
        onDragOver={e => { e.preventDefault(); setDragOver(zone) }}
        onDragLeave={() => setDragOver(null)}
        onDrop={() => handleDrop(zone)}
      >
        <div className="tier-label">
          {zone !== 'unranked' ? (
            <>
              <span className="tier-letter" style={{ color: meta?.color }}>{zone}</span>
              <span className="tier-desc" style={{ color: meta?.color, opacity: 0.7 }}>
                {zone === 'S' ? 'Essential' : zone === 'A' ? 'Strong' : zone === 'B' ? 'Solid' : zone === 'C' ? 'Possible' : 'Do Not Pick'}
              </span>
            </>
          ) : (
            <>
              <span className="tier-letter" style={{ color: '#6b7280', fontSize: 20 }}>POOL</span>
              <span className="tier-desc">Unranked</span>
            </>
          )}
        </div>
        <div className="tier-teams">
          {teams.length === 0
            ? <span className="tier-empty">Drop teams here</span>
            : teams.map(t => renderChip(t, zone))}
        </div>
      </div>
    )
  }

  return (
    <div className="view-content">
      <div className="toolbar">
        <div className="toolbar-left">
          <button className="btn btn-outline" onClick={reset}>↺ Reset to Auto</button>
          <button className="btn btn-primary" onClick={exportTiers}>↓ Export CSV</button>
          <span className="record-count">{records.length} teams · drag chips to re-rank</span>
        </div>
        <input
          className="search-input"
          placeholder="Search team #…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="tier-list">
        {TIERS.map(t => renderZone(t))}
        {tiers.unranked.length > 0 && renderZone('unranked')}
      </div>

      <div className="tier-legend">
        <h4>FRC Scoring Legend (max ~128 pts)</h4>
        <div className="legend-grid">
          <span>🔄 Swerve +15 · Mecanum +8 · Tank +5</span>
          <span>📍 Path Planner +10</span>
          <span>⚡ CANivore +8</span>
          <span>🎯 Perfect Auto +15 · ≥7/10 +8</span>
          <span>🗺️ Odometry: Sensor Fusion +10 · AprilTag +9 · Swerve +7</span>
          <span>🏅 S ≥ 90 · A ≥ 70 · B ≥ 50 · C ≥ 30</span>
        </div>
      </div>
    </div>
  )
}
