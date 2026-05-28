import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, Modal, PanResponder, Animated as RNAnimated } from 'react-native';
import { ChevronLeft, ChevronRight, X, Volume2, CheckCircle2, RotateCcw, Eye, EyeOff, Target } from 'lucide-react-native';
import { StackScreenProps } from '@react-navigation/stack';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
} from 'react-native-reanimated';
import { updateStudyPathIndex } from '../api/api';

import type { RootStackParamList } from '../components/AppNavigator';
import ScreenContainer from '../components/ScreenContainer';
import SharkLoader from '../components/ui/SharkLoader';
import BottomNavigation from '../components/BottomNavigation';
import ExitConfirmModal from '../components/ExitConfirmModal';
import { getFlashcards, markCardLearned, getLearnedCards, saveNodeStars } from '../api/api';
import { useAuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { chunkVocabulary } from '../utils/journeyMap';
import { speakTextToSpeech } from '../utils/tts';

const { width, height } = Dimensions.get('window');

type Props = StackScreenProps<RootStackParamList, 'Flashcard'>;

export default function FlashcardScreen({ navigation, route }: Props) {
  const { user } = useAuthContext();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [memorizedIds, setMemorizedIds] = useState<string[]>([]);
  const [backendWords, setBackendWords] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showPracticeConfirm, setShowPracticeConfirm] = useState(false);
  const [showAllCards, setShowAllCards] = useState(false);

  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  const spin = useSharedValue(0);

  const materialId = route.params?.materialId ?? 0;
  const batchIndex = route.params?.batchIndex ?? 0;
  const nodeIndex = route.params?.nodeIndex ?? 0;

  const position = useRef(new RNAnimated.ValueXY()).current;
  const fadeAnim = useRef(new RNAnimated.Value(1)).current;

  const SWIPE_THRESHOLD = 120;
  const SWIPE_OUT_DURATION = 250;

  useEffect(() => {
    let isMounted = true;
    const loadCards = async () => {
      setIsLoading(true);
      try {
        const [response, learnedResponse] = await Promise.all([
          getFlashcards(materialId),
          user?.id ? getLearnedCards(user.id, materialId).catch(() => ({ learnedCardIds: [] })) : Promise.resolve({ learnedCardIds: [] }),
        ]);
        
        const flashcards = Array.isArray(response) ? response : response.data || response.flashcards || [];
        
        if (isMounted) {
          const learnedIds = learnedResponse.learnedCardIds?.map(String) || [];
          setMemorizedIds(learnedIds);
          setBackendWords(flashcards.map((card: any) => ({
            id: card.id.toString(),
            kanji: card.kanji || card.word || '',
            hiragana: card.hiragana || card.reading || card.word || '',
            meaning: card.meaning || '',
            example: card.example || '',
            is_learned: card.is_learned,
          })));
        }
      } catch (error) {
        console.warn('Không lấy flashcards backend:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadCards();
    return () => { isMounted = false; };
  }, [materialId]);

  // 🛠️ ĐỒNG BỘ LOGIC: Ẩn thẻ khi đã thuộc, Hiện lại tất cả khi bấm nút bật chế độ Xem Tất Cả
  const words = useMemo(() => {
    if (backendWords) {
      const chunks = chunkVocabulary(backendWords);
      if (chunks[batchIndex]) {
        if (showAllCards) {
          return chunks[batchIndex]; // Chế độ Xem tất cả -> Trả về toàn bộ thẻ không lọc
        }
        // Chế độ Mặc định -> Lọc bỏ hoàn toàn các thẻ đã thuộc để ẩn chúng đi
        return chunks[batchIndex].filter(word => !memorizedIds.includes(word.id));
      }
    }
    return [];
  }, [backendWords, batchIndex, memorizedIds, showAllCards]);

  const currentWord = words[currentIndex];
  const nextIndex = words.length > 1 ? (currentIndex + 1) % words.length : currentIndex;
  const prevIndex = words.length > 1 ? (currentIndex - 1 + words.length) % words.length : currentIndex;
  const nextWord = words.length > 1 ? words[nextIndex] : null;

  // 🛠️ GIÁM SÁT CHỈ MỤC: Tránh lỗi tràn mảng khi mảng words bị co hẹp lại do ẩn bớt thẻ thuộc
  useEffect(() => {
    if (words.length > 0 && currentIndex >= words.length) {
      setCurrentIndex(0);
    }
  }, [words.length, currentIndex]);

  const progress = useMemo(() => {
    if (!backendWords) return 0;
    const chunks = chunkVocabulary(backendWords);
    const totalInBatch = chunks[batchIndex]?.length || 0;
    if (totalInBatch === 0) return 0;
    
    const currentBatchIds = chunks[batchIndex]?.map(w => w.id) || [];
    const learnedInBatch = memorizedIds.filter(id => currentBatchIds.includes(id)).length;
    return Math.min(learnedInBatch / totalInBatch, 1);
  }, [memorizedIds, backendWords, batchIndex]);

  const playSound = async (text: string, isSlow: boolean = false) => {
    if (!text) return;
    await speakTextToSpeech(text, {
      language: 'ja-JP',
      rate: isSlow ? 0.4 : 0.85,
      pitch: 1.0,
    });
  };

  const triggerImpactHaptic = (style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS !== 'web' && Haptics && typeof Haptics.impactAsync === 'function') {
      try {
        Haptics.impactAsync(style).catch(() => {});
      } catch (e) {
        console.warn('Haptic impact failed:', e);
      }
    }
  };

  const handleFlip = () => {
    const nextState = !showMeaning;
    setShowMeaning(nextState);
    spin.value = withTiming(nextState ? 180 : 0, { duration: 400 });
    
    triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Light);
    
    if (nextState && currentWord?.hiragana) {
      playSound(currentWord.hiragana);
    }
  };

  const handleToggleStatus = async () => {
    if (!currentWord) return;
    triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium);

    // Đóng lật thẻ trước khi hành động ẩn/hiện trạng thái diễn ra
    setShowMeaning(false);
    spin.value = 0;

    if (memorizedIds.includes(currentWord.id)) {
      setMemorizedIds(prev => prev.filter(id => id !== currentWord.id));
    } else {
      setMemorizedIds(prev => [...prev, currentWord.id]);
      
      if (user?.id) {
        markCardLearned({
          userId: user.id,
          materialId,
          flashcardId: Number(currentWord.id),
        }).catch(err => console.log('Lỗi lưu thẻ:', err));
      }
    }
  };

  const handleToggleShowAll = () => {
    triggerImpactHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setShowAllCards(prev => !prev);
    setCurrentIndex(0);
    setShowMeaning(false);
    spin.value = 0;
  };

  const handleNavigate = (direction: 'right' | 'left') => {
    if (words.length > 0) {
      if (direction === 'right') {
        setCurrentIndex((prev) => (prev + 1) % words.length);
      } else {
        setCurrentIndex((prev) => (prev - 1 + words.length) % words.length);
      }
    }
  };

  const onSwipeComplete = (direction: 'right' | 'left') => {
    handleNavigate(direction === 'right' ? 'left' : 'right');
    position.setValue({ x: 0, y: 0 });
    fadeAnim.setValue(1);
    setShowMeaning(false);
    spin.value = 0;
  };

  const forceSwipe = (direction: 'right' | 'left') => {
    const x = direction === 'right' ? width : -width;
    RNAnimated.timing(position, {
      toValue: { x, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false,
    }).start(() => onSwipeComplete(direction));
  };

  const resetPosition = () => {
    RNAnimated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  };

  const callbacks = useRef({ forceSwipe, resetPosition });
  useEffect(() => {
    callbacks.current = { forceSwipe, resetPosition };
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (e, gesture) => {
        return Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10;
      },
      onPanResponderMove: (e, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (e, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD || gesture.vx > 1.2) {
          callbacks.current.forceSwipe('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD || gesture.vx < -1.2) {
          callbacks.current.forceSwipe('left');
        } else {
          callbacks.current.resetPosition();
        }
      }
    })
  ).current;

  const handleStartPractice = () => {
    setShowPracticeConfirm(true);
  };

  const grantStarsIfMemorized = async () => {
    if (isBatchAllMemorized && user?.id) {
      try {
        await saveNodeStars({
          userId: user.id,
          materialId,
          nodeId: `batch-${batchIndex}-flashcard`,
          stars: 3
        });
      } catch (err) {}
    }
  };

  const confirmPractice = async () => {
    setShowPracticeConfirm(false);
    
    try {
      if (user?.id) {
        await updateStudyPathIndex(user.id, materialId, nodeIndex + 1);
      }
      await grantStarsIfMemorized();
    } catch (e) {
      console.warn('Không thể lưu tiến độ:', e);
    }

    navigation.replace('Quiz', {
      materialId,
      flashcardId: String(materialId),
      nodeId: `batch-${batchIndex}-kana`,
      groupIndex: batchIndex,
      subStepIndex: 0,
      nodeType: 'QUIZ_GROUP',
      quizStepType: 'MATCH_HIRA',
      nodeIndex: nodeIndex + 1,
      sessionId: undefined,
    });
  };

  const handleConfirmExit = async () => {
    setShowExitConfirm(false);
    await grantStarsIfMemorized();
    navigation.navigate('MainTabs' as any, {
      screen: 'StudyJourney',
      params: { materialId },
    });
  };

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const opacity = spin.value > 90 ? 0 : 1;
    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${spin.value}deg` }
      ],
      backfaceVisibility: 'hidden',
      opacity,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const opacity = spin.value > 90 ? 1 : 0;
    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${spin.value + 180}deg` }
      ],
      backfaceVisibility: 'hidden',
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      opacity,
    };
  });

  const rotate = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const themePrimaryColor = isDark ? '#2A5C4D' : '#3B7A66';
  if (isLoading) return <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}><SharkLoader size="small" message="" /></View>;

  const currentBatchTotal = backendWords ? chunkVocabulary(backendWords)[batchIndex]?.length || 0 : 0;
  const isBatchAllMemorized = backendWords ? chunkVocabulary(backendWords)[batchIndex]?.every(w => memorizedIds.includes(w.id)) : false;

  return (
    <ScreenContainer>
      <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
        <View style={styles.contentWrapper}>
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowExitConfirm(true)} style={[styles.closeBtn, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <X size={18} color={colors.text} />
            </TouchableOpacity>
            
            <View style={styles.progressContainer}>
              <View style={[styles.progressBg, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
                <Animated.View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: themePrimaryColor }]} />
              </View>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                {backendWords ? memorizedIds.filter(id => chunkVocabulary(backendWords)[batchIndex]?.map(w => w.id).includes(id)).length : 0} / {currentBatchTotal} đã thuộc
              </Text>
            </View>

            {/* <View style={[styles.closeBtn, { backgroundColor: 'transparent' }]} /> */}
          </View>

          {/* Flashcard Area */}
          <View style={styles.cardArea}>
            {nextWord && (
              <View style={[styles.cardContainer, { position: 'absolute', zIndex: -1, elevation: 0 }]}>
                <View style={[styles.flashcard, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                  <View style={styles.cardLabel}>
                    <Text style={[styles.cardTypeText, { color: themePrimaryColor }]}>KANJI / TỪ VỰNG</Text>
                  </View>
                  <Text style={[styles.kanjiText, { color: colors.text }]}>{nextWord.kanji}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 12 }}>Chạm lật thẻ • Vuốt để chuyển</Text>
                  </View>
                </View>
              </View>
            )}

            {words.length > 0 && currentWord ? (
              <RNAnimated.View 
                key={currentWord.id}
                style={[
                  styles.cardContainer, 
                  { transform: [...position.getTranslateTransform(), { rotate }], opacity: fadeAnim },
                  Platform.OS === 'web' ? ({ touchAction: 'pan-y' } as any) : {}
                ]}
                {...panResponder.panHandlers}
              >
                <TouchableOpacity activeOpacity={1} onPress={handleFlip} style={{ flex: 1 }}>
                  
                  <Animated.View style={[styles.flashcard, frontAnimatedStyle, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                    <View style={styles.cardLabel}>
                      <Text style={[styles.cardTypeText, { color: themePrimaryColor }]}>KANJI / TỪ VỰNG</Text>
                    </View>
                    <Text style={[styles.kanjiText, { color: colors.text }]}>{currentWord.kanji}</Text>
                    <View style={styles.cardFooter}>
                      <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 12 }}>Chạm lật thẻ • Vuốt để chuyển</Text>
                    </View>
                  </Animated.View>

                  <Animated.View style={[styles.flashcard, backAnimatedStyle, { backgroundColor: themePrimaryColor, borderColor: themePrimaryColor }]}>
                    <View style={styles.cardLabel}>
                      <Text style={{ color: '#FFF', opacity: 0.8, fontWeight: '900', fontSize: 11, letterSpacing: 0.5 }}>CÁCH ĐỌC & NGHĨA</Text>
                    </View>
                    <View style={{ alignItems: 'center', width: '100%', paddingHorizontal: 12 }}>
                      <Text style={styles.hiraganaText}>{currentWord.hiragana}</Text>
                      <Text style={styles.meaningText}>{currentWord.meaning}</Text>
                      {currentWord.example && 
                       currentWord.example !== 'Không có ví dụ mẫu' && 
                       currentWord.example !== 'Không có ví dụ' ? (
                        <View style={styles.exampleWrapper}>
                          <Text style={styles.exampleText}>{currentWord.example}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.cardFooter}>
                      <TouchableOpacity 
                        activeOpacity={0.7}
                        onPress={(e) => { e.stopPropagation(); playSound(currentWord.hiragana || ''); }}
                        onLongPress={(e) => { e.stopPropagation(); playSound(currentWord.hiragana || '', true); }}
                        style={styles.soundButton}
                      >
                        <Volume2 size={24} color={themePrimaryColor} />
                      </TouchableOpacity>
                    </View>
                  </Animated.View>

                </TouchableOpacity>
              </RNAnimated.View>
            ) : (
                <View style={styles.emptyCard}>
                    <CheckCircle2 size={64} color={themePrimaryColor} />
                    <Text style={[styles.emptyText, { color: colors.text }]}>Tuyệt vời!</Text>
                    <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center', fontWeight: '600', fontSize: 14 }}>
                      Bạn đã ghi nhớ toàn bộ từ vựng trong nhóm này.
                    </Text>
                </View>
            )}
          </View>

          {/* HÀNG NÚT TÁC VỤ SONG SONG XUYÊN SUỐT HỆ THỐNG */}
          <View style={styles.actionArea}>
            <TouchableOpacity 
              onPress={handleToggleStatus}
              disabled={!currentWord}
              activeOpacity={0.8}
              style={[
                styles.statusBar, 
                currentWord && memorizedIds.includes(currentWord.id) ? { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#D1FAE5', borderColor: isDark ? '#34D399' : '#059669' } : { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#F1F5F9' },
                !currentWord && { opacity: 0.4 }
              ]}
            >
              {currentWord && memorizedIds.includes(currentWord.id) ? (
                <CheckCircle2 size={18} color={isDark ? '#34D399' : '#059669'} />
              ) : (
                <RotateCcw size={18} color={colors.textSecondary} />
              )}
              <Text style={[styles.statusText, currentWord && memorizedIds.includes(currentWord.id) ? { color: isDark ? '#34D399' : '#059669' } : { color: colors.textSecondary }]}>
                {currentWord && memorizedIds.includes(currentWord.id) ? 'ĐÃ THUỘC' : 'CHƯA THUỘC'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleToggleShowAll}
              activeOpacity={0.8}
              style={[
                styles.statusBar, 
                { backgroundColor: showAllCards ? (isDark ? 'rgba(217, 119, 6, 0.15)' : '#FEF3C7') : colors.card },
                { borderColor: showAllCards ? (isDark ? '#F59E0B' : '#D97706') : (isDark ? '#1E293B' : '#F1F5F9') }
              ]}
            >
              {showAllCards ? (
                <EyeOff size={18} color={isDark ? '#F59E0B' : '#D97706'} />
              ) : (
                <Eye size={18} color={colors.textSecondary} />
              )}
              <Text style={[styles.statusText, { color: showAllCards ? (isDark ? '#F59E0B' : '#D97706') : colors.textSecondary }]}>
                {showAllCards ? 'ẨN THẺ THUỘC' : 'XEM TẤT CẢ'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bắt đầu luyện tập */}
          <View style={styles.bottomPracticeArea}>
            <View style={styles.practiceBtnWrapper}>
              <View style={[styles.practiceBtnBase, { backgroundColor: isBatchAllMemorized ? (isDark ? '#193D32' : '#275245') : (isDark ? '#1E293B' : '#E2E8F0') }]} />
              <TouchableOpacity 
                activeOpacity={0.9}
                onPress={handleStartPractice}
                style={[styles.practiceBtn, { backgroundColor: isBatchAllMemorized ? themePrimaryColor : colors.card, borderColor: isBatchAllMemorized ? 'transparent' : (isDark ? '#1E293B' : '#F1F5F9'), borderWidth: 1 }]}
              >
                <Text style={[styles.practiceBtnText, { color: isBatchAllMemorized ? '#FFF' : colors.text }]}>
                  BẮT ĐẦU LUYỆN TẬP
                </Text>
                <ChevronRight size={20} color={isBatchAllMemorized ? '#FFF' : colors.text} />
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </View>

      <ExitConfirmModal 
        visible={showExitConfirm} 
        onConfirm={handleConfirmExit} 
        onCancel={() => setShowExitConfirm(false)} 
      />

      <Modal visible={showPracticeConfirm} transparent animationType="fade" onRequestClose={() => setShowPracticeConfirm(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
            <View style={[styles.modalIconBg, { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : '#E9FBF5' }]}>
              <Target size={28} color={themePrimaryColor} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Bắt đầu luyện tập?</Text>
            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              {isBatchAllMemorized 
                ? 'Bạn đã ghi nhớ toàn bộ thẻ. Chuyển sang bài kiểm tra ghép nối để củng cố kiến thức nhé!'
                : 'Bạn vẫn còn thẻ chưa ghi nhớ. Bạn có chắc chắn muốn bỏ qua và chuyển sang bài kiểm tra?'}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowPracticeConfirm(false)} style={[styles.modalBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <Text style={{ color: colors.textSecondary, fontWeight: '800', fontSize: 14 }}>HỦY</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmPractice} style={[styles.modalBtn, { backgroundColor: themePrimaryColor }]}>
                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>ĐỒNG Ý</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  contentWrapper: { 
    flex: 1, 
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 20,
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 20 
  },
  closeBtn: { 
    width: 42, height: 42, borderRadius: 14, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center'
  },
  progressContainer: { flex: 1, marginHorizontal: 14, alignItems: 'center' },
  progressBg: { height: 10, width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 12 },
  progressText: { fontSize: 12, fontWeight: '800' },
  cardArea: { flex: 1, justifyContent: 'center' },
  cardContainer: { width: '100%', height: height * 0.48 },
  flashcard: { 
    flex: 1, borderRadius: 24, borderWidth: 1, padding: 24, 
    justifyContent: 'space-between', alignItems: 'center', 
    backfaceVisibility: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8 },
      android: { elevation: 1 },
    }),
  },
  cardLabel: { width: '100%', alignItems: 'flex-start' },
  cardTypeText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  kanjiText: { fontSize: 52, fontWeight: '900', textAlign: 'center', letterSpacing: -1 },
  hiraganaText: { fontSize: 24, color: '#FFF', fontWeight: '700', marginBottom: 10, opacity: 0.95 },
  meaningText: { fontSize: 32, color: '#FFF', fontWeight: '900', textAlign: 'center', letterSpacing: -0.5 },
  cardFooter: { width: '100%', alignItems: 'center' },
  soundButton: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#ffffff',
    justifyContent: 'center', alignItems: 'center'
  },
  actionArea: { 
    flexDirection: 'row', 
    marginTop: 16, 
    marginBottom: 16,
    alignItems: 'center',
    gap: 12,
  },
  statusBar: { 
    flex: 1, height: 52, borderRadius: 16, flexDirection: 'row', 
    justifyContent: 'center', alignItems: 'center', borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.01, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  statusText: { fontWeight: '800', fontSize: 12, marginLeft: 8, letterSpacing: 0.2 },
  emptyCard: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 20, fontWeight: '900', marginTop: 14, letterSpacing: -0.3 },
  
  bottomPracticeArea: {
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingTop: 8,
  },
  practiceBtnWrapper: {
    height: 54,
    position: 'relative',
    width: '100%',
  },
  practiceBtnBase: {
    position: 'absolute',
    top: 3, left: 0, right: 0, bottom: -3,
    borderRadius: 16,
  },
  practiceBtn: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  practiceBtnText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
    marginRight: 6,
  },

  exampleWrapper: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FFD02C',
    width: '100%',
  },
  exampleText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    fontStyle: 'italic',
    lineHeight: 18,
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24 },
      android: { elevation: 6 },
    }),
  },
  modalIconBg: {
    width: 54, height: 54, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 19, fontWeight: '900', marginBottom: 8, letterSpacing: -0.3
  },
  modalDesc: {
    fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24, fontWeight: '500'
  },
  modalActions: {
    flexDirection: 'row', width: '100%', gap: 12,
  },
  modalBtn: {
    flex: 1, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  }
});