import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle2, XCircle, Database, Wifi, RefreshCw } from 'lucide-react';
import Navbar from '@/components/Navbar';

// Define the test types
type TestResult = {
  name: string;
  description: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
  details?: any;
};

const SupabaseTest = () => {
  const [results, setResults] = useState<TestResult[]>([
    {
      name: 'Connection',
      description: 'Test basic connection to Supabase',
      status: 'idle',
    },
    {
      name: 'Authentication',
      description: 'Check if anonymous authentication works',
      status: 'idle',
    },
    {
      name: 'Database',
      description: 'Test database queries',
      status: 'idle',
    },
    {
      name: 'Tables',
      description: 'Check if required tables exist',
      status: 'idle',
    },
    {
      name: 'Realtime',
      description: 'Test realtime functionality',
      status: 'idle',
    }
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState({
    url: '',
    key: ''
  });

  useEffect(() => {
    // Extract Supabase URL and key for debugging
    // Don't show the full key for security
    try {
      const url = (supabase as any).supabaseUrl || 'Not available';
      const key = (supabase as any).supabaseKey ? '****' + ((supabase as any).supabaseKey as string).slice(-6) : 'Not available';
      setConnectionInfo({ url, key });
    } catch (error) {
      console.error('Error getting connection info:', error);
    }
  }, []);

  const updateTestStatus = (index: number, status: 'idle' | 'loading' | 'success' | 'error', error?: string, details?: any) => {
    setResults(prev => {
      const newResults = [...prev];
      newResults[index] = {
        ...newResults[index],
        status,
        error,
        details
      };
      return newResults;
    });
  };

  const runTests = async () => {
    setIsRunning(true);
    
    // Reset all tests
    results.forEach((_, index) => {
      updateTestStatus(index, 'idle');
    });

    try {
      // Test 1: Connection
      updateTestStatus(0, 'loading');
      try {
        console.log('Testing connection to Supabase...');
        const start = Date.now();
        const { data, error } = await supabase.from('_realtime').select('*').limit(1);
        const end = Date.now();
        
        if (error) {
          console.error('Connection test error:', error);
          updateTestStatus(0, 'error', error.message, error);
        } else {
          console.log('Connection successful, latency:', end - start, 'ms');
          updateTestStatus(0, 'success', undefined, { latency: end - start });
        }
      } catch (error: any) {
        console.error('Connection test failed:', error);
        updateTestStatus(0, 'error', error.message, error);
      }

      // Test 2: Authentication
      updateTestStatus(1, 'loading');
      try {
        console.log('Testing authentication...');
        const { data, error } = await supabase.auth.signInAnonymously();
        
        if (error) {
          console.error('Authentication test error:', error);
          updateTestStatus(1, 'error', error.message, error);
        } else {
          console.log('Authentication successful:', data);
          updateTestStatus(1, 'success', undefined, { userId: data.user?.id });
        }
      } catch (error: any) {
        console.error('Authentication test failed:', error);
        updateTestStatus(1, 'error', error.message, error);
      }

      // Test 3: Database
      updateTestStatus(2, 'loading');
      try {
        console.log('Testing database...');
        // Try to execute a simple query
        const { data, error } = await supabase.rpc('get_service_name');
        
        if (error) {
          console.error('Database test error:', error);
          
          // Try a different query if the RPC doesn't exist
          const { data: tableData, error: tableError } = await supabase.from('pg_catalog.pg_tables').select('tablename').limit(1);
          
          if (tableError) {
            updateTestStatus(2, 'error', tableError.message, tableError);
          } else {
            console.log('Database query successful:', tableData);
            updateTestStatus(2, 'success');
          }
        } else {
          console.log('Database query successful:', data);
          updateTestStatus(2, 'success');
        }
      } catch (error: any) {
        console.error('Database test failed:', error);
        updateTestStatus(2, 'error', error.message, error);
      }

      // Test 4: Tables
      updateTestStatus(3, 'loading');
      try {
        console.log('Checking if anonymous chat tables exist...');
        const tables = [
          'anonymous_chat_rooms',
          'anonymous_chat_messages',
          'anonymous_chat_message_attachments',
          'anonymous_chat_message_reactions',
          'anonymous_chat_presence'
        ];
        
        const tableResults = await Promise.all(
          tables.map(async (tableName) => {
            try {
              const { error } = await supabase.from(tableName).select('*').limit(1);
              return { 
                table: tableName, 
                exists: !error || error.code !== '42P01', // 42P01 is the PostgreSQL error code for "table does not exist"
                error: error ? error.message : null
              };
            } catch (error: any) {
              return { 
                table: tableName, 
                exists: false, 
                error: error.message 
              };
            }
          })
        );
        
        const missingTables = tableResults.filter(t => !t.exists);
        
        if (missingTables.length > 0) {
          console.error('Some tables are missing:', missingTables);
          updateTestStatus(3, 'error', `Missing tables: ${missingTables.map(t => t.table).join(', ')}`, tableResults);
        } else {
          console.log('All required tables exist');
          updateTestStatus(3, 'success', undefined, tableResults);
        }
      } catch (error: any) {
        console.error('Table check failed:', error);
        updateTestStatus(3, 'error', error.message, error);
      }

      // Test 5: Realtime
      updateTestStatus(4, 'loading');
      try {
        console.log('Testing realtime functionality...');
        
        // Check for realtime publication for anonymous chat
        let realtimeWorks = false;
        
        // Create a subscription to test
        const channel = supabase.channel('test-channel');
        
        const subscription = channel
          .on('presence', { event: 'sync' }, () => {
            realtimeWorks = true;
          })
          .subscribe();
        
        // Wait for realtime to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Clean up
        channel.unsubscribe();
        
        if (realtimeWorks) {
          console.log('Realtime functionality works');
          updateTestStatus(4, 'success');
        } else {
          console.warn('Realtime functionality might not be working properly');
          updateTestStatus(4, 'error', 'Realtime functionality might not be working properly');
        }
      } catch (error: any) {
        console.error('Realtime test failed:', error);
        updateTestStatus(4, 'error', error.message, error);
      }

    } finally {
      setIsRunning(false);
    }
  };

  const renderTestStatus = (test: TestResult) => {
    switch (test.status) {
      case 'loading':
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto pt-24 pb-10 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Supabase Connection Test</h1>
          <p className="text-muted-foreground mb-8">
            This utility tests the connection to Supabase and verifies if all required components are working.
          </p>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                Connection Information
              </CardTitle>
              <CardDescription>
                Details about your Supabase connection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">URL:</span>
                  <span>{connectionInfo.url}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">API Key:</span>
                  <span>{connectionInfo.key}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Supabase Tests
              </CardTitle>
              <CardDescription>
                Run tests to diagnose Supabase connection issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((test, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="mt-0.5">
                      {renderTestStatus(test)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{test.name}</h3>
                      <p className="text-sm text-muted-foreground">{test.description}</p>
                      {test.status === 'error' && (
                        <p className="text-sm text-red-500 mt-1">{test.error}</p>
                      )}
                      {test.status === 'success' && test.details && (
                        <p className="text-sm text-green-600 mt-1">
                          {test.name === 'Connection' && `Latency: ${test.details.latency}ms`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                onClick={runTests}
                disabled={isRunning}
                className="w-full"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Run Tests
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
              <CardDescription>Actions to resolve connection issues</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">If connection fails:</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li className="text-sm">Check if your Supabase project is running</li>
                    <li className="text-sm">Verify the URL and API key in SupabaseConfig.ts</li>
                    <li className="text-sm">Check for network connectivity issues or CORS restrictions</li>
                  </ul>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-medium mb-2">If tables are missing:</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li className="text-sm">Run the database setup from the Chat Setup page</li>
                    <li className="text-sm">Check if the SQL script executed successfully</li>
                    <li className="text-sm">Make sure you have the proper permissions in your Supabase project</li>
                  </ul>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-medium mb-2">If realtime doesn't work:</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li className="text-sm">Make sure realtime is enabled in your Supabase project</li>
                    <li className="text-sm">Check if you have created the publication for your tables</li>
                    <li className="text-sm">Verify your Supabase subscription has realtime enabled</li>
                  </ul>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/chat/setup'}
                className="w-full"
              >
                Go to Setup Page
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default SupabaseTest; 