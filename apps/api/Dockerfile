# Dockerfile for @876/api (FastAPI)
# Used to build the FastAPI service container from apps/api.

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

# Default to port 4000 for local Docker runs and container deployments
ENV PORT=4000

EXPOSE $PORT

CMD ["sh", "-c", "python -m uvicorn main:app --host 0.0.0.0 --port $PORT"]
