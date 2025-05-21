// Emotion processing service that connects to the FastAPI backend

// Use Vite's import.meta.env instead of process.env for environment detection
const API_BASE_URL = import.meta.env.PROD
  ? 'https://api.mindmate-app.com'
  : 'http://localhost:8000';

// Set API request timeout (in milliseconds) - shorter for real-time responsiveness
const API_TIMEOUT = 3000;

// Types
export type Emotion = 'joy' | 'sadness' | 'anger' | 'fear' | 'love' | 'surprise' | 'neutral';
export type SystemStatus = 'online' | 'degraded' | 'offline';

interface EmotionResult {
  emotion: Emotion;
  confidence: number;
  intensity?: number;
}

interface EmotionResponse {
  emotion: string;
  confidence: number;
  processed_time: number;
  model_used: string;
  details?: Record<string, number>;
}

interface EmotionBatchResponse {
  results: EmotionResponse[];
  total_time: number;
}

interface StatusResponse {
  status: SystemStatus;
  models_loaded: Record<string, boolean>;
  cuda_available: boolean;
  transformers_available: boolean;
}

// In-memory cache for API responses - reduce for real-time usage
const responseCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes instead of 1 hour for more real-time updates

// Event system for real-time updates
type EmotionEventListener = (emotion: EmotionResult) => void;
const emotionEventListeners: EmotionEventListener[] = [];

// Track API health
let isBackendHealthy = false;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 1000 * 30; // 30 seconds for quicker recovery

// Helper function to fetch with timeout
const fetchWithTimeout = async (url: string, options: RequestInit, timeout = API_TIMEOUT): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

// Utility function to create a normalized cache key
const createCacheKey = (text: string) => {
  // Remove extra whitespace and lowercase
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
};

// Check if the backend service is available
export const checkBackendStatus = async (): Promise<StatusResponse | null> => {
  try {
    // Use cached health status if checked recently
    const now = Date.now();
    if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
      return isBackendHealthy 
        ? { status: 'online', models_loaded: {}, cuda_available: false, transformers_available: true }
        : null;
    }
    
    const response = await fetchWithTimeout(`${API_BASE_URL}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      isBackendHealthy = false;
      lastHealthCheck = now;
      return null;
    }

    const data = await response.json();
    isBackendHealthy = true;
    lastHealthCheck = now;
    return data;
  } catch (error) {
    console.error('Error checking backend status:', error);
    isBackendHealthy = false;
    lastHealthCheck = Date.now();
    return null;
  }
};

// Register event listener for real-time emotion updates
export const onEmotionDetected = (callback: EmotionEventListener): void => {
  emotionEventListeners.push(callback);
};

// Remove event listener
export const offEmotionDetected = (callback: EmotionEventListener): void => {
  const index = emotionEventListeners.indexOf(callback);
  if (index !== -1) {
    emotionEventListeners.splice(index, 1);
  }
};

// Notify all listeners of a new emotion
const notifyEmotionListeners = (emotion: EmotionResult): void => {
  console.log(`emotionService: Notifying ${emotionEventListeners.length} listeners of emotion: ${emotion.emotion}`);
  
  if (emotionEventListeners.length === 0) {
    console.warn("emotionService: No listeners registered for emotion events");
  }
  
  emotionEventListeners.forEach(listener => {
    try {
      listener(emotion);
    } catch (error) {
      console.error('Error in emotion event listener:', error);
    }
  });
};

// Detect emotion in a text using the backend API
export const detectEmotion = async (text: string): Promise<EmotionResult> => {
  if (!text || text.trim() === '') {
    return { emotion: 'neutral', confidence: 1.0 };
  }

  // Check cache first
  const cacheKey = createCacheKey(text);
  const cachedItem = responseCache.get(cacheKey);
  
  if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_TTL) {
    const result = {
      emotion: cachedItem.data.emotion as Emotion,
      confidence: cachedItem.data.confidence,
      intensity: Math.round(cachedItem.data.confidence * 10)
    };
    
    // Even for cached results, notify listeners to ensure UI updates
    notifyEmotionListeners(result);
    
    return result;
  }

  try {
    if (!isBackendHealthy && Date.now() - lastHealthCheck > HEALTH_CHECK_INTERVAL) {
      // Try to check health if we think backend is down, but only after interval
      await checkBackendStatus();
    }
    
    if (!isBackendHealthy) {
      // If backend is unhealthy, use fallback immediately
      const fallbackResult = fallbackEmotionDetection(text);
      notifyEmotionListeners(fallbackResult);
      return fallbackResult;
    }
    
    const response = await fetchWithTimeout(`${API_BASE_URL}/detect-emotion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, model_preference: 'fast' }),
    });

    if (!response.ok) {
      isBackendHealthy = false;
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Cache the result
    responseCache.set(cacheKey, { data, timestamp: Date.now() });
    
    // Map backend response to frontend format
    const result = {
      emotion: data.emotion as Emotion,
      confidence: data.confidence,
      intensity: Math.round(data.confidence * 10)
    };
    
    // Notify listeners of the new emotion
    console.log("emotionService: New emotion detected, notifying listeners:", result.emotion);
    notifyEmotionListeners(result);
    
    return result;
  } catch (error) {
    console.error('Error detecting emotion:', error);
    
    // Mark backend as unhealthy
    isBackendHealthy = false;
    
    // Fallback to local detection in case of API failure
    const fallbackResult = fallbackEmotionDetection(text);
    notifyEmotionListeners(fallbackResult);
    return fallbackResult;
  }
};

// Process multiple texts in a batch - optimized for real-time response
export const batchDetectEmotion = async (texts: string[]): Promise<EmotionResult[]> => {
  if (!texts || texts.length === 0) {
    return [];
  }

  // Limit batch size for faster response
  const batchTexts = texts.slice(0, 25); // Reduced from 50 for quicker processing
  
  // Check if all texts are in cache
  const allResults: EmotionResult[] = [];
  let needsApiCall = false;
  
  for (const text of batchTexts) {
    const cacheKey = createCacheKey(text);
    const cachedItem = responseCache.get(cacheKey);
    
    if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_TTL) {
      allResults.push({
        emotion: cachedItem.data.emotion as Emotion,
        confidence: cachedItem.data.confidence,
        intensity: Math.round(cachedItem.data.confidence * 10)
      });
    } else {
      needsApiCall = true;
      allResults.push({ emotion: 'neutral', confidence: 0 }); // Placeholder
    }
  }
  
  // If all items were cached, return them
  if (!needsApiCall) {
    return allResults;
  }

  try {
    if (!isBackendHealthy && Date.now() - lastHealthCheck > HEALTH_CHECK_INTERVAL) {
      // Try to check health if we think backend is down, but only after interval
      await checkBackendStatus();
    }
    
    if (!isBackendHealthy) {
      // If backend is unhealthy, use fallback for each text
      const fallbackResults = await Promise.all(batchTexts.map(fallbackEmotionDetection));
      fallbackResults.forEach(result => notifyEmotionListeners(result));
      return fallbackResults;
    }
    
    const response = await fetchWithTimeout(`${API_BASE_URL}/batch-detect-emotion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ texts: batchTexts, model_preference: 'fast' }),
    }, API_TIMEOUT + (batchTexts.length * 50)); // Adjust timeout for batch size

    if (!response.ok) {
      isBackendHealthy = false;
      throw new Error(`API error: ${response.status}`);
    }

    const data: EmotionBatchResponse = await response.json();
    
    // Cache individual results
    data.results.forEach((result, index) => {
      const text = batchTexts[index];
      if (text) {
        const cacheKey = createCacheKey(text);
        responseCache.set(cacheKey, { data: result, timestamp: Date.now() });
      }
    });
    
    // Map backend responses to frontend format
    const results = data.results.map(result => ({
      emotion: result.emotion as Emotion,
      confidence: result.confidence,
      intensity: Math.round(result.confidence * 10)
    }));
    
    // Notify listeners for each result
    results.forEach(result => notifyEmotionListeners(result));
    
    return results;
  } catch (error) {
    console.error('Error batch detecting emotions:', error);
    isBackendHealthy = false;
    
    // Fallback to local detection for each text
    const fallbackResults = await Promise.all(batchTexts.map(fallbackEmotionDetection));
    fallbackResults.forEach(result => notifyEmotionListeners(result));
    return fallbackResults;
  }
};

// Simple fallback emotion detection when API is unavailable
const fallbackEmotionDetection = (text: string): EmotionResult => {
  const lowerText = text.toLowerCase();
  
  // Basic keyword matching
  const emotionKeywords: Record<Emotion, string[]> = {
    joy: ['happy', 'joy', 'excited', 'great', 'good', 'awesome', 'excellent', 'wonderful', 'delighted'],
    sadness: ['sad', 'unhappy', 'depressed', 'down', 'miserable', 'upset', 'disappointed', 'heartbroken'],
    anger: ['angry', 'mad', 'furious', 'annoyed', 'irritated', 'frustrated', 'enraged', 'outraged'],
    fear: ['afraid', 'scared', 'frightened', 'worried', 'anxious', 'terrified', 'nervous', 'panicked'],
    love: ['love', 'adore', 'care', 'cherish', 'affection', 'fond', 'passionate', 'devoted'],
    surprise: ['surprised', 'amazed', 'astonished', 'shocked', 'stunned', 'startled', 'unexpected'],
    neutral: ['okay', 'fine', 'alright', 'neutral', 'normal', 'average', 'moderate']
  };
  
  // Count keyword matches
  const emotionScores: Record<Emotion, number> = {
    joy: 0,
    sadness: 0,
    anger: 0,
    fear: 0,
    love: 0,
    surprise: 0,
    neutral: 0.1, // Slight bias toward neutral
  };
  
  Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
    keywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        emotionScores[emotion as Emotion] += 0.2;
      }
    });
  });
  
  // Find emotion with highest score
  let maxEmotion: Emotion = 'neutral';
  let maxScore = 0.1;
  
  Object.entries(emotionScores).forEach(([emotion, score]) => {
    if (score > maxScore) {
      maxEmotion = emotion as Emotion;
      maxScore = score;
    }
  });
  
  return {
    emotion: maxEmotion,
    confidence: Math.min(0.7, maxScore), // Cap confidence at 0.7 for fallback
    intensity: Math.round(Math.min(0.7, maxScore) * 10)
  };
};

// Clear cache
export const clearEmotionCache = () => {
  responseCache.clear();
  // Force health check on next API call
  lastHealthCheck = 0;
};

// Reset backend health status
export const resetBackendHealthState = () => {
  isBackendHealthy = false;
  lastHealthCheck = 0;
};

// Poll the backend for real-time updates
let realTimePollTimer: NodeJS.Timeout | null = null;

// Start polling for real-time updates
export const startRealtimeUpdates = (intervalMs = 5000) => {
  if (realTimePollTimer) {
    clearInterval(realTimePollTimer);
  }
  
  realTimePollTimer = setInterval(async () => {
    try {
      // Check if backend is available first
      const status = await checkBackendStatus();
      if (status && status.status === 'online') {
        // Do a quick ping to keep connection alive
        await fetchWithTimeout(`${API_BASE_URL}/status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Error in real-time polling:', error);
    }
  }, intervalMs);
  
  return () => {
    if (realTimePollTimer) {
      clearInterval(realTimePollTimer);
      realTimePollTimer = null;
    }
  };
};

// Stop real-time updates polling
export const stopRealtimeUpdates = () => {
  if (realTimePollTimer) {
    clearInterval(realTimePollTimer);
    realTimePollTimer = null;
  }
};

export default {
  detectEmotion,
  batchDetectEmotion,
  checkBackendStatus,
  clearEmotionCache,
  resetBackendHealthState,
  onEmotionDetected,
  offEmotionDetected,
  startRealtimeUpdates,
  stopRealtimeUpdates
}; 