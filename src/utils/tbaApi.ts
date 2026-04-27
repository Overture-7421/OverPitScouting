import type { TBATeam, TBARanking, TBARankingsResponse, TBAMatch } from '../types'
import { FRC_EVENT_CODE } from '../constants'

const BASE = '/api/tba'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`TBA ${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}

export async function fetchTBARankings(): Promise<TBARanking[]> {
  const data = await get<TBARankingsResponse>(`/event/${FRC_EVENT_CODE}/rankings`)
  return data.rankings ?? []
}

export async function fetchTBATeams(): Promise<TBATeam[]> {
  return get<TBATeam[]>(`/event/${FRC_EVENT_CODE}/teams`)
}

export async function fetchTBAMatches(): Promise<TBAMatch[]> {
  const all = await get<TBAMatch[]>(`/event/${FRC_EVENT_CODE}/matches`)
  return all.sort((a, b) => {
    if (a.comp_level !== b.comp_level) return a.comp_level.localeCompare(b.comp_level)
    return a.match_number - b.match_number
  })
}

export function tbaTeamNum(key: string): number {
  return parseInt(key.replace('frc', ''), 10)
}
