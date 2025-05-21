// Text-to-speech utilities for MindMate app
// This provides a consistent voice interface across components

// Voice configuration types
export type VoicePreset = 'default' | 'calm' | 'energetic' | 'supportive';

export interface VoiceOptions {
  rate?: number;      // 0.1 to 10, default is 1
  pitch?: number;     // 0 to 2, default is 1
  volume?: number;    // 0 to 1, default is 1
  lang?: string;      // e.g. 'en-US', 'en-GB'
  voice?: string;     // voice identifier
  preset?: VoicePreset;
}

// Voice presets for different emotional tones
export const VOICE_PRESETS: Record<VoicePreset, VoiceOptions> = {
  default: {
    rate: 1,
    pitch: 1,
    volume: 1,
    lang: 'en-US'
  },
  calm: {
    rate: 0.9,
    pitch: 0.9,
    volume: 0.9,
    lang: 'en-US'
  },
  energetic: {
    rate: 1.1,
    pitch: 1.1,
    volume: 1,
    lang: 'en-US'
  },
  supportive: {
    rate: 0.95,
    pitch: 1.05,
    volume: 1,
    lang: 'en-US'
  }
};

// Emotion-specific voice adjustments
export const EMOTION_VOICE_MAPPING: Record<string, VoicePreset> = {
  'joy': 'energetic',
  'love': 'energetic',
  'sadness': 'supportive',
  'anger': 'calm',
  'fear': 'supportive',
  'disgust': 'calm',
  'surprise': 'energetic',
  'neutral': 'default'
};

// Core speech synthesis class
class SpeechSynthesisService {
  private static instance: SpeechSynthesisService;
  private synthesis: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isAvailable: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private utteranceQueue: SpeechSynthesisUtterance[] = [];
  private isSpeaking: boolean = false;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis;
      this.isAvailable = !!this.synthesis;
      
      if (this.isAvailable) {
        // Initialize voices
        this.voices = this.synthesis.getVoices();
        
        // If voices aren't loaded yet, wait for them
        if (this.voices.length === 0) {
          this.synthesis.onvoiceschanged = () => {
            this.voices = this.synthesis.getVoices();
            console.log(`Loaded ${this.voices.length} voices`);
          };
        }
      }
    }
  }

  public static getInstance(): SpeechSynthesisService {
    if (!SpeechSynthesisService.instance) {
      SpeechSynthesisService.instance = new SpeechSynthesisService();
    }
    return SpeechSynthesisService.instance;
  }

  public isSupported(): boolean {
    return this.isAvailable;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.isAvailable) return [];
    
    // If voices are already loaded, return them
    if (this.voices.length > 0) {
      return this.voices;
    }
    
    // Otherwise, try to get them now
    if (this.synthesis) {
      this.voices = this.synthesis.getVoices();
    }
    
    return this.voices;
  }

  public async loadVoices(): Promise<SpeechSynthesisVoice[]> {
    if (!this.isAvailable || !this.synthesis) {
      return [];
    }
    
    // If voices are already loaded, return them
    if (this.voices.length > 0) {
      return this.voices;
    }
    
    // Try to load them asynchronously
    return new Promise((resolve) => {
      // First attempt immediate load
      const voices = this.synthesis?.getVoices() || [];
      if (voices.length > 0) {
        this.voices = voices;
        resolve(voices);
        return;
      }
      
      // Set a timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.log("Voice loading timed out");
        const availableVoices = this.synthesis?.getVoices() || [];
        this.voices = availableVoices;
        resolve(availableVoices);
      }, 2000);
      
      // Wait for voiceschanged event
      if (this.synthesis) {
        this.synthesis.onvoiceschanged = () => {
          clearTimeout(timeout);
          const loadedVoices = this.synthesis?.getVoices() || [];
          this.voices = loadedVoices;
          console.log(`Loaded ${loadedVoices.length} voices`);
          resolve(loadedVoices);
        };
      }
    });
  }

  public getBestVoice(lang: string = 'en-US', preferFemale: boolean = true): SpeechSynthesisVoice | null {
    if (!this.isAvailable) return null;
    
    const voices = this.getVoices();
    if (voices.length === 0) return null;
    
    // Try to find a match based on language and gender preference
    const langVoices = voices.filter(voice => voice.lang.startsWith(lang.slice(0, 2)));
    
    if (langVoices.length === 0) {
      return voices[0]; // Fallback to any voice
    }
    
    if (preferFemale) {
      const femaleVoice = langVoices.find(voice => 
        voice.name.toLowerCase().includes('female') || 
        voice.name.toLowerCase().includes('woman') ||
        voice.name.toLowerCase().includes('girl')
      );
      if (femaleVoice) return femaleVoice;
    } else {
      const maleVoice = langVoices.find(voice => 
        voice.name.toLowerCase().includes('male') || 
        voice.name.toLowerCase().includes('man') ||
        voice.name.toLowerCase().includes('boy')
      );
      if (maleVoice) return maleVoice;
    }
    
    // Fallback to the first voice for that language
    return langVoices[0];
  }

  public speak(text: string, options: VoiceOptions = {}): boolean {
    if (!this.isAvailable || !this.synthesis || !text) return false;
    
    // Create a new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply preset if specified
    if (options.preset) {
      const preset = VOICE_PRESETS[options.preset];
      utterance.rate = preset.rate || 1;
      utterance.pitch = preset.pitch || 1;
      utterance.volume = preset.volume || 1;
      if (preset.lang) utterance.lang = preset.lang;
    }
    
    // Apply individual options (these override preset options)
    if (options.rate !== undefined) utterance.rate = options.rate;
    if (options.pitch !== undefined) utterance.pitch = options.pitch;
    if (options.volume !== undefined) utterance.volume = options.volume;
    if (options.lang) utterance.lang = options.lang;
    
    // Find the appropriate voice if requested
    if (options.voice) {
      const voice = this.voices.find(v => v.name === options.voice);
      if (voice) utterance.voice = voice;
    } else {
      // Use best voice based on language
      const bestVoice = this.getBestVoice(utterance.lang);
      if (bestVoice) utterance.voice = bestVoice;
    }
    
    // Add to queue
    this.utteranceQueue.push(utterance);
    
    // Start speaking if not already
    this.processQueue();
    
    return true;
  }

  private processQueue(): void {
    if (!this.isAvailable || !this.synthesis) return;
    
    // If already speaking or queue is empty, do nothing
    if (this.isSpeaking || this.utteranceQueue.length === 0) {
      return;
    }
    
    this.isSpeaking = true;
    const utterance = this.utteranceQueue.shift()!;
    this.currentUtterance = utterance;
    
    // Set up event handlers
    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.processQueue();
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      this.isSpeaking = false;
      this.currentUtterance = null;
      this.processQueue();
    };
    
    // Speak
    this.synthesis.speak(utterance);
  }

  public stop(): void {
    if (!this.isAvailable || !this.synthesis) return;
    
    this.synthesis.cancel();
    this.utteranceQueue = [];
    this.isSpeaking = false;
    this.currentUtterance = null;
  }

  public pause(): void {
    if (!this.isAvailable || !this.synthesis) return;
    this.synthesis.pause();
  }

  public resume(): void {
    if (!this.isAvailable || !this.synthesis) return;
    this.synthesis.resume();
  }

  public isSpeechActive(): boolean {
    if (!this.isAvailable || !this.synthesis) return false;
    return this.synthesis.speaking || this.synthesis.pending;
  }
}

// Export singleton instance
export const speechService = SpeechSynthesisService.getInstance();

// Helper functions
export function getVoicePresetForEmotion(emotion: string): VoicePreset {
  // Normalize emotion string
  const normalizedEmotion = emotion?.toLowerCase().trim() || 'neutral';
  
  // Handle emoji if present
  let cleanEmotion = normalizedEmotion;
  if (normalizedEmotion.includes('😊')) cleanEmotion = 'joy';
  if (normalizedEmotion.includes('😢')) cleanEmotion = 'sadness';
  if (normalizedEmotion.includes('😠')) cleanEmotion = 'anger';
  if (normalizedEmotion.includes('😨')) cleanEmotion = 'fear';
  if (normalizedEmotion.includes('🤢')) cleanEmotion = 'disgust';
  if (normalizedEmotion.includes('😲')) cleanEmotion = 'surprise';
  if (normalizedEmotion.includes('❤️')) cleanEmotion = 'love';
  if (normalizedEmotion.includes('😐')) cleanEmotion = 'neutral';
  
  // Look up in mapping or return default
  for (const key in EMOTION_VOICE_MAPPING) {
    if (cleanEmotion.includes(key)) {
      return EMOTION_VOICE_MAPPING[key];
    }
  }
  
  return 'default';
}

// Helper to extract a speakable text from content
export function getTextToSpeech(content: any): string {
  if (!content) return '';
  
  if (typeof content === 'string') {
    return content;
  }
  
  if (typeof content === 'object') {
    // Handle nested content objects like in resources
    if (content.text) {
      return content.text;
    }
    
    if (content.description) {
      return content.description;
    }
  }
  
  return '';
} 