interface Props {
  onSelect: (mode: 'ftc' | 'frc') => void
}

export function ModeChooser({ onSelect }: Props) {
  return (
    <div className="mode-chooser">
      <div className="mode-inner">
        <div className="mode-chooser-header">
          <span className="mode-logo">⬡</span>
          <h1>OVERTURE Pit Analyzer</h1>
          <p>Select a competition program to continue</p>
        </div>

        <div className="mode-cards">
          <button className="mode-card" onClick={() => onSelect('ftc')}>
            <div className="mode-card-badge">FTC</div>
            <div className="mode-card-icon">⚙️</div>
            <h2>FIRST Tech Challenge</h2>
            <ul>
              <li>FTCScout GraphQL API</li>
              <li>FTC Events REST API</li>
              <li>CSV Pit Scouting</li>
              <li>Tier List</li>
            </ul>
          </button>

          <div className="mode-divider">or</div>

          <button className="mode-card mode-card-frc" onClick={() => onSelect('frc')}>
            <div className="mode-card-badge mode-card-badge-frc">FRC</div>
            <div className="mode-card-icon">🤖</div>
            <h2>FIRST Robotics Competition</h2>
            <ul>
              <li>The Blue Alliance API</li>
              <li>Statbotics EPA Analytics</li>
              <li>CSV Pit Scouting</li>
              <li>Tier List</li>
            </ul>
          </button>
        </div>
      </div>
    </div>
  )
}
