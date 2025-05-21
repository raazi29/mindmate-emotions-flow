import React, { useState } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Textarea } from "@/components/ui/textarea";
import { 
  Calendar as CalendarIcon,
  BookText,
  ArrowUpDown,
  BarChart3,
  Mic,
  Play,
  Pause,
  Share2,
  Save,
  PlusCircle,
  FileText,
  Cloud,
  Search,
  Calendar,
  X,
  AlignLeft,
  Download
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { format } from "date-fns";
import { v4 as uuidv4 } from 'uuid';

interface Entry {
  id: string;
  date: Date;
  title: string;
  content: string;
  mood: string;
  energy: number;
  tags: string[];
}

interface MoodFrequency {
  name: string;
  value: number;
  color: string;
}

const MOODS = [
  { name: "Happy", emoji: "😊", color: "#4ade80" },
  { name: "Calm", emoji: "😌", color: "#60a5fa" },
  { name: "Sad", emoji: "😢", color: "#94a3b8" },
  { name: "Angry", emoji: "😠", color: "#f87171" },
  { name: "Anxious", emoji: "😰", color: "#fbbf24" },
  { name: "Tired", emoji: "😴", color: "#a78bfa" },
  { name: "Excited", emoji: "🤩", color: "#fb923c" },
  { name: "Neutral", emoji: "😐", color: "#9ca3af" },
];

const MoodJournalPage = () => {
  const [entries, setEntries] = useState<Entry[]>([
    {
      id: "1",
      date: new Date(2023, 4, 1),
      title: "Productive day at work",
      content: "Had a great day at work today. Completed several tasks ahead of schedule and received positive feedback from my manager.",
      mood: "Happy",
      energy: 8,
      tags: ["work", "accomplishment", "productivity"],
    },
    {
      id: "2",
      date: new Date(2023, 4, 3),
      title: "Feeling overwhelmed",
      content: "Too many deadlines approaching at once. Having trouble focusing and feeling anxious about getting everything done in time.",
      mood: "Anxious",
      energy: 5,
      tags: ["work", "stress", "deadlines"],
    },
    {
      id: "3",
      date: new Date(2023, 4, 5),
      title: "Relaxing weekend",
      content: "Spent the weekend at home, reading and watching movies. It was nice to have some quiet time to myself.",
      mood: "Calm",
      energy: 4,
      tags: ["weekend", "relaxation", "self-care"],
    },
    {
      id: "4",
      date: new Date(2023, 4, 8),
      title: "Argument with friend",
      content: "Had a disagreement with a close friend. Feeling upset about how things were left. Hope we can resolve it soon.",
      mood: "Sad",
      energy: 3,
      tags: ["relationship", "conflict", "emotions"],
    },
    {
      id: "5",
      date: new Date(2023, 4, 10),
      title: "Big project launch",
      content: "Our team's project finally launched! Everyone's hard work paid off and the initial feedback is very positive.",
      mood: "Excited",
      energy: 9,
      tags: ["work", "accomplishment", "team"],
    },
    {
      id: "6",
      date: new Date(2023, 4, 12),
      title: "Just an ordinary day",
      content: "Nothing particularly notable happened today. Work was routine, evening was quiet.",
      mood: "Neutral",
      energy: 5,
      tags: ["routine", "ordinary"],
    },
    {
      id: "7",
      date: new Date(2023, 4, 15),
      title: "Frustrating meeting",
      content: "The team meeting didn't go as planned. People talked over each other and we didn't accomplish anything.",
      mood: "Angry",
      energy: 6,
      tags: ["work", "frustration", "meetings"],
    },
    {
      id: "8",
      date: new Date(2023, 4, 18),
      title: "Exhausted after long week",
      content: "This week was particularly challenging. Feeling completely drained and just want to sleep all weekend.",
      mood: "Tired",
      energy: 2,
      tags: ["fatigue", "work", "burnout"],
    },
  ]);

  const [newEntry, setNewEntry] = useState({
    title: "",
    content: "",
    mood: "Neutral",
    energy: 5,
    tags: "",
  });

  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Calculate mood frequency for pie chart
  const moodFrequencyData: MoodFrequency[] = MOODS.map(mood => {
    return {
      name: mood.name,
      value: entries.filter(entry => entry.mood === mood.name).length,
      color: mood.color
    };
  }).filter(item => item.value > 0);

  // Create data for mood trends chart
  const moodTrendsData = entries
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(entry => {
      const moodValue = MOODS.findIndex(m => m.name === entry.mood);
      return {
        date: format(entry.date, "MMM dd"),
        mood: moodValue >= 0 ? moodValue : 0,
        energy: entry.energy,
        name: entry.mood
      };
    });

  const handleAddEntry = () => {
    if (newEntry.title.trim() === "" || newEntry.content.trim() === "") {
      return;
    }

    const entryToAdd: Entry = {
      id: uuidv4(),
      date: new Date(),
      title: newEntry.title,
      content: newEntry.content,
      mood: newEntry.mood,
      energy: newEntry.energy,
      tags: newEntry.tags.split(",").map(tag => tag.trim()).filter(tag => tag !== ""),
    };

    setEntries([...entries, entryToAdd]);
    setNewEntry({
      title: "",
      content: "",
      mood: "Neutral",
      energy: 5,
      tags: "",
    });
  };

  const handleRecordToggle = () => {
    setIsRecording(!isRecording);
    // In a real app, would integrate with Web Speech API or similar
  };

  const handlePlayToggle = () => {
    setIsPlaying(!isPlaying);
    // In a real app, would use text-to-speech API
  };

  const filteredEntries = entries.filter(
    entry =>
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getMoodEmoji = (moodName: string) => {
    const mood = MOODS.find(m => m.name === moodName);
    return mood ? mood.emoji : "😐";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto pt-24 pb-10 px-4">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center gap-2">
            <BookText className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Mood Journal</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Dashboard & Insights */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Mood Insights</CardTitle>
                  <CardDescription>Visualizing your emotional patterns</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="trends">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="trends" className="flex items-center gap-1">
                        <BarChart3 className="h-4 w-4" /> Mood Trends
                      </TabsTrigger>
                      <TabsTrigger value="distribution" className="flex items-center gap-1">
                        <ArrowUpDown className="h-4 w-4" /> Distribution
                      </TabsTrigger>
                      <TabsTrigger value="calendar" className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" /> Calendar
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="trends" className="pt-4">
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={moodTrendsData}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.2} />
                              </linearGradient>
                              <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f87171" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#f87171" stopOpacity={0.2} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                            <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                            <YAxis stroke="#9ca3af" fontSize={12} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', border: 'none', borderRadius: '6px', color: '#f3f4f6' }}
                              formatter={(value, name) => [name === 'mood' ? MOODS[value as number]?.name || 'Unknown' : value, name === 'mood' ? 'Mood' : 'Energy Level']}
                            />
                            <Area
                              type="monotone"
                              dataKey="mood"
                              stroke="#60a5fa"
                              fillOpacity={1}
                              fill="url(#moodGradient)"
                            />
                            <Area
                              type="monotone"
                              dataKey="energy"
                              stroke="#f87171"
                              fillOpacity={1}
                              fill="url(#energyGradient)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="distribution" className="pt-4">
                      <div className="flex flex-col md:flex-row items-center justify-center">
                        <div className="w-full md:w-1/2 h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={moodFrequencyData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              >
                                {moodFrequencyData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip 
                                formatter={(value) => [`${value} entries`, 'Frequency']}
                                contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', border: 'none', borderRadius: '6px', color: '#f3f4f6' }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="w-full md:w-1/2 flex flex-col items-center mt-4 md:mt-0">
                          <h3 className="text-lg font-medium mb-4">Top Moods</h3>
                          <ul className="space-y-2 w-full max-w-xs">
                            {moodFrequencyData
                              .sort((a, b) => b.value - a.value)
                              .slice(0, 5)
                              .map((mood, index) => (
                                <li key={index} className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: mood.color }}></div>
                                    <span className="flex items-center">
                                      {getMoodEmoji(mood.name)} {mood.name}
                                    </span>
                                  </div>
                                  <Badge variant="outline">{mood.value}</Badge>
                                </li>
                              ))}
                          </ul>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="calendar" className="pt-4">
                      <div className="h-[300px] flex items-center justify-center">
                        <div className="text-center">
                          <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground">Calendar view coming soon</p>
                          <p className="text-xs text-muted-foreground mt-2">This feature is under development</p>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* New entry form */}
              <Card className="mt-6">
                <CardHeader className="pb-3">
                  <CardTitle>New Journal Entry</CardTitle>
                  <CardDescription>Express how you're feeling today</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Input
                        placeholder="Entry Title"
                        value={newEntry.title}
                        onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                      />
                    </div>
                    <div className="relative">
                      <Textarea
                        placeholder="How are you feeling today?"
                        className="min-h-[150px] resize-none"
                        value={newEntry.content}
                        onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                      />
                      <div className="absolute right-2 bottom-2 flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleRecordToggle}
                          className={isRecording ? "text-red-500" : ""}
                        >
                          <Mic className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handlePlayToggle}
                          disabled={newEntry.content.trim() === ""}
                        >
                          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Current Mood</label>
                        <div className="grid grid-cols-4 gap-2">
                          {MOODS.map((mood) => (
                            <Button
                              key={mood.name}
                              variant={newEntry.mood === mood.name ? "default" : "outline"}
                              className="h-10 px-2"
                              onClick={() => setNewEntry({ ...newEntry, mood: mood.name })}
                            >
                              <span className="mr-1">{mood.emoji}</span>
                              <span className="text-xs">{mood.name}</span>
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Energy Level: {newEntry.energy}/10</label>
                        <Input
                          type="range"
                          min="1"
                          max="10"
                          value={newEntry.energy}
                          onChange={(e) => setNewEntry({ ...newEntry, energy: parseInt(e.target.value) })}
                          className="w-full"
                        />
                        <Input
                          placeholder="Tags (comma separated)"
                          value={newEntry.tags}
                          onChange={(e) => setNewEntry({ ...newEntry, tags: e.target.value })}
                          className="mt-4"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="ghost" onClick={() => setNewEntry({
                    title: "",
                    content: "",
                    mood: "Neutral",
                    energy: 5,
                    tags: "",
                  })}>
                    <X className="mr-2 h-4 w-4" /> Clear
                  </Button>
                  <Button onClick={handleAddEntry}>
                    <Save className="mr-2 h-4 w-4" /> Save Entry
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Entry list and search */}
            <div className="lg:col-span-1">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Previous Entries</span>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" /> Export
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Export Journal Entries</DialogTitle>
                          <DialogDescription>
                            Your data will be exported in the selected format. This file will contain all your journal entries.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4 py-4">
                          <Button variant="outline" className="flex flex-col items-center justify-center h-24">
                            <FileText className="h-8 w-8 mb-2" />
                            <span>PDF Format</span>
                          </Button>
                          <Button variant="outline" className="flex flex-col items-center justify-center h-24">
                            <AlignLeft className="h-8 w-8 mb-2" />
                            <span>Text Format</span>
                          </Button>
                          <Button variant="outline" className="flex flex-col items-center justify-center h-24">
                            <Cloud className="h-8 w-8 mb-2" />
                            <span>Cloud Backup</span>
                          </Button>
                          <Button variant="outline" className="flex flex-col items-center justify-center h-24">
                            <Share2 className="h-8 w-8 mb-2" />
                            <span>Share with Therapist</span>
                          </Button>
                        </div>
                        <DialogFooter>
                          <Button variant="outline">Cancel</Button>
                          <Button>Download</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardTitle>
                  <CardDescription>
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search entries..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow overflow-hidden">
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      {filteredEntries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-center">
                          <FileText className="h-10 w-10 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">No entries found</p>
                          {searchTerm && <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>}
                        </div>
                      ) : (
                        filteredEntries
                          .sort((a, b) => b.date.getTime() - a.date.getTime())
                          .map((entry) => (
                            <div
                              key={entry.id}
                              className="p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                              onClick={() => setSelectedEntry(entry)}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-medium">{entry.title}</h3>
                                  <p className="text-xs text-muted-foreground">
                                    {format(entry.date, "PPP")}
                                  </p>
                                </div>
                                <div className="text-xl" title={entry.mood}>
                                  {getMoodEmoji(entry.mood)}
                                </div>
                              </div>
                              <p className="mt-2 text-sm line-clamp-2 text-muted-foreground">
                                {entry.content}
                              </p>
                              {entry.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {entry.tags.map((tag, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant="outline">
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Entry
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Entry Detail Dialog */}
      {selectedEntry && (
        <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>{selectedEntry.title}</DialogTitle>
                <div className="text-2xl">{getMoodEmoji(selectedEntry.mood)}</div>
              </div>
              <DialogDescription>
                {format(selectedEntry.date, "PPPP")} · Energy Level: {selectedEntry.energy}/10
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="whitespace-pre-wrap">{selectedEntry.content}</p>
              {selectedEntry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-4">
                  {selectedEntry.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter className="flex justify-between items-center">
              <div className="flex space-x-2">
                <Button variant="ghost" size="icon">
                  <Play className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="default" onClick={() => setSelectedEntry(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default MoodJournalPage; 