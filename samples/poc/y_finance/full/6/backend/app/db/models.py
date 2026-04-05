from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, String, Float, Integer, Date, Text, DateTime
from datetime import datetime

Base = declarative_base()


# ─────────────────────────────────────────────
# 🧠 AI CONVERSATION (ChatGPT-like memory)
# ─────────────────────────────────────────────
class AIConversation(Base):
    __tablename__ = "ai_conversations"

    id = Column(Integer, primary_key=True, index=True)

    # 🔥 conversation thread (IMPORTANT)
    conversation_id = Column(String, index=True)

    symbol = Column(String)
    provider = Column(String)

    prompt = Column(Text)
    response = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)


# ─────────────────────────────────────────────
# 📊 STOCK DATA
# ─────────────────────────────────────────────
class Stock(Base):
    __tablename__ = "stocks"

    symbol = Column(String, primary_key=True)
    date = Column(Date, primary_key=True)

    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Integer)

    # indicators
    rsi = Column(Float)
    macd = Column(Float)
    macd_signal = Column(Float)
    ma20 = Column(Float)
    ma50 = Column(Float)
