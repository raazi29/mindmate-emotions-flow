-- Create tables for the anonymous chat feature

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

  -- Create bucket for chat files if it doesn't exist
  BEGIN
    PERFORM FROM pg_catalog.pg_extension WHERE extname = 'pg_net';
    IF FOUND THEN
      PERFORM net.http_post(
        url := current_setting('supabase_url') || '/storage/v1/bucket',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('supabase.key.service_role')
        ),
        body := jsonb_build_object(
          'name', 'anonymous-chat-files',
          'id', 'anonymous-chat-files',
          'public', true
        )
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Ignore errors if bucket creation fails
      NULL;
  END;
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
    FOR UPDATE USING (created_by = auth.uid()::text);

  DROP POLICY IF EXISTS "Room creators can delete rooms" ON anonymous_chat_rooms;
  CREATE POLICY "Room creators can delete rooms" ON anonymous_chat_rooms
    FOR DELETE USING (created_by = auth.uid()::text);

  -- Anonymous chat messages policies
  DROP POLICY IF EXISTS "Anyone can view messages" ON anonymous_chat_messages;
  CREATE POLICY "Anyone can view messages" ON anonymous_chat_messages
    FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Authenticated users can create messages" ON anonymous_chat_messages;
  CREATE POLICY "Authenticated users can create messages" ON anonymous_chat_messages
    FOR INSERT WITH CHECK (true);

  DROP POLICY IF EXISTS "Message senders can update messages" ON anonymous_chat_messages;
  CREATE POLICY "Message senders can update messages" ON anonymous_chat_messages
    FOR UPDATE USING (sender_id = auth.uid()::text);

  DROP POLICY IF EXISTS "Message senders can delete messages" ON anonymous_chat_messages;
  CREATE POLICY "Message senders can delete messages" ON anonymous_chat_messages
    FOR DELETE USING (sender_id = auth.uid()::text);

  -- Anonymous chat message attachments policies
  DROP POLICY IF EXISTS "Anyone can view attachments" ON anonymous_chat_message_attachments;
  CREATE POLICY "Anyone can view attachments" ON anonymous_chat_message_attachments
    FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Authenticated users can create attachments" ON anonymous_chat_message_attachments;
  CREATE POLICY "Authenticated users can create attachments" ON anonymous_chat_message_attachments
    FOR INSERT WITH CHECK (true);

  DROP POLICY IF EXISTS "Users can delete their own attachments" ON anonymous_chat_message_attachments;
  CREATE POLICY "Users can delete their own attachments" ON anonymous_chat_message_attachments
    FOR DELETE USING (
      message_id IN (
        SELECT id FROM anonymous_chat_messages WHERE sender_id = auth.uid()::text
      )
    );

  -- Anonymous chat message reactions policies
  DROP POLICY IF EXISTS "Anyone can view reactions" ON anonymous_chat_message_reactions;
  CREATE POLICY "Anyone can view reactions" ON anonymous_chat_message_reactions
    FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Authenticated users can create reactions" ON anonymous_chat_message_reactions;
  CREATE POLICY "Authenticated users can create reactions" ON anonymous_chat_message_reactions
    FOR INSERT WITH CHECK (true);

  DROP POLICY IF EXISTS "Users can delete their own reactions" ON anonymous_chat_message_reactions;
  CREATE POLICY "Users can delete their own reactions" ON anonymous_chat_message_reactions
    FOR DELETE USING (user_id = auth.uid()::text);

  -- Anonymous chat presence policies
  DROP POLICY IF EXISTS "Anyone can view presence" ON anonymous_chat_presence;
  CREATE POLICY "Anyone can view presence" ON anonymous_chat_presence
    FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Users can update their own presence" ON anonymous_chat_presence;
  CREATE POLICY "Users can update their own presence" ON anonymous_chat_presence
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

  DROP POLICY IF EXISTS "Users can update their own presence" ON anonymous_chat_presence;
  CREATE POLICY "Users can update their own presence" ON anonymous_chat_presence
    FOR UPDATE USING (user_id = auth.uid()::text);
END;
$$ LANGUAGE plpgsql;

-- Call the functions to set up everything
SELECT create_anonymous_chat_tables();
SELECT create_anonymous_chat_publications();
SELECT set_anonymous_chat_policies(); 