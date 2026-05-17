import React, { createContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Theme = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSecondary: string;
  border: string;
  card: string;
  primary: string;
  success: string;
  warning: string;
  danger: string;
  muted: string;
  placeholder: string;
  overlay: string;
  nav: string;
}

export interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const lightColors: ThemeColors = {
  background: '#FFFFFF',
  surface: '#F8FBF9',
  surfaceAlt: '#E9F7F2',
  text: '#061C18',
  textSecondary: '#8BA39D',
  border: '#E8F1EE',
  card: '#FFFFFF',
  primary: '#0F4137',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  muted: '#64748B',
  placeholder: '#A0A0A0',
  overlay: 'rgba(0,0,0,0.5)',
  nav: '#FFFFFF',
};

const darkColors: ThemeColors = {
  background: '#0B1216',
  surface: '#172D29',
  surfaceAlt: '#203D37',
  text: '#F4F8F7',
  textSecondary: '#BFCBC6',
  border: '#2A4F47',
  card: '#1F3430',
  primary: '#4ECDC4',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  muted: '#94A29C',
  placeholder: '#A9BCB4',
  overlay: 'rgba(0,0,0,0.55)',
  nav: '#173027',
};

export const ThemeProvider = ({ children }: any) => {
  const [theme, setTheme] = useState<Theme>('light');
  const [isLoaded, setIsLoaded] = useState(false);
  const systemColorScheme = useColorScheme();

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        if (savedTheme) {
          setTheme(savedTheme as Theme);
        } else if (systemColorScheme) {
          setTheme(systemColorScheme);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadTheme();
  }, [systemColorScheme]);

  const toggleTheme = async () => {
    try {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const colors = theme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
