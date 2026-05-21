import React, { useEffect, useState } from 'react';
import { Alert, LayoutAnimation, Modal, View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
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
import useQuizScreen from './useQuizScreen';

import { completeQuizSession, syncStudy } from '../api/api';
import DuoHearts from '../components/quiz/DuoHearts';

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

  // CRITICAL SHIELD STATE: Ép màn hình hiển thị Kết quả ở tầng giao diện cao nhất,
  // cắt đứt hoàn toàn luồng unmount tự hủy của QuizUI hay QuizFooter ở câu cuối cùng.
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
    showResult, // Trạng thái gốc từ custom hook ngầm
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
    // CRITICAL SHIELD PROXY: Khóa chặt 100% chân rết điều hướng tự động của tầng Core Logic.
    navigation: {
      ...navigation,
      goBack: () => console.warn('🛑 [Core Logic] Chặn đứng hành vi tự động goBack ngầm từ useQuizScreen.'),
      pop: () => console.warn('🛑 [Core Logic] Chặn đứng hành vi tự động pop ngầm từ useQuizScreen.'),
      navigate: (screen: string) => console.warn(`🛑 [Core Logic] Chặn đứng hành vi tự động tự ý nhảy sang màn hình ${screen}`),
    } as any,
  });

  // ĐỒNG BỘ TRẠNG THÁI: Khi câu hỏi cuối cùng chạy xong và hook chuyển showResult sang true,
  // lập tức kích hoạt Tấm Khiên Cục Bộ để khóa chặt màn hình Result.
  useEffect(() => {
    if (showResult === true) {
      setLocalShowResult(true);
    }
  }, [showResult]);

  // Bộ lắng nghe chặn thao tác vuốt cạnh/bấm nút Back vật lý của điện thoại khi đang làm bài
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Nếu bài test đã xong và đang hiện bảng kết quả, mở khóa để người dùng tương tác tự do qua các nút bấm xịn
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

  // Ghi nhận dữ liệu Session kết quả lên SQLite/Server
  React.useEffect(() => {
    if (localShowResult && canContinue && !sessionLogged && user?.id) {
      setSessionLogged(true);
      (async () => {
        try {
          if (sessionId) {
            await syncStudy({ userId: Number(user.id), materialId, sessionId, currentNodeIndex, nodeCompleted: true });
            await refreshUserStats();
          }
          await completeQuizSession({
            userId: Number(user.id),
            materialId,
            sessionType: (nodeType as string) === 'PRACTICE' ? 'PRACTICE' : String(nodeId),
            batchIndex,
            totalQuestions: resultTotalCount,
            correctAnswers: resultCorrectCount,
          });
        } catch (err) {
          console.warn('Lỗi ghi log session dữ liệu bài học:', err);
        }
      })();
    }
  }, [localShowResult, canContinue, sessionLogged, user?.id, materialId, nodeType, nodeId, batchIndex, resultTotalCount, resultCorrectCount, refreshUserStats]);

  // Cập nhật tính toán và kích hoạt Chuỗi Lửa Streak hàng ngày
  React.useEffect(() => {
    if (localShowResult && canContinue && !streakUpdated && user?.id) {
      const successRate = (resultCorrectCount / resultTotalCount) * 100;
      if (successRate >= 70) {
        setStreakUpdated(true);
        checkAndTriggerDailyStreak(user.id).catch(err => console.warn('Lỗi xử lý bùng cháy chuỗi lửa:', err));
      }
    }
  }, [localShowResult, canContinue, streakUpdated, user?.id, resultCorrectCount, resultTotalCount, checkAndTriggerDailyStreak]);

  // Logic thực hiện trừ tim cục bộ an toàn - Cách ly hoàn toàn khỏi vòng đời Render lại của luồng chính
  React.useEffect(() => {
    if (localShowResult && !canContinue && !heartDeducted && !heartDeductionPending) {
      console.warn('⚡ [Assessment Failure] BẮT ĐẦU TRỪ TIM CỤC BỘ AN TOÀN');
      
      // Bước 1: Khóa cờ xử lý đồng bộ ngay lập tức trước khi luồng bất đồng bộ chạy
      setHeartDeductionPending(true);
      
      (async () => {
        try {
          console.log('⚡ [QuizScreen] Gọi deductHeartOnFailure() lên server...');
          
          // API ở server vẫn trừ mạng và lưu sâu vào database thực tế
          const updatedHearts = await deductHeartOnFailure();
          
          console.log('⚡ [QuizScreen] Gọi xong deductHeartOnFailure(). Số tim mới nhận được:', updatedHearts);
          
          // Bước 2: Cập nhật biến tim mới vào local State (Không thay đổi globalHearts toàn cục)
          setLocalHearts(updatedHearts);
          setHeartDeducted(true);
          
          if (updatedHearts <= 0) {
            setIsOutOfHearts(true);
          }
        } catch (err) {
          console.warn('Lỗi xử lý trừ mạng người học (bắt lỗi để không crash):', err);
          // Fallback giả lập trừ cục bộ khi mất mạng để app giữ nguyên màn hình kiểm tra lỗi sai
          const localFallback = Math.max(localHearts - 1, 0);
          setLocalHearts(localFallback);
          setHeartDeducted(true);
          if (localFallback <= 0) {
            setIsOutOfHearts(true);
          }
        } finally {
          setHeartDeductionPending(false);
          console.warn('⚡ [Assessment Failure] KẾT THÚC TIẾN TRÌNH TRỪ TIM AN TOÀN');
        }
      })();
    }
  }, [localShowResult, canContinue, heartDeducted, heartDeductionPending, deductHeartOnFailure, localHearts]);

  // Hàm Wrapper xử lý dọn sạch trạng thái cũ để chuẩn bị làm lại bài (Reset State)
  const executeRetryWrapper = () => {
    setSessionLogged(false);
    setStreakUpdated(false);
    setHeartDeducted(false);
    setHeartDeductionPending(false);
    setIsOutOfHearts(false);
    setLocalShowResult(false); // Đóng màn hình Kết quả cục bộ trước để giao diện lật lại mượt mà
    handleRetry(); // Gọi hàm reset gốc từ hook
  };

  // Hàm điều hướng thoát chủ động khi người dùng nhấn nút
  const executeExitWrapper = () => {
  setNavigationBlocked(true);
  // Navigate back to StudyJourney (map) with completed node info
  console.log('EXIT WRAPPER RUNNING');
  try {
    const params: any = { materialId };
    if (typeof currentNodeIndex !== 'undefined') params.completedNodeIndex = currentNodeIndex;
    if (sessionId) params.sessionId = Number(sessionId);
    navigation.navigate('StudyJourney' as any, params);
  } catch (err) {
    console.warn('Navigation error in executeExitWrapper:', err);
  }
};

  // CRITICAL SHIELD: Wrapper an toàn để chặn auto-continue khi quiz đã hoàn thành
  const safeHandleContinueQuestion = React.useCallback(() => {
    if (showResult || localShowResult) {
      console.warn('🛑 [Safety Shield] Chặn đứt lệnh tiếp tục tự động khi quiz đã hoàn thành');
      return;
    }
    handleContinueQuestion();
  }, [showResult, localShowResult, handleContinueQuestion]);

  if (isLoading) return <QuizLoadingState />;
  if (loadError) return <QuizErrorState error={loadError} onRetry={reloadQuiz} />;
  if (questions.length === 0) return <QuizNoQuestionsState onGoBack={handleCancel} />;

  // LUỒNG HIỂN THỊ MÀN HÌNH KẾT QUẢ ĐÃ ĐƯỢC BẢO VỆ
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
          onRetry={executeRetryWrapper} // Ép làm sạch bộ đếm cũ qua hàm Wrapper
          onContinue={executeExitWrapper} // Thoát chủ động qua nút bấm vật lý
          canContinue={canContinue}
          showStreakCelebration={currentNodeIndex === 0}
        />

        <OutOfHeartsInterceptor
          isVisible={isOutOfHearts}
          globalHearts={localHearts}
          totalXp={authContext?.totalXp ?? 0}
          topUpCount={(authContext as any)?.topUpCount ?? 0}
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
      <View style={modalStyles.heartOverlay}> 
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
        
        onCancel={showResult || localShowResult ? () => console.warn('🛑 Chặn đứng lệnh hủy tự phát từ giao diện QuizFooter.') : handleCancel}
        
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

// ===== COMPONENTS PHỤ TRỢ GIAO DIỆN CHẶN TIM VÀ CSS STYLE BOX =====
type OutOfHeartsInterceptorProps = {
  isVisible: boolean;
  globalHearts: number;
  totalXp: number;
  topUpCount: number;
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
    <Modal visible={isVisible} transparent animationType="fade">
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.card}>
          <Image source={require('../../assets/sharkCry.png')} style={modalStyles.image} />
          <Text style={modalStyles.title}>Bạn đã hết mạng!</Text>
          <Text style={modalStyles.subtitle}>
            Hãy nạp đầy tim bằng năng lượng XP hoặc quay về hành trình để nhận lại tim phục hồi hoàn toàn vào ngày mai.
          </Text>
          
          <TouchableOpacity
            style={[
              modalStyles.btnPrimary,
              (!canRefill || isRefilling) && modalStyles.btnDisabled
            ]}
            onPress={handleRefillPress}
            disabled={!canRefill || isRefilling}
          >
            <Text style={modalStyles.btnText}>
              {isRefilling ? 'Đang nạp năng lượng...' : 'Đổi 200XP để nạp 1 tim'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={modalStyles.btnSecondary} 
            onPress={() => {
                onReturnToRoadmap();
                onClose();
            }}
          >
            <Text style={modalStyles.btnText}>Quay về hành trình</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={modalStyles.btnTertiary} 
            onPress={() => {
                onStayOnResult();
                onClose();
            }}
          >
            <Text style={[modalStyles.btnText, { color: '#111' }]}>Ở lại xem phân tích lỗi sai</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(9, 44, 36, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2EBE8',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  image: { width: 130, height: 130, marginBottom: 16, resizeMode: 'contain' },
  title: { fontSize: 22, fontWeight: '900', color: '#FF4B4B', marginBottom: 12, letterSpacing: 0.5 },
  subtitle: { fontSize: 14, color: '#6D8B82', marginBottom: 24, textAlign: 'center', lineHeight: 22, paddingHorizontal: 6 },
  btnPrimary: {
    backgroundColor: '#1CB0F6',
    borderRadius: 16,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: '#1899D6',
  },
  btnDisabled: {
    opacity: 0.5,
    backgroundColor: '#CBD5E1',
    borderBottomWidth: 0,
  },
  btnSecondary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginTop: 14,
    borderWidth: 2,
    borderColor: '#E2EBE8',
    borderBottomWidth: 4,
    borderBottomColor: '#E2EBE8',
  },
  btnTertiary: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
  },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.8 },
  heartOverlay: { position: 'absolute', right: 16, top: 120, zIndex: 99 },
});
