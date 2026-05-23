import React from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme
} from '@react-navigation/native';
import { Platform } from 'react-native';

import { AuthProvider } from './src/context/AuthContext';
import {
  ThemeProvider,
  useTheme
} from './src/context/ThemeContext';

import AppNavigator from './src/components/AppNavigator';
import { StatusBar } from 'expo-status-bar';

if (typeof ErrorUtils !== 'undefined') {
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.log('GLOBAL ERROR:', error);
    console.log('IS FATAL:', isFatal);
  });
}

const GlobalWebStyles = () => {
  if (Platform.OS !== 'web') return null;
  return (
    <style type="text/css">
      {`
        body {
          overscroll-behavior-y: none;
          touch-action: pan-x pan-y;
          -webkit-tap-highlight-color: transparent;
        }
        * {
          user-select: none;
          -webkit-user-select: none;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        ::-webkit-scrollbar {
          display: none;
        }
        input, textarea, p, h1, h2, h3, h4, h5, h6 {
          user-select: auto;
          -webkit-user-select: auto;
        }
        [role="button"], a, button {
          cursor: pointer;
        }
      `}
    </style>
  );
};

function AppContent() {
  const { theme, colors } = useTheme();

  const navTheme = {
    ...(theme === 'dark'
      ? DarkTheme
      : DefaultTheme),

    colors: {
      ...(theme === 'dark'
        ? DarkTheme.colors
        : DefaultTheme.colors),

      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
      notification: colors.primary,
    },
  };

  return (
    <AuthProvider>
      <NavigationContainer theme={navTheme}>
        <GlobalWebStyles />
        <AppNavigator />
        <StatusBar
          style={theme === 'light'
            ? 'dark'
            : 'light'}
        />
      </NavigationContainer>
    </AuthProvider>
  );
}

import { GlobalUIProvider } from './src/context/GlobalUIContext';

export default function App() {
  return (
    <ThemeProvider>
      <GlobalUIProvider>
        <AppContent />
      </GlobalUIProvider>
    </ThemeProvider>
  );
}