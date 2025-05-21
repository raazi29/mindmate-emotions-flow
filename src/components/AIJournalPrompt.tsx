import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, RefreshCcw, Loader2, BrainCircuit, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import AIVoiceButton from '@/components/AIVoiceButton';

interface AIJournalPromptProps {
  emotion?: string;
  context?: string;
  previousEntries?: string[];
  onResponseSubmit?: (text: string) => void;
  disabled?: boolean;
}

const AIJournalPrompt: React.FC<AIJournalPromptProps> = ({
  emotion,
  context,
  previousEntries,
  onResponseSubmit,
  disabled = false
}) => {
  const [prompt, setPrompt] = useState<string>('');
  const [followUp, setFollowUp] = useState<string>('');
  const [responseText, setResponseText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showFollowUp, setShowFollowUp] = useState<boolean>(false);
  const { toast } = useToast();

  // Generate a prompt when component mounts or when emotion/context changes
  useEffect(() => {
    if (!disabled) {
      generatePrompt();
    }
  }, [emotion, disabled]);

  const generatePrompt = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('http://localhost:8000/generate-journal-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emotion,
          context,
          previous_entries: previousEntries
        }),
        signal: AbortSignal.timeout(8000) // 8 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      setPrompt(result.prompt);
      setFollowUp(result.follow_up);
      setShowFollowUp(false);
      
    } catch (error) {
      console.error('Error generating journal prompt:', error);
      
      // Fallback prompts
      const fallbacks = {
        joy: "What brought you joy today? How can you create more moments like this?",
        sadness: "What feels heavy for you right now? What might help you feel supported?",
        anger: "What boundary was crossed? How might you respond constructively?",
        fear: "What are you afraid might happen? What would help you feel safer?",
        neutral: "What patterns have you noticed in your thoughts or emotions lately?"
      };
      
      setPrompt(fallbacks[emotion as keyof typeof fallbacks] || fallbacks.neutral);
      setFollowUp("How does reflecting on this make you feel in your body?");
      
      toast({
        title: "Couldn't generate a personalized prompt",
        description: "Using a standard prompt instead. Check your connection.",
        variant: "destructive"
      });
      
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    if (responseText.trim().length > 0 && onResponseSubmit) {
      onResponseSubmit(responseText);
      setResponseText('');
      
      // After submitting, show the follow-up question if available
      if (followUp && !showFollowUp) {
        setShowFollowUp(true);
      } else {
        // If we've already shown the follow-up, generate a new prompt
        generatePrompt();
      }
    }
  };

  return (
    <Card className="w-full transition-all duration-300 shadow-md hover:shadow-lg border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            AI Journal Prompt
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={generatePrompt}
            disabled={isLoading}
            title="Generate new prompt"
            className="h-8 w-8"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
          </Button>
        </div>
        <CardDescription>
          Personalized prompts to guide your reflection
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="relative">
          <div className="absolute -left-2 -top-2 w-8 h-8 opacity-30 bg-primary/20 rounded-full filter blur-xl z-0" />
          
          <div className="mb-4 p-4 bg-primary/5 rounded-lg border border-primary/10 relative z-10">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm">
                  {showFollowUp ? followUp : prompt}
                </p>
                {emotion && (
                  <Badge variant="outline" className="mt-2 text-xs bg-primary/10">
                    {emotion}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="absolute top-2 right-2">
              <AIVoiceButton 
                text={showFollowUp ? followUp : prompt}
                emotion={emotion}
                size="icon"
                variant="ghost"
                className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
                showText={false}
              />
            </div>
          </div>
          
          <Textarea
            placeholder="Write your response here..."
            className="min-h-[120px] resize-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </CardContent>
      
      <CardFooter className="pt-0">
        <Button 
          className="w-full gap-2"
          onClick={handleSubmit}
          disabled={responseText.trim().length === 0 || isLoading}
        >
          <Send className="h-4 w-4" />
          {showFollowUp ? "Submit Follow-up" : "Submit Response"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AIJournalPrompt; 