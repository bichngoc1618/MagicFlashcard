import React, { useEffect, useState } from 'react';
import { Alert, LayoutAnimation, Modal, View, Text, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../components/AppNavigator';
import QuizLoadingState from '../components/quiz/QuizLoadingState';
import QuizErrorState from '../components/quiz/QuizErrorState';
import QuizNoQuestionsState from '../components/quiz/QuizNoQuestionsState';
import QuizUI from '../components/quiz/QuizUI';
import ResultScreen from '../components/quiz/ResultScreen';
import type { QuizType } from '../components/quiz/types';
import { useAuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { completeQuizSession, syncStudy } from '../api/api';
import DuoHearts from '../components/quiz/DuoHearts';
import useQuizScreen from './useQuizScreen';

type QuizScreenProps = StackScreenProps<RootStackParamList, 'Quiz'>;

export default function QuizScreen({ route, navigation }: QuizScreenProps) {
  const authContext = useAuthContext();
  const { 
    user, 
    globalHearts, 
    deductHeartOnFailure, 
    refillHeartsWithXp, 
    refreshUserStats,
    checkAndTriggerDailyStreak 
  } = authContext;
  
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  // 🛡️ STATE TIM CỤC BỘ: Cách ly hoàn toàn khỏi AuthContext để chặn đứng lỗi tự động back app
  const [localHearts, setLocalHearts] = React.useState<number>(globalHearts);

  React.useEffect(() => {
    setLocalHearts(globalHearts);
  }, [globalHearts]);

  // Các trạng thái kiểm soát luồng bất đồng bộ cục bộ để tránh Race Condition
  const [sessionLogged, setSessionLogged] = React.useState(false);
  const [streakUpdated, setStreakUpdated] = React.useState(false);
  const [heartDeducted, setHeartDeducted] = React.useState(false);
  
  // Kiểm soát hiển thị Modal Hết Tim và Block điều hướng tự động
  const [heartDeductionPending, setHeartDeductionPending] = React.useState(false);
  const [isOutOfHearts, setIsOutOfHearts] = React.useState(false);
  const [navigationBlocked, setNavigationBlocked] = React.useState(false);

  // CRITICAL SHIELD STATE: Ép màn hình hiển thị Kết quả ở tầng giao diện cao nhất
  const [localShowResult, setLocalShowResult] = React.useState(false);

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
    // ✅ ĐÃ SỬA: Thay đổi dấu "=" lỗi chính tả thành dấu phẩy phân tách thuộc tính destructuring
    showWrongPairsReview,
    proceedAfterReview,
  } = useQuizScreen({
    materialId,
    nodeId,
    nodeType,
    quizStepType,
    batchIndex,
    currentNodeIndex,
    sessionId,
    user: user ?? undefined,
    navigation: {
      ...navigation,
      goBack: () => console.warn('🛑 [Core Logic] Chặn đứng hành vi tự động goBack ngầm từ useQuizScreen.'),
      pop: () => console.warn('🛑 [Core Logic] Chặn đứng hành vi tự động pop ngầm từ useQuizScreen.'),
      navigate: (screen: string) => console.warn(`🛑 [Core Logic] Chặn đứng hành vi tự động tự ý nhảy sang màn hình ${screen}`),
    } as any,
  });

  // ĐỒNG BỘ TRẠNG THÁI: Khi câu hỏi cuối cùng chạy xong kích hoạt tấm khiên cục bộ hiển thị Kết quả
  useEffect(() => {
    if (showResult === true) {
      setLocalShowResult(true);
    }
  }, [showResult]);

  // Bộ lắng nghe chặn thao tác vuốt cạnh/bấm nút Back vật lý khi đang làm bài
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (localShowResult) {
        return;
      }

      if (!navigationBlocked) {
        e.preventDefault();
        Alert.alert(
          'Thoát bài test',
          'Bài test có thể không được lưu, bạn có muốn thoát?',
          [
            { text: 'Hủy', style: 'cancel' },
            { 
              text: 'Thoát', 
              onPress: () => {
                setNavigationBlocked(true);
                navigation.dispatch(e.data.action);
              } 
            },
          ]
        );
      }
    });
    return unsubscribe;
  }, [navigation, localShowResult, navigationBlocked]);

  // Ghi nhận dữ liệu Session kết quả lên Server
  React.useEffect(() => {
    if (localShowResult && canContinue && !sessionLogged && user?.id) {
      setSessionLogged(true);
      (async () => {
        try {
          let shouldRefresh = false;
          if (sessionId) {
            await syncStudy({ userId: Number(user.id), materialId, sessionId, currentNodeIndex, nodeCompleted: true });
            shouldRefresh = true;
          }
          await completeQuizSession({
            userId: Number(user.id),
            materialId,
            sessionType: (nodeType as string) === 'PRACTICE' ? 'PRACTICE' : String(nodeId),
            batchIndex,
            totalQuestions: resultTotalCount,
            correctAnswers: resultCorrectCount,
          });
          if (!shouldRefresh) {
            await refreshUserStats();
          }
        } catch (err) {
          console.warn('Lỗi ghi log session dữ liệu bài học:', err);
        }
      })();
    }
  }, [localShowResult, canContinue, sessionLogged, user?.id, materialId, nodeType, nodeId, batchIndex, resultTotalCount, resultCorrectCount, refreshUserStats]);

  // Cập nhật tính toán Chuỗi Lửa Streak hàng ngày
  React.useEffect(() => {
    if (localShowResult && canContinue && !streakUpdated && user?.id) {
      const successRate = (resultCorrectCount / resultTotalCount) * 100;
      if (successRate >= 70) {
        setStreakUpdated(true);
        checkAndTriggerDailyStreak(user.id).catch(err => console.warn('Lỗi xử lý bùng cháy chuỗi lửa:', err));
      }
    }
  }, [localShowResult, canContinue, streakUpdated, user?.id, resultCorrectCount, resultTotalCount, checkAndTriggerDailyStreak]);

  // Logic thực hiện trừ tim cục bộ an toàn khi thất bại
  React.useEffect(() => {
    if (localShowResult && !canContinue && !heartDeducted && !heartDeductionPending) {
      setHeartDeductionPending(true);
      
      (async () => {
        try {
          const updatedHearts = await deductHeartOnFailure();
          setLocalHearts(updatedHearts);
          setHeartDeducted(true);
          
          if (updatedHearts <= 0) {
            setIsOutOfHearts(true);
          }
        } catch (err) {
          console.warn('Lỗi xử lý trừ mạng người học:', err);
          const localFallback = Math.max(localHearts - 1, 0);
          setLocalHearts(localFallback);
          setHeartDeducted(true);
          if (localFallback <= 0) {
            setIsOutOfHearts(true);
          }
        } finally {
          setHeartDeductionPending(false);
        }
      })();
    }
  }, [localShowResult, canContinue, heartDeducted, heartDeductionPending, deductHeartOnFailure, localHearts]);

  const executeRetryWrapper = () => {
    setSessionLogged(false);
    setStreakUpdated(false);
    setHeartDeducted(false);
    setHeartDeductionPending(false);
    setIsOutOfHearts(false);
    setLocalShowResult(false); 
    handleRetry(); 
  };

  const executeExitWrapper = () => {
    setNavigationBlocked(true);
    try {
      const params: any = { materialId };
      if (typeof currentNodeIndex !== 'undefined') params.completedNodeIndex = currentNodeIndex;
      if (sessionId) params.sessionId = Number(sessionId);
      (async () => {
        try {
          if (canContinue && !streakUpdated && user?.id) {
            await checkAndTriggerDailyStreak(user.id);
            setStreakUpdated(true);
            await refreshUserStats();
          }
        } catch (err) {
          console.warn('Failed to update streak before exit:', err);
        } finally {
          navigation.navigate('StudyJourney' as any, params);
        }
      })();
    } catch (err) {
      console.warn('Navigation error in executeExitWrapper:', err);
    }
  };

  const safeHandleContinueQuestion = React.useCallback(() => {
    if (showResult || localShowResult) return;
    handleContinueQuestion();
  }, [showResult, localShowResult, handleContinueQuestion]);

  if (isLoading) return <QuizLoadingState />;
  if (loadError) return <QuizErrorState error={loadError} onRetry={reloadQuiz} />;
  if (questions.length === 0) return <QuizNoQuestionsState onGoBack={handleCancel} />;

  const themePrimaryColor = isDark ? '#2A5C4D' : '#3B7A66';
  const themeShadowColor = isDark ? '#193D32' : '#275245';

  if (localShowResult) {
    return (
      <>
        <ResultScreen
          score={displayScore}
          displayScore={displayScore}
          correctCount={resultCorrectCount}
          totalCount={resultTotalCount}
          answers={answers}
          isBoss={isBoss}
          onRetry={executeRetryWrapper} 
          onContinue={executeExitWrapper} 
          canContinue={canContinue}
          showStreakCelebration={currentNodeIndex === 0}
        />

        <OutOfHeartsInterceptor
          isVisible={isOutOfHearts}
          globalHearts={localHearts}
          totalXp={authContext?.totalXp ?? 0}
          topUpCount={(authContext as any)?.topUpCount ?? 0}
          colors={colors}
          isDark={isDark}
          themePrimaryColor={themePrimaryColor}
          themeShadowColor={themeShadowColor}
          onRefill={async () => {
            const newHearts = await refillHeartsWithXp(1, 200);
            if (typeof newHearts === 'number') {
              setLocalHearts(newHearts);
            }
            setIsOutOfHearts(false);
          }}
          onReturnToRoadmap={executeExitWrapper}
          onStayOnResult={() => setIsOutOfHearts(false)}
          onClose={() => setIsOutOfHearts(false)}
        />
      </>
    );
  }

  return (
    <>
      <View style={styles.heartOverlay}> 
        <DuoHearts hearts={localHearts} />
      </View>
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
        
        onCancel={showResult || localShowResult ? () => console.warn('🛑 Chặn hủy tự phát.') : handleCancel}
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
        onPressTile={(tileId) => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setChosenTileIds((prev: string[]) => [...prev, tileId]);
        }}
        onRemoveTile={(tileId) => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setChosenTileIds((prev: string[]) => {
            const index = prev.findIndex(id => id === tileId);
            if (index > -1) {
              const next = [...prev];
              next.splice(index, 1);
              return next;
            }
            return prev;
          });
        }}
        onResetChosenTileIds={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setChosenTileIds([]);
        }}
        onSetSelectedLeftId={setSelectedLeftId}
        onSetSelectedRightId={setSelectedRightId}
        onSetMatchingContainerHeight={setMatchingContainerHeight}
        onSetIsCorrect={setIsCorrect}
        onContinue={safeHandleContinueQuestion}
        showWrongPairsReview={showWrongPairsReview}
        onProceedAfterReview={proceedAfterReview}
        leftItemLayouts={leftItemLayouts}
        rightItemLayouts={rightItemLayouts}
      />
    </>
  );
}

// ===== COMPONENTS PHỤ TRỢ POPUP =====
type OutOfHeartsInterceptorProps = {
  isVisible: boolean;
  globalHearts: number;
  totalXp: number;
  topUpCount: number;
  colors: any;
  isDark: boolean;
  themePrimaryColor: string;
  themeShadowColor: string;
  onRefill: () => Promise<void>;
  onReturnToRoadmap: () => void;
  onStayOnResult: () => void;
  onClose: () => void;
};

const OutOfHeartsInterceptor: React.FC<OutOfHeartsInterceptorProps> = ({
  isVisible,
  globalHearts,
  totalXp,
  topUpCount,
  colors,
  isDark,
  themePrimaryColor,
  themeShadowColor,
  onRefill,
  onReturnToRoadmap,
  onStayOnResult,
  onClose,
}) => {
  const [isRefilling, setIsRefilling] = React.useState(false);
  
  const handleRefillPress = async () => {
    setIsRefilling(true);
    try {
      await onRefill();
      onClose();
    } catch (err) {
      console.warn('Lỗi nạp tim:', err);
    } finally {
      setIsRefilling(false);
    }
  };

  const canRefill = totalXp >= 200 && topUpCount < 3;

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.backdrop}>
        <View style={[modalStyles.card, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#E2EBE8' }]}>
          <Image source={require('../../assets/sharkCry.png')} style={modalStyles.image} />
          <Text style={modalStyles.title}>Bạn đã hết mạng!</Text>
          <Text style={[modalStyles.subtitle, { color: colors.textSecondary }]}>
            Đổi 200XP để nạp 1 tim hoặc quay về hành trình để nhận lại tim phục hồi hoàn toàn vào ngày mai.
          </Text>
          
          <View style={modalStyles.btn3DWrapper}>
            <View style={[modalStyles.btn3DBase, { backgroundColor: (!canRefill || isRefilling) ? (isDark ? '#334155' : '#94A3B8') : '#1899D6' }]} />
            <TouchableOpacity
              activeOpacity={0.9}
              style={[modalStyles.btnPrimary, (!canRefill || isRefilling) && modalStyles.btnDisabled]}
              onPress={handleRefillPress}
              disabled={!canRefill || isRefilling}
            >
              <Text style={modalStyles.btnTextPrimary}>
                {isRefilling ? 'Đang nạp năng lượng...' : 'Đổi 200XP lấy 1 Tim'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[modalStyles.btn3DWrapper, { marginTop: 14 }]}>
            <View style={[modalStyles.btn3DBase, { backgroundColor: themeShadowColor }]} />
            <TouchableOpacity 
              activeOpacity={0.9}
              style={[modalStyles.btnSecondary, { backgroundColor: themePrimaryColor }]} 
              onPress={() => {
                  onReturnToRoadmap();
                  onClose();
              }}
            >
              <Text style={modalStyles.btnTextPrimary}>Quay về hành trình</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            activeOpacity={0.7}
            style={[modalStyles.btnTertiary, { backgroundColor: isDark ? '#1E293B' : '#F3F4F6' }]} 
            onPress={() => {
                onStayOnResult();
                onClose();
            }}
          >
            <Text style={[modalStyles.btnTextTertiary, { color: colors.text }]}>Ở lại xem phân tích lỗi sai</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '85%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16 },
      android: { elevation: 6 },
    }),
  },
  image: { width: 120, height: 120, marginBottom: 16, resizeMode: 'contain' },
  title: { fontSize: 21, fontWeight: '900', color: '#FF4B4B', marginBottom: 10, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, marginBottom: 24, textAlign: 'center', lineHeight: 22, fontWeight: '500', paddingHorizontal: 4 },
  btn3DWrapper: {
    height: 48,
    position: 'relative',
    width: '100%',
  },
  btn3DBase: {
    position: 'absolute',
    top: 3, left: 0, right: 0, bottom: -3,
    borderRadius: 14,
  },
  btnPrimary: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#1CB0F6',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  btnSecondary: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTertiary: {
    borderRadius: 14,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  btnTextPrimary: { color: '#ffffff', fontWeight: '900', fontSize: 14, letterSpacing: 0.3 },
  btnTextTertiary: { fontWeight: '800', fontSize: 14 },
});

const styles = StyleSheet.create({
  heartOverlay: { position: 'absolute', right: 16, top: Platform.OS === 'ios' ? 56 : 16, zIndex: 99 },
});