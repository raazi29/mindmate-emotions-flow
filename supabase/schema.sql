-- Create journal entries table with enhanced fields
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  emotion TEXT NOT NULL,
  emotion_intensity SMALLINT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  is_favorite BOOLEAN DEFAULT false,
  category TEXT,
  location TEXT,
  weather TEXT,
  mood_score SMALLINT,
  media_urls TEXT[],
  synced BOOLEAN DEFAULT true
);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own entries
CREATE POLICY "Users can view own entries" ON public.journal_entries
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own entries
CREATE POLICY "Users can insert own entries" ON public.journal_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own entries
CREATE POLICY "Users can update own entries" ON public.journal_entries
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own entries
CREATE POLICY "Users can delete own entries" ON public.journal_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Create a trigger to update the updated_at field
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_journal_entries_updated_at
BEFORE UPDATE ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_journal_entries_user_id ON public.journal_entries(user_id);
CREATE INDEX idx_journal_entries_emotion ON public.journal_entries(emotion);
CREATE INDEX idx_journal_entries_created_at ON public.journal_entries(created_at);
CREATE INDEX idx_journal_entries_is_favorite ON public.journal_entries(is_favorite);
CREATE INDEX idx_journal_entries_tags ON public.journal_entries USING gin(tags);
CREATE INDEX idx_journal_entries_category ON public.journal_entries(category);

-- Create a user profiles table to store additional user info
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  theme_preference TEXT DEFAULT 'system',
  notification_preferences JSONB DEFAULT '{"daily_reminder": true, "reminder_time": "20:00"}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Add RLS (Row Level Security) policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create a trigger to update the updated_at field for profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a triggers table to auto-create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a table for journal attachments (images, audio, etc)
CREATE TABLE public.journal_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_id UUID REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Add RLS (Row Level Security) policies for attachments
ALTER TABLE public.journal_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own attachments
CREATE POLICY "Users can view own attachments" ON public.journal_attachments
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own attachments
CREATE POLICY "Users can insert own attachments" ON public.journal_attachments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own attachments
CREATE POLICY "Users can delete own attachments" ON public.journal_attachments
  FOR DELETE USING (auth.uid() = user_id);

-- Create a view for emotion statistics
CREATE OR REPLACE VIEW public.emotion_stats 
WITH (SECURITY_DEFINER) AS
SELECT 
  user_id,
  emotion,
  COUNT(*) as count,
  AVG(emotion_intensity) as avg_intensity,
  MIN(created_at) as first_occurrence,
  MAX(created_at) as last_occurrence
FROM public.journal_entries
GROUP BY user_id, emotion;

-- Add policy for emotion stats view
CREATE POLICY "Users can view own emotion stats" ON public.emotion_stats
  FOR SELECT USING (auth.uid() = user_id);

-- Create a function to get most used tags for a user
CREATE OR REPLACE FUNCTION public.get_user_tags(p_user_id UUID)
RETURNS TABLE (tag TEXT, count BIGINT) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    UNNEST(tags) as tag,
    COUNT(*) as count
  FROM 
    public.journal_entries
  WHERE 
    user_id = p_user_id AND
    tags IS NOT NULL
  GROUP BY 
    tag
  ORDER BY 
    count DESC;
$$; 