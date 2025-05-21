// Theme utility functions for MindMate

export type Theme = "dark" | "light" | "system";

// Storage key for the theme
export const THEME_STORAGE_KEY = "mindmate-theme";

/**
 * Get the current theme from local storage
 */
export function getStoredTheme(): Theme {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
    if (storedTheme && ["dark", "light", "system"].includes(storedTheme)) {
      return storedTheme;
    }
  } catch (e) {
    console.error("Failed to access localStorage for theme", e);
  }
  return "system";
}

/**
 * Store theme preference in local storage
 */
export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    console.error("Failed to store theme in localStorage", e);
  }
}

/**
 * Get the actual theme based on system preference
 */
export function resolveTheme(theme: Theme): "dark" | "light" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  const resolvedTheme = resolveTheme(theme);
  
  root.classList.remove("dark", "light");
  root.classList.add(resolvedTheme);
} 