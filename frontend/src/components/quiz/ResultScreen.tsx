import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, StyleSheet, Alert } from 'react-native';
import { X, CheckCircle2, AlertCircle, Trophy, Eye, RefreshCw, ArrowRight, ArrowLeft } from 'lucide-react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay, withRepeat, interpolate, Easing, runOnJS, withSequence } from 'react-native-reanimated';
import { Flame, Heart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import ScreenContainer from '../ScreenContainer';
import { useTheme } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import type { AnswerRecord } from './types';

const { width } = Dimensions.get('window');

// --- STREAK ANIMATION HOOK ---
const useStreakCelebrationAnimation = (visible: boolean) => {
  const scale = useSharedValue(0);
  const sway = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const collapseScale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!visible) return;

    const runHaptics = async () => {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (error) {
        console.warn('Streak celebration haptics failed:', error);
      }
    };

    runHaptics();

    scale.value = withSpring(1.4, { stiffness: 120, damping: 6 });
    sway.value = withRepeat(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    subtitleOpacity.value = withDelay(300, withTiming(1, { duration: 240, easing: Easing.out(Easing.quad) }));

    translateX.value = withDelay(
      1200,
      withTiming(width * 0.32, { duration: 400, easing: Easing.inOut(Easing.quad) })
    );
    translateY.value = withDelay(
      1200,
      withTiming(-180, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
    collapseScale.value = withDelay(1200, withTiming(0.2, { duration: 400, easing: Easing.inOut(Easing.quad) }));
    opacity.value = withDelay(1200, withTiming(0, { duration: 400, easing: Easing.linear }));
  }, [visible]);

  const widgetStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value * collapseScale.value },
      { rotate: `${interpolate(sway.value, [0, 1], [-5, 5])}deg` },
    ],
    opacity: opacity.value,
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  return { widgetStyle, subtitleStyle };
};

const StreakCelebration = ({ visible, streakCount }: { visible: boolean; streakCount: number }) => {
  const { widgetStyle, subtitleStyle } = useStreakCelebrationAnimation(visible);
  if (!visible) return null;

  return (
    <View pointerEvents="none" style={styles.celebrationAbsoluteWrapper}>
      <Animated.View style={[styles.celebrationWidget, widgetStyle]}>
        <Flame size={80} color="#FFD02C" fill="#FFD02C" />
        <View style={styles.verticalTextChain}>
          {['+1', 'N', 'G', 'À', 'Y'].map((letter, index) => (
            <Text key={index} style={styles.verticalText}>
              {letter}
            </Text>
          ))}
        </View>
        <Animated.Text style={[styles.flameSubtitle, subtitleStyle]}>{`Chuỗi ${streakCount} ngày`}</Animated.Text>
      </Animated.View>
    </View>
  );
};

// --- SHATTERED HEART ANIMATION ---
const ShatteredHeartAnim = () => {
  const mascotScale = useSharedValue(0.5);
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(1);
  
  const shard1X = useSharedValue(0); const shard1Y = useSharedValue(0);
  const shard2X = useSharedValue(0); const shard2Y = useSharedValue(0);
  const shard3X = useSharedValue(0); const shard3Y = useSharedValue(0);
  const shard4X = useSharedValue(0); const shard4Y = useSharedValue(0);
  const shardRotate = useSharedValue(0);

  const triggerShardExplosion = () => {
    shard1X.value = withTiming(-40, { duration: 500 }); shard1Y.value = withTiming(-50, { duration: 500 });
    shard2X.value = withTiming(40, { duration: 500 }); shard2Y.value = withTiming(-50, { duration: 500 });
    shard3X.value = withTiming(-30, { duration: 500 }); shard3Y.value = withTiming(30, { duration: 500 });
    shard4X.value = withTiming(30, { duration: 500 }); shard4Y.value = withTiming(30, { duration: 500 });
    shardRotate.value = withTiming(360, { duration: 500 });
    heartOpacity.value = withTiming(0, { duration: 500 });
  };

  useEffect(() => {
    setTimeout(() => {
      mascotScale.value = withSpring(1.0, { damping: 10, stiffness: 100 });
      heartScale.value = withSequence(
        withTiming(1.0, { duration: 100 }),
        withTiming(0.9, { duration: 100 }),
        withSpring(1.2, { damping: 3 }, () => {
          runOnJS(triggerShardExplosion)();
        })
      );
    }, 200);
  }, []);

  const mascotStyle = useAnimatedStyle(() => ({ transform: [{ scale: mascotScale.value }] }));
  const heartStyle = useAnimatedStyle(() => ({ opacity: heartOpacity.value, transform: [{ scale: heartScale.value }] }));
  const shard1Style = useAnimatedStyle(() => ({ opacity: heartOpacity.value, transform: [{ translateX: shard1X.value }, { translateY: shard1Y.value }, { rotate: `${shardRotate.value}deg` }] }));
  const shard2Style = useAnimatedStyle(() => ({ opacity: heartOpacity.value, transform: [{ translateX: shard2X.value }, { translateY: shard2Y.value }, { rotate: `${-shardRotate.value}deg` }] }));
  const shard3Style = useAnimatedStyle(() => ({ opacity: heartOpacity.value, transform: [{ translateX: shard3X.value }, { translateY: shard3Y.value }, { rotate: `${shardRotate.value * 0.8}deg` }] }));
  const shard4Style = useAnimatedStyle(() => ({ opacity: heartOpacity.value, transform: [{ translateX: shard4X.value }, { translateY: shard4Y.value }, { rotate: `${-shardRotate.value * 0.8}deg` }] }));

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 24, height: 160 }}>
      <Animated.Image 
        source={require('../../../assets/sharkCry.png')} 
        style={[{ width: 130, height: 130, resizeMode: 'contain' }, mascotStyle]} 
      />
      <Animated.View style={[{ position: 'absolute', top: 10 }, heartStyle]}>
        <Heart size={64} color="#FF4B4B" fill="#FF4B4B" />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', top: 10 }, shard1Style]}><Heart size={20} color="#FF4B4B" fill="#FF4B4B" opacity={0.8} /></Animated.View>
      <Animated.View style={[{ position: 'absolute', top: 10 }, shard2Style]}><Heart size={20} color="#FF4B4B" fill="#FF4B4B" opacity={0.8} /></Animated.View>
      <Animated.View style={[{ position: 'absolute', top: 10 }, shard3Style]}><Heart size={16} color="#FF4B4B" fill="#FF4B4B" opacity={0.7} /></Animated.View>
      <Animated.View style={[{ position: 'absolute', top: 10 }, shard4Style]}><Heart size={16} color="#FF4B4B" fill="#FF4B4B" opacity={0.7} /></Animated.View>
    </View>
  );
};

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
  showStreakCelebration?: boolean;
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
  showStreakCelebration = false,
}: ResultScreenProps) {
  const authContext = useAuthContext();
  const streakCount = authContext?.streakCount ?? 0;
  const [showingFailed, setShowingFailed] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const { colors } = useTheme();

  const failedAnswers = answers.filter((ans) => !ans.isCorrect);
  const currentFailed = failedAnswers[reviewIndex];
  const displayedScore = displayScore ?? score;
  const passedThreshold = canContinue;
  const canRetry = score > 0;

  useEffect(() => {
    if (!passedThreshold) {
      setShowConfetti(false);
      setShowCelebration(false);
      return;
    }

    setShowConfetti(true);
    if (showStreakCelebration) {
      setShowCelebration(true);
    }

    const confettiTimer = setTimeout(() => setShowConfetti(false), 3000);
    const celebrationTimer = setTimeout(() => setShowCelebration(false), 1800);

    return () => {
      clearTimeout(confettiTimer);
      clearTimeout(celebrationTimer);
    };
  }, [passedThreshold, showStreakCelebration]);

  const handleShowFailed = () => {
    if (failedAnswers.length === 0) {
      Alert.alert('Thông báo 🎉', 'Tuyệt vời! Bạn đã trả lời đúng tất cả các câu hỏi.');
      return;
    }
    setReviewIndex(0);
    setShowAnswer(false);
    setShowingFailed(true);
  };

  // --- REVIEW MODE INTERFACE ---
  if (showingFailed && failedAnswers.length > 0) {
    return (
      <ScreenContainer>
        <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.reviewHeader}>
            <TouchableOpacity 
              onPress={() => setShowingFailed(false)} 
              style={[styles.closeButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <X size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.reviewTitle, { color: colors.text }]}>Ôn tập lỗi sai</Text>
            <View style={{ width: 44 }} /> 
          </View>

{/* Flashcard Review Deck */}
          <View style={[styles.flashcardContainer, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={[styles.badgeProgress, { backgroundColor: colors.primary + '15' }]}> 
              <Text style={[styles.badgeProgressText, { color: colors.primary }]}> 
                THẺ {reviewIndex + 1} / {failedAnswers.length} 
              </Text> 
            </View> 

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setShowAnswer((prev) => !prev)}
              style={[styles.flashcardCore, { backgroundColor: showAnswer ? colors.primary : colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.cardLabel}>
                <Text style={[styles.cardTypeText, { color: showAnswer ? '#FFF' : colors.primary }]}> 
                  {showAnswer ? 'CÁCH ĐỌC & NGHĨA' : 'KANJI / TỪ VỰNG'}
                </Text>
              </View>

              {showAnswer ? (
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.hiraganaText, { color: '#FFF' }]}>{currentFailed.word.hiragana || currentFailed.word.kanji || '—'}</Text>
                  <Text style={[styles.meaningText, { color: '#FFF', marginTop: 18 }]}>{currentFailed.word.meaning || 'Không có dữ liệu'}</Text>
                </View>
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.kanjiText, { color: colors.text }]}>{currentFailed.word.kanji || currentFailed.word.hiragana || '—'}</Text>
                  <Text style={[styles.cardHintText, { color: colors.textSecondary }]}>Chạm để lật thẻ</Text>
                </View>
              )}

              <View style={styles.cardFooter}>
                <Text style={{ color: showAnswer ? '#FFF' : colors.textSecondary, fontWeight: '700' }}>
                  {showAnswer ? 'Chạm để ẩn đáp án' : 'Chạm để lật thẻ và xem đáp án'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Flashcard Controller */}
            <View style={styles.controllerRow}>
              <TouchableOpacity
                onPress={() => { setReviewIndex(p => Math.max(p - 1, 0)); setShowAnswer(false); }}
                disabled={reviewIndex === 0}
                style={[styles.controlBtn, { backgroundColor: colors.surface }, reviewIndex === 0 && styles.disabledBtn]}
              >
                <ArrowLeft size={20} color={reviewIndex === 0 ? '#A3A3A3' : colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowAnswer(p => !p)}
                style={[styles.revealBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.revealBtnText}>{showAnswer ? 'Ẩn đáp án' : 'Hiện đáp án'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setReviewIndex(p => Math.min(p + 1, failedAnswers.length - 1)); setShowAnswer(false); }}
                disabled={reviewIndex === failedAnswers.length - 1}
                style={[styles.controlBtn, { backgroundColor: colors.surface }, reviewIndex === failedAnswers.length - 1 && styles.disabledBtn]}
              >
                <ArrowRight size={20} color={reviewIndex === failedAnswers.length - 1 ? '#A3A3A3' : colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setShowingFailed(false)}
            style={[styles.primaryActionBtn, { backgroundColor: colors.text }]}
          >
            <Text style={[styles.primaryActionBtnText, { color: colors.background }]}>Quay lại bảng điểm</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  // --- MAIN RESULT INTERFACE ---
  return (
    <ScreenContainer>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContainer, 
          { backgroundColor: passedThreshold ? colors.background : '#FFF5F5' }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.centerWrapper}>
          {showConfetti && (
            <View style={styles.confettiAbsoluteWrapper}>
              <ConfettiCannon
                count={isBoss ? 260 : 120}
                origin={{ x: width / 2, y: -40 }}
                fadeOut
                fallSpeed={2200}
              />
            </View>
          )}
          
          {showCelebration && showStreakCelebration && <StreakCelebration visible={showCelebration} streakCount={streakCount} />}

          {/* Status Illustration / Trophy */}
          {passedThreshold ? (
            <>
              <View style={[styles.trophyContainer, { shadowColor: colors.warning }]}>
                <View style={[styles.trophyInner, { backgroundColor: colors.warning }]}>
                  <Trophy size={68} color="#FFF" fill="#FFF" />
                </View>
              </View>
              <Text style={[styles.statusTitle, { color: colors.success }]}>
                {isBoss ? 'Chinh phục thành công!' : 'Vượt chặng xuất sắc!'}
              </Text>
            </>
          ) : (
            <>
              <ShatteredHeartAnim />
              <Text style={[styles.statusTitle, { color: colors.danger, marginTop: 12 }]}>
                Cần cố gắng hơn một chút
              </Text>
            </>
          )}

          {/* Score Plate Card */}
          <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.scorePercent, { color: passedThreshold ? colors.success : colors.danger }]}>
              {displayedScore.toFixed(0)}<Text style={styles.percentSign}>%</Text>
            </Text>
            <Text style={[styles.scoreSub, { color: colors.textSecondary }]}>
              Chính xác <Text style={{ color: colors.text, fontWeight: '800' }}>{correctCount}</Text> trên tổng số <Text style={{ fontWeight: '800' }}>{totalCount}</Text> câu hỏi
            </Text>
          </View>

          {/* Action Buttons Group */}
          <View style={styles.actionButtonGroup}>
            {failedAnswers.length > 0 && (
              <TouchableOpacity onPress={handleShowFailed} style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Eye size={18} color={colors.primary} />
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                  Xem lại câu sai ({failedAnswers.length})
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={canRetry ? onRetry : undefined}
              disabled={!canRetry}
              style={[
                styles.mainActionButton,
                {
                  backgroundColor: canRetry ? colors.surface : colors.border,
                  borderWidth: 1.5,
                  borderColor: canRetry ? colors.primary : colors.border,
                  opacity: canRetry ? 1 : 0.6,
                },
              ]}
            >
              <RefreshCw size={18} color={canRetry ? colors.primary : colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={[styles.mainActionButtonText, { color: canRetry ? colors.primary : colors.textSecondary }]}>Làm lại bài này</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onContinue}
              disabled={!canContinue}
              style={[
                styles.mainActionButton, 
                { backgroundColor: canContinue ? colors.primary : colors.border },
                canContinue ? styles.shadowActive : {}
              ]}
            >
              <Text style={[styles.mainActionButtonText, { color: canContinue ? '#FFF' : colors.textSecondary }]}>
                {isBoss ? 'Quay lại Bản đồ' : 'Tiếp tục hành trình'}
              </Text>
              {canContinue && <ArrowRight size={18} color="#FFF" style={{ marginLeft: 8 }} />}
            </TouchableOpacity>

            {!canContinue && (
              <View style={[styles.lockWarningRow, { backgroundColor: colors.danger + '10' }]}>
                <AlertCircle size={14} color={colors.danger} />
                <Text style={[styles.lockWarningText, { color: colors.danger }]}>
                  Đạt tối thiểu 80% điểm số để mở khóa bài tiếp theo.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

// --- MODERN LUXURY STYLESHEET ---
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  centerWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  flashcardContainer: {
    flex: 1,
    borderRadius: 28,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  badgeProgress: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 20,
  },
  badgeProgressText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  flashcardCore: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    justifyContent: 'center',
  },
  cardLabel: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTypeText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  flashcardLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  kanjiText: {
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 14,
    textAlign: 'center',
  },
  hiraganaText: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 14,
  },
  meaningText: {
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
  },
  cardFooter: {
    width: '100%',
    alignItems: 'center',
    marginTop: 24,
  },
  cardHintText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 14,
  },
  controllerRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  disabledBtn: {
    opacity: 0.4,
  },
  revealBtn: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  revealBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  primaryActionBtn: {
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtnText: {
    fontSize: 16,
    fontWeight: '800',
  },
  trophyContainer: {
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
    marginBottom: 24,
  },
  trophyInner: {
    padding: 28,
    borderRadius: 999,
  },
  statusTitle: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  scoreCard: {
    width: '100%',
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
    marginBottom: 32,
  },
  scorePercent: {
    fontSize: 64,
    fontWeight: '900',
    lineHeight: 68,
    letterSpacing: -1,
  },
  percentSign: {
    fontSize: 28,
    fontWeight: '700',
  },
  scoreSub: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 10,
    textAlign: 'center',
  },
  actionButtonGroup: {
    width: '100%',
    gap: 14,
  },
  secondaryButton: {
    flexDirection: 'row',
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  mainActionButton: {
    flexDirection: 'row',
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainActionButtonText: {
    fontSize: 16,
    fontWeight: '800',
  },
  shadowActive: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  lockWarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 4,
    gap: 6,
  },
  lockWarningText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  confettiAbsoluteWrapper: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
    zIndex: 5,
  },
  celebrationAbsoluteWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  celebrationWidget: {
    width: 180,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  verticalTextChain: {
    position: 'absolute',
    right: -52,
    top: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalText: {
    color: '#FFD02C',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    lineHeight: 22,
  },
  flameSubtitle: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: '900',
    color: '#FFD02C',
    textAlign: 'center',
  },
});