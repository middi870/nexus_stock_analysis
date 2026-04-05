import yfinance as yf
import pandas as pd

from app.services.analytics_service import compute_indicators
from app.db.models import Stock
from sqlalchemy.dialects.postgresql import insert


async def fetch_stock_data(symbol: str):
    ticker = yf.Ticker(symbol)
    df = ticker.history(period="6mo")

    if df.empty:
        return pd.DataFrame()  # ✅ fix

    df = df.reset_index()

    df = df.rename(columns={
        "Date": "date",
        "Open": "open",
        "High": "high",
        "Low": "low",
        "Close": "close",
        "Volume": "volume",
    })

    df["date"] = pd.to_datetime(df["date"]).dt.date

    # compute indicators
    df = compute_indicators(df)

    return df


async def store_stock_data(db, symbol: str, df: pd.DataFrame):
    rows = []

    for _, row in df.iterrows():
        rows.append({
            "symbol": symbol,
            "date": row["date"],
            "open": float(row["open"]),
            "high": float(row["high"]),
            "low": float(row["low"]),
            "close": float(row["close"]),
            "volume": int(row["volume"]),

            "rsi": float(row["rsi"]) if pd.notna(row["rsi"]) else None,
            "macd": float(row["macd"]) if pd.notna(row["macd"]) else None,
            "macd_signal": float(row["macd_signal"]) if pd.notna(row["macd_signal"]) else None,
            "ma20": float(row["ma20"]) if pd.notna(row["ma20"]) else None,
            "ma50": float(row["ma50"]) if pd.notna(row["ma50"]) else None,
        })

    if not rows:  # ✅ fix
        return

    stmt = insert(Stock).values(rows)

    stmt = stmt.on_conflict_do_update(
        index_elements=["symbol", "date"],
        set_={
            "open": stmt.excluded.open,
            "high": stmt.excluded.high,
            "low": stmt.excluded.low,
            "close": stmt.excluded.close,
            "volume": stmt.excluded.volume,
            "rsi": stmt.excluded.rsi,
            "macd": stmt.excluded.macd,
            "macd_signal": stmt.excluded.macd_signal,
            "ma20": stmt.excluded.ma20,
            "ma50": stmt.excluded.ma50,
        }
    )

    await db.execute(stmt)
    await db.commit()
