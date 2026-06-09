FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY backend/requirements/base.txt backend/requirements/dev.txt backend/requirements/ml.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r base.txt -r dev.txt -r ml.txt

COPY backend/ ./backend/
COPY docker-entrypoint.sh ./
COPY .env.example .env

RUN mkdir -p data models mlruns logs && \
    chmod +x docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
