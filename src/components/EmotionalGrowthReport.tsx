import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LineChart, TrendingUp, TrendingDown, Minus, BarChart, Brain, AlertCircle, Wind, PencilLine } from 'lucide-react';

interface EmotionHistoryEntry {
  date: string;
  emotion: string;
  intensity?: number;
  text?: string;
}

interface EmotionPattern {
  description: string;
  frequency: string;
}

interface EmotionalJourney {
  improved_areas: string[];
  challenge_areas: string[];
  stability: string[];
}

interface ProgressionAnalysis {
  patterns: EmotionPattern[];
  insights: string;
  growth_opportunities: string[];
  emotional_journey: EmotionalJourney;
}

interface EmotionalGrowthReportProps {
  emotionHistory: EmotionHistoryEntry[];
  currentEmotion?: string;
  timePeriod?: 'week' | 'month' | 'quarter' | 'year';
  onActionSelected?: (action: string) => void;
}

const EmotionalGrowthReport: React.FC<EmotionalGrowthReportProps> = ({
  emotionHistory,
  currentEmotion,
  timePeriod = 'week',
  onActionSelected
}) => {
  const [analysis, setAnalysis] = useState<ProgressionAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (emotionHistory.length >= 3) {
      fetchAnalysis();
    } else {
      setError('Need at least 3 emotional entries for meaningful analysis');
    }
  }, [emotionHistory, timePeriod]);

  const fetchAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/emotion-progression-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emotion_history: emotionHistory,
          time_period: timePeriod,
          current_emotion: currentEmotion
        }),
        signal: AbortSignal.timeout(12000) // 12 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setAnalysis(data);
      
    } catch (error) {
      console.error('Error fetching emotion progression analysis:', error);
      setError('Could not analyze your emotional progression. Please try again later.');
      toast({
        title: "Analysis Failed",
        description: "Could not generate your emotional growth report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: string) => {
    if (onActionSelected) {
      onActionSelected(action);
    }
  };

  const getEmotionTrendIcon = (emotion: string) => {
    if (analysis?.emotional_journey.improved_areas.includes(emotion)) {
      return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
    } else if (analysis?.emotional_journey.challenge_areas.includes(emotion)) {
      return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
    } else if (analysis?.emotional_journey.stability.includes(emotion)) {
      return <Minus className="h-3.5 w-3.5 text-amber-500" />;
    }
    return null;
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

  // Helper to get period in human readable format
  const getPeriodText = () => {
    switch (timePeriod) {
      case 'week':
        return 'the past week';
      case 'month':
        return 'the past month';
      case 'quarter':
        return 'the past 3 months';
      case 'year':
        return 'the past year';
      default:
        return 'this period';
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5 text-primary" />
            Analyzing Your Emotional Growth
          </CardTitle>
          <CardDescription>
            Generating insights from your emotional patterns
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">
            Creating your personalized growth report...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5 text-primary" />
            Emotional Growth Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={fetchAnalysis}
            disabled={emotionHistory.length < 3}
          >
            Try Again
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <Card className="w-full transition-all shadow-md hover:shadow-lg border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Emotional Growth Report
        </CardTitle>
        <CardDescription>
          Your emotional patterns and progress over {getPeriodText()}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Tabs defaultValue="insights" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
            <TabsTrigger value="journey">Journey</TabsTrigger>
          </TabsList>
          
          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-4 pt-4">
            <div className="bg-primary/5 rounded-lg border border-primary/10 p-4">
              <div className="flex items-start gap-2">
                <LineChart className="h-5 w-5 text-primary mt-0.5" />
                <p className="text-sm">{analysis.insights}</p>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Growth Opportunities:</h4>
              <ul className="space-y-2">
                {analysis.growth_opportunities.map((opportunity, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <div className="min-w-4 mt-0.5">
                      <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-xs text-primary font-medium">{i + 1}</span>
                      </div>
                    </div>
                    <p className="text-sm">{opportunity}</p>
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>
          
          {/* Patterns Tab */}
          <TabsContent value="patterns" className="space-y-4 pt-4">
            {analysis.patterns.length > 0 ? (
              <div className="space-y-3">
                {analysis.patterns.map((pattern, i) => (
                  <div key={i} className="bg-background border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium">{pattern.description}</p>
                      </div>
                      <Badge variant="outline">{pattern.frequency}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p>Not enough data to identify clear patterns yet.</p>
                <p className="text-sm mt-2">Continue tracking your emotions regularly.</p>
              </div>
            )}
          </TabsContent>
          
          {/* Journey Tab */}
          <TabsContent value="journey" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Improved Areas */}
              <div className="border rounded-lg p-3">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Improved Areas
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.emotional_journey.improved_areas.length > 0 ? (
                    analysis.emotional_journey.improved_areas.map((emotion, i) => (
                      <Badge key={i} className={getEmotionColor(emotion)}>
                        {emotion}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground px-1">None identified yet</p>
                  )}
                </div>
              </div>
              
              {/* Challenges */}
              <div className="border rounded-lg p-3">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Challenge Areas
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.emotional_journey.challenge_areas.length > 0 ? (
                    analysis.emotional_journey.challenge_areas.map((emotion, i) => (
                      <Badge key={i} className={getEmotionColor(emotion)}>
                        {emotion}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground px-1">None identified</p>
                  )}
                </div>
              </div>
              
              {/* Stability */}
              <div className="border rounded-lg p-3">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                  <Minus className="h-4 w-4 text-amber-500" />
                  Stability
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.emotional_journey.stability.length > 0 ? (
                    analysis.emotional_journey.stability.map((emotion, i) => (
                      <Badge key={i} className={getEmotionColor(emotion)}>
                        {emotion}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground px-1">None identified</p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <Separator />
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Recommended Actions:</h4>
          <div className="grid grid-cols-1 gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="justify-start"
              onClick={() => handleActionClick('guided_reflection')}
            >
              <Brain className="h-3.5 w-3.5 mr-2" />
              Start a guided reflection
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="justify-start"
              onClick={() => handleActionClick('mindfulness')}
            >
              <Wind className="h-3.5 w-3.5 mr-2" />
              Try a mindfulness exercise
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="justify-start"
              onClick={() => handleActionClick('journal')}
            >
              <PencilLine className="h-3.5 w-3.5 mr-2" />
              Write a journal entry
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmotionalGrowthReport; 