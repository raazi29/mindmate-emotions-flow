import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/ThemeProvider';
import { Sun, Moon } from 'lucide-react';

interface ThemeTestProps {
  children: React.ReactNode;
}

const ThemeTest = ({ children }) => {
  const { theme, setTheme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  return (
    <Card className="shadow-lg overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span>Theme Test Component</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme('light')}
              className={`${!isDarkMode ? 'bg-primary text-primary-foreground' : ''}`}
            >
              <Sun className="h-4 w-4 mr-1" />
              Light
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme('dark')}
              className={`${isDarkMode ? 'bg-primary text-primary-foreground' : ''}`}
            >
              <Moon className="h-4 w-4 mr-1" />
              Dark
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="p-2 mb-4 rounded-md bg-muted/50">
          <p className="text-sm text-center">
            Current mode: <span className="font-bold">{isDarkMode ? 'Dark' : 'Light'}</span>
          </p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
};

export default ThemeTest; 