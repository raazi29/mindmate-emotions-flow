import React, { useState, useEffect, useCallback, useRef, lazy, Suspense, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import EmotionTracker from '@/components/EmotionTracker';
// Lazy load heavy components
const EmotionTimeline = lazy(() => import('@/components/EmotionTimeline'));
const EmotionInsights = lazy(() => import('@/components/EmotionInsights'));
const EmotionRecommendations = lazy(() => import('@/components/EmotionRecommendations'));
const RealtimeEmotionDetector = lazy(() => import('@/components/RealtimeEmotionDetector'));
const EmotionalInsightML = lazy(() => import('@/components/EmotionalInsightML'));
const EmotionPrediction = lazy(() => import('@/components/EmotionPrediction'));
const EmotionResponse = lazy(() => import('@/components/EmotionResponse'));
const EmotionFlowChart = lazy(() => import('@/components/EmotionFlowChart'));
const EmotionCalendarHeatmap = lazy(() => import('@/components/EmotionCalendarHeatmap'));
const EmotionTransitionAnalysis = lazy(() => import('@/components/EmotionTransitionAnalysis'));
const EmotionPatternDetector = lazy(() => import('@/components/EmotionPatternDetector'));
import HuggingFaceSetup from '@/components/HuggingFaceSetup';
import { toast } from '@/hooks/use-toast';
import { getHuggingFace, isHuggingFaceAvailable } from '@/utils/huggingfaceUtils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/components/ThemeProvider';
import { Loader2, BarChart, Clock, Calendar, PieChart, TrendingUp, LayoutDashboard, Activity, RefreshCw, Workflow } from 'lucide-react';
import emotionService, { SystemStatus } from '@/utils/emotionService';
import EmotionSuggestionsDialog from '@/components/EmotionSuggestionsDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PerformanceMonitor from '@/components/PerformanceMonitor';
import LoadingFallback from '@/components/LoadingFallback';
import { useNavigate } from 'react-router-dom';

type Emotion = 'joy' | 'sadness' | 'anger' | 'fear' | 'love' | 'surprise' | 'neutral';

// Improved timeline data structure for better performance
interface EmotionTimelineEntry {
  timestamp: Date;
  emotion: Emotion;
  intensity: number;
}

// New EmotionalInsightsDashboard component for the enhanced overview section
const EmotionalInsightsDashboard = React.memo(({ 
  emotionHistory, 
  currentEmotion 
}: { 
  emotionHistory: {emotion: Emotion; timestamp: Date}[]; 
  currentEmotion: Emotion; 
}) => {
  // Force component to refresh when a new input happens
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Listen for real-time emotion changes
  useEffect(() => {
    // Update dashboard stats when a new emotion is detected or currentEmotion changes
    console.log("EmotionalInsightsDashboard: Current emotion changed to", currentEmotion);
    setRefreshKey(prev => prev + 1);
    
    const handleNewEmotion = (emotion: { emotion: Emotion; confidence: number; intensity?: number }) => {
      // Force refresh of dashboard stats immediately when a new emotion is detected
      console.log("EmotionalInsightsDashboard: New emotion detected from service:", emotion.emotion);
      setRefreshKey(prev => prev + 1);
    };
    
    // Add listener for new emotion events
    emotionService.onEmotionDetected(handleNewEmotion);
    
    return () => {
      // Clean up listener when component unmounts
      emotionService.offEmotionDetected(handleNewEmotion);
    };
  }, [currentEmotion]);
  
  // Also update when emotionHistory changes
  useEffect(() => {
    console.log("EmotionalInsightsDashboard: Emotion history changed, length:", emotionHistory.length);
    setRefreshKey(prev => prev + 1);
  }, [emotionHistory.length]);
  
  // Calculate quick stats from the emotion history - memoized but will refresh when refreshKey changes
  const stats = useMemo(() => {
    console.log('Recalculating dashboard stats with', emotionHistory.length, 'entries, refreshKey:', refreshKey);
    
    if (!emotionHistory || emotionHistory.length === 0) {
      return {
        dominantEmotion: 'neutral' as Emotion,
        emotionCounts: {},
        weeklyChange: 0,
        entriesThisWeek: 0,
        entriesLastWeek: 0,
        mostFrequentTime: '12 PM',
        longestStreak: 0
      };
    }

    // Ensure all timestamps are valid Date objects
    const validEntries = emotionHistory.filter(entry => 
      entry && 
      entry.emotion && 
      entry.timestamp && 
      (entry.timestamp instanceof Date || !isNaN(new Date(entry.timestamp).getTime()))
    ).map(entry => ({
      emotion: entry.emotion,
      timestamp: entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp)
    }));

    console.log("EmotionalInsightsDashboard: Valid entries for stats:", validEntries.length);
    
    if (validEntries.length === 0) {
      return {
        dominantEmotion: 'neutral' as Emotion,
        emotionCounts: {},
        weeklyChange: 0,
        entriesThisWeek: 0,
        entriesLastWeek: 0,
        mostFrequentTime: '12 PM',
        longestStreak: 0
      };
    }

    // Count emotions
    const emotionCounts: Record<string, number> = {};
    validEntries.forEach(entry => {
      emotionCounts[entry.emotion] = (emotionCounts[entry.emotion] || 0) + 1;
    });

    // Find dominant emotion
    let dominantEmotion: Emotion = 'neutral';
    let maxCount = 0;
    Object.entries(emotionCounts).forEach(([emotion, count]) => {
      if (count > maxCount) {
        maxCount = count;
        dominantEmotion = emotion as Emotion;
      }
    });

    // Calculate entries this week vs last week
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const entriesThisWeek = validEntries.filter(
      entry => entry.timestamp >= oneWeekAgo
    ).length;

    const entriesLastWeek = validEntries.filter(
      entry => entry.timestamp >= twoWeeksAgo && entry.timestamp < oneWeekAgo
    ).length;

    // Calculate percentage change
    const weeklyChange = entriesLastWeek > 0 
      ? Math.round(((entriesThisWeek - entriesLastWeek) / entriesLastWeek) * 100) 
      : entriesThisWeek > 0 ? 100 : 0;

    // Find most frequent time of day
    const hourCounts: Record<number, number> = {};
    validEntries.forEach(entry => {
      const hour = entry.timestamp.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    let mostFrequentHour = 12;
    let maxHourCount = 0;
    Object.entries(hourCounts).forEach(([hour, count]) => {
      if (count > maxHourCount) {
        maxHourCount = count;
        mostFrequentHour = parseInt(hour);
      }
    });

    // Format hour to AM/PM
    const mostFrequentTime = mostFrequentHour === 0 
      ? '12 AM' 
      : mostFrequentHour === 12 
        ? '12 PM' 
        : mostFrequentHour > 12 
          ? `${mostFrequentHour - 12} PM` 
          : `${mostFrequentHour} AM`;

    // Calculate longest streak of consecutive days with entries
    let longestStreak = 0;
    let currentStreak = 0;
    
    // Get unique dates
    const uniqueDates = new Set(
      validEntries.map(entry => 
        entry.timestamp.toISOString().split('T')[0]
      )
    );
    
    // Convert to array and sort
    const sortedDates = Array.from(uniqueDates).sort();
    
    if (sortedDates.length > 0) {
      currentStreak = 1;
      longestStreak = 1;
      
      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i-1]);
        const currDate = new Date(sortedDates[i]);
        
        // Check if dates are consecutive
        const dayDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (Math.round(dayDiff) === 1) {
          currentStreak++;
          if (currentStreak > longestStreak) {
            longestStreak = currentStreak;
          }
        } else {
          currentStreak = 1;
        }
      }
    }

    return {
      dominantEmotion,
      emotionCounts,
      weeklyChange,
      entriesThisWeek,
      entriesLastWeek,
      mostFrequentTime,
      longestStreak
    };
  }, [emotionHistory, refreshKey]);  // Add refreshKey as dependency to recalculate on changes

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

  // Add animation classes for UI updates
  const [animateUpdate, setAnimateUpdate] = useState(false);
  
  useEffect(() => {
    // Trigger animation when stats change
    setAnimateUpdate(true);
    const timer = setTimeout(() => setAnimateUpdate(false), 300);
    return () => clearTimeout(timer);
  }, [stats]);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold tracking-tight">Emotion Insights</h2>
        <Badge 
          variant="outline" 
          className="bg-primary/5 text-primary hover:bg-primary/10"
        >
          Real-time
        </Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`overflow-hidden transition-all duration-300 ${animateUpdate ? 'ring-2 ring-primary/50 shadow-lg' : 'shadow-sm'}`}>
          <CardHeader className="pb-2 bg-gradient-to-br from-primary/5 to-transparent">
            <CardTitle className="text-sm font-medium flex items-center">
              <BarChart className="h-4 w-4 mr-2 text-primary/70" />
              Dominant Emotion
            </CardTitle>
            <CardDescription>Most frequent emotion</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="text-4xl transition-all duration-300 hover:scale-110">
                {getEmotionEmoji(stats.dominantEmotion)}
              </div>
              <div>
                <div className="text-xl font-semibold">
                  {stats.dominantEmotion.charAt(0).toUpperCase() + stats.dominantEmotion.slice(1)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {emotionHistory.length} total entries
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`overflow-hidden transition-all duration-300 ${animateUpdate ? 'ring-2 ring-primary/50 shadow-lg' : 'shadow-sm'}`}>
          <CardHeader className="pb-2 bg-gradient-to-br from-primary/5 to-transparent">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-primary/70" />
              Weekly Activity
            </CardTitle>
            <CardDescription>Comparison to last week</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-col">
              <div className="text-3xl font-bold">
                {stats.entriesThisWeek}
                <span className={`text-sm ml-2 font-normal ${stats.weeklyChange >= 0 ? 'text-green-500' : 'text-red-500'} transition-all duration-300`}>
                  {stats.weeklyChange > 0 ? '+' : ''}{stats.weeklyChange}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                vs {stats.entriesLastWeek} entries last week
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`overflow-hidden transition-all duration-300 ${animateUpdate ? 'ring-2 ring-primary/50 shadow-lg' : 'shadow-sm'}`}>
          <CardHeader className="pb-2 bg-gradient-to-br from-primary/5 to-transparent">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="h-4 w-4 mr-2 text-primary/70" />
              Optimal Time
            </CardTitle>
            <CardDescription>Most frequent check-in time</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-col">
              <div className="text-3xl font-bold">
                {stats.mostFrequentTime}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Best time for emotion tracking
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`overflow-hidden transition-all duration-300 ${animateUpdate ? 'ring-2 ring-primary/50 shadow-lg' : 'shadow-sm'}`}>
          <CardHeader className="pb-2 bg-gradient-to-br from-primary/5 to-transparent">
            <CardTitle className="text-sm font-medium flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-primary/70" />
              Longest Streak
            </CardTitle>
            <CardDescription>Consecutive days logging</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-col">
              <div className="text-3xl font-bold">
                {stats.longestStreak}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.longestStreak === 1 ? 'day' : 'days'} of consecutive tracking
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

const Dashboard = () => {
  const { theme, setTheme } = useTheme();
  const isDarkMode = theme === 'dark';
  const navigate = useNavigate();
  
  // Central emotion state management
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('neutral');
  const [emotionIntensity, setEmotionIntensity] = useState<number>(5);
  const [hfEnabled, setHfEnabled] = useState<boolean>(false);
  const [journalEntries, setJournalEntries] = useState<string[]>([]);
  const [showAdvancedAnalysis, setShowAdvancedAnalysis] = useState<boolean>(false);
  const [timelineData, setTimelineData] = useState<EmotionTimelineEntry[]>([]);
  const [emotionHistory, setEmotionHistory] = useState<{ emotion: Emotion; timestamp: Date }[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [visualizationTab, setVisualizationTab] = useState<string>('timeline');
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion | null>(null);
  const [showPatternDetector, setShowPatternDetector] = useState<boolean>(false);
  const [needsHfSetup, setNeedsHfSetup] = useState<boolean>(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>('offline');
  const [showRecommendations, setShowRecommendations] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add refreshKey state BEFORE it's used in other functions
  const [globalRefreshKey, setGlobalRefreshKey] = useState<number>(0);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Create a function to force refresh all components
  const forceGlobalRefresh = useCallback(() => {
    console.log("Dashboard: Forcing global refresh of all components");
    setGlobalRefreshKey(prev => prev + 1);
    setRefreshKey(prev => prev + 1);
  }, []);
  
  // Performance optimization: Track if component is visible
  // Remove this state as it's causing performance issues
  // const [visibilityState, setVisibilityState] = useState({
  //   recommendations: false,
  //   patternDetector: false,
  //   visualizations: false
  // });
  
  // Add refs for elements we want to lazy-load
  const recommendationsRef = useRef<HTMLDivElement>(null);
  const patternDetectorRef = useRef<HTMLDivElement>(null);
  const visualizationsRef = useRef<HTMLDivElement>(null);
  
  // Set up intersection observers for performant lazy loading
  // Remove this effect as it's causing unnecessary rerenders
  // useEffect(() => {
  //   // Create intersection observer
  //   const observerOptions = {
  //     root: null,
  //     rootMargin: '0px',
  //     threshold: 0.1
  //   };
  //   
  //   const handleIntersection = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => {
  //     entries.forEach(entry => {
  //       if (entry.target === recommendationsRef.current) {
  //         setVisibilityState(prev => ({ ...prev, recommendations: entry.isIntersecting }));
  //       } else if (entry.target === patternDetectorRef.current) {
  //         setVisibilityState(prev => ({ ...prev, patternDetector: entry.isIntersecting }));
  //       } else if (entry.target === visualizationsRef.current) {
  //         setVisibilityState(prev => ({ ...prev, visualizations: entry.isIntersecting }));
  //       }
  //     });
  //   };
  //   
  //   const observer = new IntersectionObserver(handleIntersection, observerOptions);
  //   
  //   // Observe elements
  //   if (recommendationsRef.current) observer.observe(recommendationsRef.current);
  //   if (patternDetectorRef.current) observer.observe(patternDetectorRef.current);
  //   if (visualizationsRef.current) observer.observe(visualizationsRef.current);
  //   
  //   return () => {
  //     observer.disconnect();
  //   };
  // }, []);
  
  // Real-time update interval (in milliseconds)
  const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds
  
  // Load journal entries and emotion history from localStorage
  useEffect(() => {
    try {
      // Load journal entries - optimize with batch processing
      const loadData = async () => {
        setIsRefreshing(true);
        // Load journal entries
        const savedEntries = localStorage.getItem('moodJournalEntries');
        if (savedEntries) {
          const parsed = JSON.parse(savedEntries);
          
          // Process in chunks for better performance
          const CHUNK_SIZE = 50;
          const processEntries = (entries: any[]) => {
            try {
              const entriesWithDates = entries.map((entry: any) => ({
                ...entry,
                timestamp: new Date(entry.timestamp)
              }));
              
              // Extract text content for ML analysis - limit to recent entries
              const textEntries = entriesWithDates.slice(0, 50).map((entry: any) => entry.text);
              
              // Generate timeline data from journal entries - limit for performance
              const timelineEntries: EmotionTimelineEntry[] = entriesWithDates
                .filter((entry: any) => entry.emotion) // Only entries with emotions
                .slice(0, 200) // Limit for performance
                .map((entry: any) => ({
                  timestamp: new Date(entry.timestamp),
                  emotion: entry.emotion as Emotion,
                  intensity: entry.confidence ? Math.round(entry.confidence * 10) : 5
                }));
              
              return { 
                textEntries, 
                timelineEntries, 
                entriesWithDates: entriesWithDates.slice(0, 300) // Limit for performance
              };
            } catch (error) {
              console.error("Error processing entries:", error);
              return { 
                textEntries: [], 
                timelineEntries: [], 
                entriesWithDates: [] 
              };
            }
          };
          
          // Process in chunks if there are too many entries
          if (parsed.length > CHUNK_SIZE) {
            // Only process the most recent entries for initial load
            const recentEntries = parsed.slice(0, 100);
            const { textEntries, timelineEntries, entriesWithDates } = processEntries(recentEntries);
            
            setJournalEntries(textEntries);
            setTimelineData(timelineEntries);
            
            // Set emotion history for flow chart and heatmap
            setEmotionHistory(
              entriesWithDates
                .filter((entry: any) => entry.emotion)
                .map((entry: any) => ({
                  emotion: entry.emotion as Emotion,
                  timestamp: new Date(entry.timestamp)
                }))
            );
            
            // Process the rest in the background
            setTimeout(() => {
              const remainingEntries = parsed.slice(100);
              const { textEntries, timelineEntries, entriesWithDates } = processEntries(remainingEntries);
              
              setJournalEntries(prev => [...textEntries, ...prev]);
              setTimelineData(prev => [...timelineEntries, ...prev]);
              
              // Update emotion history
              setEmotionHistory(prev => [
                ...prev,
                ...entriesWithDates
                  .filter((entry: any) => entry.emotion)
                  .map((entry: any) => ({
                    emotion: entry.emotion as Emotion,
                    timestamp: new Date(entry.timestamp)
                  }))
              ]);
            }, 1000); // Delay to not block the UI
          } else {
            const { textEntries, timelineEntries, entriesWithDates } = processEntries(parsed);
            
            setJournalEntries(textEntries);
            setTimelineData(timelineEntries);
            
            // Set emotion history for flow chart and heatmap
            setEmotionHistory(
              entriesWithDates
                .filter((entry: any) => entry.emotion)
                .map((entry: any) => ({
                  emotion: entry.emotion as Emotion,
                  timestamp: new Date(entry.timestamp)
                }))
            );
          }
        }
        
        // Load emotion history (separate from journal entries)
        const savedHistory = localStorage.getItem('emotionHistory');
        if (savedHistory) {
          const parsed = JSON.parse(savedHistory);
          const historyWithDates = parsed.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          }));
          
          // Merge with existing history from journal entries - using Set for deduplication
          setEmotionHistory(prev => {
            // Create a combined array and remove duplicates by timestamp
            const combined = [...prev, ...historyWithDates];
            const uniqueMap = new Map();
            
            combined.forEach(item => {
              const key = item.timestamp.getTime();
              uniqueMap.set(key, item);
            });
            
            // Convert back to array and sort by timestamp
            return Array.from(uniqueMap.values())
              .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          });
        }
        
        setIsRefreshing(false);
      };
      
      loadData();
    } catch (error) {
      console.error('Error loading saved data:', error);
      setIsRefreshing(false);
    }
  }, []);
  
  // Save emotion history to localStorage when it changes - debounce for performance
  useEffect(() => {
    const saveDebounce = setTimeout(() => {
      if (emotionHistory.length > 0) {
        try {
          // Only save the most recent 300 entries to prevent memory issues
          const historyToSave = emotionHistory.slice(-300);
          localStorage.setItem('emotionHistory', JSON.stringify(historyToSave));
        } catch (error) {
          console.error('Error saving emotion history:', error);
        }
      }
    }, 2000);
    
    return () => clearTimeout(saveDebounce);
  }, [emotionHistory]);
  
  // Memoize timeline data processing for better performance
  const processedTimelineData = React.useMemo(() => {
    // Return a limited slice of data for better performance
    return timelineData.slice(0, 100);
  }, [timelineData]);
  
  // Memoize emotion history for visualizations
  const processedEmotionHistory = React.useMemo(() => {
    // Limit the history data based on current visualization needs
    if (visualizationTab === 'calendar') {
      // For calendar, we need recent data
      return emotionHistory.slice(-100);
    } else if (visualizationTab === 'flow') {
      // For flow chart, limit to fewer entries for performance
      return emotionHistory.slice(-50);
    } else if (visualizationTab === 'analysis') {
      // For analysis, use more comprehensive data
      return emotionHistory.slice(-200);
    } else {
      // Default case
      return emotionHistory.slice(-100);
    }
  }, [emotionHistory, visualizationTab]);
  
  // Handler for Hugging Face setup completion
  const handleHfSetupComplete = useCallback(() => {
    setHfEnabled(true);
    setShowAdvancedAnalysis(true);
    setNeedsHfSetup(false);
    toast({
      title: 'Setup Complete',
      description: 'Advanced emotion detection is now active.',
    });
  }, []);
  
  // Start real-time updates and register for events
  useEffect(() => {
    // Start real-time polling
    const stopRealtimeUpdates = emotionService.startRealtimeUpdates(5000);
    
    // Register for real-time emotion events
    const handleRealtimeEmotion = (result: { emotion: Emotion; intensity?: number }) => {
      // Update current emotion state when a new emotion is detected
      setCurrentEmotion(result.emotion as Emotion);
      if (result.intensity) setEmotionIntensity(result.intensity);
      
      // Add to timeline data for real-time updating
      const newTimelineEntry: EmotionTimelineEntry = {
        timestamp: new Date(),
        emotion: result.emotion as Emotion,
        intensity: result.intensity || 5
      };
      
      setTimelineData(prev => [newTimelineEntry, ...prev].slice(0, 200));
      
      // Add to emotion history for flow chart and heatmap
      const newHistoryEntry = {
        emotion: result.emotion as Emotion,
        timestamp: new Date()
      };
      
      setEmotionHistory(prev => {
        const newHistory = [...prev, newHistoryEntry];
        return newHistory.length > 500 ? newHistory.slice(-500) : newHistory;
      });
      
      // Let users know dashboard is updating in real-time
      toast({
        title: "Real-time update",
        description: `Detected: ${result.emotion} (intensity: ${result.intensity || 5})`,
        duration: 2000,
      });
    };
    
    emotionService.onEmotionDetected(handleRealtimeEmotion);
    
    // Check initial status
    emotionService.checkBackendStatus()
      .then(status => {
        if (status) {
          setSystemStatus(status.status === 'online' ? 'online' : 'degraded');
          setIsLoading(false);
          toast({
            title: 'Real-time Emotion Tracking Active',
            description: 'Live updates are now enabled',
          });
        }
      })
      .catch(() => {
        setIsLoading(false);
        setSystemStatus('offline');
      });
    
    // Cleanup
    return () => {
      stopRealtimeUpdates();
      emotionService.offEmotionDetected(handleRealtimeEmotion);
    };
  }, []);
  
  // Handler for new journal entries
  const handleNewJournalEntry = useCallback((entryText: string, emotion?: string) => {
    // Update journal entries for ML analysis - limit size for performance
    setJournalEntries(prev => [entryText, ...prev].slice(0, 100));
    
    // If emotion was detected, update current emotion
    if (emotion) {
      setCurrentEmotion(emotion as Emotion);
      
      // Add to emotion history
      setEmotionHistory(prev => {
        const newHistory = [
          ...prev,
          {
            emotion: emotion as Emotion,
            timestamp: new Date()
          }
        ];
        // Keep history size reasonable
        return newHistory.length > 500 ? newHistory.slice(-500) : newHistory;
      });
    }
  }, []);
  
  // Auto-refresh data periodically
  const startAutoRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }
    
    refreshTimerRef.current = setInterval(() => {
      // Only trigger refresh if Hugging Face is enabled
      if (hfEnabled) {
        setIsRefreshing(true);
        
        // Refresh data from backend when auto-refreshing
        emotionService.checkBackendStatus()
          .then(status => {
            if (status && status.status === 'online') {
              // Backend is healthy, clear any error states
              setErrorState(null);
              setSystemStatus('online');
            }
          })
          .catch(error => {
            console.error('Auto-refresh error:', error);
          })
          .finally(() => {
            setIsRefreshing(false);
          });
      }
    }, 15000); // Reduced to 15 seconds for more real-time updates
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [hfEnabled]);

  // Start auto-refresh when component mounts
  useEffect(() => {
    const cleanup = startAutoRefresh();
    return cleanup;
  }, [startAutoRefresh]);

  // Force refresh all data with proper error handling
  const handleForceRefresh = useCallback(() => {
    setIsRefreshing(true);
    setErrorState(null);
    
    // Restart real-time updates
    emotionService.stopRealtimeUpdates();
    emotionService.startRealtimeUpdates(5000);
    
    // Check backend connection first
    emotionService.checkBackendStatus()
      .then(status => {
        if (status && (status.status === 'online' || status.status === 'degraded')) {
          setSystemStatus(status.status);
          
          // Clear caches for fresh data
          emotionService.clearEmotionCache();
          
          toast({
            title: 'Real-time Tracking Refreshed',
            description: 'All emotion data has been updated.',
          });
        } else {
          setSystemStatus('offline');
          setErrorState('Cannot connect to backend services. Some features may not work properly.');
          
          toast({
            title: 'Limited Refresh',
            description: 'Backend services are unavailable. Using cached data.',
            variant: 'destructive'
          });
        }
      })
      .catch(error => {
        console.error('Error during refresh:', error);
        setSystemStatus('offline');
        setErrorState('Failed to refresh data. Please try again later.');
        
        toast({
          title: 'Refresh Failed',
          description: 'Could not update emotion data. Please try again.',
          variant: 'destructive'
        });
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  }, []);

  // New handler for emotion selection in visualizations
  const handleEmotionSelection = useCallback((emotion: Emotion | null) => {
    setSelectedEmotion(emotion);
  }, []);

  // Check system status periodically
  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        // Use the emotionService to check status
        const backendStatus = await emotionService.checkBackendStatus();
        
        if (backendStatus && backendStatus.status === 'online') {
          setSystemStatus('online');
        } else if (backendStatus) {
          setSystemStatus('degraded');
        } else {
          setSystemStatus('offline');
        }
      } catch (error) {
        console.error('Error checking system status:', error);
        setSystemStatus('offline');
      } finally {
        // Set loading to false after initial status check
        setIsLoading(false);
      }
    };
    
    // Check immediately
    checkSystemStatus();
    
    // Set up periodic check every 30 seconds
    const statusInterval = setInterval(checkSystemStatus, 30000);
    
    return () => {
      clearInterval(statusInterval);
    };
  }, []);

  // Keyboard shortcut for theme toggle (Shift+T)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey && event.key === 'T') {
        setTheme(theme === 'dark' ? 'light' : 'dark');
        toast({
          title: `${theme === 'dark' ? 'Light' : 'Dark'} Mode Activated`,
          description: `Interface switched to ${theme === 'dark' ? 'light' : 'dark'} mode.`,
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [theme, setTheme]);

  // Check if Hugging Face is available via environment variable
  useEffect(() => {
    const checkHfAvailability = async () => {
      const hfAvailable = isHuggingFaceAvailable();
      if (hfAvailable) {
        setHfEnabled(true);
        setShowAdvancedAnalysis(true);
        toast({
          title: 'Hugging Face Connected',
          description: 'Advanced emotion detection is now active.',
        });
      } else {
        console.info('Hugging Face API key not found');
        setNeedsHfSetup(true);
      }
    };
    
    checkHfAvailability();
  }, []);

  // Update the handleEmotionDetected function to ensure dashboard updates
  const handleEmotionDetected = useCallback((emotion: string, intensity?: number) => {
    try {
      console.log("Dashboard: New emotion detected:", emotion);
      setCurrentEmotion(emotion as Emotion);
      if (intensity) setEmotionIntensity(intensity);
      
      // Add to timeline data for real-time updating
      const newTimelineEntry: EmotionTimelineEntry = {
        timestamp: new Date(),
        emotion: emotion as Emotion,
        intensity: intensity || 5
      };
      
      setTimelineData(prev => [newTimelineEntry, ...prev].slice(0, 200));
      
      // Add to emotion history for flow chart and heatmap
      const newHistoryEntry = {
        emotion: emotion as Emotion,
        timestamp: new Date()
      };
      
      setEmotionHistory(prev => {
        const newHistory = [...prev, newHistoryEntry];
        return newHistory.length > 500 ? newHistory.slice(-500) : newHistory;
      });
      
      // Force refresh components to ensure real-time updates
      forceGlobalRefresh();
      
      // Update the dashboard in real-time when user selects an emotion manually
      toast({
        title: "Dashboard updated",
        description: `You selected: ${emotion}`,
        duration: 2000,
      });
    } catch (error) {
      console.error('Error handling emotion detection:', error);
      setErrorState('Failed to process emotion data. Please refresh and try again.');
    }
  }, [forceGlobalRefresh]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-6 py-8 rounded-lg border bg-card/60 shadow-md">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold tracking-tight mb-2">Loading MindMate Dashboard</h2>
            <p className="text-sm text-muted-foreground mb-4">Connecting to emotion services and loading your data</p>
            <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-pulse rounded-full" style={{width: '60%'}}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 pt-16 pb-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <PerformanceMonitor />
          
          {errorState && (
            <div className="mb-8 p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-md">
              <p className="text-red-700 dark:text-red-400">{errorState}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleForceRefresh} 
                className="mt-2"
                disabled={isRefreshing}
              >
                {isRefreshing ? 'Retrying...' : 'Restart Real-time Connection'}
              </Button>
            </div>
          )}
          
          <div className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">Welcome back, Alex</h1>
              <p className="text-muted-foreground">Real-time emotion tracking and analysis</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={
                systemStatus === 'online' ? 'default' :
                systemStatus === 'degraded' ? 'outline' :
                'destructive'
              }>
                {systemStatus === 'online' ? 'Real-time Active' :
                 systemStatus === 'degraded' ? 'Limited Real-time' :
                 'Offline Mode'}
              </Badge>
              <Badge 
                variant="outline" 
                className={`${isDarkMode ? 'bg-primary/10 hover:bg-primary/20' : 'bg-secondary/10 hover:bg-secondary/20'}`}
              >
                {isDarkMode ? 'Dark' : 'Light'} Mode
              </Badge>
              <Button 
                variant="outline"
                size="sm"
                onClick={handleForceRefresh}
                disabled={isRefreshing}
                className="ml-2"
              >
                {isRefreshing ? 
                  <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Refreshing</> : 
                  <><RefreshCw className="h-3 w-3 mr-2" /> Refresh</>
                }
              </Button>
            </div>
          </div>
          
          {/* New stats dashboard */}
          {emotionHistory.length > 0 && !isLoading && (
            <div className="mb-12">
              <EmotionalInsightsDashboard 
                emotionHistory={emotionHistory} 
                currentEmotion={currentEmotion}
                key={`insights-dashboard-${globalRefreshKey}`} // Force re-render when needed
              />
            </div>
          )}
          
          {/* Show HuggingFace setup if needed */}
          {needsHfSetup && (
            <div className="mb-10">
              <HuggingFaceSetup onSetup={handleHfSetupComplete} />
            </div>
          )}
          
          {/* Simplified layout with card containers */}
          <div className="space-y-10">
            {/* Main tools section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <Card className="w-full shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Real-time Emotion Detection</CardTitle>
                  <CardDescription>Analyze your current emotional state from text or voice input</CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<LoadingFallback />}>
                    <RealtimeEmotionDetector 
                      onEmotionDetected={handleEmotionDetected}
                      useHuggingFace={true}
                      useOpenRouter={false}
                    />
                  </Suspense>
                </CardContent>
              </Card>
              
              <Suspense fallback={<LoadingFallback />}>
                {showAdvancedAnalysis && hfEnabled ? (
                  <Card className="w-full shadow-md">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">ML Emotion Analysis</CardTitle>
                      <CardDescription>AI-powered insights about your emotional patterns</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <EmotionalInsightML 
                        currentEmotion={currentEmotion}
                        journalEntries={journalEntries.slice(0, 20)}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="w-full shadow-md">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Emotion Insights</CardTitle>
                      <CardDescription>Understanding your emotional state</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <EmotionInsights />
                    </CardContent>
                  </Card>
                )}
              </Suspense>
            </div>
            
            {/* Response section */}
            <Suspense fallback={<LoadingFallback />}>
              <Card className="w-full shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Emotional Guidance</CardTitle>
                  <CardDescription>Personalized suggestions based on your current emotional state</CardDescription>
                </CardHeader>
                <CardContent>
                  <EmotionResponse 
                    emotion={currentEmotion} 
                    intensity={emotionIntensity}
                    isPremium={isDarkMode}
                  />
                </CardContent>
              </Card>
            </Suspense>
            
            {/* Controls section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-5 rounded-lg border shadow-md">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={showPatternDetector ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    console.log("Dashboard: Toggling pattern detector visibility");
                    setShowPatternDetector(!showPatternDetector);
                  }}
                  className="flex items-center"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  {showPatternDetector ? 'Hide Patterns' : 'Show Patterns'}
                </Button>
                
                <Button
                  variant={showRecommendations ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    console.log("Dashboard: Toggling recommendations visibility");
                    setShowRecommendations(!showRecommendations);
                  }}
                  className="flex items-center"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  {showRecommendations ? 'Hide Recommendations' : 'Show Recommendations'}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigate('/emotions-flow');
                  }}
                  className="flex items-center"
                >
                  <Workflow className="h-4 w-4 mr-2" />
                  Emotions Flow
                </Button>
                
                <EmotionSuggestionsDialog emotion={currentEmotion} intensity={emotionIntensity} />
              </div>
              
              <Button
                variant={showAdvancedAnalysis ? "default" : "secondary"}
                size="sm"
                onClick={() => {
                  if (hfEnabled) {
                    setShowAdvancedAnalysis(!showAdvancedAnalysis);
                    setRefreshKey(prev => prev + 1);
                    forceGlobalRefresh();
                  } else {
                    toast({
                      title: 'Advanced Analysis Unavailable',
                      description: 'Hugging Face API key is not configured in environment variables.',
                      variant: 'destructive'
                    });
                  }
                }}
                disabled={!hfEnabled}
                className="flex items-center"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                {showAdvancedAnalysis ? 'Basic Insights' : 'ML Analysis'}
              </Button>
            </div>
            
            {/* Pattern Detector (Conditional) */}
            {showPatternDetector && (
              <Card className="shadow-md overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Emotion Pattern Detection</CardTitle>
                  <CardDescription>Analyzing recurring patterns in your emotional data</CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<LoadingFallback />}>
                    <div className="relative">
                      <EmotionPatternDetector 
                        emotionHistory={emotionHistory.slice(-100)} 
                      />
                      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                        Showing patterns from most recent 100 entries
                      </div>
                    </div>
                  </Suspense>
                </CardContent>
              </Card>
            )}
            
            {/* Visualization section - lazy load when visible */}
            <div ref={visualizationsRef}>
              <Card className="shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Emotion Visualizations</CardTitle>
                  <CardDescription>Visual representations of your emotional patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-card rounded-lg border shadow-sm p-4">
                      <Tabs 
                        defaultValue="timeline" 
                        value={visualizationTab} 
                        onValueChange={setVisualizationTab}
                        className="w-full"
                      >
                        <TabsList className="grid w-full grid-cols-4 mb-4">
                          <TabsTrigger value="timeline">Timeline</TabsTrigger>
                          <TabsTrigger value="flow">Flow Chart</TabsTrigger>
                          <TabsTrigger value="calendar">Calendar</TabsTrigger>
                          <TabsTrigger value="analysis">Analysis</TabsTrigger>
                        </TabsList>
                        
                        <Suspense fallback={<LoadingFallback />}>
                          <TabsContent value="timeline">
                            <EmotionTimeline data={processedTimelineData} />
                          </TabsContent>
                          
                          <TabsContent value="flow">
                            <EmotionFlowChart 
                              emotionHistory={emotionHistory.slice(-50)} 
                              currentEmotion={currentEmotion} 
                              key={`flow-chart-${globalRefreshKey}`}
                            />
                          </TabsContent>
                          
                          <TabsContent value="calendar">
                            <EmotionCalendarHeatmap 
                              emotionHistory={emotionHistory}
                              days={28}
                              key={`calendar-${globalRefreshKey}`}
                            />
                          </TabsContent>
                          
                          <TabsContent value="analysis">
                            <EmotionTransitionAnalysis 
                              emotionHistory={emotionHistory}
                              selectedEmotion={selectedEmotion}
                              key={`analysis-${globalRefreshKey}`}
                            />
                          </TabsContent>
                        </Suspense>
                      </Tabs>
                    </div>
                    
                    {showRecommendations && (
                      <div className="space-y-6">
                        <Suspense fallback={<LoadingFallback />}>
                          <Card className="shadow-sm">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg">Recommendations</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <EmotionRecommendations 
                                emotion={currentEmotion} 
                              />
                            </CardContent>
                          </Card>
                          
                          {hfEnabled && (
                            <Card className="shadow-sm">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-lg">Predictions</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <EmotionPrediction 
                                  currentEmotion={currentEmotion}
                                  recentEntries={journalEntries.slice(0, 10)}
                                />
                              </CardContent>
                            </Card>
                          )}
                        </Suspense>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Link to Emotions Flow */}
            <div className="p-6 bg-muted/30 rounded-lg border shadow-sm flex flex-col sm:flex-row items-center justify-between">
              <div className="mb-4 sm:mb-0 text-center sm:text-left">
                <h3 className="text-xl font-semibold">In-Depth Emotion Analysis</h3>
                <p className="text-muted-foreground max-w-md mt-1">
                  Explore your emotional patterns, cycles, and transitions in a dedicated view.
                </p>
              </div>
              <Button 
                onClick={() => navigate('/emotions-flow')} 
                size="lg"
                className="gap-2"
              >
                <Workflow className="h-5 w-5" />
                Explore Emotions Flow
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default React.memo(Dashboard);
