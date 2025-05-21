import { supabase } from './lib/supabase';
import { SupabaseConfig } from './lib/SupabaseConfig';

/**
 * A simple script to check if the required tables and views exist in Supabase.
 * This doesn't try to insert or modify data, so it should work even with RLS enabled.
 */
async function checkSupabaseTables() {
  console.log('Checking Supabase tables and views...');
  console.log('Using Supabase URL:', SupabaseConfig.url);
  
  const tables = [
    'journal_entries',
    'profiles',
    'journal_attachments'
  ];
  
  const views = [
    'emotion_stats'
  ];
  
  try {
    // Check connection first
    console.log('\nTesting Supabase connection...');
    const { error: connError } = await supabase.from('journal_entries').select('count(*)', { head: true, count: 'exact' });
    
    if (connError) {
      if (connError.code === '42501') { // Permission error due to RLS
        console.log('✅ Connected to Supabase (RLS is properly enabled)');
      } else if (connError.code === '42P01') { // Relation doesn't exist
        console.error('❌ Table "journal_entries" does not exist. Schema needs to be applied.');
        console.log('Run: npm run supabase:export');
        return;
      } else {
        console.error('❌ Connection error:', JSON.stringify(connError, null, 2));
        return;
      }
    } else {
      console.log('✅ Connected to Supabase');
    }
    
    // Check tables
    console.log('\nChecking tables:');
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('count(*)', { head: true, count: 'exact' });
        
        if (error && error.code === '42P01') {
          console.log(`❌ Table "${table}" does not exist`);
        } else {
          console.log(`✅ Table "${table}" exists`);
        }
      } catch (error) {
        console.error(`❌ Error checking table "${table}":`, error);
      }
    }
    
    // Check views
    console.log('\nChecking views:');
    for (const view of views) {
      try {
        const { error } = await supabase.from(view).select('count(*)', { head: true, count: 'exact' });
        
        if (error && error.code === '42P01') {
          console.log(`❌ View "${view}" does not exist`);
        } else {
          console.log(`✅ View "${view}" exists`);
        }
      } catch (error) {
        console.error(`❌ Error checking view "${view}":`, error);
      }
    }
    
    // Check RLS status via permission error
    console.log('\nChecking Row Level Security (RLS):');
    const { error: rlsError } = await supabase.from('journal_entries').insert([{ 
      id: 'test', 
      user_id: 'test',
      title: 'test',
      content: 'test',
      emotion: 'neutral'
    }]);
    
    if (rlsError && rlsError.code === '42501') {
      console.log('✅ Row Level Security is enabled (expected permission error)');
    } else if (rlsError) {
      console.log('⚠️ Unexpected error when checking RLS:', JSON.stringify(rlsError, null, 2));
    } else {
      console.log('⚠️ Row Level Security might be disabled - check your Supabase settings');
    }
    
    console.log('\nDatabase infrastructure check complete!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
checkSupabaseTables().catch(console.error);

// Make the script compatible with both ESM and CommonJS
export {}; 