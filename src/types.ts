export type ViewId = 'pitscouting' | 'graphql' | 'api' | 'tierlist'
export type FRCViewId = 'pitscouting' | 'tba' | 'statbotics' | 'tierlist'

export interface ScoutingRecord {
  team_number: number
  timestamp: string
  examiner_name: string
  examiner_feeling: string
  mech_drive_motors: number
  mech_shooter_type: string
  mech_indexer: boolean
  mech_has_climb: boolean
  mech_climb_time: string
  mech_checklist: boolean
  mech_spare_parts: boolean
  mech_self_repair: boolean
  mech_drive_team_fix: boolean
  prog_language: string
  prog_path_lib_used: boolean
  prog_path_lib: string
  prog_has_auto: boolean
  prog_auto_count: number
  prog_vision: boolean
  prog_vision_lib: string
  prog_odometry: boolean
  prog_processor: boolean
  elec_controller: string
  elec_motor_count: number
  elec_servo_count: number
  elec_extra_motors: boolean
  elec_extra_cables: boolean
  elec_cable_mgmt: boolean
  elec_cable_protection: boolean
  elec_connections: string
  elec_monitoring: boolean
  elec_power_dist: boolean
  comp_batteries: string
  comp_first_inspection: boolean
  comp_experience: string
  comp_drive_coach: boolean
  comp_student_drive: boolean
  comp_human_player: boolean
  comp_practice_freq: string
  comp_has_strategy: boolean
  comp_alliance_willing: boolean
  comp_commitment: string
}

export interface GQLLocation {
  venue?: string
  city: string
  state: string
  country: string
}

export interface GQLTeam {
  number: number
  name: string
  schoolName?: string
  rookieYear?: number
  location?: GQLLocation
}

export interface GQLStatsGroup {
  totalPoints: number
  autoPoints: number
  dcPoints: number
}

export interface GQLTeamStats {
  rank: number
  rp: number
  tb1: number
  tb2: number
  wins: number
  losses: number
  ties: number
  qualMatchesPlayed: number
  opr?: GQLStatsGroup
  avg?: GQLStatsGroup
}

export interface GQLTeamParticipation {
  teamNumber: number
  team: GQLTeam
  stats?: GQLTeamStats
}

export interface GQLMatchTeam {
  alliance: 'Red' | 'Blue'
  teamNumber: number
  surrogate: boolean
  noShow: boolean
  dq: boolean
}

export interface GQLAllianceScore {
  autoPoints: number
  dcPoints: number
  totalPoints: number
  totalPointsNp: number
}

export interface GQLMatchScores {
  red: GQLAllianceScore
  blue: GQLAllianceScore
}

export interface GQLMatch {
  id: number
  matchNum: number
  hasBeenPlayed: boolean
  tournamentLevel: string
  teams: GQLMatchTeam[]
  scores?: GQLMatchScores
}

export interface GQLEventData {
  name: string
  start: string
  end: string
  location?: GQLLocation
  teams: GQLTeamParticipation[]
  matches: GQLMatch[]
}

export interface FTCTeam {
  teamNumber: number
  nameShort?: string
  nameFull?: string
  city?: string
  stateProv?: string
  country?: string
  rookieYear?: number
  robotName?: string
  schoolName?: string
}

export interface FTCRanking {
  rank: number
  teamNumber: number
  teamName?: string
  sortOrder1: number
  sortOrder2: number
  wins: number
  losses: number
  ties: number
  qualAverage: number
  matchesPlayed: number
}

export interface HybridMatchTeam {
  teamNumber: number
  station: string
  teamName?: string
  surrogate: boolean
  noShow: boolean
}

export interface HybridMatch {
  matchNumber: number
  description?: string
  startTime?: string
  scoreRedFinal?: number
  scoreBlueFinal?: number
  scoreRedFoul?: number
  scoreBlueFoul?: number
  teams: HybridMatchTeam[]
}

// ── FRC Scouting Record ───────────────────────────────────────────
export interface FRCScoutingRecord {
  team_number: number
  timestamp: string
  examiner_name: string
  examiner_feeling: string
  // Mech
  is_robot_chassis: string
  goes_under_trench: string
  mech_checklist: string
  mech_spare_parts: string
  mech_std_bolts: string
  mech_problem_mechanism: string
  mech_chassis_type: string
  mech_ball_capacity: number
  ballspersecond_number: string
  // Programming
  prog_path_planner: string
  prog_auto_change: string
  prog_auto_reliability: string
  prog_odometry_type: string
  prog_drive_orient: string
  // Electrical
  elec_canivore: string
  elec_ethernet_cables: string
  elec_radio_location: string
  elec_cable_replace: string
  elec_battery_peak: string
  elec_accessible: string
  // Competences
  robot_specialization: string
  comp_batteries: string
  comp_bumper_time: string
  comp_drivers_needed: string
  comp_balls_per_second: number
  comp_mentors_vs_students: string
}

// ── TBA API Types ─────────────────────────────────────────────────
export interface TBATeam {
  key: string
  team_number: number
  nickname?: string
  name?: string
  city?: string
  state_prov?: string
  country?: string
  rookie_year?: number
  school_name?: string
}

export interface TBARanking {
  rank: number
  team_key: string
  record: { wins: number; losses: number; ties: number }
  qual_average?: number
  sort_orders?: number[]
  matches_played: number
}

export interface TBARankingsResponse {
  rankings: TBARanking[]
  sort_order_info?: { name: string; precision: number }[]
}

export interface TBAAlliance {
  team_keys: string[]
  score: number
}

export interface TBAMatch {
  key: string
  comp_level: string
  set_number: number
  match_number: number
  alliances?: { red: TBAAlliance; blue: TBAAlliance }
  winning_alliance?: '' | 'red' | 'blue'
  time?: number
}

// ── Statbotics Types ──────────────────────────────────────────────
export interface StatboticsTeamEvent {
  team: number
  year: number
  event: string
  rank?: number | null
  epa?: {
    total_points?: { mean: number; sd: number }
    breakdown?: {
      auto_points?: { mean: number }
      teleop_points?: { mean: number }
      endgame_points?: { mean: number }
    }
  }
  record?: { wins: number; losses: number; ties: number }
}

export interface StatboticsMatch {
  key: string
  year: number
  event: string
  comp_level: string
  match_number: number
  set_number: number
  status: string
  alliances?: {
    red: { team_keys: number[]; score?: number }
    blue: { team_keys: number[]; score?: number }
  }
  winner?: string
}

export interface FTCMatchScore {
  matchNumber: number
  redNP: number
  blueNP: number
  redAuto: number
  blueAuto: number
}

export type TierLevel = 'S' | 'A' | 'B' | 'C' | 'NO'

export interface TierState {
  S: number[]
  A: number[]
  B: number[]
  C: number[]
  NO: number[]
  unranked: number[]
}
