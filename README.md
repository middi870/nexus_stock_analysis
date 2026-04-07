# NEXUS — NSE Intelligence Platform

> A production-grade stock analytics dashboard for Indian markets — built for the Jarnox internship assignment.

![NEXUS Dashboard](https://img.shields.io/badge/Stack-FastAPI%20%2B%20React%20%2B%20SQLite-00E5A0?style=flat-square)
![Python](https://img.shields.io/badge/Python-3.12-blue?style=flat-square)
![Railway](https://img.shields.io/badge/Deploy-Railway-purple?style=flat-square)

---
## Live Link
* Backend: https://nexus-stock-analysis.onrender.com/docs
* Frontend: https://nexus-stock-analysis.vercel.app/
---

## Overview

NEXUS combines the best of two reference architectures into a single, cohesive platform:

- **Real-time NSE/BSE data** via yfinance (with deterministic mock fallback for offline/demo use)
- **10+ technical indicators** — MA, Bollinger Bands, RSI, MACD, Stochastic, ATR, OBV, VWAP, Momentum
- **Multi-panel interactive charts** — price + secondary panel (RSI / MACD / Stochastic / Volume)
- **Advanced stock screener** — filter by sector, PE, PB, dividend yield, RSI, volatility, price change
- **Market heatmap** — treemap by sector, colour-coded by daily % change
- **Stock comparison** — normalised return curves + Pearson correlation
- **AI chat sidebar** — SSE-streaming analyst powered by Ollama / Anthropic / OpenAI / OpenRouter
- **Conversation persistence** — AI chat history stored in SQLite, resumable across sessions
- **52-week stats, fundamentals, live ticker** in a single Bloomberg-inspired UI

---

## Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Backend   | Python 3.12, FastAPI 0.115, uvicorn             |
| Data      | pandas, numpy, yfinance                         |
| Storage   | SQLite (WAL mode) — no external DB required     |
| AI        | httpx SSE streaming → Ollama / Anthropic / OpenAI / OpenRouter |
| Frontend  | React 18, Vite 5, Recharts                      |
| Serve     | nginx (production), Vite dev server (local)     |
| Deploy    | Railway (two services + persistent volume)      |
| Container | Docker + Docker Compose (local dev)             |

---

## Project Structure

```
nexus/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py          # All settings, env-var driven
│   │   │   └── constants.py       # 20 NSE company definitions
│   │   ├── db/
│   │   │   └── database.py        # SQLite init, get_conn()
│   │   ├── services/
│   │   │   ├── analytics_service.py  # 10+ indicators (pure functions)
│   │   │   ├── ai_service.py         # SSE streaming, conversation persistence
│   │   │   ├── cache_service.py      # In-memory TTL cache
│   │   │   └── data_service.py       # yfinance + deterministic mock
│   │   ├── api/routes/
│   │   │   ├── health.py
│   │   │   ├── stocks.py          # /companies /data /summary /compare
│   │   │   ├── market.py          # /movers /sectors /heatmap
│   │   │   ├── screener.py        # /screener
│   │   │   └── ai.py              # /ai/stream /ai/chat /ai/history
│   │   └── main.py                # FastAPI app, startup ingestion
│   ├── requirements.txt
│   ├── Dockerfile
│   └── railway.toml
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TopBar.jsx         # Nav + live ticker + search
│   │   │   ├── Watchlist.jsx      # Left sidebar, sector filter
│   │   │   ├── MainChart.jsx      # Price chart + indicator panel
│   │   │   ├── StockInfoBar.jsx   # Right stats panel + gauges
│   │   │   ├── Screener.jsx       # Filterable stock table
│   │   │   ├── Heatmap.jsx        # Sector treemap
│   │   │   ├── Compare.jsx        # Dual-stock comparison
│   │   │   └── AISidebar.jsx      # Streaming AI chat
│   │   ├── context/AppContext.jsx # Global state
│   │   ├── api.js                 # HTTP client + SSE + formatters
│   │   ├── styles/globals.css     # Design system (CSS vars)
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── railway.toml
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## API Reference

| Method | Endpoint                     | Description                              |
|--------|------------------------------|------------------------------------------|
| GET    | `/health`                    | Liveness + DB check                      |
| GET    | `/companies`                 | All 20 stocks with live price + metadata |
| GET    | `/data/{symbol}?days=90`     | OHLCV + 10 indicators                    |
| GET    | `/summary/{symbol}`          | 52W stats + full indicator snapshot      |
| GET    | `/compare?symbol1=&symbol2=` | Normalised returns + Pearson correlation  |
| GET    | `/movers?n=7`                | Top N gainers & losers                   |
| GET    | `/sectors`                   | Sector-level performance aggregation     |
| GET    | `/heatmap`                   | All stocks for heatmap rendering         |
| GET    | `/screener`                  | Filtered + sorted stock list             |
| GET    | `/providers`                 | Available AI provider catalogue          |
| POST   | `/ai/stream`                 | SSE streaming AI chat                    |
| POST   | `/ai/chat`                   | Non-streaming AI fallback                |
| GET    | `/ai/history/{id}`           | Fetch conversation thread                |
| POST   | `/refresh`                   | Trigger background data re-ingestion     |
| GET    | `/docs`                      | Swagger UI                               |

---

## Calculated Metrics

| Metric             | Formula / Description                                |
|--------------------|------------------------------------------------------|
| Daily Return       | `(close - open) / open × 100`                       |
| MA 7 / 20 / 50 / 200 | Simple rolling means                              |
| Bollinger Bands    | MA20 ± 2σ, plus %B position and bandwidth           |
| RSI-14             | Wilder's smoothed RS formula                         |
| MACD (12,26,9)     | EMA diff + signal + histogram                       |
| Stochastic (14,3)  | %K and %D oscillator                                |
| ATR-14             | True range rolling mean + normalised ATR %          |
| OBV                | Cumulative volume flow                              |
| VWAP               | 20-day rolling typical price × volume               |
| Momentum Score     | Composite [0–100]: 60% daily return + 40% vol Z-score |
| 52W Distance       | % from 52-week high and low                         |
| Annual Volatility  | σ(daily returns) × √252 × 100                      |
| Correlation        | Pearson r of daily returns between two stocks        |

---

## Local Development

### Prerequisites
- Python 3.12+
- Node.js 20+
- (Optional) Docker + Docker Compose

### Backend

```bash
cd backend

# Create virtual env
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# Install deps
pip install -r requirements.txt

# Start server (auto-ingests data on first run)
uvicorn app.main:app --reload --port 8000

# API docs at:  http://localhost:8000/docs
```

### Frontend

```bash
cd frontend

npm install

# Dev server with API proxy to localhost:8000
npm run dev

# Open:  http://localhost:3000
```

### Docker Compose (full stack)

```bash
# From repo root
cp .env.example .env          # fill in any API keys

docker-compose up --build

# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# Docs:     http://localhost:8000/docs
```

---

## Deploying to Railway

NEXUS deploys as **two separate Railway services** (backend + frontend) sharing a persistent volume for the SQLite database.

### Step 1 — Create the project

```bash
npm install -g @railway/cli
railway login
railway init   # create new project
```

### Step 2 — Deploy the backend

```bash
cd backend
railway up

# In Railway dashboard → backend service → Variables, add:
# DB_PATH=/data/nexus.db
# PORT=8000 (Railway sets this automatically)
# ANTHROPIC_API_KEY=...   (optional)
# OPENAI_API_KEY=...      (optional)
# OPENROUTER_API_KEY=...  (optional)

# Add a persistent Volume → mount at /data
```

### Step 3 — Deploy the frontend

```bash
cd ../frontend
railway up

# In Railway dashboard → frontend service → Variables, add:
# VITE_API_URL=https://<your-backend-service>.up.railway.app

# Trigger a redeploy after setting the env var (Vite bakes it in at build time)
```

### Step 4 — Custom domain (optional)

Both services automatically get a `*.up.railway.app` URL. Add a custom domain in the Railway dashboard.

---

## AI Features

The AI sidebar streams analyst commentary directly contextualised with the selected stock's live indicator data. Conversations are persisted to SQLite and resumable across sessions.

**Provider support:**

| Provider   | Model examples                        | Notes               |
|------------|---------------------------------------|---------------------|
| Ollama     | llama3, mistral, gemma2               | Free, runs locally  |
| Anthropic  | claude-sonnet-4-5, claude-haiku-4-5   | Needs API key       |
| OpenAI     | gpt-4o, gpt-4o-mini                   | Needs API key       |
| OpenRouter | 100+ models via single endpoint       | Needs API key       |

API keys can be set as server environment variables or entered per-session in the UI.

---

## Custom Metrics & Creativity

Beyond the assignment requirements:

- **Composite Momentum Score** [0–100] — blends daily return Z-score with volume Z-score, giving a normalised measure of price action intensity that works across price ranges
- **Normalised ATR %** — ATR as a percentage of price, enabling apples-to-apples volatility comparison between ₹200 and ₹11,000 stocks
- **Bollinger %B** — shows where price sits within the band, visualised as a gradient position slider in the info bar
- **52-week distance** — how far the current price is from the 52W high and low, surfaced as both a number and an interactive range bar
- **VWAP (20-day rolling)** — plotted as a dashed overlay on the main chart
- **Correlation matrix** via `/compare` endpoint — live Pearson r between any two NSE stocks

---

## Evaluation Checklist

| Category                  | What's implemented                                         |
|---------------------------|------------------------------------------------------------|
| Python & Data Handling    | pandas pipelines, yfinance, deterministic mock, WAL SQLite |
| API Design                | 12 REST endpoints, Swagger docs, proper HTTP status codes  |
| Creativity in Insights    | 5 custom metrics beyond the baseline requirements          |
| Visualization & UI        | Bloomberg-inspired terminal, 4 interactive chart types     |
| Documentation             | This README, inline code comments, .env.example            |
| Bonus — Deployment        | Railway-ready Dockerfiles + railway.toml for both services |
| Bonus — AI                | 4-provider streaming AI chat with conversation persistence  |
| Bonus — Docker            | Multi-stage Dockerfiles + Docker Compose dev stack         |

---

## Data Sources

- **Primary:** [yfinance](https://github.com/ranaroussi/yfinance) — pulls 2 years of NSE OHLCV data via Yahoo Finance API
- **Fallback:** Deterministic LCG-based mock generator — produces consistent, reproducible price series without internet access; same seed always yields the same history

---

## License

MIT — built for the Jarnox internship assignment.

---

## v0.2.0 Changelog

### Frontend

| # | Feature | Details |
|---|---------|---------|
| 1 | **Error Boundaries** | Every panel (`Chart`, `Heatmap`, `Screener`, `Sidebar`, `InfoBar`) wrapped in `ErrorBoundary`. A crash shows an inline card with Try Again — no more full-page black screen. |
| 2 | **Loading Overlay** | When switching stocks, a frosted blur overlay shows `"Loading TCS…"` instantly — no stale data flicker while the chart fetches. |
| 3 | **Watchlist** | Star button on every stock row. Starred stocks pin to the top. Persists across sessions via `localStorage`. Watchlist-only filter mode. |
| 4 | **Sparklines** | 10-bar SVG mini trend chart on every stock list row. Zero recharts — pure `<svg>` path for performance. Green/red matches trend direction. |
| 5 | **Intraday Chart (1D)** | New `1D` period with `5m / 15m / 30m` interval sub-selector. Uses `/quote/{symbol}` live yfinance bars. Time on X-axis, candle count shown in strip. |
| 6 | **News Feed** | Latest headlines in the Analysis tab via `/news/{symbol}`. Title, publisher, date, 2-line summary, clickable link. 15-min server-side cache. |
| 7 | **Keyboard Search** | `↑↓` to navigate results, `Enter` to select, `Escape` to close — standard UX. Hint shown in dropdown header. |
| 8 | **Compare Fix** | No longer fires on every mount. Shows empty state prompt. User clicks **Compare** explicitly. Re-runs on period change only after first run. |
| 9 | **Screener Fix** | Auto-runs on first mount with empty filters. Results persist when navigating away and back. |
| 10 | **CSV Export** | Screener results download as `nexus-screener-YYYY-MM-DD.csv` with one click. |
| 11 | **Real-time Polling** | Prices refresh every 60 seconds. "Updated 42s ago" indicator in TopBar. Manual refresh button. `localStorage` cache invalidated on each poll. |
| 12 | **URL State Sync** | Active symbol + tab encoded in URL hash (`#/chart/TCS`). Bookmarkable, shareable, survives refresh. |
| 13 | **PWA** | `manifest.json` + service worker. App installs via "Add to Home Screen" on mobile. Shell cached offline. API calls never cached. |

### Backend

| Endpoint | Description |
|----------|-------------|
| `GET /quote/{symbol}?interval=5m` | Live intraday OHLCV bars (5m/15m/30m). 3-min cache. |
| `GET /news/{symbol}` | Up to 6 recent headlines from yfinance. 15-min cache. |
| `GET /companies` | Now includes `spark: float[]` — last 10 closes for sparklines. |
| `POST /refresh` | Rate-limited to once per 30 minutes (returns 429 if too soon). |

