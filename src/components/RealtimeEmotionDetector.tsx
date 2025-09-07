import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
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

const RealtimeEmotionDetector = ({
  onEmotionDetected,
  useHuggingFace = false,
  useOpenRouter = false
}: RealtimeEmotionDetectorProps) => {
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

  // Stable debounce function
  const debounce = useMemo(
    () => (func: Function, delay: number) => {
      let timeoutId: NodeJS.Timeout;
      return function(...args: any[]) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
      };
    },
    []
  );

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

  // Use ref to store the last processed text to prevent duplicate calls
  const lastProcessedTextRef = useRef<string>('');
  const processingRef = useRef<boolean>(false);
  
  // Analyze emotion using our emotion service (no direct API calls)
  const analyzeEmotion = useCallback(async (inputText: string) => {
    if (!inputText.trim() || isAnalyzing || processingRef.current) return;
    
    // Prevent duplicate processing of the same text
    const trimmedText = inputText.trim();
    if (trimmedText === lastProcessedTextRef.current) {
      console.log("Skipping duplicate text analysis:", trimmedText.substring(0, 50));
      return;
    }
    
    processingRef.current = true;
    lastProcessedTextRef.current = trimmedText;
    setIsAnalyzing(true);
    setError(null);
    
    try {
      console.log("Using emotionService for emotion detection:", trimmedText.substring(0, 50));
      const emotionResult = await emotionService.detectEmotion(trimmedText);
      
      console.log("EmotionService result:", emotionResult);
      
      if (emotionResult && emotionResult.emotion) {
        // Only update if emotion has significantly changed to prevent flickering
        const newConfidence = Math.round(emotionResult.confidence * 100);
        const emotionChanged = emotion !== emotionResult.emotion;
        const confidenceChanged = Math.abs(confidence - newConfidence) > 5; // 5% threshold
        
        if (emotionChanged || confidenceChanged) {
          setEmotion(emotionResult.emotion);
          setConfidence(newConfidence);
        }
        
        // Add to emotion history only for significant changes
        if (emotionChanged) {
          const historyItem: EmotionHistoryItem = {
            emotion: emotionResult.emotion,
            confidence: emotionResult.confidence,
            timestamp: new Date()
          };
          
          setEmotionHistory(prev => {
            // Check if this is a duplicate entry to prevent unnecessary updates
            const isDuplicate = prev.length > 0 && 
              prev[0].emotion === historyItem.emotion &&
              Math.abs(prev[0].timestamp.getTime() - historyItem.timestamp.getTime()) < 5000;
            
            if (isDuplicate) return prev;
            
            const newHistory = [historyItem, ...prev].slice(0, 5);
            // Save to localStorage for persistence
            try {
              localStorage.setItem('realtimeEmotionHistory', JSON.stringify(newHistory));
            } catch (e) {
              console.error('Error saving emotion history to localStorage:', e);
            }
            return newHistory;
          });
          
          // Only call onEmotionDetected for new emotions to prevent loops
          if (onEmotionDetected) {
            onEmotionDetected(emotionResult.emotion, emotionResult.intensity || Math.round(emotionResult.confidence * 10));
          }
        }
        
        // Show feedback only on manual analysis
        if (!isRealtime) {
          toast({
            title: `Feeling: ${getEmotionDescription(emotionResult.emotion)}`,
            description: `Emotion analysis complete.`,
            variant: "default",
          });
        }
      } else {
        setError("Could not detect emotion. Please try again with different wording.");
      }
    } catch (error) {
      console.error('Error analyzing emotion:', error);
      setError('An error occurred while analyzing. Please try again.');
    } finally {
      setIsAnalyzing(false);
      processingRef.current = false;
    }
  }, [emotion, confidence, isAnalyzing, onEmotionDetected, isRealtime, toast]);

  // Memoized debounced version for real-time analysis with longer delay
  const debouncedAnalyzeEmotion = useMemo(
    () => debounce((text: string) => analyzeEmotion(text), 2000), // Increased to 2 seconds
    [debounce, analyzeEmotion]
  );

  // Previous text ref to prevent duplicate calls
  const previousTextRef = useRef<string>('');
  const textChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to handle real-time analysis with improved duplicate detection
  useEffect(() => {
    if (isRealtime && text.trim().length > 15) { // Increased minimum length
      const trimmedText = text.trim();
      
      // Clear any pending timeout
      if (textChangeTimeoutRef.current) {
        clearTimeout(textChangeTimeoutRef.current);
      }
      
      // Check if text has meaningfully changed (not just whitespace or single chars)
      const textChanged = trimmedText !== previousTextRef.current;
      const textLengthChanged = Math.abs(trimmedText.length - previousTextRef.current.length) > 5;
      
      if (textChanged && (textLengthChanged || trimmedText.length > 50)) {
        console.log('Scheduling analysis for text change:', trimmedText.substring(0, 30));
        previousTextRef.current = trimmedText;
        
        // Set a timeout to prevent rapid successive calls
        textChangeTimeoutRef.current = setTimeout(() => {
          debouncedAnalyzeEmotion(trimmedText);
        }, 500);
      }
    }
    
    return () => {
      if (textChangeTimeoutRef.current) {
        clearTimeout(textChangeTimeoutRef.current);
      }
    };
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
        const finalTranscript = transcript.trim();
        setText(finalTranscript);
        
        // Only analyze if text is different and sufficient length
        if (finalTranscript.length > 10 && finalTranscript !== previousTextRef.current) {
          previousTextRef.current = finalTranscript;
          debouncedAnalyzeEmotion(finalTranscript);
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
      joy: 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white',
      sadness: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white',
      anger: 'bg-gradient-to-br from-red-500 to-red-600 text-white',
      fear: 'bg-gradient-to-br from-purple-500 to-purple-600 text-white',
      love: 'bg-gradient-to-br from-pink-500 to-rose-500 text-white',
      surprise: 'bg-gradient-to-br from-teal-400 to-cyan-500 text-white',
      neutral: 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
    };
    
    return colorMap[emotion] || 'bg-gradient-to-br from-gray-400 to-gray-500 text-white';
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

  // Get emotion description for users
  const getEmotionDescription = (emotion: string): string => {
    const descriptions: Record<string, string> = {
      joy: 'Feeling positive and uplifted',
      sadness: 'Experiencing some low feelings',
      anger: 'Feeling frustrated or upset',
      fear: 'Sensing worry or anxiety',
      love: 'Feeling warm and caring',
      surprise: 'Experiencing something unexpected',
      neutral: 'In a balanced state'
    };
    
    return descriptions[emotion] || descriptions.neutral;
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
                  <p className="font-medium capitalize text-lg">{emotion}</p>
                  <span className="text-sm text-white/80 bg-white/20 px-3 py-1 rounded-full">
                    Strong feeling
                  </span>
                </div>
                <p className="text-sm text-white/70 mt-1">
                  {getEmotionDescription(emotion)}
                </p>
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
                      <span className="text-xs text-muted-foreground">{formatTimestamp(item.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        <p className="text-xs text-center text-muted-foreground mt-4">
          Real-time emotion understanding to support your wellbeing
        </p>
      </CardContent>
    </Card>
  );
};

export default memo(RealtimeEmotionDetector);
