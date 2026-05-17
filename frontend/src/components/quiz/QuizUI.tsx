import React, { useMemo } from 'react';
import {
  KeyboardAvoidingView,
  LayoutRectangle,
  Platform,
  ScrollView,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';

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
  onResetChosenTileIds: () => void;
  onSetSelectedLeftId: (id: string | null) => void;
  onSetSelectedRightId: (id: string | null) => void;
  onSetMatchingContainerHeight: (height: number) => void;
  onResetMatchState: () => void;
  onSetIsCorrect: (correct: boolean | null) => void;
  onContinue: () => void;
  leftItemLayouts: React.MutableRefObject<Record<string, LayoutRectangle>>;
  rightItemLayouts: React.MutableRefObject<Record<string, LayoutRectangle>>;
}

export default function QuizUI(props: QuizUIProps) {
  const { colors } = useTheme();

  return (
    <ScreenContainer>
      <View style={[styles.mainWrapper, { backgroundColor: colors.background }] }>
        {/* 1. Header cố định */}
        <QuizHeader
          stepProgress={props.stepProgress}
          activeType={props.activeType}
          isBoss={props.isBoss}
          questionIndex={props.questionIndex}
          totalQuestionCount={props.totalQuestionCount}
          remainingSeconds={props.remainingSeconds}
          onCancel={props.onCancel}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardContainer}
        >
          {/* 2. Vùng nội dung có thể cuộn */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Text style={[styles.typeLabel, { color: colors.primary }]}> 
              {props.activeType.replace(/_/g, ' ')}
            </Text>

            <QuizQuestionBody
              activeType={props.activeType}
              currentWord={props.currentWord}
              inputValue={props.inputValue}
              selectedOption={props.selectedOption}
              chosenTileIds={props.chosenTileIds}
              matchedIds={props.matchedIds}
              wrongPair={props.wrongPair}
              matchingContainerHeight={props.matchingContainerHeight}
              currentMatchWords={props.currentMatchWords}
              currentMatchRightItems={props.currentMatchRightItems}
              wrongPairs={props.wrongPairs}
              pairAssignments={props.pairAssignments}
              multipleChoiceOptions={props.multipleChoiceOptions}
              selectedScrambledChars={props.selectedScrambledChars}
              tiles={props.tiles}
              selectedLeftId={props.selectedLeftId}
              selectedRightId={props.selectedRightId}
              remainingSeconds={props.remainingSeconds}
              isMatchMode={props.isMatchMode}
              isTimeUp={props.isTimeUp}
              hasSubmitted={props.hasSubmitted}
              selectedAnswer={props.selectedAnswer}
              matchRound={props.matchRound}
              matchRoundCount={props.matchRoundCount}
              onHandleChoiceAnswer={props.onHandleChoiceAnswer}
              onHandlePairSelection={props.onHandlePairSelection}
              isMatchComplete={props.isMatchComplete}
              matchScore={props.matchScore}
              onChangeInput={props.onChangeInput}
              onSelectOption={props.onSelectOption}
              onPressTile={props.onPressTile}
              onResetChosenTileIds={props.onResetChosenTileIds}
              onSetSelectedLeftId={props.onSetSelectedLeftId}
              onSetSelectedRightId={props.onSetSelectedRightId}
              onSetMatchingContainerHeight={props.onSetMatchingContainerHeight}
              leftItemLayouts={props.leftItemLayouts}
              rightItemLayouts={props.rightItemLayouts}
            />
          </ScrollView>

          {/* 3. Footer chứa nút "Kiểm tra" cố định ở đáy */}
          <View style={[styles.footerWrapper, { backgroundColor: colors.card, borderTopColor: colors.border }] }>
            <QuizFooter
              stepMode={props.activeType}
              isCorrect={props.isCorrect}
              currentWord={props.currentWord}
              inputValue={props.inputValue}
              selectedOption={props.selectedOption}
              selectedScrambledChars={props.selectedScrambledChars}
              questionIndex={props.questionIndex}
              totalQuestionCount={props.totalQuestionCount}
              isMatchMode={props.isMatchMode}
              isMatchComplete={props.isMatchComplete}
              matchRound={props.matchRound}
              matchRoundCount={props.matchRoundCount}
              matchScore={props.matchScore}
              feedbackMessage={props.feedbackMessage}
              isSubmitting={props.isSubmitting}
              autoNextCountdown={props.autoNextCountdown}
              onCheckInputAnswer={props.onCheckInputAnswer}
              onVerifyScrambled={props.onVerifyScrambled}
              onHandleChoiceAnswer={props.onHandleChoiceAnswer}
              onSubmitMatchAnswer={props.onSubmitMatchAnswer}
              onContinue={props.onContinue}
              onResetMatchState={props.onResetMatchState}
              onSetIsCorrect={props.onSetIsCorrect}
              onChangeInput={props.onChangeInput}
              onSelectOption={props.onSelectOption}
              onResetChosenTileIds={props.onResetChosenTileIds}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24, // Giảm padding một chút để thoáng giao diện
    paddingTop: 20,
    paddingBottom: 20,
  },
  footerWrapper: {
    // Đảm bảo footer luôn ở dưới cùng và nổi bật
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  typeLabel: {
    color: '#58A68E', // Màu xanh Shark Nihongo
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1.2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  kanjiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 25,
  },
  kanjiText: {
    fontWeight: '900',
    color: '#1F1F1F',
    letterSpacing: -1,
    textAlign: 'center',
  },
});