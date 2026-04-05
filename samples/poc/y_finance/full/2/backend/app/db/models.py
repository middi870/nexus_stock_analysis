from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, String, Float, Integer, Date

Base = declarative_base()

class Stock(Base):
    __tablename__ = "stocks"

    symbol = Column(String, primary_key=True)
    date = Column(Date, primary_key=True)

    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Integer)

    # indicators (we'll use later)
    rsi = Column(Float)
    macd = Column(Float)
    macd_signal = Column(Float)
    ma20 = Column(Float)
    ma50 = Column(Float)
