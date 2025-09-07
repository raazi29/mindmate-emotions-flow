import { useMemo, useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Repeat, AlertCircle, Info, TrendingUp, Clock, RefreshCw, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/components/ThemeProvider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowRight, BarChart, Calendar } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Emotion = 'joy' | 'sadness' | 'anger' | 'fear' | 'love' | 'surprise' | 'neutral';

interface EmotionPatternDetectorProps {
  emotionHistory: { 
    emotion: Emotion; 
    timestamp: Date;
  }[];
}

interface Pattern {
  sequence: Emotion[];
  occurrences: Array<{
    startIndex: number;
    timestamps: Date[];
  }>;
  intervalStats: {
    min: number;
    max: number;
    avg: number;
  };
  description: string;
  significance: number; // 0-1 score of how significant this pattern is
}

// Utility function to debounce function calls
const debounce = <T extends any[]>(
  func: (...args: T) => void, 
  wait: number
): (...args: T) => void => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: T) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
};

const EmotionPatternDetector = ({
  emotionHistory = []
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validHistory, setValidHistory] = useState<Array<{emotion: Emotion; timestamp: Date}>>([]);
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [activeTab, setActiveTab] = useState<string>('sequences');
  
  // Validate and sanitize emotion history entries - optimized
  useEffect(() => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      console.log("EmotionPatternDetector: Processing entries...", emotionHistory.length);
      
      // Safety check for empty array
      if (!emotionHistory || emotionHistory.length === 0) {
        console.log("EmotionPatternDetector: No emotion history provided");
        setError("Need at least 3 emotion entries to detect real-time patterns");
        setValidHistory([]);
        setIsAnalyzing(false);
        return;
      }
      
      // Convert potentially invalid Date objects into valid ones
      let validEntries = [];
      
      // Limit processing to most recent 200 entries for performance
      const recentEntries = emotionHistory.slice(-200);
      
      for (const entry of recentEntries) {
        if (!entry || !entry.emotion) {
          console.log("EmotionPatternDetector: Invalid entry found (missing emotion)");
          continue;
        }
        
        // Handle both Date objects and string timestamps
        let timestamp: Date;
        
        if (entry.timestamp instanceof Date) {
          timestamp = entry.timestamp;
        } else if (typeof entry.timestamp === 'string') {
          timestamp = new Date(entry.timestamp);
        } else {
          console.log("EmotionPatternDetector: Invalid timestamp type:", typeof entry.timestamp);
          continue; // Skip invalid entries
        }
        
        // Verify the date is valid
        if (isNaN(timestamp.getTime())) {
          console.log("EmotionPatternDetector: Invalid date detected");
          continue;
        }
        
        validEntries.push({
          emotion: entry.emotion,
          timestamp
        });
      }
      
      console.log("EmotionPatternDetector received:", emotionHistory.length, "entries");
      console.log("Valid entries:", validEntries.length);
      
      if (validEntries.length < 3) {
        setError(`Need at least 3 valid emotion entries to detect patterns (found ${validEntries.length})`);
        console.log(`EmotionPatternDetector: Not enough valid entries (${validEntries.length})`);
      }
      
      // Log a sample entry to help with debugging
      if (validEntries.length > 0) {
        console.log("EmotionPatternDetector: Sample valid entry:", JSON.stringify({
          emotion: validEntries[0].emotion,
          timestamp: validEntries[0].timestamp.toISOString()
        }));
      }
      
      setValidHistory(validEntries);
    } catch (err) {
      console.error("Error processing emotion history:", err);
      setError("Failed to process emotion data");
    } finally {
      setIsAnalyzing(false);
      setLastAnalysis(new Date());
    }
  }, [emotionHistory]);

  // Analyze patterns in the emotion history - moved to useCallback
  const analyzePatterns = useCallback(() => {
    if (validHistory.length < 3) {
      console.log("EmotionPatternDetector: Not enough entries for pattern analysis");
      setPatterns([]);
      return;
    }
    
    try {
      console.log("EmotionPatternDetector: Starting pattern analysis with", validHistory.length, "entries");
      
      // Sort history by timestamp - limit to last 100 entries for performance
      const sortedHistory = [...validHistory]
        .slice(-100)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      // Log the first and last timestamps to help debugging
      if (sortedHistory.length > 0) {
        console.log("EmotionPatternDetector: Date range:", 
          sortedHistory[0].timestamp.toISOString(), "to", 
          sortedHistory[sortedHistory.length-1].timestamp.toISOString()
        );
      }
      
      // Convert to simple array of emotions
      const emotions = sortedHistory.map(entry => entry.emotion);
      const timestamps = sortedHistory.map(entry => entry.timestamp);
      
      // Find patterns of different lengths (2-4 emotions)
      const allPatterns: Pattern[] = [];
      
      // Check for patterns of different lengths
      for (let patternLength = 2; patternLength <= 4; patternLength++) {
        // Performance optimization: Don't look for longer patterns if we don't have enough entries
        if (emotions.length < patternLength * 2) {
          continue;
        }
        
        // For real-time analysis, require at least 2 occurrences for longer patterns
        const minOccurrences = patternLength <= 2 ? 2 : 1;
        
        // Store pattern sequences and their occurrences
        const patternMap = new Map<string, Pattern>();
        
        // Scan for patterns - limit scan to improve performance
        const maxScanEntries = Math.min(emotions.length, 50); // Prevent excessive processing
        for (let i = 0; i <= maxScanEntries - patternLength; i++) {
          const sequence = emotions.slice(i, i + patternLength);
          const patternKey = sequence.join('→');
          
          // Initialize pattern if not seen before
          if (!patternMap.has(patternKey)) {
            patternMap.set(patternKey, {
              sequence,
              occurrences: [],
              intervalStats: { min: Infinity, max: 0, avg: 0 },
              description: '',
              significance: 0
            });
          }
          
          // Record this occurrence
          const pattern = patternMap.get(patternKey)!;
          pattern.occurrences.push({
            startIndex: i,
            timestamps: timestamps.slice(i, i + patternLength)
          });
        }
        
        // Filter to patterns with sufficient occurrences - real patterns only
        const validPatterns = Array.from(patternMap.values())
          .filter(pattern => pattern.occurrences.length >= minOccurrences);
        
        // Performance optimization: Skip if too many patterns to process
        if (validPatterns.length > 20) {
          const topPatterns = validPatterns.slice(0, 20);
          allPatterns.push(...topPatterns);
          continue;
        }
        
        // Calculate interval statistics
        validPatterns.forEach(pattern => {
          // Skip interval calculations for single occurrences
          if (pattern.occurrences.length < 2) {
            // Single occurrences still need basic stats
            pattern.intervalStats.min = 0;
            pattern.intervalStats.max = 0;
            pattern.intervalStats.avg = 0;
            
            // Single occurrences get lower significance
            pattern.significance = 0.3 * (pattern.sequence.length / 4);
            return;
          }
          
          let totalInterval = 0;
          let occurrenceCount = 0;
          
          for (let i = 1; i < pattern.occurrences.length; i++) {
            const prevOccurrence = pattern.occurrences[i-1];
            const currOccurrence = pattern.occurrences[i];
            
            // Calculate interval between the start of each pattern occurrence
            const interval = currOccurrence.timestamps[0].getTime() - 
                            prevOccurrence.timestamps[0].getTime();
            
            pattern.intervalStats.min = Math.min(pattern.intervalStats.min, interval);
            pattern.intervalStats.max = Math.max(pattern.intervalStats.max, interval);
            totalInterval += interval;
            occurrenceCount++;
          }
          
          pattern.intervalStats.avg = totalInterval / occurrenceCount || 0;
          
          // Calculate significance - prioritize real patterns with multiple occurrences
          // Based on: pattern length, number of occurrences, and consistency of intervals
          const lengthScore = pattern.sequence.length / 4; // 4 is max pattern length
          const occurrenceScore = Math.min(1, pattern.occurrences.length / 3); // Cap at 3 occurrences
          
          // Interval consistency: lower variance = higher score
          let intervalConsistency = 1;
          if (pattern.occurrences.length > 2) {
            const intervalVariance = pattern.intervalStats.max - pattern.intervalStats.min;
            const relativeDifference = intervalVariance / (pattern.intervalStats.avg || 1);
            intervalConsistency = Math.max(0, 1 - (relativeDifference / 2)); // Lower is better
          }
          
          pattern.significance = (lengthScore * 0.3) + (occurrenceScore * 0.5) + (intervalConsistency * 0.2);
        });
        
        allPatterns.push(...validPatterns);
      }
      
      // Filter out non-significant patterns for real-time display
      const significantPatterns = allPatterns.filter(p => p.significance > 0.25);
      
      // Sort by significance and take top patterns
      const topPatterns = significantPatterns
        .sort((a, b) => b.significance - a.significance)
        .slice(0, 5);
      
      // Add descriptions after sorting to save processing
      topPatterns.forEach(pattern => {
        pattern.description = generatePatternDescription(pattern);
      });
      
      setPatterns(topPatterns);
    } catch (err) {
      console.error("Error analyzing patterns:", err);
      setError("Failed to analyze emotion patterns");
      setPatterns([]);
    }
  }, [validHistory]);

  // Create debounced version of analyze function
  const debouncedAnalyze = useCallback(
    debounce(() => {
      if (!isAnalyzing && validHistory.length >= 3) {
        analyzePatterns();
      }
    }, 500),
    [isAnalyzing, validHistory, analyzePatterns]
  );

  // Run pattern analysis when valid history changes - with debounce
  useEffect(() => {
    // Use debounced analysis to prevent UI freezing
    debouncedAnalyze();
    
    return () => {
      // Nothing to clean up here since debounce handles its own cleanup
    };
  }, [validHistory, debouncedAnalyze]);

  // Generate human-readable description of a pattern
  const generatePatternDescription = (pattern: Pattern): string => {
    const { sequence, occurrences, intervalStats } = pattern;
    
    // Formatting for interval
    const formatInterval = (ms: number): string => {
      if (!ms || isNaN(ms)) return 'varying intervals';
      
      const minutes = ms / (1000 * 60);
      const hours = minutes / 60;
      const days = hours / 24;
      
      if (days >= 1) return `${Math.round(days)} day${days !== 1 ? 's' : ''}`;
      if (hours >= 1) return `${Math.round(hours)} hour${hours !== 1 ? 's' : ''}`;
      return `${Math.round(minutes)} minute${minutes !== 1 ? 's' : ''}`;
    };
    
    const occurrenceText = occurrences.length === 2 
      ? 'twice' 
      : `${occurrences.length} times`;
    
    let description = `You experience ${sequence[0]} → ${sequence[sequence.length-1]} ${occurrenceText}`;
    
    // Add middle emotions if sequence is longer than 2
    if (sequence.length > 2) {
      const middleEmotions = sequence.slice(1, -1).join(' → ');
      description = `You move from ${sequence[0]} to ${sequence[sequence.length-1]} through ${middleEmotions} ${occurrenceText}`;
    }
    
    // Add time information
    if (occurrences.length > 1 && intervalStats.avg) {
      description += `, typically every ${formatInterval(intervalStats.avg)}`;
    }
    
    // Special patterns
    const isCircular = sequence[0] === sequence[sequence.length-1];
    if (isCircular && sequence.length > 2) {
      description = `You cycle back to ${sequence[0]} after experiencing ${sequence.slice(1, -1).join(' → ')} ${occurrenceText}`;
    }
    
    const isAlternating = sequence.length === 2 && occurrences.length >= 3;
    if (isAlternating) {
      description = `You alternate between ${sequence[0]} and ${sequence[1]} ${occurrenceText}`;
    }
    
    return description;
  };

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

  // Get color for emotion
  const getEmotionColor = (emotion: Emotion): string => {
    const colors: Record<Emotion, { light: string, dark: string }> = {
      joy: { light: '#FFD700', dark: '#FFC107' }, // Gold/Amber
      sadness: { light: '#6495ED', dark: '#5C81E8' }, // CornflowerBlue
      anger: { light: '#FF4500', dark: '#F44336' }, // OrangeRed/Red
      fear: { light: '#9370DB', dark: '#9C27B0' }, // MediumPurple/Purple
      love: { light: '#FF69B4', dark: '#E91E63' }, // HotPink/Pink
      surprise: { light: '#00BFFF', dark: '#03A9F4' }, // DeepSkyBlue/LightBlue
      neutral: { light: '#A9A9A9', dark: '#9E9E9E' } // DarkGray/Gray
    };
    
    return isDarkMode ? colors[emotion].dark : colors[emotion].light;
  };

  // Format time
  const formatTime = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };
  
  // Format date
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };
  
  // Format time interval
  const formatTimeInterval = (ms: number): string => {
    if (!ms || isNaN(ms)) return 'varying times';
    
    const minutes = ms / (1000 * 60);
    const hours = minutes / 60;
    const days = hours / 24;
    
    if (days >= 1) return `${Math.round(days)} day${days !== 1 ? 's' : ''}`;
    if (hours >= 1) return `${Math.round(hours)} hour${hours !== 1 ? 's' : ''}`;
    return `${Math.round(minutes)} minute${minutes !== 1 ? 's' : ''}`;
  };
  
  // Format timestamp
  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Today at ${formatTime(date)}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${formatTime(date)}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return formatDate(date);
    }
  };
  
  // Generate pattern descriptions
  const generateSequenceDescription = (sequence: Emotion[]): string => {
    if (sequence.length === 2) {
      if (sequence[0] === 'neutral' && sequence[1] !== 'neutral') {
        return `You often move from a neutral state to feeling ${sequence[1]}`;
      } else if (sequence[0] !== 'neutral' && sequence[1] === 'neutral') {
        return `After feeling ${sequence[0]}, you frequently return to a neutral state`;
      } else {
        return `You commonly transition from ${sequence[0]} to ${sequence[1]}`;
      }
    } else {
      return `This is a recurring emotional sequence in your history`;
    }
  };
  
  // Calculate emotion sequence patterns
  const sequencePatterns = useMemo(() => {
    if (emotionHistory.length < 3) return [];
    
    // Sort by timestamp
    const sortedHistory = [...emotionHistory].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );
    
    // Look for recurring sequences of length 2-4
    const patterns: Record<string, {
      sequence: Emotion[];
      count: number;
      lastSeen: Date;
      examples: Array<{
        startTime: Date;
        endTime: Date;
      }>;
    }> = {};
    
    // Check sequences of different lengths
    [2, 3, 4].forEach(length => {
      for (let i = 0; i <= sortedHistory.length - length; i++) {
        const sequence = sortedHistory.slice(i, i + length).map(item => item.emotion);
        const sequenceKey = sequence.join('→');
        
        if (!patterns[sequenceKey]) {
          patterns[sequenceKey] = {
            sequence,
            count: 0,
            lastSeen: sortedHistory[i + length - 1].timestamp,
            examples: []
          };
        }
        
        patterns[sequenceKey].count++;
        
        // Update last seen time if newer
        const currentEndTime = sortedHistory[i + length - 1].timestamp;
        if (currentEndTime > patterns[sequenceKey].lastSeen) {
          patterns[sequenceKey].lastSeen = currentEndTime;
        }
        
        // Store example instances (up to 3 per pattern)
        if (patterns[sequenceKey].examples.length < 3) {
          patterns[sequenceKey].examples.push({
            startTime: sortedHistory[i].timestamp,
            endTime: sortedHistory[i + length - 1].timestamp
          });
        }
      }
    });
    
    // Filter out patterns that only occur once
    const significantPatterns = Object.values(patterns)
      .filter(pattern => pattern.count > 1)
      .sort((a, b) => b.count - a.count);
    
    return significantPatterns.slice(0, 10); // Return top 10 patterns
  }, [emotionHistory]);
  
  // Calculate time-based patterns (time of day correlations)
  const timePatterns = useMemo(() => {
    if (emotionHistory.length < 5) return [];
    
    const timeOfDay = {
      morning: { start: 5, end: 11 },   // 5am-12pm
      afternoon: { start: 12, end: 17 }, // 12pm-6pm
      evening: { start: 18, end: 21 },   // 6pm-10pm
      night: { start: 22, end: 4 }      // 10pm-5am
    };
    
    // Count emotions by time of day
    const emotionsByTime: Record<string, Record<Emotion, number>> = {
      morning: { joy: 0, sadness: 0, anger: 0, fear: 0, love: 0, surprise: 0, neutral: 0 },
      afternoon: { joy: 0, sadness: 0, anger: 0, fear: 0, love: 0, surprise: 0, neutral: 0 },
      evening: { joy: 0, sadness: 0, anger: 0, fear: 0, love: 0, surprise: 0, neutral: 0 },
      night: { joy: 0, sadness: 0, anger: 0, fear: 0, love: 0, surprise: 0, neutral: 0 }
    };
    
    // Count total entries by time period
    const totalByTime: Record<string, number> = {
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0
    };
    
    // Process emotion history
    emotionHistory.forEach(entry => {
      const hour = entry.timestamp.getHours();
      let period: string;
      
      if (hour >= timeOfDay.morning.start && hour <= timeOfDay.morning.end) {
        period = 'morning';
      } else if (hour >= timeOfDay.afternoon.start && hour <= timeOfDay.afternoon.end) {
        period = 'afternoon';
      } else if (hour >= timeOfDay.evening.start && hour <= timeOfDay.evening.end) {
        period = 'evening';
      } else {
        period = 'night';
      }
      
      emotionsByTime[period][entry.emotion]++;
      totalByTime[period]++;
    });
    
    // Calculate dominant emotions by time period
    const dominantByTime = Object.entries(emotionsByTime).map(([period, emotions]) => {
      let dominantEmotion: Emotion = 'neutral';
      let highestCount = 0;
      
      Object.entries(emotions).forEach(([emotion, count]) => {
        if (count > highestCount) {
          highestCount = count;
          dominantEmotion = emotion as Emotion;
        }
      });
      
      // Calculate percentage
      const percentage = totalByTime[period] > 0
        ? Math.round((highestCount / totalByTime[period]) * 100)
        : 0;
      
      return {
        period,
        dominantEmotion,
        count: highestCount,
        total: totalByTime[period],
        percentage
      };
    });
    
    return dominantByTime;
  }, [emotionHistory]);
  
  // Calculate cyclic patterns (emotions that lead back to themselves)
  const cyclicPatterns = useMemo(() => {
    if (emotionHistory.length < 4) return [];
    
    // Sort by timestamp
    const sortedHistory = [...emotionHistory].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );
    
    // Look for cycles where the emotion returns to itself after some steps
    const cycles: Array<{
      emotion: Emotion;
      cycle: Emotion[];
      count: number;
      avgDuration: number;
      examples: Array<{
        startTime: Date;
        endTime: Date;
      }>;
    }> = [];
    
    // Process each emotion as potential cycle start
    const emotions: Emotion[] = ['joy', 'sadness', 'anger', 'fear', 'love', 'surprise', 'neutral'];
    
    emotions.forEach(startEmotion => {
      // Find instances where this emotion appears
      const instances: number[] = [];
      sortedHistory.forEach((entry, index) => {
        if (entry.emotion === startEmotion) {
          instances.push(index);
        }
      });
      
      // Check for cycles of different lengths (2-5 steps)
      [2, 3, 4, 5].forEach(cycleLength => {
        const cyclesFound: Array<{
          cycle: Emotion[];
          startIndex: number;
          endIndex: number;
        }> = [];
        
        // Look for cycles starting with each instance
        for (let i = 0; i < instances.length - 1; i++) {
          const start = instances[i];
          // Only consider cycles that are within reasonable range
          if (start + cycleLength < sortedHistory.length) {
            const potentialCycle = sortedHistory.slice(start, start + cycleLength + 1);
            
            // Check if it forms a cycle (first and last emotions match)
            if (potentialCycle[0].emotion === potentialCycle[potentialCycle.length - 1].emotion) {
              const cyclePath = potentialCycle.map(item => item.emotion);
              
              // Add to cycles found
              cyclesFound.push({
                cycle: cyclePath.slice(0, -1), // Remove the last duplicate
                startIndex: start,
                endIndex: start + cycleLength
              });
            }
          }
        }
        
        // Group similar cycles and count them
        const uniqueCycles: Record<string, {
          cycle: Emotion[];
          count: number;
          durations: number[];
          examples: Array<{
            startTime: Date;
            endTime: Date;
          }>;
        }> = {};
        
        cyclesFound.forEach(found => {
          const cycleKey = found.cycle.join('→');
          
          if (!uniqueCycles[cycleKey]) {
            uniqueCycles[cycleKey] = {
              cycle: found.cycle,
              count: 0,
              durations: [],
              examples: []
            };
          }
          
          uniqueCycles[cycleKey].count++;
          
          // Calculate duration
          const duration = sortedHistory[found.endIndex].timestamp.getTime() - 
                          sortedHistory[found.startIndex].timestamp.getTime();
          uniqueCycles[cycleKey].durations.push(duration);
          
          // Store example (up to 2 per cycle)
          if (uniqueCycles[cycleKey].examples.length < 2) {
            uniqueCycles[cycleKey].examples.push({
              startTime: sortedHistory[found.startIndex].timestamp,
              endTime: sortedHistory[found.endIndex].timestamp
            });
          }
        });
        
        // Convert to array and filter out rare cycles
        Object.values(uniqueCycles)
          .filter(cycle => cycle.count > 1)  // Only include cycles that happen more than once
          .forEach(cycle => {
            // Calculate average duration
            const avgDuration = cycle.durations.reduce((sum, val) => sum + val, 0) / cycle.durations.length;
            
            cycles.push({
              emotion: startEmotion,
              cycle: cycle.cycle,
              count: cycle.count,
              avgDuration,
              examples: cycle.examples
            });
          });
      });
    });
    
    // Sort by count and limit results
    return cycles
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [emotionHistory]);
  
  // Display a human-readable duration
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  };
  
  if (emotionHistory.length < 3) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Not enough emotion data to detect patterns. Record more emotions to see patterns here.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="sequences" className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            <span>Sequences</span>
          </TabsTrigger>
          <TabsTrigger value="time" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Time Patterns</span>
          </TabsTrigger>
          <TabsTrigger value="cycles" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Cycles</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="sequences" className="p-1">
          <div className="space-y-4">
            {sequencePatterns.length === 0 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No significant emotion sequences found yet. Keep recording your emotions to reveal patterns.
                </AlertDescription>
              </Alert>
            ) : (
              sequencePatterns.slice(0, 5).map((pattern, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-1 mb-1">
                        {pattern.sequence.map((emotion, i) => (
                          <React.Fragment key={i}>
                            <Badge 
                              style={{ backgroundColor: getEmotionColor(emotion) }}
                              className="text-background flex items-center capitalize"
                            >
                              {getEmotionEmoji(emotion)} {emotion}
                            </Badge>
                            {i < pattern.sequence.length - 1 && (
                              <ArrowRight className="h-3 w-3 mx-0.5 text-muted-foreground" />
                            )}
                          </React.Fragment>
                        ))}
                        <Badge variant="outline" className="ml-2">
                          {pattern.count}x
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {generateSequenceDescription(pattern.sequence)}
                      </p>
                      
                      <Separator className="my-1" />
                      
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Last seen:</span> {formatTimestamp(pattern.lastSeen)}
                      </div>
                      
                      {pattern.examples.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">Example:</span> {formatDate(pattern.examples[0].startTime)} 
                          {pattern.examples[0].endTime && ` to ${formatDate(pattern.examples[0].endTime)}`}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="time" className="p-1">
          <div className="space-y-4">
            {timePatterns.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Not enough data to detect time-based patterns yet.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {timePatterns.map((pattern, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-md font-medium capitalize">{pattern.period}</h3>
                          <Badge 
                            style={{ backgroundColor: getEmotionColor(pattern.dominantEmotion) }}
                            className="text-background"
                          >
                            {pattern.percentage}%
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="h-12 w-12 rounded-full flex items-center justify-center text-2xl bg-muted">
                            {getEmotionEmoji(pattern.dominantEmotion)}
                          </div>
                          <div>
                            <p className="font-medium capitalize">{pattern.dominantEmotion}</p>
                            <p className="text-xs text-muted-foreground">
                              {pattern.count} of {pattern.total} entries
                            </p>
                          </div>
                        </div>
                        
                        <p className="mt-2 text-sm text-muted-foreground">
                          You most often feel <span className="font-medium capitalize">{pattern.dominantEmotion}</span> during the {pattern.period}.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="cycles" className="p-1">
          <div className="space-y-4">
            {cyclicPatterns.length === 0 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No emotional cycles detected yet. Continue tracking to reveal recurring patterns.
                </AlertDescription>
              </Alert>
            ) : (
              cyclicPatterns.slice(0, 5).map((cycle, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <Badge 
                          style={{ backgroundColor: getEmotionColor(cycle.emotion) }}
                          className="text-background capitalize flex items-center"
                        >
                          {getEmotionEmoji(cycle.emotion)} {cycle.emotion}
                        </Badge>
                        <Badge variant="outline">
                          {cycle.count}x cycles
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        <span className="text-xs text-muted-foreground mr-1">Path:</span>
                        {cycle.cycle.map((emotion, i) => (
                          <React.Fragment key={i}>
                            <Badge variant="secondary" className="capitalize text-xs">
                              {emotion}
                            </Badge>
                            {i < cycle.cycle.length - 1 && (
                              <ArrowRight className="h-3 w-3 mx-0.5 text-muted-foreground" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                      
                      <p className="text-sm">
                        Your <span className="font-medium capitalize">{cycle.emotion}</span> emotions 
                        typically return after {formatDuration(cycle.avgDuration)}
                      </p>
                      
                      {cycle.examples.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">Example:</span> {formatDate(cycle.examples[0].startTime)} 
                          {cycle.examples[0].endTime && ` to ${formatDate(cycle.examples[0].endTime)}`}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmotionPatternDetector; 