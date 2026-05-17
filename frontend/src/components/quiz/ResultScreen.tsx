import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, StyleSheet, Alert } from 'react-native';
import { X, CheckCircle2, AlertCircle, Trophy, Eye } from 'lucide-react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import ScreenContainer from '../ScreenContainer';
import { useTheme } from '../../context/ThemeContext';
import type { AnswerRecord } from './types';

const { width } = Dimensions.get('window');

interface ResultScreenProps {
  score: number;
  displayScore?: number;
  correctCount: number;
  totalCount: number;
  answers: AnswerRecord[];
  isBoss: boolean;
  onRetry: () => void;
  onContinue: () => void;
  canContinue: boolean;
}

export default function ResultScreen({
  score,
  displayScore,
  correctCount,
  totalCount,
  answers,
  isBoss,
  onRetry,
  onContinue,
  canContinue,
}: ResultScreenProps) {
  const [showingFailed, setShowingFailed] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { colors } = useTheme();
  const failedAnswers = answers.filter((ans) => !ans.isCorrect);
  const currentFailed = failedAnswers[reviewIndex];
  const displayedScore = displayScore ?? score;
  const displayedCorrectCount = correctCount;
  const displayedTotalCount = totalCount;

  const handleShowFailed = () => {
    if (failedAnswers.length === 0) {
      Alert.alert('Thông báo', 'Bạn đã trả lời đúng tất cả câu hỏi!');
      return;
    }
    setReviewIndex(0);
    setShowAnswer(false);
    setShowingFailed(true);
  };

  const handleNextFailed = () => {
    setReviewIndex((prev) => Math.min(prev + 1, failedAnswers.length - 1));
    setShowAnswer(false);
  };

  const handlePrevFailed = () => {
    setReviewIndex((prev) => Math.max(prev - 1, 0));
    setShowAnswer(false);
  };

  const passedThreshold = canContinue;

  useEffect(() => {
    if (!passedThreshold) {
      setShowConfetti(false);
      return;
    }

    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, [passedThreshold]);

  if (showingFailed && failedAnswers.length > 0) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, backgroundColor: colors.background, paddingHorizontal: 24, paddingTop: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <TouchableOpacity onPress={() => setShowingFailed(false)} style={{ padding: 8 }}>
              <X size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text, flex: 1, marginLeft: 10 }}>
              Ôn tập các từ sai
            </Text>
          </View>

          <View style={{ borderRadius: 24, padding: 20, marginBottom: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 }}>
              Flashcard {reviewIndex + 1}/{failedAnswers.length}
            </Text>
            <View style={{ borderRadius: 24, padding: 20, marginBottom: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 32, fontWeight: '900', color: colors.text, marginBottom: 15 }}>
                {currentFailed.word.kanji}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 }}>
                Hiragana
              </Text>
              <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 15 }}>
                {showAnswer ? currentFailed.word.hiragana : '••••••••'}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 }}>
                Nghĩa
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
                {showAnswer ? currentFailed.word.meaning : 'Nhấn nút Hiện đáp án'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <TouchableOpacity
                onPress={handlePrevFailed}
                disabled={reviewIndex === 0}
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  borderRadius: 20,
                  alignItems: 'center',
                  backgroundColor: reviewIndex === 0 ? '#E5E5E5' : '#F7F7F7',
                }}
              >
                <Text style={{ color: reviewIndex === 0 ? '#4B4B4B' : colors.text, fontWeight: '900' }}>Trước</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowAnswer((prev) => !prev)}
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  borderRadius: 20,
                  alignItems: 'center',
                  backgroundColor: colors.primary,
                }}
              >
                <Text style={{ color: '#FFF', fontWeight: '900' }}>{showAnswer ? 'Ẩn đáp án' : 'Hiện đáp án'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleNextFailed}
                disabled={reviewIndex === failedAnswers.length - 1}
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  borderRadius: 20,
                  alignItems: 'center',
                  backgroundColor: reviewIndex === failedAnswers.length - 1 ? '#E5E5E5' : '#F7F7F7',
                }}
              >
                <Text style={{ color: reviewIndex === failedAnswers.length - 1 ? '#4B4B4B' : colors.text, fontWeight: '900' }}>Sau</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setShowingFailed(false)}
            style={{
              paddingVertical: 18,
              borderRadius: 20,
              alignItems: 'center',
              backgroundColor: colors.primary,
              borderBottomWidth: 4,
              borderBottomColor: colors.primary,
            }}
          >
            <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 18, textTransform: 'uppercase' }}>Quay lại kết quả</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, backgroundColor: colors.background }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {showConfetti && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
              <ConfettiCannon
                count={isBoss ? 320 : 120}
                origin={{ x: width / 2, y: -20 }}
                fadeOut
                fallSpeed={2500}
              />
            </View>
          )}
          {passedThreshold ? (
            <>
              <View style={{ padding: 32, borderRadius: 999, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6, marginBottom: 20, backgroundColor: colors.warning }}>
                <Trophy size={80} color="#FFF" fill="#FFF" />
              </View>
              <Text style={{ fontSize: 32, fontWeight: '900', textAlign: 'center', color: colors.success, marginBottom: 8 }}>
                {isBoss ? 'Chinh phục thành công!' : 'Vượt chặng thành công!'}
              </Text>
            </>
          ) : (
            <>
              <View style={{ padding: 32, borderRadius: 999, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6, marginBottom: 20, backgroundColor: colors.danger }}>
                <AlertCircle size={80} color="#EA2B2B" fill="#EA2B2B" />
              </View>
              <Text style={{ fontSize: 32, fontWeight: '900', textAlign: 'center', color: colors.danger, marginBottom: 8 }}>
                Cần cố gắng hơn
              </Text>
            </>
          )}
          <Text style={{ fontSize: 20, fontWeight: '900', marginTop: 16, marginBottom: 8, color: colors.success }}>
            {displayedScore.toFixed(1)}%
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 32, color: colors.text }}>
            Bạn trả lời đúng {displayedCorrectCount}/{displayedTotalCount} câu
          </Text>

          <View style={{ width: '100%', marginBottom: 20 }}>
            <TouchableOpacity
              onPress={handleShowFailed}
              style={{
                backgroundColor: colors.surface,
                paddingVertical: 16,
                borderRadius: 20,
                alignItems: 'center',
                marginBottom: 12,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Eye size={20} color={colors.primary} />
              <Text style={{ fontWeight: '900', fontSize: 16, color: colors.text }}>
                Xem lại câu sai ({failedAnswers.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onRetry}
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 18,
                borderRadius: 20,
                alignItems: 'center',
                marginBottom: 12,
                borderBottomWidth: 4,
                borderBottomColor: colors.primary,
              }}
            >
              <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 18, textTransform: 'uppercase' }}>Làm lại bài này</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onContinue}
              disabled={!canContinue}
              style={{
                backgroundColor: canContinue ? colors.card : colors.surface,
                paddingVertical: 18,
                borderRadius: 20,
                alignItems: 'center',
                borderBottomWidth: canContinue ? 4 : 0,
                borderBottomColor: canContinue ? colors.primary : colors.surface,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '900', textTransform: 'uppercase', color: canContinue ? colors.card : colors.textSecondary }}>
                {isBoss ? 'Quay lại Map' : 'Bài tiếp theo'}
              </Text>
            </TouchableOpacity>
            {!canContinue && (
              <Text style={{ fontSize: 14, marginTop: 12, textAlign: 'center', color: colors.textSecondary }}>
                Cần {'>='} 80% để tiếp tục.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  confettiWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
});
