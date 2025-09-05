// OpenRouter API utilities for Qwen 3 integration
// Direct implementation without backend dependency

// OpenRouter configuration via environment variables
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
// Allow overriding model from env; ship a widely-available 2025 default
const OPENROUTER_MODEL = import.meta.env.VITE_OPENROUTER_MODEL || "qwen/qwen2.5-7b-instruct";

// Detect emotion using Qwen 3 model directly via OpenRouter
export const detectEmotionOpenRouter = async (text: string): Promise<{ emotion: string; confidence: number; intensity?: number }> => {
  if (!text || text.trim().length < 3) {
    return { emotion: 'neutral', confidence: 0.5, intensity: 5 };
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: "system",
            content: "You are an expert in emotion detection. Analyze the provided text and identify the primary emotion. Respond with ONLY a JSON object with emotion, confidence (0-1), and intensity (1-10) properties. Choose from: joy, sadness, anger, fear, love, surprise, neutral."
          },
          {
            role: "user",
            content: text
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 100
      })
    });

    if (!response.ok) {
      console.error(`OpenRouter API error: ${response.status}`);
      return { emotion: 'neutral', confidence: 0.5, intensity: 5 };
    }

    const result = await response.json();
    
    try {
      // Extract the JSON content from the response
      const content = result.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Invalid API response format");
      }
      
      const emotionData = JSON.parse(content);
      
      return {
        emotion: emotionData.emotion || 'neutral',
        confidence: emotionData.confidence || 0.5,
        intensity: emotionData.intensity || 5
      };
    } catch (parseError) {
      console.error('Error parsing emotion detection response:', parseError);
      // Fallback to default emotion
      return { emotion: 'neutral', confidence: 0.5, intensity: 5 };
    }
  } catch (error) {
    console.error('Error calling OpenRouter API for emotion detection:', error);
    return { emotion: 'neutral', confidence: 0.5, intensity: 5 };
  }
};

// Direct implementation for personalized recommendations
export const getPersonalizedRecommendations = async (
  text: string, 
  resources: any[]
): Promise<any[]> => {
  if (!text || text.length < 5 || !resources || resources.length === 0) {
    return resources;
  }

  try {
    // First detect the emotion
    const emotionResult = await detectEmotionOpenRouter(text);
    const emotion = emotionResult.emotion;
    
    // Create a mapping of emotions to relevant resource types
    const emotionResourceMapping: Record<string, string[]> = {
      joy: ['gratitude', 'meditation', 'social'],
      sadness: ['meditation', 'exercise', 'journaling'],
      anger: ['meditation', 'exercise'],
      fear: ['meditation', 'journaling', 'exercise'],
      love: ['social', 'gratitude'],
      surprise: ['journaling', 'meditation'],
      neutral: ['meditation', 'education']
    };
    
    // Get relevant resource types for the emotion
    const relevantTypes = emotionResourceMapping[emotion] || ['meditation', 'education'];
    
    // Mark resources as recommended if they match the emotion's relevant types
    const updatedResources = resources.map(resource => {
      const isRecommended = 
        relevantTypes.includes(resource.tag) || 
        (resource.type === 'meditation' && emotion === 'anger') ||
        (resource.type === 'exercise' && (emotion === 'sadness' || emotion === 'anger')) ||
        (resource.type === 'article' && emotion === 'neutral');
        
      return {
        ...resource,
        recommended: isRecommended
      };
    });
    
    return updatedResources;
  } catch (error) {
    console.error('Error getting personalized recommendations:', error);
    return resources;
  }
};

// Get AI feedback for emotion journal - direct implementation
export const getEmotionalFeedback = async (
  selectedEmotion: string | null,
  resourceTitle: string
): Promise<string> => {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: "system",
            content: "You are an expert emotional wellness coach. Provide a short, meaningful journaling prompt."
          },
          {
            role: "user",
            content: `I'm feeling ${selectedEmotion || 'neutral'} and just reviewed a resource called "${resourceTitle}". Suggest a journaling prompt that would help me process my emotions related to this topic.`
          }
        ],
        temperature: 0.7,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      console.error(`OpenRouter API error: ${response.status}`);
      return "Reflect on how your emotions manifest in your body and what triggers them.";
    }

    const result = await response.json();
    const feedback = result.choices?.[0]?.message?.content?.trim();
    
    return feedback || "Reflect on how your emotions manifest in your body and what triggers them.";
  } catch (error) {
    console.error('Error getting emotional feedback:', error);
    return "Reflect on how your emotions manifest in your body and what triggers them.";
  }
};

// Check if OpenRouter API is available
let openRouterAvailable: boolean | null = null;
let lastCheckTime = 0;
const CHECK_INTERVAL = 30000; // Only recheck every 30 seconds

export const checkOpenRouterAvailability = async (forceCheck = false): Promise<boolean> => {
  const now = Date.now();
  
  // Return cached value if recent and not forcing a check
  if (!forceCheck && openRouterAvailable !== null && (now - lastCheckTime) < CHECK_INTERVAL) {
    return openRouterAvailable;
  }
  
  try {
    // Simple status check by making a minimal API call
    const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
      },
      // Add timeout to avoid long hanging requests
      signal: AbortSignal.timeout(3000)
    });
    
    openRouterAvailable = response.ok;
    lastCheckTime = now;
    
    if (openRouterAvailable) {
      console.log("OpenRouter API is available");
    } else {
      console.error("OpenRouter API is unavailable");
    }
    
    return openRouterAvailable;
  } catch (error) {
    console.error("OpenRouter API check failed:", error);
    openRouterAvailable = false;
    lastCheckTime = now;
    return false;
  }
};

export const getOpenRouter = (): boolean => {
  // Always return true to avoid preventing app from loading
  return true;
}; 