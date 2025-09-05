import { getOpenRouter } from '@/utils/openRouterAPI';

interface MediaItem {
  title: string;
  url: string;
  thumbnail?: string;
  type: 'video' | 'music';
  source: string;
  duration?: string;
}

// Demo media items to use as fallbacks
const demoMediaByEmotion: Record<string, MediaItem[]> = {
  joy: [
    {
      title: "Pharrell Williams - Happy (Official Music Video)",
      url: "https://www.youtube.com/watch?v=ZbZSe6N_BXs",
      thumbnail: "https://i.ytimg.com/vi/ZbZSe6N_BXs/hqdefault.jpg",
      type: "music",
      source: "YouTube",
      duration: "4:07"
    },
    {
      title: "10 Minutes of Beautiful Nature Scenes to Boost Your Happiness",
      url: "https://www.youtube.com/watch?v=oHYyX9jLl3c",
      thumbnail: "https://i.ytimg.com/vi/oHYyX9jLl3c/hqdefault.jpg",
      type: "video",
      source: "YouTube",
      duration: "10:21"
    },
    {
      title: "Morning Meditation: Start Your Day with Positive Energy",
      url: "https://www.youtube.com/watch?v=_DTmGtznab4",
      thumbnail: "https://i.ytimg.com/vi/_DTmGtznab4/hqdefault.jpg",
      type: "video",
      source: "YouTube",
      duration: "15:03"
    }
  ],
  sadness: [
    {
      title: "Calming Piano Music for Emotional Healing",
      url: "https://www.youtube.com/watch?v=5pBjopDymts",
      thumbnail: "https://i.ytimg.com/vi/5pBjopDymts/hqdefault.jpg",
      type: "music",
      source: "YouTube",
      duration: "3:18:42"
    },
    {
      title: "Rain Sounds for Sleeping | Relaxing White Noise",
      url: "https://www.youtube.com/watch?v=yIQd2Ya0Ziw",
      thumbnail: "https://i.ytimg.com/vi/yIQd2Ya0Ziw/hqdefault.jpg",
      type: "music",
      source: "YouTube",
      duration: "10:00:00"
    },
    {
      title: "Guided Meditation for Healing Sadness",
      url: "https://www.youtube.com/watch?v=TAdar4FL3A0",
      thumbnail: "https://i.ytimg.com/vi/TAdar4FL3A0/hqdefault.jpg",
      type: "video",
      source: "YouTube",
      duration: "20:17"
    }
  ],
  anger: [
    {
      title: "Calming Music to Relieve Anger and Frustration",
      url: "https://www.youtube.com/watch?v=lFcSrYw-ARY",
      thumbnail: "https://i.ytimg.com/vi/lFcSrYw-ARY/hqdefault.jpg",
      type: "music",
      source: "YouTube",
      duration: "3:02:48"
    },
    {
      title: "5-Minute Deep Breathing Exercise to Calm Anger",
      url: "https://www.youtube.com/watch?v=F28MGLlpP90",
      thumbnail: "https://i.ytimg.com/vi/F28MGLlpP90/hqdefault.jpg",
      type: "video",
      source: "YouTube",
      duration: "5:23"
    },
    {
      title: "Nature Sounds for Stress Relief and Relaxation",
      url: "https://www.youtube.com/watch?v=eKFTSSKCzWA",
      thumbnail: "https://i.ytimg.com/vi/eKFTSSKCzWA/hqdefault.jpg",
      type: "music",
      source: "YouTube",
      duration: "3:00:00"
    }
  ],
  fear: [
    {
      title: "Anxiety Relief Music - Calm Your Mind and Relax",
      url: "https://www.youtube.com/watch?v=lFcSrYw-ARY",
      thumbnail: "https://i.ytimg.com/vi/lFcSrYw-ARY/hqdefault.jpg",
      type: "music",
      source: "YouTube",
      duration: "3:02:48"
    },
    {
      title: "Guided Meditation for Anxiety & Stress Relief",
      url: "https://www.youtube.com/watch?v=Fpiw2hH-dlc",
      thumbnail: "https://i.ytimg.com/vi/Fpiw2hH-dlc/hqdefault.jpg",
      type: "video",
      source: "YouTube",
      duration: "15:22"
    },
    {
      title: "432 Hz Anxiety Relief - Peaceful Music for Deep Relaxation",
      url: "https://www.youtube.com/watch?v=n3Xv_g3g-mA",
      thumbnail: "https://i.ytimg.com/vi/n3Xv_g3g-mA/hqdefault.jpg",
      type: "music",
      source: "YouTube",
      duration: "1:10:01"
    }
  ],
  surprise: [
    {
      title: "Most Beautiful Landscapes in 4K",
      url: "https://www.youtube.com/watch?v=5J9GZfXrPcQ",
      thumbnail: "https://i.ytimg.com/vi/5J9GZfXrPcQ/hqdefault.jpg",
      type: "video",
      source: "YouTube",
      duration: "10:10"
    },
    {
      title: "Inspiring Instrumental Music - Uplifting and Motivational",
      url: "https://www.youtube.com/watch?v=LY39km8sSYQ",
      thumbnail: "https://i.ytimg.com/vi/LY39km8sSYQ/hqdefault.jpg",
      type: "music",
      source: "YouTube",
      duration: "1:28:12"
    }
  ],
  love: [
    {
      title: "Romantic Piano Music - Peaceful and Beautiful",
      url: "https://www.youtube.com/watch?v=5pBjopDymts",
      thumbnail: "https://i.ytimg.com/vi/5pBjopDymts/hqdefault.jpg",
      type: "music",
      source: "YouTube",
      duration: "3:18:42"
    },
    {
      title: "Heart Opening Meditation For Love and Connection",
      url: "https://www.youtube.com/watch?v=H8S0qhDIH30",
      thumbnail: "https://i.ytimg.com/vi/H8S0qhDIH30/hqdefault.jpg",
      type: "video",
      source: "YouTube",
      duration: "20:41"
    }
  ],
  neutral: [
    {
      title: "Focus Music for Work and Studying - 3 Hours",
      url: "https://www.youtube.com/watch?v=CMhKDblFl1U",
      thumbnail: "https://i.ytimg.com/vi/CMhKDblFl1U/hqdefault.jpg",
      type: "music",
      source: "YouTube",
      duration: "3:06:44"
    },
    {
      title: "Mindfulness Meditation - 20 Minutes",
      url: "https://www.youtube.com/watch?v=I7h-BSa8RGI",
      thumbnail: "https://i.ytimg.com/vi/I7h-BSa8RGI/hqdefault.jpg",
      type: "video",
      source: "YouTube",
      duration: "20:22"
    },
    {
      title: "Peaceful Ambient Music for Focus and Creativity",
      url: "https://www.youtube.com/watch?v=sjkrrmBnpGE",
      thumbnail: "https://i.ytimg.com/vi/sjkrrmBnpGE/hqdefault.jpg",
      type: "music",
      source: "YouTube",
      duration: "3:02:51"
    }
  ]
};

/**
 * Get media recommendations based on an emotional state using AI-powered analysis
 */
export async function getMediaRecommendations(emotion: string, intensity?: number): Promise<MediaItem[]> {
  // First, try to get AI-enhanced recommendations
  try {
    const aiMedia = await fetchAIMediaRecommendations(emotion, intensity);
    if (aiMedia && aiMedia.length > 0) {
      return aiMedia;
    }
  } catch (error) {
    console.error("Error fetching AI media recommendations:", error);
  }
  
  // Fall back to demo data if AI recommendations fail
  return getDefaultMediaForEmotion(emotion);
}

/**
 * Use OpenRouter/Qwen to generate personalized media recommendations
 */
async function fetchAIMediaRecommendations(emotion: string, intensity?: number): Promise<MediaItem[]> {
  // First check if OpenRouter is available
  try {
    // Try to get the API key
    const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
    const OPENROUTER_MODEL = import.meta.env.VITE_OPENROUTER_MODEL || "qwen/qwen2.5-72b-instruct";
    
    if (!OPENROUTER_API_KEY) {
      throw new Error("OpenRouter API key not available");
    }
    
    const promptForVideos = `Based on the emotional state of "${emotion}" with intensity ${intensity || 5}/10, suggest 2-3 videos and 2-3 music pieces from YouTube that would be therapeutic or helpful. For each, provide only: title, YouTube URL, type (video/music), source (YouTube), and approximate duration. Format as a JSON array only.`;
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://mindmate-app.com"
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: "system",
            content: "You are an expert in music and video therapy who recommends content to help with emotional wellbeing."
          },
          {
            role: "user",
            content: promptForVideos
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      })
    });
    
    if (!response.ok) {
      console.error(`OpenRouter API error: ${response.status}`);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      console.error("Invalid API response structure", result);
      throw new Error("Invalid API response structure");
    }
    
    const content = result.choices[0].message.content;
    
    // Extract JSON from the response
    let jsonContent;
    try {
      if (content.includes("```json")) {
        jsonContent = content.split("```json")[1].split("```")[0].trim();
      } else if (content.includes("```")) {
        jsonContent = content.split("```")[1].trim();
      } else if (content.includes("[") && content.includes("]")) {
        const start = content.indexOf("[");
        const end = content.lastIndexOf("]") + 1;
        jsonContent = content.substring(start, end);
      } else {
        jsonContent = content;
      }
      
      const recommendations = JSON.parse(jsonContent);
      
      // Validate and format the recommendations
      return recommendations.map((item: any) => ({
        title: item.title || "Untitled",
        url: item.url || "https://www.youtube.com",
        thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${extractYouTubeID(item.url)}/hqdefault.jpg`,
        type: item.type || "video",
        source: item.source || "YouTube",
        duration: item.duration || ""
      }));
    } catch (parseError) {
      console.error("Error parsing API response:", parseError, content);
      throw new Error("Failed to parse media recommendations");
    }
  } catch (error) {
    console.error("Error in AI media recommendations:", error);
    throw error;
  }
}

/**
 * Extract YouTube video ID from a YouTube URL
 */
function extractYouTubeID(url: string): string {
  try {
    if (!url) return '';
    
    // Handle various YouTube URL formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    return (match && match[2].length === 11) ? match[2] : '';
  } catch (error) {
    return '';
  }
}

/**
 * Get default media items for a given emotion from our pre-defined list
 */
function getDefaultMediaForEmotion(emotion: string): MediaItem[] {
  const lowerEmotion = emotion.toLowerCase();
  
  // Find the closest matching emotion in our demo data
  for (const key in demoMediaByEmotion) {
    if (lowerEmotion.includes(key) || key.includes(lowerEmotion)) {
      return demoMediaByEmotion[key];
    }
  }
  
  // Default to neutral if no match
  return demoMediaByEmotion.neutral;
}

/**
 * Check if a user is currently experiencing a specific emotion (for UI purposes)
 */
export function isUserFeeling(currentEmotion: string | null, targetEmotion: string): boolean {
  if (!currentEmotion) return false;
  
  const lowerCurrent = currentEmotion.toLowerCase();
  const lowerTarget = targetEmotion.toLowerCase();
  
  return lowerCurrent.includes(lowerTarget) || lowerTarget.includes(lowerCurrent);
} 