// OpenRouter Service - Backend API wrapper for OpenRouter functionality
// This replaces direct client-side OpenRouter API calls for security

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface EmotionResult {
  emotion: string;
  confidence: number;
  model_used?: string;
}

interface SummaryResult {
  summary: string;
  model_used?: string;
}

interface AvailabilityResult {
  available: boolean;
  reason?: string;
}

class OpenRouterService {
  private static instance: OpenRouterService;
  private openRouterAvailable: boolean | null = null;
  private lastCheckTime: number = 0;
  private readonly CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): OpenRouterService {
    if (!OpenRouterService.instance) {
      OpenRouterService.instance = new OpenRouterService();
    }
    return OpenRouterService.instance;
  }

  /**
   * Check if OpenRouter API is available via backend
   */
  async checkAvailability(forceCheck = false): Promise<boolean> {
    const now = Date.now();
    
    if (!forceCheck && this.openRouterAvailable !== null && (now - this.lastCheckTime) < this.CHECK_INTERVAL) {
      return this.openRouterAvailable;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/openrouter/check-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force_check: forceCheck })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AvailabilityResult = await response.json();
      this.openRouterAvailable = data.available;
      this.lastCheckTime = now;
      
      return data.available;
    } catch (error) {
      console.error('Error checking OpenRouter availability:', error);
      this.openRouterAvailable = false;
      this.lastCheckTime = now;
      return false;
    }
  }

  /**
   * Detect emotion using OpenRouter via backend
   */
  async detectEmotion(text: string): Promise<EmotionResult> {
    if (!text || text.trim().length < 3) {
      return { emotion: 'neutral', confidence: 0.5 };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/openrouter/detect-emotion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error detecting emotion with OpenRouter:', error);
      return { emotion: 'neutral', confidence: 0.5 };
    }
  }

  /**
   * Generate summary using OpenRouter via backend
   */
  async generateSummary(text: string, maxLength = 200): Promise<SummaryResult> {
    if (!text || text.trim() === '') {
      return { summary: 'No content to summarize' };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/openrouter/generate-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, max_length: maxLength })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating summary with OpenRouter:', error);
      return { summary: text.substring(0, maxLength), model_used: 'fallback' };
    }
  }

  /**
   * Get personalized recommendations based on emotion and context
   */
  async getPersonalizedRecommendations(emotion: string, context?: string): Promise<any[]> {
    if (!emotion) return [];

    try {
      const response = await fetch(`${API_BASE_URL}/openrouter/personalized-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          emotion: emotion.toLowerCase(),
          context: context || ''
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.recommendations || [];
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      // Return fallback recommendations
      return this.getFallbackRecommendations(emotion);
    }
  }

  /**
   * Fallback recommendations when API is unavailable
   */
  private getFallbackRecommendations(emotion: string): any[] {
    const fallbackData: Record<string, any[]> = {
      happy: [
        { title: 'Practice gratitude journaling', type: 'exercise', duration: '10 min' },
        { title: 'Share your joy with others', type: 'social', duration: '15 min' },
        { title: 'Engage in creative activities', type: 'activity', duration: '20 min' }
      ],
      sad: [
        { title: 'Practice self-compassion meditation', type: 'meditation', duration: '10 min' },
        { title: 'Connect with a supportive friend', type: 'social', duration: '15 min' },
        { title: 'Gentle physical exercise', type: 'exercise', duration: '15 min' }
      ],
      angry: [
        { title: 'Deep breathing exercises', type: 'exercise', duration: '5 min' },
        { title: 'Progressive muscle relaxation', type: 'exercise', duration: '10 min' },
        { title: 'Take a mindful walk', type: 'activity', duration: '20 min' }
      ],
      anxious: [
        { title: 'Grounding techniques', type: 'exercise', duration: '5 min' },
        { title: 'Mindfulness meditation', type: 'meditation', duration: '10 min' },
        { title: 'Write down your worries', type: 'activity', duration: '15 min' }
      ],
      neutral: [
        { title: 'Explore new interests', type: 'activity', duration: '15 min' },
        { title: 'Practice mindfulness', type: 'meditation', duration: '10 min' },
        { title: 'Set small goals', type: 'activity', duration: '10 min' }
      ]
    };

    return fallbackData[emotion.toLowerCase()] || fallbackData.neutral;
  }

  /**
   * Get current availability status
   */
  getCurrentAvailability(): boolean | null {
    return this.openRouterAvailable;
  }
}

// Export singleton instance
export const openRouterService = OpenRouterService.getInstance();

// Export individual functions for backward compatibility
export const checkOpenRouterAvailability = async (forceCheck = false): Promise<boolean> => {
  return openRouterService.checkAvailability(forceCheck);
};

export const detectEmotionOpenRouter = async (text: string): Promise<EmotionResult> => {
  return openRouterService.detectEmotion(text);
};

export const getOpenRouter = (): boolean => {
  return openRouterService.getCurrentAvailability() || false;
};

export default openRouterService;