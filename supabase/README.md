# Supabase Setup Guide for MindMate Journal

This guide will walk you through setting up your Supabase database for the MindMate Journal application.

## Prerequisites

- A Supabase account (free tier works fine)
- Access to the Supabase dashboard

## Step 1: Create a New Supabase Project

1. Log in to [Supabase](https://app.supabase.io/)
2. Click "New Project"
3. Enter a name for your project (e.g., "mindmate-journal")
4. Choose a database password (save this for later)
5. Choose the region closest to you
6. Click "Create new project"

## Step 2: Get Your API Credentials

1. Once your project is created, go to the project dashboard
2. In the left sidebar, click on "API"
3. Under "Project API keys", you'll find:
   - `URL`: Your project URL
   - `anon` key: Public API key for anonymous access
4. Keep these values handy, you'll need them for the next step

## Step 3: Update Configuration

Create a `.env` file in the root of your project with the following content:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Replace `your_supabase_url` and `your_anon_key` with the values from Step 2.

## Step 4: Set Up the Database Schema

There are two ways to set up the database schema:

### Option A: Using the SQL Editor (Recommended for First-Time Setup)

1. Run the following command to export the schema SQL:
   ```
   npm run supabase:export
   ```
2. Copy the output SQL
3. In your Supabase dashboard, go to the "SQL Editor"
4. Click "New Query"
5. Paste the SQL you copied
6. Click "Run" to execute the SQL and set up your database schema

### Option B: Using the Supabase CLI (For Advanced Users)

1. Install the Supabase CLI:
   ```
   npm install -g supabase
   ```
2. Login to Supabase:
   ```
   supabase login
   ```
3. Link your project:
   ```
   supabase link --project-ref your_project_ref
   ```
   (Replace `your_project_ref` with your project reference ID from the URL)
4. Push the schema:
   ```
   supabase db push
   ```

## Step 5: Verify the Setup

Run the verification tool to check that everything is set up correctly:

```bash
npm run supabase:check-tables
```

This will:
- Test the connection to Supabase
- Check that all required tables and views exist
- Verify that Row Level Security (RLS) is properly configured

For more detailed testing options, see the [Testing Guide](./TESTING.md).

## Validation Tools

We've provided several tools to help you verify your Supabase setup:

1. **Basic Connection Test**:
   ```bash
   npm run test:supabase
   ```

2. **Check Database Tables**:
   ```bash
   npm run supabase:check-tables
   ```

3. **List Journal Entries**:
   ```bash
   npm run supabase:list
   ```

4. **Create Test Entry**:
   ```bash
   npm run supabase:create-test
   ```

5. **Simulate Journal Component**:
   ```bash
   npm run supabase:simulate
   ```

## Troubleshooting

- **Connection Issues**: Make sure your `.env` file has the correct credentials.
- **Schema Errors**: If you see errors when deploying the schema, check for any existing tables or functions that may conflict with the new schema.
- **Access Errors**: Ensure your Row Level Security (RLS) policies are set up correctly as defined in the schema.

For more detailed troubleshooting, see the [Testing Guide](./TESTING.md).

## Database Schema Overview

The database includes:

- `journal_entries`: Main table for storing user journal entries
- `profiles`: User profile information
- `journal_attachments`: For storing attachments linked to journal entries
- `emotion_stats`: View for aggregating emotion data
- Functions, triggers, and indexes for performance and security

For more details, see the `schema.sql` file in this directory. 