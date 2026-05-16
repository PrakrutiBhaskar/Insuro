# ── InsuReady ML Microservice — Dockerfile ───────────────────────────────────
# Multi-stage build: keeps final image lean (~500MB vs ~1.2GB)

# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir --prefix=/install -r requirements.txt


# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY api/app.py           ./app.py
COPY models/insuready_model.pkl  ./models/insuready_model.pkl

# Non-root user for security
RUN useradd -m -u 1001 mluser && chown -R mluser:mluser /app
USER mluser

# Expose port (Node gateway calls this internally)
EXPOSE 8000

# Health check (Docker will mark container unhealthy if /health fails)
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Start server (single worker — scale horizontally via Docker Compose replicas)
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", \
     "--workers", "1", "--log-level", "info"]
