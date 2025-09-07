import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, BookOpen, Coffee, Music, Video, StickyNote, Footprints, Heart, Smile } from 'lucide-react';

type Emotion = 'joy' | 'sadness' | 'anger' | 'fear' | 'love' | 'surprise' | 'neutral';

interface EmotionSuggestionsDialogProps {
  emotion: Emotion;
  intensity?: number;
  trigger?: React.ReactNode;
}

// Suggestions based on emotion
const emotionSuggestions = {
  joy: {
    activities: [
      "Take a nature walk and absorb the positive energy",
      "Call a friend to share your good mood",
      "Write down what's making you happy in a journal",
      "Try a new hobby while you're feeling positive",
      "Dance to your favorite upbeat music"
    ],
    resources: [
      "Happy by Pharrell Williams (Music)",
      "Inside Out (Movie about emotions)",
      "The Happiness Project by Gretchen Rubin (Book)",
      "TED Talk: The Habits of Happiness by Matthieu Ricard",
      "Headspace's Happiness meditation pack"
    ],
    mindfulness: [
      "Practice gratitude meditation to amplify your joy",
      "Try 'savoring' - focus intently on what's bringing you joy",
      "Share your positive feelings with someone else",
      "Write a gratitude list",
      "Set intentions for maintaining this positive state"
    ]
  },
  sadness: {
    activities: [
      "Take a gentle walk outside",
      "Listen to calming music",
      "Take a warm bath or shower",
      "Reach out to a supportive friend",
      "Watch a comforting movie"
    ],
    resources: [
      "It's OK That You're Not OK by Megan Devine (Book)",
      "The Science of Well-Being (Yale Course on Coursera)",
      "Sad Songs Playlist (with uplifting endings)",
      "TED Talk: The Gift and Power of Emotional Courage by Susan David",
      "Tara Brach's RAIN meditation for difficult emotions"
    ],
    mindfulness: [
      "Practice self-compassion meditation",
      "Try deep breathing for 5 minutes",
      "Name your feelings without judgment",
      "Use the 'leaves on a stream' visualization",
      "Journal about your emotions without trying to fix them"
    ]
  },
  anger: {
    activities: [
      "Engage in physical exercise to release tension",
      "Practice deep breathing exercises",
      "Write down your thoughts without censoring",
      "Take a time-out from triggering situations",
      "Use stress-relief tools (stress ball, punching pillow)"
    ],
    resources: [
      "Anger Management for Dummies (Book)",
      "Why Zebras Don't Get Ulcers by Robert Sapolsky (Book)",
      "Calm app's anger management meditation series",
      "TED Talk: The Power of Emotional Intelligence by Daniel Goleman",
      "The School of Life's video on Managing Anger"
    ],
    mindfulness: [
      "Body scan meditation to release tension",
      "Recognize anger triggers without reacting",
      "Practice the STOP technique (Stop, Take a breath, Observe, Proceed)",
      "Loving-kindness meditation toward difficult people",
      "Visualize your anger as a separate entity you can observe"
    ]
  },
  fear: {
    activities: [
      "Practice progressive muscle relaxation",
      "Create a fear hierarchy and take small steps",
      "Talk to someone you trust about your fears",
      "Engage in grounding exercises (name 5 things you see, 4 you feel, etc.)",
      "Create art that expresses your fears"
    ],
    resources: [
      "Dare: The New Way to End Anxiety and Stop Panic Attacks by Barry McDonagh",
      "The Anxiety and Worry Workbook by David Clark and Aaron Beck",
      "Anxiety Slayer podcast",
      "TED Talk: How to Make Stress Your Friend by Kelly McGonigal",
      "Headspace's Anxiety collection"
    ],
    mindfulness: [
      "5-4-3-2-1 grounding technique",
      "Observe your fear without identifying with it",
      "Box breathing (inhale 4, hold 4, exhale 4, hold 4)",
      "Practice mindful movement like gentle yoga",
      "Visualize your fear shrinking in size"
    ]
  },
  love: {
    activities: [
      "Write a letter to someone you care about",
      "Perform a random act of kindness",
      "Create a playlist of songs that remind you of loved ones",
      "Plan a special experience for yourself or others",
      "Look through photos of positive memories"
    ],
    resources: [
      "The 5 Love Languages by Gary Chapman (Book)",
      "All About Love by bell hooks (Book)",
      "School of Life's 'Relationships' collection",
      "TED Talk: The Power of Vulnerability by Brené Brown",
      "Esther Perel's Where Should We Begin? podcast"
    ],
    mindfulness: [
      "Loving-kindness (Metta) meditation",
      "Heart-centered breathing practices",
      "Gratitude practice focused on relationships",
      "Self-compassion exercises",
      "Mindful communication practices"
    ]
  },
  surprise: {
    activities: [
      "Try something completely new today",
      "Take a different route home",
      "Reach out to someone you haven't spoken to in a while",
      "Research a topic you know nothing about",
      "Create a 'surprise jar' with activities to pick randomly"
    ],
    resources: [
      "Big Magic by Elizabeth Gilbert (Book)",
      "TED Talk: The Surprising Science of Happiness by Dan Gilbert",
      "Atlas Obscura (website for discovering surprising places)",
      "Radiolab podcast (explores surprising scientific discoveries)",
      "Mindfulness of the Unexpected meditation"
    ],
    mindfulness: [
      "Beginner's mind meditation",
      "Notice 5 things you've never noticed before",
      "Curiosity practice - ask 'what's interesting about this?'",
      "Open awareness meditation",
      "Mindful photography - take pictures of surprising things"
    ]
  },
  neutral: {
    activities: [
      "Set intentions for your day or week",
      "Declutter a space to create calm",
      "Explore a new neighborhood or park",
      "Create a vision board for future goals",
      "Practice a skill you'd like to improve"
    ],
    resources: [
      "The Power of Now by Eckhart Tolle (Book)",
      "TED Talk: The Art of Stillness by Pico Iyer",
      "Daily Calm meditations",
      "The Tim Ferriss Show podcast",
      "Learning How to Learn course on Coursera"
    ],
    mindfulness: [
      "Basic breath awareness meditation",
      "Body scan practice",
      "Walking meditation",
      "Mindful eating exercise",
      "Present moment awareness throughout daily activities"
    ]
  }
};

const EmotionSuggestionsDialog = ({ 
  emotion, 
  intensity = 5,
  trigger 
}) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('activities');
  
  // Set default tab based on emotion
  useEffect(() => {
    if (emotion === 'sadness' || emotion === 'fear') {
      setActiveTab('mindfulness');
    } else if (emotion === 'joy' || emotion === 'love') {
      setActiveTab('activities');
    } else {
      setActiveTab('resources');
    }
  }, [emotion]);
  
  // Get suggestions for current emotion
  const suggestions = emotionSuggestions[emotion];
  
  // Get icon based on emotion
  const getEmotionIcon = () => {
    switch(emotion) {
      case 'joy': return <Smile className="h-5 w-5 text-amber-500" />;
      case 'sadness': return <StickyNote className="h-5 w-5 text-blue-500" />;
      case 'anger': return <Coffee className="h-5 w-5 text-red-500" />;
      case 'fear': return <Footprints className="h-5 w-5 text-purple-500" />;
      case 'love': return <Heart className="h-5 w-5 text-pink-500" />;
      case 'surprise': return <Lightbulb className="h-5 w-5 text-cyan-500" />;
      default: return <Lightbulb className="h-5 w-5 text-gray-500" />;
    }
  };
  
  // Get title based on emotion
  const getDialogTitle = () => {
    switch(emotion) {
      case 'joy': return "Amplify Your Joy";
      case 'sadness': return "Gentle Support for Sadness";
      case 'anger': return "Healthy Ways to Process Anger";
      case 'fear': return "Managing Fear and Anxiety";
      case 'love': return "Nurturing Connection";
      case 'surprise': return "Embracing the Unexpected";
      default: return "Balanced Suggestions";
    }
  };
  
  // Get description based on emotion
  const getDialogDescription = () => {
    switch(emotion) {
      case 'joy': return "Suggestions to maintain and share your positive emotions";
      case 'sadness': return "Compassionate practices for when you're feeling down";
      case 'anger': return "Healthy outlets and understanding for anger";
      case 'fear': return "Tools to help navigate anxiety and fear";
      case 'love': return "Ways to nurture connection with yourself and others";
      case 'surprise': return "Embracing and exploring the unexpected";
      default: return "Balanced activities for your current state";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            variant="outline" 
            className="flex items-center gap-2 transition-all hover:bg-primary/10"
          >
            {getEmotionIcon()}
            <span>Suggestions</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {getEmotionIcon()}
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="activities" className="flex items-center gap-1">
              <Coffee className="h-4 w-4" />
              <span>Activities</span>
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              <span>Resources</span>
            </TabsTrigger>
            <TabsTrigger value="mindfulness" className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              <span>Mindfulness</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="activities" className="mt-4 space-y-4">
            <Card>
              <CardContent className="pt-6">
                <ul className="space-y-2">
                  {suggestions.activities.map((activity, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-sm">
                        {index + 1}
                      </div>
                      <span>{activity}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="resources" className="mt-4 space-y-4">
            <Card>
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  {suggestions.resources.map((resource, index) => (
                    <li key={index} className="flex items-start gap-2">
                      {index === 0 ? <Music className="h-4 w-4 mt-1" /> : 
                       index === 1 ? <Video className="h-4 w-4 mt-1" /> : 
                       index === 2 ? <BookOpen className="h-4 w-4 mt-1" /> : 
                       index === 3 ? <Video className="h-4 w-4 mt-1" /> : 
                       <Heart className="h-4 w-4 mt-1" />}
                      <span>{resource}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="mindfulness" className="mt-4 space-y-4">
            <Card>
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  {suggestions.mindfulness.map((practice, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                        ✦
                      </div>
                      <span>{practice}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmotionSuggestionsDialog; 