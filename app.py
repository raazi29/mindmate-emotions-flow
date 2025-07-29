from fastapi import FastAPI, HTTPException
import httpx

app = FastAPI()

# Update the model to a safer option
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
QWEN_3_MODEL = "openai/gpt-3.5-turbo"  # Changed from qwen/qwen1.5-72b-chat to a more common model

@app.post("/emotional-feedback")
async def get_emotional_feedback(request: FeedbackRequest):
    """Get AI feedback for emotion journal"""
    try:
        emotion_text = f"I'm feeling {request.emotion}." if request.emotion else "I haven't identified a specific emotion yet."
        
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
                
                if response.status_code != 200:
                    error_detail = "Unknown error"
                    try:
                        error_json = response.json()
                        error_detail = str(error_json)
                    except:
                        error_detail = response.text[:100]
                    
                    print(f"OpenRouter API error: Status {response.status_code}, Details: {error_detail}")
                    raise HTTPException(status_code=response.status_code, 
                                      detail=f"OpenRouter API error: {response.status_code}")
                
                result = response.json()
                feedback = result["choices"][0]["message"]["content"]
                
                return {"feedback": feedback}
            except httpx.TimeoutException:
                print("OpenRouter API request timed out")
                raise HTTPException(status_code=504, detail="API request timed out")
                
    except Exception as e:
        print(f"Error processing request: {e}")
        return {"feedback": "Try identifying your emotions as you experience them - this is the first step toward emotional intelligence."} 