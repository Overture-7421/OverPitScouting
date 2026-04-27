import type { ScoutingRecord } from '../types'

function bool(v: string): boolean {
  return v?.trim().toLowerCase() === 'yes'
}

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

export function parseCSVText(text: string): ScoutingRecord[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const headers = splitLine(lines[0]).map(h => h.trim())
  const records: ScoutingRecord[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const vals = splitLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, j) => { row[h] = (vals[j] ?? '').trim() })

    records.push({
      team_number: num(row.team_number ?? row['Team Number']),
      timestamp: row.Timestamp ?? row.timestamp ?? '',
      examiner_name: row.examiner_name ?? '',
      examiner_feeling: row.examiner_feeling ?? '',
      mech_drive_motors: num(row.mech_drive_motors),
      mech_shooter_type: row.mech_shooter_type ?? '',
      mech_indexer: bool(row.mech_indexer),
      mech_has_climb: bool(row.mech_has_climb),
      mech_climb_time: row.mech_climb_time ?? '',
      mech_checklist: bool(row.mech_checklist),
      mech_spare_parts: bool(row.mech_spare_parts),
      mech_self_repair: bool(row.mech_self_repair),
      mech_drive_team_fix: bool(row.mech_drive_team_fix),
      prog_language: row.prog_language ?? '',
      prog_path_lib_used: bool(row.prog_path_lib_used),
      prog_path_lib: row.prog_path_lib ?? '',
      prog_has_auto: bool(row.prog_has_auto),
      prog_auto_count: num(row.prog_auto_count),
      prog_vision: bool(row.prog_vision),
      prog_vision_lib: row.prog_vision_lib ?? '',
      prog_odometry: bool(row.prog_odometry),
      prog_processor: bool(row.prog_processor),
      elec_controller: row.elec_controller ?? '',
      elec_motor_count: num(row.elec_motor_count),
      elec_servo_count: num(row.elec_servo_count),
      elec_extra_motors: bool(row.elec_extra_motors),
      elec_extra_cables: bool(row.elec_extra_cables),
      elec_cable_mgmt: bool(row.elec_cable_mgmt),
      elec_cable_protection: bool(row.elec_cable_protection),
      elec_connections: row.elec_connections ?? '',
      elec_monitoring: bool(row.elec_monitoring),
      elec_power_dist: bool(row.elec_power_dist),
      comp_batteries: row.comp_batteries ?? '',
      comp_first_inspection: bool(row.comp_first_inspection),
      comp_experience: row.comp_experience ?? '',
      comp_drive_coach: bool(row.comp_drive_coach),
      comp_student_drive: bool(row.comp_student_drive),
      comp_human_player: bool(row.comp_human_player),
      comp_practice_freq: row.comp_practice_freq ?? '',
      comp_has_strategy: bool(row.comp_has_strategy),
      comp_alliance_willing: bool(row.comp_alliance_willing),
      comp_commitment: row.comp_commitment ?? '',
    })
  }
  return records
}

export function groupByCount(
  records: ScoutingRecord[],
  key: keyof ScoutingRecord,
): { name: string; value: number }[] {
  const map = new Map<string, number>()
  records.forEach(r => {
    const v = String(r[key] ?? 'Unknown')
    map.set(v, (map.get(v) ?? 0) + 1)
  })
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function boolPct(records: ScoutingRecord[], key: keyof ScoutingRecord): number {
  if (!records.length) return 0
  return Math.round((records.filter(r => r[key] === true).length / records.length) * 100)
}

export function avg(records: ScoutingRecord[], key: keyof ScoutingRecord): number {
  if (!records.length) return 0
  const sum = records.reduce((acc, r) => acc + (Number(r[key]) || 0), 0)
  return Math.round((sum / records.length) * 10) / 10
}
