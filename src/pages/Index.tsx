import React from 'react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Brain, ShieldCheck, Sparkles, LineChart, MessageCircleHeart } from 'lucide-react';

const Index = () => {
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-radial from-primary/5 via-background to-background">
      <Navbar />

      <main className="flex-1 pt-16 sm:pt-20">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="pointer-events-none absolute -top-24 -left-24 h-[28rem] w-[28rem] rounded-full bg-primary/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-[32rem] w-[32rem] rounded-full bg-accent/15 blur-[100px]" />
          </div>

          <div className="container mx-auto px-4 py-12 sm:py-16 md:py-24 grid lg:grid-cols-2 gap-10 items-center">
            <div className="text-center lg:text-left space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs sm:text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Now with smarter emotion insights</span>
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-fade-in">
                Understand your emotions.
                <br className="hidden sm:block" />
                Grow with AI guidance.
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 animate-fade-in">
                MindMate helps you track feelings, reflect with AI, and discover resources that truly help. A calmer, clearer you — one day at a time.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start animate-fade-in">
                <Button size="lg" asChild>
                  <Link to="/auth?mode=signup&redirectTo=%2Fdashboard">Get Started</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/auth?mode=signin&redirectTo=%2Fdashboard">Sign In</Link>
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-6 max-w-lg mx-auto lg:mx-0">
                <Stat label="Mood logs" value="120k+" />
                <Stat label="Avg. rating" value="4.8/5" />
                <Stat label="Countries" value="40+" />
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="mx-auto w-full max-w-md rounded-3xl border bg-card/70 backdrop-blur p-6 shadow-xl animate-float">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Today’s reflection</span>
                </div>
                <div className="space-y-3">
                  <div className="h-3 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-5/6 rounded bg-muted" />
                  <div className="h-3 w-2/3 rounded bg-muted" />
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  <MiniCard icon={<ShieldCheck className="h-4 w-4" />} title="Private" desc="You control your data" />
                  <MiniCard icon={<LineChart className="h-4 w-4" />} title="Trends" desc="See your progress" />
                  <MiniCard icon={<MessageCircleHeart className="h-4 w-4" />} title="Support" desc="Helpful prompts" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="container mx-auto px-4 py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard title="Real-time Emotion Analysis" description="Our AI understands nuances in your words and tone to detect emotions accurately." icon="🔍" />
            <FeatureCard title="Personalized Support" description="Get coping tips, exercises, and prompts tailored to the way you feel today." icon="🧩" />
            <FeatureCard title="Progress You Can See" description="Beautiful charts help you reflect on patterns and celebrate growth." icon="📊" />
          </div>
        </section>

        {/* CALLOUT */}
        <section className="container mx-auto px-4 py-10">
          <div className="rounded-2xl border bg-gradient-to-r from-primary/5 to-accent/5 p-6 sm:p-10 text-center">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-3">Built with your wellbeing in mind</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">No noise. No overwhelm. Just a calm space to listen, reflect, and feel better. Join thousands finding balance with MindMate.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild>
                <Link to="/auth?mode=signup&redirectTo=%2Fdashboard">Create free account</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/auth?mode=signin&redirectTo=%2Fdashboard">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="container mx-auto px-4 pb-16">
          <h3 className="text-xl sm:text-2xl font-semibold text-center mb-6">What users say</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Testimonial quote="MindMate makes it so easy to reflect. I feel calmer after every session." author="Aisha" />
            <Testimonial quote="The AI prompts are surprisingly thoughtful. It’s like journaling with a guide." author="Mateo" />
            <Testimonial quote="I finally see patterns in my moods. The charts are beautiful and useful." author="Riya" />
          </div>
        </section>
      </main>

      <footer className="py-6 border-t border-white/10">
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

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon }) => (
  <div className="p-5 sm:p-6 rounded-xl border bg-card hover:shadow-lg transition-all hover:-translate-y-0.5">
    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3 text-2xl">
      {icon}
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border bg-card p-4">
    <div className="text-2xl font-semibold">{value}</div>
    <div className="text-sm text-muted-foreground">{label}</div>
  </div>
);

const MiniCard: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="rounded-xl border bg-background p-3">
    <div className="flex items-center gap-2 mb-1 text-sm font-medium">{icon} {title}</div>
    <div className="text-xs text-muted-foreground">{desc}</div>
  </div>
);

const Testimonial: React.FC<{ quote: string; author: string }> = ({ quote, author }) => (
  <div className="rounded-xl border bg-card p-5">
    <p className="italic">“{quote}”</p>
    <div className="mt-3 text-sm text-muted-foreground">— {author}</div>
  </div>
);

export default Index;
