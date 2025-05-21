@echo off
echo Starting MindMate Emotions Flow Backend...
call .\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --host 127.0.0.1 --port 8000 