import React from 'react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Brain } from 'lucide-react';

const Index = () => {
  // Always assume we have a user now - no auth checking
  const user = { id: 'demo-user-123' };
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-radial from-primary/5 via-background to-background">
      <Navbar />
      
      <main className="flex-1 pt-16 sm:pt-24">
        <section className="container mx-auto px-3 sm:px-4 py-8 sm:py-12 md:py-24 flex flex-col items-center text-center">
          <div className="bg-primary/10 p-3 rounded-full mb-4 sm:mb-6 animate-float">
            <Brain className="h-8 w-8 sm:h-10 sm:w-10 text-primary animate-pulse-slow" />
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-3 sm:mb-4 animate-fade-in bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Your AI-Powered Emotional Companion
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mb-6 sm:mb-8 animate-fade-in px-2 sm:px-0">
            MindMate understands your emotions in real-time and provides personalized support for your mental well-being journey.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 animate-fade-in w-full sm:w-auto px-4 sm:px-0">
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
          
          <div className="mt-12 sm:mt-20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 w-full max-w-5xl px-3 sm:px-4">
            <FeatureCard 
              title="Real-time Emotion Analysis"
              description="Our AI understands the nuances of your emotions through natural conversation."
              icon="🔍"
            />
            <FeatureCard 
              title="Personalized Support"
              description="Get custom suggestions and resources tailored to your emotional state."
              icon="🧩"
            />
            <FeatureCard 
              title="Track Your Progress"
              description="Visualize your emotional journey with beautiful interactive charts."
              icon="📊"
            />
          </div>
          
          <div className="mt-12 sm:mt-16 w-full max-w-5xl px-3 sm:px-4">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-primary/80 to-accent/80 bg-clip-text text-transparent">
              Latest Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <Link to="/chat" className="group">
                <div className="p-4 sm:p-6 rounded-xl border border-primary/20 bg-card hover:bg-primary/5 transition-all hover:shadow-lg hover:border-primary/40">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-xl group-hover:bg-primary/20 transition-all">
                      💬
                    </div>
                    <h3 className="text-lg font-semibold">Anonymous Chatrooms</h3>
                  </div>
                  <p className="text-sm sm:text-base text-muted-foreground">Connect with others in a safe, anonymous environment to share experiences and get peer support.</p>
                  <div className="mt-4 flex justify-end">
                    <Button variant="ghost" size="sm" className="group-hover:bg-primary/20 transition-all">
                      Try Now
                    </Button>
                  </div>
                </div>
              </Link>
              
              <Link to="/resources" className="group">
                <div className="p-4 sm:p-6 rounded-xl border border-accent/20 bg-card hover:bg-accent/5 transition-all hover:shadow-lg hover:border-accent/40">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center text-xl group-hover:bg-accent/20 transition-all">
                      📚
                    </div>
                    <h3 className="text-lg font-semibold">Coping Resources</h3>
                  </div>
                  <p className="text-sm sm:text-base text-muted-foreground">Access a rich library of coping strategies, exercises, and professional resources.</p>
                  <div className="mt-4 flex justify-end">
                    <Button variant="ghost" size="sm" className="group-hover:bg-accent/20 transition-all">
                      Explore
                    </Button>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="py-4 sm:py-6 border-t border-white/10">
        <div className="container mx-auto px-4 text-center text-xs sm:text-sm text-muted-foreground">
          <p>© 2025 MindMate. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon }) => {
  return (
    <div className="p-4 sm:p-6 glass dark:glass-dark rounded-xl hover:shadow-lg transition-all hover:translate-y-[-4px]">
      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3 sm:mb-4 text-xl sm:text-2xl">
        {icon}
      </div>
      <h3 className="text-base sm:text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm sm:text-base text-muted-foreground">{description}</p>
    </div>
  );
};

export default Index;
