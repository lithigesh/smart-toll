# Smart Toll - Theme System

This project now includes a comprehensive dark/light theme system that adapts to user preferences and system settings.

## Features

- 🌙 **Dark Mode Support**: Complete dark theme implementation
- ☀️ **Light Mode**: Clean light theme (default)
- 🔄 **Theme Toggle**: Easy switching between themes
- 💾 **Persistent Preferences**: Remembers user choice across sessions
- 🖥️ **System Preference Detection**: Automatically detects OS theme preference
- ⚡ **No Flash**: Prevents flash of wrong theme on page load

## Components

### ThemeProvider
The main context provider that manages theme state and provides theme-related functionality to all child components.

Located: `src/context/ThemeContext.jsx`

### ThemeToggle
A simple toggle button that switches between light and dark themes.

Located: `src/components/ThemeToggle.jsx`

### ThemeSelector
An advanced dropdown selector that allows choosing between Light, Dark, and System themes.

Located: `src/components/ThemeSelector.jsx`

## Usage

### Basic Theme Toggle
```jsx
import ThemeToggle from '../components/ThemeToggle';

function MyComponent() {
  return (
    <div>
      <ThemeToggle />
    </div>
  );
}
```

### Advanced Theme Selector
```jsx
import ThemeSelector from '../components/ThemeSelector';

function MyComponent() {
  return (
    <div>
      <ThemeSelector />
    </div>
  );
}
```

### Using Theme Context
```jsx
import { useTheme } from '../context/ThemeContext';

function MyComponent() {
  const { theme, toggleTheme, isDark, isLight } = useTheme();
  
  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={toggleTheme}>
        Switch to {isDark ? 'light' : 'dark'} mode
      </button>
    </div>
  );
}
```

## CSS Custom Properties

The theme system uses CSS custom properties defined in `src/index.css`:

### Light Theme (`:root`)
- Background colors: white, light grays
- Text colors: dark grays, black
- Accent colors: blues, purples

### Dark Theme (`.dark`)
- Background colors: dark grays, near black
- Text colors: light grays, white
- Accent colors: adjusted for dark backgrounds

## Tailwind Classes

Use theme-aware Tailwind classes:

```jsx
// Instead of fixed colors like 'bg-white' or 'text-gray-900'
<div className="bg-background text-foreground">
  <h1 className="text-foreground">Title</h1>
  <p className="text-muted-foreground">Description</p>
  <button className="bg-primary text-primary-foreground">
    Button
  </button>
</div>
```

## Available Theme Variables

- `background` / `foreground` - Main background and text
- `card` / `card-foreground` - Card backgrounds
- `popover` / `popover-foreground` - Popover/dropdown backgrounds
- `primary` / `primary-foreground` - Primary buttons and accents
- `secondary` / `secondary-foreground` - Secondary elements
- `muted` / `muted-foreground` - Muted/disabled elements
- `accent` / `accent-foreground` - Accent colors
- `destructive` / `destructive-foreground` - Error/danger colors
- `border` - Borders and dividers
- `input` - Form input backgrounds  
- `ring` - Focus rings

## Implementation Details

1. **Theme Detection**: On first load, checks localStorage for saved preference, then falls back to system preference
2. **Theme Persistence**: Saves theme choice to localStorage
3. **No Flash Prevention**: Script in `index.html` applies theme class before React loads
4. **CSS Variables**: All colors defined as HSL values in CSS custom properties
5. **Tailwind Integration**: Custom colors mapped to CSS variables in `tailwind.config.js`

## Pages with Theme Support

- ✅ Login page - Theme toggle in top right
- ✅ Signup page - Theme toggle in top right  
- ✅ Dashboard - Advanced theme selector in header
- ✅ All UI components - Theme-aware styling

## Browser Support

- All modern browsers that support CSS custom properties
- Graceful fallback for older browsers (uses light theme)

## Development

To add theme support to new components:

1. Use theme-aware Tailwind classes (e.g., `bg-background` instead of `bg-white`)
2. For custom styles, use CSS custom properties: `hsl(var(--background))`
3. Test in both light and dark modes
4. Consider adding `dark:` variants for complex styling

## Future Enhancements

- 🎨 Additional theme variants (blue, green, etc.)
- 🌈 Custom color picker
- 📱 Better mobile theme selector
- ⚙️ Theme settings page
- 🔧 Theme export/import functionality