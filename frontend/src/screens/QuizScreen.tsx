import React, { useEffect, useState } from 'react';
import { Alert, LayoutAnimation, Modal, View, Text, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
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
import { useGlobalUI } from '../context/GlobalUIContext';
import { completeQuizSession, syncStudy, completeSrsReview, saveNodeStars } from '../api/api';
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
  const { showAlert } = useGlobalUI();

  // 🛡️ STATE TIM CỤC BỘ: Cách ly hoàn toàn khỏi AuthContext để chặn đứng lỗi tự động back app
  const [localHearts, setLocalHearts] = React.useState<number>(globalHearts);

  React.useEffect(() => {
    setLocalHearts(globalHearts);
  }, [globalHearts]);

  // Bộ giữ tham chiếu ổn định để tránh tạo lại callback gây vòng lặp render
  const deductHeartRef = React.useRef(deductHeartOnFailure);
  React.useEffect(() => {
    deductHeartRef.current = deductHeartOnFailure;
  }, [deductHeartOnFailure]);

  const stableDeductHeartOnFailure = React.useCallback(async (): Promise<number> => {
    try {
      const updated = await deductHeartRef.current();
      setLocalHearts(updated);
      if (updated <= 0) {
        setIsOutOfHearts(true);
      }
      return updated;
    } catch (err) {
      console.warn('Lỗi trừ tim trong matching:', err);
      let fallback = 0;
      setLocalHearts((prev) => {
        fallback = Math.max(prev - 1, 0);
        if (fallback <= 0) {
          setIsOutOfHearts(true);
        }
        return fallback;
      });
      return fallback;
    }
  }, []);

  // Các trạng thái kiểm soát luồng bất đồng bộ cục bộ để tránh Race Condition
  const [sessionLogged, setSessionLogged] = React.useState(false);
  const [streakUpdated, setStreakUpdated] = React.useState(false);
  const [heartDeducted, setHeartDeducted] = React.useState(false);
  
  // Kiểm soát hiển thị Modal Hết Tim và Block điều hướng tự động
  const [heartDeductionPending, setHeartDeductionPending] = React.useState(false);
  const [isOutOfHearts, setIsOutOfHearts] = React.useState(false);
  const navigationBlockedRef = React.useRef(false);

  // CRITICAL SHIELD STATE: Ép màn hình hiển thị Kết quả ở tầng giao diện cao nhất
  const [localShowResult, setLocalShowResult] = React.useState(false);
  const executeExitWrapperRef = React.useRef<() => void>(() => {});

  const materialId = route.params?.materialId ?? 1;
  const nodeId = route.params?.nodeId ?? '';
  const nodeType = route.params?.nodeType;
  const quizStepType = route.params?.quizStepType as QuizType | undefined;
  const batchIndex = route.params?.groupIndex ?? 0;
  const currentNodeIndex = route.params?.nodeIndex;
  const sessionId = route.params?.sessionId ? String(route.params.sessionId) : undefined;
  const isAlreadyCompleted = route.params?.isAlreadyCompleted ?? false;
  const dueCardIds = route.params?.dueCardIds;

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
    promptType,
    correctAnswer,
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
    showMatchAnswers,
    isReviewComplete,
  } = useQuizScreen({
    materialId,
    nodeId,
    nodeType,
    quizStepType,
    batchIndex,
    currentNodeIndex,
    dueCardIds,
    sessionId,
    user: user ?? undefined,
    navigation: {
      ...navigation,
      goBack: () => console.warn('🛑 [Core Logic] Chặn đứng hành vi tự động goBack ngầm từ useQuizScreen.'),
      pop: () => console.warn('🛑 [Core Logic] Chặn đứng hành vi tự động pop ngầm từ useQuizScreen.'),
      navigate: (screen: string) => console.warn(`🛑 [Core Logic] Chặn đứng hành vi tự động tự ý nhảy sang màn hình ${screen}`),
    } as any,
    deductHeartOnFailure: stableDeductHeartOnFailure,
  });

  // ĐỒNG BỘ TRẠNG THÁI: Khi câu hỏi cuối cùng chạy xong kích hoạt tấm khiên cục bộ hiển thị Kết quả
  useEffect(() => {
    if (showResult === true) {
      setLocalShowResult(true);
    }
  }, [showResult]);

  useEffect(() => {
    if (isReviewComplete) {
      showAlert(
        'Hoàn thành',
        `Bạn đã ôn tập xong các thẻ bài!`,
        [
          {
            text: 'OK',
            onPress: async () => {
              if (user?.id) {
                // Ensure study progress is logged even if Result screen isn't shown
                await syncStudy({ userId: Number(user.id), materialId, sessionId: sessionId ?? '', currentNodeIndex, nodeCompleted: true }).catch(console.warn);
                
                if (nodeType === 'SRS_REVIEW' || nodeType === 'REVIEW') {
                  const results = answers.map(a => ({
                    cardId: Number(a.wordId),
                    score: a.isCorrect ? 100 : 0
                  }));
                  await completeSrsReview({
                    userId: Number(user.id),
                    materialId,
                    results,
                  }).catch(console.warn);
                }
              }
              navigation.navigate('MainTabs' as any, { screen: 'Home' });
            }
          }
        ],
        'success'
      );
    }
  }, [isReviewComplete, navigation, user?.id, materialId, sessionId, currentNodeIndex, nodeType, answers, showAlert]);

  // BOSS BATTLE EARLY EXIT AND ENERGY MECHANIC
  const bossWrongCount = answers.filter(a => !a.isCorrect).length;
  const tugOfWarX = totalCount > 0 ? (50 / totalCount) : 0;
  const energyPosition = isBoss ? Math.max(0, Math.min(100, 50 + (correctCount * tugOfWarX) - (bossWrongCount * 3 * tugOfWarX))) : 50;

  const executeBossExitWrapperRef = React.useRef<((result: 'win'|'lose') => void) | null>(null);
  const bossExitExecutedRef = React.useRef(false);

  const executeBossExit = React.useCallback(async (bossResult: 'win' | 'lose') => {
    if (bossExitExecutedRef.current) return;
    bossExitExecutedRef.current = true;
    navigationBlockedRef.current = true;
    
    try {
      Speech.stop();
    } catch (e) {
      // Ignore speech stop error
    }

    try {
      if (bossResult === 'win') {
        if (!sessionLogged && user?.id) {
          setSessionLogged(true);
          try {
            if (sessionId) {
              await syncStudy({ userId: Number(user.id), materialId, sessionId, currentNodeIndex, nodeCompleted: true });
            }
            await completeQuizSession({
              userId: Number(user.id),
              materialId,
              sessionType: String(nodeId),
              batchIndex,
              totalQuestions: resultTotalCount,
              correctAnswers: resultCorrectCount,
              isAlreadyCompleted,
            });

            if (nodeId) {
              await saveNodeStars({ userId: Number(user.id), materialId: Number(materialId), nodeId: String(nodeId), stars: 3 });
            }
            if (!isAlreadyCompleted) {
              await authContext.updateXpAndStreakInDB(100);
            }
            if (!streakUpdated) {
              await checkAndTriggerDailyStreak(Number(user.id));
              setStreakUpdated(true);
            }
            await refreshUserStats();
          } catch (e) {
             console.warn('Lỗi ghi log Boss session:', e);
          }
        }
      } else {
        // Lose logic: deduct heart
        if (!heartDeducted && !heartDeductionPending) {
          setHeartDeductionPending(true);
          try {
             await deductHeartOnFailure();
             setHeartDeducted(true);
          } catch (err) {
             console.warn('Lỗi trừ tim khi thua Boss:', err);
          } finally {
             setHeartDeductionPending(false);
          }
        }
      }
    } finally {
      const params: any = { materialId, bossResult };
      if (typeof currentNodeIndex !== 'undefined') params.completedNodeIndex = currentNodeIndex;
      if (sessionId) params.sessionId = Number(sessionId);
      navigation.navigate('MainTabs' as any, { screen: 'StudyJourney', params });
    }
  }, [user?.id, sessionLogged, sessionId, materialId, currentNodeIndex, nodeId, batchIndex, resultTotalCount, resultCorrectCount, isAlreadyCompleted, authContext, streakUpdated, checkAndTriggerDailyStreak, refreshUserStats, heartDeducted, heartDeductionPending, deductHeartOnFailure, navigation]);

  React.useEffect(() => {
    executeBossExitWrapperRef.current = executeBossExit;
  }, [executeBossExit]);

  const finalCanContinue = isBoss ? (energyPosition >= 100) : canContinue;

  useEffect(() => {
    if (!isBoss) return;
    
    let timer: NodeJS.Timeout;
    if (energyPosition >= 100) {
      timer = setTimeout(() => {
        if (executeBossExitWrapperRef.current) executeBossExitWrapperRef.current('win');
      }, 800);
    } else if (energyPosition <= 0 || localHearts <= 0) {
      timer = setTimeout(() => {
        if (executeBossExitWrapperRef.current) executeBossExitWrapperRef.current('lose');
      }, 800);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isBoss, energyPosition, localHearts]);


  // Bộ lắng nghe chặn thao tác vuốt cạnh/bấm nút Back vật lý khi đang làm bài
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (navigationBlockedRef.current) {
        return;
      }

      e.preventDefault();

      if (localShowResult) {
        navigationBlockedRef.current = true;
        executeExitWrapperRef.current();
      } else {
        showAlert(
          'Thoát bài test',
          'Bài test có thể không được lưu, bạn có muốn thoát?',
          [
            { text: 'Hủy', style: 'cancel' },
            { 
              text: 'Thoát', 
              style: 'destructive',
              onPress: () => {
                navigationBlockedRef.current = true;
                // Trừ 1 tim khi thoát bài quiz giữa chừng
                if (authContext?.deductHeartOnFailure) {
                  authContext.deductHeartOnFailure();
                }
                navigation.dispatch(e.data.action);
              }
            },
          ],
          'warning'
        );
      }
    });
    return unsubscribe;
  }, [navigation, localShowResult]);

  // Ghi nhận dữ liệu Session kết quả lên Server
  React.useEffect(() => {
    if (localShowResult && finalCanContinue && !sessionLogged && user?.id) {
      setSessionLogged(true);
      (async () => {
        try {
          let shouldRefresh = false;
          if (sessionId) {
            await syncStudy({ userId: Number(user.id), materialId, sessionId, currentNodeIndex, nodeCompleted: true });
            shouldRefresh = true;
          }

          if (nodeType === 'SRS_REVIEW') {
            // Đối với node ôn tập, map answers thành results mảng điểm để đưa vào SM-2
            const results = answers.map(a => ({
              cardId: Number(a.wordId),
              score: a.isCorrect ? 100 : 0
            }));
            await completeSrsReview({
              userId: Number(user.id),
              materialId,
              results,
            });
          } else {
            await completeQuizSession({
              userId: Number(user.id),
              materialId,
              sessionType: (nodeType as string) === 'PRACTICE' ? 'PRACTICE' : String(nodeId),
              batchIndex,
              totalQuestions: resultTotalCount,
              correctAnswers: resultCorrectCount,
              isAlreadyCompleted,
            });
          }

          // CALCULATE AND SAVE STARS
          let stars = 0;
          const scorePercent = resultTotalCount > 0 ? (resultCorrectCount / resultTotalCount) * 100 : 0;
          if (scorePercent >= 100) stars = 3;
          else if (scorePercent >= 80) stars = 2;
          else if (scorePercent >= 70) stars = 1;

          if (stars > 0 && nodeId) {
            try {
              await saveNodeStars({
                userId: Number(user.id),
                materialId: Number(materialId),
                nodeId: String(nodeId),
                stars
              });
            } catch (e) {
              console.warn('Lỗi lưu số sao:', e);
            }
          }

          // NẾU LÀ NODE CUỐI CÙNG (FINAL_BOSS) VÀ CHƯA TỪNG HOÀN THÀNH: CỘNG 100XP
          if ((nodeType === 'FINAL_BOSS' || nodeId === 'final-boss') && !isAlreadyCompleted) {
            try {
              // Gọi hàm cộng 100 XP lên DB
              await authContext.updateXpAndStreakInDB(100);
            } catch (xpErr) {
              console.warn('Lỗi cộng 100 XP cho node cuối:', xpErr);
            }
          }

          if (!shouldRefresh) {
            await refreshUserStats();
          }
        } catch (err) {
          console.warn('Lỗi ghi log session dữ liệu bài học:', err);
        }
      })();
    }
  }, [localShowResult, canContinue, sessionLogged, user?.id, materialId, nodeType, nodeId, batchIndex, resultTotalCount, resultCorrectCount, refreshUserStats, authContext]);

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
    const isMatchingMode = quizStepType === 'MATCH_HIRA' || quizStepType === 'MATCH_MEANING';
    if (isMatchingMode) {
      return;
    }
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
  }, [localShowResult, finalCanContinue, heartDeducted, heartDeductionPending, deductHeartOnFailure, localHearts]);

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
    navigationBlockedRef.current = true;
    try {
      const params: any = { materialId };
      if (typeof currentNodeIndex !== 'undefined') params.completedNodeIndex = currentNodeIndex;
      if (sessionId) params.sessionId = Number(sessionId);
      (async () => {
        try {
          if (finalCanContinue && !streakUpdated && user?.id) {
            await checkAndTriggerDailyStreak(user.id);
            setStreakUpdated(true);
            await refreshUserStats();
          }
        } catch (err) {
          console.warn('Failed to update streak before exit:', err);
        } finally {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('MainTabs' as any, {
              screen: 'StudyJourney',
              params: params,
            });
          }
        }
      })();
    } catch (err) {
      console.warn('Navigation error in executeExitWrapper:', err);
    }
  };

  React.useEffect(() => {
    executeExitWrapperRef.current = executeExitWrapper;
  });

  const safeHandleContinueQuestion = React.useCallback(() => {
    if (showResult || localShowResult) return;
    if (isBoss) {
      if (energyPosition >= 100) {
        if (executeBossExitWrapperRef.current) executeBossExitWrapperRef.current('win');
        return;
      } else if (energyPosition <= 0 || localHearts <= 0) {
        if (executeBossExitWrapperRef.current) executeBossExitWrapperRef.current('lose');
        return;
      }
    }
    handleContinueQuestion();
  }, [showResult, localShowResult, handleContinueQuestion, isBoss, energyPosition, localHearts]);

  const safeHandleContinue = React.useCallback(() => {
    handleContinue();
  }, [handleContinue]);

  if (isLoading) return <QuizLoadingState />;
  if (loadError) return <QuizErrorState error={loadError} onRetry={reloadQuiz} />;
  if (questions.length === 0) return <QuizNoQuestionsState onGoBack={executeExitWrapper} />;

  const themePrimaryColor = isDark ? '#2A5C4D' : '#3B7A66';
  const themeShadowColor = isDark ? '#193D32' : '#275245';

  if (localShowResult) {
    return (
      <>
        <ResultScreen
          score={score}
          displayScore={score}
          correctCount={resultCorrectCount}
          totalCount={resultTotalCount}
          answers={answers}
          isBoss={isBoss}
          onRetry={executeRetryWrapper} 
          onContinue={executeExitWrapper}
          onExit={executeExitWrapper}
          canContinue={finalCanContinue}
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
      <QuizUI
        hearts={localHearts}
        maxHearts={5}
        activeType={activeType!}
        currentWord={currentWord!}
        stepProgress={stepProgress}
        questionIndex={questionIndex}
        totalQuestionCount={totalCount}
        isBoss={isBoss}
        energyPosition={energyPosition}
        isCorrect={isCorrect}
        correctCount={correctCount}
        wrongCount={answers.filter(a => !a.isCorrect).length}
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
        
        onCancel={showResult || localShowResult ? () => console.warn('🛑 Chặn hủy tự phát.') : () => {
          // Kích hoạt beforeRemove để hiện popup xác nhận thoát
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Home');
          }
        }}
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
          if (currentWord && chosenTileIds.length >= currentWord.hiragana.length) return;
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
        onShowMatchAnswers={showMatchAnswers}
        leftItemLayouts={leftItemLayouts}
        rightItemLayouts={rightItemLayouts}
        promptType={promptType}
        correctAnswer={correctAnswer}
        onGameComplete={(_correct: boolean) => {
          // MEMORY_CARD tự hoàn thành khi ghép hết cặp → chuyển sang câu tiếp theo
          handleNextQuestion();
        }}
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
          if (authContext) {
            const newHearts = await refillHeartsWithXp(1, 200);
            if (typeof newHearts === 'number') {
              setLocalHearts(newHearts);
            }
          }
          setIsOutOfHearts(false);
        }}
        onReturnToRoadmap={executeExitWrapper}
        onStayOnResult={() => {
          setIsOutOfHearts(false);
          if (isMatchMode) {
            setTimeout(() => {
              showMatchAnswers();
              setLocalShowResult(false);
            }, 5000);
          }
        }}
        onClose={() => setIsOutOfHearts(false)}
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

  // Guard: don't render any Modal tree when not visible
  if (!isVisible) return null;
  
  const handleRefillPress = async () => {
    setIsRefilling(true);
    try {
      await onRefill();
      // onRefill sets isOutOfHearts=false in parent, which unmounts this component.
      // No further state updates needed here.
    } catch (err) {
      console.warn('Lỗi nạp tim:', err);
      // Only reset isRefilling if refill failed (component still mounted)
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
});