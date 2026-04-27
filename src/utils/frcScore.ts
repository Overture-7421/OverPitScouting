import type { FRCScoutingRecord, TierLevel } from '../types'

export function computeFRCScore(r: FRCScoutingRecord): number {
  let s = 0

  // Chassis type (max 15)
  if (r.mech_chassis_type === 'Swerve') s += 15
  else if (r.mech_chassis_type === 'Mecanum') s += 8
  else if (r.mech_chassis_type === 'Tank') s += 5

  // Mechanical (max 26)
  if (r.goes_under_trench === 'Si') s += 5
  if (r.mech_spare_parts === 'Tenemos para todos los mecanismos') s += 5
  else if (r.mech_spare_parts === 'Tenemos solo para varios') s += 2
  if (r.mech_std_bolts === 'Si') s += 3
  if (r.mech_checklist === 'Si') s += 3
  s += Math.min(r.mech_ball_capacity, 10)

  // Programming (max 45)
  if (r.prog_path_planner === 'Si') s += 10
  if (r.prog_auto_reliability === '10 veces siempre') s += 15
  else if (r.prog_auto_reliability === 'Menos de 10') s += 8
  else if (r.prog_auto_reliability === 'Menos de 5') s += 3
  if (r.prog_auto_change === 'Sencillo') s += 5
  if (r.prog_odometry_type === 'Fusión de sensores') s += 10
  else if (r.prog_odometry_type === 'Corrección por april tag') s += 9
  else if (r.prog_odometry_type === 'Estimación por swerve') s += 7
  else if (r.prog_odometry_type === 'Encoders de llanta') s += 4
  if (r.prog_drive_orient === 'Ambas') s += 5
  else if (r.prog_drive_orient === 'Orientación de Cancha') s += 3
  else if (r.prog_drive_orient === 'Orientación de robot') s += 1

  // Electrical (max 22)
  if (r.elec_canivore === 'Si') s += 8
  if (r.elec_battery_peak === 'Si') s += 5
  if (r.elec_accessible === 'Si') s += 3
  if (r.elec_cable_replace === 'Sencillo') s += 3
  if (r.elec_ethernet_cables === 'Hechos por nosotros') s += 3

  // Competences (max 20)
  if (r.robot_specialization === 'Score') s += 5
  else if (r.robot_specialization === 'Overall') s += 4
  if (r.comp_batteries === 'Más de 10') s += 5
  else if (r.comp_batteries === 'Menos de 10') s += 3
  else if (r.comp_batteries === 'Menos de 5') s += 1
  if (r.comp_bumper_time === 'Menos de 1 minuto') s += 5
  else if (r.comp_bumper_time === 'Menos de 2 minutos') s += 3
  else if (r.comp_bumper_time === 'Más de 2 minutos') s += 1
  if (r.comp_drivers_needed === 'No') s += 5

  return Math.round(s)
}

export function frcScoreToTier(score: number): TierLevel {
  if (score >= 90) return 'S'
  if (score >= 70) return 'A'
  if (score >= 50) return 'B'
  if (score >= 30) return 'C'
  return 'NO'
}
