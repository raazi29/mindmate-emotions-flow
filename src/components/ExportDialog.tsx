import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Download, 
  FileText, 
  Calendar as CalendarIcon, 
  Heart, 
  Tag, 
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { exportService, ExportOptions } from '@/services/ExportService';
import { JournalEntry } from '@/services/JournalService';
import { toast } from '@/hooks/use-toast';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: JournalEntry[];
  availableEmotions: string[];
  availableTags: string[];
}

const ExportDialog = ({
  open,
  onOpenChange,
  entries,
  availableEmotions,
  availableTags
}) => {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'pdf',
    template: 'detailed',
    includeAnalytics: true,
    includeCharts: false
  });
  
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  const updateOptions = (newOptions: Partial<ExportOptions>) => {
    setOptions(prev => ({ ...prev, ...newOptions }));
  };

  const toggleEmotion = (emotion: string) => {
    setSelectedEmotions(prev =>
      prev.includes(emotion)
        ? prev.filter(e => e !== emotion)
        : [...prev, emotion]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const getFilteredEntries = (): JournalEntry[] => {
    let filtered = [...entries];

    // Filter by date range
    if (dateRange.from && dateRange.to) {
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.created_at);
        return entryDate >= dateRange.from! && entryDate <= dateRange.to!;
      });
    }

    // Filter by emotions
    if (selectedEmotions.length > 0) {
      filtered = filtered.filter(entry => selectedEmotions.includes(entry.emotion));
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(entry =>
        entry.tags.some(tag => selectedTags.includes(tag))
      );
    }

    return filtered;
  };

  const handleExport = async () => {
    const filteredEntries = getFilteredEntries();
    
    if (filteredEntries.length === 0) {
      toast({
        title: "No entries to export",
        description: "Please adjust your filters to include some entries.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    setExportStatus('processing');
    setExportProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const exportOptions: ExportOptions = {
        ...options,
        dateRange: dateRange.from && dateRange.to 
          ? { start: dateRange.from, end: dateRange.to }
          : undefined,
        emotions: selectedEmotions.length > 0 ? selectedEmotions : undefined
      };

      let blob: Blob;
      let filename: string;

      if (options.format === 'pdf') {
        blob = await exportService.exportToPDF(filteredEntries, exportOptions);
        filename = exportService.generateFilename('pdf', exportOptions);
      } else {
        const jsonData = await exportService.exportToJSON(filteredEntries, exportOptions);
        blob = new Blob([jsonData], { type: 'application/json' });
        filename = exportService.generateFilename('json', exportOptions);
      }

      clearInterval(progressInterval);
      setExportProgress(100);

      // Download the file
      await exportService.downloadFile(blob, filename);

      setExportStatus('success');
      
      toast({
        title: "Export successful",
        description: `Your journal has been exported as ${filename}`,
      });

      // Close dialog after a short delay
      setTimeout(() => {
        onOpenChange(false);
        resetState();
      }, 2000);

    } catch (error) {
      console.error('Export error:', error);
      setExportStatus('error');
      
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "An error occurred during export",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const resetState = () => {
    setExportProgress(0);
    setExportStatus('idle');
    setDateRange({});
    setSelectedEmotions([]);
    setSelectedTags([]);
  };

  const filteredEntries = getFilteredEntries();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Journal
          </DialogTitle>
          <DialogDescription>
            Export your journal entries with customizable options and filters.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Format */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Export Format</Label>
            <RadioGroup
              value={options.format}
              onValueChange={(value: 'pdf' | 'json') => updateOptions({ format: value })}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  PDF Document
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  JSON Data
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Template Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Template</Label>
            <Select value={options.template} onValueChange={(value: any) => updateOptions({ template: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="detailed">Detailed - Full content with analytics</SelectItem>
                <SelectItem value="summary">Summary - Key information only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Include Options */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Include</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="analytics"
                  checked={options.includeAnalytics}
                  onCheckedChange={(checked) => updateOptions({ includeAnalytics: checked as boolean })}
                />
                <Label htmlFor="analytics">Analytics and insights</Label>
              </div>
              {options.format === 'pdf' && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="charts"
                    checked={options.includeCharts}
                    onCheckedChange={(checked) => updateOptions({ includeCharts: checked as boolean })}
                  />
                  <Label htmlFor="charts">Charts and visualizations</Label>
                </div>
              )}
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Date Range (Optional)
            </Label>
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
                    <span>All entries</span>
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
          </div>

          {/* Emotion Filter */}
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Emotions (Optional)
            </Label>
            <div className="flex flex-wrap gap-2">
              {availableEmotions.map((emotion) => (
                <Badge
                  key={emotion}
                  variant={selectedEmotions.includes(emotion) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => toggleEmotion(emotion)}
                >
                  {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                </Badge>
              ))}
            </div>
          </div>

          {/* Tag Filter */}
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tags (Optional)
            </Label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {availableTags.slice(0, 20).map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => toggleTag(tag)}
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Export Preview</span>
              <Badge variant="outline">
                {filteredEntries.length} entries
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredEntries.length === 0 
                ? "No entries match your current filters."
                : `Ready to export ${filteredEntries.length} journal entries as ${options.format.toUpperCase()}.`
              }
            </p>
          </div>

          {/* Export Progress */}
          <AnimatePresence>
            {isExporting && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  {exportStatus === 'processing' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {exportStatus === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {exportStatus === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                  <span className="text-sm font-medium">
                    {exportStatus === 'processing' && 'Generating export...'}
                    {exportStatus === 'success' && 'Export completed successfully!'}
                    {exportStatus === 'error' && 'Export failed'}
                  </span>
                </div>
                <Progress value={exportProgress} className="w-full" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || filteredEntries.length === 0}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {options.format.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;