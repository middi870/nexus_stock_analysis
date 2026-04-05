# 📈 StockPulse — Stock Data Intelligence Dashboard

A full-stack financial data platform featuring a **FastAPI** backend, **SQLite** database, and a polished **HTML/JS** dashboard — built for the Jarnox internship assignment.

---

## 🏗 Architecture

```
stock-dashboard/
├── backend/
│   ├── main.py          # FastAPI app + all REST endpoints
│   ├── data_fetcher.py  # yfinance data collection, cleaning, SQLite storage
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   └── index.html       # Single-file dashboard (Chart.js)
├── docker-compose.yml
└── README.md
```

---

## ⚡ Quick Start (Local)

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

- **First run** fetches ~1 year of data for 12 NSE stocks via `yfinance` — takes ~30 s.
- API available at: `http://localhost:8000`
- Swagger UI at:    `http://localhost:8000/docs`

### 2. Frontend

Open `frontend/index.html` directly in your browser (double-click), or serve with:

```bash
python -m http.server 3000 --directory frontend
```

Then visit `http://localhost:3000`.

---

## 🐳 Docker (Recommended)

```bash
docker-compose up --build
```

- Frontend → `http://localhost:3000`
- Backend  → `http://localhost:8000`
- Swagger  → `http://localhost:8000/docs`

---

## 🔌 REST API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/companies` | All tracked companies with latest price & daily change |
| `GET`  | `/data/{symbol}?days=30` | OHLCV + daily return, MA7, MA20, momentum score |
| `GET`  | `/summary/{symbol}` | 52-week high/low, avg close, volatility, total return |
| `GET`  | `/compare?symbol1=TCS&symbol2=INFY&days=90` | Normalised comparison + correlation |
| `GET`  | `/top-movers?n=5` | Top N gainers & losers |
| `POST` | `/refresh` | Trigger background data refresh |

### Example responses

**`GET /summary/TCS`**
```json
{
  "symbol": "TCS",
  "name": "Tata Consultancy Svcs",
  "week52_high": 4592.30,
  "week52_low":  3311.75,
  "avg_close":   3948.12,
  "total_return_pct": 12.4,
  "volatility_pct": 22.1,
  "avg_volume": 3812000
}
```

**`GET /compare?symbol1=TCS&symbol2=INFY&days=90`**
```json
{
  "symbol1": "TCS",
  "symbol2": "INFY",
  "correlation": 0.8721,
  "return1_pct": 8.3,
  "return2_pct": 5.1,
  "series": [...]
}
```

---

## 📊 Data Pipeline

**Collection** → `yfinance` fetches 1-year daily OHLCV for 12 NSE stocks  
**Cleaning**   → Drop NaN rows, forward-fill gaps, remove zero/negative prices  
**Storage**    → SQLite with `UNIQUE(symbol, date)` upsert — no duplicates  
**Metrics**    (computed per request, not stored):

| Metric | Formula |
|--------|---------|
| Daily Return | `(close − open) / open × 100` |
| MA7 / MA20 | Rolling mean over 7 / 20 sessions |
| Volatility | `std(daily_pct_change) × √252 × 100` |
| **Momentum Score** ⭐ | Composite 0–100: 60% normalised return + 40% volume z-score |
| Correlation | Pearson on daily pct-change series of two symbols |

> **Custom metric**: *Momentum Score* blends price momentum and volume surge into a single 0–100 indicator — high scores signal both strong price moves and elevated market interest.

---

## 🎨 Dashboard Features

- **Overview tab** — stat cards (close, 52W high/low, volatility) + 4 charts: price+MA, daily returns, volume, momentum
- **Chart tab** — full-width price chart with MA overlay
- **Compare tab** — pick any two stocks, choose period, see normalised chart + correlation + return delta
- **Movers tab** — top 5 gainers & losers; click any row to jump to that stock
- **Live ticker tape** — scrolling price bar at the bottom
- **Search filter** — filter the sidebar by symbol or name
- **Period selector** — 1M / 3M / 6M / 1Y

---

## 🗂 Tracked Companies

| Symbol | Name | Sector |
|--------|------|--------|
| RELIANCE | Reliance Industries | Energy |
| TCS | Tata Consultancy Svcs | IT |
| INFY | Infosys | IT |
| HDFCBANK | HDFC Bank | Banking |
| WIPRO | Wipro | IT |
| ITC | ITC Limited | FMCG |
| TATAMOTORS | Tata Motors | Auto |
| SBIN | State Bank of India | Banking |
| BAJFINANCE | Bajaj Finance | Finance |
| HINDUNILVR | Hindustan Unilever | FMCG |
| SUNPHARMA | Sun Pharma | Pharma |
| ADANIENT | Adani Enterprises | Conglomerate |

---

## 🚀 Deployment

Deploy the backend to [Render](https://render.com) (free tier):

1. Push repo to GitHub
2. Create a new **Web Service** on Render pointing to `backend/`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Update `API` constant in `frontend/index.html` to your Render URL
6. Deploy `frontend/` to GitHub Pages or Netlify (drag & drop)

---

## 🛠 Tech Stack

- **Backend**: Python 3.11, FastAPI, Uvicorn, SQLite
- **Data**: yfinance, Pandas, NumPy
- **Frontend**: Vanilla HTML/CSS/JS, Chart.js 4
- **Deployment**: Docker, Nginx, Render-ready
