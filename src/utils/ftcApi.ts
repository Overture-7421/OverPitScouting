import type { FTCTeam, FTCRanking, HybridMatch } from '../types'
import { EVENT_CODE, SEASON } from '../constants'

const BASE = '/api/ftc'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`FTC API ${res.status}: ${text || res.statusText}`)
  }
  return res.json() as Promise<T>
}

export async function fetchFTCRankings(): Promise<FTCRanking[]> {
  const data = await get<{ Rankings?: FTCRanking[] }>(`/v2.0/${SEASON}/rankings/${EVENT_CODE}`)
  return data.Rankings ?? []
}

export async function fetchFTCTeams(): Promise<FTCTeam[]> {
  const data = await get<{ teams?: FTCTeam[]; teamCountTotal?: number }>(
    `/v2.0/${SEASON}/teams?eventCode=${EVENT_CODE}`,
  )
  return data.teams ?? []
}

export async function fetchFTCSchedule(): Promise<HybridMatch[]> {
  const data = await get<{ Schedule?: RawHybrid[] }>(
    `/v2.0/${SEASON}/schedule/${EVENT_CODE}/qual/hybrid`,
  )
  return (data.Schedule ?? []).map(mapHybrid)
}

interface RawHybrid {
  description?: string
  matchNumber?: number
  startTime?: string
  scoreRedFinal?: number
  scoreBlueFinal?: number
  scoreRedFoul?: number
  scoreBlueFoul?: number
  teams?: RawHTeam[]
}

interface RawHTeam {
  teamNumber?: number
  station?: string
  teamName?: string
  surrogate?: boolean
  noShow?: boolean
}

function mapHybrid(m: RawHybrid): HybridMatch {
  return {
    matchNumber: m.matchNumber ?? 0,
    description: m.description,
    startTime: m.startTime,
    scoreRedFinal: m.scoreRedFinal ?? undefined,
    scoreBlueFinal: m.scoreBlueFinal ?? undefined,
    scoreRedFoul: m.scoreRedFoul ?? undefined,
    scoreBlueFoul: m.scoreBlueFoul ?? undefined,
    teams: (m.teams ?? []).map(t => ({
      teamNumber: t.teamNumber ?? 0,
      station: t.station ?? '',
      teamName: t.teamName,
      surrogate: t.surrogate ?? false,
      noShow: t.noShow ?? false,
    })),
  }
}
