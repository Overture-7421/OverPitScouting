import { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ScatterChart, Scatter, ZAxis,
} from 'recharts'
import type { FTCTeam, FTCRanking, HybridMatch } from '../types'
import { fetchFTCRankings, fetchFTCTeams, fetchFTCSchedule } from '../utils/ftcApi'
import { StatCard } from '../components/StatCard'
import { Loading } from '../components/Loading'
import { ErrorCard } from '../components/ErrorCard'
import { EVENT_CODE, SEASON } from '../constants'

type SortDir = 'asc' | 'desc'
type ActiveTab = 'rankings' | 'schedule' | 'teams'

export function ApiView() {
  const [rankings, setRankings] = useState<FTCRanking[]>([])
  const [teams, setTeams] = useState<FTCTeam[]>([])
  const [schedule, setSchedule] = useState<HybridMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<ActiveTab>('rankings')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<keyof FTCRanking>('rank')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const load = useCallback(async () => {
    setLoading(true)
    setErrors([])
    const errs: string[] = []

    const [rRes, tRes, sRes] = await Promise.allSettled([
      fetchFTCRankings(),
      fetchFTCTeams(),
      fetchFTCSchedule(),
    ])

    if (rRes.status === 'fulfilled') setRankings(rRes.value)
    else errs.push(`Rankings: ${rRes.reason instanceof Error ? rRes.reason.message : 'Error'}`)

    if (tRes.status === 'fulfilled') setTeams(tRes.value)
    else errs.push(`Teams: ${tRes.reason instanceof Error ? tRes.reason.message : 'Error'}`)

    if (sRes.status === 'fulfilled') setSchedule(sRes.value)
    else errs.push(`Schedule: ${sRes.reason instanceof Error ? sRes.reason.message : 'Error'}`)

    setErrors(errs)
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <Loading label="Querying FTC Events API…" />

  const played = schedule.filter(m => m.scoreRedFinal !== undefined || m.scoreBlueFinal !== undefined)

  function setSort(k: keyof FTCRanking) {
    if (k === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
  }

  const filteredRankings = rankings
    .filter(r => !search || String(r.teamNumber).includes(search) || (r.teamName ?? '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortKey]; const bv = b[sortKey]
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })

  const top20RP = rankings.slice(0, 20).map(r => ({ name: String(r.teamNumber), rp: r.sortOrder1 ?? 0, tbp: r.sortOrder2 ?? 0 }))
  const avgScore = played.length
    ? Math.round(played.reduce((a, m) => a + ((m.scoreRedFinal ?? 0) + (m.scoreBlueFinal ?? 0)) / 2, 0) / played.length)
    : 0

  const scatterData = rankings.map(r => ({ x: r.wins ?? 0, y: r.sortOrder1 ?? 0, z: r.qualAverage ?? 0, team: r.teamNumber }))

  return (
    <div className="view-content">
      <div className="api-header">
        <div>
          <h2 className="view-title">FTC Events API</h2>
          <p className="view-subtitle">ftc-api.firstinspires.org · Season {SEASON} · {EVENT_CODE}</p>
        </div>
        <button className="btn btn-outline" onClick={load}>↻ Refresh</button>
      </div>

      {errors.length > 0 && (
        <div className="error-list">
          {errors.map((e, i) => <ErrorCard key={i} message={e} onRetry={load} />)}
        </div>
      )}

      <div className="stat-grid">
        <StatCard label="Teams" value={teams.length || rankings.length} icon="🤖" color="#8b5cf6" />
        <StatCard label="Rankings" value={rankings.length} icon="🏆" color="#f59e0b" />
        <StatCard label="Matches Played" value={played.length} icon="⚔️" color="#22c55e" />
        <StatCard label="Scheduled" value={schedule.length} icon="📋" color="#3b82f6" />
        <StatCard label="Avg Match Score" value={avgScore} icon="📊" color="#ec4899" />
        <StatCard label="Top RP" value={rankings[0]?.sortOrder1?.toFixed(1) ?? '—'} icon="⭐" color="#f59e0b" sub={`Team ${rankings[0]?.teamNumber ?? ''}`} />
      </div>

      {rankings.length > 0 && (
        <div className="charts-grid">
          <div className="chart-card">
            <h3>Top 20 — Ranking Points</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={top20RP} margin={{ bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={0} angle={-45} textAnchor="end" />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#0d0d1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                <Bar dataKey="rp" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Ranking Points" />
                <Bar dataKey="tbp" fill="#a855f7" radius={[4, 4, 0, 0]} name="TBP" />
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
                <Tooltip contentStyle={{ background: '#0d0d1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={scatterData} fill="#8b5cf6" fillOpacity={0.7} />
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
                match: `Q${m.matchNumber}`,
                red: m.scoreRedFinal ?? 0,
                blue: m.scoreBlueFinal ?? 0,
              }))}
              margin={{ bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="match" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#0d0d1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
              <Bar dataKey="red" fill="#ef4444" radius={[3, 3, 0, 0]} name="Red Score" />
              <Bar dataKey="blue" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Blue Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar">
        {(['rankings', 'schedule', 'teams'] as const).map(t => (
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

      {activeTab === 'rankings' && (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {(
                    [
                      ['rank', 'Rank'],
                      ['teamNumber', 'Team #'],
                      ['teamName', 'Name'],
                      ['sortOrder1', 'RP'],
                      ['sortOrder2', 'TBP'],
                      ['wins', 'W'],
                      ['losses', 'L'],
                      ['ties', 'T'],
                      ['qualAverage', 'Avg Score'],
                      ['matchesPlayed', 'Played'],
                    ] as [keyof FTCRanking, string][]
                  ).map(([k, label]) => (
                    <th key={k} onClick={() => setSort(k)} className="sortable">
                      {label} {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRankings.map((r, i) => (
                  <tr key={i}>
                    <td><span className="rank-badge">#{r.rank}</span></td>
                    <td><strong style={{ color: '#a78bfa' }}>{r.teamNumber}</strong></td>
                    <td>{r.teamName ?? '—'}</td>
                    <td><strong>{r.sortOrder1?.toFixed(2)}</strong></td>
                    <td>{r.sortOrder2?.toFixed(2)}</td>
                    <td style={{ color: '#22c55e' }}>{r.wins}</td>
                    <td style={{ color: '#ef4444' }}>{r.losses}</td>
                    <td style={{ color: '#f59e0b' }}>{r.ties}</td>
                    <td>{r.qualAverage?.toFixed(1) ?? '—'}</td>
                    <td>{r.matchesPlayed}</td>
                  </tr>
                ))}
                {filteredRankings.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>No rankings yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Match</th>
                  <th>Red 1</th>
                  <th>Red 2</th>
                  <th>Red Score</th>
                  <th>Blue Score</th>
                  <th>Blue 1</th>
                  <th>Blue 2</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((m, i) => {
                  const hasScore = m.scoreRedFinal !== undefined
                  const redWin = hasScore && (m.scoreRedFinal ?? 0) > (m.scoreBlueFinal ?? 0)
                  const blueWin = hasScore && (m.scoreBlueFinal ?? 0) > (m.scoreRedFinal ?? 0)
                  const reds = m.teams.filter(t => t.station.startsWith('Red'))
                  const blues = m.teams.filter(t => t.station.startsWith('Blue'))
                  return (
                    <tr key={i} className={!hasScore ? 'unplayed' : ''}>
                      <td><strong>Q{m.matchNumber}</strong></td>
                      <td style={{ color: '#fca5a5' }}>{reds[0]?.teamNumber ?? '—'}</td>
                      <td style={{ color: '#fca5a5' }}>{reds[1]?.teamNumber ?? '—'}</td>
                      <td style={{ color: redWin ? '#22c55e' : hasScore ? '#ef4444' : '#64748b', fontWeight: 600 }}>
                        {hasScore ? m.scoreRedFinal : '—'}
                      </td>
                      <td style={{ color: blueWin ? '#22c55e' : hasScore ? '#ef4444' : '#64748b', fontWeight: 600 }}>
                        {hasScore ? m.scoreBlueFinal : '—'}
                      </td>
                      <td style={{ color: '#93c5fd' }}>{blues[0]?.teamNumber ?? '—'}</td>
                      <td style={{ color: '#93c5fd' }}>{blues[1]?.teamNumber ?? '—'}</td>
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
                {schedule.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>No schedule available</td></tr>
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
                  <th>Short Name</th>
                  <th>School</th>
                  <th>City</th>
                  <th>State</th>
                  <th>Country</th>
                  <th>Rookie Year</th>
                  <th>Robot</th>
                </tr>
              </thead>
              <tbody>
                {teams
                  .filter(t => !search || String(t.teamNumber).includes(search) || (t.nameShort ?? '').toLowerCase().includes(search.toLowerCase()))
                  .map((t, i) => (
                    <tr key={i}>
                      <td><strong style={{ color: '#a78bfa' }}>{t.teamNumber}</strong></td>
                      <td>{t.nameShort ?? '—'}</td>
                      <td>{t.schoolName ?? '—'}</td>
                      <td>{t.city ?? '—'}</td>
                      <td>{t.stateProv ?? '—'}</td>
                      <td>{t.country ?? '—'}</td>
                      <td>{t.rookieYear ?? '—'}</td>
                      <td>{t.robotName ?? '—'}</td>
                    </tr>
                  ))}
                {teams.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>No teams data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
