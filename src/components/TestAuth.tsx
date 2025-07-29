import React from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const TestAuth: React.FC = () => {
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Authentication Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {user ? (
          <div className="space-y-2">
            <Badge variant="default">Authenticated</Badge>
            <p><strong>User ID:</strong> {user.id}</p>
            <p><strong>Email:</strong> {user.primaryEmailAddress?.emailAddress}</p>
            <p><strong>Name:</strong> {user.firstName} {user.lastName}</p>
            <Button onClick={() => signOut()} variant="outline">
              Sign Out
            </Button>
          </div>
        ) : (
          <div>
            <Badge variant="secondary">Not Authenticated</Badge>
            <p>Please sign in to continue.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TestAuth;