import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Calendar, LayoutGrid, ChevronLeft, ChevronRight, Info, X, PieChart } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/components/ThemeProvider';

type Emotion = 'joy' | 'sadness' | 'anger' | 'fear' | 'love' | 'surprise' | 'neutral';

interface EmotionCalendarHeatmapProps {
  emotionHistory: {
    emotion: Emotion;
    timestamp: Date;
    intensity?: number;
  }[];
  days?: number;
}

interface DayData {
  date: Date;
  dayOfMonth: number;
  dayOfWeek: number;
  dominantEmotion: Emotion;
  intensity: number;
  entries: {
    emotion: Emotion;
    timestamp: Date;
    intensity?: number;
  }[];
  isEmpty: boolean;
  emotionCounts: Record<Emotion, number>;
}

const EmotionCalendarHeatmap: React.FC<EmotionCalendarHeatmapProps> = ({
  emotionHistory = [],
  days = 28 // Default to 4 weeks
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // State for selected date range
  const [viewRange, setViewRange] = useState<number>(days);
  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() - viewRange + 1);
    return date;
  });
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [highlightEmotion, setHighlightEmotion] = useState<Emotion | null>(null);
  const [showDistribution, setShowDistribution] = useState<boolean>(false);

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

  // Update start date when view range changes
  useEffect(() => {
    const date = new Date();
    date.setDate(date.getDate() - viewRange + 1);
    setStartDate(date);
  }, [viewRange]);

  // Generate days grid
  const daysGrid = useMemo(() => {
    const endDate = new Date();
    const grid: DayData[] = [];
    
    // Create day entries for the specified range
    const rangeStartDate = new Date(startDate);
    rangeStartDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < viewRange; i++) {
      const date = new Date(rangeStartDate);
      date.setDate(rangeStartDate.getDate() + i);
      
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1); // End of day
      
      // Find entries for this day
      const dayEntries = emotionHistory.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= date && entryDate < nextDay;
      });
      
      // Count emotions for the day
      const emotionCounts: Record<Emotion, number> = {
        joy: 0, sadness: 0, anger: 0, fear: 0, love: 0, surprise: 0, neutral: 0
      };
      
      dayEntries.forEach(entry => {
        emotionCounts[entry.emotion]++;
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
      
      // Calculate intensity based on number of entries
      const intensity = dayEntries.length > 0 
        ? Math.min(1, dayEntries.length / 5) // Cap at 5 entries for max intensity
        : 0;
      
      grid.push({
        date,
        dayOfMonth: date.getDate(),
        dayOfWeek: date.getDay(),
        dominantEmotion,
        intensity,
        entries: dayEntries,
        isEmpty: dayEntries.length === 0,
        emotionCounts
      });
    }
    
    return grid;
  }, [emotionHistory, viewRange, startDate]);

  // Format date for display
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  // Format time for display
  const formatTime = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
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

  // Navigate to previous period
  const navigateToPrevious = () => {
    const newStartDate = new Date(startDate);
    newStartDate.setDate(startDate.getDate() - viewRange);
    setStartDate(newStartDate);
  };

  // Navigate to next period
  const navigateToNext = () => {
    const newStartDate = new Date(startDate);
    newStartDate.setDate(startDate.getDate() + viewRange);
    
    // Don't navigate beyond today
    const today = new Date();
    if (newStartDate > today) return;
    
    setStartDate(newStartDate);
  };

  // Handle day selection for detailed view
  const handleDayClick = (day: DayData) => {
    setSelectedDay(day === selectedDay ? null : day);
  };

  // Calculate emotion distribution for the selected range
  const emotionDistribution = useMemo(() => {
    const distribution: Record<Emotion, number> = {
      joy: 0, sadness: 0, anger: 0, fear: 0, love: 0, surprise: 0, neutral: 0
    };
    
    daysGrid.forEach(day => {
      if (!day.isEmpty) {
        distribution[day.dominantEmotion]++;
      }
    });
    
    return distribution;
  }, [daysGrid]);

  // Calculate the total number of entries for the summary
  const totalEntries = useMemo(() => {
    return daysGrid.reduce((sum, day) => sum + day.entries.length, 0);
  }, [daysGrid]);

  // Weekly patterns: calculate which days of the week have most emotions
  const weekdayPatterns = useMemo(() => {
    const patterns: Record<number, Record<Emotion, number>> = {
      0: {joy: 0, sadness: 0, anger: 0, fear: 0, love: 0, surprise: 0, neutral: 0},
      1: {joy: 0, sadness: 0, anger: 0, fear: 0, love: 0, surprise: 0, neutral: 0},
      2: {joy: 0, sadness: 0, anger: 0, fear: 0, love: 0, surprise: 0, neutral: 0},
      3: {joy: 0, sadness: 0, anger: 0, fear: 0, love: 0, surprise: 0, neutral: 0},
      4: {joy: 0, sadness: 0, anger: 0, fear: 0, love: 0, surprise: 0, neutral: 0},
      5: {joy: 0, sadness: 0, anger: 0, fear: 0, love: 0, surprise: 0, neutral: 0},
      6: {joy: 0, sadness: 0, anger: 0, fear: 0, love: 0, surprise: 0, neutral: 0}
    };
    
    daysGrid.forEach(day => {
      if (!day.isEmpty) {
        Object.entries(day.emotionCounts).forEach(([emotion, count]) => {
          patterns[day.dayOfWeek][emotion as Emotion] += count;
        });
      }
    });
    
    return patterns;
  }, [daysGrid]);

  // Calculate weekday with most entries
  const mostActiveWeekday = useMemo(() => {
    const totals = [0, 1, 2, 3, 4, 5, 6].map(day => ({
      day,
      total: Object.values(weekdayPatterns[day]).reduce((a, b) => a + b, 0)
    }));
    
    return totals.sort((a, b) => b.total - a.total)[0]?.day ?? 0;
  }, [weekdayPatterns]);

  // Get day name
  const getDayName = (dayIndex: number): string => {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayIndex];
  };

  // Toggle distribution view
  const toggleDistribution = () => {
    setShowDistribution(!showDistribution);
  };

  return (
    <Card className="w-full shadow-lg overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Emotion Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDistribution}
              className="h-8 w-8"
            >
              <PieChart className="h-4 w-4" />
              <span className="sr-only">Toggle Distribution</span>
            </Button>
            <Select
              value={viewRange.toString()}
              onValueChange={(value) => setViewRange(parseInt(value))}
            >
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="View range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">1 Week</SelectItem>
                <SelectItem value="14">2 Weeks</SelectItem>
                <SelectItem value="28">4 Weeks</SelectItem>
                <SelectItem value="90">3 Months</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={navigateToPrevious}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={navigateToNext}
                className="h-8 w-8 ml-1"
                disabled={startDate.getDate() === new Date().getDate() - viewRange + 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDate(startDate)} - {formatDate(daysGrid[daysGrid.length - 1]?.date || new Date())}
          <span className="ml-2">•</span>
          <span className="ml-2">{totalEntries} entries</span>
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {showDistribution ? (
          <div className="animate-fade-in space-y-4">
            <h3 className="text-sm font-medium mb-2">Emotion Distribution</h3>
            
            {/* Distribution chart */}
            <div className="flex items-center justify-center space-x-2 py-2">
              {Object.entries(emotionDistribution).map(([emotion, count]) => {
                const percentage = daysGrid.length > 0 
                  ? Math.round((count / daysGrid.filter(d => !d.isEmpty).length) * 100) 
                  : 0;
                
                return percentage > 0 ? (
                  <div key={emotion} className="flex flex-col items-center" title={`${emotion}: ${percentage}%`}>
                    <div 
                      className="rounded-full w-10 h-10 flex items-center justify-center mb-1"
                      style={{ 
                        backgroundColor: getEmotionColor(emotion as Emotion),
                        opacity: 0.8,
                        transform: `scale(${0.5 + (percentage / 100) * 0.5})` 
                      }}
                    >
                      <span>{getEmotionEmoji(emotion as Emotion)}</span>
                    </div>
                    <div className="text-xs text-center">{percentage}%</div>
                    <div className="text-xs text-muted-foreground capitalize">{emotion}</div>
                  </div>
                ) : null;
              })}
            </div>
            
            {/* Weekday patterns */}
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Weekly Patterns</h3>
              <div className="text-xs text-center mb-2">
                Most active day: <span className="font-medium">{getDayName(mostActiveWeekday)}</span>
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                  const dayPatterns = weekdayPatterns[day];
                  const totalForDay = Object.values(dayPatterns).reduce((a, b) => a + b, 0);
                  
                  // Find dominant emotion for this day
                  let dominant: Emotion = 'neutral';
                  let maxCount = 0;
                  
                  Object.entries(dayPatterns).forEach(([emotion, count]) => {
                    if (count > maxCount) {
                      maxCount = count;
                      dominant = emotion as Emotion;
                    }
                  });
                  
                  return (
                    <div 
                      key={day}
                      className={`flex flex-col items-center py-2 rounded-md ${
                        day === mostActiveWeekday ? 'bg-primary/10 ring-1 ring-primary/20' : ''
                      }`}
                    >
                      <div className="text-xs font-medium mb-1">{getDayName(day).slice(0, 3)}</div>
                      {totalForDay > 0 ? (
                        <>
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: getEmotionColor(dominant) }}
                          >
                            {getEmotionEmoji(dominant)}
                          </div>
                          <div className="text-xs mt-1">{totalForDay}</div>
                        </>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          -
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* Day labels (Sun-Sat) */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
              <div key={day} className="text-xs text-center text-muted-foreground pb-1">
                {day}
              </div>
            ))}
            
            {/* Fill in empty cells for days of week before the first day */}
            {[...Array(daysGrid[0]?.dayOfWeek || 0)].map((_, i) => (
              <div key={`empty-start-${i}`} className="aspect-square"></div>
            ))}
            
            {/* Calendar cells */}
            {daysGrid.map((day, index) => {
              const isSelectedDay = selectedDay && 
                selectedDay.date.toDateString() === day.date.toDateString();
                
              const shouldHighlight = highlightEmotion ? 
                day.dominantEmotion === highlightEmotion : false;
              
              return (
                <TooltipProvider key={index}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className={`aspect-square rounded-md flex flex-col items-center justify-center cursor-pointer border transition-all ${
                          day.isEmpty ? 'border-border/50' : 'border-transparent'
                        } ${
                          isSelectedDay ? 'ring-2 ring-primary' : ''
                        } ${
                          shouldHighlight ? 'ring-2 ring-orange-500' : ''
                        }`}
                        style={{
                          backgroundColor: day.isEmpty 
                            ? '' 
                            : `${getEmotionColor(day.dominantEmotion)}${
                                isDarkMode ? '40' : '25'
                              }`,
                          opacity: day.isEmpty ? 0.5 : (0.7 + day.intensity * 0.3)
                        }}
                        onClick={() => handleDayClick(day)}
                      >
                        <div className="text-xs font-medium">{day.dayOfMonth}</div>
                        {!day.isEmpty && (
                          <div className="text-base leading-none mt-1">
                            {getEmotionEmoji(day.dominantEmotion)}
                          </div>
                        )}
                        {!day.isEmpty && day.entries.length > 1 && (
                          <div className="text-xs mt-1">{day.entries.length}</div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[200px]">
                      <div className="text-sm font-medium mb-1">{formatDate(day.date)}</div>
                      {day.isEmpty ? (
                        <div className="text-xs text-muted-foreground">No emotions recorded</div>
                      ) : (
                        <div className="text-xs">
                          <div className="flex items-center gap-1 mb-1">
                            <span>{getEmotionEmoji(day.dominantEmotion)}</span>
                            <span className="capitalize">{day.dominantEmotion}</span>
                            <span className="text-muted-foreground ml-auto">{day.entries.length} entries</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(day.emotionCounts)
                              .filter(([_, count]) => count > 0)
                              .sort(([_, a], [__, b]) => b - a)
                              .map(([emotion, count]) => (
                                <Badge key={emotion} variant="secondary" className="text-[10px]">
                                  {getEmotionEmoji(emotion as Emotion)} {count}
                                </Badge>
                              ))
                            }
                          </div>
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        )}
        
        {/* Selected day details */}
        {selectedDay && !showDistribution && (
          <div className="mt-4 border-t pt-4 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium">
                {formatDate(selectedDay.date)} Details
              </h3>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={() => setSelectedDay(null)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
            
            {selectedDay.isEmpty ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No emotion data recorded for this day
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: getEmotionColor(selectedDay.dominantEmotion) }}
                  >
                    {getEmotionEmoji(selectedDay.dominantEmotion)}
                  </div>
                  <div>
                    <div className="text-sm font-medium capitalize">{selectedDay.dominantEmotion}</div>
                    <div className="text-xs text-muted-foreground">Dominant emotion</div>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground mb-1">
                  All emotions recorded this day:
                </div>
                
                <div className="space-y-1 max-h-[150px] overflow-y-auto pr-1">
                  {selectedDay.entries.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md bg-muted/30 p-2">
                      <div className="flex items-center">
                        <span className="mr-2">{getEmotionEmoji(entry.emotion)}</span>
                        <span className="capitalize">{entry.emotion}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(entry.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmotionCalendarHeatmap; 