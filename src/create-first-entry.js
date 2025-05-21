// Script to create your first journal entry
// Run with: node src/create-first-entry.js

import { createClient } from '@supabase/supabase-js';

// Supabase credentials
const supabaseUrl = 'https://zxzcbzghdvlqnoallkfk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emNiemdoZHZscW5vYWxsa2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNjY4MzksImV4cCI6MjA2MTg0MjgzOX0.qcHM9XMX-3TAr_y7pZ-N4deQnH0DWZRukafaq0u7PLA';

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function createFirstEntry() {
  console.log('Starting the process to create your first journal entry...');
  
  try {
    // Step 1: Check if Row Level Security is enabled for journal_entries
    console.log('\nStep 1: Checking Row Level Security...');
    
    // Try to fetch data without authentication to see if RLS is preventing access
    const { data: checkData, error: checkError } = await supabase
      .from('journal_entries')
      .select('count(*)', { count: 'exact', head: true });
      
    if (checkError) {
      if (checkError.code === '42501' || checkError.message === '') {
        console.log('Row Level Security is enabled. This is expected for security.');
        console.log('You need to either:');
        console.log('1. Sign in through the application first');
        console.log('2. Create a user and manually authenticate');
        console.log('3. Temporarily disable RLS for testing (recommended for initial setup)');
      } else {
        console.error('Unexpected error checking database:', checkError);
        return;
      }
    } else {
      console.log('Row Level Security appears to be disabled. You can insert entries directly.');
    }
    
    // Step 2: Try to authenticate first
    console.log('\nStep 2: Trying to authenticate...');
    
    // Try email/password authentication with a test user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password123',
    });
    
    let user = authData?.user;
    
    if (authError) {
      console.log('Could not sign in. Trying to create a test user...');
      
      // Try to create a test user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'password123',
      });
      
      if (signUpError) {
        console.error('Could not create test user:', signUpError);
        console.log('Proceeding without authentication...');
      } else {
        user = signUpData.user;
        console.log('Created test user:', user.email);
      }
    } else {
      console.log('Successfully authenticated as:', user.email);
    }
    
    // Step 3: Create a journal entry
    console.log('\nStep 3: Creating a journal entry...');
    
    const testEntry = {
      // Use a random ID to avoid conflicts
      id: `entry-${Date.now()}`,
      // Use authenticated user ID or "system" if no user
      user_id: user?.id || 'system',
      title: 'My First Journal Entry',
      content: 'This is my first journal entry created with MindMate! #firstentry #journaling',
      emotion: 'joy',
      emotion_intensity: 8,
      tags: ['firstentry', 'journaling'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: entryData, error: entryError } = await supabase
      .from('journal_entries')
      .insert([testEntry])
      .select();
    
    if (entryError) {
      console.error('Failed to create journal entry:', entryError);
      
      if (entryError.code === '42501') {
        console.log('\nRLS is blocking the insert. Here are your options:');
        console.log('Option 1: Temporarily disable RLS for the journal_entries table:');
        console.log('  1. Go to Supabase Dashboard -> Authentication -> Policies');
        console.log('  2. Find the journal_entries table');
        console.log('  3. Turn off RLS temporarily');
        console.log('  4. Run this script again');
        console.log('  5. Remember to turn RLS back on after testing');
        console.log('\nOption 2: Insert from the Supabase Dashboard directly:');
        console.log('  1. Go to Table Editor');
        console.log('  2. Select journal_entries table');
        console.log('  3. Click "Insert row" and fill in the details manually');
      }
    } else {
      console.log('✅ Successfully created a journal entry!');
      console.log('Entry details:', entryData[0]);
      
      // Verify by retrieving
      console.log('\nVerifying entry...');
      const { data: verifyData, error: verifyError } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('id', testEntry.id);
        
      if (verifyError) {
        console.error('Error verifying entry:', verifyError);
      } else if (verifyData && verifyData.length > 0) {
        console.log('✅ Entry successfully verified in database!');
      } else {
        console.log('❌ Entry could not be verified. It may not have been saved.');
      }
    }
    
    // Final advice
    console.log('\nNext steps:');
    console.log('1. You should now be able to see your entries in the Journal app');
    console.log('2. Make sure you have added http://localhost:8082 to your CORS settings in Supabase');
    console.log('3. Sign in with the same user credentials in your application');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the script
createFirstEntry(); 