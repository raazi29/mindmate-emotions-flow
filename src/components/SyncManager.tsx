import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { syncService } from '@/lib/supabase';
import { useUser } from '@/hooks/use-user';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Cloud, CloudOff, Download, Upload, RefreshCw, Clock, Database, AlertTriangle } from 'lucide-react';

export function SyncManager() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    lastSync: Date | null;
    unsyncedCount: number;
    hasUnsyncedChanges: boolean;
    storageUsage: {
      used: number;
      quota: number;
      percent: number;
    };
  }>({
    lastSync: null,
    unsyncedCount: 0,
    hasUnsyncedChanges: false,
    storageUsage: {
      used: 0,
      quota: 0,
      percent: 0
    }
  });
  const { user } = useUser();

  // Fetch sync status on mount
  useEffect(() => {
    fetchSyncStatus();
    
    // Refresh status every minute
    const interval = setInterval(fetchSyncStatus, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchSyncStatus = async () => {
    const status = await syncService.getSyncStatus();
    setSyncStatus(status);
  };

  const handleSync = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to sync your journal entries",
        variant: "destructive"
      });
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncService.syncAll(user.id);
      
      if (result.success) {
        toast({
          title: "Sync successful",
          description: `Synchronized ${result.total} entries: ${result.created} created, ${result.updated} updated, ${result.deleted} deleted`,
          variant: "default"
        });
        
        // Refresh status
        await fetchSyncStatus();
      } else {
        toast({
          title: "Sync failed",
          description: "Could not synchronize your entries. Please try again later.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error during sync:', error);
      toast({
        title: "Sync error",
        description: "An unexpected error occurred during synchronization",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownload = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to download your journal entries",
        variant: "destructive"
      });
      return;
    }

    setIsDownloading(true);
    try {
      const result = await syncService.downloadAll(user.id);
      
      if (result.success) {
        toast({
          title: "Download successful",
          description: `Downloaded ${result.count} entries from your account`,
          variant: "default"
        });
        
        // Refresh status
        await fetchSyncStatus();
      } else {
        toast({
          title: "Download failed",
          description: "Could not download your entries. Please try again later.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error during download:', error);
      toast({
        title: "Download error",
        description: "An unexpected error occurred during download",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" /> 
          Sync & Storage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Last sync:</span>
              </div>
              <span className="text-sm">
                {syncStatus.lastSync ? 
                  formatDistanceToNow(syncStatus.lastSync, { addSuffix: true }) : 
                  'Never'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {syncStatus.hasUnsyncedChanges ? 
                  <CloudOff className="h-4 w-4 text-amber-500" /> : 
                  <Cloud className="h-4 w-4 text-green-500" />}
                <span className="text-sm font-medium">Unsynced changes:</span>
              </div>
              <span className="text-sm">
                {syncStatus.unsyncedCount > 0 ? (
                  <span className="flex items-center gap-1">
                    <span>{syncStatus.unsyncedCount}</span>
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                  </span>
                ) : 'None'}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Local storage:</span>
                <span className="text-sm">
                  {formatBytes(syncStatus.storageUsage.used)} / {formatBytes(syncStatus.storageUsage.quota)}
                </span>
              </div>
              <Progress value={syncStatus.storageUsage.percent} />
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="flex flex-col md:flex-row justify-between gap-2">
          <Button 
            variant="outline" 
            className="flex gap-2 items-center"
            disabled={isDownloading || isSyncing}
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
            <span>{isDownloading ? 'Downloading...' : 'Download All Entries'}</span>
          </Button>
          
          <Button 
            variant={syncStatus.hasUnsyncedChanges ? "default" : "outline"}
            className="flex gap-2 items-center"
            disabled={isDownloading || isSyncing || !syncStatus.hasUnsyncedChanges}
            onClick={handleSync}
          >
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            <span>
              {isSyncing ? 'Syncing...' : 
               syncStatus.hasUnsyncedChanges ? `Sync Changes (${syncStatus.unsyncedCount})` : 
               'No Changes to Sync'}
            </span>
          </Button>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/50 flex justify-center py-2">
        <p className="text-xs text-muted-foreground">
          {user ? 'Connected as ' + (user.email || user.id) : 'Sign in to sync between devices'}
        </p>
      </CardFooter>
    </Card>
  );
} 