FROM python:3.10-slim

WORKDIR /app

# Install system dependencies (ffmpeg is required for audio/video processing)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker layer caching
COPY requirements.txt .

# Install lightweight Python dependencies (<100MB RAM usage)
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Expose port (Render automatically sets $PORT)
EXPOSE 8000
ENV PORT=8000

CMD ["python", "main.py"]
