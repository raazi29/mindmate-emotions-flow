import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { detectEmotion } from '@/utils/emotionUtils';

type Emotion = 'joy' | 'sadness' | 'anger' | 'fear' | 'love' | 'surprise' | 'neutral';

interface EmotionEntry {
  id: string;
  text: string;
  emotion: Emotion;
  timestamp: Date;
  intensity: number;
}

interface EmotionTrackerProps {
  onEmotionSelected?: (emotion: Emotion, intensity?: number) => void;
}

const EmotionTracker = ({ onEmotionSelected }) => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<Emotion | null>(null);

  const handleEmotionDetection = async () => {
    if (!inputText.trim()) return;
    
    setIsProcessing(true);
    try {
      // In a real app, this would be an API call to a backend
      const detectedEmotion = await detectEmotion(inputText);
      setCurrentEmotion(detectedEmotion.emotion);
      
      // Here we would save the emotion entry to our database
      const entry: EmotionEntry = {
        id: Date.now().toString(),
        text: inputText,
        emotion: detectedEmotion.emotion,
        timestamp: new Date(),
        intensity: detectedEmotion.intensity,
      };
      
      console.log('Saved emotion entry:', entry);
      // We would dispatch this to our state management or database
      
      // Call the callback if provided
      if (onEmotionSelected) {
        onEmotionSelected(detectedEmotion.emotion, detectedEmotion.intensity);
      }
    } catch (error) {
      console.error('Error detecting emotion:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full glass dark:glass-dark border-none shadow-lg animate-fade-in">
      <CardContent className="p-6">
        <h2 className="text-2xl font-semibold mb-4 text-center">How are you feeling?</h2>
        
        <div className="space-y-4">
          <Textarea 
            placeholder="Tell me what's on your mind..." 
            className="min-h-[120px] bg-white/50 dark:bg-black/30 border-white/30 dark:border-white/10 focus:border-primary"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          
          <Button 
            onClick={handleEmotionDetection} 
            className="w-full"
            disabled={isProcessing || !inputText.trim()}
          >
            {isProcessing ? 'Analyzing...' : 'Analyze My Mood'}
          </Button>
        </div>

        {currentEmotion && (
          <div className="mt-6 animate-fade-in">
            <div className={`p-4 rounded-lg bg-${currentEmotion}/20 flex items-center gap-3`}>
              <div className={`w-10 h-10 rounded-full bg-${currentEmotion} flex items-center justify-center text-white`}>
                {getEmotionEmoji(currentEmotion)}
              </div>
              <div>
                <p className="font-medium capitalize">{currentEmotion}</p>
                <p className="text-sm text-muted-foreground">
                  {getEmotionMessage(currentEmotion)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const getEmotionEmoji = (emotion: Emotion): string => {
  const emojis = {
    joy: '😊',
    sadness: '😢',
    anger: '😠',
    fear: '😨',
    love: '❤️',
    surprise: '😲',
    neutral: '😐'
  };
  return emojis[emotion];
};

const getEmotionMessage = (emotion: Emotion): string => {
  const messages = {
    joy: "I'm glad you're feeling happy today!",
    sadness: "I'm here for you during this difficult time.",
    anger: "It's okay to feel frustrated sometimes.",
    fear: "Remember to breathe deeply when feeling anxious.",
    love: "That warm feeling is wonderful to experience.",
    surprise: "Life is full of unexpected moments!",
    neutral: "Sometimes a balanced mood is just what we need."
  };
  return messages[emotion];
};

export default EmotionTracker;
