import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getMediaRecommendations, isUserFeeling } from '@/utils/mediaRecommendationService';
import { ExternalLink, Music, Film, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface MediaItem {
  title: string;
  url: string;
  thumbnail?: string;
  type: 'video' | 'music';
  source: string;
  duration?: string;
}

interface EmotionalMediaRecommendationsProps {
  emotion: string | null;
  intensity?: number;
}

const EmotionalMediaRecommendations = ({
  emotion,
  intensity = 5
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [likedItems, setLikedItems] = useState<Record<string, boolean>>({});
  const [dislikedItems, setDislikedItems] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  
  // Load media recommendations when emotion changes
  useEffect(() => {
    if (emotion) {
      setIsLoading(true);
      fetchRecommendations();
    }
  }, [emotion]);
  
  // Load liked/disliked items from localStorage
  useEffect(() => {
    try {
      const storedLiked = localStorage.getItem('mindmate_media_likes');
      const storedDisliked = localStorage.getItem('mindmate_media_dislikes');
      
      if (storedLiked) {
        setLikedItems(JSON.parse(storedLiked));
      }
      
      if (storedDisliked) {
        setDislikedItems(JSON.parse(storedDisliked));
      }
    } catch (error) {
      console.error("Error loading media preferences:", error);
    }
  }, []);
  
  // Save liked/disliked items to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('mindmate_media_likes', JSON.stringify(likedItems));
      localStorage.setItem('mindmate_media_dislikes', JSON.stringify(dislikedItems));
    } catch (error) {
      console.error("Error saving media preferences:", error);
    }
  }, [likedItems, dislikedItems]);
  
  const fetchRecommendations = async () => {
    if (!emotion) return;
    
    try {
      const recommendations = await getMediaRecommendations(emotion, intensity);
      setMediaItems(recommendations);
    } catch (error) {
      console.error("Error fetching media recommendations:", error);
      toast({
        title: "Couldn't load recommendations",
        description: "Error fetching personalized media content",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLike = (url: string) => {
    setLikedItems(prev => ({ ...prev, [url]: true }));
    setDislikedItems(prev => {
      const newDislikes = { ...prev };
      delete newDislikes[url];
      return newDislikes;
    });
    
    toast({
      title: "Recommendation saved",
      description: "We'll remember your preference for future suggestions",
      variant: "default"
    });
  };
  
  const handleDislike = (url: string) => {
    setDislikedItems(prev => ({ ...prev, [url]: true }));
    setLikedItems(prev => {
      const newLikes = { ...prev };
      delete newLikes[url];
      return newLikes;
    });
    
    toast({
      title: "Feedback recorded",
      description: "We'll adjust future recommendations",
      variant: "default"
    });
  };
  
  const filteredMedia = mediaItems.filter(item => {
    if (activeTab === 'all') return !dislikedItems[item.url];
    if (activeTab === 'videos') return item.type === 'video' && !dislikedItems[item.url];
    if (activeTab === 'music') return item.type === 'music' && !dislikedItems[item.url];
    return !dislikedItems[item.url];
  });
  
  // Determine which emotion we're targeting
  const getEmotionTitle = () => {
    if (!emotion) return "Your Current Mood";
    
    if (isUserFeeling(emotion, 'joy')) return "Joyful Mood";
    if (isUserFeeling(emotion, 'sadness')) return "When You're Feeling Down";
    if (isUserFeeling(emotion, 'anger')) return "Calming Your Mind";
    if (isUserFeeling(emotion, 'fear') || isUserFeeling(emotion, 'anxiety')) return "Anxiety Relief";
    if (isUserFeeling(emotion, 'surprise')) return "Inspirational Content";
    if (isUserFeeling(emotion, 'love')) return "Heart-Warming Content";
    
    return "Content for Your Mood";
  };
  
  const getEmotionDescription = () => {
    if (!emotion) return "Personalized content based on your emotional state";
    
    if (isUserFeeling(emotion, 'joy')) return "Uplifting content to keep your positive energy flowing";
    if (isUserFeeling(emotion, 'sadness')) return "Soothing content to provide comfort and perspective";
    if (isUserFeeling(emotion, 'anger')) return "Calming content to help manage frustration";
    if (isUserFeeling(emotion, 'fear') || isUserFeeling(emotion, 'anxiety')) return "Relaxing content to ease anxiety and promote calm";
    if (isUserFeeling(emotion, 'surprise')) return "Content to engage your sense of wonder and curiosity";
    if (isUserFeeling(emotion, 'love')) return "Content to nurture connection and warmth";
    
    return "Content selected to complement your current emotional state";
  };
  
  if (!emotion) {
    return null;
  }
  
  return (
    <Card className="shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{getEmotionTitle()}</CardTitle>
        <CardDescription>{getEmotionDescription()}</CardDescription>
      </CardHeader>
      
      <CardContent className="pb-2">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="music">Music</TabsTrigger>
          </TabsList>
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Finding the perfect content for your mood...</p>
            </div>
          ) : (
            <TabsContent value={activeTab} className="mt-0">
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {filteredMedia.length > 0 ? (
                  filteredMedia.map((item, index) => (
                    <motion.div
                      key={item.url}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                    >
                      <div className="flex gap-3 border rounded-lg p-3 hover:bg-muted/20 transition-colors">
                        <div className="w-24 h-16 flex-shrink-0 relative rounded-md overflow-hidden bg-muted/50">
                          {item.thumbnail ? (
                            <img 
                              src={item.thumbnail} 
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              {item.type === 'music' ? (
                                <Music className="h-6 w-6 text-muted-foreground" />
                              ) : (
                                <Film className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium line-clamp-2">{item.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              {item.type === 'music' ? 'Music' : 'Video'}
                            </span>
                            {item.duration && (
                              <span className="text-xs text-muted-foreground">
                                {item.duration}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <a 
                            href={item.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-emerald-500" 
                            onClick={() => handleLike(item.url)}
                            disabled={!!likedItems[item.url]}
                          >
                            <ThumbsUp className="h-3.5 w-3.5" fill={likedItems[item.url] ? "currentColor" : "none"} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-red-500"
                            onClick={() => handleDislike(item.url)}
                            disabled={!!dislikedItems[item.url]}
                          >
                            <ThumbsDown className="h-3.5 w-3.5" fill={dislikedItems[item.url] ? "currentColor" : "none"} />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No {activeTab === 'all' ? 'content' : activeTab} available for your current mood</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={fetchRecommendations}
                    >
                      Refresh Recommendations
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
      
      <CardFooter className="text-xs text-muted-foreground">
        <p>Content is sourced from publicly available videos and music</p>
      </CardFooter>
    </Card>
  );
};

export default EmotionalMediaRecommendations; 