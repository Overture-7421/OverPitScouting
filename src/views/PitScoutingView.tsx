import { useRef, useState, useCallback } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import type { ScoutingRecord } from '../types'
import { parseCSVText, groupByCount, boolPct, avg } from '../utils/csv'
import { StatCard } from '../components/StatCard'
import { CHART_COLORS } from '../constants'

interface Props {
  records: ScoutingRecord[]
  onLoad: (r: ScoutingRecord[]) => void
}

interface Filters {
  mech_shooter_type: string
  prog_language: string
  elec_controller: string
  comp_experience: string
  comp_commitment: string
  mech_has_climb: 'all' | 'yes' | 'no'
  prog_vision: 'all' | 'yes' | 'no'
  prog_has_auto: 'all' | 'yes' | 'no'
  comp_alliance_willing: 'all' | 'yes' | 'no'
}

const EMPTY_FILTERS: Filters = {
  mech_shooter_type: 'all',
  prog_language: 'all',
  elec_controller: 'all',
  comp_experience: 'all',
  comp_commitment: 'all',
  mech_has_climb: 'all',
  prog_vision: 'all',
  prog_has_auto: 'all',
  comp_alliance_willing: 'all',
}

function applyFilters(records: ScoutingRecord[], f: Filters): ScoutingRecord[] {
  return records.filter(r => {
    if (f.mech_shooter_type !== 'all' && r.mech_shooter_type !== f.mech_shooter_type) return false
    if (f.prog_language !== 'all' && r.prog_language !== f.prog_language) return false
    if (f.elec_controller !== 'all' && r.elec_controller !== f.elec_controller) return false
    if (f.comp_experience !== 'all' && r.comp_experience !== f.comp_experience) return false
    if (f.comp_commitment !== 'all' && r.comp_commitment !== f.comp_commitment) return false
    if (f.mech_has_climb === 'yes' && !r.mech_has_climb) return false
    if (f.mech_has_climb === 'no' && r.mech_has_climb) return false
    if (f.prog_vision === 'yes' && !r.prog_vision) return false
    if (f.prog_vision === 'no' && r.prog_vision) return false
    if (f.prog_has_auto === 'yes' && !r.prog_has_auto) return false
    if (f.prog_has_auto === 'no' && r.prog_has_auto) return false
    if (f.comp_alliance_willing === 'yes' && !r.comp_alliance_willing) return false
    if (f.comp_alliance_willing === 'no' && r.comp_alliance_willing) return false
    return true
  })
}

function unique(records: ScoutingRecord[], key: keyof ScoutingRecord): string[] {
  return [...new Set(records.map(r => String(r[key])))].filter(Boolean).sort()
}

type SortKey = keyof ScoutingRecord
type SortDir = 'asc' | 'desc'

const BOOL_STATS: { key: keyof ScoutingRecord; label: string; color: string }[] = [
  { key: 'mech_has_climb', label: 'Has Climb', color: '#8b5cf6' },
  { key: 'mech_indexer', label: 'Indexer', color: '#a855f7' },
  { key: 'mech_checklist', label: 'Checklist', color: '#ec4899' },
  { key: 'mech_spare_parts', label: 'Spare Parts', color: '#3b82f6' },
  { key: 'mech_self_repair', label: 'Self-Repair', color: '#22c55e' },
  { key: 'prog_vision', label: 'Vision', color: '#f59e0b' },
  { key: 'prog_odometry', label: 'Odometry', color: '#06b6d4' },
  { key: 'prog_has_auto', label: 'Has Auto', color: '#8b5cf6' },
  { key: 'prog_path_lib_used', label: 'Path Lib', color: '#a855f7' },
  { key: 'prog_processor', label: 'Coprocessor', color: '#ec4899' },
  { key: 'elec_cable_mgmt', label: 'Cable Mgmt', color: '#22c55e' },
  { key: 'elec_cable_protection', label: 'Cable Prot.', color: '#3b82f6' },
  { key: 'elec_monitoring', label: 'Monitoring', color: '#f59e0b' },
  { key: 'elec_extra_motors', label: 'Extra Motors', color: '#06b6d4' },
  { key: 'comp_drive_coach', label: 'Drive Coach', color: '#8b5cf6' },
  { key: 'comp_has_strategy', label: 'Has Strategy', color: '#22c55e' },
  { key: 'comp_alliance_willing', label: 'Alliance Willing', color: '#f59e0b' },
  { key: 'comp_first_inspection', label: '1st Inspection', color: '#ec4899' },
]

export function PitScoutingView({ records, onLoad }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [draggingFile, setDraggingFile] = useState(false)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [sortKey, setSortKey] = useState<SortKey>('team_number')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [showFilters, setShowFilters] = useState(true)
  const [search, setSearch] = useState('')

  const handleFile = useCallback(async (file: File) => {
    const text = await file.text()
    onLoad(parseCSVText(text))
  }, [onLoad])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDraggingFile(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const filtered = applyFilters(
    records.filter(r =>
      !search || String(r.team_number).includes(search) || r.examiner_name.toLowerCase().includes(search.toLowerCase()),
    ),
    filters,
  )

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey]; const bv = b[sortKey]
    const cmp = typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv))
    return sortDir === 'asc' ? cmp : -cmp
  })

  function setSort(k: SortKey) {
    if (k === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
  }

  const setF = (k: keyof Filters, v: string) => setFilters(f => ({ ...f, [k]: v }))

  if (records.length === 0) {
    return (
      <div className="upload-zone-wrap">
        <div
          className={`upload-zone${draggingFile ? ' dragover' : ''}`}
          onDragOver={e => { e.preventDefault(); setDraggingFile(true) }}
          onDragLeave={() => setDraggingFile(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div className="upload-icon">📂</div>
          <h2>Upload Pit Scouting CSV</h2>
          <p>Drag & drop your CSV here, or click to browse</p>
          <p className="upload-hint">Expects columns from configPitScoutingFTC.json</p>
          <button className="btn btn-primary" onClick={e => { e.stopPropagation(); fileRef.current?.click() }}>
            Choose File
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="view-content">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>
            📂 Upload CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button className="btn btn-outline" onClick={() => setShowFilters(f => !f)}>
            {showFilters ? '⟵ Hide Filters' : '⟶ Show Filters'}
          </button>
          <input
            className="search-input"
            placeholder="Search team #..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className="record-count">{filtered.length} / {records.length} teams</span>
      </div>

      <div className="content-with-filters">
        {/* Filter Panel */}
        {showFilters && (
          <aside className="filter-panel">
            <div className="filter-panel-header">
              <span>Filters</span>
              <button className="btn-link" onClick={() => setFilters(EMPTY_FILTERS)}>Clear</button>
            </div>

            <div className="filter-group">
              <label>Shooter Type</label>
              <select value={filters.mech_shooter_type} onChange={e => setF('mech_shooter_type', e.target.value)}>
                <option value="all">All</option>
                {unique(records, 'mech_shooter_type').map(o => <option key={o}>{o}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>Prog. Language</label>
              <select value={filters.prog_language} onChange={e => setF('prog_language', e.target.value)}>
                <option value="all">All</option>
                {unique(records, 'prog_language').map(o => <option key={o}>{o}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>Controller</label>
              <select value={filters.elec_controller} onChange={e => setF('elec_controller', e.target.value)}>
                <option value="all">All</option>
                {unique(records, 'elec_controller').map(o => <option key={o}>{o}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>Experience</label>
              <select value={filters.comp_experience} onChange={e => setF('comp_experience', e.target.value)}>
                <option value="all">All</option>
                {unique(records, 'comp_experience').map(o => <option key={o}>{o}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>Commitment</label>
              <select value={filters.comp_commitment} onChange={e => setF('comp_commitment', e.target.value)}>
                <option value="all">All</option>
                {unique(records, 'comp_commitment').map(o => <option key={o}>{o}</option>)}
              </select>
            </div>

            {(
              [
                ['mech_has_climb', 'Has Climb'],
                ['prog_vision', 'Has Vision'],
                ['prog_has_auto', 'Has Auto'],
                ['comp_alliance_willing', 'Alliance Willing'],
              ] as [keyof Filters, string][]
            ).map(([k, label]) => (
              <div className="filter-group" key={k}>
                <label>{label}</label>
                <div className="toggle-group">
                  {(['all', 'yes', 'no'] as const).map(v => (
                    <button
                      key={v}
                      className={`toggle-btn${filters[k] === v ? ' active' : ''}`}
                      onClick={() => setF(k, v)}
                    >
                      {v === 'all' ? 'All' : v === 'yes' ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </aside>
        )}

        <div className="main-content">
          {/* Stat Cards */}
          <div className="stat-grid">
            <StatCard label="Teams Scouted" value={filtered.length} icon="🤖" color="#8b5cf6" />
            <StatCard label="Has Climb" value={`${boolPct(filtered, 'mech_has_climb')}%`} icon="🧗" color="#22c55e" />
            <StatCard label="Has Vision" value={`${boolPct(filtered, 'prog_vision')}%`} icon="👁" color="#3b82f6" />
            <StatCard label="Alliance Willing" value={`${boolPct(filtered, 'comp_alliance_willing')}%`} icon="🤝" color="#f59e0b" />
            <StatCard label="Avg Auto Routines" value={avg(filtered, 'prog_auto_count')} icon="⚡" color="#ec4899" />
            <StatCard label="Has Autonomous" value={`${boolPct(filtered, 'prog_has_auto')}%`} icon="🔄" color="#06b6d4" />
          </div>

          {/* Charts Row 1 */}
          <div className="charts-grid">
            <div className="chart-card">
              <h3>Shooter Types</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={groupByCount(filtered, 'mech_shooter_type')} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}>
                    {groupByCount(filtered, 'mech_shooter_type').map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0d0d1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Programming Languages</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={groupByCount(filtered, 'prog_language')} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#0d0d1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {groupByCount(filtered, 'prog_language').map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="charts-grid">
            <div className="chart-card">
              <h3>Experience Levels</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={groupByCount(filtered, 'comp_experience')} margin={{ left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11, dy: 5 }} interval={0} angle={-20} textAnchor="end" />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#0d0d1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {groupByCount(filtered, 'comp_experience').map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Path Libraries</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={groupByCount(filtered, 'prog_path_lib')} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#0d0d1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {groupByCount(filtered, 'prog_path_lib').map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 3 */}
          <div className="charts-grid">
            <div className="chart-card">
              <h3>Controller Types</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={groupByCount(filtered, 'elec_controller')} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${Math.round((percent ?? 0) * 100)}%`}>
                    {groupByCount(filtered, 'elec_controller').map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[(i + 3) % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0d0d1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Commitment Levels</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={groupByCount(filtered, 'comp_commitment')} margin={{ left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11, dy: 5 }} interval={0} angle={-20} textAnchor="end" />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#0d0d1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Climb Time Chart */}
          <div className="chart-card wide">
            <h3>Climb Time Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={groupByCount(filtered, 'mech_climb_time')} margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#0d0d1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Boolean Stats */}
          <div className="chart-card wide">
            <h3>Feature Adoption</h3>
            <div className="bool-grid">
              {BOOL_STATS.map(({ key, label, color }) => {
                const pct = boolPct(filtered, key)
                return (
                  <div key={key} className="bool-stat">
                    <div className="bool-label">{label}</div>
                    <div className="bool-bar-wrap">
                      <div className="bool-bar-fill" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <div className="bool-pct" style={{ color }}>{pct}%</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Team Table */}
          <div className="table-card">
            <h3>Team Data ({sorted.length})</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {(
                      [
                        ['team_number', 'Team #'],
                        ['mech_shooter_type', 'Shooter'],
                        ['mech_has_climb', 'Climb'],
                        ['mech_climb_time', 'Climb Time'],
                        ['prog_language', 'Lang'],
                        ['prog_path_lib', 'Path Lib'],
                        ['prog_auto_count', 'Autos'],
                        ['prog_vision', 'Vision'],
                        ['elec_controller', 'Controller'],
                        ['comp_experience', 'Exp'],
                        ['comp_commitment', 'Commit'],
                        ['comp_alliance_willing', 'Willing'],
                      ] as [SortKey, string][]
                    ).map(([k, label]) => (
                      <th key={k} onClick={() => setSort(k)} className="sortable">
                        {label} {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r, i) => (
                    <tr key={i}>
                      <td><strong style={{ color: '#a78bfa' }}>{r.team_number}</strong></td>
                      <td>{r.mech_shooter_type}</td>
                      <td><span className={`badge ${r.mech_has_climb ? 'badge-green' : 'badge-gray'}`}>{r.mech_has_climb ? 'Yes' : 'No'}</span></td>
                      <td>{r.mech_climb_time || '—'}</td>
                      <td>{r.prog_language}</td>
                      <td>{r.prog_path_lib || '—'}</td>
                      <td>{r.prog_auto_count}</td>
                      <td><span className={`badge ${r.prog_vision ? 'badge-blue' : 'badge-gray'}`}>{r.prog_vision ? 'Yes' : 'No'}</span></td>
                      <td>{r.elec_controller}</td>
                      <td>{r.comp_experience}</td>
                      <td>{r.comp_commitment}</td>
                      <td><span className={`badge ${r.comp_alliance_willing ? 'badge-yellow' : 'badge-gray'}`}>{r.comp_alliance_willing ? 'Yes' : 'No'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
