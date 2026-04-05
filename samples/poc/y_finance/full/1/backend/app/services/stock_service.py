import yfinance as yf
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import Stock


async def fetch_stock_data(symbol: str):
    ticker = yf.Ticker(symbol)
    df = ticker.history(period="6mo")

    if df.empty:
        return []

    df = df.reset_index()

    data = []
    for _, row in df.iterrows():
        data.append({
            "date": row["Date"].date(),
            "open": float(row["Open"]),
            "high": float(row["High"]),
            "low": float(row["Low"]),
            "close": float(row["Close"]),
            "volume": int(row["Volume"]),
        })

    return data


async def store_stock_data(
    db: AsyncSession,
    symbol: str,
    rows: list
):
    for r in rows:
        stock = Stock(
            symbol=symbol,
            date=r["date"],
            open=r["open"],
            high=r["high"],
            low=r["low"],
            close=r["close"],
            volume=r["volume"],
        )
        db.add(stock)

    await db.commit()
