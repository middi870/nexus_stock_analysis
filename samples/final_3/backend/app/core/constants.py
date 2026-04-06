"""
NEXUS — Company master with NSE symbols, metadata, and simulation seeds.
yfinance tickers follow the .NS suffix convention.
"""

COMPANIES: dict = {
    "RELIANCE":   {"name": "Reliance Industries",    "sector": "Energy",        "yf": "RELIANCE.NS",   "base": 2850,  "vol": .018, "seed": 1,  "pe": 28.4, "pb": 2.1,  "div": 0.40, "cap": 19.3},
    "TCS":        {"name": "Tata Consultancy Svcs",  "sector": "IT",            "yf": "TCS.NS",        "base": 3900,  "vol": .016, "seed": 2,  "pe": 30.1, "pb": 13.2, "div": 1.80, "cap": 14.1},
    "INFY":       {"name": "Infosys",                "sector": "IT",            "yf": "INFY.NS",       "base": 1720,  "vol": .020, "seed": 3,  "pe": 24.7, "pb": 8.4,  "div": 2.10, "cap":  7.2},
    "HDFCBANK":   {"name": "HDFC Bank",              "sector": "Banking",       "yf": "HDFCBANK.NS",   "base": 1680,  "vol": .017, "seed": 4,  "pe": 19.2, "pb": 2.8,  "div": 1.20, "cap": 12.8},
    "WIPRO":      {"name": "Wipro",                  "sector": "IT",            "yf": "WIPRO.NS",      "base": 480,   "vol": .022, "seed": 5,  "pe": 20.3, "pb": 3.9,  "div": 0.20, "cap":  2.5},
    "ITC":        {"name": "ITC Limited",            "sector": "FMCG",         "yf": "ITC.NS",        "base": 448,   "vol": .014, "seed": 6,  "pe": 26.8, "pb": 7.1,  "div": 3.40, "cap":  5.6},
    "TATAMOTORS": {"name": "Tata Motors",            "sector": "Auto",          "yf": "TATAMOTORS.NS", "base": 870,   "vol": .025, "seed": 7,  "pe": 12.4, "pb": 3.2,  "div": 0.00, "cap":  3.2},
    "SBIN":       {"name": "State Bank of India",    "sector": "Banking",       "yf": "SBIN.NS",       "base": 790,   "vol": .020, "seed": 8,  "pe": 10.1, "pb": 1.5,  "div": 1.80, "cap":  7.1},
    "BAJFINANCE": {"name": "Bajaj Finance",          "sector": "Finance",       "yf": "BAJFINANCE.NS", "base": 6900,  "vol": .021, "seed": 9,  "pe": 32.7, "pb": 6.8,  "div": 0.30, "cap":  4.3},
    "HINDUNILVR": {"name": "Hindustan Unilever",     "sector": "FMCG",         "yf": "HINDUNILVR.NS", "base": 2340,  "vol": .013, "seed": 10, "pe": 56.2, "pb": 11.4, "div": 1.60, "cap":  5.5},
    "SUNPHARMA":  {"name": "Sun Pharmaceutical",     "sector": "Pharma",        "yf": "SUNPHARMA.NS",  "base": 1620,  "vol": .019, "seed": 11, "pe": 38.4, "pb": 6.3,  "div": 0.40, "cap":  3.9},
    "ADANIENT":   {"name": "Adani Enterprises",      "sector": "Conglomerate",  "yf": "ADANIENT.NS",   "base": 2420,  "vol": .030, "seed": 12, "pe": 88.1, "pb": 5.2,  "div": 0.00, "cap":  2.8},
    "AXISBANK":   {"name": "Axis Bank",              "sector": "Banking",       "yf": "AXISBANK.NS",   "base": 1050,  "vol": .021, "seed": 13, "pe": 14.6, "pb": 2.1,  "div": 0.10, "cap":  3.2},
    "KOTAKBANK":  {"name": "Kotak Mahindra Bank",    "sector": "Banking",       "yf": "KOTAKBANK.NS",  "base": 1780,  "vol": .018, "seed": 14, "pe": 22.3, "pb": 3.4,  "div": 0.10, "cap":  3.5},
    "MARUTI":     {"name": "Maruti Suzuki",          "sector": "Auto",          "yf": "MARUTI.NS",     "base": 11200, "vol": .019, "seed": 15, "pe": 28.6, "pb": 4.9,  "div": 0.40, "cap":  3.4},
    "LT":         {"name": "Larsen & Toubro",        "sector": "Infra",         "yf": "LT.NS",         "base": 3450,  "vol": .020, "seed": 16, "pe": 32.1, "pb": 4.8,  "div": 1.10, "cap":  4.7},
    "ULTRACEMCO": {"name": "UltraTech Cement",       "sector": "Materials",     "yf": "ULTRACEMCO.NS", "base": 10800, "vol": .021, "seed": 17, "pe": 45.3, "pb": 6.2,  "div": 0.40, "cap":  3.1},
    "ONGC":       {"name": "ONGC",                   "sector": "Energy",        "yf": "ONGC.NS",       "base": 265,   "vol": .022, "seed": 18, "pe":  7.4, "pb": 1.1,  "div": 5.20, "cap":  3.3},
    "POWERGRID":  {"name": "Power Grid Corp",        "sector": "Utilities",     "yf": "POWERGRID.NS",  "base": 310,   "vol": .016, "seed": 19, "pe": 18.2, "pb": 2.8,  "div": 4.10, "cap":  2.9},
    "NTPC":       {"name": "NTPC Limited",           "sector": "Utilities",     "yf": "NTPC.NS",       "base": 360,   "vol": .018, "seed": 20, "pe": 16.8, "pb": 2.2,  "div": 3.80, "cap":  3.5},
}

SECTORS: list[str] = sorted({v["sector"] for v in COMPANIES.values()})
