import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ScatterChart, Scatter, ZAxis,
} from 'recharts'
import type { FTCTeam, FTCRanking, HybridMatch, FTCMatchScore } from '../types'
import { fetchFTCRankings, fetchFTCTeams, fetchFTCSchedule, fetchFTCScores } from '../utils/ftcApi'
import { computeOPR, computeAvgTotal, computeAvgNP } from '../utils/opr'
import { StatCard } from '../components/StatCard'
import { Loading } from '../components/Loading'
import { ErrorCard } from '../components/ErrorCard'
import { EVENT_CODE, SEASON } from '../constants'

type SortDir = 'asc' | 'desc'
type SortKey = keyof FTCRanking | 'opr' | 'avgNp' | 'avgTotal'
type ActiveTab = 'rankings' | 'schedule' | 'teams' | 'compare'
type CmpMetric = 'OPR' | 'Avg NP' | 'Avg Total'

export function ApiView() {
  const [rankings, setRankings] = useState<FTCRanking[]>([])
  const [teams, setTeams] = useState<FTCTeam[]>([])
  const [schedule, setSchedule] = useState<HybridMatch[]>([])
  const [scores, setScores] = useState<FTCMatchScore[]>([])
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<ActiveTab>('rankings')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const [cmpMetric, setCmpMetric] = useState<CmpMetric>('OPR')
  const [cmpSearch, setCmpSearch] = useState('')
  const [cmpTeams, setCmpTeams] = useState<Set<number>>(new Set())
  const cmpInitRef = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    setErrors([])
    const errs: string[] = []

    const [rRes, tRes, sRes, scRes] = await Promise.allSettled([
      fetchFTCRankings(),
      fetchFTCTeams(),
      fetchFTCSchedule(),
      fetchFTCScores(),
    ])

    if (rRes.status === 'fulfilled') setRankings(rRes.value)
    else errs.push(`Rankings: ${rRes.reason instanceof Error ? rRes.reason.message : 'Error'}`)

    if (tRes.status === 'fulfilled') setTeams(tRes.value)
    else errs.push(`Teams: ${tRes.reason instanceof Error ? tRes.reason.message : 'Error'}`)

    if (sRes.status === 'fulfilled') setSchedule(sRes.value)
    else errs.push(`Schedule: ${sRes.reason instanceof Error ? sRes.reason.message : 'Error'}`)

    if (scRes.status === 'fulfilled') setScores(scRes.value)

    setErrors(errs)
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const oprMap = useMemo(() => computeOPR(schedule), [schedule])
  const avgTotalMap = useMemo(() => computeAvgTotal(schedule), [schedule])
  const avgNpMap = useMemo(() => computeAvgNP(scores, schedule), [scores, schedule])

  const allTeamNums = useMemo(() => {
    if (rankings.length > 0) return rankings.map(r => r.teamNumber)
    return Array.from(new Set(schedule.flatMap(m => m.teams.map(t => t.teamNumber))))
  }, [rankings, schedule])

  useEffect(() => {
    if (!cmpInitRef.current && allTeamNums.length > 0) {
      cmpInitRef.current = true
      setCmpTeams(new Set(allTeamNums))
    }
  }, [allTeamNums])

  if (loading) return <Loading label="Querying FTC Events API…" />

  const played = schedule.filter(m => m.scoreRedFinal !== undefined || m.scoreBlueFinal !== undefined)

  function getSortVal(r: FTCRanking): number {
    if (sortKey === 'opr') return oprMap[r.teamNumber] ?? 0
    if (sortKey === 'avgNp') return avgNpMap[r.teamNumber] ?? 0
    if (sortKey === 'avgTotal') return avgTotalMap[r.teamNumber] ?? 0
    const v = r[sortKey as keyof FTCRanking]
    return typeof v === 'number' ? v : 0
  }

  function setSort(k: SortKey) {
    if (k === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir(k === 'rank' ? 'asc' : 'desc') }
  }

  const filteredRankings = rankings
    .filter(r => !search || String(r.teamNumber).includes(search) || (r.teamName ?? '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const cmp = getSortVal(a) - getSortVal(b)
      return sortDir === 'asc' ? cmp : -cmp
    })

  const top20RP = rankings.slice(0, 20).map(r => ({ name: String(r.teamNumber), rp: r.sortOrder1 ?? 0, tbp: r.sortOrder2 ?? 0 }))
  const avgScore = played.length
    ? Math.round(played.reduce((a, m) => a + ((m.scoreRedFinal ?? 0) + (m.scoreBlueFinal ?? 0)) / 2, 0) / played.length)
    : 0
  const scatterData = rankings.map(r => ({ x: r.wins ?? 0, y: r.sortOrder1 ?? 0, z: r.qualAverage ?? 0, team: r.teamNumber }))

  const oprValues = Object.values(oprMap)
  const topOPR = oprValues.length ? Math.max(...oprValues) : 0
  const topOPRTeam = oprValues.length ? Object.entries(oprMap).find(([, v]) => v === topOPR)?.[0] : ''

  const cmpMetricMap: Record<number, number> =
    cmpMetric === 'OPR' ? oprMap : cmpMetric === 'Avg NP' ? avgNpMap : avgTotalMap

  const cmpChartData = Array.from(cmpTeams)
    .filter(t => cmpMetricMap[t] != null)
    .map(t => ({ name: String(t), value: Math.round(cmpMetricMap[t] * 10) / 10 }))
    .sort((a, b) => b.value - a.value)

  const cmpDisplayTeams = allTeamNums.filter(t => !cmpSearch || String(t).includes(cmpSearch))

  return (
    <div className="view-content">
      <div className="api-header">
        <div>
          <h2 className="view-title">FTC Events API</h2>
          <p className="view-subtitle">ftc-api.firstinspires.org · Season {SEASON} · {EVENT_CODE}</p>
        </div>
        <button className="btn btn-outline" onClick={load}><span className="material-icons" style={{ fontSize: 16 }}>refresh</span> Refresh</button>
      </div>

      {errors.length > 0 && (
        <div className="error-list">
          {errors.map((e, i) => <ErrorCard key={i} message={e} onRetry={load} />)}
        </div>
      )}

      <div className="stat-grid">
        <StatCard label="Teams" value={teams.length || rankings.length} icon="smart_toy" color="#8b5cf6" />
        <StatCard label="Rankings" value={rankings.length} icon="emoji_events" color="#f59e0b" />
        <StatCard label="Matches Played" value={played.length} icon="sports" color="#22c55e" />
        <StatCard label="Scheduled" value={schedule.length} icon="assignment" color="#3b82f6" />
        <StatCard label="Avg Match Score" value={avgScore} icon="analytics" color="#ec4899" />
        <StatCard label="Top RP" value={rankings[0]?.sortOrder1?.toFixed(1) ?? '—'} icon="grade" color="#f59e0b" sub={`Team ${rankings[0]?.teamNumber ?? ''}`} />
        {topOPR > 0 && <StatCard label="Top OPR" value={topOPR.toFixed(1)} icon="bolt" color="#22c55e" sub={`Team ${topOPRTeam ?? ''}`} />}
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

      <div className="tab-bar">
        {(['rankings', 'schedule', 'teams', 'compare'] as const).map(t => (
          <button key={t} className={`tab-btn${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
            {t === 'compare' ? 'Compare' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        {activeTab !== 'compare' && (
          <input
            className="search-input"
            placeholder="Search team #…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginLeft: 'auto' }}
          />
        )}
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
                      ['opr', 'OPR'],
                      ['avgNp', 'Avg NP'],
                      ['avgTotal', 'Avg Total'],
                      ['sortOrder1', 'RP'],
                      ['sortOrder2', 'TBP'],
                      ['wins', 'W'],
                      ['losses', 'L'],
                      ['ties', 'T'],
                      ['matchesPlayed', 'Played'],
                    ] as [SortKey, string][]
                  ).map(([k, label]) => (
                    <th key={k} onClick={() => setSort(k)} className="sortable">
                      {label} {sortKey === k && <span className="material-icons sort-icon">{sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>}
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
                    <td><strong style={{ color: '#22c55e' }}>{oprMap[r.teamNumber]?.toFixed(1) ?? '—'}</strong></td>
                    <td style={{ color: '#06b6d4' }}>{avgNpMap[r.teamNumber]?.toFixed(1) ?? '—'}</td>
                    <td style={{ color: '#94a3b8' }}>{avgTotalMap[r.teamNumber]?.toFixed(1) ?? '—'}</td>
                    <td><strong>{r.sortOrder1?.toFixed(2)}</strong></td>
                    <td>{r.sortOrder2?.toFixed(2)}</td>
                    <td style={{ color: '#22c55e' }}>{r.wins}</td>
                    <td style={{ color: '#ef4444' }}>{r.losses}</td>
                    <td style={{ color: '#f59e0b' }}>{r.ties}</td>
                    <td>{r.matchesPlayed}</td>
                  </tr>
                ))}
                {filteredRankings.length === 0 && (
                  <tr><td colSpan={12} style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>No rankings yet</td></tr>
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

      {activeTab === 'compare' && (
        <div>
          {/* Metric selector */}
          <div className="tab-bar" style={{ marginBottom: 12 }}>
            {(['OPR', 'Avg NP', 'Avg Total'] as const).map(m => (
              <button key={m} className={`tab-btn${cmpMetric === m ? ' active' : ''}`}
                onClick={() => setCmpMetric(m)}>{m}</button>
            ))}
            <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: 13 }}>
              {cmpTeams.size} / {allTeamNums.length} teams selected
            </span>
          </div>

          {/* Team selector */}
          <div className="chart-card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input className="search-input" placeholder="Filter by #…" value={cmpSearch}
                onChange={e => setCmpSearch(e.target.value)} style={{ width: 140 }} />
              <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px' }}
                onClick={() => setCmpTeams(new Set(allTeamNums))}>All</button>
              <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px' }}
                onClick={() => setCmpTeams(new Set())}>None</button>
              <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px' }}
                onClick={() => {
                  const top15 = [...allTeamNums]
                    .sort((a, b) => (cmpMetricMap[b] ?? 0) - (cmpMetricMap[a] ?? 0))
                    .slice(0, 15)
                  setCmpTeams(new Set(top15))
                }}>Top 15</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 110, overflowY: 'auto' }}>
              {cmpDisplayTeams.map(t => {
                const on = cmpTeams.has(t)
                return (
                  <button key={t}
                    onClick={() => {
                      const s = new Set(cmpTeams)
                      on ? s.delete(t) : s.add(t)
                      setCmpTeams(s)
                    }}
                    style={{
                      padding: '2px 8px', borderRadius: 6, fontSize: 12, border: '1px solid',
                      cursor: 'pointer',
                      background: on ? 'rgba(139,92,246,0.3)' : 'transparent',
                      borderColor: on ? '#8b5cf6' : '#374151',
                      color: on ? '#a78bfa' : '#6b7280',
                    }}>
                    #{t}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Chart */}
          {cmpChartData.length > 0 ? (
            <div className="chart-card wide">
              <h3>{cmpMetric} — {cmpChartData.length} teams (sorted)</h3>
              <ResponsiveContainer width="100%" height={Math.max(260, cmpChartData.length * 26)}>
                <BarChart layout="vertical" data={cmpChartData} margin={{ left: 55, right: 50, top: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} width={52} />
                  <Tooltip
                    contentStyle={{ background: '#0d0d1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                    formatter={(v) => [typeof v === 'number' ? v.toFixed(1) : v, cmpMetric]}
                  />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} name={cmpMetric} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state">
              <span className="material-icons empty-icon">bar_chart</span>
              <h2>{cmpTeams.size === 0 ? 'No Teams Selected' : 'No Match Data Yet'}</h2>
              <p style={{ color: '#94a3b8' }}>
                {cmpTeams.size === 0
                  ? 'Use the team buttons above to select teams for comparison.'
                  : 'OPR and averages are computed from played matches. Come back after matches start.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
