import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  Tag, 
  Heart, 
  X,
  SortAsc,
  SortDesc,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchFilters } from '@/services/JournalService';
import { format } from 'date-fns';

interface JournalSearchFilterProps {
  onFiltersChange: (filters: SearchFilters) => void;
  availableEmotions: string[];
  availableTags: string[];
  className?: string;
}

const JournalSearchFilter: React.FC<JournalSearchFilterProps> = ({
  onFiltersChange,
  availableEmotions,
  availableTags,
  className = ''
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    emotions: [],
    dateRange: undefined,
    tags: [],
    sortBy: 'date',
    sortOrder: 'desc'
  });
  
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  useEffect(() => {
    // Update filters when date range changes
    const updatedFilters = {
      ...filters,
      dateRange: dateRange.from && dateRange.to 
        ? { start: dateRange.from, end: dateRange.to }
        : undefined
    };
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  }, [dateRange]);

  const updateFilters = (newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const handleSearchChange = (query: string) => {
    updateFilters({ query });
  };

  const toggleEmotion = (emotion: string) => {
    const emotions = filters.emotions?.includes(emotion)
      ? filters.emotions.filter(e => e !== emotion)
      : [...(filters.emotions || []), emotion];
    updateFilters({ emotions });
  };

  const toggleTag = (tag: string) => {
    const tags = filters.tags?.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...(filters.tags || []), tag];
    updateFilters({ tags });
  };

  const clearFilters = () => {
    const clearedFilters: SearchFilters = {
      query: '',
      emotions: [],
      dateRange: undefined,
      tags: [],
      sortBy: 'date',
      sortOrder: 'desc'
    };
    setFilters(clearedFilters);
    setDateRange({});
    onFiltersChange(clearedFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.query) count++;
    if (filters.emotions && filters.emotions.length > 0) count++;
    if (filters.tags && filters.tags.length > 0) count++;
    if (filters.dateRange) count++;
    return count;
  };

  const getEmotionColor = (emotion: string): string => {
    const colors: Record<string, string> = {
      joy: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
      sadness: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
      anger: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
      fear: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
      love: 'bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200',
      surprise: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
      neutral: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200',
    };
    return colors[emotion] || colors.neutral;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={filters.query}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search your journal entries..."
          className="pl-10 pr-4"
        />
      </div>

      {/* Quick Filters and Advanced Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {getActiveFilterCount() > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {getActiveFilterCount()}
              </Badge>
            )}
          </Button>

          {getActiveFilterCount() > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <Select value={filters.sortBy} onValueChange={(value: any) => updateFilters({ sortBy: value })}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="emotion">Emotion</SelectItem>
              <SelectItem value="relevance">Relevance</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => updateFilters({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
          >
            {filters.sortOrder === 'asc' ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
              {/* Emotion Filters */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Emotions
                </Label>
                <div className="flex flex-wrap gap-2">
                  {availableEmotions.map((emotion) => (
                    <Badge
                      key={emotion}
                      variant={filters.emotions?.includes(emotion) ? "default" : "outline"}
                      className={`cursor-pointer transition-colors ${
                        filters.emotions?.includes(emotion) 
                          ? getEmotionColor(emotion)
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => toggleEmotion(emotion)}
                    >
                      {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Tag Filters */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </Label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {availableTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={filters.tags?.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => toggleTag(tag)}
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Date Range
                </Label>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} -{" "}
                              {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange.from}
                        selected={{ from: dateRange.from, to: dateRange.to }}
                        onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>

                  {(dateRange.from || dateRange.to) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDateRange({})}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filters Display */}
      <AnimatePresence>
        {getActiveFilterCount() > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap gap-2"
          >
            {filters.query && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Search className="h-3 w-3" />
                "{filters.query}"
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                  onClick={() => handleSearchChange('')}
                />
              </Badge>
            )}

            {filters.emotions?.map((emotion) => (
              <Badge 
                key={emotion} 
                className={`flex items-center gap-1 ${getEmotionColor(emotion)}`}
              >
                <Heart className="h-3 w-3" />
                {emotion}
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                  onClick={() => toggleEmotion(emotion)}
                />
              </Badge>
            ))}

            {filters.tags?.map((tag) => (
              <Badge key={tag} variant="outline" className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                #{tag}
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                  onClick={() => toggleTag(tag)}
                />
              </Badge>
            ))}

            {filters.dateRange && (
              <Badge variant="outline" className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {format(filters.dateRange.start, "MMM dd")} - {format(filters.dateRange.end, "MMM dd")}
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                  onClick={() => setDateRange({})}
                />
              </Badge>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JournalSearchFilter;