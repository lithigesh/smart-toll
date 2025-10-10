import { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Always use light theme - clean black and white design
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove any existing theme classes
    root.classList.remove('light', 'dark');
    
    // Always add light theme class
    root.classList.add('light');
  }, []);

  const value = {
    theme: 'light',
    toggleTheme: () => {}, // No-op for light theme only
    setLightTheme: () => {},
    setDarkTheme: () => {},
    isDark: false,
    isLight: true
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};