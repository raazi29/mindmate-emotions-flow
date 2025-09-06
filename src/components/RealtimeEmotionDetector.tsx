import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Mic, StopCircle, CircleOff, Loader2, Info, AlertTriangle, Clock, BarChart2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import emotionService from '@/utils/emotionService';
import { openRouterService } from '@/services/OpenRouterService';

interface RealtimeEmotionDetectorProps {
  onEmotionDetected?: (emotion: string, intensity: number) => void;
  useHuggingFace?: boolean;
  useOpenRouter?: boolean;
}

// Define the structure of an emotion history item
interface EmotionHistoryItem {
  emotion: string;
  confidence: number;
  timestamp: Date;
}

const RealtimeEmotionDetector: React.FC<RealtimeEmotionDetectorProps> = ({ 
  onEmotionDetected,
  useHuggingFace = false,
  useOpenRouter = false
}) => {
  const [text, setText] = useState('');
  const [emotion, setEmotion] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRealtime, setIsRealtime] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inputMethod, setInputMethod] = useState<'text' | 'voice'>('text');
  const [error, setError] = useState<string | null>(null);
  const [emotionHistory, setEmotionHistory] = useState<EmotionHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  // Check if backend is available on component mount
  useEffect(() => {
    const checkBackend = async () => {
      const status = await emotionService.checkBackendStatus();
      setBackendAvailable(!!status);
    };
    
    checkBackend();
  }, []);

  // Debounce function for real-time analysis
  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return function(...args: any[]) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  // Speech recognition setup
  const setupSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Speech Recognition Not Available",
        description: "Your browser doesn't support speech recognition. Try using Chrome.",
        variant: "destructive",
      });
      return null;
    }
    
    // @ts-ignore - TypeScript doesn't know about webkitSpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    return recognition;
  };

  // Load emotion history from localStorage on component mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('realtimeEmotionHistory');
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        // Convert string timestamps back to Date objects
        const historyWithDates = parsedHistory.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        setEmotionHistory(historyWithDates);
      }
    } catch (e) {
      console.error('Error loading emotion history from localStorage:', e);
    }
  }, []);

  // Analyze emotion using our service
  const analyzeEmotion = useCallback(async (inputText: string) => {
    if (!inputText.trim()) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      let emotionResult;
      
      // Use OpenRouter via backend service if enabled
      if (useOpenRouter) {
        console.log("Using OpenRouter via backend service for emotion detection");
        try {
          const result = await openRouterService.detectEmotion(inputText);
          emotionResult = {
            emotion: result.emotion,
            confidence: result.confidence,
            intensity: Math.round(result.confidence * 10)
          };
          console.log("OpenRouter backend service result:", emotionResult);
        } catch (error) {
          console.error("OpenRouter service error, falling back to HuggingFace:", error);
          emotionResult = await emotionService.detectEmotion(inputText);
        }
      } 
      // Use HuggingFace if enabled
      else if (useHuggingFace) {
        console.log("Using HuggingFace for emotion detection");
        emotionResult = await emotionService.detectEmotion(inputText);
        console.log("HuggingFace emotion detection result:", emotionResult);
      } 
      // Use the backend API as final fallback
      else {
        console.log("Using backend API for emotion detection");
        try {
          const response = await fetch('http://localhost:8000/detect-emotion', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: inputText }),
          });
          
          if (response.ok) {
            emotionResult = await response.json();
            console.log("Backend API emotion detection result:", emotionResult);
          } else {
            throw new Error('Backend API failed');
          }
        } catch (apiError) {
          console.error("Error using backend API:", apiError);
          // Fall back to local detection if API fails
          emotionResult = await emotionService.detectEmotion(inputText);
          console.log("Local emotion detection result:", emotionResult);
        }
      }
      
      if (emotionResult && emotionResult.emotion) {
        setEmotion(emotionResult.emotion);
        setConfidence(Math.round(emotionResult.confidence * 100));
        
        // Add to emotion history
        const historyItem: EmotionHistoryItem = {
          emotion: emotionResult.emotion,
          confidence: emotionResult.confidence,
          timestamp: new Date()
        };
        
        setEmotionHistory(prev => {
          const newHistory = [historyItem, ...prev].slice(0, 5);
          // Save to localStorage for persistence
          try {
            localStorage.setItem('realtimeEmotionHistory', JSON.stringify(newHistory));
          } catch (e) {
            console.error('Error saving emotion history to localStorage:', e);
          }
          return newHistory;
        });
        
        if (onEmotionDetected) {
          onEmotionDetected(emotionResult.emotion, emotionResult.intensity || Math.round(emotionResult.confidence * 10));
        }
        
        // Show feedback only on manual analysis or first real-time detection
        if (!isRealtime) {
          toast({
            title: `Detected Emotion: ${emotionResult.emotion}`,
            description: `We've analyzed your input with ${Math.round(emotionResult.confidence * 100)}% confidence.`,
            variant: "default",
          });
        }
      } else {
        setError("Could not detect emotion. Please try again with different wording.");
        toast({
          title: 'Emotion Analysis Failed',
          description: 'There was an error with the emotion analysis. Please try again later.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error analyzing emotion:', error);
      
      setError('An error occurred while analyzing. Please try again.');
      toast({
        title: 'Emotion Analysis Failed',
        description: 'There was an error with the emotion analysis. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [onEmotionDetected, isRealtime, toast, useOpenRouter, useHuggingFace]);

  // Debounced version for real-time analysis
  const debouncedAnalyzeEmotion = useCallback(
    debounce((text: string) => analyzeEmotion(text), 1000),
    [analyzeEmotion]
  );

  // Effect to handle real-time analysis
  useEffect(() => {
    if (isRealtime && text.trim().length > 10) {
      debouncedAnalyzeEmotion(text);
    }
  }, [text, isRealtime, debouncedAnalyzeEmotion]);

  // Toggle voice input
  const toggleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Start voice input
  const startListening = () => {
    const recognition = setupSpeechRecognition();
    if (!recognition) return;
    
    try {
      recognition.start();
      setIsListening(true);
      recognitionRef.current = recognition;
      
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }
        setText(transcript.trim());
        
        // Analyze after short pause in speaking
        if (transcript.trim().length > 10) {
          debouncedAnalyzeEmotion(transcript.trim());
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        setIsListening(false);
        setError('Voice recognition error. Please try again.');
        toast({
          title: 'Voice Input Error',
          description: 'There was a problem with voice recognition.',
          variant: 'destructive',
        });
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setIsListening(false);
      setError('Failed to start voice recognition. Please try again.');
    }
  };
  
  // Stop voice input
  const stopListening = () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
        setIsListening(false);
      }
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
      setError('Error stopping voice recognition.');
    }
  };

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('Error stopping speech recognition on unmount:', error);
        }
      }
    };
  }, [isListening]);

  // Get emotion emoji
  const getEmotionEmoji = (emotion: string): string => {
    const emojis: Record<string, string> = {
      joy: '😊',
      sadness: '😢',
      anger: '😠',
      fear: '😨',
      love: '❤️',
      surprise: '😲',
      neutral: '😐'
    };
    return emojis[emotion as keyof typeof emojis] || '😐';
  };

  // Get emotion color class
  const getEmotionColorClass = (emotion: string | null): string => {
    if (!emotion) return '';
    
    const colorMap: Record<string, string> = {
      joy: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
      sadness: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
      anger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
      fear: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
      love: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-100',
      surprise: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-100',
      neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
    };
    
    return colorMap[emotion] || 'bg-gray-100 dark:bg-gray-800';
  };
  
  // Get confidence color for progress bar
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 80) return 'var(--green-600)';
    if (confidence >= 60) return 'var(--cyan-600)';
    if (confidence >= 40) return 'var(--amber-600)';
    return 'var(--red-600)';
  };

  // Format relative timestamp
  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.round(diffMs / 1000);
    const diffMins = Math.round(diffSecs / 60);
    
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get color for emotion dot in history
  const getEmotionDotColor = (emotion: string): string => {
    const dotColorMap: Record<string, string> = {
      joy: 'bg-amber-500',
      sadness: 'bg-blue-500',
      anger: 'bg-red-500',
      fear: 'bg-purple-500',
      love: 'bg-pink-500',
      surprise: 'bg-cyan-500',
      neutral: 'bg-gray-500'
    };
    
    return dotColorMap[emotion] || 'bg-gray-500';
  };

  return (
    <Card className="w-full border shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center">
          <span>Emotion Detector</span>
          <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
              onClick={() => setShowHistory(!showHistory)}
            >
              <BarChart2 className="h-4 w-4" />
            </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {showHistory ? 'Hide' : 'Show'} emotion history
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="realtime-mode"
                      checked={isRealtime}
                      onCheckedChange={setIsRealtime}
                    />
                    <Label htmlFor="realtime-mode" className="text-xs whitespace-nowrap">
                      Realtime
                    </Label>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  Analyze emotions as you type (with 1s delay)
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="text" onValueChange={(value: string) => setInputMethod(value as 'text' | 'voice')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="text">Text Input</TabsTrigger>
            <TabsTrigger value="voice">Voice Input</TabsTrigger>
          </TabsList>
          
          <TabsContent value="text" className="space-y-4">
            <Textarea
              placeholder="Type how you're feeling..."
              className="min-h-24 resize-none"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isAnalyzing}
            />
            
              <Button 
                className="w-full"
              disabled={!text.trim() || isAnalyzing || (isRealtime && text.trim().length > 10)}
              onClick={() => analyzeEmotion(text)}
              >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Analyze Emotion'
              )}
              </Button>
          </TabsContent>
          
          <TabsContent value="voice" className="space-y-4">
            <div className="flex flex-col items-center justify-center py-6 border border-dashed rounded-md border-muted">
              <Button
                variant={isListening ? "destructive" : "default"}
                size="lg"
                className="rounded-full h-16 w-16 flex items-center justify-center mb-4"
                onClick={toggleVoiceInput}
              >
              {isListening ? (
                  <StopCircle className="h-8 w-8" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                {isListening ? "Listening... Click to stop" : "Click to start voice recognition"}
              </p>
            </div>
            
            {text && inputMethod === 'voice' && (
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-sm italic">{text}</p>
                </div>
              )}
          </TabsContent>
        </Tabs>
        
        {error && (
          <div className="mt-4 p-3 border border-destructive/50 bg-destructive/10 rounded-md text-sm flex items-start gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
        
        {backendAvailable === false && !error && (
          <div className="mt-4 p-3 border border-amber-500/50 bg-amber-500/10 rounded-md text-sm flex items-start gap-2 text-amber-700 dark:text-amber-400">
            <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p>Advanced emotion analysis backend is unavailable. Using local fallback detection.</p>
          </div>
        )}
        
        {emotion && !isAnalyzing && !error && (
          <div className="mt-4 animate-fade-in">
            <div className={`p-4 rounded-lg ${getEmotionColorClass(emotion)} flex items-center gap-3`}>
              <div className="w-12 h-12 rounded-full bg-white/20 dark:bg-black/20 flex items-center justify-center text-2xl">
                {getEmotionEmoji(emotion)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <p className="font-medium capitalize">{emotion}</p>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {confidence}% confidence
                  </span>
                </div>
                <Progress 
                  value={confidence} 
                  className="h-1.5" 
                  style={{
                    backgroundColor: 'var(--background)',
                    '--progress-background': getConfidenceColor(confidence)
                  } as React.CSSProperties}
                />
              </div>
            </div>
          </div>
        )}
        
        {showHistory && emotionHistory.length > 0 && (
          <div className="mt-4">
            <div className="w-full">
              <h3 className="text-sm font-medium mb-2 flex items-center">
                <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                <span>Recent Emotions</span>
              </h3>
              <div className="space-y-2 w-full">
                {emotionHistory.map((item, index) => (
                  <div key={index} className="flex items-center justify-between w-full">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${getEmotionDotColor(item.emotion)}`}></div>
                      <span className="text-sm font-medium capitalize">{item.emotion}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs text-muted-foreground mr-2">{Math.round(item.confidence * 100)}%</span>
                      <span className="text-xs text-muted-foreground">{formatTimestamp(item.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        <p className="text-xs text-center text-muted-foreground mt-4">
          {backendAvailable 
            ? "Using FastAPI ML backend for high-performance emotion analysis" 
            : "Using local emotion detection"}
        </p>
      </CardContent>
    </Card>
  );
};

export default React.memo(RealtimeEmotionDetector);
