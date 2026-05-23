import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, StyleSheet, Alert, Platform } from 'react-native';
import { X, CheckCircle2, AlertCircle, Trophy, Eye, RefreshCw, ArrowRight, ArrowLeft, BookOpen, Volume2 } from 'lucide-react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay, withRepeat, interpolate, Easing, runOnJS, withSequence } from 'react-native-reanimated';
import { Flame, Heart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import ScreenContainer from '../ScreenContainer';
import { useTheme } from '../../context/ThemeContext';
import { speakTextToSpeech } from '../../utils/tts';
import { useAuthContext } from '../../context/AuthContext';
import { useGlobalUI } from '../../context/GlobalUIContext';
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
      if (Platform.OS !== 'web' && Haptics && typeof Haptics.impactAsync === 'function') {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch (error) {
          console.warn('Streak celebration haptics failed:', error);
        }
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

// --- 🛠️ HIỆU ỨNG TRÁI TIM NỨT ĐÔI VÀ VỠ VỤN ĐỒNG BỘ NÂNG CẤP ---
const ShatteredHeartAnim = () => {
  const mascotScale = useSharedValue(0.5);
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(1);

  // Tọa độ dịch chuyển vật lý của 2 mảnh tim lớn trái / phải
  const leftShardX = useSharedValue(0);
  const leftShardY = useSharedValue(0);
  const leftShardRotate = useSharedValue(0);

  const rightShardX = useSharedValue(0);
  const rightShardY = useSharedValue(0);
  const rightShardRotate = useSharedValue(0);

  // Tọa độ bắn tung tóe của các hạt bụi tim nhỏ xung quanh
  const spark1X = useSharedValue(0); const spark1Y = useSharedValue(0);
  const spark2X = useSharedValue(0); const spark2Y = useSharedValue(0);

  const triggerShatterExplosion = () => {
    // Mảnh trái nứt ra và rơi rụng về phía dưới bên trái
    leftShardX.value = withTiming(-35, { duration: 600, easing: Easing.out(Easing.quad) });
    leftShardY.value = withTiming(60, { duration: 600, easing: Easing.in(Easing.cubic) });
    leftShardRotate.value = withTiming(-25, { duration: 600 });

    // Mảnh phải nứt ra và rơi rụng về phía dưới bên phải
    rightShardX.value = withTiming(35, { duration: 600, easing: Easing.out(Easing.quad) });
    rightShardY.value = withTiming(60, { duration: 600, easing: Easing.in(Easing.cubic) });
    rightShardRotate.value = withTiming(25, { duration: 600 });

    // Các mảnh vụn nhỏ bắn ngược lên rồi tan biến nhanh
    spark1X.value = withTiming(-60, { duration: 450 }); spark1Y.value = withTiming(-40, { duration: 450 });
    spark2X.value = withTiming(60, { duration: 450 }); spark2Y.value = withTiming(-40, { duration: 450 });

    heartOpacity.value = withTiming(0, { duration: 600, easing: Easing.linear });
  };

  useEffect(() => {
    setTimeout(() => {
      mascotScale.value = withSpring(1.0, { damping: 11, stiffness: 90 });
      
      // Hiệu ứng nhịp đập nhẹ trước khi vỡ tan cơ học
      heartScale.value = withSequence(
        withTiming(1.1, { duration: 150 }),
        withTiming(0.95, { duration: 100 }),
        withSpring(1.3, { damping: 4 }, () => {
          'worklet';
          runOnJS(triggerShatterExplosion)();
        })
      );
    }, 200);
  }, []);

  const mascotStyle = useAnimatedStyle(() => ({ transform: [{ scale: mascotScale.value }] }));
  const mainHeartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heartScale.value }] }));
  
  const leftShardStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [
      { translateX: leftShardX.value },
      { translateY: leftShardY.value },
      { rotate: `${leftShardRotate.value}deg` }
    ],
  }));

  const rightShardStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [
      { translateX: rightShardX.value },
      { translateY: rightShardY.value },
      { rotate: `${rightShardRotate.value}deg` }
    ],
  }));

  const spark1Style = useAnimatedStyle(() => ({ opacity: heartOpacity.value, transform: [{ translateX: spark1X.value }, { translateY: spark1Y.value }] }));
  const spark2Style = useAnimatedStyle(() => ({ opacity: heartOpacity.value, transform: [{ translateX: spark2X.value }, { translateY: spark2Y.value }] }));

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 20, height: 150 }}>
      {/* Nhân vật Shark Magic khóc thương tâm */}
      <Animated.Image 
        source={require('../../../assets/sharkCry.png')} 
        style={[{ width: 120, height: 120, resizeMode: 'contain' }, mascotStyle]} 
      />

      {/* KHU VỰC ĐIỀU PHỐI CÁC MẢNH VỠ CƠ HỌC KHỚP NHAU */}
      <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, mainHeartStyle]} pointerEvents="none">
        
        {/* Mảnh nửa trái tim bên Trái
        <Animated.View style={[{ position: 'absolute', left: '50%', marginLeft: -32, top: 26, width: 32, height: 64, overflow: 'hidden' }, leftShardStyle]}>
          <Heart size={64} color="#FF4B4B" fill="#FF4B4B" style={{ left: 0 }} />
        </Animated.View> */}

        {/* Mảnh nửa trái tim bên Phải */}
        {/* <Animated.View style={[{ position: 'absolute', left: '50%', top: 26, width: 32, height: 64, overflow: 'hidden' }, rightShardStyle]}>
          <Heart size={64} color="#FF4B4B" fill="#FF4B4B" style={{ left: -32 }} />
        </Animated.View> */}

        {/* Các hạt bụi tim vụn búng ra khi va chạm nứt vỡ */}
        <Animated.View style={[{ position: 'absolute', top: 40 }, spark1Style]}><Heart size={14} color="#FF4B4B" fill="#FF4B4B" opacity={0.8} /></Animated.View>
        <Animated.View style={[{ position: 'absolute', top: 40 }, spark2Style]}><Heart size={14} color="#FF4B4B" fill="#FF4B4B" opacity={0.8} /></Animated.View>
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
  showStreakCelebration?: boolean;
  onExit?: () => void;
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
  onExit,
}: ResultScreenProps) {
  const authContext = useAuthContext();
  const streakCount = authContext?.streakCount ?? 0;
  const [showingFailed, setShowingFailed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const { showAlert } = useGlobalUI();

  const failedAnswers = answers.filter((ans) => !ans.isCorrect);
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
      showAlert('Thông báo 🎉', 'Tuyệt vời! Bạn đã trả lời đúng tất cả các câu hỏi.', undefined, 'success');
      return;
    }
    setShowingFailed(true);
  };

  const playSound = async (text: string) => {
    if (!text) return;
    await speakTextToSpeech(text, {
      language: 'ja-JP',
      rate: 0.85,
      pitch: 1.0,
    });
  };

  // Hệ màu sắc tố trơn đậm lục bảo đồng bộ hệ thống Home
  const themePrimaryColor = isDark ? '#2A5C4D' : '#3B7A66';
  const themeShadowColor = isDark ? '#193D32' : '#275245';

  // --- CHẾ ĐỘ XEM LẠI LỖI SAI DẠNG LIST VOCABULARY TINH GỌN ---
  if (showingFailed && failedAnswers.length > 0) {
    return (
      <ScreenContainer>
        <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.reviewHeader}>
            <TouchableOpacity 
              onPress={() => setShowingFailed(false)} 
              style={[styles.closeButton, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#F1F5F9' }]}
            >
              <X size={18} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.reviewTitle, { color: colors.text }]}>Danh sách câu sai</Text>
            <View style={{ width: 42 }} /> 
          </View>

          {/* List Vocabulary cuộn phẳng chuyên nghiệp */}
          <ScrollView 
            style={styles.reviewListScroll} 
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {failedAnswers.map((item, idx) => (
              <View key={item.word.id || idx} style={[styles.listItem, { borderColor: isDark ? '#1E293B' : '#F1F5F9', backgroundColor: colors.card }]}>
                <Text style={[styles.listIndex, { color: themePrimaryColor }]}>{idx + 1}.</Text>
                
                <View style={styles.listTextContainer}>
                  <Text style={[styles.listText, { color: colors.text }]}>
                    {item.word.kanji || item.word.hiragana || '—'}
                  </Text>
                  <Text style={[styles.listSubText, { color: colors.textSecondary }]}>
                    {item.word.hiragana ? `${item.word.hiragana} — ` : ''}{item.word.meaning || 'Không có dữ liệu'}
                  </Text>
                </View>

                {item.word.hiragana && (
                  <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => playSound(item.word.hiragana)}
                    style={[styles.miniSoundBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                  >
                    <Volume2 size={16} color={themePrimaryColor} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Nút quay lại đổ khối 3D */}
          <View style={[styles.btn3DWrapper, { marginTop: 12 }]}>
            <View style={[styles.btn3DBase, { backgroundColor: themeShadowColor }]} />
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setShowingFailed(false)}
              style={[styles.primaryActionBtn, { backgroundColor: themePrimaryColor }]}
            >
              <Text style={styles.primaryActionBtnText}>Quay lại bảng điểm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // --- BẢNG ĐIỂM KẾT QUẢ CHÍNH (MAIN INTERFACE) ---
  return (
    <ScreenContainer>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContainer, 
          { backgroundColor: colors.background }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.centerWrapper}>
          {/* Nút Back về trang hành trình */}
          {onExit && (
            <TouchableOpacity
              onPress={onExit}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 10,
                padding: 10,
                backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                borderRadius: 12,
              }}
            >
              <ArrowLeft size={20} color={colors.text} />
            </TouchableOpacity>
          )}

          {showConfetti && (
            <View style={styles.confettiAbsoluteWrapper}>
              <ConfettiCannon
                count={isBoss ? 240 : 120}
                origin={{ x: width / 2, y: -40 }}
                fadeOut
                fallSpeed={2200}
              />
            </View>
          )}
          
          {showCelebration && showStreakCelebration && <StreakCelebration visible={showCelebration} streakCount={streakCount} />}

          {/* Minh họa trạng thái đạt hoặc thất bại */}
          {passedThreshold ? (
            <>
              <View style={styles.trophyContainer}>
                <View style={[styles.trophyInner, { backgroundColor: '#FFD02C' }]}>
                  <Trophy size={64} color="#FFF" fill="#FFF" />
                </View>
              </View>
              <Text style={[styles.statusTitle, { color: isDark ? '#34D399' : '#3B7A66' }]}>
                {isBoss ? 'Chinh phục thành công!' : 'Vượt chặng xuất sắc!'}
              </Text>
            </>
          ) : (
            <>
              <ShatteredHeartAnim />
              <Text style={[styles.statusTitle, { color: isDark ? '#F87171' : '#EF4444' }]}>
                Cần cố gắng hơn một chút
              </Text>
            </>
          )}

          {/* Thẻ bảng điểm Phẳng cơ học */}
          <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
            <Text style={[styles.scorePercent, { color: passedThreshold ? (isDark ? '#34D399' : '#3B7A66') : (isDark ? '#F87171' : '#EF4444') }]}>
              {displayedScore.toFixed(0)}<Text style={styles.percentSign}>%</Text>
            </Text>
            <Text style={[styles.scoreSub, { color: colors.textSecondary }]}>
              Chính xác <Text style={{ color: colors.text, fontWeight: '900' }}>{correctCount}</Text> trên tổng số <Text style={{ color: colors.text, fontWeight: '900' }}>{totalCount}</Text> câu hỏi
            </Text>
          </View>

          {/* Khối cụm nút bấm hành động */}
          <View style={styles.actionButtonGroup}>
            {failedAnswers.length > 0 && (
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={handleShowFailed} 
                style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#F1F5F9' }]}
              >
                <Eye size={16} color={themePrimaryColor} />
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                  Xem lại câu sai ({failedAnswers.length})
                </Text>
              </TouchableOpacity>
            )}

            {/* Nút làm lại bộ khối 3D */}
            <View style={styles.btn3DWrapper}>
              <View style={[styles.btn3DBase, { backgroundColor: canRetry ? (isDark ? '#1E293B' : '#CBD5E1') : (isDark ? '#111827' : '#E5E7EB') }]} />
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={canRetry ? onRetry : undefined}
                disabled={!canRetry}
                style={[
                  styles.mainActionButton,
                  {
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: canRetry ? themePrimaryColor : (isDark ? '#1E293B' : '#E2E8F0'),
                    opacity: canRetry ? 1 : 0.5,
                  },
                ]}
              >
                <RefreshCw size={14} color={canRetry ? themePrimaryColor : colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.mainActionButtonText, { color: canRetry ? themePrimaryColor : colors.textSecondary }]}>Làm lại bài này</Text>
              </TouchableOpacity>
            </View>

            {/* Nút tiếp tục chặng đường bộ khối 3D */}
            <View style={styles.btn3DWrapper}>
              <View style={[styles.btn3DBase, { backgroundColor: canContinue ? themeShadowColor : (isDark ? '#111827' : '#E5E7EB') }]} />
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={onContinue}
                disabled={!canContinue}
                style={[
                  styles.mainActionButton, 
                  { backgroundColor: canContinue ? themePrimaryColor : (isDark ? '#334155' : '#F1F5F9') },
                ]}
              >
                <Text style={[styles.mainActionButtonText, { color: canContinue ? '#FFF' : colors.textSecondary }]}>
                  {isBoss ? 'Quay lại Bản đồ' : 'Tiếp tục hành trình'}
                </Text>
                {canContinue && <ArrowRight size={16} color="#FFF" style={{ marginLeft: 6 }} />}
              </TouchableOpacity>
            </View>

            {!canContinue && (
              <View style={[styles.lockWarningRow, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2' }]}>
                <AlertCircle size={14} color={isDark ? '#F87171' : '#EF4444'} />
                <Text style={[styles.lockWarningText, { color: isDark ? '#F87171' : '#B91C1C' }]}>
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

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
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
    marginBottom: 16,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  reviewListScroll: {
    flex: 1,
    width: '100%',
    marginBottom: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
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
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  miniSoundBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btn3DWrapper: {
    height: 52,
    position: 'relative',
    width: '100%',
  },
  btn3DBase: {
    position: 'absolute',
    top: 4, left: 0, right: 0, bottom: -4,
    borderRadius: 16,
  },
  primaryActionBtn: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  trophyContainer: {
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#FFD02C', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  trophyInner: {
    padding: 24,
    borderRadius: 999,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  scoreCard: {
    width: '100%',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  scorePercent: {
    fontSize: 60,
    fontWeight: '900',
    lineHeight: 64,
    letterSpacing: -1,
  },
  percentSign: {
    fontSize: 24,
    fontWeight: '700',
  },
  scoreSub: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  actionButtonGroup: {
    width: '100%',
    gap: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  mainActionButton: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainActionButtonText: {
    fontSize: 15,
    fontWeight: '900',
  },
  lockWarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 2,
    gap: 6,
  },
  lockWarningText: {
    fontSize: 12,
    fontWeight: '700',
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