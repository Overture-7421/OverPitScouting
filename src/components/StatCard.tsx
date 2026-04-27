interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  color?: string
  icon?: string
}

export function StatCard({ label, value, sub, color = '#8b5cf6', icon }: StatCardProps) {
  return (
    <div className="stat-card" style={{ borderTopColor: color }}>
      {icon && <span className="stat-icon">{icon}</span>}
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}
