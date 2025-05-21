// Simple emotion detection test for testing journal entries
// Run with: node src/emotionTest.js

// Simple emotion detection function for testing
function detectEmotion(text) {
  console.log('Analyzing text:', text);
  
  const lowerText = text.toLowerCase();
  const wordMap = {
    joy: ['happy', 'joy', 'excited', 'glad', 'wonderful', 'great', 'good'],
    sadness: ['sad', 'unhappy', 'depressed', 'down', 'miserable'],
    anger: ['angry', 'mad', 'furious', 'annoyed', 'frustrated'],
    fear: ['afraid', 'scared', 'frightened', 'worried', 'anxious'],
    love: ['love', 'adore', 'care', 'cherish', 'affection'],
    surprise: ['surprised', 'amazed', 'astonished', 'shocked', 'stunned'],
    neutral: ['okay', 'fine', 'alright', 'neutral', 'average']
  };
  
  // Count emotion words
  const counts = {
    joy: 0, 
    sadness: 0, 
    anger: 0, 
    fear: 0, 
    love: 0, 
    surprise: 0, 
    neutral: 1  // Default bias to neutral
  };
  
  // Count emotion words in text
  Object.entries(wordMap).forEach(([emotion, words]) => {
    words.forEach(word => {
      if (lowerText.includes(word)) {
        counts[emotion]++;
        console.log(`Found "${word}" -> ${emotion}`);
      }
    });
  });
  
  console.log('Emotion counts:', counts);
  
  // Find the emotion with highest count
  let maxEmotion = 'neutral';
  let maxCount = 0;
  
  Object.entries(counts).forEach(([emotion, count]) => {
    if (count > maxCount) {
      maxCount = count;
      maxEmotion = emotion;
    }
  });
  
  return {
    emotion: maxEmotion,
    intensity: Math.min(10, Math.max(1, maxCount + 4)) // Scale to 1-10
  };
}

// Test journal entries
const journalEntries = [
  { 
    title: "Great day at work",
    content: "Today was a really good day! I finished that project I've been working on for weeks. I feel happy and relieved."
  },
  {
    title: "Feeling down today",
    content: "I'm pretty sad about what happened yesterday. I feel down and disappointed with the outcome."
  },
  {
    title: "First journal entry",
    content: "This is my first entry in the journal. I'm trying out this application to track my thoughts."
  },
  {
    title: "Excited about new opportunities",
    content: "I got a new job offer! I'm excited about the potential and looking forward to this new chapter."
  }
];

// Process all test entries
journalEntries.forEach((entry, index) => {
  console.log(`\n---------- ENTRY ${index + 1}: ${entry.title} ----------`);
  const result = detectEmotion(entry.content);
  console.log(`Detected emotion: ${result.emotion} (intensity: ${result.intensity}/10)`);
  
  // Create entry object with emotion data
  const processedEntry = {
    title: entry.title,
    content: entry.content,
    emotion: result.emotion,
    intensity: result.intensity
  };
  
  console.log('Processed entry:', processedEntry);
});

console.log('\nAll tests complete. Check that emotions are properly detected.');
console.log('If everything looks good, this confirms the emotion detection is working.');
console.log('If your app is showing only "neutral" emotions, there may be an issue with:');
console.log('1. How the detectEmotion function is imported');
console.log('2. How the result is used in the Journal component');
console.log('3. Whether the component is properly re-rendering with the emotion data'); 