import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
} from 'react-native';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Trophy,
  AlertCircle,
  RefreshCw,
  BookOpen,
  ArrowRight,
} from 'lucide-react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import type { AnswerRecord } from './types';

const { width } = Dimensions.get('window');

interface ResultUIProps {
  score: number;
  correctCount: number;
  totalCount: number;
  answers: AnswerRecord[];
  isBoss: boolean;
  onRetry: () => void;
  onContinue: () => void;
  canContinue: boolean;
}

const COLORS = {
  primary: '#0E513D',
  secondary: '#58A68E',
  background: '#F8FBF9',
  white: '#FFFFFF',
  border: '#E9F0EE',
  text: '#102722',
  textSecondary: '#8BA39D',
  success: '#58CC02',
  danger: '#FF4B4B',
};

export default function ResultUI({
  score,
  correctCount,
  totalCount,
  answers = [],
  isBoss,
  onRetry,
  onContinue,
  canContinue,
}: ResultUIProps) {
  const [reviewMode, setReviewMode] = useState<'failed' | 'all' | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);

  const failedAnswers = answers.filter((ans) => !ans.isCorrect);
  const reviewList = reviewMode === 'failed' ? failedAnswers : answers;

  const passed = score >= 50;

  // ================= REVIEW MODE =================
  if (reviewMode) {
    const currentWord = reviewList[currentIndex]?.word;

    return (
      <View style={styles.reviewScreen}>
        {/* Header */}
        <View style={styles.reviewHeader}>
          <TouchableOpacity
            onPress={() => {
              setReviewMode(null);
              setCurrentIndex(0);
            }}
            style={styles.closeButton}
          >
            <X size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <View style={styles.progressWrapper}>
            <View style={styles.progressBg}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width:
                      reviewList.length > 0
                        ? `${((currentIndex + 1) / reviewList.length) * 100}%`
                        : '0%',
                  },
                ]}
              />
            </View>
          </View>

          <Text style={styles.progressText}>
            {currentIndex + 1}/{reviewList.length}
          </Text>
        </View>

        {/* Flashcard */}
        <View style={styles.flashcardContainer}>
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={() => setShowMeaning(!showMeaning)}
            style={[
              styles.flashcard,
              showMeaning && styles.flashcardBack,
            ]}
          >
            <Text
              style={[
                styles.flashcardLabel,
                showMeaning && styles.flashcardLabelBack,
              ]}
            >
              {showMeaning ? 'Nghĩa & Hiragana' : 'Kanji'}
            </Text>

            <Text
              style={[
                styles.flashcardMainText,
                showMeaning && styles.flashcardMeaningText,
              ]}
            >
              {showMeaning
                ? currentWord?.meaning ?? ''
                : currentWord?.kanji ?? ''}
            </Text>

            {showMeaning && (
              <Text style={styles.hiraganaText}>
                {currentWord?.hiragana ?? ''}
              </Text>
            )}

            <Text style={styles.tapHint}>
              Chạm để lật thẻ
            </Text>
          </TouchableOpacity>
        </View>

        {/* Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            disabled={currentIndex === 0}
            onPress={() => {
              setCurrentIndex((prev) => prev - 1);
              setShowMeaning(false);
            }}
            style={[
              styles.navCircle,
              currentIndex === 0 && styles.disabledBtn,
            ]}
          >
            <ChevronLeft
              size={24}
              color={
                currentIndex === 0
                  ? '#B8C5C1'
                  : COLORS.secondary
              }
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (currentIndex < reviewList.length - 1) {
                setCurrentIndex((prev) => prev + 1);
                setShowMeaning(false);
              } else {
                setReviewMode(null);
                setCurrentIndex(0);
              }
            }}
            style={styles.nextButton}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex < reviewList.length - 1
                ? 'Tiếp theo'
                : 'Hoàn tất'}
            </Text>

            <ChevronRight size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ================= RESULT MODE =================
  return (
    <View style={styles.container}>
      {passed && (
        <ConfettiCannon
          count={120}
          origin={{ x: width / 2, y: -20 }}
          fadeOut
        />
      )}

      {/* Status Icon */}
      <View
        style={[
          styles.statusIconWrapper,
          passed
            ? styles.successBg
            : styles.failedBg,
        ]}
      >
        {passed ? (
          <Trophy size={56} color={COLORS.secondary} />
        ) : (
          <AlertCircle size={56} color={COLORS.danger} />
        )}
      </View>

      {/* Title */}
      <Text style={styles.resultLabel}>
        {passed
          ? isBoss
            ? 'THẮNG BOSS'
            : 'HOÀN THÀNH'
          : 'THỬ LẠI'}
      </Text>

      {/* Score */}
      <View style={styles.scoreRow}>
        <Text
          style={[
            styles.scoreText,
            !passed && styles.failedScore,
          ]}
        >
          {score.toFixed(0)}
        </Text>

        <Text style={styles.percentText}>%</Text>
      </View>

      <View style={styles.correctBadge}>
        <Text style={styles.correctBadgeText}>
          {correctCount}/{totalCount} chính xác
        </Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttonsContainer}>
        {passed ? (
          <TouchableOpacity
            onPress={onContinue}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              Tiếp tục
            </Text>

            <ArrowRight size={18} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={onRetry}
            style={styles.retryButton}
          >
            <RefreshCw size={18} color="#FFFFFF" />

            <Text style={styles.primaryButtonText}>
              Thử lại
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.secondaryRow}>
          <TouchableOpacity
            onPress={() => setReviewMode('all')}
            style={styles.secondaryButton}
          >
            <BookOpen size={18} color={COLORS.secondary} />

            <Text style={styles.secondaryButtonText}>
              Xem lại
            </Text>
          </TouchableOpacity>

          {!passed && (
            <TouchableOpacity
              disabled={!canContinue}
              onPress={onContinue}
              style={[
                styles.secondaryButton,
                !canContinue && styles.disabledBtn,
              ]}
            >
              <Text style={styles.secondaryButtonText}>
                Bỏ qua
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  statusIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },

  successBg: {
    backgroundColor: '#DCFCE7',
  },

  failedBg: {
    backgroundColor: '#FFF1F2',
  },

  resultLabel: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  scoreText: {
    fontSize: 82,
    fontWeight: '900',
    color: COLORS.text,
    lineHeight: 90,
  },

  failedScore: {
    color: COLORS.danger,
  },

  percentText: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },

  correctBadge: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 40,
  },

  correctBadgeText: {
    color: COLORS.secondary,
    fontWeight: '700',
  },

  buttonsContainer: {
    width: '100%',
  },

  primaryButton: {
    height: 60,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },

  retryButton: {
    height: 60,
    borderRadius: 24,
    backgroundColor: COLORS.danger,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  secondaryRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 12,
  },

  secondaryButton: {
    flex: 1,
    height: 54,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  secondaryButtonText: {
    color: COLORS.secondary,
    fontWeight: '700',
  },

  disabledBtn: {
    opacity: 0.5,
  },

  // REVIEW

  reviewScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 24,
  },

  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  progressWrapper: {
    flex: 1,
    marginHorizontal: 14,
  },

  progressBg: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 999,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: COLORS.secondary,
  },

  progressText: {
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  flashcardContainer: {
    flex: 1,
    justifyContent: 'center',
  },

  flashcard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    padding: 36,
    minHeight: 360,
    justifyContent: 'center',
    alignItems: 'center',
  },

  flashcardBack: {
    backgroundColor: COLORS.primary,
  },

  flashcardLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    color: COLORS.textSecondary,
    marginBottom: 32,
  },

  flashcardLabelBack: {
    color: '#B7D2CB',
  },

  flashcardMainText: {
    fontSize: 56,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
  },

  flashcardMeaningText: {
    fontSize: 40,
    color: '#FFFFFF',
  },

  hiraganaText: {
    marginTop: 16,
    fontSize: 20,
    color: '#B7D2CB',
  },

  tapHint: {
    position: 'absolute',
    bottom: 24,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },

  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  navCircle: {
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  nextButton: {
    height: 54,
    paddingHorizontal: 28,
    borderRadius: 999,
    backgroundColor: COLORS.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  nextButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});