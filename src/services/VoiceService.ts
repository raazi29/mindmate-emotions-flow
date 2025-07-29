export interface SpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice;
  lang?: string;
}

export interface VoiceRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  lang?: string;
}

class VoiceService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis;
  private isRecording = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
    } else if ('SpeechRecognition' in window) {
      this.recognition = new (window as any).SpeechRecognition();
    }

    if (this.recognition) {
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = 'en-US';
    }
  }

  // Speech Recognition Methods
  isRecognitionSupported(): boolean {
    return this.recognition !== null;
  }

  async startRecording(options: VoiceRecognitionOptions = {}): Promise<string> {
    if (!this.recognition) {
      throw new Error('Speech recognition is not supported in this browser');
    }

    if (this.isRecording) {
      throw new Error('Recording is already in progress');
    }

    // Apply options
    if (options.continuous !== undefined) {
      this.recognition.continuous = options.continuous;
    }
    if (options.interimResults !== undefined) {
      this.recognition.interimResults = options.interimResults;
    }
    if (options.maxAlternatives !== undefined) {
      this.recognition.maxAlternatives = options.maxAlternatives;
    }
    if (options.lang) {
      this.recognition.lang = options.lang;
    }

    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not available'));
        return;
      }

      let finalTranscript = '';
      let interimTranscript = '';

      this.recognition.onstart = () => {
        this.isRecording = true;
      };

      this.recognition.onresult = (event) => {
        interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Dispatch interim results if enabled
        if (options.interimResults && interimTranscript) {
          this.dispatchInterimResult(interimTranscript);
        }
      };

      this.recognition.onend = () => {
        this.isRecording = false;
        resolve(finalTranscript.trim());
      };

      this.recognition.onerror = (event) => {
        this.isRecording = false;
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      this.recognition.start();
    });
  }

  stopRecording(): void {
    if (this.recognition && this.isRecording) {
      this.recognition.stop();
    }
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  private dispatchInterimResult(transcript: string): void {
    // Dispatch custom event for interim results
    window.dispatchEvent(new CustomEvent('voiceInterimResult', {
      detail: { transcript }
    }));
  }

  // Text-to-Speech Methods
  isSpeechSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.synthesis.getVoices();
  }

  async waitForVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      const voices = this.synthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
      } else {
        this.synthesis.onvoiceschanged = () => {
          resolve(this.synthesis.getVoices());
        };
      }
    });
  }

  async speak(text: string, options: SpeechOptions = {}): Promise<void> {
    if (!this.isSpeechSupported()) {
      throw new Error('Text-to-speech is not supported in this browser');
    }

    // Stop any current speech
    this.stopSpeaking();

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply options
      utterance.rate = options.rate ?? 1;
      utterance.pitch = options.pitch ?? 1;
      utterance.volume = options.volume ?? 1;
      utterance.lang = options.lang ?? 'en-US';
      
      if (options.voice) {
        utterance.voice = options.voice;
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      this.currentUtterance = utterance;
      this.synthesis.speak(utterance);
    });
  }

  stopSpeaking(): void {
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
    }
    this.currentUtterance = null;
  }

  pauseSpeaking(): void {
    if (this.synthesis.speaking) {
      this.synthesis.pause();
    }
  }

  resumeSpeaking(): void {
    if (this.synthesis.paused) {
      this.synthesis.resume();
    }
  }

  isSpeaking(): boolean {
    return this.synthesis.speaking;
  }

  isPaused(): boolean {
    return this.synthesis.paused;
  }

  // Utility Methods
  async getEmotionAwareVoice(emotion: string): Promise<SpeechSynthesisVoice | null> {
    const voices = await this.waitForVoices();
    
    // Voice selection based on emotion
    const voicePreferences: Record<string, string[]> = {
      joy: ['female', 'cheerful', 'bright'],
      sadness: ['soft', 'gentle', 'calm'],
      anger: ['strong', 'firm', 'assertive'],
      fear: ['gentle', 'soft', 'reassuring'],
      love: ['warm', 'gentle', 'caring'],
      surprise: ['expressive', 'dynamic'],
      neutral: ['natural', 'clear']
    };

    const preferences = voicePreferences[emotion] || voicePreferences.neutral;
    
    // Try to find a voice that matches preferences
    for (const preference of preferences) {
      const matchingVoice = voices.find(voice => 
        voice.name.toLowerCase().includes(preference) ||
        voice.lang.includes('en')
      );
      if (matchingVoice) return matchingVoice;
    }

    // Fallback to first English voice
    return voices.find(voice => voice.lang.includes('en')) || voices[0] || null;
  }

  async speakWithEmotion(text: string, emotion: string, options: Omit<SpeechOptions, 'voice'> = {}): Promise<void> {
    const voice = await this.getEmotionAwareVoice(emotion);
    
    // Adjust speech parameters based on emotion
    const emotionOptions: Record<string, Partial<SpeechOptions>> = {
      joy: { rate: 1.1, pitch: 1.2 },
      sadness: { rate: 0.8, pitch: 0.9 },
      anger: { rate: 1.2, pitch: 0.8 },
      fear: { rate: 0.9, pitch: 1.1 },
      love: { rate: 0.9, pitch: 1.1 },
      surprise: { rate: 1.3, pitch: 1.3 },
      neutral: { rate: 1.0, pitch: 1.0 }
    };

    const emotionSettings = emotionOptions[emotion] || emotionOptions.neutral;

    await this.speak(text, {
      ...emotionSettings,
      ...options,
      voice: voice || undefined
    });
  }

  // Permission and Feature Detection
  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  getFeatureSupport(): {
    speechRecognition: boolean;
    textToSpeech: boolean;
    microphone: boolean;
  } {
    return {
      speechRecognition: this.isRecognitionSupported(),
      textToSpeech: this.isSpeechSupported(),
      microphone: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices
    };
  }

  // Event Listeners for Voice Recognition
  onInterimResult(callback: (transcript: string) => void): () => void {
    const handler = (event: CustomEvent) => {
      callback(event.detail.transcript);
    };

    window.addEventListener('voiceInterimResult', handler as EventListener);
    
    return () => {
      window.removeEventListener('voiceInterimResult', handler as EventListener);
    };
  }
}

export const voiceService = new VoiceService();