import axios from 'axios';

interface EmotionResult {
  emotion: string;
  confidence: number;
  intensity: number;
  model_used: string;
  raw_emotions?: Array<{ label: string; score: number }>;
}

interface EmotionTrend {
  emotion: string;
  frequency: number;
  change: number;
  intensity: number;
}

interface EmotionAnalysis {
  primary_emotion: string;
  secondary_emotions: string[];
  intensity: number;
  insights: string;
  suggestions: string[];
}

interface EmotionProgression {
  patterns: Array<{
    description: string;
    frequency: string;
  }>;
  insights: string;
  growth_opportunities: string[];
  emotional_journey: {
    improved_areas: string[];
    challenge_areas: string[];
    stability: string[];
  };
  progression_data?: Array<{
    period: string;
    emotions: Array<{
      emotion: string;
      intensity: number;
      frequency: number;
    }>;
  }>;
}

class EmotionAnalysisService {
  private baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  private cache = new Map<string, { data: any; timestamp: number }>();
  private CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Detect emotion using Hugging Face models via backend
   */
  async detectEmotion(text: string): Promise<EmotionResult> {
    if (!text || text.trim() === '') {
      throw new Error('Text input cannot be empty');
    }

    // Check cache first
    const cacheKey = `emotion_${this.createCacheKey(text)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_EXPIRY_MS) {
      return cached.data;
    }

    try {
      const response = await axios.post(`${this.baseURL}/api/detect-emotion`, {
        text: text
      }, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = response.data;
      if (result && result.emotion) {
        const emotionResult: EmotionResult = {
          emotion: result.emotion,
          confidence: result.confidence || 0.5,
          intensity: result.intensity || Math.round((result.confidence || 0.5) * 10),
          model_used: result.model_used || 'unknown',
          raw_emotions: result.raw_emotions || []
        };

        // Cache the result
        this.cache.set(cacheKey, {
          data: emotionResult,
          timestamp: Date.now()
        });

        this.cleanCache();
        return emotionResult;
      }

      throw new Error('Invalid response format from emotion detection service');
    } catch (error) {
      console.error('Emotion detection error:', error);
      // Fallback to a neutral emotion with low confidence
      return {
        emotion: 'neutral',
        confidence: 0.3,
        intensity: 3,
        model_used: 'fallback'
      };
    }
  }

  /**
   * Analyze emotions in text with detailed insights
   */
  async analyzeEmotion(text: string, userHistory?: any[]): Promise<EmotionAnalysis> {
    if (!text || text.trim() === '') {
      throw new Error('Text input cannot be empty');
    }

    // Check cache first
    const cacheKey = `analysis_${this.createCacheKey(text)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_EXPIRY_MS) {
      return cached.data;
    }

    try {
      const response = await axios.post(`${this.baseURL}/api/detect-emotion`, {
        text: text
      }, {
        timeout: 20000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = response.data;
      if (result && result.emotion) {
        // Transform to expected format
        const analysis = {
          primary_emotion: result.emotion,
          secondary_emotions: [],
          intensity: Math.round((result.confidence || 0.5) * 10),
          insights: `Detected emotion: ${result.emotion} with ${Math.round((result.confidence || 0.5) * 100)}% confidence using ${result.model_used || 'API'}`,
          suggestions: this.getEmotionSuggestions(result.emotion)
        };
        
        // Cache the result
        this.cache.set(cacheKey, {
          data: analysis,
          timestamp: Date.now()
        });

        this.cleanCache();
        return analysis;
      }

      throw new Error('Invalid response format from emotion analysis service');
    } catch (error) {
      console.error('Emotion analysis error:', error);
      // Fallback response
      return {
        primary_emotion: 'neutral',
        secondary_emotions: [],
        intensity: 5,
        insights: 'An error occurred during emotion analysis. Please try again.',
        suggestions: this.getEmotionSuggestions('neutral')
      };
    }
  }

  /**
   * Analyze emotion progression over time
   */
  async analyzeProgression(emotionHistory: any[], timePeriod: string = 'week', currentEmotion?: string): Promise<EmotionProgression> {
    if (!emotionHistory || emotionHistory.length === 0) {
      throw new Error('Emotion history cannot be empty');
    }

    // Check cache first
    const cacheKey = `progression_${timePeriod}_${emotionHistory.length}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_EXPIRY_MS) {
      return cached.data;
    }

    try {
      // Use batch detection for progression analysis as a fallback
      const response = await axios.post(`${this.baseURL}/api/batch-detect-emotion`, {
        texts: emotionHistory.map(entry => entry.text || '')
      }, {
        timeout: 20000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = response.data;
      if (result) {
        // Cache the result
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });

        this.cleanCache();
        return result;
      }

      throw new Error('Invalid response format from progression analysis service');
    } catch (error) {
      console.error('Progression analysis error:', error);
      // Fallback response
      return {
        patterns: [],
        insights: 'An error occurred during progression analysis. Please try again.',
        growth_opportunities: [
          'Continue tracking your emotions regularly',
          'Look for connections between emotions and specific situations',
          'Practice mindful awareness of emotional transitions'
        ],
        emotional_journey: {
          improved_areas: [],
          challenge_areas: [],
          stability: []
        }
      };
    }
  }

  /**
   * Analyze correlations between emotions
   */
  async analyzeCorrelations(emotionHistory: any[]): Promise<any> {
    if (!emotionHistory || emotionHistory.length < 5) {
      throw new Error('Emotion history must contain at least 5 entries for correlation analysis');
    }

    // Check cache first
    const cacheKey = `correlations_${emotionHistory.length}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_EXPIRY_MS) {
      return cached.data;
    }

    try {
      // Use batch detection for correlation analysis as a fallback
      const response = await axios.post(`${this.baseURL}/api/batch-detect-emotion`, {
        texts: emotionHistory.map(entry => entry.text || '')
      }, {
        timeout: 20000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = response.data;
      if (result) {
        // Cache the result
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });

        this.cleanCache();
        return result;
      }

      throw new Error('Invalid response format from correlation analysis service');
    } catch (error) {
      console.error('Correlation analysis error:', error);
      // Fallback response
      return {
        correlations: [],
        insights: 'An error occurred during correlation analysis. Please try again.',
        methodology: 'Correlation analysis identifies patterns in how emotions relate to each other over time.'
      };
    }
  }

  /**
   * Get emotion trends from journal entries
   */
  async getEmotionTrends(entries: any[]): Promise<EmotionTrend[]> {
    if (!entries || entries.length === 0) {
      return [];
    }

    try {
      // Group entries by emotion and calculate frequency and intensity
      const emotionMap: Record<string, { count: number; totalIntensity: number }> = {};
      
      entries.forEach(entry => {
        const emotion = entry.emotion || 'neutral';
        if (!emotionMap[emotion]) {
          emotionMap[emotion] = { count: 0, totalIntensity: 0 };
        }
        emotionMap[emotion].count++;
        emotionMap[emotion].totalIntensity += entry.emotion_intensity || 5;
      });

      // Convert to trend data
      const totalEntries = entries.length;
      const trends: EmotionTrend[] = Object.entries(emotionMap).map(([emotion, data]) => ({
        emotion,
        frequency: Math.round((data.count / totalEntries) * 100),
        change: 0, // Would need historical data to calculate actual change
        intensity: Math.round(data.totalIntensity / data.count)
      }));

      // Sort by frequency
      return trends.sort((a, b) => b.frequency - a.frequency);
    } catch (error) {
      console.error('Error calculating emotion trends:', error);
      return [];
    }
  }

  /**
   * Create a normalized cache key
   */
  private createCacheKey(text: string): string {
    return text.toLowerCase().trim().replace(/\s+/g, ' ').substring(0, 100);
  }

  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    const expiredEntries: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.CACHE_EXPIRY_MS) {
        expiredEntries.push(key);
      }
    });

    expiredEntries.forEach(key => this.cache.delete(key));
  }

  /**
   * Get emotion-specific suggestions
   */
  private getEmotionSuggestions(emotion: string): string[] {
    const suggestions: Record<string, string[]> = {
      joy: [
        'Practice gratitude to maintain this positive state',
        'Share your joy with others to amplify it',
        'Engage in activities that bring you fulfillment'
      ],
      sadness: [
        'Practice self-compassion and be gentle with yourself',
        'Reach out to supportive friends or family',
        'Consider gentle physical activity or meditation'
      ],
      anger: [
        'Take deep breaths to calm your nervous system',
        'Try progressive muscle relaxation techniques',
        'Consider journaling about what triggered this emotion'
      ],
      fear: [
        'Practice grounding techniques (5-4-3-2-1 method)',
        'Try mindfulness meditation to stay present',
        'Talk to someone you trust about your concerns'
      ],
      love: [
        'Nurture the relationships that bring you joy',
        'Express your appreciation to those you care about',
        'Practice loving-kindness meditation'
      ],
      surprise: [
        'Take time to process unexpected changes',
        'Reflect on how this surprise affects your plans',
        'Practice mindful awareness of your reactions'
      ],
      neutral: [
        'Try expressing your feelings in more detail',
        'Consider what specific events triggered these emotions',
        'Reflect on how these emotions affect your body'
      ]
    };
    
    return suggestions[emotion.toLowerCase()] || suggestions.neutral;
  }

  /**
   * Clear all cached results
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Check if emotion analysis service is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseURL}/status`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      console.error('Emotion analysis service availability check failed:', error);
      return false;
    }
  }
}

export const emotionAnalysisService = new EmotionAnalysisService();
export default emotionAnalysisService;