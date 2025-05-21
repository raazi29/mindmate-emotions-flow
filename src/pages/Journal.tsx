import React, { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { analyzeEmotionWithModel } from '@/utils/emotionUtils'; // Uncommented this import
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CalendarIcon, Search, Filter, BarChart, // Note: Check for non-breaking spaces if copy-pasting, replace with regular spaces.
  Download, Trash2, Edit, Flame, Trophy,
  ArrowUpCircle, ArrowDownCircle, Share, ChevronRight, Sparkles,
  Mic, Play, Pause, PlusCircle, FileText, Cloud, X, AlignLeft, RefreshCw, Bookmark,
  StopCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { SupabaseTest } from '@/components/SupabaseTest';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { HfInference } from '@huggingface/inference';
import { journalOperations } from '@/lib/supabase';
import { format, isToday, isYesterday, differenceInDays, subDays } from 'date-fns';
// Import toast from hooks
import { toast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
// Local declarations are defined below instead of imports
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'; // Note: Check for non-breaking spaces if copy-pasting
import { Loader2 } from 'lucide-react';

// Import HuggingFace configuration
import { HuggingFaceConfig } from '@/lib/HuggingFaceConfig';

type Emotion = 'joy' | 'sadness' | 'anger' | 'fear' | 'love' | 'surprise' | 'neutral';
type SortOption = 'dateDesc' | 'dateAsc' | 'emotion' | 'title';

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  emotion: Emotion;
  date: Date;
  intensity?: number;
  tags?: string[];
  user_id?: string;
  created_at?: string; // Should be ISO string if parsed with new Date()
  emotion_intensity?: number; // Consistent with database
}

// Journal prompts by emotion type
const journalPrompts: Record<Emotion, string[]> = {
  joy: [
    "What made you smile today?",
    "Describe a moment of pure happiness you experienced recently.",
    "What accomplishment are you most proud of this week?",
    "Write about something that brings you consistent joy in your life.",
    "Describe a recent experience that made you laugh out loud.",
    "What's something you're looking forward to that makes you happy?",
    "Reflect on a time when you felt completely content and at peace.",
    "What simple pleasures in life bring you the most happiness?",
    "Describe a positive interaction you had with someone recently.",
    "What hobby or activity brings you the most joy and why?",
    "Who in your life makes you happiest, and what qualities do they have?",
    "Write about a favorite memory that still brings you joy when you think about it."
  ],
  sadness: [
    "What's weighing on your mind today?",
    "When did you last feel this way, and how did you overcome it?",
    "What would help you feel better right now?",
    "Describe a loss you're still processing and how it affects you.",
    "Write a letter to your future self about what you're currently struggling with.",
    "What's something you miss from your past?",
    "What unresolved feelings are holding you back right now?",
    "If your sadness could teach you something, what might that be?",
    "What self-care activities help you when you're feeling down?",
    "Is there something you need to let go of that's causing you pain?",
    "What do you wish others understood about what you're going through?",
    "How might this difficult time be shaping you in positive ways you can't see yet?"
  ],
  anger: [
    "What triggered your frustration today?",
    "How could you address this situation differently next time?",
    "What helps you calm down when you're upset?",
    "Describe a recent conflict and what you learned from it.",
    "What boundaries do you need to establish to protect your peace?",
    "Write about a recurring situation that consistently makes you angry.",
    "If your anger could speak, what would it say it needs?",
    "What underlying emotions might be feeding your anger?",
    "How does your body feel when you're angry? Where do you feel tension?",
    "What would a constructive expression of your current feelings look like?",
    "What part of this situation is within your control to change?",
    "How might your anger be trying to protect you from something?"
  ],
  fear: [
    "What's causing your anxiety right now?",
    "What's the worst that could happen, and how likely is it?",
    "What small step could you take to face this fear?",
    "Describe a fear you've overcome in the past and how you did it.",
    "What uncertainty are you currently struggling to accept?",
    "What safety behaviors do you rely on when feeling anxious?",
    "If your anxiety had a message for you, what would it be trying to say?",
    "How does fear limit you, and what would be possible without it?",
    "What grounding techniques help you when you feel overwhelmed?",
    "What are your coping strategies for handling uncertainty?",
    "When do you feel most safe and secure, and how can you create more of that?",
    "What would you do if you knew you couldn't fail?"
  ],
  love: [
    "Who are you feeling connected to right now?",
    "How have you shown love to yourself or others recently?",
    "What relationship in your life are you most grateful for?",
    "Describe a moment when you felt deeply loved and appreciated.",
    "What acts of kindness have you witnessed or experienced lately?",
    "How do you express love differently than those around you?",
    "Write about someone who has had a profound positive impact on your life.",
    "What does unconditional love mean to you and where have you experienced it?",
    "How has your understanding of love evolved over time?",
    "What makes you feel most loved and appreciated?",
    "How can you better communicate your needs in your relationships?",
    "What relationship would you like to strengthen, and how might you do that?"
  ],
  surprise: [
    "What unexpected thing happened today?",
    "How did this surprise change your perspective?",
    "What did you learn from this unexpected experience?",
    "Describe a time when things didn't go as planned but turned out better.",
    "What's something you recently discovered about yourself?",
    "Write about a pleasant surprise that made your day better.",
    "What assumptions have been challenged by a recent experience?",
    "How has an unexpected change in your life led to growth?",
    "What spontaneous decision led to a memorable experience?",
    "When was the last time you were completely amazed by something?",
    "What surprising skill or strength have you discovered in yourself lately?",
    "How could you introduce more novelty and surprise into your routine?"
  ],
  neutral: [
    "How would you describe your day so far?",
    "What's on your mind right now?",
    "What are you looking forward to in the coming days?",
    "Reflect on your current priorities and whether they align with your values.",
    "What habits would you like to build or break in the coming month?",
    "Describe your ideal productive day from start to finish.",
    "What three things would make tomorrow a good day?",
    "What are you currently learning or would like to learn more about?",
    "How do you define success in this phase of your life?",
    "What's something you've been putting off that you could take action on?",
    "What would a perfect balance in your life look like right now?",
    "If you could give advice to yourself one year ago, what would you say?"
  ]
};

// Add mood emojis and colors
const MOODS = [
  { name: "Happy", emoji: "😊", color: "#4ade80" },
  { name: "Calm", emoji: "😌", color: "#60a5fa" },
  { name: "Sad", emoji: "😢", color: "#94a3b8" },
  { name: "Angry", emoji: "😠", color: "#f87171" },
  { name: "Anxious", emoji: "😰", color: "#fbbf24" },
  { name: "Tired", emoji: "😴", color: "#a78bfa" },
  { name: "Excited", emoji: "🤩", color: "#fb923c" },
  { name: "Neutral", emoji: "😐", color: "#9ca3af" },
];

// Convert emotion type to mood name
const emotionToMood = (emotion: Emotion): string => {
  switch(emotion) {
    case 'joy': return 'Happy';
    case 'sadness': return 'Sad';
    case 'anger': return 'Angry';
    case 'fear': return 'Anxious';
    case 'love': return 'Calm'; // Note: 'love' maps to 'Calm' in your MOODS logic
    case 'surprise': return 'Excited';
    case 'neutral': return 'Neutral';
    default: return 'Neutral';
  }
};

// Get mood emoji based on emotion type
const getMoodEmojiFromEmotion = (emotion: Emotion): string => {
  const moodName = emotionToMood(emotion);
  const mood = MOODS.find(m => m.name === moodName);
  return mood ? mood.emoji : "😐";
};

// Add mood frequency interface for charts
interface MoodFrequency {
  name: string;
  value: number;
  color: string;
}

// Demo entries for offline or unauthenticated mode
const demoEntries: JournalEntry[] = Array(14).fill(null).map((_, i) => {
  const now = new Date();
  const date = new Date(now);
  date.setDate(date.getDate() - i);
  
  // Alternate between different emotions
  const emotions = ['joy', 'sadness', 'anger', 'fear', 'neutral', 'surprise', 'love'] as Emotion[];
  const emotion = emotions[i % emotions.length];
  
  return {
    id: `demo-${i}`,
    title: `Demo Journal Entry ${i + 1}`,
    content: `This is a demo journal entry for testing. It demonstrates a ${emotion} entry. #demo #${emotion}`,
    emotion: emotion,
    intensity: Math.floor(Math.random() * 10) + 1,
    date: date,
    tags: ['demo', emotion],
    emotion_intensity: Math.floor(Math.random() * 10) + 1,
  };
});

// Track a streaks record
interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastEntryDate: Date | null;
}

// --- Removed/Replace Mock/Placeholder functions and objects ---
// const useUser = () => ({ user: { id: 'mock-user-id' } as any, loading: false }); // Mock
// const toast = (options: { title: string, description?: string, variant?: string, duration?: number }) => console.log('Toast:', options); // Mock
// const analyzeEmotionWithModel = async (text: string, client: HfInference | null): Promise<{ emotion: Emotion, intensity: number }> => {
//   console.log('Analyzing emotion for:', text, 'with client:', client);
//   // Fallback logic if client is null or API fails
//   const emotions: Emotion[] = ['joy', 'sadness', 'anger', 'fear', 'neutral'];
//   return { emotion: emotions[Math.floor(Math.random() * emotions.length)], intensity: Math.floor(Math.random() * 10) + 1 };
// };
// --- End Mock/Placeholder ---


const Journal = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [newEntry, setNewEntry] = useState({ title: '', content: '' });
  const [isWriting, setIsWriting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('entries');
  const [filterEmotion, setFilterEmotion] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOption>('dateDesc');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [streaks, setStreaks] = useState<StreakData>({ currentStreak: 0, longestStreak: 0, lastEntryDate: null });
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('20:00');
  const downloadRef = useRef<HTMLAnchorElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { user, loading: userLoading } = useUser();
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [hfClient, setHfClient] = useState<HfInference | null>(null);
  const [selectedMood, setSelectedMood] = useState<string>('neutral'); // Corresponds to MOODS.name
  const [energyLevel, setEnergyLevel] = useState(5); // Assuming 1-10 scale
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState<string[]>([]);
  const [showSavedPrompts, setShowSavedPrompts] = useState(false);

  // Initialize Hugging Face client
  useEffect(() => {
    if (HuggingFaceConfig.apiKey && HuggingFaceConfig.apiKey !== 'YOUR_HUGGINGFACE_API_KEY_HERE') {
      setHfClient(new HfInference(HuggingFaceConfig.apiKey));
      console.log('[Journal] Hugging Face client initialized.');
    } else {
      console.warn('[Journal] Hugging Face API key not found or is placeholder. Emotion detection will use fallback.');
    }
  }, []);

  // Load saved prompts from local storage
  useEffect(() => {
    const savedPromptsFromStorage = localStorage.getItem('mindmate-saved-prompts');
    if (savedPromptsFromStorage) {
      try {
        const parsedPrompts = JSON.parse(savedPromptsFromStorage);
        if (Array.isArray(parsedPrompts)) {
          setSavedPrompts(parsedPrompts);
        }
      } catch (error) {
        console.error('Error parsing saved prompts from local storage:', error);
      }
    }
  }, []);

  // Save to local storage when saved prompts change
  useEffect(() => {
    if (savedPrompts.length > 0) {
      localStorage.setItem('mindmate-saved-prompts', JSON.stringify(savedPrompts));
    } else {
      localStorage.removeItem('mindmate-saved-prompts'); // Clean up if empty
    }
  }, [savedPrompts]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    generateNewPrompt();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intended to run once on mount to set an initial prompt

  useEffect(() => {
    const fetchEntries = async () => {
      setIsLoading(true);
      if (!user) { // If no user, use demo entries
        console.log('[Journal] No user found, loading demo entries.');
        setEntries(demoEntries);
        setIsLoading(false);
        return;
      }

      try {
        console.log(`[Journal] Fetching entries for user: ${user.id}`);
        const dbEntries = await journalOperations.getEntries(user.id);
        const mappedEntries: JournalEntry[] = dbEntries.map((entry: any) => ({ // Added 'any' for mock flexibility
          id: entry.id,
          title: entry.title,
          content: entry.content,
          emotion: entry.emotion as Emotion,
          intensity: entry.emotion_intensity, // ensure this field name is correct from DB
          date: new Date(entry.created_at), // Ensure created_at is a valid date string
          tags: entry.tags || []
        }));
        setEntries(mappedEntries);
         console.log('[Journal] Entries fetched and mapped:', mappedEntries.length);
      } catch (error) {
        console.error('[Journal] Failed to fetch entries:', error);
        toast({
          title: 'Connection Error',
          description: 'Could not load entries. Using offline demo data.',
          variant: 'destructive',
        });
        setIsOnline(false); // Assume offline if fetch fails
        setEntries(demoEntries); // Fallback to demo entries
      } finally {
        setIsLoading(false);
      }
    };

    if (!userLoading) { // Only fetch if user loading is complete
      fetchEntries();
    } else {
        console.log('[Journal] Waiting for user session...');
        setIsLoading(true); // Show loading while user session is resolving
    }
  }, [user, userLoading]);


  useEffect(() => {
    if (!entries || entries.length === 0) {
      setStreaks(prevStreaks => ({ currentStreak: 0, longestStreak: prevStreaks.longestStreak, lastEntryDate: null }));
      return;
    }

    const sortedEntries = [...entries].sort((a, b) => b.date.getTime() - a.date.getTime());
    const lastEntryDate = sortedEntries[0].date;

    if (!lastEntryDate) return;

    // Streak is active if the last entry was today or yesterday
    const isStreakActive = isToday(lastEntryDate) || isYesterday(lastEntryDate);
    let currentStreak = 0;

    if (isStreakActive) {
      const dates = sortedEntries.map(e => format(e.date, 'yyyy-MM-dd'));
      const uniqueDates = [...new Set(dates)]; // Already sorted due to sortedEntries

      if (uniqueDates.length > 0) {
          currentStreak = 1;
          let currentDateIter = new Date(uniqueDates[0]); // Start with the most recent unique date

          for (let i = 1; i < uniqueDates.length; i++) {
              const entryDateIter = new Date(uniqueDates[i]);
              // Check if entryDateIter is exactly one day before currentDateIter
              // Note: The original '|| isToday(entryDate) && isYesterday(currentDate)' condition might be problematic
              // or redundant given the sorted order. Consider if it's truly needed.
              // For date-fns differenceInDays(laterDate, earlierDate) is positive.
              if (differenceInDays(currentDateIter, entryDateIter) === 1) {
                  currentStreak++;
                  currentDateIter = entryDateIter; // Move to the previous day
              } else {
                  break; // Streak broken
              }
          }
      }
    }
    const newLongestStreak = Math.max(streaks.longestStreak, currentStreak);

    setStreaks({
      currentStreak,
      longestStreak: newLongestStreak,
      lastEntryDate
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, streaks.longestStreak]); // Added streaks.longestStreak

  // --- Helper Functions ---

  const getAllUniqueTags = (): string[] => {
    const allTags = entries.flatMap(entry => entry.tags || []);
    return Array.from(new Set(allTags)).sort();
  };

  const getRandomPrompt = (emotion: Emotion = 'neutral') => {
    const promptsForEmotion = journalPrompts[emotion];
    if (!promptsForEmotion || promptsForEmotion.length === 0) {
        // Fallback if no prompts for the given emotion (should not happen with current data)
        const neutralPrompts = journalPrompts['neutral'];
        return neutralPrompts[Math.floor(Math.random() * neutralPrompts.length)];
    }
    return promptsForEmotion[Math.floor(Math.random() * promptsForEmotion.length)];
  };


  const generateNewPrompt = () => {
    const emotions: Emotion[] = ['joy', 'sadness', 'anger', 'fear', 'love', 'surprise', 'neutral'];
    let currentEmotionType: Emotion = 'neutral'; // Default

    // Find which emotion the currentPrompt belongs to, if any
    if (currentPrompt) {
        for (const [emotionKey, promptsArray] of Object.entries(journalPrompts)) {
            if (promptsArray.includes(currentPrompt)) {
                currentEmotionType = emotionKey as Emotion;
                break;
            }
        }
    }
    
    // Filter out the current emotion type to try and get a different one
    const availableEmotions = emotions.filter(e => e !== currentEmotionType);
    const randomEmotion = availableEmotions.length > 0 
        ? availableEmotions[Math.floor(Math.random() * availableEmotions.length)]
        : 'neutral'; // Fallback if all emotions somehow get filtered out

    const newPrompt = getRandomPrompt(randomEmotion);
    setCurrentPrompt(newPrompt);
    
    // Avoid toast on initial mount prompt generation if desired
    // For now, it always toasts
    toast({
      title: `New ${randomEmotion} prompt`,
      description: "A different type of reflection to explore",
      variant: "default" // Use a less intrusive variant if needed
    });
    
    return newPrompt;
  };


  const usePromptForJournal = () => {
    const promptWords = currentPrompt.split(' ');
    const suggestedTitle = promptWords.slice(0, 5).join(' ') + (promptWords.length > 5 ? '...' : '');
    
    setNewEntry({ 
      title: suggestedTitle, 
      content: currentPrompt + '\n\n' 
    });
    setIsWriting(true);
    setIsEditing(false); // Start new entry, not editing
    setEditingEntryId(null);
    
    toast({
      title: "Prompt Applied",
      description: "The writing prompt has been added to your journal entry.",
      variant: "default"
    });
  };

  const saveCurrentPrompt = () => {
    if (currentPrompt && !savedPrompts.includes(currentPrompt)) {
      setSavedPrompts(prev => [...prev, currentPrompt]);
      toast({
        title: "Prompt Saved",
        description: "The current prompt has been saved to your collection.",
        variant: "default"
      });
    } else if (savedPrompts.includes(currentPrompt)) {
         toast({
        title: "Prompt Already Saved",
        description: "This prompt is already in your collection.",
        variant: "default" // Or 'info'
      });
    }
  };
  
  const useSavedPrompt = (prompt: string) => {
    setCurrentPrompt(prompt); // Set it as the current prompt
    // Then use the logic from usePromptForJournal
    const promptWords = prompt.split(' ');
    const suggestedTitle = promptWords.slice(0, 5).join(' ') + (promptWords.length > 5 ? '...' : '');
    setNewEntry({ 
      title: suggestedTitle, 
      content: prompt + '\n\n' 
    });
    setIsWriting(true);
    setIsEditing(false);
    setEditingEntryId(null);
    setShowSavedPrompts(false); // Close the saved prompts list
    toast({
      title: "Saved Prompt Applied",
      description: "The selected prompt has been added to your journal entry.",
      variant: "default"
    });
  };

  const viewEntryDetails = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setShowDetailModal(true);
  };

  const handleRecordToggle = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      toast({
        title: "Voice Recording Started",
        description: "Voice recording feature would start here.",
        variant: "default"
      });
    } else {
      toast({
        title: "Recording Stopped",
        description: "Recording would be processed.",
        variant: "default"
      });
    }
  };

  const handlePlayToggle = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      toast({
        title: "Text-to-Speech Started",
        description: "This would read your entry aloud.",
        variant: "default"
      });
      // Simulate stopping
      setTimeout(() => setIsPlaying(false), 3000);
    } else {
        // Logic to stop TTS if it was truly playing
        toast({
            title: "Text-to-Speech Stopped",
            variant: "default"
        });
    }
  };

  const extractTags = (content: string): string[] => {
    const tags = new Set<string>();
    const tagRegex = /#(\w+)/g;
    let match;
    while ((match = tagRegex.exec(content)) !== null) {
      tags.add(match[1].toLowerCase());
    }
    return Array.from(tags);
  };

  const getTodaysEntries = () => {
    return entries.filter(entry => isToday(entry.date));
  };

  const getMoodChange = (): { direction: 'up' | 'down' | 'same', change: number } => {
    const todayEntries = entries.filter(entry => isToday(entry.date));
    const yesterdayEntries = entries.filter(entry => isYesterday(entry.date));

    if (todayEntries.length === 0 || yesterdayEntries.length === 0) {
      return { direction: 'same', change: 0 };
    }

    const calculateAverageIntensity = (journalEntries: JournalEntry[]) => {
      if (journalEntries.length === 0) return 0;
      const totalIntensity = journalEntries.reduce((sum, entry) => sum + (entry.intensity || 5), 0); // Default to 5 if no intensity
      return totalIntensity / journalEntries.length;
    };

    const todayScore = calculateAverageIntensity(todayEntries);
    const yesterdayScore = calculateAverageIntensity(yesterdayEntries);
    const difference = todayScore - yesterdayScore;

    if (difference > 0.5) return { direction: 'up', change: difference };
    if (difference < -0.5) return { direction: 'down', change: Math.abs(difference) };
    return { direction: 'same', change: 0 };
  };

  const getMostFrequentEmotion = (): Emotion => {
    if (entries.length === 0) return 'neutral';
    const emotionCounts = entries.reduce((acc: Record<string, number>, entry) => {
      acc[entry.emotion] = (acc[entry.emotion] || 0) + 1;
      return acc;
    }, {});

    let maxCount = 0;
    let mostFrequent: Emotion = 'neutral';
    for (const [emotion, count] of Object.entries(emotionCounts)) {
        if (count > maxCount) {
            maxCount = count;
            mostFrequent = emotion as Emotion;
        }
    }
    return mostFrequent;
  };

  const resetFilters = () => {
    setFilterEmotion('all');
    setSearchQuery('');
    setSelectedDate(undefined);
    setSortOrder('dateDesc');
    setSelectedTags([]);
  };

  // Filter and sort entries based on user criteria
  const getFilteredEntries = () => {
    if (!entries) return [];
    
    let filtered = [...entries];
    
    // Filter by emotion
    if (filterEmotion && filterEmotion !== 'all') {
      filtered = filtered.filter(entry => entry.emotion === filterEmotion);
    }
    
    // Filter by date
    if (selectedDate) {
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.date);
        return (
          entryDate.getDate() === selectedDate.getDate() &&
          entryDate.getMonth() === selectedDate.getMonth() &&
          entryDate.getFullYear() === selectedDate.getFullYear()
        );
      });
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.title.toLowerCase().includes(query) ||
        entry.content.toLowerCase().includes(query) ||
        (entry.tags && entry.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }
    
    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(entry =>
        entry.tags && selectedTags.every(tag => entry.tags.includes(tag))
      );
    }
    
    // Sort entries
    switch (sortOrder) {
      case 'dateDesc':
        filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
        break;
      case 'dateAsc':
        filtered.sort((a, b) => a.date.getTime() - b.date.getTime());
        break;
      case 'emotion':
        filtered.sort((a, b) => a.emotion.localeCompare(b.emotion));
        break;
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
    }
    
    return filtered;
  };

  // --- Event Handlers ---

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntryId(entry.id);
    setNewEntry({ title: entry.title, content: entry.content });
    // Explicitly set selectedMood and energyLevel if they were stored with the entry
    // For now, assume they are not, or the user will re-select them.
    // If 'love' maps to 'Calm', you might need to reverse this or store mood name too.
    const moodNameForEntry = emotionToMood(entry.emotion);
    setSelectedMood(moodNameForEntry);
    if (entry.intensity) setEnergyLevel(entry.intensity);

    setIsWriting(true);
    setIsEditing(true);
    setShowDetailModal(false); // Close detail modal if editing from there
  };

  

  const confirmDelete = async () => {
    if (!entryToDelete) return;

    const entryIdToDelete = entryToDelete;
    // Optimistic update
    setEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryIdToDelete));
    setEntryToDelete(null); // Clear confirmation state
    setShowDetailModal(false); // Ensure detail modal is closed if delete happened from there

    toast({
      title: "Entry deleted",
      description: "Your journal entry has been removed.",
      variant: "default"
    });

    if (user && isOnline && !entryIdToDelete.startsWith('demo-')) {
      try {
        await journalOperations.deleteEntry(entryIdToDelete);
         console.log(`[Journal] Entry ${entryIdToDelete} deleted from database.`);
      } catch (error) {
        console.error(`[Journal] Error deleting entry ${entryIdToDelete} from database:`, error);
        setIsOnline(false); // Assume connection issue
        // Optionally, add back the entry or provide a "retry" mechanism
        toast({
          title: "Sync Error",
          description: "Entry deleted locally, but failed to remove from the cloud.",
          variant: "destructive"
        });
      }
    }
  };

  const handleSaveEntry = async () => {
    if (!newEntry.title.trim() || !newEntry.content.trim()) {
      toast({ title: "Missing Content", description: "Please provide a title and content for your entry.", variant: "destructive" });
      return;
    }
    
    setIsSaving(true);
    try {
      // Use the imported analyzeEmotionWithModel function
      let emotionResult;
      try {
        emotionResult = await analyzeEmotionWithModel(newEntry.content, hfClient);
      } catch (error) {
        console.error('Error analyzing emotion:', error);
        // Fallback if emotion analysis fails
        emotionResult = {
          emotion: selectedMood === 'Neutral' ? 'neutral' : 
                  selectedMood === 'Happy' ? 'joy' : 
                  selectedMood === 'Sad' ? 'sadness' : 
                  selectedMood === 'Angry' ? 'anger' : 
                  selectedMood === 'Anxious' ? 'fear' : 
                  selectedMood === 'Calm' ? 'love' : 
                  selectedMood === 'Excited' ? 'surprise' : 'neutral',
          intensity: energyLevel,
          confidence: 0.8
        };
         toast({
          title: "Emotion Analysis Fallback",
          description: "Using selected mood as emotion couldn't be detected automatically.",
          variant: "default"
        });
      }
      
      const entryTags = extractTags(newEntry.content);
      const currentDate = new Date();

      let finalEmotion: Emotion = emotionResult.emotion;
      let finalIntensity: number = emotionResult.intensity;
      
      // If user selected a mood explicitly (other than placeholder 'neutral'), use that.
      // This maps the friendly mood name back to the Emotion type.
      if (selectedMood && selectedMood !== 'Neutral') { // MOODS.name 'Neutral' or default
          // Map MOOD name back to Emotion type
          if (selectedMood === 'Happy') finalEmotion = 'joy';
          else if (selectedMood === 'Sad') finalEmotion = 'sadness';
          else if (selectedMood === 'Angry') finalEmotion = 'anger';
          else if (selectedMood === 'Anxious') finalEmotion = 'fear';
          else if (selectedMood === 'Calm') finalEmotion = 'love'; // As per your emotionToMood
          else if (selectedMood === 'Excited') finalEmotion = 'surprise';
          // 'Neutral' case is implicitly handled by emotionResult or if it's the only one not matching
          
          finalIntensity = energyLevel; // Use user-set energy level
      }

      if (isEditing && editingEntryId) {
        const entryToUpdate = entries.find(e => e.id === editingEntryId);
        const updatedEntryData: JournalEntry = {
          id: editingEntryId,
          title: newEntry.title,
          content: newEntry.content,
          emotion: finalEmotion,
          intensity: finalIntensity, // This is the emotion_intensity
          date: entryToUpdate?.date || currentDate, // Keep original date
          tags: entryTags,
          user_id: user?.id, // Add user_id if available
          emotion_intensity: finalIntensity, // Explicit for clarity
        };

        setEntries(prevEntries => prevEntries.map(entry => (entry.id === editingEntryId ? updatedEntryData : entry)));
        toast({ title: "Entry Updated", description: "Your changes have been saved locally." });

        if (user && isOnline && !editingEntryId.startsWith('demo-')) {
          try {
            await journalOperations.updateEntry(editingEntryId, {
              title: newEntry.title,
              content: newEntry.content,
              emotion: finalEmotion,
              emotion_intensity: finalIntensity,
              tags: entryTags
            });
             console.log(`[Journal] Entry ${editingEntryId} updated in database.`);
          } catch (error) {
            console.error(`[Journal] Error updating entry ${editingEntryId} in database:`, error);
            setIsOnline(false);
            toast({ title: "Sync Error", description: "Failed to update entry in the cloud.", variant: "destructive" });
          }
        }
      } else {
        const localId = `local-${Date.now()}`; // Temporary ID for optimistic update
        const newEntryData: JournalEntry = {
          id: localId,
          title: newEntry.title,
          content: newEntry.content,
          emotion: finalEmotion,
          intensity: finalIntensity,
          date: currentDate,
          tags: entryTags,
          user_id: user?.id,
          emotion_intensity: finalIntensity,
        };

        setEntries(prevEntries => [newEntryData, ...prevEntries]); // Add to top
        toast({ title: "Entry Saved", description: "Your entry has been saved locally." });

        if (user && isOnline) {
          try {
            const savedDbEntry = await journalOperations.saveEntry({
              user_id: user.id,
              title: newEntry.title,
              content: newEntry.content,
              emotion: finalEmotion,
              emotion_intensity: finalIntensity,
              tags: entryTags,
              // created_at is usually set by the backend
            });
            // Update local entry with database ID and created_at
            setEntries(prevEntries => prevEntries.map(entry =>
              entry.id === localId ? { ...entry, id: savedDbEntry.id, created_at: savedDbEntry.created_at, date: new Date(savedDbEntry.created_at) } : entry
            ));
             console.log('[Journal] New entry saved to database with ID:', savedDbEntry.id);
          } catch (error) {
            console.error('[Journal] Error saving entry to database:', error);
            setIsOnline(false);
            toast({ title: "Sync Error", description: "Entry saved locally, but failed to sync.", variant: "destructive" });
          }
        } else if (!user) {
            toast({ title: "Saved Locally (Demo)", description: "Log in to sync your entries to the cloud." });
        }
      }

      // Reset form
      setNewEntry({ title: '', content: '' });
      setSelectedMood('Neutral'); // Reset to default MOODS.name
      setEnergyLevel(5);
      setIsWriting(false);
      setIsEditing(false);
      setEditingEntryId(null);
      generateNewPrompt(); // Get a new prompt for next time

    } catch (error) {
      console.error('[Journal] Error processing or saving entry:', error);
      toast({ title: "Save Error", description: "An unexpected error occurred while saving.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const exportJournal = () => {
    try {
      if (entries.length === 0) {
        toast({ title: "No Entries", description: "There are no entries to export."});
        return;
      }
      const formattedEntries = entries.map(entry => ({
        ...entry,
        date: format(entry.date, 'yyyy-MM-dd HH:mm:ss'), // Ensure consistent date format
        // created_at is already a string if it exists from DB, or undefined. Date is primary.
      }));

      const journalData = JSON.stringify(formattedEntries, null, 2);
      const blob = new Blob([journalData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      if (downloadRef.current) {
        downloadRef.current.href = url;
        downloadRef.current.download = `mindmate-journal-${format(new Date(), 'yyyy-MM-dd')}.json`;
        downloadRef.current.click();
        
        setTimeout(() => { // Clean up object URL
          URL.revokeObjectURL(url);
        }, 100);
        
        toast({ 
          title: "Export Successful", 
          description: `${entries.length} journal entries prepared for download.` 
        });
      } else {
        throw new Error("Download link reference (downloadRef) not available");
      }
    } catch (error) {
      console.error("[Journal] Failed to export journal:", error);
      toast({ 
        title: "Export Failed", 
        description: "Could not export journal data. Please try again.", 
        variant: "destructive" 
      });
    }
  };

  const clearAllEntries = async () => {
    if (!user && entries.some(e => !e.id.startsWith('demo-'))) { // Check if there are non-demo entries
      toast({
        title: "Not Logged In",
        description: "You need to be logged in to clear all synced entries.",
        variant: "destructive"
      });
      // For demo mode, allow clearing demo entries
      if (entries.every(e => e.id.startsWith('demo-'))) {
          setEntries([]);
          toast({ title: "Demo Entries Cleared", description: "All demo journal entries have been removed."});
      }
      setShowClearAllDialog(false);
      return;
    }
    
    const entriesToClear = [...entries]; // Capture before clearing state
    setEntries([]); // Optimistic UI update

    toast({
      title: "Entries Cleared Locally",
      description: "All journal entries have been removed locally.",
      variant: "default"
    });
    
    if (user && isOnline) {
      try {
        // This should ideally be a single backend call: journalOperations.deleteAllEntries(user.id)
        // Simulating individual deletes if bulk delete isn't available:
        let allSucceeded = true;
        for (const entry of entriesToClear) {
          if (!entry.id.startsWith('demo-') && !entry.id.startsWith('local-')) { // Only delete synced entries
            try {
              await journalOperations.deleteEntry(entry.id);
            } catch (error) {
              console.error(`[Journal] Error deleting entry ${entry.id} from database during clear all:`, error);
              allSucceeded = false;
              // Decide if you want to stop or collect errors
            }
          }
        }
        if(allSucceeded) {
            console.log('[Journal] All synced entries cleared from database.');
        } else {
            toast({ title: "Sync Issue", description: "Some entries might not have been cleared from the cloud.", variant: "destructive" });
        }

      } catch (error) { // Catch error from a potential bulk delete operation
        console.error("[Journal] Error clearing all entries from database:", error);
        setIsOnline(false);
        toast({
          title: "Sync Error",
          description: "Entries cleared locally, but failed to clear from the cloud.",
          variant: "destructive"
        });
        // Optionally: Revert local clear or add entries back to a "pending delete" state
        // setEntries(entriesToClear);
      }
    } else if (user && !isOnline) {
        toast({
          title: "Offline Mode",
          description: "Entries cleared locally. They will be removed from the cloud when you reconnect and sync.",
          variant: "default" // Or 'warning'
        });
    }
    setShowClearAllDialog(false);
  };

  // The rest of your component's JSX would go here
  // For example:
  // if (isLoading) return <p>Loading journal...</p>;
  // if (userLoading) return <p>Loading user session...</p>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-6 space-y-6 max-w-6xl">
        {/* Header with stats */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Journal</h1>
            <p className="text-muted-foreground">Track your emotions and reflect on your experiences</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {isOnline ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
                <Cloud className="h-3 w-3" /> Synced
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                <Cloud className="h-3 w-3" /> Offline
              </Badge>
            )}
            
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
              <Flame className="h-3 w-3" /> {streaks.currentStreak} Day Streak
            </Badge>
            
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
              <Trophy className="h-3 w-3" /> {streaks.longestStreak} Day Record
            </Badge>
          </div>
        </div>

        {/* Main content */}
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex">
            <TabsTrigger value="entries">Journal Entries</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>
          
          {/* Journal Entries Tab */}
          <TabsContent value="entries" className="space-y-4">
            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row justify-between gap-3">
              <div className="flex flex-1 items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search entries..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      {selectedDate ? format(selectedDate, 'PPP') : 'Date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                    {selectedDate && (
                      <div className="p-3 border-t border-border">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedDate(undefined)}>
                          Clear
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
                
                <Select value={filterEmotion} onValueChange={setFilterEmotion}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="All emotions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All emotions</SelectItem>
                    <SelectItem value="joy">Joy</SelectItem>
                    <SelectItem value="sadness">Sadness</SelectItem>
                    <SelectItem value="anger">Anger</SelectItem>
                    <SelectItem value="fear">Fear</SelectItem>
                    <SelectItem value="love">Love</SelectItem>
                    <SelectItem value="surprise">Surprise</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                  </SelectContent>
                </Select>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-1">
                      <Filter className="h-4 w-4" />
                      Tags {selectedTags.length > 0 && `(${selectedTags.length})`}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="start">
                    <div className="space-y-2">
                      <h4 className="font-medium">Filter by tags</h4>
                      <div className="flex flex-wrap gap-1 max-h-[200px] overflow-y-auto">
                        {getAllUniqueTags().map(tag => (
                          <Badge 
                            key={tag}
                            variant={selectedTags.includes(tag) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                              if (selectedTags.includes(tag)) {
                                setSelectedTags(prev => prev.filter(t => t !== tag));
                              } else {
                                setSelectedTags(prev => [...prev, tag]);
                              }
                            }}
                          >
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                      {getAllUniqueTags().length === 0 && (
                        <p className="text-sm text-muted-foreground">No tags found in your entries</p>
                      )}
                      {selectedTags.length > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedTags([])}
                          className="mt-2 w-full"
                        >
                          Clear tags
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                
                <Select 
                  value={sortOrder} 
                  onValueChange={(value) => setSortOrder(value as SortOption)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dateDesc">Newest first</SelectItem>
                    <SelectItem value="dateAsc">Oldest first</SelectItem>
                    <SelectItem value="emotion">By emotion</SelectItem>
                    <SelectItem value="title">By title</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button onClick={resetFilters} variant="outline" className="gap-1" disabled={!searchQuery && !selectedDate && filterEmotion === 'all' && sortOrder === 'dateDesc'}>
                  <RefreshCw className="h-4 w-4" /> Reset
                </Button>
                <Button onClick={() => setIsWriting(true)} className="gap-1">
                  <PlusCircle className="h-4 w-4" /> New Entry
                </Button>
                <Button variant="outline" onClick={exportJournal} className="gap-1">
                  <Download className="h-4 w-4" /> Export
                </Button>
              </div>
            </div>
            
            {/* Journal Entries List */}
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : entries.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-12 w-12 text-muted-foreground" />
                  <h3 className="text-xl font-semibold">No journal entries yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Start tracking your emotions and experiences by creating your first journal entry.
                  </p>
                  <Button onClick={() => setIsWriting(true)} className="mt-2">
                    Create your first entry
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {getFilteredEntries().length === 0 ? (
                  <Card className="p-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="h-12 w-12 text-muted-foreground" />
                      <h3 className="text-xl font-semibold">No matching entries</h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        No entries match your current filters. Try adjusting your search or filters.
                      </p>
                      <Button onClick={resetFilters} className="mt-2">
                        Reset Filters
                      </Button>
                    </div>
                  </Card>
                ) : (
                  getFilteredEntries().map((entry) => (
                    <Card key={entry.id} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2">
                              {entry.title}
                              <span className="text-xl">{getMoodEmojiFromEmotion(entry.emotion)}</span>
                            </CardTitle>
                            <CardDescription>
                              {isToday(entry.date) ? 'Today' : 
                               isYesterday(entry.date) ? 'Yesterday' : 
                               format(entry.date, 'PPP')}
                            </CardDescription>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditEntry(entry)} aria-label="Edit entry">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => setEntryToDelete(entry.id)} aria-label="Delete entry">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Journal Entry</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this entry? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="line-clamp-3 text-sm">
                          {entry.content}
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-between pt-0">
                        <div className="flex flex-wrap gap-1">
                          {entry.tags && entry.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => viewEntryDetails(entry)} className="ml-auto">
                          View <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>
          
          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            <div className="flex justify-between">
              <h3 className="text-lg font-medium">Your Emotional Journey</h3>
              <Button 
                variant="outline" 
                className="gap-1 text-destructive" 
                onClick={() => setShowClearAllDialog(true)}
              >
                <Trash2 className="h-4 w-4" /> Clear All Entries
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Emotion Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Emotion Distribution</CardTitle>
                  <CardDescription>Your most frequent emotions</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={MOODS.map(mood => ({
                          name: mood.name,
                          value: entries.filter(e => emotionToMood(e.emotion) === mood.name).length,
                          color: mood.color
                        })).filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {MOODS.map((mood, index) => (
                          <Cell key={`cell-${index}`} fill={mood.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} entries`, 'Count']} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              {/* Emotion Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Emotion Trends</CardTitle>
                  <CardDescription>Your emotional journey over time</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={entries
                        .sort((a, b) => a.date.getTime() - b.date.getTime())
                        .slice(-10) // Last 10 entries
                        .map(entry => ({
                          date: format(entry.date, 'MMM dd'),
                          intensity: entry.intensity || 5,
                          emotion: entry.emotion
                        }))}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 10]} />
                      <Tooltip 
                        formatter={(value, name) => [value, name === 'intensity' ? 'Intensity' : 'Emotion']}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="intensity" 
                        stroke="#8884d8" 
                        fill="#8884d8" 
                        fillOpacity={0.3} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Writing Dialog */}
        <Dialog open={isWriting} onOpenChange={(open) => {
          if (!open && !isSaving) setIsWriting(false);
        }}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Journal Entry' : 'New Journal Entry'}</DialogTitle>
              <DialogDescription>
                {isEditing ? 'Update your thoughts and feelings' : 'Record your thoughts and feelings'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newEntry.title}
                  onChange={(e) => setNewEntry({...newEntry, title: e.target.value})}
                  placeholder="Give your entry a title"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="content">Content</Label>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={handleRecordToggle}
                      className={isRecording ? 'text-destructive' : ''}
                    >
                      {isRecording ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={handlePlayToggle}
                      disabled={!newEntry.content}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Textarea
                  id="content"
                  value={newEntry.content}
                  onChange={(e) => setNewEntry({...newEntry, content: e.target.value})}
                  placeholder="What's on your mind?"
                  className="min-h-[200px]"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mood</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {MOODS.map((mood) => (
                      <Button
                        key={mood.name}
                        type="button"
                        variant={selectedMood === mood.name ? 'default' : 'outline'}
                        className="h-auto py-2 px-3 flex flex-col items-center gap-1"
                        onClick={() => setSelectedMood(mood.name)}
                      >
                        <span className="text-xl">{mood.emoji}</span>
                        <span className="text-xs">{mood.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Energy Level ({energyLevel})</Label>
                  <div className="pt-2">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={energyLevel}
                      onChange={(e) => setEnergyLevel(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Low</span>
                      <span>Medium</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsWriting(false)} disabled={isSaving}>Cancel</Button>
              <Button onClick={handleSaveEntry} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>{isEditing ? 'Update' : 'Save'}</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Entry Detail Modal */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          {selectedEntry && (
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <DialogTitle>{selectedEntry.title}</DialogTitle>
                  <span className="text-2xl">{getMoodEmojiFromEmotion(selectedEntry.emotion)}</span>
                </div>
                <DialogDescription>
                  {format(selectedEntry.date, 'PPP')} · {emotionToMood(selectedEntry.emotion)} · 
                  Intensity: {selectedEntry.intensity || 5}/10
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <ScrollArea className="h-[300px] pr-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{selectedEntry.content}</ReactMarkdown>
                  </div>
                </ScrollArea>
                
                {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedEntry.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">#{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <div className="flex gap-2 w-full justify-between">
                  <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                    Close
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => selectedEntry && handleEditEntry(selectedEntry)}>
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="text-destructive" onClick={() => selectedEntry && setEntryToDelete(selectedEntry.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Journal Entry</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this entry? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog>
        
        {/* Clear All Dialog */}
        <AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear All Journal Entries</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete all your journal entries? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={clearAllEntries} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Saved Prompts Dialog */}
        <Dialog open={showSavedPrompts} onOpenChange={setShowSavedPrompts}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Saved Writing Prompts</DialogTitle>
              <DialogDescription>
                Select a prompt to use for your journal entry
              </DialogDescription>
            </DialogHeader>
            
            {savedPrompts.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">No saved prompts yet</p>
                <p className="text-sm text-muted-foreground mt-1">Save prompts you like for future use</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {savedPrompts.map((prompt, index) => (
                    <Card key={index} className="p-3">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm">{prompt}</p>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => useSavedPrompt(prompt)}>
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setSavedPrompts(prev => prev.filter((_, i) => i !== index))}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
        
        {/* Writing Prompt Card */}
        {!isWriting && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Writing Prompt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium mb-4">{currentPrompt}</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={usePromptForJournal}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Use This Prompt
                </Button>
                <Button variant="outline" onClick={generateNewPrompt}>
                  <RefreshCw className="mr-2 h-4 w-4" /> New Prompt
                </Button>
                <Button variant="outline" onClick={saveCurrentPrompt}>
                  <Bookmark className="mr-2 h-4 w-4" /> Save Prompt
                </Button>
                {savedPrompts.length > 0 && (
                  <Button variant="outline" onClick={() => setShowSavedPrompts(true)}>
                    <AlignLeft className="mr-2 h-4 w-4" /> Saved Prompts
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Hidden download link */}
      <a ref={downloadRef} style={{ display: 'none' }}>Download</a>
    </div>
  );
};

export default Journal;