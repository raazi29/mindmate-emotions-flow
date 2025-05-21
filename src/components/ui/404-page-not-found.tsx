"use client";

import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/components/ThemeProvider";
import { useEffect, useState } from "react";
import { resolveTheme } from "@/utils/theme-utils";

export function NotFoundPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Wait for component to mount to access theme
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Determine current theme
  const isDarkMode = mounted && resolveTheme(theme) === "dark";
  
  return (
    <section className={`${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} font-serif min-h-screen flex items-center justify-center transition-colors duration-300`}>
      <div className="container mx-auto px-4">
        <div className="flex justify-center">
          <div className="w-full sm:w-10/12 md:w-8/12 text-center">
            {/* Background container with theme-specific styling */}
            <div className={`rounded-lg p-8 ${isDarkMode ? 'bg-gray-800 shadow-xl shadow-primary/10' : 'bg-white shadow-xl'} transition-all duration-300`}>
              <div
                className="bg-[url(https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif)] h-[250px] sm:h-[350px] md:h-[400px] bg-center bg-no-repeat bg-contain mx-auto"
                aria-hidden="true"
              >
                <h1 className={`text-center ${isDarkMode ? 'text-primary-foreground' : 'text-primary'} text-6xl sm:text-7xl md:text-8xl pt-6 sm:pt-8 font-bold`}>
                  404
                </h1>
              </div>

              <div className="mt-[-30px]">
                <h3 className={`text-2xl ${isDarkMode ? 'text-white' : 'text-gray-800'} sm:text-3xl font-bold mb-4 transition-colors`}>
                  Look like you're lost
                </h3>
                <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} sm:mb-5 max-w-md mx-auto transition-colors`}>
                  The page you are looking for is not available! We suggest you return to the home page.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    variant="default"
                    onClick={() => navigate("/")}
                    className={`my-2 ${isDarkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'} transition-colors`}
                    size="lg"
                  >
                    Go to Home
                  </Button>
                  
                  <Button
                    variant={isDarkMode ? "outline" : "secondary"}
                    onClick={() => window.history.back()}
                    className={`my-2 ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
                    size="lg"
                  >
                    Go Back
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 