# Klaviyo Performance Audit Dashboard

A professional full-stack marketing analytics dashboard that connects to the Klaviyo API and generates a comprehensive audit report covering campaigns, flows, deliverability, and key metrics — with period comparison and AI-powered audit insights.

---

## Features

- **Date Range Selector** — presets (7/14/30/90 days) + custom date picker
- **Period Comparison** — compare to previous period with delta % indicators
- **KPI Cards** — total revenue, emails sent, open/click/unsub rates, conversions, revenue per email
- **Campaign Table** — sortable, colour-coded performance metrics
- **Flow Analysis** — active flows with performance data, stale flow detection
- **Deliverability Score** — visual gauge (0–100) with bounce/unsub/spam rate breakdown
- **Segments Overview** — top 10 segments with empty segment flagging
- **Audit Findings** — categorised wins, issues, and opportunities based on industry benchmarks
- **Export Report** — browser print/PDF of full audit
- **Dark theme** — professional analytics UI

---

## Quick Start

### 1. Clone / navigate to the project

```bash
cd klaviyo-reporter
```

### 2. Install dependencies

```bash
npm run install:all
```

Or individually:
```bash
cd server && npm install
cd ../client && npm install
```

### 3. Add your Klaviyo Private API Key

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:
```
KLAVIYO_PRIVATE_KEY=pk_your_klaviyo_private_key_here
PORT=3001
```

### 4. Run locally

```bash
# From root (runs both server and client with concurrently)
npm run dev

# Or separately:
npm run dev:server   # API server on :3001
npm run dev:client   # React app on :3000
```

Open [http://localhost:3000](http://localhost:3000)

---

## Required Klaviyo API Key Permissions

When creating a Private API Key in Klaviyo (Account → Settings → API Keys), enable **Read** access for:

| Resource | Access |
|---|---|
| Campaigns | Read |
| Flows | Read |
| Metrics | Read |
| Profiles | Read |
| Lists | Read |
| Segments | Read |
| Accounts | Read |

---

## File Structure

```
klaviyo-reporter/
├── client/                    # React frontend (Create React App)
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/        # UI components
│   │   │   ├── Header.*
│   │   │   ├── DateRangeSelector.*
│   │   │   ├── KPICard.*
│   │   │   ├── SortableTable.*
│   │   │   ├── DeliverabilityGauge.*
│   │   │   ├── AuditFindings.*
│   │   │   ├── LoadingProgress.*
│   │   │   ├── SetupScreen.*
│   │   │   └── Section.*
│   │   ├── utils/
│   │   │   ├── api.js          # API calls to backend
│   │   │   ├── dates.js        # Date utilities + period comparison
│   │   │   └── auditEngine.js  # Audit findings logic
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── server/                    # Express API server
│   ├── src/
│   │   ├── routes/
│   │   │   ├── account.js      # API key validation
│   │   │   ├── campaigns.js    # Campaign data + reports
│   │   │   ├── flows.js        # Flow data + reports
│   │   │   ├── deliverability.js # Bounce/unsub/spam metrics
│   │   │   ├── metrics.js      # Aggregate KPIs
│   │   │   └── segments.js     # Segment list
│   │   ├── klaviyoClient.js    # Axios client + pagination + retry
│   │   └── index.js            # Express app
│   ├── .env.example
│   └── package.json
├── package.json               # Root scripts + concurrently
├── .gitignore
└── README.md
```

---

## Industry Benchmarks Used

| Metric | Good | Threshold |
|---|---|---|
| Open Rate | > 35% | Klaviyo benchmark |
| Click Rate | > 1.5% | Industry standard |
| Unsubscribe Rate | < 0.3% | Acceptable |
| Bounce Rate | < 2% | Acceptable |
| Spam Rate | < 0.08% | Acceptable |

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `KLAVIYO_PRIVATE_KEY` | Your Klaviyo Private API Key | Required |
| `PORT` | Port for the Express server | `3001` |
