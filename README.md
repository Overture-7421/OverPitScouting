# OVERTURE Pit Scouting Analyzer

A dual-mode pit scouting dashboard for **FIRST Tech Challenge (FTC)** and **FIRST Robotics Competition (FRC)**, built by Team OVERTURE. Visualizes pit-scouted CSV data alongside live competition data from FTCScout, FTC Events API, The Blue Alliance, and Statbotics.

---

## Features

### Program Chooser
The app opens with a full-screen selector. Pick **FTC** or **FRC** — each mode has its own four views, independent data state, and color theme. A "Switch Program" button in the header lets you change mode without losing uploaded data.

### FTC Mode
| View | Source | Description |
|------|--------|-------------|
| Pit Scouting | CSV upload | Upload your pit scouting CSV, get instant charts and a sortable team table |
| GraphQL | api.ftcscout.org | Live rankings, match scores, and OPR scatter — season 2025 |
| REST API | ftc-api.firstinspires.org | Rankings, hybrid schedule, and team roster |
| Tier List | Local computation | Auto-ranked S/A/B/C/NO tier list from pit data, drag to re-rank, export CSV |

### FRC Mode
| View | Source | Description |
|------|--------|-------------|
| Pit Scouting | CSV upload | FRC scouting form (v2.3.0, Spanish), chassis/auto/electrical analytics |
| Blue Alliance | thebluealliance.com | Rankings, 3-robot alliance match table, scatter charts |
| Statbotics | api.statbotics.io | EPA rankings, Auto vs Teleop scatter, match scores |
| Tier List | Local computation | Auto-ranked from FRC rubric, chassis/specialization chip icons, export CSV |

---

## Deployed App

The `docs/` folder is the built static app served via **GitHub Pages** (branch `main`, `/docs` folder).

> **Note — API features on GitHub Pages:** The CSV upload and Tier List views work fully in the deployed app. The API views (GraphQL, REST API, Blue Alliance, Statbotics) require the local dev server because API keys are injected server-side by the Vite proxy and are never embedded in the built bundle. Run `npm run dev` locally at the event venue to use live API data.

---

## Local Development

### Prerequisites
- Node.js 18+
- npm 9+

### Setup

```bash
git clone <repo-url>
cd FTCPitScoutingAnalyzer
npm install
```

Create a `.env` file in the project root (never commit this):

```env
# FTC Events API — https://ftc-api.firstinspires.org
FTC_API_USERNAME=your_username
FTC_API_SECRET=your_secret

# The Blue Alliance API — https://www.thebluealliance.com/account
TBA_API_SECRET=your_tba_auth_key
TBA_API_DESCRIPTION=PitScoutingAnalyzer
```

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). All API calls route through the Vite proxy which injects authentication headers.

---

## Event Configuration

Before each competition, update `src/constants.ts`:

```ts
// FTC
export const EVENT_CODE = 'FTCCMP1GOOD'   // FTCScout / FTC Events event code
export const SEASON     = 2025

// FRC — TBA event key format: {year}{eventcode}  e.g. 2026cur, 2026txhou1
export const FRC_EVENT_CODE = '2026cur'
export const FRC_SEASON     = 2026
```

---

## Building for GitHub Pages

```bash
npm run build        # outputs to docs/
git add docs/
git commit -m "deploy: rebuild for GitHub Pages"
git push
```

In your GitHub repo settings: **Pages → Source → Deploy from branch → `main` → `/docs`**.

---

## Pit Scouting CSV Format

Both FTC and FRC scouting forms follow their respective JSON config schemas in `public/configJSONs/`:

| Program | Config | Sample CSV |
|---------|--------|------------|
| FTC | `configJSONs/FTC/configPitScoutingFTC.json` v1.1.0 | `CSVs/FTC/testing_01_FTC.csv` |
| FRC | `configJSONs/FRC/configPitScoutingFRC.json` v2.3.0 | `CSVs/FRC/testing_01_FRC.csv` |

The CSV must include a header row matching the `key` fields defined in the config. FRC booleans use `Si`/`No` (Spanish).

---

## Tier List Scoring

Teams are auto-scored from pit data and placed into tiers. You can drag chips to re-rank, add notes per team, and export the result as CSV.

### FTC Rubric (~0–130 pts)
| Category | Max | Key signals |
|----------|-----|-------------|
| Mechanical | 35 | Climb (+15), climb time (up to +12), indexer (+4) |
| Programming | 40 | Vision (+8), odometry (+7), auto count, path library |
| Electrical | 12 | Cable management, monitoring, connections |
| Competences | 60 | Alliance willing (+10), commitment, experience, strategy |

### FRC Rubric (~0–128 pts)
| Category | Max | Key signals |
|----------|-----|-------------|
| Chassis | 15 | Swerve (+15), Mecanum (+8), Tank (+5) |
| Mechanical | 26 | Under trench (+5), spare parts (+5), ball capacity (up to +10) |
| Programming | 45 | Path Planner (+10), perfect auto (+15), sensor-fusion odometry (+10) |
| Electrical | 22 | CANivore (+8), Battery Peak (+5), accessible (+3) |
| Competences | 20 | Batteries, bumper swap time, self-sufficient (+5 each) |

**Tiers:** S ≥ 90 · A ≥ 70 · B ≥ 50 · C ≥ 30 · NO < 30

---

## Tech Stack

| Tool | Version | Role |
|------|---------|------|
| React | 19 | UI framework |
| TypeScript | 6 | Type safety |
| Vite | 8 | Dev server + build (proxy for API auth) |
| Recharts | 3.8 | All charts (bar, pie, scatter) |

---

## Project Structure

```
src/
  components/      StatCard, Loading, ErrorCard, ModeChooser
  views/           PitScoutingView, GraphQLView, ApiView, TierListView
                   FRCPitScoutingView, TBAView, StatboticsView, FRCTierListView
  utils/           csv.ts, ftcApi.ts, graphql.ts, score.ts
                   frcCsv.ts, tbaApi.ts, statboticsApi.ts, frcScore.ts
  types.ts         All shared TypeScript interfaces
  constants.ts     Event codes, chart colors, tier metadata
public/
  configJSONs/FTC/ FTC questionnaire schema + API specs
  configJSONs/FRC/ FRC questionnaire schema + API specs
  CSVs/            Sample pit scouting data for testing
docs/              Built app — served by GitHub Pages
```

---

*Built by [OVERTURE](https://github.com/overture-frc) · 2026*
