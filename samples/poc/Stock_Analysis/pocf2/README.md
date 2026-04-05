# PULSE v2 — Market Intelligence Terminal

A professional-grade NSE stock analysis platform with:
- **Real candlestick charts** rendered in pure SVG
- **8 technical indicators**: MA, BB, RSI, MACD, Stochastic, ATR, OBV, Momentum
- **Stock screener** with 8 filter dimensions
- **Interactive heatmap** (all stocks + by sector)
- **Compare panel** with normalised dual-chart + correlation
- **AI Analyst sidebar** with **real-time SSE streaming** — Ollama (local), Anthropic, OpenAI, OpenRouter
- **Smart API layer**: request deduplication, stale-while-revalidate cache, retry with backoff
- **Keyboard shortcuts**: j/k navigate, 1-5 period, w watchlist, c/f/h tabs

---

## 🚀 Quick Start

### Prerequisites
- Docker + Docker Compose
- **Ollama running locally** on port 11434 with llama3 pulled:
  ```bash
  ollama pull llama3
  ```

### Launch
```bash
cp .env.example .env          # optional: add cloud API keys
docker-compose up --build

# Frontend → http://localhost:3000
# Backend  → http://localhost:8000
# Swagger  → http://localhost:8000/docs
```

The backend reaches your local Ollama via `host.docker.internal:11434` (automatically configured).

---

## 🛠 Local Dev (No Docker)

```bash
# Terminal 1 — Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export OLLAMA_BASE_URL=http://localhost:11434
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev     # → http://localhost:3000
```

---

## 🏗 Architecture

```
pulse2/
├── backend/
│   ├── main.py           # FastAPI — all endpoints + SSE streaming
│   ├── data_fetcher.py   # yfinance + seeded mock fallback, 20 NSE stocks
│   ├── ai_providers.py   # Unified LLM: Ollama/Anthropic/OpenAI/OpenRouter
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api.js              # Cached, deduped, retry-enabled fetch layer + SSE
│   │   ├── context/AppContext.jsx  # Global state + keyboard shortcuts + auto-refresh
│   │   └── components/
│   │       ├── TopBar.jsx      # Ticker tape + live index strip + nav
│   │       ├── Watchlist.jsx   # Left sidebar: breadth + sector + watchlist
│   │       ├── CandleChart.jsx # Pure SVG candlestick engine
│   │       ├── MainChart.jsx   # Full chart panel: candle/area/line + 6 sub-indicators
│   │       ├── Screener.jsx    # 8-filter stock screener
│   │       ├── Heatmap.jsx     # Color-coded heatmap (all + sector views)
│   │       ├── Compare.jsx     # Normalised dual comparison
│   │       ├── StockInfoBar.jsx # Right panel: live KPIs + indicators + 52W range
│   │       └── AISidebar.jsx   # AI chat with SSE streaming + multi-provider
│   ├── Dockerfile
│   └── nginx.conf          # SSE-aware proxy config
└── docker-compose.yml      # No Ollama container — uses host Ollama
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j` / `↓` | Next stock |
| `k` / `↑` | Previous stock |
| `1`–`5` | Switch period (1W/1M/3M/6M/1Y) |
| `w` | Toggle watchlist |
| `c` | Chart tab |
| `f` | Screener tab |
| `h` | Heatmap tab |

---

## 🔌 API Endpoints

| | Endpoint | |
|---|---|---|
| GET | `/companies` | 20 stocks with price, change, fundamentals |
| GET | `/data/{sym}?days=N` | OHLCV + MA/BB/RSI/MACD/Stoch/ATR/OBV/Momentum |
| GET | `/summary/{sym}` | Full 52W stats + all indicators |
| GET | `/compare?symbol1=X&symbol2=Y&days=N` | Normalised perf + correlation |
| GET | `/movers?n=7` | Top gainers/losers |
| GET | `/sectors` | Per-sector avg change + stocks |
| GET | `/screener` | Multi-filter screener |
| GET | `/heatmap` | All stocks with change_pct |
| GET | `/providers` | Available AI providers |
| POST | `/ai/chat` | Non-streaming AI (fallback) |
| POST | `/ai/stream` | **SSE streaming AI** (primary) |
| POST | `/refresh` | Background data re-fetch |

---

## 🤖 AI Providers

| Provider | Notes |
|----------|-------|
| **Ollama** | Default. Runs on your host `localhost:11434`. Free. |
| Anthropic | Set `ANTHROPIC_API_KEY` or enter in sidebar |
| OpenAI | Set `OPENAI_API_KEY` or enter in sidebar |
| OpenRouter | Set `OPENROUTER_API_KEY` or enter in sidebar |

Switching providers: open the ⚙ tab in the AI sidebar.

---

## 📊 Indicators

| Indicator | Detail |
|-----------|--------|
| MA 7/20/50 | Simple moving averages |
| Bollinger Bands | 20-period MA ± 2σ |
| RSI (14) | Wilder smoothed |
| MACD (12,26,9) | EMA difference + signal + histogram |
| Stochastic (14,3) | %K and %D |
| ATR (14) | Average True Range |
| OBV | On-Balance Volume |
| Momentum | 0–100 composite: price return + volume z-score |
