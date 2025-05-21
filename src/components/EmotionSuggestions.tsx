import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ArrowRight, Heart, Sparkles } from 'lucide-react';

type SuggestionType = 'meditation' | 'journaling' | 'exercise' | 'gratitude' | 'social';

interface Suggestion {
  type: SuggestionType;
  title: string;
  description: string;
  duration?: string;
  icon: string;
}

interface EmotionSuggestionsProps {
  emotion?: 'joy' | 'sadness' | 'anger' | 'fear' | 'love' | 'surprise' | 'neutral';
}

const SUGGESTIONS: Record<string, Suggestion[]> = {
  joy: [
    {
      type: 'gratitude',
      title: 'Gratitude Practice',
      description: "List three things you're grateful for to amplify your positive feelings.",
      duration: '5 min',
      icon: '🙏',
    },
    {
      type: 'social',
      title: 'Share Your Joy',
      description: 'Reach out to someone you care about and share your positive experience.',
      duration: '15 min',
      icon: '👥',
    },
  ],
  sadness: [
    {
      type: 'meditation',
      title: 'Gentle Loving-Kindness',
      description: 'A meditation focused on self-compassion and emotional healing.',
      duration: '10 min',
      icon: '🧘',
    },
    {
      type: 'journaling',
      title: 'Emotional Release',
      description: 'Write about your feelings without judgment to process emotions.',
      duration: '15 min',
      icon: '📝',
    },
  ],
  anger: [
    {
      type: 'exercise',
      title: 'Tension Release',
      description: 'Quick physical exercises to release pent-up energy and frustration.',
      duration: '7 min',
      icon: '💪',
    },
    {
      type: 'meditation',
      title: 'Calm Mind Meditation',
      description: 'A focused breathing exercise to cool down angry thoughts.',
      duration: '10 min',
      icon: '🧘',
    },
  ],
  fear: [
    {
      type: 'meditation',
      title: 'Grounding Exercise',
      description: 'Connect with your senses to bring yourself back to the present moment.',
      duration: '5 min',
      icon: '🌱',
    },
    {
      type: 'journaling',
      title: 'Fear Examination',
      description: 'Identify your fears and challenge irrational thoughts with evidence.',
      duration: '15 min',
      icon: '📝',
    },
  ],
  love: [
    {
      type: 'gratitude',
      title: 'Appreciation Practice',
      description: 'Express gratitude for the relationships in your life.',
      duration: '10 min',
      icon: '❤️',
    },
    {
      type: 'social',
      title: 'Connection Activity',
      description: 'Reach out to someone you care about and express your appreciation.',
      duration: '15 min',
      icon: '🤝',
    },
  ],
  surprise: [
    {
      type: 'meditation',
      title: 'Mindfulness Moment',
      description: 'Center yourself with this quick mindfulness practice.',
      duration: '3 min',
      icon: '✨',
    },
    {
      type: 'journaling',
      title: 'Unexpected Moments',
      description: 'Reflect on how surprises can lead to growth and new perspectives.',
      duration: '10 min',
      icon: '📝',
    },
  ],
  neutral: [
    {
      type: 'meditation',
      title: 'Awareness Expansion',
      description: 'Broaden your emotional awareness with this guided practice.',
      duration: '10 min',
      icon: '🔍',
    },
    {
      type: 'exercise',
      title: 'Energy Booster',
      description: 'Gentle movements to increase energy and emotional resonance.',
      duration: '7 min',
      icon: '⚡',
    },
  ],
};

const typeColors: Record<SuggestionType, string> = {
  meditation: 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 border-blue-200 dark:border-blue-800/50',
  journaling: 'bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-100 border-purple-200 dark:border-purple-800/50',
  exercise: 'bg-green-50 dark:bg-green-950/40 text-green-900 dark:text-green-100 border-green-200 dark:border-green-800/50',
  gratitude: 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 border-amber-200 dark:border-amber-800/50',
  social: 'bg-pink-50 dark:bg-pink-950/40 text-pink-900 dark:text-pink-100 border-pink-200 dark:border-pink-800/50'
};

const typeBadgeColors: Record<SuggestionType, string> = {
  meditation: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
  journaling: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200',
  exercise: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
  gratitude: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200',
  social: 'bg-pink-100 dark:bg-pink-900/50 text-pink-800 dark:text-pink-200'
};

const EmotionSuggestions: React.FC<EmotionSuggestionsProps> = ({ emotion = 'neutral' }) => {
  const suggestions = SUGGESTIONS[emotion] || SUGGESTIONS.neutral;
  const [activeSuggestion, setActiveSuggestion] = useState<number | null>(null);

  // Get background color based on emotion
  const getBackgroundColor = () => {
    if (emotion === 'joy') return 'bg-gradient-to-br from-amber-100/50 to-yellow-100/30 dark:from-amber-900/20 dark:to-yellow-900/10';
    if (emotion === 'sadness') return 'bg-gradient-to-br from-blue-100/50 to-indigo-100/30 dark:from-blue-900/20 dark:to-indigo-900/10';
    if (emotion === 'anger') return 'bg-gradient-to-br from-red-100/50 to-orange-100/30 dark:from-red-900/20 dark:to-orange-900/10';
    if (emotion === 'fear') return 'bg-gradient-to-br from-purple-100/50 to-violet-100/30 dark:from-purple-900/20 dark:to-violet-900/10';
    if (emotion === 'love') return 'bg-gradient-to-br from-pink-100/50 to-rose-100/30 dark:from-pink-900/20 dark:to-rose-900/10';
    if (emotion === 'surprise') return 'bg-gradient-to-br from-cyan-100/50 to-sky-100/30 dark:from-cyan-900/20 dark:to-sky-900/10';
    return 'bg-gradient-to-br from-gray-100/50 to-slate-100/30 dark:from-gray-900/20 dark:to-slate-900/10';
  };

  return (
    <Card className={`w-full ${getBackgroundColor()} border-none shadow-lg animate-fade-in h-full`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="h-5 w-5 text-primary" />
          Recommended for You
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suggestions.map((suggestion, index) => (
            <div 
              key={index} 
              className={`${typeColors[suggestion.type]} rounded-lg border shadow-sm transition-all hover:shadow-md ${
                activeSuggestion === index ? 'ring-2 ring-primary/50' : ''
              }`}
              onClick={() => setActiveSuggestion(activeSuggestion === index ? null : index)}
            >
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/70 dark:bg-white/10 text-2xl">
                    {suggestion.icon}
                  </div>
                  <div>
                    <h3 className="font-medium">{suggestion.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className={`px-2 py-0.5 rounded-full ${typeBadgeColors[suggestion.type]}`}>
                        {suggestion.type}
                      </span>
                      {suggestion.duration && (
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-0.5" />
                          {suggestion.duration}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-sm mb-3">
                  {suggestion.description}
                </p>
                <div className="flex justify-end">
                  <Button 
                    size="sm" 
                    className="group"
                  >
                    <span>Start Now</span>
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>
              </div>
              
              {activeSuggestion === index && (
                <div className={`p-3 border-t ${typeColors[suggestion.type].split(' ')[0]} border-t-current/10`}>
                  <h4 className="text-xs font-medium mb-2">What to expect:</h4>
                  <ul className="text-xs space-y-1 list-disc pl-4">
                    <li>Personalized guidance based on your current emotion</li>
                    <li>Simple instructions you can follow right away</li>
                    <li>Proven techniques to support your emotional well-being</li>
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmotionSuggestions;
