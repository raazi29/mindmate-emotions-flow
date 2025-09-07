import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BrainCircuit, 
  Loader2, 
  Search, 
  HelpCircle, 
  PencilRuler,
  ListChecks,
  LightbulbIcon,
  ArrowRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface EmotionAnalysisResult {
  primary_emotion: string;
  secondary_emotions: string[];
  intensity?: number;
  insights: string;
  suggestions: string[];
}

interface EmotionHistory {
  date: string;
  emotion: string;
  text: string;
}

interface EmotionAnalysisCardProps {
  onComplete?: (result: EmotionAnalysisResult) => void;
  userHistory?: EmotionHistory[];
  initialText?: string;
}

const EmotionAnalysisCard = ({
  onComplete,
  userHistory = [],
  initialText = ''
}) => {
  const [text, setText] = useState<string>(initialText);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<EmotionAnalysisResult | null>(null);
  const { toast } = useToast();

  const analyzeEmotion = async () => {
    if (text.trim().length < 10) {
      toast({
        title: "Text too short",
        description: "Please enter at least 10 characters for accurate analysis.",
        variant: "destructive"
      });
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      const response = await fetch('http://localhost:8000/emotion-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          user_history: userHistory.length > 0 ? userHistory : undefined
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const analysisResult = await response.json();
      setResult(analysisResult);
      
      if (onComplete) {
        onComplete(analysisResult);
      }
      
    } catch (error) {
      console.error('Error analyzing emotions:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze emotions. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getEmotionColor = (emotion: string): string => {
    const emotionColors: Record<string, string> = {
      joy: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      happiness: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      sadness: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      grief: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      anger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      frustration: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      fear: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
      anxiety: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
      surprise: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
      love: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
      gratitude: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      contentment: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
      hope: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
      neutral: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300",
    };
    
    return emotionColors[emotion.toLowerCase()] || emotionColors.neutral;
  };

  return (
    <Card className="w-full border-primary/20 shadow-sm transition-all">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            AI Emotion Analysis
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">
                  This AI tool analyzes your text to identify emotions, provide insights, 
                  and suggest constructive ways to process your feelings.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription>
          Get insights into your emotional state and helpful suggestions
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <Textarea
            placeholder="Describe your thoughts and feelings in detail for the best analysis..."
            className="min-h-[100px] resize-none"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isAnalyzing}
          />
          
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium">Primary emotion:</span>
                    <Badge className={`${getEmotionColor(result.primary_emotion)}`}>
                      {result.primary_emotion}
                    </Badge>
                  </div>
                  
                  {result.intensity && (
                    <div className="ml-auto flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Intensity:</span>
                      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${result.intensity * 10}%` }}
                        />
                      </div>
                      <span className="text-xs">{result.intensity}/10</span>
                    </div>
                  )}
                </div>
                
                {result.secondary_emotions && result.secondary_emotions.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Secondary emotions:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {result.secondary_emotions.map((emotion, i) => (
                        <Badge key={i} variant="outline" className={`${getEmotionColor(emotion)}`}>
                          {emotion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <Separator />
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <LightbulbIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Insights</span>
                  </div>
                  <p className="text-sm">{result.insights}</p>
                </div>
                
                {result.suggestions && result.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ListChecks className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Suggestions</span>
                    </div>
                    <ul className="space-y-1 ml-5 list-disc text-sm">
                      {result.suggestions.map((suggestion, i) => (
                        <li key={i}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setResult(null)}
                >
                  <PencilRuler className="h-3.5 w-3.5 mr-1.5" />
                  Write Another
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
      
      {!result && (
        <CardFooter>
          <Button
            className="w-full"
            onClick={analyzeEmotion}
            disabled={isAnalyzing || text.trim().length < 10}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Analyze Emotions
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default EmotionAnalysisCard; 