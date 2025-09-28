import { Monitor, Moon, Sun, ChevronDown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Button } from './ui/Button';
import { useState, useRef, useEffect } from 'react';

const ThemeSelector = ({ className = '' }) => {
  const { theme, setLightTheme, setDarkTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const currentTheme = themes.find(t => t.value === theme) || themes[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleThemeChange = (themeValue) => {
    if (themeValue === 'light') {
      setLightTheme();
    } else if (themeValue === 'dark') {
      setDarkTheme();
    } else {
      // System theme - detect based on media query
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        setDarkTheme();
      } else {
        setLightTheme();
      }
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 px-3 justify-between min-w-[120px] bg-background/100 hover:bg-accent hover:text-accent-foreground border-border"
      >
        <div className="flex items-center gap-2">
          <currentTheme.icon className="h-4 w-4" />
          <span className="text-sm font-medium">{currentTheme.label}</span>
        </div>
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 bg-popover/100 backdrop-blur-sm border border-border rounded-md shadow-lg z-50 overflow-hidden">
          <div className="py-1">
            {themes.map((themeOption) => {
              const Icon = themeOption.icon;
              const isSelected = themeOption.value === theme;
              return (
                <button
                  key={themeOption.value}
                  onClick={() => handleThemeChange(themeOption.value)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                    isSelected 
                      ? 'bg-accent text-accent-foreground font-medium' 
                      : 'text-popover-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{themeOption.label}</span>
                  {isSelected && (
                    <div className="ml-auto h-2 w-2 rounded-full bg-current" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;