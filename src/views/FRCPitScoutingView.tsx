import { useRef, useState, useCallback } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import type { FRCScoutingRecord } from '../types'
import { parseFRCCSVText, frcGroupByCount, frcValPct, frcAvg } from '../utils/frcCsv'
import { StatCard } from '../components/StatCard'
import { CHART_COLORS } from '../constants'

interface Props {
  records: FRCScoutingRecord[]
  onLoad: (r: FRCScoutingRecord[]) => void
}

interface Filters {
  mech_chassis_type: string
  robot_specialization: string
  prog_auto_reliability: string
  prog_odometry_type: string
  prog_path_planner: 'all' | 'Si' | 'No'
  elec_canivore: 'all' | 'Si' | 'No'
}

const EMPTY_FILTERS: Filters = {
  mech_chassis_type: 'all',
  robot_specialization: 'all',
  prog_auto_reliability: 'all',
  prog_odometry_type: 'all',
  prog_path_planner: 'all',
  elec_canivore: 'all',
}

function applyFilters(records: FRCScoutingRecord[], f: Filters): FRCScoutingRecord[] {
  return records.filter(r => {
    if (f.mech_chassis_type !== 'all' && r.mech_chassis_type !== f.mech_chassis_type) return false
    if (f.robot_specialization !== 'all' && r.robot_specialization !== f.robot_specialization) return false
    if (f.prog_auto_reliability !== 'all' && r.prog_auto_reliability !== f.prog_auto_reliability) return false
    if (f.prog_odometry_type !== 'all' && r.prog_odometry_type !== f.prog_odometry_type) return false
    if (f.prog_path_planner !== 'all' && r.prog_path_planner !== f.prog_path_planner) return false
    if (f.elec_canivore !== 'all' && r.elec_canivore !== f.elec_canivore) return false
    return true
  })
}

function unique(records: FRCScoutingRecord[], key: keyof FRCScoutingRecord): string[] {
  return [...new Set(records.map(r => String(r[key])))].filter(Boolean).sort()
}

type SortKey = keyof FRCScoutingRecord
type SortDir = 'asc' | 'desc'

const FEATURE_STATS: { key: keyof FRCScoutingRecord; val: string; label: string; color: string }[] = [
  { key: 'prog_path_planner',    val: 'Si',                                   label: 'Path Planner',    color: '#8b5cf6' },
  { key: 'elec_canivore',        val: 'Si',                                   label: 'CANivore',        color: '#f59e0b' },
  { key: 'elec_battery_peak',    val: 'Si',                                   label: 'Battery Peak',    color: '#22c55e' },
  { key: 'goes_under_trench',    val: 'Si',                                   label: 'Under Trench',    color: '#3b82f6' },
  { key: 'mech_checklist',       val: 'Si',                                   label: 'Has Checklist',   color: '#ec4899' },
  { key: 'mech_std_bolts',       val: 'Si',                                   label: 'Std Bolts',       color: '#06b6d4' },
  { key: 'elec_accessible',      val: 'Si',                                   label: 'Accessible',      color: '#84cc16' },
  { key: 'prog_auto_change',     val: 'Sencillo',                             label: 'Easy Auto Change', color: '#f97316' },
  { key: 'elec_cable_replace',   val: 'Sencillo',                             label: 'Easy Cable Fix',  color: '#a855f7' },
  { key: 'comp_drivers_needed',  val: 'No',                                   label: 'Self-Sufficient', color: '#22c55e' },
  { key: 'prog_auto_reliability',val: '10 veces siempre',                     label: 'Perfect Auto',    color: '#f59e0b' },
  { key: 'mech_spare_parts',     val: 'Tenemos para todos los mecanismos',    label: 'Full Spares',     color: '#8b5cf6' },
]

const TOOLTIP_STYLE = {
  contentStyle: { background: '#0d0d1f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 },
}

export function FRCPitScoutingView({ records, onLoad }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [draggingFile, setDraggingFile] = useState(false)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [sortKey, setSortKey] = useState<SortKey>('team_number')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [showFilters, setShowFilters] = useState(true)
  const [search, setSearch] = useState('')

  const handleFile = useCallback(async (file: File) => {
    const text = await file.text()
    onLoad(parseFRCCSVText(text))
  }, [onLoad])

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDraggingFile(false)
    const file = e.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
  }

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
          <div className="upload-icon">📋</div>
          <h2>Drop your FRC CSV here</h2>
          <p>Generated by your pit scouting form</p>
          <p className="upload-hint">configPitScoutingFRC.json · v2.3.0</p>
          <button className="btn btn-primary" onClick={e => { e.stopPropagation(); fileRef.current?.click() }}>
            Browse File
          </button>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={onFileChange} />
        </div>
      </div>
    )
  }

  const filtered = applyFilters(
    records.filter(r =>
      !search || String(r.team_number).includes(search) || r.examiner_name.toLowerCase().includes(search.toLowerCase())
    ),
    filters,
  )

  function setSort(k: SortKey) {
    if (k === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
  }

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey]; const bv = b[sortKey]
    const cmp = typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv))
    return sortDir === 'asc' ? cmp : -cmp
  })

  const swerveCount = records.filter(r => r.mech_chassis_type === 'Swerve').length
  const pathPlannerCount = records.filter(r => r.prog_path_planner === 'Si').length
  const canivoreCount = records.filter(r => r.elec_canivore === 'Si').length
  const perfectAutoCount = records.filter(r => r.prog_auto_reliability === '10 veces siempre').length

  const chassisData = frcGroupByCount(records, 'mech_chassis_type')
  const reliabilityData = frcGroupByCount(records, 'prog_auto_reliability')
  const odometryData = frcGroupByCount(records, 'prog_odometry_type')
  const orientData = frcGroupByCount(records, 'prog_drive_orient')
  const specializationData = frcGroupByCount(records, 'robot_specialization')
  const problemData = frcGroupByCount(records, 'mech_problem_mechanism')

  return (
    <div className="view-content">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>
            ↑ Upload CSV
          </button>
          <button className="btn btn-outline" onClick={() => setShowFilters(v => !v)}>
            {showFilters ? '✕ Hide Filters' : '▼ Show Filters'}
          </button>
          <span className="record-count">
            {filtered.length} / {records.length} teams
          </span>
          {JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS) && (
            <button className="btn-link" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</button>
          )}
        </div>
        <input
          className="search-input"
          placeholder="Search team #…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={onFileChange} />
      </div>

      <div className="content-with-filters">
        {showFilters && (
          <aside className="filter-panel">
            <div className="filter-panel-header">
              <span>Filters</span>
              <button className="btn-link" onClick={() => setFilters(EMPTY_FILTERS)}>Reset</button>
            </div>

            <div className="filter-group">
              <label>Chassis</label>
              <select value={filters.mech_chassis_type} onChange={e => setFilters(f => ({ ...f, mech_chassis_type: e.target.value }))}>
                <option value="all">All</option>
                {unique(records, 'mech_chassis_type').map(v => <option key={v}>{v}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>Specialization</label>
              <select value={filters.robot_specialization} onChange={e => setFilters(f => ({ ...f, robot_specialization: e.target.value }))}>
                <option value="all">All</option>
                {unique(records, 'robot_specialization').map(v => <option key={v}>{v}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>Auto Reliability</label>
              <select value={filters.prog_auto_reliability} onChange={e => setFilters(f => ({ ...f, prog_auto_reliability: e.target.value }))}>
                <option value="all">All</option>
                {unique(records, 'prog_auto_reliability').map(v => <option key={v}>{v}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>Odometry</label>
              <select value={filters.prog_odometry_type} onChange={e => setFilters(f => ({ ...f, prog_odometry_type: e.target.value }))}>
                <option value="all">All</option>
                {unique(records, 'prog_odometry_type').map(v => <option key={v}>{v}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>Path Planner</label>
              <div className="toggle-group">
                {(['all', 'Si', 'No'] as const).map(v => (
                  <button key={v} className={`toggle-btn${filters.prog_path_planner === v ? ' active' : ''}`} onClick={() => setFilters(f => ({ ...f, prog_path_planner: v }))}>
                    {v === 'all' ? 'All' : v}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label>CANivore</label>
              <div className="toggle-group">
                {(['all', 'Si', 'No'] as const).map(v => (
                  <button key={v} className={`toggle-btn${filters.elec_canivore === v ? ' active' : ''}`} onClick={() => setFilters(f => ({ ...f, elec_canivore: v }))}>
                    {v === 'all' ? 'All' : v}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}

        <div className="main-content">
          {/* Stat Cards */}
          <div className="stat-grid">
            <StatCard label="Teams Scouted" value={records.length} icon="🤖" color="#8b5cf6" />
            <StatCard label="Swerve" value={`${Math.round(swerveCount / records.length * 100)}%`} icon="🔄" color="#f59e0b" sub={`${swerveCount} robots`} />
            <StatCard label="Path Planner" value={`${Math.round(pathPlannerCount / records.length * 100)}%`} icon="📍" color="#22c55e" />
            <StatCard label="CANivore" value={`${Math.round(canivoreCount / records.length * 100)}%`} icon="⚡" color="#ef4444" />
            <StatCard label="Avg Ball Cap" value={frcAvg(records, 'mech_ball_capacity')} icon="⚽" color="#3b82f6" />
            <StatCard label="Perfect Auto" value={`${Math.round(perfectAutoCount / records.length * 100)}%`} icon="🎯" color="#ec4899" sub={`${perfectAutoCount} teams`} />
          </div>

          {/* Charts */}
          <div className="charts-grid">
            <div className="chart-card">
              <h3>Chassis Type</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={chassisData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}>
                    {chassisData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Auto Reliability</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={reliabilityData} margin={{ bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={0} angle={-30} textAnchor="end" />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} name="Teams" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Odometry Type</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={odometryData} margin={{ bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 9 }} interval={0} angle={-30} textAnchor="end" />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Teams" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Drive Orientation</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={orientData} margin={{ bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={0} angle={-30} textAnchor="end" />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Teams" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Robot Specialization</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={specializationData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} width={70} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Teams" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Problem Mechanisms</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={problemData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                    {problemData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Feature Adoption */}
          <div className="chart-card">
            <h3>Feature Adoption</h3>
            <div className="bool-grid">
              {FEATURE_STATS.map(({ key, val, label, color }) => {
                const pct = frcValPct(filtered, key, val)
                return (
                  <div key={label} className="bool-stat">
                    <span className="bool-label">{label}</span>
                    <div className="bool-bar-wrap">
                      <div className="bool-bar-fill" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <span className="bool-pct" style={{ color }}>{pct}%</span>
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
                        ['mech_chassis_type', 'Chassis'],
                        ['mech_ball_capacity', 'Ball Cap'],
                        ['prog_auto_reliability', 'Auto Reliability'],
                        ['prog_odometry_type', 'Odometry'],
                        ['prog_path_planner', 'Path Planner'],
                        ['elec_canivore', 'CANivore'],
                        ['robot_specialization', 'Spec.'],
                        ['comp_batteries', 'Batteries'],
                        ['comp_bumper_time', 'Bumper Time'],
                      ] as [SortKey, string][]
                    ).map(([k, label]) => (
                      <th key={k} className="sortable" onClick={() => setSort(k)}>
                        {label} {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r, i) => (
                    <tr key={i}>
                      <td><strong style={{ color: '#a78bfa' }}>{r.team_number}</strong></td>
                      <td>
                        <span className={`badge ${r.mech_chassis_type === 'Swerve' ? 'badge-yellow' : r.mech_chassis_type === 'Mecanum' ? 'badge-blue' : 'badge-gray'}`}>
                          {r.mech_chassis_type || '—'}
                        </span>
                      </td>
                      <td>{r.mech_ball_capacity || '—'}</td>
                      <td>
                        <span className={`badge ${r.prog_auto_reliability === '10 veces siempre' ? 'badge-green' : r.prog_auto_reliability === 'Menos de 10' ? 'badge-yellow' : 'badge-red'}`}>
                          {r.prog_auto_reliability || '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, color: '#94a3b8' }}>{r.prog_odometry_type || '—'}</td>
                      <td>
                        <span className={`badge ${r.prog_path_planner === 'Si' ? 'badge-green' : 'badge-gray'}`}>
                          {r.prog_path_planner || '—'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${r.elec_canivore === 'Si' ? 'badge-yellow' : 'badge-gray'}`}>
                          {r.elec_canivore || '—'}
                        </span>
                      </td>
                      <td>{r.robot_specialization || '—'}</td>
                      <td style={{ fontSize: 11 }}>{r.comp_batteries || '—'}</td>
                      <td style={{ fontSize: 11, color: r.comp_bumper_time === 'Menos de 1 minuto' ? '#22c55e' : r.comp_bumper_time === 'Más de 2 minutos' ? '#ef4444' : '#f59e0b' }}>
                        {r.comp_bumper_time || '—'}
                      </td>
                    </tr>
                  ))}
                  {sorted.length === 0 && (
                    <tr><td colSpan={10} style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>No results match filters</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
