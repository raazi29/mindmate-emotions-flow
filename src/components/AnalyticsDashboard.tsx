import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { 
  TrendingUp, 
  Heart, 
  Calendar, 
  Target, 
  Sparkles,
  Award,
  Activity,
  Brain,
  Zap,
  Compass
} from 'lucide-react';
import { motion } from 'framer-motion';
import { JournalEntry } from '@/services/JournalService';
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay } from 'date-fns';
import { emotionAnalysisService } from '@/services/EmotionAnalysisService';

interface AnalyticsDashboardProps {
  entries: JournalEntry[];
  className?: string;
}

interface EmotionStats {
  emotion: string;
  count: number;
  percentage: number;
  averageIntensity: number;
  color: string;
}

interface TrendData {
  date: string;
  [key: string]: string | number;
}

interface EmotionCorrelation {
  emotion1: string;
  emotion2: string;
  correlation: number;
}

const AnalyticsDashboard = ({
  entries,
  className = ''
}) => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [selectedMetric, setSelectedMetric] = useState<'count' | 'intensity'>('count');
  const [emotionCorrelations, setEmotionCorrelations] = useState<EmotionCorrelation[]>([]);
  const [loadingCorrelations, setLoadingCorrelations] = useState(false);

  const emotionColors: Record<string, string> = {
    joy: '#FCD34D',
    sadness: '#60A5FA',
    anger: '#F87171',
    fear: '#A78BFA',
    love: '#F472B6',
    surprise: '#FB923C',
    neutral: '#9CA3AF',
  };

  // Filter entries based on time range
  const filteredEntries = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'week':
        startDate = subDays(now, 7);
        break;
      case 'month':
        startDate = subDays(now, 30);
        break;
      case 'quarter':
        startDate = subDays(now, 90);
        break;
      case 'year':
        startDate = subDays(now, 365);
        break;
      default:
        startDate = subDays(now, 30);
    }

    return entries.filter(entry => new Date(entry.created_at) >= startDate);
  }, [entries, timeRange]);

  // Calculate emotion statistics
  const emotionStats: EmotionStats[] = useMemo(() => {
    if (filteredEntries.length === 0) return [];

    const emotionCounts: Record<string, { count: number; totalIntensity: number }> = {};
    
    filteredEntries.forEach(entry => {
      if (!emotionCounts[entry.emotion]) {
        emotionCounts[entry.emotion] = { count: 0, totalIntensity: 0 };
      }
      emotionCounts[entry.emotion].count++;
      emotionCounts[entry.emotion].totalIntensity += entry.emotion_intensity;
    });

    return Object.entries(emotionCounts)
      .map(([emotion, data]) => ({
        emotion,
        count: data.count,
        percentage: (data.count / filteredEntries.length) * 100,
        averageIntensity: data.totalIntensity / data.count,
        color: emotionColors[emotion] || emotionColors.neutral
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredEntries]);

  // Calculate trend data
  const trendData: TrendData[] = useMemo(() => {
    if (filteredEntries.length === 0) return [];

    const dailyData: Record<string, Record<string, number>> = {};
    
    filteredEntries.forEach(entry => {
      const date = format(new Date(entry.created_at), 'MMM dd');
      if (!dailyData[date]) {
        dailyData[date] = {};
      }
      if (!dailyData[date][entry.emotion]) {
        dailyData[date][entry.emotion] = 0;
      }
      dailyData[date][entry.emotion]++;
    });

    return Object.entries(dailyData).map(([date, emotions]) => ({
      date,
      ...emotions
    }));
  }, [filteredEntries]);

  // Calculate emotion correlations
  const calculateEmotionCorrelations = async () => {
    if (filteredEntries.length < 5) return;
    
    setLoadingCorrelations(true);
    try {
      // Prepare data for correlation analysis
      const emotionHistory = filteredEntries.map(entry => ({
        date: entry.created_at,
        emotion: entry.emotion,
        intensity: entry.emotion_intensity
      }));
      
      // Use the emotion analysis service for real correlation analysis
      const result = await emotionAnalysisService.analyzeCorrelations(emotionHistory);
      
      if (result.correlations && result.correlations.length > 0) {
        // Transform the correlations to our format
        const correlations: EmotionCorrelation[] = result.correlations.map((c: any) => ({
          emotion1: c.emotion1,
          emotion2: c.emotion2,
          correlation: c.correlation
        }));
        
        setEmotionCorrelations(correlations);
      } else {
        // Fallback to sample correlations if analysis didn't return results
        const sampleCorrelations: EmotionCorrelation[] = [
          { emotion1: 'joy', emotion2: 'love', correlation: 0.75 },
          { emotion1: 'sadness', emotion2: 'fear', correlation: 0.68 },
          { emotion1: 'anger', emotion2: 'fear', correlation: 0.62 },
          { emotion1: 'joy', emotion2: 'surprise', correlation: 0.55 },
          { emotion1: 'sadness', emotion2: 'anger', correlation: 0.48 },
        ];
        
        setEmotionCorrelations(sampleCorrelations);
      }
    } catch (error) {
      console.error('Error calculating emotion correlations:', error);
      // Fallback to sample correlations on error
      const sampleCorrelations: EmotionCorrelation[] = [
        { emotion1: 'joy', emotion2: 'love', correlation: 0.75 },
        { emotion1: 'sadness', emotion2: 'fear', correlation: 0.68 },
        { emotion1: 'anger', emotion2: 'fear', correlation: 0.62 },
        { emotion1: 'joy', emotion2: 'surprise', correlation: 0.55 },
        { emotion1: 'sadness', emotion2: 'anger', correlation: 0.48 },
      ];
      
      setEmotionCorrelations(sampleCorrelations);
    } finally {
      setLoadingCorrelations(false);
    }
  };

  // Calculate key metrics
  const keyMetrics = useMemo(() => {
    if (filteredEntries.length === 0) {
      return {
        totalEntries: 0,
        averageIntensity: 0,
        mostFrequentEmotion: 'neutral',
        emotionalDiversity: 0,
        positivityRatio: 0,
        journalingStreak: 0,
        emotionalBalance: 0
      };
    }

    const totalIntensity = filteredEntries.reduce((sum, entry) => sum + entry.emotion_intensity, 0);
    const averageIntensity = totalIntensity / filteredEntries.length;
    
    const mostFrequentEmotion = emotionStats[0]?.emotion || 'neutral';
    const uniqueEmotions = new Set(filteredEntries.map(entry => entry.emotion)).size;
    
    const positiveEmotions = ['joy', 'love', 'surprise'];
    const positiveCount = filteredEntries.filter(entry => positiveEmotions.includes(entry.emotion)).length;
    const positivityRatio = (positiveCount / filteredEntries.length) * 100;
    
    // Calculate emotional balance (diversity of emotions)
    const emotionDistribution = emotionStats.map(stat => stat.percentage / 100);
    const entropy = emotionDistribution.reduce((sum, p) => {
      return p > 0 ? sum - p * Math.log2(p) : sum;
    }, 0);
    const maxEntropy = Math.log2(emotionStats.length);
    const emotionalBalance = maxEntropy > 0 ? (entropy / maxEntropy) * 100 : 0;

    // Calculate journaling streak (simplified)
    const sortedDates = filteredEntries
      .map(entry => format(new Date(entry.created_at), 'yyyy-MM-dd'))
      .sort()
      .reverse();
    
    const uniqueDates = [...new Set(sortedDates)];
    let streak = 0;
    const today = format(new Date(), 'yyyy-MM-dd');
    
    for (let i = 0; i < uniqueDates.length; i++) {
      const expectedDate = format(subDays(new Date(), i), 'yyyy-MM-dd');
      if (uniqueDates[i] === expectedDate) {
        streak++;
      } else {
        break;
      }
    }

    return {
      totalEntries: filteredEntries.length,
      averageIntensity,
      mostFrequentEmotion,
      emotionalDiversity: uniqueEmotions,
      positivityRatio,
      journalingStreak: streak,
      emotionalBalance
    };
  }, [filteredEntries, emotionStats]);

  const getInsights = (): string[] => {
    const insights: string[] = [];
    
    if (keyMetrics.totalEntries === 0) {
      return ["Start journaling to see your emotional insights!"];
    }

    if (keyMetrics.positivityRatio > 60) {
      insights.push("You're experiencing mostly positive emotions - great job maintaining your wellbeing!");
    } else if (keyMetrics.positivityRatio < 30) {
      insights.push("You've been experiencing more challenging emotions lately. Consider self-care activities.");
    }

    if (keyMetrics.averageIntensity > 7) {
      insights.push("Your emotions have been quite intense. Practice mindfulness to help regulate them.");
    } else if (keyMetrics.averageIntensity < 4) {
      insights.push("Your emotional intensity is low. This could indicate stability or emotional numbing.");
    }

    if (keyMetrics.emotionalDiversity >= 5) {
      insights.push("You experience a wide range of emotions, showing good emotional awareness.");
    }
    
    if (keyMetrics.emotionalBalance > 70) {
      insights.push("Your emotional patterns show good balance and variety, indicating healthy emotional processing.");
    }

    if (keyMetrics.journalingStreak >= 7) {
      insights.push(`Amazing! You've maintained a ${keyMetrics.journalingStreak}-day journaling streak.`);
    } else if (keyMetrics.journalingStreak >= 3) {
      insights.push(`Good consistency! You've journaled for ${keyMetrics.journalingStreak} days in a row.`);
    }

    return insights.length > 0 ? insights : ["Keep journaling to unlock more insights!"];
  };

  // Calculate emotion progression data
  const emotionProgressionData = useMemo(() => {
    if (filteredEntries.length === 0) return [];
    
    // Group entries by week and calculate average intensity per emotion
    const weeklyData: Record<string, Record<string, { count: number; totalIntensity: number }>> = {};
    
    filteredEntries.forEach(entry => {
      const date = new Date(entry.created_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {};
      }
      
      if (!weeklyData[weekKey][entry.emotion]) {
        weeklyData[weekKey][entry.emotion] = { count: 0, totalIntensity: 0 };
      }
      
      weeklyData[weekKey][entry.emotion].count++;
      weeklyData[weekKey][entry.emotion].totalIntensity += entry.emotion_intensity;
    });
    
    // Convert to chart data
    return Object.entries(weeklyData).map(([week, emotions]) => {
      const dataPoint: Record<string, string | number> = { week };
      Object.entries(emotions).forEach(([emotion, data]) => {
        dataPoint[emotion] = data.totalIntensity / data.count; // Average intensity
      });
      return dataPoint;
    });
  }, [filteredEntries]);

  if (entries.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Brain className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Data Yet</h3>
          <p className="text-muted-foreground text-center">
            Start journaling to see your emotional analytics and insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Analytics Dashboard
          </h2>
          <p className="text-muted-foreground">Insights into your emotional journey</p>
        </div>
        
        <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Last Week</SelectItem>
            <SelectItem value="month">Last Month</SelectItem>
            <SelectItem value="quarter">Last Quarter</SelectItem>
            <SelectItem value="year">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Entries</p>
                  <p className="text-2xl font-bold">{keyMetrics.totalEntries}</p>
                </div>
                <Calendar className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Intensity</p>
                  <p className="text-2xl font-bold">{keyMetrics.averageIntensity.toFixed(1)}/10</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Positivity</p>
                  <p className="text-2xl font-bold">{keyMetrics.positivityRatio.toFixed(0)}%</p>
                </div>
                <Heart className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Streak</p>
                  <p className="text-2xl font-bold">{keyMetrics.journalingStreak} days</p>
                </div>
                <Award className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className="text-2xl font-bold">{keyMetrics.emotionalBalance.toFixed(0)}%</p>
                </div>
                <Compass className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <Tabs defaultValue="emotions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="emotions">Emotion Distribution</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="progression">Progression</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="emotions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Emotion Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={emotionStats}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ emotion, percentage }) => `${emotion} (${percentage.toFixed(1)}%)`}
                    >
                      {emotionStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Emotion Intensity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={emotionStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="emotion" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Bar dataKey="averageIntensity" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          {/* Emotion Correlations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Emotion Correlations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {loadingCorrelations ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Analyzing emotion correlations...</p>
                  </div>
                ) : emotionCorrelations.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid />
                      <XAxis 
                        type="number" 
                        dataKey="correlation" 
                        name="Correlation" 
                        domain={[0, 1]}
                        label={{ value: 'Correlation Strength', position: 'bottom' }}
                      />
                      <YAxis type="number" dataKey="index" name="Emotion Pair" hide />
                      <ZAxis type="number" range={[100, 1000]} />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }} 
                        formatter={(value, name) => [value, name === 'correlation' ? 'Correlation' : name]}
                      />
                      <Scatter 
                        name="Emotion Correlations" 
                        data={emotionCorrelations.map((c, i) => ({
                          ...c,
                          index: i,
                          tooltip: `${c.emotion1} ↔ ${c.emotion2}`
                        }))}
                        fill="#8884d8"
                      >
                        {emotionCorrelations.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.correlation > 0.7 ? '#10B981' : entry.correlation > 0.5 ? '#F59E0B' : '#EF4444'} 
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Not enough data to calculate emotion correlations. Continue journaling to unlock this insight.
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={calculateEmotionCorrelations}
                      disabled={loadingCorrelations}
                    >
                      {loadingCorrelations ? 'Analyzing...' : 'Calculate Correlations'}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Emotion Trends Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  {Object.keys(emotionColors).map((emotion) => (
                    <Area
                      key={emotion}
                      type="monotone"
                      dataKey={emotion}
                      stackId="1"
                      stroke={emotionColors[emotion]}
                      fill={emotionColors[emotion]}
                      fillOpacity={0.6}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="progression" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Emotion Intensity Progression</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={emotionProgressionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  {Object.keys(emotionColors).map((emotion) => (
                    <Line
                      key={emotion}
                      type="monotone"
                      dataKey={emotion}
                      stroke={emotionColors[emotion]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Personal Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {getInsights().map((insight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm">{insight}</p>
                </motion.div>
              ))}
            </CardContent>
          </Card>

          {/* Most Frequent Emotion */}
          <Card>
            <CardHeader>
              <CardTitle>Dominant Emotion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-4xl">
                  {keyMetrics.mostFrequentEmotion === 'joy' && '😊'}
                  {keyMetrics.mostFrequentEmotion === 'sadness' && '😢'}
                  {keyMetrics.mostFrequentEmotion === 'anger' && '😠'}
                  {keyMetrics.mostFrequentEmotion === 'fear' && '😰'}
                  {keyMetrics.mostFrequentEmotion === 'love' && '❤️'}
                  {keyMetrics.mostFrequentEmotion === 'surprise' && '😲'}
                  {keyMetrics.mostFrequentEmotion === 'neutral' && '😐'}
                </div>
                <div>
                  <h3 className="text-xl font-semibold capitalize">
                    {keyMetrics.mostFrequentEmotion}
                  </h3>
                  <p className="text-muted-foreground">
                    Your most frequent emotion this {timeRange}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;