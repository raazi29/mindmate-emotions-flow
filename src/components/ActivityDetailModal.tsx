import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, Check, Calendar, RefreshCcw, Pause, CheckCircle, X } from 'lucide-react';

interface ActivityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: {
    id: string;
    title: string;
    description: string;
    type: string;
    duration: string;
    steps?: string[];
  };
  onComplete: () => void;
}

const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
  isOpen, 
  onClose, 
  activity,
  onComplete
}) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  
  // Mock steps for the activity (in a real app, these would be part of the activity data)
  const steps = activity.steps || [
    "Find a comfortable seated position",
    "Close your eyes and take a deep breath",
    "Focus your attention on your breathing",
    "When your mind wanders, gently bring it back to your breath",
    "Continue this practice for the duration"
  ];
  
  // Parse duration string to seconds
  const getDurationInSeconds = (duration: string) => {
    const match = duration.match(/(\d+)\s*min/);
    return match ? parseInt(match[1]) * 60 : 300; // default to 5 minutes
  };
  
  const totalDurationInSeconds = getDurationInSeconds(activity.duration);
  
  // Handle timer functionality
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isActive) {
      const startTime = Date.now();
      const endTime = startTime + (totalDurationInSeconds * 1000 * (1 - progress / 100));
      
      timer = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, endTime - now);
        const progressPercent = 100 - (remaining / (totalDurationInSeconds * 1000)) * 100;
        
        // Update progress
        setProgress(Math.min(100, progressPercent));
        
        // Update time left display
        const secondsLeft = Math.ceil(remaining / 1000);
        const minutes = Math.floor(secondsLeft / 60);
        const seconds = secondsLeft % 60;
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        
        // Update current step based on progress
        const stepIndex = Math.min(
          steps.length - 1, 
          Math.floor((progressPercent / 100) * steps.length)
        );
        setCurrentStep(stepIndex);
        
        // Check if completed
        if (progressPercent >= 100) {
          setIsActive(false);
          clearInterval(timer);
          setTimeLeft('Complete');
        }
      }, 1000);
    }
    
    return () => clearInterval(timer);
  }, [isActive, progress, totalDurationInSeconds, steps.length]);
  
  const startActivity = () => {
    setIsActive(true);
  };
  
  const pauseActivity = () => {
    setIsActive(false);
  };
  
  const completeActivity = () => {
    setProgress(100);
    setIsActive(false);
    setTimeLeft('Complete');
    onComplete();
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass dark:glass-dark border-none shadow-lg max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getActivityIcon(activity.type)}</span>
            <DialogTitle className="text-xl">{activity.title}</DialogTitle>
          </div>
          <DialogDescription>
            {activity.description}
          </DialogDescription>
          <Button 
            variant="outline" 
            size="icon" 
            className="absolute right-4 top-4 h-8 w-8 rounded-full border border-border/40 bg-background/80 backdrop-blur-sm shadow-sm transition-all hover:bg-background/95 hover:border-border hover:scale-105 hover:shadow-md focus:ring-2 focus:ring-primary/20 focus:outline-none"
            onClick={onClose}
          >
            <X className="h-4 w-4 text-foreground/80 hover:text-foreground" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Progress</span>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1.5" />
                <span>{isActive ? timeLeft : activity.duration}</span>
              </div>
            </div>
            <Progress 
              value={progress} 
              className="h-2"
              indicatorColor={progress === 100 ? "bg-green-500" : undefined}
            />
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-4">Guided Instructions</h3>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div 
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                    index === currentStep 
                      ? 'bg-primary/10 border border-primary/20'
                      : index < currentStep
                        ? 'opacity-60'
                        : ''
                  }`}
                >
                  <div className={`
                    w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 
                    ${index < currentStep 
                      ? 'bg-primary/20 text-primary' 
                      : index === currentStep 
                        ? 'bg-primary text-white' 
                        : 'bg-white/10 text-white/70'
                    }
                  `}>
                    {index < currentStep ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <span className="text-xs">{index + 1}</span>
                    )}
                  </div>
                  <p className="text-sm">{step}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            {!isActive && progress < 100 && (
              <Button onClick={startActivity} className="gap-2">
                {progress > 0 ? (
                  <>
                    <RefreshCcw className="h-4 w-4" />
                    Continue
                  </>
                ) : (
                  'Start Activity'
                )}
              </Button>
            )}
            
            {isActive && (
              <Button variant="outline" onClick={pauseActivity} className="gap-2">
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            )}
            
            {isActive && (
              <Button onClick={completeActivity} className="gap-2">
                <Check className="h-4 w-4" />
                Complete
              </Button>
            )}
            
            {progress === 100 && (
              <Button 
                onClick={onClose}
                className="group relative overflow-hidden transition-all duration-300 hover:shadow-md"
              >
                <span className="relative z-10 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-primary/80 group-hover:scale-110 transition-transform" />
                  <span>Done</span>
                </span>
                <span className="absolute inset-0 bg-primary/10 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActivityDetailModal;
