# Multi-stage build for unified application
# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json ./
COPY frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
# Build with API URL pointing to same origin (relative paths)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage 2: Python backend with frontend static files
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy backend application
COPY backend/app /app/app
COPY backend/forms /app/forms

# Copy built frontend static files
COPY --from=frontend-builder /app/frontend/dist /app/static

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV ADMIN_USERNAME=admin
ENV ADMIN_PASSWORD=admin123
ENV JWT_SECRET=6165a17551fe53d3a5f5fcdf1ba365b1db025ed95573a38ad332a1a068e21b81
ENV LDX_WATCH_DIR=/ldx

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/roles')" || exit 1

# Start command - will need to mount static files endpoint
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
