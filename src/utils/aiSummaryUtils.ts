// AI utilities for generating summaries and key points from content
import { getOpenRouter } from './openRouterAPI';

/**
 * Generate a summary of the provided content using AI
 * @param content The content to summarize
 * @param maxLength Optional maximum length for the summary
 * @returns A promise resolving to the summary text
 */
export async function generateAISummary(content: string, maxLength: number = 200): Promise<string> {
  if (!content || content.length < 100) return content;
  
  // If the content is already short enough, just return it
  if (content.length <= maxLength) return content;
  
  // If we have OpenRouter API available, use that
  if (getOpenRouter()) {
    return generateOpenRouterSummary(content, maxLength);
  }
  
  // Fallback to simple extractive summarization
  return generateSimpleSummary(content, maxLength);
}

/**
 * Generate a summary using OpenRouter API
 */
async function generateOpenRouterSummary(content: string, maxLength: number = 200): Promise<string> {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/wellness-assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: content,
        max_length: maxLength
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const result = await response.json();
    return result.summary;
  } catch (error) {
    console.error('Error generating AI summary:', error);
    // Fallback to simple summary on error
    return generateSimpleSummary(content, maxLength);
  }
}

/**
 * Simple extractive summarization that doesn't need AI
 * This is a fallback when the API is not available
 */
function generateSimpleSummary(content: string, maxLength: number): string {
  // Remove markdown formatting
  const plainText = content
    .replace(/#+\s+(.*)/g, '$1. ') // Headers to sentences
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1') // Italic
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
    .replace(/```[\s\S]*?```/g, '') // Code blocks
    .replace(/`(.*?)`/g, '$1') // Inline code
    .replace(/^>.*$/gm, '') // Blockquotes
    .replace(/\n+/g, ' ') // Newlines to spaces
    .replace(/\s+/g, ' '); // Multiple spaces to single space
    
  // Split into sentences
  const sentences = plainText.match(/[^.!?]+[.!?]+/g) || [];
  
  if (sentences.length === 0) {
    // If we couldn't split into sentences, just truncate
    return plainText.length > maxLength 
      ? plainText.substring(0, maxLength) + '...' 
      : plainText;
  }
  
  // Take sentences until we exceed maxLength
  let summary = '';
  let currentLength = 0;
  
  for (const sentence of sentences) {
    if (currentLength + sentence.length > maxLength) {
      break;
    }
    summary += sentence + ' ';
    currentLength += sentence.length + 1;
  }
  
  return summary.trim();
}

/**
 * Extract key points from content
 * @param content The content to analyze
 * @param numPoints The number of key points to extract
 * @returns An array of key points
 */
export function extractKeyPoints(content: string, numPoints: number = 3): string[] {
  if (!content) return [];
  
  // Simple extraction of sentences that look like key points
  const plainText = content
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1') // Italic
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
    .replace(/```[\s\S]*?```/g, '') // Code blocks
    .replace(/`(.*?)`/g, '$1'); // Inline code
    
  // Find sentences that might be key points (short, with important-sounding words)
  const sentences = plainText.match(/[^.!?]+[.!?]+/g) || [];
  
  // Weight sentences by indicators of importance
  const weightedSentences = sentences.map(sentence => {
    let weight = 0;
    
    // Prefer sentences with important indicators
    const importantPhrases = ['key', 'important', 'essential', 'critical', 'remember', 'note', 'tip', 'practice'];
    importantPhrases.forEach(phrase => {
      if (sentence.toLowerCase().includes(phrase)) {
        weight += 3;
      }
    });
    
    // Prefer sentences from bullet points
    if (sentence.trim().startsWith('-') || sentence.trim().startsWith('•')) {
      weight += 2;
    }
    
    // Prefer medium-length sentences (not too short, not too long)
    const words = sentence.split(/\s+/).length;
    if (words >= 5 && words <= 20) {
      weight += 2;
    }
    
    return { sentence, weight };
  });
  
  // Sort by weight and take the top numPoints
  const sorted = weightedSentences.sort((a, b) => b.weight - a.weight);
  const keyPoints = sorted.slice(0, numPoints).map(item => item.sentence.trim());
  
  // Ensure we return at least numPoints items, even if they're not ideal
  if (keyPoints.length < numPoints && sentences.length >= numPoints) {
    const additionalPoints = sentences
      .filter(s => !keyPoints.includes(s))
      .slice(0, numPoints - keyPoints.length)
      .map(s => s.trim());
      
    keyPoints.push(...additionalPoints);
  }
  
  return keyPoints;
}

/**
 * Process multiple resources in batch to add AI summaries
 * This helps reduce processing time and API calls
 * @param resources Array of resources to enhance
 * @param maxBatchSize Maximum batch size for processing
 * @returns A promise resolving to an array of enhanced resources
 */
export async function batchEnhanceResourcesWithAI(
  resources: any[], 
  maxBatchSize: number = 3
): Promise<any[]> {
  if (!resources || resources.length === 0) return resources;
  
  // Create a copy of the resources to avoid modifying the original
  const enhancedResources = [...resources];
  
  // Check which resources need enhancement
  const resourcesToEnhance = enhancedResources.filter(
    resource => resource.content?.text && !resource.ai_summary
  );
  
  if (resourcesToEnhance.length === 0) {
    console.log('No resources need AI enhancement');
    return enhancedResources;
  }
  
  console.log(`Enhancing ${resourcesToEnhance.length} resources with AI summaries`);
  
  try {
    // Process resources in batches to avoid overwhelming the API
    for (let i = 0; i < resourcesToEnhance.length; i += maxBatchSize) {
      const batch = resourcesToEnhance.slice(i, i + maxBatchSize);
      
      // Process each resource in the batch concurrently
      await Promise.all(batch.map(async (resource) => {
        try {
          // Maximum retry attempts
          const maxRetries = 3;
          let summary = null;
          
          for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
              // Try to get summary from local storage first
              const cachedSummary = localStorage.getItem(`resource_summary_${resource.id}`);
              if (cachedSummary) {
                summary = cachedSummary;
                console.log(`Using cached summary for resource ${resource.id}`);
                break;
              }
              
              // Otherwise, get summary from API
              const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/wellness-assistant`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  text: resource.content.text,
                  max_length: 250
                }),
                signal: AbortSignal.timeout(8000) // 8 second timeout
              });
              
              if (!response.ok) {
                throw new Error(`Backend API error: ${response.status}`);
              }
              
              const result = await response.json();
              summary = result.summary;
              
              // Cache the summary
              localStorage.setItem(`resource_summary_${resource.id}`, summary);
              console.log(`Generated summary for resource ${resource.id}`);
              
              // Break the retry loop on success
              break;
              
            } catch (error) {
              console.error(`Summary generation attempt ${attempt + 1} failed for resource ${resource.id}:`, error);
              
              // Wait before retrying (increasing delay with each attempt)
              if (attempt < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
              }
            }
          }
          
          // Update the resource with the summary if we got one
          if (summary) {
            const resourceIndex = enhancedResources.findIndex(r => r.id === resource.id);
            if (resourceIndex !== -1) {
              enhancedResources[resourceIndex] = {
                ...enhancedResources[resourceIndex],
                ai_summary: summary
              };
            }
          }
          
        } catch (error) {
          console.error(`Error enhancing resource ${resource.id}:`, error);
          // Continue with other resources even if one fails
        }
      }));
      
      // Small delay between batches to avoid overwhelming the API
      if (i + maxBatchSize < resourcesToEnhance.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log('Resource enhancement with AI completed');
    return enhancedResources;
    
  } catch (error) {
    console.error('Error in batch enhancing resources with AI:', error);
    return enhancedResources; // Return the original resources in case of error
  }
} 