import { useState, useEffect, useCallback, useRef, memo } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TabsContent, Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Search, BookmarkPlus, Bookmark, Star, Clock, Info, RefreshCcw, Filter, ChevronDown, Loader2, Brain, HeartHandshake, Cloud, Book, PlusCircle, Check, Share2, Printer, Download, VolumeIcon, MicIcon, MessageCircle } from 'lucide-react';
import ResourceDetailModal from '@/components/ResourceDetailModal';
import { getHuggingFace, recommendResourcesForInput } from '@/utils/huggingfaceUtils';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import RealtimeEmotionDetector from '@/components/RealtimeEmotionDetector';
import EmotionSuggestions from '@/components/EmotionSuggestions';
import QwenAISuggestionVoice from '@/components/QwenAISuggestionVoice';
import EmotionalMediaRecommendations from '@/components/EmotionalMediaRecommendations';

import { 
  detectEmotionOpenRouter, 
  getPersonalizedRecommendations, 
  checkOpenRouterAvailability,
  getOpenRouter
} from '@/utils/openRouterAPI';
import { batchEnhanceResourcesWithAI } from '@/utils/aiSummaryUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'article' | 'video' | 'exercise' | 'meditation';
  duration?: string;
  tag: string;
  link: string;
  rating?: number;
  progress?: number;
  image?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  featured?: boolean;
  recommended?: boolean;
  ai_summary?: string;
  content?: {
    type: 'video' | 'audio' | 'markdown';
    url?: string;
    text?: string;
  };
}

// Ensure ResourceStatus type definition is present
interface ResourceStatus {
  isSaved: boolean;
  progress: number; // 0-100
}

// Add coping strategies interfaces
interface CopingStrategy {
  id: string;
  title: string;
  description: string;
  timeRequired: string;
  difficulty: string;
}

interface StrategyCategories {
  anxiety: CopingStrategy[];
  depression: CopingStrategy[];
  stress: CopingStrategy[];
  anger: CopingStrategy[];
}

const resources: Resource[] = [
  {
    id: '1',
    title: 'Understanding Your Emotions',
    description: 'A comprehensive guide to emotional intelligence, recognizing emotion patterns, and healthy emotional processing techniques.',
    type: 'article',
    tag: 'education',
    link: 'https://example.com/understanding-emotions',
    rating: 4.9,
    duration: '15 min',
    difficulty: 'beginner',
    featured: true,
    image: 'https://via.placeholder.com/400x200/8B5CF6/FFFFFF?text=Emotional+Intelligence',
    content: {
      type: 'markdown',
      text: `# Understanding Your Emotions

## What Are Emotions?

Emotions are complex psychological states involving three distinct components:
- A subjective experience (how you feel)
- A physiological response (how your body reacts)
- A behavioral or expressive response (how you act)

## The 7 Basic Emotions

1. **Joy** 😊
   - **What it feels like:** Happiness, pleasure, contentment
   - **Body signals:** Increased energy, relaxed muscles, warm sensation
   - **Purpose:** Motivates us to repeat beneficial behaviors
   - **Healthy expression:** Smiling, laughing, sharing with others
   
2. **Sadness** 😢
   - **What it feels like:** Emptiness, heaviness, disconnection
   - **Body signals:** Low energy, tearfulness, slumped posture
   - **Purpose:** Helps us process loss and elicit support from others
   - **Healthy expression:** Crying, seeking comfort, reflective activities

3. **Anger** 😠
   - **What it feels like:** Frustration, irritation, indignation
   - **Body signals:** Increased heart rate, muscle tension, feeling hot
   - **Purpose:** Protects boundaries and motivates change
   - **Healthy expression:** Assertive communication, physical exercise, creative outlets

4. **Fear** 😨
   - **What it feels like:** Anxiety, nervousness, dread
   - **Body signals:** Racing heart, shallow breathing, sweating
   - **Purpose:** Alerts us to threats and prepares for protection
   - **Healthy expression:** Taking safety precautions, practicing self-soothing

5. **Disgust** 🤢
   - **What it feels like:** Revulsion, aversion, distaste
   - **Body signals:** Nausea, recoiling, facial expressions
   - **Purpose:** Protects from contamination (physical or moral)
   - **Healthy expression:** Setting boundaries, removing yourself from harmful situations

6. **Surprise** 😲
   - **What it feels like:** Startled, astonished, amazed
   - **Body signals:** Widened eyes, momentary freezing, gasp
   - **Purpose:** Helps quickly orient to unexpected events
   - **Healthy expression:** Curiosity, adapting to new information

7. **Love** ❤️
   - **What it feels like:** Connection, warmth, tenderness
   - **Body signals:** Relaxation, pleasant sensation in chest
   - **Purpose:** Facilitates bonding and nurturing relationships
   - **Healthy expression:** Acts of kindness, quality time, verbal affirmation

## Emotional Intelligence Skills

### 1. Emotion Recognition
Practice identifying your emotions as they arise. Ask yourself:
- What am I feeling right now?
- Where do I feel it in my body?
- What triggered this emotion?

### 2. Emotion Regulation
Healthy ways to manage intense emotions:
- Deep breathing exercises
- Mindfulness meditation
- Physical activity
- Journaling
- Talking with a trusted person

### 3. Empathy Development
Understanding others' emotions:
- Practice active listening
- Notice non-verbal cues
- Ask open-ended questions
- Validate others' feelings

## The Mind-Body Connection in Emotions

Your emotions have a profound impact on your physical body. When you experience an emotion, your body responds with physiological changes:

- **Stress hormones:** Emotions like fear and anger trigger the release of adrenaline and cortisol
- **Immune function:** Chronic negative emotions can suppress immune response, while positive emotions can enhance it
- **Heart health:** Anger and anxiety increase heart rate and blood pressure, while calm and joy promote healthy heart rhythms
- **Digestion:** Emotional states directly impact digestive function through the gut-brain axis
- **Muscle tension:** Different emotions create distinct patterns of muscle activation or relaxation

## Daily Emotion Tracking Exercise

Try this 3-step process daily for two weeks:

1. **Notice:** Pause 3 times each day and observe what emotion you're feeling
2. **Name:** Label the emotion specifically (instead of "bad," try "disappointed" or "anxious")
3. **Accept:** Whatever you feel is valid - emotions themselves aren't good or bad

## When to Seek Support

While all emotions are natural, sometimes emotional experiences become overwhelming. Consider professional support if:

- Emotions regularly interfere with daily functioning
- You often feel emotionally numb or disconnected
- Intense emotions persist for weeks without relief
- You rely on unhealthy coping mechanisms (substances, avoidance)
- You have thoughts of harming yourself or others

Remember: Seeking help is a sign of strength, not weakness.

## Putting It Into Practice

Try this simple exercise:
1. Set a timer for 3 times throughout your day
2. When it goes off, pause and notice what you're feeling
3. Name the emotion and rate its intensity (1-10)
4. Note what might have triggered it
5. Choose a healthy way to respond

Remember: All emotions are valid and serve a purpose. The goal isn't to eliminate "negative" emotions but to understand and express them in healthy ways.

## Resources for Further Learning

- **Books:** "Permission to Feel" by Marc Brackett, "Atlas of the Heart" by Brené Brown
- **Apps:** Mood Meter, Daylio, MindDoc
- **Practices:** Daily emotion journaling, body scan meditations, emotion-focused therapy`
    }
  },
  {
    id: '2',
    title: '5-Minute Calming Meditation',
    description: 'A quick guided meditation to help you find calm during stressful moments.',
    type: 'meditation',
    duration: '5 min',
    tag: 'meditation',
    link: 'https://example.com/calming-meditation',
    rating: 4.9,
    difficulty: 'beginner',
    recommended: true,
    image: 'https://via.placeholder.com/400x200/EC4899/FFFFFF?text=Meditation',
    content: {
      type: 'audio',
      url: 'https://example.com/audio/calming-meditation.mp3'
    }
  },
  {
    id: '3',
    title: 'Progressive Muscle Relaxation',
    description: 'Learn this effective technique to release physical tension and reduce anxiety.',
    type: 'exercise',
    duration: '10 min',
    tag: 'exercise',
    link: 'https://example.com/pmr-exercise',
    rating: 4.5,
    difficulty: 'beginner',
    image: 'https://via.placeholder.com/400x200/10B981/FFFFFF?text=Exercise',
    content: {
      type: 'audio',
      url: 'https://example.com/audio/pmr-exercise.mp3'
    }
  },
  {
    id: '4',
    title: 'The Science of Happiness',
    description: 'Research-backed strategies to increase your happiness and well-being.',
    type: 'video',
    duration: '15 min',
    tag: 'education',
    link: 'https://example.com/science-of-happiness',
    rating: 4.8,
    difficulty: 'intermediate',
    recommended: true,
    image: 'https://via.placeholder.com/400x200/F59E0B/FFFFFF?text=Happiness+Video',
    content: {
      type: 'video',
      url: 'https://www.youtube.com/embed/placeholder_video_id'
    }
  },
  {
    id: '5',
    title: 'Mindful Breathing Basics',
    description: 'Learn the fundamentals of mindful breathing to reduce stress and increase focus.',
    type: 'exercise',
    duration: '7 min',
    tag: 'meditation',
    link: '#',
    rating: 4.6,
    progress: 0,
    difficulty: 'beginner',
    featured: true
  },
  {
    id: '6',
    title: 'Managing Difficult Emotions',
    description: 'Strategies for coping with challenging emotions like anger and anxiety.',
    type: 'article',
    tag: 'education',
    link: '#',
    rating: 4.4,
    progress: 0,
    difficulty: 'intermediate'
  },
  {
    id: '7',
    title: 'Deep Sleep Meditation',
    description: 'Calm your mind and prepare for restful sleep with this guided meditation.',
    type: 'meditation',
    duration: '20 min',
    tag: 'meditation',
    link: '#',
    rating: 4.8,
    progress: 0,
    difficulty: 'beginner',
    recommended: true
  },
  {
    id: '8',
    title: 'Cognitive Behavioral Techniques',
    description: 'Learn practical CBT techniques to challenge negative thought patterns.',
    type: 'video',
    duration: '25 min',
    tag: 'education',
    link: '#',
    rating: 4.7,
    progress: 0,
    difficulty: 'advanced'
  },
  {
    id: '9',
    title: 'Gratitude Journaling Guide',
    description: 'Structured approach to developing a consistent gratitude practice.',
    type: 'article',
    tag: 'exercise',
    link: 'https://example.com/gratitude-guide',
    rating: 4.5,
    difficulty: 'beginner',
    featured: true,
    image: 'https://via.placeholder.com/400x200/84CC16/FFFFFF?text=Gratitude+Guide',
    content: {
      type: 'markdown',
      text: '# Gratitude Guide\n\nStart by thinking about 3 things...\n\n*(Placeholder for guide content)*'
    }
  }
];

// Add coping strategies data
const strategies: StrategyCategories = {
  anxiety: [
    {
      id: "anxiety-1",
      title: "Deep Breathing Exercise",
      description: "Breathe in through your nose for 4 counts, hold for 4, and exhale through your mouth for 6 counts.",
      timeRequired: "5 minutes",
      difficulty: "Beginner",
    },
    {
      id: "anxiety-2",
      title: "Progressive Muscle Relaxation",
      description: "Tense and then relax each muscle group in your body, starting from your toes and working up to your head.",
      timeRequired: "15 minutes",
      difficulty: "Intermediate",
    },
    {
      id: "anxiety-3",
      title: "5-4-3-2-1 Grounding Technique",
      description: "Identify 5 things you can see, 4 things you can touch, 3 things you can hear, 2 things you can smell, and 1 thing you can taste.",
      timeRequired: "3 minutes",
      difficulty: "Beginner",
    },
    {
      id: "anxiety-4",
      title: "Worry Time Scheduling",
      description: "Set aside a specific time each day to focus on your worries, and postpone worry thoughts outside this time.",
      timeRequired: "20 minutes daily",
      difficulty: "Advanced",
    },
  ],
  depression: [
    {
      id: "depression-1",
      title: "Behavioral Activation",
      description: "Create a list of enjoyable activities and schedule them into your day, even when you don't feel motivated.",
      timeRequired: "Varies",
      difficulty: "Intermediate",
    },
    {
      id: "depression-2",
      title: "Gratitude Journaling",
      description: "Write down three things you're grateful for each day to shift focus toward positive aspects of life.",
      timeRequired: "5 minutes",
      difficulty: "Beginner",
    },
    {
      id: "depression-3",
      title: "Morning Sunlight Exposure",
      description: "Spend 10-15 minutes in natural sunlight each morning to help regulate your circadian rhythm and mood.",
      timeRequired: "15 minutes",
      difficulty: "Beginner",
    },
    {
      id: "depression-4",
      title: "Values-Based Goal Setting",
      description: "Identify personal values and set small, achievable goals aligned with these values.",
      timeRequired: "30 minutes initially, then ongoing",
      difficulty: "Advanced",
    },
  ],
  stress: [
    {
      id: "stress-1",
      title: "Body Scan Meditation",
      description: "Systematically focus attention on different parts of your body, observing sensations without judgment.",
      timeRequired: "10 minutes",
      difficulty: "Intermediate",
    },
    {
      id: "stress-2",
      title: "Time Management Matrix",
      description: "Categorize tasks by urgency and importance to prioritize effectively and reduce feelings of overwhelm.",
      timeRequired: "20 minutes",
      difficulty: "Intermediate",
    },
    {
      id: "stress-3",
      title: "Digital Detox",
      description: "Schedule regular breaks from electronic devices to reduce information overload and stress.",
      timeRequired: "30+ minutes",
      difficulty: "Intermediate",
    },
    {
      id: "stress-4",
      title: "Guided Visualization",
      description: "Close your eyes and imagine yourself in a peaceful, calming place, engaging all your senses.",
      timeRequired: "10 minutes",
      difficulty: "Beginner",
    },
  ],
  anger: [
    {
      id: "anger-1",
      title: "STOP Technique",
      description: "Stop, Take a breath, Observe your thoughts and feelings, Proceed mindfully when feeling angry.",
      timeRequired: "2 minutes",
      difficulty: "Beginner",
    },
    {
      id: "anger-2",
      title: "Thought Challenging",
      description: "Identify and question anger-provoking thoughts, considering alternative perspectives.",
      timeRequired: "15 minutes",
      difficulty: "Advanced",
    },
    {
      id: "anger-3",
      title: "Physical Outlet",
      description: "Channel anger energy into physical activity like brisk walking, running, or punching a pillow.",
      timeRequired: "15-30 minutes",
      difficulty: "Beginner",
    },
    {
      id: "anger-4",
      title: "Assertive Communication",
      description: "Express feelings and needs clearly using 'I' statements without blaming or attacking others.",
      timeRequired: "Ongoing practice",
      difficulty: "Advanced",
    },
  ],
};

const RESOURCE_STATUS_KEY = 'mindmate-resource-statuses';

// New key for storing coping strategies favorites and completed items
const STRATEGIES_KEY = 'mindmate-strategies-data';

const Resources = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [allResources, setAllResources] = useState<Resource[]>([]); 
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]); 
  const [savedResources, setSavedResources] = useState<string[]>([]);
  const [currentEmotionalState, setCurrentEmotionalState] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(false);
  const [moodInput, setMoodInput] = useState('');
  const [strategySearchTerm, setStrategySearchTerm] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState<CopingStrategy | null>(null);
  const [relatedResources, setRelatedResources] = useState<Resource[]>([]);
  const [isVoiceSearching, setIsVoiceSearching] = useState(false);
  const [strategyForPrinting, setStrategyForPrinting] = useState<CopingStrategy | null>(null);
  const [exportFormat, setExportFormat] = useState<'print' | 'pdf' | 'share'>('print');
  // Add missing state variables
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState('all');
  const [usingOpenRouter, setUsingOpenRouter] = useState(false);
  const [shouldAutoPlayVoice, setShouldAutoPlayVoice] = useState(false);
  // Add a new state for smart recommendations
  const [smartRecommendations, setSmartRecommendations] = useState<Resource[]>([]);

  // Get toast from useToast hook
  const { toast } = useToast();

  // Initialize resource statuses from localStorage if available
  const [resourceStatuses, setResourceStatuses] = useState<Record<string, ResourceStatus>>(() => {
    try {
      const stored = localStorage.getItem(RESOURCE_STATUS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error("Failed to load resource status from localStorage:", error);
      return {}; // Return empty object on error
    }
  });

  // Add states for coping strategies
  const [favoriteStrategies, setFavoriteStrategies] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STRATEGIES_KEY);
      if (stored) {
        const { favorites } = JSON.parse(stored);
        return favorites || [];
      }
      return [];
    } catch (error) {
      console.error("Failed to load strategies data from localStorage:", error);
      return [];
    }
  });
  
  const [completedStrategies, setCompletedStrategies] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STRATEGIES_KEY);
      if (stored) {
        const { completed } = JSON.parse(stored);
        return completed || [];
      }
      return [];
    } catch (error) {
      console.error("Failed to load strategies data from localStorage:", error);
      return [];
    }
  });
  
  const [showStrategiesTab, setShowStrategiesTab] = useState(true);
  const [strategyCategory, setStrategyCategory] = useState('anxiety');

  // Filter resources based on search term and current tab
  useEffect(() => {
    let results = resources;
    
    if (searchTerm) {
      results = results.filter(resource => 
        resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.tag.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply difficulty filter if set
    if (difficultyFilter) {
      results = results.filter(resource => resource.difficulty === difficultyFilter);
    }
    
    // Apply type filter if set
    if (typeFilter) {
      results = results.filter(resource => resource.type === typeFilter);
    }
    
    setFilteredResources(results);
  }, [searchTerm, difficultyFilter, typeFilter]);

  // Check if OpenRouter is available for personalized recommendations
  useEffect(() => {
    const checkAPI = async () => {
      // Show loading state while checking API
      setLoading(true);
      
      try {
        const isAvailable = await checkOpenRouterAvailability(true);
        
        if (isAvailable) {
          console.log('OpenRouter API available with Qwen 3 for personalization.');
          setUsingOpenRouter(true);
          toast({
            title: "AI Ready",
            description: "Advanced Qwen 3 model loaded for emotional intelligence features",
            variant: "default",
          });
          
          // If AI is available, enhance resources with AI summaries
          const enhancedResources = await batchEnhanceResourcesWithAI(resources);
          setAllResources(enhancedResources);
          setFilteredResources(enhancedResources);
        } else {
          // If AI is not available, just use the regular resources
          setAllResources(resources);
          setFilteredResources(resources);
          setUsingOpenRouter(false);
          
          toast({
            title: "Limited AI Capabilities",
            description: "AI service unavailable. Some features will be limited.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error checking AI availability:", error);
        // Fallback to regular resources
        setAllResources(resources);
        setFilteredResources(resources);
        setUsingOpenRouter(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkAPI();
  }, [toast]);

  // Ensure the localStorage saving effect uses the correct key and state
  useEffect(() => {
    try {
      localStorage.setItem(RESOURCE_STATUS_KEY, JSON.stringify(resourceStatuses));
    } catch (error) {
      console.error("Failed to save resource status to localStorage:", error);
    }
  }, [resourceStatuses]);

  // Handle saving/unsaving a resource
  const toggleSaveResource = (id: string) => {
    if (savedResources.includes(id)) {
      setSavedResources(savedResources.filter(resId => resId !== id));
      toast({
        title: "Resource removed from saved items",
        variant: "default"
      });
    } else {
      setSavedResources([...savedResources, id]);
      toast({
        title: "Resource saved successfully",
        variant: "default"
      });
    }
  };

  // Handle starting a resource (update progress)
  const startResource = (resource: Resource) => {
    setSelectedResource(resource); // Open the detail modal
  };

  // Add a function to update progress (e.g., called from modal)
  const updateResourceProgress = (id: string, progress: number) => {
    setResourceStatuses(prevStatus => {
      const current = prevStatus[id] || { isSaved: false, progress: 0 };
      const newProgress = Math.max(0, Math.min(100, progress)); // Clamp progress 0-100
      // Make sure status entry exists
      const needsStatusEntry = current.isSaved || newProgress > 0;
      
      // Clean up if progress is 0 and not saved
      if (!needsStatusEntry && newProgress === 0) {
          const { [id]: _, ...rest } = prevStatus; // Remove the entry
          return rest;
      }
      
      return { 
        ...prevStatus, 
        [id]: { ...current, progress: newProgress }
      };
    });
  };

  // Handle emotion detection callback from RealtimeEmotionDetector
  const handleEmotionDetected = async (emotion: string) => {
    setCurrentEmotionalState(emotion);
    
    // Update resources recommendations based on emotion
    updateResourceRecommendations(emotion);
    
    toast({
      title: "Emotion Detected",
      description: `We've personalized resources based on your ${emotion} state`,
      variant: "default"
    });
  };

  // Update resource recommendations based on detected emotion
  const updateResourceRecommendations = (emotion: string) => {
    const updatedResources = resources.map(resource => {
      // Create a mapping of emotions to relevant resource types
      const emotionResourceMapping: Record<string, string[]> = {
        joy: ['gratitude', 'meditation', 'social'],
        sadness: ['meditation', 'exercise', 'journaling'],
        anger: ['meditation', 'exercise'],
        fear: ['meditation', 'journaling', 'exercise'],
        love: ['social', 'gratitude'],
        surprise: ['journaling', 'meditation'],
        neutral: ['meditation', 'education']
      };
      
      // Get relevant resource types for the emotion
      const relevantTypes = emotionResourceMapping[emotion] || ['meditation', 'education'];
      
      // Mark resources as recommended if they match the emotion's relevant types
      const isRecommended = 
        relevantTypes.includes(resource.tag) || 
        (resource.type === 'meditation' && emotion === 'anger') ||
        (resource.type === 'exercise' && (emotion === 'sadness' || emotion === 'anger')) ||
        (resource.type === 'article' && emotion === 'neutral');
        
      return {
        ...resource,
        recommended: isRecommended
      };
    });
    
    setFilteredResources(updatedResources);
    
    // If on recommended tab, automatically switch to the emotion-specific tab
    if (currentTab === 'recommended') {
      setCurrentTab(`emotion-${emotion}`);
    }
  };

  // Generate real-time recommendations based on emotional state
  const getRecommendedResources = () => {
    if (!currentEmotionalState) return filteredResources;
    
    // Filter logic based on emotional state
    return filteredResources.sort((a, b) => {
      if (a.recommended && !b.recommended) return -1;
      if (!a.recommended && b.recommended) return 1;
      return 0;
    });
  };

  // Close the resource detail modal
  const handleCloseModal = () => {
    setSelectedResource(null);
  };

  // Handle tab changes
  const handleTabChange = (value: string) => {
    setCurrentTab(value);
  };

  // Filter resources by tab selection
  const filterByTag = (tag: string) => {
    if (tag === 'all') {
      return filteredResources;
    } else if (tag === 'saved') {
      return filteredResources.filter(resource => savedResources.includes(resource.id));
    } else if (tag === 'recommended') {
      return getRecommendedResources().filter(resource => resource.recommended);
    } else if (tag.startsWith('emotion-')) {
      // Extract the emotion from the tag name
      const emotion = tag.replace('emotion-', '');
      return getResourcesForEmotion(emotion);
    } else {
      return filteredResources.filter(resource => resource.tag === tag);
    }
  };

  // Add a new function to get resources for a specific emotion
  const getResourcesForEmotion = (emotion: string): Resource[] => {
    // Create a mapping of emotions to relevant resource types
    const emotionResourceMapping: Record<string, string[]> = {
      joy: ['gratitude', 'meditation', 'social'],
      sadness: ['meditation', 'exercise', 'journaling'],
      anger: ['meditation', 'exercise'],
      fear: ['meditation', 'journaling', 'exercise'],
      love: ['social', 'gratitude'],
      surprise: ['journaling', 'meditation'],
      neutral: ['meditation', 'education']
    };
    
    // Get relevant resource types for the emotion
    const relevantTypes = emotionResourceMapping[emotion] || ['meditation', 'education'];
    
    // Filter resources to those matching the emotion's needs
    return filteredResources.filter(resource => 
      relevantTypes.includes(resource.tag) || 
      (resource.type === 'meditation' && emotion === 'anger') ||
      (resource.type === 'exercise' && (emotion === 'sadness' || emotion === 'anger')) ||
      (resource.type === 'article' && emotion === 'neutral')
    );
  };

  // Add a function to get a color for an emotion tab
  const getEmotionColor = (emotion: string): string => {
    const colorMap: Record<string, string> = {
      joy: 'from-amber-200 to-yellow-100 dark:from-amber-800 dark:to-yellow-900',
      sadness: 'from-blue-200 to-indigo-100 dark:from-blue-800 dark:to-indigo-900',
      anger: 'from-red-200 to-orange-100 dark:from-red-800 dark:to-orange-900',
      fear: 'from-purple-200 to-violet-100 dark:from-purple-800 dark:to-violet-900',
      love: 'from-pink-200 to-rose-100 dark:from-pink-800 dark:to-rose-900',
      surprise: 'from-cyan-200 to-sky-100 dark:from-cyan-800 dark:to-sky-900',
      neutral: 'from-gray-200 to-slate-100 dark:from-gray-800 dark:to-slate-900'
    };
    
    return colorMap[emotion] || 'from-gray-200 to-slate-100 dark:from-gray-800 dark:to-slate-900';
  };

  // Add a function to get an emoji for an emotion
  const getEmotionEmoji = (emotion: string): string => {
    const emojiMap: Record<string, string> = {
      joy: '😊',
      sadness: '😢',
      anger: '😠',
      fear: '😨',
      love: '❤️',
      surprise: '😲',
      neutral: '😐'
    };
    
    return emojiMap[emotion] || '😐';
  };

  // Modified to use OpenRouter API when available
  const handlePersonalize = async () => {
    if (moodInput.trim().length < 10) {
      toast({
        title: "Input too short",
        description: "Please describe your mood in more detail (at least 10 characters)",
        variant: "destructive"
      });
      return;
    }
    
    try {
      let updatedResources;
      
      if (usingOpenRouter) {
        // Use OpenRouter with Qwen 3 for personalization
        updatedResources = await getPersonalizedRecommendations(moodInput);
      } else {
        updatedResources = await recommendResourcesForInput(moodInput);
        // Fallback to existing recommendResourcesForInput function
      }
      
      if (updatedResources) {
        // Get recommended resources
        const recommendedIds = updatedResources.filter(r => r.recommended).map(r => r.id);
        const existingFiltered = filteredResources.filter(r => !recommendedIds.includes(r.id));
        
        // Show recommended resources first
        const recommendedFirst = [
          ...updatedResources.filter(r => r.recommended),
          ...existingFiltered
        ];
        
        setFilteredResources(recommendedFirst);
        
        // Also try to detect emotion from the input to set the current emotional state
        if (usingOpenRouter) {
          try {
            const emotionResult = await detectEmotionOpenRouter(moodInput);
            if (emotionResult && emotionResult.emotion) {
              setCurrentEmotionalState(emotionResult.emotion);
              // Switch to emotion-specific tab
              setCurrentTab(`emotion-${emotionResult.emotion}`);
            }
          } catch (error) {
            console.error("Error detecting emotion from input:", error);
          }
        }

        toast({
          title: "Recommendations personalized",
          description: usingOpenRouter ?
            "Resources have been reordered using Qwen 3 AI analysis" :
            "Resources have been reordered based on your input"
        });
      }
    } catch (error) {
      console.error("Error personalizing resources:", error);
      toast({
        title: "Personalization failed",
        description: "Could not get recommendations. Check console.",
        variant: "destructive"
      });
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setFilteredResources(resources);
    toast({
      title: "Filters reset",
      description: "Showing all available resources"
    });
  };

  // Add a handler for when a resource is selected through voice suggestions
  const handleVoiceSuggestionSelect = (resourceId: string) => {
    const resource = allResources.find(r => r.id === resourceId);
    if (resource) {
      setSelectedResource(resource);
    }
  };

  // Add methods for coping strategies
  const toggleFavoriteStrategy = (strategyId: string) => {
    setFavoriteStrategies(prev => {
      const newFavorites = prev.includes(strategyId)
        ? prev.filter(id => id !== strategyId)
        : [...prev, strategyId];
      
      // Save to localStorage
      saveStrategiesData(newFavorites, completedStrategies);
      
      toast({
        title: prev.includes(strategyId) ? "Removed from favorites" : "Added to favorites",
        description: "Your preferences have been saved",
      });
      
      return newFavorites;
    });
  };
  
  const markStrategyCompleted = (strategyId: string) => {
    setCompletedStrategies(prev => {
      const newCompleted = prev.includes(strategyId)
        ? prev.filter(id => id !== strategyId)
        : [...prev, strategyId];
      
      // Save to localStorage
      saveStrategiesData(favoriteStrategies, newCompleted);
      
      toast({
        title: completedStrategies.includes(strategyId) ? "Marked as not completed" : "Marked as completed",
        description: "Your progress has been saved",
      });
      
      return newCompleted;
    });
  };
  
  const saveStrategiesData = (favorites: string[], completed: string[]) => {
    try {
      localStorage.setItem(STRATEGIES_KEY, JSON.stringify({
        favorites,
        completed
      }));
    } catch (e) {
      console.error("Error saving strategies data:", e);
    }
  };
  
  const calculateStrategyProgress = () => {
    // Calculate progress based on all categories
    const totalStrategies = Object.values(strategies).flat().length;
    return totalStrategies > 0 ? (completedStrategies.length / totalStrategies) * 100 : 0;
  };

  // Add a new function to search strategies
  const searchStrategies = (category: keyof StrategyCategories): CopingStrategy[] => {
    let results = strategies[category];
    
    // Apply text search filter if search term exists
    if (strategySearchTerm) {
      results = results.filter(strategy => 
        strategy.title.toLowerCase().includes(strategySearchTerm.toLowerCase()) ||
        strategy.description.toLowerCase().includes(strategySearchTerm.toLowerCase()) ||
        strategy.difficulty.toLowerCase().includes(strategySearchTerm.toLowerCase())
      );
    }
    
    // If we have emotional state information, prioritize relevant strategies
    if (currentEmotionalState) {
      // Create a scoring system - higher means more relevant to current emotion
      const getRelevanceScore = (strategy: CopingStrategy): number => {
        let score = 0;
        
        // Mapping emotions to key terms that would be helpful
        const emotionKeyTerms: Record<string, string[]> = {
          'anxiety': ['breath', 'calm', 'ground', 'relax', 'present', 'worry'],
          'sadness': ['activ', 'gratitude', 'connect', 'sunlight', 'value'],
          'anger': ['breath', 'physical', 'calm', 'commun', 'stop'],
          'fear': ['ground', 'breath', 'safe', 'present', 'observe'],
          'surprise': ['ground', 'breath', 'present'],
          'joy': ['gratitude', 'savor', 'share'],
          'neutral': []
        };
        
        // Get relevant terms for current emotion
        const relevantTerms = emotionKeyTerms[currentEmotionalState] || [];
        
        // Check if strategy contains any of the relevant terms
        relevantTerms.forEach(term => {
          if (strategy.title.toLowerCase().includes(term) || 
              strategy.description.toLowerCase().includes(term)) {
            score += 2;
          }
        });
        
        // Prioritize beginner strategies when emotionally distressed
        if (currentEmotionalState === 'anxiety' || 
            currentEmotionalState === 'anger' || 
            currentEmotionalState === 'fear') {
          if (strategy.difficulty === 'Beginner') score += 3;
          if (strategy.difficulty === 'Intermediate') score += 1;
        }
        
        // Prioritize shorter strategies during high emotions
        if (strategy.timeRequired.includes('5 min') || 
            strategy.timeRequired.includes('2 min') || 
            strategy.timeRequired.includes('3 min')) {
          score += 2;
        }
        
        return score;
      };
      
      // Sort by relevance score
      results = [...results].sort((a, b) => getRelevanceScore(b) - getRelevanceScore(a));
    }
    
    return results;
  };

  // Add a function to find related resources for a strategy
  const findRelatedResourcesForStrategy = (strategy: CopingStrategy, category: string): Resource[] => {
    // Map strategy categories to relevant resource tags
    const categoryToResourceTagMap: Record<string, string[]> = {
      'anxiety': ['meditation', 'exercise'],
      'depression': ['exercise', 'education'],
      'stress': ['meditation', 'exercise'],
      'anger': ['meditation', 'exercise', 'education']
    };
    
    // Get relevant tags based on the category
    const relevantTags = categoryToResourceTagMap[category] || ['meditation'];
    
    // Find keywords from the strategy title and description
    const titleWords = strategy.title.toLowerCase().split(' ');
    const descWords = strategy.description.toLowerCase().split(' ');
    const keywordsList = [...titleWords, ...descWords].filter(word => 
      word.length > 4 && !['about', 'these', 'those', 'their', 'other'].includes(word)
    );
    
    // Find resources that match the tags or keywords
    return filteredResources.filter(resource => {
      // Check if resource matches any of the relevant tags
      const matchesTag = relevantTags.some(tag => resource.tag === tag);
      
      // Check if resource title or description contains any of the keywords
      const matchesKeyword = keywordsList.some(keyword => 
        resource.title.toLowerCase().includes(keyword) || 
        resource.description.toLowerCase().includes(keyword)
      );
      
      return matchesTag || matchesKeyword;
    }).slice(0, 3); // Limit to 3 related resources
  };

  // Add a handler for when a strategy is selected
  const handleStrategySelect = (strategy: CopingStrategy, category: string) => {
    setSelectedStrategy(strategy);
    setRelatedResources(findRelatedResourcesForStrategy(strategy, category));
  };

  // Strategy card component
  interface StrategyCardProps {
    strategy: CopingStrategy;
    category: string;
    isFavorite: boolean;
    isCompleted: boolean;
    onToggleFavorite: () => void;
    onToggleCompleted: () => void;
    onSelect: () => void;
  }

  const StrategyCard: React.FC<StrategyCardProps> = ({ 
    strategy, 
    category, 
    isFavorite, 
    isCompleted,
    onToggleFavorite,
    onToggleCompleted,
    onSelect
  }) => {
    return (
      <Card 
        className="h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-lg cursor-pointer"
        onClick={onSelect}
      >
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">{strategy.title}</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className={isFavorite ? "text-yellow-500" : "text-muted-foreground"}
            >
              <Star className="h-5 w-5" fill={isFavorite ? "currentColor" : "none"} />
            </Button>
          </div>
          <div className="flex gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              <Clock className="mr-1 h-3 w-3" /> {strategy.timeRequired}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {strategy.difficulty}
            </Badge>
            <Badge variant="secondary" className="text-xs capitalize">
              {category}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-3">{strategy.description}</p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Share2 className="mr-1 h-3 w-3" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  prepareStrategyForExport(strategy, category, 'print');
                }}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  prepareStrategyForExport(strategy, category, 'pdf');
                }}>
                  <Download className="mr-2 h-4 w-4" />
                  Save as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  prepareStrategyForExport(strategy, category, 'share');
                }}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button 
            variant={isCompleted ? "default" : "outline"} 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompleted();
            }}
            className="gap-1"
          >
            <Check className="h-4 w-4" />
            {isCompleted ? "Completed" : "Mark Done"}
          </Button>
        </CardFooter>
      </Card>
    );
  };

  // Add function to handle voice input for strategy search
  const handleVoiceInput = (transcript: string) => {
    setStrategySearchTerm(transcript);
    setIsVoiceSearching(false);
    
    toast({
      title: "Voice search activated",
      description: `Searching for: "${transcript}"`,
    });
  };

  // Add function to create a printable version of a strategy
  const prepareStrategyForExport = (strategy: CopingStrategy, category: string, format: 'print' | 'pdf' | 'share') => {
    setStrategyForPrinting(strategy);
    setExportFormat(format);
  };

  // Add function to handle sharing a strategy
  const shareStrategy = async (strategy: CopingStrategy) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `MindMate: ${strategy.title}`,
          text: `Check out this coping strategy for ${strategyCategory}: ${strategy.title} - ${strategy.description}`,
          url: window.location.href
        });
        
        toast({
          title: "Strategy shared successfully",
          variant: "default"
        });
      } catch (error) {
        toast({
          title: "Sharing failed",
          description: "Unable to share this strategy at the moment.",
          variant: "destructive"
        });
      }
    } else {
      // Fallback if Web Share API is not available
      toast({
        title: "Sharing not supported",
        description: "Your browser doesn't support direct sharing. Try copying the URL instead.",
        variant: "destructive"
      });
    }
  };

  // Add a useEffect to update recommendations when relevant state changes
  useEffect(() => {
    // Generate smart recommendations based on user state
    const generateRecommendations = () => {
      let recommendations: Resource[] = [];
      
      // 1. First prioritize resources based on emotional state
      if (currentEmotionalState) {
        recommendations = getResourcesForEmotion(currentEmotionalState).slice(0, 3);
      }
      
      // 2. Fill with popular resources if needed
      if (recommendations.length < 3) {
        const popularResources = allResources
          .filter(r => r.rating && r.rating > 4.5)
          .filter(r => !recommendations.some(rec => rec.id === r.id))
          .slice(0, 3 - recommendations.length);
        
        recommendations = [...recommendations, ...popularResources];
      }
      
      // 3. Consider user patterns - recommend resources similar to what they've used
      const resourceStatusEntries = Object.entries(resourceStatuses);
      if (resourceStatusEntries.length > 0) {
        // Find resources that user has made progress on
        const usedResourceIds = resourceStatusEntries
          .filter(([_, status]) => status.progress > 20)
          .map(([id]) => id);
        
        // Find the resource types they prefer
        const usedResources = allResources.filter(r => usedResourceIds.includes(r.id));
        const preferredTypes = [...new Set(usedResources.map(r => r.type))];
        const preferredTags = [...new Set(usedResources.map(r => r.tag))];
        
        // Find similar resources they haven't used much
        const similarResources = allResources
          .filter(r => !usedResourceIds.includes(r.id))
          .filter(r => preferredTypes.includes(r.type) || preferredTags.includes(r.tag))
          .filter(r => !recommendations.some(rec => rec.id === r.id))
          .slice(0, 2);
        
        if (similarResources.length > 0) {
          recommendations = [...recommendations.slice(0, 3 - similarResources.length), ...similarResources];
        }
      }
      
      // 4. Add recommendations based on completed strategies
      if (completedStrategies.length > 0) {
        // Find which strategy categories the user has completed
        const completedCategories = new Set<string>();
        
        Object.entries(strategies).forEach(([category, strategyList]) => {
          const hasCompleted = strategyList.some(s => completedStrategies.includes(s.id));
          if (hasCompleted) completedCategories.add(category);
        });
        
        // Map strategy categories to resource tags
        const categoryToTagMap: Record<string, string[]> = {
          'anxiety': ['meditation', 'exercise'],
          'depression': ['exercise', 'education'],
          'stress': ['meditation', 'education'],
          'anger': ['meditation', 'exercise']
        };
        
        // Find resources that match the user's completed strategy categories
        const relevantTags = Array.from(completedCategories).flatMap(cat => categoryToTagMap[cat] || []);
        const strategyRelatedResources = allResources
          .filter(r => relevantTags.includes(r.tag))
          .filter(r => !recommendations.some(rec => rec.id === r.id))
          .slice(0, 1);
        
        if (strategyRelatedResources.length > 0) {
          recommendations = [...recommendations.slice(0, recommendations.length - 1), ...strategyRelatedResources];
        }
      }
      
      // 5. Ensure we have enough recommendations by adding featured resources if needed
      if (recommendations.length < 4) {
        const featuredResources = allResources
          .filter(r => r.featured)
          .filter(r => !recommendations.some(rec => rec.id === r.id))
          .slice(0, 4 - recommendations.length);
        
        recommendations = [...recommendations, ...featuredResources];
      }
      
      return recommendations.slice(0, 4);
    };
    
    setSmartRecommendations(generateRecommendations());
  }, [currentEmotionalState, resourceStatuses, completedStrategies, allResources]);

  // Add a function to get reason for recommendation
  const getRecommendationReason = (resource: Resource): string => {
    if (currentEmotionalState && getResourcesForEmotion(currentEmotionalState).some(r => r.id === resource.id)) {
      return `Based on your ${currentEmotionalState} state`;
    }
    
    // Check if it's related to a strategy category the user has completed
    if (completedStrategies.length > 0) {
      for (const category of Object.keys(strategies)) {
        const hasCompletedInCategory = strategies[category as keyof StrategyCategories].some(s => completedStrategies.includes(s.id));
        
        if (hasCompletedInCategory) {
          if ((category === 'anxiety' || category === 'stress') && 
              (resource.tag === 'meditation' || resource.type === 'meditation')) {
            return `Based on your interest in ${category} strategies`;
          }
          
          if (category === 'depression' && resource.tag === 'exercise') {
            return `Based on your interest in depression strategies`;
          }
          
          if (category === 'anger' && (resource.tag === 'meditation' || resource.tag === 'education')) {
            return `Based on your interest in anger management`;
          }
        }
      }
    }
    
    // Check if it's similar to resources they've used
    const usedResourceIds = Object.entries(resourceStatuses)
      .filter(([_, status]) => status.progress > 20)
      .map(([id]) => id);
    
    const usedResources = allResources.filter(r => usedResourceIds.includes(r.id));
    
    // If they used resources of the same type
    if (usedResources.some(r => r.type === resource.type)) {
      return `Similar to content you've explored`;
    }
    
    // If it's a highly-rated resource
    if (resource.rating && resource.rating > 4.7) {
      return `Highly rated`;
    }
    
    // Default reason
    if (resource.featured) {
      return `Editor's choice`;
    }
    
    return `You might find this helpful`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-radial from-primary/5 via-background to-background">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
  <div>
    <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
      Coping Strategies & Resources
    </h1>
    <p className="text-muted-foreground">
      Explore our collection of articles, videos, exercises, and coping techniques to support your emotional well-being
    </p>
  </div>
  
  <div className="relative w-full md:w-72">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input 
      placeholder="Search resources..." 
      value={searchTerm} 
      onChange={(e) => setSearchTerm(e.target.value)}
      className="pl-10 backdrop-blur-lg bg-white/10 border-white/20"
    />
  </div>
</div>

          
          <div className="mb-6">
            {currentEmotionalState && (
              <EmotionSuggestions emotion={currentEmotionalState as any || 'neutral'} />
            )}
          </div>
          
          {/* External Media Recommendations */}
          {currentEmotionalState && (
            <div className="mb-6">
              <EmotionalMediaRecommendations 
                emotion={currentEmotionalState}
                intensity={7} // Default moderate intensity
              />
            </div>
          )}
          
          {/* Add Qwen AI Voice Suggestions */}
          {usingOpenRouter && currentEmotionalState && (
            <div className="mb-6 animate-fade-in">
              <QwenAISuggestionVoice
                currentEmotion={currentEmotionalState}
                resources={allResources}
                onResourceSelect={handleVoiceSuggestionSelect}
                autoPlay={shouldAutoPlayVoice}
              />
            </div>
          )}
          
          <div className="mb-4 flex flex-wrap items-center gap-3 justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 backdrop-blur-lg bg-white/5">
                    <Filter className="h-4 w-4" />
                    Difficulty
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 backdrop-blur-lg bg-white/90 dark:bg-black/90 border-white/20">
                  <DropdownMenuLabel>Filter by Difficulty</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setDifficultyFilter('beginner')}>
                    Beginner
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDifficultyFilter('intermediate')}>
                    Intermediate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDifficultyFilter('advanced')}>
                    Advanced
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setDifficultyFilter(null)}>
                    Clear Filter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 backdrop-blur-lg bg-white/5">
                    <Filter className="h-4 w-4" />
                    Type
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 backdrop-blur-lg bg-white/90 dark:bg-black/90 border-white/20">
                  <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTypeFilter('article')}>
                    Articles
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter('video')}>
                    Videos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter('exercise')}>
                    Exercises
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter('meditation')}>
                    Meditations
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTypeFilter(null)}>
                    Clear Filter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {(difficultyFilter || typeFilter || searchTerm) && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1">
                  <RefreshCcw className="h-3 w-3" />
                  Reset
                </Button>
              )}
            </div>
            
            <div className="text-sm text-muted-foreground">
              {filteredResources.length} resources available
            </div>
          </div>
          
          <div className="flex flex-col gap-6">
            <Tabs defaultValue="resources" onValueChange={(value) => setShowStrategiesTab(value === 'strategies')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="resources">Resources</TabsTrigger>
                <TabsTrigger value="strategies">Coping Strategies</TabsTrigger>
              </TabsList>
              
              <TabsContent value="resources">
            <Tabs defaultValue="all" value={currentTab} onValueChange={handleTabChange}>
              <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                <TabsTrigger value="all" className="text-sm">All Resources</TabsTrigger>
                <TabsTrigger value="recommended" className="text-sm">Recommended</TabsTrigger>
                <TabsTrigger value="meditation" className="text-sm">Meditation</TabsTrigger>
                <TabsTrigger value="exercise" className="text-sm">Exercise</TabsTrigger>
                <TabsTrigger value="education" className="text-sm">Education</TabsTrigger>
                <TabsTrigger value="saved" className="text-sm">Saved</TabsTrigger>
                {currentEmotionalState && (
                  <TabsTrigger 
                    value={`emotion-${currentEmotionalState}`} 
                    className="text-sm bg-gradient-to-r animate-fade-in"
                  >
                    For {getEmotionEmoji(currentEmotionalState)} {currentEmotionalState}
                  </TabsTrigger>
                )}
              </TabsList>
              
              {/* Core tab contents */}
              {['all', 'recommended', 'meditation', 'exercise', 'education', 'saved'].map(tag => (
                <TabsContent key={tag} value={tag} className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filterByTag(tag).length > 0 ? (
                      filterByTag(tag).map(resource => (
                        <ResourceCard 
                          key={resource.id} 
                          resource={resource} 
                          isSaved={savedResources.includes(resource.id)}
                          onSave={() => toggleSaveResource(resource.id)}
                          onStart={() => startResource(resource)}
                          resourceStatuses={resourceStatuses}
                        />
                      ))
                    ) : (
                      <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                        <div className="bg-muted/20 p-4 rounded-full mb-4">
                          <Info className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-medium mb-2">No {tag} resources found</h3>
                        <p className="text-muted-foreground max-w-md">
                          {tag === 'saved' 
                            ? "You haven't saved any resources yet. Browse resources and click the bookmark icon to save them."
                            : "Try adjusting your search or filters to find what you're looking for."}
                        </p>
                        {tag === 'saved' && (
                          <Button variant="outline" className="mt-4" onClick={() => setCurrentTab('all')}>
                            Browse All Resources
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
              
              {/* Emotion-specific tab content */}
              {currentEmotionalState && (
                <TabsContent key={`emotion-${currentEmotionalState}`} value={`emotion-${currentEmotionalState}`} className="mt-6">
                  <div className={`mb-6 p-4 rounded-lg bg-gradient-to-r ${getEmotionColor(currentEmotionalState)} shadow-sm`}>
                    <h3 className="text-lg font-semibold flex items-center">
                      <span className="mr-2">{getEmotionEmoji(currentEmotionalState)}</span>
                      Resources for your {currentEmotionalState} state
                    </h3>
                    <p className="text-sm opacity-80 mt-1">
                      These resources are specifically chosen to help with your current emotional state. Explore them to improve your wellbeing.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {getResourcesForEmotion(currentEmotionalState).length > 0 ? (
                      getResourcesForEmotion(currentEmotionalState).map(resource => (
                        <ResourceCard 
                          key={resource.id} 
                          resource={resource} 
                          isSaved={savedResources.includes(resource.id)}
                          onSave={() => toggleSaveResource(resource.id)}
                          onStart={() => startResource(resource)}
                          resourceStatuses={resourceStatuses}
                        />
                      ))
                    ) : (
                      <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                        <div className="bg-muted/20 p-4 rounded-full mb-4">
                          <Info className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-medium mb-2">No resources for {currentEmotionalState}</h3>
                        <p className="text-muted-foreground max-w-md">
                          We couldn't find specific resources for your current emotional state. 
                          Try browsing all resources or checking the recommended tab.
                        </p>
                        <Button variant="outline" className="mt-4" onClick={() => setCurrentTab('all')}>
                          Browse All Resources
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>
              </TabsContent>
              

          <TabsContent value="strategies">
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">Coping Strategies</h2>
                      <p className="text-muted-foreground max-w-3xl">
                        Evidence-based techniques to manage difficult emotions and build resilience. 
                        Try these strategies when you're feeling overwhelmed or need emotional support.
                      </p>
                    </div>
                    <div className="hidden md:flex items-center gap-2">
                      <Badge variant="outline" className="bg-primary/10">
                        {completedStrategies.length} completed
                      </Badge>
                      <Badge variant="outline" className="bg-yellow-500/10">
                        {favoriteStrategies.length} favorites
                      </Badge>
                    </div>
                  </div>
                  
                  <Progress 
                    value={calculateStrategyProgress()} 
                    className="h-2 mb-6" 
                  />
                  
                  {/* Add "My Progress" section */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">My Progress</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {completedStrategies.length} / {Object.values(strategies).flat().length}
                        </div>
                        <p className="text-sm text-muted-foreground">Strategies completed</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Most Used Category</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold capitalize">
                          {Object.entries(strategies).reduce((max, [category, strats]) => {
                            const completed = strats.filter(s => completedStrategies.includes(s.id)).length;
                            return completed > max.count ? { category, count: completed } : max;
                          }, { category: 'none', count: 0 }).category}
                        </div>
                        <p className="text-sm text-muted-foreground">Based on completed strategies</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Favorite Strategies</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {favoriteStrategies.length}
                        </div>
                        <p className="text-sm text-muted-foreground">Strategies saved as favorites</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                
                <Tabs defaultValue="anxiety" value={strategyCategory} onValueChange={setStrategyCategory}>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <TabsList className="bg-background/50 backdrop-blur-sm border">
                      <TabsTrigger value="anxiety">Anxiety</TabsTrigger>
                      <TabsTrigger value="depression">Depression</TabsTrigger>
                      <TabsTrigger value="stress">Stress</TabsTrigger>
                      <TabsTrigger value="anger">Anger</TabsTrigger>
                    </TabsList>
                    
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Search strategies..." 
                          value={strategySearchTerm}
                          onChange={(e) => setStrategySearchTerm(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => setIsVoiceSearching(true)}
                        title="Search by voice"
                      >
                        <MicIcon className="h-4 w-4" />
                      </Button>
                      
                      <div className="flex md:hidden items-center gap-2">
                        <Badge variant="outline" className="bg-primary/10">
                          {completedStrategies.length} completed
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {(Object.keys(strategies) as Array<keyof typeof strategies>).map((category) => (
                    <TabsContent key={category} value={category} className="mt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {searchStrategies(category).map((strategy) => (
                          <StrategyCard 
                            key={strategy.id}
                            strategy={strategy}
                            category={category}
                            isFavorite={favoriteStrategies.includes(strategy.id)}
                            isCompleted={completedStrategies.includes(strategy.id)}
                            onToggleFavorite={() => toggleFavoriteStrategy(strategy.id)}
                            onToggleCompleted={() => markStrategyCompleted(strategy.id)}
                            onSelect={() => handleStrategySelect(strategy, category)}
                          />
                        ))}
                      </div>
                      
                      {searchStrategies(category).length === 0 && (
                        <div className="text-center py-10">
                          <Info className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium mb-2">No matching strategies found</h3>
                          <p className="text-muted-foreground">
                            Try adjusting your search term to find what you're looking for.
                          </p>
                          {strategySearchTerm && (
                            <Button 
                              variant="outline" 
                              className="mt-4"
                              onClick={() => setStrategySearchTerm('')}
                            >
                              Clear Search
                            </Button>
                          )}
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
      
      {selectedResource && (
        <ResourceDetailModal
          resource={selectedResource}
          isOpen={!!selectedResource}
          onClose={handleCloseModal}
          isSaved={resourceStatuses[selectedResource.id]?.isSaved ?? false}
          progress={resourceStatuses[selectedResource.id]?.progress ?? 0}
          onSave={() => toggleSaveResource(selectedResource.id)}
          onProgressChange={(newProgress) => updateResourceProgress(selectedResource.id, newProgress)}
          onComplete={() => updateResourceProgress(selectedResource.id, 100)}
        />
      )}

      {/* Add Strategy Detail Modal */}
      {selectedStrategy && (
        <Dialog open={!!selectedStrategy} onOpenChange={() => setSelectedStrategy(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedStrategy.title}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className={favoriteStrategies.includes(selectedStrategy.id) ? "text-yellow-500" : "text-muted-foreground"}
                  onClick={() => toggleFavoriteStrategy(selectedStrategy.id)}
                >
                  <Star className="h-5 w-5" fill={favoriteStrategies.includes(selectedStrategy.id) ? "currentColor" : "none"} />
                </Button>
              </DialogTitle>
              <DialogDescription>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    <Clock className="mr-1 h-3 w-3" /> {selectedStrategy.timeRequired}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {selectedStrategy.difficulty}
                  </Badge>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {strategyCategory}
                  </Badge>
                </div>
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="mt-2 max-h-[300px]">
              <div className="space-y-4 p-1">
                <h3 className="font-semibold text-lg mb-2">Description</h3>
                <p>{selectedStrategy.description}</p>
                
                <h3 className="font-semibold text-lg mb-2">Steps</h3>
                <div className="space-y-2">
                  <div className="flex gap-2 items-start">
                    <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                      1
                    </div>
                    <p className="text-sm">Prepare by finding a quiet, comfortable place where you won't be disturbed.</p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                      2
                    </div>
                    <p className="text-sm">Follow the specific instructions for this technique, taking your time and being patient with yourself.</p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                      3
                    </div>
                    <p className="text-sm">Practice regularly for best results - consistency is key with emotional coping strategies.</p>
                  </div>
                </div>
                
                {relatedResources.length > 0 && (
                  <>
                    <h3 className="font-semibold text-lg mb-2">Related Resources</h3>
                    <div className="space-y-2">
                      {relatedResources.map(resource => (
                        <Card key={resource.id} className="p-3">
                          <div className="flex items-start gap-2">
                            <div className="text-xl flex-shrink-0">
                              {resource.type === 'article' && '📝'}
                              {resource.type === 'video' && '🎥'}
                              {resource.type === 'exercise' && '💪'}
                              {resource.type === 'meditation' && '🧘'}
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-medium">{resource.title}</h4>
                              <p className="text-xs text-muted-foreground line-clamp-1">{resource.description}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => {
                              setSelectedResource(resource);
                              setSelectedStrategy(null);
                            }}>
                              Open
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
            
            <DialogFooter className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {completedStrategies.includes(selectedStrategy.id) ? (
                  <Badge variant="default">Completed</Badge>
                ) : (
                  <Badge variant="outline">Not completed</Badge>
                )}
              </div>
              <Button 
                variant={completedStrategies.includes(selectedStrategy.id) ? "outline" : "default"} 
                onClick={(e) => {
                  e.stopPropagation();
                  markStrategyCompleted(selectedStrategy.id);
                }}
              >
                <Check className="mr-2 h-4 w-4" />
                {completedStrategies.includes(selectedStrategy.id) ? "Mark as not done" : "Mark as completed"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add printable strategy modal */}
      {strategyForPrinting && (
        <AlertDialog open={!!strategyForPrinting} onOpenChange={() => setStrategyForPrinting(null)}>
          <AlertDialogContent className="max-w-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {exportFormat === 'share' ? 'Share Strategy' : 'Export Strategy'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {exportFormat === 'share' 
                  ? 'Share this coping strategy with others.' 
                  : 'Print or save this strategy as a PDF.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            {exportFormat !== 'share' && (
              <div className="bg-white p-8 rounded-lg print:shadow-none" id="printable-strategy">
                <div className="border-b pb-4 mb-4">
                  <h2 className="text-2xl font-bold text-primary">{strategyForPrinting.title}</h2>
                  <div className="flex gap-2 mt-2">
                    <span className="text-sm text-muted-foreground">Time: {strategyForPrinting.timeRequired}</span>
                    <span className="text-sm text-muted-foreground">Difficulty: {strategyForPrinting.difficulty}</span>
                    <span className="text-sm text-muted-foreground capitalize">Category: {strategyCategory}</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Description</h3>
                    <p>{strategyForPrinting.description}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Steps</h3>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>Prepare by finding a quiet, comfortable place where you won't be disturbed.</li>
                      <li>Follow the specific instructions for this technique, taking your time and being patient with yourself.</li>
                      <li>Practice regularly for best results - consistency is key with emotional coping strategies.</li>
                    </ol>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Tips for Success</h3>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Start with just a few minutes and gradually increase the time as you get more comfortable.</li>
                      <li>Don't judge yourself if your mind wanders or the technique doesn't feel effective at first.</li>
                      <li>Try this technique regularly, even when you're not feeling distressed, to build your coping skills.</li>
                    </ul>
                  </div>
                  
                  <div className="text-center text-sm text-muted-foreground mt-8 print:mt-12">
                    <p>From MindMate Wellness App | mindmate.app</p>
                    <p>For more coping strategies and mental health resources</p>
                  </div>
                </div>
              </div>
            )}
            
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              {exportFormat === 'print' && (
                <AlertDialogAction onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </AlertDialogAction>
              )}
              {exportFormat === 'pdf' && (
                <AlertDialogAction>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </AlertDialogAction>
              )}
              {exportFormat === 'share' && (
                <AlertDialogAction onClick={() => shareStrategy(strategyForPrinting)}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Add voice search dialog */}
      <Dialog open={isVoiceSearching} onOpenChange={setIsVoiceSearching}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Voice Search</DialogTitle>
            <DialogDescription>
              Speak clearly to search for coping strategies
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`animate-ping absolute inline-flex h-12 w-12 rounded-full bg-primary opacity-75 ${isVoiceSearching ? 'opacity-75' : 'opacity-0'}`}></span>
              </div>
              <VolumeIcon className="h-12 w-12 text-primary" />
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Say the name of a strategy, a difficulty level, or describe what you're looking for
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVoiceSearching(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface ResourceCardProps {
  resource: Resource;
  isSaved: boolean;
  onSave: () => void;
  onStart: () => void;
  resourceStatuses?: Record<string, ResourceStatus>;
}

// Use memo to prevent unnecessary re-renders
const ResourceCard = memo(({ resource, isSaved, onSave, onStart, resourceStatuses = {} }: ResourceCardProps) => {
  // Map of resource types to their icons
  const typeIcons = {
    article: '📝',
    video: '🎥',
    exercise: '💪',
    meditation: '🧘',
  };

  // CSS classes for different difficulty levels
  const difficultyColors = {
    beginner: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300',
    advanced: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };

  // Handle button clicks without propagation to prevent double-triggering
  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSave();
  };

  const handleStartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStart();
  };

  return (
    <Card className="h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-md relative overflow-hidden">
      {resource.ai_summary && (
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
            AI Enhanced
          </Badge>
        </div>
      )}
      
      {resource.featured && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/50" />
      )}
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg line-clamp-2">{resource.title}</CardTitle>
          <span className="text-2xl flex-shrink-0 ml-2">{typeIcons[resource.type]}</span>
        </div>
        <CardDescription className="mt-1 line-clamp-3">
          {resource.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="outline" className="capitalize">
            {resource.tag}
          </Badge>
          
          {resource.difficulty && (
            <Badge variant="outline" className={difficultyColors[resource.difficulty]}>
              {resource.difficulty}
            </Badge>
          )}
          
          {resource.recommended && (
            <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-800/30 dark:text-violet-300">
              Recommended
            </Badge>
          )}
        </div>
        
        {(resourceStatuses?.[resource.id]?.progress > 0 || resource.progress) && (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span>Progress</span>
              <span>{resourceStatuses?.[resource.id]?.progress || resource.progress}%</span>
            </div>
            <Progress value={resourceStatuses?.[resource.id]?.progress || resource.progress} className="h-1.5" />
          </div>
        )}
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            {resource.rating && (
              <>
                <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                <span className="text-sm font-medium">{resource.rating}</span>
              </>
            )}
            {resource.duration && (
              <div className="flex items-center ml-3 text-muted-foreground">
                <Clock className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">{resource.duration}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          className="flex-1" 
          onClick={handleStartClick}
        >
          Start Resource
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleSaveClick} 
          className="ml-2"
        >
          {isSaved ? (
            <Bookmark className="h-4 w-4 fill-primary text-primary" />
          ) : (
            <BookmarkPlus className="h-4 w-4" />
          )}
        </Button>
      </CardFooter>
    </Card>
  );
});

// For debugging purposes
ResourceCard.displayName = 'ResourceCard';

export default Resources;
