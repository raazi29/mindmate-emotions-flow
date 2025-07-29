import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, RefreshCcw, Brain, User2, Bot, Sparkles, AlertCircle, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

interface PersonalizedChatbotProps {
  userName?: string;
  emotionalState?: string | null;
  preferredModel?: string;
}

const PersonalizedChatbot: React.FC<PersonalizedChatbotProps> = ({
  userName = 'there',
  emotionalState = null,
  preferredModel = 'qwen' // 'qwen', 'deepseek', 'mixtral'
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastEmotionalState, setLastEmotionalState] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<string>(preferredModel);
  const [backendAvailable, setBackendAvailable] = useState<boolean>(true);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isThinking, setIsThinking] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check backend status on mount
  useEffect(() => {
    checkBackendStatus();
  }, []);

  // Generate initial greeting based on emotional state when component mounts
  useEffect(() => {
    if (messages.length === 0) {
      generateInitialGreeting();
    }
  }, [messages.length]);
  
  // Handle changes in the user's emotional state
  useEffect(() => {
    // Only respond to actual changes in emotional state
    if (emotionalState && emotionalState !== lastEmotionalState && messages.length > 0) {
      respondToEmotionChange(emotionalState);
      setLastEmotionalState(emotionalState);
    }
  }, [emotionalState, lastEmotionalState, messages.length]);

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

  const checkBackendStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_API_URL}/status`, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      setBackendAvailable(response.ok);
    } catch (error) {
      console.warn('Backend status check failed:', error);
      setBackendAvailable(false);
    }
  };

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

  const respondToEmotionChange = (newEmotion: string) => {
    const emotionResponses: Record<string, string> = {
      joy: "I notice your mood has shifted to joy! That's wonderful. Would you like resources that can help maintain this positive energy?",
      sadness: "I'm noticing that you're feeling sad now. I'm here for you. Would you like me to suggest some comforting resources?",
      anger: "I see you're feeling frustrated or angry now. Would you like some resources that might help process these emotions?",
      fear: "I notice you're feeling anxious or fearful. Would you like me to suggest some calming resources?",
      love: "I see you're experiencing feelings of love and connection. Would you like resources to help nurture these feelings?",
      surprise: "You seem surprised! Would you like resources to help process unexpected changes or events?",
      neutral: "I notice your emotional state has shifted to a more neutral space. Would you like some general wellness resources?"
    };
    
    const response = emotionResponses[newEmotion] || "I notice your emotional state has changed. How can I help you with resources right now?";
    
    // Add AI response acknowledging the emotion change
    const botMessage: Message = {
      id: generateId(),
      content: response,
      sender: 'bot',
      timestamp: new Date(),
      model: aiModel
    };
    
    setMessages(prevMessages => [...prevMessages, botMessage]);
  };

  const generateInitialGreeting = async () => {
    const greeting = getInitialGreeting();
    setLastEmotionalState(emotionalState);
    
    // Add AI greeting to chat
    setMessages([
      {
        id: generateId(),
        content: greeting,
        sender: 'bot',
        timestamp: new Date(),
        model: aiModel
      }
    ]);
  };

  const getInitialGreeting = (): string => {
    if (!emotionalState) {
      return `Hello ${userName}! I'm your personal wellness assistant. How can I help you find resources today?`;
    }

    const emotionGreetings: Record<string, string> = {
      joy: `Hi ${userName}! I notice you're feeling joy. That's wonderful! I'd be happy to suggest some resources that complement your positive energy. How can I help you today?`,
      sadness: `Hello ${userName}. I see you might be feeling sad right now. I'm here to support you and can suggest some resources that might help. What kind of support are you looking for today?`,
      anger: `Hi ${userName}. I understand you might be feeling frustrated or angry. I can suggest some resources that might help channel that energy constructively. What would you like help with?`,
      fear: `Hello ${userName}. I notice you might be feeling anxious or fearful. I can suggest some calming resources that might help you feel more grounded. How can I support you?`,
      love: `Hi ${userName}! I see you're feeling a sense of love and connection. That's beautiful! Would you like me to suggest resources that cultivate those feelings further?`,
      surprise: `Hello ${userName}! I notice you're feeling surprised. Would you like me to suggest some reflective resources to help process this emotion?`,
      neutral: `Hello ${userName}! I'm your personal wellness assistant. How can I help you find mental wellness resources today?`
    };

    return emotionGreetings[emotionalState] || emotionGreetings.neutral;
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
        model: aiModel
      };
      
      setMessages(prevMessages => [...prevMessages, botMessage]);
      setRetryCount(0); // Reset retry count on success
      setBackendAvailable(true);
    } catch (error: any) {
      console.error('Error getting chatbot response:', error);
      
      // Add appropriate error message based on the type of error
      let errorMessage = "I'm having trouble connecting right now. Could you try again in a moment?";
      
      if (error.name === 'AbortError') {
        errorMessage = "I'm sorry, but the request took too long. Let's try again with a simpler question.";
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = "It seems the connection to my brain is offline. I'll try to use my local knowledge instead.";
        setBackendAvailable(false);
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
    // If backend is unavailable, use a fallback approach
    if (!backendAvailable) {
      // Try reconnecting to backend if it was previously unavailable
      if (retryCount < 2) {
        try {
          await checkBackendStatus();
          if (backendAvailable) {
            setRetryCount(prev => prev + 1);
            return getResponseFromBackend(userInput, signal);
          }
        } catch (error) {
          console.log('Still unable to connect to backend');
        }
      }
      
      // Fallback to local responses
      return getFallbackResponse(userInput);
    }
    
    try {
      return await getResponseFromBackend(userInput, signal);
    } catch (error: any) {
      console.error('Error in getChatbotResponse:', error);
      
      // Mark backend as unavailable if we get a connection error
      if (error.message.includes('Failed to fetch') || 
          error.message.includes('NetworkError') || 
          error.name === 'TimeoutError') {
        setBackendAvailable(false);
      }
      
      // If backend fails, try one more time before falling back
      if (retryCount < 1 && error.name !== 'AbortError') {
        setRetryCount(prev => prev + 1);
        // Small delay before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          return await getResponseFromBackend(userInput, signal);
        } catch (retryError) {
          console.error('Retry also failed:', retryError);
          // Fall through to error handling
        }
      }
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
      current_emotion: emotionalState,
      ai_model: aiModel
    };
    
    const timeout = AbortSignal.timeout(API_TIMEOUT_MS);
    
    // Create a composite abort signal that aborts if either the component signal or timeout signal aborts
    const controller = new AbortController();
    signal.addEventListener('abort', () => controller.abort());
    timeout.addEventListener('abort', () => controller.abort());
    
    try {
      console.log(`Making request to ${BACKEND_API_URL}/wellness-assistant with model: ${aiModel}`);
      
      const response = await fetch(`${BACKEND_API_URL}/wellness-assistant`, {
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
      
      // Log which model was actually used (could be different from what was requested)
      if (result.model_used) {
        console.log(`Response received from model: ${result.model_used}`);
      }
      
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
  
  const getFallbackResponse = (userInput: string): string => {
    // Simple fallback responses when backend is unavailable
    const fallbackResponses = [
      "I'm currently operating in offline mode, but I'm happy to help with general wellness advice.",
      "While I can't access my full capabilities right now, I can still suggest some basic wellness strategies.",
      "I'm working with limited resources at the moment, but I'm still here to support you.",
      "My connection to advanced AI capabilities is offline, but I can provide some general guidance."
    ];
    
    // Basic emotion-related responses
    if (userInput.toLowerCase().includes("stress") || userInput.toLowerCase().includes("anxious")) {
      return "It sounds like you might be experiencing stress. Deep breathing exercises, mindful walking, or progressive muscle relaxation might help. Would you like some tips on any of these techniques?";
    }
    
    if (userInput.toLowerCase().includes("sad") || userInput.toLowerCase().includes("depression")) {
      return "I'm sorry to hear you're feeling down. Getting regular physical activity, maintaining social connections, and practicing self-compassion can help manage sadness. Would you like more information about mental wellness resources?";
    }
    
    if (userInput.toLowerCase().includes("happy") || userInput.toLowerCase().includes("joy")) {
      return "It's great that you're feeling positive! Practicing gratitude, sharing your joy with others, and engaging in activities you love can help maintain this positive state.";
    }
    
    if (userInput.toLowerCase().includes("angry") || userInput.toLowerCase().includes("frustrated")) {
      return "Managing anger in healthy ways is important. Taking a timeout, deep breathing, or physical activity can help process these feelings. What usually helps you when you feel this way?";
    }
    
    if (userInput.toLowerCase().includes("resources") || userInput.toLowerCase().includes("help")) {
      return "I can suggest several types of wellness resources: guided meditations, journaling exercises, physical activities, or support groups. Which would be most helpful for you right now?";
    }
    
    // Default fallback
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
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

  // Add a method to handle switching AI models
  const switchAiModel = (model: string) => {
    setAiModel(model);
    toast({
      title: `AI Model Changed`,
      description: `Now using ${model.charAt(0).toUpperCase() + model.slice(1)} for responses`,
    });
  };

  // Get an identifier based on the model name for styling
  const getModelColor = (model: string): string => {
    const colorMap: Record<string, string> = {
      qwen: "text-teal-500",
      deepseek: "text-indigo-500",
      mixtral: "text-amber-500",
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
    <div className="flex flex-col w-full">
      {/* Model switcher */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" /> 
          <span>Powered by {aiModel.charAt(0).toUpperCase() + aiModel.slice(1)}</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-xs gap-1"
              disabled={!backendAvailable || isLoading}
            >
              <Settings className="h-3 w-3" />
              Switch Model
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {['qwen', 'deepseek', 'mixtral'].map((model) => (
              <DropdownMenuItem 
                key={model}
                onClick={() => switchAiModel(model)}
                className={aiModel === model ? 'bg-primary/10 font-medium' : ''}
              >
                <span className={getModelColor(model)}>•</span>
                <span className="ml-2">{model.charAt(0).toUpperCase() + model.slice(1)}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Message history */}
      <ScrollArea className="flex-1 mb-3 h-64 overflow-hidden relative">
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
                    <Brain className="h-5 w-5 text-primary" />
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
                        {message.model === 'fallback' ? 'Local AI' : message.model === 'system' ? 'System' : `${message.model.charAt(0).toUpperCase() + message.model.slice(1)}`}
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
          disabled={isLoading || !backendAvailable}
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
            disabled={!inputValue.trim() || !backendAvailable}
                    size="icon"
            variant="default"
            type="submit"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
      </form>
      
      {!backendAvailable && (
        <div className="flex items-center gap-2 mt-2 p-2 bg-destructive/10 text-destructive rounded text-xs">
          <AlertCircle className="h-3 w-3" />
          <span>AI service is unavailable. Responses are limited.</span>
          </div>
        )}
    </div>
  );
};

export default PersonalizedChatbot; 