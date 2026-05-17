import React, { useState, useContext, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions, Platform } from 'react-native';
import { ChevronLeft, ChevronRight, X, Volume2, CheckCircle2 } from 'lucide-react-native';
import { StackScreenProps } from '@react-navigation/stack';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
} from 'react-native-reanimated';

import type { RootStackParamList } from '../components/AppNavigator';
import ScreenContainer from '../components/ScreenContainer';
import BottomNavigation from '../components/BottomNavigation';
import ExitConfirmModal from '../components/ExitConfirmModal';
import { getFlashcards, markCardLearned, resetBatchProgress, syncStudy } from '../api/api';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { updateDeckProgress } from '../utils/learningProgress';

const { width, height } = Dimensions.get('window');

type Props = StackScreenProps<RootStackParamList, 'Flashcard'>;

export default function FlashcardScreen({ navigation, route }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [memorizedIds, setMemorizedIds] = useState<string[]>([]);
  const [backendWords, setBackendWords] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();

  // Animation & Haptic values
  const spin = useSharedValue(0);

  // --- GIỮ NGUYÊN TOÀN BỘ LOGIC CŨ ---
  const materialId = route.params?.materialId ?? 0;
  const flashcardId = route.params?.flashcardId ?? String(materialId);
  const sessionId = route.params?.sessionId ?? null;
  const batchIndex = route.params?.batchIndex ?? Math.floor((route.params?.chunkStart ?? 0) / 10);
  const nodeIndex = route.params?.nodeIndex;
  const chunkStart = batchIndex * 10;
  const chunkSize = Math.max(1, route.params?.chunkSize ?? 10);
  const nextQuizNodeId = route.params?.nextQuizNodeId;
  const nextNodeIndex = route.params?.nextNodeIndex;

  useEffect(() => {
    let isMounted = true;
    const loadCards = async () => {
      setIsLoading(true);
      try {
        const response = await getFlashcards(materialId);
        const flashcards = response.flashcards || [];
        if (isMounted) {
          setBackendWords(flashcards.map((card: any) => ({
            id: card.id.toString(),
            kanji: card.kanji || card.word || '',
            hiragana: card.word || card.kanji || '',
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
  }, [flashcardId]);

  const words = useMemo(() => {
    if (backendWords !== null) {
      return backendWords.slice(chunkStart, chunkStart + chunkSize);
    }
    return [];
  }, [backendWords, chunkStart, chunkSize]);

  const visibleWords = words.filter((word) => !memorizedIds.includes(word.id));
  const currentWord = visibleWords[currentIndex];
  const progress = useMemo(() => (visibleWords.length === 0 ? 1 : (currentIndex + 1) / visibleWords.length), [currentIndex, visibleWords.length]);

  // --- LOGIC MỚI: ÂM THANH & RUNG & LẬT THẺ ---
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
    
    // Phản hồi xúc giác khi lật
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Tự động phát âm khi xem mặt nghĩa
    if (nextState && currentWord) {
      playSound(currentWord.hiragana);
    }
  };

  // --- GIỮ NGUYÊN LOGIC CHUYỂN BÀI CŨ ---
  const onNext = async () => {
    if (visibleWords.length === 0) {
      const remainingCards = words.filter(w => !memorizedIds.includes(w.id));
      for (const card of remainingCards) {
        await markCardLearned({
          userId: user.id,
          materialId: materialId,
          flashcardId: Number(card.id),
        });
      }

      if (typeof nodeIndex === 'number' && user?.id) {
        try {
          await syncStudy({
            userId: user.id,
            materialId,
            currentNodeIndex: nodeIndex + 1,
            sessionId: sessionId ?? undefined,
          });
        } catch (error) {
          console.warn('Không đồng bộ lộ trình học:', error);
        }
      }

      if (typeof nextNodeIndex === 'number') {
        await updateDeckProgress(flashcardId, (current) => ({
          ...current,
          completedNodes: { ...current.completedNodes, [(nextNodeIndex - 1).toString()]: true },
          currentActiveNodeIndex: Math.max(current.currentActiveNodeIndex, nextNodeIndex),
        }));
      }
      if (nextQuizNodeId) {
        navigation.navigate('Quiz', {
          materialId,
          flashcardId,
          nodeId: nextQuizNodeId,
          groupIndex: Math.floor(chunkStart / chunkSize),
          subStepIndex: 0,
          nodeType: 'QUIZ_GROUP',
          nodeIndex: nextNodeIndex,
          sessionId: sessionId ?? undefined,
        });
      } else {
        navigation.navigate('StudyJourney', { materialId: Number(materialId) });
      }
      return;
    }

    if (currentIndex < visibleWords.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setShowMeaning(false);
      spin.value = 0; // Reset hiệu ứng lật cho thẻ mới
      return;
    }

    const remainingCards = words.filter(w => !memorizedIds.includes(w.id));
    for (const card of remainingCards) {
      await markCardLearned({
        userId: user.id,
        materialId: materialId,
        flashcardId: Number(card.id),
      });
    }

    if (typeof nodeIndex === 'number' && user?.id) {
      try {
        await syncStudy({
          userId: user.id,
          materialId,
          currentNodeIndex: nodeIndex + 1,
          sessionId: sessionId ?? undefined,
        });
      } catch (error) {
        console.warn('Không đồng bộ lộ trình học:', error);
      }
    }

    if (typeof nextNodeIndex === 'number') {
      await updateDeckProgress(flashcardId, (current) => ({
        ...current,
        completedNodes: { ...current.completedNodes, [(nextNodeIndex - 1).toString()]: true },
        currentActiveNodeIndex: Math.max(current.currentActiveNodeIndex, nextNodeIndex),
        progressPercentage: 100,
      }));
    }
    if (nextQuizNodeId) {
      navigation.navigate('Quiz', {
        materialId,
        flashcardId,
        nodeId: nextQuizNodeId,
        groupIndex: Math.floor(chunkStart / chunkSize),
        subStepIndex: 0,
        nodeType: 'QUIZ_GROUP',
        nodeIndex: nextNodeIndex,
        sessionId: sessionId ?? undefined,
      });
    } else {
      navigation.navigate('StudyJourney', { materialId: Number(materialId) });
    }
  };

  const onMemoizedCard = async () => {
    if (!currentWord) return;
    const nextIds = [...memorizedIds, currentWord.id];
    const remainingWords = words.filter((word) => !nextIds.includes(word.id));

    if (user?.id && materialId) {
      try {
        const response = await markCardLearned({
          userId: user.id,
          materialId: materialId,
          flashcardId: Number(currentWord.id),
        });

        const localProgress = Math.round((nextIds.length / words.length) * 100);
        await updateDeckProgress(materialId.toString(), (current) => ({
          ...current,
          progressPercentage: response?.progress?.progress_percentage ?? localProgress,
        }));
      } catch (error) {
        console.warn('Không đồng bộ ghi nhớ thẻ:', error);
      }
    }

    setMemorizedIds(nextIds);
    setShowMeaning(false);
    spin.value = 0;
    if (remainingWords.length === 0) {
      setCurrentIndex(0);
      onNext();
      return;
    }
    setCurrentIndex((prev) => Math.min(prev, remainingWords.length - 1));
  };

  const handleConfirmExit = async () => {
    setShowExitConfirm(false);
    navigation.navigate('StudyJourney', { materialId: Number(materialId) });
  };

  // --- ANIMATED STYLES ---
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

  if (isLoading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  return (
    <ScreenContainer>
      <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
        
        {/* Wrapper chứa toàn bộ nội dung để đảm bảo không bị BottomNavigation đè */}
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
                {visibleWords.length === 0 ? 'Hoàn thành' : `${currentIndex + 1} / ${visibleWords.length}`}
              </Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          {/* Flashcard Area */}
          <View style={styles.cardArea}>
            {visibleWords.length > 0 ? (
              <View style={styles.cardContainer}>
                <TouchableOpacity activeOpacity={1} onPress={handleFlip} style={{ flex: 1 }}>
                  
                  {/* Mặt trước: Kanji */}
                  <Animated.View style={[styles.flashcard, frontAnimatedStyle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.cardLabel}><Text style={[styles.cardTypeText, { color: colors.primary }]}>KANJI</Text></View>
                    <Text style={[styles.kanjiText, { color: colors.text }]}>{currentWord.kanji}</Text>
                    <View style={styles.cardFooter}><Text style={{ color: colors.textSecondary }}>Chạm để lật thẻ</Text></View>
                  </Animated.View>

                  {/* Mặt sau: Nghĩa */}
                  <Animated.View style={[styles.flashcard, backAnimatedStyle, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                    <View style={styles.cardLabel}><Text style={{ color: '#FFF', opacity: 0.7 }}>NGHĨA</Text></View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={styles.hiraganaText}>{currentWord.hiragana}</Text>
                      <Text style={styles.meaningText}>{currentWord.meaning}</Text>
                    </View>
                    <View style={styles.cardFooter}>
                      <TouchableOpacity 
                        onPress={(e) => { e.stopPropagation(); playSound(currentWord.hiragana); }}
                        onLongPress={(e) => { e.stopPropagation(); playSound(currentWord.hiragana, true); }}
                      >
                        <Volume2 size={28} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </Animated.View>

                </TouchableOpacity>
              </View>
            ) : (
                <View style={styles.emptyCard}>
                    <CheckCircle2 size={60} color={colors.primary} />
                    <Text style={[styles.emptyText, { color: colors.text }]}>Đã xem hết thẻ!</Text>
                </View>
            )}
          </View>

          {/* Action Area - Vị trí an toàn không bị menu đè */}
          <View style={styles.actionArea}>
            <TouchableOpacity 
              onPress={onMemoizedCard}
              style={[styles.actionBtn, { backgroundColor: colors.primary + '15', flex: 1, marginRight: 12 }]}
            >
              <CheckCircle2 size={20} color={colors.primary} />
              <Text style={[styles.btnText, { color: colors.primary, marginLeft: 8 }]}>ĐÃ THUỘC</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={onNext}
              style={[styles.actionBtn, { backgroundColor: colors.primary, flex: 1.5 }]}
            >
              <Text style={[styles.btnText, { color: '#FFF' }]}>
                {currentIndex === visibleWords.length - 1 ? 'LÀM QUIZ' : 'TIẾP THEO'}
              </Text>
              <ChevronRight size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

        </View>

        <BottomNavigation activeTab="study" />
      </View>

      <ExitConfirmModal 
        visible={showExitConfirm} 
        onConfirm={handleConfirmExit} 
        onCancel={() => setShowExitConfirm(false)} 
      />
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
    marginBottom: 20 
  },
  closeBtn: { 
    width: 36, height: 36, borderRadius: 18, 
    justifyContent: 'center', alignItems: 'center', elevation: 2 
  },
  progressContainer: { flex: 1, marginHorizontal: 15, alignItems: 'center' },
  progressBg: { height: 6, width: '100%', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%' },
  progressText: { fontSize: 12, fontWeight: '700' },
  cardArea: { flex: 1, justifyContent: 'center' },
  cardContainer: { width: '100%', height: height * 0.48 },
  flashcard: { 
    flex: 1, borderRadius: 32, borderWidth: 1, padding: 24, 
    justifyContent: 'space-between', alignItems: 'center', 
    backfaceVisibility: 'hidden', elevation: 5,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, shadowRadius: 8
  },
  cardLabel: { width: '100%', alignItems: 'flex-start' },
  cardTypeText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  kanjiText: { fontSize: 54, fontWeight: '900', textAlign: 'center' },
  hiraganaText: { fontSize: 22, color: '#FFF', opacity: 0.9, marginBottom: 8 },
  meaningText: { fontSize: 32, color: '#FFF', fontWeight: '800', textAlign: 'center' },
  cardFooter: { width: '100%', alignItems: 'center' },
 actionArea: { 
    flexDirection: 'row', 
    marginTop: 10, 
    // Tăng giá trị này lên để vượt qua chiều cao của BottomNavigation (thường là 70-80px)
    marginBottom: Platform.OS === 'ios' ? 100 : 85, 
    alignItems: 'center',
    paddingHorizontal: 20, // Đảm bảo nút không sát mép màn hình
    zIndex: 10, // Đảm bảo lớp hiển thị nằm trên cùng
  },
  actionBtn: { 
    height: 58, borderRadius: 20, flexDirection: 'row', 
    justifyContent: 'center', alignItems: 'center' 
  },
  btnText: { fontWeight: '800', fontSize: 15 },
  emptyCard: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 18, fontWeight: 'bold', marginTop: 10 }
});