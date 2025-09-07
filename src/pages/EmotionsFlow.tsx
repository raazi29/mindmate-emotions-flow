import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/components/ThemeProvider';
import Navbar from '@/components/Navbar';
import EmotionFlowChart from '@/components/EmotionFlowChart';
import EmotionTransitionAnalysis from '@/components/EmotionTransitionAnalysis';
import EmotionalInsightML from '@/components/EmotionalInsightML';
// import EmotionPatternDetector from '@/components/EmotionPatternDetector';
import EmotionCalendarHeatmap from '@/components/EmotionCalendarHeatmap';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Suspense } from 'react';
import LoadingFallback from '@/components/LoadingFallback';
import { ArrowLeft, Activity, Calendar, Workflow, BarChart3, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type Emotion = 'joy' | 'sadness' | 'anger' | 'fear' | 'love' | 'surprise' | 'neutral';

interface EmotionEntry {
  emotion: Emotion;
  timestamp: Date;
}

const EmotionsFlow = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  // State management
  const [emotionHistory, setEmotionHistory] = useState<EmotionEntry[]>([]);
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('neutral');
  const [visualizationTab, setVisualizationTab] = useState<string>('flow');
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  
  // Load emotion history from localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('emotionHistory');
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        // Convert string timestamps back to Date objects
        const processedHistory = parsed.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
        setEmotionHistory(processedHistory);
        
        // Set current emotion to the most recent one
        if (processedHistory.length > 0) {
          const sortedHistory = [...processedHistory].sort(
            (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
          );
          setCurrentEmotion(sortedHistory[0].emotion);
        }
      }
    } catch (error) {
      console.error('Error loading emotion history:', error);
    }
  }, []);
  
  // Process emotion data for different visualizations
  const processedEmotionHistory = useMemo(() => {
    // Limit data based on visualization type for performance
    if (visualizationTab === 'calendar') {
      return emotionHistory.slice(-180); // Last ~6 months for calendar
    } else if (visualizationTab === 'flow') {
      return emotionHistory.slice(-50); // Last 50 entries for flow chart
    } else if (visualizationTab === 'patterns') {
      return emotionHistory.slice(-100); // Last 100 entries for pattern detector
    } else if (visualizationTab === 'transitions') {
      return emotionHistory.slice(-200); // More data for transitions analysis
    }
    return emotionHistory.slice(-100); // Default
  }, [emotionHistory, visualizationTab]);
  
  // Statistics for the info card
  const emotionStats = useMemo(() => {
    if (emotionHistory.length === 0) return null;
    
    // Count emotions
    const emotionCounts: Record<Emotion, number> = {
      joy: 0, sadness: 0, anger: 0, fear: 0, 
      love: 0, surprise: 0, neutral: 0
    };
    
    emotionHistory.forEach(entry => {
      emotionCounts[entry.emotion]++;
    });
    
    // Get dominant emotion
    let dominantEmotion = 'neutral' as Emotion;
    let maxCount = 0;
    
    Object.entries(emotionCounts).forEach(([emotion, count]) => {
      if (count > maxCount) {
        maxCount = count;
        dominantEmotion = emotion as Emotion;
      }
    });
    
    // Calculate total transitions
    const transitions = emotionHistory.length > 1 
      ? emotionHistory.length - 1
      : 0;
    
    // Calculate unique emotion transitions
    const uniqueTransitions = new Set<string>();
    
    for (let i = 1; i < emotionHistory.length; i++) {
      const from = emotionHistory[i-1].emotion;
      const to = emotionHistory[i].emotion;
      uniqueTransitions.add(`${from}_${to}`);
    }
    
    return {
      totalEmotions: emotionHistory.length,
      dominantEmotion,
      transitions,
      uniqueTransitions: uniqueTransitions.size
    };
  }, [emotionHistory]);
  
  // Get emoji for emotion
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
  
  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);
  
  // Handle emotion selection
  const handleEmotionSelect = useCallback((emotion: Emotion) => {
    setSelectedEmotion(emotion === selectedEmotion ? null : emotion);
  }, [selectedEmotion]);
  
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container max-w-7xl mx-auto pt-16 px-4 pb-12">
        <div className="space-y-6 mt-8">
          {/* Header section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Emotion Flow Analysis</h1>
              <p className="text-muted-foreground mt-1">
                Visualize and understand your emotional patterns over time
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/dashboard')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              
              <Button
                onClick={handleRefresh}
                variant="secondary"
                size="sm"
                className="gap-2"
              >
                <Activity className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
          
          <Separator />
          
          {emotionHistory.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No emotion data</AlertTitle>
              <AlertDescription>
                Use the Dashboard to record emotions first. Your emotion data will be displayed here.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Stats Card */}
              <Card className="shadow-md h-fit">
                <CardHeader>
                  <CardTitle>Emotion Insights</CardTitle>
                  <CardDescription>Summary of your emotional data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {emotionStats && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted rounded-lg p-3 text-center">
                        <p className="text-sm text-muted-foreground">Emotions Recorded</p>
                        <p className="text-2xl font-bold">{emotionStats.totalEmotions}</p>
                      </div>
                      
                      <div className="bg-muted rounded-lg p-3 text-center">
                        <p className="text-sm text-muted-foreground">Transitions</p>
                        <p className="text-2xl font-bold">{emotionStats.transitions}</p>
                      </div>
                      
                      <div className="bg-muted rounded-lg p-3 text-center">
                        <p className="text-sm text-muted-foreground">Most Common</p>
                        <p className="text-2xl font-bold flex justify-center items-center gap-2">
                          {getEmotionEmoji(emotionStats.dominantEmotion)}
                          <span className="capitalize">{emotionStats.dominantEmotion}</span>
                        </p>
                      </div>
                      
                      <div className="bg-muted rounded-lg p-3 text-center">
                        <p className="text-sm text-muted-foreground">Unique Transitions</p>
                        <p className="text-2xl font-bold">{emotionStats.uniqueTransitions}</p>
                      </div>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-medium mb-2">Current Emotion</h3>
                    <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center text-xl bg-primary/20">
                        {getEmotionEmoji(currentEmotion)}
                      </div>
                      <div>
                        <p className="font-medium capitalize">{currentEmotion}</p>
                        <p className="text-sm text-muted-foreground">Most recent emotion recorded</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Main Visualization Area */}
              <div className="lg:col-span-2">
                <Card className="shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle>Emotion Visualizations</CardTitle>
                    <CardDescription>Explore your emotional patterns through different visualizations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs 
                      defaultValue="flow" 
                      value={visualizationTab} 
                      onValueChange={setVisualizationTab}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-4 mb-4">
                        <TabsTrigger value="flow" className="flex items-center gap-2">
                          <Workflow className="h-4 w-4" />
                          <span className="hidden sm:inline">Flow Chart</span>
                        </TabsTrigger>
                        <TabsTrigger value="patterns" className="flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          <span className="hidden sm:inline">Patterns</span>
                        </TabsTrigger>
                        <TabsTrigger value="transitions" className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          <span className="hidden sm:inline">Transitions</span>
                        </TabsTrigger>
                        <TabsTrigger value="calendar" className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span className="hidden sm:inline">Calendar</span>
                        </TabsTrigger>
                      </TabsList>
                      
                      <div className="min-h-[500px] bg-muted/20 rounded-lg p-4">
                        <Suspense fallback={<LoadingFallback />}>
                          <TabsContent value="flow">
                            <EmotionFlowChart 
                              emotionHistory={processedEmotionHistory} 
                              currentEmotion={currentEmotion} 
                              key={`flow-chart-${refreshKey}`}
                            />
                          </TabsContent>
                          
                          <TabsContent value="patterns">
                            <EmotionalInsightML
                              currentEmotion={currentEmotion}
                              journalEntries={processedEmotionHistory.map(entry => entry.emotion).slice(0, 20)}
                              key={`patterns-${refreshKey}`}
                            />
                          </TabsContent>
                          
                          <TabsContent value="transitions">
                            <EmotionTransitionAnalysis 
                              emotionHistory={processedEmotionHistory}
                              selectedEmotion={selectedEmotion}
                              key={`analysis-${refreshKey}`}
                            />
                          </TabsContent>
                          
                          <TabsContent value="calendar">
                            <EmotionCalendarHeatmap 
                              emotionHistory={processedEmotionHistory}
                              days={90}
                              key={`calendar-${refreshKey}`}
                            />
                          </TabsContent>
                        </Suspense>
                      </div>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EmotionsFlow; 