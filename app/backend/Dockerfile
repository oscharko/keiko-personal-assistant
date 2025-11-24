# Use slim image for smaller size and faster cold starts
FROM python:3.13-slim-bookworm

# Set environment variables for Python optimization
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install only essential system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better layer caching
COPY requirements.txt /app/

# Install Python dependencies with optimizations
RUN python -m pip install --no-cache-dir -r requirements.txt && \
    python -m pip install --no-cache-dir gunicorn

# Copy application code
COPY ./ /app

# Pre-compile Python bytecode for faster startup
RUN python -m compileall -b .

# Use gunicorn with optimized settings for cold start
CMD ["python3", "-m", "gunicorn", "-b", "0.0.0.0:8000", "--timeout", "230", "--workers", "2", "--worker-class", "custom_uvicorn_worker.CustomUvicornWorker", "--preload", "main:app"]
