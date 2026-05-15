FROM python:3.11-slim

# Set up a new user named "user" with user ID 1000
RUN useradd -m -u 1000 user

# Set environment variables
ENV HOME=/home/user \
	PATH=/home/user/.local/bin:$PATH \
	PIP_NO_CACHE_DIR=1 \
	PORT=8000

# Set the working directory
WORKDIR $HOME/app

# Install system dependencies for Pillow + curl for healthcheck
RUN apt-get update && apt-get install -y \
	libwebp-dev \
	libjpeg-dev \
	curl \
	&& rm -rf /var/lib/apt/lists/*

# Install requirements first (better caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the app
COPY . .

# Set permissions for the app directory
RUN chown -R user:user $HOME/app

# Switch to the "user" user for better security
USER user

# Health check for container orchestrators
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD curl -f http://localhost:${PORT}/health || exit 1

# Start the FastAPI app — Cloud Run handles port via $PORT
# Use 2 workers by default for better CPU utilization; override via WEB_CONCURRENCY env var
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers ${WEB_CONCURRENCY:-2} --proxy-headers --forwarded-allow-ips='*'
