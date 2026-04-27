export function Loading({ label = 'Fetching data…' }: { label?: string }) {
  return (
    <div className="loading-wrap">
      <div className="spinner" />
      <p className="loading-label">{label}</p>
    </div>
  )
}
