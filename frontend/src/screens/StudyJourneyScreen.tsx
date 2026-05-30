import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Platform,
  Modal,
  StyleSheet,
} from 'react-native';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  interpolate,
  cancelAnimation,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import SharkLoader from '../components/ui/SharkLoader';

import {
  Star,
  BookOpen,
  Check,
  ChevronUp,
  Link,
  Puzzle,
  ListTodo,
  Keyboard,
  RefreshCcw,
  Gift,
  Skull,
  Ghost,
  Lock,
  Crown,
} from 'lucide-react-native';

import { StackScreenProps } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStableCallback } from '../hooks/useStableCallback';
import Svg, { Path, G, Circle, Defs, Stop, RadialGradient, LinearGradient as SvgLinearGradient } from 'react-native-svg';

import { useAuthContext } from '../context/AuthContext';
import DuoHearts from '../components/quiz/DuoHearts';
import { useTheme } from '../context/ThemeContext';
import type { RootStackParamList } from '../components/AppNavigator';

import ScreenContainer from '../components/ScreenContainer';
import BottomNavigation from '../components/BottomNavigation';
import AppHeaderSearch from '../components/AppHeaderSearch';


import { getStudyPath, getFlashcards, updateStudyPathIndex, startStudy, saveNodeStars, getProfile, getMaterials } from '../api/api';
import { chunkVocabulary, generateJourneyNodes, VocabItem } from '../utils/journeyMap';

type StudyJourneyScreenProps = StackScreenProps<
  RootStackParamList,
  'StudyJourney'
>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MASCOT_SIZE = 78;

const getJourneyBackgroundColors = (isDark: boolean, progress: number): readonly [string, string, string] => {
  // Theme Xanh lá chủ đạo cố định cho toàn bộ hành trình
  return isDark
    ? ['#064E3B', '#065F46', '#047857'] as const // Xanh tối (Dark mode)
    : ['#ECFDF5', '#D1FAE5', '#A7F3D0'] as const; // Xanh sáng (Light mode)
};

// const getNodeLabel = (type: string) => {
//   switch (type) {
//     case 'FLASHCARD': return 'Học từ mới';
//     case 'MATCHING_KANA': return 'Nối từ - âm';
//     case 'MATCHING_MEANING': return 'Nối từ - nghĩa';
//     case 'MULTICHOICE': return 'Ghép câu';
//     case 'SPELLING': return 'Gõ chữ';
//     case 'REVIEW': return 'Ôn tập tổng hợp';
//     case 'FINAL_BOSS': return 'Thử thách cuối';
//     default: return 'Bài học';
//   }
// };

const getNodeColor = (type: string, isDark: boolean, isLocked?: boolean) => {
  if (isLocked) return isDark ? '#3C3C3C' : '#E5E5E5';
  if (type === 'FINAL_BOSS' || type === 'REVIEW') return isDark ? '#D97706' : '#F59E0B';
  if (type === 'SRS_REVIEW') return isDark ? '#D97706' : '#FBBF24';
  if (type === 'TREASURE_CHEST') return isDark ? '#B91C1C' : '#EF4444';
  return isDark ? '#458571' : '#58A68E';
};

const getNodeIcon = (type: string, isDark: boolean, color: string = 'white', isLocked?: boolean) => {
  const props = { color, size: 28 };
  if (isLocked) {
    return <Lock {...props} color={color === 'white' ? (isDark ? '#9CA3AF' : '#6B7280') : color} />;
  }
  switch (type) {
    case 'FLASHCARD': return <BookOpen {...props} size={32} />;
    case 'MATCH_HIRA':
    case 'MATCH_MEANING': return <Link {...props} />;
    case 'PRACTICE_2': return <Puzzle {...props} />;
    case 'PRACTICE_3': return <Keyboard {...props} />;
    case 'SRS_REVIEW': return <Star {...props} size={30} fill={color} />;
    case 'TREASURE_CHEST': return <Gift {...props} size={30} color={color === 'white' ? '#FFF' : color} />;
    case 'REVIEW': return <Ghost size={32} color={color === 'white' ? '#FFF' : color} />;
    case 'FINAL_BOSS':
      if (color === '#627380' || color === '#7A8691') {
        // Locked boss (Dark greyish color passed when isLocked is true)
        return <Skull size={32} color={color} />;
      }
      return <Skull size={34} color={color === 'white' ? '#FFF' : color} />;
    default: return <Star {...props} />;
  }
};

const handleNodePress = async (
  node: any,
  index: number,
  materialId: number,
  navigation: any,
  user?: any,
  isAlreadyCompleted?: boolean,
) => {
  if (!node || !navigation) return;

  let sessionId: string | undefined;
  if (user?.id) {
    try {
      const response = await startStudy(materialId, user.id);
      sessionId = response.sessionId;
    } catch (error) {
      console.warn('Failed to start study session:', error);
    }
  }

  if (node.nodeType === 'FLASHCARD') {
    navigation.navigate('Flashcard', {
      materialId: materialId,
      flashcardId: String(materialId),
      batchIndex: node.batchIndex ?? 0,
      nodeIndex: index,
      sessionId,
    });
    return;
  }

  const mapNodeTypeToQuizType = (type: string): string | undefined => {
    if (type === 'MATCH_HIRA') return 'MATCH_HIRA';
    if (type === 'MATCH_MEANING') return 'MATCH_MEANING';
    // PRACTICE_2: "Ngũ giác quan" → mixed mode, không truyền quizStepType
    // để useQuizScreen tự xử lý via nodeType === 'PRACTICE_2'
    if (type === 'PRACTICE_2') return undefined;
    // PRACTICE_3: "Gõ chữ" → mixed mode, không truyền quizStepType
    // để useQuizScreen tự xử lý via nodeType === 'PRACTICE_3'
    if (type === 'PRACTICE_3') return undefined;
    if (type === 'REVIEW') return 'REVIEW';
    if (type === 'FINAL_BOSS') return 'FINAL_BOSS';
    if (type === 'SRS_REVIEW') return 'MULTIPLE_CHOICE';
    return type;
  };

  navigation.navigate('Quiz', {
    materialId: materialId,
    flashcardId: String(materialId),
    nodeId: String(node.id),
    dueCardIds: node.dueCardIds,
    groupIndex: node.batchIndex ?? 0,
    subStepIndex: 0,
    nodeType: node.nodeType,
    quizStepType: mapNodeTypeToQuizType(node.nodeType) as any,
    nodeIndex: index,
    sessionId,
    isAlreadyCompleted,
  });
};

/* ====================================================================
   1. NODE ITEM: 3D ISOMETRIC "SIÊU LÚN" & GIA TỐC ĐÀN HỒI (SPRING BACK)
   ==================================================================== */
const NodeItem = React.memo(
  ({
    node,
    index,
    activeIdx,
    navigation,
    materialId,
    handleNodePress,
    zoomAnim,
    user,
    themeColors,
    isDark,
    stars = 0,
    forwardedRef,
  }: any) => {
    const isCompleted = index < activeIdx;
    const isActive = index === activeIdx;
    const isLocked = index > activeIdx;

    const nodeSize = 84;
    const DEPTH_3D = isActive ? 12 : 8;

    // ═══════════════════════════════════════════════════════
    // REANIMATED V3: Tất cả SharedValue chạy trên UI Thread
    // ═══════════════════════════════════════════════════════
    const pressProgress = useSharedValue(0);
    const breatheScale = useSharedValue(1);
    const glowProgress = useSharedValue(0);

    useEffect(() => {
      if (isActive && Platform.OS !== 'web') {
        // Nhịp thở tự nhiên sinh học — lặp vô hạn trên UI Thread
        breatheScale.value = withRepeat(
          withSequence(
            withTiming(1.05, { duration: 1200 }),
            withTiming(1.0, { duration: 1000 })
          ),
          -1, // -1 = lặp vô hạn
          false
        );

        // Vòng radar phát sáng — lặp vô hạn trên UI Thread
        glowProgress.value = withRepeat(
          withTiming(1, { duration: 2000, easing: Easing.linear }),
          -1,
          false
        );
      }

      return () => {
        // Cleanup: Dừng animation khi unmount hoặc không còn active
        cancelAnimation(breatheScale);
        cancelAnimation(glowProgress);
      };
    }, [isActive]);

    // ═══════════════════════════════════════════════════════
    // PRESS 3D: Hiệu ứng nhấn lún (Spring trên UI Thread)
    // ═══════════════════════════════════════════════════════
    const handlePressIn = useCallback(() => {
      pressProgress.value = withSpring(1, { damping: 8, stiffness: 160 });
    }, []);

    const handlePressOut = useCallback(() => {
      pressProgress.value = withSpring(0, { damping: 5, stiffness: 140 });
    }, []);

    // ═══════════════════════════════════════════════════════
    // ANIMATED STYLES (worklet — chạy trên UI Thread)
    // ═══════════════════════════════════════════════════════

    // Vòng radar vàng chính (lớn)
    const glowRing1Style = useAnimatedStyle(() => {
      const scale = breatheScale.value * interpolate(glowProgress.value, [0, 1], [1.0, 1.35]);
      const opacity = interpolate(
        glowProgress.value,
        [0, 0.1, 0.4, 1],
        [0, 0.5, 0.4, 0]
      );
      return {
        transform: [{ scale }],
        opacity,
      };
    });

    // Vòng radar đỏ phụ (nhỏ hơn)
    const glowRing2Style = useAnimatedStyle(() => {
      const scale = breatheScale.value * interpolate(glowProgress.value, [0, 1], [1.0, 1.2]);
      const opacity = interpolate(
        glowProgress.value,
        [0, 0.5, 1],
        [0, 0.6, 0]
      );
      return {
        transform: [{ scale }],
        opacity,
      };
    });

    // Đế 3D (chỉ cần scale theo breathe nếu active)
    const baseStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: isActive ? breatheScale.value : 1 }],
      };
    });

    // Nút bấm chính (3D press + breathe)
    const topButtonStyle = useAnimatedStyle(() => {
      const tY = interpolate(pressProgress.value, [0, 1], [0, DEPTH_3D]);
      const sX = interpolate(pressProgress.value, [0, 1], [1, isActive ? 1.06 : 1]);
      const sY = interpolate(pressProgress.value, [0, 1], [1, isActive ? 0.94 : 1]);
      return {
        transform: [
          { translateY: tY },
          { scaleX: sX },
          { scaleY: sY },
          { scale: isActive ? breatheScale.value : 1 },
        ],
      };
    });

    const breatheStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: breatheScale.value }],
      };
    });

    const baseColor = getNodeColor(node.nodeType, isDark, isLocked);

    const shadow3DColor = isLocked
      ? (isDark ? '#273138' : '#94A3B8')
      : (node.nodeType === 'FINAL_BOSS' || node.nodeType === 'REVIEW' ? (isDark ? '#9A3412' : '#B45309')
        : node.nodeType === 'SRS_REVIEW' ? (isDark ? '#B45309' : '#D97706')
          : (isDark ? '#2E5B4E' : '#417D6B'));

    return (
      <View
        style={[
          styles.nodeContainer,
          {
            left: node.left - nodeSize / 2,
            top: node.top - nodeSize / 2,
            width: nodeSize,
            height: nodeSize + 25,
            alignItems: 'center',
          },
        ]}
      >
        {/* VÒNG TRÒN HIỆU ỨNG LAN TỎA (FIRE AURA) — Reanimated */}
        {isActive && (
          <>
            <ReAnimated.View
              style={[
                styles.glowRing,
                {
                  width: nodeSize,
                  height: nodeSize,
                  borderColor: '#F59E0B',
                  borderWidth: 6,
                  position: 'absolute',
                  top: 0,
                  borderRadius: nodeSize / 2,
                },
                glowRing1Style,
              ]}
            />
            <ReAnimated.View
              style={[
                styles.glowRing,
                {
                  width: nodeSize,
                  height: nodeSize,
                  borderColor: '#EF4444',
                  borderWidth: 3,
                  position: 'absolute',
                  top: 0,
                  borderRadius: nodeSize / 2,
                },
                glowRing2Style,
              ]}
            />
          </>
        )}

        {/* LAYER STACK 3D - TẦNG DƯỚI (ĐẾ NỀN ĐỔ KHỐI) */}
        <ReAnimated.View
          style={[
            styles.node3DBase,
            {
              width: nodeSize,
              height: nodeSize,
              backgroundColor: shadow3DColor,
              borderRadius: nodeSize / 2,
              position: 'absolute',
              top: DEPTH_3D,
            },
            baseStyle,
          ]}
        />

        {/* LAYER STACK 3D - TẦNG TRÊN (NÚT BẤM CHÍNH) */}
        <ReAnimated.View
          style={[
            {
              width: nodeSize,
              height: nodeSize,
              zIndex: 2,
            },
            topButtonStyle,
          ]}
          ref={forwardedRef}
        >
          <TouchableOpacity
            activeOpacity={1}
            disabled={isLocked}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={() => handleNodePress(node, index, materialId, navigation, user, isCompleted)}
            style={[
              styles.node3DTop,
              {
                width: nodeSize,
                height: nodeSize,
                backgroundColor: baseColor,
                borderRadius: nodeSize / 2,
                justifyContent: 'center',
                alignItems: 'center',
              }
            ]}
          >
            {getNodeIcon(node.nodeType, isDark, isLocked ? (isDark ? '#627380' : '#7A8691') : 'white', isLocked)}
          </TouchableOpacity>

          {isActive && (
            <ReAnimated.View style={[
              { position: 'absolute', top: -35, alignSelf: 'center', alignItems: 'center', zIndex: 10 },
              breatheStyle
            ]}>

              {/* <View style={{ width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#EF4444' }} /> */}
            </ReAnimated.View>
          )}

          {isCompleted && (
            <View style={{ position: 'absolute', top: -22, alignSelf: 'center', backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
              {node.nodeType === 'FINAL_BOSS' || node.nodeType === 'FINAL_EXAM' ? (
                <View style={{ marginHorizontal: 4 }}>
                  <Crown size={22} color="#FBBF24" fill="#FBBF24" />
                </View>
              ) : (
                <>
                  <View style={{ transform: [{ rotate: '-15deg' }, { translateY: 2 }] }}>
                    <Star size={16} color={stars >= 1 ? '#FBBF24' : (isDark ? '#4B5563' : '#E5E7EB')} fill={stars >= 1 ? '#FBBF24' : (isDark ? '#4B5563' : '#E5E7EB')} />
                  </View>
                  <View style={{ transform: [{ translateY: -2 }], zIndex: 2, marginHorizontal: -2 }}>
                    <Star size={20} color={stars >= 2 ? '#FBBF24' : (isDark ? '#4B5563' : '#E5E7EB')} fill={stars >= 2 ? '#FBBF24' : (isDark ? '#4B5563' : '#E5E7EB')} />
                  </View>
                  <View style={{ transform: [{ rotate: '15deg' }, { translateY: 2 }] }}>
                    <Star size={16} color={stars >= 3 ? '#FBBF24' : (isDark ? '#4B5563' : '#E5E7EB')} fill={stars >= 3 ? '#FBBF24' : (isDark ? '#4B5563' : '#E5E7EB')} />
                  </View>
                </>
              )}
            </View>
          )}
        </ReAnimated.View>
      </View>
    );
  },
);

const Particle = ({ angle, explosionAnim }: { angle: number, explosionAnim: SharedValue<number> }) => {
  const dist = 100 + Math.random() * 80;
  const size = 20 + Math.random() * 20;

  const style = useAnimatedStyle(() => {
    return {
      opacity: interpolate(explosionAnim.value, [0, 0.1, 1], [0, 1, 0]),
      transform: [
        { translateX: Math.cos(angle) * dist * explosionAnim.value },
        { translateY: Math.sin(angle) * dist * explosionAnim.value },
        { scale: interpolate(explosionAnim.value, [0, 1], [0, 1]) },
        { rotate: `${explosionAnim.value * 360}deg` }
      ]
    };
  });

  return <ReAnimated.Image source={require('../../assets/avatar/evil_boss.png')} style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2 }, style]} />
};

const BossResultPopup = ({ isVisible, result, onHide, isDark }: { isVisible: boolean, result: 'win' | 'lose', onHide: () => void, isDark: boolean }) => {
  const scale = useSharedValue(0.1);
  const opacity = useSharedValue(0);
  const shatterScale = useSharedValue(1);
  const shakeX = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const explosionAnim = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      scale.value = 0.1;
      opacity.value = 0;
      shatterScale.value = 1;
      shakeX.value = 0;
      textOpacity.value = 0;
      explosionAnim.value = 0;

      opacity.value = withTiming(1, { duration: 300 });
      textOpacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, { damping: 12, stiffness: 90 });

      setTimeout(() => {
        if (result === 'win') {
          shakeX.value = withSequence(
            withTiming(-15, { duration: 50 }),
            withTiming(15, { duration: 50 }),
            withTiming(-15, { duration: 50 }),
            withTiming(15, { duration: 50 }),
            withTiming(0, { duration: 50 })
          );
          setTimeout(() => {
            shatterScale.value = withTiming(0.2, { duration: 150 });
            opacity.value = withTiming(0, { duration: 150 });
            explosionAnim.value = withTiming(1, { duration: 600 });
          }, 250);
        } else {
          shakeX.value = withRepeat(
            withSequence(
              withTiming(-5, { duration: 60 }),
              withTiming(5, { duration: 60 })
            ),
            4,
            false,
            () => { shakeX.value = withTiming(0); }
          );
        }
      }, 2000);
    }
  }, [isVisible, result]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { scale: scale.value * shatterScale.value },
        { translateX: shakeX.value }
      ],
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    return { opacity: textOpacity.value };
  });

  if (!isVisible) return null;

  return (
    <Modal transparent animationType="fade" visible={isVisible}>
      <View style={[styles.modalBackdrop, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.7)' }]}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <ReAnimated.View style={animatedStyle}>
            <Image source={require('../../assets/avatar/evil_boss.png')} style={{ width: 250, height: 250 }} resizeMode="contain" />
          </ReAnimated.View>
          {result === 'win' && Array.from({ length: 12 }).map((_, i) => (
            <Particle key={i} angle={(Math.PI * 2 * i) / 12} explosionAnim={explosionAnim} />
          ))}
        </View>
        <ReAnimated.View style={[{ marginTop: 20, alignItems: 'center' }, textAnimatedStyle]}>
          <Text style={{ fontSize: 32, fontWeight: '900', color: result === 'win' ? '#FBBF24' : '#EF4444', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>
            {result === 'win' ? 'CHIẾN THẮNG!' : 'THẤT BẠI!'}
          </Text>
          <Text style={{ fontSize: 16, color: '#FFF', marginTop: 10, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 }}>
            {result === 'win' ? 'Tà thú Kanji đã bị tiêu diệt!\nBạn xứng đáng nhận được Huy Hiệu Hoàng Gia!' : 'Boss quá mạnh!\nHãy luyện tập thêm và quay lại phục thù!'}
          </Text>
          <TouchableOpacity
            style={[styles.btnPrimary, { marginTop: 40, width: 200 }]}
            onPress={onHide}
          >
            <Text style={styles.btnText}>Tiếp tục</Text>
          </TouchableOpacity>
        </ReAnimated.View>
      </View>
    </Modal>
  );
};

export default function StudyJourneyScreen({
  route,
  navigation,
}: StudyJourneyScreenProps) {
  const { user, globalHearts, totalXp, refillHeartsWithXp, topUpCount, notificationCount, refreshNotificationCount, refreshUserStats } = useAuthContext();
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  const [isLoading, setIsLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [journeyData, setJourneyData] = useState<any | null>(null);
  const [searchText, setSearchText] = useState('');
  const [headerHeight, setHeaderHeight] = useState(240);

  const [scrollY, setScrollY] = useState(0);
  const lastScrollY = useRef(0);

  const [showOutOfHeartsModal, setShowOutOfHeartsModal] = useState(false);
  const [pendingNode, setPendingNode] = useState<any>(null);

  const [bossResultToShow, setBossResultToShow] = useState<'win' | 'lose' | null>(null);

  useEffect(() => {
    const bossRes = (route.params as any)?.bossResult;
    if (bossRes) {
      setBossResultToShow(bossRes);
      // Clear the param so it doesn't pop up again unnecessarily
      navigation.setParams({ bossResult: null } as any);
    }
  }, [route.params?.bossResult, navigation]);

  /* ====================================================================
     3. QUẢN LÝ THOẠI ĐỘNG (SPEECH BUBBLE CHUYÊN NGHIỆP)
     ==================================================================== */
  const [currentSpeech, setCurrentSpeech] = useState('Bắt đầu bài học thôi!');

  const mascotSpeeches = useMemo(() => [
    "Hôm nay trời đẹp để học nè! 🔥",
    "Tuyệt vời! Chặng đua mới đang chờ!",
    "Đừng dừng lại, bạn đang làm rất tốt! ",
    "Sắp tới chặng kết rồi, cố lên!",
    "Bứt phá giới hạn cùng Samekun nào! ✨",
  ], []);

  // Thay đổi câu thoại ngẫu nhiên cứ sau mỗi 7 giây để tạo cảm giác linh hoạt
  useEffect(() => {
    const speechInterval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * mascotSpeeches.length);
      setCurrentSpeech(mascotSpeeches[randomIndex]);
    }, 10000);

    return () => clearInterval(speechInterval);
  }, [mascotSpeeches]);

  const mascotSource = require('../../assets/sharkMagic.png');

  const [activeMaterialId, setActiveMaterialId] = useState<number | null>(route.params?.materialId ?? null);

  useEffect(() => {
    setActiveMaterialId(route.params?.materialId ?? null);
  }, [route.params?.materialId]);

  // ═══════════════════════════════════════════════════════════════
  // MASCOT ANIMATIONS — REANIMATED V3 (chạy hoàn toàn trên UI Thread)
  // ═══════════════════════════════════════════════════════════════
  const mascotX = useSharedValue(SCREEN_WIDTH / 2);
  const mascotY = useSharedValue(200);
  const jumpVal = useSharedValue(0);
  const zoomVal = useSharedValue(1);
  const breathVal = useSharedValue(1);
  const scrollViewRef = useRef<ScrollView | null>(null);

  const { activePathD, inactivePathD } = useMemo(() => {
    const nodes = journeyData?.journeyNodes;
    const activeIdx = journeyData?.currentActiveNodeIndex ?? 0;

    if (!nodes || nodes.length < 2) {
      return { activePathD: '', inactivePathD: '' };
    }

    let activePath = '';
    let inactivePath = '';

    for (let i = 0; i < nodes.length - 1; i++) {
      const curr = nodes[i];
      const next = nodes[i + 1];
      const midY = (curr.top + next.top) / 2;

      const segment = `
        M ${curr.left} ${curr.top}
        C ${curr.left} ${midY}, ${next.left} ${midY}, ${next.left} ${next.top}
      `;

      if (i < activeIdx) {
        activePath += segment;
      } else {
        inactivePath += segment;
      }
    }

    return { activePathD: activePath, inactivePathD: inactivePath };
  }, [journeyData]);

  // Nhịp nhảy & thở mascot — lặp vô hạn trên UI Thread (chỉ chạy trên Mobile để tối ưu Web)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    jumpVal.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 900 }),
        withTiming(0, { duration: 800 })
      ),
      -1,
      false
    );

    breathVal.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1200 }),
        withTiming(1.0, { duration: 1200 })
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(jumpVal);
      cancelAnimation(breathVal);
    };
  }, []);

  // Animated style cho toàn bộ mascot wrapper (vị trí + nhảy + thở)
  const mascotAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: mascotX.value },
        { translateY: mascotY.value },
        { translateX: -MASCOT_SIZE / 2 },
        { translateY: jumpVal.value },
        { scale: breathVal.value * zoomVal.value },
      ],
    };
  });

  // Animated style cho bóng mascot (co lại khi nhảy lên)
  const shadowAnimatedStyle = useAnimatedStyle(() => {
    const s = interpolate(jumpVal.value, [-12, 0], [0.7, 1], 'clamp');
    return {
      transform: [{ scale: s }],
    };
  });

  const triggerHapticOnLand = useCallback(() => {
    if (Platform.OS !== 'web' && Haptics && typeof Haptics.impactAsync === 'function') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
    }
  }, []);

  const focusActiveNode = useCallback(
    (activeNode: any) => {
      if (!activeNode) return;

      const visibleHeight = SCREEN_HEIGHT - headerHeight;
      const nodeCenterOffset = 84 / 2;
      const targetY = Math.max(0, activeNode.top - visibleHeight / 2 + nodeCenterOffset);

      scrollViewRef.current?.scrollTo({
        x: 0,
        y: targetY,
        animated: true,
      });

      // Di chuyển ngang — chạy trên UI Thread
      mascotX.value = withTiming(activeNode.left, { duration: 500 });

      // Nhảy parabol rồi rơi xuống — chạy trên UI Thread
      mascotY.value = withSequence(
        withTiming(activeNode.top - 200, { duration: 250 }),
        withSpring(activeNode.top - 110, { damping: 10, stiffness: 60 }, () => {
          // Callback chạy trong worklet → cần runOnJS để gọi hàm JS
          runOnJS(triggerHapticOnLand)();
        })
      );

      // Zoom nhẹ khi đáp trúng node
      zoomVal.value = withSequence(
        withTiming(1.25, { duration: 400 }),
        withSpring(1.15, { damping: 6, stiffness: 100 })
      );
    },
    [headerHeight, triggerHapticOnLand],
  );

  const [showTreasureModal, setShowTreasureModal] = useState(false);
  const [chestOpened, setChestOpened] = useState(false);
  const [chestReward, setChestReward] = useState<{ type: 'XP' | 'HEART', amount: number } | null>(null);
  const [selectedChestIndex, setSelectedChestIndex] = useState<number | null>(null);

  const onNodePressWrapper = useStableCallback(
    (node: any, index: number, matId: number, nav: any, currentUser?: any, isAlreadyCompleted?: boolean) => {
      if (node.nodeType === 'TREASURE_CHEST') {
        if (!isAlreadyCompleted) {
          setChestOpened(false);
          setChestReward(null);
          setSelectedChestIndex(null);
          setShowTreasureModal(true);
        }
        return;
      }

      if (globalHearts === 0 && node.nodeType !== 'FLASHCARD') {
        setPendingNode({ node, index, matId, nav, currentUser, isAlreadyCompleted });
        setShowOutOfHeartsModal(true);
        return;
      }
      handleNodePress(node, index, matId, nav, currentUser, isAlreadyCompleted);
    }
  );

  const handleBuyHeart = async () => {
    const triggerHaptic = (type: Haptics.NotificationFeedbackType) => {
      if (Platform.OS !== 'web' && Haptics && typeof Haptics.notificationAsync === 'function') {
        try {
          Haptics.notificationAsync(type).catch(() => { });
        } catch (e) {
          console.warn('Haptic notification failed:', e);
        }
      }
    };

    if (topUpCount >= 3) {
      triggerHaptic(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (totalXp >= 200) {
      await refillHeartsWithXp(1, 200);
      triggerHaptic(Haptics.NotificationFeedbackType.Success);
      setShowOutOfHeartsModal(false);
      if (pendingNode) {
        handleNodePress(pendingNode.node, pendingNode.index, pendingNode.matId, pendingNode.nav, pendingNode.currentUser, pendingNode.isAlreadyCompleted);
        setPendingNode(null);
      }
    } else {
      triggerHaptic(Haptics.NotificationFeedbackType.Error);
    }
  };

  const loadJourney = useCallback(async () => {
    try {
      if (!user?.id) return;

      let targetMaterialId: number = activeMaterialId ?? 0;
      if (targetMaterialId === 0) {
        const [profileRes, matsRes] = await Promise.all([
          getProfile(user.id),
          getMaterials(user.id)
        ]);
        const recentQuizzes = profileRes?.recentQuizzes || [];
        const allMaterials = matsRes?.materials || [];

        let foundId: number | null = null;
        if (recentQuizzes.length > 0) {
          foundId = Number(recentQuizzes[0].material_id || recentQuizzes[0].materialId);
        }

        if (!foundId || !allMaterials.find((m: any) => m.id === foundId)) {
          const inProgress = allMaterials.find((m: any) => m.status === 'in_progress');
          if (inProgress) foundId = inProgress.id;
          else if (allMaterials.length > 0) foundId = allMaterials[0].id;
        }

        targetMaterialId = foundId || 1;
        setActiveMaterialId(targetMaterialId);
      }

      const [cardsResponse, studyPathData] = await Promise.all([
        getFlashcards(targetMaterialId, user.id),
        getStudyPath(user.id, targetMaterialId)
      ]);

      let vocabList = (Array.isArray(cardsResponse) ? cardsResponse : cardsResponse.data || cardsResponse.flashcards || []) as VocabItem[];

      // Bổ sung từ vựng ngẫu nhiên từ mockdata nếu bộ từ vựng có ít hơn 5 từ để đảm bảo Quiz không bị lỗi
      if (vocabList.length > 0 && vocabList.length < 5) {
        const MOCK_WORDS = require('../mockdata').MOCK_VOCAB_DATA['n3-verb-1'].words;
        const needed = 5 - vocabList.length;
        const availableMocks = MOCK_WORDS.filter((mw: any) => !vocabList.some(vw => vw.kanji === mw.kanji || vw.word === mw.kanji));
        const shuffled = [...availableMocks].sort(() => 0.5 - Math.random());
        const selectedMocks = shuffled.slice(0, needed).map((mw: any, idx: number) => ({
          id: `mock-${mw.id}-${Date.now()}-${idx}`,
          word: mw.kanji,
          kanji: mw.kanji,
          hiragana: mw.hiragana,
          reading: mw.hiragana,
          meaning: mw.meaning,
          is_learned: 0
        }));
        vocabList = [...vocabList, ...selectedMocks];
      }

      const chunks = chunkVocabulary(vocabList);
      const journeyNodes = generateJourneyNodes(chunks);

      let currentActiveNodeIndex = studyPathData?.currentActiveNodeIndex || 0;
      if (currentActiveNodeIndex > journeyNodes.length) {
        currentActiveNodeIndex = journeyNodes.length;
      }

      const passedNodeIndex = (route.params as any)?.completedNodeIndex;
      if (passedNodeIndex !== undefined && passedNodeIndex > currentActiveNodeIndex) {
        currentActiveNodeIndex = passedNodeIndex;
        if (targetMaterialId) await updateStudyPathIndex(user.id, targetMaterialId, passedNodeIndex);
      }

      const data = {
        material: studyPathData?.material || { title: 'TIẾN ĐỘ HỌC TẬP' },
        progressPercentage: studyPathData?.progressPercentage || 0,
        journeyNodes,
        currentActiveNodeIndex,
        nodeStars: studyPathData?.nodeStars || {},
      };

      setJourneyData(data);
      setIsLoading(false);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  }, [user?.id, activeMaterialId, route.params]);

  useFocusEffect(
    useCallback(() => {
      loadJourney();
      refreshNotificationCount();
      refreshUserStats();
    }, [loadJourney, refreshNotificationCount, refreshUserStats]),
  );

  useEffect(() => {
    if (!journeyData?.journeyNodes?.length) return;

    const activeIdx = Math.min(
      Math.max(journeyData.currentActiveNodeIndex ?? 0, 0),
      journeyData.journeyNodes.length - 1,
    );

    const activeNode = journeyData.journeyNodes[activeIdx];
    if (!activeNode) return;

    const timer = setTimeout(() => {
      focusActiveNode(activeNode);
    }, 400);

    return () => clearTimeout(timer);
  }, [journeyData, focusActiveNode]);

  const handleScroll = useStableCallback((e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    setShowScrollTop(y > 400);
    // Only update scrollY state when it shifts by more than 150px to avoid excessive re-renders
    if (Math.abs(y - lastScrollY.current) > 150) {
      lastScrollY.current = y;
      setScrollY(y);
    }
  });

  if (isLoading || !journeyData) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <SharkLoader size="small" message="" />
      </View>
    );
  }

  return (
    <ScreenContainer>
      <View style={[styles.screenBackground, { backgroundColor: colors.background }]}>

        {/* FIXED HEADER */}
        <View
          style={[styles.fixedHeader, { backgroundColor: colors.card, borderBottomColor: isDark ? '#1E293B' : '#F1F5F9' }]}
          onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        >
          <AppHeaderSearch
            displayName={user?.username || 'Bạn học'}
            searchText={searchText}
            onChangeSearchText={setSearchText}
            onSubmitSearch={() =>
              searchText.trim() &&
              navigation.navigate('Dictionary', { query: searchText.trim() })
            }
            userXp={totalXp}
            notificationCount={notificationCount}
            onNotificationPress={() => navigation.navigate('Notifications')}
          />

          <View style={[styles.progressCardContainer, { backgroundColor: colors.card, borderColor: isDark ? '#334155' : '#F1F5F9' }]}>
            <View style={styles.progressCardHeader}>
              <View style={styles.titleWithIcon}>
                <Star size={16} color="#F59E0B" fill="#F59E0B" style={{ marginRight: 6 }} />
                <Text style={[styles.deckTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>TIẾN ĐỘ HỌC TẬP</Text>
              </View>
              <Text style={[styles.progressText, { color: isDark ? '#34D399' : '#059669' }]}>{journeyData.progressPercentage}%</Text>
            </View>

            <View style={styles.progressContentRow}>
              <View style={[styles.progressBarContainer, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${journeyData.progressPercentage}%`,
                      backgroundColor: isDark ? '#458571' : '#58A68E'
                    },
                  ]}
                />
              </View>

              <View style={styles.heartWrapperInside}>
                <DuoHearts />
              </View>
            </View>
          </View>
        </View>

        {/* MAP HỌC TẬP */}
        <View style={[styles.mapSection, { marginTop: headerHeight }]}>
          <LinearGradient
            colors={getJourneyBackgroundColors(isDark, journeyData.progressPercentage)}
            start={{ x: 1.2, y: -0.5 }}
            end={{ x: 1.9, y: 2 }}
            style={styles.journeyBackground}
          />
          <Svg
            style={styles.decorSvg}
            width="100%"
            height="100%"
            viewBox={`0 0 ${SCREEN_WIDTH} ${SCREEN_HEIGHT}`}
            preserveAspectRatio="xMidYMid slice"
            pointerEvents="none"
          >
            <Defs>
              {/* Gradient cho Mây */}
              <SvgLinearGradient id="cloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={isDark ? '#38bdf8' : '#10b881'} stopOpacity={isDark ? 0.12 : 0.08} />
                <Stop offset="100%" stopColor={isDark ? '#38bdf8' : '#10b881'} stopOpacity={0} />
              </SvgLinearGradient>

              {/* Gradient cho Hành tinh */}
              <RadialGradient id="planetGrad" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor={isDark ? '#38bdf8' : '#34d399'} stopOpacity={isDark ? 0.25 : 0.2} />
                <Stop offset="100%" stopColor={isDark ? '#0284c7' : '#059669'} stopOpacity={isDark ? 0.05 : 0.02} />
              </RadialGradient>
            </Defs>

            {/*================ HÌNH KHỐI 1: CỤM MÂY HOẠT HÌNH UỐN LƯỢN (GÓC TRÊN TRÁI) ================*/}
            {/* Đã tinh chỉnh bo tròn mượt hơn, đổ bóng mờ bằng dải màu gradient */}
            <Path
              d="M20 70 C 35 50, 65 50, 75 65 C 90 45, 120 45, 135 65 C 150 50, 180 55, 190 75 C 200 95, 185 115, 150 115 L40 115 C 15 115, 5 95, 20 70 Z"
              fill="url(#cloudGrad)"
              stroke={isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(16, 185, 129, 0.15)'}
              strokeWidth={1.5}
            />

            {/*================ HÌNH KHỐI 2: DẢI SÓNG NĂNG LƯỢNG CHẠY DỌC THEO MÀN HÌNH ================*/}
            {/* Đã nâng tọa độ Y xuống giữa màn hình (tầm 40% - 50% chiều cao) để cân bằng bố cục */}
            <Path
              d={`M -20 ${SCREEN_HEIGHT * 0.4} Q ${SCREEN_WIDTH * 0.25} ${SCREEN_HEIGHT * 0.35}, ${SCREEN_WIDTH * 0.5} ${SCREEN_HEIGHT * 0.43} T ${SCREEN_WIDTH + 20} ${SCREEN_HEIGHT * 0.4}`}
              stroke={isDark ? 'rgba(56, 189, 248, 0.18)' : 'rgba(16, 185, 129, 0.15)'}
              strokeWidth={2}
              fill="none"
            />
            {/* Đường sóng kép nét đứt song song */}
            <Path
              d={`M -20 ${SCREEN_HEIGHT * 0.42} Q ${SCREEN_WIDTH * 0.25} ${SCREEN_HEIGHT * 0.37}, ${SCREEN_WIDTH * 0.5} ${SCREEN_HEIGHT * 0.45} T ${SCREEN_WIDTH + 20} ${SCREEN_HEIGHT * 0.42}`}
              stroke={isDark ? 'rgba(34, 211, 238, 0.12)' : 'rgba(52, 211, 153, 0.1)'}
              strokeWidth={1.2}
              strokeDasharray="8,8"
              fill="none"
            />

            {/*================ HÌNH KHỐI 3: CÁC NGÔI SAO LẤP LÁNH (RẢI ĐỀU THEO CHIỀU SÂU) ================*/}
            {/* Ngôi sao to - Nằm góc trên phải */}
            <Path
              d={`M ${SCREEN_WIDTH * 0.75} 120 Q ${SCREEN_WIDTH * 0.75} 132, ${SCREEN_WIDTH * 0.85 + 22} 132 Q ${SCREEN_WIDTH * 0.76} 132, ${SCREEN_WIDTH * 0.75} 144 Q ${SCREEN_WIDTH * 0.75} 162, ${SCREEN_WIDTH * 0.75 - 12} 132 Q ${SCREEN_WIDTH * 0.75} 132, ${SCREEN_WIDTH * 0.75} 120 Z`}
              fill={isDark ? 'rgba(253, 224, 71, 0.35)' : 'rgba(251, 191, 36, 0.25)'}
            />
            {/* Ngôi sao vừa - Giữa màn hình */}
            <Path
              d={`M 60 ${SCREEN_HEIGHT * 0.55} Q 60 ${SCREEN_HEIGHT * 0.55 + 8}, 68 ${SCREEN_HEIGHT * 0.55 + 8} Q 60 ${SCREEN_HEIGHT * 0.55 + 8}, 60 ${SCREEN_HEIGHT * 0.55 + 16} Q 60 ${SCREEN_HEIGHT * 0.55 + 8}, 52 ${SCREEN_HEIGHT * 0.55 + 8} Q 60 ${SCREEN_HEIGHT * 0.55 + 8}, 60 ${SCREEN_HEIGHT * 0.55} Z`}
              fill={isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(16, 185, 129, 0.28)'}
            />
            {/* Ngôi sao nhỏ - Góc dưới màn hình */}
            <Path
              d={`M ${SCREEN_WIDTH * 0.8} ${SCREEN_HEIGHT * 0.8} Q ${SCREEN_WIDTH * 0.8} ${SCREEN_HEIGHT * 0.8 + 6}, ${SCREEN_WIDTH * 0.8 + 6} ${SCREEN_HEIGHT * 0.8 + 6} Q ${SCREEN_WIDTH * 0.8} ${SCREEN_HEIGHT * 0.8 + 6}, ${SCREEN_WIDTH * 0.8} ${SCREEN_HEIGHT * 0.8 + 12} Q ${SCREEN_WIDTH * 0.8} ${SCREEN_HEIGHT * 0.8 + 6}, ${SCREEN_WIDTH * 0.8 - 6} ${SCREEN_HEIGHT * 0.8 + 6} Q ${SCREEN_WIDTH * 0.8} ${SCREEN_HEIGHT * 0.8 + 6}, ${SCREEN_WIDTH * 0.8} ${SCREEN_HEIGHT * 0.8} Z`}
              fill={isDark ? 'rgba(34, 211, 238, 0.3)' : 'rgba(52, 211, 153, 0.22)'}
            />

            {/*================ HÌNH KHỐI 4: HÀNH TINH CÓ VÒNG NHẪN ELIP (GÓC GIỮA TRÁI) ================*/}
            <G transform={`translate(60, ${SCREEN_HEIGHT * 0.25}) rotate(-15)`}>
              {/* Vòng nhẫn elip mượt */}
              <Path
                d="M -35 0 C -35 -15, 35 -15, 35 0 C 35 15, -35 15, -35 0 Z"
                stroke={isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(14, 165, 233, 0.2)'}
                strokeWidth={1.5}
                fill="none"
              />
              {/* Tâm hành tinh có gradient tạo độ khối tròn */}
              <Circle cx="0" cy="0" r="14" fill="url(#planetGrad)" />
            </G>

            {/*================ HÌNH KHỐI 5: CÁC HẠT BỤI NĂNG LƯỢNG BAY PHÂN TÁN ================*/}
            <Circle cx={SCREEN_WIDTH * 0.2} cy={SCREEN_HEIGHT * 0.18} r="3" fill={isDark ? 'rgba(83,255,213,0.3)' : 'rgba(16,185,129,0.2)'} />
            <Circle cx={SCREEN_WIDTH * 0.85} cy={SCREEN_HEIGHT * 0.28} r="1.5" fill={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.12)'} />
            <Circle cx={SCREEN_WIDTH * 0.15} cy={SCREEN_HEIGHT * 0.65} r="4" fill={isDark ? 'rgba(56,189,248,0.2)' : 'rgba(16,185,129,0.15)'} />
            <Circle cx={SCREEN_WIDTH * 0.7} cy={SCREEN_HEIGHT * 0.62} r="2.5" fill={isDark ? 'rgba(83,255,213,0.35)' : 'rgba(52,211,153,0.25)'} />
            <Circle cx={SCREEN_WIDTH * 0.4} cy={SCREEN_HEIGHT * 0.85} r="3.5" fill={isDark ? 'rgba(56,189,248,0.15)' : 'rgba(16,185,129,0.1)'} />

            {/*================ HÌNH KHỐI 6: CỤM CHỮ X VÀ TAM GIÁC DECOR HÌNH HỌC ================*/}
            {/* Dấu gạch chéo cụm trang trí ở phần dưới màn hình */}
            <G transform={`translate(${SCREEN_WIDTH * 0.25}, ${SCREEN_HEIGHT * 0.75})`}>
              <Path d="M -6 -6 L 6 6 M 6 -6 L -6 6" stroke={isDark ? 'rgba(56,189,248,0.3)' : 'rgba(16,185,129,0.25)'} strokeWidth={2} />
            </G>
            {/* Hình tam giác rỗng nhỏ gọn góc trên phải */}
            <G transform={`translate(${SCREEN_WIDTH * 0.85}, ${SCREEN_HEIGHT * 0.48})`}>
              <Path d="M 0 -7 L 7 6 L -7 6 Z" stroke={isDark ? 'rgba(83,255,213,0.25)' : 'rgba(52,211,153,0.2)'} strokeWidth={1.5} fill="none" />
            </G>
          </Svg>
          <ScrollView
            ref={scrollViewRef}
            style={styles.mapScroll}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={32}
            onScroll={handleScroll}
            contentContainerStyle={{
              paddingTop: 30,
              paddingBottom: 240,
              minHeight: journeyData.journeyNodes?.length
                ? journeyData.journeyNodes[journeyData.journeyNodes.length - 1].top + 400
                : SCREEN_HEIGHT,
            }}
          >
            <Svg
              style={StyleSheet.absoluteFill}
              width={SCREEN_WIDTH}
              height={journeyData.journeyNodes?.length ? journeyData.journeyNodes[journeyData.journeyNodes.length - 1].top + 400 : SCREEN_HEIGHT}
            >
              {activePathD && (
                <Path d={activePathD} stroke={isDark ? '#F59E0B' : '#FBBF24'} strokeWidth={7} fill="none" strokeLinecap="round" />
              )}
              {inactivePathD && (
                <Path d={inactivePathD} stroke={isDark ? '#334155' : '#CBD5E1'} strokeWidth={6} fill="none" strokeDasharray="8,8" strokeLinecap="round" />
              )}
            </Svg>

            {/* MASCOT CHỨA VÒM HỘI THOẠI ĐỘNG (SPEECH BUBBLE) — Reanimated */}
            <ReAnimated.View
              pointerEvents="none"
              style={[
                styles.mascotWrapper,
                mascotAnimatedStyle,
              ]}
            >
              {/* SPEECH BUBBLE */}
              <View style={[styles.speechBubble, { backgroundColor: colors.card, borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                <Text style={[styles.speechText, { color: colors.text }]}>{currentSpeech}</Text>
                {/* Mũi tên nhọn phía dưới bong bóng thoại */}
                <View style={[styles.speechArrow, { borderTopColor: colors.card }]} />
                <View style={[styles.speechArrowBorder, { borderTopColor: isDark ? '#334155' : '#E2E8F0' }]} />
              </View>

              <Image source={mascotSource} style={styles.mascotImg} />
              <ReAnimated.View style={[styles.mascotShadow, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)' }, shadowAnimatedStyle]} />
            </ReAnimated.View>

            {journeyData.journeyNodes.map((node: any, index: number) => {
              const stars = journeyData.nodeStars?.[node.id] || 0;

              // Lazy render: only render nodes within visible window (plus a generous buffer of 1.5 screen heights)
              const minVisibleY = scrollY - SCREEN_HEIGHT * 1.5;
              const maxVisibleY = scrollY + SCREEN_HEIGHT * 2.5;
              const isVisible = index === journeyData.currentActiveNodeIndex || (node.top >= minVisibleY && node.top <= maxVisibleY);

              if (!isVisible) return null;

              return (
                <NodeItem
                  key={`${node.id}-${index}`}
                  node={node}
                  index={index}
                  activeIdx={journeyData.currentActiveNodeIndex ?? 0}
                  navigation={navigation}
                  materialId={activeMaterialId}
                  handleNodePress={onNodePressWrapper}
                  user={user}
                  themeColors={colors}
                  isDark={isDark}
                  stars={stars}
                />
              );
            })}
          </ScrollView>
        </View>

        {showScrollTop && (
          <TouchableOpacity
            style={[styles.btnBackToActive, { backgroundColor: isDark ? '#458571' : '#58A68E' }]}
            onPress={() => {
              const activeIndex = journeyData.currentActiveNodeIndex ?? 0;
              const targetIndex = Math.min(activeIndex, journeyData.journeyNodes.length - 1);
              focusActiveNode(journeyData.journeyNodes[targetIndex]);
            }}
          >
            <ChevronUp size={24} color="white" />
          </TouchableOpacity>
        )}


      </View>

      {/* POPUP HẾT TIM */}
      <Modal visible={showOutOfHeartsModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Image source={require('../../assets/sharkCry.png')} style={styles.modalImage} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Bạn hiện đã hết tim!</Text>
            <Text style={[styles.modalText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Hãy đổi 200 XP lấy 1 tim mới hoặc đợi đến ngày hôm sau để hệ thống tự động reset miễn phí.
            </Text>

            <TouchableOpacity
              style={[styles.btnPrimary, (totalXp < 200 || topUpCount >= 3) && styles.btnDisabled]}
              onPress={handleBuyHeart}
              disabled={totalXp < 200 || topUpCount >= 3}
            >
              <Text style={styles.btnText}>Đổi 1 Tim - 200 XP</Text>
              {totalXp < 200 && (
                <View style={styles.disabledBadge}>
                  <Text style={styles.disabledBadgeText}>Không đủ XP</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnSecondary, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}
              onPress={() => {
                setShowOutOfHeartsModal(false);
                setPendingNode(null);
              }}
            >
              <Text style={[styles.btnSecondaryText, { color: isDark ? '#94A3B8' : '#64748B' }]}>Để sau</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* POPUP RƯƠNG BÁU */}
      <Modal visible={showTreasureModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, paddingVertical: 40 }]}>
            {!chestOpened ? (
              <>
                <Text style={[styles.modalTitle, { color: colors.text, fontSize: 24, marginBottom: 10 }]}>Chọn 1 hộp quà!</Text>
                <Text style={[styles.modalText, { color: isDark ? '#94A3B8' : '#64748B', textAlign: 'center', marginBottom: 30 }]}>
                  Bạn tìm thấy 3 hộp quà bí ẩn. Hãy chọn 1 hộp để nhận thưởng!
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 20 }}>
                  {[0, 1, 2].map((idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={{ padding: 15, backgroundColor: isDark ? '#334155' : '#F1F5F9', borderRadius: 16 }}
                      onPress={() => {
                        setSelectedChestIndex(idx);
                        // Tỉ lệ 30% ra Tim, 70% ra 50 XP
                        const isHeart = Math.random() > 0.7;
                        setChestReward(isHeart ? { type: 'HEART', amount: 1 } : { type: 'XP', amount: 50 });
                        setChestOpened(true);
                        if (Platform.OS !== 'web' && Haptics && typeof Haptics.notificationAsync === 'function') {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
                        }
                      }}
                    >
                      <Gift size={48} color={isDark ? '#F59E0B' : '#D97706'} />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <>
                {chestReward?.type === 'HEART' ? (
                  <Star size={64} color="#EF4444" fill="#EF4444" style={{ marginBottom: 20 }} />
                ) : (
                  <Star size={64} color="#3B82F6" fill="#3B82F6" style={{ marginBottom: 20 }} />
                )}

                <Text style={[styles.modalTitle, { color: colors.text, fontSize: 24 }]}>Chúc mừng!</Text>
                <Text style={[styles.modalText, { color: isDark ? '#94A3B8' : '#64748B', textAlign: 'center', marginBottom: 30 }]}>
                  Bạn nhận được {chestReward?.amount} {chestReward?.type === 'HEART' ? 'Tim' : 'XP'}!
                </Text>

                <TouchableOpacity
                  style={[styles.btnPrimary, { backgroundColor: '#10B981' }]}
                  onPress={async () => {
                    setShowTreasureModal(false);
                    if (user?.id && journeyData) {
                      const activeNode = journeyData.journeyNodes[journeyData.currentActiveNodeIndex];
                      if (activeNode) {
                        try {
                          await saveNodeStars({
                            userId: user.id,
                            materialId: activeMaterialId || 1,
                            nodeId: activeNode.id,
                            stars: 3
                          });
                          const newNodeStars = { ...journeyData.nodeStars, [activeNode.id]: 3 };
                          setJourneyData((prev: any) => prev ? ({ ...prev, nodeStars: newNodeStars }) : null);
                        } catch (e) {
                          console.warn('Lỗi lưu sao quà tặng:', e);
                        }
                      }
                      const nextIndex = journeyData.currentActiveNodeIndex + 1;
                      setJourneyData((prev: any) => prev ? ({ ...prev, currentActiveNodeIndex: nextIndex }) : null);
                      if (activeMaterialId) await updateStudyPathIndex(user.id, activeMaterialId, nextIndex);
                    }
                  }}
                >
                  <Text style={styles.btnText}>Tiếp tục hành trình</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL KẾT QUẢ BOSS */}
      <BossResultPopup
        isVisible={!!bossResultToShow}
        result={bossResultToShow!}
        onHide={() => setBossResultToShow(null)}
        isDark={isDark}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenBackground: {
    flex: 1,
  },
  mapSection: {
    flex: 1,
    position: 'relative',
  },
  journeyBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  decorSvg: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  mapScroll: {
    flex: 1,
    zIndex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 0,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  progressCardContainer: {
    borderRadius: 18,
    padding: 14,
    marginTop: 6,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  progressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deckTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  progressText: {
    fontWeight: '900',
    fontSize: 15,
  },
  progressContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressBarContainer: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  heartWrapperInside: {
    minWidth: 80,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  nodeContainer: {
    position: 'absolute',
    zIndex: 5,
    alignItems: 'center',
  },
  /* KIẾN TRÚC LAYER STACK 3D */
  node3DBase: {
    // Không dùng thuộc tính border bottom cũ, tạo thành 1 khối vững chắc nằm dưới
  },
  node3DTop: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  glowRing: {
    position: 'absolute',
    borderRadius: 100,
    borderWidth: 4,
    top: -4,
    left: -4,
    zIndex: -1,
  },
  completedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'white',
    zIndex: 10,
  },
  labelCard: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    width: 110,
    alignSelf: 'center',
  },
  labelCardText: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  /* SPEECH BUBBLE & MASCOT */
  mascotWrapper: {
    position: 'absolute',
    width: MASCOT_SIZE,
    zIndex: 20,
    alignItems: 'center',
  },
  speechBubble: {
    position: 'absolute',
    top: -70, // Đặt bong bóng hội thoại nằm phía trên đầu Mascot
    minWidth: 140,
    maxWidth: 180,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  speechText: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 14,
  },
  speechArrow: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    zIndex: 2,
  },
  speechArrowBorder: {
    position: 'absolute',
    bottom: -11,
    left: '50%',
    marginLeft: -9,
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    zIndex: 1,
  },
  mascotImg: {
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
    resizeMode: 'contain',
  },
  mascotShadow: {
    width: 40,
    height: 10,
    borderRadius: 20,
    marginTop: -5,
  },
  activeBadge: {
    position: 'absolute',
    top: -20,
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFF',
    zIndex: 10,
  },
  activeBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
  },
  btnBackToActive: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    zIndex: 100,
    // @ts-ignore
    cursor: 'pointer',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '85%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  modalImage: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  btnPrimary: {
    backgroundColor: '#EF4444',
    borderRadius: 16,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 4,
    borderBottomColor: '#B91C1C',
  },
  btnDisabled: {
    backgroundColor: '#CBD5E1',
    borderBottomColor: '#94A3B8',
  },
  btnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '900',
  },
  disabledBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  disabledBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  btnSecondary: {
    borderRadius: 16,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: 'bold',
  }
});