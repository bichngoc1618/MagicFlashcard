import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ScreenContainer from '../ScreenContainer';
import { useTheme } from '../../context/ThemeContext';

interface QuizNoQuestionsStateProps {
  onGoBack: () => void;
}

export default function QuizNoQuestionsState({ onGoBack }: QuizNoQuestionsStateProps) {
  const { colors } = useTheme();

  return (
    <ScreenContainer>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.text, { color: colors.text } ]}>Không có câu hỏi quiz để hiển thị.</Text>
        <TouchableOpacity onPress={onGoBack} style={[styles.button, styles.marginTop, { backgroundColor: colors.primary }]}> 
          <Text style={styles.buttonText}>Quay lại</Text>
        </TouchableOpacity>
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
  button: {
    marginTop: 16,
    borderRadius: 24,
    backgroundColor: '#0E513D',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  marginTop: {
    marginTop: 24,
  },
});
