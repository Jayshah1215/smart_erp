# Smart ERP Docker Container Setup
FROM python:3.10-slim

WORKDIR /app

# Copy dependencies list and install
COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend and frontend source files
COPY . .

# Expose server port
EXPOSE 5000

# Run Flask application
CMD ["python", "backend/app.py"]
