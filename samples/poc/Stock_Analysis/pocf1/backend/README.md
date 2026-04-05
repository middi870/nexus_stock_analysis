# 🚀 AI-Powered Stock Analysis Backend

A production-ready **FastAPI backend** that combines **real-time stock data**, **technical indicators**, and **AI-powered insights (streaming)** using local and cloud LLMs.

---

## 🧠 Overview

This backend acts as a **Trading Dashboard + AI Analyst Engine**:

* 📊 Fetches and processes stock market data
* 📈 Computes technical indicators (RSI, MACD, MA)
* 🤖 Streams AI-generated insights (like ChatGPT)
* 💾 Stores conversation history (multi-turn chat)
* ⚡ Uses Redis for caching
* 🔐 Supports **Bring Your Own API Key (BYOK)** securely

---

## ⚙️ Tech Stack

* **FastAPI** — API framework
* **PostgreSQL** — persistent storage
* **Redis** — caching layer
* **SQLAlchemy (Async)** — ORM
* **httpx** — async HTTP client
* **Ollama** — local LLM (optional)
* **OpenAI / OpenRouter** — cloud LLMs

---

## 📂 Project Structure

```
app/
 ├── api/
 │   └── routes/
 │       ├── ai.py
 │       ├── stocks.py
 │       ├── screener.py
 │       └── market.py
 │
 ├── services/
 │   ├── ai_service.py
 │   ├── stock_service.py
 │   ├── analytics_service.py
 │   └── cache_service.py
 │
 ├── db/
 │   ├── models.py
 │   └── session.py
 │
 └── main.py
```

---

## 📊 Features

### ✅ Stock Data Engine

* Fetches stock data using `yfinance`
* Stores in PostgreSQL
* Computes:

  * RSI
  * MACD
  * Moving Averages (MA20, MA50)

---

### 📈 Market Insights

* Top gainers / losers
* Sector-based aggregation
* Screener filters:

  * RSI
  * price
  * sector
  * volatility

---

### 🤖 AI Engine (Core Feature)

#### 🔥 Streaming AI Responses

* Real-time token streaming
* Uses:

  * Ollama (local)
  * OpenAI
  * OpenRouter

#### 🧠 Context-Aware

* Loads last conversations from DB
* Supports multi-turn chat

#### 💬 Example Use Case

> “Why is TCS rising?”

---

### 💾 Conversation Memory

Stored in PostgreSQL:

```
AIConversation
- conversation_id (thread)
- prompt
- response
- timestamp
```

---

### ⚡ Redis Caching

* Caches AI responses
* Reduces cost + latency

---

### 🔐 Secure API Key Handling (BYOK)

* Accepts API key via header:

```
Authorization: Bearer sk-xxxx
```

* ✅ Not stored
* ✅ Not logged
* ✅ Used per request only

---

## 🌐 API Endpoints

---

### 🟢 Health

```
GET /
```

---

### 📊 Stocks

```
GET /stocks/{symbol}
```

Returns latest stock + indicators.

---

### 📈 Market Movers

```
GET /market/movers
```

Top gainers and losers.

---

### 🔍 Screener

```
GET /screener/?min_rsi=60
```

Filter stocks dynamically.

---

### 🤖 AI Streaming (Main Feature)

```
GET /ai/stream/{symbol}
```

#### Query Params:

* `conversation_id` → chat thread
* `provider` → ollama | openai | openrouter

#### Headers:

```
Authorization: Bearer <API_KEY>
```

---

## ⚡ Streaming Format

Response uses **Server-Sent Events (SSE)**:

```
data: The stock is showing...
data: bearish momentum...
data: due to RSI...
```

---

## 🧠 AI Flow

```
Frontend
   ↓
API Request
   ↓
Load Stock Data
   ↓
Load Conversation History
   ↓
Send to LLM
   ↓
Stream Response
   ↓
Save to DB
```

---

## 🐳 Docker Setup

### Run locally:

```
docker compose up --build
```

Services:

* API → port 8000
* PostgreSQL → port 6000
* Redis → port 6379

---

## 🧪 Testing

Open:

```
http://localhost:8000/docs
```

---

## 🔐 Security Notes

* API keys are **never persisted**
* Use HTTPS in production
* Avoid logging sensitive data

---

## 🚀 Deployment Plan

### Backend:

* Railway / Render

### Database:

* Managed PostgreSQL (Railway)

### Cache:

* Managed Redis

### AI:

* Ollama (local) OR cloud APIs

---

## ⚠️ Limitations

* Ollama requires local or GPU server
* Free hosting may not support heavy models

---

## 🔮 Future Improvements

* 📊 Real-time WebSocket updates
* 📈 Advanced charting
* 🧠 AI summarization + alerts
* 🔔 Notification system
* 🧾 Portfolio tracking

---

## 🎯 Vision

Build a platform like:

```
TradingView + ChatGPT for Stocks
```

---

## 👨‍💻 Author

Built as a full-stack AI + FinTech system.

---

## ⭐ If you like this project

Give it a star on GitHub ⭐

# stock_analysis
