import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ScreenContainer from '../ScreenContainer';

interface QuizErrorStateProps {
  error: string;
  onRetry: () => void;
}

export default function QuizErrorState({ error, onRetry }: QuizErrorStateProps) {
  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={onRetry} style={styles.button}>
          <Text style={styles.buttonText}>Thử lại</Text>
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
  errorText: {
    color: '#EA2B2B',
    textAlign: 'center',
    marginBottom: 16,
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
});
