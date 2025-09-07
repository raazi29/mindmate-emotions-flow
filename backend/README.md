# MindMate FastAPI Emotion Backend

This FastAPI backend provides high-performance emotion analysis for the MindMate frontend application. It offloads CPU-intensive ML tasks from the browser to the server for better performance and user experience.

## Features

- High-performance emotion analysis using ML models
- Multiple fallback strategies for reliability
- Caching for improved performance
- Batch processing capability
- RESTful API with comprehensive documentation

## Requirements

- Python 3.9+
- Virtual environment (venv, conda, etc.)
- Dependencies listed in requirements.txt

## Local NeuroFeel Model

The backend now supports local execution of the NeuroFeel emotion detection model for improved performance and offline capability. To use the local model:

1. Set the environment variable `USE_LOCAL_NEUROFEEL=true`
2. The model will be automatically downloaded on first use
3. Subsequent requests will use the cached model for faster inference

## Setup

1. Create and activate a virtual environment:

```bash
# Create virtual environment
python -m venv venv

# Activate on Windows
venv\Scripts\activate

# Activate on Linux/Mac
source venv/bin/activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Run the server:

```bash
# Development mode with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn main:app --host 0.0.0.0 --port 8000
```

Note: The backend has two main files:
- `main.py`: The primary backend implementation with local model support
- `app.py`: An alternative implementation that uses the Hugging Face API directly

The `main.py` file is the recommended implementation as it supports both local and remote model execution.

## Docker Setup

To run the backend in a Docker container:

1. Build the Docker image:

```bash
docker build -t mindmate-emotion-backend .
```

2. Run the container:

```bash
docker run -d -p 8000:8000 --name emotion-backend mindmate-emotion-backend
```

## API Endpoints

- `GET /status` - Check server status and ML model availability
- `POST /detect-emotion` - Analyze emotion in a single text
- `POST /batch-detect-emotion` - Process multiple texts in a batch
- `GET /health` - Health check endpoint for monitoring

Interactive API documentation is available at `/docs` when the server is running.

## Configuration

You can configure the backend behavior using environment variables or `.env` file:

- `PORT` - Server port (default: 8000)
- `HUGGINGFACE_API_KEY` - Your HuggingFace API key if using remote models
- `FORCE_CPU` - Set to 1 to force CPU usage even if CUDA is available
- `CACHE_TTL` - Cache time-to-live in seconds (default: 3600)
- `CACHE_SIZE` - Maximum number of items in cache (default: 1000)
- `LOG_LEVEL` - Logging level (default: INFO)
- `USE_LOCAL_NEUROFEEL` - Set to true to use the local NeuroFeel model instead of the Hugging Face API (default: false)

## Integrating with Frontend

The FastAPI backend is designed to work with the MindMate frontend out of the box. The frontend automatically connects to the backend service when available, and falls back to local processing when unavailable.

## Performance Optimization

For optimal performance:

1. Use batch processing when analyzing multiple texts
2. Keep the cache size appropriate for your server memory
3. Consider using CUDA if available for faster inference
4. Adjust the model loading strategy based on your hardware

## Troubleshooting

- If models fail to load, check your Python environment and dependencies
- If the API returns 500 errors, check the server logs for details
- If performance is slow, consider reducing model complexity or using GPU acceleration 