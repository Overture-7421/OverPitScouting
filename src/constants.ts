export const EVENT_CODE = 'FTCCMP1GOOD'
export const SEASON = 2025

export const FRC_EVENT_CODE = '2026cur'
export const FRC_SEASON = 2026

export const CHART_COLORS = [
  '#8b5cf6', '#a855f7', '#ec4899', '#3b82f6',
  '#22c55e', '#f59e0b', '#ef4444', '#06b6d4',
  '#84cc16', '#f97316',
]

export const TIER_META: Record<string, { color: string; glow: string; label: string }> = {
  S: { color: '#f59e0b', glow: 'rgba(245,158,11,0.25)', label: 'S — Essential Pick' },
  A: { color: '#22c55e', glow: 'rgba(34,197,94,0.25)', label: 'A — Strong Pick' },
  B: { color: '#3b82f6', glow: 'rgba(59,130,246,0.25)', label: 'B — Solid Pick' },
  C: { color: '#a855f7', glow: 'rgba(168,85,247,0.25)', label: 'C — Possible Pick' },
  NO: { color: '#6b7280', glow: 'rgba(107,114,128,0.2)', label: 'NO — Do Not Pick' },
}
