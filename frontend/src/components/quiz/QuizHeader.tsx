import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
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
  const radius = 18;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * radius;
  
  // MATCH modes will be 15s. Others might be 10 or 8. We can use total limits dynamically or just hardcode for visuals.
  const totalTime = activeType.startsWith('MATCH_') ? 15 : (activeType === 'MULTIPLE_CHOICE' ? 8 : 10);
  const progress = Math.max(0, remainingSeconds / totalTime);
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <View style={[styles.header, { backgroundColor: colors.card }] }>
      <TouchableOpacity onPress={onCancel}>
        <X size={28} color={colors.textSecondary} />
      </TouchableOpacity>
      <View style={[styles.progressBar, { backgroundColor: colors.border }] }>
        <View style={[styles.progressFill, { width: `${stepProgress}%`, backgroundColor: colors.primary }]} />
      </View>
      <View style={styles.timerCircleContainer}>
        <Svg width={44} height={44}>
          <Circle cx={22} cy={22} r={radius} stroke={colors.border} strokeWidth={strokeWidth} fill="transparent" />
          <Circle 
            cx={22} cy={22} r={radius} 
            stroke={remainingSeconds <= 5 ? '#EA2B2B' : colors.primary} 
            strokeWidth={strokeWidth} 
            fill="transparent" 
            strokeDasharray={circumference} 
            strokeDashoffset={strokeDashoffset} 
            strokeLinecap="round" 
            transform="rotate(-90 22 22)" 
          />
        </Svg>
        <Text style={[styles.timerText, { color: remainingSeconds <= 5 ? '#EA2B2B' : colors.text }]}>
          {remainingSeconds}
        </Text>
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
  timerCircleContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  timerText: {
    position: 'absolute',
    fontSize: 13,
    fontWeight: '800',
  },
});
