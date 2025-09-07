import { useState, useRef, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, RefreshCcw, Brain, User2, Bot, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

// Define backend API URL with fallback
const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000';
const API_TIMEOUT_MS = 45000; // Increased to 45 seconds to allow more time for AI model responses

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  model?: string;
}

const AICompanion: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Generate initial greeting when component mounts
  useEffect(() => {
    if (messages.length === 0) {
      generateInitialGreeting();
    }
  }, [messages.length]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const scrollToBottom = () => {
    // Only scroll the chat container, not the entire page
    if (endOfMessagesRef.current) {
      // Use scrollIntoView with block: 'nearest' to prevent page scrolling
      endOfMessagesRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
    }
  };

  const generateInitialGreeting = async () => {
    const greeting = getInitialGreeting();
    
    // Add AI greeting to chat
    setMessages([
      {
        id: generateId(),
        content: greeting,
        sender: 'bot',
        timestamp: new Date(),
        model: 'gemini-2.5-flash'
      }
    ]);
  };

  const getInitialGreeting = (): string => {
    const greetings = [
      "Hello! I'm your AI companion powered by AI Companion. How can I support your emotional wellbeing today?",
      "Hi there! I'm here to help you with your mental wellness journey. What would you like to talk about?",
      "Welcome! I'm your personal wellness assistant. How are you feeling today?",
      "Greetings! I'm here to provide support and guidance for your emotional health. What's on your mind?"
    ];
    
    return greetings[Math.floor(Math.random() * greetings.length)];
  };

  const generateId = (): string => {
    return Math.random().toString(36).substring(2, 11);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    // Cancel any in-progress request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create a new abort controller
    abortControllerRef.current = new AbortController();
    
    // Add user message
    const userMessage: Message = {
      id: generateId(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    };
    
    const currentInput = inputValue.trim();
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setIsThinking(true);

    try {
      // Get response from backend API
      const response = await getChatbotResponse(currentInput, abortControllerRef.current.signal);
      
      // Add AI response
      const botMessage: Message = {
        id: generateId(),
        content: response,
        sender: 'bot',
        timestamp: new Date(),
        model: 'gemini-2.5-flash'
      };
      
      setMessages(prevMessages => [...prevMessages, botMessage]);
    } catch (error: any) {
      console.error('Error getting chatbot response:', error);
      
      // Add appropriate error message based on the type of error
      let errorMessage = "I'm having trouble connecting right now. Could you try again in a moment?";
      
      if (error.name === 'AbortError') {
        errorMessage = "I'm sorry, but the request took too long. Let's try again with a simpler question.";
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = "It seems the connection to my brain is offline. I'll try to use my local knowledge instead.";
      } else if (error.status === 429) {
        errorMessage = "I've been thinking too much lately! Please give me a moment to rest before asking another question.";
      }
      
      // Add fallback response message to the chat
      const fallbackMessage: Message = {
        id: generateId(),
        content: errorMessage,
        sender: 'bot',
        timestamp: new Date(),
        model: 'fallback'
      };
      
      setMessages(prevMessages => [...prevMessages, fallbackMessage]);
      
      toast({
        title: "Couldn't get response",
        description: "There was a problem connecting to the AI. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsThinking(false);
      abortControllerRef.current = null;
    }
  };

  const getChatbotResponse = async (userInput: string, signal: AbortSignal): Promise<string> => {
    try {
      return await getResponseFromBackend(userInput, signal);
    } catch (error: any) {
      console.error('Error in getChatbotResponse:', error);
      throw error;
    }
  };
  
  const getResponseFromBackend = async (userInput: string, signal: AbortSignal): Promise<string> => {
    // Format messages for the API
    const formattedMessages = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
    
    // Add the new user message
    formattedMessages.push({
      role: 'user',
      content: userInput
    });
    
    // Create request payload
    const requestPayload = {
      messages: formattedMessages,
      current_emotion: null, // We could implement emotion detection here if needed
      ai_model: "gemini" // Specify that we want to use Gemini
    };
    
    const timeout = AbortSignal.timeout(API_TIMEOUT_MS);
    
    // Create a composite abort signal that aborts if either the component signal or timeout signal aborts
    const controller = new AbortController();
    signal.addEventListener('abort', () => controller.abort());
    timeout.addEventListener('abort', () => controller.abort());
    
    try {
      console.log(`Making request to ${BACKEND_API_URL}/wellness-assistant with model: gemini`);
      
      const response = await fetch(`${BACKEND_API_URL}/api/wellness-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify(requestPayload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Backend API error: ${response.status}, Details: ${errorText}`);
        throw new Error(`Backend API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Check if we received a proper message
      if (!result.message) {
        console.warn("Received empty message from backend");
        return "I apologize, but I couldn't generate a proper response. Could you try asking again?";
      }
      
      return result.message;
    } catch (error: any) {
      console.error('Error in getResponseFromBackend:', error);
      
      // Handle timeout specifically
      if (error.name === 'AbortError' && timeout.aborted) {
        throw new Error('TimeoutError: The request took too long to complete');
      }
      
      throw error;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent the default Enter key behavior
      if (inputValue.trim()) {
        handleSendMessage();
      }
    }
  };

  const cancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setIsThinking(false);
      
      // Add a message indicating the request was cancelled
      const cancelMessage: Message = {
        id: generateId(),
        content: "I've stopped processing that request. What else would you like to know?",
        sender: 'bot',
        timestamp: new Date(),
        model: 'system'
      };
      
      setMessages(prevMessages => [...prevMessages, cancelMessage]);
    }
  };

  // Get an identifier based on the model name for styling
  const getModelColor = (model: string): string => {
    const colorMap: Record<string, string> = {
      "AI Companion": "text-blue-500",
      fallback: "text-gray-500",
      system: "text-gray-500"
    };
    return colorMap[model] || "text-primary";
  };

  // Typing indicator animation
  const ThinkingIndicator = () => (
    <div className="flex gap-1 mt-2 px-3 py-2 bg-muted/20 w-fit rounded-lg">
      <motion.div
        className="w-2 h-2 bg-primary/50 rounded-full"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, repeatType: "loop", delay: 0 }}
      />
      <motion.div
        className="w-2 h-2 bg-primary/50 rounded-full"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, repeatType: "loop", delay: 0.2 }}
      />
      <motion.div
        className="w-2 h-2 bg-primary/50 rounded-full"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, repeatType: "loop", delay: 0.4 }}
      />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-radial from-primary/5 via-background to-background">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                AI Companion
              </h1>
              <p className="text-muted-foreground">
                Chat with our AI companion for personalized emotional support and guidance.
              </p>
            </div>
          </div>
          
          <Card className="h-[calc(100vh-200px)] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-6 w-6 text-primary" />
                AI Companion
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {/* Message history */}
              <ScrollArea className="flex-1 mb-3 overflow-hidden relative">
                <div className="space-y-4 pb-2">
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start gap-3 max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex-shrink-0 ${message.sender === 'user' ? 'bg-primary/20' : 'bg-primary/10'} p-1.5 rounded-full`}>
                          {message.sender === 'user' ? (
                            <User2 className="h-5 w-5 text-primary" />
                          ) : (
                            <Bot className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className={`flex-1 ${message.sender === 'user' ? 'text-right' : ''}`}>
                          <div className={`p-3 rounded-lg ${
                            message.sender === 'user'
                              ? 'bg-primary/20 text-primary-foreground rounded-tr-none'
                              : 'bg-muted/30 rounded-tl-none'
                          }`}>
                            {message.content}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {message.sender === 'bot' && message.model ? (
                              <span className={`flex items-center gap-1 text-xs ${getModelColor(message.model)}`}>
                                <Sparkles className="h-3 w-3" />
                                {message.model === 'fallback' ? 'Local AI' : message.model === 'system' ? 'System' : `${message.model}`}
                              </span>
                            ) : (
                              <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                      
                  {/* Thinking indicator */}
                  {isThinking && (
                    <div className="flex justify-start">
                      <ThinkingIndicator />
                    </div>
                  )}
                      
                  <div ref={endOfMessagesRef} />
                </div>
              </ScrollArea>

              {/* Chat input */}
              <form
                className="flex items-center gap-2 mt-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
              >
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  disabled={isLoading}
                  className="flex-1"
                />
              
                {isLoading ? (
                  <Button
                    variant="outline"
                    size="icon"
                    type="button"
                    onClick={cancelRequest}
                    title="Cancel request"
                  >
                    <RefreshCcw className="h-4 w-4 animate-spin" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim()}
                    size="icon"
                    variant="default"
                    type="submit"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </form>
                           </CardContent>
                         </Card>
                       </div>
      </main>
    </div>
  );
};

export default AICompanion;