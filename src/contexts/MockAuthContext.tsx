import React, { createContext, useContext, ReactNode } from 'react';

// Mock user for development
const mockUser = {
  id: 'demo-user-123',
  firstName: 'Demo',
  lastName: 'User',
  imageUrl: '',
  emailAddresses: [{ emailAddress: 'demo@mindmate.com' }]
};

interface MockAuthContextType {
  user: typeof mockUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
}

const MockAuthContext = createContext<MockAuthContextType>({
  user: mockUser,
  isLoaded: true,
  isSignedIn: true
});

export const useUser = () => {
  return useContext(MockAuthContext);
};

export const useAuth = () => {
  return {
    isSignedIn: true,
    isLoaded: true
  };
};

interface MockAuthProviderProps {
  children: ReactNode;
}

export const MockAuthProvider: React.FC<MockAuthProviderProps> = ({ children }) => {
  const value: MockAuthContextType = {
    user: mockUser,
    isLoaded: true,
    isSignedIn: true
  };

  return (
    <MockAuthContext.Provider value={value}>
      {children}
    </MockAuthContext.Provider>
  );
};

// Mock components for compatibility
export const SignedIn: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const SignedOut: React.FC<{ children: ReactNode }> = ({ children }) => {
  return null;
};

export const UserButton: React.FC<any> = () => {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted">
      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs text-white">
        D
      </div>
      <span className="text-sm">Demo User</span>
    </div>
  );
};