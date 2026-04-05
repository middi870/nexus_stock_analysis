# 📈 PULSE — Stock Data Intelligence Dashboard

A full-stack financial intelligence platform with a **React 18** frontend, **FastAPI** backend, real NSE stock data, and a built-in **AI Analyst** sidebar powered by Claude.

---

## 🏗 Architecture

```
stock-dashboard/
├── backend/
│   ├── main.py           # FastAPI — REST API + AI proxy endpoint
│   ├── data_fetcher.py   # yfinance data + mock fallback, SQLite storage
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js                  # API layer (all fetch calls)
│   │   ├── context/AppContext.jsx  # Global state
│   │   ├── components/
│   │   │   ├── TapeBar.jsx         # Scrolling price tape
│   │   │   ├── Header.jsx          # Nav bar + period selector
│   │   │   ├── LeftSidebar.jsx     # Company list + sparklines
│   │   │   ├── StockHeader.jsx     # Active stock KPIs
│   │   │   └── AISidebar.jsx       # ← AI Analyst chat panel
│   │   ├── panels/
│   │   │   ├── Overview.jsx        # Stats + 4 charts
│   │   │   ├── ChartPanel.jsx      # Full-width price chart
│   │   │   ├── Compare.jsx         # Side-by-side comparison
│   │   │   ├── Movers.jsx          # Top gainers/losers
│   │   │   └── Heatmap.jsx         # Market heatmap
│   │   └── styles/globals.css
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## ⚡ Quick Start — Local Dev

### 1. Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-your-key-here   # optional, for AI
uvicorn main:app --reload --port 8000
```
First run fetches ~1 year of NSE data. If yfinance is blocked, deterministic mock data loads automatically.

### 2. Frontend
```bash
cd frontend
npm install
npm run dev          # → http://localhost:3000
```
Vite proxies `/api/*` → `http://localhost:8000`.

---

## 🐳 Docker (One Command)

```bash
cp .env.example .env          # add your ANTHROPIC_API_KEY
docker-compose up --build
```
- Frontend → http://localhost:3000  
- Backend  → http://localhost:8000  
- Swagger  → http://localhost:8000/docs

---

## 🔌 REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/companies` | All 12 NSE stocks with latest price & daily Δ |
| GET | `/data/{symbol}?days=30` | OHLCV + daily return, MA7, MA20, momentum score |
| GET | `/summary/{symbol}` | 52W high/low, avg close, volatility, 1Y return |
| GET | `/compare?symbol1=TCS&symbol2=INFY&days=90` | Normalised perf + Pearson correlation |
| GET | `/top-movers?n=5` | Top N gainers & losers |
| POST | `/refresh` | Background data re-fetch |
| POST | `/ai/chat` | Proxy to Anthropic Claude API |

---

## 🤖 AI Analyst

The right sidebar lets you:
- **Select model** — Claude Opus 4, Sonnet 4, or Haiku 4  
- **Ask in natural language** — "Is this a good buy?", "Explain the momentum score", etc.  
- **Quick prompts** — one-click pre-built questions about the active stock  
- **API key** — enter in the sidebar UI, or set `ANTHROPIC_API_KEY` env var on the backend

The AI is automatically injected with live context: current price, 52W range, volatility, sector, and 1Y return for the stock you are viewing.

---

## 📊 Data Pipeline

| Step | Detail |
|------|--------|
| Source | yfinance (NSE `.NS` tickers), falls back to deterministic mock data |
| Storage | SQLite with `UNIQUE(symbol, date)` upsert |
| Cleaning | Drop NaN rows, forward-fill gaps, remove zero prices |
| Metrics | Daily return, MA7, MA20, annualised volatility, momentum score |

**Momentum Score (0–100)** — proprietary composite:  
`0.6 × normalised price return + 0.4 × volume z-score`, clipped to [0, 100].

---

## 🗂 Tracked Companies

RELIANCE · TCS · INFY · HDFCBANK · WIPRO · ITC · TATAMOTORS · SBIN · BAJFINANCE · HINDUNILVR · SUNPHARMA · ADANIENT

---

## 🎨 UI Features

| Feature | Detail |
|---------|--------|
| Live ticker tape | Scrolling price strip at top |
| Left sidebar | Company list grouped by sector, with mini sparklines |
| Overview tab | 4 stat cards + range bar + 4 interactive charts |
| Chart tab | Full-width area chart + volume |
| Compare tab | Normalised dual-stock chart + correlation |
| Movers tab | Gainers/losers with animated progress bars |
| Heatmap tab | Color-coded grid + sector bar chart |
| **AI sidebar** | Collapsible, model selector, quick prompts, chat history |

---

## 🚀 Deploying to Render

1. Push to GitHub
2. Create a **Web Service** → `backend/` → start cmd: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Set `ANTHROPIC_API_KEY` in Render env vars
4. Create a **Static Site** → `frontend/` → build: `npm run build` → publish: `dist/`
5. Set `VITE_API_URL` in frontend env to your Render backend URL
