import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingFallbackProps {
  height?: string;
  message?: string;
}

const LoadingFallback = ({ 
  height = 'h-64',
  message = 'Loading content...'
}) => {
  return (
    <div className={`w-full ${height} flex flex-col items-center justify-center rounded-lg border bg-card/50 animate-pulse`}>
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
      <div className="text-sm text-muted-foreground">{message}</div>
    </div>
  );
};

export default LoadingFallback; 