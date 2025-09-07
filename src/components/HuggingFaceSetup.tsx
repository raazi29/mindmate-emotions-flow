import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { initHuggingFace, getApiKey, isHuggingFaceAvailable, clearApiKey } from '@/utils/huggingfaceUtils';
import { RefreshCw, Check, AlertCircle, Key } from 'lucide-react';

interface HuggingFaceSetupProps {
  onSetup: () => void;
}

const HuggingFaceSetup = ({ onSetup }) => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unconfigured' | 'connected' | 'error'>('unconfigured');

  // Check initial status
  useEffect(() => {
    console.log("HuggingFaceSetup - checking initial status");
    // Check for API key in the current state
    const currentApiKey = getApiKey();
    const storedKey = localStorage.getItem('hf_api_key');
    
    if (currentApiKey) {
      console.log("Found active API key in state");
      setApiKey(currentApiKey);
      setIsConfigured(true);
      setConnectionStatus('connected');
    } else if (storedKey) {
      console.log("Found API key in localStorage, but not active");
      setApiKey(storedKey);
      setIsConfigured(true);
      setConnectionStatus('error');
    }

    // Check if the API is available
    if (isHuggingFaceAvailable()) {
      console.log("Hugging Face is available");
      setConnectionStatus('connected');
    }
  }, []);

  const handleSetupHuggingFace = async () => {
    if (!apiKey.trim()) {
      toast({
        title: 'API Key Required',
        description: 'Please enter your Hugging Face API key to enable advanced emotion detection.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log("Attempting to initialize Hugging Face with API key");
      initHuggingFace(apiKey);
      setIsConfigured(true);
      setConnectionStatus('connected');
      
      toast({
        title: 'Successfully Connected',
        description: 'Hugging Face models are now ready to use for enhanced emotion detection.',
        variant: 'default',
      });
      
      onSetup();
    } catch (error) {
      console.error('Error setting up Hugging Face:', error);
      setConnectionStatus('error');
      toast({
        title: 'Connection Failed',
        description: 'Unable to connect to Hugging Face. Please check your API key and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setIsLoading(true);
    try {
      clearApiKey();
      setApiKey('');
      setIsConfigured(false);
      setConnectionStatus('unconfigured');
      
      toast({
        title: 'API Key Reset',
        description: 'Your Hugging Face API key has been cleared.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error resetting API key:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check current state and show appropriate UI
  const renderConnectionState = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded">
            <Check className="h-4 w-4" />
            <span>Connected to Hugging Face</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
            <AlertCircle className="h-4 w-4" />
            <span>Connection error - please check your API key</span>
          </div>
        );
      default:
        return (
          <div className="text-xs text-muted-foreground">
            Your API key is stored locally and not sent to our servers.
          </div>
        );
    }
  };

  return (
    <Card className="w-full glass dark:glass-dark border-none shadow-lg animate-fade-in">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Hugging Face API Setup</CardTitle>
            <CardDescription>
              Connect to advanced ML models for emotion analysis
            </CardDescription>
          </div>
          <Key className="h-8 w-8 text-primary opacity-50" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            To enable advanced emotion detection, please enter your Hugging Face API key.
            You can get a free API key from <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-primary underline">huggingface.co</a>.
          </p>
          
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Hugging Face API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-white/50 dark:bg-black/30 border-white/30 dark:border-white/10"
            />
            {renderConnectionState()}
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleSetupHuggingFace}
              disabled={isLoading} 
              className="flex-1"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Connecting...
                </span>
              ) : isConfigured ? 'Update API Key' : 'Connect to Hugging Face'}
            </Button>
            
            {isConfigured && (
              <Button 
                variant="outline" 
                onClick={handleReset}
                disabled={isLoading}
              >
                Reset
              </Button>
            )}
          </div>
          
          {isConfigured && connectionStatus === 'connected' && (
            <p className="text-xs text-center text-muted-foreground">
              You can now use advanced emotion detection features.
            </p>
          )}
          
          {/* Add troubleshooting section if there are errors */}
          {connectionStatus === 'error' && (
            <div className="border border-red-300 dark:border-red-800 p-3 rounded-md bg-red-50 dark:bg-red-900/20">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-400 mb-2">Troubleshooting</h4>
              <ul className="text-xs text-red-700 dark:text-red-300 space-y-1 list-disc pl-4">
                <li>Make sure your API key is correct and has not expired</li>
                <li>Check that you have sufficient quota on your Hugging Face account</li>
                <li>Try clicking "Reset" and enter your API key again</li>
                <li>Restart the application if the issue persists</li>
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default HuggingFaceSetup;
