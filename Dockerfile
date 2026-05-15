# ╔══════════════════════════════════════════════════════════════╗
# ║  MangaLabTH — Full-Stack Docker Image                      ║
# ║  Next.js (port 3000) + FastAPI (port 8000)                  ║
# ║  Managed by Supervisord                                     ║
# ╚══════════════════════════════════════════════════════════════╝

# ════════════════════════════════════════════════════
# Stage 1: Build Next.js Frontend (standalone output)
# ════════════════════════════════════════════════════
FROM node:20-alpine AS frontend-builder

WORKDIR /build

# Copy package files first for better Docker layer caching
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --maxsockets 5 --fetch-timeout 120000 --fetch-retries 5

# Copy the rest of the frontend source
COPY frontend/ .

# Build-time environment variables (NEXT_PUBLIC_* are embedded at build time)
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_R2_PUBLIC_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_R2_PUBLIC_URL=$NEXT_PUBLIC_R2_PUBLIC_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID

# Build the Next.js app (standalone output → .next/standalone/)
RUN npm run build


# ════════════════════════════════════════════════════
# Stage 2: Production Runtime
# ════════════════════════════════════════════════════
FROM python:3.11-slim

# Install Node.js 20 + system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    libwebp-dev \
    libjpeg-dev \
    supervisor \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 user

# ── Backend Setup ────────────────────────────────
WORKDIR /app/backend

# Install Python dependencies first (better caching)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/app/ ./app/
COPY backend/alembic/ ./alembic/
COPY backend/alembic.ini .

# ── Frontend Setup ───────────────────────────────
WORKDIR /app/frontend

# Copy standalone Next.js output from builder stage
COPY --from=frontend-builder /build/.next/standalone/ ./
COPY --from=frontend-builder /build/.next/static/ ./.next/static/
COPY --from=frontend-builder /build/public/ ./public/

# ── Supervisord Config ──────────────────────────
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# ── Set permissions ─────────────────────────────
RUN chown -R user:user /app /tmp

# Switch to non-root user
USER user

# Environment defaults
ENV PORT=3000 \
    WEB_CONCURRENCY=2 \
    NODE_ENV=production

# Expose the Next.js port (Cloud Run connects here)
EXPOSE 3000

# Health check: verify Next.js is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Start both services via Supervisord
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
