import { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis,
} from 'recharts'
import type { GQLEventData, GQLTeamParticipation } from '../types'
import { fetchGQLEvent } from '../utils/graphql'
import { StatCard } from '../components/StatCard'
import { Loading } from '../components/Loading'
import { ErrorCard } from '../components/ErrorCard'
import { EVENT_CODE, SEASON, CHART_COLORS } from '../constants'

type SortDir = 'asc' | 'desc'
type SortKey = keyof Pick<GQLTeamParticipation, 'teamNumber'> | 'rank' | 'rp' | 'wins' | 'losses' | 'ties' | 'opr'
type ActiveTab = 'rankings' | 'matches' | 'teams'

export function GraphQLView() {
  const [data, setData] = useState<GQLEventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [activeTab, setActiveTab] = useState<ActiveTab>('rankings')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetchGQLEvent())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <Loading label="Querying FTCScout GraphQL…" />
  if (error) return (
    <div className="view-content">
      <div className="api-header">
        <div>
          <h2 className="view-title">FTCScout GraphQL</h2>
          <p className="view-subtitle">api.ftcscout.org · Season {SEASON} · {EVENT_CODE}</p>
        </div>
      </div>
      <ErrorCard message={error} onRetry={load} />
    </div>
  )
  if (!data) return null

  const allTeams = data.teams ?? []
  const allMatches = data.matches ?? []
  const playedMatches = allMatches.filter(m => m.hasBeenPlayed)
  const rankedTeams = allTeams.filter(t => t.stats?.rank != null)

  // Derive rankings from team stats
  function getNum(t: GQLTeamParticipation, k: SortKey): number {
    switch (k) {
      case 'rank':    return t.stats?.rank ?? 9999
      case 'rp':      return t.stats?.rp ?? 0
      case 'wins':    return t.stats?.wins ?? 0
      case 'losses':  return t.stats?.losses ?? 0
      case 'ties':    return t.stats?.ties ?? 0
      case 'opr':     return t.stats?.opr?.totalPoints ?? 0
      case 'teamNumber': return t.teamNumber
      default:        return 0
    }
  }

  const filteredTeams = rankedTeams
    .filter(t => !search || String(t.teamNumber).includes(search) || (t.team?.name ?? '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const cmp = getNum(a, sortKey) - getNum(b, sortKey)
      return sortDir === 'asc' ? cmp : -cmp
    })

  function setSort(k: SortKey) {
    if (k === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
  }

  // Chart data
  const top20RP = rankedTeams
    .sort((a, b) => (a.stats?.rank ?? 9999) - (b.stats?.rank ?? 9999))
    .slice(0, 20)
    .map(t => ({ name: String(t.teamNumber), rp: t.stats?.rp ?? 0, opr: t.stats?.opr?.totalPoints ?? 0 }))

  const wlData = [
    { name: 'Wins', value: rankedTeams.reduce((a, t) => a + (t.stats?.wins ?? 0), 0) },
    { name: 'Losses', value: rankedTeams.reduce((a, t) => a + (t.stats?.losses ?? 0), 0) },
    { name: 'Ties', value: rankedTeams.reduce((a, t) => a + (t.stats?.ties ?? 0), 0) },
  ]

  const scatterData = rankedTeams.map(t => ({
    x: t.stats?.opr?.autoPoints ?? 0,
    y: t.stats?.opr?.dcPoints ?? 0,
    z: t.stats?.rp ?? 0,
    team: t.teamNumber,
  }))

  const avgRed = playedMatches.length ? Math.round(playedMatches.reduce((a, m) => a + (m.scores?.red?.totalPoints ?? 0), 0) / playedMatches.length) : 0
  const avgBlue = playedMatches.length ? Math.round(playedMatches.reduce((a, m) => a + (m.scores?.blue?.totalPoints ?? 0), 0) / playedMatches.length) : 0
  const topOPR = rankedTeams.reduce((best, t) => (t.stats?.opr?.totalPoints ?? 0) > best ? (t.stats?.opr?.totalPoints ?? 0) : best, 0)

  return (
    <div className="view-content">
      <div className="api-header">
        <div>
          <h2 className="view-title">FTCScout GraphQL</h2>
          <p className="view-subtitle">api.ftcscout.org · {data.name} · {SEASON}</p>
        </div>
        <button className="btn btn-outline" onClick={load}>↻ Refresh</button>
      </div>

      {data.location && (
        <div className="location-badge">
          📍 {[data.location.venue, data.location.city, data.location.state, data.location.country].filter(Boolean).join(', ')}
        </div>
      )}

      <div className="stat-grid">
        <StatCard label="Teams" value={allTeams.length} icon="🤖" color="#8b5cf6" />
        <StatCard label="Ranked Teams" value={rankedTeams.length} icon="🏆" color="#f59e0b" />
        <StatCard label="Matches Played" value={playedMatches.length} icon="⚔️" color="#22c55e" />
        <StatCard label="Total Matches" value={allMatches.length} icon="📋" color="#3b82f6" />
        <StatCard label="Avg Red Score" value={avgRed} icon="🔴" color="#ef4444" />
        <StatCard label="Avg Blue Score" value={avgBlue} icon="🔵" color="#3b82f6" />
        <StatCard label="Top OPR" value={topOPR.toFixed(1)} icon="⭐" color="#f59e0b" />
        <StatCard label="Avg Blue Score" value={avgBlue} icon="🔵" color="#06b6d4" />
      </div>

      {top20RP.length > 0 && (
        <div className="charts-grid">
          <div className="chart-card">
            <h3>Top 20 — Ranking Points</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={top20RP} margin={{ bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={0} angle={-45} textAnchor="end" />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#0d0d1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                <Bar dataKey="rp" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="RP" />
                <Bar dataKey="opr" fill="#a855f7" radius={[4, 4, 0, 0]} name="OPR" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>Win / Loss / Tie Totals</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={wlData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}>
                  {wlData.map((_, i) => <Cell key={i} fill={['#22c55e', '#ef4444', '#f59e0b'][i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0d0d1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {scatterData.length > 0 && (
        <div className="charts-grid">
          <div className="chart-card">
            <h3>Auto OPR vs Teleop OPR</h3>
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="x" name="Auto OPR" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }}
                  label={{ value: 'Auto OPR', fill: '#64748b', position: 'insideBottom', offset: -10 }} />
                <YAxis dataKey="y" name="DC OPR" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <ZAxis dataKey="z" range={[30, 150]} />
                <Tooltip contentStyle={{ background: '#0d0d1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  formatter={(val, name) => [typeof val === 'number' ? val.toFixed(1) : val, name]} />
                <Scatter data={scatterData} fill="#8b5cf6" fillOpacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {playedMatches.length > 0 && (
            <div className="chart-card">
              <h3>Match Scores (last 20 played)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={playedMatches.slice(-20).map(m => ({
                  match: `Q${m.matchNum}`,
                  red: m.scores?.red?.totalPoints ?? 0,
                  blue: m.scores?.blue?.totalPoints ?? 0,
                }))} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="match" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={2} />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#0d0d1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Bar dataKey="red" fill="#ef4444" radius={[3, 3, 0, 0]} name="Red" />
                  <Bar dataKey="blue" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Blue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar">
        {(['rankings', 'matches', 'teams'] as const).map(t => (
          <button key={t} className={`tab-btn${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <input className="search-input" placeholder="Search team #…" value={search}
          onChange={e => setSearch(e.target.value)} style={{ marginLeft: 'auto' }} />
      </div>

      {activeTab === 'rankings' && (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {(
                    [['rank', 'Rank'], ['teamNumber', 'Team'], ['rp', 'RP'], ['opr', 'OPR'], ['wins', 'W'], ['losses', 'L'], ['ties', 'T']] as [SortKey, string][]
                  ).map(([k, label]) => (
                    <th key={k} onClick={() => setSort(k)} className="sortable">
                      {label} {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                  ))}
                  <th>Auto OPR</th>
                  <th>DC OPR</th>
                  <th>Avg Score</th>
                  <th>Played</th>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeams.map((t, i) => (
                  <tr key={i}>
                    <td><span className="rank-badge">#{t.stats?.rank}</span></td>
                    <td><strong style={{ color: '#a78bfa' }}>{t.teamNumber}</strong></td>
                    <td><strong>{t.stats?.rp?.toFixed(2) ?? '—'}</strong></td>
                    <td>{t.stats?.opr?.totalPoints?.toFixed(1) ?? '—'}</td>
                    <td style={{ color: '#22c55e' }}>{t.stats?.wins ?? '—'}</td>
                    <td style={{ color: '#ef4444' }}>{t.stats?.losses ?? '—'}</td>
                    <td style={{ color: '#f59e0b' }}>{t.stats?.ties ?? '—'}</td>
                    <td>{t.stats?.opr?.autoPoints?.toFixed(1) ?? '—'}</td>
                    <td>{t.stats?.opr?.dcPoints?.toFixed(1) ?? '—'}</td>
                    <td>{t.stats?.avg?.totalPoints?.toFixed(1) ?? '—'}</td>
                    <td>{t.stats?.qualMatchesPlayed ?? '—'}</td>
                    <td style={{ color: '#94a3b8', fontSize: 12 }}>{t.team?.name ?? '—'}</td>
                  </tr>
                ))}
                {filteredTeams.length === 0 && (
                  <tr><td colSpan={12} style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>No rankings data yet</td></tr>
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
                  <th>Match</th><th>Level</th>
                  <th>Red 1</th><th>Red 2</th><th>Red Score</th>
                  <th>Blue Score</th><th>Blue 1</th><th>Blue 2</th>
                  <th>Auto R/B</th><th>Winner</th>
                </tr>
              </thead>
              <tbody>
                {allMatches.map((m, i) => {
                  const reds = m.teams.filter(t => t.alliance === 'Red')
                  const blues = m.teams.filter(t => t.alliance === 'Blue')
                  const rs = m.scores?.red?.totalPoints ?? 0
                  const bs = m.scores?.blue?.totalPoints ?? 0
                  const redWin = m.hasBeenPlayed && rs > bs
                  const blueWin = m.hasBeenPlayed && bs > rs
                  return (
                    <tr key={i} className={!m.hasBeenPlayed ? 'unplayed' : ''}>
                      <td><strong>Q{m.matchNum}</strong></td>
                      <td><span className="badge badge-gray" style={{ fontSize: 10 }}>{m.tournamentLevel}</span></td>
                      <td style={{ color: '#fca5a5' }}>{reds[0]?.teamNumber ?? '—'}</td>
                      <td style={{ color: '#fca5a5' }}>{reds[1]?.teamNumber ?? '—'}</td>
                      <td style={{ color: redWin ? '#22c55e' : m.hasBeenPlayed ? '#ef4444' : '#64748b', fontWeight: 600 }}>
                        {m.hasBeenPlayed ? rs : '—'}
                      </td>
                      <td style={{ color: blueWin ? '#22c55e' : m.hasBeenPlayed ? '#ef4444' : '#64748b', fontWeight: 600 }}>
                        {m.hasBeenPlayed ? bs : '—'}
                      </td>
                      <td style={{ color: '#93c5fd' }}>{blues[0]?.teamNumber ?? '—'}</td>
                      <td style={{ color: '#93c5fd' }}>{blues[1]?.teamNumber ?? '—'}</td>
                      <td style={{ fontSize: 12, color: '#94a3b8' }}>
                        {m.hasBeenPlayed ? `${m.scores?.red?.autoPoints ?? 0}/${m.scores?.blue?.autoPoints ?? 0}` : '—'}
                      </td>
                      <td>
                        {m.hasBeenPlayed
                          ? <span className={`badge ${redWin ? 'badge-red' : blueWin ? 'badge-blue' : 'badge-gray'}`}>
                              {redWin ? 'Red' : blueWin ? 'Blue' : 'Tie'}
                            </span>
                          : <span className="badge badge-gray">TBD</span>}
                      </td>
                    </tr>
                  )
                })}
                {allMatches.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>No matches yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'teams' && (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Name</th><th>School</th>
                  <th>City</th><th>State</th><th>Country</th><th>Rookie</th>
                </tr>
              </thead>
              <tbody>
                {allTeams
                  .filter(t => !search || String(t.teamNumber).includes(search) || (t.team?.name ?? '').toLowerCase().includes(search.toLowerCase()))
                  .map((t, i) => (
                    <tr key={i}>
                      <td><strong style={{ color: '#a78bfa' }}>{t.teamNumber}</strong></td>
                      <td>{t.team?.name ?? '—'}</td>
                      <td style={{ color: '#64748b', fontSize: 12 }}>{t.team?.schoolName ?? '—'}</td>
                      <td>{t.team?.location?.city ?? '—'}</td>
                      <td>{t.team?.location?.state ?? '—'}</td>
                      <td>{t.team?.location?.country ?? '—'}</td>
                      <td>{t.team?.rookieYear ?? '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: 'none' }}>{CHART_COLORS[0]}</div>
    </div>
  )
}
