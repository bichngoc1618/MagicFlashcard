import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../ScreenContainer';
import { useTheme } from '../../context/ThemeContext';

export default function QuizLoadingState() {
  const { colors } = useTheme();

  return (
    <ScreenContainer>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.text, { color: colors.text }]}>Đang tải dữ liệu quiz...</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
  },
  text: {
    color: '#1F1F1F',
    textAlign: 'center',
  },
});
