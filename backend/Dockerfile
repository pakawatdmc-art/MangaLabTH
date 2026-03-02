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

# Install system dependencies for Pillow
RUN apt-get update && apt-get install -y \
	libwebp-dev \
	libjpeg-dev \
	&& rm -rf /var/lib/apt/lists/*

# Install requirements first (better caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the app
COPY . .

# Create a directory for sqlite db and set permissions
RUN mkdir -p $HOME/app/data && \
	chown -R user:user $HOME/app

# Switch to the "user" user for better security
USER user

# Start the FastAPI app — Cloud Run handles port via $PORT
# V12: Auto-calculate workers based on CPU if possible or just use a sensible default
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips='*'
