import yfinance as yf
import matplotlib.pyplot as plt

data = yf.download("TCS.NS", period="1y")

data["MA50"] = data["Close"].rolling(50).mean()
data["MA200"] = data["Close"].rolling(200).mean()

data[["Close", "MA50", "MA200"]].plot(figsize=(10,5))

plt.savefig("chart.png")
plt.show()  # 👈 THIS LINE IS REQUIRED
