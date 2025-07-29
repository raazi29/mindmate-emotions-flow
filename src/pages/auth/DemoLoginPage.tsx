import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Sparkles, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { useFallbackAuth } from '@/components/auth/AuthFallback';
import { toast } from '@/hooks/use-toast';

const DemoLoginPage: React.FC = () => {
  const [email, setEmail] = useState('demo@mindmate.com');
  const { signIn } = useFallbackAuth();
  const navigate = useNavigate();

  const handleDemoLogin = () => {
    signIn(email);
    toast({
      title: "Welcome to MindMate!",
      description: "You're now signed in with a demo account.",
    });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen animated-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl floating"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl floating" style={{ animationDelay: '-2s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl floating" style={{ animationDelay: '-4s' }}></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-card rounded-3xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 glass-button rounded-2xl mb-4"
            >
              <Brain className="h-8 w-8 text-white" />
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-white mb-2"
            >
              Welcome to MindMate
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-white/70"
            >
              Start your emotional wellness journey
            </motion.p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-white/90 text-sm">Email (Demo)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input pl-10 text-white placeholder:text-white/50 border-white/20"
                  placeholder="Enter any email"
                />
              </div>
            </div>

            <Button
              onClick={handleDemoLogin}
              className="w-full glass-button text-white font-semibold py-3 rounded-xl"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Start Demo
            </Button>

            <div className="text-center">
              <p className="text-white/60 text-sm">
                This is a demo version. All features are fully functional!
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DemoLoginPage;