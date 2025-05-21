import { supabase } from './lib/supabase';
import { v4 as uuid } from 'uuid';

/**
 * IMPORTANT: This approach is only for testing and should not be used in production.
 * It requires the RLS policies to be temporarily disabled in the Supabase dashboard.
 * 
 * Steps to temporarily disable RLS for testing:
 * 1. Go to your Supabase project dashboard
 * 2. Navigate to Table Editor
 * 3. Select the journal_entries table
 * 4. Click "Authentication" in the right sidebar
 * 5. Toggle off "Enable Row Level Security"
 * 6. Run this script
 * 7. IMPORTANT: Re-enable RLS after testing
 */
async function createDirectTestEntry() {
  console.log('Creating a direct test entry in Supabase...');
  console.log('NOTE: This requires temporarily disabling RLS in the Supabase dashboard');
  
  const entryId = uuid();
  const testUserId = uuid(); // We're creating a fictional user ID
  const now = new Date().toISOString();
  
  const testEntry = {
    id: entryId,
    user_id: testUserId,
    title: 'Direct Test Entry',
    content: 'This is a direct test entry created by bypassing RLS for testing purposes. #test #direct',
    emotion: 'surprise',
    emotion_intensity: 6,
    tags: ['test', 'direct'],
    created_at: now,
    updated_at: now,
    is_favorite: false
  };
  
  try {
    console.log('Inserting test entry...');
    
    const { data, error } = await supabase
      .from('journal_entries')
      .insert([testEntry])
      .select();
    
    if (error) {
      console.error('❌ Error creating test entry:', JSON.stringify(error, null, 2));
      console.log('\nIf RLS is enabled, you need to temporarily disable it:');
      console.log('1. Go to Supabase dashboard > Table Editor > journal_entries');
      console.log('2. Click "Authentication" in sidebar and disable RLS');
      console.log('3. Run this script again');
      console.log('4. IMPORTANT: Re-enable RLS after testing');
      return;
    }
    
    console.log('✅ Test entry created successfully!');
    console.log('Entry details:', JSON.stringify(data[0], null, 2));
    
    // List all entries to verify
    const { data: allEntries, error: listError } = await supabase
      .from('journal_entries')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (listError) {
      console.error('❌ Error listing entries:', JSON.stringify(listError, null, 2));
      return;
    }
    
    console.log(`\n✅ Database contains ${allEntries.length} journal entries`);
    
    // Display a few entries if there are any
    if (allEntries.length > 0) {
      console.log('\nMost recent entries:');
      console.log('-------------------');
      
      const displayEntries = allEntries.slice(0, 3); // Show up to 3 entries
      
      displayEntries.forEach((entry, index) => {
        console.log(`\nEntry #${index + 1}:`);
        console.log(`ID: ${entry.id}`);
        console.log(`User ID: ${entry.user_id}`);
        console.log(`Title: ${entry.title}`);
        console.log(`Emotion: ${entry.emotion} (Intensity: ${entry.emotion_intensity || 'N/A'})`);
        console.log(`Created: ${new Date(entry.created_at).toLocaleString()}`);
        console.log(`Tags: ${entry.tags ? entry.tags.join(', ') : 'None'}`);
      });
      
      if (allEntries.length > 3) {
        console.log(`\n... and ${allEntries.length - 3} more entries`);
      }
    }
    
    console.log('\n⚠️ IMPORTANT: Remember to re-enable RLS after testing!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the function
createDirectTestEntry().catch(console.error);

// Make the script compatible with both ESM and CommonJS
export {}; 