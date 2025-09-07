import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { 
  Bookmark, 
  BookmarkPlus, 
  Star, 
  Clock, 
  Link, 
  File, 
  FileText, 
  X, 
  PlayCircle, 
  Volume2, 
  LightbulbIcon, 
  BrainCircuit
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getEmotionalFeedback } from '@/utils/openRouterAPI';
import { extractKeyPoints } from '@/utils/aiSummaryUtils';
import AIVoiceButton from '@/components/AIVoiceButton';
import { useToast } from '@/hooks/use-toast';

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
  text?: string;
  content?: {
    type: string;
    text?: string;
    url?: string;
  };
  ai_summary?: string;
  key_points?: string[];
}

interface ResourceDetailModalProps {
  resource: Resource;
  isOpen: boolean;
  onClose: () => void;
  isSaved: boolean;
  onSave: () => void;
  progress: number;
  onProgressChange: (newProgress: number) => void;
  onComplete: () => void;
}

const ResourceDetailModal = ({
  resource,
  isOpen,
  onClose,
  isSaved,
  onSave,
  progress,
  onProgressChange,
  onComplete,
}) => {
  const isStarted = progress > 0;
  const [showInlineContent, setShowInlineContent] = useState(false);
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [reflectionText, setReflectionText] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [showAISummary, setShowAISummary] = useState(false);
  const [aiSummary, setAISummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    setShowInlineContent(false);
    setSelectedEmotion(null);
    setReflectionText('');
    setShowFeedback(false);
    setAiFeedback(null);
    setShowAISummary(false);
    setAISummary(null);
    setKeyPoints([]);
    
    // If resource has markdown content, extract key points
    if (resource.content?.type === 'markdown' && resource.content.text) {
      const extractedPoints = extractKeyPoints(resource.content.text, 3);
      setKeyPoints(extractedPoints);
    }
  }, [resource, isOpen]);

  const handleStartResource = () => {
    if (progress === 0) {
      onProgressChange(5);
    }
    if (resource.text) {
      setShowInlineContent(true);
    } else {
      window.open(resource.link, '_blank', 'noopener,noreferrer');
    }
  };

  const handleContinue = () => {
    const newProgress = Math.min(100, progress + 25);
    onProgressChange(newProgress);
  };

  const handleMarkComplete = () => {
    onComplete();
  };
  
  const handleEmotionSelect = async (emotion: string) => {
    setSelectedEmotion(emotion);
    // If this is the first interaction, increase progress
    if (progress < 30) {
      onProgressChange(30);
    }
    
    // Try to get AI feedback when emotion is selected
    try {
      setLoadingFeedback(true);
      const feedback = await getEmotionalFeedback(emotion, resource.title);
      setAiFeedback(feedback);
    } catch (error) {
      console.error('Error fetching AI feedback:', error);
    } finally {
      setLoadingFeedback(false);
    }
  };
  
  const handleReflectionSave = () => {
    if (reflectionText.trim().length > 0) {
      // Here would save the reflection to a database or state in a real app
      // For now, we'll just show a visual indication of success
      setReflectionText('');
      // If user completed the reflection, increase progress
      if (progress < 75) {
        onProgressChange(75);
      }
    }
  };

  const toggleFeedback = async () => {
    setShowFeedback(!showFeedback);
    
    // Only fetch feedback when opening the panel and we don't have feedback yet
    if (!showFeedback && !aiFeedback) {
      try {
        setLoadingFeedback(true);
        const feedback = await getEmotionalFeedback(selectedEmotion, resource.title);
        setAiFeedback(feedback);
      } catch (error) {
        console.error('Error fetching AI feedback:', error);
      } finally {
        setLoadingFeedback(false);
      }
    }
  };

  const typeContent = () => {
    if (!showInlineContent || !resource.content) {
      const defaultPreview = (
        <div className="flex items-center justify-center h-32 mb-4 bg-black/10 dark:bg-black/30 rounded-md">
          {resource.image ? (
            <img src={resource.image} alt={`${resource.title} preview`} className="w-full h-full object-cover rounded-md" />
          ) : (
            <span className="text-muted-foreground text-sm flex flex-col items-center">
              <File className="h-10 w-10 mb-2 opacity-50"/> 
              {resource.type} Preview
            </span>
          )}
        </div>
      );
        return (
          <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
          {defaultPreview}
            <p className="text-sm text-muted-foreground">
            {resource.description}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Click "Begin Resource" below to start.
          </p>
        </div>
      );
    }

    switch (resource.content.type) {
      case 'markdown':
        return (
          <div className="mt-2 prose dark:prose-invert prose-sm max-w-none max-h-[50vh] overflow-y-auto p-4 bg-white/5 rounded-lg border border-white/10 shadow-inner">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium">Interactive Article</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-xs">
                  <BookmarkPlus className="h-3 w-3 mr-1" />
                  Add Note
                </Button>
                <Button variant="ghost" size="sm" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  Highlight
                </Button>
              </div>
            </div>
            <div className="prose-headings:scroll-mt-16">
              <ReactMarkdown
                components={{
                  h2: ({ node, ...props }) => <h2 id={props.children?.toString().toLowerCase().replace(/\s+/g, '-')} className="text-xl font-bold mt-8 mb-4 text-primary/90 border-b border-primary/20 pb-2" {...props} />,
                  h3: ({ node, ...props }) => <h3 id={props.children?.toString().toLowerCase().replace(/\s+/g, '-')} className="text-lg font-semibold mt-6 mb-3 text-primary/80" {...props} />,
                  ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-4 space-y-2" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-4 space-y-2" {...props} />,
                  li: ({ node, ...props }) => <li className="my-1" {...props} />,
                  p: ({ node, ...props }) => <p className="my-4 leading-relaxed" {...props} />,
                  strong: ({ node, ...props }) => <strong className="font-semibold text-primary/90" {...props} />,
                  a: ({ node, ...props }) => <a className="text-blue-500 hover:text-blue-700 underline transition-colors" {...props} target="_blank" rel="noopener noreferrer" />,
                  blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-primary/30 pl-4 italic my-4" {...props} />,
                  code: ({ node, ...props }) => <code className="bg-black/10 rounded px-1.5 py-0.5 font-mono text-sm" {...props} />,
                }}
              >
                {resource.content.text || 'No content available.'}
              </ReactMarkdown>
            </div>
            
            {resource.title.includes('Emotions') && (
              <div className="mt-6 border-t border-white/10 pt-4">
                <h3 className="text-base font-semibold mb-3">Interactive Exercise</h3>
                <div className="bg-white/10 p-3 rounded-lg mb-3">
                  <h4 className="font-medium mb-2 text-sm">Emotion Check-in</h4>
                  <p className="text-xs mb-3">How are you feeling right now? Select the emotion that best matches your current state:</p>
                  <div className="grid grid-cols-4 gap-1">
                    {['Joy 😊', 'Sadness 😢', 'Anger 😠', 'Fear 😨', 'Disgust 🤢', 'Surprise 😲', 'Love ❤️', 'Neutral 😐'].map((emotion, i) => (
                      <Button 
                        key={i} 
                        variant={selectedEmotion === emotion ? "default" : "outline"} 
                        size="sm" 
                        className={`text-xs h-auto py-1 transition-colors ${selectedEmotion === emotion ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/20'}`}
                        onClick={() => handleEmotionSelect(emotion)}
                      >
                        {emotion}
                      </Button>
                    ))}
                  </div>
                  
                  {selectedEmotion && (
                    <div className="mt-2 text-xs">
                      <p className="text-primary">You selected: {selectedEmotion}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        This information helps personalize your experience. Try noticing this emotion in your body.
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="bg-white/10 p-3 rounded-lg">
                  <h4 className="font-medium mb-2 text-sm">Emotion Journal</h4>
                  <p className="text-xs mb-2">Take a moment to reflect on a recent emotional experience:</p>
                  <Textarea 
                    placeholder="What triggered the emotion? How did it feel in your body? How did you respond?"
                    className="h-20 mb-2 bg-white/5 border-white/20 text-xs"
                    value={reflectionText}
                    onChange={(e) => setReflectionText(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={handleReflectionSave}
                      disabled={reflectionText.trim().length === 0}
                      className="h-7 text-xs"
                    >
                      Save Reflection
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'video':
        return (
          <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="aspect-video w-full bg-black rounded-md flex items-center justify-center mb-2">
              <PlayCircle className="w-16 h-16 text-white/50"/>
              <span className="absolute bottom-2 right-2 text-xs bg-black/50 px-1 py-0.5 rounded text-white">Video Placeholder</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">Video player would be embedded here. <a href={resource.content.url || resource.link} target="_blank" rel="noopener noreferrer" className="underline">Open original link</a></p>
          </div>
        );
      case 'audio':
        return (
          <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center justify-between p-3 bg-black/20 dark:bg-black/30 rounded-md mb-2">
              <div className="flex items-center">
                <PlayCircle className="w-8 h-8 mr-3 text-primary"/>
                <div>
                  <span className="font-medium text-sm block">{resource.title}</span>
                  <span className="text-xs text-muted-foreground">Audio Player Placeholder</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{resource.duration}</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">Audio player would be embedded here. <a href={resource.content.url || resource.link} target="_blank" rel="noopener noreferrer" className="underline">Open original link</a></p>
          </div>
        );
      default:
        return <p className="mt-4 text-sm text-muted-foreground">Unsupported content type.</p>;
    }
  };

  // Generate AI summary of resource content
  const generateAISummary = async () => {
    if (!resource.content?.text) {
      toast({
        title: "No content available",
        description: "This resource doesn't have any content to summarize.",
        variant: "destructive"
      });
      return;
    }
    
    setIsGeneratingSummary(true);
    
    try {
      // Maximum retry attempts
      const maxRetries = 3;
      let summary = null;
      let error = null;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await fetch('http://localhost:8000/openrouter/generate-summary', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: resource.content.text,
              max_length: 250
            }),
            // Add timeout to prevent hanging requests
            signal: AbortSignal.timeout(10000)
          });
          
          if (!response.ok) {
            throw new Error(`Backend API error: ${response.status}`);
          }
          
          const result = await response.json();
          summary = result.summary;
          
          // If we got a valid summary, break the retry loop
          if (summary) {
            break;
          }
        } catch (e) {
          console.error(`AI summary generation attempt ${attempt + 1} failed:`, e);
          error = e;
          // Wait before retrying (increasing delay with each attempt)
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }
      }
      
      if (summary) {
        setAISummary(summary);
        setShowAISummary(true);
        
        // Store the generated summary for future use
        if (resource.id) {
          localStorage.setItem(`resource_summary_${resource.id}`, summary);
        }
        
        // Increase progress if this is the first time checking the summary
        if (progress < 50) {
          onProgressChange(50);
        }
      } else {
        // If all retries failed, show error and fallback to our own extractive summary
        console.error('All summary generation attempts failed:', error);
        toast({
          title: "AI Summary Failed",
          description: "Could not generate AI summary. Falling back to basic summary.",
          variant: "destructive"
        });
        
        // Create a simple extractive summary as fallback
        const text = resource.content.text;
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
        const shortSummary = sentences.slice(0, 3).join(' ');
        
        setAISummary(shortSummary);
        setShowAISummary(true);
      }
    } catch (error) {
      console.error('Error generating AI summary:', error);
      toast({
        title: "AI Summary Failed",
        description: "Could not generate AI summary. Try again later.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Toggle AI summary visibility
  const toggleAISummary = () => {
    if (!aiSummary && !showAISummary) {
      generateAISummary();
    } else {
      setShowAISummary(!showAISummary);
    }
  };

  // Get text for the voice feature
  const getTextForVoice = (): string => {
    // If AI summary is available, use that
    if (aiSummary) {
      return aiSummary;
    }
    
    // If resource has description, use that
    if (resource.description) {
      return resource.description;
    }
    
    // Fallback to title
    return `Resource: ${resource.title}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border-border/20 shadow-lg max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          {resource.title.includes('Emotions') ? (
            <>
              <div className="relative">
                <div className="absolute -top-6 -left-6 w-24 h-24 bg-primary/20 rounded-full filter blur-2xl opacity-30 animate-pulse"></div>
                <div className="relative z-10">
                  <DialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {resource.title}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                    {resource.description}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex flex-col">
                  <span className="text-xs text-muted-foreground">Type</span>
                  <span className="font-medium capitalize text-sm">{resource.type}</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex flex-col">
                  <span className="text-xs text-muted-foreground">Reading Time</span>
                  <span className="font-medium text-sm">{resource.duration}</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex flex-col">
                  <span className="text-xs text-muted-foreground">Difficulty</span>
                  <span className="font-medium capitalize text-sm">{resource.difficulty}</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-2 flex flex-col">
                  <span className="text-xs text-muted-foreground">Rating</span>
                  <div className="flex items-center">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 mr-1" />
                    <span className="font-medium text-sm">{resource.rating}</span>
                    <span className="text-xs text-muted-foreground ml-1">/5</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
          <DialogTitle className="text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {resource.title}
          </DialogTitle>
          <DialogDescription>
            {resource.description}
          </DialogDescription>
            </>
          )}
          
          <Button 
            variant="outline" 
            size="icon" 
            className="absolute right-4 top-4 h-6 w-6 rounded-full border border-border/40 bg-background/80 backdrop-blur-sm shadow-sm transition-all hover:bg-background/95 hover:border-border hover:scale-105 hover:shadow-md focus:ring-2 focus:ring-primary/20 focus:outline-none"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X className="h-3 w-3 text-foreground/80 hover:text-foreground" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>

        <div className="mt-2">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="outline" className="capitalize">
              {resource.type}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {resource.tag}
            </Badge>
            {resource.duration && (
              <div className="flex items-center text-muted-foreground">
                <Clock className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">{resource.duration}</span>
              </div>
            )}
            {resource.rating && (
              <div className="flex items-center">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500 mr-1" />
                <span className="font-medium">{resource.rating}</span>
                <span className="text-xs text-muted-foreground ml-1">/5</span>
              </div>
            )}
            
            {/* AI Voice button for text-to-speech */}
            <div className="ml-auto">
              <AIVoiceButton 
                text={getTextForVoice()}
                summary={aiSummary || undefined}
                emotion={selectedEmotion || undefined}
                showSettings={true}
                className="h-7 text-xs"
              />
            </div>
          </div>

          {/* AI Summary button and display */}
          {resource.content?.type === 'markdown' && (
            <div className="mb-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full flex items-center justify-center gap-2 text-xs h-8 bg-primary/5 hover:bg-primary/10 border-primary/20"
                onClick={toggleAISummary}
                disabled={isGeneratingSummary}
              >
                {isGeneratingSummary ? (
                  <>
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-foreground/20 border-t-foreground rounded-full mr-1" />
                    Generating AI Summary...
                  </>
                ) : (
                  <>
                    <BrainCircuit className="h-3.5 w-3.5" />
                    {showAISummary ? "Hide AI Summary" : "Show AI Summary"}
                  </>
                )}
              </Button>
              
              {showAISummary && aiSummary && (
                <div className="mt-2 p-3 bg-primary/5 rounded-md border border-primary/20 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <BrainCircuit className="h-4 w-4 text-primary" />
                    <h4 className="text-xs font-medium">AI-Generated Summary</h4>
                  </div>
                  <p className="text-xs">{aiSummary}</p>
                  
                  {keyPoints.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-white/10">
                      <h5 className="text-xs font-medium mb-1 flex items-center">
                        <LightbulbIcon className="h-3 w-3 mr-1 text-amber-500" />
                        Key Points:
                      </h5>
                      <ul className="text-xs space-y-1 list-disc pl-4">
                        {keyPoints.map((point, idx) => (
                          <li key={idx}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {isStarted && (
            <div className="mb-6">
              <div className="flex justify-between text-xs mb-1">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {typeContent()}

          <div className="mt-4">
            <h4 className="font-medium mb-2 text-sm">Related Resources</h4>
            <div className="grid grid-cols-2 gap-2">
              {resource.title.includes('Emotions') ? 
                [
                  { title: 'Emotional Intelligence 101', type: 'article', tag: 'education' },
                  { title: 'Breathing Techniques for Emotional Regulation', type: 'exercise', tag: 'meditation' },
                  { title: 'Understanding Your Emotional Triggers', type: 'article', tag: 'education' },
                  { title: 'Emotions in the Body Meditation', type: 'meditation', tag: 'meditation' }
                ].map(({ title, type, tag }, i) => (
                  <div 
                    key={i} 
                    className="p-2 border border-white/10 rounded-md bg-white/5 text-xs hover:bg-white/10 transition-colors cursor-pointer flex flex-col"
                  >
                    <span className="font-medium">{title}</span>
                    <div className="flex items-center mt-1 space-x-1">
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                        {type}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-primary/10">
                        {tag}
                      </Badge>
                    </div>
                  </div>
                ))
              : 
                ['Understanding Emotions', 'Breathing Techniques'].map((title, i) => (
                  <div key={i} className="p-2 border border-white/10 rounded bg-white/5 text-xs hover:bg-white/10 transition-colors cursor-pointer">
                  {title}
                </div>
                ))
              }
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-1 pt-2">
          <div className="flex gap-1">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onSave} 
              className="gap-1 transition-all hover:shadow-sm hover:border-primary/30 h-7 text-xs"
          >
            {isSaved ? (
              <>
                  <Bookmark className="h-3 w-3 fill-primary text-primary" />
                Saved
              </>
            ) : (
              <>
                  <BookmarkPlus className="h-3 w-3" />
                  Save
              </>
            )}
          </Button>
            
            {resource.title.includes('Emotions') && (
              <Button 
                variant="outline"
                size="sm"
                className="gap-1 hover:bg-primary/5 h-7 text-xs"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z"/>
                </svg>
                Notes
              </Button>
            )}
            
            {resource.title.includes('Emotions') && (
              <Button 
                variant="outline"
                size="sm"
                className="gap-1 hover:bg-primary/5 h-7 text-xs"
                onClick={toggleFeedback}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/>
                </svg>
                Feedback
              </Button>
            )}
          </div>
          
          <div className="flex-1 flex justify-end gap-1">
            {isStarted && progress < 100 && (
              <Button 
                size="sm" 
                onClick={handleContinue}
                className="relative overflow-hidden group h-7 text-xs"
              >
                <span className="relative z-10">Continue</span>
                <span className="absolute inset-0 bg-primary/10 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </Button>
            )}
            {!isStarted && (
              <Button 
                size="sm" 
                onClick={handleStartResource}
                className="relative overflow-hidden group h-7 text-xs"
                disabled={!resource.content && (!resource.link || resource.link === '#' || resource.link.startsWith('https://example.com'))}
                title={!resource.content && (!resource.link || resource.link === '#' || resource.link.startsWith('https://example.com')) ? "No content or link available" : "Begin Resource"}
              >
                <span className="relative z-10">
                  {showInlineContent ? "Showing Content..." : "Begin"}
                </span>
                <span className="absolute inset-0 bg-primary/10 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </Button>
            )}
            {isStarted && progress < 100 && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleMarkComplete}
                className="h-7 text-xs"
              >
                Complete
              </Button>
            )}
            {progress === 100 && (
              <Button 
                size="sm" 
                variant="outline"
                className="gap-1 text-green-600 border-green-200 hover:border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-900 dark:hover:bg-green-900/20 h-7 text-xs"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Completed
              </Button>
            )}
            <Button 
              size="sm" 
              variant="outline" 
              asChild
              className="gap-1 hover:bg-secondary/20 transition-all h-7 text-xs"
              disabled={!resource.link || resource.link === '#' || resource.link.startsWith('https://example.com')}
            >
              <a 
                 href={(!resource.link || resource.link === '#' || resource.link.startsWith('https://example.com')) ? undefined : resource.link} 
                 target="_blank" 
                 rel="noopener noreferrer" 
                 className={`flex items-center gap-1 ${(!resource.link || resource.link === '#' || resource.link.startsWith('https://example.com')) ? 'cursor-not-allowed text-muted-foreground' : ''}`}
                 aria-disabled={!resource.link || resource.link === '#' || resource.link.startsWith('https://example.com')}
                 title={(!resource.link || resource.link === '#' || resource.link.startsWith('https://example.com')) ? "No valid link available" : "Open resource in new tab"}
               >
                <Link className="h-3 w-3" />
                Link
              </a>
            </Button>
          </div>
        </DialogFooter>
        
        {showFeedback && resource.title.includes('Emotions') && (
          <div className="fixed md:absolute left-1/2 -translate-x-1/2 bottom-4 md:bottom-16 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-primary/20 w-[90%] md:w-4/5 max-w-sm z-50 transition-all duration-300 opacity-100 transform translate-y-0">
            <div className="flex justify-between items-center mb-1">
              <h4 className="font-medium text-xs">AI Emotional Intelligence Coach</h4>
              <div className="flex gap-1">
                {/* Add voice button for feedback */}
                {aiFeedback && (
                  <AIVoiceButton 
                    text={aiFeedback}
                    emotion={selectedEmotion || undefined}
                    preset="supportive"
                    size="icon" 
                    variant="ghost"
                    className="h-5 w-5 p-0"
                    showText={false}
                  />
                )}
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setShowFeedback(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {loadingFeedback ? (
              <div className="flex justify-center items-center py-3">
                <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="ml-2 text-xs">Getting AI feedback...</span>
              </div>
            ) : (
              <>
                <p className="text-xs mb-2">
                  {aiFeedback || (selectedEmotion ? 
                    `I notice you're feeling ${selectedEmotion}. That's completely valid! Try to observe how this emotion manifests in your body.` :
                    "Try the emotion check-in exercise to get personalized feedback."
                  )}
                </p>
                <div className="flex justify-end mt-2">
                  <Button size="sm" variant="secondary" className="text-xs h-6 px-2" onClick={() => setShowFeedback(false)}>
                    Continue learning
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ResourceDetailModal;
