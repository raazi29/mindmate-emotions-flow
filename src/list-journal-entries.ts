import { supabase } from './lib/supabase';
import { SupabaseConfig } from './lib/SupabaseConfig';

async function listJournalEntries() {
  console.log('Checking for journal entries in Supabase...');
  console.log('Using Supabase URL:', SupabaseConfig.url);
  
  try {
    // Check if we can connect to the database
    console.log('Attempting to connect to Supabase...');
    
    // Get count of entries
    const { data: countData, error: countError } = await supabase
      .from('journal_entries')
      .select('*', { count: 'exact' });
    
    if (countError) {
      console.error('❌ Error fetching entries:', JSON.stringify(countError, null, 2));
      return;
    }
    
    const count = countData?.length || 0;
    console.log(`✅ Found ${count} journal entries in the database`);
    
    if (count > 0) {
      // Get and display entries
      console.log('\nJournal Entries:');
      console.log('----------------');
      
      countData.forEach((entry, index) => {
        console.log(`\nEntry #${index + 1}:`);
        console.log(`ID: ${entry.id}`);
        console.log(`Title: ${entry.title}`);
        console.log(`Emotion: ${entry.emotion} (Intensity: ${entry.emotion_intensity || 'N/A'})`);
        console.log(`Created: ${new Date(entry.created_at).toLocaleString()}`);
        console.log(`Tags: ${entry.tags ? entry.tags.join(', ') : 'None'}`);
        console.log(`Content: ${entry.content.length > 50 ? entry.content.substring(0, 50) + '...' : entry.content}`);
      });
    }
    
    // Check if emotion_stats view is working
    console.log('\nChecking emotion statistics...');
    const { data: statsData, error: statsError } = await supabase
      .from('emotion_stats')
      .select('*');
    
    if (statsError) {
      console.error('❌ Error fetching emotion stats:', JSON.stringify(statsError, null, 2));
    } else {
      console.log(`✅ Found statistics for ${statsData.length} emotions`);
      if (statsData.length > 0) {
        console.log('\nEmotion Statistics:');
        console.log('------------------');
        statsData.forEach(stat => {
          console.log(`${stat.emotion}: ${stat.count} entries, Avg intensity: ${stat.avg_intensity || 'N/A'}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the function
listJournalEntries().catch(console.error);

// Make the script compatible with both ESM and CommonJS
export {}; 