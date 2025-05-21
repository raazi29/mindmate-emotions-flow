# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/29b0d5f9-c01c-4b35-9a31-7e52a4e45c6c

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/29b0d5f9-c01c-4b35-9a31-7e52a4e45c6c) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/29b0d5f9-c01c-4b35-9a31-7e52a4e45c6c) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

# MindMate Emotions Flow

A React application that analyzes emotions using AI models and provides personalized insights, recommendations, and resources to support emotional wellbeing.

## Quick Start

```sh
# Install dependencies
npm install

# Start development server
.\run.ps1 dev

# Or use npm directly
npm run dev
```

## Project Structure

- `/src` - Main application source code
- `/public` - Static assets
- `/scripts` - Utility scripts organized by purpose:
  - `/dev` - Development scripts and startup files
  - `/testing` - Testing utilities and data insertion tools
  - `/deployment` - Docker and deployment configurations
  - `/setup` - Service setup and configuration scripts
- `/backend` - Python FastAPI backend for AI features
- `/supabase` - Supabase database configuration

## Key Commands

Use the PowerShell runner script for common tasks:

```powershell
.\run.ps1 [command]
```

Available commands:
- `dev` - Start the development environment
- `test` - Run tests or insert test data
- `deploy` - Deploy the application with Docker
- `setup` - Setup required services

## Core Features

### Emotion Analysis
- Real-time emotion detection from text input
- Voice-to-text capability for hands-free analysis
- ML-powered analysis with local fallback

### Personalized Insights
- Emotion-specific insights and suggestions
- Interactive trends visualization
- Dynamic content generation based on emotional state

### Journal with Database Integration
- Create, edit, and track journal entries
- Automatic emotion analysis of journal content
- Offline-first with Supabase sync when online

### Resource Library
- Curated articles, videos, and exercises
- AI voice integration with text-to-speech
- Emotion-specific recommendations

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: FastAPI (Python), Express.js (Node)
- **Database**: Supabase
- **AI**: Hugging Face, OpenRouter API (Qwen 3)

## Environment Setup

1. Create a `.env.local` file with required keys:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

2. For AI features, add API keys to backend/app.py

## Development

- Run frontend: `npm run dev`
- Run backend: `npm run dev:backend`
- Run both: `npm run dev:complete`

## Deployment

- Build for production: `npm run build`
- Using Docker: `.\run.ps1 deploy`

## License
This project is licensed under the MIT License - see the LICENSE file for details.

# MindMate Journal with Supabase Integration

A journal application with emotion analysis and Supabase database integration for persistent storage.

## Features

- Journal entry creation, editing, and deletion
- Emotional analysis of journal content
- Tag support using hashtags
- Journal streaks tracking
- Mood comparison and analytics
- Database storage with Supabase
- Offline mode support

## Setup

### Prerequisites

- Node.js and npm
- A Supabase account and project

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the project root with your Supabase credentials:

```
VITE_SUPABASE_URL=https://zxzcbzghdvlqnoallkfk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4emNiemdoZHZscW5vYWxsa2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyNjY4MzksImV4cCI6MjA2MTg0MjgzOX0.qcHM9XMX-3TAr_y7pZ-N4deQnH0DWZRukafaq0u7PLA
```

4. Start the development server:

```bash
npm run dev
```

## Supabase Setup

To set up the required database schema in Supabase:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Create a new query and paste the contents of `supabase/schema.sql`
4. Run the SQL script to create the journal_entries table and set up row-level security

## Usage

### Authentication

For demonstration purposes, the app uses a mock user with ID 'demo-user-123'. In a production environment, you should implement proper authentication using Supabase Auth.

### Journal Entries

- Create new entries from the Entries tab
- Entries are automatically analyzed for emotions
- Add tags using hashtags in your content (e.g., #work, #personal)
- Edit or delete entries as needed

### Analytics

The Analytics tab provides insights into your emotional patterns over time, including:
- Emotion distribution
- Most frequent emotions
- Personalized suggestions

### Offline Mode

If the connection to Supabase fails, the app will switch to offline mode, storing changes locally until a connection can be reestablished.

## Database Schema

The application uses the following schema in Supabase:

```sql
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  emotion TEXT NOT NULL,
  emotion_intensity SMALLINT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);
```

Row-level security is enabled to ensure users can only access their own journal entries.

# MindMate - Emotion Wellness App with AI Voice Features

MindMate is a comprehensive mental wellness application that helps users understand, track, and manage their emotions. The application has been enhanced with AI-powered text-to-speech capabilities to make resources more accessible.

## Features

- **Emotion Detection**: Real-time emotion analysis using the Qwen 3 AI model through OpenRouter API
- **Resource Library**: Curated articles, videos, and exercises for emotional wellness
- **Interactive Resources**: Dynamic content with emotion check-ins and personalized feedback
- **AI Voice Integration**: Text-to-speech functionality for all resources
- **AI Summaries**: Automatic summarization of long-form content for quicker consumption
- **Emotion-Specific Voice Tones**: Voice characteristics adapting to emotional context

## Getting Started

### Prerequisites

- Node.js (v16+)
- Python (v3.8+)
- npm or yarn

### Installation

1. Clone the repository
   ```