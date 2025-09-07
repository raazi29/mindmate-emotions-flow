import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ArrowRight, BookOpen, CheckCircle, Play, Heart, Sparkles, Zap, Search, Volume2, VolumeX, X, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

type ActivityType = 'meditation' | 'exercise' | 'journaling' | 'gratitude' | 'social';

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  duration: string;
  durationMinutes: number;
  icon: React.ReactNode;
  emotion: string;
  steps?: string[];
  benefits?: string[];
  completed?: boolean;
}

interface EmotionRecommendationsProps {
  emotion?: 'joy' | 'sadness' | 'anger' | 'fear' | 'love' | 'surprise' | 'neutral';
}

const ACTIVITIES: Activity[] = [
  {
    id: 'med-awareness',
    type: 'meditation',
    title: 'Awareness Expansion',
    description: 'Broaden your emotional awareness with this guided practice.',
    duration: '10 min',
    durationMinutes: 10,
    icon: <Search className="h-5 w-5 text-blue-500" />,
    emotion: 'neutral',
    steps: [
      'Find a comfortable seated position with your back straight',
      'Close your eyes and take 3 deep breaths',
      'Bring awareness to your body, noticing any sensations',
      'Observe your thoughts without judgment',
      'Scan through different emotions, acknowledging each one',
      'Notice how emotions arise and pass away',
      'When ready, slowly open your eyes'
    ],
    benefits: [
      'Increased emotional awareness',
      'Better recognition of emotional patterns',
      'Reduced reactivity to emotional triggers',
      'Improved emotional regulation'
    ]
  },
  {
    id: 'ex-energy',
    type: 'exercise',
    title: 'Energy Booster',
    description: 'Gentle movements to increase energy and emotional resonance.',
    duration: '7 min',
    durationMinutes: 7,
    icon: <Zap className="h-5 w-5 text-amber-500" />,
    emotion: 'neutral',
    steps: [
      'Start with 30 seconds of gentle marching in place',
      'Roll shoulders backward 10 times, then forward 10 times',
      'Do 10 gentle torso twists to each side',
      'Perform 10 arm circles in each direction',
      'Do 10 gentle knee raises on each side',
      'Finish with 5 deep breaths, raising arms on inhale',
      'Shake out your whole body to release tension'
    ],
    benefits: [
      'Increased blood flow and oxygen',
      'Release of mood-boosting endorphins',
      'Reduction in stress hormones',
      'Improved mental clarity and focus'
    ]
  },
  {
    id: 'med-calm',
    type: 'meditation',
    title: 'Calm Mind',
    description: 'A focused breathing practice to quiet the mind and find peace.',
    duration: '5 min',
    durationMinutes: 5,
    icon: <Heart className="h-5 w-5 text-rose-500" />,
    emotion: 'anger',
    steps: [
      'Find a comfortable position, sitting or lying down',
      'Close your eyes and take a deep breath',
      'Focus on your natural breathing pattern',
      'Count each breath cycle from 1 to 10, then start over',
      'If your mind wanders, gently bring it back to counting',
      'Continue for the full 5 minutes',
      'When finished, take a moment to notice how you feel'
    ],
    benefits: [
      'Reduced stress and anxiety',
      'Lowered heart rate and blood pressure',
      'Improved focus and concentration',
      'Better emotional regulation'
    ]
  },
  {
    id: 'ex-strength',
    type: 'exercise',
    title: 'Mood Lifter',
    description: 'Simple strength movements to boost mood and confidence.',
    duration: '8 min',
    durationMinutes: 8,
    icon: <Sparkles className="h-5 w-5 text-purple-500" />,
    emotion: 'sadness',
    steps: [
      'Start with 10 gentle squats, focusing on good form',
      'Do 10 modified push-ups (on knees if needed)',
      'Perform 30 seconds of marching in place',
      'Do 10 gentle lunges on each leg',
      'Hold a plank position for 20 seconds',
      'Finish with 5 stretches, holding each for 20 seconds',
      'Take a moment to notice how your body feels'
    ],
    benefits: [
      'Release of endorphins and dopamine',
      'Increased sense of accomplishment',
      'Improved body awareness and grounding',
      'Enhanced mood and energy levels'
    ]
  }
];

const typeColors: Record<ActivityType, string> = {
  meditation: 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 border-blue-200 dark:border-blue-800/50',
  exercise: 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 border-amber-200 dark:border-amber-800/50',
  journaling: 'bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-100 border-purple-200 dark:border-purple-800/50',
  gratitude: 'bg-green-50 dark:bg-green-950/40 text-green-900 dark:text-green-100 border-green-200 dark:border-green-800/50',
  social: 'bg-pink-50 dark:bg-pink-950/40 text-pink-900 dark:text-pink-100 border-pink-200 dark:border-pink-800/50'
};

const typeBadgeColors: Record<ActivityType, string> = {
  meditation: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
  exercise: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200',
  journaling: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200',
  gratitude: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
  social: 'bg-pink-100 dark:bg-pink-900/50 text-pink-800 dark:text-pink-200'
};

interface GlassTimerProps {
  duration: number;
  isActive: boolean;
  onComplete: () => void;
  showDate?: boolean;
  className?: string;
  compact?: boolean;
}

// Fix the ShimmerStyles component to use regular CSS
const ShimmerStyles = () => {
  return (
    <style>
      {`
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      
      .animate-shimmer {
        animation: shimmer 3s linear infinite;
        background-size: 200% 100%;
      }
      
      .timer-text-shadow {
        text-shadow: 0 0 1px rgba(0,0,0,0.2),
                     0 0 3px rgba(255,255,255,0.3),
                     0 0 5px rgba(255,255,255,0.2);
      }
      `}
    </style>
  );
};

const GlassTimer = ({ 
  duration, 
  isActive, 
  onComplete, 
  showDate = false,
  className,
  compact = false
}: GlassTimerProps) => {
  const [seconds, setSeconds] = useState(duration * 60);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timeInterval);
  }, []);
  
  useEffect(() => {
    if (isActive && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            onComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (!isActive && intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, seconds, onComplete]);
  
  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const formatDate = (date: Date): string => {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekday = weekdays[date.getDay()];
    
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[date.getMonth()];
    
    return `${weekday} | ${month} ${date.getDate()}`;
  };
  
  const progressPercent = ((duration * 60 - seconds) / (duration * 60)) * 100;
  
  return (
    <div className={cn("relative my-2", className)}>
      {/* Add shimmer styles */}
      <ShimmerStyles />
      
      {/* Enhanced glass effect container */}
      <div className={cn(
        "relative w-full text-foreground backdrop-blur-xl rounded-xl overflow-hidden",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-background/70 before:to-background/10 before:z-0",
        "border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.1)]",
        "after:absolute after:inset-0 after:bg-gradient-to-br after:from-white/10 after:to-transparent after:rounded-xl after:z-[-1]",
        compact ? "p-2" : "p-4"
      )}>
        {/* Light reflection effect */}
        <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/15 to-transparent pointer-events-none z-0 opacity-80"></div>
        
        {/* Blurred dots for depth */}
        <div className="absolute -top-10 -left-10 h-20 w-20 rounded-full bg-primary/20 blur-2xl"></div>
        <div className="absolute -bottom-10 -right-10 h-20 w-20 rounded-full bg-primary/20 blur-2xl"></div>
        
        {/* Main content */}
        <div className="relative z-10 flex flex-col gap-1 items-center">
          {showDate && !compact && (
            <div className="text-sm text-muted-foreground flex items-center gap-1.5 backdrop-blur-sm">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(currentTime)}
            </div>
          )}
          
          {/* Time display with improved visibility */}
          <div 
            className={cn(
              "font-bold tabular-nums relative",
              compact ? "text-2xl" : "text-4xl",
            )}
          >
            {/* Glow effect behind the time */}
            <span 
              className="absolute inset-0 blur-lg opacity-30 bg-primary rounded-full -z-10" 
              aria-hidden="true"
            ></span>
            
            {/* Solid time display for visibility */}
            <div className="relative z-10 px-4 py-1.5 rounded-lg bg-background/30 backdrop-blur-sm border border-white/20 shadow-sm">
              <span className="relative timer-text-shadow text-foreground dark:text-foreground">
                {formatTime(seconds)}
              </span>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground mt-0.5 backdrop-blur-sm px-2 py-0.5 rounded-full bg-background/5">
            {isActive ? 'Time Remaining' : 'Duration'}
          </div>
          
          {/* Progress bar with glow effect */}
          {isActive && (
            <div className="w-full mt-3 relative">
              <div className="h-2 w-full bg-background/20 rounded-full overflow-hidden backdrop-blur-md border border-white/10">
                <div 
                  className="h-full bg-gradient-to-r from-primary/70 via-primary to-primary/90 transition-all duration-200 rounded-full"
                  style={{ 
                    width: `${progressPercent}%`,
                    boxShadow: '0 0 10px rgba(var(--primary), 0.5), 0 0 5px rgba(var(--primary), 0.3)' 
                  }}
                />
              </div>
              
              {/* Pulse dot at the end of progress */}
              {progressPercent > 0 && (
                <div 
                  className="absolute h-4 w-4 rounded-full bg-primary top-1/2 -translate-y-1/2 -translate-x-1/2 animate-pulse"
                  style={{ 
                    left: `${progressPercent}%`,
                    boxShadow: '0 0 10px var(--primary), 0 0 20px var(--primary)' 
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Enhanced voice management with more voice options
interface VoiceEngine {
  speak: (text: string, priority?: boolean) => void;
  stop: () => void;
  isAvailable: boolean;
  getVoices: () => SpeechSynthesisVoice[];
  isPlaying: () => boolean;
  loadVoices: () => Promise<SpeechSynthesisVoice[]>;
}

const useVoiceEngine = (): VoiceEngine => {
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceQueueRef = useRef<SpeechSynthesisUtterance[]>([]);
  const isPlayingRef = useRef(false);
  const [isAvailable, setIsAvailable] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
      setIsAvailable(!!synthRef.current);
      
      // Initialize voices
      if (synthRef.current) {
        // On Chrome, voices are loaded asynchronously
        synthRef.current.onvoiceschanged = () => {
          console.log("Voices changed, detected", synthRef.current?.getVoices().length, "voices");
        };
        
        // Try to load voices immediately
        const voices = synthRef.current.getVoices();
        if (voices.length > 0) {
          console.log("Loaded", voices.length, "voices immediately");
        }
      }
    }
    
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);
  
  const loadVoices = useCallback(async (): Promise<SpeechSynthesisVoice[]> => {
    if (!synthRef.current) return [];
    
    // Try to get voices immediately
    let voices = synthRef.current.getVoices();
    
    // If no voices are available, wait for them to load
    if (voices.length === 0) {
      try {
        voices = await new Promise((resolve) => {
          if (!synthRef.current) {
            resolve([]);
            return;
          }
          
          // Set a timeout in case voices never load
          const timeout = setTimeout(() => {
            console.log("Voice loading timed out");
            resolve(synthRef.current?.getVoices() || []);
          }, 2000);
          
          synthRef.current.onvoiceschanged = () => {
            clearTimeout(timeout);
            const loadedVoices = synthRef.current?.getVoices() || [];
            console.log("Voices loaded:", loadedVoices.length);
            resolve(loadedVoices);
          };
        });
      } catch (error) {
        console.error("Error loading voices:", error);
      }
    }
    
    if (voices.length > 0) {
      console.log("Available voices:", voices.length);
      return voices;
    }
    
    return [];
  }, []);
  
  const processQueue = useCallback(() => {
    if (!synthRef.current || isPlayingRef.current || utteranceQueueRef.current.length === 0) {
      return;
    }
    
    isPlayingRef.current = true;
    const utterance = utteranceQueueRef.current.shift()!;
    
    utterance.onend = () => {
      isPlayingRef.current = false;
      processQueue();
    };
    
    utterance.onerror = (event) => {
      console.error("Speech synthesis error occurred:", event);
      isPlayingRef.current = false;
      processQueue();
    };
    
    synthRef.current.speak(utterance);
  }, []);
  
  const speak = useCallback((text: string, priority = false) => {
    if (!synthRef.current || !text) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set default voice properties
    utterance.pitch = 1;
    utterance.rate = 0.9;
    utterance.volume = 1;
    
    if (priority) {
      // Cancel current speech and clear queue for priority messages
      synthRef.current.cancel();
      utteranceQueueRef.current = [];
      isPlayingRef.current = false;
      utteranceQueueRef.current.push(utterance);
    } else {
      utteranceQueueRef.current.push(utterance);
    }
    
    processQueue();
  }, [processQueue]);
  
  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      utteranceQueueRef.current = [];
      isPlayingRef.current = false;
    }
  }, []);
  
  const getVoices = useCallback(() => {
    if (synthRef.current) {
      return synthRef.current.getVoices();
    }
    return [];
  }, []);
  
  const isPlaying = useCallback(() => {
    return isPlayingRef.current;
  }, []);
  
  return { speak, stop, isAvailable, getVoices, isPlaying, loadVoices };
};

// Voice types to ensure we always have options
const VOICE_PRESETS = {
  calm: {
    name: "Calm",
    icon: "🌿",
    rate: 0.85,
    pitch: 1.0,
    description: "Gentle, soothing voice for meditation",
    voiceNames: ["Samantha", "female", "Victoria", "Zira", "Google UK English Female"]
  },
  coach: {
    name: "Coach",
    icon: "💪",
    rate: 1.1,
    pitch: 1.1,
    description: "Energetic voice for active exercises",
    voiceNames: ["Alex", "Google US English", "Microsoft David", "US ", "English United States"]
  },
  guide: {
    name: "Guide",
    icon: "📚",
    rate: 0.95,
    pitch: 1.05,
    description: "Clear instructional voice",
    voiceNames: ["Microsoft Zira", "Google UK English", "Daniel", "UK ", "English United Kingdom"]
  }
};

// Update the CompactVoiceControls component for better layout
const CompactVoiceControls = ({ 
  enabled,
  toggleVoice,
  voiceType,
  setVoiceType,
  isVoiceAvailable,
  onShowAllVoices
}: { 
  enabled: boolean;
  toggleVoice: () => void;
  voiceType: string;
  setVoiceType: (type: string) => void;
  isVoiceAvailable: boolean;
  onShowAllVoices: () => void;
}) => {
  const voiceTypes = [
    { id: "calm", name: "Calm", icon: "🌿" },
    { id: "coach", name: "Coach", icon: "💪" },
    { id: "guide", name: "Guide", icon: "📚" }
  ];
  
  return (
    <div className="flex flex-wrap items-center gap-1 bg-muted/10 rounded-md p-1.5 border">
      <div className="flex items-center mr-1">
        <Switch 
          checked={enabled} 
          onCheckedChange={toggleVoice}
          disabled={!isVoiceAvailable}
          className="data-[state=checked]:bg-primary"
        />
        
        <span className="text-xs font-medium ml-1.5">
          {enabled ? 'Voice On' : 'Voice Off'}
        </span>
      </div>
      
      {enabled && (
        <>
          <div className="flex flex-wrap gap-1 max-w-[180px]">
            {voiceTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setVoiceType(type.id)}
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors",
                  voiceType === type.id 
                    ? "bg-primary/20 text-primary" 
                    : "hover:bg-muted"
                )}
                title={VOICE_PRESETS[type.id as keyof typeof VOICE_PRESETS].description}
              >
                <span>{type.icon}</span>
                <span className="hidden xs:inline">{type.name}</span>
              </button>
            ))}
          </div>
          
          <button 
            onClick={onShowAllVoices}
            className="ml-auto text-xs px-1.5 py-0.5 rounded hover:bg-muted transition-colors"
            title="More voice options"
          >
            <span>👥</span>
          </button>
        </>
      )}
    </div>
  );
};

const ActivityDialog = ({ activity, onClose }: { activity: Activity; onClose: () => void }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceRate, setVoiceRate] = useState(0.9);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [isVoiceExpanded, setIsVoiceExpanded] = useState(false);
  const [voiceType, setVoiceType] = useState("calm");
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [allVoices, setAllVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const voiceEngine = useVoiceEngine();
  
  // Load voices when component mounts
  useEffect(() => {
    const loadAllVoices = async () => {
      setIsLoadingVoices(true);
      const voices = await voiceEngine.loadVoices();
      setAllVoices(voices);
      setIsLoadingVoices(false);
      
      // Set default voice if we have them
      if (voices.length > 0 && !selectedVoice) {
        const preset = VOICE_PRESETS[voiceType as keyof typeof VOICE_PRESETS];
        const matchedVoice = findVoiceForPreset(voices, preset);
        
        if (matchedVoice) {
          console.log("Setting default voice:", matchedVoice.name);
          setSelectedVoice(matchedVoice.name);
        } else {
          console.log("No matched voice, using first available:", voices[0].name);
          setSelectedVoice(voices[0].name);
        }
      }
    };
    
    loadAllVoices();
  }, [voiceEngine]);
  
  // Find a voice that matches the preset criteria
  const findVoiceForPreset = (voices: SpeechSynthesisVoice[], preset: typeof VOICE_PRESETS.calm) => {
    // Try to match by names in the preset
    for (const namePattern of preset.voiceNames) {
      const found = voices.find(voice => 
        voice.name.includes(namePattern) || 
        voice.lang.includes(namePattern)
      );
      if (found) return found;
    }
    
    // Fallback to any English voice
    return voices.find(voice => voice.lang.includes('en'));
  };
  
  // Toggle voice settings visibility
  const toggleVoiceExpansion = () => {
    setIsVoiceExpanded(!isVoiceExpanded);
  };
  
  // Get appropriate step duration
  const getStepDuration = useCallback((stepText: string) => {
    // Calculate duration based on word count (average reading speed)
    const words = stepText.split(' ').length;
    const baseTime = 3; // Base time in seconds
    const wordTime = words * 0.5; // 0.5 second per word
    
    return Math.max(Math.round(baseTime + wordTime), 5); // Minimum 5 seconds
  }, []);
  
  // Apply voice preset settings based on voice type
  useEffect(() => {
    const preset = VOICE_PRESETS[voiceType as keyof typeof VOICE_PRESETS];
    
    if (!preset) return;
    
    setVoiceRate(preset.rate);
    
    if (allVoices.length > 0) {
      const matchedVoice = findVoiceForPreset(allVoices, preset);
      if (matchedVoice) {
        console.log("Setting voice for preset:", matchedVoice.name);
        setSelectedVoice(matchedVoice.name);
      }
    }
  }, [voiceType, allVoices]);
  
  // Helper to speak with the selected voice and rate
  const speakWithVoice = useCallback((text: string, isPriority = false) => {
    if (!voiceEnabled || !text) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = voiceRate;
    
    // Set the voice pitch based on preset
    const preset = VOICE_PRESETS[voiceType as keyof typeof VOICE_PRESETS];
    if (preset) {
      utterance.pitch = preset.pitch;
    }
    
    // Find the selected voice
    if (selectedVoice && allVoices.length > 0) {
      const voice = allVoices.find(v => v.name === selectedVoice);
      if (voice) {
        utterance.voice = voice;
        console.log("Speaking with voice:", voice.name);
      } else {
        console.log("Selected voice not found, using default");
      }
    }
    
    voiceEngine.speak(text, isPriority);
  }, [voiceEnabled, voiceRate, selectedVoice, allVoices, voiceEngine, voiceType]);
  
  useEffect(() => {
    // Speak current step when active step changes or when activity starts
    if (isActive && activity.steps && activity.steps[activeStep]) {
      speakWithVoice(activity.steps[activeStep], true);
      
      // Also announce step number
      setTimeout(() => {
        speakWithVoice(`Step ${activeStep + 1} of ${activity.steps?.length}`, false);
      }, 300);
    }
  }, [activeStep, isActive, activity.steps, speakWithVoice]);
  
  const toggleVoice = () => {
    const newState = !voiceEnabled;
    setVoiceEnabled(newState);
    
    // Auto-collapse voice settings when disabled
    if (!newState) {
      setIsVoiceExpanded(false);
      setAutoAdvance(false);
    }
    
    // Announce voice mode change
    if (newState) {
      setTimeout(() => {
        speakWithVoice("Voice guidance enabled. I'll guide you through each step.", true);
        
        if (isActive) {
          setTimeout(() => {
            if (activity.steps && activity.steps[activeStep]) {
              speakWithVoice(`Current step: ${activity.steps[activeStep]}`, true);
            }
          }, 2000);
        }
      }, 300);
    } else {
      voiceEngine.stop();
    }
  };
  
  // Handle showing all voices
  const handleShowAllVoices = () => {
    setIsVoiceExpanded(true);
  };
  
  const toggleAutoAdvance = () => {
    const newState = !autoAdvance;
    setAutoAdvance(newState);
    
    if (newState && voiceEnabled) {
      speakWithVoice("Auto-advance mode enabled. I'll automatically move to the next step after reading instructions.", false);
    }
  };
  
  // Provide calming background sounds when activity is active
  useEffect(() => {
    // This would be implemented with actual background sounds in a full app
    if (isActive && voiceEnabled) {
      // In a real implementation, you would play soft background sounds here
      // e.g. subtle ambient music or nature sounds
    }
    
    return () => {
      // Clean up audio resources
    };
  }, [isActive, voiceEnabled]);
  
  const startActivity = () => {
    setIsActive(true);
    
    if (voiceEnabled) {
      speakWithVoice(`Starting ${activity.title}. ${activity.steps?.[0] || ''}`, true);
    }
  };
  
  const completeActivity = () => {
    setIsComplete(true);
    setIsActive(false);
    
    if (voiceEnabled) {
      speakWithVoice("Activity complete! Great job. How are you feeling now?", true);
    }
  };
  
  const nextStep = () => {
    if (activeStep < activity.steps!.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      completeActivity();
    }
  };
  
  const repeatStep = () => {
    if (activity.steps && activity.steps[activeStep]) {
      speakWithVoice(`Repeating step ${activeStep + 1}: ${activity.steps[activeStep]}`, true);
    }
  };
  
  const handleClose = () => {
    // Stop any speaking
    voiceEngine.stop();
    
    // Clear any timers
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
    
    onClose();
  };
  
  const progressPercentage = ((activeStep + 1) / (activity.steps?.length || 1)) * 100;
  
  return (
    <DialogContent className="sm:max-w-[500px] overflow-hidden">
      <DialogHeader className="relative pb-2">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${typeBadgeColors[activity.type]}`}>
            {activity.icon}
          </div>
          <DialogTitle>{activity.title}</DialogTitle>
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          className="absolute right-4 top-4 h-8 w-8 rounded-full border border-border/40 bg-background/80 backdrop-blur-sm shadow-sm transition-all hover:bg-background/95 hover:border-border hover:scale-105 hover:shadow-md focus:ring-2 focus:ring-primary/20 focus:outline-none"
          onClick={handleClose}
        >
          <X className="h-4 w-4 text-foreground/80 hover:text-foreground" />
          <span className="sr-only">Close</span>
        </Button>
      </DialogHeader>
      
      <div className="space-y-3 py-2">
        <div className="flex justify-between items-center text-sm">
          <Badge variant="outline" className={typeBadgeColors[activity.type]}>
            {activity.type}
          </Badge>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
            <span>{activity.duration}</span>
          </div>
        </div>
        
        <p className="text-muted-foreground text-sm">{activity.description}</p>
        
        {/* Compact voice controls */}
        <div className="flex items-center justify-between gap-2">
          <CompactVoiceControls
            enabled={voiceEnabled}
            toggleVoice={toggleVoice}
            voiceType={voiceType}
            setVoiceType={setVoiceType}
            isVoiceAvailable={voiceEngine.isAvailable}
            onShowAllVoices={handleShowAllVoices}
          />
        </div>
        
        {/* Hands-free auto-advance option */}
        {voiceEnabled && !isVoiceExpanded && (
          <div className="flex items-center justify-between p-2 rounded border bg-muted/10">
            <div className="flex items-center gap-2">
              <Switch
                checked={autoAdvance}
                onCheckedChange={toggleAutoAdvance}
                className="data-[state=checked]:bg-primary"
              />
              <div>
                <div className="text-xs font-medium">Hands-free Mode</div>
                <div className="text-xs text-muted-foreground">Auto-advance steps</div>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs ml-auto" 
              onClick={toggleVoiceExpansion}
            >
              Settings
            </Button>
          </div>
        )}
        
        {/* Expandable voice controls */}
        {voiceEnabled && isVoiceExpanded && (
          <div className="space-y-2 border rounded-lg p-3 bg-muted/10">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium">Voice Settings</h4>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground mr-1">Hands-free:</label>
                <Switch 
                  checked={autoAdvance} 
                  onCheckedChange={toggleAutoAdvance}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>
            
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between">
                <label className="text-xs text-muted-foreground">Voice Speed: {voiceRate.toFixed(1)}x</label>
                <span className="text-xs text-muted-foreground">
                  {voiceRate < 0.8 ? 'Slow' : voiceRate > 1.1 ? 'Fast' : 'Normal'}
                </span>
              </div>
              <Slider 
                value={[voiceRate * 10]} 
                min={5} 
                max={15} 
                step={1}
                onValueChange={(value) => setVoiceRate(value[0] / 10)}
                className="w-full"
              />
            </div>
            
            {/* Voice selection in a more compact form */}
            <div className="pt-2 border-t border-border/30 mt-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-muted-foreground">Voice Selection:</label>
                <span className="text-xs opacity-70">
                  {allVoices.length} {allVoices.length === 1 ? 'voice' : 'voices'}
                </span>
              </div>
              
              {allVoices.length > 0 ? (
                <select 
                  value={selectedVoice} 
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full text-xs bg-background border rounded px-2 py-1 mt-1"
                >
                  {allVoices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              ) : isLoadingVoices ? (
                <div className="py-1 flex justify-center">
                  <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full"></div>
                  <span className="ml-2 text-xs">Loading...</span>
                </div>
              ) : (
                <p className="text-xs text-orange-500 mt-1">No voices available</p>
              )}
              
              {allVoices.length <= 1 && allVoices.length > 0 && (
                <p className="text-xs text-orange-500 mt-1">Limited voice options in your browser</p>
              )}
            </div>
            
            <div className="border-t border-border/30 mt-2 pt-2">
              <p className="text-xs text-muted-foreground">
                Voice Type Presets:
              </p>
              <div className="grid grid-cols-3 gap-1 mt-1">
                {Object.entries(VOICE_PRESETS).map(([id, preset]) => (
                  <button
                    key={id}
                    onClick={() => setVoiceType(id)}
                    className={cn(
                      "text-xs px-1 py-1 rounded flex flex-col items-center transition-colors border",
                      voiceType === id 
                        ? "bg-primary/10 text-primary border-primary/30" 
                        : "hover:bg-muted border-transparent"
                    )}
                    title={preset.description}
                  >
                    <span className="text-base">{preset.icon}</span>
                    <span className="text-xs">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 text-xs"
              onClick={toggleVoiceExpansion}
            >
              Collapse Settings
            </Button>
          </div>
        )}
        
        {isComplete ? (
          <div className="space-y-4 py-6 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="text-xl font-medium">Activity Complete!</h3>
            <p>Great job! How are you feeling now?</p>
          </div>
        ) : (
          <>
            {isActive && (
              <GlassTimer 
                duration={activity.durationMinutes} 
                isActive={isActive}
                onComplete={completeActivity}
                showDate={false}
                compact={true}
              />
            )}
            
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span>Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-1.5" />
            </div>
            
            <div className={cn(
              "border rounded-lg p-3 bg-muted/20 backdrop-blur-sm transition-all duration-300",
              isActive && "border-primary/40 shadow-sm"
            )}>
              <div className="flex justify-between items-start mb-1.5">
                <h3 className="text-sm font-medium">Step {activeStep + 1} of {activity.steps?.length}</h3>
                {voiceEnabled && isActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 rounded-full"
                    onClick={repeatStep}
                    title="Repeat instructions"
                  >
                    <span className="sr-only">Repeat</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                      <path d="M3 3v5h5"></path>
                    </svg>
                  </Button>
                )}
              </div>
              <p className="text-sm">{activity.steps?.[activeStep]}</p>
            </div>
            
            {activity.benefits && (
              <div className="mt-3">
                <h4 className="text-xs font-medium mb-1.5">Benefits:</h4>
                <ul className="text-xs space-y-1">
                  {activity.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start">
                      <CheckCircle className="h-3 w-3 mr-1.5 text-green-500 shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
      
      <DialogFooter className="pt-2">
        {isComplete ? (
          <Button 
            variant="default" 
            onClick={handleClose} 
            className="w-full group relative overflow-hidden transition-all duration-300 hover:shadow-md"
          >
            <span className="relative z-10 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 mr-2 text-primary/80 group-hover:scale-110 transition-transform" />
              <span>Done</span>
            </span>
            <span className="absolute inset-0 bg-primary/10 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </Button>
        ) : isActive ? (
          <div className="flex w-full gap-2">
            {!autoAdvance && (
              <Button 
                onClick={nextStep} 
                className="flex-1 relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center">
                  <span>Next Step</span>
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
                <span className="absolute inset-0 bg-primary/10 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </Button>
            )}
            {autoAdvance && (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>Auto-advancing to next step...</span>
                <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            )}
          </div>
        ) : (
          <Button onClick={startActivity} className="relative overflow-hidden group w-full">
            <span className="relative z-10">
              <Play className="mr-2 h-4 w-4" />
              <span>Begin</span>
            </span>
            <span className="absolute inset-0 bg-primary/10 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
};

const EmotionRecommendations = ({ 
  emotion = 'neutral' 
}: EmotionRecommendationsProps) => {
  // Filter activities based on emotion - memoize this calculation
  const activitiesToShow = useMemo(() => {
    console.log("EmotionRecommendations: Recalculating activities for emotion:", emotion);
    // Filter activities based on emotion
    const recommendedActivities = ACTIVITIES.filter(
      activity => activity.emotion === emotion || activity.emotion === 'neutral'
    ).slice(0, 3); // Show up to 3 recommendations
    
    // Ensure we always have activities by falling back to neutral ones
    return recommendedActivities.length > 0 ? 
      recommendedActivities : 
      ACTIVITIES.filter(activity => activity.emotion === 'neutral');
  }, [emotion]); // Only recalculate when emotion changes

  // Track user progress
  const [progress, setProgress] = useState({
    completed: 0,
    total: 7, // Weekly goal
  });
  
  // For controlling dialogs
  const [openDialogId, setOpenDialogId] = useState<string | null>(null);
  
  const handleCloseDialog = () => {
    setOpenDialogId(null);
  };

  // Get background color based on emotion - memoize this calculation
  const backgroundColor = useMemo(() => {
    if (emotion === 'joy') return 'bg-gradient-to-br from-amber-100/50 to-yellow-100/30 dark:from-amber-900/20 dark:to-yellow-900/10';
    if (emotion === 'sadness') return 'bg-gradient-to-br from-blue-100/50 to-indigo-100/30 dark:from-blue-900/20 dark:to-indigo-900/10';
    if (emotion === 'anger') return 'bg-gradient-to-br from-red-100/50 to-orange-100/30 dark:from-red-900/20 dark:to-orange-900/10';
    if (emotion === 'fear') return 'bg-gradient-to-br from-purple-100/50 to-violet-100/30 dark:from-purple-900/20 dark:to-violet-900/10';
    if (emotion === 'love') return 'bg-gradient-to-br from-pink-100/50 to-rose-100/30 dark:from-pink-900/20 dark:to-rose-900/10';
    if (emotion === 'surprise') return 'bg-gradient-to-br from-cyan-100/50 to-sky-100/30 dark:from-cyan-900/20 dark:to-sky-900/10';
    return 'bg-gradient-to-br from-gray-100/50 to-slate-100/30 dark:from-gray-900/20 dark:to-slate-900/10';
  }, [emotion]); // Only recalculate when emotion changes

  return (
    <Card className={`w-full ${backgroundColor} border-border/50 shadow-md h-full`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl font-semibold">
          <Sparkles className="h-5 w-5 text-primary" />
          Recommended for You
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <div className="text-sm text-muted-foreground">
            <span className="text-primary font-medium">{progress.completed}</span> of {progress.total} activities this week
          </div>
          <Progress value={(progress.completed / progress.total) * 100} className="w-24 h-2" />
        </div>
        
        <div className="space-y-3">
          {activitiesToShow.map((activity) => (
            <Dialog 
              key={activity.id} 
              open={openDialogId === activity.id}
              onOpenChange={(open) => {
                if (open) {
                  setOpenDialogId(activity.id);
                } else {
                  setOpenDialogId(null);
                }
              }}
            >
              <DialogTrigger asChild>
                <div 
                  className={`${typeColors[activity.type]} rounded-lg border shadow-sm transition-all hover:shadow-md cursor-pointer hover:translate-y-[-2px]`}
                >
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full bg-white/90 dark:bg-white/10 text-2xl shadow-sm`}>
                        {activity.icon}
                      </div>
                      <div>
                        <h3 className="font-medium">{activity.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className={`px-2 py-0.5 rounded-full ${typeBadgeColors[activity.type]}`}>
                            {activity.type}
                          </span>
                          {activity.duration && (
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-0.5" />
                              {activity.duration}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm mb-3">
                      {activity.description}
                    </p>
                    <div className="flex justify-end">
                      <Button 
                        size="sm" 
                        className="group"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDialogId(activity.id);
                        }}
                      >
                        <span>Start Now</span>
                        <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogTrigger>
              <ActivityDialog activity={activity} onClose={handleCloseDialog} />
            </Dialog>
          ))}
        </div>
      </CardContent>
      
      <CardFooter className="pt-0">
        <div className="w-full flex justify-between items-center text-sm text-muted-foreground">
          <div className="flex items-center">
            <BookOpen className="h-4 w-4 mr-1.5" />
            <span>Personalized for your emotion</span>
          </div>
          <Badge variant="outline" className="flex items-center">
            <Volume2 className="h-3 w-3 mr-1" />
            <span>Voice Guidance Available</span>
          </Badge>
        </div>
      </CardFooter>
    </Card>
  );
};

export default memo(EmotionRecommendations); 