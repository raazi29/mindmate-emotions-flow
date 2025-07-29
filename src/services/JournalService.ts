import { supabase } from '@/lib/SupabaseConfig';
import { detectEmotionOpenRouter } from '@/utils/openRouterAPI';

export interface JournalEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  emotion: string;
  emotion_intensity: number;
  confidence: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  synced: boolean;
  is_favorite?: boolean;
  category?: string;
  location?: string;
  weather?: string;
  mood_score?: number;
  media_urls?: string[];
}

export interface SearchFilters {
  query?: string;
  emotions?: string[];
  dateRange?: { start: Date; end: Date };
  tags?: string[];
  sortBy: 'date' | 'emotion' | 'relevance';
  sortOrder: 'asc' | 'desc';
}

export interface SearchResult extends JournalEntry {
  relevanceScore?: number;
}

class JournalService {
  private offlineEntries: JournalEntry[] = [];
  private isOnline = navigator.onLine;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Load offline entries from localStorage
    this.loadOfflineEntries();
  }

  private handleOnline() {
    this.isOnline = true;
    this.syncOfflineEntries();
  }

  private handleOffline() {
    this.isOnline = false;
  }

  private loadOfflineEntries() {
    try {
      const stored = localStorage.getItem('mindmate_offline_entries');
      if (stored) {
        this.offlineEntries = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading offline entries:', error);
    }
  }

  private saveOfflineEntries() {
    try {
      localStorage.setItem('mindmate_offline_entries', JSON.stringify(this.offlineEntries));
    } catch (error) {
      console.error('Error saving offline entries:', error);
    }
  }

  private async syncOfflineEntries() {
    if (!this.isOnline || this.offlineEntries.length === 0) return;

    try {
      for (const entry of this.offlineEntries) {
        if (!entry.synced) {
          if (entry.id.startsWith('offline_')) {
            // Create new entry
            const { id, ...entryData } = entry;
            await this.createEntryOnline({ ...entryData, synced: true });
          } else {
            // Update existing entry
            await this.updateEntryOnline(entry.id, entry);
          }
        }
      }
      
      // Clear synced offline entries
      this.offlineEntries = this.offlineEntries.filter(entry => !entry.synced);
      this.saveOfflineEntries();
    } catch (error) {
      console.error('Error syncing offline entries:', error);
    }
  }

  private extractTags(content: string): string[] {
    const tagRegex = /#(\w+)/g;
    const matches = content.match(tagRegex);
    return matches ? matches.map(tag => tag.substring(1).toLowerCase()) : [];
  }

  private async analyzeEmotion(text: string): Promise<{ emotion: string; confidence: number; intensity: number }> {
    try {
      const result = await detectEmotionOpenRouter(text);
      return {
        emotion: result.emotion,
        confidence: result.confidence,
        intensity: result.intensity || 5
      };
    } catch (error) {
      console.error('Error analyzing emotion:', error);
      return {
        emotion: 'neutral',
        confidence: 0.5,
        intensity: 5
      };
    }
  }

  async createEntry(entryData: Partial<JournalEntry>): Promise<JournalEntry> {
    // Analyze emotion
    const emotionAnalysis = await this.analyzeEmotion(entryData.content || '');
    
    // Extract tags
    const tags = this.extractTags(entryData.content || '');

    const entry: JournalEntry = {
      id: this.isOnline ? crypto.randomUUID() : `offline_${Date.now()}`,
      user_id: entryData.user_id || '',
      title: entryData.title || '',
      content: entryData.content || '',
      emotion: emotionAnalysis.emotion,
      emotion_intensity: emotionAnalysis.intensity,
      confidence: emotionAnalysis.confidence,
      tags,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced: this.isOnline,
      is_favorite: entryData.is_favorite || false,
      category: entryData.category,
      location: entryData.location,
      weather: entryData.weather,
      mood_score: entryData.mood_score,
      media_urls: entryData.media_urls || []
    };

    if (this.isOnline) {
      return await this.createEntryOnline(entry);
    } else {
      // Store offline
      this.offlineEntries.push(entry);
      this.saveOfflineEntries();
      return entry;
    }
  }

  private async createEntryOnline(entry: JournalEntry): Promise<JournalEntry> {
    const { data, error } = await supabase
      .from('journal_entries')
      .insert([entry])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create entry: ${error.message}`);
    }

    return data;
  }

  async getEntries(userId: string): Promise<JournalEntry[]> {
    let onlineEntries: JournalEntry[] = [];
    
    if (this.isOnline) {
      try {
        const { data, error } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          throw new Error(`Failed to fetch entries: ${error.message}`);
        }

        onlineEntries = data || [];
      } catch (error) {
        console.error('Error fetching online entries:', error);
      }
    }

    // Combine with offline entries
    const userOfflineEntries = this.offlineEntries.filter(entry => entry.user_id === userId);
    const allEntries = [...onlineEntries, ...userOfflineEntries];

    // Sort by created_at descending
    return allEntries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async updateEntry(id: string, updates: Partial<JournalEntry>): Promise<JournalEntry> {
    // Re-analyze emotion if content changed
    let emotionAnalysis = null;
    if (updates.content) {
      emotionAnalysis = await this.analyzeEmotion(updates.content);
      updates.tags = this.extractTags(updates.content);
    }

    const updatedData = {
      ...updates,
      ...(emotionAnalysis && {
        emotion: emotionAnalysis.emotion,
        emotion_intensity: emotionAnalysis.intensity,
        confidence: emotionAnalysis.confidence
      }),
      updated_at: new Date().toISOString(),
      synced: this.isOnline
    };

    if (this.isOnline && !id.startsWith('offline_')) {
      return await this.updateEntryOnline(id, updatedData);
    } else {
      // Update offline entry
      const entryIndex = this.offlineEntries.findIndex(entry => entry.id === id);
      if (entryIndex !== -1) {
        this.offlineEntries[entryIndex] = { ...this.offlineEntries[entryIndex], ...updatedData };
        this.saveOfflineEntries();
        return this.offlineEntries[entryIndex];
      }
      throw new Error('Entry not found');
    }
  }

  private async updateEntryOnline(id: string, updates: Partial<JournalEntry>): Promise<JournalEntry> {
    const { data, error } = await supabase
      .from('journal_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update entry: ${error.message}`);
    }

    return data;
  }

  async deleteEntry(id: string): Promise<void> {
    if (this.isOnline && !id.startsWith('offline_')) {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete entry: ${error.message}`);
      }
    } else {
      // Remove from offline entries
      this.offlineEntries = this.offlineEntries.filter(entry => entry.id !== id);
      this.saveOfflineEntries();
    }
  }

  async searchEntries(userId: string, filters: SearchFilters): Promise<SearchResult[]> {
    const entries = await this.getEntries(userId);
    let filteredEntries = [...entries];

    // Apply filters
    if (filters.query) {
      const query = filters.query.toLowerCase();
      filteredEntries = filteredEntries.filter(entry =>
        entry.title.toLowerCase().includes(query) ||
        entry.content.toLowerCase().includes(query) ||
        entry.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (filters.emotions && filters.emotions.length > 0) {
      filteredEntries = filteredEntries.filter(entry =>
        filters.emotions!.includes(entry.emotion)
      );
    }

    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      filteredEntries = filteredEntries.filter(entry => {
        const entryDate = new Date(entry.created_at);
        return entryDate >= start && entryDate <= end;
      });
    }

    if (filters.tags && filters.tags.length > 0) {
      filteredEntries = filteredEntries.filter(entry =>
        filters.tags!.some(tag => entry.tags.includes(tag))
      );
    }

    // Sort results
    filteredEntries.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'emotion':
          comparison = a.emotion.localeCompare(b.emotion);
          break;
        case 'relevance':
          // Simple relevance scoring based on query matches
          if (filters.query) {
            const aScore = this.calculateRelevanceScore(a, filters.query);
            const bScore = this.calculateRelevanceScore(b, filters.query);
            comparison = bScore - aScore;
          }
          break;
      }

      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filteredEntries.map(entry => ({
      ...entry,
      relevanceScore: filters.query ? this.calculateRelevanceScore(entry, filters.query) : undefined
    }));
  }

  private calculateRelevanceScore(entry: JournalEntry, query: string): number {
    const queryLower = query.toLowerCase();
    let score = 0;

    // Title matches are worth more
    if (entry.title.toLowerCase().includes(queryLower)) {
      score += 10;
    }

    // Content matches
    const contentMatches = (entry.content.toLowerCase().match(new RegExp(queryLower, 'g')) || []).length;
    score += contentMatches * 2;

    // Tag matches
    const tagMatches = entry.tags.filter(tag => tag.toLowerCase().includes(queryLower)).length;
    score += tagMatches * 5;

    return score;
  }

  async getEmotionStats(userId: string): Promise<{
    emotionDistribution: { emotion: string; count: number; percentage: number }[];
    totalEntries: number;
    averageIntensity: number;
    mostFrequentEmotion: string;
  }> {
    const entries = await this.getEntries(userId);
    const totalEntries = entries.length;

    if (totalEntries === 0) {
      return {
        emotionDistribution: [],
        totalEntries: 0,
        averageIntensity: 0,
        mostFrequentEmotion: 'neutral'
      };
    }

    // Calculate emotion distribution
    const emotionCounts: Record<string, number> = {};
    let totalIntensity = 0;

    entries.forEach(entry => {
      emotionCounts[entry.emotion] = (emotionCounts[entry.emotion] || 0) + 1;
      totalIntensity += entry.emotion_intensity;
    });

    const emotionDistribution = Object.entries(emotionCounts).map(([emotion, count]) => ({
      emotion,
      count,
      percentage: (count / totalEntries) * 100
    }));

    const mostFrequentEmotion = Object.entries(emotionCounts).reduce((a, b) => 
      emotionCounts[a[0]] > emotionCounts[b[0]] ? a : b
    )[0];

    return {
      emotionDistribution,
      totalEntries,
      averageIntensity: totalIntensity / totalEntries,
      mostFrequentEmotion
    };
  }

  async getTagSuggestions(userId: string, query: string): Promise<string[]> {
    const entries = await this.getEntries(userId);
    const allTags = entries.flatMap(entry => entry.tags);
    const uniqueTags = [...new Set(allTags)];
    
    if (!query) return uniqueTags.slice(0, 10);
    
    return uniqueTags
      .filter(tag => tag.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10);
  }

  isOffline(): boolean {
    return !this.isOnline;
  }

  hasUnsyncedEntries(): boolean {
    return this.offlineEntries.some(entry => !entry.synced);
  }

  async forcSync(): Promise<void> {
    if (this.isOnline) {
      await this.syncOfflineEntries();
    }
  }
}

export const journalService = new JournalService();