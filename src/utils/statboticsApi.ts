import type { StatboticsTeamEvent, StatboticsMatch } from '../types'
import { FRC_EVENT_CODE } from '../constants'

// In production the Vite dev-proxy doesn't exist — call Statbotics directly.
// Statbotics is a public API with no authentication required.
const BASE = import.meta.env.PROD
  ? 'https://api.statbotics.io'
  : '/api/statbotics'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`Statbotics ${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}

export async function fetchStatboticsTeamEvents(): Promise<StatboticsTeamEvent[]> {
  return get<StatboticsTeamEvent[]>(`/v3/team_events?event=${FRC_EVENT_CODE}&limit=500`)
}

export async function fetchStatboticsMatches(): Promise<StatboticsMatch[]> {
  return get<StatboticsMatch[]>(`/v3/matches?event=${FRC_EVENT_CODE}&limit=500`)
}
