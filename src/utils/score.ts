import type { ScoutingRecord, TierLevel } from '../types'

const COMMITMENT: Record<string, number> = {
  'More than us': 15, Excellent: 12, High: 9, Good: 6, Moderate: 3, Low: 0,
}
const EXPERIENCE: Record<string, number> = {
  '5+ years': 10, '3–5 years': 7, '1–2 years': 4, 'Rookie (1st year)': 1,
}
const PRACTICE: Record<string, number> = {
  Daily: 5, '2–3× per week': 3, 'Once a week': 1, Rarely: 0,
}
const CLIMB: Record<string, number> = {
  '< 5 sec': 12, '5–10 sec': 8, '10–20 sec': 4, '> 20 sec': 1, 'Does not climb/park': 0,
}

export function computeScore(r: ScoutingRecord): number {
  let s = 0

  // Mechanical
  s += r.mech_has_climb ? 15 : 0
  s += CLIMB[r.mech_climb_time] ?? 0
  s += r.mech_indexer ? 4 : 0
  s += r.mech_spare_parts ? 3 : 0
  s += r.mech_self_repair ? 4 : 0
  s += r.mech_checklist ? 2 : 0
  s += r.mech_drive_motors >= 4 ? 3 : 0

  // Programming
  s += r.prog_vision ? 8 : 0
  s += r.prog_odometry ? 7 : 0
  s += r.prog_has_auto ? 5 : 0
  s += Math.min(r.prog_auto_count * 1.5, 9)
  s += r.prog_path_lib_used && r.prog_path_lib !== 'None' ? 5 : 0
  s += r.prog_processor ? 3 : 0
  s += r.prog_language === 'Java' ? 4 : r.prog_language === 'OnBot Java' ? 2 : 0

  // Electrical
  s += r.elec_cable_mgmt ? 3 : 0
  s += r.elec_cable_protection ? 3 : 0
  s += r.elec_monitoring ? 2 : 0
  s += r.elec_extra_motors ? 2 : 0
  s += r.elec_extra_cables ? 2 : 0
  s += r.elec_power_dist ? 2 : 0

  // Competences
  s += EXPERIENCE[r.comp_experience] ?? 0
  s += PRACTICE[r.comp_practice_freq] ?? 0
  s += COMMITMENT[r.comp_commitment] ?? 0
  s += r.comp_drive_coach ? 5 : 0
  s += r.comp_has_strategy ? 5 : 0
  s += r.comp_alliance_willing ? 10 : 0
  s += r.comp_first_inspection ? 3 : 0
  s += r.comp_human_player ? 3 : 0

  return Math.round(s)
}

export function scoreToTier(score: number): TierLevel {
  if (score >= 90) return 'S'
  if (score >= 70) return 'A'
  if (score >= 50) return 'B'
  if (score >= 30) return 'C'
  return 'NO'
}
