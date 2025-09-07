import { useState, useEffect, useRef, ChangeEvent } from 'react';
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  MessageCircle, 
  Send, 
  Shield, 
  Users, 
  Flag, 
  Info, 
  Plus, 
  Settings, 
  Heart,
  Smile,
  Frown,
  Meh,
  Clock,
  Bell,
  X,
  Image,
  Paperclip,
  Video,
  Mic,
  HelpCircle,
  AlertCircle,
  ThumbsUp,
  Filter,
  Search,
  RefreshCw,
  Lock,
  User,
  LogOut,
  Edit,
  Trash2,
  Reply,
  Database
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { v4 as uuidv4 } from 'uuid';
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
// Import Supabase chat service
import { SupabaseChatService, Message as SupabaseMessage, Room as SupabaseRoom, UserPresence } from "@/lib/supabase-chat-service";

// Create a new instance of the Supabase chat service
const chatService = new SupabaseChatService();

// Update the types to align with Supabase
type MessageType = 'text' | 'image' | 'notification' | 'system';

type Message = {
  id: string;
  sender: string;
  avatar: string;
  content: string;
  timestamp: Date;
  type: MessageType;
  isLiked?: boolean;
  likeCount?: number;
  reactions?: Reaction[];
  attachments?: Attachment[];
  isEdited?: boolean;
  isDeleted?: boolean;
  replyTo?: string;
  isOffline?: boolean;
  senderId?: string; // Added for Supabase integration
};

type Reaction = {
  emoji: string;
  count: number;
  users: string[];
};

type Attachment = {
  id: string;
  type: 'image' | 'file' | 'audio';
  url: string;
  name: string;
  size?: number;
  preview?: string;
  contentType?: string; // Added for Supabase integration
};

type UserStatus = 'online' | 'away' | 'busy' | 'offline';

type User = {
  id: string;
  username: string;
  avatar: string;
  status: UserStatus;
  lastActive?: Date;
  isModerator?: boolean;
  joinedAt: Date;
};

type ChatNotification = {
  id: string;
  title: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  type: 'message' | 'system' | 'mention' | 'moderation';
};

type Room = {
  id: string;
  name: string;
  icon: JSX.Element;
  mood: string;
  activeUsers: number;
  description: string;
  messages: Message[];
  topic?: string;
  createdAt?: Date;
  members?: User[];
  isPrivate?: boolean;
  hasUnreadMessages?: boolean;
  createdBy?: string; // Added for Supabase integration
};

// Convert Supabase room to our room format
const convertSupabaseRoom = (sbRoom: SupabaseRoom, icon: JSX.Element): Room => {
  return {
    id: sbRoom.id,
    name: sbRoom.name,
    icon: icon,
    mood: sbRoom.mood,
    activeUsers: 0, // Will be updated with presence
    description: sbRoom.description,
    messages: [],
    topic: sbRoom.topic,
    createdAt: new Date(sbRoom.createdAt),
    isPrivate: sbRoom.isPrivate,
    createdBy: sbRoom.createdBy,
  };
};

// Convert Supabase message to our message format
const convertSupabaseMessage = (sbMessage: SupabaseMessage): Message => {
  return {
    id: sbMessage.id,
    sender: sbMessage.senderName,
    senderId: sbMessage.senderId,
    avatar: sbMessage.senderAvatar,
    content: sbMessage.content,
    timestamp: new Date(sbMessage.timestamp),
    type: sbMessage.type,
    isEdited: sbMessage.isEdited,
    isDeleted: sbMessage.isDeleted,
    replyTo: sbMessage.replyTo,
    attachments: sbMessage.attachments?.map(att => ({
      id: att.id,
      type: att.type,
      url: att.url,
      name: att.name,
      size: att.size,
      preview: att.type === 'image' ? att.url : undefined,
      contentType: att.contentType
    })),
    reactions: sbMessage.reactions ? 
      Object.keys(sbMessage.reactions).map(key => ({
        emoji: sbMessage.reactions![key].emoji,
        count: sbMessage.reactions![key].users.length,
        users: sbMessage.reactions![key].users
      })) : []
  };
};

// Map mood to icon
const getMoodIcon = (mood: string): JSX.Element => {
  switch (mood) {
    case 'happy':
      return <Smile className="h-4 w-4" />;
    case 'anxious':
      return <Meh className="h-4 w-4" />;
    case 'sad':
      return <Frown className="h-4 w-4" />;
    default:
      return <MessageCircle className="h-4 w-4" />;
  }
};

const EMOJI_AVATARS = [
  "😊", "🙂", "😎", "🤔", "😄", "😌", "🧐", "🤩", "🥳", "🦊", 
  "🐱", "🐼", "🐻", "🦁", "🐯", "🦄", "🦋", "🦉", "🐢", "🦆"
];

const getRandomEmoji = () => {
  return EMOJI_AVATARS[Math.floor(Math.random() * EMOJI_AVATARS.length)];
};

const AnonymousChatrooms = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeRoom, setActiveRoom] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string>(getRandomEmoji());
  const [messageInput, setMessageInput] = useState<string>("");
  const [username] = useState<string>(`Anonymous${Math.floor(Math.random() * 10000)}`);
  const [userId, setUserId] = useState<string>("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState<boolean>(false);
  const [newRoomData, setNewRoomData] = useState({
    name: "",
    description: "",
      mood: "mixed",
    topic: "",
    isPrivate: false
  });
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editMessageContent, setEditMessageContent] = useState<string>("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasDbError, setHasDbError] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Initialize the chat service
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setIsLoading(true);
        console.log("Initializing chat service...");
        const uid = await chatService.initialize(username, userAvatar);
        console.log("Chat service initialized with user ID:", uid);
        setUserId(uid);
        
        // Load rooms
        console.log("Loading rooms...");
        const sbRooms = await chatService.getRooms();
        console.log("Rooms loaded:", sbRooms);
        
        // Convert Supabase rooms to our format
        const convertedRooms = sbRooms.map(room => 
          convertSupabaseRoom(room, getMoodIcon(room.mood))
        );
        
        setRooms(convertedRooms);
        
        // Set active room if not already set and rooms exist
        if (convertedRooms.length > 0 && !activeRoom) {
          setActiveRoom(convertedRooms[0].id);
        }
        
        setIsLoading(false);
      } catch (error: any) {
        console.error("Failed to initialize chat:", error);
        console.error("Error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          stack: error.stack
        });
        
        // Check if this is a database error (tables don't exist)
        if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
          setHasDbError(true);
          toast({
            title: "Database Setup Required",
            description: "The chat database tables need to be set up. Click 'Setup Database' to configure the chat feature.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error",
            description: `Failed to connect to chat: ${error.message || "Unknown error"}`,
            variant: "destructive"
          });
          // Add a console log with the error details to help debugging
          console.log("Detailed error information:", {
            message: error.message,
            code: error.code,
            details: error.details,
            stack: error.stack
          });
        }
        
        setIsLoading(false);
      }
    };
    
    initializeChat();
    
    // Setup listeners for online users
    const unsubscribePresence = chatService.listenToActiveUsers(users => {
      setOnlineUsers(users);
      
      // Update active users count in rooms
      setRooms(prevRooms => 
        prevRooms.map(room => ({
          ...room,
          activeUsers: users.filter(u => u.status !== 'offline').length
        }))
      );
    });
    
    // Clean up on unmount
    return () => {
      chatService.cleanup();
    };
  }, []);
  
  // Load messages when active room changes
  useEffect(() => {
    if (!activeRoom || !userId) return;
    
    setIsLoading(true);
    
    // Get initial messages for the active room
    chatService.getMessages(activeRoom)
      .then(sbMessages => {
        const convertedMessages = sbMessages.map(convertSupabaseMessage);
        
        // Update the messages for the active room
        setRooms(prevRooms => 
          prevRooms.map(room => {
        if (room.id === activeRoom) {
          return {
            ...room,
                messages: convertedMessages
          };
        }
        return room;
      })
    );

        setIsLoading(false);
      })
      .catch(error => {
        console.error("Failed to load messages:", error);
        toast({
          title: "Error",
          description: "Failed to load messages. Please try again later.",
          variant: "destructive"
        });
        setIsLoading(false);
      });
    
    // Subscribe to real-time updates for the active room
    const unsubscribe = chatService.listenToMessages(activeRoom, sbMessages => {
      const convertedMessages = sbMessages.map(convertSupabaseMessage);
      
      // Update the messages for the active room
      setRooms(prevRooms => 
        prevRooms.map(room => {
          if (room.id === activeRoom) {
            return {
              ...room,
              messages: convertedMessages
            };
          }
          return room;
        })
      );
    });
    
    // Clean up the subscription when the active room changes
    return () => {
      unsubscribe();
    };
  }, [activeRoom, userId]);
  
  // Scroll to bottom when new messages come in
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current;
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }, [rooms]);

  // Handle sending a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || messageInput.trim() === "") return;
    
    try {
      await chatService.sendMessage(activeRoom, {
        content: messageInput
      });
    setMessageInput("");
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Handle creating a new room
  const handleCreateRoom = async () => {
    if (newRoomData.name.trim() === "" || newRoomData.description.trim() === "") {
      toast({
        title: "Error",
        description: "Room name and description are required.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsLoading(true);
      const newRoom = await chatService.createRoom({
        name: newRoomData.name,
        description: newRoomData.description,
        mood: newRoomData.mood,
        topic: newRoomData.topic,
        isPrivate: newRoomData.isPrivate
      });
      
      // Add the new room to our state
      const convertedRoom = convertSupabaseRoom(newRoom, getMoodIcon(newRoom.mood));
      setRooms(prevRooms => [...prevRooms, convertedRoom]);
      
      // Switch to the new room
      setActiveRoom(newRoom.id);
      
      // Reset the form
      setNewRoomData({
        name: "",
        description: "",
        mood: "mixed",
        topic: "",
        isPrivate: false
      });
      
      // Close the dialog
      setIsCreateRoomOpen(false);
      setIsLoading(false);
      
      toast({
        title: "Success",
        description: `Room "${newRoom.name}" created successfully.`
      });
    } catch (error) {
      console.error("Failed to create room:", error);
      toast({
        title: "Error",
        description: "Failed to create room. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  // Handle changing user avatar
  const changeAvatar = async () => {
    const newAvatar = getRandomEmoji();
    setUserAvatar(newAvatar);
    
    // Update user info in Supabase
    try {
      if (userId) {
        await chatService.updateUserPresence('online');
      }
    } catch (error) {
      console.error("Failed to update avatar:", error);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const currentRoom = rooms.find((room) => room.id === activeRoom);

  // Handle message editing
  const handleStartEditMessage = (message: Message) => {
    if (message.senderId !== userId) return;
    setEditingMessage(message.id);
    setEditMessageContent(message.content);
  };
  
  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditMessageContent("");
  };
  
  const handleSaveEdit = async (messageId: string) => {
    if (!activeRoom || editMessageContent.trim() === "") return;
    
    try {
      await chatService.editMessage(activeRoom, messageId, editMessageContent);
      setEditingMessage(null);
      setEditMessageContent("");
    } catch (error) {
      console.error("Failed to edit message:", error);
      toast({
        title: "Error",
        description: "Failed to edit message. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Handle message deletion
  const handleDeleteMessage = async (messageId: string) => {
    if (!activeRoom) return;
    
    if (!confirm("Are you sure you want to delete this message?")) {
      return;
    }
    
    try {
      await chatService.deleteMessage(activeRoom, messageId);
      toast({
        title: "Success",
        description: "Message deleted successfully."
      });
    } catch (error) {
      console.error("Failed to delete message:", error);
      toast({
        title: "Error",
        description: "Failed to delete message. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Handle message reactions
  const handleReactToMessage = async (messageId: string, emoji: string) => {
    if (!activeRoom) return;
    
    try {
      await chatService.addReaction(activeRoom, messageId, emoji);
      setShowEmojiPicker(null);
    } catch (error) {
      console.error("Failed to add reaction:", error);
      toast({
        title: "Error",
        description: "Failed to add reaction. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Handle reply to message
  const handleReplyToMessage = (message: Message) => {
    setReplyingTo(message);
    // Focus on the message input
    const inputElement = document.getElementById('message-input');
    if (inputElement) {
      inputElement.focus();
    }
  };
  
  // Cancel reply
  const handleCancelReply = () => {
    setReplyingTo(null);
  };
  
  // Send message with reply
  const handleSendMessageWithReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || messageInput.trim() === "") return;
    
    try {
      await chatService.sendMessage(activeRoom, {
        content: messageInput,
        replyTo: replyingTo?.id
      });
      setMessageInput("");
      setReplyingTo(null);
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Find the message being replied to
  const findReplyMessage = (replyId?: string) => {
    if (!replyId || !currentRoom) return null;
    return currentRoom.messages.find(m => m.id === replyId);
  };
  
  // Common emoji reactions
  const commonEmojis = ["👍", "❤️", "😊", "🙌", "😢", "😂", "🤔", "👏"];

  // Handle file upload
  const handleFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeRoom) return;
    
    setIsUploading(true);
    
    try {
      // Send message with attachments
      await chatService.sendMessage(activeRoom, {
        content: messageInput || "Shared a file",
        attachments: Array.from(files)
      });
      
      // Reset input fields
      setMessageInput("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      toast({
        title: "Success",
        description: "File uploaded successfully."
      });
    } catch (error) {
      console.error("Failed to upload file:", error);
      toast({
        title: "Error",
        description: "Failed to upload file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  // Trigger file input click
  const openFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handle key press for sending message with Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (replyingTo) {
        handleSendMessageWithReply(e as unknown as React.FormEvent);
      } else {
        handleSendMessage(e as unknown as React.FormEvent);
      }
    }
  };

  // Loading state
  if (isLoading && rooms.length === 0) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto pt-24 pb-10 px-4">
          <div className="flex flex-col space-y-6 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <h2 className="text-xl font-medium">Loading chatrooms...</h2>
          </div>
        </main>
      </div>
    );
  }
  
  // Database error state
  if (hasDbError) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto pt-24 pb-10 px-4">
          <div className="flex flex-col space-y-6 items-center justify-center">
            <Database className="h-16 w-16 text-muted-foreground" />
            <h2 className="text-2xl font-medium">Database Setup Required</h2>
            <p className="text-center text-muted-foreground max-w-lg mb-4">
              The chat database tables need to be set up before you can use the Anonymous Chatrooms feature.
              This is a one-time setup process.
            </p>
            <div className="flex flex-row gap-4">
              <Button asChild>
                <a href="/chat/setup">Setup Database</a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/chat/test">Run Diagnostics</a>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto pt-16 pb-6 px-3 sm:pt-20 sm:pb-10 sm:px-4">
        <div className="flex flex-col space-y-4 sm:space-y-6">
          <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Anonymous Chatrooms</h1>
          </div>

            {/* Mobile menu button - only visible on small screens */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="md:hidden">
                  <Users className="h-4 w-4 mr-2" />
                  Rooms
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:w-[350px] p-0">
                <div className="h-full overflow-auto">
                  <Card className="h-full border-0 rounded-none">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Chatrooms</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setIsCreateRoomOpen(true)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </CardTitle>
                      <CardDescription>Join a room based on your mood</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex mb-4 items-center space-x-2">
                        <Avatar className="h-8 w-8 cursor-pointer" onClick={changeAvatar}>
                          <AvatarFallback className="text-xl">{userAvatar}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{username}</span>
                          <span className="text-xs text-muted-foreground">Click avatar to change</span>
                        </div>
                      </div>
                      <Separator className="my-4" />
                      <div className="space-y-2">
                        {rooms.map((room) => (
                          <Button
                            key={room.id}
                            variant={activeRoom === room.id ? "default" : "ghost"}
                            className="w-full justify-start"
                            onClick={() => {
                              setActiveRoom(room.id);
                              setIsMobileMenuOpen(false);
                            }}
                          >
                            <div className="flex items-center w-full">
                              <span className="mr-2">{room.icon}</span>
                              <span className="flex-1 text-left">{room.name}</span>
                              <Badge variant="outline" className="ml-auto">
                                {room.activeUsers}
                              </Badge>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <div className="text-xs text-muted-foreground">
                        <Shield className="inline-block h-3 w-3 mr-1" /> 
                        Your identity is anonymous
                      </div>
                    </CardFooter>
                  </Card>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Sidebar with room list - hidden on mobile */}
            <div className="hidden lg:block lg:col-span-1">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex justify-between items-center">
                    <span>Chatrooms</span>
                    <Dialog open={isCreateRoomOpen} onOpenChange={setIsCreateRoomOpen}>
                      <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Create a New Chatroom</DialogTitle>
                          <DialogDescription>
                            Create a new space for others to join and chat.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="roomName">Room Name</Label>
                            <Input 
                              id="roomName" 
                              value={newRoomData.name}
                              onChange={(e) => setNewRoomData({...newRoomData, name: e.target.value})}
                              placeholder="Enter room name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="roomDescription">Description</Label>
                            <Textarea 
                              id="roomDescription"
                              value={newRoomData.description}
                              onChange={(e) => setNewRoomData({...newRoomData, description: e.target.value})}
                              placeholder="What is this room about?"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="roomMood">Room Mood</Label>
                            <select
                              id="roomMood"
                              className="w-full p-2 rounded-md border"
                              value={newRoomData.mood}
                              onChange={(e) => setNewRoomData({...newRoomData, mood: e.target.value})}
                            >
                              <option value="mixed">General</option>
                              <option value="happy">Happy</option>
                              <option value="anxious">Anxious</option>
                              <option value="sad">Sad</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="roomTopic">Topic (Optional)</Label>
                            <Input 
                              id="roomTopic"
                              value={newRoomData.topic}
                              onChange={(e) => setNewRoomData({...newRoomData, topic: e.target.value})}
                              placeholder="Specific topic for discussion"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="roomPrivate"
                              checked={newRoomData.isPrivate}
                              onCheckedChange={(checked) => setNewRoomData({...newRoomData, isPrivate: checked})}
                            />
                            <Label htmlFor="roomPrivate">Private Room</Label>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsCreateRoomOpen(false)}>Cancel</Button>
                          <Button onClick={handleCreateRoom}>Create Room</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </CardTitle>
                  <CardDescription>Join a room based on your mood</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex mb-4 items-center space-x-2">
                    <Avatar className="h-8 w-8 cursor-pointer" onClick={changeAvatar}>
                      <AvatarFallback className="text-xl">{userAvatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{username}</span>
                      <span className="text-xs text-muted-foreground">Click avatar to change</span>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    {rooms.map((room) => (
                      <Button
                        key={room.id}
                        variant={activeRoom === room.id ? "default" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => setActiveRoom(room.id)}
                      >
                        <div className="flex items-center w-full">
                          <span className="mr-2">{room.icon}</span>
                          <span className="flex-1 text-left">{room.name}</span>
                          <Badge variant="outline" className="ml-auto">
                            {room.activeUsers}
                          </Badge>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="text-xs text-muted-foreground">
                    <Shield className="inline-block h-3 w-3 mr-1" /> 
                    Your identity is anonymous
                  </div>
                </CardFooter>
              </Card>
            </div>

            {/* Main chat area */}
            <div className="col-span-1 lg:col-span-3">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                        {currentRoom?.icon}
                        <span className="truncate">{currentRoom?.name}</span>
                        <Badge variant="outline" className="ml-2">
                          <Users className="h-3 w-3 mr-1" /> {currentRoom?.activeUsers}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm line-clamp-1">{currentRoom?.description}</CardDescription>
                    </div>
                    <div className="flex items-center">
                      {/* Create room button - only visible on mobile */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden mr-1"
                        onClick={() => setIsCreateRoomOpen(true)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Info className="h-4 w-4 mr-2" /> Room Info
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Users className="h-4 w-4 mr-2" /> View Members
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Flag className="h-4 w-4 mr-2" /> Report Room
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow relative p-3 sm:p-6">
                  <ScrollArea className="h-[350px] sm:h-[400px] pr-4" ref={scrollAreaRef}>
                    {currentRoom?.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`mb-3 sm:mb-4 flex ${
                          message.senderId === userId
                            ? "flex-row-reverse"
                            : "flex-row"
                        }`}
                      >
                        {message.type !== 'system' && (
                        <Avatar className="h-7 w-7 sm:h-8 sm:w-8 mt-1">
                          <AvatarFallback className="text-lg sm:text-xl">
                            {message.avatar}
                          </AvatarFallback>
                        </Avatar>
                        )}
                        <div
                          className={`mx-2 max-w-[75%] sm:max-w-[80%] ${
                            message.type === 'system'
                              ? "bg-muted/50 rounded-xl text-center w-full"
                              : message.senderId === userId
                              ? "bg-primary/20 rounded-l-xl rounded-br-xl"
                              : "bg-muted rounded-r-xl rounded-bl-xl"
                          } p-2 sm:p-3 relative group`}
                        >
                          {message.type !== 'system' && (
                          <div className="flex flex-col xs:flex-row xs:justify-between xs:items-center mb-1 gap-1">
                            <span className="font-medium text-xs sm:text-sm">
                              {message.sender}
                            </span>
                              <div className="flex items-center space-x-1">
                                {message.isEdited && (
                                  <span className="text-[10px] sm:text-xs text-muted-foreground">(edited)</span>
                                )}
                            <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center">
                              <Clock className="h-2 w-2 sm:h-3 sm:w-3 mr-1" /> {formatTime(message.timestamp)}
                            </span>
                          </div>
                            </div>
                          )}
                          
                          {/* Reply indicator */}
                          {message.replyTo && (
                            <div className="mb-2 p-1 pl-2 border-l-2 border-primary/30 bg-muted/30 rounded text-[10px] sm:text-xs">
                              <p className="font-medium">↩️ Reply to {findReplyMessage(message.replyTo)?.sender || 'message'}</p>
                              <p className="truncate">{findReplyMessage(message.replyTo)?.content || 'Original message not found'}</p>
                            </div>
                          )}
                          
                          {/* Message content - editable if editing */}
                          {editingMessage === message.id ? (
                            <div className="space-y-2">
                              <Textarea 
                                value={editMessageContent}
                                onChange={(e) => setEditMessageContent(e.target.value)}
                                className="w-full text-xs sm:text-sm min-h-[60px] sm:min-h-[80px]"
                              />
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={handleCancelEdit}
                                  className="h-7 text-xs px-2 py-0"
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={() => handleSaveEdit(message.id)}
                                  className="h-7 text-xs px-2 py-0"
                                >
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className={`text-xs sm:text-sm ${message.type === 'system' ? 'text-muted-foreground italic' : ''} ${message.isDeleted ? 'italic text-muted-foreground' : ''}`}>
                              {message.isDeleted ? 'This message has been deleted' : message.content}
                            </p>
                          )}
                          
                          {/* Show attachments if any */}
                          {!message.isDeleted && message.attachments && message.attachments.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {message.attachments.map(attachment => (
                                <div key={attachment.id} className="rounded-md overflow-hidden">
                                  {attachment.type === 'image' ? (
                                    <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                                      <img 
                                        src={attachment.url} 
                                        alt={attachment.name} 
                                        className="max-w-full max-h-32 sm:max-h-40 object-contain"
                                      />
                                    </a>
                                  ) : (
                                    <a 
                                      href={attachment.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="flex items-center p-2 bg-background rounded border"
                                    >
                                      <Paperclip className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                      <span className="text-xs sm:text-sm truncate">{attachment.name}</span>
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Message actions */}
                          {!message.isDeleted && message.type !== 'system' && (
                            <div className={`absolute ${message.senderId === userId ? 'left-0' : 'right-0'} -top-2 opacity-0 sm:hidden group-hover:flex group-hover:opacity-100 bg-background shadow rounded-full p-1 transition-opacity`}>
                              {/* Emoji reaction picker */}
                              <Popover open={showEmojiPicker === message.id} onOpenChange={(open) => setShowEmojiPicker(open ? message.id : null)}>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full">
                                    <Smile className="h-3 w-3" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2">
                                  <div className="flex flex-wrap gap-1">
                                    {commonEmojis.map(emoji => (
                                      <Button 
                                        key={emoji} 
                                        variant="ghost" 
                                        className="h-8 w-8 p-1"
                                        onClick={() => handleReactToMessage(message.id, emoji)}
                                      >
                                        {emoji}
                                      </Button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                              
                              {/* Reply button */}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 rounded-full"
                                onClick={() => handleReplyToMessage(message)}
                              >
                                <Reply className="h-3 w-3" />
                              </Button>
                              
                              {/* Edit and delete buttons - only for user's own messages */}
                              {message.senderId === userId && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 rounded-full"
                                    onClick={() => handleStartEditMessage(message)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 rounded-full text-destructive"
                                    onClick={() => handleDeleteMessage(message.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                          
                          {/* Mobile-friendly message actions */}
                          {!message.isDeleted && message.type !== 'system' && (
                            <div className="sm:hidden mt-1 flex justify-end space-x-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 rounded-full"
                                onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                              >
                                <Smile className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 rounded-full"
                                onClick={() => handleReplyToMessage(message)}
                              >
                                <Reply className="h-3 w-3" />
                              </Button>
                              {message.senderId === userId && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 rounded-full"
                                    onClick={() => handleStartEditMessage(message)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 rounded-full text-destructive"
                                    onClick={() => handleDeleteMessage(message.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                          
                          {/* Show reactions if any */}
                          {!message.isDeleted && message.reactions && message.reactions.length > 0 && (
                            <div className="mt-1 sm:mt-2 flex flex-wrap gap-1">
                              {message.reactions.map((reaction, index) => (
                                <Badge 
                                  key={index} 
                                  variant="outline" 
                                  className="text-[10px] sm:text-xs py-0 cursor-pointer hover:bg-muted"
                                  onClick={() => handleReactToMessage(message.id, reaction.emoji)}
                                >
                                  {reaction.emoji} {reaction.count}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
                <CardFooter className="flex-col space-y-2 p-3 sm:p-6">
                  {/* Reply indicator */}
                  {replyingTo && (
                    <div className="w-full p-2 bg-muted rounded-md flex justify-between items-center">
                      <div className="flex-1">
                        <p className="text-xs font-medium">Replying to {replyingTo.sender}</p>
                        <p className="text-xs truncate">{replyingTo.content}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={handleCancelReply}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  {/* File input (hidden) */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileInputChange}
                    multiple
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                  />
                  
                  {/* Message form */}
                  <form onSubmit={replyingTo ? handleSendMessageWithReply : handleSendMessage} className="w-full flex space-x-2">
                    <div className="flex-grow flex items-center rounded-md border border-input bg-background">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9"
                        onClick={openFileInput}
                        disabled={!activeRoom || isUploading}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    <Input
                        id="message-input"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder={replyingTo ? `Reply to ${replyingTo.sender}...` : "Type your message..."}
                        className="flex-grow border-0 h-8 sm:h-9 text-sm"
                        disabled={!activeRoom || isUploading}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      size="icon" 
                      className="h-8 w-8 sm:h-9 sm:w-9"
                      disabled={!activeRoom || (messageInput.trim() === "" && !isUploading) || isUploading}
                    >
                      {isUploading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                      <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </CardFooter>
              </Card>
            </div>
          </div>

          <Card className="mt-3 sm:mt-0">
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">Community Guidelines</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Please follow these guidelines for a positive chat experience
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2 sm:pb-4">
              <ul className="list-disc pl-5 space-y-1">
                <li className="text-xs sm:text-sm">
                  Be respectful and kind to other users.
                </li>
                <li className="text-xs sm:text-sm">
                  Do not share personal identifying information.
                </li>
                <li className="text-xs sm:text-sm">
                  Provide support, not medical advice.
                </li>
                <li className="text-xs sm:text-sm">
                  Report any concerning content to moderators.
                </li>
                <li className="text-xs sm:text-sm">
                  Take breaks when needed - your wellbeing comes first.
                </li>
              </ul>
            </CardContent>
            <CardFooter className="border-t pt-3 sm:pt-6">
              <div className="flex items-center justify-between w-full text-xs sm:text-sm">
                <div className="flex items-center">
                  <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-primary" />
                  <span>Safety First</span>
                </div>
                <div className="flex items-center">
                  <Heart className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-primary" />
                  <span>Support Each Other</span>
                </div>
              </div>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AnonymousChatrooms; 