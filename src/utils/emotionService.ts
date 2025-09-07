// Emotion processing service that connects to the FastAPI backend
import { detectEmotionOpenRouter as detectEmotionViaOR } from '@/utils/openRouterAPI';

// Use Vite's import.meta.env instead of process.env for environment detection
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
 local_neurofeel_available?: boolean;
  using_local_neurofeel?: boolean;
}

// In-memory cache for API responses with longer TTL
const responseCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes for better caching

// Rate limiting to prevent API spam
const requestTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15; // Reduced from 20 to 15

// Active requests tracking to prevent duplicate calls
const activeRequests = new Map<string, Promise<any>>();

// Event system for real-time updates
type EmotionEventListener = (emotion: EmotionResult) => void;
const emotionEventListeners: EmotionEventListener[] = [];

// Track API health
let isBackendHealthy = false;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 1000 * 120; // 2 minutes instead of 30 seconds

// Helper function to check rate limiting
const isRateLimited = (text: string): boolean => {
  const cacheKey = createCacheKey(text);
  const now = Date.now();
  
  if (!requestTimestamps.has(cacheKey)) {
    requestTimestamps.set(cacheKey, []);
  }
  
  const timestamps = requestTimestamps.get(cacheKey)!;
  
  // Remove old timestamps
  const validTimestamps = timestamps.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    console.warn(`Rate limited for text: ${text.substring(0, 50)}...`);
    return true;
  }
  
  validTimestamps.push(now);
  requestTimestamps.set(cacheKey, validTimestamps);
  return false;
};

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

  const trimmedText = text.trim();
  const cacheKey = createCacheKey(trimmedText);
  
  // Check if there's already an active request for this exact text
  if (activeRequests.has(cacheKey)) {
    console.log('Waiting for existing request for:', trimmedText.substring(0, 30));
    try {
      const result = await activeRequests.get(cacheKey)!;
      return {
        emotion: result.emotion as Emotion,
        confidence: result.confidence,
        intensity: Math.round(result.confidence * 10)
      };
    } catch (error) {
      // If the shared request fails, we'll continue with a new request
      console.warn('Shared request failed, making new request');
    }
  }
  
  // Check rate limiting first
  if (isRateLimited(trimmedText)) {
    // Return cached result if available, otherwise neutral
    const cachedItem = responseCache.get(cacheKey);
    if (cachedItem) {
      console.log('Rate limited, returning cached result for:', trimmedText.substring(0, 30));
      return {
        emotion: cachedItem.data.emotion as Emotion,
        confidence: cachedItem.data.confidence,
        intensity: Math.round(cachedItem.data.confidence * 10)
      };
    }
    console.log('Rate limited, returning neutral for:', trimmedText.substring(0, 30));
    return { emotion: 'neutral', confidence: 0.8 };
  }

  // Check cache first
  const cachedItem = responseCache.get(cacheKey);
  
  if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_TTL) {
    console.log('Using cached result for:', trimmedText.substring(0, 30));
    const result = {
      emotion: cachedItem.data.emotion as Emotion,
      confidence: cachedItem.data.confidence,
      intensity: Math.round(cachedItem.data.confidence * 10)
    };
    
    // Don't notify listeners for cached results to prevent loops
    return result;
  }

  // Create and track the request promise
  const requestPromise = makeEmotionRequest(trimmedText, cacheKey);
  activeRequests.set(cacheKey, requestPromise);
  
  try {
    const result = await requestPromise;
    return result;
  } finally {
    // Clean up the active request
    activeRequests.delete(cacheKey);
  }
};

// Separate function to make the actual API request
const makeEmotionRequest = async (trimmedText: string, cacheKey: string): Promise<EmotionResult> => {
  try {
    if (!isBackendHealthy && Date.now() - lastHealthCheck > HEALTH_CHECK_INTERVAL) {
      await checkBackendStatus();
    }
    
    if (!isBackendHealthy) {
      if (import.meta.env.VITE_OPENROUTER_API_KEY) {
        const or = await detectEmotionViaOR(trimmedText);
        const result = { emotion: or.emotion as Emotion, confidence: or.confidence, intensity: or.intensity || Math.round(or.confidence * 10) };
        notifyEmotionListeners(result);
        return result;
      }
      const fallbackResult = fallbackEmotionDetection(trimmedText);
      notifyEmotionListeners(fallbackResult);
      return fallbackResult;
    }
    
    console.log('Making API request for:', trimmedText.substring(0, 30));
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/detect-emotion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: trimmedText }),
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
    
    // Only notify listeners for new (non-cached) emotions
    console.log("emotionService: New emotion detected:", result.emotion);
    notifyEmotionListeners(result);
    
    return result;
  } catch (error) {
    console.error('Error detecting emotion:', error);
    
    isBackendHealthy = false;
    
    if (import.meta.env.VITE_OPENROUTER_API_KEY) {
      try {
        const or = await detectEmotionViaOR(trimmedText);
        const result = { emotion: or.emotion as Emotion, confidence: or.confidence, intensity: or.intensity || Math.round(or.confidence * 10) };
        notifyEmotionListeners(result);
        return result;
      } catch (e) {
        // fall through to rule-based
      }
    }
    const fallbackResult = fallbackEmotionDetection(trimmedText);
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
    
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/batch-detect-emotion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ texts: batchTexts }),
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
// Uses basic HuggingFace-style keyword matching only
const fallbackEmotionDetection = (text: string): EmotionResult => {
  const lowerText = text.toLowerCase();
  
  // Very basic keyword matching for fallback only
  const emotionKeywords: Record<Emotion, string[]> = {
    joy: ['happy', 'joy', 'excited', 'great', 'good', 'wonderful'],
    sadness: ['sad', 'down', 'depressed', 'upset', 'disappointed'],
    anger: ['angry', 'mad', 'furious', 'annoyed', 'frustrated'],
    fear: ['afraid', 'scared', 'worried', 'anxious', 'nervous'],
    love: ['love', 'adore', 'care', 'affection'],
    surprise: ['surprised', 'amazed', 'shocked', 'unexpected'],
    neutral: ['okay', 'fine', 'alright', 'normal']
  };
  
  // Simple scoring
  let bestEmotion: Emotion = 'neutral';
  let maxMatches = 0;
  
  Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
    const matches = keywords.filter(keyword => lowerText.includes(keyword)).length;
    if (matches > maxMatches) {
      bestEmotion = emotion as Emotion;
      maxMatches = matches;
    }
  });
  
  return {
    emotion: bestEmotion,
    confidence: maxMatches > 0 ? 0.6 : 0.5, // Lower confidence for fallback
    intensity: Math.round((maxMatches > 0 ? 0.6 : 0.5) * 10)
  };
};

// Clear cache and rate limits
export const clearEmotionCache = () => {
  responseCache.clear();
  requestTimestamps.clear();
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

// Start polling for real-time updates - much less frequent to avoid spam
export const startRealtimeUpdates = (intervalMs = 60000) => { // Increased from 5s to 60s
  if (realTimePollTimer) {
    clearInterval(realTimePollTimer);
  }
  
  realTimePollTimer = setInterval(async () => {
    try {
      // Only check if backend is available, don't ping unnecessarily
      const status = await checkBackendStatus();
      // Removed the extra ping that was causing spam
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