import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface EmotionDistribution {
  name: string;
  value: number;
  color: string;
}

const EMOTION_DATA: EmotionDistribution[] = [
  { name: 'Joy', value: 35, color: '#FFD56F' },
  { name: 'Sadness', value: 15, color: '#7EB2DD' },
  { name: 'Anger', value: 10, color: '#FF7F7F' },
  { name: 'Fear', value: 10, color: '#9D8CFF' },
  { name: 'Love', value: 20, color: '#FF9FB1' },
  { name: 'Surprise', value: 5, color: '#74E3B5' },
  { name: 'Neutral', value: 5, color: '#A3A3A3' },
];

const EmotionInsights = () => {
  return (
    <Card className="w-full glass dark:glass-dark border-none shadow-lg animate-fade-in">
      <CardHeader>
        <CardTitle className="text-xl">Your Emotion Distribution</CardTitle>
      </CardHeader>
      <CardContent className="pb-6">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={EMOTION_DATA}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                innerRadius={40}
                paddingAngle={4}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {EMOTION_DATA.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color} 
                    stroke="rgba(255,255,255,0.2)" 
                    strokeWidth={1}
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value}%`, 'Frequency']}
                contentStyle={{ 
                  backgroundColor: "rgba(255, 255, 255, 0.8)", 
                  borderRadius: "8px",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255, 255, 255, 0.3)"
                }}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          Based on your emotional patterns, you're generally experiencing positive emotions.
        </p>
      </CardContent>
    </Card>
  );
};

export default EmotionInsights;
