import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LineChart, TrendingUp, Brain } from 'lucide-react';
import { getHuggingFace, isHuggingFaceAvailable } from '@/utils/huggingfaceUtils';
import { useToast } from '@/hooks/use-toast';
import { predictFutureEmotions, predictEmotionsOffline } from '@/utils/advancedEmotionModels';

type Emotion = 'joy' | 'sadness' | 'anger' | 'fear' | 'love' | 'surprise' | 'neutral';

interface EmotionPredictionProps {
  currentEmotion: Emotion;
  recentEntries?: string[];
}

const EmotionPrediction = ({
  currentEmotion,
  recentEntries = []
}: EmotionPredictionProps) => {
  const [loading, setLoading] = useState(false);
  const [predictedEmotion, setPredictedEmotion] = useState<Emotion | null>(null);
  const [predictionConfidence, setPredictionConfidence] = useState(0);
  const [emotionTrajectory, setEmotionTrajectory] = useState<string>('');
  const [isUsingOfflineModel, setIsUsingOfflineModel] = useState(false);
  const { toast } = useToast();
  
  // Get emotion trajectory explanation - memoized
  const getTrajectoryExplanation = useCallback((current: Emotion, predicted: Emotion): string => {
    if (current === predicted) {
      return `Your ${current} emotion is likely to continue in the near future.`;
    }
    
    const trajectories: Record<string, Record<string, string>> = {
      joy: {
        neutral: "Your happiness may settle into a more balanced state soon.",
        sadness: "Your current joy might be followed by some reflection or melancholy.",
        surprise: "Your positive mood could lead to unexpected discoveries or realizations.",
        love: "Your happiness might deepen into feelings of connection and appreciation.",
        fear: "Your positive feelings may be accompanied by some anticipation or concern.",
        anger: "Your excitement might become frustration if expectations aren't met."
      },
      sadness: {
        neutral: "Your sadness is likely to ease into a more balanced emotional state.",
        joy: "Your emotional state may improve as you process your feelings.",
        surprise: "An unexpected development might shift your emotional perspective.",
        love: "Connecting with others could help transform your current feelings.",
        fear: "Your sadness might be accompanied by uncertainty about the future.",
        anger: "Your sadness could develop into frustration if not addressed."
      },
      anger: {
        neutral: "Your frustration is likely to subside as you process your emotions.",
        joy: "After expressing your feelings, you might experience relief and positivity.",
        sadness: "Your anger might transition to disappointment as energy dissipates.",
        surprise: "An unexpected development could redirect your emotional energy.",
        love: "Reconciliation or understanding may follow once anger subsides.",
        fear: "Your anger might mask underlying concerns or insecurities."
      },
      fear: {
        neutral: "Your anxiety is likely to stabilize as you gain perspective.",
        joy: "Relief and happiness often follow when fears aren't realized.",
        sadness: "Your worry might turn to disappointment if concerns are confirmed.",
        surprise: "Unexpected developments may shift your perspective on concerns.",
        love: "Support from others can transform anxiety into connection.",
        anger: "Frustration may emerge if your fears feel unaddressed or dismissed."
      },
      love: {
        neutral: "Your feelings of connection may settle into comfortable stability.",
        joy: "Your emotional connection is likely to bring continued happiness.",
        sadness: "Intensity of feelings might lead to reflection or vulnerability.",
        surprise: "New dimensions of your relationships may be revealed.",
        fear: "Deep connection might bring some worry about potential loss.",
        anger: "Passion can sometimes transform if expectations aren't aligned."
      },
      surprise: {
        neutral: "The initial shock will likely settle into normal perspective.",
        joy: "Your surprise might develop into happiness as you process it.",
        sadness: "The unexpected may lead to disappointment upon reflection.",
        love: "Your surprise might reveal deeper feelings of appreciation.",
        fear: "The unexpected could create some uncertainty moving forward.",
        anger: "Surprise may turn to frustration if it disrupts your expectations."
      },
      neutral: {
        joy: "Your balanced state might brighten as positive elements emerge.",
        sadness: "Reflection might lead to recognition of underlying feelings.",
        surprise: "Unexpected developments may disrupt your emotional balance.",
        love: "Deeper connections might develop from your current stability.",
        fear: "New concerns might emerge from your current steady state.",
        anger: "Frustrations may surface if current needs remain unaddressed."
      }
    };
    
    return trajectories[current]?.[predicted] || 
      "Your emotional state is likely to evolve based on your experiences and responses.";
  }, []);
  
  // Predict the next emotional state using ML models or offline prediction - memoized
  const predictNextEmotion = useCallback(async () => {
    // Don't update if already loading to prevent duplicate calls
    if (loading) return;
    
    console.log("EmotionPrediction: Predicting next emotion from current:", currentEmotion);
    
    // Check if Hugging Face is available
    const hfAvailable = isHuggingFaceAvailable();
    setIsUsingOfflineModel(!hfAvailable);
    
    setLoading(true);
    
    try {
      // Combine recent entries for better prediction context
      const combinedText = recentEntries.join(' ') || 
        `The current emotion is ${currentEmotion}.`;
      
      let prediction;
      if (hfAvailable) {
        // Use HuggingFace model
        const hf = getHuggingFace();
        prediction = await predictFutureEmotions(
          combinedText,
          currentEmotion,
          hf
        );
      } else {
        // Use offline prediction
        prediction = predictEmotionsOffline(
          combinedText,
          currentEmotion
        );
        
        // Show a notice that we're using the offline model
        toast({
          title: 'Using Offline Prediction',
          description: 'Using pattern-based prediction since ML model is unavailable.',
          variant: 'default'
        });
      }
      
      // Update state with prediction results
      setPredictedEmotion(prediction.nextEmotion as Emotion);
      setPredictionConfidence(Math.round(prediction.confidence * 100));
      
      // Get descriptive explanation of the emotional trajectory
      setEmotionTrajectory(getTrajectoryExplanation(
        currentEmotion, 
        prediction.nextEmotion as Emotion
      ));
      
    } catch (error) {
      console.error('Error predicting emotions:', error);
      
      // Use offline model as last resort if other methods fail
      try {
        const offlinePrediction = predictEmotionsOffline(
          `The current emotion is ${currentEmotion}.`,
          currentEmotion
        );
        
        setPredictedEmotion(offlinePrediction.nextEmotion);
        setPredictionConfidence(Math.round(offlinePrediction.confidence * 100));
        setEmotionTrajectory(getTrajectoryExplanation(
          currentEmotion, 
          offlinePrediction.nextEmotion
        ));
        
        setIsUsingOfflineModel(true);
        
        toast({
          title: 'Using Fallback Prediction',
          description: 'Using basic pattern-based prediction after ML model failed.',
          variant: 'default'
        });
      } catch (fallbackError) {
        toast({
          title: 'Prediction Error',
          description: 'Unable to predict emotional trajectory. Please try again.',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  }, [currentEmotion, recentEntries, loading, toast, getTrajectoryExplanation]);
  
  // Predict on initial load or when current emotion changes
  useEffect(() => {
    if (currentEmotion) {
      predictNextEmotion();
    }
  }, [currentEmotion, predictNextEmotion]);
  
  // Get emoji for emotion - memoized
  const emotionEmoji = useMemo(() => {
    const getEmotionEmoji = (emotion: Emotion): string => {
      const emojis: Record<string, string> = {
        joy: '😊',
        sadness: '😢',
        anger: '😠',
        fear: '😨',
        love: '❤️',
        surprise: '😲',
        neutral: '😐'
      };
      return emojis[emotion] || '😐';
    };
    
    return {
      current: getEmotionEmoji(currentEmotion),
      predicted: predictedEmotion ? getEmotionEmoji(predictedEmotion) : '❓'
    };
  }, [currentEmotion, predictedEmotion]);

  return (
    <Card className="w-full h-full glass dark:glass-dark border-none shadow-lg animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          Emotion Prediction
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-xl">
              {emotionEmoji.current}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current</p>
              <p className="font-medium capitalize">{currentEmotion}</p>
            </div>
          </div>
          
          {predictedEmotion && (
            <div className="flex flex-row items-center gap-3">
              <div className="h-10 w-10 text-lg">→</div>
              <div className="flex items-center gap-2">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                  {emotionEmoji.predicted}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Predicted</p>
                  <p className="font-medium capitalize">{predictedEmotion}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {predictedEmotion && (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span>Prediction Confidence</span>
              <span className="text-primary font-medium">{predictionConfidence}%</span>
            </div>
            <Progress value={predictionConfidence} className="h-2" />
            
            <div className="bg-primary/10 rounded-lg p-3 mt-3">
              <div className="flex items-center gap-2 mb-1">
                <Brain className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">
                  {isUsingOfflineModel ? 'Pattern Analysis' : 'ML Analysis'}
                </p>
              </div>
              <p className="text-sm">{emotionTrajectory}</p>
            </div>
          </div>
        )}
        
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={predictNextEmotion}
          disabled={loading}
        >
          {loading ? 'Analyzing...' : 'Refresh Prediction'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default React.memo(EmotionPrediction); 