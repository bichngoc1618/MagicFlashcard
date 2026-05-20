import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, StyleSheet, Alert, Image } from 'react-native';
import { X, CheckCircle2, AlertCircle, Trophy, Eye, Heart, Flame } from 'lucide-react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay, withSequence, withRepeat, interpolate, Easing, runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import ScreenContainer from '../ScreenContainer';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext, useAuthContext } from '../../context/AuthContext';
import type { AnswerRecord } from './types';

const { width } = Dimensions.get('window');

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

const ShatteredHeartAnim = () => {
  const mascotScale = useSharedValue(0.5);
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(1);
  
  // Multiple shards flying in different directions
  const shard1X = useSharedValue(0);
  const shard1Y = useSharedValue(0);
  const shard2X = useSharedValue(0);
  const shard2Y = useSharedValue(0);
  const shard3X = useSharedValue(0);
  const shard3Y = useSharedValue(0);
  const shard4X = useSharedValue(0);
  const shard4Y = useSharedValue(0);
  const shardRotate = useSharedValue(0);

  const triggerShardExplosion = () => {
    shard1X.value = withTiming(-40, { duration: 500 });
    shard1Y.value = withTiming(-50, { duration: 500 });
    
    shard2X.value = withTiming(40, { duration: 500 });
    shard2Y.value = withTiming(-50, { duration: 500 });
    
    shard3X.value = withTiming(-30, { duration: 500 });
    shard3Y.value = withTiming(30, { duration: 500 });
    
    shard4X.value = withTiming(30, { duration: 500 });
    shard4Y.value = withTiming(30, { duration: 500 });
    
    shardRotate.value = withTiming(360, { duration: 500 });
    
    heartOpacity.value = withTiming(0, { duration: 500 });
  };

  useEffect(() => {
    // Step 2: Mascot pops up (Spring 0.5 -> 1.0) starting at 200ms
    setTimeout(() => {
      mascotScale.value = withSpring(1.0, { damping: 10, stiffness: 100 });
      
      // Heart appears, shrinks, then bursts
      heartScale.value = withSequence(
        withTiming(1.0, { duration: 100 }), // Appear quickly
        withTiming(0.9, { duration: 100 }), // Shrink (accumulating energy)
        withSpring(1.2, { damping: 3 }, () => {
          // Trigger shard explosion
          runOnJS(triggerShardExplosion)();
        })
      );
    }, 200);
  }, []);

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mascotScale.value }]
  }));

  const heartStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [{ scale: heartScale.value }]
  }));

  const shard1Style = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [
      { translateX: shard1X.value },
      { translateY: shard1Y.value },
      { rotate: `${shardRotate.value}deg` }
    ]
  }));

  const shard2Style = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [
      { translateX: shard2X.value },
      { translateY: shard2Y.value },
      { rotate: `${-shardRotate.value}deg` }
    ]
  }));

  const shard3Style = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [
      { translateX: shard3X.value },
      { translateY: shard3Y.value },
      { rotate: `${shardRotate.value * 0.8}deg` }
    ]
  }));

  const shard4Style = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [
      { translateX: shard4X.value },
      { translateY: shard4Y.value },
      { rotate: `${-shardRotate.value * 0.8}deg` }
    ]
  }));

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
      <Animated.Image 
        source={require('../../../assets/sharkCry.png')} 
        style={[{ width: 140, height: 140 }, mascotStyle]} 
      />
      
      {/* Floating Heart - Center */}
      <Animated.View style={[{ position: 'absolute', top: -40 }, heartStyle]}>
        <Heart size={80} color="#FF4B4B" fill="#FF4B4B" />
      </Animated.View>
      
      {/* Shattered Heart Pieces */}
      <Animated.View style={[{ position: 'absolute', top: -40 }, shard1Style]}>
        <Heart size={24} color="#FF4B4B" fill="#FF4B4B" opacity={0.8} />
      </Animated.View>
      
      <Animated.View style={[{ position: 'absolute', top: -40 }, shard2Style]}>
        <Heart size={24} color="#FF4B4B" fill="#FF4B4B" opacity={0.8} />
      </Animated.View>
      
      <Animated.View style={[{ position: 'absolute', top: -40 }, shard3Style]}>
        <Heart size={20} color="#FF4B4B" fill="#FF4B4B" opacity={0.7} />
      </Animated.View>
      
      <Animated.View style={[{ position: 'absolute', top: -40 }, shard4Style]}>
        <Heart size={20} color="#FF4B4B" fill="#FF4B4B" opacity={0.7} />
      </Animated.View>
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
      setShowCelebration(false);
      return;
    }

    setShowConfetti(true);
    setShowCelebration(true);
    const confettiTimer = setTimeout(() => setShowConfetti(false), 3000);
    const celebrationTimer = setTimeout(() => setShowCelebration(false), 1800);

    return () => {
      clearTimeout(confettiTimer);
      clearTimeout(celebrationTimer);
    };
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
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, backgroundColor: passedThreshold ? colors.background : '#FFF1F2' }}>
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
          {showCelebration && <StreakCelebration visible={showCelebration} streakCount={streakCount} />}
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
              <ShatteredHeartAnim />
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
                backgroundColor: canContinue ? colors.primary : colors.surface,
                paddingVertical: 18,
                borderRadius: 20,
                alignItems: 'center',
                borderBottomWidth: canContinue ? 4 : 0,
                borderBottomColor: canContinue ? colors.primary : colors.surface,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '900', textTransform: 'uppercase', color: canContinue ? '#FFFFFF' : colors.textSecondary }}>
                {isBoss ? 'Quay lại Map' : 'Tiếp tục'}
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
  celebrationAbsoluteWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  confettiWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
});
