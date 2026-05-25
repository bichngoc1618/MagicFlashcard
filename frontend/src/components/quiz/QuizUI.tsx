import React, { useMemo } from 'react';
import {
  KeyboardAvoidingView,
  LayoutRectangle,
  Platform,
  ScrollView,
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { X, BookOpen } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withRepeat } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import ScreenContainer from '../ScreenContainer';
import type { QuizType, QuizWord } from './types';

import QuizHeader from './QuizHeader';
import QuizQuestionBody from './QuizQuestionBody';
import QuizFooter from './QuizFooter';

export interface QuizUIProps {
  activeType: QuizType;
  currentWord: QuizWord;
  stepProgress: number;
  questionIndex: number;
  totalQuestionCount: number;
  isBoss: boolean;
  isCorrect: boolean | null;
  inputValue: string;
  selectedOption: string | null;
  chosenTileIds: string[];
  matchedIds: Set<string>;
  wrongPairs: Set<string>;
  pairAssignments: Record<string, string>;
  wrongPair: boolean;
  matchingContainerHeight: number;
  currentMatchWords: QuizWord[];
  currentMatchRightItems: {
    id: string;
    label: string;
  }[];
  multipleChoiceOptions: string[];
  selectedScrambledChars: string[];
  tiles: {
    id: string;
    char: string;
  }[];
  selectedLeftId: string | null;
  selectedRightId: string | null;
  remainingSeconds: number;
  hearts: number;
  isMatchMode: boolean;
  isTimeUp: boolean;
  hasSubmitted: boolean;
  autoNextCountdown: number;
  selectedAnswer: string | null;
  matchRound: number;
  matchRoundCount: number;
  onCancel: () => void;
  onCheckInputAnswer: () => void;
  onVerifyScrambled: () => void;
  onHandleChoiceAnswer: () => void;
  onSubmitMatchAnswer: () => void;
  onHandlePairSelection: (leftId: string, rightId: string) => void;
  isMatchComplete: boolean;
  matchScore: number;
  feedbackMessage?: string | null;
  isSubmitting: boolean;
  onChangeInput: (value: string) => void;
  onSelectOption: (option: string | null) => void;
  onPressTile: (tileId: string) => void;
  onRemoveTile?: (tileId: string) => void;
  onResetChosenTileIds: () => void;
  onSetSelectedLeftId: (id: string | null) => void;
  onSetSelectedRightId: (id: string | null) => void;
  onSetMatchingContainerHeight: (height: number) => void;
  onResetMatchState: () => void;
  onSetIsCorrect: (correct: boolean | null) => void;
  onContinue: () => void;
  showWrongPairsReview: boolean;
  onProceedAfterReview: () => void;
  onShowMatchAnswers: () => void;
  leftItemLayouts: React.MutableRefObject<Record<string, LayoutRectangle>>;
  rightItemLayouts: React.MutableRefObject<Record<string, LayoutRectangle>>;
}

export default function QuizUI({
  activeType,
  currentWord,
  stepProgress,
  questionIndex,
  totalQuestionCount,
  isBoss,
  isCorrect,
  inputValue,
  selectedOption,
  chosenTileIds,
  matchedIds,
  wrongPairs,
  pairAssignments,
  wrongPair,
  matchingContainerHeight,
  currentMatchWords,
  currentMatchRightItems,
  multipleChoiceOptions,
  selectedScrambledChars,
  tiles,
  selectedLeftId,
  selectedRightId,
  remainingSeconds,
  hearts,
  isMatchMode,
  isTimeUp,
  hasSubmitted,
  autoNextCountdown,
  selectedAnswer,
  matchRound,
  matchRoundCount,
  onCancel,
  onCheckInputAnswer,
  onVerifyScrambled,
  onHandleChoiceAnswer,
  onSubmitMatchAnswer,
  onHandlePairSelection,
  isMatchComplete,
  matchScore,
  feedbackMessage,
  isSubmitting,
  onChangeInput,
  onSelectOption,
  onPressTile,
  onRemoveTile,
  onResetChosenTileIds,
  onSetSelectedLeftId,
  onSetSelectedRightId,
  onSetMatchingContainerHeight,
  onResetMatchState,
  onSetIsCorrect,
  onContinue,
  showWrongPairsReview,
  onProceedAfterReview,
  onShowMatchAnswers,
  leftItemLayouts,
  rightItemLayouts,
}: QuizUIProps) {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  // Hệ màu sắc tố trơn đậm đà đồng bộ hệ thống Home
  const themePrimaryColor = isDark ? '#2A5C4D' : '#3B7A66';
  const themeShadowColor = isDark ? '#193D32' : '#275245';

  const shakeTranslateX = useSharedValue(0);

  React.useEffect(() => {
    if ((isCorrect === false && hasSubmitted) || wrongPairs.size > 0 || wrongPair) {
      shakeTranslateX.value = withSequence(
        withTiming(10, { duration: 50 }),
        withRepeat(withTiming(-10, { duration: 100 }), 3, true),
        withTiming(0, { duration: 50 })
      );
      if (Platform.OS !== 'web' && Haptics && typeof Haptics.notificationAsync === 'function') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
    }
  }, [isCorrect, hasSubmitted, wrongPairs, wrongPair]);

  const shakeStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shakeTranslateX.value }]
    };
  });

  return (
    <ScreenContainer>
      <View style={[styles.mainWrapper, { backgroundColor: colors.background }]}>
        {/* 1. Header cố định */}
        <QuizHeader
          stepProgress={stepProgress}
          activeType={activeType}
          isBoss={isBoss}
          questionIndex={questionIndex}
          totalQuestionCount={totalQuestionCount}
          remainingSeconds={remainingSeconds}
          hearts={hearts}
          onCancel={onCancel}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardContainer}
        >
          {/* 2. Vùng nội dung có thể cuộn */}
          <Animated.ScrollView
            style={[styles.scrollView, shakeStyle]}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Nhãn loại câu hỏi tinh chỉnh đậm đà hơn */}
            <View style={[styles.typeLabelBadge, { backgroundColor: isDark ? 'rgba(59, 122, 102, 0.15)' : '#D1FAE5' }]}>
              <Text style={[styles.typeLabel, { color: themePrimaryColor }]}>
                {activeType.replace(/_/g, ' ')}
              </Text>
            </View>

            <QuizQuestionBody
              activeType={activeType}
              currentWord={currentWord}
              inputValue={inputValue}
              selectedOption={selectedOption}
              chosenTileIds={chosenTileIds}
              matchedIds={matchedIds}
              wrongPair={wrongPair}
              matchingContainerHeight={matchingContainerHeight}
              currentMatchWords={currentMatchWords}
              currentMatchRightItems={currentMatchRightItems}
              wrongPairs={wrongPairs}
              pairAssignments={pairAssignments}
              multipleChoiceOptions={multipleChoiceOptions}
              selectedScrambledChars={selectedScrambledChars}
              tiles={tiles}
              selectedLeftId={selectedLeftId}
              selectedRightId={selectedRightId}
              remainingSeconds={remainingSeconds}
              isMatchMode={isMatchMode}
              isTimeUp={isTimeUp}
              hasSubmitted={hasSubmitted}
              selectedAnswer={selectedAnswer}
              matchRound={matchRound}
              matchRoundCount={matchRoundCount}
              onHandleChoiceAnswer={onHandleChoiceAnswer}
              onHandlePairSelection={onHandlePairSelection}
              isMatchComplete={isMatchComplete}
              matchScore={matchScore}
              onChangeInput={onChangeInput}
              onSelectOption={onSelectOption}
              onPressTile={onPressTile}
              onRemoveTile={onRemoveTile}
              onResetChosenTileIds={onResetChosenTileIds}
              onSetSelectedLeftId={onSetSelectedLeftId}
              onSetSelectedRightId={onSetSelectedRightId}
              onSetMatchingContainerHeight={onSetMatchingContainerHeight}
              leftItemLayouts={leftItemLayouts}
              rightItemLayouts={rightItemLayouts}
            />
          </Animated.ScrollView>

          {/* 3. Footer chứa nút "Kiểm tra" cố định ở đáy */}
          <View style={[styles.footerWrapper, { backgroundColor: colors.card, borderTopColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <QuizFooter
              stepMode={activeType}
              isCorrect={isCorrect}
              currentWord={currentWord}
              inputValue={inputValue}
              selectedOption={selectedOption}
              selectedScrambledChars={selectedScrambledChars}
              questionIndex={questionIndex}
              totalQuestionCount={totalQuestionCount}
              isMatchMode={isMatchMode}
              isMatchComplete={isMatchComplete}
              matchRound={matchRound}
              matchRoundCount={matchRoundCount}
              matchScore={matchScore}
              feedbackMessage={feedbackMessage}
              isSubmitting={isSubmitting}
              autoNextCountdown={autoNextCountdown}
              onCheckInputAnswer={onCheckInputAnswer}
              onVerifyScrambled={onVerifyScrambled}
              onHandleChoiceAnswer={onHandleChoiceAnswer}
              onSubmitMatchAnswer={onSubmitMatchAnswer}
              onContinue={onContinue}
              onResetMatchState={onResetMatchState}
              onSetIsCorrect={onSetIsCorrect}
              onShowMatchAnswers={onShowMatchAnswers}
              onChangeInput={onChangeInput}
              onSelectOption={onSelectOption}
              onResetChosenTileIds={onResetChosenTileIds}
            />
          </View>
        </KeyboardAvoidingView>

        {/* MODAL XEM LẠI CÂU SAI HOẠT HÌNH PHẲNG CHUYÊN NGHIỆP */}
        <Modal visible={showWrongPairsReview} transparent animationType="slide" onRequestClose={onProceedAfterReview}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <BookOpen size={18} color={themePrimaryColor} style={{ marginRight: 6 }} />
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Xem lại câu sai</Text>
                </View>
                <TouchableOpacity onPress={onProceedAfterReview} style={styles.modalCloseBtn}>
                  <X size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.modalScroll} 
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {currentMatchWords
                  .filter(w => Array.from(wrongPairs).some(pair => pair.startsWith(w.id + '-')))
                  .map((word, idx) => (
                    <View key={word.id} style={[styles.listItem, { borderColor: isDark ? '#1E293B' : '#F1F5F9', backgroundColor: colors.background }]}>
                      <Text style={[styles.listIndex, { color: themePrimaryColor }]}>{idx + 1}.</Text>
                      <View style={styles.listTextContainer}>
                        <Text style={[styles.listText, { color: colors.text }]}>{word.kanji}</Text>
                        <Text style={[styles.listSubText, { color: colors.textSecondary }]}>{word.hiragana} — {word.meaning}</Text>
                      </View>
                    </View>
                  ))
                }
              </ScrollView>

              {/* Nút bấm Đã hiểu đổ khối 3D đồng bộ chân thực */}
              <View style={styles.modalBtn3DWrapper}>
                <View style={[styles.modalBtn3DBase, { backgroundColor: themeShadowColor }]} />
                <TouchableOpacity 
                  activeOpacity={0.9}
                  style={[styles.modalBtn, { backgroundColor: themePrimaryColor }]}
                  onPress={onProceedAfterReview}
                >
                  <Text style={styles.modalBtnText}>ĐÃ HIỂU</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16, 
    paddingTop: 16,
    paddingBottom: 24,
  },
  footerWrapper: {
    borderTopWidth: 1,
  },
  typeLabelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  typeLabel: {
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.08, shadowRadius: 16 },
      android: { elevation: 10 },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    width: '100%', 
    maxHeight: Dimensions.get('window').height * 0.45,
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  listIndex: {
    fontSize: 15,
    fontWeight: '900',
    width: 24,
  },
  listTextContainer: {
    flex: 1,
    marginLeft: 4,
  },
  listText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2
  },
  listSubText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  modalBtn3DWrapper: {
    width: '100%',
    height: 52,
    position: 'relative',
    marginTop: 8,
  },
  modalBtn3DBase: {
    position: 'absolute',
    top: 4, left: 0, right: 0, bottom: -4,
    borderRadius: 16,
  },
  modalBtn: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#FFF', 
    fontWeight: '900', 
    fontSize: 15,
    letterSpacing: 0.5,
  }
});