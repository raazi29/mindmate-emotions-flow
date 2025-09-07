import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Download, 
  PlusCircle, 
  FileText, 
  Loader2,
  WifiOff,
  Wifi,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/contexts/SupabaseAuthContext';
import { toast } from '@/hooks/use-toast';

// Import our new components
import EnhancedJournalEntry from '@/components/EnhancedJournalEntry';
import JournalSearchFilter from '@/components/JournalSearchFilter';
import ExportDialog from '@/components/ExportDialog';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

// Import services
import { journalService, JournalEntry, SearchFilters } from '@/services/JournalService';

const Journal: React.FC = () => {
  const { user } = useUser();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isOffline, setIsOffline] = useState(journalService.isOffline());
  const [availableEmotions, setAvailableEmotions] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    if (user?.id) {
      loadEntries();
    }
  }, [user?.id]);

  const loadEntries = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const userEntries = await journalService.getEntries(user.id);
      setEntries(userEntries);
      setFilteredEntries(userEntries);
      
      // Extract available emotions and tags
      const emotions = [...new Set(userEntries.map(entry => entry.emotion))];
      const tags = [...new Set(userEntries.flatMap(entry => entry.tags))];
      
      setAvailableEmotions(emotions);
      setAvailableTags(tags);
    } catch (error) {
      console.error('Error loading entries:', error);
      toast({
        title: "Failed to load entries",
        description: "There was an error loading your journal entries.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFiltersChange = async (filters: SearchFilters) => {
    if (!user?.id) return;

    try {
      const searchResults = await journalService.searchEntries(user.id, filters);
      setFilteredEntries(searchResults);
    } catch (error) {
      console.error('Error filtering entries:', error);
    }
  };

  const handleSaveEntry = (savedEntry: JournalEntry) => {
    if (editingEntry) {
      setEntries(prev => prev.map(entry => 
        entry.id === savedEntry.id ? savedEntry : entry
      ));
      setFilteredEntries(prev => prev.map(entry => 
        entry.id === savedEntry.id ? savedEntry : entry
      ));
      setEditingEntry(null);
    } else {
      setEntries(prev => [savedEntry, ...prev]);
      setFilteredEntries(prev => [savedEntry, ...prev]);
      setShowNewEntry(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24">
          <Alert>
            <AlertDescription>
              Please sign in to access your journal.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              My Journal
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your emotions and thoughts with AI-powered insights
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowNewEntry(true)}>
              <PlusCircle className="h-4 w-4 mr-1" />
              New Entry
            </Button>
          </div>
        </div>

        <Tabs defaultValue="entries" className="space-y-6">
          <TabsList>
            <TabsTrigger value="entries">Entries ({entries.length})</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="entries" className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading your entries...</span>
              </div>
            ) : entries.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No entries yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Start your emotional wellness journey by creating your first journal entry.
                  </p>
                  <Button onClick={() => setShowNewEntry(true)}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create First Entry
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {entries.map((entry) => (
                  <Card key={entry.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <CardTitle className="text-lg">{entry.title}</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{new Date(entry.created_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <Badge variant="outline">
                              {entry.emotion.charAt(0).toUpperCase() + entry.emotion.slice(1)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <p className="text-sm line-clamp-3">{entry.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard entries={entries} />
          </TabsContent>
        </Tabs>

        <AnimatePresence>
          {showNewEntry && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              >
                <EnhancedJournalEntry
                  onSave={handleSaveEntry}
                  onCancel={() => setShowNewEntry(false)}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Journal;