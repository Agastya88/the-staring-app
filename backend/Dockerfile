FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    gcc \
 && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt .
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install -r requirements.txt

# Copy application code
COPY . .

# Expose port and run the app
EXPOSE 8000
CMD ["/opt/venv/bin/uvicorn", "eye_detection_api:app", "--host", "0.0.0.0", "--port", "8000"]
