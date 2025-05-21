import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowRight, TrendingUp, ZoomIn, ZoomOut, Move, Info, RefreshCw, X, Clock, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTheme } from '@/components/ThemeProvider';

type Emotion = 'joy' | 'sadness' | 'anger' | 'fear' | 'love' | 'surprise' | 'neutral';

interface EmotionNode {
  id: string;
  emotion: Emotion;
  count: number;
  timestamp: Date;
}

interface EmotionTransition {
  source: Emotion;
  target: Emotion;
  count: number;
}

interface EmotionFlowChartProps {
  emotionHistory: { emotion: Emotion; timestamp: Date }[];
  currentEmotion: Emotion;
}

const EmotionFlowChart: React.FC<EmotionFlowChartProps> = ({ 
  emotionHistory = [],
  currentEmotion = 'neutral'
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  // Canvas and animation refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Chart state
  const [transitions, setTransitions] = useState<EmotionTransition[]>([]);
  const [nodes, setNodes] = useState<Record<Emotion, { x: number, y: number, radius: number }>>({
    joy: { x: 0, y: 0, radius: 30 },
    sadness: { x: 0, y: 0, radius: 30 },
    anger: { x: 0, y: 0, radius: 30 },
    fear: { x: 0, y: 0, radius: 30 },
    love: { x: 0, y: 0, radius: 30 },
    surprise: { x: 0, y: 0, radius: 30 },
    neutral: { x: 0, y: 0, radius: 30 }
  });
  const [animatedParticles, setAnimatedParticles] = useState<Array<{
    x: number;
    y: number;
    lastX: number;
    lastY: number;
    targetX: number;
    targetY: number;
    emotion: Emotion;
    progress: number;
    speed: number;
    controlX?: number;
    controlY?: number;
  }>>([]);
  
  // Interactive features state
  const [focusedEmotion, setFocusedEmotion] = useState<Emotion | null>(null);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [transitionStats, setTransitionStats] = useState<{
    emotion: Emotion;
    transitions: Array<{
      to: Emotion,
      count: number,
      percentage: number,
      timePattern?: string
    }>;
    timeOfDay: Record<string, number>;
  } | null>(null);
  
  // Enhanced features
  const [selectedAnalysisTab, setSelectedAnalysisTab] = useState<string>('transitions');
  const [patternRecognitionEnabled, setPatternRecognitionEnabled] = useState<boolean>(true);
  const [animationSpeed, setAnimationSpeed] = useState<number>(1);
  const [highlightedConnection, setHighlightedConnection] = useState<{source: Emotion, target: Emotion} | null>(null);
  
  // Pattern detection state
  const [emotionPatterns, setEmotionPatterns] = useState<Array<{
    pattern: Emotion[];
    count: number;
    description: string;
  }>>([]);

  // Time analysis state
  const [timeCorrelations, setTimeCorrelations] = useState<Record<Emotion, {
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
  }>>({} as Record<Emotion, any>);

  // Colors for different emotions - updated with theme support
  const emotionColors: Record<Emotion, { light: string, dark: string }> = {
    joy: { light: '#FFD700', dark: '#FFC107' }, // Gold/Amber
    sadness: { light: '#6495ED', dark: '#5C81E8' }, // CornflowerBlue
    anger: { light: '#FF4500', dark: '#F44336' }, // OrangeRed/Red
    fear: { light: '#9370DB', dark: '#9C27B0' }, // MediumPurple/Purple
    love: { light: '#FF69B4', dark: '#E91E63' }, // HotPink/Pink
    surprise: { light: '#00BFFF', dark: '#03A9F4' }, // DeepSkyBlue/LightBlue
    neutral: { light: '#A9A9A9', dark: '#9E9E9E' } // DarkGray/Gray
  };
  
  // Get active color based on current theme
  const getEmotionColor = (emotion: Emotion): string => {
    return isDarkMode ? emotionColors[emotion].dark : emotionColors[emotion].light;
  };

  // Create sample data if emotionHistory is empty (for demo purposes)
  const [sampleDataAdded, setSampleDataAdded] = useState(false);
  useEffect(() => {
    if (emotionHistory.length === 0 && !sampleDataAdded) {
      console.log("Creating sample emotion data");
      // Create some sample emotion data to demonstrate the flow
      const sampleEmotions: Array<{ emotion: Emotion, timestamp: Date }> = [
        { emotion: 'neutral', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
        { emotion: 'joy', timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
        { emotion: 'sadness', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
        { emotion: 'neutral', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        { emotion: 'anger', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
        { emotion: 'fear', timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000) },
        { emotion: 'neutral', timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000) },
        { emotion: 'joy', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000) },
        { emotion: 'love', timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000) },
        { emotion: 'surprise', timestamp: new Date() }
      ];
      
      // Update local state
      setSampleDataAdded(true);
      
      // Process sample data as if it came from props
      processEmotionHistory(sampleEmotions);
    } else if (emotionHistory.length > 0) {
      // Process real emotion history from props
      processEmotionHistory(emotionHistory);
    }
  }, [emotionHistory]);
  
  // Process emotion history function (extracted for reuse)
  const processEmotionHistory = useCallback((history: Array<{ emotion: Emotion, timestamp: Date }>) => {
    if (history.length < 2) return;
    
    // Sort by timestamp ascending
    const sortedHistory = [...history].sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );
    
    // Generate transition pairs
    const transitionPairs: Array<{
      source: Emotion;
      target: Emotion;
      timestamp: Date;
    }> = [];
    
    for (let i = 1; i < sortedHistory.length; i++) {
      transitionPairs.push({
        source: sortedHistory[i-1].emotion,
        target: sortedHistory[i].emotion,
        timestamp: sortedHistory[i].timestamp
      });
    }
    
    // Count transitions
    const transitionMap = new Map<string, EmotionTransition>();
    
    transitionPairs.forEach(pair => {
      const key = `${pair.source}_${pair.target}`;
      if (!transitionMap.has(key)) {
        transitionMap.set(key, {
          source: pair.source,
          target: pair.target,
          count: 0
        });
      }
      const transition = transitionMap.get(key)!;
      transition.count += 1;
    });
    
    // Convert to array for rendering
    setTransitions(Array.from(transitionMap.values()));
    
    // Create particles for recent transitions (last 5)
    const recentTransitions = transitionPairs.slice(-5);
    
    const newParticles = recentTransitions.map(transition => {
      const sourceNode = nodes[transition.source] || { x: 0, y: 0 };
      const targetNode = nodes[transition.target] || { x: 0, y: 0 };
      
      const controlX = (sourceNode.x + targetNode.x) / 2;
      const controlY = (sourceNode.y + targetNode.y) / 2 - 30;
      
      return {
        x: sourceNode.x,
        y: sourceNode.y,
        lastX: sourceNode.x,
        lastY: sourceNode.y,
        targetX: targetNode.x,
        targetY: targetNode.y,
        controlX,
        controlY,
        emotion: transition.target,
        progress: 0,
        speed: (0.005 + Math.random() * 0.008) * animationSpeed
      };
    });
    
    setAnimatedParticles(prev => [...prev, ...newParticles]);
    
    // Analyze emotion patterns
    if (sortedHistory.length >= 3 && patternRecognitionEnabled) {
      analyzeEmotionPatterns(sortedHistory);
    }
    
  }, [nodes, animationSpeed, patternRecognitionEnabled]);

  // Emotion positioning (circular layout)
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Make canvas responsive and fix blurriness
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      
      // Get the display size of the canvas
      const rect = parent.getBoundingClientRect();
      const displayWidth = rect.width;
      const displayHeight = rect.height || 300;
      
      // Get the device pixel ratio
      const dpr = window.devicePixelRatio || 1;
      
      // Set the canvas size for high DPI displays
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      
      // Scale down the canvas CSS size
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      
      // Scale up drawing operations
      ctx.scale(dpr, dpr);
      
      // Recalculate node positions
      const centerX = displayWidth / 2;
      const centerY = displayHeight / 2;
      const radius = Math.min(centerX, centerY) * 0.65;
      
      const emotions: Emotion[] = ['joy', 'love', 'surprise', 'neutral', 'fear', 'anger', 'sadness'];
      const newNodes = { ...nodes };
      
      // Position nodes in a circle
      emotions.forEach((emotion, i) => {
        const angle = (i / emotions.length) * 2 * Math.PI;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        newNodes[emotion] = { 
          x, 
          y, 
          radius: (emotion === currentEmotion ? 40 : 30) * (emotion === focusedEmotion ? 1.2 : 1)
        };
      });
      
      setNodes(newNodes);
      
      console.log("Canvas resized. Nodes positioned at:", newNodes);
    };
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [currentEmotion, nodes, focusedEmotion]);

  // Calculate emotion time correlations
  useEffect(() => {
    if (emotionHistory.length === 0) return;

    const correlations: Record<Emotion, { morning: number; afternoon: number; evening: number; night: number }> = {
      joy: { morning: 0, afternoon: 0, evening: 0, night: 0 },
      sadness: { morning: 0, afternoon: 0, evening: 0, night: 0 },
      anger: { morning: 0, afternoon: 0, evening: 0, night: 0 },
      fear: { morning: 0, afternoon: 0, evening: 0, night: 0 },
      love: { morning: 0, afternoon: 0, evening: 0, night: 0 },
      surprise: { morning: 0, afternoon: 0, evening: 0, night: 0 },
      neutral: { morning: 0, afternoon: 0, evening: 0, night: 0 }
    };

    emotionHistory.forEach(entry => {
      const hour = entry.timestamp.getHours();
      let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
      
      if (hour >= 6 && hour < 12) timeOfDay = 'morning';
      else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
      else if (hour >= 18) timeOfDay = 'evening';
      else timeOfDay = 'night';
      
      correlations[entry.emotion][timeOfDay]++;
    });

    setTimeCorrelations(correlations);
  }, [emotionHistory]);

  // Detect emotional patterns - enhanced with recurring cycles detection
  const analyzeEmotionPatterns = (sortedHistory: Array<{emotion: Emotion, timestamp: Date}>) => {
    console.log("Analyzing emotion patterns from history:", sortedHistory);
    
    // Look for common patterns of length 3-5 for more comprehensive analysis
    const patterns: Record<string, {count: number, timestamps: Date[]}> = {};
    const patternLengths = [2, 3, 4]; // Check different pattern lengths (reduced to 2-4 for better matches)
    
    patternLengths.forEach(patternLength => {
      for (let i = 0; i <= sortedHistory.length - patternLength; i++) {
        const pattern = sortedHistory.slice(i, i + patternLength).map(entry => entry.emotion);
        const patternKey = pattern.join('→');
        
        if (!patterns[patternKey]) {
          patterns[patternKey] = { count: 0, timestamps: [] };
        }
        patterns[patternKey].count++;
        patterns[patternKey].timestamps.push(sortedHistory[i + patternLength - 1].timestamp);
      }
    });
    
    console.log("Identified patterns:", patterns);
    
    // Consider a pattern significant if it occurs at least once (for demo purposes)
    // In a real app, you might want to set a higher threshold
    const significantPatterns = Object.entries(patterns)
      .filter(([_, data]) => data.count >= 1)
      .map(([pattern, data]) => {
        // Calculate average interval between occurrences
        let avgInterval = 0;
        if (data.timestamps.length >= 2) {
          let totalInterval = 0;
          for (let i = 1; i < data.timestamps.length; i++) {
            totalInterval += data.timestamps[i].getTime() - data.timestamps[i-1].getTime();
          }
          avgInterval = totalInterval / (data.timestamps.length - 1);
        }
        
        return {
          pattern: pattern.split('→') as Emotion[],
          count: data.count,
          avgIntervalMs: avgInterval,
          description: generatePatternDescription(pattern.split('→') as Emotion[], data.count, avgInterval)
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 3); // Top 3 patterns
    
    console.log("Significant patterns detected:", significantPatterns);
    setEmotionPatterns(significantPatterns);
  };
  
  // Generate improved human-readable pattern descriptions
  const generatePatternDescription = (pattern: Emotion[], count: number, avgIntervalMs: number): string => {
    if (pattern.length < 2) {
      return `You've experienced ${pattern[0]} ${count} times`;
    }
    
    const frequency = count === 1 ? 'once' : count === 2 ? 'twice' : `${count} times`;
    let description = '';
    
    // Check for repeating emotions
    if (pattern[0] === pattern[pattern.length - 1] && pattern.length > 2) {
      const middleEmotions = pattern.slice(1, -1).join(' → ');
      description = `You've returned to ${pattern[0]} after experiencing ${middleEmotions} ${frequency}`;
    } else {
      // Check for emotional progression
      description = `You move from ${pattern[0]} to ${pattern[pattern.length - 1]}`;
      
      if (pattern.length > 2) {
        const middle = pattern.slice(1, -1);
        description += ` via ${middle.join(' → ')}`;
      }
      
      description += ` ${frequency}`;
    }
    
    // Add time information if available
    if (avgIntervalMs > 0) {
      const hours = Math.round(avgIntervalMs / (1000 * 60 * 60));
      if (hours < 24) {
        description += `, typically ${hours} hour${hours !== 1 ? 's' : ''} apart`;
      } else {
        const days = Math.round(hours / 24);
        description += `, typically ${days} day${days !== 1 ? 's' : ''} apart`;
      }
    }
    
    return description;
  };

  // Click handler for nodes - enhanced with more detailed analysis
  const handleNodeClick = (emotion: Emotion) => {
    console.log(`Node clicked: ${emotion}`); // Debug log
    
    // If clicking the already focused emotion, clear the focus
    if (focusedEmotion === emotion) {
      setFocusedEmotion(null);
      setShowStats(false);
      setTransitionStats(null);
      setHighlightedConnection(null);
      return;
    }
    
    setFocusedEmotion(emotion);
    setShowStats(true);
    
    // Calculate time of day statistics
    const timeOfDayStats: Record<string, number> = {
      morning: 0,   // 6-12
      afternoon: 0, // 12-18
      evening: 0,   // 18-24
      night: 0      // 0-6
    };
    
    // Filter emotion entries for this emotion
    const emotionEntries = emotionHistory.filter(entry => entry.emotion === emotion);
    
    emotionEntries.forEach(entry => {
      const hour = entry.timestamp.getHours();
      if (hour >= 6 && hour < 12) timeOfDayStats.morning++;
      else if (hour >= 12 && hour < 18) timeOfDayStats.afternoon++;
      else if (hour >= 18) timeOfDayStats.evening++;
      else timeOfDayStats.night++;
    });
    
    // Find all transitions FROM this emotion
    const outgoingTransitions = transitions
      .filter(t => t.source === emotion)
      .map(t => ({
        to: t.target,
        count: t.count,
        percentage: 0,
        timePattern: getTimePattern(emotion, t.target)
      }));
    
    // Calculate percentages
    const totalOutgoing = outgoingTransitions.reduce((sum, t) => sum + t.count, 0) || 1;
    outgoingTransitions.forEach(t => {
      t.percentage = Math.round((t.count / totalOutgoing) * 100);
    });
    
    // Set transition stats with updated information
    setTransitionStats({
      emotion,
      transitions: outgoingTransitions,
      timeOfDay: timeOfDayStats
    });
    
    // Force a re-render to ensure details panel appears
    setTimeout(() => {
      if (!showStats) {
        setShowStats(true);
      }
    }, 10);
  };
  
  // Helper to generate time patterns for transitions
  const getTimePattern = (from: Emotion, to: Emotion): string => {
    // In a real app, this would analyze when transitions happen
    // For now, we'll return placeholder text based on emotion pair
    const patterns: Record<string, string> = {
      'joy_sadness': 'typically in evenings',
      'sadness_joy': 'often in mornings',
      'anger_calm': 'after taking breaks',
      'fear_relief': 'after resolving uncertainties',
      'surprise_curiosity': 'during new experiences',
      'neutral_joy': 'after good news'
    };
    
    const key = `${from}_${to}`;
    return patterns[key] || '';
  };

  // Handle click on a transition connection
  const handleConnectionClick = (source: Emotion, target: Emotion) => {
    setHighlightedConnection({ source, target });
    
    // Calculate statistics for this specific transition
    const transitionEntries: Date[] = [];
    
    for (let i = 1; i < emotionHistory.length; i++) {
      if (emotionHistory[i-1].emotion === source && emotionHistory[i].emotion === target) {
        transitionEntries.push(emotionHistory[i].timestamp);
      }
    }
    
    // Calculate time patterns, frequency, etc.
    // This would display in a detailed view
  };

  // Animation loop for rendering the chart
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animatedParticlesLocal = [...animatedParticles];
    
    const renderFrame = () => {
      if (!ctx || !canvas) return;
      
      // Clear canvas with a gradient background for better contrast
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      
      // Create gradient background with depth effect
      ctx.save();
      
      // First layer - main gradient
      const gradient = ctx.createRadialGradient(
        width * 0.7, height * 0.3, 0,
        width * 0.5, height * 0.5, width * 0.8
      );
      
      if (isDarkMode) {
        gradient.addColorStop(0, 'rgba(30, 30, 60, 0.4)');
        gradient.addColorStop(0.7, 'rgba(20, 20, 40, 0.5)');
        gradient.addColorStop(1, 'rgba(10, 10, 25, 0.6)');
      } else {
        gradient.addColorStop(0, 'rgba(250, 250, 255, 0.5)');
        gradient.addColorStop(0.7, 'rgba(245, 245, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(240, 240, 250, 0.7)');
      }
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      
      // Second layer - subtle highlights
      const highlightGradient = ctx.createLinearGradient(0, 0, width, height);
      
      if (isDarkMode) {
        highlightGradient.addColorStop(0, 'rgba(70, 70, 120, 0.05)');
        highlightGradient.addColorStop(1, 'rgba(30, 30, 60, 0.05)');
      } else {
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        highlightGradient.addColorStop(1, 'rgba(240, 240, 255, 0.1)');
      }
      
      ctx.fillStyle = highlightGradient;
      ctx.fillRect(0, 0, width, height);
      
      // Grid pattern for depth (very subtle)
      if (zoomLevel > 0.8) {
        ctx.strokeStyle = isDarkMode ? 'rgba(100, 100, 150, 0.03)' : 'rgba(100, 100, 150, 0.02)';
        ctx.lineWidth = 0.5;
        
        const gridSize = 30;
        const offsetX = panOffset.x % gridSize;
        const offsetY = panOffset.y % gridSize;
        
        // Horizontal lines
        for (let y = offsetY; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        
        // Vertical lines
        for (let x = offsetX; x < width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
      }
      
      ctx.restore();
      
      // Apply zoom and pan transformations
      ctx.save();
      ctx.translate(panOffset.x, panOffset.y);
      ctx.scale(zoomLevel, zoomLevel);
      
      // Draw connections (edges)
      transitions.forEach(transition => {
        const sourceNode = nodes[transition.source];
        const targetNode = nodes[transition.target];
        
        if (!sourceNode || !targetNode) return;
        
        // Determine if this connection should be highlighted
        const isHighlighted = highlightedConnection && 
          highlightedConnection.source === transition.source && 
          highlightedConnection.target === transition.target;
        
        // Skip connections not connected to focused emotion when an emotion is focused
        if (focusedEmotion && transition.source !== focusedEmotion && transition.target !== focusedEmotion) {
          return;
        }
        
        const sourceColor = getEmotionColor(transition.source);
        const targetColor = getEmotionColor(transition.target);
        
        // Draw the connection with improved aesthetics
        const drawConnection = () => {
          // Create gradient
          const gradient = ctx.createLinearGradient(
            sourceNode.x, sourceNode.y, 
            targetNode.x, targetNode.y
          );
          gradient.addColorStop(0, sourceColor + (isDarkMode ? 'ee' : '99'));
          gradient.addColorStop(1, targetColor + (isDarkMode ? 'ee' : '99'));
          
          // Set line style
          ctx.beginPath();
          ctx.strokeStyle = gradient;
          ctx.lineWidth = Math.min(5, 1 + (transition.count * 0.5));
          ctx.lineCap = 'round';
          
          if (isHighlighted) {
            ctx.lineWidth += 3;
            ctx.shadowColor = isDarkMode ? sourceColor : targetColor;
            ctx.shadowBlur = 15;
          } else {
            ctx.globalAlpha = focusedEmotion ? 0.3 : 0.7;
          }
          
          // Calculate curve for better aesthetics
          // Use bezier curve for smoother connections
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Adjust curve based on distance between nodes
          const curveFactor = Math.min(0.3, 50 / distance);
          const midX = (sourceNode.x + targetNode.x) / 2;
          const midY = (sourceNode.y + targetNode.y) / 2;
          
          // Calculate perpendicular vector for control points
          const perpX = -dy * curveFactor;
          const perpY = dx * curveFactor;
          
          // Add slight upward bias
          const controlX = midX + perpX;
          const controlY = midY + perpY - 30;
          
          // Draw curved connection
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.quadraticCurveTo(controlX, controlY, targetNode.x, targetNode.y);
          ctx.stroke();
          
          // Reset shadow and opacity
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
          
          return { controlX, controlY };
        };
        
        const { controlX, controlY } = drawConnection();
        
        // Draw arrow
        const drawArrow = () => {
          const arrowSize = isHighlighted ? 12 : 10;
          const angle = Math.atan2(targetNode.y - controlY, targetNode.x - controlX);
          
          // Arrow position
          const arrowX = targetNode.x - (targetNode.radius + 3) * Math.cos(angle);
          const arrowY = targetNode.y - (targetNode.radius + 3) * Math.sin(angle);
          
          // Create gradient for arrow
          const arrowGradient = ctx.createLinearGradient(
            arrowX - arrowSize * Math.cos(angle),
            arrowY - arrowSize * Math.sin(angle),
            arrowX, 
            arrowY
          );
          arrowGradient.addColorStop(0, sourceColor + 'aa');
          arrowGradient.addColorStop(1, targetColor);
          
          ctx.beginPath();
          ctx.fillStyle = arrowGradient;
          
          // Draw arrow with rounded edges
          ctx.beginPath();
          ctx.moveTo(
            arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
            arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(arrowX, arrowY);
          ctx.lineTo(
            arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
            arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
          );
          
          // Create rounded arrow
          const cpX = arrowX - arrowSize * 0.8 * Math.cos(angle);
          const cpY = arrowY - arrowSize * 0.8 * Math.sin(angle);
          ctx.quadraticCurveTo(cpX, cpY, 
            arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
            arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
          );
          
          ctx.closePath();
          
          // Add glow effect for highlighted arrows
          if (isHighlighted) {
            ctx.shadowColor = targetColor;
            ctx.shadowBlur = 15;
          }
          
          ctx.fill();
          
          // Reset shadow
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        };
        
        drawArrow();
        
        // Draw transition count (if not too many transitions)
        if (transitions.length < 15 && transition.count > 1) {
          const midX = controlX;
          const midY = controlY;
          
          // Create a nice background for the count
          const textWidth = ctx.measureText(transition.count.toString()).width;
          const bgRadius = textWidth + 8;
          
          // Draw background circle with subtle gradient
          const countGradient = ctx.createRadialGradient(
            midX, midY, 0,
            midX, midY, bgRadius
          );
          
          if (isDarkMode) {
            countGradient.addColorStop(0, 'rgba(40, 40, 50, 0.9)');
            countGradient.addColorStop(1, 'rgba(30, 30, 40, 0.7)');
          } else {
            countGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            countGradient.addColorStop(1, 'rgba(245, 245, 245, 0.8)');
          }
          
          ctx.beginPath();
          ctx.fillStyle = countGradient;
          ctx.arc(midX, midY, bgRadius, 0, Math.PI * 2);
          ctx.fill();
          
          // Add subtle border
          ctx.beginPath();
          ctx.strokeStyle = isDarkMode ? 'rgba(70, 70, 80, 0.5)' : 'rgba(200, 200, 210, 0.7)';
          ctx.lineWidth = 1;
          ctx.arc(midX, midY, bgRadius, 0, Math.PI * 2);
          ctx.stroke();
          
          // Draw text with better font
          ctx.fillStyle = isDarkMode ? '#ffffff' : '#333333';
          ctx.font = '13px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(transition.count.toString(), midX, midY);
        }
      });
      
      // Update and draw animated particles
      const updatedParticles = [];
      
      for (const particle of animatedParticlesLocal) {
        if (particle.progress >= 1) continue;
        
        // Save current position
        particle.lastX = particle.x;
        particle.lastY = particle.y;
        
        // Calculate new position along curve
        const t = particle.progress;
        const cx = particle.controlX || (particle.x + particle.targetX) / 2;
        const cy = particle.controlY || (particle.y + particle.targetY) / 2 - 30;
        
        // Quadratic Bezier curve calculation
        particle.x = Math.pow(1-t, 2) * particle.lastX + 
                     2 * (1-t) * t * cx + 
                     Math.pow(t, 2) * particle.targetX;
        
        particle.y = Math.pow(1-t, 2) * particle.lastY + 
                     2 * (1-t) * t * cy + 
                     Math.pow(t, 2) * particle.targetY;
        
        // Draw particles with enhanced glowing effect
        const emotionColor = getEmotionColor(particle.emotion);
        
        // Enhanced particle rendering
        const particleSize = 8 - particle.progress * 4;
        const glowSize = particleSize * 2.5;
        
        // Outer glow
        const glowGradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, glowSize
        );
        glowGradient.addColorStop(0, `${emotionColor}80`);
        glowGradient.addColorStop(1, `${emotionColor}00`);
        
        ctx.beginPath();
        ctx.fillStyle = glowGradient;
        ctx.arc(particle.x, particle.y, glowSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Main particle
        const mainGradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particleSize
        );
        mainGradient.addColorStop(0, 'white');
        mainGradient.addColorStop(0.5, emotionColor);
        mainGradient.addColorStop(1, `${emotionColor}80`);
        
        ctx.beginPath();
        ctx.fillStyle = mainGradient;
        ctx.arc(particle.x, particle.y, particleSize, 0, Math.PI * 2);
        
        // Add glow
        ctx.shadowColor = emotionColor;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Draw trailing particles for motion effect
        if (particle.progress > 0.05) {
          // Draw fading trail
          for (let i = 1; i <= 5; i++) {
            const backtrackT = Math.max(0, t - (i * 0.02));
            if (backtrackT <= 0) continue;
            
            const trailX = Math.pow(1-backtrackT, 2) * particle.lastX + 
                       2 * (1-backtrackT) * backtrackT * cx + 
                       Math.pow(backtrackT, 2) * particle.targetX;
            
            const trailY = Math.pow(1-backtrackT, 2) * particle.lastY + 
                       2 * (1-backtrackT) * backtrackT * cy + 
                       Math.pow(backtrackT, 2) * particle.targetY;
            
            const trailSize = particleSize * (1 - (i * 0.15));
            const trailOpacity = 0.7 - (i * 0.15);
            
            ctx.beginPath();
            ctx.fillStyle = `${emotionColor}${Math.floor(trailOpacity * 255).toString(16).padStart(2, '0')}`;
            ctx.arc(trailX, trailY, trailSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        
        // Update progress
        particle.progress += particle.speed;
        
        if (particle.progress < 1) {
          updatedParticles.push(particle);
        }
      }
      
      // Generate new particles occasionally - increased frequency for more activity
      if (Math.random() < 0.05 && transitions.length > 0) {
        // Pick 1-3 random transitions to add particles to
        const numNewParticles = Math.floor(Math.random() * 3) + 1;
        
        for (let p = 0; p < numNewParticles; p++) {
          const randomIndex = Math.floor(Math.random() * transitions.length);
          const transition = transitions[randomIndex];
          
          const sourceNode = nodes[transition.source];
          const targetNode = nodes[transition.target];
          
          if (sourceNode && targetNode) {
            // Calculate curve control point
            const dx = targetNode.x - sourceNode.x;
            const dy = targetNode.y - sourceNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Adjust curve based on distance between nodes
            const curveFactor = Math.min(0.3, 50 / distance);
            const midX = (sourceNode.x + targetNode.x) / 2;
            const midY = (sourceNode.y + targetNode.y) / 2;
            
            // Calculate perpendicular vector for control points
            const perpX = -dy * curveFactor;
            const perpY = dx * curveFactor;
            
            // Add slight upward bias
            const controlX = midX + perpX;
            const controlY = midY + perpY - 30;
            
            updatedParticles.push({
              x: sourceNode.x,
              y: sourceNode.y,
              lastX: sourceNode.x,
              lastY: sourceNode.y,
              targetX: targetNode.x,
              targetY: targetNode.y,
              controlX,
              controlY,
              emotion: transition.target,
              progress: 0,
              speed: (0.006 + Math.random() * 0.012) * animationSpeed
            });
          }
        }
      }
      
      animatedParticlesLocal = updatedParticles;
      
      // Draw nodes (emotion circles)
      Object.entries(nodes).forEach(([emotion, node]) => {
        const isCurrentEmotion = emotion === currentEmotion;
        const isFocused = emotion === focusedEmotion;
        
        // Skip if not current emotion or focused when an emotion is focused
        if (focusedEmotion && !isFocused && emotion !== currentEmotion) {
          ctx.globalAlpha = 0.3;
        }
        
        // Create node with beautiful gradient
        const drawNode = () => {
          const emotionColor = getEmotionColor(emotion as Emotion);
          
          // Create circular gradient for node
          const gradient = ctx.createRadialGradient(
            node.x, node.y - node.radius * 0.2, node.radius * 0.1, // Shifted slightly up for 3D effect
            node.x, node.y, node.radius * 1.2
          );
          
          // Glossy gradient look
          if (isDarkMode) {
            gradient.addColorStop(0, emotionColor + 'ff');
            gradient.addColorStop(0.4, emotionColor + 'dd');
            gradient.addColorStop(0.75, emotionColor + '90');
            gradient.addColorStop(1, 'rgba(20, 20, 30, 0.8)');
          } else {
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.3, emotionColor + 'ff');
            gradient.addColorStop(0.7, emotionColor + '99');
            gradient.addColorStop(1, 'rgba(245, 245, 255, 0.9)');
          }
          
          // Draw main circle
          ctx.beginPath();
          ctx.fillStyle = gradient;
          
          // Add glow for current or focused emotion
          if (isCurrentEmotion || isFocused) {
            ctx.shadowColor = emotionColor;
            ctx.shadowBlur = isCurrentEmotion ? 25 : 18;
          }
          
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
          ctx.fill();
          
          // Remove shadow
          ctx.shadowBlur = 0;
          
          // Add subtle rim highlight for 3D effect
          ctx.beginPath();
          ctx.strokeStyle = isDarkMode ? 
            `rgba(255, 255, 255, ${isCurrentEmotion ? 0.4 : 0.2})` : 
            `rgba(255, 255, 255, ${isCurrentEmotion ? 0.9 : 0.7})`;
          ctx.lineWidth = 2;
          ctx.arc(node.x, node.y - node.radius * 0.15, node.radius * 0.7, Math.PI * 1.2, Math.PI * 1.8);
          ctx.stroke();
          
          // Add bottom shadow for 3D effect
          ctx.beginPath();
          ctx.strokeStyle = isDarkMode ? 
            `rgba(0, 0, 0, ${isCurrentEmotion ? 0.5 : 0.3})` : 
            `rgba(0, 0, 0, ${isCurrentEmotion ? 0.4 : 0.2})`;
          ctx.lineWidth = isCurrentEmotion ? 3 : 2;
          ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
          ctx.stroke();
        };
        
        drawNode();
        
        // Draw node content (emoji and label)
        const drawNodeContent = () => {
          // Add slight shadow effect for text
          if (isDarkMode) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 4;
          } else {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            ctx.shadowBlur = 3;
          }
          
          // Emoji with better rendering
          const emoji = getEmotionEmoji(emotion as Emotion);
          const fontSize = isCurrentEmotion ? 18 : 16;
          
          ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = isDarkMode ? '#ffffff' : '#000000';
          
          // Draw emoji with slight offset for 3D appearance
          if (isCurrentEmotion || isFocused) {
            // Draw glow behind emoji for current/focused emotions
            ctx.save();
            ctx.shadowColor = getEmotionColor(emotion as Emotion);
            ctx.shadowBlur = 15;
            ctx.fillText(emoji, node.x, node.y - 8);
            ctx.restore();
          } else {
            ctx.fillText(emoji, node.x, node.y - 8);
          }
          
          // Prepare for label drawing
          ctx.font = `${isCurrentEmotion ? 'bold ' : ''}14px system-ui, -apple-system, sans-serif`;
          
          // Draw label text
          if (isDarkMode) {
            // Create more visible text on dark background
            // Text with outline effect
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.lineWidth = 3;
            ctx.strokeText(emotion as string, node.x, node.y + 12);
            
            ctx.fillStyle = isCurrentEmotion ? '#ffffff' : 'rgba(255, 255, 255, 0.9)';
          } else {
            // Text for light mode
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 3;
            ctx.strokeText(emotion as string, node.x, node.y + 12);
            
            ctx.fillStyle = isCurrentEmotion ? '#000000' : 'rgba(0, 0, 0, 0.8)';
          }
          
          ctx.fillText(emotion as string, node.x, node.y + 12);
          
          // Reset shadow
          ctx.shadowBlur = 0;
        };
        
        drawNodeContent();
        
        // Reset opacity
        ctx.globalAlpha = 1;
      });
      
      ctx.restore();
      
      // Request next frame
      animationFrameRef.current = requestAnimationFrame(renderFrame);
    };
    
    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(renderFrame);
    
    // Setup event listeners for interaction
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) { // Left mouse button
        const rect = canvas.getBoundingClientRect();
        
        // Get coordinates adjusted for zoom and pan
        // Important: must account for both zoom and pan, but avoid applying DPR here
        const x = ((e.clientX - rect.left) / zoomLevel) - (panOffset.x / zoomLevel);
        const y = ((e.clientY - rect.top) / zoomLevel) - (panOffset.y / zoomLevel);
        
        console.log(`Click at: ${x}, ${y}`);
        
        // Check if clicked on a node - improved hit detection
        let clickedNode = false;
        let closestNode: { emotion: Emotion, distance: number } | null = null;
        
        Object.entries(nodes).forEach(([emotion, node]) => {
          console.log(`Node ${emotion} at: ${node.x}, ${node.y}, radius: ${node.radius}`);
          
          const dx = node.x - x;
          const dy = node.y - y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          console.log(`Distance to ${emotion}: ${distance}`);
          
          // Find closest node within detection range (increased range for better detection)
          if (distance <= node.radius * 2) {
            if (!closestNode || distance < closestNode.distance) {
              closestNode = {
                emotion: emotion as Emotion,
                distance: distance
              };
            }
            clickedNode = true;
          }
        });
        
        // Handle click on closest node if found
        if (closestNode) {
          console.log("Click detected on node:", closestNode.emotion, "distance:", closestNode.distance);
          handleNodeClick(closestNode.emotion);
          
          // Create ripple effect on click
          createRippleEffect(closestNode.emotion);
          
          // Prevent any panning when clicking on a node
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        // Check if clicked on a connection with improved detection
        if (!clickedNode) {
          let closestConnection: { source: Emotion, target: Emotion, distance: number } | null = null;
          
          transitions.forEach(transition => {
            const source = nodes[transition.source];
            const target = nodes[transition.target];
            
            // Calculate control points for the quadratic curve
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Adjust curve based on distance between nodes
            const curveFactor = Math.min(0.3, 50 / distance);
            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;
            
            // Calculate perpendicular vector for control points
            const perpX = -dy * curveFactor;
            const perpY = dx * curveFactor;
            
            // Add slight upward bias
            const controlX = midX + perpX;
            const controlY = midY + perpY - 30;
            
            // Calculate distance from point to quadratic curve (approximation)
            // We'll sample multiple points along the curve
            const samplePoints = 10;
            let minDistance = Infinity;
            
            for (let i = 0; i <= samplePoints; i++) {
              const t = i / samplePoints;
              
              // Quadratic Bezier formula
              const sampleX = Math.pow(1-t, 2) * source.x + 
                             2 * (1-t) * t * controlX + 
                             Math.pow(t, 2) * target.x;
                             
              const sampleY = Math.pow(1-t, 2) * source.y + 
                             2 * (1-t) * t * controlY + 
                             Math.pow(t, 2) * target.y;
              
              const dx = x - sampleX;
              const dy = y - sampleY;
              const dist = Math.sqrt(dx * dx + dy * dy);
              
              if (dist < minDistance) {
                minDistance = dist;
              }
            }
            
            // Consider this connection if it's close enough to click
            const threshold = 15; // Increased click distance threshold
            
            if (minDistance < threshold) {
              if (!closestConnection || minDistance < closestConnection.distance) {
                closestConnection = {
                  source: transition.source,
                  target: transition.target,
                  distance: minDistance
                };
              }
            }
          });
          
          // Handle click on closest connection if found
          if (closestConnection) {
            handleConnectionClick(closestConnection.source, closestConnection.target);
            clickedNode = true;
          }
        }
        
        // If not clicking a node or connection, start panning
        if (!clickedNode) {
          setIsPanning(true);
          setLastMousePos({ x: e.clientX, y: e.clientY });
        }
      }
    };
    
    // Create ripple effect when node is clicked
    const createRippleEffect = (emotion: Emotion) => {
      const node = nodes[emotion];
      
      // Add ripple animation to particles
      const rippleCount = 8;
      const newParticles = [];
      
      for (let i = 0; i < rippleCount; i++) {
        const angle = (i / rippleCount) * Math.PI * 2;
        const emotionColor = getEmotionColor(emotion);
        
        newParticles.push({
          x: node.x,
          y: node.y,
          lastX: node.x,
          lastY: node.y,
          targetX: node.x + node.radius * 3 * Math.cos(angle),
          targetY: node.y + node.radius * 3 * Math.sin(angle),
          emotion: emotion,
          progress: 0,
          speed: 0.03 * animationSpeed,
          isRipple: true
        });
      }
      
      // Add to particles array
      animatedParticlesLocal.push(...newParticles);
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Check for hover effects on nodes
      let hoveredNode = false;
      Object.entries(nodes).forEach(([emotion, node]) => {
        const dx = (node.x * zoomLevel + panOffset.x) - mouseX;
        const dy = (node.y * zoomLevel + panOffset.y) - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= node.radius * zoomLevel) {
          // Apply hover effects if needed
          hoveredNode = true;
          canvas.style.cursor = 'pointer';
        }
      });
      
      if (!hoveredNode) {
        canvas.style.cursor = isPanning ? 'grabbing' : 'move';
      }
      
      if (isPanning) {
        const dx = e.clientX - lastMousePos.x;
        const dy = e.clientY - lastMousePos.y;
        
        setPanOffset(prev => ({
          x: prev.x + dx,
          y: prev.y + dy
        }));
        
        setLastMousePos({ x: e.clientX, y: e.clientY });
      }
    };
    
    const handleMouseUp = () => {
      setIsPanning(false);
    };
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Zoom point calculation
      const zoomPoint = {
        x: (mouseX / zoomLevel) - (panOffset.x / zoomLevel),
        y: (mouseY / zoomLevel) - (panOffset.y / zoomLevel)
      };
      
      // Calculate new zoom level with smoother steps
      const zoomSpeed = 0.1;
      const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
      const newZoomLevel = Math.max(0.5, Math.min(3, zoomLevel + delta));
      
      // Calculate pan offset adjustment to zoom toward mouse position
      const dx = mouseX - (zoomPoint.x * newZoomLevel + panOffset.x);
      const dy = mouseY - (zoomPoint.y * newZoomLevel + panOffset.y);
      
      // Update state
      setZoomLevel(newZoomLevel);
      setPanOffset(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));
    };
    
    // Add event listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('mouseup', handleMouseUp);
    
    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    nodes, transitions, animatedParticles, zoomLevel, panOffset, 
    currentEmotion, focusedEmotion, highlightedConnection, isDarkMode, 
    isPanning, lastMousePos, handleNodeClick, handleConnectionClick,
    animationSpeed
  ]);

  // Helper function to get emoji for emotion
  const getEmotionEmoji = (emotion: Emotion): string => {
    const emojis: Record<string, string> = {
      joy: '😊',
      sadness: '😢',
      anger: '😠',
      fear: '😨',
      love: '❤️',
      surprise: '😲',
      neutral: '😐'
    };
    return emojis[emotion] || '😐';
  };

  // Reset zoom and pan
  const resetZoomPan = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Generate time correlation display data
  const timeCorrelationChart = useMemo(() => {
    if (!focusedEmotion || Object.keys(timeCorrelations).length === 0) return null;
    
    const data = timeCorrelations[focusedEmotion];
    if (!data) return null;
    
    const maxValue = Math.max(...Object.values(data));
    
    return (
      <div className="grid grid-cols-4 gap-1 mt-2">
        {Object.entries(data).map(([timeOfDay, count]) => (
          <div key={timeOfDay} className="text-center">
            <div className="h-10 bg-primary/20 rounded-sm relative">
              <div 
                className="absolute bottom-0 left-0 right-0 bg-primary" 
                style={{ 
                  height: `${Math.min(100, (count / (maxValue || 1)) * 100)}%`,
                  opacity: 0.7
                }}
              ></div>
            </div>
            <p className="mt-1 capitalize text-[10px]">{timeOfDay}</p>
          </div>
        ))}
      </div>
    );
  }, [focusedEmotion, timeCorrelations]);

  return (
    <Card className="w-full shadow-lg overflow-hidden transition-colors bg-card/80 backdrop-blur-sm border border-border/40">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <TrendingUp className="h-5 w-5 text-primary" />
            Emotion Flow Chart
          </CardTitle>
          {focusedEmotion && (
            <Badge variant="outline" className="capitalize flex items-center gap-1.5 py-1.5 px-3 bg-card/50 backdrop-blur-sm">
              <span className="text-xs font-medium">Focus:</span> {getEmotionEmoji(focusedEmotion)} {focusedEmotion}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-5">
        <div 
          ref={containerRef} 
          className="relative rounded-lg overflow-hidden h-[350px] bg-muted/20 border border-border/50 shadow-sm transition-all duration-200"
          style={{
            background: isDarkMode ? 
              'radial-gradient(circle at 70% 30%, rgba(30, 30, 50, 0.5), rgba(15, 15, 30, 0.7))' : 
              'radial-gradient(circle at 70% 30%, rgba(250, 250, 255, 0.7), rgba(240, 240, 250, 0.9))'
          }}
        >
          <canvas 
            ref={canvasRef} 
            className="w-full h-full cursor-move transition-opacity duration-150"
            style={{ opacity: isRefreshing ? 0.5 : 1 }}
          />
          
          {/* Controls overlay with improved styling */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            <Button 
              variant="secondary" 
              size="icon" 
              className="h-8 w-8 bg-background/80 backdrop-blur-sm shadow-sm border border-border/40 hover:bg-background/95 transition-all"
              onClick={() => setZoomLevel(zoomLevel * 1.2)}
            >
              <ZoomIn className="h-4 w-4" />
              <span className="sr-only">Zoom In</span>
            </Button>
            <Button 
              variant="secondary" 
              size="icon" 
              className="h-8 w-8 bg-background/80 backdrop-blur-sm shadow-sm border border-border/40 hover:bg-background/95 transition-all"
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel / 1.2))}
            >
              <ZoomOut className="h-4 w-4" />
              <span className="sr-only">Zoom Out</span>
            </Button>
            <Button 
              variant="secondary" 
              size="icon" 
              className="h-8 w-8 bg-background/80 backdrop-blur-sm shadow-sm border border-border/40 hover:bg-background/95 transition-all"
              onClick={resetZoomPan}
            >
              <RefreshCw className="h-4 w-4" />
              <span className="sr-only">Reset View</span>
            </Button>
          </div>
          
          {/* Improved instructions with better styling */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
            <div className="px-5 py-2 bg-background/80 backdrop-blur-md rounded-full text-xs flex items-center gap-4 shadow-md border border-border/40 transition-opacity duration-200">
              <div className="flex items-center">
                <Move className="h-3.5 w-3.5 mr-1.5 text-primary/70" /> 
                <span className="font-medium">Drag to pan</span>
              </div>
              <div className="w-px h-4 bg-border/60"></div>
              <div className="flex items-center">
                <ZoomIn className="h-3.5 w-3.5 mr-1.5 text-primary/70" /> 
                <span className="font-medium">Scroll to zoom</span>
              </div>
              <div className="w-px h-4 bg-border/60"></div>
              <div className="flex items-center">
                <Info className="h-3.5 w-3.5 mr-1.5 text-primary/70" /> 
                <span className="font-medium">Click nodes for details</span>
              </div>
            </div>
          </div>
          
          {/* Loading indicator - shows during refresh */}
          {isRefreshing && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-sm z-10">
              <div className="flex items-center gap-2 px-4 py-2 bg-background/90 shadow-lg rounded-lg">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium">Updating chart...</span>
              </div>
            </div>
          )}
        </div>
        
        {showStats && transitionStats && (
          <div className="rounded-md border border-border p-4 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300 bg-card/60 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium flex items-center">
                <Info className="h-4 w-4 mr-1.5 text-primary" />
                <span className="capitalize">
                  {getEmotionEmoji(transitionStats.emotion)} {transitionStats.emotion} Transitions
                </span>
              </h3>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 hover:bg-muted/80" 
                onClick={() => {
                  setShowStats(false);
                  setFocusedEmotion(null);
                }}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="text-muted-foreground text-xs block mb-1.5">Most common transitions:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {transitionStats.transitions.length > 0 ? (
                    transitionStats.transitions.map((t, i) => (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className="text-xs capitalize py-1 px-2 bg-secondary/60 hover:bg-secondary/80 transition-colors"
                      >
                        → {getEmotionEmoji(t.to)} {t.to} ({t.percentage}%)
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground italic">No transitions recorded yet</span>
                  )}
                </div>
              </div>
              
              {patternRecognitionEnabled && (
                <div>
                  <span className="text-muted-foreground text-xs block mb-1.5">Time of day patterns:</span>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(transitionStats.timeOfDay).map(([time, count]) => (
                      <Badge 
                        key={time} 
                        variant="outline" 
                        className={`text-xs py-1.5 flex items-center justify-center capitalize transition-colors
                          ${count > 0 ? 'bg-primary/10 hover:bg-primary/20' : 'bg-muted/30'}`}
                      >
                        {time}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {emotionPatterns.length > 0 ? (
          <div className="rounded-md border border-border p-4 text-sm bg-card/60 backdrop-blur-sm">
            <h3 className="font-medium flex items-center mb-2">
              <TrendingUp className="h-4 w-4 mr-1.5 text-primary" />
              Emotional Pattern{emotionPatterns.length > 1 ? 's' : ''} Detected
            </h3>
            <div className="space-y-2">
              {emotionPatterns.map((pattern, i) => (
                <div key={i} className="text-sm text-muted-foreground py-1">
                  <div className="flex items-center gap-1 mb-1">
                    {pattern.pattern.map((emotion, idx) => (
                      <React.Fragment key={idx}>
                        {idx > 0 && <ArrowRight className="h-3 w-3 mx-0.5 text-muted-foreground/70" />}
                        <Badge variant="outline" className="flex items-center gap-1 py-0.5 px-2">
                          {getEmotionEmoji(emotion)} {emotion}
                        </Badge>
                      </React.Fragment>
                    ))}
                  </div>
                  <p>{pattern.description}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-border p-4 text-sm bg-card/60 backdrop-blur-sm">
            <div className="text-center space-y-1">
              <p className="text-muted-foreground">
                Not enough emotion data to detect patterns yet.
              </p>
              <p className="text-xs text-muted-foreground/70">
                Continue tracking your emotions to discover patterns.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmotionFlowChart; 