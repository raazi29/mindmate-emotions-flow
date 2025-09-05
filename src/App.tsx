import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Journal from "./pages/Journal";
import Resources from "./pages/Resources";
import NotFound from "./pages/NotFound";
import AnonymousChatrooms from "./pages/AnonymousChatrooms";
import ChatroomSetup from "./pages/ChatroomSetup";
import SupabaseTest from "./pages/SupabaseTest";
import EmotionsFlow from "./pages/EmotionsFlow";
import SafetyPrivacy from "./pages/SafetyPrivacy";
import Auth from "./pages/Auth";


const queryClient = new QueryClient();

// Theme toggle functionality component
const ThemeToggleHandler = () => {
  const { theme, setTheme } = useTheme();
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey && event.key === 'T') {
        // Toggle between light and dark
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        toast({
          title: `${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} Mode`,
          description: `Switched to ${newTheme} mode.`,
          duration: 2000,
        });
      }
    };

    // Add event listener to window
    window.addEventListener('keydown', handleKeyDown);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [theme, setTheme]);
  
  return null; // This component doesn't render anything
};

const App = () => (
  <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="mindmate-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ThemeToggleHandler />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/chat" element={<AnonymousChatrooms />} />
              <Route path="/chat/setup" element={<ChatroomSetup />} />
              <Route path="/chat/test" element={<SupabaseTest />} />
              <Route path="/emotions-flow" element={<EmotionsFlow />} />
              <Route path="/safety-privacy" element={<SafetyPrivacy />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </AuthProvider>
);

export default App;
