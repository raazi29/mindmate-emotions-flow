import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, RefreshCw, Sun, Heart, LucideIcon, BookOpen, Quote, Sparkles, AlertCircle, Crown } from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';

// Configure axios defaults
axios.defaults.headers.common['Access-Control-Allow-Origin'] = '*';
axios.defaults.headers.common['Content-Type'] = 'application/json';

type Emotion = 'joy' | 'sadness' | 'anger' | 'fear' | 'love' | 'surprise' | 'neutral';

// Fallback responses if API fails
const fallbackResponses: Record<string, Record<Emotion, string[]>> = {
  jokes: {
    joy: [
      "Why don't scientists trust atoms? Because they make up everything!",
      "I told my wife she was drawing her eyebrows too high. She looked surprised!"
    ],
    sadness: [
      "Why did the bicycle fall over? It was two tired!",
      "What's the best thing about Switzerland? I don't know, but the flag is a big plus."
    ],
    anger: [
      "Feeling angry? Remember that people who are good at math are counters productive.",
      "Why don't scientists trust atoms? Because they make up everything, just like that person who annoyed you!"
    ],
    fear: [
      "Do you know what's really scary? The fact that 'incorrectly' is spelled incorrectly in every dictionary.",
      "If you're afraid of elevators, you need to take steps to avoid them."
    ],
    love: [
      "What did one volcano say to the other? I lava you!",
      "I'm not saying I love you, but I wouldn't mind being quarantined with you."
    ],
    surprise: [
      "Life is full of surprises. Like finding out that 'expecting the unexpected' makes the unexpected expected.",
      "Surprise! Did you know that the original name for Monopoly was 'Surprise! I Own Everything Now And You're Bankrupt'?"
    ],
    neutral: [
      "Did you hear about the mathematician who's afraid of negative numbers? He'll stop at nothing to avoid them!",
      "What do you call a parade of rabbits hopping backwards? A receding hare-line."
    ]
  },
  encouragement: {
    joy: [
      "Your happiness is contagious! Keep spreading that positive energy.",
      "Great to see you in high spirits! Happiness looks good on you."
    ],
    sadness: [
      "It's okay to feel down sometimes. Remember that this feeling is temporary.",
      "Take it one moment at a time. You've got this."
    ],
    anger: [
      "Take a deep breath. Your feelings are valid, but you are in control.",
      "It's okay to step back and give yourself some space to cool down."
    ],
    fear: [
      "You're braver than you think. Take one small step at a time.",
      "Fear is just your brain trying to protect you. Thank it, then decide what you need."
    ],
    love: [
      "Connection is what gives meaning to life. Cherish those special bonds.",
      "Love is a beautiful emotion to experience. Embrace it fully."
    ],
    surprise: [
      "Life's unexpected moments keep things interesting!",
      "Embrace the unexpected - that's where growth happens."
    ],
    neutral: [
      "Balance is a good place to be. Take this moment to center yourself.",
      "A neutral state is perfect for mindfulness and clarity."
    ]
  },
  quotes: {
    joy: [
      "Happiness is not something ready-made. It comes from your own actions. - Dalai Lama",
      "The most wasted of all days is one without laughter. - E.E. Cummings"
    ],
    sadness: [
      "Even the darkest night will end and the sun will rise. - Victor Hugo",
      "In the middle of winter I at last discovered that there was in me an invincible summer. - Albert Camus"
    ],
    anger: [
      "Speak when you are angry and you will make the best speech you will ever regret. - Ambrose Bierce",
      "For every minute you are angry you lose sixty seconds of happiness. - Ralph Waldo Emerson"
    ],
    fear: [
      "Fear is only as deep as the mind allows. - Japanese Proverb",
      "Everything you want is on the other side of fear. - Jack Canfield"
    ],
    love: [
      "The best and most beautiful things in this world cannot be seen or even heard, but must be felt with the heart. - Helen Keller",
      "Where there is love there is life. - Mahatma Gandhi"
    ],
    surprise: [
      "Life is full of surprises and serendipity. Being open to unexpected turns in the road is an important part of success. - Henry Ford",
      "The moments of happiness we enjoy take us by surprise. Not that we seize them, but that they seize us. - Ashley Montagu"
    ],
    neutral: [
      "The middle path is the way to wisdom. - Rumi",
      "Life is a balance of holding on and letting go. - Rumi"
    ]
  }
};

interface EmotionResponseProps {
  emotion: Emotion;
  intensity?: number;
  isPremium?: boolean;
}

const EmotionResponse: React.FC<EmotionResponseProps> = ({ 
  emotion, 
  intensity = 5,
  isPremium = false
}) => {
  const [message, setMessage] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [animating, setAnimating] = useState<boolean>(false);
  const [messageType, setMessageType] = useState<'joke' | 'encouragement' | 'quote'>('encouragement');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isForceRefreshing, setIsForceRefreshing] = useState<boolean>(false);
  const [errorState, setErrorState] = useState<string | null>(null);
  const lastFetchTimeRef = useRef<Record<string, number>>({});
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Function to fetch a message from the API
  const fetchMessage = async (type: 'joke' | 'encouragement' | 'quote', forceRefresh = false) => {
    setIsLoading(true);
    setErrorState(null);
    try {
      // Map message type to API endpoint
      const apiType = type === 'joke' ? 'jokes' : type === 'quote' ? 'quotes' : 'encouragement';
      
      // Create cache key
      const cacheKey = `${apiType}:${emotion}`;
      const now = Date.now();
      
      // If forcing refresh, call the refresh API endpoint first
      if (forceRefresh) {
        setIsForceRefreshing(true);
        try {
          await axios.post('http://127.0.0.1:8000/refresh-cache', {
            type: apiType,
            emotion: emotion
          }, { timeout: 8000 });
          
          // Update last fetch time
          lastFetchTimeRef.current[cacheKey] = now;
          
          toast({
            title: 'Content Refreshed',
            description: `New ${type} content has been fetched!`,
            variant: 'default'
          });
        } catch (refreshError) {
          console.error(`Error refreshing ${type} content:`, refreshError);
          // Don't show the error state, just silently try the regular fetch
        } finally {
          setIsForceRefreshing(false);
        }
      }
      
      // Make API request with a timeout
      const response = await axios.get(`http://127.0.0.1:8000/message/${apiType}/${emotion}`, {
        timeout: 5000
      });
      
      if (response.data && response.data.message) {
        // Update last fetch time
        lastFetchTimeRef.current[cacheKey] = now;
        return response.data.message;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      
      // Use fallback if API fails - but don't show error message
      const fallbackType = type === 'joke' ? 'jokes' : type === 'quote' ? 'quotes' : 'encouragement';
      const fallbacks = fallbackResponses[fallbackType][emotion];
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    } finally {
      setIsLoading(false);
    }
  };

  // Track if an emotion was changed since last message fetch
  const [lastEmotionRef, setLastEmotionRef] = useState<Emotion>(emotion);
  
  // Update message when emotion or message type changes
  useEffect(() => {
    const emotionChanged = lastEmotionRef !== emotion;
    setLastEmotionRef(emotion);
    
    // Reset message while loading
    setMessage('');
    setAnimating(true);
    
    const getMessageForEmotion = async () => {
      // Determine initial message type based on emotion
      let initialType = messageType;
      
      // If emotion changed, select appropriate message type
      if (emotionChanged) {
        if (emotion === 'sadness' || emotion === 'fear') {
          initialType = 'encouragement';
        } else if (emotion === 'joy' || emotion === 'surprise') {
          initialType = 'joke';
        }
        
        if (initialType !== messageType) {
          setMessageType(initialType);
        }
      }
      
      // Fetch the message
      const newMessage = await fetchMessage(initialType, false);
      setMessage(newMessage);
      setAnimating(false);
    };
    
    getMessageForEmotion();
  }, [emotion]);

  // Cycle through message types
  const toggleMessageType = async () => {
    let newType: 'joke' | 'encouragement' | 'quote';
    
    if (messageType === 'joke') {
      newType = 'encouragement';
    } else if (messageType === 'encouragement') {
      newType = 'quote';
    } else {
      newType = 'joke';
    }
    
    setMessageType(newType);
    setAnimating(true);
    
    try {
      const newMessage = await fetchMessage(newType, false);
      setMessage(newMessage);
    } catch (error) {
      toast({
        title: "Failed to load message",
        description: "Using a fallback message instead",
        variant: "destructive"
      });
    } finally {
      setAnimating(false);
    }
  };

  // Get a new message of the current type
  const refreshMessage = async (forceRefresh: boolean = false) => {
    setAnimating(true);
    setErrorState(null);
    
    try {
      const newMessage = await fetchMessage(messageType, forceRefresh);
      setMessage(newMessage);
      
      if (!forceRefresh) {
        toast({
          title: `New ${messageType === 'joke' ? 'joke' : messageType === 'quote' ? 'quote' : 'message'} loaded`,
          description: "Content updated from cache",
          variant: "default"
        });
      }
      
      // Focus on the new content for screen readers
      if (contentRef.current) {
        contentRef.current.focus();
      }
    } catch (error) {
      toast({
        title: "Failed to refresh message",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setAnimating(false);
    }
  };

  // Function to request a totally fresh message by calling APIs directly
  const forceRefreshMessage = () => {
    refreshMessage(true);
  };

  // Stop speaking if component unmounts or changes
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window && isSpeaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSpeaking]);

  // Speak the message using browser's text-to-speech
  const speakMessage = () => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(message);
      
      // Set voice properties based on emotion
      if (emotion === 'joy' || emotion === 'love') {
        utterance.pitch = 1.2;
        utterance.rate = 1.1;
      } else if (emotion === 'sadness') {
        utterance.pitch = 0.8;
        utterance.rate = 0.9;
      } else if (emotion === 'anger') {
        utterance.pitch = 1.3;
        utterance.rate = 1.2;
      }
      
      // Get available voices
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        // Try to find a female English voice
        const englishVoice = voices.find(voice => 
          voice.lang.includes('en') && voice.name.includes('Female')
        );
        if (englishVoice) utterance.voice = englishVoice;
      }
      
      // Set speaking state
      setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => {
        setIsSpeaking(false);
        toast({
          title: "Speech failed",
          description: "Could not speak the message",
          variant: "destructive"
        });
      }
      
      // Speak
      window.speechSynthesis.speak(utterance);
    } else {
      toast({
        title: "Speech not supported",
        description: "Your browser doesn't support text-to-speech",
        variant: "destructive"
      });
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Escape key cancels speech
    if (e.key === 'Escape' && isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      e.preventDefault();
    }
  };

  // Get message container color based on emotion and premium status
  const getMessageContainerColor = () => {
    if (isPremium) {
      // Premium dark mode colors with enhanced gradients and effects
      if (emotion === 'joy') return 'bg-gradient-to-br from-amber-800/80 to-amber-700/60 text-amber-50 border-amber-600/50 shadow-lg shadow-amber-900/20';
      if (emotion === 'sadness') return 'bg-gradient-to-br from-blue-800/80 to-blue-700/60 text-blue-50 border-blue-600/50 shadow-lg shadow-blue-900/20';
      if (emotion === 'anger') return 'bg-gradient-to-br from-red-800/80 to-red-700/60 text-red-50 border-red-600/50 shadow-lg shadow-red-900/20';
      if (emotion === 'fear') return 'bg-gradient-to-br from-purple-800/80 to-purple-700/60 text-purple-50 border-purple-600/50 shadow-lg shadow-purple-900/20';
      if (emotion === 'love') return 'bg-gradient-to-br from-pink-800/80 to-pink-700/60 text-pink-50 border-pink-600/50 shadow-lg shadow-pink-900/20';
      if (emotion === 'surprise') return 'bg-gradient-to-br from-cyan-800/80 to-cyan-700/60 text-cyan-50 border-cyan-600/50 shadow-lg shadow-cyan-900/20';
      return 'bg-gradient-to-br from-slate-800/80 to-slate-700/60 text-slate-50 border-slate-600/50 shadow-lg shadow-slate-900/20';
    } else {
      // Regular colors
      if (messageType === 'joke') {
        if (emotion === 'joy') return 'bg-amber-50 dark:bg-amber-800/60 text-amber-900 dark:text-amber-50 border-amber-200 dark:border-amber-700/50';
        if (emotion === 'sadness') return 'bg-blue-50 dark:bg-blue-800/60 text-blue-900 dark:text-blue-50 border-blue-200 dark:border-blue-700/50';
        if (emotion === 'anger') return 'bg-red-50 dark:bg-red-800/60 text-red-900 dark:text-red-50 border-red-200 dark:border-red-700/50';
        if (emotion === 'fear') return 'bg-purple-50 dark:bg-purple-800/60 text-purple-900 dark:text-purple-50 border-purple-200 dark:border-purple-700/50';
        if (emotion === 'love') return 'bg-pink-50 dark:bg-pink-800/60 text-pink-900 dark:text-pink-50 border-pink-200 dark:border-pink-700/50';
        if (emotion === 'surprise') return 'bg-cyan-50 dark:bg-cyan-800/60 text-cyan-900 dark:text-cyan-50 border-cyan-200 dark:border-cyan-700/50';
        return 'bg-gray-50 dark:bg-gray-800/60 text-gray-900 dark:text-gray-50 border-gray-200 dark:border-gray-700/50';
      } else {
        if (emotion === 'joy') return 'bg-amber-50 dark:bg-amber-800/60 text-amber-900 dark:text-amber-50 border-amber-200 dark:border-amber-700/50';
        if (emotion === 'sadness') return 'bg-blue-50 dark:bg-blue-800/60 text-blue-900 dark:text-blue-50 border-blue-200 dark:border-blue-700/50';
        if (emotion === 'anger') return 'bg-red-50 dark:bg-red-800/60 text-red-900 dark:text-red-50 border-red-200 dark:border-red-700/50';
        if (emotion === 'fear') return 'bg-purple-50 dark:bg-purple-800/60 text-purple-900 dark:text-purple-50 border-purple-200 dark:border-purple-700/50';
        if (emotion === 'love') return 'bg-pink-50 dark:bg-pink-800/60 text-pink-900 dark:text-pink-50 border-pink-200 dark:border-pink-700/50';
        if (emotion === 'surprise') return 'bg-cyan-50 dark:bg-cyan-800/60 text-cyan-900 dark:text-cyan-50 border-cyan-200 dark:border-cyan-700/50';
        return 'bg-gray-50 dark:bg-gray-800/60 text-gray-900 dark:text-gray-50 border-gray-200 dark:border-gray-700/50';
      }
    }
  };

  // Get card header text color
  const getHeaderTextColor = () => {
    if (isPremium) {
      if (emotion === 'joy') return 'text-amber-200';
      if (emotion === 'sadness') return 'text-blue-200';
      if (emotion === 'anger') return 'text-red-200';
      if (emotion === 'fear') return 'text-purple-200';
      if (emotion === 'love') return 'text-pink-200';
      if (emotion === 'surprise') return 'text-cyan-200';
      return 'text-slate-200';
    } else {
      if (emotion === 'joy') return 'text-amber-900 dark:text-amber-100';
      if (emotion === 'sadness') return 'text-blue-900 dark:text-blue-100';
      if (emotion === 'anger') return 'text-red-900 dark:text-red-100';
      if (emotion === 'fear') return 'text-purple-900 dark:text-purple-100';
      if (emotion === 'love') return 'text-pink-900 dark:text-pink-100';
      if (emotion === 'surprise') return 'text-cyan-900 dark:text-cyan-100';
      return 'text-gray-900 dark:text-gray-100';
    }
  };

  // Get button text color
  const getButtonStyle = () => {
    if (isPremium) {
      if (emotion === 'joy') return 'bg-amber-700/60 hover:bg-amber-600/70 text-amber-100 border border-amber-500/50';
      if (emotion === 'sadness') return 'bg-blue-700/60 hover:bg-blue-600/70 text-blue-100 border border-blue-500/50';
      if (emotion === 'anger') return 'bg-red-700/60 hover:bg-red-600/70 text-red-100 border border-red-500/50';
      if (emotion === 'fear') return 'bg-purple-700/60 hover:bg-purple-600/70 text-purple-100 border border-purple-500/50';
      if (emotion === 'love') return 'bg-pink-700/60 hover:bg-pink-600/70 text-pink-100 border border-pink-500/50';
      if (emotion === 'surprise') return 'bg-cyan-700/60 hover:bg-cyan-600/70 text-cyan-100 border border-cyan-500/50';
      return 'bg-slate-700/60 hover:bg-slate-600/70 text-slate-100 border border-slate-500/50';
    } else {
      if (emotion === 'joy') return 'bg-amber-200/40 hover:bg-amber-300/40 text-amber-900 dark:bg-amber-800/40 dark:hover:bg-amber-700/40 dark:text-amber-100';
      if (emotion === 'sadness') return 'bg-blue-200/40 hover:bg-blue-300/40 text-blue-900 dark:bg-blue-800/40 dark:hover:bg-blue-700/40 dark:text-blue-100';
      if (emotion === 'anger') return 'bg-red-200/40 hover:bg-red-300/40 text-red-900 dark:bg-red-800/40 dark:hover:bg-red-700/40 dark:text-red-100';
      if (emotion === 'fear') return 'bg-purple-200/40 hover:bg-purple-300/40 text-purple-900 dark:bg-purple-800/40 dark:hover:bg-purple-700/40 dark:text-purple-100';
      if (emotion === 'love') return 'bg-pink-200/40 hover:bg-pink-300/40 text-pink-900 dark:bg-pink-800/40 dark:hover:bg-pink-700/40 dark:text-pink-100';
      if (emotion === 'surprise') return 'bg-cyan-200/40 hover:bg-cyan-300/40 text-cyan-900 dark:bg-cyan-800/40 dark:hover:bg-cyan-700/40 dark:text-cyan-100';
      return 'bg-gray-200/40 hover:bg-gray-300/40 text-gray-900 dark:bg-gray-800/40 dark:hover:bg-gray-700/40 dark:text-gray-100';
    }
  };

  // Get background gradient based on emotion
  const getBackgroundColor = () => {
    if (isPremium) {
      if (emotion === 'joy') return 'bg-gradient-to-br from-black to-amber-950/90 border border-amber-700/30';
      if (emotion === 'sadness') return 'bg-gradient-to-br from-black to-blue-950/90 border border-blue-700/30';
      if (emotion === 'anger') return 'bg-gradient-to-br from-black to-red-950/90 border border-red-700/30';
      if (emotion === 'fear') return 'bg-gradient-to-br from-black to-purple-950/90 border border-purple-700/30';
      if (emotion === 'love') return 'bg-gradient-to-br from-black to-pink-950/90 border border-pink-700/30';
      if (emotion === 'surprise') return 'bg-gradient-to-br from-black to-cyan-950/90 border border-cyan-700/30';
      return 'bg-gradient-to-br from-black to-slate-950/90 border border-slate-700/30';
    } else {
      if (emotion === 'joy') return 'bg-gradient-to-br from-amber-50 to-amber-100/80 dark:from-amber-900/30 dark:to-amber-800/20';
      if (emotion === 'sadness') return 'bg-gradient-to-br from-blue-50 to-blue-100/80 dark:from-blue-900/30 dark:to-blue-800/20';
      if (emotion === 'anger') return 'bg-gradient-to-br from-red-50 to-red-100/80 dark:from-red-900/30 dark:to-red-800/20';
      if (emotion === 'fear') return 'bg-gradient-to-br from-purple-50 to-purple-100/80 dark:from-purple-900/30 dark:to-purple-800/20';
      if (emotion === 'love') return 'bg-gradient-to-br from-pink-50 to-pink-100/80 dark:from-pink-900/30 dark:to-pink-800/20';
      if (emotion === 'surprise') return 'bg-gradient-to-br from-cyan-50 to-cyan-100/80 dark:from-cyan-900/30 dark:to-cyan-800/20';
      return 'bg-gradient-to-br from-gray-50 to-gray-100/80 dark:from-gray-900/30 dark:to-gray-800/20';
    }
  };

  // Get icon based on message type with appropriate color
  const getIcon = () => {
    const iconClass = `h-5 w-5 ${
      isPremium ? (
        emotion === 'joy' ? 'text-amber-300' :
        emotion === 'sadness' ? 'text-blue-300' :
        emotion === 'anger' ? 'text-red-300' :
        emotion === 'fear' ? 'text-purple-300' :
        emotion === 'love' ? 'text-pink-300' :
        emotion === 'surprise' ? 'text-cyan-300' :
        'text-slate-300'
      ) : (
        emotion === 'joy' ? 'text-amber-600 dark:text-amber-300' :
        emotion === 'sadness' ? 'text-blue-600 dark:text-blue-300' :
        emotion === 'anger' ? 'text-red-600 dark:text-red-300' :
        emotion === 'fear' ? 'text-purple-600 dark:text-purple-300' :
        emotion === 'love' ? 'text-pink-600 dark:text-pink-300' :
        emotion === 'surprise' ? 'text-cyan-600 dark:text-cyan-300' :
        'text-gray-600 dark:text-gray-300'
      )
    }`;

    switch(messageType) {
      case 'joke':
        return <Sun className={iconClass} aria-hidden="true" />;
      case 'quote':
        return <Quote className={iconClass} aria-hidden="true" />;
      case 'encouragement':
      default:
        return <Heart className={iconClass} aria-hidden="true" />;
    }
  };

  return (
    <Card 
      className={`w-full h-full overflow-hidden ${isPremium ? 'border-none shadow-xl' : 'border-none'} transition-all duration-300 ${getBackgroundColor()}`} 
      role="region" 
      aria-label={`${messageType} for ${emotion} emotion`}
      onKeyDown={handleKeyDown}
    >
      <CardHeader className="pb-2">
        <CardTitle className={`flex items-center gap-2 ${getHeaderTextColor()}`}>
          {getIcon()}
          <span>
            {messageType === 'joke' ? 'Mood Booster' : 
             messageType === 'quote' ? 'Motivational Quote' : 
             'Encouragement'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`min-h-[150px] flex flex-col items-center justify-between`}>
          <div 
            ref={contentRef}
            className={`text-center p-4 mb-4 rounded-lg ${isPremium ? 'backdrop-blur-sm' : 'shadow-md'} ${getMessageContainerColor()} 
                        transition-opacity duration-300 ${animating ? 'opacity-0' : 'opacity-100'}`}
            aria-live="polite"
            aria-atomic="true"
            tabIndex={0}
            role="article"
          >
            {isLoading || isForceRefreshing ? (
              <div className="flex flex-col items-center justify-center">
                <p className="font-medium text-lg mb-2" aria-busy="true">
                  {isForceRefreshing ? 'Fetching fresh content from APIs...' : 'Loading...'}
                </p>
                {isForceRefreshing && (
                  <div 
                    className={`w-8 h-8 border-t-2 border-b-2 border-current rounded-full animate-spin ${isPremium ? 'drop-shadow-glow' : ''}`}
                    role="status"
                    aria-label="Loading new content"
                  ></div>
                )}
              </div>
            ) : message ? (
              <p className={`font-medium text-lg ${isPremium ? 'drop-shadow-md' : ''}`}>{message}</p>
            ) : (
              <p className="font-medium text-lg">No message available</p>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2 justify-center w-full mt-auto" role="toolbar" aria-label="Content controls">
            <Button 
              variant={isPremium ? "outline" : "outline"}
              size="sm" 
              className={getButtonStyle()}
              onClick={toggleMessageType}
              disabled={isLoading || isForceRefreshing}
              aria-label={`Change to ${messageType === 'joke' ? 'encouragement' : messageType === 'encouragement' ? 'quote' : 'joke'}`}
            >
              Change Type
            </Button>
            
            <Button 
              variant={isPremium ? "outline" : "outline"}
              size="sm" 
              className={getButtonStyle()}
              onClick={() => refreshMessage(false)}
              disabled={isLoading || isForceRefreshing}
              aria-label={`Get new ${messageType}`}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              New {messageType === 'joke' ? 'Joke' : 
                    messageType === 'quote' ? 'Quote' : 
                    'Message'}
            </Button>
            
            <Button 
              variant={isPremium ? "outline" : "outline"}
              size="sm" 
              className={getButtonStyle()}
              onClick={forceRefreshMessage}
              disabled={isLoading || isForceRefreshing}
              aria-label={`Fetch fresh ${messageType} from APIs`}
            >
              <Sparkles className={`h-4 w-4 mr-1 ${isPremium ? 'text-yellow-300' : ''}`} aria-hidden="true" />
              Fresh Content
            </Button>
            
            <Button 
              variant={isPremium ? "outline" : "outline"}
              size="sm" 
              className={getButtonStyle()}
              onClick={speakMessage}
              disabled={isSpeaking || isLoading || isForceRefreshing || !message}
              aria-label={isSpeaking ? 'Currently speaking' : 'Speak message out loud'}
              aria-pressed={isSpeaking}
            >
              <Volume2 className="h-4 w-4 mr-1" aria-hidden="true" />
              {isSpeaking ? 'Speaking...' : 'Speak'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmotionResponse; 