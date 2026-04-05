import os
import httpx

# ✅ Provider config
PROVIDER_DEFAULTS = {
    "ollama": {
        "base_url": "http://host.docker.internal:11434",
        "model": "llama3"
    },
    "openai": {
        "base_url": "https://api.openai.com",
        "model": "gpt-4o-mini"
    },
    "openrouter": {
        "base_url": "https://openrouter.ai/api",
        "model": "meta-llama/llama-3-8b-instruct"
    },
    "anthropic": {
        "base_url": "https://api.anthropic.com",
        "model": "claude-3.5-sonnet"
    }
}


def get_env_key(provider: str):
    return {
        "openai": "OPENAI_API_KEY",
        "openrouter": "OPENROUTER_API_KEY",
        "anthropic": "ANTHROPIC_API_KEY"
    }.get(provider, "")


# 🎯 MAIN FUNCTION
async def get_ai_insight(
    symbol: str,
    data: dict,
    provider: str = "ollama",
    model: str = None
):
    provider = provider.lower()
    config = PROVIDER_DEFAULTS.get(provider, {})

    base_url = config.get("base_url")
    model = model or config.get("model")
    api_key = os.getenv(get_env_key(provider), "")

    prompt = f"""
You are a stock analyst.

Explain in 3-4 lines why this stock might be moving.

Stock: {symbol}

Data:
- Price: {data.get("close")}
- RSI: {data.get("rsi")}
- MACD: {data.get("macd")}
- MACD Signal: {data.get("macd_signal")}
- MA20: {data.get("ma20")}
- MA50: {data.get("ma50")}

Focus on:
- Trend (above/below MA)
- Momentum (RSI)
- MACD crossover
"""

    messages = [
        {"role": "system", "content": "You are a helpful financial analyst."},
        {"role": "user", "content": prompt}
    ]

    # 🔥 ROUTING
    if provider == "ollama":
        return await _ollama(base_url, model, messages)

    if provider == "anthropic":
        return await _anthropic(base_url, model, messages, api_key)

    return await _openai_compatible(base_url, model, messages, api_key)


# ─────────────────────────────────────────────
# 🧠 PROVIDER IMPLEMENTATIONS
# ─────────────────────────────────────────────

async def _ollama(base_url, model, messages):
    async with httpx.AsyncClient(timeout=120) as client:
        res = await client.post(
            f"{base_url}/api/chat",
            json={
                "model": model,
                "messages": messages,
                "stream": False
            }
        )
        res.raise_for_status()
        return res.json()["message"]["content"]


async def _anthropic(base_url, model, messages, api_key):
    if not api_key:
        raise ValueError("Missing ANTHROPIC_API_KEY")

    async with httpx.AsyncClient(timeout=60) as client:
        res = await client.post(
            f"{base_url}/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            },
            json={
                "model": model,
                "max_tokens": 200,
                "messages": messages
            }
        )
        res.raise_for_status()
        return res.json()["content"][0]["text"]


async def _openai_compatible(base_url, model, messages, api_key):
    if not api_key:
        raise ValueError("Missing API key")

    async with httpx.AsyncClient(timeout=60) as client:
        res = await client.post(
            f"{base_url}/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": messages,
                "max_tokens": 150
            }
        )
        res.raise_for_status()
        return res.json()["choices"][0]["message"]["content"]
