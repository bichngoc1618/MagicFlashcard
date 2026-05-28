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
import { useGlobalUI } from '../../context/GlobalUIContext';
import { CheckCircle2, AlertCircle, RefreshCw, ArrowRight, BookOpen } from 'lucide-react-native';
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
  onShowMatchAnswers?: () => void;
  isBoss?: boolean;
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
  onShowMatchAnswers,
  isBoss = false,
}: QuizFooterProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const { showAlert } = useGlobalUI();

  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
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
      if (isMatchMode && matchScore < 80) {
        clearExistingTimers();
        setCountdown(null);
        return;
      }

      if (questionIndex + 1 >= totalQuestionCount) {
        clearExistingTimers();
        setCountdown(null);
        return;
      }

      setCountdown(3);
      timeoutRef.current = setTimeout(() => {
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
      case 'LISTENING':
      case 'TRUE_FALSE':
        return selectedOption !== null;

      default:
        return true;
    }
  }, [isMatchMode, isMatchComplete, stepMode, inputValue, selectedScrambledChars, selectedOption]);

  const [hasShownRetryAlert, setHasShownRetryAlert] = useState(false);
  const isCheckDisabled = !isCheckEnabled || isSubmitting;
  const isLastMatchRound = isMatchMode && matchRound + 1 >= matchRoundCount;
  const isFirstMatchRound = isMatchMode && matchRound === 0;
  const shouldShowRetryModal = isMatchMode && isFirstMatchRound && isCorrect === false && matchScore < 80;

  // Đã gỡ bỏ Alert "Cần làm lại" vì nó gây xung đột Modal (chết cảm ứng) khi người dùng hết tim.
  // Giao diện đã có thông báo "Chưa đạt yêu cầu!" màu đỏ và nút "Làm lại đợt này" rất rõ ràng.

  const handleCheckPress = () => {
    if (isCheckDisabled) return;

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
      case 'LISTENING':
      case 'TRUE_FALSE':
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

  const shouldShowCheckButton = isMatchMode || (stepMode !== 'MATCH_MEANING' && stepMode !== 'MATCH_HIRA' && stepMode !== 'MEMORY_CARD');

  // Khởi tạo các biến màu sắc tố đậm đồng bộ Home
  const themePrimaryColor = isDark ? '#2A5C4D' : '#3B7A66';
  const themeShadowColor = isDark ? '#193D32' : '#275245';
  
  const successColor = isDark ? '#065F46' : '#D1FAE5';
  const successTextColor = isDark ? '#34D399' : '#065F46';
  const successShadow = isDark ? '#044332' : '#A7F3D0';

  const dangerColor = isDark ? '#7F1D1D' : '#FEE2E2';
  const dangerTextColor = isDark ? '#F87171' : '#7F1D1D';
  const dangerShadow = isDark ? '#5A1414' : '#FCA5A5';

  return (
    <View style={[styles.footer, { backgroundColor: isBoss ? 'transparent' : colors.card, borderTopColor: isBoss ? 'transparent' : (isDark ? '#1E293B' : '#F1F5F9') }]}>
      
      {/* KHU VỰC CHƯA BẤM KIỂM TRA (TRẠNG THÁI MẶC ĐỊNH) */}
      {isCorrect === null ? (
        <View style={styles.actionContainer}>
          {!!feedbackMessage && (
            <Text style={[styles.feedbackText, { color: isDark ? '#F87171' : '#EF4444' }]}>
              {feedbackMessage}
            </Text>
          )}

          {shouldShowCheckButton && (
            <View style={styles.btn3DWrapper}>
              <View style={[styles.btn3DBase, { backgroundColor: isCheckDisabled ? (isDark ? '#1E293B' : '#E2E8F0') : themeShadowColor }]} />
              <TouchableOpacity
                activeOpacity={0.9}
                disabled={isCheckDisabled}
                onPress={handleCheckPress}
                style={[
                  styles.checkButton,
                  isCheckDisabled
                    ? { backgroundColor: isDark ? '#334155' : '#F1F5F9' }
                    : { backgroundColor: themePrimaryColor },
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
            </View>
          )}
        </View>
      ) : isMatchMode && matchScore < 80 ? (
        
        /* TRẠNG THÁI GHÉP CẶP CHƯA ĐẠT CẦN LÀM LẠI */
        <View style={styles.actionContainer}>
          <View style={[styles.alertStatusBox, { backgroundColor: dangerColor, borderColor: dangerShadow }]}>
            <View style={styles.resultHeaderRow}>
              <AlertCircle size={22} color={dangerTextColor} />
              <Text style={[styles.resultTitleText, { color: dangerTextColor }]}>Chưa đạt yêu cầu</Text>
            </View>
            <View style={styles.answerInfoBox}>
              <Text style={[styles.answerLabelText, { color: colors.textSecondary }]}>
                Bạn đã ghép đúng: <Text style={{ color: dangerTextColor, fontWeight: '900' }}>{matchScore}%</Text>
              </Text>
            </View>
          </View>

          <View style={styles.btn3DWrapper}>
            <View style={[styles.btn3DBase, { backgroundColor: themeShadowColor }]} />
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={isSubmitting}
              onPress={handleRetry}
              style={[styles.checkButton, { backgroundColor: themePrimaryColor }]}
            >
              <View style={styles.rowBtnContent}>
                <RefreshCw size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.checkButtonText}>Làm lại đợt này</Text>
              </View>
            </TouchableOpacity>
          </View>

          {onShowMatchAnswers && (
            <View style={[styles.btn3DWrapper, { marginTop: 12 }]}>
              <View style={[styles.btn3DBase, { backgroundColor: isDark ? '#334155' : '#94A3B8' }]} />
              <TouchableOpacity
                activeOpacity={0.9}
                disabled={isSubmitting}
                onPress={onShowMatchAnswers}
                style={[styles.checkButton, { backgroundColor: isDark ? '#475569' : '#CBD5E1' }]}
              >
                <View style={styles.rowBtnContent}>
                  <BookOpen size={16} color={isDark ? "#FFFFFF" : "#1E293B"} style={{ marginRight: 6 }} />
                  <Text style={[styles.checkButtonText, { color: isDark ? "#FFFFFF" : "#1E293B" }]}>Xem đáp án</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {!isFirstMatchRound && (
            <View style={[styles.btn3DWrapper, { marginTop: 12 }]}>
              <View style={[styles.btn3DBase, { backgroundColor: isDark ? '#5A1414' : '#DC2626' }]} />
              <TouchableOpacity
                activeOpacity={0.9}
                disabled={isSubmitting}
                onPress={() => {
                  onSetIsCorrect(null);
                  onContinue();
                }}
                style={[styles.checkButton, { backgroundColor: isDark ? '#7F1D1D' : '#EF4444' }]}
              >
                <Text style={styles.checkButtonText}>Xem kết quả</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        
        /* TRẠNG THÁI ĐÃ CÓ KẾT QUẢ KIỂM TRA (ĐÚNG HOẶC SAI) */
        <View style={styles.actionContainer}>
          <View style={[styles.alertStatusBox, { backgroundColor: isCorrect ? successColor : dangerColor, borderColor: isCorrect ? successShadow : dangerShadow }]}>
            <View style={styles.resultHeaderRow}>
              {isCorrect ? (
                <CheckCircle2 size={22} color={successTextColor} />
              ) : (
                <AlertCircle size={22} color={dangerTextColor} />
              )}
              <Text style={[styles.resultTitleText, { color: isCorrect ? successTextColor : dangerTextColor }]}>
                {isMatchMode && isCorrect ? 'Đạt yêu cầu!' : isCorrect ? 'Chính xác!' : 'Chưa chính xác'}
              </Text>
            </View>

            <View style={styles.answerInfoBox}>
              <Text style={[styles.answerLabelText, { color: isDark ? colors.text : colors.textSecondary }]}>
                {isMatchMode ? `Bạn đã ghép đúng: ${matchScore}%` : 'Đáp án chuẩn:'}
              </Text>
              {!isMatchMode && (
                <Text style={[styles.answerValueText, { color: isCorrect ? successTextColor : dangerTextColor }]}>
                  {['WRITE_HIRA', 'SCRAMBLED_HIRA'].includes(stepMode)
                    ? currentWord.hiragana
                    : ['MATCH_HIRA', 'MATCH_MEANING'].includes(stepMode)
                    ? 'Xem đáp án trong bảng ghép phía trên.'
                    : stepMode === 'MEMORY_CARD'
                    ? 'Xem đáp án trên các thẻ đã được lật.'
                    : currentWord.meaning}
                </Text>
              )}
            </View>
          </View>

          {/* NÚT TIẾP TỤC ĐỔ KHỐI CƠ HỌC */}
          <View style={styles.btn3DWrapper}>
            <View style={[styles.btn3DBase, { backgroundColor: isCorrect ? (isDark ? '#044332' : '#059669') : (isDark ? '#5A1414' : '#DC2626') }]} />
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={isSubmitting}
              onPress={() => {
                onSetIsCorrect(null);
                onContinue();
              }}
              style={[
                styles.checkButton,
                isCorrect 
                  ? { backgroundColor: isDark ? '#065F46' : '#10B981' } 
                  : { backgroundColor: isDark ? '#7F1D1D' : '#EF4444' }
              ]}
            >
              <View style={styles.rowBtnContent}>
                <Text style={styles.checkButtonText}>
                  {isMatchMode && isCorrect
                    ? isLastMatchRound
                      ? 'Câu tiếp theo'
                      : 'Đợt tiếp theo'
                    : (isBoss || questionIndex + 1 < totalQuestionCount)
                    ? 'Tiếp tục'
                    : 'Xem kết quả'}
                </Text>
                <ArrowRight size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </View>
            </TouchableOpacity>
          </View>
          
          {/* ĐẾM NGƯỢC TỰ ĐỘNG CHUYỂN TRANG TINH GỌN */}
          {countdown !== null && questionIndex + 1 < totalQuestionCount && (
            <Text style={[styles.autoNextText, { color: colors.textSecondary }]}>
              Tự động chuyển câu sau {countdown}s...
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderTopWidth: 1,
    minHeight: 110,
    justifyContent: 'center',
  },
  actionContainer: {
    width: '100%',
  },
  // Hộp trạng thái thông báo phẳng bo cong cao cấp thay thế cho việc đổi màu toàn bộ footer
  alertStatusBox: {
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  resultTitleText: {
    fontSize: 17,
    fontWeight: '900',
  },
  answerInfoBox: {
    paddingLeft: 30,
  },
  answerLabelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  answerValueText: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  rowBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Kiến trúc nút cơ học 3D đồng bộ dự án
  btn3DWrapper: {
    height: 52,
    position: 'relative',
    width: '100%',
  },
  btn3DBase: {
    position: 'absolute',
    top: 4,
    left: 0,
    right: 0,
    bottom: -4,
    borderRadius: 16,
  },
  checkButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButtonText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: '#FFFFFF',
  },
  autoNextText: {
    marginTop: 12,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '700',
    opacity: 0.6,
  },
  feedbackText: {
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 13,
  },
});