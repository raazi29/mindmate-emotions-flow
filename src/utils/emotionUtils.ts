// Emotion detection utilities
// Using more sophisticated analysis approaches

import { HfInference } from '@huggingface/inference';
import { toast } from '@/hooks/use-toast';
import { detectEmotionWithMultipleModels, generateEmotionalInsight } from './advancedEmotionModels';

type Emotion = 'joy' | 'sadness' | 'anger' | 'fear' | 'love' | 'surprise' | 'neutral';

interface EmotionResult {
  emotion: Emotion;
  intensity: number; // 0-10 scale
  confidence: number; // 0-1 scale
}

// Enhanced emotion detection using linguistic patterns and sentiment analysis
// Still a fallback when no ML model is available
export const detectEmotion = async (text: string): Promise<EmotionResult> => {
  console.log('[detectEmotion] Starting analysis of text:', text.substring(0, 50) + '...');
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const lowerText = text.toLowerCase();
  
  // Enhanced emotion keywords with more nuanced language patterns
  const emotionKeywords = {
    joy: ['happy', 'joy', 'excited', 'glad', 'delighted', 'pleased', 'wonderful', 'thrilled', 
          'ecstatic', 'fantastic', 'amazing', 'great', 'good', 'positive', 'celebrate', 'cheerful'],
    sadness: ['sad', 'unhappy', 'depressed', 'down', 'miserable', 'upset', 'hurt', 'disappointed',
              'gloomy', 'hopeless', 'heartbroken', 'grief', 'sorrow', 'crying', 'tear', 'blue', 'shit', 'crap'],
    anger: ['angry', 'mad', 'furious', 'annoyed', 'irritated', 'frustrated', 'upset', 'rage',
            'outraged', 'hostile', 'offended', 'bitter', 'enraged', 'indignant', 'hate', 'resent', 
            'fuck', 'damn', 'hell', 'pissed', 'shit', 'crap'],
    fear: ['afraid', 'scared', 'frightened', 'worried', 'anxious', 'nervous', 'terrified', 'fear',
           'panic', 'dread', 'horror', 'alarm', 'terror', 'uneasy', 'phobia', 'apprehensive', 'anxiety'],
    love: ['love', 'adore', 'care', 'cherish', 'affection', 'fond', 'passionate', 'warmth',
           'devoted', 'attachment', 'tenderness', 'compassion', 'romantic', 'admire', 'appreciate'],
    surprise: ['surprised', 'amazed', 'astonished', 'shocked', 'stunned', 'wow', 'unexpected', 'startled',
               'bewildered', 'sudden', 'disbelief', 'wonder', 'awe', 'remarkable', 'incredible'],
    neutral: ['okay', 'fine', 'alright', 'neutral', 'so-so', 'moderate', 'balanced', 'fair',
              'average', 'indifferent', 'unremarkable', 'standard', 'normal', 'ordinary', 'regular']
  };
  
  // Use more advanced contextual analysis - look for sentence patterns
  const sentencePatterns = {
    joy: [/i (am|feel|am feeling) (so |really |very )?(happy|great|good|fantastic)/i, 
          /this (is|was) (amazing|awesome|wonderful|excellent)/i],
    sadness: [/i (am|feel|am feeling) (so |really |very )?(sad|down|depressed|upset)/i,
              /this (is|was) (terrible|awful|disappointing|heartbreaking)/i],
    anger: [/i (am|feel|am feeling) (so |really |very )?(angry|mad|furious|annoyed)/i,
            /this (is|was) (infuriating|outrageous|unacceptable)/i],
    fear: [/i (am|feel|am feeling) (so |really |very )?(scared|afraid|worried|anxious)/i,
           /this (is|was) (frightening|terrifying|worrying)/i],
    love: [/i (love|adore|care for|cherish)/i,
           /this (is|was) (lovely|heartwarming|touching)/i],
    surprise: [/i (am|feel|am feeling) (so |really |very )?(surprised|amazed|shocked)/i,
               /this (is|was) (surprising|shocking|unexpected)/i],
    neutral: [/i (am|feel|am feeling) (okay|fine|neutral|alright)/i,
              /this (is|was) (okay|fine|average|normal)/i]
  };
  
  // Apply more sophisticated counting with weightings
  const emotionScores: Record<Emotion, number> = {
    joy: 0,
    sadness: 0,
    anger: 0,
    fear: 0,
    love: 0,
    surprise: 0,
    neutral: 1, // Default slightly weighted to neutral
  };
  
  // List of stronger keywords that get extra weight
  const strongNegativeKeywords = ['fuck', 'damn', 'hate', 'furious', 'pissed', 'rage', 'shit'];
  
  // Check for keyword matches with contextual awareness
  Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(lowerText)) {
        // Give stronger keywords more weight
        const scoreIncrement = strongNegativeKeywords.includes(keyword) ? 2 : 1;
        emotionScores[emotion as Emotion] += scoreIncrement;
        console.log(`[detectEmotion] Found keyword "${keyword}" for emotion "${emotion}" (Score +${scoreIncrement})`);
      }
    });
  });
  
  // Check for sentence patterns (more heavily weighted)
  Object.entries(sentencePatterns).forEach(([emotion, patterns]) => {
    patterns.forEach(pattern => {
      if (pattern.test(lowerText)) {
        emotionScores[emotion as Emotion] += 2; // Patterns count more than keywords
        console.log(`[detectEmotion] Found sentence pattern for emotion "${emotion}"`);
      }
    });
  });
  
  // Simple negation detection
  const negationWords = ['not', 'don\'t', 'doesn\'t', 'didn\'t', 'isn\'t', 'aren\'t', 'wasn\'t', 'weren\'t', 'no', 'never'];
  negationWords.forEach(negationWord => {
    Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
      keywords.forEach(keyword => {
        // Check for negated emotions like "I'm not happy"
        const negatedPhrase = new RegExp(`\\b${negationWord}\\b.{0,10}\\b${keyword}\\b`, 'i');
        if (negatedPhrase.test(lowerText)) {
          emotionScores[emotion as Emotion] -= 1.5; // Negate and penalize more heavily
          console.log(`[detectEmotion] Found negated emotion: "${negationWord} ... ${keyword}"`);
        }
      });
    });
  });
  
  console.log('[detectEmotion] Emotion scores:', emotionScores);
  
  // Find the dominant emotion
  let dominantEmotion: Emotion = 'neutral';
  let maxScore = 0;
  
  Object.entries(emotionScores).forEach(([emotion, score]) => {
    if (score > maxScore) {
      maxScore = score;
      dominantEmotion = emotion as Emotion;
    }
  });
  
  // Restore intensity calculation
  const totalScore = Object.values(emotionScores).reduce((sum, score) => sum + Math.abs(score), 0);
  const emotionIntensity = Math.min(10, Math.max(1, Math.round((maxScore / (totalScore || 1)) * 10))); // Use totalScore, handle division by zero
  
  // Calculate confidence (0-1 scale)
  const totalPositiveScore = Object.values(emotionScores).reduce((sum, score) => sum + Math.max(0, score), 0);
  const dominantScore = emotionScores[dominantEmotion];
  const confidenceScore = dominantScore / (totalPositiveScore || 1);
  
  // Restore intensity in log message
  console.log(`[detectEmotion] Analysis complete: ${dominantEmotion} (intensity: ${emotionIntensity}, confidence: ${confidenceScore.toFixed(2)})`);
  
  // Restore intensity in return value
  return {
    emotion: dominantEmotion,
    intensity: emotionIntensity,
    confidence: confidenceScore
  };
};

// Get personalized suggestion based on emotion with more specific advice
export const getSuggestionForEmotion = (emotion: Emotion): string => {
  const suggestions = {
    joy: "Wonderful! To maintain this positive state, consider starting a daily gratitude journal to reflect on what brings you joy.",
    sadness: "It's okay to feel this way. Try a gentle walking meditation or reach out to someone you trust to talk about your feelings.",
    anger: "When feeling angry, try the 4-7-8 breathing technique: breathe in for 4 seconds, hold for 7, and exhale for 8 seconds.",
    fear: "Ground yourself with the 5-4-3-2-1 technique: acknowledge 5 things you see, 4 things you can touch, 3 things you hear, 2 things you smell, and 1 thing you taste.",
    love: "Cherish this feeling by expressing your appreciation to those who matter to you, perhaps through a thoughtful message or small act of kindness.",
    surprise: "Use this energy to explore something new today, or take a different route home to maintain this sense of discovery.",
    neutral: "This balanced state is perfect for mindfulness practice or trying a new creative activity to stimulate positive emotions."
  };
  
  return suggestions[emotion] || suggestions.neutral;
};

// Enhanced emotion detection using ML models when available
export const analyzeEmotionWithModel = async (text: string, hf: HfInference | null): Promise<EmotionResult> => {
  if (hf) {
    try {
      // Use enhanced ML-powered detection with multiple model fallbacks
      const result = await detectEmotionWithMultipleModels(text, hf);
      
      // Restore intensity calculation
      const intensity = Math.min(10, Math.max(1, Math.round(result.confidence * 10)));
      
      // Get additional insights if text is substantial
      if (text.length > 20) {
        try {
          // This could provide deeper analysis on the emotion
          const insight = await generateEmotionalInsight(text, result.emotion, hf);
          // Restore intensity in return value
          return {
            emotion: result.emotion,
            intensity: insight.intensity || intensity,
            confidence: result.confidence
          };
        } catch (error) {
          console.error('Error generating emotional insight:', error);
        }
      }
      
      // Restore intensity in return value
      return {
        emotion: result.emotion,
        intensity: intensity, // Add back intensity
        confidence: result.confidence
      };
    } catch (error) {
      console.error('Error using ML model for emotion detection:', error);
      // Fall back to pattern-based analysis
      toast({
        title: 'Using fallback emotion detection',
        description: 'Advanced model unavailable, using pattern analysis instead',
        variant: 'default'
      });
      return detectEmotion(text);
    }
  } else {
    // Use pattern-based analysis if no model available
    return detectEmotion(text);
  }
};

// Map emotion labels from various models to our standardized set
const mapEmotionLabel = (label: string): Emotion => {
  const emotionMap: Record<string, Emotion> = {
    // Go Emotions model
    'admiration': 'joy',
    'amusement': 'joy',
    'approval': 'joy',
    'caring': 'love',
    'desire': 'love',
    'excitement': 'joy',
    'gratitude': 'joy',
    'joy': 'joy',
    'love': 'love',
    'optimism': 'joy',
    'pride': 'joy',
    'relief': 'joy',
    
    'anger': 'anger',
    'annoyance': 'anger',
    'disapproval': 'anger',
    'disgust': 'anger',
    
    'embarrassment': 'fear',
    'fear': 'fear',
    'nervousness': 'fear',
    'anxiety': 'fear',
    
    'grief': 'sadness',
    'remorse': 'sadness',
    'sadness': 'sadness',
    'disappointment': 'sadness',
    
    'confusion': 'surprise',
    'curiosity': 'surprise',
    'realization': 'surprise',
    'surprise': 'surprise',
    
    'neutral': 'neutral'
  };
  
  return emotionMap[label.toLowerCase()] || 'neutral';
};
