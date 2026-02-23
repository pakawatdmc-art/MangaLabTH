FROM python:3.11-slim

# Set up a new user named "user" with user ID 1000
RUN useradd -m -u 1000 user

# Switch to the "user" user
USER user

# Set home to the user's home directory
ENV HOME=/home/user \
	PATH=/home/user/.local/bin:$PATH

# Set the working directory to the user's home directory
WORKDIR $HOME/app

# Copy the current directory contents into the container at $HOME/app setting the owner to the user
COPY --chown=user . $HOME/app

# Disable pip cache to shrink the image size
ENV PIP_NO_CACHE_DIR=1

# Install requirements
RUN pip install --no-cache-dir -r requirements.txt

# Create a directory for sqlite db if needed
RUN mkdir -p /home/user/app/data

# Give write access to the complete app directory
# This allows SQLModel/SQLite to write the local database file if not using a cloud DB
USER root
RUN chown -R user:user /home/user/app
USER user

# Cloud Run provides the PORT environment variable. Default to 8000 for local dev.
ENV PORT=8000

# Start the FastAPI app
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
