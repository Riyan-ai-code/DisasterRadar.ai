# ==============================================================================
# DisasterRadar.ai - Production Multi-Stage Dockerfile (Phase 7 MLOps)
# Builds React/Vite Frontend + FastAPI ML/GIS/Cyclone/NLP/RAG Backend
# ==============================================================================

FROM python:3.11-slim AS backend-runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_ENV=production \
    APP_PORT=8000

WORKDIR /app

# Install system dependencies for scientific/geospatial packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy trained native JSON models, datasets, and backend service code
COPY models/ /app/models/
COPY backend/ /app/backend/

WORKDIR /app/backend

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
