import { JournalEntryDB } from './supabase';

// Interfaces for storage
interface StorageKeys {
  JOURNAL_ENTRIES: string;
  UNSYNCED_ENTRIES: string;
  USER_PREFERENCES: string;
  LAST_SYNC: string;
}

// Define storage keys
const STORAGE_KEYS: StorageKeys = {
  JOURNAL_ENTRIES: 'mindmate_journal_entries',
  UNSYNCED_ENTRIES: 'mindmate_unsynced_entries',
  USER_PREFERENCES: 'mindmate_user_prefs',
  LAST_SYNC: 'mindmate_last_sync'
};

// Define service
export const localStorageService = {
  // Journal Entries
  getEntries(): JournalEntryDB[] {
    try {
      const entriesJson = localStorage.getItem(STORAGE_KEYS.JOURNAL_ENTRIES);
      return entriesJson ? JSON.parse(entriesJson) : [];
    } catch (error) {
      console.error('Error retrieving entries from local storage:', error);
      return [];
    }
  },

  saveEntry(entry: JournalEntryDB): JournalEntryDB {
    try {
      // Get existing entries
      const entries = this.getEntries();
      
      // Add the new entry
      entries.unshift({
        ...entry,
        synced: false
      });
      
      // Save back to storage
      localStorage.setItem(STORAGE_KEYS.JOURNAL_ENTRIES, JSON.stringify(entries));
      
      // Add to unsynced entries
      this.addUnsyncedEntry(entry);
      
      return entry;
    } catch (error) {
      console.error('Error saving entry to local storage:', error);
      throw error;
    }
  },

  updateEntry(id: string, updates: Partial<JournalEntryDB>): JournalEntryDB | null {
    try {
      // Get existing entries
      const entries = this.getEntries();
      
      // Find the entry to update
      const entryIndex = entries.findIndex(e => e.id === id);
      
      if (entryIndex === -1) {
        console.error(`Entry with id ${id} not found in local storage`);
        return null;
      }
      
      // Update the entry
      const updatedEntry = {
        ...entries[entryIndex],
        ...updates,
        updated_at: new Date().toISOString(),
        synced: false
      };
      
      entries[entryIndex] = updatedEntry;
      
      // Save back to storage
      localStorage.setItem(STORAGE_KEYS.JOURNAL_ENTRIES, JSON.stringify(entries));
      
      // Add to unsynced entries
      this.addUnsyncedEntry(updatedEntry);
      
      return updatedEntry;
    } catch (error) {
      console.error('Error updating entry in local storage:', error);
      throw error;
    }
  },

  deleteEntry(id: string): boolean {
    try {
      // Get existing entries
      const entries = this.getEntries();
      
      // Filter out the entry to delete
      const filteredEntries = entries.filter(e => e.id !== id);
      
      // Save back to storage
      localStorage.setItem(STORAGE_KEYS.JOURNAL_ENTRIES, JSON.stringify(filteredEntries));
      
      // Add to unsynced entries list as a delete operation
      this.addDeletedEntry(id);
      
      return true;
    } catch (error) {
      console.error('Error deleting entry from local storage:', error);
      throw error;
    }
  },

  // Unsynced entries management
  getUnsyncedEntries(): { create: JournalEntryDB[], update: JournalEntryDB[], delete: string[] } {
    try {
      const unsyncedJson = localStorage.getItem(STORAGE_KEYS.UNSYNCED_ENTRIES);
      return unsyncedJson 
        ? JSON.parse(unsyncedJson) 
        : { create: [], update: [], delete: [] };
    } catch (error) {
      console.error('Error retrieving unsynced entries from local storage:', error);
      return { create: [], update: [], delete: [] };
    }
  },

  addUnsyncedEntry(entry: JournalEntryDB): void {
    try {
      const unsynced = this.getUnsyncedEntries();
      
      // Check if entry already exists in create or update
      const existsInCreate = unsynced.create.some(e => e.id === entry.id);
      const existsInUpdate = unsynced.update.some(e => e.id === entry.id);
      
      if (existsInCreate) {
        // Update in create array
        unsynced.create = unsynced.create.map(e => 
          e.id === entry.id ? { ...entry, synced: false } : e
        );
      } else if (existsInUpdate) {
        // Update in update array
        unsynced.update = unsynced.update.map(e => 
          e.id === entry.id ? { ...entry, synced: false } : e
        );
      } else {
        // Add to appropriate array
        if (entry.created_at === entry.updated_at) {
          // New entry
          unsynced.create.push({ ...entry, synced: false });
        } else {
          // Updated entry
          unsynced.update.push({ ...entry, synced: false });
        }
      }
      
      localStorage.setItem(STORAGE_KEYS.UNSYNCED_ENTRIES, JSON.stringify(unsynced));
    } catch (error) {
      console.error('Error adding unsynced entry to local storage:', error);
    }
  },

  addDeletedEntry(id: string): void {
    try {
      const unsynced = this.getUnsyncedEntries();
      
      // Remove from create or update if present
      unsynced.create = unsynced.create.filter(e => e.id !== id);
      unsynced.update = unsynced.update.filter(e => e.id !== id);
      
      // Add to delete if not already there
      if (!unsynced.delete.includes(id)) {
        unsynced.delete.push(id);
      }
      
      localStorage.setItem(STORAGE_KEYS.UNSYNCED_ENTRIES, JSON.stringify(unsynced));
    } catch (error) {
      console.error('Error adding deleted entry to local storage:', error);
    }
  },

  clearUnsyncedEntries(): void {
    try {
      localStorage.setItem(
        STORAGE_KEYS.UNSYNCED_ENTRIES, 
        JSON.stringify({ create: [], update: [], delete: [] })
      );
    } catch (error) {
      console.error('Error clearing unsynced entries from local storage:', error);
    }
  },

  markEntriesAsSynced(ids: string[]): void {
    try {
      // Update main entries
      const entries = this.getEntries();
      const updatedEntries = entries.map(entry => 
        ids.includes(entry.id) ? { ...entry, synced: true } : entry
      );
      localStorage.setItem(STORAGE_KEYS.JOURNAL_ENTRIES, JSON.stringify(updatedEntries));
      
      // Clear from unsynced lists
      const unsynced = this.getUnsyncedEntries();
      unsynced.create = unsynced.create.filter(e => !ids.includes(e.id));
      unsynced.update = unsynced.update.filter(e => !ids.includes(e.id));
      unsynced.delete = unsynced.delete.filter(id => !ids.includes(id));
      
      localStorage.setItem(STORAGE_KEYS.UNSYNCED_ENTRIES, JSON.stringify(unsynced));
      
      // Update last sync time
      this.updateLastSyncTime();
    } catch (error) {
      console.error('Error marking entries as synced in local storage:', error);
    }
  },

  // User preferences
  getUserPreferences(): Record<string, any> {
    try {
      const prefsJson = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      return prefsJson ? JSON.parse(prefsJson) : {};
    } catch (error) {
      console.error('Error retrieving user preferences from local storage:', error);
      return {};
    }
  },

  setUserPreference(key: string, value: any): void {
    try {
      const prefs = this.getUserPreferences();
      prefs[key] = value;
      localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(prefs));
    } catch (error) {
      console.error('Error saving user preferences to local storage:', error);
    }
  },

  // Sync management
  getLastSyncTime(): Date | null {
    try {
      const lastSyncJson = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return lastSyncJson ? new Date(JSON.parse(lastSyncJson)) : null;
    } catch (error) {
      console.error('Error retrieving last sync time from local storage:', error);
      return null;
    }
  },

  updateLastSyncTime(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, JSON.stringify(new Date().toISOString()));
    } catch (error) {
      console.error('Error updating last sync time in local storage:', error);
    }
  },

  // Utility functions
  clearAllData(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.JOURNAL_ENTRIES);
      localStorage.removeItem(STORAGE_KEYS.UNSYNCED_ENTRIES);
      localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
      // Don't clear user preferences
    } catch (error) {
      console.error('Error clearing all data from local storage:', error);
    }
  },

  getStorageUsage(): { used: number, quota: number, percent: number } {
    try {
      const itemSize = (key: string) => {
        const item = localStorage.getItem(key);
        return item ? new Blob([item]).size : 0;
      };
      
      const used = Object.values(STORAGE_KEYS).reduce((size, key) => size + itemSize(key), 0);
      
      const quota = navigator.storage ? 
        (navigator.storage as any).estimate().then((estimate: any) => estimate.quota) :
        5 * 1024 * 1024; // Assume 5MB if not available
      
      return {
        used,
        quota: typeof quota === 'number' ? quota : 5 * 1024 * 1024,
        percent: typeof quota === 'number' ? (used / quota) * 100 : 0
      };
    } catch (error) {
      console.error('Error calculating storage usage:', error);
      return { used: 0, quota: 0, percent: 0 };
    }
  }
}; 