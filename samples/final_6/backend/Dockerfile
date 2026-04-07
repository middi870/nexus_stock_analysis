# ── NEXUS Backend Dockerfile ──────────────────────────────────────────────────
# Multi-stage build: slim final image ~200 MB

# ── Stage 1: dependency builder ───────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# System deps for pandas / numpy wheels
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc g++ && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Copy installed packages
COPY --from=builder /install /usr/local

# Copy application source
COPY app/ ./app/

# Data directory (mount a Railway volume here for persistence)
RUN mkdir -p /data

# Non-root user for security
RUN useradd -m -u 1001 nexus && chown -R nexus:nexus /app /data
USER nexus

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DB_PATH=/data/nexus.db \
    PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
