import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Loader2, 
  Play, 
  Pause, 
  SkipForward, 
  Wind, 
  TimerReset, 
  Check,
  Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger
} from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import AIVoiceButton from '@/components/AIVoiceButton';

interface MindfulnessStep {
  instruction: string;
  duration_seconds: number;
}

interface MindfulnessExercise {
  title: string;
  introduction: string;
  preparation: string[];
  steps: MindfulnessStep[];
  conclusion: string;
  benefits: string[];
  total_duration_minutes: number;
}

interface MindfulnessExerciseProps {
  emotion: string;
  intensity?: number;
  duration?: number;
  exerciseType?: string;
  preferences?: string[];
  onComplete?: () => void;
}

const DEFAULT_DURATION = 5; // 5 minutes

const MindfulnessExercise = ({
  emotion,
  intensity = 5,
  duration = DEFAULT_DURATION,
  exerciseType,
  preferences,
  onComplete
}) => {
  const [exercise, setExercise] = useState<MindfulnessExercise | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showPreparation, setShowPreparation] = useState<boolean>(true);
  const [completed, setCompleted] = useState<boolean>(false);
  const [showBenefits, setShowBenefits] = useState<boolean>(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  
  // Load the exercise when component mounts
  useEffect(() => {
    fetchExercise();
  }, []);
  
  // Timer logic
  useEffect(() => {
    if (exercise && isPlaying && !completed) {
      // Initialize timer for the current step
      if (currentStep === 0 && timeRemaining === 0) {
        setTimeRemaining(exercise.steps[0].duration_seconds);
      }
      
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Move to next step or complete exercise
            if (currentStep < exercise.steps.length - 1) {
              setCurrentStep(currentStep + 1);
              return exercise.steps[currentStep + 1].duration_seconds;
            } else {
              // Exercise complete
              setIsPlaying(false);
              setCompleted(true);
              if (onComplete) {
                onComplete();
              }
              return 0;
            }
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [exercise, isPlaying, currentStep, timeRemaining, completed]);
  
  const fetchExercise = async () => {
    setIsLoading(true);
    
    try {
      // Use a fallback mindfulness exercise since API endpoint doesn't exist
      const fallbackExercises: Record<string, MindfulnessExercise> = {
        joy: {
          title: "Mindful Gratitude Practice",
          introduction: "Take a moment to appreciate the positive emotions you're experiencing. This practice will help you deepen your connection with joy and contentment.",
          preparation: [
            "Find a comfortable seated position",
            "Close your eyes or soften your gaze",
            "Take three deep breaths to center yourself"
          ],
          steps: [
            {
              instruction: "Bring to mind one thing you're grateful for right now. Notice how it makes you feel in your body.",
              duration_seconds: 30
            },
            {
              instruction: "Think of a recent moment that brought you joy. Replay it in your mind with as much detail as possible.",
              duration_seconds: 45
            },
            {
              instruction: "Notice any physical sensations associated with these positive feelings. Where do you feel them in your body?",
              duration_seconds: 30
            },
            {
              instruction: "Take a few deep breaths and allow yourself to fully experience these positive emotions.",
              duration_seconds: 30
            }
          ],
          conclusion: "You've completed a mindfulness practice focused on gratitude and joy. Notice how you feel now compared to when you started.",
          benefits: [
            "Strengthens positive emotional experiences",
            "Increases feelings of gratitude and contentment",
            "Helps anchor positive emotions in your daily life"
          ],
          total_duration_minutes: 5
        },
        sadness: {
          title: "Self-Compassion Meditation",
          introduction: "This practice will help you offer kindness and understanding to yourself during difficult times. Remember that difficult emotions are a natural part of life.",
          preparation: [
            "Find a comfortable seated or lying position",
            "Close your eyes or soften your gaze",
            "Take three deep breaths to center yourself"
          ],
          steps: [
            {
              instruction: "Notice where you feel sadness in your body. Without trying to change anything, simply observe these sensations.",
              duration_seconds: 30
            },
            {
              instruction: "Place your hand on your heart or another soothing location. Offer yourself words of comfort like 'This is difficult, but I am here for you.'",
              duration_seconds: 45
            },
            {
              instruction: "Remember that suffering is a shared human experience. You are not alone in feeling this way.",
              duration_seconds: 30
            },
            {
              instruction: "Take a few deep breaths and allow yourself to receive the compassion you're offering.",
              duration_seconds: 30
            }
          ],
          conclusion: "You've completed a self-compassion practice. Notice any shift in how you're relating to your difficult emotions.",
          benefits: [
            "Reduces self-criticism and increases self-kindness",
            "Helps process difficult emotions with greater ease",
            "Strengthens emotional resilience"
          ],
          total_duration_minutes: 5
        },
        anger: {
          title: "Mindful Breathing for Anger",
          introduction: "This breathing practice will help you create space between yourself and intense anger, allowing you to respond more skillfully to challenging situations.",
          preparation: [
            "Find a comfortable seated position",
            "Close your eyes or soften your gaze",
            "Take three deep breaths to center yourself"
          ],
          steps: [
            {
              instruction: "Notice where you feel anger in your body. Without trying to change anything, simply observe these sensations.",
              duration_seconds: 30
            },
            {
              instruction: "Begin breathing slowly and deeply. With each inhale, imagine breathing in calm. With each exhale, imagine releasing tension.",
              duration_seconds: 60
            },
            {
              instruction: "If your mind wanders to the source of your anger, gently redirect attention back to your breath.",
              duration_seconds: 30
            },
            {
              instruction: "Take a few more deep breaths, noticing any shift in your emotional state.",
              duration_seconds: 30
            }
          ],
          conclusion: "You've completed a breathing practice for anger management. Notice how you feel now compared to when you started.",
          benefits: [
            "Activates the body's relaxation response",
            "Creates space between emotion and reaction",
            "Helps regulate intense emotions"
          ],
          total_duration_minutes: 5
        },
        fear: {
          title: "Grounding Exercise for Anxiety",
          introduction: "This grounding practice will help you feel more secure and present when experiencing fear or anxiety. It connects you with your immediate environment.",
          preparation: [
            "Find a comfortable seated position",
            "Close your eyes or soften your gaze",
            "Take three deep breaths to center yourself"
          ],
          steps: [
            {
              instruction: "Notice where you feel fear or anxiety in your body. Without trying to change anything, simply observe these sensations.",
              duration_seconds: 30
            },
            {
              instruction: "Name 5 things you can see around you. Really take them in with your eyes.",
              duration_seconds: 30
            },
            {
              instruction: "Name 4 things you can touch. Feel their texture, temperature, and weight.",
              duration_seconds: 30
            },
            {
              instruction: "Name 3 things you can hear. Listen carefully to the sounds around you.",
              duration_seconds: 30
            },
            {
              instruction: "Name 2 things you can smell. Breathe deeply and notice any scents.",
              duration_seconds: 30
            },
            {
              instruction: "Name 1 thing you can taste. Notice the flavors in your mouth.",
              duration_seconds: 30
            }
          ],
          conclusion: "You've completed a grounding exercise. Notice how connecting with your environment has affected your anxiety.",
          benefits: [
            "Reduces anxiety by focusing on the present moment",
            "Helps break cycles of worry and rumination",
            "Strengthens your sense of safety and stability"
          ],
          total_duration_minutes: 5
        },
        neutral: {
          title: "Mindful Breathing",
          introduction: "This simple breathing practice will help you cultivate awareness and presence, regardless of your current emotional state.",
          preparation: [
            "Find a comfortable seated position",
            "Close your eyes or soften your gaze",
            "Take three deep breaths to center yourself"
          ],
          steps: [
            {
              instruction: "Begin breathing naturally. Notice the sensation of air entering and leaving your nostrils.",
              duration_seconds: 45
            },
            {
              instruction: "Notice when your mind wanders. Gently redirect attention back to your breath without judgment.",
              duration_seconds: 60
            },
            {
              instruction: "Expand your awareness to include your entire breathing process - the full inhale, the pause, the exhale, and the pause.",
              duration_seconds: 45
            },
            {
              instruction: "Take a few more deep breaths, noticing how you feel in this moment.",
              duration_seconds: 30
            }
          ],
          conclusion: "You've completed a basic mindfulness breathing practice. Notice any changes in your awareness or emotional state.",
          benefits: [
            "Develops present-moment awareness",
            "Reduces stress and promotes relaxation",
            "Strengthens attention and concentration"
          ],
          total_duration_minutes: 5
        }
      };
      
      // Select appropriate exercise based on emotion
      const selectedExercise = fallbackExercises[emotion] || fallbackExercises.neutral;
      setExercise(selectedExercise);
      
    } catch (error) {
      console.error('Error generating mindfulness exercise:', error);
      toast({
        title: "Couldn't load exercise",
        description: "There was a problem loading the mindfulness exercise. Please try again.",
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStart = () => {
    setShowPreparation(false);
    setIsPlaying(true);
    if (exercise && timeRemaining === 0) {
      setTimeRemaining(exercise.steps[0].duration_seconds);
    }
  };
  
  const handlePause = () => {
    setIsPlaying(false);
  };
  
  const handleResume = () => {
    setIsPlaying(true);
  };
  
  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    setTimeRemaining(exercise?.steps[0].duration_seconds || 0);
    setCompleted(false);
    setShowPreparation(true);
  };
  
  const handleSkip = () => {
    if (exercise) {
      if (currentStep < exercise.steps.length - 1) {
        setCurrentStep(currentStep + 1);
        setTimeRemaining(exercise.steps[currentStep + 1].duration_seconds);
      } else {
        // Complete exercise
        setIsPlaying(false);
        setCompleted(true);
        if (onComplete) {
          onComplete();
        }
      }
    }
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getProgressPercentage = (): number => {
    if (!exercise || currentStep >= exercise.steps.length) return 100;
    
    const currentStepTotal = exercise.steps[currentStep].duration_seconds;
    const progress = ((currentStepTotal - timeRemaining) / currentStepTotal) * 100;
    return progress;
  };
  
  // Get overall progress through all steps
  const getOverallProgress = (): number => {
    if (!exercise) return 0;
    
    const totalDuration = exercise.steps.reduce((sum, step) => sum + step.duration_seconds, 0);
    const completedDuration = exercise.steps
      .slice(0, currentStep)
      .reduce((sum, step) => sum + step.duration_seconds, 0);
    
    const currentStepProgress = exercise.steps[currentStep] 
      ? exercise.steps[currentStep].duration_seconds - timeRemaining 
      : 0;
    
    return ((completedDuration + currentStepProgress) / totalDuration) * 100;
  };
  
  if (isLoading) {
    return (
      <Card className="w-full transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wind className="h-5 w-5 text-primary" />
            Loading Mindfulness Exercise
          </CardTitle>
          <CardDescription>
            Creating a personalized exercise for {emotion}...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">
            This will just take a moment
          </p>
        </CardContent>
      </Card>
    );
  }
  
  if (!exercise) {
    return (
      <Card className="w-full transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wind className="h-5 w-5 text-primary" />
            Mindfulness Exercise
          </CardTitle>
          <CardDescription>
            Could not load exercise
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-4">
            Unable to load mindfulness exercise. Please try again.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={fetchExercise}
          >
            Try Again
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card className="w-full transition-all shadow-md hover:shadow-lg border-primary/20">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Wind className="h-5 w-5 text-primary" />
            {exercise.title}
          </CardTitle>
          <Badge>{emotion}</Badge>
        </div>
        <CardDescription>
          {duration} minute mindfulness practice for {emotion.toLowerCase()} emotions
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Introduction and preparation */}
        <AnimatePresence mode="wait">
          {showPreparation && !isPlaying && !completed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                <p className="text-sm">{exercise.introduction}</p>
                
                <div className="flex items-center gap-2 mt-3 mb-2">
                  <span className="text-xs font-medium">Preparation:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs pl-1">
                  {exercise.preparation.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              </div>
              
              <div className="flex justify-center">
                <Button 
                  className="w-2/3 gap-2" 
                  onClick={handleStart}
                >
                  <Play className="h-4 w-4" />
                  Begin Exercise
                </Button>
              </div>
              
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBenefits(!showBenefits)}
                >
                  <Info className="h-3.5 w-3.5 mr-1.5" />
                  {showBenefits ? "Hide Benefits" : "Show Benefits"}
                </Button>
              </div>
              
              <AnimatePresence>
                {showBenefits && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="border rounded-lg p-3 bg-background/50">
                      <p className="text-xs font-medium mb-2">Benefits of this practice:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        {exercise.benefits.map((benefit, i) => (
                          <li key={i}>{benefit}</li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
          
          {/* Active exercise */}
          {!showPreparation && !completed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="relative p-5 bg-primary/5 rounded-lg border border-primary/10 min-h-[150px] flex flex-col justify-center items-center text-center">
                <div className="absolute top-2 right-2">
                  <AIVoiceButton 
                    text={exercise.steps[currentStep]?.instruction}
                    emotion={emotion}
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
                    showText={false}
                  />
                </div>
                
                <p className="text-sm mb-4">{exercise.steps[currentStep]?.instruction}</p>
                
                <div className="text-xl font-mono mt-2">
                  {formatTime(timeRemaining)}
                </div>
              </div>
              
              <div className="space-y-2">
                <Progress value={getProgressPercentage()} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Step {currentStep + 1} of {exercise.steps.length}</span>
                  <span>{Math.round(getOverallProgress())}% Complete</span>
                </div>
              </div>
              
              <div className="flex justify-center gap-2">
                {isPlaying ? (
                  <Button 
                    variant="outline"
                    className="gap-2" 
                    onClick={handlePause}
                  >
                    <Pause className="h-4 w-4" />
                    Pause
                  </Button>
                ) : (
                  <Button 
                    className="gap-2" 
                    onClick={handleResume}
                  >
                    <Play className="h-4 w-4" />
                    Resume
                  </Button>
                )}
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline"
                        size="icon"
                        onClick={handleSkip}
                      >
                        <SkipForward className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Skip to next step</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline"
                        size="icon"
                        onClick={handleReset}
                      >
                        <TimerReset className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Reset exercise</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </motion.div>
          )}
          
          {/* Completion */}
          {completed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="p-5 bg-primary/10 rounded-lg border border-primary/30 text-center">
                <div className="flex justify-center mb-3">
                  <div className="rounded-full bg-primary/20 p-3">
                    <Check className="h-6 w-6 text-primary" />
                  </div>
                </div>
                
                <h3 className="text-lg font-medium mb-2">Practice Complete</h3>
                <p className="text-sm mb-4">{exercise.conclusion}</p>
                
                <Separator className="my-4" />
                
                <div className="text-left">
                  <p className="text-xs font-medium mb-2">Benefits of this practice:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    {exercise.benefits.map((benefit, i) => (
                      <li key={i}>{benefit}</li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="flex justify-center">
                <Button 
                  variant="outline"
                  className="gap-2 w-full" 
                  onClick={handleReset}
                >
                  <TimerReset className="h-4 w-4" />
                  Start Again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default MindfulnessExercise; 