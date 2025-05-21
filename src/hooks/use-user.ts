import { useState, useEffect } from 'react';

interface User {
  id: string;
  email?: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>({ id: 'demo-user-123', email: 'demo@example.com' });
  const [loading, setLoading] = useState(false);

  // No authentication checks, always provide demo user
  return { user, loading };
} 