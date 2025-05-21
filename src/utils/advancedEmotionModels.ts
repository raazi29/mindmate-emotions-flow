import { HfInference } from '@huggingface/inference';
import { toast } from '@/hooks/use-toast';

type Emotion = 'joy' | 'sadness' | 'anger' | 'fear' | 'love' | 'surprise' | 'neutral';

interface EmotionResult {
  emotion: Emotion;
  confidence: number;
  details?: Record<string, number>;
}

interface EmotionInsight {
  dominantEmotion: Emotion;
  intensity: number;
  triggers: string[];
  recommendation: string;
}

/**
 * Uses multiple ML models to achieve more accurate emotion detection
 * Falls back gracefully through different models if any fail
 */
export const detectEmotionWithMultipleModels = async (
  text: string,
  hf: HfInference
): Promise<EmotionResult> => {
  if (!text.trim() || !hf) {
    throw new Error('Text or Hugging Face client is missing');
  }

  try {
    // First try the specialized emotion model (Go Emotions)
    try {
      const result = await hf.textClassification({
        model: 'SamLowe/roberta-base-go_emotions',
        inputs: text,
      });
      
      // Map results to our emotion format
      const mapped = mapEmotionsFromGoEmotions(result);
      return mapped;
    } catch (error) {
      console.warn('Primary emotion model failed, trying sentiment analysis model');
      
      // Fall back to sentiment analysis model
      try {
        const result = await hf.textClassification({
          model: 'distilbert-base-uncased-finetuned-sst-2-english',
          inputs: text,
        });
        
        // Map sentiment to basic emotions
        return mapEmotionsFromSentiment(result);
      } catch (error) {
        console.warn('Sentiment model failed, trying zero-shot classification');
        
        // Fall back to zero-shot classification
        try {
          const result = await hf.zeroShotClassification({
            model: 'facebook/bart-large-mnli',
            inputs: text,
            parameters: {
              candidate_labels: ['joy', 'sadness', 'anger', 'fear', 'love', 'surprise', 'neutral'],
            }
          });
          
          // Cast the API response to access properties safely
          const zeroShotResult = result as any;
          
          // Extract labels and scores based on API response structure
          const labels = zeroShotResult.labels && Array.isArray(zeroShotResult.labels) 
            ? zeroShotResult.labels 
            : ['neutral'];
          const scores = zeroShotResult.scores && Array.isArray(zeroShotResult.scores) 
            ? zeroShotResult.scores 
            : [1.0];
          
          return {
            emotion: labels[0] as Emotion,
            confidence: scores[0],
            details: labels.reduce((acc, label, index) => {
              acc[label] = scores[index];
              return acc;
            }, {} as Record<string, number>)
          };
        } catch (error) {
          throw new Error('All ML models failed');
        }
      }
    }
  } catch (error) {
    console.error('Error in emotion detection:', error);
    throw error;
  }
};

/**
 * Maps results from Go Emotions model to our emotion format
 */
const mapEmotionsFromGoEmotions = (
  results: Array<{ label: string; score: number }>
): EmotionResult => {
  // Standard emotion mapping
  const emotionMap: Record<string, Emotion> = {
    // Joy category
    'admiration': 'joy',
    'amusement': 'joy',
    'approval': 'joy',
    'excitement': 'joy',
    'gratitude': 'joy',
    'joy': 'joy',
    'optimism': 'joy',
    'pride': 'joy',
    'relief': 'joy',
    
    // Love category
    'caring': 'love',
    'desire': 'love',
    'love': 'love',
    
    // Anger category
    'anger': 'anger',
    'annoyance': 'anger',
    'disapproval': 'anger',
    'disgust': 'anger',
    
    // Fear category
    'embarrassment': 'fear',
    'fear': 'fear',
    'nervousness': 'fear',
    'anxiety': 'fear',
    
    // Sadness category
    'grief': 'sadness',
    'remorse': 'sadness',
    'sadness': 'sadness',
    'disappointment': 'sadness',
    
    // Surprise category
    'confusion': 'surprise',
    'curiosity': 'surprise',
    'realization': 'surprise',
    'surprise': 'surprise',
    
    // Neutral
    'neutral': 'neutral'
  };
  
  // Process results and group by our emotion categories
  const emotionScores: Record<Emotion, number> = {
    'joy': 0, 'sadness': 0, 'anger': 0, 
    'fear': 0, 'love': 0, 'surprise': 0, 'neutral': 0
  };
  
  // Combine scores for each emotion category
  results.forEach(({ label, score }) => {
    const mappedEmotion = emotionMap[label.toLowerCase()] || 'neutral';
    emotionScores[mappedEmotion] += score;
  });
  
  // Find the dominant emotion
  let dominantEmotion: Emotion = 'neutral';
  let highestScore = 0;
  
  Object.entries(emotionScores).forEach(([emotion, score]) => {
    if (score > highestScore) {
      highestScore = score;
      dominantEmotion = emotion as Emotion;
    }
  });
  
  return {
    emotion: dominantEmotion,
    confidence: highestScore,
    details: emotionScores
  };
};

/**
 * Maps results from sentiment analysis to basic emotions
 */
const mapEmotionsFromSentiment = (
  results: Array<{ label: string; score: number }>
): EmotionResult => {
  // Get the top sentiment
  const topSentiment = results[0];
  const label = topSentiment.label.toLowerCase();
  
  // Map to basic emotions
  let emotion: Emotion;
  if (label.includes('positive')) {
    emotion = 'joy';
  } else if (label.includes('negative')) {
    emotion = 'sadness';
  } else {
    emotion = 'neutral';
  }
  
  return {
    emotion,
    confidence: topSentiment.score
  };
};

/**
 * Generate deeper emotional insights using text generation
 */
export const generateEmotionalInsight = async (
  text: string,
  emotion: Emotion,
  hf: HfInference
): Promise<EmotionInsight> => {
  try {
    // Default insight if model fails
    const defaultInsight: EmotionInsight = {
      dominantEmotion: emotion,
      intensity: 5,
      triggers: ['Unclear from text'],
      recommendation: 'Practice mindfulness and emotional awareness'
    };
    
    if (!hf || !text || text.length < 10) {
      return defaultInsight;
    }
    
    // Create a prompt for the text generation model
    const prompt = `
      Analyze the following text for emotional content: "${text}"
      
      Current emotion detected: ${emotion}
      
      1. Rate the intensity of the emotion (1-10):
      2. What words or situations triggered this emotion?
      3. What's one helpful recommendation for managing this emotion?
      
      Format your response exactly as:
      Intensity: [number]
      Triggers: [comma separated list]
      Recommendation: [single sentence advice]
    `;
    
    try {
      const result = await hf.textGeneration({
        model: 'google/flan-t5-base',
        inputs: prompt,
        parameters: {
          max_new_tokens: 150,
          temperature: 0.7
        }
      });
      
      // Parse the response
      const response = result.generated_text;
      
      // Extract intensity
      const intensityMatch = response.match(/Intensity:\s*(\d+)/i);
      const intensity = intensityMatch ? parseInt(intensityMatch[1], 10) : 5;
      
      // Extract triggers
      const triggersMatch = response.match(/Triggers:\s*([^\n]+)/i);
      const triggers = triggersMatch 
        ? triggersMatch[1].split(',').map(t => t.trim())
        : ['Unclear from text'];
      
      // Extract recommendation
      const recMatch = response.match(/Recommendation:\s*([^\n]+)/i);
      const recommendation = recMatch 
        ? recMatch[1].trim()
        : 'Practice mindfulness and emotional awareness';
      
      return {
        dominantEmotion: emotion,
        intensity: Math.min(10, Math.max(1, intensity)),
        triggers,
        recommendation
      };
    } catch (error) {
      console.error('Error generating emotional insight:', error);
      return defaultInsight;
    }
  } catch (error) {
    console.error('Error in emotional insight generation:', error);
    throw error;
  }
};

/**
 * Local prediction model using pattern matching and statistical analysis
 * Provides a fallback when HuggingFace API is unavailable
 */
export const predictEmotionsOffline = (
  text: string,
  currentEmotion: Emotion
): { nextEmotion: Emotion; confidence: number } => {
  // Common emotional trajectories based on psychological patterns
  const emotionTrajectories: Record<Emotion, { [key: string]: number }> = {
    joy: { joy: 0.5, neutral: 0.3, surprise: 0.1, love: 0.1 },
    sadness: { sadness: 0.4, neutral: 0.3, anger: 0.2, fear: 0.1 },
    anger: { anger: 0.3, neutral: 0.3, sadness: 0.2, fear: 0.1, joy: 0.1 },
    fear: { fear: 0.3, neutral: 0.3, anxiety: 0.2, sadness: 0.1, surprise: 0.1 },
    love: { love: 0.5, joy: 0.3, neutral: 0.1, sadness: 0.1 },
    surprise: { surprise: 0.3, joy: 0.2, fear: 0.2, neutral: 0.2, sadness: 0.1 },
    neutral: { neutral: 0.4, joy: 0.2, sadness: 0.2, surprise: 0.1, fear: 0.1 }
  };

  // Adjust probabilities based on text content
  const lowerText = text.toLowerCase();
  
  // Check for positive indicators
  const positivePatterns = [
    /better|improving|hopeful|optimistic|looking forward|excited|happy|good news/i,
    /success|achievement|accomplish|proud|celebrate|win|progress/i,
    /grateful|thankful|appreciate|blessed|lucky|fortunate/i,
    /love|care|affection|fond|like|enjoy|adore/i
  ];
  
  // Check for negative indicators
  const negativePatterns = [
    /worse|deteriorating|worried|pessimistic|dreading|anxious|sad|bad news/i,
    /failure|setback|disappointment|ashamed|regret|lose|stuck/i,
    /ungrateful|thankless|unappreciated|cursed|unlucky|unfortunate/i,
    /hate|dislike|aversion|displeased|annoyed|bothered/i
  ];
  
  // Check for neutral/stable indicators
  const neutralPatterns = [
    /same|stable|consistent|unchanged|steady|constant|ongoing/i,
    /continue|maintain|persist|keep|remain|stay/i,
    /neutral|balanced|moderate|average|normal|typical/i
  ];
  
  // Adjust emotion probabilities based on text patterns
  let modifiedTrajectories = { ...emotionTrajectories[currentEmotion] };
  
  // Count pattern matches
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;
  
  positivePatterns.forEach(pattern => {
    if (pattern.test(lowerText)) positiveCount++;
  });
  
  negativePatterns.forEach(pattern => {
    if (pattern.test(lowerText)) negativeCount++;
  });
  
  neutralPatterns.forEach(pattern => {
    if (pattern.test(lowerText)) neutralCount++;
  });
  
  // Determine the dominant direction
  const total = positiveCount + negativeCount + neutralCount;
  if (total > 0) {
    if (positiveCount > negativeCount && positiveCount > neutralCount) {
      // Increase probability of positive emotions
      modifiedTrajectories.joy = (modifiedTrajectories.joy || 0) + 0.2;
      modifiedTrajectories.love = (modifiedTrajectories.love || 0) + 0.1;
      modifiedTrajectories.surprise = (modifiedTrajectories.surprise || 0) + 0.1;
      // Decrease negative emotions
      modifiedTrajectories.sadness = (modifiedTrajectories.sadness || 0) - 0.1;
      modifiedTrajectories.anger = (modifiedTrajectories.anger || 0) - 0.1;
      modifiedTrajectories.fear = (modifiedTrajectories.fear || 0) - 0.1;
    } else if (negativeCount > positiveCount && negativeCount > neutralCount) {
      // Increase probability of negative emotions
      modifiedTrajectories.sadness = (modifiedTrajectories.sadness || 0) + 0.2;
      modifiedTrajectories.anger = (modifiedTrajectories.anger || 0) + 0.1;
      modifiedTrajectories.fear = (modifiedTrajectories.fear || 0) + 0.1;
      // Decrease positive emotions
      modifiedTrajectories.joy = (modifiedTrajectories.joy || 0) - 0.1;
      modifiedTrajectories.love = (modifiedTrajectories.love || 0) - 0.1;
    } else {
      // Increase probability of current emotion or neutral
      modifiedTrajectories.neutral = (modifiedTrajectories.neutral || 0) + 0.2;
      modifiedTrajectories[currentEmotion] = (modifiedTrajectories[currentEmotion] || 0) + 0.1;
    }
  }
  
  // Normalize probabilities to sum to 1
  const sum = Object.values(modifiedTrajectories).reduce((a, b) => a + b, 0);
  Object.keys(modifiedTrajectories).forEach(key => {
    modifiedTrajectories[key] = modifiedTrajectories[key] / sum;
  });
  
  // Select next emotion based on probabilities
  const emotions = Object.keys(modifiedTrajectories) as Emotion[];
  const probabilities = Object.values(modifiedTrajectories);
  
  let nextEmotion: Emotion = currentEmotion;
  let highestProb = 0;
  
  // Find emotion with highest probability
  emotions.forEach((emotion, index) => {
    // Skip invalid emotions
    if (!['joy', 'sadness', 'anger', 'fear', 'love', 'surprise', 'neutral'].includes(emotion)) {
      return;
    }
    
    if (probabilities[index] > highestProb) {
      highestProb = probabilities[index];
      nextEmotion = emotion as Emotion;
    }
  });
  
  // The confidence is the probability of the selected emotion
  return {
    nextEmotion,
    confidence: highestProb
  };
};

/**
 * Predict potential future emotions based on current state
 */
export const predictFutureEmotions = async (
  text: string,
  currentEmotion: Emotion,
  hf: HfInference | null
): Promise<{nextEmotion: Emotion, confidence: number}> => {
  if (!hf) {
    // Use offline prediction if no Hugging Face instance
    return predictEmotionsOffline(text, currentEmotion);
  }
  
  try {
    // Use a zero-shot classification model to predict emotional trajectory
    const prompt = `Based on the following text and current emotion being "${currentEmotion}", predict the most likely next emotional state: "${text}"`;
    
    const result = await hf.textClassification({
      model: 'SamLowe/roberta-base-go_emotions',
      inputs: prompt
    });
    
    if (Array.isArray(result) && result.length > 0) {
      // Process the model output
      const topResult = result[0];
      const emotion = mapEmotionLabel(topResult.label);
      
      return {
        nextEmotion: emotion as Emotion,
        confidence: topResult.score
      };
    } else {
      // Fall back to statistical model if no usable results
      return predictEmotionsOffline(text, currentEmotion);
    }
  } catch (error) {
    console.error('Error predicting emotions with HuggingFace:', error);
    // Fall back to offline prediction
    return predictEmotionsOffline(text, currentEmotion);
  }
};

// Map emotion labels to our standard set of emotions
const mapEmotionLabel = (label: string): Emotion => {
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