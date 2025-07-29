import jsPDF from 'jspdf';
import { JournalEntry } from './JournalService';

export interface ExportOptions {
  dateRange?: { start: Date; end: Date };
  emotions?: string[];
  includeAnalytics: boolean;
  format: 'pdf' | 'json';
  template: 'detailed' | 'summary';
  includeCharts?: boolean;
}

export interface AnalyticsReport {
  totalEntries: number;
  dateRange: { start: string; end: string };
  emotionDistribution: { emotion: string; count: number; percentage: number }[];
  averageIntensity: number;
  mostFrequentEmotion: string;
  emotionTrends: { date: string; emotion: string; intensity: number }[];
  topTags: { tag: string; count: number }[];
  insights: string[];
}

class ExportService {
  async exportToPDF(entries: JournalEntry[], options: ExportOptions): Promise<Blob> {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Helper function to add new page if needed
    const checkPageBreak = (requiredHeight: number) => {
      if (yPosition + requiredHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
    };

    // Helper function to wrap text
    const wrapText = (text: string, maxWidth: number): string[] => {
      return pdf.splitTextToSize(text, maxWidth);
    };

    // Title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('MindMate Journal Export', margin, yPosition);
    yPosition += 15;

    // Export info
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += 8;
    pdf.text(`Total entries: ${entries.length}`, margin, yPosition);
    yPosition += 8;

    if (options.dateRange) {
      pdf.text(
        `Date range: ${options.dateRange.start.toLocaleDateString()} - ${options.dateRange.end.toLocaleDateString()}`,
        margin,
        yPosition
      );
      yPosition += 8;
    }

    yPosition += 10;

    // Analytics section
    if (options.includeAnalytics) {
      checkPageBreak(50);
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Analytics Summary', margin, yPosition);
      yPosition += 12;

      const analytics = this.generateAnalyticsReport(entries, options);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      // Emotion distribution
      pdf.text('Emotion Distribution:', margin, yPosition);
      yPosition += 8;
      
      analytics.emotionDistribution.forEach(item => {
        pdf.text(`• ${item.emotion}: ${item.count} entries (${item.percentage.toFixed(1)}%)`, margin + 10, yPosition);
        yPosition += 6;
        checkPageBreak(6);
      });
      
      yPosition += 5;
      
      // Key insights
      pdf.text('Key Insights:', margin, yPosition);
      yPosition += 8;
      
      analytics.insights.forEach(insight => {
        const wrappedInsight = wrapText(`• ${insight}`, pageWidth - margin * 2 - 10);
        wrappedInsight.forEach(line => {
          checkPageBreak(6);
          pdf.text(line, margin + 10, yPosition);
          yPosition += 6;
        });
      });
      
      yPosition += 15;
    }

    // Journal entries
    checkPageBreak(30);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Journal Entries', margin, yPosition);
    yPosition += 15;

    entries.forEach((entry, index) => {
      checkPageBreak(60);
      
      // Entry header
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${index + 1}. ${entry.title}`, margin, yPosition);
      yPosition += 8;
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Date: ${new Date(entry.created_at).toLocaleDateString()}`, margin, yPosition);
      pdf.text(`Emotion: ${entry.emotion} (${entry.emotion_intensity}/10)`, pageWidth / 2, yPosition);
      yPosition += 8;
      
      if (entry.tags.length > 0) {
        pdf.text(`Tags: ${entry.tags.join(', ')}`, margin, yPosition);
        yPosition += 8;
      }
      
      // Entry content
      pdf.setFontSize(10);
      const wrappedContent = wrapText(entry.content, pageWidth - margin * 2);
      wrappedContent.forEach(line => {
        checkPageBreak(6);
        pdf.text(line, margin, yPosition);
        yPosition += 6;
      });
      
      yPosition += 10;
      
      // Add separator line
      if (index < entries.length - 1) {
        checkPageBreak(5);
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 10;
      }
    });

    // Footer
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(
        `Page ${i} of ${totalPages} • MindMate Emotions Flow`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    return pdf.output('blob');
  }

  async exportToJSON(entries: JournalEntry[], options: ExportOptions): Promise<string> {
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalEntries: entries.length,
        dateRange: options.dateRange ? {
          start: options.dateRange.start.toISOString(),
          end: options.dateRange.end.toISOString()
        } : null,
        filters: {
          emotions: options.emotions,
          template: options.template
        },
        version: '1.0'
      },
      analytics: options.includeAnalytics ? this.generateAnalyticsReport(entries, options) : null,
      entries: entries.map(entry => ({
        ...entry,
        // Ensure dates are properly formatted
        created_at: new Date(entry.created_at).toISOString(),
        updated_at: new Date(entry.updated_at).toISOString()
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }

  generateAnalyticsReport(entries: JournalEntry[], options: ExportOptions): AnalyticsReport {
    if (entries.length === 0) {
      return {
        totalEntries: 0,
        dateRange: { start: '', end: '' },
        emotionDistribution: [],
        averageIntensity: 0,
        mostFrequentEmotion: 'neutral',
        emotionTrends: [],
        topTags: [],
        insights: ['No entries available for analysis.']
      };
    }

    // Calculate date range
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const dateRange = {
      start: sortedEntries[0].created_at,
      end: sortedEntries[sortedEntries.length - 1].created_at
    };

    // Emotion distribution
    const emotionCounts: Record<string, number> = {};
    let totalIntensity = 0;

    entries.forEach(entry => {
      emotionCounts[entry.emotion] = (emotionCounts[entry.emotion] || 0) + 1;
      totalIntensity += entry.emotion_intensity;
    });

    const emotionDistribution = Object.entries(emotionCounts)
      .map(([emotion, count]) => ({
        emotion,
        count,
        percentage: (count / entries.length) * 100
      }))
      .sort((a, b) => b.count - a.count);

    const mostFrequentEmotion = emotionDistribution[0]?.emotion || 'neutral';
    const averageIntensity = totalIntensity / entries.length;

    // Emotion trends (daily aggregation)
    const dailyEmotions: Record<string, { emotion: string; intensity: number; count: number }[]> = {};
    
    entries.forEach(entry => {
      const date = new Date(entry.created_at).toDateString();
      if (!dailyEmotions[date]) {
        dailyEmotions[date] = [];
      }
      dailyEmotions[date].push({
        emotion: entry.emotion,
        intensity: entry.emotion_intensity,
        count: 1
      });
    });

    const emotionTrends = Object.entries(dailyEmotions).map(([date, emotions]) => {
      const avgIntensity = emotions.reduce((sum, e) => sum + e.intensity, 0) / emotions.length;
      const dominantEmotion = emotions.reduce((prev, curr) => 
        emotions.filter(e => e.emotion === curr.emotion).length > 
        emotions.filter(e => e.emotion === prev.emotion).length ? curr : prev
      ).emotion;

      return {
        date,
        emotion: dominantEmotion,
        intensity: avgIntensity
      };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Top tags
    const tagCounts: Record<string, number> = {};
    entries.forEach(entry => {
      entry.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const topTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Generate insights
    const insights = this.generateInsights(entries, emotionDistribution, averageIntensity, topTags);

    return {
      totalEntries: entries.length,
      dateRange,
      emotionDistribution,
      averageIntensity,
      mostFrequentEmotion,
      emotionTrends,
      topTags,
      insights
    };
  }

  private generateInsights(
    entries: JournalEntry[],
    emotionDistribution: { emotion: string; count: number; percentage: number }[],
    averageIntensity: number,
    topTags: { tag: string; count: number }[]
  ): string[] {
    const insights: string[] = [];

    // Most frequent emotion insight
    if (emotionDistribution.length > 0) {
      const topEmotion = emotionDistribution[0];
      insights.push(
        `Your most frequent emotion is ${topEmotion.emotion}, appearing in ${topEmotion.percentage.toFixed(1)}% of your entries.`
      );
    }

    // Intensity insight
    if (averageIntensity > 7) {
      insights.push('Your emotions tend to be quite intense on average. Consider exploring coping strategies for emotional regulation.');
    } else if (averageIntensity < 4) {
      insights.push('Your emotional intensity is generally low. This could indicate emotional stability or potential emotional numbing.');
    } else {
      insights.push('Your emotional intensity levels appear balanced and moderate.');
    }

    // Emotional diversity insight
    const uniqueEmotions = emotionDistribution.length;
    if (uniqueEmotions >= 5) {
      insights.push('You experience a wide range of emotions, which indicates good emotional awareness.');
    } else if (uniqueEmotions <= 2) {
      insights.push('You tend to experience a limited range of emotions. Consider exploring what might be influencing this pattern.');
    }

    // Tag insights
    if (topTags.length > 0) {
      const topTag = topTags[0];
      insights.push(`Your most common topic is "${topTag.tag}", mentioned in ${topTag.count} entries.`);
    }

    // Positive vs negative emotions
    const positiveEmotions = ['joy', 'love', 'surprise'];
    const negativeEmotions = ['sadness', 'anger', 'fear'];
    
    const positiveCount = emotionDistribution
      .filter(e => positiveEmotions.includes(e.emotion))
      .reduce((sum, e) => sum + e.count, 0);
    
    const negativeCount = emotionDistribution
      .filter(e => negativeEmotions.includes(e.emotion))
      .reduce((sum, e) => sum + e.count, 0);

    const positivePercentage = (positiveCount / entries.length) * 100;
    const negativePercentage = (negativeCount / entries.length) * 100;

    if (positivePercentage > negativePercentage + 20) {
      insights.push('You tend to experience more positive emotions than negative ones, which is great for overall wellbeing.');
    } else if (negativePercentage > positivePercentage + 20) {
      insights.push('You experience more negative emotions than positive ones. Consider focusing on activities that bring you joy.');
    } else {
      insights.push('You have a balanced mix of positive and negative emotions.');
    }

    // Journaling frequency insight
    const daysSinceFirst = Math.ceil(
      (new Date().getTime() - new Date(entries[entries.length - 1].created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    const averageEntriesPerWeek = (entries.length / daysSinceFirst) * 7;

    if (averageEntriesPerWeek >= 3) {
      insights.push('You maintain a consistent journaling practice, which is excellent for emotional awareness.');
    } else if (averageEntriesPerWeek < 1) {
      insights.push('Consider journaling more frequently to better track your emotional patterns.');
    }

    return insights;
  }

  async downloadFile(blob: Blob, filename: string): Promise<void> {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  generateFilename(format: 'pdf' | 'json', options: ExportOptions): string {
    const date = new Date().toISOString().split('T')[0];
    const template = options.template;
    
    let filename = `mindmate-journal-${template}-${date}`;
    
    if (options.dateRange) {
      const start = options.dateRange.start.toISOString().split('T')[0];
      const end = options.dateRange.end.toISOString().split('T')[0];
      filename += `-${start}-to-${end}`;
    }
    
    return `${filename}.${format}`;
  }
}

export const exportService = new ExportService();