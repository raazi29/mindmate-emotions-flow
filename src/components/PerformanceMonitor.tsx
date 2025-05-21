import React, { useEffect, useState, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface PerformanceMonitorProps {
  warningThreshold?: number; // milliseconds
  criticalThreshold?: number; // milliseconds
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  warningThreshold = 300, // Frame times above this will trigger a warning
  criticalThreshold = 700, // Frame times above this will trigger a critical warning
}) => {
  const [showWarning, setShowWarning] = useState(false);
  const [isPerformanceCritical, setIsPerformanceCritical] = useState(false);
  const [message, setMessage] = useState('');
  const frameTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const warningCountRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const isVisibleRef = useRef<boolean>(true);

  // Reset warnings when the component is unmounted or the tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
      if (!isVisibleRef.current) {
        // Reset when tab is hidden
        warningCountRef.current = 0;
        setShowWarning(false);
        setIsPerformanceCritical(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Monitor frame times
  useEffect(() => {
    const checkPerformance = () => {
      const now = performance.now();
      frameTimeRef.current = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      if (frameTimeRef.current > criticalThreshold && isVisibleRef.current) {
        warningCountRef.current += 1;
        
        if (warningCountRef.current >= 3) {
          setIsPerformanceCritical(true);
          setMessage('Page is responding slowly. Some features have been disabled to improve performance.');
          setShowWarning(true);
        }
      } else if (frameTimeRef.current > warningThreshold && isVisibleRef.current) {
        warningCountRef.current += 1;
        
        if (warningCountRef.current >= 5) {
          setIsPerformanceCritical(false);
          setMessage('Page is experiencing performance issues. Consider disabling some features.');
          setShowWarning(true);
        }
      } else {
        // Gradually reduce warning count if performance is good
        if (warningCountRef.current > 0) {
          warningCountRef.current -= 0.2;
        }
        
        if (warningCountRef.current <= 0) {
          warningCountRef.current = 0;
          setShowWarning(false);
        }
      }

      // Continue monitoring
      animationFrameRef.current = requestAnimationFrame(checkPerformance);
    };

    // Start monitoring
    animationFrameRef.current = requestAnimationFrame(checkPerformance);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [warningThreshold, criticalThreshold]);

  if (!showWarning) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 max-w-md p-3 rounded-lg shadow-lg flex items-center gap-2 ${
        isPerformanceCritical 
          ? 'bg-red-500 text-white' 
          : 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-50'
      }`}
    >
      <AlertTriangle className="h-5 w-5 flex-shrink-0" />
      <div className="text-sm">{message}</div>
      <button 
        onClick={() => setShowWarning(false)}
        className="ml-auto p-1 rounded-full hover:bg-black/10"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default PerformanceMonitor; 