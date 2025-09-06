import axios from 'axios';

interface EmotionResult {
  emotion: string;
  confidence: number;
}

class HuggingFaceService {
  private baseURL = 'http://localhost:8000';
  private cache = new Map<string, {emotion: string; confidence: number; timestamp: number}>();
  private CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
  private MAX_CACHE_SIZE = 50;

  /**
   * Detect emotion using Hugging Face API via backend
   */
  async detectEmotion(text: string): Promise<EmotionResult> {
    if (!text || text.trim() === '') {
      throw new Error('Text input cannot be empty');
    }

    // Check cache first
    const cacheKey = this.createCacheKey(text);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_EXPIRY_MS) {
      return { emotion: cached.emotion, confidence: cached.confidence };
    }

    try {
      const response = await axios.post(`${this.baseURL}/detect-emotion`, {
        text: text,
        use_huggingface: true
      }, {
        timeout: 15000, // 15 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = response.data;
      if (result && result.emotion) {
        // Cache the result
        this.cache.set(cacheKey, {
          emotion: result.emotion,
          confidence: result.confidence,
          timestamp: Date.now()
        });
        
        // Clean cache if needed
        this.cleanCache();

        return {
          emotion: result.emotion,
          confidence: result.confidence
        };
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error('HuggingFace service error:', error);
      throw new Error('Failed to detect emotion using Hugging Face API');
    }
  }

  /**
   * Check if Hugging Face service is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseURL}/status`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      console.error('HuggingFace availability check failed:', error);
      return false;
    }
  }

  /**
   * Create a normalized cache key
   */
  private createCacheKey(text: string): string {
    return text.toLowerCase().trim().replace(/\s+/g, ' ').substring(0, 100);
  }

  /**
   * Clean expired or excess cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    const expiredEntries: string[] = [];

    // Find expired entries
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.CACHE_EXPIRY_MS) {
        expiredEntries.push(key);
      }
    });

    // Remove expired entries
    expiredEntries.forEach(key => this.cache.delete(key));

    // If still too many entries, remove oldest ones
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      
      this.cache.clear();
      entries.slice(0, this.MAX_CACHE_SIZE).forEach(([key, value]) => {
        this.cache.set(key, value);
      });
    }
  }

  /**
   * Clear all cached results
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // Could implement actual hit rate tracking if needed
    };
  }

  /**
   * Get personalized recommendations based on emotion and context
   */
  async recommendResourcesForInput(emotion: string, context?: string): Promise<any[]> {
    try {
      const response = await axios.post(`${this.baseURL}/openrouter/personalized-recommendations`, {
        emotion: emotion,
        context: context || ''
      }, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data.recommendations || [];
    } catch (error) {
      console.error('Failed to get personalized recommendations:', error);
      // Return fallback recommendations
      return this.getFallbackRecommendations(emotion);
    }
  }

  /**
   * Get fallback recommendations when API fails
   */
  private getFallbackRecommendations(emotion: string): any[] {
    const fallbackData: { [key: string]: any[] } = {
      happy: [
        { title: "Practice gratitude journaling", type: "exercise", duration: "10 min" },
        { title: "Share your joy with others", type: "social", duration: "15 min" },
        { title: "Engage in creative activities", type: "activity", duration: "20 min" }
      ],
      sad: [
        { title: "Practice self-compassion meditation", type: "meditation", duration: "10 min" },
        { title: "Connect with a supportive friend", type: "social", duration: "15 min" },
        { title: "Gentle physical exercise", type: "exercise", duration: "15 min" }
      ],
      angry: [
        { title: "Deep breathing exercises", type: "exercise", duration: "5 min" },
        { title: "Progressive muscle relaxation", type: "exercise", duration: "10 min" },
        { title: "Take a mindful walk", type: "activity", duration: "20 min" }
      ],
      anxious: [
        { title: "Grounding techniques", type: "exercise", duration: "5 min" },
        { title: "Mindfulness meditation", type: "meditation", duration: "10 min" },
        { title: "Write down your worries", type: "activity", duration: "15 min" }
      ],
      neutral: [
        { title: "Explore new interests", type: "activity", duration: "15 min" },
        { title: "Practice mindfulness", type: "meditation", duration: "10 min" },
        { title: "Set small goals", type: "activity", duration: "10 min" }
      ]
    };
    
    return fallbackData[emotion.toLowerCase()] || fallbackData["neutral"];
  }
}

// Export singleton instance
export const huggingFaceService = new HuggingFaceService();
export default huggingFaceService;