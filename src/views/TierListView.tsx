import { useState, useEffect, useCallback } from 'react'
import type { ScoutingRecord, TierLevel, TierState } from '../types'
import { computeScore, scoreToTier } from '../utils/score'
import { TIER_META } from '../constants'

interface Props {
  records: ScoutingRecord[]
}

const TIERS: TierLevel[] = ['S', 'A', 'B', 'C', 'NO']

function buildInitialState(records: ScoutingRecord[]): TierState {
  const state: TierState = { S: [], A: [], B: [], C: [], NO: [], unranked: [] }
  records.forEach(r => {
    const tier = scoreToTier(computeScore(r))
    state[tier].push(r.team_number)
  })
  return state
}

export function TierListView({ records }: Props) {
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
    records.forEach(r => { s[r.team_number] = computeScore(r) })
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

  function getRecord(team: number): ScoutingRecord | undefined {
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
    a.download = 'tier_list.csv'
    a.click()
  }

  const totalTeams = TIERS.reduce((a, t) => a + tiers[t].length, 0) + tiers.unranked.length

  if (records.length === 0) {
    return (
      <div className="view-content">
        <div className="empty-state">
          <div style={{ fontSize: 64, marginBottom: 16 }}>🏅</div>
          <h2>No Scouting Data</h2>
          <p style={{ color: '#94a3b8' }}>Upload a CSV in the Pit Scouting tab to populate the tier list.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="view-content">
      <div className="api-header">
        <div>
          <h2 className="view-title">Team Tier List</h2>
          <p className="view-subtitle">{totalTeams} teams · Drag teams between tiers · Auto-scored from pit data</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="search-input" placeholder="Search team #…" value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn btn-outline" onClick={reset}>↺ Reset</button>
          <button className="btn btn-primary" onClick={exportTiers}>⬇ Export CSV</button>
        </div>
      </div>

      <div className="tier-list">
        {TIERS.map(tier => {
          const meta = TIER_META[tier]
          const teams = tiers[tier].filter(t => !search || String(t).includes(search))
          return (
            <div
              key={tier}
              className={`tier-row${dragOver === tier ? ' drag-target' : ''}`}
              style={{ borderLeftColor: meta.color, boxShadow: dragOver === tier ? `0 0 20px ${meta.glow}` : undefined }}
              onDragOver={e => { e.preventDefault(); setDragOver(tier) }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null) }}
              onDrop={() => handleDrop(tier)}
            >
              <div className="tier-label" style={{ color: meta.color, background: `${meta.glow}` }}>
                <span className="tier-letter">{tier}</span>
                <span className="tier-desc">{meta.label.split('—')[1]?.trim()}</span>
              </div>
              <div className="tier-teams">
                {teams.map(team => {
                  const rec = getRecord(team)
                  const score = scoreMap[team] ?? 0
                  return (
                    <div
                      key={team}
                      className={`team-chip${dragging?.team === team ? ' dragging' : ''}`}
                      draggable
                      onDragStart={() => setDragging({ team, from: tier })}
                      onDragEnd={() => { setDragging(null); setDragOver(null) }}
                      style={{ borderColor: meta.color }}
                    >
                      <div className="team-chip-top">
                        <strong style={{ color: meta.color }}>#{team}</strong>
                        <span className="chip-score" title="Auto score">{score}</span>
                      </div>
                      {rec && (
                        <div className="chip-details">
                          <span title="Climb">{rec.mech_has_climb ? '🧗' : ''}</span>
                          <span title="Vision">{rec.prog_vision ? '👁' : ''}</span>
                          <span title="Odometry">{rec.prog_odometry ? '📡' : ''}</span>
                          <span title="Auto">{rec.prog_has_auto ? `⚡${rec.prog_auto_count}` : ''}</span>
                          <span title="Alliance">{rec.comp_alliance_willing ? '🤝' : ''}</span>
                        </div>
                      )}
                      {notes[team] && <div className="chip-note">📝 {notes[team].slice(0, 30)}{notes[team].length > 30 ? '…' : ''}</div>}
                      <button
                        className="chip-note-btn"
                        onClick={() => setNoteTeam(noteTeam === team ? null : team)}
                        title="Add note"
                      >✏</button>
                      {noteTeam === team && (
                        <textarea
                          className="chip-textarea"
                          autoFocus
                          value={notes[team] ?? ''}
                          placeholder="Add note…"
                          onChange={e => setNotes(n => ({ ...n, [team]: e.target.value }))}
                          onBlur={() => setNoteTeam(null)}
                          onClick={e => e.stopPropagation()}
                        />
                      )}
                    </div>
                  )
                })}
                {teams.length === 0 && (
                  <div className="tier-empty">Drop teams here</div>
                )}
              </div>
            </div>
          )
        })}

        {/* Unranked pool */}
        {tiers.unranked.length > 0 && (
          <div
            className={`tier-row tier-unranked${dragOver === 'unranked' ? ' drag-target' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver('unranked') }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null) }}
            onDrop={() => handleDrop('unranked')}
          >
            <div className="tier-label" style={{ color: '#64748b', background: 'rgba(100,116,139,0.15)' }}>
              <span className="tier-letter">?</span>
              <span className="tier-desc">Unranked</span>
            </div>
            <div className="tier-teams">
              {tiers.unranked
                .filter(t => !search || String(t).includes(search))
                .map(team => {
                  const rec = getRecord(team)
                  const score = scoreMap[team] ?? 0
                  return (
                    <div
                      key={team}
                      className={`team-chip${dragging?.team === team ? ' dragging' : ''}`}
                      draggable
                      onDragStart={() => setDragging({ team, from: 'unranked' })}
                      onDragEnd={() => { setDragging(null); setDragOver(null) }}
                      style={{ borderColor: '#4b5563' }}
                    >
                      <div className="team-chip-top">
                        <strong style={{ color: '#94a3b8' }}>#{team}</strong>
                        <span className="chip-score">{score}</span>
                      </div>
                      {rec && (
                        <div className="chip-details">
                          <span>{rec.mech_has_climb ? '🧗' : ''}</span>
                          <span>{rec.prog_vision ? '👁' : ''}</span>
                          <span>{rec.prog_odometry ? '📡' : ''}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="tier-legend">
        <h4>Scoring Legend</h4>
        <div className="legend-grid">
          <span>🧗 Has Climb (+15)</span>
          <span>👁 Vision (+8)</span>
          <span>📡 Odometry (+7)</span>
          <span>⚡ Autonomy (+5+)</span>
          <span>🤝 Alliance Willing (+10)</span>
          <span>🏆 5+ Years Exp (+10)</span>
          <span>💡 Drive Coach (+5)</span>
          <span>📋 Strategy (+5)</span>
          <span>S ≥ 90 pts · A ≥ 70 · B ≥ 50 · C ≥ 30 · NO &lt; 30</span>
        </div>
      </div>
    </div>
  )
}
