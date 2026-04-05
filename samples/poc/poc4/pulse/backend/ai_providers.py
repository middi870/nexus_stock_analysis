"""
ai_providers.py — Unified LLM provider abstraction.
Supports: Ollama (local), Anthropic, OpenAI, OpenRouter.
"""
import os, httpx, json, logging
from typing import AsyncIterator

log = logging.getLogger(__name__)

PROVIDER_DEFAULTS = {
    "ollama":     {"base_url": "http://ollama:11434", "model": "llama3"},
    "anthropic":  {"base_url": "https://api.anthropic.com", "model": "claude-sonnet-4-5"},
    "openai":     {"base_url": "https://api.openai.com",    "model": "gpt-4o-mini"},
    "openrouter": {"base_url": "https://openrouter.ai/api", "model": "meta-llama/llama-3-8b-instruct"},
}


async def chat(
    *,
    provider: str,
    model: str,
    messages: list[dict],
    system: str = "",
    api_key: str = "",
    base_url: str = "",
    max_tokens: int = 1024,
) -> str:
    provider = provider.lower().strip()
    if provider not in PROVIDER_DEFAULTS:
        raise ValueError(f"Unknown provider '{provider}'. Choose: {list(PROVIDER_DEFAULTS)}")

    defaults = PROVIDER_DEFAULTS[provider]
    model    = model    or defaults["model"]
    base_url = base_url or defaults["base_url"]
    api_key  = api_key  or os.environ.get(_env_key(provider), "")

    if provider == "ollama":
        return await _ollama(base_url, model, messages, system, max_tokens)
    elif provider == "anthropic":
        return await _anthropic(base_url, model, messages, system, api_key, max_tokens)
    else:  # openai / openrouter — both speak OpenAI format
        return await _openai_compat(base_url, model, messages, system, api_key, max_tokens)


def _env_key(provider: str) -> str:
    return {
        "anthropic":  "ANTHROPIC_API_KEY",
        "openai":     "OPENAI_API_KEY",
        "openrouter": "OPENROUTER_API_KEY",
        "ollama":     "",
    }.get(provider, "")


# ── Ollama ──────────────────────────────────────────────────────────────────
async def _ollama(base_url: str, model: str, messages: list, system: str, max_tokens: int) -> str:
    msgs = []
    if system:
        msgs.append({"role": "system", "content": system})
    msgs.extend(messages)

    payload = {"model": model, "messages": msgs, "stream": False,
               "options": {"num_predict": max_tokens}}

    async with httpx.AsyncClient(timeout=120) as c:
        r = await c.post(f"{base_url}/api/chat", json=payload)
        r.raise_for_status()
        data = r.json()
        return data.get("message", {}).get("content", "")


# ── Anthropic ────────────────────────────────────────────────────────────────
async def _anthropic(base_url: str, model: str, messages: list, system: str,
                     api_key: str, max_tokens: int) -> str:
    if not api_key:
        raise ValueError("Anthropic API key required. Set ANTHROPIC_API_KEY or pass api_key.")
    payload = {"model": model, "max_tokens": max_tokens, "messages": messages}
    if system:
        payload["system"] = system
    hdrs = {"x-api-key": api_key, "anthropic-version": "2023-06-01",
            "content-type": "application/json"}
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(f"{base_url}/v1/messages", headers=hdrs, json=payload)
        r.raise_for_status()
        return r.json()["content"][0]["text"]


# ── OpenAI-compatible (OpenAI + OpenRouter) ──────────────────────────────────
async def _openai_compat(base_url: str, model: str, messages: list, system: str,
                         api_key: str, max_tokens: int) -> str:
    if not api_key:
        raise ValueError("API key required.")
    msgs = []
    if system:
        msgs.append({"role": "system", "content": system})
    msgs.extend(messages)
    payload = {"model": model, "max_tokens": max_tokens, "messages": msgs}
    hdrs = {"Authorization": f"Bearer {api_key}", "content-type": "application/json"}
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(f"{base_url}/v1/chat/completions", headers=hdrs, json=payload)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]
