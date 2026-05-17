import React, { useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../components/AppNavigator';
import QuizLoadingState from '../components/quiz/QuizLoadingState';
import QuizErrorState from '../components/quiz/QuizErrorState';
import QuizNoQuestionsState from '../components/quiz/QuizNoQuestionsState';
import QuizUI from '../components/quiz/QuizUI';
import ResultScreen from '../components/quiz/ResultScreen';
import type { QuizType } from '../components/quiz/types';
import { AuthContext } from '../context/AuthContext';
import useQuizScreen from './useQuizScreen';

type QuizScreenProps = StackScreenProps<RootStackParamList, 'Quiz'>;

export default function QuizScreen({ route, navigation }: QuizScreenProps) {
  const { user } = useContext(AuthContext);
  const materialId = route.params?.materialId ?? 1;
  const nodeId = route.params?.nodeId ?? '';
  const nodeType = route.params?.nodeType;
  const quizStepType = route.params?.quizStepType as QuizType | undefined;
  const batchIndex = route.params?.groupIndex ?? 0;
  const currentNodeIndex = route.params?.nodeIndex;
  const sessionId = route.params?.sessionId ? String(route.params.sessionId) : undefined;

  const {
    isLoading,
    loadError,
    questions,
    answers,
    isCorrect,
    showResult,
    selectedLeftId,
    selectedRightId,
    matchedIds,
    wrongPair,
    matchingContainerHeight,
    inputValue,
    selectedOption,
    chosenTileIds,
    leftItemLayouts,
    rightItemLayouts,
    setMatchingContainerHeight,
    setIsCorrect,
    setSelectedLeftId,
    setSelectedRightId,
    setInputValue,
    setSelectedOption,
    setChosenTileIds,
    handleCancel,
    handleNextQuestion,
    handleContinueQuestion,
    handleRetry,
    handleContinue,
    reloadQuiz,
    currentWord,
    activeType,
    stepProgress,
    questionIndex,
    totalCount,
    isBoss,
    correctCount,
    score,
    displayScore,
    resultCorrectCount,
    resultTotalCount,
    matchWords,
    currentMatchWords,
    currentMatchRightItems,
    remainingSeconds,
    isMatchMode,
    isTimeUp,
    hasSubmitted,
    selectedAnswer,
    matchRound,
    matchRoundCount,
    multipleChoiceOptions,
    selectedScrambledChars,
    tiles,
    wrongPairs,
    pairAssignments,
    handlePairSelection,
    submitMatchAnswer,
    isMatchComplete,
    matchScore,
    checkInputAnswer,
    verifyScrambled,
    handleChoiceAnswer,
    handleResetMatchState,
    feedbackMessage,
    isSubmitting,
    canContinue,
    autoNextCountdown,
  } = useQuizScreen({
    materialId,
    nodeId,
    nodeType,
    quizStepType,
    batchIndex,
    currentNodeIndex,
    sessionId,
    user,
    navigation,
  });

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!showResult) {
        e.preventDefault();
        Alert.alert(
          'Thoát bài quiz',
          'Tiến độ chưa được lưu. Bạn có chắc muốn thoát?',
          [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Thoát', onPress: () => navigation.dispatch(e.data.action) },
          ]
        );
      }
    });
    return unsubscribe;
  }, [navigation, showResult]);

  if (isLoading) {
    return <QuizLoadingState />;
  }

  if (loadError) {
    return <QuizErrorState error={loadError} onRetry={reloadQuiz} />;
  }

  if (questions.length === 0) {
    return <QuizNoQuestionsState onGoBack={handleCancel} />;
  }

  if (showResult) {
    return (
      <ResultScreen
        score={displayScore}
        displayScore={displayScore}
        correctCount={resultCorrectCount}
        totalCount={resultTotalCount}
        answers={answers}
        isBoss={isBoss}
        onRetry={handleRetry}
        onContinue={handleContinue}
        canContinue={canContinue}
      />
    );
  }

  return (
    <QuizUI
      activeType={activeType!}
      currentWord={currentWord!}
      stepProgress={stepProgress}
      questionIndex={questionIndex}
      totalQuestionCount={totalCount}
      isBoss={isBoss}
      isCorrect={isCorrect}
      inputValue={inputValue}
      selectedOption={selectedOption}
      chosenTileIds={chosenTileIds}
      matchedIds={matchedIds}
      wrongPairs={wrongPairs}
      wrongPair={wrongPair}
      matchingContainerHeight={matchingContainerHeight}
      currentMatchWords={currentMatchWords}
      currentMatchRightItems={currentMatchRightItems}
      remainingSeconds={remainingSeconds}
      isMatchMode={isMatchMode}
      matchRound={matchRound}
      matchRoundCount={matchRoundCount}
      autoNextCountdown={autoNextCountdown}
      multipleChoiceOptions={multipleChoiceOptions}
      selectedScrambledChars={selectedScrambledChars}
      tiles={tiles}
      selectedLeftId={selectedLeftId}
      selectedRightId={selectedRightId}
      isTimeUp={isTimeUp}
      hasSubmitted={hasSubmitted}
      selectedAnswer={selectedAnswer}
      feedbackMessage={feedbackMessage}
      pairAssignments={pairAssignments}
      isSubmitting={isSubmitting}
      onCancel={handleCancel}
      onCheckInputAnswer={checkInputAnswer}
      onVerifyScrambled={verifyScrambled}
      onHandleChoiceAnswer={handleChoiceAnswer}
      onHandlePairSelection={handlePairSelection}
      onSubmitMatchAnswer={submitMatchAnswer}
      isMatchComplete={isMatchComplete}
      matchScore={matchScore}
      onResetMatchState={handleResetMatchState}
      onChangeInput={setInputValue}
      onSelectOption={setSelectedOption}
      onPressTile={(tileId) => setChosenTileIds((prev: string[]) => [...prev, tileId])}
      onResetChosenTileIds={() => setChosenTileIds([])}
      onSetSelectedLeftId={setSelectedLeftId}
      onSetSelectedRightId={setSelectedRightId}
      onSetMatchingContainerHeight={setMatchingContainerHeight}
      onSetIsCorrect={setIsCorrect}
      onContinue={handleContinueQuestion}
      leftItemLayouts={leftItemLayouts}
      rightItemLayouts={rightItemLayouts}
    />
  );
}
