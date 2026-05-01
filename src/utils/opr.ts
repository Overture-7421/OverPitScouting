import type { HybridMatch, FTCMatchScore } from '../types'

export function computeOPR(matches: HybridMatch[]): Record<number, number> {
  const played = matches.filter(m => m.scoreRedFinal != null && m.scoreBlueFinal != null)
  if (!played.length) return {}

  const teams = Array.from(new Set(played.flatMap(m => m.teams.map(t => t.teamNumber))))
  const opr: Record<number, number> = Object.fromEntries(teams.map(t => [t, 0]))

  // Seed: each team starts at avg alliance score / 2
  const sumScore: Record<number, number> = Object.fromEntries(teams.map(t => [t, 0]))
  const cnt: Record<number, number> = Object.fromEntries(teams.map(t => [t, 0]))
  for (const m of played) {
    const reds = m.teams.filter(t => t.station.startsWith('Red')).map(t => t.teamNumber)
    const blues = m.teams.filter(t => t.station.startsWith('Blue')).map(t => t.teamNumber)
    for (const t of reds) { sumScore[t] += m.scoreRedFinal!; cnt[t]++ }
    for (const t of blues) { sumScore[t] += m.scoreBlueFinal!; cnt[t]++ }
  }
  for (const t of teams) opr[t] = cnt[t] > 0 ? sumScore[t] / cnt[t] / 2 : 0

  // Gauss-Seidel iteration (converges in ~30-50 rounds for typical event sizes)
  for (let iter = 0; iter < 80; iter++) {
    for (const t of teams) {
      let s = 0, n = 0
      for (const m of played) {
        const reds = m.teams.filter(x => x.station.startsWith('Red')).map(x => x.teamNumber)
        const blues = m.teams.filter(x => x.station.startsWith('Blue')).map(x => x.teamNumber)
        if (reds.includes(t)) {
          const p = reds.find(x => x !== t) ?? 0
          s += m.scoreRedFinal! - (opr[p] ?? 0); n++
        } else if (blues.includes(t)) {
          const p = blues.find(x => x !== t) ?? 0
          s += m.scoreBlueFinal! - (opr[p] ?? 0); n++
        }
      }
      if (n) opr[t] = s / n
    }
  }

  return opr
}

export function computeAvgTotal(matches: HybridMatch[]): Record<number, number> {
  const played = matches.filter(m => m.scoreRedFinal != null && m.scoreBlueFinal != null)
  const sums: Record<number, number> = {}
  const counts: Record<number, number> = {}
  for (const m of played) {
    const reds = m.teams.filter(t => t.station.startsWith('Red')).map(t => t.teamNumber)
    const blues = m.teams.filter(t => t.station.startsWith('Blue')).map(t => t.teamNumber)
    for (const t of reds) { sums[t] = (sums[t] ?? 0) + m.scoreRedFinal!; counts[t] = (counts[t] ?? 0) + 1 }
    for (const t of blues) { sums[t] = (sums[t] ?? 0) + m.scoreBlueFinal!; counts[t] = (counts[t] ?? 0) + 1 }
  }
  return Object.fromEntries(
    Object.keys(sums).map(t => [Number(t), sums[Number(t)] / counts[Number(t)]])
  )
}

export function computeAvgNP(scores: FTCMatchScore[], matches: HybridMatch[]): Record<number, number> {
  const sums: Record<number, number> = {}
  const counts: Record<number, number> = {}
  for (const m of matches) {
    const sc = scores.find(s => s.matchNumber === m.matchNumber)
    if (!sc) continue
    const reds = m.teams.filter(t => t.station.startsWith('Red')).map(t => t.teamNumber)
    const blues = m.teams.filter(t => t.station.startsWith('Blue')).map(t => t.teamNumber)
    for (const t of reds) { sums[t] = (sums[t] ?? 0) + sc.redNP; counts[t] = (counts[t] ?? 0) + 1 }
    for (const t of blues) { sums[t] = (sums[t] ?? 0) + sc.blueNP; counts[t] = (counts[t] ?? 0) + 1 }
  }
  return Object.fromEntries(
    Object.keys(sums).map(t => [Number(t), sums[Number(t)] / counts[Number(t)]])
  )
}
