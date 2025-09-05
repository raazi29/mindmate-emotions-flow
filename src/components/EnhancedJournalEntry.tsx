import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Save, 
  Mic, 
  Volume2, 
  Sparkles, 
  Tag, 
  Heart, 
  TrendingUp,
  Loader2,
  WifiOff,
  Wifi
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import VoiceInput from '@/components/VoiceInput';
import VoiceOutput from '@/components/VoiceOutput';
import { journalService, JournalEntry } from '@/services/JournalService';
import { useUser } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/hooks/use-toast';

interface EnhancedJournalEntryProps {
  entry?: JournalEntry;
  onSave: (entry: JournalEntry) => void;
  onCancel: () => void;
}

const EnhancedJournalEntry: React.FC<EnhancedJournalEntryProps> = ({
  entry,
  onSave,
  onCancel
}) => {
  const { user } = useUser();
  const [title, setTitle] = useState(entry?.title || '');
  const [content, setContent] = useState(entry?.content || '');
  const [isLoading, setIsLoading] = useState(false);
  const [emotion, setEmotion] = useState(entry?.emotion || '');
  const [emotionIntensity, setEmotionIntensity] = useState(entry?.emotion_intensity || 5);
  const [confidence, setConfidence] = useState(entry?.confidence || 0);
  const [tags, setTags] = useState<string[]>(entry?.tags || []);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [isOffline, setIsOffline] = useState(journalService.isOffline());

  useEffect(() => {
    // Listen for online/offline status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleVoiceTranscript = (transcript: string) => {
    if (transcript) {
      setContent(prev => prev + (prev ? ' ' : '') + transcript);
      toast({
        title: "Voice input added",
        description: "Your speech has been converted to text.",
      });
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save your journal entry.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both a title and content for your entry.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      let savedEntry: JournalEntry;

      if (entry) {
        savedEntry = await journalService.updateEntry(entry.id, {
          title: title.trim(),
          content: content.trim(),
        });
      } else {
        savedEntry = await journalService.createEntry({
          user_id: user.id,
          title: title.trim(),
          content: content.trim(),
        });
      }

      onSave(savedEntry);
      
      toast({
        title: entry ? "Entry updated" : "Entry saved",
        description: isOffline 
          ? "Saved locally. Will sync when online." 
          : "Your journal entry has been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving entry:', error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save entry",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {entry ? 'Edit Journal Entry' : 'New Journal Entry'}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {isOffline ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <WifiOff className="h-3 w-3" />
                Offline
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center gap-1">
                <Wifi className="h-3 w-3" />
                Online
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your entry a meaningful title..."
            className="text-lg"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Content</label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVoiceInput(!showVoiceInput)}
            >
              <Mic className="h-4 w-4 mr-1" />
              Voice Input
            </Button>
          </div>
          
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your thoughts and feelings... Use #tags to categorize your entry."
            className="min-h-[200px] text-base leading-relaxed"
          />
        </div>

        <AnimatePresence>
          {showVoiceInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Separator className="mb-4" />
              <VoiceInput
                onTranscript={handleVoiceTranscript}
                showInterimResults={true}
                className="bg-muted/50 p-4 rounded-lg"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {content && (
          <div className="space-y-2">
            <Separator />
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Listen to your entry</span>
            </div>
            <VoiceOutput
              text={content}
              emotion={emotion}
              showControls={true}
              className="bg-muted/50 p-3 rounded-lg"
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          
          <Button onClick={handleSave} disabled={isLoading || !title.trim() || !content.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {entry ? 'Update Entry' : 'Save Entry'}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedJournalEntry;