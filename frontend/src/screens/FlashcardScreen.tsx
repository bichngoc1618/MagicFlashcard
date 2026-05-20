import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions, Platform, Modal, PanResponder, Animated as RNAnimated } from 'react-native';
import { ChevronLeft, ChevronRight, X, Volume2, CheckCircle2, RotateCcw, Eye, EyeOff, Target } from 'lucide-react-native';
import { StackScreenProps } from '@react-navigation/stack';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
} from 'react-native-reanimated';
import { updateStudyPathIndex } from '../api/api';

import type { RootStackParamList } from '../components/AppNavigator';
import ScreenContainer from '../components/ScreenContainer';
import BottomNavigation from '../components/BottomNavigation';
import ExitConfirmModal from '../components/ExitConfirmModal';
import { getFlashcards, markCardLearned, getLearnedCards } from '../api/api';
import { useAuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { chunkVocabulary } from '../utils/journeyMap';

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

  const { colors } = useTheme();

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

  const words = useMemo(() => {
    if (backendWords) {
      const chunks = chunkVocabulary(backendWords);
      if (chunks[batchIndex]) {
        // Filter out already memorized cards to hide them by default
        return chunks[batchIndex].filter(word => !memorizedIds.includes(word.id));
      }
    }
    return [];
  }, [backendWords, batchIndex, memorizedIds]);

  const currentWord = words[currentIndex];
  const nextIndex = words.length > 1 ? (currentIndex + 1) % words.length : currentIndex;
  const prevIndex = words.length > 1 ? (currentIndex - 1 + words.length) % words.length : currentIndex;
  const nextWord = words.length > 1 ? words[nextIndex] : null;

  useEffect(() => {
    if (words.length > 0 && currentIndex >= words.length) {
      setCurrentIndex(0);
    }
  }, [words.length, currentIndex]);

  const progress = useMemo(() => {
    if (words.length === 0) return 0;
    return memorizedIds.length / words.length;
  }, [memorizedIds.length, words.length]);

  const playSound = (text: string, isSlow: boolean = false) => {
    Speech.stop();
    Speech.speak(text, {
      language: 'ja-JP',
      rate: isSlow ? 0.4 : 0.85,
    });
  };

  const handleFlip = () => {
    const nextState = !showMeaning;
    setShowMeaning(nextState);
    spin.value = withTiming(nextState ? 180 : 0, { duration: 400 });
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (nextState && currentWord?.hiragana) {
      playSound(currentWord.hiragana);
    }
  };

  const handleToggleStatus = async () => {
    if (!currentWord) return;

    if (memorizedIds.includes(currentWord.id)) {
      setMemorizedIds(prev => prev.filter(id => id !== currentWord.id));
    } else {
      setMemorizedIds(prev => [...prev, currentWord.id]);
      
      // Async update backend
      if (user?.id) {
        markCardLearned({
          userId: user.id,
          materialId,
          flashcardId: Number(currentWord.id),
        }).catch(err => console.log('Lỗi lưu thẻ:', err));
      }
    }
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
    handleNavigate(direction);
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

  const confirmPractice = async () => {
    setShowPracticeConfirm(false);
    
    try {
      if (user?.id) {
        await updateStudyPathIndex(user.id, materialId, nodeIndex + 1);
      }
    } catch (e) {
      console.warn('Không thể lưu tiến độ:', e);
    }

    // Node 2 is MATCHING_KANA
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

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    navigation.navigate('StudyJourney', { materialId });
  };

  const frontAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${spin.value}deg` }],
    backfaceVisibility: 'hidden',
  }));

  const backAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${spin.value + 180}deg` }],
    backfaceVisibility: 'hidden',
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  }));

  const rotate = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  if (isLoading) return <ActivityIndicator size="large" style={{ flex: 1, backgroundColor: colors.background }} />;

  const allMemorized = memorizedIds.length === words.length && words.length > 0;

  return (
    <ScreenContainer>
      <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
        <View style={styles.contentWrapper}>
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowExitConfirm(true)} style={[styles.closeBtn, { backgroundColor: colors.surface }]}>
              <X size={20} color={colors.text} />
            </TouchableOpacity>
            
            <View style={styles.progressContainer}>
              <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
                <Animated.View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
              </View>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                {memorizedIds.length} / {words.length} đã thuộc
              </Text>
            </View>

            <View style={[styles.closeBtn, { backgroundColor: 'transparent' }]} />
          </View>

          {/* Flashcard Area */}
          <View style={styles.cardArea}>
            {/* NEXT CARD (Background) */}
            {nextWord && (
              <View style={[styles.cardContainer, { position: 'absolute', zIndex: -1, elevation: 0 }]}>
                <View style={[styles.flashcard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.cardLabel}>
                    <Text style={[styles.cardTypeText, { color: colors.primary }]}>KANJI / TỪ VỰNG</Text>
                  </View>
                  <Text style={[styles.kanjiText, { color: colors.text }]}>{nextWord.kanji}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={{ color: colors.textSecondary }}>Chạm để lật thẻ • Vuốt để chuyển</Text>
                  </View>
                </View>
              </View>
            )}

            {/* CURRENT CARD (Foreground) */}
            {words.length > 0 && currentWord ? (
              <RNAnimated.View 
                key={currentWord.id}
                style={[
                  styles.cardContainer, 
                  { transform: [...position.getTranslateTransform(), { rotate }], opacity: fadeAnim }
                ]}
                {...panResponder.panHandlers}
              >
                <TouchableOpacity activeOpacity={1} onPress={handleFlip} style={{ flex: 1 }}>
                  
                  <Animated.View style={[styles.flashcard, frontAnimatedStyle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.cardLabel}>
                      <Text style={[styles.cardTypeText, { color: colors.primary }]}>KANJI / TỪ VỰNG</Text>
                    </View>
                    <Text style={[styles.kanjiText, { color: colors.text }]}>{currentWord.kanji}</Text>
                    <View style={styles.cardFooter}>
                      <Text style={{ color: colors.textSecondary }}>Chạm để lật thẻ • Vuốt để chuyển</Text>
                    </View>
                  </Animated.View>

                  <Animated.View style={[styles.flashcard, backAnimatedStyle, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                    <View style={styles.cardLabel}>
                      <Text style={{ color: '#FFF', opacity: 0.7 }}>CÁCH ĐỌC & NGHĨA</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={styles.hiraganaText}>{currentWord.hiragana}</Text>
                      <Text style={styles.meaningText}>{currentWord.meaning}</Text>
                    </View>
                    <View style={styles.cardFooter}>
                      <TouchableOpacity 
                        onPress={(e) => { e.stopPropagation(); playSound(currentWord.hiragana || ''); }}
                        onLongPress={(e) => { e.stopPropagation(); playSound(currentWord.hiragana || '', true); }}
                      >
                        <Volume2 size={36} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </Animated.View>

                </TouchableOpacity>
              </RNAnimated.View>
            ) : (
                <View style={styles.emptyCard}>
                    <CheckCircle2 size={70} color={colors.primary} />
                    <Text style={[styles.emptyText, { color: colors.text }]}>Tuyệt vời!</Text>
                    <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
                      Bạn đã ghi nhớ toàn bộ từ vựng trong nhóm này.
                    </Text>
                </View>
            )}
          </View>

          {/* Status Bar */}
          {words.length > 0 && currentWord && (
            <View style={styles.actionArea}>
              <TouchableOpacity 
                onPress={handleToggleStatus}
                activeOpacity={0.8}
                style={[
                  styles.statusBar, 
                  { backgroundColor: memorizedIds.includes(currentWord.id) ? '#D1FAE5' : colors.surface },
                  { borderColor: memorizedIds.includes(currentWord.id) ? '#10B981' : colors.border }
                ]}
              >
                {memorizedIds.includes(currentWord.id) ? (
                  <CheckCircle2 size={24} color="#10B981" />
                ) : (
                  <RotateCcw size={24} color={colors.textSecondary} />
                )}
                <Text style={[styles.statusText, { color: memorizedIds.includes(currentWord.id) ? '#10B981' : colors.textSecondary }]}>
                  TRẠNG THÁI: {memorizedIds.includes(currentWord.id) ? 'ĐÃ THUỘC' : 'CHƯA THUỘC'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Bắt đầu luyện tập (Start Practice) */}
          <View style={styles.bottomPracticeArea}>
            <TouchableOpacity 
              onPress={handleStartPractice}
              style={[styles.practiceBtn, { backgroundColor: allMemorized ? colors.primary : colors.surface, borderColor: allMemorized ? 'transparent' : colors.primary, borderWidth: 2 }]}
            >
              <Text style={[styles.practiceBtnText, { color: allMemorized ? '#FFF' : colors.primary }]}>
                BẮT ĐẦU LUYỆN TẬP
              </Text>
              <ChevronRight size={24} color={allMemorized ? '#FFF' : colors.primary} />
            </TouchableOpacity>
          </View>

        </View>
      </View>

      <ExitConfirmModal 
        visible={showExitConfirm} 
        onConfirm={handleConfirmExit} 
        onCancel={() => setShowExitConfirm(false)} 
      />

      <Modal visible={showPracticeConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalIconBg, { backgroundColor: colors.primary + '15' }]}>
              <Target size={32} color={colors.primary} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Bắt đầu luyện tập?</Text>
            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              {allMemorized 
                ? 'Bạn đã ghi nhớ toàn bộ thẻ. Chuyển sang bài kiểm tra ghép nối để củng cố kiến thức nhé!'
                : 'Bạn vẫn còn thẻ chưa ghi nhớ. Bạn có chắc chắn muốn bỏ qua và chuyển sang bài kiểm tra?'}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowPracticeConfirm(false)} style={[styles.modalBtn, { backgroundColor: colors.border }]}>
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>HỦY</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmPractice} style={[styles.modalBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#FFF', fontWeight: '700' }}>ĐỒNG Ý</Text>
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 20 
  },
  closeBtn: { 
    width: 40, height: 40, borderRadius: 20, 
    justifyContent: 'center', alignItems: 'center', elevation: 2 
  },
  progressContainer: { flex: 1, marginHorizontal: 15, alignItems: 'center' },
  progressBg: { height: 8, width: '100%', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%' },
  progressText: { fontSize: 13, fontWeight: '700' },
  cardArea: { flex: 1, justifyContent: 'center' },
  cardContainer: { width: '100%', height: height * 0.5 },
  flashcard: { 
    flex: 1, borderRadius: 32, borderWidth: 1, padding: 30, 
    justifyContent: 'space-between', alignItems: 'center', 
    backfaceVisibility: 'hidden', elevation: 5,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, shadowRadius: 8
  },
  cardLabel: { width: '100%', alignItems: 'flex-start' },
  cardTypeText: { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  kanjiText: { fontSize: 56, fontWeight: '900', textAlign: 'center' },
  hiraganaText: { fontSize: 26, color: '#FFF', opacity: 0.9, marginBottom: 12 },
  meaningText: { fontSize: 34, color: '#FFF', fontWeight: '800', textAlign: 'center' },
  cardFooter: { width: '100%', alignItems: 'center' },
  actionArea: { 
    flexDirection: 'row', 
    marginTop: 10, 
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBar: { 
    flex: 1, height: 60, borderRadius: 20, flexDirection: 'row', 
    justifyContent: 'center', alignItems: 'center', borderWidth: 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1
  },
  statusText: { fontWeight: '800', fontSize: 16, marginLeft: 10, letterSpacing: 0.5 },
  emptyCard: { alignItems: 'center', justifyContent: 'center', padding: 30 },
  emptyText: { fontSize: 22, fontWeight: 'bold', marginTop: 15 },
  
  bottomPracticeArea: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
    paddingTop: 10,
  },
  practiceBtn: {
    width: '100%',
    height: 65,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4
  },
  practiceBtnText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginRight: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
  },
  modalIconBg: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20, fontWeight: '800', marginBottom: 12,
  },
  modalDesc: {
    fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row', width: '100%', gap: 12,
  },
  modalBtn: {
    flex: 1, height: 50, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  }
});