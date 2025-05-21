import { supabase } from './lib/supabase';
import { v4 as uuid } from 'uuid';

async function createTestEntry() {
  console.log('Creating a test journal entry in Supabase...');
  
  try {
    console.log('Step 1: Creating a test user via Supabase Auth...');
    
    // First we need to sign up a test user
    const email = `test_${Date.now()}@example.com`;
    const password = 'Test123456!';
    
    // Create a test user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    });
    
    if (authError) {
      console.error('❌ Error creating test user:', JSON.stringify(authError, null, 2));
      // Try to sign in with existing credentials if it's already registered
      console.log('Attempting to sign in instead...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) {
        console.error('❌ Error signing in:', JSON.stringify(signInError, null, 2));
        console.log('Using an alternative approach with a demo user ID...');
        await createEntryWithDemoUser();
        return;
      }
      
      console.log('✅ Signed in with existing user');
      await createEntryWithUser(signInData.user.id);
      return;
    }
    
    console.log('✅ Test user created successfully!');
    console.log('User ID:', authData.user?.id);
    
    if (!authData.user?.id) {
      console.error('❌ User created but no ID returned');
      console.log('Using an alternative approach with a demo user ID...');
      await createEntryWithDemoUser();
      return;
    }
    
    await createEntryWithUser(authData.user.id);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function createEntryWithUser(userId: string) {
  const entryId = uuid();
  const now = new Date().toISOString();
  
  const testEntry = {
    id: entryId,
    user_id: userId,
    title: 'Test Journal Entry',
    content: 'This is a test entry to verify that Supabase is storing data properly. #test #database',
    emotion: 'joy',
    emotion_intensity: 7,
    tags: ['test', 'database'],
    created_at: now,
    updated_at: now,
    is_favorite: false
  };
  
  console.log('Inserting test entry with user ID:', userId);
  
  const { data, error } = await supabase
    .from('journal_entries')
    .insert([testEntry])
    .select();
  
  if (error) {
    console.error('❌ Error creating test entry:', JSON.stringify(error, null, 2));
    return;
  }
  
  console.log('✅ Test entry created successfully!');
  console.log('Entry details:', JSON.stringify(data[0], null, 2));
  
  // Try to read back the entry we just created
  const { data: readData, error: readError } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('id', entryId)
    .single();
  
  if (readError) {
    console.error('❌ Error reading back the test entry:', JSON.stringify(readError, null, 2));
    return;
  }
  
  console.log('✅ Successfully read back the test entry');
  console.log('Entry confirmed in database with ID:', readData.id);
}

async function createEntryWithDemoUser() {
  console.log('Note: This will not work with RLS enabled unless you disable RLS in the Supabase dashboard.');
  console.log('Alternatively, create a user through the Supabase Auth UI and use that ID.');
  
  const demoUserId = '00000000-0000-0000-0000-000000000000';
  const entryId = uuid();
  const now = new Date().toISOString();
  
  const testEntry = {
    id: entryId,
    user_id: demoUserId,
    title: 'Demo Test Entry',
    content: 'This is a demo test entry to verify Supabase storage. #test #demo',
    emotion: 'neutral',
    emotion_intensity: 5,
    tags: ['test', 'demo'],
    created_at: now,
    updated_at: now,
    is_favorite: false
  };
  
  const { data, error } = await supabase
    .from('journal_entries')
    .insert([testEntry])
    .select();
  
  if (error) {
    console.error('❌ Error creating demo entry:', JSON.stringify(error, null, 2));
    return;
  }
  
  console.log('✅ Demo entry created successfully!');
}

// Run the function
createTestEntry().catch(console.error);

// Make the script compatible with both ESM and CommonJS
export {}; 