import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  Calendar, 
  Target,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { emotionAnalysisService } from '@/services/EmotionAnalysisService';

interface EmotionProgressionTrackerProps {
  emotionHistory: Array<{
    emotion: string;
    timestamp: Date;
    intensity: number;
  }>;
  className?: string;
}

interface ProgressionDataPoint {
  period: string;
  [key: string]: string | number;
}

const EmotionProgressionTracker = ({ 
  emotionHistory = [],
  className = ''
}) => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [progressionData, setProgressionData] = useState<ProgressionDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<string[]>([]);

  const emotionColors: Record<string, string> = {
    joy: '#FCD34D',
    sadness: '#60A5FA',
    anger: '#F87171',
    fear: '#A78BFA',
    love: '#F472B6',
    surprise: '#FB923C',
    neutral: '#9CA3AF',
  };

  // Process emotion history into progression data
  const processData = useMemo(() => {
    if (emotionHistory.length === 0) return [];
    
    // Group by time periods based on selected range
    const groupedData: Record<string, Record<string, { count: number; totalIntensity: number }>> = {};
    
    emotionHistory.forEach(entry => {
      const date = new Date(entry.timestamp);
      let periodKey: string;
      
      switch (timeRange) {
        case 'week':
          // Group by day
          periodKey = date.toISOString().split('T')[0];
          break;
        case 'month':
          // Group by week
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          periodKey = `Week of ${weekStart.toISOString().split('T')[0]}`;
          break;
        case 'quarter':
          // Group by month
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          periodKey = date.toISOString().split('T')[0];
      }
      
      if (!groupedData[periodKey]) {
        groupedData[periodKey] = {};
      }
      
      if (!groupedData[periodKey][entry.emotion]) {
        groupedData[periodKey][entry.emotion] = { count: 0, totalIntensity: 0 };
      }
      
      groupedData[periodKey][entry.emotion].count++;
      groupedData[periodKey][entry.emotion].totalIntensity += entry.intensity;
    });
    
    // Convert to chart data
    return Object.entries(groupedData).map(([period, emotions]) => {
      const dataPoint: Record<string, string | number> = { period };
      Object.entries(emotions).forEach(([emotion, data]) => {
        dataPoint[emotion] = data.totalIntensity / data.count; // Average intensity
      });
      return dataPoint;
    });
  }, [emotionHistory, timeRange]);

  // Load progression data
  const loadProgressionData = async () => {
    if (emotionHistory.length < 3) {
      setProgressionData([]);
      setInsights(["Not enough data to analyze emotional progression. Continue journaling to unlock insights."]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Format data for the service
      const formattedHistory = emotionHistory.map(entry => ({
        date: entry.timestamp.toISOString(),
        emotion: entry.emotion,
        intensity: entry.intensity
      }));
      
      // Get progression analysis from the service
      const result = await emotionAnalysisService.analyzeProgression(
        formattedHistory, 
        timeRange
      );
      
      setProgressionData(processData as ProgressionDataPoint[]);
      
      if (result.insights) {
        // Split insights into an array of sentences
        const insightArray = result.insights.split('. ').filter(s => s.trim() !== '');
        setInsights(insightArray);
      } else {
        setInsights(["Your emotional progression shows interesting patterns. Continue tracking to see more detailed insights."]);
      }
    } catch (err) {
      console.error('Error loading progression data:', err);
      setError('Failed to load emotional progression data');
      setProgressionData(processData as ProgressionDataPoint[]);
      setInsights(["Unable to analyze progression at this time. Continue journaling to build your emotional history."]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadProgressionData();
  }, [emotionHistory, timeRange]);

  // Get unique emotions in the dataset
  const uniqueEmotions = useMemo(() => {
    const emotions = new Set<string>();
    progressionData.forEach(point => {
      Object.keys(point).forEach(key => {
        if (key !== 'period') {
          emotions.add(key);
        }
      });
    });
    return Array.from(emotions);
  }, [progressionData]);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Emotion Progression
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={timeRange === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('week')}
            >
              Week
            </Button>
            <Button
              variant={timeRange === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('month')}
            >
              Month
            </Button>
            <Button
              variant={timeRange === 'quarter' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('quarter')}
            >
              Quarter
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadProgressionData}
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
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-md text-sm flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            {error}
          </div>
        )}

        {emotionHistory.length < 3 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Build Your Emotional History</h3>
            <p className="text-muted-foreground mb-4">
              Track at least 3 emotions to see your progression over time.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Progression Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={progressionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      if (timeRange === 'week') {
                        return value.split('-')[2]; // Just the day
                      } else if (timeRange === 'month') {
                        return value.substring(9, 14); // Just the date part
                      } else {
                        return value; // Full month
                      }
                    }}
                  />
                  <YAxis domain={[0, 10]} />
                  <Tooltip 
                    formatter={(value) => [`${Number(value).toFixed(1)}/10`, 'Intensity']}
                    labelFormatter={(label) => `Period: ${label}`}
                  />
                  {uniqueEmotions.map((emotion) => (
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
            </div>

            {/* Insights */}
            <div>
              <h4 className="font-medium mb-3 flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Progression Insights
              </h4>
              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <div 
                    key={index} 
                    className="p-3 bg-primary/5 rounded-lg text-sm"
                  >
                    {insight}{insight.endsWith('.') ? '' : '.'}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmotionProgressionTracker;