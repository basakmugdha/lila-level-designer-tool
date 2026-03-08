# LILA BLACK Telemetry Viewer
# Build frontend first: cd frontend && npm run build
# Build from repo root: docker build -t lila-telemetry .
# Run: docker run -p 8000:8000 -v /path/to/player_data:/data lila-telemetry
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY frontend/dist/ ./frontend/dist/

ENV PLAYER_DATA_ROOT=/data
ENV PYTHONPATH=/app/backend

EXPOSE 8000
WORKDIR /app
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
