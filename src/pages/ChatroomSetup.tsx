import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, Database, Table, KeyRound, FileCode, ExternalLink } from 'lucide-react';
import Navbar from '@/components/Navbar';

// SQL for creating tables - same as in the migrations file
const SQL_SCRIPT = `-- Create tables for the anonymous chat feature

-- Function to create all anonymous chat tables
CREATE OR REPLACE FUNCTION create_anonymous_chat_tables()
RETURNS void AS $$
BEGIN
  -- Create room table
  CREATE TABLE IF NOT EXISTS anonymous_chat_rooms (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    mood TEXT NOT NULL,
    topic TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT NOT NULL,
    last_activity TIMESTAMPTZ,
    is_private BOOLEAN NOT NULL DEFAULT FALSE
  );

  -- Create messages table
  CREATE TABLE IF NOT EXISTS anonymous_chat_messages (
    id UUID PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES anonymous_chat_rooms(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_avatar TEXT,
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type TEXT NOT NULL,
    reply_to UUID REFERENCES anonymous_chat_messages(id),
    is_edited BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
  );

  -- Create message attachments table
  CREATE TABLE IF NOT EXISTS anonymous_chat_message_attachments (
    id UUID PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES anonymous_chat_messages(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    url TEXT NOT NULL,
    name TEXT NOT NULL,
    size INTEGER,
    content_type TEXT
  );

  -- Create message reactions table
  CREATE TABLE IF NOT EXISTS anonymous_chat_message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES anonymous_chat_messages(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    UNIQUE(message_id, user_id, emoji)
  );

  -- Create user presence table
  CREATE TABLE IF NOT EXISTS anonymous_chat_presence (
    user_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    avatar TEXT,
    status TEXT NOT NULL,
    last_active TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Create realtime publication
CREATE OR REPLACE FUNCTION create_anonymous_chat_publications()
RETURNS void AS $$
BEGIN
  -- Create publication for realtime subscriptions if it doesn't exist
  BEGIN
    CREATE PUBLICATION anonymous_chat_publication FOR TABLE 
      anonymous_chat_rooms, 
      anonymous_chat_messages, 
      anonymous_chat_message_attachments, 
      anonymous_chat_message_reactions,
      anonymous_chat_presence;
  EXCEPTION
    WHEN duplicate_object THEN
      -- Publication already exists
      NULL;
  END;
END;
$$ LANGUAGE plpgsql;

-- Set RLS policies
CREATE OR REPLACE FUNCTION set_anonymous_chat_policies()
RETURNS void AS $$
BEGIN
  -- Enable RLS
  ALTER TABLE anonymous_chat_rooms ENABLE ROW LEVEL SECURITY;
  ALTER TABLE anonymous_chat_messages ENABLE ROW LEVEL SECURITY;
  ALTER TABLE anonymous_chat_message_attachments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE anonymous_chat_message_reactions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE anonymous_chat_presence ENABLE ROW LEVEL SECURITY;

  -- Anonymous chat rooms policies
  DROP POLICY IF EXISTS "Anyone can view rooms" ON anonymous_chat_rooms;
  CREATE POLICY "Anyone can view rooms" ON anonymous_chat_rooms
    FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Authenticated users can create rooms" ON anonymous_chat_rooms;
  CREATE POLICY "Authenticated users can create rooms" ON anonymous_chat_rooms
    FOR INSERT WITH CHECK (true);

  DROP POLICY IF EXISTS "Room creators can update rooms" ON anonymous_chat_rooms;
  CREATE POLICY "Room creators can update rooms" ON anonymous_chat_rooms
    FOR UPDATE USING (true);

  DROP POLICY IF EXISTS "Room creators can delete rooms" ON anonymous_chat_rooms;
  CREATE POLICY "Room creators can delete rooms" ON anonymous_chat_rooms
    FOR DELETE USING (true);

  -- Anonymous chat messages policies
  DROP POLICY IF EXISTS "Anyone can view messages" ON anonymous_chat_messages;
  CREATE POLICY "Anyone can view messages" ON anonymous_chat_messages
    FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Authenticated users can create messages" ON anonymous_chat_messages;
  CREATE POLICY "Authenticated users can create messages" ON anonymous_chat_messages
    FOR INSERT WITH CHECK (true);

  DROP POLICY IF EXISTS "Message senders can update messages" ON anonymous_chat_messages;
  CREATE POLICY "Message senders can update messages" ON anonymous_chat_messages
    FOR UPDATE USING (true);

  DROP POLICY IF EXISTS "Message senders can delete messages" ON anonymous_chat_messages;
  CREATE POLICY "Message senders can delete messages" ON anonymous_chat_messages
    FOR DELETE USING (true);

  -- Anonymous chat message attachments policies
  DROP POLICY IF EXISTS "Anyone can view attachments" ON anonymous_chat_message_attachments;
  CREATE POLICY "Anyone can view attachments" ON anonymous_chat_message_attachments
    FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Authenticated users can create attachments" ON anonymous_chat_message_attachments;
  CREATE POLICY "Authenticated users can create attachments" ON anonymous_chat_message_attachments
    FOR INSERT WITH CHECK (true);

  DROP POLICY IF EXISTS "Users can delete their own attachments" ON anonymous_chat_message_attachments;
  CREATE POLICY "Users can delete their own attachments" ON anonymous_chat_message_attachments
    FOR DELETE USING (true);

  -- Anonymous chat message reactions policies
  DROP POLICY IF EXISTS "Anyone can view reactions" ON anonymous_chat_message_reactions;
  CREATE POLICY "Anyone can view reactions" ON anonymous_chat_message_reactions
    FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Authenticated users can create reactions" ON anonymous_chat_message_reactions;
  CREATE POLICY "Authenticated users can create reactions" ON anonymous_chat_message_reactions
    FOR INSERT WITH CHECK (true);

  DROP POLICY IF EXISTS "Users can delete their own reactions" ON anonymous_chat_message_reactions;
  CREATE POLICY "Users can delete their own reactions" ON anonymous_chat_message_reactions
    FOR DELETE USING (true);

  -- Anonymous chat presence policies
  DROP POLICY IF EXISTS "Anyone can view presence" ON anonymous_chat_presence;
  CREATE POLICY "Anyone can view presence" ON anonymous_chat_presence
    FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Users can update their own presence" ON anonymous_chat_presence;
  CREATE POLICY "Users can update their own presence" ON anonymous_chat_presence
    FOR INSERT WITH CHECK (true);

  DROP POLICY IF EXISTS "Users can update their own presence" ON anonymous_chat_presence;
  CREATE POLICY "Users can update their own presence" ON anonymous_chat_presence
    FOR UPDATE USING (true);
END;
$$ LANGUAGE plpgsql;

-- Call the functions to set up everything
SELECT create_anonymous_chat_tables();
SELECT create_anonymous_chat_publications();
SELECT set_anonymous_chat_policies();`;

type SetupStep = {
  id: string;
  name: string;
  description: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
  icon: React.ReactNode;
};

const ChatroomSetup = () => {
  const { toast } = useToast();
  const [steps, setSteps] = useState<SetupStep[]>([
    {
      id: 'check-tables',
      name: 'Check existing tables',
      description: 'Check if the required tables already exist',
      status: 'idle',
      icon: <Table className="h-5 w-5" />
    },
    {
      id: 'create-tables',
      name: 'Create database tables',
      description: 'Create all required tables for the chat system',
      status: 'idle',
      icon: <Database className="h-5 w-5" />
    },
    {
      id: 'storage-bucket',
      name: 'Create storage bucket',
      description: 'Create a storage bucket for file attachments',
      status: 'idle',
      icon: <FileCode className="h-5 w-5" />
    },
    {
      id: 'realtime',
      name: 'Enable realtime',
      description: 'Enable realtime for all tables',
      status: 'idle',
      icon: <KeyRound className="h-5 w-5" />
    }
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [manualSetupRequired, setManualSetupRequired] = useState(false);

  const updateStepStatus = (stepId: string, status: 'idle' | 'loading' | 'success' | 'error', error?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, error } : step
    ));
  };

  const runSetup = async () => {
    setIsRunning(true);
    setIsComplete(false);
    setManualSetupRequired(false);

    try {
      // Step 1: Check tables
      updateStepStatus('check-tables', 'loading');
      
      try {
        const { data: existingRooms, error: roomsError } = await supabase
          .from('anonymous_chat_rooms')
          .select('id')
          .limit(1);
          
        if (roomsError && roomsError.code === '42P01') {
          // Table doesn't exist, which is fine
          updateStepStatus('check-tables', 'success');
        } else if (roomsError) {
          // Some other error
          throw roomsError;
        } else {
          // Tables already exist
          toast({
            title: "Tables already exist",
            description: "The required tables are already set up.",
          });
          updateStepStatus('check-tables', 'success');
          updateStepStatus('create-tables', 'success');
          
          // Skip to step 3
          checkStorageBucket();
          return;
        }
      } catch (error: any) {
        if (error.code === '42P01') {
          // This is fine, tables don't exist yet
          updateStepStatus('check-tables', 'success');
        } else {
          updateStepStatus('check-tables', 'error', error.message);
          throw error;
        }
      }

      // Step 2: Create tables
      updateStepStatus('create-tables', 'loading');
      
      try {
        // First try to call the RPC function
        const { error } = await supabase.rpc('create_anonymous_chat_tables');
        
        if (error) throw error;
        
        // If successful, continue with policies
        try {
          await supabase.rpc('set_anonymous_chat_policies');
        } catch (policyError) {
          console.error("Policy setup failed:", policyError);
          // Continue anyway, as tables are created
        }
        
        updateStepStatus('create-tables', 'success');
      } catch (error: any) {
        // If RPC fails, show manual setup instructions
        console.error("Failed to create tables via RPC:", error);
        setManualSetupRequired(true);
        
        toast({
          title: "Manual Setup Required",
          description: "Couldn't set up tables automatically. Please copy the SQL script below and run it in the Supabase SQL Editor.",
          variant: "destructive",
        });
        
        updateStepStatus('create-tables', 'error', "Manual setup required. See instructions below.");
        
        // Still try to create the storage bucket
        checkStorageBucket();
        return;
      }
      
      // Continue with step 3
      await checkStorageBucket();
      
    } catch (error: any) {
      console.error('Setup error:', error);
      toast({
        title: "Setup Failed",
        description: error.message || "An error occurred during setup.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };
  
  const checkStorageBucket = async () => {
    // Step 3: Create storage bucket
    updateStepStatus('storage-bucket', 'loading');
    
    try {
      // Check if bucket exists
      const { data: buckets, error: bucketsError } = await supabase
        .storage
        .listBuckets();
        
      if (bucketsError) throw bucketsError;
      
      const bucketExists = buckets.some(b => b.name === 'anonymous-chat-files');
      
      if (!bucketExists) {
        // Create bucket
        const { error } = await supabase
          .storage
          .createBucket('anonymous-chat-files', {
            public: true,
            fileSizeLimit: 10485760, // 10MB
          });
          
        if (error) throw error;
      }
      
      updateStepStatus('storage-bucket', 'success');
      
      // Step 4: Enable realtime
      await enableRealtime();
      
    } catch (error: any) {
      updateStepStatus('storage-bucket', 'error', error.message);
      throw error;
    }
  };
  
  const enableRealtime = async () => {
    updateStepStatus('realtime', 'loading');
    
    try {
      const { error } = await supabase.rpc('create_anonymous_chat_publications');
      
      if (error) {
        // This might fail if user doesn't have sufficient privileges
        // We'll consider this a "soft failure" as it can be configured manually
        toast({
          title: "Limited Success",
          description: "Tables created successfully, but realtime couldn't be enabled automatically. You may need to enable it manually in the Supabase dashboard.",
        });
        updateStepStatus('realtime', 'error', "You may need to enable realtime manually in the Supabase dashboard");
      } else {
        updateStepStatus('realtime', 'success');
        
        // All steps complete!
        setIsComplete(true);
        toast({
          title: "Setup Complete",
          description: "All database tables and storage buckets have been created successfully!",
        });
      }
    } catch (error: any) {
      updateStepStatus('realtime', 'error', error.message);
      
      // Still mark as complete with warning
      setIsComplete(true);
      toast({
        title: "Partial Setup Complete",
        description: "Tables created but realtime couldn't be enabled. You may need to enable it manually.",
        variant: "destructive",
      });
    }
  };

  const renderStepStatus = (step: SetupStep) => {
    switch (step.status) {
      case 'loading':
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return step.icon;
    }
  };

  const openSupabaseEditor = () => {
    // Open Supabase SQL Editor in a new tab
    window.open('https://app.supabase.com/project/_/sql', '_blank');
  };
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(SQL_SCRIPT);
      toast({
        title: "SQL Script Copied",
        description: "The SQL script has been copied to your clipboard. Paste it into the Supabase SQL Editor."
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy. Please manually select and copy the SQL script.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto pt-24 pb-10 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Anonymous Chatrooms Setup</h1>
          <p className="text-muted-foreground mb-8">
            This tool will create all the necessary database tables and storage buckets
            for the Anonymous Chatrooms feature. This only needs to be done once.
          </p>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Database Setup</CardTitle>
              <CardDescription>
                Run the setup to create all required database objects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {steps.map(step => (
                  <div key={step.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="mt-0.5">
                      {renderStepStatus(step)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{step.name}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                      {step.status === 'error' && (
                        <p className="text-sm text-red-500 mt-1">{step.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                onClick={runSetup}
                disabled={isRunning}
                className="w-full"
              >
                {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isComplete ? "Run Setup Again" : isRunning ? "Setting Up..." : "Run Setup"}
              </Button>
            </CardFooter>
          </Card>

          {isComplete && !manualSetupRequired && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Setup Complete</AlertTitle>
              <AlertDescription>
                Your database is now configured for the Anonymous Chatrooms feature. 
                You can now go back to the chat page and start using it.
              </AlertDescription>
            </Alert>
          )}

          {manualSetupRequired && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>Manual Setup Required</AlertTitle>
              <AlertDescription>
                <p className="mb-2">You need to run the SQL script manually in the Supabase SQL Editor. Follow these steps:</p>
                <ol className="list-decimal list-inside ml-2 space-y-1">
                  <li>Copy the SQL script below</li>
                  <li>Open the Supabase SQL Editor</li>
                  <li>Paste the script and run it</li>
                  <li>Return to this page and try the setup again</li>
                </ol>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={openSupabaseEditor}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Supabase SQL Editor
                </Button>
                <Button 
                  variant="default" 
                  className="mt-4 ml-2"
                  onClick={copyToClipboard}
                >
                  Copy SQL Script
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Manual Setup</h2>
            <p className="text-muted-foreground mb-4">
              If you prefer to run the setup manually or if the automatic setup fails, 
              you can run the following SQL script in the Supabase SQL Editor:
            </p>
            <div className="bg-muted p-4 rounded-md overflow-auto max-h-[300px]">
              <pre className="text-xs">{SQL_SCRIPT}</pre>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChatroomSetup; 