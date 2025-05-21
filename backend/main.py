import os
import logging
from typing import List, Dict, Optional, Any
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from cachetools import TTLCache
import time
import orjson
from contextlib import asynccontextmanager
import random

# Conditional imports to handle offline mode
try:
    from transformers import pipeline, AutoModelForSequenceClassification, AutoTokenizer
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# Global cache for emotion detection results
# TTL of 1 hour, max size of 1000 items
emotion_cache = TTLCache(maxsize=1000, ttl=3600)

# Models container
models = {"emotion_classifier": None, "sentiment_analyzer": None}

# Message responses for different emotions
message_responses = {
    "jokes": {
        "joy": [
            "Why don't scientists trust atoms? Because they make up everything!",
            "I told my wife she was drawing her eyebrows too high. She looked surprised!"
        ],
        "sadness": [
            "Why did the bicycle fall over? It was two tired!",
            "What's the best thing about Switzerland? I don't know, but the flag is a big plus."
        ],
        "anger": [
            "Feeling angry? Remember that people who are good at math are counters productive.",
            "Why don't scientists trust atoms? Because they make up everything, just like that person who annoyed you!"
        ],
        "fear": [
            "Do you know what's really scary? The fact that 'incorrectly' is spelled incorrectly in every dictionary.",
            "If you're afraid of elevators, you need to take steps to avoid them."
        ],
        "love": [
            "What did one volcano say to the other? I lava you!",
            "I'm not saying I love you, but I wouldn't mind being quarantined with you."
        ],
        "surprise": [
            "Life is full of surprises. Like finding out that 'expecting the unexpected' makes the unexpected expected.",
            "Surprise! Did you know that the original name for Monopoly was 'Surprise! I Own Everything Now And You're Bankrupt'?"
        ],
        "neutral": [
            "Did you hear about the mathematician who's afraid of negative numbers? He'll stop at nothing to avoid them!",
            "What do you call a parade of rabbits hopping backwards? A receding hare-line."
        ]
    },
    "encouragement": {
        "joy": [
            "Your happiness is contagious! Keep spreading that positive energy.",
            "Great to see you in high spirits! Happiness looks good on you."
        ],
        "sadness": [
            "It's okay to feel down sometimes. Remember that this feeling is temporary.",
            "Take it one moment at a time. You've got this."
        ],
        "anger": [
            "Take a deep breath. Your feelings are valid, but you are in control.",
            "It's okay to step back and give yourself some space to cool down."
        ],
        "fear": [
            "You're braver than you think. Take one small step at a time.",
            "Fear is just your brain trying to protect you. Thank it, then decide what you need."
        ],
        "love": [
            "Connection is what gives meaning to life. Cherish those special bonds.",
            "Love is a beautiful emotion to experience. Embrace it fully."
        ],
        "surprise": [
            "Life's unexpected moments keep things interesting!",
            "Embrace the unexpected - that's where growth happens."
        ],
        "neutral": [
            "Balance is a good place to be. Take this moment to center yourself.",
            "A neutral state is perfect for mindfulness and clarity."
        ]
    },
    "quotes": {
        "joy": [
            "Happiness is not something ready-made. It comes from your own actions. - Dalai Lama",
            "The most wasted of all days is one without laughter. - E.E. Cummings"
        ],
        "sadness": [
            "Even the darkest night will end and the sun will rise. - Victor Hugo",
            "In the middle of winter I at last discovered that there was in me an invincible summer. - Albert Camus"
        ],
        "anger": [
            "Speak when you are angry and you will make the best speech you will ever regret. - Ambrose Bierce",
            "For every minute you are angry you lose sixty seconds of happiness. - Ralph Waldo Emerson"
        ],
        "fear": [
            "Fear is only as deep as the mind allows. - Japanese Proverb",
            "Everything you want is on the other side of fear. - Jack Canfield"
        ],
        "love": [
            "The best and most beautiful things in this world cannot be seen or even heard, but must be felt with the heart. - Helen Keller",
            "Where there is love there is life. - Mahatma Gandhi"
        ],
        "surprise": [
            "Life is full of surprises and serendipity. Being open to unexpected turns in the road is an important part of success. - Henry Ford",
            "The moments of happiness we enjoy take us by surprise. Not that we seize them, but that they seize us. - Ashley Montagu"
        ],
        "neutral": [
            "The middle path is the way to wisdom. - Rumi",
            "Life is a balance of holding on and letting go. - Rumi"
        ]
    }
}

# Message cache
message_cache = {}

# Startup and shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load models in background
    logger.info("Starting FastAPI Emotion Processing Service")
    if TRANSFORMERS_AVAILABLE:
        load_models_in_background()
    
    yield
    
    # Shutdown: Clean up resources
    logger.info("Shutting down FastAPI Emotion Processing Service")
    # Clear cache
    emotion_cache.clear()
    # Clear models from memory
    models["emotion_classifier"] = None
    models["sentiment_analyzer"] = None
    if TRANSFORMERS_AVAILABLE and torch.cuda.is_available():
        torch.cuda.empty_cache()

app = FastAPI(
    title="FastAPI Emotion Processing",
    description="API for processing emotions with optimized ML models",
    version="1.0.0",
    lifespan=lifespan
)

# Allow cross-origin requests - updated to allow specific frontend domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:8081", "http://localhost:8082", "http://127.0.0.1:8080", "http://127.0.0.1:8081", "http://127.0.0.1:8082"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class EmotionRequest(BaseModel):
    text: str
    model_preference: Optional[str] = "fast"  # 'fast' or 'accurate'

class EmotionResponse(BaseModel):
    emotion: str
    confidence: float
    processed_time: float
    model_used: str
    details: Optional[Dict[str, float]] = None

class EmotionBatchRequest(BaseModel):
    texts: List[str]
    model_preference: Optional[str] = "fast"

class EmotionBatchResponse(BaseModel):
    results: List[EmotionResponse]
    total_time: float

class StatusResponse(BaseModel):
    status: str
    models_loaded: Dict[str, bool]
    cuda_available: bool
    transformers_available: bool

class RefreshCacheRequest(BaseModel):
    type: str
    emotion: str

# Model loading function
def load_models_in_background():
    """Load ML models in background"""
    logger.info("Loading emotion classification models...")
    
    try:
        # Fast, lightweight emotion classifier
        models["emotion_classifier"] = pipeline(
            "text-classification",
            model="SamLowe/roberta-base-go_emotions",
            top_k=None
        )
        
        # Backup sentiment analyzer
        models["sentiment_analyzer"] = pipeline(
            "sentiment-analysis",
            model="distilbert-base-uncased-finetuned-sst-2-english"
        )
        
        logger.info("Models loaded successfully")
    except Exception as e:
        logger.error(f"Error loading models: {e}")

# Emotion mapping function
def map_sentiment_to_emotion(sentiment_result):
    """Map sentiment analysis result to emotion format"""
    result = sentiment_result[0]
    label = result["label"]
    score = result["score"]
    
    if label == "POSITIVE":
        return {"emotion": "joy", "confidence": score}
    elif label == "NEGATIVE":
        # Try to differentiate between sadness and anger
        if score > 0.8:
            return {"emotion": "anger", "confidence": score}
        else:
            return {"emotion": "sadness", "confidence": score}
    else:
        return {"emotion": "neutral", "confidence": score}

# Routes
@app.get("/", include_in_schema=False)
async def root():
    return {"message": "FastAPI Emotion Processing Service"}

@app.get("/status", response_model=StatusResponse)
async def get_status():
    """Check API status and model availability"""
    return {
        "status": "online",
        "models_loaded": {
            "emotion_classifier": models["emotion_classifier"] is not None,
            "sentiment_analyzer": models["sentiment_analyzer"] is not None
        },
        "cuda_available": TRANSFORMERS_AVAILABLE and torch.cuda.is_available(),
        "transformers_available": TRANSFORMERS_AVAILABLE
    }

@app.post("/detect-emotion", response_model=EmotionResponse)
async def detect_emotion(request: EmotionRequest):
    """Detect emotion in a text using ML models"""
    text = request.text.strip()
    
    # Return early if text is too short
    if len(text) < 3:
        return {
            "emotion": "neutral",
            "confidence": 1.0,
            "processed_time": 0.0,
            "model_used": "rule-based",
            "details": {"neutral": 1.0}
        }
    
    # Check cache first
    cache_key = f"{text}_{request.model_preference}"
    if cache_key in emotion_cache:
        cached_result = emotion_cache[cache_key]
        logger.info(f"Returning cached result for text: {text[:30]}...")
        return cached_result
    
    start_time = time.time()
    
    try:
        result = None
        model_used = "rule-based"
        
        # Fast mode: Use cached models
        if TRANSFORMERS_AVAILABLE and models["emotion_classifier"] is not None:
            classifier = models["emotion_classifier"]
            raw_result = classifier(text)
            
            # Process result
            if isinstance(raw_result, list) and len(raw_result) > 0:
                if isinstance(raw_result[0], list):
                    # Handle case where top_k returns multiple labels
                    emotions = {item["label"]: item["score"] for item in raw_result[0]}
                    # Find highest scoring emotion
                    emotion = max(emotions.items(), key=lambda x: x[1])
                    result = {
                        "emotion": map_emotion_label(emotion[0]),
                        "confidence": emotion[1],
                        "details": emotions
                    }
                else:
                    # Handle case with single result
                    label = raw_result[0]["label"]
                    score = raw_result[0]["score"]
                    result = {
                        "emotion": map_emotion_label(label),
                        "confidence": score
                    }
                model_used = "emotion_classifier"
        
        # Fallback to sentiment analyzer if needed
        if result is None and TRANSFORMERS_AVAILABLE and models["sentiment_analyzer"] is not None:
            sentiment = models["sentiment_analyzer"](text)
            result = map_sentiment_to_emotion(sentiment)
            model_used = "sentiment_analyzer"
        
        # Fallback to rule-based approach if ML is unavailable
        if result is None:
            result = rule_based_emotion_detection(text)
            model_used = "rule-based"
        
        # Add processing time
        processed_time = time.time() - start_time
        full_result = {
            **result,
            "processed_time": processed_time,
            "model_used": model_used
        }
        
        # Cache the result
        emotion_cache[cache_key] = full_result
        
        return full_result
    except Exception as e:
        logger.error(f"Error detecting emotion: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/batch-detect-emotion", response_model=EmotionBatchResponse)
async def batch_detect_emotion(request: EmotionBatchRequest):
    """Process multiple texts in a single request"""
    start_time = time.time()
    
    if len(request.texts) > 50:
        raise HTTPException(status_code=400, detail="Maximum batch size is 50 texts")
    
    results = []
    for text in request.texts:
        # Create individual request
        single_request = EmotionRequest(text=text, model_preference=request.model_preference)
        # Process it
        result = await detect_emotion(single_request)
        results.append(result)
    
    total_time = time.time() - start_time
    
    return {
        "results": results,
        "total_time": total_time
    }

@app.get("/health", include_in_schema=False)
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}

# Helper functions
def map_emotion_label(label: str) -> str:
    """Map model output labels to standard emotion labels"""
    # Lowercase and normalize the label
    label = label.lower()
    
    # Direct mappings
    if any(x in label for x in ["joy", "happ", "excit", "amus"]):
        return "joy"
    elif any(x in label for x in ["sad", "disappoint", "grief"]):
        return "sadness"
    elif any(x in label for x in ["ang", "frus", "annoy", "irrita"]):
        return "anger"
    elif any(x in label for x in ["fear", "anx", "worry", "nerv", "stress"]):
        return "fear"
    elif any(x in label for x in ["love", "affe", "care", "compassion"]):
        return "love"
    elif any(x in label for x in ["surp", "amaz", "awe", "astonish"]):
        return "surprise"
    else:
        return "neutral"

def rule_based_emotion_detection(text: str) -> dict:
    """Fallback rule-based emotion detection when ML models aren't available"""
    text = text.lower()
    
    # Simple keyword lists for each emotion
    emotion_keywords = {
        "joy": ["happy", "joy", "excited", "glad", "delighted", "pleased"],
        "sadness": ["sad", "unhappy", "depressed", "down", "miserable", "upset"],
        "anger": ["angry", "mad", "furious", "annoyed", "irritated", "frustrated"],
        "fear": ["afraid", "scared", "frightened", "worried", "anxious", "nervous"],
        "love": ["love", "adore", "care", "cherish", "affection", "fond"],
        "surprise": ["surprised", "amazed", "astonished", "shocked", "stunned", "wow"],
        "neutral": ["okay", "fine", "alright", "neutral", "so-so", "moderate"]
    }
    
    # Count matches for each emotion
    scores = {emotion: 0 for emotion in emotion_keywords}
    
    # Default to neutral with small score
    scores["neutral"] = 0.1
    
    # Count keyword matches
    for emotion, keywords in emotion_keywords.items():
        for keyword in keywords:
            if f" {keyword} " in f" {text} " or text.startswith(keyword) or text.endswith(keyword):
                scores[emotion] += 0.2
    
    # Find emotion with highest score
    if max(scores.values()) <= 0.1:
        # If no clear emotion is detected
        return {"emotion": "neutral", "confidence": 0.8, "details": scores}
    
    max_emotion = max(scores, key=scores.get)
    confidence = min(0.7, scores[max_emotion])  # Cap rule-based confidence at 0.7
    
    return {"emotion": max_emotion, "confidence": confidence, "details": scores}

# Add these endpoints after your existing API endpoints

@app.get("/message/{message_type}/{emotion}")
async def get_message(message_type: str, emotion: str):
    """Get a message of a specific type for an emotion"""
    # Validate emotion
    if emotion not in ["joy", "sadness", "anger", "fear", "love", "surprise", "neutral"]:
        raise HTTPException(status_code=400, detail=f"Invalid emotion: {emotion}")
    
    # Validate message type
    if message_type not in ["jokes", "encouragement", "quotes"]:
        raise HTTPException(status_code=400, detail=f"Invalid message type: {message_type}")
    
    # Check cache
    cache_key = f"{message_type}:{emotion}"
    if cache_key in message_cache:
        return {"message": message_cache[cache_key]}
    
    # Get message from responses
    try:
        messages = message_responses[message_type][emotion]
        message = random.choice(messages)
        
        # Cache the result
        message_cache[cache_key] = message
        
        return {"message": message}
    except Exception as e:
        logger.error(f"Error getting message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/refresh-cache")
async def refresh_cache(request: RefreshCacheRequest):
    """Force refresh the message cache for a specific type and emotion"""
    try:
        message_type = request.type
        emotion = request.emotion
        
        # Validate inputs
        if emotion not in ["joy", "sadness", "anger", "fear", "love", "surprise", "neutral"]:
            raise HTTPException(status_code=400, detail=f"Invalid emotion: {emotion}")
            
        if message_type not in ["jokes", "encouragement", "quotes"]:
            raise HTTPException(status_code=400, detail=f"Invalid message type: {message_type}")
        
        # Clear cache for this type/emotion pair
        cache_key = f"{message_type}:{emotion}"
        if cache_key in message_cache:
            del message_cache[cache_key]
            
        return {"success": True, "message": "Cache cleared successfully"}
    except Exception as e:
        logger.error(f"Error refreshing cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Run the server with: uvicorn main:app --reload
if __name__ == "__main__":
    import uvicorn
    
    # Determine port (use environment variable or default to 8000)
    port = int(os.getenv("PORT", 8000))
    
    # Run the server
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True) 