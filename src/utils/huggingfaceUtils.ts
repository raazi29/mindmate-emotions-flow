// DEPRECATED: Use HuggingFaceService instead
// This file is kept for backward compatibility but delegates to backend service

import axios from 'axios';
import { toast } from 'react-hot-toast';
import { huggingFaceService } from '@/services/HuggingFaceService';

// Re-export functions from the new backend service
export const detectEmotionHf = async (text: string) => {
  return huggingFaceService.detectEmotion(text);
};

export const isHuggingFaceAvailable = () => {
  return true; // Always return true as we use backend service
};

export const getHuggingFace = () => {
  return null; // Deprecated, use service instead
};

export const getApiKey = () => {
  return 'backend-service'; // Backend handles API keys
};

export const clearApiKey = () => {
  // No-op, backend handles API keys
};

export const initHuggingFace = (apiKey: string) => {
  // No-op, backend handles API keys
  return null;
};

// Add backward compatibility for recommendResourcesForInput
export const recommendResourcesForInput = async (emotion: string, context?: string) => {
  // Delegate to HuggingFaceService for backward compatibility
  const { huggingFaceService } = await import('@/services/HuggingFaceService');
  return huggingFaceService.recommendResourcesForInput(emotion, context);
};
