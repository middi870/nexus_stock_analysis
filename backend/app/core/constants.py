"""
NEXUS — Full Nifty 50 company master.
50 NSE large-caps across all major sectors.
"""

COMPANIES: dict = {
    # ── IT (5) ────────────────────────────────────────────────────────────────
    "TCS":        {"name":"Tata Consultancy Svcs",  "sector":"IT",         "yf":"TCS.NS",        "base":3900,  "vol":.016,"seed":2,  "pe":30.1,"pb":13.2,"div":1.80,"cap":14.1},
    "INFY":       {"name":"Infosys",                "sector":"IT",         "yf":"INFY.NS",       "base":1720,  "vol":.020,"seed":3,  "pe":24.7,"pb":8.4, "div":2.10,"cap":7.2},
    "WIPRO":      {"name":"Wipro",                  "sector":"IT",         "yf":"WIPRO.NS",      "base":480,   "vol":.022,"seed":5,  "pe":20.3,"pb":3.9, "div":0.20,"cap":2.5},
    "HCLTECH":    {"name":"HCL Technologies",       "sector":"IT",         "yf":"HCLTECH.NS",    "base":1650,  "vol":.019,"seed":21, "pe":26.4,"pb":7.2, "div":3.00,"cap":4.5},
    "TECHM":      {"name":"Tech Mahindra",          "sector":"IT",         "yf":"TECHM.NS",      "base":1380,  "vol":.023,"seed":22, "pe":28.1,"pb":4.1, "div":0.60,"cap":1.4},

    # ── Banking (8) ───────────────────────────────────────────────────────────
    "HDFCBANK":   {"name":"HDFC Bank",              "sector":"Banking",    "yf":"HDFCBANK.NS",   "base":1680,  "vol":.017,"seed":4,  "pe":19.2,"pb":2.8, "div":1.20,"cap":12.8},
    "SBIN":       {"name":"State Bank of India",    "sector":"Banking",    "yf":"SBIN.NS",       "base":790,   "vol":.020,"seed":8,  "pe":10.1,"pb":1.5, "div":1.80,"cap":7.1},
    "AXISBANK":   {"name":"Axis Bank",              "sector":"Banking",    "yf":"AXISBANK.NS",   "base":1050,  "vol":.021,"seed":13, "pe":14.6,"pb":2.1, "div":0.10,"cap":3.2},
    "KOTAKBANK":  {"name":"Kotak Mahindra Bank",    "sector":"Banking",    "yf":"KOTAKBANK.NS",  "base":1780,  "vol":.018,"seed":14, "pe":22.3,"pb":3.4, "div":0.10,"cap":3.5},
    "INDUSINDBK": {"name":"IndusInd Bank",          "sector":"Banking",    "yf":"INDUSINDBK.NS", "base":1420,  "vol":.026,"seed":23, "pe":12.8,"pb":2.0, "div":1.30,"cap":1.1},
    "ICICIBANK":  {"name":"ICICI Bank",             "sector":"Banking",    "yf":"ICICIBANK.NS",  "base":1100,  "vol":.019,"seed":24, "pe":17.4,"pb":3.1, "div":0.80,"cap":7.7},
    "BANDHANBNK": {"name":"Bandhan Bank",           "sector":"Banking",    "yf":"BANDHANBNK.NS", "base":205,   "vol":.030,"seed":41, "pe":10.2,"pb":1.6, "div":0.00,"cap":0.3},
    "FEDERALBNK": {"name":"Federal Bank",           "sector":"Banking",    "yf":"FEDERALBNK.NS", "base":185,   "vol":.024,"seed":42, "pe":9.4, "pb":1.3, "div":1.60,"cap":0.5},

    # ── Finance / NBFC (4) ────────────────────────────────────────────────────
    "BAJFINANCE": {"name":"Bajaj Finance",          "sector":"Finance",    "yf":"BAJFINANCE.NS", "base":6900,  "vol":.021,"seed":9,  "pe":32.7,"pb":6.8, "div":0.30,"cap":4.3},
    "BAJAJFINSV": {"name":"Bajaj Finserv",          "sector":"Finance",    "yf":"BAJAJFINSV.NS", "base":1650,  "vol":.020,"seed":25, "pe":28.3,"pb":3.9, "div":0.10,"cap":2.6},
    "SBILIFE":    {"name":"SBI Life Insurance",     "sector":"Finance",    "yf":"SBILIFE.NS",    "base":1450,  "vol":.017,"seed":26, "pe":65.0,"pb":9.8, "div":0.00,"cap":1.5},
    "HDFCLIFE":   {"name":"HDFC Life Insurance",    "sector":"Finance",    "yf":"HDFCLIFE.NS",   "base":640,   "vol":.018,"seed":43, "pe":78.0,"pb":10.2,"div":0.20,"cap":1.4},

    # ── Energy / Oil & Gas (4) ────────────────────────────────────────────────
    "RELIANCE":   {"name":"Reliance Industries",    "sector":"Energy",     "yf":"RELIANCE.NS",   "base":2850,  "vol":.018,"seed":1,  "pe":28.4,"pb":2.1, "div":0.40,"cap":19.3},
    "ONGC":       {"name":"ONGC",                   "sector":"Energy",     "yf":"ONGC.NS",       "base":265,   "vol":.022,"seed":18, "pe":7.4, "pb":1.1, "div":5.20,"cap":3.3},
    "BPCL":       {"name":"BPCL",                   "sector":"Energy",     "yf":"BPCL.NS",       "base":640,   "vol":.025,"seed":27, "pe":9.8, "pb":1.8, "div":4.50,"cap":1.4},
    "IOC":        {"name":"Indian Oil Corp",        "sector":"Energy",     "yf":"IOC.NS",        "base":165,   "vol":.023,"seed":44, "pe":6.2, "pb":0.9, "div":7.20,"cap":2.3},

    # ── FMCG (4) ─────────────────────────────────────────────────────────────
    "ITC":        {"name":"ITC Limited",            "sector":"FMCG",       "yf":"ITC.NS",        "base":448,   "vol":.014,"seed":6,  "pe":26.8,"pb":7.1, "div":3.40,"cap":5.6},
    "HINDUNILVR": {"name":"Hindustan Unilever",     "sector":"FMCG",       "yf":"HINDUNILVR.NS", "base":2340,  "vol":.013,"seed":10, "pe":56.2,"pb":11.4,"div":1.60,"cap":5.5},
    "NESTLEIND":  {"name":"Nestle India",           "sector":"FMCG",       "yf":"NESTLEIND.NS",  "base":2450,  "vol":.014,"seed":28, "pe":72.4,"pb":92.0,"div":1.20,"cap":2.4},
    "BRITANNIA":  {"name":"Britannia Industries",   "sector":"FMCG",       "yf":"BRITANNIA.NS",  "base":5200,  "vol":.016,"seed":45, "pe":52.0,"pb":29.0,"div":1.60,"cap":1.3},

    # ── Auto (5) ──────────────────────────────────────────────────────────────
    "TATAMOTORS": {"name":"Tata Motors",            "sector":"Auto",       "yf":"TATAMOTORS.NS", "base":870,   "vol":.025,"seed":7,  "pe":12.4,"pb":3.2, "div":0.00,"cap":3.2},
    "MARUTI":     {"name":"Maruti Suzuki",          "sector":"Auto",       "yf":"MARUTI.NS",     "base":11200, "vol":.019,"seed":15, "pe":28.6,"pb":4.9, "div":0.40,"cap":3.4},
    "M&M":        {"name":"Mahindra & Mahindra",    "sector":"Auto",       "yf":"M&M.NS",        "base":2100,  "vol":.022,"seed":29, "pe":27.0,"pb":5.2, "div":0.90,"cap":2.6},
    "BAJAJ-AUTO": {"name":"Bajaj Auto",             "sector":"Auto",       "yf":"BAJAJ-AUTO.NS", "base":8900,  "vol":.018,"seed":30, "pe":28.0,"pb":8.6, "div":2.00,"cap":2.6},
    "EICHERMOT":  {"name":"Eicher Motors",          "sector":"Auto",       "yf":"EICHERMOT.NS",  "base":4600,  "vol":.020,"seed":46, "pe":30.2,"pb":8.1, "div":0.80,"cap":1.3},

    # ── Pharma (4) ────────────────────────────────────────────────────────────
    "SUNPHARMA":  {"name":"Sun Pharmaceutical",     "sector":"Pharma",     "yf":"SUNPHARMA.NS",  "base":1620,  "vol":.019,"seed":11, "pe":38.4,"pb":6.3, "div":0.40,"cap":3.9},
    "DRREDDY":    {"name":"Dr Reddy's Labs",        "sector":"Pharma",     "yf":"DRREDDY.NS",    "base":5800,  "vol":.018,"seed":31, "pe":19.4,"pb":4.2, "div":0.80,"cap":1.0},
    "CIPLA":      {"name":"Cipla",                  "sector":"Pharma",     "yf":"CIPLA.NS",      "base":1480,  "vol":.019,"seed":32, "pe":26.8,"pb":4.8, "div":0.50,"cap":1.2},
    "DIVISLAB":   {"name":"Divi's Laboratories",    "sector":"Pharma",     "yf":"DIVISLAB.NS",   "base":4800,  "vol":.021,"seed":47, "pe":60.0,"pb":9.4, "div":0.70,"cap":1.3},

    # ── Infra & Conglomerate (5) ──────────────────────────────────────────────
    "LT":         {"name":"Larsen & Toubro",        "sector":"Infra",      "yf":"LT.NS",         "base":3450,  "vol":.020,"seed":16, "pe":32.1,"pb":4.8, "div":1.10,"cap":4.7},
    "ADANIENT":   {"name":"Adani Enterprises",      "sector":"Conglomerate","yf":"ADANIENT.NS",  "base":2420,  "vol":.030,"seed":12, "pe":88.1,"pb":5.2, "div":0.00,"cap":2.8},
    "ADANIPORTS": {"name":"Adani Ports & SEZ",      "sector":"Infra",      "yf":"ADANIPORTS.NS", "base":1380,  "vol":.025,"seed":33, "pe":24.6,"pb":4.4, "div":0.60,"cap":3.0},
    "GRASIM":     {"name":"Grasim Industries",      "sector":"Conglomerate","yf":"GRASIM.NS",    "base":2600,  "vol":.022,"seed":34, "pe":23.0,"pb":2.2, "div":0.40,"cap":1.7},
    "TATASTEEL":  {"name":"Tata Steel",             "sector":"Materials",   "yf":"TATASTEEL.NS", "base":170,   "vol":.028,"seed":35, "pe":14.0,"pb":1.9, "div":1.80,"cap":2.1},

    # ── Materials & Cement (3) ────────────────────────────────────────────────
    "ULTRACEMCO": {"name":"UltraTech Cement",       "sector":"Materials",   "yf":"ULTRACEMCO.NS","base":10800, "vol":.021,"seed":17, "pe":45.3,"pb":6.2, "div":0.40,"cap":3.1},
    "HINDALCO":   {"name":"Hindalco Industries",    "sector":"Materials",   "yf":"HINDALCO.NS",  "base":720,   "vol":.025,"seed":36, "pe":13.0,"pb":1.8, "div":1.40,"cap":1.6},
    "JSWSTEEL":   {"name":"JSW Steel",              "sector":"Materials",   "yf":"JSWSTEEL.NS",  "base":880,   "vol":.026,"seed":48, "pe":16.0,"pb":2.8, "div":1.70,"cap":2.1},

    # ── Utilities (3) ─────────────────────────────────────────────────────────
    "POWERGRID":  {"name":"Power Grid Corp",        "sector":"Utilities",   "yf":"POWERGRID.NS", "base":310,   "vol":.016,"seed":19, "pe":18.2,"pb":2.8, "div":4.10,"cap":2.9},
    "NTPC":       {"name":"NTPC Limited",           "sector":"Utilities",   "yf":"NTPC.NS",      "base":360,   "vol":.018,"seed":20, "pe":16.8,"pb":2.2, "div":3.80,"cap":3.5},
    "TATAPOWER":  {"name":"Tata Power Company",     "sector":"Utilities",   "yf":"TATAPOWER.NS", "base":420,   "vol":.024,"seed":37, "pe":28.0,"pb":4.0, "div":0.50,"cap":1.3},

    # ── Telecom & Media (2) ───────────────────────────────────────────────────
    "BHARTIARTL": {"name":"Bharti Airtel",          "sector":"Telecom",     "yf":"BHARTIARTL.NS","base":1700,  "vol":.020,"seed":38, "pe":95.0,"pb":7.6, "div":0.30,"cap":10.2},
    "JIO":        {"name":"Jio Financial Services", "sector":"Finance",     "yf":"JIOFIN.NS",    "base":320,   "vol":.028,"seed":49, "pe":40.0,"pb":2.0, "div":0.00,"cap":2.0},

    # ── Consumer & Retail (3) ─────────────────────────────────────────────────
    "TITAN":      {"name":"Titan Company",          "sector":"Consumer",    "yf":"TITAN.NS",     "base":3600,  "vol":.019,"seed":39, "pe":85.0,"pb":22.0,"div":0.30,"cap":3.2},
    "ASIANPAINT": {"name":"Asian Paints",           "sector":"Consumer",    "yf":"ASIANPAINT.NS","base":2900,  "vol":.016,"seed":40, "pe":50.0,"pb":16.0,"div":0.80,"cap":2.8},
    "DMART":      {"name":"Avenue Supermarts",      "sector":"Consumer",    "yf":"DMART.NS",     "base":4600,  "vol":.018,"seed":50, "pe":98.0,"pb":16.8,"div":0.00,"cap":3.0},
}

SECTORS: list[str] = sorted({v["sector"] for v in COMPANIES.values()})
