import { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ScatterChart, Scatter, ZAxis,
} from 'recharts'
import type { StatboticsTeamEvent, StatboticsMatch } from '../types'
import { fetchStatboticsTeamEvents, fetchStatboticsMatches } from '../utils/statboticsApi'
import { StatCard } from '../components/StatCard'
import { Loading } from '../components/Loading'
import { ErrorCard } from '../components/ErrorCard'
import { FRC_EVENT_CODE, FRC_SEASON } from '../constants'

type ActiveTab = 'teams' | 'matches'

const TOOLTIP_STYLE = {
  contentStyle: { background: '#0d0d1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 },
}

export function StatboticsView() {
  const [teamEvents, setTeamEvents] = useState<StatboticsTeamEvent[]>([])
  const [matches, setMatches] = useState<StatboticsMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<ActiveTab>('teams')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setErrors([])
    const errs: string[] = []

    const [teRes, mRes] = await Promise.allSettled([
      fetchStatboticsTeamEvents(),
      fetchStatboticsMatches(),
    ])

    if (teRes.status === 'fulfilled') setTeamEvents(teRes.value)
    else errs.push(`Team Events: ${teRes.reason instanceof Error ? teRes.reason.message : 'Error'}`)

    if (mRes.status === 'fulfilled') setMatches(mRes.value)
    else errs.push(`Matches: ${mRes.reason instanceof Error ? mRes.reason.message : 'Error'}`)

    setErrors(errs)
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <Loading label="Querying Statbotics API…" />

  const qualMatches = matches.filter(m => m.comp_level === 'qm')
  const played = qualMatches.filter(m => m.status === 'Completed' && m.alliances != null)

  const ranked = [...teamEvents]
    .filter(t => t.epa?.total_points?.mean != null)
    .sort((a, b) => (b.epa?.total_points?.mean ?? 0) - (a.epa?.total_points?.mean ?? 0))

  const avgEpa = ranked.length
    ? Math.round((ranked.reduce((s, t) => s + (t.epa?.total_points?.mean ?? 0), 0) / ranked.length) * 10) / 10
    : 0

  const avgRedScore = played.length
    ? Math.round(played.reduce((s, m) => s + (m.alliances?.red.score ?? 0), 0) / played.length)
    : 0

  const avgBlueScore = played.length
    ? Math.round(played.reduce((s, m) => s + (m.alliances?.blue.score ?? 0), 0) / played.length)
    : 0

  const top20 = ranked.slice(0, 20).map(t => ({
    name: String(t.team),
    epa: Math.round((t.epa?.total_points?.mean ?? 0) * 10) / 10,
  }))

  const scatterData = ranked.map(t => ({
    x: Math.round((t.epa?.breakdown?.auto_points?.mean ?? 0) * 10) / 10,
    y: Math.round((t.epa?.breakdown?.teleop_points?.mean ?? 0) * 10) / 10,
    z: Math.round((t.epa?.breakdown?.endgame_points?.mean ?? 0) * 10) / 10,
    team: t.team,
  }))

  const filteredTeams = ranked.filter(t =>
    !search || String(t.team).includes(search)
  )

  return (
    <div className="view-content">
      <div className="api-header">
        <div>
          <h2 className="view-title">Statbotics</h2>
          <p className="view-subtitle">api.statbotics.io · EPA Analytics · {FRC_SEASON} · {FRC_EVENT_CODE}</p>
        </div>
        <button className="btn btn-outline" onClick={load}><span className="material-icons" style={{ fontSize: 16 }}>refresh</span> Refresh</button>
      </div>

      {errors.length > 0 && (
        <div className="error-list">
          {errors.map((e, i) => <ErrorCard key={i} message={e} onRetry={load} />)}
        </div>
      )}

      <div className="stat-grid">
        <StatCard label="Teams" value={teamEvents.length} icon="smart_toy" color="#22c55e" />
        <StatCard label="Matches Played" value={played.length} icon="sports" color="#8b5cf6" />
        <StatCard label="Avg EPA" value={avgEpa} icon="analytics" color="#f59e0b" />
        <StatCard
          label="Top EPA"
          value={ranked[0]?.epa?.total_points?.mean?.toFixed(1) ?? '—'}
          icon="grade"
          color="#f59e0b"
          sub={ranked[0] ? `Team ${ranked[0].team}` : ''}
        />
        <StatCard label="Avg Red Score" value={avgRedScore} icon="circle" color="#ef4444" />
        <StatCard label="Avg Blue Score" value={avgBlueScore} icon="circle" color="#3b82f6" />
      </div>

      {ranked.length > 0 && (
        <div className="charts-grid">
          <div className="chart-card">
            <h3>Top 20 — EPA (Expected Points Added)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={top20} margin={{ bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={0} angle={-45} textAnchor="end" />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="epa" fill="#22c55e" radius={[4, 4, 0, 0]} name="EPA" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>Auto EPA vs Teleop EPA</h3>
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="x" name="Auto EPA" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} label={{ value: 'Auto', fill: '#64748b', position: 'insideBottom', offset: -5 }} />
                <YAxis dataKey="y" name="Teleop EPA" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <ZAxis dataKey="z" name="Endgame EPA" range={[40, 200]} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload as { x: number; y: number; z: number; team: number }
                    return (
                      <div style={{ background: '#0d0d1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                        <div style={{ color: '#a78bfa', fontWeight: 700 }}>Team {d.team}</div>
                        <div>Auto: {d.x}</div>
                        <div>Teleop: {d.y}</div>
                        <div>Endgame: {d.z}</div>
                      </div>
                    )
                  }}
                />
                <Scatter data={scatterData} fill="#22c55e" fillOpacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {played.length > 0 && (
        <div className="chart-card wide">
          <h3>Match Scores (first 30 played)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={played.slice(0, 30).map(m => ({
                match: `Q${m.match_number}`,
                red: m.alliances?.red.score ?? 0,
                blue: m.alliances?.blue.score ?? 0,
              }))}
              margin={{ bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="match" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="red" fill="#ef4444" radius={[3, 3, 0, 0]} name="Red Score" />
              <Bar dataKey="blue" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Blue Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar">
        {(['teams', 'matches'] as const).map(t => (
          <button key={t} className={`tab-btn${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <input
          className="search-input"
          placeholder="Search team #…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginLeft: 'auto' }}
        />
      </div>

      {activeTab === 'teams' && (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Team #</th>
                  <th>EPA</th>
                  <th>Auto EPA</th>
                  <th>Teleop EPA</th>
                  <th>Endgame EPA</th>
                  <th>W</th>
                  <th>L</th>
                  <th>T</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeams.map((t, i) => (
                  <tr key={i}>
                    <td><span className="rank-badge">#{i + 1}</span></td>
                    <td><strong style={{ color: '#4ade80' }}>{t.team}</strong></td>
                    <td><strong style={{ color: '#22c55e' }}>{t.epa?.total_points?.mean?.toFixed(1) ?? '—'}</strong></td>
                    <td>{t.epa?.breakdown?.auto_points?.mean?.toFixed(1) ?? '—'}</td>
                    <td>{t.epa?.breakdown?.teleop_points?.mean?.toFixed(1) ?? '—'}</td>
                    <td>{t.epa?.breakdown?.endgame_points?.mean?.toFixed(1) ?? '—'}</td>
                    <td style={{ color: '#22c55e' }}>{t.record?.wins ?? '—'}</td>
                    <td style={{ color: '#ef4444' }}>{t.record?.losses ?? '—'}</td>
                    <td style={{ color: '#f59e0b' }}>{t.record?.ties ?? '—'}</td>
                  </tr>
                ))}
                {filteredTeams.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>No data yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'matches' && (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Match</th>
                  <th>Red 1</th><th>Red 2</th><th>Red 3</th>
                  <th>Red Score</th>
                  <th>Blue Score</th>
                  <th>Blue 1</th><th>Blue 2</th><th>Blue 3</th>
                  <th>Winner</th>
                </tr>
              </thead>
              <tbody>
                {qualMatches.map((m, i) => {
                  const hasScore = m.status === 'Completed'
                  const redWin = hasScore && (m.alliances?.red.score ?? 0) > (m.alliances?.blue.score ?? 0)
                  const blueWin = hasScore && (m.alliances?.blue.score ?? 0) > (m.alliances?.red.score ?? 0)
                  const reds = m.alliances?.red.team_keys ?? []
                  const blues = m.alliances?.blue.team_keys ?? []
                  return (
                    <tr key={i} className={!hasScore ? 'unplayed' : ''}>
                      <td><strong>Q{m.match_number}</strong></td>
                      {[0, 1, 2].map(j => (
                        <td key={j} style={{ color: '#fca5a5' }}>{reds[j] ?? '—'}</td>
                      ))}
                      <td style={{ color: redWin ? '#22c55e' : hasScore ? '#ef4444' : '#64748b', fontWeight: 600 }}>
                        {hasScore ? m.alliances?.red.score : '—'}
                      </td>
                      <td style={{ color: blueWin ? '#22c55e' : hasScore ? '#ef4444' : '#64748b', fontWeight: 600 }}>
                        {hasScore ? m.alliances?.blue.score : '—'}
                      </td>
                      {[0, 1, 2].map(j => (
                        <td key={j} style={{ color: '#93c5fd' }}>{blues[j] ?? '—'}</td>
                      ))}
                      <td>
                        {hasScore ? (
                          <span className={`badge ${redWin ? 'badge-red' : blueWin ? 'badge-blue' : 'badge-gray'}`}>
                            {redWin ? 'Red' : blueWin ? 'Blue' : 'Tie'}
                          </span>
                        ) : <span className="badge badge-gray">Scheduled</span>}
                      </td>
                    </tr>
                  )
                })}
                {qualMatches.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>No matches available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
