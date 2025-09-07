import { createContext, useContext, useState, ReactNode } from 'react';

// Fallback auth context for development when Clerk has issues
interface FallbackUser {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  imageUrl?: string;
}

interface FallbackAuthContextType {
  user: FallbackUser | null;
  isSignedIn: boolean;
  isLoaded: boolean;
  signIn: (email: string) => void;
  signOut: () => void;
}

const FallbackAuthContext = createContext<FallbackAuthContextType | undefined>(undefined);

export const useFallbackAuth = () => {
  const context = useContext(FallbackAuthContext);
  if (context === undefined) {
    throw new Error('useFallbackAuth must be used within a FallbackAuthProvider');
  }
  return context;
};

interface FallbackAuthProviderProps {
  children: ReactNode;
}

export const FallbackAuthProvider: React.FC<FallbackAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<FallbackUser | null>(() => {
    // Check localStorage for existing session
    const savedUser = localStorage.getItem('fallback_auth_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const signIn = (email: string) => {
    const newUser: FallbackUser = {
      id: `fallback_${Date.now()}`,
      firstName: 'Demo',
      lastName: 'User',
      emailAddress: email,
      imageUrl: undefined
    };
    
    setUser(newUser);
    localStorage.setItem('fallback_auth_user', JSON.stringify(newUser));
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('fallback_auth_user');
  };

  const value: FallbackAuthContextType = {
    user,
    isSignedIn: !!user,
    isLoaded: true,
    signIn,
    signOut
  };

  return (
    <FallbackAuthContext.Provider value={value}>
      {children}
    </FallbackAuthContext.Provider>
  );
};

// Fallback auth components
export const FallbackSignedIn: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isSignedIn } = useFallbackAuth();
  return isSignedIn ? <>{children}</> : null;
};

export const FallbackSignedOut: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isSignedIn } = useFallbackAuth();
  return !isSignedIn ? <>{children}</> : null;
};

export const FallbackUserButton: React.FC = () => {
  const { user, signOut } = useFallbackAuth();
  
  if (!user) return null;
  
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm">
        {user.firstName[0]}{user.lastName[0]}
      </div>
      <button 
        onClick={signOut}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        Sign Out
      </button>
    </div>
  );
};