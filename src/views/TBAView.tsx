import { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ScatterChart, Scatter, ZAxis,
} from 'recharts'
import type { TBATeam, TBARanking, TBAMatch } from '../types'
import { fetchTBARankings, fetchTBATeams, fetchTBAMatches, tbaTeamNum } from '../utils/tbaApi'
import { StatCard } from '../components/StatCard'
import { Loading } from '../components/Loading'
import { ErrorCard } from '../components/ErrorCard'
import { FRC_EVENT_CODE, FRC_SEASON } from '../constants'

type SortDir = 'asc' | 'desc'
type ActiveTab = 'rankings' | 'matches' | 'teams'

const TOOLTIP_STYLE = {
  contentStyle: { background: '#0d0d1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 },
}

export function TBAView() {
  const [rankings, setRankings] = useState<TBARanking[]>([])
  const [teams, setTeams] = useState<TBATeam[]>([])
  const [matches, setMatches] = useState<TBAMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<ActiveTab>('rankings')
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const load = useCallback(async () => {
    setLoading(true)
    setErrors([])
    const errs: string[] = []

    const [rRes, tRes, mRes] = await Promise.allSettled([
      fetchTBARankings(),
      fetchTBATeams(),
      fetchTBAMatches(),
    ])

    if (rRes.status === 'fulfilled') setRankings(rRes.value)
    else errs.push(`Rankings: ${rRes.reason instanceof Error ? rRes.reason.message : 'Error'}`)

    if (tRes.status === 'fulfilled') setTeams(tRes.value)
    else errs.push(`Teams: ${tRes.reason instanceof Error ? tRes.reason.message : 'Error'}`)

    if (mRes.status === 'fulfilled') setMatches(mRes.value)
    else errs.push(`Matches: ${mRes.reason instanceof Error ? mRes.reason.message : 'Error'}`)

    setErrors(errs)
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <Loading label="Querying The Blue Alliance API…" />

  const qualMatches = matches.filter(m => m.comp_level === 'qm')
  const played = qualMatches.filter(m => (m.alliances?.red.score ?? -1) >= 0)

  const filteredRankings = rankings
    .filter(r => !search || r.team_key.includes(search) || String(tbaTeamNum(r.team_key)).includes(search))
    .sort((a, b) => {
      const cmp = a.rank - b.rank
      return sortDir === 'asc' ? cmp : -cmp
    })

  const top20 = rankings.slice(0, 20).map(r => ({
    name: String(tbaTeamNum(r.team_key)),
    rp: r.sort_orders?.[0] ?? 0,
  }))

  const avgScore = played.length
    ? Math.round(played.reduce((a, m) => a + ((m.alliances?.red.score ?? 0) + (m.alliances?.blue.score ?? 0)) / 2, 0) / played.length)
    : 0

  const scatterData = rankings.map(r => ({
    x: r.record.wins,
    y: r.sort_orders?.[0] ?? 0,
    z: r.matches_played,
    team: tbaTeamNum(r.team_key),
  }))

  const topTeam = rankings[0]

  return (
    <div className="view-content">
      <div className="api-header">
        <div>
          <h2 className="view-title">The Blue Alliance</h2>
          <p className="view-subtitle">thebluealliance.com · {FRC_SEASON} · {FRC_EVENT_CODE}</p>
        </div>
        <button className="btn btn-outline" onClick={load}><span className="material-icons" style={{ fontSize: 16 }}>refresh</span> Refresh</button>
      </div>

      {errors.length > 0 && (
        <div className="error-list">
          {errors.map((e, i) => <ErrorCard key={i} message={e} onRetry={load} />)}
        </div>
      )}

      <div className="stat-grid">
        <StatCard label="Teams" value={teams.length || rankings.length} icon="smart_toy" color="#3b82f6" />
        <StatCard label="Rankings" value={rankings.length} icon="emoji_events" color="#f59e0b" />
        <StatCard label="Matches Played" value={played.length} icon="sports" color="#22c55e" />
        <StatCard label="Scheduled (Qual)" value={qualMatches.length} icon="assignment" color="#8b5cf6" />
        <StatCard label="Avg Match Score" value={avgScore} icon="analytics" color="#ec4899" />
        <StatCard
          label="Top RP"
          value={topTeam?.sort_orders?.[0]?.toFixed(2) ?? '—'}
          icon="grade"
          color="#f59e0b"
          sub={topTeam ? `Team ${tbaTeamNum(topTeam.team_key)}` : ''}
        />
      </div>

      {rankings.length > 0 && (
        <div className="charts-grid">
          <div className="chart-card">
            <h3>Top 20 — Ranking Points</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={top20} margin={{ bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={0} angle={-45} textAnchor="end" />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="rp" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Ranking Points" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>Wins vs Ranking Points</h3>
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="x" name="Wins" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} label={{ value: 'Wins', fill: '#64748b', position: 'insideBottom', offset: -5 }} />
                <YAxis dataKey="y" name="RP" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <ZAxis dataKey="z" range={[40, 200]} />
                <Tooltip {...TOOLTIP_STYLE} cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={scatterData} fill="#3b82f6" fillOpacity={0.7} />
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
        {(['rankings', 'matches', 'teams'] as const).map(t => (
          <button key={t} className={`tab-btn${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        {activeTab === 'rankings' && (
          <button
            className="tab-btn"
            style={{ marginLeft: 8 }}
            onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          >
            Sort <span className="material-icons sort-icon">{sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>
          </button>
        )}
        <input
          className="search-input"
          placeholder="Search team #…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginLeft: 'auto' }}
        />
      </div>

      {activeTab === 'rankings' && (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Team #</th>
                  <th>RP</th>
                  <th>W</th>
                  <th>L</th>
                  <th>T</th>
                  <th>Qual Avg</th>
                  <th>Played</th>
                </tr>
              </thead>
              <tbody>
                {filteredRankings.map((r, i) => (
                  <tr key={i}>
                    <td><span className="rank-badge">#{r.rank}</span></td>
                    <td><strong style={{ color: '#60a5fa' }}>{tbaTeamNum(r.team_key)}</strong></td>
                    <td><strong>{r.sort_orders?.[0]?.toFixed(2) ?? '—'}</strong></td>
                    <td style={{ color: '#22c55e' }}>{r.record.wins}</td>
                    <td style={{ color: '#ef4444' }}>{r.record.losses}</td>
                    <td style={{ color: '#f59e0b' }}>{r.record.ties}</td>
                    <td>{r.qual_average?.toFixed(1) ?? '—'}</td>
                    <td>{r.matches_played}</td>
                  </tr>
                ))}
                {filteredRankings.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>No rankings yet</td></tr>
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
                  const hasScore = (m.alliances?.red.score ?? -1) >= 0
                  const redWin = hasScore && (m.alliances?.red.score ?? 0) > (m.alliances?.blue.score ?? 0)
                  const blueWin = hasScore && (m.alliances?.blue.score ?? 0) > (m.alliances?.red.score ?? 0)
                  const reds = m.alliances?.red.team_keys ?? []
                  const blues = m.alliances?.blue.team_keys ?? []
                  return (
                    <tr key={i} className={!hasScore ? 'unplayed' : ''}>
                      <td><strong>Q{m.match_number}</strong></td>
                      {[0, 1, 2].map(j => (
                        <td key={j} style={{ color: '#fca5a5' }}>{reds[j] ? tbaTeamNum(reds[j]) : '—'}</td>
                      ))}
                      <td style={{ color: redWin ? '#22c55e' : hasScore ? '#ef4444' : '#64748b', fontWeight: 600 }}>
                        {hasScore ? m.alliances?.red.score : '—'}
                      </td>
                      <td style={{ color: blueWin ? '#22c55e' : hasScore ? '#ef4444' : '#64748b', fontWeight: 600 }}>
                        {hasScore ? m.alliances?.blue.score : '—'}
                      </td>
                      {[0, 1, 2].map(j => (
                        <td key={j} style={{ color: '#93c5fd' }}>{blues[j] ? tbaTeamNum(blues[j]) : '—'}</td>
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

      {activeTab === 'teams' && (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Team #</th>
                  <th>Nickname</th>
                  <th>School</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Country</th>
                  <th>Rookie Year</th>
                </tr>
              </thead>
              <tbody>
                {teams
                  .filter(t => !search || String(t.team_number).includes(search) || (t.nickname ?? '').toLowerCase().includes(search.toLowerCase()))
                  .sort((a, b) => a.team_number - b.team_number)
                  .map((t, i) => (
                    <tr key={i}>
                      <td><strong style={{ color: '#60a5fa' }}>{t.team_number}</strong></td>
                      <td>{t.nickname ?? '—'}</td>
                      <td>{t.school_name ?? '—'}</td>
                      <td>{t.city ?? '—'}</td>
                      <td>{t.state_prov ?? '—'}</td>
                      <td>{t.country ?? '—'}</td>
                      <td>{t.rookie_year ?? '—'}</td>
                    </tr>
                  ))}
                {teams.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>No teams data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
