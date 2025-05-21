# Testing Supabase Integration for MindMate Journal

This guide provides detailed instructions for testing the Supabase database integration with the MindMate Journal application.

## Prerequisites

- A Supabase account
- Access to your Supabase project's dashboard
- The project cloned and dependencies installed

## Important: Connection Issues

If you're seeing connection errors like `{ "message": "" }` when running the test scripts, there are several possible causes:

1. **Incorrect Credentials**: Double-check that the Supabase URL and anon key in `src/lib/SupabaseConfig.ts` are correct.

2. **Project Not Active**: Ensure your Supabase project is active and not paused.

3. **Network Issues**: Check if you can access your Supabase dashboard in the browser.

4. **CORS Configuration**: Make sure your project's CORS settings in Supabase include your development URL.

5. **Account/Project Limitations**: Free tier projects may have limitations or become inactive after periods of non-use.

To get your project credentials:
1. Go to your Supabase project dashboard
2. Click "Project Settings" at the bottom of the sidebar
3. Click "API" in the settings menu
4. Copy the URL and anon key from the "Project URL" and "Project API keys" sections

**Troubleshooting Connection Issues:**
- Try opening `https://your-project-url.supabase.co` in your browser to verify the project is accessible
- Check if your Supabase project has database access restrictions
- If using a new project, ensure the project has finished initializing (can take a few minutes)

## 1. Verify Connection

First, let's verify that we can connect to the Supabase database:

```bash
npm run test:supabase
```

This will test the connection to Supabase and print diagnostic information.

## 2. Check the Schema

If you need to apply or review the schema:

```bash
npm run supabase:export
```

This will display the SQL schema that should be applied to your Supabase project.

## 3. Testing the Integration

There are several ways to test the Supabase integration:

### Option A: Using the Application (Recommended)

The best way to test is by using the application itself:

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to the Journal page in your browser
3. Sign in (create an account if needed)
4. Create a journal entry
5. Check if the entry appears in your Supabase database

### Option B: Using the Test Scripts

We provide several scripts to test different aspects of the integration:

#### Testing with Authentication (Real-world scenario)

```bash
npm run supabase:simulate
```

This script simulates how the real application uses Supabase, including authentication.

#### Direct Testing (For troubleshooting only)

If you need to test the database connection directly (bypassing authentication):

```bash
npm run supabase:direct-test
```

**NOTE:** This test requires temporarily disabling Row Level Security (RLS) in your Supabase project.

#### Listing Journal Entries

To list existing journal entries in the database:

```bash
npm run supabase:list
```

#### Checking Database Tables

To check if the required tables and views exist:

```bash
npm run supabase:check-tables
```

## 4. Troubleshooting Common Issues

### Authentication Issues

- **Error:** Email address is invalid
  - **Solution:** Use a real email format or enable "Confirm email" option in Auth settings

- **Error:** Anonymous sign-ins are disabled
  - **Solution:** Enable anonymous sign-ins in Auth Settings or use email/password auth

### Row Level Security (RLS) Issues

- **Error:** New row violates row-level security policy
  - **Solution:** Either:
    1. Sign in properly to get a valid session
    2. Temporarily disable RLS (for testing only)
    3. Create a test user with proper permissions

To temporarily disable RLS for testing:
1. Go to Supabase dashboard > Table Editor
2. Select the journal_entries table
3. Click "Authentication" in the sidebar
4. Turn off "Enable Row Level Security"
5. **IMPORTANT:** Re-enable RLS after testing!

### Database Schema Issues

- **Error:** Relation does not exist
  - **Solution:** Apply the schema by running the SQL from `npm run supabase:export`

- **Error:** Column does not exist
  - **Solution:** Check if the schema was applied correctly and all migrations were run

## 5. Verifying Data in Supabase Dashboard

You can also verify data directly in the Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to Table Editor > journal_entries
3. You should see your entries listed in the table

## Best Practices for Testing

1. **Use proper authentication** - Always test with real authentication when possible
2. **Keep RLS enabled** - Only disable RLS temporarily for troubleshooting
3. **Use real data** - Create realistic journal entries to test all features
4. **Test offline mode** - Disconnect from the internet to test local storage fallback
5. **Verify synchronization** - Test that offline entries sync when reconnected

## Conclusion

After successfully testing the Supabase integration, you can proceed with using the journal application with confidence that your data is being properly stored and secured in the database.

Remember to check the Supabase documentation for more information about specific features or configurations: [https://supabase.io/docs](https://supabase.io/docs) 