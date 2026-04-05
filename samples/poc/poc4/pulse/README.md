# 📈 PULSE — Market Intelligence Terminal

A professional-grade stock analysis platform with real NSE data, rich interactive charts, and an AI analyst sidebar powered by **Ollama (llama3)** — switchable to Anthropic, OpenAI, or OpenRouter at runtime.

> **View & Analyse only** — this is a read-only terminal. No trading or order placement.

---

## 🚀 Quick Start (Docker)

```bash
# 1. Clone and configure
cp .env.example .env          # Add cloud API keys if desired (optional)

# 2. Launch everything
docker-compose up --build

# Services:
#   Frontend  →  http://localhost:3000
#   Backend   →  http://localhost:8000
#   Swagger   →  http://localhost:8000/docs
#   Ollama    →  http://localhost:11434
```

**First run** downloads the `llama3` model (~4 GB). Subsequent starts use the cached model. Stock data fetches from yfinance on startup; falls back to deterministic mock data if the network is blocked.

---

## 🛠 Local Dev (No Docker)

```bash
# Terminal 1 — Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export OLLAMA_BASE_URL=http://localhost:11434   # if Ollama is local
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev        # → http://localhost:3000
```

---

## 🏗 Architecture

```
pulse/
├── backend/
│   ├── main.py           # FastAPI — all REST endpoints
│   ├── data_fetcher.py   # NSE data via yfinance + seeded mock fallback
│   ├── ai_providers.py   # Unified LLM abstraction (Ollama/Anthropic/OpenAI/OpenRouter)
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js                      # All API calls + formatters
│   │   ├── context/AppContext.jsx      # Global state
│   │   └── components/
│   │       ├── TapeBar.jsx             # Scrolling market ticker
│   │       ├── TopBar.jsx              # Header with indices + search
│   │       ├── Watchlist.jsx           # Left sidebar: watchlist + sectors
│   │       ├── ChartArea.jsx           # Main chart panel + sub-tabs
│   │       ├── StockStats.jsx          # Fundamentals + risk metrics
│   │       └── AISidebar.jsx           # Right AI chat panel
│   ├── Dockerfile
│   └── nginx.conf
└── docker-compose.yml
```

---

## 🔌 REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/companies` | All 20 stocks with price, change, P/E, P/B, div yield, market cap |
| GET | `/data/{sym}?days=90` | OHLCV + return, MA7/20/50, Bollinger Bands, RSI, Momentum |
| GET | `/summary/{sym}` | 52W stats, volatility, fundamentals |
| GET | `/compare?symbol1=TCS&symbol2=INFY&days=90` | Normalised perf + Pearson correlation |
| GET | `/movers?n=6` | Top N gainers & losers |
| GET | `/sectors` | Per-sector average daily change |
| GET | `/providers` | Available AI providers + models |
| POST | `/ai/chat` | LLM proxy (Ollama / Anthropic / OpenAI / OpenRouter) |
| POST | `/refresh` | Re-fetch all stock data in background |

---

## 🤖 AI Analyst

The collapsible right sidebar lets you:

| Feature | Detail |
|---------|--------|
| **Provider selector** | Ollama (local, free), Anthropic (Claude), OpenAI (GPT), OpenRouter |
| **Model selector** | Changes dynamically per provider |
| **API key input** | Per-session key input, or set via env var on backend |
| **Quick prompts** | 6 one-click analysis prompts |
| **Auto-context** | Every chat message is automatically injected with live stock data (price, RSI, 52W range, fundamentals) |
| **Conversation reset** | Clears automatically when you switch stocks |

**Switching providers** — open the ⚙ tab in the AI sidebar, select a provider and model, and optionally enter an API key.

---

## 📊 Technical Indicators

| Indicator | Calculation |
|-----------|-------------|
| MA7 / MA20 / MA50 | Simple rolling averages |
| Bollinger Bands | 20-period MA ± 2σ |
| RSI (14) | Wilder smoothed relative strength |
| Momentum Score | 0–100 composite: 60% normalised return + 40% volume z-score |

---

## 🗂 Covered Stocks (20 NSE)

RELIANCE · TCS · INFY · HDFCBANK · WIPRO · ITC · TATAMOTORS · SBIN · BAJFINANCE · HINDUNILVR · SUNPHARMA · ADANIENT · AXISBANK · KOTAKBANK · MARUTI · LT · ULTRACEMCO · ONGC · POWERGRID · NTPC

---

## ⚙️ GPU Acceleration (Ollama)

Uncomment the `deploy.resources` section in `docker-compose.yml` if you have the NVIDIA Container Toolkit installed:

```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: 1
          capabilities: [gpu]
```
