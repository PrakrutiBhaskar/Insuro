# ── Stage 1: Base ────────────────────────────────────────────────────────────
FROM python:3.11-slim AS base

# Install system dependencies:
#   tesseract-ocr  — OCR engine for image-based lab reports
#   libgl1         — required by some Pillow/OpenCV builds
#   poppler-utils  — PDF rendering utilities (used by pdfplumber internally)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    libgl1 \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# ── Stage 2: Dependencies ─────────────────────────────────────────────────────
FROM base AS deps

WORKDIR /app

COPY requirements.txt .

# Install Python dependencies
# --no-cache-dir keeps the image lean
RUN pip install --no-cache-dir -r requirements.txt

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM deps AS runtime

WORKDIR /app

# Copy application source
COPY . .

# Create temp directory for uploaded files
RUN mkdir -p /tmp/insuro_uploads

# Expose FastAPI port
EXPOSE 8001

# Run with uvicorn
# --host 0.0.0.0 makes it reachable from other containers
# --workers 1 keeps model in a single process (avoids loading NER model N times)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
