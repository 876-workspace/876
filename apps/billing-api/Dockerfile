FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt pyproject.toml ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=4004
EXPOSE $PORT

CMD ["sh", "-c", "python -m uvicorn main:app --host 0.0.0.0 --port $PORT"]
