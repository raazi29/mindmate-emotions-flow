import { HfInference } from '@huggingface/inference';
import { toast } from '@/hooks/use-toast';
import axios from 'axios';

// Initialize the Hugging Face inference client
let hf: HfInference | null = null;
let apiKeyState: string | null = null;

// Directly use the provided API key
const API_KEY = "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";

// Initialize with the provided API key
const initialize = () => {
  try {
    console.log('Initializing Hugging Face with provided API key');
    hf = new HfInference(API_KEY);
    apiKeyState = API_KEY;
    console.log('Hugging Face initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing Hugging Face client:', error);
    return false;
  }
};

// Try initializing on module load
initialize();

// Legacy support for setting a different API key if needed
export const initHuggingFace = (apiKey: string) => {
  try {
    hf = new HfInference(apiKey);
    apiKeyState = apiKey;
    return hf;
  } catch (error) {
    console.error('Error initializing Hugging Face client:', error);
    throw error;
  }
};

export const getHuggingFace = () => {
  // If not initialized yet, try initializing again
  if (!hf) {
    initialize();
  }
  return hf;
};

// Check if Hugging Face is available
export const isHuggingFaceAvailable = () => {
  const available = !!hf;
  console.log('Hugging Face available:', available);
  return available;
};

// Get the current API key (for UI display/validation)
export const getApiKey = () => {
  return apiKeyState;
};

// Clear stored API key (reset to default)
export const clearApiKey = () => {
  apiKeyState = API_KEY;
  hf = new HfInference(API_KEY);
  console.log('API key reset to default');
};

// Define result interface
interface EmotionResult {
  emotion: string;
  confidence: number;
}

// Simple response cache to reduce API calls for similar texts
const responseCache = new Map<string, {emotion: string; confidence: number; timestamp: number}>();
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes cache expiry
const MAX_CACHE_SIZE = 50; // Maximum number of items to cache

// Create a cache key based on text content (simplified version to handle minor variations)
const createCacheKey = (text: string): string => {
  // Normalize text: lowercase, trim spaces, remove extra whitespace
  return text.toLowerCase().trim().replace(/\s+/g, ' ').substring(0, 100);
};

// Clean expired or excess cache entries
const cleanCache = () => {
  const now = Date.now();
  const expiredEntries: string[] = [];
  
  // Find expired entries
  responseCache.forEach((entry, key) => {
    if (now - entry.timestamp > CACHE_EXPIRY_MS) {
      expiredEntries.push(key);
    }
  });
  
  // Remove expired entries
  expiredEntries.forEach(key => responseCache.delete(key));
  
  // If still too many entries, remove oldest ones
  if (responseCache.size > MAX_CACHE_SIZE) {
    // Convert to array, sort by timestamp, and keep only newest MAX_CACHE_SIZE entries
    const entries = Array.from(responseCache.entries());
    entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
    
    // Rebuild cache with only newest entries
    responseCache.clear();
    entries.slice(0, MAX_CACHE_SIZE).forEach(([key, value]) => {
      responseCache.set(key, value);
    });
  }
};

/**
 * Detect emotion using Hugging Face API via our proxy server
 * @param text Text to analyze for emotion
 * @returns Object containing detected emotion and confidence score
 */
export const detectEmotionHf = async (text: string): Promise<EmotionResult> => {
  // Ensure text is not empty
  if (!text || text.trim() === '') {
    throw new Error('Text input cannot be empty');
  }
  
  // For very long texts, truncate to the first 500 characters to improve performance
  const processedText = text.length > 500 ? text.substring(0, 500) : text;
  
  // Check cache first (after creating a normalized cache key)
  const cacheKey = createCacheKey(processedText);
  if (responseCache.has(cacheKey)) {
    const cachedResult = responseCache.get(cacheKey)!;
    console.log('[detectEmotionHf] Using cached emotion result');
    
    // Refresh the timestamp to mark it as recently used
    cachedResult.timestamp = Date.now();
    responseCache.set(cacheKey, cachedResult);
    
    return {
      emotion: cachedResult.emotion,
      confidence: cachedResult.confidence
    };
  }

  console.log(`[detectEmotionHf] Analyzing text: "${processedText.substring(0, 50)}..."`);
  console.log(`[detectEmotionHf] Calling model: j-hartmann/emotion-english-distilroberta-base`);
  
  try {
    // Use axios to call our proxy server instead of using the Hugging Face client directly
    // Add a timeout of 10 seconds and retry mechanism
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    // Make multiple attempts to reach the server
    let response;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        response = await axios.post('/api/huggingface', {
          model: 'j-hartmann/emotion-english-distilroberta-base',
          inputs: processedText
        }, {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        // If successful, break out of the loop
        break;
      } catch (error) {
        attempts++;
        console.log(`[detectEmotionHf] Attempt ${attempts} failed, retrying...`);
        
        if (attempts >= maxAttempts) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
    
    clearTimeout(timeoutId);
    
    if (!response || !response.data) {
      throw new Error('No response data received from server');
    }
    
    console.log('[detectEmotionHf] Model response received:', response.data);
    
    // Process the response, handling different possible formats
    let emotionData;
    const responseData = response.data;
    
    // Handle nested array format: [[{label, score}, {label, score}...]]
    if (Array.isArray(responseData) && responseData.length > 0 && Array.isArray(responseData[0])) {
      emotionData = responseData[0];
    } 
    // Handle flat array format: [{label, score}, {label, score}...]
    else if (Array.isArray(responseData)) {
      emotionData = responseData;
    }
    // Handle object format with scores: {label1: score1, label2: score2, ...}
    else if (typeof responseData === 'object' && responseData !== null) {
      emotionData = Object.entries(responseData).map(([label, score]) => ({
        label,
        score: typeof score === 'number' ? score : 0
      }));
    } else {
      console.error('[detectEmotionHf] Unrecognized response format:', responseData);
      throw new Error('Unrecognized response format from Hugging Face API');
    }
    
    // Find the emotion with the highest score
    let topEmotion = null;
    let highestScore = 0;
    
    for (const item of emotionData) {
      if (item && 
          typeof item === 'object' && 
          item.label && 
          typeof item.score === 'number' && 
          item.score > highestScore) {
        highestScore = item.score;
        topEmotion = item;
      }
    }
    
    if (!topEmotion) {
      console.error('[detectEmotionHf] No valid emotion data found in response:', emotionData);
      throw new Error('No valid emotion data found in response');
    }
    
    // Map the emotion label to our standard format
    const mappedEmotion = mapEmotionLabel(topEmotion.label);
    console.log(`[detectEmotionHf] Detected emotion: ${mappedEmotion} (Confidence: ${topEmotion.score.toFixed(2)})`);
    
    // Store in cache for future use
    responseCache.set(cacheKey, {
      emotion: mappedEmotion,
      confidence: topEmotion.score,
      timestamp: Date.now()
    });
    
    // Occasionally clean the cache
    if (Math.random() < 0.1) { // 10% chance on each call to clean cache
      cleanCache();
    }
    
    return {
      emotion: mappedEmotion,
      confidence: topEmotion.score
    };
  } catch (error) {
    console.error('[detectEmotionHf] Error during emotion detection:', error);
    
    // If we get here, something went wrong with the ML model, throw the error
    // to signal that we want specifically model analysis rather than falling back
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        throw new Error('Hugging Face authentication failed (401). Check your API key.');
      } else if (error.message.includes('429')) {
        throw new Error('Hugging Face rate limit exceeded (429). Please try again later.');
      }
      
      throw new Error(`Hugging Face API error: ${error.message}`);
    } else {
      throw new Error('An unknown error occurred during emotion detection');
    }
  }
};

// Map emotion labels to standardized format
const mapEmotionLabel = (label: string): string => {
  const joyLabels = ['joy', 'happy', 'excited', 'amusement', 'approval', 'gratitude'];
  const sadnessLabels = ['sadness', 'grief', 'disappointment', 'remorse'];
  const angerLabels = ['anger', 'annoyance', 'disapproval', 'disgust'];
  const fearLabels = ['fear', 'nervousness', 'anxiety', 'embarrassment'];
  const loveLabels = ['love', 'caring', 'desire', 'admiration'];
  const surpriseLabels = ['surprise', 'realization', 'confusion', 'curiosity'];
  const neutralLabels = ['neutral', 'calm', 'relief'];
  
  const normalized = label.toLowerCase();
  
  if (joyLabels.includes(normalized)) return 'joy';
  if (sadnessLabels.includes(normalized)) return 'sadness';
  if (angerLabels.includes(normalized)) return 'anger';
  if (fearLabels.includes(normalized)) return 'fear';
  if (loveLabels.includes(normalized)) return 'love';
  if (surpriseLabels.includes(normalized)) return 'surprise';
  if (neutralLabels.includes(normalized)) return 'neutral';
  
  return 'neutral';
};

// Get personalized resource recommendations based on detected emotion
export const getPersonalizedResourcesHf = async (text: string, resourceList: any[]): Promise<any[]> => {
  if (!hf || !text || text.length < 5) {
    return resourceList;
  }

  try {
    // Use the primary emotion detection model
    let emotionResult;
    try {
      emotionResult = await detectEmotionHf(text);
    } catch (error) {
      console.error('Error detecting emotion for resource personalization:', error);
      // If detection fails, return the original list
      return resourceList;
    }
    
    const emotion = emotionResult.emotion;
    
    // Create a weighted scoring system for resources based on detected emotion
    const emotionResourceMapping: Record<string, string[]> = {
      joy: ['meditation', 'gratitude', 'social'],
      sadness: ['meditation', 'exercise', 'education'],
      anger: ['meditation', 'exercise'],
      fear: ['meditation', 'education'],
      love: ['social', 'gratitude'],
      surprise: ['education', 'journaling'],
      neutral: ['meditation', 'education']
    };
    
    // Get the relevant resource types for the detected emotion
    const relevantTypes = emotionResourceMapping[emotion] || ['meditation', 'education'];
    
    // Sort resources based on their relevance to the detected emotion
    const sortedResources = [...resourceList].sort((a, b) => {
      const aIsRelevant = relevantTypes.includes(a.tag) || relevantTypes.includes(a.type);
      const bIsRelevant = relevantTypes.includes(b.tag) || relevantTypes.includes(b.type);
      
      if (aIsRelevant && !bIsRelevant) return -1;
      if (!aIsRelevant && bIsRelevant) return 1;
      
      // Further prioritize by rating or other factors
      if (a.rating && b.rating) return b.rating - a.rating;
      return 0;
    });
    
    // Mark the top resources as recommended
    return sortedResources.map((resource, index) => ({
      ...resource,
      recommended: index < 3
    }));
  } catch (error) {
    console.error('Error getting personalized resources:', error);
    return resourceList;
  }
};

// Real-time resource recommendation based on input text
export const recommendResourcesForInput = async (text: string, availableResources: any[]) => {
  if (!hf || !text || text.length < 10) {
    return null;
  }
  
  try {
    const result = await getPersonalizedResourcesHf(text, availableResources);
    toast({
      title: 'Recommendations Updated',
      description: 'Resources have been personalized based on your input.'
    });
    return result;
  } catch (error) {
    console.error('Error recommending resources:', error);
    return null;
  }
};
