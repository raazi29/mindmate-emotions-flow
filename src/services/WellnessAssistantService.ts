/**
 * Wellness Assistant Service - AI Chat for Mental Health Support
 * Integrates with the new clean backend for AI wellness conversations
 */

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface WellnessResponse {
  message: string;
  model_used: string;
  emotion_context?: string;
  note?: string;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  model?: string;
}

class WellnessAssistantService {
  private baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  private cache = new Map<string, { data: WellnessResponse; timestamp: number }>();
  private CACHE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Send a message to the wellness assistant
   */
  async sendMessage(
    messages: ChatMessage[],
    currentEmotion?: string,
    aiModel: 'gemini' | 'openrouter' = 'gemini'
  ): Promise<WellnessResponse> {
    try {
      // Format messages for the API
      const formattedMessages: Message[] = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const payload = {
        messages: formattedMessages,
        current_emotion: currentEmotion,
        ai_model: aiModel
      };

      console.log(`Sending wellness request to ${this.baseURL}/api/wellness-assistant`);
      
      const response = await fetch(`${this.baseURL}/api/wellness-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: WellnessResponse = await response.json();
      
      console.log('Wellness response received:', result.model_used);
      return result;

    } catch (error) {
      console.error('Wellness assistant error:', error);
      
      // Return fallback response based on emotion
      return this.getFallbackResponse(currentEmotion, aiModel);
    }
  }

  /**
   * Check if the wellness assistant service is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      return response.ok;
    } catch (error) {
      console.error('Wellness service availability check failed:', error);
      return false;
    }
  }

  /**
   * Get service status and available features
   */
  async getStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      throw new Error(`Status check failed: ${response.status}`);
    } catch (error) {
      console.error('Status check error:', error);
      return {
        status: 'offline',
        apis: {
          huggingface: false,
          openrouter: false,
          gemini: false
        },
        features: {
          emotion_detection: false,
          ai_chat: false,
          batch_processing: false
        }
      };
    }
  }

  /**
   * Get fallback response when API is unavailable
   */
  private getFallbackResponse(emotion?: string, model?: string): WellnessResponse {
    const emotionResponses: Record<string, string> = {
      sadness: "I understand you're going through a difficult time. It's okay to feel sad - these feelings are valid. Would you like to talk about what's bothering you? Sometimes sharing can help lighten the burden.",
      anger: "I can sense your frustration. It's natural to feel angry sometimes. Taking deep breaths can help. What's causing these feelings? Let's work through this together.",
      fear: "It sounds like you're feeling anxious or worried. That's completely understandable. Remember that you're not alone in this. What specific concerns are on your mind?",
      joy: "It's wonderful to hear that you're feeling positive! I'm glad you're in a good space. What's bringing you joy today?",
      love: "I can sense the warmth and connection you're feeling. That's beautiful! How would you like to nurture and express these loving feelings?",
      surprise: "You seem surprised about something! Change can bring up many emotions. Would you like to talk through what's happening?",
      neutral: "Thank you for sharing with me. I'm here to support you in whatever way I can. How are you feeling right now, and is there anything specific you'd like to talk about?"
    };

    const fallbackMessage = emotion && emotionResponses[emotion.toLowerCase()] 
      ? emotionResponses[emotion.toLowerCase()]
      : emotionResponses.neutral;

    return {
      message: fallbackMessage,
      model_used: "fallback-response",
      emotion_context: emotion,
      note: "AI service temporarily unavailable - using local response"
    };
  }

  /**
   * Generate contextual greeting based on emotion
   */
  generateGreeting(userName: string = 'there', emotion?: string): string {
    const emotionGreetings: Record<string, string> = {
      sadness: `Hello ${userName}. I notice you might be feeling sad or down. I'm here to support you through this. How can I help?`,
      anger: `Hi ${userName}. I sense you might be feeling frustrated or angry. Those feelings are completely valid. What's on your mind?`,
      fear: `Hello ${userName}. I notice you might be feeling anxious or worried. I can help you work through these feelings. What's concerning you?`,
      joy: `Hi ${userName}! I can sense your positive energy. That's wonderful! I'd love to hear what's bringing you joy today.`,
      love: `Hello ${userName}! I feel the warmth and connection in your energy. That's beautiful! How can I support these loving feelings?`,
      surprise: `Hi ${userName}! You seem surprised about something. Change can bring up many emotions. What's happening in your world?`,
      neutral: `Hello ${userName}! I'm your wellness assistant, here to support your emotional well-being. How are you feeling today?`
    };

    return emotion && emotionGreetings[emotion.toLowerCase()]
      ? emotionGreetings[emotion.toLowerCase()]
      : emotionGreetings.neutral;
  }

  /**
   * Clear cached responses
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxAge: number } {
    return {
      size: this.cache.size,
      maxAge: this.CACHE_EXPIRY_MS
    };
  }
}

// Export singleton instance
export const wellnessAssistantService = new WellnessAssistantService();
export default wellnessAssistantService;