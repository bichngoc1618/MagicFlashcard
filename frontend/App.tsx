import React from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme
} from '@react-navigation/native';

import { AuthProvider } from './src/context/AuthContext';
import {
  ThemeProvider,
  useTheme
} from './src/context/ThemeContext';

import AppNavigator from './src/components/AppNavigator';
import { StatusBar } from 'expo-status-bar';

ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.log('GLOBAL ERROR:', error);
  console.log('IS FATAL:', isFatal);
});

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

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}