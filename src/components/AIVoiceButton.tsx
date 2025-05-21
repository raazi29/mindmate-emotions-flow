import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { VoicePreset, speechService, getVoicePresetForEmotion } from '@/utils/speechUtils';
import { Volume2, VolumeX, Settings, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Toggle } from '@/components/ui/toggle';
import { useToast } from '@/hooks/use-toast';

export interface AIVoiceButtonProps {
  text: string;
  emotion?: string;
  summary?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  disabled?: boolean;
  preset?: VoicePreset;
  showText?: boolean;
  showSettings?: boolean;
}

const AIVoiceButton: React.FC<AIVoiceButtonProps> = ({
  text,
  emotion,
  summary,
  variant = 'outline',
  size = 'sm',
  className = '',
  disabled = false,
  preset: manualPreset,
  showText = true,
  showSettings = false
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1);
  const [voicePreset, setVoicePreset] = useState<VoicePreset>('default');
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const { toast } = useToast();

  // Initialize voice support
  useEffect(() => {
    const supported = speechService.isSupported();
    setIsVoiceSupported(supported);
    
    if (supported) {
      loadVoices();
    }
    
    // Set initial preset based on emotion or manual preset
    if (manualPreset) {
      setVoicePreset(manualPreset);
    } else if (emotion) {
      setVoicePreset(getVoicePresetForEmotion(emotion));
    }
    
    return () => {
      // Clean up on unmount
      if (isSpeaking) {
        speechService.stop();
      }
    };
  }, [emotion, manualPreset]);

  // Load available voices
  const loadVoices = async () => {
    setIsLoadingVoices(true);
    try {
      // Get voices immediately available
      let voices = speechService.getVoices();
      
      // If no voices available yet, load them asynchronously
      if (voices.length === 0) {
        voices = await speechService.loadVoices();
      }
      
      setAvailableVoices(voices);
      
      // Try to select a female English voice by default
      if (voices.length > 0) {
        const englishFemaleVoice = voices.find(v => 
          v.lang.includes('en') && 
          (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman'))
        );
        
        if (englishFemaleVoice) {
          setSelectedVoice(englishFemaleVoice.name);
        } else {
          // Fallback to any English voice
          const englishVoice = voices.find(v => v.lang.includes('en'));
          if (englishVoice) {
            setSelectedVoice(englishVoice.name);
          }
        }
      }
    } catch (error) {
      console.error('Error loading voices:', error);
    } finally {
      setIsLoadingVoices(false);
    }
  };

  // Handle text-to-speech
  const handleSpeak = useCallback(() => {
    if (!isVoiceSupported || !text) return;
    
    if (isSpeaking) {
      // Stop current speech
      speechService.stop();
      setIsSpeaking(false);
      return;
    }
    
    // If we have a summary, speak that instead of the full text
    const contentToSpeak = summary || text;
    
    try {
      const success = speechService.speak(contentToSpeak, {
        preset: voicePreset,
        rate: voiceSpeed,
        voice: selectedVoice || undefined
      });
      
      if (success) {
        setIsSpeaking(true);
        
        // Set up a check to update the speaking state
        const checkSpeakingInterval = setInterval(() => {
          const stillSpeaking = speechService.isSpeechActive();
          if (!stillSpeaking) {
            setIsSpeaking(false);
            clearInterval(checkSpeakingInterval);
          }
        }, 500);
      } else {
        toast({
          title: "Speech failed",
          description: "Could not speak the text. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error speaking text:', error);
      toast({
        title: "Speech error",
        description: "An error occurred while trying to speak.",
        variant: "destructive"
      });
    }
  }, [isVoiceSupported, text, summary, isSpeaking, voicePreset, voiceSpeed, selectedVoice, toast]);

  const handleVoiceSelect = (voiceName: string) => {
    setSelectedVoice(voiceName);
  };

  const handlePresetSelect = (preset: VoicePreset) => {
    setVoicePreset(preset);
  };

  const handleSpeedChange = (speed: number) => {
    setVoiceSpeed(speed);
  };

  if (!isVoiceSupported) {
    return null; // Don't render anything if voice is not supported
  }

  return (
    <div className="inline-flex">
      {showSettings ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7" 
              disabled={disabled || isLoadingVoices}
              title="Voice settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Voice Settings</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <div className="px-2 py-1.5">
              <div className="text-xs font-medium mb-2">Voice Preset</div>
              <div className="flex flex-wrap gap-1">
                {(['default', 'calm', 'energetic', 'supportive'] as VoicePreset[]).map((preset) => (
                  <Toggle
                    key={preset}
                    size="sm"
                    variant="outline"
                    pressed={voicePreset === preset}
                    onPressedChange={() => handlePresetSelect(preset)}
                    className="h-6 text-xs capitalize"
                  >
                    {preset}
                  </Toggle>
                ))}
              </div>
            </div>
            
            <DropdownMenuSeparator />
            
            <div className="px-2 py-1.5">
              <div className="text-xs font-medium mb-2">Speed</div>
              <div className="flex flex-wrap gap-1">
                {[0.7, 0.85, 1, 1.15, 1.3].map((speed) => (
                  <Toggle
                    key={speed}
                    size="sm"
                    variant="outline"
                    pressed={voiceSpeed === speed}
                    onPressedChange={() => handleSpeedChange(speed)}
                    className="h-6 text-xs"
                  >
                    {speed === 1 ? 'Normal' : speed < 1 ? `${speed}x` : `${speed}x`}
                  </Toggle>
                ))}
              </div>
            </div>
            
            {availableVoices.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs">Select Voice</DropdownMenuLabel>
                <div className="max-h-44 overflow-y-auto">
                  {availableVoices
                    .filter(voice => voice.lang.startsWith('en'))
                    .map((voice) => (
                      <DropdownMenuItem
                        key={voice.name}
                        onSelect={() => handleVoiceSelect(voice.name)}
                        className={selectedVoice === voice.name ? "bg-primary/20" : ""}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">{voice.name}</span>
                          <span className="text-[10px] text-muted-foreground">{voice.lang}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              disabled={disabled || !text || isLoadingVoices}
              onClick={handleSpeak}
              className={`${className} ${isSpeaking ? 'animate-pulse' : ''}`}
              aria-pressed={isSpeaking}
            >
              {isLoadingVoices ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {isSpeaking ? (
                    <VolumeX className="h-4 w-4 mr-1" />
                  ) : (
                    <Volume2 className="h-4 w-4 mr-1" />
                  )}
                </>
              )}
              {showText && (isSpeaking ? 'Stop' : 'Speak')}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isSpeaking ? 'Stop speaking' : 'Read aloud'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default AIVoiceButton; 