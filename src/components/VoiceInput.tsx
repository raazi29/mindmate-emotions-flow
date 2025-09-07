import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, MicOff, Square, Volume2, VolumeX } from 'lucide-react';
import { voiceService } from '@/services/VoiceService';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceInputProps {
  onTranscript: (transcript: string) => void;
  onInterimTranscript?: (transcript: string) => void;
  disabled?: boolean;
  className?: string;
  showInterimResults?: boolean;
  language?: string;
}

const VoiceInput = ({
  onTranscript,
  onInterimTranscript,
  disabled = false,
  className = '',
  showInterimResults = true,
  language = 'en-US'
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    // Check if voice recognition is supported
    setIsSupported(voiceService.isRecognitionSupported());
    
    // Check microphone permission
    checkMicrophonePermission();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!showInterimResults) return;

    const unsubscribe = voiceService.onInterimResult((transcript) => {
      setInterimTranscript(transcript);
      onInterimTranscript?.(transcript);
    });

    return unsubscribe;
  }, [showInterimResults, onInterimTranscript]);

  const checkMicrophonePermission = async () => {
    try {
      const hasPermission = await voiceService.requestMicrophonePermission();
      setHasPermission(hasPermission);
    } catch (error) {
      setHasPermission(false);
    }
  };

  const startAudioVisualization = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      microphoneRef.current.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        setAudioLevel(average / 255);
        
        if (isRecording) {
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();
    } catch (error) {
      console.error('Error starting audio visualization:', error);
    }
  };

  const stopAudioVisualization = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setAudioLevel(0);
  };

  const startRecording = async () => {
    if (!isSupported || disabled) return;

    setError('');
    setInterimTranscript('');
    
    try {
      setIsRecording(true);
      startAudioVisualization();
      
      const transcript = await voiceService.startRecording({
        continuous: false,
        interimResults: showInterimResults,
        lang: language
      });
      
      if (transcript) {
        onTranscript(transcript);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Recording failed');
    } finally {
      setIsRecording(false);
      stopAudioVisualization();
      setInterimTranscript('');
    }
  };

  const stopRecording = () => {
    if (isRecording) {
      voiceService.stopRecording();
      setIsRecording(false);
      stopAudioVisualization();
    }
  };

  if (!isSupported) {
    return (
      <Alert className={className}>
        <VolumeX className="h-4 w-4" />
        <AlertDescription>
          Voice input is not supported in this browser. Please try Chrome, Edge, or Safari.
        </AlertDescription>
      </Alert>
    );
  }

  if (hasPermission === false) {
    return (
      <Alert className={className}>
        <MicOff className="h-4 w-4" />
        <AlertDescription>
          Microphone access is required for voice input. Please enable microphone permissions and refresh the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-4">
        <div className="relative">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled || hasPermission === null}
            variant={isRecording ? "destructive" : "default"}
            size="lg"
            className="relative overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {isRecording ? (
                <motion.div
                  key="recording"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-2"
                >
                  <Square className="h-4 w-4" />
                  Stop Recording
                </motion.div>
              ) : (
                <motion.div
                  key="start"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center gap-2"
                >
                  <Mic className="h-4 w-4" />
                  Start Recording
                </motion.div>
              )}
            </AnimatePresence>
          </Button>

          {/* Audio level visualization */}
          {isRecording && (
            <motion.div
              className="absolute inset-0 rounded-md border-2 border-primary"
              animate={{
                scale: 1 + audioLevel * 0.3,
                opacity: 0.3 + audioLevel * 0.7
              }}
              transition={{ duration: 0.1 }}
            />
          )}
        </div>

        {isRecording && (
          <div className="flex items-center gap-2">
            <motion.div
              className="w-2 h-2 bg-red-500 rounded-full"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <Badge variant="secondary">Recording...</Badge>
          </div>
        )}
      </div>

      {/* Interim transcript display */}
      <AnimatePresence>
        {showInterimResults && interimTranscript && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-muted rounded-lg border-l-4 border-primary"
          >
            <p className="text-sm text-muted-foreground mb-1">Listening...</p>
            <p className="text-sm italic">{interimTranscript}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio level indicator */}
      {isRecording && (
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              style={{ width: `${audioLevel * 100}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </div>
      )}

      {/* Instructions */}
      {!isRecording && (
        <p className="text-xs text-muted-foreground">
          Click the microphone button and speak clearly. Your speech will be converted to text.
        </p>
      )}
    </div>
  );
};

export default VoiceInput;