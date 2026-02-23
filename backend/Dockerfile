FROM python:3.11-slim

# 1. Create a new user named "user" with user ID 1000
RUN useradd -m -u 1000 user

# 2. Set environment variables
ENV HOME=/home/user \
	PATH=/home/user/.local/bin:$PATH

# 3. Set the working directory
WORKDIR $HOME/app

# 4. Copy files and set ownership to "user"
COPY --chown=user . $HOME/app

# 5. [FIX] Switch to ROOT to create directories and fix permissions safely
USER root
RUN mkdir -p $HOME/app/data && \
    chown -R user:user $HOME/app

# 6. Switch back to "user" for installation and runtime
USER user

# 7. Install requirements (User mode)
ENV PIP_NO_CACHE_DIR=1
RUN pip install --no-cache-dir -r requirements.txt

# 8. Cloud Run configuration
# Cloud Run defaults to port 8080, so it's good practice to match it.
ENV PORT=8080

# 9. Start the FastAPI app
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
