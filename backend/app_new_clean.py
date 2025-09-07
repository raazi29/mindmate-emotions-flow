"""
MindMate Emotions Flow - Clean Backend Implementation
A robust FastAPI backend for emotion detection and AI wellness chat.

Features:
- Real-time emotion detection using HuggingFace API
- AI wellness assistant using Gemini and OpenRouter APIs
- Enhanced text preprocessing for accurate emotion analysis
- Comprehensive error handling and fallback mechanisms
- Real-time logging and status monitoring
"""

import os
import re
import time
import asyncio
import logging
from typing import List, Dict, Optional, Any
from contextlib import asynccontextmanager
from collections import defaultdict
from datetime import datetime, timedelta

import httpx
import google.generativeai as genai
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# API Configuration
HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY") 
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# API URLs
HUGGINGFACE_URL = "https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Global HTTP client
http_client = None

# Rate limiting for emotion detection
rate_limit_cache = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # 1 minute
RATE_LIMIT_MAX_CALLS = 30  # Max 30 calls per minute per IP

# Enhanced emotion mapping for better accuracy
EMOTION_MAPPING = {
    "LABEL_0": "sadness",     # Often maps to sadness
    "LABEL_1": "joy",         # Often maps to joy
    "LABEL_2": "love",        # Often maps to love
    "LABEL_3": "anger",       # Often maps to anger
    "LABEL_4": "fear",        # Often maps to fear
    "LABEL_5": "surprise",    # Often maps to surprise
    "sadness": "sadness",
    "joy": "joy", 
    "love": "love",
    "anger": "anger",
    "fear": "fear",
    "surprise": "surprise",
    "neutral": "neutral"
}

def check_rate_limit(client_ip: str) -> bool:
    """
    Check if client has exceeded rate limit
    """
    now = datetime.now()
    cutoff = now - timedelta(seconds=RATE_LIMIT_WINDOW)
    
    # Clean old entries
    rate_limit_cache[client_ip] = [
        timestamp for timestamp in rate_limit_cache[client_ip] 
        if timestamp > cutoff
    ]
    
    # Check if under limit
    if len(rate_limit_cache[client_ip]) >= RATE_LIMIT_MAX_CALLS:
        return False
    
    # Add current request
    rate_limit_cache[client_ip].append(now)
    return True

class EmotionRequest(BaseModel):
    text: str

class BatchEmotionRequest(BaseModel):
    texts: List[str]

class Message(BaseModel):
    role: str
    content: str

class WellnessRequest(BaseModel):
    messages: List[Message]
    current_emotion: Optional[str] = None
    ai_model: Optional[str] = "gemini"

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global http_client
    
    # Startup
    logger.info("🚀 Starting MindMate Backend...")
    http_client = httpx.AsyncClient(timeout=30.0)
    
    # Configure Gemini if API key is available
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
        logger.info("✅ Gemini API configured")
    
    # Display API status
    print(f"""
    🏥 MindMate Emotions Flow Backend
    ================================
    📊 API Status:
       - HuggingFace: {'✅ Ready' if HUGGINGFACE_API_KEY else '❌ Missing Key'}
       - OpenRouter: {'✅ Ready' if OPENROUTER_API_KEY else '❌ Missing Key'} 
       - Gemini: {'✅ Ready' if GEMINI_API_KEY else '❌ Missing Key'}
    
    🌐 Server: http://localhost:8000
    📖 Docs: http://localhost:8000/docs
    ================================
    """)
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down MindMate Backend...")
    await http_client.aclose()

# Create FastAPI app
app = FastAPI(
    title="MindMate Emotions Flow Backend",
    description="Real-time emotion detection and AI wellness chat",
    version="2.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "MindMate Emotions Flow Backend",
        "version": "2.0.0",
        "status": "running",
        "endpoints": {
            "emotion_detection": "/api/detect-emotion",
            "batch_emotion": "/api/batch-detect-emotion", 
            "wellness_chat": "/api/wellness-assistant",
            "status": "/status"
        }
    }

@app.get("/status")
async def get_status():
    """Get API status and health check"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "apis": {
            "huggingface": bool(HUGGINGFACE_API_KEY),
            "openrouter": bool(OPENROUTER_API_KEY),
            "gemini": bool(GEMINI_API_KEY)
        },
        "features": {
            "emotion_detection": True,
            "ai_chat": True,
            "batch_processing": True
        }
    }

async def detect_emotion_huggingface(text: str) -> Dict[str, Any]:
    """Detect emotion using HuggingFace API"""
    if not HUGGINGFACE_API_KEY:
        raise HTTPException(status_code=500, detail="HuggingFace API key not configured")
    
    headers = {"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"}
    payload = {"inputs": text}
    
    try:
        logger.info(f"Calling HuggingFace API for text: '{text[:50]}...'")
        response = await http_client.post(HUGGINGFACE_URL, headers=headers, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            logger.info(f"HuggingFace response: {result}")
            
            if isinstance(result, list) and len(result) > 0:
                emotions = result[0] if isinstance(result[0], list) else result
                
                # Find highest confidence emotion
                best_emotion = max(emotions, key=lambda x: x['score'])
                emotion_label = best_emotion['label'].lower()
                confidence = best_emotion['score']
                
                # Map to standard emotions
                mapped_emotion = EMOTION_MAPPING.get(emotion_label, emotion_label)
                
                return {
                    "emotion": mapped_emotion,
                    "confidence": confidence,
                    "model_used": "j-hartmann/emotion-english-distilroberta-base",
                    "raw_emotions": emotions
                }
        
        logger.error(f"HuggingFace API error: {response.status_code} - {response.text}")
        raise HTTPException(status_code=response.status_code, detail=f"HuggingFace API error: {response.text}")
        
    except httpx.TimeoutException:
        logger.error("HuggingFace API timeout")
        raise HTTPException(status_code=408, detail="HuggingFace API timeout")
    except Exception as e:
        logger.error(f"HuggingFace API error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"HuggingFace API error: {str(e)}")

@app.post("/api/detect-emotion")
async def detect_emotion(request: EmotionRequest, req: Request):
    """Detect emotion in text using only HuggingFace models"""
    try:
        logger.info(f"🔍 Emotion detection request: '{request.text}'")
        
        # Rate limiting
        client_ip = req.client.host if req.client else "unknown"
        if not check_rate_limit(client_ip):
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Please try again later.")
        
        # Always use HuggingFace API - no pattern matching
        logger.info("Calling HuggingFace API...")
        result = await detect_emotion_huggingface(request.text)
        result["original_text"] = request.text
        
        logger.info(f"✅ Result: {result['emotion']} with model {result['model_used']}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Emotion detection error: {str(e)}")
        # Fallback response
        return {
            "emotion": "neutral",
            "confidence": 0.5,
            "model_used": "fallback",
            "error": str(e),
            "original_text": request.text
        }

@app.post("/api/batch-detect-emotion")
async def batch_detect_emotion(request: BatchEmotionRequest):
    """Detect emotions in multiple texts using only HuggingFace models"""
    try:
        start_time = time.time()
        results = []
        
        # Process each text using only HuggingFace API
        for text in request.texts:
            try:
                # Always use HuggingFace API - no pattern matching or preprocessing
                result = await detect_emotion_huggingface(text)
                result["original_text"] = text
                
                results.append(result)
                
            except Exception as e:
                logger.error(f"Error processing text '{text}': {str(e)}")
                results.append({
                    "emotion": "neutral",
                    "confidence": 0.5,
                    "model_used": "fallback",
                    "error": str(e),
                    "original_text": text
                })
        
        total_time = time.time() - start_time
        
        return {
            "results": results,
            "total_time": total_time,
            "count": len(results)
        }
        
    except Exception as e:
        logger.error(f"Batch emotion detection error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def chat_with_gemini(messages: List[Dict], current_emotion: str = None) -> str:
    """Chat with Gemini API"""
    if not GEMINI_API_KEY:
        raise Exception("Gemini API key not configured")
    
    try:
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        # Build conversation context
        context = "You are a compassionate AI wellness assistant helping users with their emotional well-being. "
        if current_emotion:
            context += f"The user's current emotion is: {current_emotion}. "
        context += "Provide supportive, empathetic responses that acknowledge their feelings and offer gentle guidance."
        
        # Format messages for Gemini
        conversation = [context]
        for msg in messages:
            if msg["role"] == "user":
                conversation.append(f"User: {msg['content']}")
            elif msg["role"] == "assistant":
                conversation.append(f"Assistant: {msg['content']}")
        
        prompt = "\n".join(conversation) + "\nAssistant:"
        
        logger.info("Calling Gemini API...")
        response = model.generate_content(prompt)
        
        if response and response.text:
            logger.info("Gemini API successful")
            return response.text.strip()
        else:
            raise Exception("No response from Gemini")
            
    except Exception as e:
        logger.error(f"Gemini API error: {str(e)}")
        raise

async def chat_with_openrouter(messages: List[Dict], current_emotion: str = None) -> str:
    """Chat with OpenRouter API"""
    if not OPENROUTER_API_KEY:
        raise Exception("OpenRouter API key not configured")
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Build system message
    system_msg = "You are a compassionate AI wellness assistant helping users with their emotional well-being. "
    if current_emotion:
        system_msg += f"The user's current emotion is: {current_emotion}. "
    system_msg += "Provide supportive, empathetic responses that acknowledge their feelings and offer gentle guidance."
    
    # Format messages
    formatted_messages = [{"role": "system", "content": system_msg}]
    formatted_messages.extend(messages)
    
    payload = {
        "model": "qwen/qwen2.5-72b-instruct",
        "messages": formatted_messages,
        "temperature": 0.7,
        "max_tokens": 500
    }
    
    try:
        logger.info("Calling OpenRouter API...")
        response = await http_client.post(OPENROUTER_URL, headers=headers, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            if "choices" in result and len(result["choices"]) > 0:
                message = result["choices"][0]["message"]["content"]
                logger.info("OpenRouter API successful")
                return message.strip()
        
        logger.error(f"OpenRouter API error: {response.status_code} - {response.text}")
        raise Exception(f"OpenRouter API error: {response.status_code}")
        
    except Exception as e:
        logger.error(f"OpenRouter API error: {str(e)}")
        raise

@app.post("/api/wellness-assistant")
async def wellness_assistant(request: WellnessRequest):
    """AI wellness chat assistant with fallback support"""
    try:
        messages_dict = [msg.dict() for msg in request.messages]
        ai_model = request.ai_model or "gemini"
        
        logger.info(f"Wellness chat request with model: {ai_model}")
        
        # Try requested model first
        if ai_model == "gemini" and GEMINI_API_KEY:
            try:
                response = await chat_with_gemini(messages_dict, request.current_emotion)
                return {
                    "message": response,
                    "model_used": "gemini-2.0-flash-exp",
                    "emotion_context": request.current_emotion
                }
            except Exception as e:
                logger.warning(f"Gemini failed, trying OpenRouter: {str(e)}")
        
        # Try OpenRouter as fallback or primary
        if OPENROUTER_API_KEY:
            try:
                response = await chat_with_openrouter(messages_dict, request.current_emotion)
                return {
                    "message": response,
                    "model_used": "qwen/qwen2.5-72b-instruct",
                    "emotion_context": request.current_emotion
                }
            except Exception as e:
                logger.warning(f"OpenRouter failed: {str(e)}")
        
        # Fallback response
        emotion_responses = {
            "sadness": "I understand you're going through a difficult time. It's okay to feel sad - these feelings are valid. Would you like to talk about what's bothering you? Sometimes sharing can help lighten the burden.",
            "anger": "I can sense your frustration. It's natural to feel angry sometimes. Taking deep breaths can help. What's causing these feelings? Let's work through this together.",
            "fear": "It sounds like you're feeling anxious or worried. That's completely understandable. Remember that you're not alone in this. What specific concerns are on your mind?",
            "joy": "It's wonderful to hear that you're feeling positive! I'm glad you're in a good space. What's bringing you joy today?",
            "neutral": "Thank you for sharing with me. I'm here to support you in whatever way I can. How are you feeling right now, and is there anything specific you'd like to talk about?"
        }
        
        fallback_response = emotion_responses.get(request.current_emotion, emotion_responses["neutral"])
        
        return {
            "message": fallback_response,
            "model_used": "fallback-response",
            "emotion_context": request.current_emotion,
            "note": "Using fallback response - API keys may need verification"
        }
        
    except Exception as e:
        logger.error(f"Wellness assistant error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    logger.error(f"Unhandled error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )

if __name__ == "__main__":
    import uvicorn
    
    print("🚀 Starting MindMate Emotions Flow Backend...")
    uvicorn.run(
        "app_new_clean:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )