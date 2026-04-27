import type { FTCTeam, FTCRanking, HybridMatch } from '../types'
import { EVENT_CODE, SEASON } from '../constants'

// ftc-api.firstinspires.org blocks browser CORS requests.
// In production we route through a Cloudflare Worker (proxy-worker/) that adds
// the Basic auth header server-side and returns CORS headers.
// Set VITE_FTC_PROXY_URL in .env to the deployed worker URL.
const PROD = import.meta.env.PROD
const BASE = PROD
  ? (import.meta.env.VITE_FTC_PROXY_URL as string ?? '').replace(/\/$/, '')
  : '/api/ftc'

function headers(): Record<string, string> {
  return { Accept: 'application/json' }
  // Auth is handled by the Cloudflare Worker in production (secrets stored there).
  // In dev the Vite proxy injects the Authorization header.
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: headers() })
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
