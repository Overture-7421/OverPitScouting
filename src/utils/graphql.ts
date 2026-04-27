import type { GQLEventData } from '../types'
import { EVENT_CODE, SEASON } from '../constants'

// In production the Vite dev-proxy doesn't exist — call FTCScout directly.
const GQL_URL = import.meta.env.PROD
  ? 'https://api.ftcscout.org/graphql'
  : '/api/graphql'

const QUERY = `{
  eventByCode(season: ${SEASON}, code: "${EVENT_CODE}") {
    name start end
    location { venue city state country }
    teams {
      teamNumber
      team { number name schoolName rookieYear location { city state country } }
      stats {
        ... on TeamEventStats2025 {
          rank rp tb1 tb2 wins losses ties qualMatchesPlayed
          opr { totalPoints autoPoints dcPoints }
          avg { totalPoints autoPoints dcPoints }
        }
      }
    }
    matches {
      id matchNum hasBeenPlayed tournamentLevel
      teams { alliance teamNumber surrogate noShow dq }
      scores {
        ... on MatchScores2025 {
          red { autoPoints dcPoints totalPoints totalPointsNp }
          blue { autoPoints dcPoints totalPoints totalPointsNp }
        }
      }
    }
  }
}`

export async function fetchGQLEvent(): Promise<GQLEventData> {
  const res = await fetch(GQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY }),
  })
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}: ${res.statusText}`)
  const json = (await res.json()) as {
    data?: { eventByCode?: GQLEventData }
    errors?: { message: string }[]
  }
  if (json.errors?.length) throw new Error(json.errors.map(e => e.message).join('; '))
  if (!json.data?.eventByCode) throw new Error('No event data returned — check event code & season')
  return json.data.eventByCode
}
