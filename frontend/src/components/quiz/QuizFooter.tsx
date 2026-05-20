import React, { useMemo, useEffect, useState } from 'react';
import {
  Alert,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { CheckCircle2, AlertCircle } from 'lucide-react-native';
import type { QuizType, QuizWord } from './types';

type QuizFooterProps = {
  stepMode: QuizType;
  isCorrect: boolean | null;
  currentWord: QuizWord;
  inputValue: string;
  selectedOption: string | null;
  selectedScrambledChars: string[];

  questionIndex: number;
  totalQuestionCount: number;

  isMatchMode: boolean;
  isMatchComplete: boolean;
  matchRound: number;
  matchRoundCount: number;
  matchScore: number;

  feedbackMessage?: string | null;
  isSubmitting: boolean;
  autoNextCountdown: number;

  onCheckInputAnswer: () => void;
  onVerifyScrambled: () => void;
  onHandleChoiceAnswer: () => void;
  onSubmitMatchAnswer: () => void;
  onContinue: () => void;
  onResetMatchState: () => void;

  onSetIsCorrect: (correct: boolean | null) => void;
  onChangeInput: (value: string) => void;
  onSelectOption: (option: string | null) => void;
  onResetChosenTileIds: () => void;
};

export default function QuizFooter({
  stepMode,
  isCorrect,

  currentWord,
  inputValue,
  selectedOption,
  selectedScrambledChars,

  questionIndex,
  totalQuestionCount,

  isMatchMode,
  isMatchComplete,
  matchRound,
  matchRoundCount,
  matchScore,

  feedbackMessage,
  isSubmitting,
  autoNextCountdown,

  onCheckInputAnswer,
  onVerifyScrambled,
  onHandleChoiceAnswer,
  onSubmitMatchAnswer,
  onContinue,
  onResetMatchState,

  onSetIsCorrect,
  onChangeInput,
  onSelectOption,
  onResetChosenTileIds,
}: QuizFooterProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const { colors } = useTheme();
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // SỬA LỖI CHÍ MẠNG: Ngăn chặn đếm ngược tự động chuyển trang khi ở câu hỏi cuối cùng
  useEffect(() => {
    console.log('QuizFooter useEffect, isCorrect:', isCorrect, 'isMatchMode:', isMatchMode, 'matchScore:', matchScore);
    
    // CRITICAL: Hàm helper để dọn sạch các timer cũ khi sớm trả về
    const clearExistingTimers = () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    
    if (isCorrect !== null) {
      // Nếu là đợt ghép nối (match mode) và chưa đạt 80%, không tự động tiếp tục
      if (isMatchMode && matchScore < 80) {
        clearExistingTimers();
        setCountdown(null);
        return;
      }

      // CRITICAL SHIELD: Nếu đây là câu hỏi cuối cùng, chặn đứng hoàn toàn bộ hẹn giờ tự động!
      // Người dùng phải tự tay bấm nút "Xem kết quả" để tránh văng stack điều hướng.
      if (questionIndex + 1 >= totalQuestionCount) {
        console.log('👉 Câu hỏi cuối cùng: Hủy kích hoạt setTimeout chuyển câu tự động.');
        clearExistingTimers();
        setCountdown(null);
        return;
      }

      setCountdown(3);
      console.log('Setting timeout for onContinue');
      timeoutRef.current = setTimeout(() => {
        console.log('Calling onContinue safely');
        onSetIsCorrect(null);
        onContinue();
      }, 3000);
      
      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          return prev !== null && prev > 0 ? prev - 1 : null;
        });
      }, 1000);

      return () => {
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }

    setCountdown(null);
    return undefined;
  }, [isCorrect, onContinue, onSetIsCorrect, isMatchMode, matchScore, questionIndex, totalQuestionCount]);

  const isCheckEnabled = useMemo(() => {
    if (isMatchMode) {
      return isMatchComplete;
    }

    switch (stepMode) {
      case 'WRITE_HIRA':
        return inputValue.trim().length > 0;

      case 'SCRAMBLED_HIRA':
        return selectedScrambledChars.join('').trim().length > 0;

      case 'MULTIPLE_CHOICE':
        return selectedOption !== null;

      default:
        return true;
    }
  }, [
    isMatchMode,
    isMatchComplete,
    stepMode,
    inputValue,
    selectedScrambledChars,
    selectedOption,
  ]);

  const [hasShownRetryAlert, setHasShownRetryAlert] = useState(false);
  const isCheckDisabled = !isCheckEnabled || isSubmitting;
  const isLastMatchRound = isMatchMode && matchRound + 1 >= matchRoundCount;
  const isFirstMatchRound = isMatchMode && matchRound === 0;
  const shouldShowRetryModal = isMatchMode && isFirstMatchRound && isCorrect === false && matchScore < 80;

  useEffect(() => {
    if (shouldShowRetryModal && !hasShownRetryAlert) {
      Alert.alert(
        'Cần làm lại',
        'Bạn cần đạt ít nhất 80% ở đợt 1 để tiếp tục. Vui lòng làm lại đợt này.',
        [{ text: 'OK', onPress: () => setHasShownRetryAlert(true) }]
      );
    }

    if (!shouldShowRetryModal) {
      setHasShownRetryAlert(false);
    }
  }, [shouldShowRetryModal, hasShownRetryAlert]);

  const handleCheckPress = () => {
    if (isCheckDisabled) {
      return;
    }

    if (isMatchMode) {
      onSubmitMatchAnswer();
      return;
    }

    switch (stepMode) {
      case 'WRITE_HIRA':
        onCheckInputAnswer();
        break;

      case 'SCRAMBLED_HIRA':
        onVerifyScrambled();
        break;

      case 'MULTIPLE_CHOICE':
        onHandleChoiceAnswer();
        break;

      default:
        break;
    }
  };

  const handleRetry = () => {
    onSetIsCorrect(null);

    if (isMatchMode) {
      onResetMatchState();
      return;
    }

    onChangeInput('');
    onSelectOption(null);
    onResetChosenTileIds();
  };

  const shouldShowCheckButton =
    isMatchMode ||
    (stepMode !== 'MATCH_MEANING' &&
      stepMode !== 'MATCH_HIRA');

  return (
    <View
      style={[
        styles.footer,
        { backgroundColor: colors.card, borderTopColor: colors.border },
        isCorrect === null
          ? {}
          : isCorrect
          ? { backgroundColor: colors.success }
          : { backgroundColor: colors.danger },
      ]}
    >
      {isCorrect === null ? (
        shouldShowCheckButton ? (
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isCheckDisabled}
            onPress={handleCheckPress}
            style={[
              styles.checkButton,
              isCheckDisabled
                ? { backgroundColor: colors.surface, borderBottomColor: colors.border }
                : { backgroundColor: colors.primary, borderBottomColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.checkButtonText,
                isCheckDisabled
                  ? { color: colors.textSecondary }
                  : { color: '#FFFFFF' },
              ]}
            >
              {isSubmitting ? 'Đang kiểm tra...' : 'Kiểm tra'}
            </Text>
          </TouchableOpacity>
        ) : null
      ) : isMatchMode && matchScore < 80 ? (
        <View>
          <View style={styles.resultContainer}>
            <AlertCircle size={30} color={colors.danger} />
            <Text style={[styles.resultText, { color: colors.danger }]}>
              Chưa đạt yêu cầu
            </Text>
          </View>

          <View style={styles.answerBox}>
            <Text style={[styles.answerLabel, { color: colors.textSecondary }]}>
              Điểm: {matchScore}%
            </Text>
            <Text style={[styles.answerValue, { color: colors.text }]}>
              Cần ≥ 80% để tiếp tục
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isSubmitting}
            onPress={handleRetry}
            style={[
              styles.continueButton,
              { backgroundColor: colors.primary, borderBottomColor: colors.primary },
            ]}
          >
            <Text style={styles.continueButtonText}>Làm lại đợt này</Text>
          </TouchableOpacity>

          {!isFirstMatchRound && (
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isSubmitting}
              onPress={() => {
                onSetIsCorrect(null);
                onContinue();
              }}
              style={[
                styles.continueButton,
                { backgroundColor: colors.danger, borderBottomColor: colors.danger },
                { marginTop: 12 },
              ]}
            >
              <Text style={styles.continueButtonText}>Xem kết quả</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View>
          <View style={styles.resultContainer}>
            {isCorrect ? (
              <CheckCircle2 size={30} color={colors.success} />
            ) : (
              <AlertCircle size={30} color={colors.danger} />
            )}

            <Text
              style={[
                styles.resultText,
                isCorrect ? { color: colors.success } : { color: colors.danger },
              ]}
            >
              {isMatchMode && isCorrect
                ? 'Đạt yêu cầu!'
                : isCorrect
                ? 'Chính xác!'
                : 'Sai rồi!'}
            </Text>
          </View>

          <View style={styles.answerBox}>
            <Text style={[styles.answerLabel, { color: isCorrect ? colors.success : colors.danger }]}> 
              {isMatchMode && isCorrect ? `Điểm: ${matchScore}%` : 'Đáp án đúng:'}
            </Text>

            <Text style={[styles.answerValue, { color: isCorrect ? colors.success : colors.danger }]}> 
              {isMatchMode && isCorrect
                ? `Bạn đã ghép đúng ≥ 80%`
                : ['WRITE_HIRA', 'SCRAMBLED_HIRA'].includes(stepMode)
                ? currentWord.hiragana
                : ['MATCH_HIRA', 'MATCH_MEANING'].includes(stepMode)
                ? 'Xem đáp án đúng trong bảng ghép phía trên.'
                : currentWord.meaning}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isSubmitting}
            onPress={() => {
              onSetIsCorrect(null);
              onContinue();
            }}
            style={[
              styles.continueButton,
              isCorrect
                ? { backgroundColor: colors.success, borderBottomColor: colors.success }
                : { backgroundColor: colors.danger, borderBottomColor: colors.danger },
            ]}
          >
            <Text style={styles.continueButtonText}>
              {isMatchMode && isCorrect
                ? isLastMatchRound
                  ? 'Câu tiếp theo'
                  : 'Đợt tiếp theo'
                : questionIndex + 1 >= totalQuestionCount
                ? 'Xem kết quả'
                : 'Tiếp tục'}
            </Text>
          </TouchableOpacity>
          
          {/* Chỉ hiển thị chữ countdown nếu không phải câu hỏi cuối */}
          {countdown !== null && questionIndex + 1 < totalQuestionCount && (
            <Text style={styles.autoNextText}>
              Câu tiếp theo ({countdown}s)
            </Text>
          )}
        </View>
      )}

      {!!feedbackMessage && isCorrect === null && (
        <Text style={styles.feedbackText}>
          {feedbackMessage}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
    borderTopWidth: 2,
    borderTopColor: '#E5E5E5',
    minHeight: 120,
  },
  checkButton: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
  },
  checkButtonText: {
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  resultText: {
    fontSize: 20,
    fontWeight: '900',
  },
  answerBox: {
    marginBottom: 16,
  },
  answerLabel: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.8,
  },
  answerValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  continueButton: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  autoNextText: {
    marginTop: 10,
    fontSize: 13,
    textAlign: 'center',
    color: '#8BA39D',
    fontWeight: '700',
  },
  feedbackText: {
    marginTop: 10,
    textAlign: 'center',
    color: '#EA2B2B',
    fontWeight: '700',
    fontSize: 14,
  },
});