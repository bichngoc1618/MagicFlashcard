import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import type { QuizType } from './types';
import { useTheme } from '../../context/ThemeContext';

type QuizHeaderProps = {
  stepProgress: number;
  activeType: QuizType;
  isBoss: boolean;
  questionIndex: number;
  totalQuestionCount: number;
  remainingSeconds: number;
  onCancel: () => void;
};

export default function QuizHeader({
  stepProgress,
  activeType,
  isBoss,
  questionIndex,
  totalQuestionCount,
  remainingSeconds,
  onCancel,
}: QuizHeaderProps) {
  const { colors } = useTheme();
  console.log('QuizHeader remainingSeconds:', remainingSeconds);
  return (
    <View style={[styles.header, { backgroundColor: colors.card }] }>
      <TouchableOpacity onPress={onCancel}>
        <X size={28} color={colors.textSecondary} />
      </TouchableOpacity>
      <View style={[styles.progressBar, { backgroundColor: colors.border }] }>
        <View style={[styles.progressFill, { width: `${stepProgress}%`, backgroundColor: colors.primary }]} />
      </View>
      <View style={[styles.timerPill, { backgroundColor: colors.surface, borderColor: colors.border }] }>
        <Text style={[styles.timerText, { color: colors.text }]}>{remainingSeconds}s</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  progressBar: {
    height: 16,
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#E5E5E5',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#58CC02',
    borderRadius: 8,
  },
  timerPill: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F1F1F',
  },
});
