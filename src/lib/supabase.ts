import { createClient } from '@supabase/supabase-js';
import { SupabaseConfig } from './SupabaseConfig';

// Initialize Supabase client with provided credentials
const supabaseUrl = SupabaseConfig.url;
const supabaseKey = SupabaseConfig.anonKey;

// Create client with auth settings to simplify signup
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

// Define database types
export type JournalEntryDB = {
  id: string;
  user_id: string; // For user-specific entries
  title: string;
  content: string;
  emotion: string;
  emotion_intensity?: number;
  tags?: string[];
  created_at: string;
  updated_at?: string;
  is_favorite?: boolean;
  category?: string;
  location?: string;
  weather?: string;
  mood_score?: number;
  synced?: boolean;
};

// Journal entry operations
export const journalOperations = {
  // Get all journal entries for a user
  async getEntries(userId: string) {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching journal entries:', error);
        // Fall back to mock data for demo-user
        if (userId === 'demo-user-123') {
          console.log('Using mock data for demo user');
          return getMockJournalEntries();
        }
        return [];
      }
      
      return data || [];
    } catch (err) {
      console.error('Exception fetching journal entries:', err);
      if (userId === 'demo-user-123') {
        console.log('Using mock data for demo user after exception');
        return getMockJournalEntries();
      }
      return [];
    }
  },

  // Get entries with pagination
  async getEntriesPaginated(userId: string, page = 1, pageSize = 10) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('journal_entries')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) {
      console.error('Error fetching paginated journal entries:', error);
      return { data: [], count: 0 };
    }
    
    return { data: data || [], count: count || 0 };
  },

  // Get entries by emotion
  async getEntriesByEmotion(userId: string, emotion: string) {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('emotion', emotion)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error(`Error fetching journal entries with emotion ${emotion}:`, error);
      return [];
    }
    
    return data || [];
  },

  // Get entries by date range
  async getEntriesByDateRange(userId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching journal entries by date range:', error);
      return [];
    }
    
    return data || [];
  },

  // Get entries by tags
  async getEntriesByTags(userId: string, tags: string[]) {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .contains('tags', tags)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching journal entries by tags:', error);
      return [];
    }
    
    return data || [];
  },

  // Save a new journal entry
  async saveEntry(entry: Omit<JournalEntryDB, 'id' | 'created_at' | 'updated_at'>) {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('journal_entries')
      .insert([{ 
        ...entry, 
        created_at: now,
        updated_at: now,
        synced: true
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error saving journal entry:', error);
      throw error;
    }
    
    return data;
  },

  // Update an existing journal entry
  async updateEntry(id: string, updates: Partial<Omit<JournalEntryDB, 'id' | 'user_id' | 'created_at'>>) {
    const { data, error } = await supabase
      .from('journal_entries')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        synced: true
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating journal entry:', error);
      throw error;
    }
    
    return data;
  },

  // Toggle favorite status
  async toggleFavorite(id: string, isFavorite: boolean) {
    const { data, error } = await supabase
      .from('journal_entries')
      .update({
        is_favorite: isFavorite,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error toggling favorite status:', error);
      throw error;
    }
    
    return data;
  },

  // Delete a journal entry
  async deleteEntry(id: string) {
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting journal entry:', error);
      throw error;
    }
    
    return true;
  },

  // Bulk upload entries (for syncing offline entries)
  async bulkUploadEntries(entries: Omit<JournalEntryDB, 'created_at' | 'updated_at'>[]) {
    const now = new Date().toISOString();
    const preparedEntries = entries.map(entry => ({
      ...entry,
      updated_at: now,
      synced: true
    }));

    const { data, error } = await supabase
      .from('journal_entries')
      .upsert(preparedEntries, { 
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select();
    
    if (error) {
      console.error('Error bulk uploading journal entries:', error);
      throw error;
    }
    
    return data || [];
  },

  // Get emotion statistics
  async getEmotionStats(userId: string) {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('emotion, emotion_intensity')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching emotion statistics:', error);
      return [];
    }
    
    return data || [];
  },

  // Get tag statistics
  async getTagStats(userId: string) {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('tags')
      .eq('user_id', userId)
      .not('tags', 'is', null);
    
    if (error) {
      console.error('Error fetching tag statistics:', error);
      return [];
    }
    
    return data || [];
  },

  // Search entries by content or title
  async searchEntries(userId: string, searchTerm: string) {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
    
    if (error) {
      console.error('Error searching journal entries:', error);
      return [];
    }
    
    return data || [];
  }
};

// User authentication functions
export const authOperations = {
  // Get current user
  getCurrentUser() {
    return supabase.auth.getUser();
  },
  
  // Sign in with email and password
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      throw error;
    }
    
    return data;
  },
  
  // Sign up with email and password
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email, 
      password
    });
    
    if (error) {
      throw error;
    }
    
    return data;
  },
  
  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      throw error;
    }
    
    return true;
  },

  // Sign in with Google
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google'
    });
    
    if (error) {
      throw error;
    }
    
    return data;
  },

  // Update user profile
  async updateUserProfile(userId: string, updates: { name?: string, avatar_url?: string }) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  },

  // Reset password
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    
    if (error) {
      throw error;
    }
    
    return true;
  }
};

// Sync service for offline-online data synchronization
export const syncService = {
  async syncAll(userId: string) {
    try {
      // Import dynamically to avoid circular dependencies
      const { localStorageService } = await import('./localStorageService');
      
      // Get all unsynced entries
      const unsynced = localStorageService.getUnsyncedEntries();
      
      // Process creates
      let createdCount = 0;
      if (unsynced.create.length > 0) {
        const result = await journalOperations.bulkUploadEntries(
          unsynced.create.map(entry => ({
            ...entry,
            user_id: userId
          }))
        );
        createdCount = result.length;
        
        // Mark entries as synced
        localStorageService.markEntriesAsSynced(
          result.map(entry => entry.id)
        );
      }
      
      // Process updates
      let updatedCount = 0;
      for (const entry of unsynced.update) {
        try {
          const { id, user_id, created_at, ...updates } = entry;
          await journalOperations.updateEntry(id, updates);
          updatedCount++;
          
          // Mark as synced
          localStorageService.markEntriesAsSynced([id]);
        } catch (error) {
          console.error(`Error updating entry ${entry.id}:`, error);
        }
      }
      
      // Process deletes
      let deletedCount = 0;
      for (const id of unsynced.delete) {
        try {
          await journalOperations.deleteEntry(id);
          deletedCount++;
          
          // Mark as synced
          localStorageService.markEntriesAsSynced([id]);
        } catch (error) {
          console.error(`Error deleting entry ${id}:`, error);
        }
      }
      
      return {
        success: true,
        created: createdCount,
        updated: updatedCount,
        deleted: deletedCount,
        total: createdCount + updatedCount + deletedCount
      };
    } catch (error) {
      console.error('Error during sync operation:', error);
      return { 
        success: false, 
        error,
        created: 0,
        updated: 0,
        deleted: 0,
        total: 0
      };
    }
  },
  
  // Download all data from Supabase to local storage
  async downloadAll(userId: string) {
    try {
      // Import dynamically to avoid circular dependencies
      const { localStorageService } = await import('./localStorageService');
      
      // Clear local data first
      localStorageService.clearAllData();
      
      // Get all entries from server
      const entries = await journalOperations.getEntries(userId);
      
      // Store in local storage (mark all as synced)
      const syncedEntries = entries.map(entry => ({
        ...entry,
        synced: true
      }));
      
      // Store directly to localStorage to bypass individual operations
      localStorage.setItem('mindmate_journal_entries', JSON.stringify(syncedEntries));
      
      // Update last sync time
      localStorageService.updateLastSyncTime();
      
      return {
        success: true,
        count: entries.length
      };
    } catch (error) {
      console.error('Error downloading data:', error);
      return {
        success: false,
        error,
        count: 0
      };
    }
  },
  
  // Get sync status
  async getSyncStatus() {
    // Import dynamically to avoid circular dependencies
    const { localStorageService } = await import('./localStorageService');
    
    const unsynced = localStorageService.getUnsyncedEntries();
    const lastSyncTime = localStorageService.getLastSyncTime();
    const storageUsage = localStorageService.getStorageUsage();
    
    const unsyncedCount = 
      unsynced.create.length + 
      unsynced.update.length + 
      unsynced.delete.length;
    
    return {
      lastSync: lastSyncTime,
      unsyncedCount,
      hasUnsyncedChanges: unsyncedCount > 0,
      storageUsage
    };
  }
};

// Helper function to generate mock journal entries for the demo user when offline
function getMockJournalEntries(): JournalEntryDB[] {
  const now = new Date();
  const mockEntries: JournalEntryDB[] = [];
  
  // Generate entries for the past 14 days
  for (let i = 0; i < 14; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Alternate between different emotions
    const emotions = ['joy', 'sadness', 'anger', 'fear', 'neutral', 'surprise', 'love'];
    const emotion = emotions[i % emotions.length];
    
    mockEntries.push({
      id: `mock-${i}`,
      user_id: 'demo-user-123',
      title: `Demo Journal Entry ${i + 1}`,
      content: `This is a mock journal entry created for demo purposes when offline. It demonstrates a ${emotion} entry.`,
      emotion: emotion,
      emotion_intensity: Math.floor(Math.random() * 10) + 1,
      tags: ['demo', 'offline', emotion],
      created_at: date.toISOString(),
      updated_at: date.toISOString(),
      is_favorite: i % 5 === 0, // Make every 5th entry a favorite
      category: 'general',
      synced: false
    });
  }
  
  return mockEntries;
} 