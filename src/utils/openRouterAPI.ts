// OpenRouter API utilities - DEPRECATED: Use OpenRouterService instead
// This file is kept for backward compatibility but delegates to backend service

import { openRouterService } from '@/services/OpenRouterService';

// Re-export all functions from the new backend service
export const detectEmotionOpenRouter = async (text: string): Promise<{ emotion: string; confidence: number; intensity?: number }> => {
  const result = await openRouterService.detectEmotion(text);
  return {
    emotion: result.emotion,
    confidence: result.confidence,
    intensity: result.confidence
  };
};

export const getEmotionalFeedback = async (text: string, resourceTitle: string): Promise<string> => {
  // For now, use a simple fallback since emotional feedback is more complex
  // This can be expanded with a dedicated backend endpoint if needed
  const emotionText = text.includes("I'm feeling") ? text : `I'm feeling ${text}.`;
  return `Notice how you feel while reading "${resourceTitle}". ${emotionText}`;
};

export const checkOpenRouterAvailability = async (forceCheck = false): Promise<boolean> => {
  return openRouterService.checkAvailability(forceCheck);
};

export const getPersonalizedRecommendations = async (emotion: string, context?: string): Promise<any[]> => {
  return openRouterService.getPersonalizedRecommendations(emotion, context);
};

export const getOpenRouter = (): boolean => {
  return openRouterService.getCurrentAvailability() || false;
};