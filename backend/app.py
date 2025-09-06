from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
import json
import random
import time
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="MindMate Emotions API")

# Set up CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Keys and configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
# Allow overriding via env; default to a strong 2025 model
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "qwen/qwen2.5-72b-instruct")
# Qwen 3 model for advanced AI features
QWEN_3_MODEL = os.getenv("QWEN_3_MODEL", "qwen/qwen-3-235b-a22b")

# Hugging Face API configuration
HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY", "")
HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models/"
# Best emotion detection models from Hugging Face
# Primary: Go Emotions (most comprehensive and accurate)
EMOTION_MODEL = "SamLowe/roberta-base-go_emotions"
# High-performance alternatives ranked by accuracy:
ALTERNATIVE_MODELS = [
    "j-hartmann/emotion-english-distilroberta-base",  # Fast & accurate
    "bhadresh-savani/bert-base-go-emotion",            # BERT-based, good balance
    "cardiffnlp/twitter-roberta-base-emotion",        # Social media optimized
    "nateraw/bert-base-uncased-emotion",              # General emotion detection
    "daveni/twitter-emotion-base",                    # Twitter-specific emotions
]
SENTIMENT_MODEL = "cardiffnlp/twitter-roberta-base-sentiment-latest"

# Development mode flag - set to True to use mock responses instead of real API calls
DEV_MODE = os.getenv("DEV_MODE", "False").lower() == "true"

# Models for request validation
class Message(BaseModel):
    role: str
    content: str

class EmotionDetectionRequest(BaseModel):
    text: str

class OpenRouterEmotionRequest(BaseModel):
    text: str
    use_openrouter: bool = True

class OpenRouterSummaryRequest(BaseModel):
    text: str
    max_length: Optional[int] = 200

class OpenRouterAvailabilityRequest(BaseModel):
    force_check: bool = False

class RecommendationRequest(BaseModel):
    text: str
    resources: List[Dict[str, Any]]

class FeedbackRequest(BaseModel):
    emotion: Optional[str] = None
    resource_title: str

class SummaryRequest(BaseModel):
    text: str
    max_length: Optional[int] = 200

class JournalPromptRequest(BaseModel):
    emotion: Optional[str] = None
    context: Optional[str] = None
    previous_entries: Optional[List[str]] = None

class EmotionAnalysisRequest(BaseModel):
    text: str
    user_history: Optional[List[Dict[str, Any]]] = None

class GuidedReflectionRequest(BaseModel):
    emotion: str
    intensity: Optional[int] = 5  # Scale from 1-10
    situation: Optional[str] = None
    goals: Optional[List[str]] = None

class EmotionProgressionRequest(BaseModel):
    emotion_history: List[Dict[str, Any]]  # List of emotions with dates
    time_period: Optional[str] = "week"  # week, month, quarter, year
    current_emotion: Optional[str] = None

class MindfulnessExerciseRequest(BaseModel):
    emotion: str
    intensity: Optional[int] = 5  # Scale from 1-10
    duration: Optional[int] = 5  # Minutes (1-30)
    exercise_type: Optional[str] = None  # breathing, body_scan, visualization, etc.
    preferences: Optional[List[str]] = None  # User preferences

class WellnessAssistantRequest(BaseModel):
    messages: List[Dict[str, str]]
    current_emotion: Optional[str] = None
    ai_model: Optional[str] = "qwen"  # "qwen", "deepseek", or "mixtral"

class RefreshCacheRequest(BaseModel):
    force: bool = False

from enum import Enum

class EmotionLabel(str, Enum):
    JOY = "joy"
    SADNESS = "sadness"
    ANGER = "anger"
    FEAR = "fear"
    SURPRISE = "surprise"
    NEUTRAL = "neutral"
    LOVE = "love"

class EmotionMapping:
    _mapping = {
        "joy": EmotionLabel.JOY,
        "happy": EmotionLabel.JOY,
        "happiness": EmotionLabel.JOY,
        "excitement": EmotionLabel.JOY,
        "delight": EmotionLabel.JOY,
        "pleasure": EmotionLabel.JOY,
        "cheerful": EmotionLabel.JOY,
        "elated": EmotionLabel.JOY,

        "sadness": EmotionLabel.SADNESS,
        "sad": EmotionLabel.SADNESS,
        "unhappy": EmotionLabel.SADNESS,
        "depressed": EmotionLabel.SADNESS,
        "grief": EmotionLabel.SADNESS,
        "sorrow": EmotionLabel.SADNESS,
        "disappointment": EmotionLabel.SADNESS,
        "remorse": EmotionLabel.SADNESS,

        "anger": EmotionLabel.ANGER,
        "angry": EmotionLabel.ANGER,
        "furious": EmotionLabel.ANGER,
        "mad": EmotionLabel.ANGER,
        "annoyance": EmotionLabel.ANGER,
        "irritated": EmotionLabel.ANGER,
        "frustrated": EmotionLabel.ANGER,
        "disgust": EmotionLabel.ANGER,

        "fear": EmotionLabel.FEAR,
        "afraid": EmotionLabel.FEAR,
        "scared": EmotionLabel.FEAR,
        "frightened": EmotionLabel.FEAR,
        "anxious": EmotionLabel.FEAR,
        "worried": EmotionLabel.FEAR,
        "nervous": EmotionLabel.FEAR,
        "terrified": EmotionLabel.FEAR,

        "surprise": EmotionLabel.SURPRISE,
        "surprised": EmotionLabel.SURPRISE,
        "amazed": EmotionLabel.SURPRISE,
        "astonished": EmotionLabel.SURPRISE,
        "shocked": EmotionLabel.SURPRISE,

        "love": EmotionLabel.LOVE,
        "affection": EmotionLabel.LOVE,
        "caring": EmotionLabel.LOVE,
        "admiration": EmotionLabel.LOVE,
        "gratitude": EmotionLabel.LOVE,

        "neutral": EmotionLabel.NEUTRAL,
        "calm": EmotionLabel.NEUTRAL,
        "peaceful": EmotionLabel.NEUTRAL,
    }

    @staticmethod
    def map_emotion(label: str) -> EmotionLabel:
        label_lower = label.lower()
        return EmotionMapping._mapping.get(label_lower, EmotionLabel.NEUTRAL)

@app.get("/status")
async def status():
    """Check API status"""
    hf_api_available = bool(HUGGINGFACE_API_KEY)
    openrouter_api_available = bool(OPENROUTER_API_KEY)
    
    return {
        "status": "online", 
        "message": "MindMate Emotions API is running",
        "apis": {
            "huggingface": "available" if hf_api_available else "not configured",
            "openrouter": "available" if openrouter_api_available else "not configured"
        }
    }

@app.post("/openrouter/check-availability")
async def check_openrouter_availability(request: OpenRouterAvailabilityRequest = Body(...)):
    """Check if OpenRouter API is available"""
    if not OPENROUTER_API_KEY:
        return {"available": False, "reason": "API key not configured"}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://openrouter.ai/api/v1/auth/key",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}"
                }
            )
            
            return {"available": response.status_code == 200}
            
    except Exception as e:
        print(f"Error checking OpenRouter availability: {e}")
        return {"available": False, "reason": str(e)}

@app.post("/openrouter/detect-emotion")
async def openrouter_detect_emotion(request: OpenRouterEmotionRequest):
    """Detect emotion using OpenRouter API (backend-only)"""
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OpenRouter API key not configured")
    
    if not request.text or len(request.text.strip()) < 3:
        return {"emotion": "neutral", "confidence": 0.5}
    
    try:
        messages = [
            {
                "role": "system",
                "content": "You are an emotion detection AI. Analyze the text and identify the primary emotion expressed. Output a JSON object with two fields: emotion (string: joy, sadness, anger, fear, surprise, love, neutral) and confidence (number between 0-1). Use only these emotion categories."
            },
            {
                "role": "user",
                "content": request.text
            }
        ]
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://mindmate-app.com"
                },
                json={
                    "model": OPENROUTER_MODEL,
                    "messages": messages,
                    "max_tokens": 100,
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"}
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, 
                                   detail=f"OpenRouter API error: {response.status_code}")
                
            result = response.json()
            try:
                content = result["choices"][0]["message"]["content"]
                emotion_data = json.loads(content)
                mapped_emotion = EmotionMapping.map_emotion(emotion_data.get("emotion", "neutral"))
                emotion_data["emotion"] = mapped_emotion.value
                return {
                    "emotion": emotion_data.get("emotion", "neutral"),
                    "confidence": emotion_data.get("confidence", 0.5),
                    "model_used": "openrouter"
                }
            except (KeyError, json.JSONDecodeError) as e:
                print(f"Error parsing OpenRouter response: {e}")
                return {"emotion": "neutral", "confidence": 0.5, "model_used": "fallback-openrouter-parse-error"}
                
    except Exception as e:
        print(f"Error in OpenRouter emotion detection: {e}")
        return {"emotion": "neutral", "confidence": 0.5, "model_used": "fallback-general-error"}

@app.post("/openrouter/generate-summary")
async def openrouter_generate_summary(request: OpenRouterSummaryRequest):
    """Generate summary using OpenRouter API (backend-only)"""
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OpenRouter API key not configured")
    
    if not request.text or request.text.trim() == "":
        return {"summary": "No content to summarize"}
    
    try:
        messages = [
            {
                "role": "system",
                "content": f"You are an AI assistant that creates concise summaries. Create a brief summary of the given text in {request.max_length} characters or less."
            },
            {
                "role": "user",
                "content": request.text
            }
        ]
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://mindmate-app.com"
                },
                json={
                    "model": OPENROUTER_MODEL,
                    "messages": messages,
                    "max_tokens": 150,
                    "temperature": 0.3
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, 
                                   detail=f"OpenRouter API error: {response.status_code}")
                
            result = response.json()
            summary = result["choices"][0]["message"]["content"].strip()
            return {"summary": summary, "model_used": "openrouter"}
            
    except Exception as e:
        print(f"Error in OpenRouter summary generation: {e}")
        return {"summary": request.text[0:request.max_length], "model_used": "fallback"}

@app.post("/huggingface/detect-emotion")
async def huggingface_detect_emotion(request: EmotionDetectionRequest):
    """Detect emotion using Hugging Face API"""
    if not HUGGINGFACE_API_KEY:
        raise HTTPException(status_code=500, detail="Hugging Face API key not configured")

    if not request.text or len(request.text.strip()) < 3:
        return {"emotion": "neutral", "confidence": 0.5}

    headers = {"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"}
    payload = {"inputs": request.text}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                HUGGINGFACE_API_URL + EMOTION_MODEL,
                headers=headers,
                json=payload
            )
            response.raise_for_status()  # Raise an exception for HTTP errors
            result = response.json()

            if isinstance(result, list) and result and isinstance(result[0], list) and result[0]:
                # Sort by score in descending order and get the top emotion
                top_emotion = sorted(result[0], key=lambda x: x['score'], reverse=True)[0]
                mapped_emotion = EmotionMapping.map_emotion(top_emotion['label'])
                return {"emotion": mapped_emotion.value, "confidence": top_emotion['score']}
            else:
                logger.warning(f"Unexpected Hugging Face API response format: {result}")
                return {"emotion": "neutral", "confidence": 0.5}

    except httpx.RequestError as e:
        logger.error(f"Hugging Face API connection error: {e}")
        raise HTTPException(status_code=503, detail=f"Hugging Face API connection error: {e}")
    except httpx.HTTPStatusError as e:
        logger.error(f"Hugging Face API returned an error: {e.response.status_code} - {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=f"Hugging Face API returned an error: {e.response.text}")
    except Exception as e:
        logger.error(f"An unexpected error occurred during Hugging Face emotion detection: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")

# Helper function for Hugging Face API calls
async def query_huggingface_api(text: str, model: str):
    """Query Hugging Face API with the given text and model"""
    if not HUGGINGFACE_API_KEY:
        raise HTTPException(status_code=500, detail="Hugging Face API key not configured")
    
    headers = {
        "Authorization": f"Bearer {HUGGINGFACE_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "inputs": text,
        "options": {
            "wait_for_model": True
        }
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{HUGGINGFACE_API_URL}{model}",
                headers=headers,
                json=payload
            )
            
            if response.status_code != 200:
                print(f"Hugging Face API error: {response.status_code}, {response.text}")
                return None
            
            return response.json()
    except Exception as e:
        print(f"Error querying Hugging Face API: {e}")
        return None

@app.post("/detect-emotion")
async def detect_emotion(request: EmotionDetectionRequest):
    """Detect emotion from text using Hugging Face API"""
    if not request.text or len(request.text.strip()) < 3:
        return {"emotion": "neutral", "confidence": 0.5}
        
    try:
        if not HUGGINGFACE_API_KEY:
            raise HTTPException(status_code=500, detail="Hugging Face API key not configured")

        # Try primary model first, then fallbacks
        models_to_try = [EMOTION_MODEL] + ALTERNATIVE_MODELS
        
        for model in models_to_try:
            try:
                result = await query_huggingface_api(request.text, model)
                
                if result and isinstance(result, list) and len(result) > 0:
                    # Process Hugging Face emotion results
                    emotions = result[0]
                    
                    # Ensure we have valid emotion data
                    if isinstance(emotions, list) and len(emotions) > 0:
                        # Find the emotion with the highest score
                        top_emotion = max(emotions, key=lambda x: x.get('score', 0))
                        
                        # Map the emotion label to our standard set
                        emotion = EmotionMapping.map_emotion(top_emotion['label'])
                        confidence = top_emotion.get('score', 0.5)
                            
                            # Only accept high-confidence results
                        if confidence >= 0.3:
                            return {
                                "emotion": emotion,
                                "confidence": confidence,
                                "processed_time": time.time() - start_time,
                                "raw_emotions": emotions  # Include raw results for debugging
                            }
    except Exception as e:
            logger.warning(f"Model {model} failed: {e}")
            continue
        
        # If all Hugging Face models fail, default to neutral
                return {"emotion": EmotionLabel.NEUTRAL, "source": "Fallback"}

    except Exception as e:
        print(f"Emotion detection failed: {e}")
        raise HTTPException(status_code=500, detail="Emotion detection failed due to an internal error.")




                        if diminisher + " " + word in text or word + " " + diminisher in text:
                            score *= 0.6
                    
                    # Handle negation (reduce but don't completely negate)
                    if has_negation:
                        score *= 0.3  # Strong reduction for negated emotions
                    
                    emotion_scores[emotion] += score
    
    # Handle compound emotions and context
    compound_patterns = {
        "joy": ["happy and excited", "love and joy", "happy and grateful", "excited and happy"],
        "sadness": ["sad and lonely", "disappointed and hurt", "sad and angry", "upset and sad"],
        "anger": ["angry and frustrated", "mad and disappointed", "angry and upset", "furious and mad"],
        "fear": ["scared and worried", "afraid and anxious", "nervous and scared", "terrified and afraid"],
        "surprise": ["surprised and amazed", "shocked and surprised", "amazed and shocked"]
    }
    
    for emotion, patterns in compound_patterns.items():
        for pattern in patterns:
            if pattern in text:
                emotion_scores[emotion] += 2  # Bonus for compound emotions
    
    # Handle basic sentiment indicators if no specific emotions found
    if max(emotion_scores.values()) < 1:
        positive_indicators = ["good", "great", "awesome", "wonderful", "fantastic", "amazing", "excellent", "positive"]
        negative_indicators = ["bad", "terrible", "awful", "horrible", "worst", "negative", "awful"]
        
        positive_count = sum(1 for word in positive_indicators if word in text)
        negative_count = sum(1 for word in negative_indicators if word in text)
        
        if positive_count > negative_count:
            emotion_scores["joy"] += 1
        elif negative_count > positive_count:
            emotion_scores["sadness"] += 1
    
    # Handle exclamation and question marks as emotion indicators
    if text.endswith("!"):
        max_emotion = max(emotion_scores, key=emotion_scores.get)
        if emotion_scores[max_emotion] > 0:
            emotion_scores[max_emotion] *= 1.2  # Amplify existing emotion
    
    # Determine dominant emotion
    max_score = max(emotion_scores.values())
    
    if max_score < 0.5:  # Very low confidence
        return {"emotion": "neutral", "confidence": 0.4, "model_used": "rule-based"}
    
    # Find all emotions with max score (handle ties)
    dominant_emotions = [emotion for emotion, score in emotion_scores.items() if score == max_score]
    dominant_emotion = dominant_emotions[0]  # Take first in case of tie
    
    # Calculate confidence based on score distribution
    total_score = sum(emotion_scores.values())
    confidence = min(max_score / total_score if total_score > 0 else 0.5, 0.95)
    
    return {
        "emotion": dominant_emotion,
        "confidence": round(confidence, 2),
        "model_used": "rule-based",
        "scores": emotion_scores  # Include raw scores for debugging
    }

@app.post("/personalized-recommendations")
async def get_recommendations(request: RecommendationRequest):
    """Get personalized recommendations based on user input"""
    if not request.text or len(request.text) < 5 or not request.resources:
        return {"resources": request.resources}
        
    try:
        resource_info = "\n".join([
            f"ID: {r.get('id')}, Title: {r.get('title')}, Type: {r.get('type')}, Tag: {r.get('tag')}"
            for r in request.resources
        ])
        
        messages = [
            {
                "role": "system",
                "content": """You are an AI that provides personalized resource recommendations based on emotional state. 
                Analyze the user's mood and recommend the most relevant resources from the available list.
                Output a JSON array of resource IDs that would be most helpful, with at most 3 recommendations."""
            },
            {
                "role": "user",
                "content": f'Based on this input: "{request.text}"\n\nSelect the most relevant resources from this list:\n{resource_info}'
            }
        ]
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://mindmate-app.com"
                },
                json={
                    "model": OPENROUTER_MODEL,
                    "messages": messages,
                    "max_tokens": 300,
                    "temperature": 0.7,
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, 
                                   detail=f"OpenRouter API error: {response.status_code}")
                
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            # Extract JSON array from the response
            try:
                # Try various ways to extract the JSON response
                if "```json" in content:
                    json_str = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    json_str = content.split("```")[1].strip()
                elif "[" in content and "]" in content:
                    # Extract the text between the first [ and last ]
                    start = content.find("[")
                    end = content.rfind("]") + 1
                    json_str = content[start:end].strip()
                else:
                    json_str = content
                    
                recommended_ids = json.loads(json_str)
                
                # Mark recommended resources
                recommended_resources = []
                for resource in request.resources:
                    resource_copy = dict(resource)
                    resource_copy["recommended"] = resource.get("id") in recommended_ids
                    recommended_resources.append(resource_copy)
                    
                return {"resources": recommended_resources}
                
        except Exception as e:
                print(f"Error parsing JSON: {e}")
                print(f"Original content: {content}")
                return {"resources": request.resources}
                
    except Exception as e:
        print(f"Error processing request: {e}")
        return {"resources": request.resources}

@app.post("/emotional-feedback")
async def get_emotional_feedback(request: FeedbackRequest):
    """Get AI feedback for emotion journal"""
    try:
        # Create emotion text from input
        emotion_text = f"I'm feeling {request.emotion}." if request.emotion else "I haven't identified a specific emotion yet."
        
        # Generate mock response if in development mode
        if DEV_MODE:
            print("DEV MODE: Using mock response for emotional-feedback endpoint")
            if request.emotion:
                feedback_responses = {
                    "happy": "Your happiness while reading this resource can help you absorb the content more deeply. Notice what specifically brings you joy.",
                    "sad": "It's okay to feel sad. This resource might offer insights that resonate with your current emotional state.",
                    "angry": "Notice how your anger affects your reading experience. This awareness is valuable for emotional growth.",
                    "fear": "When feeling fearful, try to stay grounded as you read. Take breaks if needed to process your emotions.",
                    "neutral": "A neutral state is excellent for absorbing new information. Notice if certain passages evoke any emotions."
                }
                return {"feedback": feedback_responses.get(request.emotion.lower(), "Notice how this resource makes you feel. What emotions arise as you engage with it?")}
            else:
                return {"feedback": "Try identifying your emotions as you experience them while reading. This is the first step toward emotional intelligence."}
                
        # Prepare request for OpenRouter
        messages = [
            {
                "role": "system",
                "content": "You are an emotional intelligence coach providing brief, supportive feedback to users. Keep responses under 150 characters."
            },
            {
                "role": "user",
                "content": f"I'm reading \"{request.resource_title}\". {emotion_text} What feedback can you provide?"
            }
        ]
        
        # Make request to OpenRouter
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "HTTP-Referer": "https://mindmate-app.com"
            }
            
            payload = {
                "model": QWEN_3_MODEL,
                "messages": messages,
                "max_tokens": 300,
                "temperature": 0.7,
            }
            
            print(f"Making request to OpenRouter API with model: {QWEN_3_MODEL}")
            
            try:
                response = await client.post(
                    OPENROUTER_API_URL,
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                
                # Handle non-200 responses
                if response.status_code != 200:
                    error_detail = "Unknown error"
                    try:
                        error_json = response.json()
                        error_detail = str(error_json)
                    except:
                        error_detail = response.text[:100]
                    
                    print(f"OpenRouter API error: Status {response.status_code}, Details: {error_detail}")
                    # Return a graceful fallback response instead of raising an exception
                    return {"feedback": "I notice you're reading about this topic. Consider how it connects to your own experiences and emotions."}
                
                # Process successful response
                result = response.json()
                feedback = result["choices"][0]["message"]["content"]
                
                return {"feedback": feedback}
            except httpx.TimeoutException:
                print("OpenRouter API request timed out")
                return {"feedback": "As you read, pay attention to how your body responds. Your physical reactions can provide insights into your emotional state."}
                
    except Exception as e:
        print(f"Error processing request: {e}")
        return {"feedback": "Try identifying your emotions as you experience them - this is the first step toward emotional intelligence."}

@app.post("/summarize")
async def summarize_text(request: SummaryRequest):
    """Generate a concise summary of the provided text"""
    if not request.text or len(request.text) < 100:
        return {"summary": request.text}
    
    # If text is already shorter than max_length, return it as is
    if len(request.text) <= request.max_length:
        return {"summary": request.text}
    
    try:
        messages = [
            {
                "role": "system",
                "content": f"You are an AI assistant that creates concise, clear summaries of text. Create a summary of no more than {request.max_length} characters. Focus on key points and emotional insights."
            },
            {
                "role": "user",
                "content": f"Summarize this text into a single coherent paragraph:\n\n{request.text}"
            }
        ]
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://mindmate-app.com"
                },
                json={
                    "model": QWEN_3_MODEL,
                    "messages": messages,
                    "max_tokens": 500,
                    "temperature": 0.7,
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, 
                                  detail=f"OpenRouter API error: {response.status_code}")
                
            result = response.json()
            summary = result["choices"][0]["message"]["content"].strip()
            
            # Ensure the summary is under max_length
            if len(summary) > request.max_length:
                summary = summary[:request.max_length - 3] + "..."
                
            return {"summary": summary}
                
    except Exception as e:
        print(f"Error processing summary request: {e}")
        # For summary, we'll just return a truncated version of the original
        return {"summary": request.text[:request.max_length - 3] + "..."}

@app.post("/openrouter/personalized-recommendations")
async def get_personalized_recommendations(request: dict):
    """Get personalized recommendations based on emotion and context"""
    try:
        emotion = request.get("emotion", "neutral").lower()
        context = request.get("context", "")
        
        # Create personalized recommendation prompt
        messages = [
            {
                "role": "system",
                "content": "You are an AI wellness coach. Provide 3-5 personalized, actionable recommendations based on the user's current emotion and context. Format your response as a JSON array of objects with 'title', 'type' (exercise/meditation/article/video/social), and 'duration' fields."
            },
            {
                "role": "user",
                "content": f"I'm feeling {emotion}. {context if context else ''} What specific activities or resources would help me right now?"
            }
        ]
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://mindmate-app.com"
                },
                json={
                    "model": QWEN_3_MODEL,
                    "messages": messages,
                    "max_tokens": 500,
                    "temperature": 0.7,
                    "response_format": {"type": "json_object"}
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, 
                                   detail=f"OpenRouter API error: {response.status_code}")
            
            result = response.json()
            content = result["choices"][0]["message"][content]
            
            try:
                # Parse JSON response
                recommendations = json.loads(content)
                return {"recommendations": recommendations}
            except json.JSONDecodeError:
                # Fallback to structured response
                fallback_recommendations = get_fallback_recommendations(emotion)
                return {"recommendations": fallback_recommendations}
                
    except Exception as e:
        print(f"Error getting personalized recommendations: {e}")
        # Return fallback recommendations
        fallback_recommendations = get_fallback_recommendations(emotion)
        return {"recommendations": fallback_recommendations}

def get_fallback_recommendations(emotion: str) -> list:
    """Provide fallback recommendations when API fails"""
    fallback_data = {
        "happy": [
            {"title": "Practice gratitude journaling", "type": "exercise", "duration": "10 min"},
            {"title": "Share your joy with others", "type": "social", "duration": "15 min"},
            {"title": "Engage in creative activities", "type": "activity", "duration": "20 min"}
        ],
        "sad": [
            {"title": "Practice self-compassion meditation", "type": "meditation", "duration": "10 min"},
            {"title": "Connect with a supportive friend", "type": "social", "duration": "15 min"},
            {"title": "Gentle physical exercise", "type": "exercise", "duration": "15 min"}
        ],
        "angry": [
            {"title": "Deep breathing exercises", "type": "exercise", "duration": "5 min"},
            {"title": "Progressive muscle relaxation", "type": "exercise", "duration": "10 min"},
            {"title": "Take a mindful walk", "type": "activity", "duration": "20 min"}
        ],
        "anxious": [
            {"title": "Grounding techniques", "type": "exercise", "duration": "5 min"},
            {"title": "Mindfulness meditation", "type": "meditation", "duration": "10 min"},
            {"title": "Write down your worries", "type": "activity", "duration": "15 min"}
        ],
        "neutral": [
            {"title": "Explore new interests", "type": "activity", "duration": "15 min"},
            {"title": "Practice mindfulness", "type": "meditation", "duration": "10 min"},
            {"title": "Set small goals", "type": "activity", "duration": "10 min"}
        ]
    }
    
    return fallback_data.get(emotion.lower(), fallback_data["neutral"])

@app.post("/generate-journal-prompt")
async def generate_journal_prompt(request: JournalPromptRequest):
    """Generate a personalized journal prompt based on the user's emotional state and context"""
    try:
        emotion_context = f"I'm feeling {request.emotion}." if request.emotion else ""
        situation_context = f"Current context: {request.context}" if request.context else ""
        
        # Include previous entries for continuity if available
        previous_context = ""
        if request.previous_entries and len(request.previous_entries) > 0:
            entries_text = "\n\n".join(request.previous_entries[-3:])  # Use last 3 entries
            previous_context = f"My recent journal entries:\n{entries_text}"
        
        messages = [
            {
                "role": "system",
                "content": """You are an AI journaling coach that creates personalized, thoughtful journal prompts.
                Create prompts that are specific, actionable, and promote emotional intelligence and self-reflection.
                Your prompts should help users explore their feelings deeper, identify patterns, and develop healthy coping mechanisms.
                Keep your prompts between 2-4 sentences, phrased as gentle questions or reflective exercises."""
            },
            {
                "role": "user",
                "content": f"{emotion_context}\n{situation_context}\n{previous_context}\n\nPlease create a personalized journal prompt for me based on this information."
            }
        ]
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://mindmate-app.com"
                },
                json={
                    "model": QWEN_3_MODEL,
                    "messages": messages,
                    "max_tokens": 350,
                    "temperature": 0.8,  # Slightly more creative
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, 
                                  detail=f"OpenRouter API error: {response.status_code}")
                
            result = response.json()
            prompt = result["choices"][0]["message"]["content"].strip()
            
            # Generate a follow-up prompt for deeper reflection
            follow_up_messages = [
                {
                    "role": "system",
                    "content": """Create a brief follow-up question that encourages deeper emotional reflection.
                    This should be a single question that builds on the main prompt."""
                },
                {
                    "role": "user",
                    "content": f"Main journal prompt: {prompt}\nEmotion: {request.emotion or 'unknown'}\nCreate a follow-up question."
                }
            ]
            
            follow_up_response = await client.post(
                OPENROUTER_API_URL,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://mindmate-app.com"
                },
                json={
                    "model": QWEN_3_MODEL,
                    "messages": follow_up_messages,
                    "max_tokens": 150,
                    "temperature": 0.7,
                }
            )
            
            follow_up = follow_up_response.json()["choices"][0]["message"]["content"].strip()
                
            return {
                "prompt": prompt,
                "follow_up": follow_up,
                "emotion": request.emotion or "neutral"
            }
                
    except Exception as e:
        print(f"Error generating journal prompt: {e}")
        # Fallback prompts based on emotional categories
        fallback_prompts = {
            "joy": "What brought you joy today? How can you create more moments like this in your life?",
            "sadness": "What feels heavy in your heart right now? What would offer you comfort in this moment?",
            "anger": "What boundary might have been crossed? How could you address this situation constructively?",
            "fear": "What uncertainties are you facing? What has helped you navigate difficult situations in the past?",
            "surprise": "What unexpected event occurred? How did it challenge your expectations?",
            "love": "Who or what are you feeling connected to? How does this connection nurture you?",
            "neutral": "What patterns have you noticed in your thoughts or behaviors lately? What might they be telling you?"
        }
        
        emotion = request.emotion or "neutral"
        return {
            "prompt": fallback_prompts.get(emotion, fallback_prompts["neutral"]),
            "follow_up": "How does reflecting on this make you feel in your body?",
            "emotion": emotion
        }

@app.post("/emotion-analysis")
async def analyze_emotion(request: EmotionAnalysisRequest):
    """Analyze emotions in text and provide actionable insights"""
    if not request.text or len(request.text.strip()) < 10:
        return {
            "primary_emotion": "neutral",
            "secondary_emotions": [],
            "insights": "Please provide more text for a meaningful analysis.",
            "suggestions": []
        }
    
    try:
        # Include user history for more personalized analysis if available
        history_context = ""
        if request.user_history and len(request.user_history) > 0:
            history_entries = "\n".join([
                f"- {entry.get('date', 'Previous entry')}: Emotion: {entry.get('emotion', 'unknown')}, Notes: {entry.get('text', 'No text')[:100]}..."
                for entry in request.user_history[-3:]  # Use last 3 entries
            ])
            history_context = f"\nRecent emotional history:\n{history_entries}"
        
        messages = [
            {
                "role": "system",
                "content": """You are an emotional intelligence AI that performs deep analysis of emotions in text.
                Identify both primary and secondary emotions, provide insights about emotional patterns, and suggest 
                constructive ways to process these emotions. Output in JSON format with these fields:
                1. primary_emotion (string): The dominant emotion
                2. secondary_emotions (array of strings): Other emotions present
                3. intensity (number 1-10): How intensely the emotions are expressed
                4. insights (string): Thoughtful analysis of the emotional state
                5. suggestions (array of strings): 2-3 constructive actions to process these emotions"""
            },
            {
                "role": "user",
                "content": f"Analyze the emotions in this text:\n\n{request.text}{history_context}"
            }
        ]
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://mindmate-app.com"
                },
                json={
                    "model": QWEN_3_MODEL,
                    "messages": messages,
                    "max_tokens": 800,
                    "temperature": 0.7,
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, 
                                  detail=f"OpenRouter API error: {response.status_code}")
                
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            # Extract JSON from the response
            try:
                # Try various ways to extract the JSON
                if "```json" in content:
                    json_str = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    json_str = content.split("```")[1].strip()
                elif "{" in content and "}" in content:
                    # Extract between first { and last }
                    start = content.find("{")
                    end = content.rfind("}") + 1
                    json_str = content[start:end].strip()
                else:
                    json_str = content
                
                analysis_result = json.loads(json_str)
                return analysis_result
                
            except Exception as e:
                print(f"Error parsing JSON from emotion analysis: {e}")
                print(f"Original content: {content}")
                
                # Attempt to extract structured information even if JSON parsing fails
                primary = "neutral"
                for emotion in ["joy", "sadness", "anger", "fear", "surprise", "love", "neutral"]:
                    if emotion in content.lower():
                        primary = emotion
                        break
                
                return {
                    "primary_emotion": primary,
                    "secondary_emotions": [],
                    "intensity": 5,
                    "insights": "I noticed some emotional content in your text, but couldn't perform a full analysis.",
                    "suggestions": [
                        "Try describing your feelings in more detail",
                        "Consider what specific events triggered these emotions",
                        "Reflect on how these emotions affect your body"
                    ]
                }
                
    except Exception as e:
        print(f"Error analyzing emotions: {e}")
        return {
            "primary_emotion": "neutral",
            "secondary_emotions": [],
            "intensity": 5,
            "insights": "An error occurred during emotion analysis.",
            "suggestions": [
                "Try again with a different description",
                "Consider journaling about your emotions in more detail",
                "Practice mindful awareness of your emotional state"
            ]
        }

@app.post("/guided-reflection")
async def guided_reflection(request: GuidedReflectionRequest):
    """Generate a guided reflection exercise based on the user's emotional state"""
    try:
        # Build context from available information
        emotion_context = f"I'm feeling {request.emotion} at an intensity of {request.intensity}/10."
        situation_context = f"The situation: {request.situation}" if request.situation else ""
        
        goals_context = ""
        if request.goals and len(request.goals) > 0:
            goals_list = "\n".join([f"- {goal}" for goal in request.goals])
            goals_context = f"My goals:\n{goals_list}"
        
        messages = [
            {
                "role": "system",
                "content": """You are an emotional intelligence coach specializing in guided reflections.
                Create a structured, step-by-step reflection exercise to help users process their emotions and develop insight.
                The reflection should include:
                1. A brief introduction acknowledging the emotion
                2. 3-5 specific reflection questions that build on each other
                3. A mindfulness or grounding exercise relevant to the emotion
                4. A closing thought that's hopeful but realistic
                
                Your tone should be warm, non-judgmental, and empowering. Focus on helping the user understand their emotions,
                not merely control or suppress them."""
            },
            {
                "role": "user",
                "content": f"{emotion_context}\n{situation_context}\n{goals_context}\n\nPlease create a guided reflection exercise for this emotional state."
            }
        ]
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://mindmate-app.com"
                },
                json={
                    "model": QWEN_3_MODEL,
                    "messages": messages,
                    "max_tokens": 1000,
                    "temperature": 0.7,
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, 
                                  detail=f"OpenRouter API error: {response.status_code}")
                
            result = response.json()
            reflection_text = result["choices"][0]["message"]["content"].strip()
            
            # Try to parse the reflection into structured sections
            try:
                sections = {}
                
                # Look for section headers
                intro_match = reflection_text.split("\n\n")[0]
                sections["introduction"] = intro_match
                
                # Try to extract questions
                questions = []
                for line in reflection_text.split("\n"):
                    line = line.strip()
                    if line.endswith("?") and len(line) > 10:
                        questions.append(line)
                
                if len(questions) == 0:  # Fallback if no questions with ? found
                    question_markers = ["Question 1", "Question 2", "First", "Second", "Next", "Finally", "Step 1", "Step 2"]
                    for line in reflection_text.split("\n"):
                        for marker in question_markers:
                            if marker in line and len(line) > len(marker) + 5:
                                questions.append(line.strip())
                                break
                
                sections["questions"] = questions[:5]  # Limit to 5 questions
                
                # Look for mindfulness exercise
                mindfulness_markers = ["mindful", "grounding", "breathing", "exercise", "practice"]
                mindfulness_lines = []
                capture_mindfulness = False
                
                for line in reflection_text.split("\n"):
                    line_lower = line.lower()
                    
                    if any(marker in line_lower for marker in mindfulness_markers) and not capture_mindfulness:
                        capture_mindfulness = True
                        mindfulness_lines.append(line.strip())
                    elif capture_mindfulness and line.strip():
                        mindfulness_lines.append(line.strip())
                    elif capture_mindfulness and not line.strip():
                        capture_mindfulness = False
                
                sections["mindfulness_exercise"] = " ".join(mindfulness_lines)
                
                # Extract closing thought
                closing_markers = ["closing", "finally", "remember", "in summary", "to conclude"]
                for i in range(len(reflection_text.split("\n")) - 1, 0, -1):
                    line = reflection_text.split("\n")[i]
                    if line.strip() and any(marker in line.lower() for marker in closing_markers):
                        sections["closing_thought"] = line.strip()
                        break
                
                # If we didn't find a closing thought, use the last non-empty line
                if "closing_thought" not in sections:
                    for line in reversed(reflection_text.split("\n")):
                        if line.strip():
                            sections["closing_thought"] = line.strip()
                            break
                
                return {
                    "full_reflection": reflection_text,
                    "structured_reflection": sections,
                    "emotion": request.emotion,
                    "intensity": request.intensity
                }
                
            except Exception as e:
                print(f"Error parsing reflection into sections: {e}")
                # Return the full text if parsing fails
                return {
                    "full_reflection": reflection_text,
                    "emotion": request.emotion,
                    "intensity": request.intensity
                }
                
    except Exception as e:
        print(f"Error generating guided reflection: {e}")
        
        # Fallback reflection based on emotion
        emotion = request.emotion.lower()
        intensity = request.intensity
        
        # Simple fallback reflection templates
        if emotion in ["anger", "frustration"]:
            reflection = "Take a moment to notice your anger without judgment. Where do you feel it in your body? What triggered this feeling? Remember that anger often masks other emotions like hurt or fear. What boundaries might need protection? Take three deep breaths, focusing on a slow exhale."
        elif emotion in ["sadness", "grief"]:
            reflection = "Honor your sadness as a natural response. What loss or disappointment are you processing? Allow yourself to feel this emotion fully, without rushing to fix it. What would offer you comfort right now? Place a hand on your heart and breathe gently, acknowledging your feelings with compassion."
        elif emotion in ["anxiety", "fear"]:
            reflection = "Notice the anxious feelings in your body. What specific worries are present in your mind? Challenge catastrophic thinking by asking: What's most likely to happen? What resources do you have to cope? Ground yourself by naming 5 things you can see, 4 things you can touch, 3 things you can hear, 2 things you can smell, and 1 thing you can taste."
        elif emotion in ["joy", "happiness"]:
            reflection = "Savor this feeling of joy. What specifically brought you this happiness? How can you fully appreciate this moment? Consider how you might create more experiences like this. Take a few moments to express gratitude for this positive emotion, letting it fill your awareness completely."
        else:
            reflection = f"Take a moment to sit with your feelings of {emotion}. What thoughts accompany this emotion? How is your body responding? Consider what this emotion might be telling you about your needs or values. Take several deep breaths, allowing yourself to acknowledge this feeling without judgment."
        
        return {
            "full_reflection": reflection,
            "emotion": emotion,
            "intensity": intensity
        }

@app.post("/emotion-progression-analysis")
async def analyze_emotion_progression(request: EmotionProgressionRequest):
    """Analyze emotional progression over time and provide insights on patterns and growth opportunities"""
    if not request.emotion_history or len(request.emotion_history) < 3:
        return {
            "patterns": [],
            "insights": "Please provide at least 3 emotion entries for meaningful pattern analysis.",
            "growth_opportunities": [],
            "emotional_journey": {}
        }
    
    try:
        # Format the emotional history data for the AI
        formatted_history = "\n".join([
            f"- Date: {entry.get('date', 'Unknown')}, Emotion: {entry.get('emotion', 'neutral')}, " +
            f"Intensity: {entry.get('intensity', 5)}, Notes: {entry.get('text', '')[:50]}..."
            for entry in request.emotion_history
        ])
        
        messages = [
            {
                "role": "system",
                "content": """You are an emotional intelligence AI specialized in analyzing emotional patterns over time.
                Identify recurring emotional patterns, provide insights on emotional growth, and suggest personalized
                opportunities for further emotional development. Output in JSON format with these fields:
                1. patterns (array of objects): Identified emotional patterns with description and frequency
                2. insights (string): Thoughtful analysis of the emotional journey
                3. growth_opportunities (array of strings): 2-3 personalized suggestions for emotional growth
                4. emotional_journey (object): Summary of emotional progression with categories:
                   - improved_areas (array of strings): Emotions showing positive change
                   - challenge_areas (array of strings): Emotions that may need more attention
                   - stability (array of strings): Emotions that remain consistent"""
            },
            {
                "role": "user",
                "content": f"Analyze my emotional progression over this {request.time_period}:\n\n{formatted_history}\n\nCurrent emotion: {request.current_emotion or 'Unknown'}"
            }
        ]
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://mindmate-app.com"
                },
                json={
                    "model": QWEN_3_MODEL,
                    "messages": messages,
                    "max_tokens": 1000,
                    "temperature": 0.7,
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, 
                                  detail=f"OpenRouter API error: {response.status_code}")
                
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            # Extract JSON from the response
            try:
                # Try various ways to extract the JSON
                if "```json" in content:
                    json_str = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    json_str = content.split("```")[1].strip()
                elif "{" in content and "}" in content:
                    # Extract between first { and last }
                    start = content.find("{")
                    end = content.rfind("}") + 1
                    json_str = content[start:end].strip()
                else:
                    json_str = content
                
                analysis_result = json.loads(json_str)
                return analysis_result
                
            except Exception as e:
                print(f"Error parsing JSON from progression analysis: {e}")
                print(f"Original content: {content}")
                
                # Fallback response if JSON parsing fails
                return {
                    "patterns": [
                        {"description": "Unable to identify specific patterns", "frequency": "unknown"}
                    ],
                    "insights": "I analyzed your emotional entries but couldn't structure the results properly. The data suggests some emotional variability over time.",
                    "growth_opportunities": [
                        "Continue tracking your emotions regularly",
                        "Look for connections between emotions and specific situations",
                        "Practice mindful awareness of emotional transitions"
                    ],
                    "emotional_journey": {
                        "improved_areas": [],
                        "challenge_areas": [],
                        "stability": ["mixed emotional states"]
                    }
                }
                
    except Exception as e:
        print(f"Error analyzing emotion progression: {e}")
        return {
            "patterns": [],
            "insights": "An error occurred during progression analysis.",
            "growth_opportunities": [
                "Continue your emotional tracking practice",
                "Try journaling about your emotions in more detail",
                "Consider reviewing your emotional patterns yourself"
            ],
            "emotional_journey": {
                "improved_areas": [],
                "challenge_areas": [],
                "stability": []
            }
        }

@app.post("/personalized-mindfulness")
async def generate_mindfulness_exercise(request: MindfulnessExerciseRequest):
    """Generate a personalized mindfulness exercise based on the user's emotional state and preferences"""
    try:
        # Build context from available information
        emotion_context = f"I'm feeling {request.emotion} at an intensity of {request.intensity}/10."
        duration_context = f"I have {request.duration} minutes available for this exercise."
        type_context = f"I prefer {request.exercise_type} exercises." if request.exercise_type else ""
        
        preferences_context = ""
        if request.preferences and len(request.preferences) > 0:
            prefs_list = "\n".join([f"- {pref}" for pref in request.preferences])
            preferences_context = f"My preferences:\n{prefs_list}"
        
        messages = [
            {
                "role": "system",
                "content": """You are a mindfulness coach specialized in creating personalized exercises tailored to specific emotional states.
                Create a clear, step-by-step mindfulness exercise that addresses the user's current emotion and preferences.
                The exercise should include:
                1. A brief introduction explaining the purpose of the exercise
                2. Preparation instructions (posture, environment, etc.)
                3. Detailed step-by-step guidance with precise timing
                4. Clear breathing or attention instructions
                5. A gentle conclusion
                
                Also include a "benefits" section explaining how this exercise particularly helps with the specified emotion.
                Format your response as JSON with these fields:
                1. title (string): A descriptive title for the exercise
                2. introduction (string): Brief purpose explanation
                3. preparation (array of strings): Setup steps
                4. steps (array of objects): Each with "instruction" and "duration_seconds" fields
                5. conclusion (string): Gentle closing guidance
                6. benefits (array of strings): How this helps with the specific emotion
                7. total_duration_minutes (number): The total exercise time"""
            },
            {
                "role": "user",
                "content": f"{emotion_context}\n{duration_context}\n{type_context}\n{preferences_context}\n\nPlease create a personalized mindfulness exercise for this emotional state."
            }
        ]
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://mindmate-app.com"
                },
                json={
                    "model": QWEN_3_MODEL,
                    "messages": messages,
                    "max_tokens": 1000,
                    "temperature": 0.7,
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, 
                                  detail=f"OpenRouter API error: {response.status_code}")
                
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            # Extract JSON from the response
            try:
                # Try various ways to extract the JSON
                if "```json" in content:
                    json_str = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    json_str = content.split("```")[1].strip()
                elif "{" in content and "}" in content:
                    # Extract between first { and last }
                    start = content.find("{")
                    end = content.rfind("}") + 1
                    json_str = content[start:end].strip()
                else:
                    json_str = content
                
                exercise = json.loads(json_str)
                
                # Validate the exercise duration
                if "total_duration_minutes" in exercise:
                    # Ensure the duration is reasonably close to what was requested
                    if abs(exercise["total_duration_minutes"] - request.duration) > 5:
                        exercise["total_duration_minutes"] = request.duration
                        
                        # Adjust step durations proportionally if they exist
                        if "steps" in exercise and exercise["steps"]:
                            total_step_seconds = sum(step.get("duration_seconds", 30) for step in exercise["steps"])
                            target_seconds = request.duration * 60
                            
                            if total_step_seconds > 0:
                                ratio = target_seconds / total_step_seconds
                                for step in exercise["steps"]:
                                    if "duration_seconds" in step:
                                        step["duration_seconds"] = int(step["duration_seconds"] * ratio)
                
                return exercise
                
            except Exception as e:
                print(f"Error parsing JSON from mindfulness exercise: {e}")
                print(f"Original content: {content}")
                
                # Generate a simple fallback exercise if JSON parsing fails
                return generate_fallback_mindfulness_exercise(request)
                
    except Exception as e:
        print(f"Error generating mindfulness exercise: {e}")
        return generate_fallback_mindfulness_exercise(request)

def generate_fallback_mindfulness_exercise(request):
    """Generate a simple fallback mindfulness exercise if the main generation fails"""
    emotion = request.emotion.lower()
    duration = request.duration
    
    # Basic step durations for a simple exercise
    intro_time = 30
    main_time = (duration * 60) - (intro_time + 30)  # Main exercise minus intro and conclusion
    step_time = main_time // 3  # Divide main exercise into 3 steps
    
    # Simple structure for different emotions
    if emotion in ["anxiety", "fear", "stress"]:
        return {
            "title": "Calming Breath Awareness",
            "introduction": "This exercise will help reduce feelings of anxiety through focused breathing.",
            "preparation": [
                "Find a comfortable seated position",
                "Close your eyes or keep a soft gaze",
                "Place your hands on your knees or lap"
            ],
            "steps": [
                {
                    "instruction": "Take a deep breath in through your nose for 4 counts, hold for 2, then exhale through your mouth for 6 counts.",
                    "duration_seconds": step_time
                },
                {
                    "instruction": "Place one hand on your chest and one on your belly. Focus on breathing deeply into your belly, watching your hand rise and fall.",
                    "duration_seconds": step_time  
                },
                {
                    "instruction": "With each exhale, silently say the word 'calm' or 'peace' to yourself.",
                    "duration_seconds": step_time
                }
            ],
            "conclusion": "Slowly bring your awareness back to the room. Take a few more deep breaths and when you're ready, gently open your eyes.",
            "benefits": [
                "Activates the parasympathetic nervous system to reduce anxiety",
                "Brings attention away from racing thoughts",
                "Creates a sense of safety and control"
            ],
            "total_duration_minutes": duration
        }
    elif emotion in ["sadness", "grief", "depression"]:
        return {
            "title": "Self-Compassion Meditation",
            "introduction": "This practice offers gentle support for feelings of sadness through self-compassion.",
            "preparation": [
                "Find a comfortable position sitting or lying down",
                "Place a hand on your heart if this feels supportive",
                "Take a few deep breaths to settle in"
            ],
            "steps": [
                {
                    "instruction": "Notice where you feel sadness in your body. Observe the sensations with kindness and without judgment.",
                    "duration_seconds": step_time
                },
                {
                    "instruction": "Silently repeat: 'This is a moment of difficulty. Suffering is part of life. May I be kind to myself.'",
                    "duration_seconds": step_time
                },
                {
                    "instruction": "Imagine sending warmth and care to the part of you that feels sad, as you would to a dear friend.",
                    "duration_seconds": step_time
                }
            ],
            "conclusion": "Slowly bring your awareness back to your surroundings. Be gentle with yourself as you transition back to your day.",
            "benefits": [
                "Reduces isolation often felt during sadness",
                "Cultivates self-kindness when you need it most",
                "Helps process emotions without becoming overwhelmed"
            ],
            "total_duration_minutes": duration
        }
    else:
        # Generic mindfulness for other emotions
        return {
            "title": "Present Moment Awareness",
            "introduction": f"This mindfulness practice will help you work with your feelings of {emotion} through present-moment awareness.",
            "preparation": [
                "Find a comfortable seated position with your back supported",
                "Rest your hands on your lap or knees",
                "Lower or close your eyes if comfortable"
            ],
            "steps": [
                {
                    "instruction": "Bring awareness to your breathing. Don't change it, just notice the natural rhythm of your breath.",
                    "duration_seconds": step_time
                },
                {
                    "instruction": "Scan through your body, noticing any sensations associated with your current emotions.",
                    "duration_seconds": step_time
                },
                {
                    "instruction": "With each breath, silently say 'breathing in, I acknowledge my feelings; breathing out, I give them space.'",
                    "duration_seconds": step_time
                }
            ],
            "conclusion": "Gradually widen your awareness to include the sounds in the room. When you're ready, slowly open your eyes.",
            "benefits": [
                "Creates space between you and your emotions",
                "Develops emotional awareness without judgment",
                "Builds resilience for working with difficult feelings"
            ],
            "total_duration_minutes": duration
        }

@app.post("/wellness-assistant")
async def wellness_assistant(request: WellnessAssistantRequest):
    """AI wellness assistant chatbot that provides personalized wellness advice"""
    if not request.messages or len(request.messages) == 0:
        raise HTTPException(status_code=400, detail="No messages provided")
    
    try:
        # Use mock responses in development mode
        if DEV_MODE:
            print("DEV MODE: Using mock response for wellness-assistant endpoint")
            # Get the last message from the user
            last_message = next((msg for msg in reversed(request.messages) if msg.get("role") == "user"), None)
            user_input = last_message.get("content", "") if last_message else ""
            
            # Emotion-aware responses
            if request.current_emotion:
                emotion_responses = {
                    "joy": "I'm glad you're feeling joy! This positive state is perfect for exploring new wellness practices. How can I help you maintain this positive energy?",
                    "sadness": "I understand you're feeling sad. It's important to be gentle with yourself during these times. Would you like some resources that might provide comfort?",
                    "anger": "I notice you're feeling angry. This emotion often contains important information about boundaries or needs. What support would feel helpful right now?",
                    "fear": "I see you're experiencing fear. Taking slow, deep breaths can help regulate your nervous system. Would you like some grounding techniques?",
                    "neutral": "How can I help you with your wellness journey today? I'm here to provide resources and support."
                }
                
                # Check if the user input contains key phrases
                if "resources" in user_input.lower():
                    return {"message": f"I'd be happy to suggest resources aligned with your current {request.current_emotion} state. Would you prefer meditation exercises, reading materials, or physical activities?", "model_used": request.ai_model}
                elif "meditation" in user_input.lower():
                    return {"message": "Meditation can be very beneficial. For your current emotional state, I suggest a focused breathing practice or a guided body scan. Would you like specific instructions?", "model_used": request.ai_model}
                else:
                    # Default response based on emotion
                    return {"message": emotion_responses.get(request.current_emotion, emotion_responses["neutral"]), "model_used": request.ai_model}
            
            # Generic responses if no emotion is provided
            if "hello" in user_input.lower() or "hi" in user_input.lower():
                return {"message": "Hello! I'm your wellness assistant. How can I support your emotional wellbeing today?", "model_used": request.ai_model}
            elif "resources" in user_input.lower():
                return {"message": "I can suggest several types of resources: guided meditations, journaling exercises, physical activities, or support groups. Which would be most helpful for you?"}
            elif "stress" in user_input.lower() or "anxiety" in user_input.lower():
                return {"message": "For stress and anxiety, I recommend deep breathing exercises, progressive muscle relaxation, or mindful walking. Would you like me to explain any of these in more detail?"}
            elif "sad" in user_input.lower() or "depression" in user_input.lower():
                return {"message": "I'm sorry you're feeling this way. Regular physical activity, maintaining connections, and self-compassion practices can help. Would you like specific resources for managing sadness?"}
            elif "sleep" in user_input.lower():
                return {"message": "Sleep is crucial for emotional wellbeing. I suggest establishing a calming bedtime routine, limiting screen time before bed, and creating a comfortable sleep environment. Need more specific advice?"}
            else:
                return {"message": "I'm here to support your emotional wellbeing. Would you like resources for stress management, mood improvement, better sleep, or healthy relationships?"}
            
        # In production mode, use OpenRouter API
        # Choose the appropriate AI model based on request
        model_mapping = {
            "qwen": "openai/gpt-3.5-turbo",
            "deepseek": "deepseek/deepseek-chat",
            "mixtral": "mistralai/mixtral-8x7b-instruct"
        }
        
        selected_model = model_mapping.get(request.ai_model.lower(), QWEN_3_MODEL)
        
        # Prepare the system message based on emotional state
        emotion_context = ""
        if request.current_emotion:
            emotion_context = f"The user is currently feeling {request.current_emotion}."
        
        system_message = {
            "role": "system",
            "content": f"""You are an empathetic wellness assistant named MindMate. {emotion_context}
            Your job is to help users find appropriate mental wellness resources and activities based on their needs and emotional state.
            Keep responses positive, supportive, and concise (under 120 words).
            Suggest specific wellness activities or resource types when appropriate.
            Be conversational and caring, but focus on actionable advice for emotional wellbeing."""
        }
        
        # Prepare all messages, ensuring we only take the last 10 messages to avoid token limits
        formatted_messages = [system_message] + request.messages[-10:]
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://mindmate-app.com"
                },
                json={
                    "model": selected_model,
                    "messages": formatted_messages,
                    "max_tokens": 300,
                    "temperature": 0.7,
                }
            )
            
            if response.status_code != 200:
                error_detail = "Unknown error"
                try:
                    error_json = response.json()
                    error_detail = str(error_json)
                except:
                    error_detail = response.text[:100]
                
                print(f"OpenRouter API error: Status {response.status_code}, Details: {error_detail}")
                
                # For development purposes, return more detailed error information
                if response.status_code == 401:
                    print("Authentication error - check your OpenRouter API key")
                    return {
                        "message": "I'm having trouble connecting to my knowledge base due to an authentication issue. Please try again later."
                    }
                elif response.status_code == 429:
                    print("Rate limit exceeded - OpenRouter API rate limit reached")
                    return {
                        "message": "I've been thinking too much lately! Please give me a moment to rest before asking another question."
                    }
                
                # Return a graceful error message instead of raising an exception
                return {
                    "message": "I'm currently having trouble accessing my knowledge. Let me provide some general wellness advice: regular exercise, adequate sleep, mindfulness practices, and social connection are fundamental to emotional wellbeing. How can I help you with any of these areas?",
                    "model_used": "fallback"
                }
                
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            
            return {
                "message": content,
                "model_used": selected_model
            }
                
    except Exception as e:
        print(f"Error processing wellness assistant request: {e}")
        # Provide a fallback response instead of an error
        return {
            "message": "I'm currently having trouble accessing my knowledge. Let me provide some general wellness advice: regular exercise, adequate sleep, mindfulness practices, and social connection are fundamental to emotional wellbeing. How can I help you with any of these areas?",
            "model_used": "fallback"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)