import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SupabaseConfig } from '@/lib/SupabaseConfig';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Check, X, AlertCircle, RefreshCw } from 'lucide-react';

export function SupabaseTest() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detailedError, setDetailedError] = useState<string | null>(null);
  const [tablesExist, setTablesExist] = useState<{[key: string]: boolean}>({});
  
  const checkConnection = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setDetailedError(null);
    
    try {
      // Display configuration being used
      console.log('Using Supabase URL:', SupabaseConfig.url);
      console.log('Using Supabase Anon Key:', SupabaseConfig.anonKey.substring(0, 10) + '...');
      
      // Check tables existence directly instead of using RPC
      const tables = ['journal_entries', 'profiles', 'journal_attachments', 'emotion_stats'];
      const tableStatus: {[key: string]: boolean} = {};
      let allTablesExist = true;
      
      for (const table of tables) {
        try {
          const { error: tableError } = await supabase.from(table).select('count(*)', { head: true, count: 'exact' });
          const exists = !tableError || tableError.code !== '42P01'; // 42P01 = relation does not exist
          tableStatus[table] = exists;
          
          if (!exists) {
            allTablesExist = false;
          }
        } catch (err) {
          console.error(`Error checking table ${table}:`, err);
          tableStatus[table] = false;
          allTablesExist = false;
        }
      }
      
      setTablesExist(tableStatus);
      
      // If we got here without failing, we're connected
      setIsConnected(true);
      
      // Now check authentication status
      const { data: authData, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        console.error('Auth error:', authError);
      } else if (authData && authData.session) {
        console.log('User is authenticated');
      } else {
        console.log('No active session');
      }
      
      // Now check actual table access
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.code === '42501' || (!error.message && error.code === '')) { // Permission error due to RLS
          setErrorMessage('Connected, but Row Level Security prevents access without authentication.');
          setDetailedError(JSON.stringify(error, null, 2));
        } else if (error.code === '42P01') { // Relation doesn't exist
          setErrorMessage('Connected to Supabase, but the journal_entries table does not exist. Schema needs to be applied.');
          setDetailedError(JSON.stringify(error, null, 2));
        } else {
          setErrorMessage(error.message || 'Unknown error accessing tables');
          setDetailedError(JSON.stringify(error, null, 2));
        }
      } else if (data && data.length > 0) {
        setErrorMessage('Successfully connected and retrieved data!');
      } else {
        setErrorMessage('Connected successfully, but no journal entries found.');
      }
      
    } catch (error) {
      console.error('Unexpected error during connection check:', error);
      setIsConnected(false);
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      if (error instanceof Error && error.stack) {
        setDetailedError(error.stack);
      } else {
        setDetailedError(JSON.stringify(error, null, 2));
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    checkConnection();
  }, []);
  
  // Check CORS settings - display the current origin that needs to be allowed
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Supabase Connection:</span>
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : isConnected === true ? (
            <Check className="h-5 w-5 text-green-500" />
          ) : isConnected === false ? (
            <X className="h-5 w-5 text-red-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-500" />
          )}
          <span className={isConnected ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
            {isConnected ? "Connected" : "Not connected"}
          </span>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={checkConnection} 
          disabled={isLoading}
          className="flex items-center gap-1"
        >
          {isLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Test Connection
        </Button>
      </div>
      
      {/* Show current URL being used */}
      <div className="text-sm">
        <div>URL: <code className="bg-muted px-1 py-0.5 rounded text-xs">{SupabaseConfig.url}</code></div>
        <div>Key: <code className="bg-muted px-1 py-0.5 rounded text-xs">{SupabaseConfig.anonKey.substring(0, 15)}...{SupabaseConfig.anonKey.substring(SupabaseConfig.anonKey.length - 5)}</code></div>
      </div>
      
      {errorMessage && (
        <Alert variant={isConnected ? "default" : "destructive"}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Info</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      
      {isConnected && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">Database Tables Status:</h4>
          <ul className="space-y-1">
            {Object.entries(tablesExist).map(([table, exists]) => (
              <li key={table} className="flex items-center gap-2 text-sm">
                {exists ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-red-500" />
                )}
                <span className={exists ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                  {table}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {isConnected === false && (
        <div className="text-sm text-muted-foreground mt-2">
          <p>Possible solutions:</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Check your Supabase credentials in SupabaseConfig.ts</li>
            <li>Ensure your Supabase project is running (not paused)</li>
            <li>
              Add the following URL to your Supabase CORS settings:
              <code className="block bg-muted px-2 py-1 mt-1 rounded text-xs">{currentOrigin || 'http://localhost:8082'}</code>
            </li>
            <li>Check network connectivity to Supabase servers</li>
          </ul>
        </div>
      )}
      
      {detailedError && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-muted-foreground">View Error Details</summary>
          <pre className="mt-2 p-2 bg-muted rounded-md text-xs overflow-auto max-h-[200px]">{detailedError}</pre>
        </details>
      )}
    </div>
  );
} 