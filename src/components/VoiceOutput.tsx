import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, Pause, Square, Volume2, VolumeX, Settings } from 'lucide-react';
import { voiceService, SpeechOptions } from '@/services/VoiceService';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

interface VoiceOutputProps {
  text: string;
  emotion?: string;
  disabled?: boolean;
  className?: string;
  autoPlay?: boolean;
  showControls?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

const VoiceOutput = ({
  text,
  emotion = 'neutral',
  disabled = false,
  className = '',
  autoPlay = false,
  showControls = true,
  onStart,
  onEnd,
  onError
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [speechOptions, setSpeechOptions] = useState<SpeechOptions>({
    rate: 1,
    pitch: 1,
    volume: 1,
    lang: 'en-US'
  });
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setIsSupported(voiceService.isSpeechSupported());
    loadVoices();
  }, []);

  useEffect(() => {
    if (autoPlay && text && isSupported && !disabled) {
      handlePlay();
    }
  }, [text, autoPlay, isSupported, disabled]);

  const loadVoices = async () => {
    try {
      const availableVoices = await voiceService.waitForVoices();
      setVoices(availableVoices);
      
      // Set default voice based on emotion
      if (availableVoices.length > 0 && !selectedVoice) {
        const emotionVoice = await voiceService.getEmotionAwareVoice(emotion);
        if (emotionVoice) {
          setSelectedVoice(emotionVoice.name);
        } else {
          setSelectedVoice(availableVoices[0].name);
        }
      }
    } catch (error) {
      console.error('Error loading voices:', error);
    }
  };

  const handlePlay = async () => {
    if (!text || !isSupported || disabled) return;

    setError('');
    
    try {
      setIsPlaying(true);
      setIsPaused(false);
      onStart?.();

      const voice = voices.find(v => v.name === selectedVoice);
      const options: SpeechOptions = {
        ...speechOptions,
        voice: voice || undefined
      };

      if (emotion !== 'neutral') {
        await voiceService.speakWithEmotion(text, emotion, options);
      } else {
        await voiceService.speak(text, options);
      }

      setIsPlaying(false);
      onEnd?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Speech failed';
      setError(errorMessage);
      setIsPlaying(false);
      onError?.(errorMessage);
    }
  };

  const handlePause = () => {
    if (isPlaying && !isPaused) {
      voiceService.pauseSpeaking();
      setIsPaused(true);
    }
  };

  const handleResume = () => {
    if (isPlaying && isPaused) {
      voiceService.resumeSpeaking();
      setIsPaused(false);
    }
  };

  const handleStop = () => {
    voiceService.stopSpeaking();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const updateSpeechOption = (key: keyof SpeechOptions, value: any) => {
    setSpeechOptions(prev => ({ ...prev, [key]: value }));
  };

  if (!isSupported) {
    return (
      <Alert className={className}>
        <VolumeX className="h-4 w-4" />
        <AlertDescription>
          Text-to-speech is not supported in this browser.
        </AlertDescription>
      </Alert>
    );
  }

  if (!text) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-2">
        {/* Play/Pause/Stop Controls */}
        <div className="flex items-center gap-1">
          {!isPlaying ? (
            <Button
              onClick={handlePlay}
              disabled={disabled}
              size="sm"
              variant="outline"
            >
              <Play className="h-4 w-4 mr-1" />
              Play
            </Button>
          ) : (
            <>
              {!isPaused ? (
                <Button
                  onClick={handlePause}
                  disabled={disabled}
                  size="sm"
                  variant="outline"
                >
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
              ) : (
                <Button
                  onClick={handleResume}
                  disabled={disabled}
                  size="sm"
                  variant="outline"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Resume
                </Button>
              )}
              <Button
                onClick={handleStop}
                disabled={disabled}
                size="sm"
                variant="outline"
              >
                <Square className="h-4 w-4 mr-1" />
                Stop
              </Button>
            </>
          )}
        </div>

        {/* Status Badge */}
        <AnimatePresence>
          {isPlaying && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Badge variant={isPaused ? "secondary" : "default"}>
                {isPaused ? 'Paused' : 'Speaking'}
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings */}
        {showControls && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h4 className="font-medium">Voice Settings</h4>
                
                {/* Voice Selection */}
                <div className="space-y-2">
                  <Label>Voice</Label>
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {voices.map((voice) => (
                        <SelectItem key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Rate Control */}
                <div className="space-y-2">
                  <Label>Speed: {speechOptions.rate?.toFixed(1)}x</Label>
                  <Slider
                    value={[speechOptions.rate || 1]}
                    onValueChange={([value]) => updateSpeechOption('rate', value)}
                    min={0.5}
                    max={2}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* Pitch Control */}
                <div className="space-y-2">
                  <Label>Pitch: {speechOptions.pitch?.toFixed(1)}</Label>
                  <Slider
                    value={[speechOptions.pitch || 1]}
                    onValueChange={([value]) => updateSpeechOption('pitch', value)}
                    min={0.5}
                    max={2}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* Volume Control */}
                <div className="space-y-2">
                  <Label>Volume: {Math.round((speechOptions.volume || 1) * 100)}%</Label>
                  <Slider
                    value={[speechOptions.volume || 1]}
                    onValueChange={([value]) => updateSpeechOption('volume', value)}
                    min={0}
                    max={1}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* Emotion Info */}
                {emotion !== 'neutral' && (
                  <div className="p-2 bg-muted rounded">
                    <p className="text-sm text-muted-foreground">
                      Voice adapted for: <span className="font-medium capitalize">{emotion}</span>
                    </p>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Text Preview */}
      <div className="p-3 bg-muted rounded-lg text-sm">
        <div className="flex items-center gap-2 mb-2">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Text to speak:</span>
        </div>
        <p className="line-clamp-3">{text}</p>
        {text.length > 150 && (
          <p className="text-xs text-muted-foreground mt-1">
            {text.length} characters • ~{Math.ceil(text.split(' ').length / 150)} minutes
          </p>
        )}
      </div>

      {/* Speaking Animation */}
      <AnimatePresence>
        {isPlaying && !isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-1"
          >
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-primary rounded-full"
                animate={{
                  height: [4, 16, 4],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoiceOutput;