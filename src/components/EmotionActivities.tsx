
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, Check, Calendar, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Activity {
  id: string;
  title: string;
  description: string;
  duration: string;
  type: 'meditation' | 'exercise' | 'journaling' | 'breathing' | 'gratitude';
  emotion: 'joy' | 'sadness' | 'anger' | 'fear' | 'love' | 'surprise' | 'neutral';
  completed?: boolean;
  progress?: number;
  streak?: number;
}

interface EmotionActivitiesProps {
  emotion?: string;
}

// Sample activities data
const ACTIVITIES: Activity[] = [
  {
    id: '1',
    title: '5-Minute Breath Focus',
    description: 'A quick breathing exercise to center your mind',
    duration: '5 min',
    type: 'breathing',
    emotion: 'neutral',
    streak: 3
  },
  {
    id: '2',
    title: 'Body Scan Meditation',
    description: 'Progressively relax your body from head to toe',
    duration: '10 min',
    type: 'meditation',
    emotion: 'fear', // Changed from "anxiety" to "fear" to match allowed types
    progress: 60
  },
  {
    id: '3',
    title: 'Gratitude Journal',
    description: 'Write down three things you are grateful for today',
    duration: '5 min',
    type: 'gratitude',
    emotion: 'joy'
  },
  {
    id: '4',
    title: 'Tension Release',
    description: 'Physical exercises to release stress and anger',
    duration: '7 min',
    type: 'exercise',
    emotion: 'anger'
  },
  {
    id: '5',
    title: 'Mood Tracking',
    description: 'Record your emotions and identify patterns',
    duration: '3 min',
    type: 'journaling',
    emotion: 'neutral',
    streak: 5
  }
];

const EmotionActivities: React.FC<EmotionActivitiesProps> = ({ emotion = 'neutral' }) => {
  const [activities, setActivities] = useState<Activity[]>(ACTIVITIES);
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);
  const { toast } = useToast();

  // Filter activities that match the current emotion or are generally helpful
  const matchingActivities = activities.filter(activity => 
    activity.emotion === emotion || 
    activity.emotion === 'neutral' ||
    (emotion === 'sadness' && activity.type === 'meditation') ||
    (emotion === 'anger' && (activity.type === 'breathing' || activity.type === 'exercise'))
  );

  const startActivity = (activity: Activity) => {
    setActiveActivity(activity);
    // In a real app, this would start a timer and show a guided activity interface
    toast({
      title: `Starting ${activity.title}`,
      description: `${activity.duration} activity has begun`,
    });
  };

  const completeActivity = (id: string) => {
    setActivities(activities.map(activity => 
      activity.id === id 
        ? { 
            ...activity, 
            completed: true,
            progress: 100,
            streak: (activity.streak || 0) + 1
          } 
        : activity
    ));
    
    setActiveActivity(null);
    
    toast({
      title: "Activity completed!",
      description: "Great job taking care of your mental well-being",
      variant: "default",
    });
  };

  // Get the activity type icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'meditation': return '🧘';
      case 'exercise': return '💪';
      case 'journaling': return '📝';
      case 'breathing': return '🫁';
      case 'gratitude': return '🙏';
      default: return '✨';
    }
  };

  return (
    <Card className="w-full glass dark:glass-dark border-none shadow-lg animate-fade-in">
      <CardHeader>
        <CardTitle className="text-xl">Suggested Activities</CardTitle>
      </CardHeader>
      <CardContent>
        {activeActivity ? (
          <div className="space-y-4 animate-fade-in">
            <div className="p-6 rounded-lg bg-white/10 dark:bg-black/20 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getActivityIcon(activeActivity.type)}</span>
                  <h3 className="text-lg font-medium">{activeActivity.title}</h3>
                </div>
                <span className="flex items-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1" />
                  {activeActivity.duration}
                </span>
              </div>
              
              <p className="text-sm mb-6">{activeActivity.description}</p>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Progress</span>
                    <span>In progress...</span>
                  </div>
                  <Progress value={45} className="h-1.5" />
                </div>
                
                <div className="flex justify-end gap-3">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveActivity(null)}
                  >
                    Pause
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => completeActivity(activeActivity.id)}
                    className="gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Complete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {matchingActivities.length > 0 ? (
              matchingActivities.map((activity) => (
                <div 
                  key={activity.id}
                  className={`p-4 rounded-lg bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 transition-all hover:bg-white/20 dark:hover:bg-white/10 ${
                    activity.completed ? 'opacity-75' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                    <h3 className="font-medium">{activity.title}</h3>
                    <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                      {activity.duration}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {activity.description}
                  </p>
                  
                  {activity.progress !== undefined && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Progress</span>
                        <span>{activity.progress}%</span>
                      </div>
                      <Progress value={activity.progress} className="h-1.5" />
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    {activity.streak ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs">{activity.streak} day streak</span>
                      </div>
                    ) : (
                      <div></div>
                    )}
                    
                    <Button 
                      size="sm" 
                      variant={activity.completed ? "outline" : "default"}
                      className={activity.completed ? "gap-2" : ""}
                      onClick={() => activity.completed ? null : startActivity(activity)}
                      disabled={activity.completed}
                    >
                      {activity.completed ? (
                        <>
                          <Check className="h-4 w-4" />
                          Completed
                        </>
                      ) : (
                        "Start Now"
                      )}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <div className="inline-flex p-3 rounded-full bg-primary/20 mb-3">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-1">No activities yet</h3>
                <p className="text-sm text-muted-foreground">
                  Use the emotion detector to get personalized activity suggestions
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmotionActivities;
