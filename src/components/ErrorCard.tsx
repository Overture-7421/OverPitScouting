interface ErrorCardProps {
  message: string
  onRetry?: () => void
}

export function ErrorCard({ message, onRetry }: ErrorCardProps) {
  return (
    <div className="error-card">
      <span className="material-icons error-icon">warning</span>
      <p className="error-msg">{message}</p>
      {onRetry && (
        <button className="btn btn-outline" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}
