import httpx
import json
import os

OLLAMA_URL = "http://host.docker.internal:11434"

TIMEOUT = httpx.Timeout(connect=10, read=600, write=30, pool=30)


# ─────────────────────────────────────────────
# PROMPT
# ─────────────────────────────────────────────
def build_prompt(symbol, data):
    return f"""
Explain why this stock is moving briefly.

Stock: {symbol}
Price: {data.get("close")}
RSI: {data.get("rsi")}
MACD: {data.get("macd")}
MA20: {data.get("ma20")}
MA50: {data.get("ma50")}
"""


# ─────────────────────────────────────────────
# MAIN STREAM FUNCTION (ALL PROVIDERS)
# ─────────────────────────────────────────────
async def stream_ai(symbol, data, provider="ollama", history=None):
    if history is None:
        history = []

    prompt = build_prompt(symbol, data)

    messages = history + [
        {"role": "user", "content": prompt}
    ]

    if provider == "ollama":
        async for chunk in stream_ollama(messages):
            yield chunk

    elif provider == "openai":
        async for chunk in stream_openai(messages):
            yield chunk

    elif provider == "openrouter":
        async for chunk in stream_openrouter(messages):
            yield chunk

    else:
        yield "Invalid provider"


# ─────────────────────────────────────────────
# OLLAMA STREAM
# ─────────────────────────────────────────────
async def stream_ollama(messages):
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        async with client.stream(
            "POST",
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": "llama3",
                "messages": messages,
                "stream": True
            }
        ) as res:
            res.raise_for_status() 

            async for line in res.aiter_lines():
                if not line:
                    continue

                try:
                    data = json.loads(line)

                    if "message" in data:
                        chunk = data["message"].get("content", "")
                        if chunk:
                            yield chunk

                except:
                    continue


# ─────────────────────────────────────────────
# OPENAI STREAM
# ─────────────────────────────────────────────
async def stream_openai(messages):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        yield "OpenAI key missing"
        return

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        async with client.stream(
            "POST",
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "gpt-4o-mini",
                "messages": messages,
                "stream": True
            }
        ) as res:
            res.raise_for_status() 
            async for line in res.aiter_lines():
                if line.startswith("data:") and "[DONE]" not in line:
                    try:
                        data = json.loads(line[5:].strip())
                        chunk = data["choices"][0]["delta"].get("content", "")
                        if chunk:
                            yield chunk
                    except:
                        continue


# ─────────────────────────────────────────────
# OPENROUTER STREAM
# ─────────────────────────────────────────────
async def stream_openrouter(messages):
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        yield "OpenRouter key missing"
        return

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        async with client.stream(
            "POST",
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "meta-llama/llama-3-8b-instruct",
                "messages": messages,
                "stream": True
            }
        ) as res:
            res.raise_for_status() 
            async for line in res.aiter_lines():
                if line.startswith("data:") and "[DONE]" not in line:
                    try:
                        data = json.loads(line[5:].strip())
                        chunk = data["choices"][0]["delta"].get("content", "")
                        if chunk:
                            yield chunk
                    except:
                        continue
