import type { FRCScoutingRecord } from '../types'

function num(v: string): number {
  const n = parseFloat(v?.trim() ?? '')
  return isNaN(n) ? 0 : n
}

function splitLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQ = !inQ }
    else if (ch === ',' && !inQ) { out.push(cur); cur = '' }
    else { cur += ch }
  }
  out.push(cur)
  return out
}

export function parseFRCCSVText(text: string): FRCScoutingRecord[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = splitLine(lines[0]).map(h => h.trim())
  const records: FRCScoutingRecord[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const vals = splitLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, j) => { row[h] = (vals[j] ?? '').trim() })

    records.push({
      team_number:            num(row.team_number ?? row['Team Number']),
      timestamp:              row.Timestamp ?? row.timestamp ?? '',
      examiner_name:          row.examiner_name ?? '',
      examiner_feeling:       row.examiner_feeling ?? '',
      is_robot_chassis:       row.is_robot_chassis ?? '',
      goes_under_trench:      row.goes_under_trench ?? '',
      mech_checklist:         row.mech_checklist ?? '',
      mech_spare_parts:       row.mech_spare_parts ?? '',
      mech_std_bolts:         row.mech_std_bolts ?? '',
      mech_problem_mechanism: row.mech_problem_mechanism ?? '',
      mech_chassis_type:      row.mech_chassis_type ?? '',
      mech_ball_capacity:     num(row.mech_ball_capacity),
      ballspersecond_number:  row.ballspersecond_number ?? '',
      prog_path_planner:      row.prog_path_planner ?? '',
      prog_auto_change:       row.prog_auto_change ?? '',
      prog_auto_reliability:  row.prog_auto_reliability ?? '',
      prog_odometry_type:     row.prog_odometry_type ?? '',
      prog_drive_orient:      row.prog_drive_orient ?? '',
      elec_canivore:          row.elec_canivore ?? '',
      elec_ethernet_cables:   row.elec_ethernet_cables ?? '',
      elec_radio_location:    row.elec_radio_location ?? '',
      elec_cable_replace:     row.elec_cable_replace ?? '',
      elec_battery_peak:      row.elec_battery_peak ?? '',
      elec_accessible:        row.elec_accessible ?? '',
      robot_specialization:   row.robot_specialization ?? '',
      comp_batteries:         row.comp_batteries ?? '',
      comp_bumper_time:       row.comp_bumper_time ?? '',
      comp_drivers_needed:    row.comp_drivers_needed ?? '',
      comp_balls_per_second:  num(row.comp_balls_per_second),
      comp_mentors_vs_students: row.comp_mentors_vs_students ?? '',
    })
  }
  return records
}

export function frcGroupByCount(
  records: FRCScoutingRecord[],
  key: keyof FRCScoutingRecord,
): { name: string; value: number }[] {
  const map = new Map<string, number>()
  records.forEach(r => {
    const v = String(r[key] ?? '')
    if (!v) return
    map.set(v, (map.get(v) ?? 0) + 1)
  })
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function frcValPct(records: FRCScoutingRecord[], key: keyof FRCScoutingRecord, val: string): number {
  if (!records.length) return 0
  return Math.round((records.filter(r => r[key] === val).length / records.length) * 100)
}

export function frcAvg(records: FRCScoutingRecord[], key: keyof FRCScoutingRecord): number {
  if (!records.length) return 0
  const sum = records.reduce((acc, r) => acc + (Number(r[key]) || 0), 0)
  return Math.round((sum / records.length) * 10) / 10
}
