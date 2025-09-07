import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Mic, StopCircle, Save, Clock, Trash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { analyzeEmotionWithModel } from '@/utils/emotionUtils';
import { getHuggingFace } from '@/utils/huggingfaceUtils';

interface JournalEntry {
  id: string;
  text: string;
  timestamp: Date;
  emotion?: string;
  confidence?: number;
}

interface MoodJournalProps {
  onNewEntry?: (text: string, emotion?: string) => void;
}

const MoodJournal = ({ onNewEntry }) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState('');
  const [title, setTitle] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  // Load entries from localStorage on component mount
  useEffect(() => {
    const savedEntries = localStorage.getItem('moodJournalEntries');
    if (savedEntries) {
      try {
        const parsed = JSON.parse(savedEntries);
        // Convert string timestamps back to Date objects
        const entriesWithDates = parsed.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
        setEntries(entriesWithDates);
      } catch (error) {
        console.error('Error parsing journal entries:', error);
      }
    }
  }, []);

  // Save entries to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('moodJournalEntries', JSON.stringify(entries));
  }, [entries]);

  // Start voice recording
  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Speech Recognition Not Available",
        description: "Your browser doesn't support speech recognition. Try using Chrome.",
        variant: "destructive",
      });
      return;
    }

    // @ts-ignore - TypeScript doesn't know about webkitSpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript + ' ';
      }
      setCurrentEntry(transcript);
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error', event);
      setIsRecording(false);
      toast({
        title: 'Voice Input Error',
        description: 'There was a problem with voice recognition.',
        variant: 'destructive',
      });
    };

    recognitionRef.current.onend = () => {
      setIsRecording(false);
    };

    try {
      recognitionRef.current.start();
      setIsRecording(true);
      toast({
        title: 'Recording Started',
        description: 'Speak clearly into your microphone.',
      });
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      toast({
        title: 'Recording Failed',
        description: 'Could not start voice recording.',
        variant: 'destructive',
      });
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      toast({
        title: 'Recording Stopped',
        description: 'Voice input has been captured.',
      });
    }
  };

  // Save the current entry
  const saveEntry = async () => {
    if (!currentEntry.trim()) {
      toast({
        title: 'Empty Entry',
        description: 'Please add some text before saving.',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Analyze emotion in the text
      const hf = getHuggingFace();
      const emotionResult = await analyzeEmotionWithModel(currentEntry, hf);
      
      // Create a new entry
      const newEntry: JournalEntry = {
        id: Date.now().toString(),
        text: currentEntry,
        timestamp: new Date(),
        emotion: emotionResult.emotion,
        confidence: emotionResult.confidence
      };

      // Add the new entry to the list
      setEntries(prev => [newEntry, ...prev]);
      
      // Call onNewEntry callback if provided
      if (onNewEntry) {
        onNewEntry(currentEntry, emotionResult.emotion);
      }
      
      // Clear the current entry
      setCurrentEntry('');
      setTitle('');
      
      toast({
        title: 'Entry Saved',
        description: `Detected mood: ${emotionResult.emotion}`,
      });
    } catch (error) {
      console.error('Error analyzing emotion:', error);
      // Save without emotion analysis
      const newEntry: JournalEntry = {
        id: Date.now().toString(),
        text: currentEntry,
        timestamp: new Date()
      };
      
      setEntries(prev => [newEntry, ...prev]);
      
      // Call onNewEntry callback if provided (without emotion)
      if (onNewEntry) {
        onNewEntry(currentEntry);
      }
      
      setCurrentEntry('');
      setTitle('');
      
      toast({
        title: 'Entry Saved',
        description: 'Entry saved without emotion analysis.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Delete an entry
  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
    toast({
      title: 'Entry Deleted',
      description: 'Journal entry has been removed.',
    });
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Get emoji for emotion
  const getEmotionEmoji = (emotion?: string): string => {
    if (!emotion) return '📝';
    
    const emojis: Record<string, string> = {
      joy: '😊',
      sadness: '😢',
      anger: '😠',
      fear: '😨',
      love: '❤️',
      surprise: '😲',
      neutral: '😐'
    };
    return emojis[emotion] || '📝';
  };

  return (
    <Card className="w-full glass dark:glass-dark border-none shadow-lg">
      <CardHeader>
        <CardTitle>Mood Journal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Section */}
        <div className="space-y-2">
          <Input
            placeholder="Entry title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-white/50 dark:bg-black/30 border-white/30 dark:border-white/10"
          />
          
          <div className="relative">
            <Textarea
              placeholder="What's on your mind? Write or use voice input..."
              value={currentEntry}
              onChange={(e) => setCurrentEntry(e.target.value)}
              className="min-h-[120px] bg-white/50 dark:bg-black/30 border-white/30 dark:border-white/10 resize-none pr-10"
            />
            
            <div className="absolute right-2 bottom-2">
              <Button
                variant="ghost"
                size="icon"
                className={isRecording ? 'text-red-500' : ''}
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
            </div>
          </div>
          
          <Button 
            onClick={saveEntry} 
            disabled={!currentEntry.trim() || isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? 'Analyzing...' : 'Save Entry'}
          </Button>
        </div>
        
        {/* Recent Entries */}
        <div className="space-y-2 mt-4">
          <h3 className="text-sm font-medium">Recent Entries</h3>
          
          {entries.length === 0 ? (
            <p className="text-muted-foreground text-sm">No journal entries yet. Try adding one above!</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {entries.slice(0, 5).map(entry => (
                <div 
                  key={entry.id}
                  className="p-3 rounded-lg bg-white/20 dark:bg-black/20 border border-white/10 dark:border-white/5"
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getEmotionEmoji(entry.emotion)}</span>
                      <h4 className="font-medium">{entry.emotion ? entry.emotion.charAt(0).toUpperCase() + entry.emotion.slice(1) : 'Journal Entry'}</h4>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDate(entry.timestamp)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => deleteEntry(entry.id)}
                      >
                        <Trash className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-sm line-clamp-2">{entry.text}</p>
                </div>
              ))}
              
              {entries.length > 5 && (
                <Button variant="ghost" className="w-full text-xs">
                  View all {entries.length} entries
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MoodJournal; 