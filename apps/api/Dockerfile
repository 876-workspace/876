# Dockerfile for @876/api (FastAPI)
# Used by Railway when Root Directory is set to apps/api.

FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system deps needed by asyncpg / cryptography
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files first for layer caching
COPY requirements.txt pyproject.toml ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Railway injects $PORT at runtime; default to 4000 for local docker runs
ENV PORT=4000

EXPOSE $PORT

CMD ["sh", "-c", "python -m uvicorn main:app --host 0.0.0.0 --port $PORT"]
