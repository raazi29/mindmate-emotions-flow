import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  HeartHandshake, 
  MessageCircle, 
  BookText, 
  Shield, 
  Menu, 
  X, 
  Workflow,
  User,
  LogOut 
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SignedIn, SignedOut, UserButton, useUser } from '@/contexts/MockAuthContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isLoaded } = useUser();
  
  // Function to check if a route is active
  const isActive = (path: string) => location.pathname === path;

  // Nav link style
  const navLinkStyle = (path: string) => `text-sm font-medium transition-all duration-300 relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-bottom-right after:scale-x-0 hover:after:origin-bottom-left hover:after:scale-x-100 after:transition-transform after:duration-300 ${
    isActive(path) ? 'text-primary after:bg-primary after:scale-x-100' : 'hover:text-primary after:bg-primary/50'
  }`;

  // Mobile nav link style
  const mobileNavLinkStyle = (path: string) => `w-full text-left py-3 px-4 text-base font-medium transition-all duration-300 ${
    isActive(path) ? 'text-primary bg-muted' : 'hover:text-primary hover:bg-muted/50'
  }`;

  // Get user's initials for avatar fallback
  const getUserInitials = () => {
    if (!user?.firstName && !user?.lastName) return 'U';
    return `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3 bg-background/50 backdrop-blur-xl border-b border-border shadow-sm">
      <div className="container mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <Brain className="h-6 w-6 text-primary group-hover:animate-pulse transition-all duration-300" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            MindMate
          </h1>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className={navLinkStyle('/')}>
            Home
          </Link>
          <Link to="/dashboard" className={navLinkStyle('/dashboard')}>
            Dashboard
          </Link>
          <Link to="/journal" className={navLinkStyle('/journal')}>
            Journal
          </Link>
          <Link to="/emotions-flow" className={navLinkStyle('/emotions-flow')}>
            <span className="flex items-center gap-1">
              <Workflow className="h-3.5 w-3.5" />
              Emotions Flow
            </span>
          </Link>
          <Link to="/chat" className={navLinkStyle('/chat')}>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              Chatrooms
            </span>
          </Link>
          <Link to="/safety-privacy" className={navLinkStyle('/safety-privacy')}>
            <span className="flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" />
              Safety
            </span>
          </Link>
          <Link to="/resources" className={navLinkStyle('/resources')}>
            Coping & Resources
          </Link>
        </nav>
        
        {/* Theme Toggle, User Menu and Mobile Menu */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          
          {/* Mobile Menu */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[250px] sm:w-[300px] p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  <span className="font-bold text-primary">MindMate</span>
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col py-2">
                <SheetClose asChild>
                  <Link to="/" className={mobileNavLinkStyle('/')}>
                    Home
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/dashboard" className={mobileNavLinkStyle('/dashboard')}>
                    Dashboard
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/journal" className={mobileNavLinkStyle('/journal')}>
                    Journal
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/emotions-flow" className={mobileNavLinkStyle('/emotions-flow')}>
                    <span className="flex items-center gap-2">
                      <Workflow className="h-4 w-4" />
                      Emotions Flow
                    </span>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/chat" className={mobileNavLinkStyle('/chat')}>
                    <span className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Chatrooms
                    </span>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/safety-privacy" className={mobileNavLinkStyle('/safety-privacy')}>
                    <span className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Safety
                    </span>
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/resources" className={mobileNavLinkStyle('/resources')}>
                    <span className="flex items-center gap-2">
                      <HeartHandshake className="h-4 w-4" />
                      Coping & Resources
                    </span>
                  </Link>
                </SheetClose>
              </div>
              <div className="flex flex-col gap-2 p-4 mt-auto border-t">
                <SignedIn>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.imageUrl} />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    <div className="text-sm font-medium truncate">
                      {user?.firstName} {user?.lastName}
                    </div>
                  </div>
                  <UserButton />
                </SignedIn>
              </div>
            </SheetContent>
          </Sheet>
          
          {/* User menu - hidden on mobile */}
          <div className="hidden md:flex items-center gap-2">
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
