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

# Start the FastAPI app
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
