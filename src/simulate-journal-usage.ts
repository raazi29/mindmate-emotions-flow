import { supabase, journalOperations } from './lib/supabase';
import { v4 as uuid } from 'uuid';

/**
 * This script simulates how the Journal component interacts with Supabase.
 * It bypasses the RLS policies by following the same flow as the application.
 */
async function simulateJournalUsage() {
  console.log('Simulating journal usage to test Supabase storage...');
  
  try {
    // 1. Sign up a test user
    const email = `test_${Date.now()}@example.com`;
    const password = 'Test123456!';
    
    console.log(`Creating test user with email: ${email}`);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: 'Test User'
        }
      }
    });
    
    if (authError) {
      console.error('❌ Error creating test user:', authError.message);
      console.log('Trying to use an anonymous session instead...');
      await createEntryWithAnonymousSession();
      return;
    }
    
    const userId = authData.user?.id;
    if (!userId) {
      console.error('❌ No user ID returned after signup');
      await createEntryWithAnonymousSession();
      return;
    }
    
    console.log('✅ User created successfully with ID:', userId);
    
    // 2. Create a journal entry using the journalOperations service
    await createEntryWithUserId(userId);
    
  } catch (error) {
    console.error('❌ Error in simulation:', error);
  }
}

async function createEntryWithUserId(userId: string) {
  console.log('Creating journal entry with user ID:', userId);
  
  const entryId = uuid();
  const testEntry = {
    id: entryId,
    user_id: userId,
    title: 'My First Journal Entry',
    content: 'Today I tried using the MindMate Journal application with Supabase storage. It works great! #testing #journal',
    emotion: 'joy',
    emotion_intensity: 8,
    tags: ['testing', 'journal']
  };
  
  try {
    // This uses the same code path as the Journal component
    const savedEntry = await journalOperations.saveEntry(testEntry);
    
    console.log('✅ Journal entry created successfully!');
    console.log('Entry details:', JSON.stringify(savedEntry, null, 2));
    
    // Verify we can read it back
    const entries = await journalOperations.getEntries(userId);
    
    if (entries.length > 0) {
      console.log(`✅ Successfully retrieved ${entries.length} entries for user`);
      console.log('Most recent entry:', JSON.stringify(entries[0], null, 2));
    } else {
      console.log('⚠️ No entries found for user after creation');
    }
    
  } catch (error) {
    console.error('❌ Error saving journal entry:', error);
  }
}

async function createEntryWithAnonymousSession() {
  // Create an anonymous session-based authentication
  console.log('Creating anonymous session...');
  
  // Set to true to test the app's offline fallback
  const simulateOfflineMode = false;
  
  if (simulateOfflineMode) {
    console.log('Simulating offline mode with local storage only...');
    console.log('This would normally save to local storage and sync later');
    console.log('Check the Journal component for actual implementation');
    return;
  }
  
  // This is just a test - normally you'd use proper auth
  // but for testing we'll use a mock user ID
  const mockUserId = `mock-user-${Date.now()}`;
  
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.signInAnonymously();
    
    if (sessionError) {
      console.error('❌ Error creating anonymous session:', sessionError.message);
      console.log('Note: Anonymous auth needs to be enabled in Supabase Auth settings');
      return;
    }
    
    const anonUserId = sessionData.user?.id;
    if (!anonUserId) {
      console.error('❌ Anonymous auth succeeded but no user ID returned');
      return;
    }
    
    console.log('✅ Anonymous session created with ID:', anonUserId);
    await createEntryWithUserId(anonUserId);
    
  } catch (error) {
    console.error('❌ Error in anonymous session:', error);
  }
}

// Run the simulation
simulateJournalUsage().catch(console.error); 