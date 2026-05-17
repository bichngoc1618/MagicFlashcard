import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

type ScreenContainerProps = {
  children: React.ReactNode;
};

export default function ScreenContainer({ children }: ScreenContainerProps) {
  const { colors } = useTheme();

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top']}>
      {children}
    </SafeAreaView>
  );
}