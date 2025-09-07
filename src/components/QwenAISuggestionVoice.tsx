import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Volume2, VolumeX, UserRound, Brain, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Resource {
  id: string;
  title: string;
  type: string;
  tag: string;
  description?: string;
}

interface QwenAISuggestionVoiceProps {
  currentEmotion?: string;
  resources: Resource[];
  onResourceSelect?: (resourceId: string) => void;
  autoPlay?: boolean;
}

const QwenAISuggestionVoice = ({
  currentEmotion,
  resources,
  onResourceSelect,
  autoPlay = false
}) => {
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [suggestion, setSuggestion] = useState<string>('');
  const [recommendedResources, setRecommendedResources] = useState<Resource[]>([]);
  const [hasSpoken, setHasSpoken] = useState<boolean>(false);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { toast } = useToast();

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      speechSynthesisRef.current = window.speechSynthesis;
    }
    
    return () => {
      // Cleanup speech synthesis when component unmounts
      if (speechSynthesisRef.current && utteranceRef.current) {
        speechSynthesisRef.current.cancel();
      }
    };
  }, []);

  // Generate a new suggestion when emotion or resources change
  useEffect(() => {
    if (currentEmotion && resources.length > 0) {
      generateSuggestion();
      // Reset hasSpoken when emotion changes
      setHasSpoken(false);
    }
  }, [currentEmotion, resources]);

  // Auto-play when ready
  useEffect(() => {
    if (autoPlay && suggestion && !hasSpoken && !isSpeaking && speechSynthesisRef.current) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        speak();
        setHasSpoken(true);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [suggestion, hasSpoken, isSpeaking, autoPlay]);

  const generateSuggestion = async () => {
    if (!currentEmotion) return;
    
    try {
      // Filter to recommended resources for this emotion
      const emotionBasedResources = resources.filter(resource => {
        const emotionResourceMapping: Record<string, string[]> = {
          joy: ['gratitude', 'meditation', 'social'],
          sadness: ['meditation', 'exercise', 'journaling'],
          anger: ['meditation', 'exercise'],
          fear: ['meditation', 'journaling', 'exercise'],
          love: ['social', 'gratitude'],
          surprise: ['journaling', 'meditation'],
          neutral: ['meditation', 'education']
        };
        
        const relevantTypes = emotionResourceMapping[currentEmotion] || ['meditation', 'education'];
        
        return relevantTypes.includes(resource.tag) || 
               (resource.type === 'meditation' && currentEmotion === 'anger') ||
               (resource.type === 'exercise' && (currentEmotion === 'sadness' || currentEmotion === 'anger')) ||
               (resource.type === 'article' && currentEmotion === 'neutral');
      });
      
      // Get up to 3 recommendations
      const recommendations = emotionBasedResources.slice(0, 3);
      setRecommendedResources(recommendations);
      
      // Generate personalized message
      let message = '';
      
      const emotionGreetings: Record<string, string[]> = {
        joy: [
          "I notice you're feeling joy! That's wonderful.",
          "Your positive energy is something to celebrate.",
          "While you're experiencing joy, you might enjoy"
        ],
        sadness: [
          "I can sense you might be feeling down right now.",
          "When we're feeling sad, gentle support can help.",
          "I've found some resources that might comfort you during this time."
        ],
        anger: [
          "I notice you might be feeling frustrated or angry.",
          "When dealing with anger, it helps to have healthy outlets.",
          "These resources might help channel that energy constructively."
        ],
        fear: [
          "I sense you might be experiencing some anxiety or fear.",
          "When feeling anxious, grounding exercises can help.",
          "These resources might help you feel more centered."
        ],
        neutral: [
          "I notice your emotional state seems balanced right now.",
          "This is a good time for reflection and growth.",
          "These resources might complement your current state of mind."
        ]
      };
      
      // Get greeting for this emotion or fallback to neutral
      const greetings = emotionGreetings[currentEmotion] || emotionGreetings.neutral;
      
      // Construct message
      message = `${greetings[0]} ${greetings[1]} `;
      
      if (recommendations.length > 0) {
        message += `${greetings[2]}: `;
        
        recommendations.forEach((resource, index) => {
          if (index > 0) {
            message += index === recommendations.length - 1 ? ' and ' : ', ';
          }
          message += `"${resource.title}"`;
        });
        
        message += '. Would you like to explore any of these now?';
      } else {
        message += "I don't have specific recommendations at the moment, but exploring our resources section might be helpful.";
      }
      
      setSuggestion(message);
      
    } catch (error) {
      console.error('Error generating AI suggestion:', error);
      setSuggestion("I'm here to help you find resources that match your current emotional state. What would you like to explore today?");
    }
  };

  const speak = () => {
    if (!speechSynthesisRef.current) return;
    
    // Stop any ongoing speech
    speechSynthesisRef.current.cancel();
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(suggestion);
    utteranceRef.current = utterance;
    
    // Set voice preferences - try to use a natural sounding voice if available
    const voices = speechSynthesisRef.current.getVoices();
    const preferredVoices = voices.filter(voice => 
      voice.name.includes('Samantha') || 
      voice.name.includes('Daniel') || 
      voice.name.includes('Google') ||
      voice.name.includes('Natural')
    );
    
    if (preferredVoices.length > 0) {
      utterance.voice = preferredVoices[0];
    }
    
    // Set other properties
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Add events
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      toast({
        title: "Speech Error",
        description: "There was a problem with the speech synthesis",
        variant: "destructive"
      });
    };
    
    // Start speaking
    speechSynthesisRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const handleResourceClick = (resourceId: string) => {
    if (onResourceSelect) {
      onResourceSelect(resourceId);
    }
    
    // Stop speaking when a resource is selected
    if (isSpeaking) {
      stopSpeaking();
    }
  };

  if (!currentEmotion || resources.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 border-primary/20 shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-primary/10 via-background to-background/80 overflow-hidden">
      <div className="flex items-start gap-3 relative">
        {/* Animated background effect when speaking */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.div 
              className="absolute inset-0 bg-primary/5 rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.1, 0.2, 0.1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </AnimatePresence>
        
        <div className="bg-primary/20 p-2 rounded-full relative z-10">
          {isSpeaking ? (
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="h-5 w-5 text-primary" />
            </motion.div>
          ) : (
            <Brain className="h-5 w-5 text-primary" />
          )}
        </div>
        
        <div className="flex-1 relative z-10">
          <div className="text-sm mb-2 leading-relaxed">{suggestion}</div>
          
          {recommendedResources.length > 0 && (
            <motion.div 
              className="flex flex-wrap gap-2 mt-3"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              {recommendedResources.map(resource => (
                <Button
                  key={resource.id}
                  variant="outline"
                  size="sm"
                  className="text-xs py-1 h-auto bg-white/10 backdrop-blur-sm hover:bg-primary/20"
                  onClick={() => handleResourceClick(resource.id)}
                >
                  {resource.title}
                </Button>
              ))}
            </motion.div>
          )}
        </div>
        
        <div className="relative z-10">
          {isSpeaking ? (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={stopSpeaking}
              className="h-8 w-8 bg-red-500/10 hover:bg-red-500/20 text-red-500"
            >
              <VolumeX className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={speak}
              className="h-8 w-8 bg-primary/10 hover:bg-primary/20"
            >
              <Volume2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default QwenAISuggestionVoice; 