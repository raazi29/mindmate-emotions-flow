import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface EmotionData {
  timestamp: Date;
  emotion: string;
  intensity: number;
}

interface EmotionTimelineProps {
  data: EmotionData[];
}

const EMOTION_COLORS = {
  joy: '#FFD56F',
  sadness: '#7EB2DD',
  anger: '#FF7F7F',
  fear: '#9D8CFF',
  love: '#FF9FB1',
  surprise: '#74E3B5',
  neutral: '#A3A3A3',
};

const generateDemoData = (): EmotionData[] => {
  // Generate 14 days of synthetic data
  const data: EmotionData[] = [];
  const emotions = Object.keys(EMOTION_COLORS);
  
  for (let i = 13; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
    
    data.push({
      timestamp: date,
      emotion: randomEmotion,
      intensity: Math.random() * 10
    });
  }
  
  return data;
};

const EmotionTimeline = ({ data = generateDemoData() }: EmotionTimelineProps) => {
  const chartData = data.map(entry => ({
    date: format(entry.timestamp, 'MMM dd'),
    intensity: entry.intensity,
    emotion: entry.emotion,
  }));

  return (
    <Card className="w-full overflow-hidden glass dark:glass-dark border-none shadow-lg animate-fade-in">
      <CardHeader className="pb-0">
        <CardTitle className="text-xl">Your Emotion Timeline</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0,
              }}
            >
              <defs>
                {Object.entries(EMOTION_COLORS).map(([emotion, color]) => (
                  <linearGradient key={emotion} id={`color-${emotion}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.2} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: "rgba(255, 255, 255, 0.8)", 
                  borderRadius: "8px",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255, 255, 255, 0.3)"
                }}
                labelStyle={{ fontWeight: "bold" }}
              />
              {Object.entries(EMOTION_COLORS).map(([emotion, color]) => (
                <Area
                  key={emotion}
                  type="monotone"
                  dataKey={entry => entry.emotion === emotion ? entry.intensity : 0}
                  name={emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                  stroke={color}
                  fillOpacity={1}
                  fill={`url(#color-${emotion})`}
                  stackId="1"
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          Tracking your emotions can help you identify patterns and improve your mental well-being.
        </p>
      </CardContent>
    </Card>
  );
};

export default EmotionTimeline;
