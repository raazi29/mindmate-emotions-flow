import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Cell
} from 'recharts';
import { 
  Brain, 
  Zap, 
  TrendingUp, 
  Clock, 
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { emotionAnalysisService } from '@/services/EmotionAnalysisService';
import emotionService from '@/utils/emotionService';

interface EmotionDataPoint {
  emotion: string;
  confidence: number;
  intensity: number;
  timestamp: Date;
}

interface RealtimeEmotionAnalysisProps {
  className?: string;
  emotionHistory?: Array<{
    emotion: string;
    timestamp: Date;
    intensity: number;
  }>;
}

const RealtimeEmotionAnalysis = ({ 
  className = '',
  emotionHistory = []
}: RealtimeEmotionAnalysisProps) => {
  const [emotionData, setEmotionData] = useState<EmotionDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'5min' | '15min' | '1hour'>('15min');

  const emotionColors: Record<string, string> = {
    joy: '#FCD34D',
    sadness: '#60A5FA',
    anger: '#F87171',
    fear: '#A78BFA',
    love: '#F472B6',
    surprise: '#FB923C',
    neutral: '#9CA3AF',
  };

  // Convert emotionHistory prop to emotionData format
  useEffect(() => {
    if (emotionHistory && emotionHistory.length > 0) {
      const convertedData = emotionHistory.map(entry => ({
        emotion: entry.emotion,
        confidence: 0.8, // Default confidence for history data
        intensity: entry.intensity || 5,
        timestamp: entry.timestamp
      }));
      setEmotionData(convertedData);
    }
  }, [emotionHistory]);

  // Listen for real-time emotion updates
  useEffect(() => {
    const handleRealtimeEmotion = (emotionResult: { emotion: string; confidence: number; intensity?: number }) => {
      const newDataPoint: EmotionDataPoint = {
        emotion: emotionResult.emotion,
        confidence: emotionResult.confidence,
        intensity: emotionResult.intensity || Math.round(emotionResult.confidence * 10),
        timestamp: new Date()
      };
      
      setEmotionData(prev => {
        const newData = [...prev, newDataPoint];
        // Keep only last 100 entries for performance
        return newData.slice(-100);
      });
    };

    emotionService.onEmotionDetected(handleRealtimeEmotion);

    return () => {
      emotionService.offEmotionDetected(handleRealtimeEmotion);
    };
  }, []);

  // Load emotion data from localStorage on mount (as fallback)
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('realtimeEmotionData');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        const dataWithDates = parsedData.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        setEmotionData(dataWithDates);
      }
    } catch (e) {
      console.error('Error loading emotion data from localStorage:', e);
    }
  }, []);

  // Save emotion data to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('realtimeEmotionData', JSON.stringify(emotionData));
    } catch (e) {
      console.error('Error saving emotion data to localStorage:', e);
    }
  }, [emotionData]);

  // Filter data based on time range
  const filteredData = useMemo(() => {
    const now = new Date();
    let startTime: Date;

    switch (timeRange) {
      case '5min':
        startTime = new Date(now.getTime() - 5 * 60 * 1000);
        break;
      case '15min':
        startTime = new Date(now.getTime() - 15 * 60 * 1000);
        break;
      case '1hour':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 15 * 60 * 1000);
    }

    return emotionData.filter(point => point.timestamp >= startTime);
  }, [emotionData, timeRange]);

  // Calculate emotion distribution
  const emotionDistribution = useMemo(() => {
    if (filteredData.length === 0) return [];

    const emotionCounts: Record<string, number> = {};
    const emotionIntensities: Record<string, number> = {};

    filteredData.forEach(point => {
      if (!emotionCounts[point.emotion]) {
        emotionCounts[point.emotion] = 0;
        emotionIntensities[point.emotion] = 0;
      }
      emotionCounts[point.emotion]++;
      emotionIntensities[point.emotion] += point.intensity;
    });

    return Object.entries(emotionCounts).map(([emotion, count]) => ({
      emotion,
      count,
      percentage: (count / filteredData.length) * 100,
      averageIntensity: emotionIntensities[emotion] / count,
      color: emotionColors[emotion] || emotionColors.neutral
    })).sort((a, b) => b.count - a.count);
  }, [filteredData]);

  // Calculate confidence distribution
  const confidenceDistribution = useMemo(() => {
    if (filteredData.length === 0) return [];

    const confidenceRanges = [
      { label: 'Low (0-30%)', min: 0, max: 0.3, count: 0 },
      { label: 'Medium (30-70%)', min: 0.3, max: 0.7, count: 0 },
      { label: 'High (70-100%)', min: 0.7, max: 1, count: 0 }
    ];

    filteredData.forEach(point => {
      const confidence = point.confidence;
      if (confidence <= 0.3) confidenceRanges[0].count++;
      else if (confidence <= 0.7) confidenceRanges[1].count++;
      else confidenceRanges[2].count++;
    });

    return confidenceRanges.map(range => ({
      ...range,
      percentage: (range.count / filteredData.length) * 100
    }));
  }, [filteredData]);

  // Get the most recent emotion
  const latestEmotion = useMemo(() => {
    if (filteredData.length === 0) return null;
    return filteredData[filteredData.length - 1];
  }, [filteredData]);

  // Add sample emotion data for demonstration
  const addSampleData = () => {
    const emotions = ['joy', 'sadness', 'anger', 'fear', 'love', 'surprise', 'neutral'];
    const emotion = emotions[Math.floor(Math.random() * emotions.length)];
    const confidence = Math.random();
    const intensity = Math.floor(Math.random() * 10) + 1;
    
    const newDataPoint: EmotionDataPoint = {
      emotion,
      confidence,
      intensity,
      timestamp: new Date()
    };
    
    setEmotionData(prev => [...prev, newDataPoint]);
  };

  // Clear all emotion data
  const clearData = () => {
    setEmotionData([]);
    try {
      localStorage.removeItem('realtimeEmotionData');
    } catch (e) {
      console.error('Error clearing emotion data from localStorage:', e);
    }
  };

  // Refresh data (in a real implementation, this would fetch from the backend)
  const refreshData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would fetch from the emotion analysis service
      // For now, we'll just add sample data
      setTimeout(() => {
        addSampleData();
        setIsLoading(false);
      }, 500);
    } catch (err) {
      setError('Failed to refresh emotion data');
      setIsLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Real-time Emotion Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {filteredData.length} samples
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={refreshData}
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Button
            variant={timeRange === '5min' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('5min')}
          >
            5m
          </Button>
          <Button
            variant={timeRange === '15min' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('15min')}
          >
            15m
          </Button>
          <Button
            variant={timeRange === '1hour' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('1hour')}
          >
            1h
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={addSampleData}
          >
            Add Sample
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearData}
          >
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-md text-sm flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            {error}
          </div>
        )}

        {filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Zap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Emotion Data</h3>
            <p className="text-muted-foreground mb-4">
              Start analyzing emotions to see real-time insights.
            </p>
            <Button onClick={addSampleData}>
              Add Sample Data
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Latest Emotion */}
            {latestEmotion && (
              <div className="bg-primary/5 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Latest Detection</h3>
                    <p className="text-2xl font-bold capitalize flex items-center">
                      {latestEmotion.emotion}
                      <span className="ml-2 text-sm font-normal bg-primary/10 px-2 py-1 rounded-full">
                        Detected
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Intensity</p>
                    <p className="text-2xl font-bold">{latestEmotion.intensity}/10</p>
                  </div>
                </div>
                <div className="mt-2">
                      <Progress 
                        value={latestEmotion.intensity * 10} 
                        className="h-2"
                        style={{
                          backgroundColor: 'var(--background)',
                          '--progress-background': emotionColors[latestEmotion.emotion] || emotionColors.neutral
                        } as React.CSSProperties}
                      />
                </div>
              </div>
            )}

            {/* Emotion Distribution */}
            <div>
              <h4 className="font-medium mb-3 flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Emotion Distribution
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={emotionDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        label={({ emotion, percentage }) => `${emotion} (${percentage.toFixed(1)}%)`}
                      >
                        {emotionDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {emotionDistribution.map((emotion, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize font-medium">{emotion.emotion}</span>
                        <span>{emotion.percentage.toFixed(1)}%</span>
                      </div>
                      <Progress 
                        value={emotion.percentage} 
                        className="h-2"
                        style={{
                          backgroundColor: 'var(--background)',
                          '--progress-background': emotion.color
                        } as React.CSSProperties}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{emotion.count} detections</span>
                        <span>Intensity: {emotion.averageIntensity.toFixed(1)}/10</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Emotion Distribution */}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RealtimeEmotionAnalysis;