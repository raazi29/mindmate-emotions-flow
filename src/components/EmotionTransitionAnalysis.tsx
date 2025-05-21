import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Clock, TrendingUp, Activity, ArrowRight, Info, BarChart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/ThemeProvider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type Emotion = 'joy' | 'sadness' | 'anger' | 'fear' | 'love' | 'surprise' | 'neutral';

interface EmotionTransitionAnalysisProps {
  emotionHistory: { emotion: Emotion; timestamp: Date }[];
  selectedEmotion?: Emotion | null;
}

const EmotionTransitionAnalysis: React.FC<EmotionTransitionAnalysisProps> = ({
  emotionHistory = [],
  selectedEmotion = null
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [activeTab, setActiveTab] = useState<string>('transitions');
  const [focusedEmotion, setFocusedEmotion] = useState<Emotion | null>(
    selectedEmotion || null
  );

  // Emotion colors - updated with theme support
  const emotionColors: Record<Emotion, { light: string, dark: string }> = {
    joy: { light: '#FFD700', dark: '#FFC107' }, // Gold/Amber
    sadness: { light: '#6495ED', dark: '#5C81E8' }, // CornflowerBlue
    fear: { light: '#9370DB', dark: '#9C27B0' }, // MediumPurple/Purple
    anger: { light: '#FF4500', dark: '#F44336' }, // OrangeRed/Red
    love: { light: '#FF69B4', dark: '#E91E63' }, // HotPink/Pink
    surprise: { light: '#00BFFF', dark: '#03A9F4' }, // DeepSkyBlue/LightBlue
    neutral: { light: '#A9A9A9', dark: '#9E9E9E' } // DarkGray/Gray
  };

  // Get active color based on current theme
  const getEmotionColor = (emotion: Emotion): string => {
    return isDarkMode ? emotionColors[emotion].dark : emotionColors[emotion].light;
  };

  // Process the emotion history to extract meaningful transition patterns
  const transitionAnalysis = useMemo(() => {
    if (emotionHistory.length < 2) return null;

    // Sort history by timestamp
    const sortedHistory = [...emotionHistory].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Generate transition pairs
    const transitions: Array<{
      from: Emotion;
      to: Emotion;
      timestamp: Date;
      timeDelta: number; // time in ms since previous entry
    }> = [];

    for (let i = 1; i < sortedHistory.length; i++) {
      transitions.push({
        from: sortedHistory[i-1].emotion,
        to: sortedHistory[i].emotion,
        timestamp: sortedHistory[i].timestamp,
        timeDelta: sortedHistory[i].timestamp.getTime() - sortedHistory[i-1].timestamp.getTime()
      });
    }

    // Count transitions by type
    const transitionCounts: Record<string, number> = {};
    transitions.forEach(t => {
      const key = `${t.from}_${t.to}`;
      transitionCounts[key] = (transitionCounts[key] || 0) + 1;
    });

    // Filter to only include transitions for selected emotion if specified
    const filteredTransitions = focusedEmotion 
      ? transitions.filter(t => t.from === focusedEmotion || t.to === focusedEmotion)
      : transitions;

    // Calculate average transition duration by type
    const transitionDurations: Record<string, number> = {};
    const transitionDurationCounts: Record<string, number> = {};
    
    filteredTransitions.forEach(t => {
      const key = `${t.from}_${t.to}`;
      if (!transitionDurations[key]) {
        transitionDurations[key] = 0;
        transitionDurationCounts[key] = 0;
      }
      transitionDurations[key] += t.timeDelta;
      transitionDurationCounts[key]++;
    });
    
    // Calculate averages
    Object.keys(transitionDurations).forEach(key => {
      transitionDurations[key] = transitionDurations[key] / transitionDurationCounts[key];
    });

    // Find most frequent transitions
    const mostFrequentTransitions = Object.entries(transitionCounts)
      .map(([key, count]) => {
        const [from, to] = key.split('_') as [Emotion, Emotion];
        return { from, to, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5

    // Calculate transition stability (how consistently emotions transition)
    const emotionTransitionVariety: Record<Emotion, number> = {} as Record<Emotion, number>;
    
    // Count unique transitions for each emotion
    sortedHistory.forEach((entry, i) => {
      if (i === 0) return;
      const from = sortedHistory[i-1].emotion;
      
      if (!emotionTransitionVariety[from]) {
        emotionTransitionVariety[from] = 0;
      }
      
      // Count unique transitions
      const uniqueTransitions = new Set<Emotion>();
      for (let j = 0; j < transitions.length; j++) {
        if (transitions[j].from === from) {
          uniqueTransitions.add(transitions[j].to);
        }
      }
      
      emotionTransitionVariety[from] = uniqueTransitions.size;
    });

    // Detect emotional cycles (emotions that lead back to themselves)
    const emotionalCycles: Array<{
      path: Emotion[];
      count: number;
    }> = [];
    
    // Check for direct cycles (A → B → A)
    const emotionPairs = new Map<string, number>();
    for (let i = 0; i < filteredTransitions.length - 1; i++) {
      const first = filteredTransitions[i];
      const second = filteredTransitions[i+1];
      
      if (first.from === second.to) {
        const cycle = [first.from, first.to, second.to];
        const cycleKey = cycle.join('→');
        
        if (!emotionPairs.has(cycleKey)) {
          emotionPairs.set(cycleKey, 0);
        }
        emotionPairs.set(cycleKey, emotionPairs.get(cycleKey)! + 1);
      }
    }
    
    // Convert to array and sort
    Array.from(emotionPairs.entries()).forEach(([path, count]) => {
      emotionalCycles.push({
        path: path.split('→') as Emotion[],
        count
      });
    });
    
    // Sort by count
    emotionalCycles.sort((a, b) => b.count - a.count);

    // Analyze time patterns (time of day correlations)
    const timeOfDayPatterns: Record<Emotion, Record<string, number>> = {} as Record<Emotion, Record<string, number>>;
    const emotions: Emotion[] = ['joy', 'sadness', 'anger', 'fear', 'love', 'surprise', 'neutral'];
    
    // Initialize time patterns
    emotions.forEach(emotion => {
      timeOfDayPatterns[emotion] = {
        morning: 0,   // 6am-12pm
        afternoon: 0, // 12pm-6pm
        evening: 0,   // 6pm-12am
        night: 0      // 12am-6am
      };
    });
    
    // Count emotion occurrences by time of day
    sortedHistory.forEach(entry => {
      const hour = entry.timestamp.getHours();
      let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
      
      if (hour >= 6 && hour < 12) timeOfDay = 'morning';
      else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
      else if (hour >= 18 && hour < 24) timeOfDay = 'evening';
      else timeOfDay = 'night';
      
      timeOfDayPatterns[entry.emotion][timeOfDay]++;
    });

    return {
      totalTransitions: transitions.length,
      mostFrequentTransitions,
      emotionTransitionVariety,
      emotionalCycles: emotionalCycles.slice(0, 3),
      avgTransitionTimes: transitionDurations,
      timeOfDayPatterns
    };
  }, [emotionHistory, focusedEmotion]);

  // Helper to get emoji for emotion
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

  // Format milliseconds to human readable duration
  const formatDuration = (ms: number): string => {
    if (ms < 60000) { // Less than a minute
      return `${Math.round(ms / 1000)}s`;
    } else if (ms < 3600000) { // Less than an hour
      return `${Math.round(ms / 60000)}m`;
    } else if (ms < 86400000) { // Less than a day
      return `${Math.round(ms / 3600000)}h`;
    } else {
      return `${Math.round(ms / 86400000)}d`; // Days
    }
  };

  const handleEmotionClick = (emotion: Emotion) => {
    setFocusedEmotion(focusedEmotion === emotion ? null : emotion);
  };

  if (!transitionAnalysis) {
    return (
      <Card className="shadow-lg animate-fade-in">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Emotion Transition Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center p-6">
            Not enough emotion data to analyze transitions yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg animate-fade-in">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Emotion Transition Analysis
            {focusedEmotion && (
              <Badge variant="outline" className="ml-2 text-xs">
                {getEmotionEmoji(focusedEmotion)} {focusedEmotion}
              </Badge>
            )}
          </CardTitle>
          {focusedEmotion && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setFocusedEmotion(null)}
              className="h-7 text-xs"
            >
              Clear Filter
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="transitions">Transitions</TabsTrigger>
            <TabsTrigger value="timing">Timing</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
          </TabsList>
          
          <TabsContent value="transitions" className="space-y-4">
            {/* Most frequent transitions */}
            <div>
              <h3 className="text-sm font-medium flex items-center mb-2">
                <BarChart3 className="h-4 w-4 mr-1 text-primary" />
                Most Frequent Transitions
              </h3>
              <div className="space-y-2">
                {transitionAnalysis.mostFrequentTransitions
                  .filter(t => !focusedEmotion || t.from === focusedEmotion || t.to === focusedEmotion)
                  .map((transition, i) => (
                    <div 
                      key={i} 
                      className="flex justify-between items-center p-2 rounded-md transition-colors hover:bg-muted/50"
                      style={{
                        background: `linear-gradient(to right, ${getEmotionColor(transition.from)}20, ${getEmotionColor(transition.to)}20)`
                      }}
                    >
                      <div className="flex items-center">
                        <Button 
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full mr-1"
                          style={{ 
                            backgroundColor: `${getEmotionColor(transition.from)}40`,
                            color: isDarkMode ? 'white' : 'black'
                          }}
                          onClick={() => handleEmotionClick(transition.from)}
                        >
                          {getEmotionEmoji(transition.from)}
                        </Button>
                        <ArrowRight className="h-3 w-3 mx-1 text-muted-foreground" />
                        <Button 
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full"
                          style={{ 
                            backgroundColor: `${getEmotionColor(transition.to)}40`,
                            color: isDarkMode ? 'white' : 'black'
                          }}
                          onClick={() => handleEmotionClick(transition.to)}
                        >
                          {getEmotionEmoji(transition.to)}
                        </Button>
                        <span className="ml-2 text-xs capitalize">
                          {transition.from} to {transition.to}
                        </span>
                      </div>
                      <Badge variant="secondary">{transition.count}x</Badge>
                    </div>
                  ))}
                
                {transitionAnalysis.mostFrequentTransitions
                  .filter(t => !focusedEmotion || t.from === focusedEmotion || t.to === focusedEmotion)
                  .length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No matching transitions found.
                    </p>
                  )}
              </div>
              
              {!focusedEmotion && (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground italic">
                    Tip: Click on an emotion to filter transitions
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="timing" className="space-y-4">
            {/* Transition timing */}
            <div>
              <h3 className="text-sm font-medium flex items-center mb-2">
                <Clock className="h-4 w-4 mr-1 text-primary" />
                Average Transition Times
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(transitionAnalysis.avgTransitionTimes)
                  .filter(([key]) => {
                    if (!focusedEmotion) return true;
                    const [from, to] = key.split('_');
                    return from === focusedEmotion || to === focusedEmotion;
                  })
                  .sort((a, b) => a[1] - b[1]) // Sort by duration
                  .slice(0, 6) // Show only top 6
                  .map(([key, duration], i) => {
                    const [from, to] = key.split('_') as [Emotion, Emotion];
                    return (
                      <div 
                        key={i} 
                        className="flex justify-between items-center p-2 rounded-md"
                        style={{
                          background: `linear-gradient(to right, ${getEmotionColor(from)}20, ${getEmotionColor(to)}20)`
                        }}
                      >
                        <div className="flex items-center text-xs">
                          <Button 
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full mr-1"
                            style={{ 
                              backgroundColor: `${getEmotionColor(from)}40`,
                              color: isDarkMode ? 'white' : 'black'
                            }}
                            onClick={() => handleEmotionClick(from)}
                          >
                            {getEmotionEmoji(from)}
                          </Button>
                          <ArrowRight className="h-3 w-3 mx-1 text-muted-foreground" />
                          <Button 
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full"
                            style={{ 
                              backgroundColor: `${getEmotionColor(to)}40`,
                              color: isDarkMode ? 'white' : 'black'
                            }}
                            onClick={() => handleEmotionClick(to)}
                          >
                            {getEmotionEmoji(to)}
                          </Button>
                        </div>
                        <span className="text-xs font-mono px-2 py-1 bg-muted rounded">
                          {formatDuration(duration)}
                        </span>
                      </div>
                    );
                  })
                }
                
                {Object.entries(transitionAnalysis.avgTransitionTimes)
                  .filter(([key]) => {
                    if (!focusedEmotion) return true;
                    const [from, to] = key.split('_');
                    return from === focusedEmotion || to === focusedEmotion;
                  })
                  .length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2 col-span-2">
                      No matching timing data found.
                    </p>
                  )}
              </div>
            </div>
            
            {/* Time of day patterns */}
            <div className="mt-4">
              <h3 className="text-sm font-medium flex items-center mb-2">
                <Info className="h-4 w-4 mr-1 text-primary" />
                Time of Day Patterns
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['morning', 'afternoon', 'evening', 'night'].map(timeOfDay => {
                  // Find dominant emotion for this time of day
                  const emotions = Object.entries(transitionAnalysis.timeOfDayPatterns)
                    .map(([emotion, patterns]) => ({
                      emotion: emotion as Emotion,
                      count: patterns[timeOfDay]
                    }))
                    .filter(e => e.count > 0)
                    .sort((a, b) => b.count - a.count);
                  
                  const dominant = emotions[0] || { emotion: 'neutral' as Emotion, count: 0 };
                  const totalCount = emotions.reduce((sum, e) => sum + e.count, 0);
                  
                  return (
                    <div 
                      key={timeOfDay}
                      className="p-2 rounded-md flex flex-col items-center"
                      style={{
                        backgroundColor: dominant.count > 0 
                          ? `${getEmotionColor(dominant.emotion)}20` 
                          : 'transparent',
                        border: '1px solid',
                        borderColor: dominant.count > 0 
                          ? `${getEmotionColor(dominant.emotion)}40` 
                          : 'var(--border)'
                      }}
                    >
                      <div className="text-xs font-medium mb-1 capitalize">
                        {timeOfDay}
                      </div>
                      {dominant.count > 0 ? (
                        <>
                          <div className="text-2xl mb-1">
                            {getEmotionEmoji(dominant.emotion)}
                          </div>
                          <div className="text-xs text-center">
                            <span className="capitalize">{dominant.emotion}</span>
                            <span className="block text-muted-foreground">
                              {totalCount} entries
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground py-2">
                          No data
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="patterns" className="space-y-4">
            {/* Emotional cycles */}
            <div>
              <h3 className="text-sm font-medium flex items-center mb-2">
                <BarChart className="h-4 w-4 mr-1 text-primary" />
                Emotional Cycles
              </h3>
              <div className="space-y-2">
                {transitionAnalysis.emotionalCycles
                  .filter(cycle => 
                    !focusedEmotion || 
                    cycle.path.includes(focusedEmotion)
                  )
                  .map((cycle, i) => (
                    <div 
                      key={i} 
                      className="flex justify-between items-center p-2 rounded-md"
                      style={{
                        background: `linear-gradient(to right, ${cycle.path.map(e => getEmotionColor(e) + '30').join(', ')})`
                      }}
                    >
                      <div className="flex items-center flex-1">
                        {cycle.path.map((emotion, i) => (
                          <React.Fragment key={i}>
                            <Button 
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full"
                              style={{ 
                                backgroundColor: `${getEmotionColor(emotion)}40`,
                                color: isDarkMode ? 'white' : 'black'
                              }}
                              onClick={() => handleEmotionClick(emotion)}
                            >
                              {getEmotionEmoji(emotion)}
                            </Button>
                            {i < cycle.path.length - 1 && (
                              <ArrowRight className="h-3 w-3 mx-1 text-muted-foreground" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                      <Badge variant="secondary">{cycle.count}x</Badge>
                    </div>
                  ))}
                
                {transitionAnalysis.emotionalCycles
                  .filter(cycle => 
                    !focusedEmotion || 
                    cycle.path.includes(focusedEmotion)
                  )
                  .length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No emotional cycles detected yet.
                    </p>
                  )}
              </div>
            </div>
            
            {/* Emotion variety */}
            <div className="mt-4">
              <h3 className="text-sm font-medium flex items-center mb-2">
                <TrendingUp className="h-4 w-4 mr-1 text-primary" />
                Emotional Variety
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(transitionAnalysis.emotionTransitionVariety)
                  .filter(([emotion]) => !focusedEmotion || emotion === focusedEmotion)
                  .sort(([_, a], [__, b]) => b - a)
                  .map(([emotion, variety]) => {
                    const maxVariety = 6; // Maximum possible variety (all emotions)
                    const percentVariety = Math.round((variety / maxVariety) * 100);
                    
                    return (
                      <div 
                        key={emotion}
                        className="p-2 rounded-md"
                        style={{
                          backgroundColor: `${getEmotionColor(emotion as Emotion)}20`
                        }}
                      >
                        <div className="flex items-center mb-2">
                          <Button 
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full mr-2"
                            style={{ 
                              backgroundColor: `${getEmotionColor(emotion as Emotion)}40`,
                              color: isDarkMode ? 'white' : 'black'
                            }}
                            onClick={() => handleEmotionClick(emotion as Emotion)}
                          >
                            {getEmotionEmoji(emotion as Emotion)}
                          </Button>
                          <div className="flex-1">
                            <div className="text-xs font-medium capitalize">
                              {emotion}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Transitions to {variety} different emotions
                            </div>
                          </div>
                        </div>
                        
                        {/* Variety bar */}
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${percentVariety}%`,
                              backgroundColor: getEmotionColor(emotion as Emotion)
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EmotionTransitionAnalysis; 