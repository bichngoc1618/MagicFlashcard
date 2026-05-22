import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

import {
  Animated,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import {
  Star,
  BookOpen,
  Check,
  ChevronUp,
  Link,
  Puzzle,
  ListTodo,
  Keyboard,
} from 'lucide-react-native';

import { StackScreenProps } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path, G, Circle, Defs, Stop, RadialGradient, LinearGradient as SvgLinearGradient } from 'react-native-svg';

import { useAuthContext } from '../context/AuthContext';
import DuoHearts from '../components/quiz/DuoHearts';
import { useTheme } from '../context/ThemeContext';
import type { RootStackParamList } from '../components/AppNavigator';

import ScreenContainer from '../components/ScreenContainer';
import BottomNavigation from '../components/BottomNavigation';
import AppHeaderSearch from '../components/AppHeaderSearch';


import { getStudyPath, getFlashcards, updateStudyPathIndex, startStudy } from '../api/api';
import { chunkVocabulary, generateJourneyNodes, VocabItem } from '../utils/journeyMap';

type StudyJourneyScreenProps = StackScreenProps<
  RootStackParamList,
  'StudyJourney'
>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MASCOT_SIZE = 78;

const getJourneyBackgroundColors = (isDark: boolean): readonly [string, string, string] => (
  isDark
    ? ['#061E1B', '#0B2E2A', '#123B34'] as const
    : ['#E9FBF5', '#F7FFFD', '#DDF5EA'] as const
);

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

const getNodeColor = (type: string, isDark: boolean) => {
  if (type === 'FINAL_BOSS') return isDark ? '#D97706' : '#F59E0B';
  return isDark ? '#458571' : '#58A68E';
};

const getNodeIcon = (type: string, color: string = 'white') => {
  const props = { color, size: 28 };
  switch (type) {
    case 'FLASHCARD': return <BookOpen {...props} size={32} />;
    case 'MATCHING_KANA': return <Link {...props} />;
    case 'MATCHING_MEANING': return <Puzzle {...props} />;
    case 'MULTICHOICE': return <Puzzle {...props} />;
    case 'SPELLING': return <Keyboard {...props} />;
    case 'REVIEW': return <ListTodo {...props} />;
    case 'FINAL_BOSS':
      return <Star size={36} color={color === 'white' ? '#FFD700' : color} fill={color === 'white' ? '#FFD700' : 'transparent'} />;
    default: return <Star {...props} />;
  }
};

const handleNodePress = async (
  node: any,
  index: number,
  materialId: number,
  navigation: any,
  user?: any,
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
      materialId,
      flashcardId: String(materialId),
      batchIndex: node.batchIndex ?? 0,
      nodeIndex: index,
      sessionId,
    });
    return;
  }

  const mapNodeTypeToQuizType = (type: string) => {
    if (type === 'MATCHING_KANA') return 'MATCH_HIRA';
    if (type === 'MATCHING_MEANING') return 'MATCH_MEANING';
    if (type === 'SPELLING') return 'SCRAMBLED_HIRA';
    if (type === 'MULTICHOICE') return 'MULTIPLE_CHOICE';
    return type;
  };

  navigation.navigate('Quiz', {
    materialId,
    flashcardId: String(materialId),
    nodeId: String(node.id),
    groupIndex: node.batchIndex ?? 0,
    subStepIndex: 0,
    nodeType: node.nodeType,
    quizStepType: mapNodeTypeToQuizType(node.nodeType),
    nodeIndex: index,
    sessionId,
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
  }: any) => {
    const isCompleted = index < activeIdx;
    const isActive = index === activeIdx;
    const isLocked = index > activeIdx;

    const nodeSize = 84; 
    const DEPTH_3D = isActive ? 12 : 8; 

    const pressAnim = useRef(new Animated.Value(0)).current;
    const badgeAnim = useRef(new Animated.Value(0)).current;
    const breatheAnim = useRef(new Animated.Value(1)).current;
    
    // Tách riêng luồng Animation cho vòng tròn phát sáng để tối ưu tính tự nhiên
    const glowAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (isActive) {
        // 1. Nhịp nhấp nhô của Badge "HỌC NGAY"
        const startBadgeAnimation = () => {
          Animated.sequence([
            Animated.spring(badgeAnim, { toValue: -6, speed: 2, bounciness: 4, useNativeDriver: true }),
            Animated.spring(badgeAnim, { toValue: 0, speed: 1.5, bounciness: 2, useNativeDriver: true }),
          ]).start(() => startBadgeAnimation());
        };
        startBadgeAnimation();

        // 2. Nhịp thở tự nhiên sinh học cho Nút Active
        const startBreatheAnimation = () => {
          Animated.sequence([
            Animated.timing(breatheAnim, { toValue: 1.05, duration: 1200, useNativeDriver: true }),
            Animated.timing(breatheAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          ]).start(() => startBreatheAnimation());
        };
        startBreatheAnimation();

        // 3. CẢI TIẾN: Vòng radar phát sáng lặp vô hạn mượt mà, không bị khựng giật khi reset vòng lặp
        Animated.loop(
          Animated.timing(glowAnim, { 
            toValue: 1, 
            duration: 2000, // Thời gian lan tỏa vừa vặn tạo cảm giác thư thái
            useNativeDriver: true 
          })
        ).start();
      }
    }, [isActive, badgeAnim, breatheAnim, glowAnim]);

    const handlePressIn = () => {
      Animated.spring(pressAnim, {
        toValue: 1,
        tension: 160, 
        friction: 7,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(pressAnim, {
        toValue: 0,
        tension: 140,  
        friction: 4, 
        useNativeDriver: true,
      }).start();
    };

    const translateY = pressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, DEPTH_3D],
    });

    const scaleX = pressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, isActive ? 1.06 : 1], 
    });
    const scaleY = pressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, isActive ? 0.94 : 1], 
    });

    // CẢI TIẾN: Biên độ giãn nở từ sát ranh giới nút ra ngoài (Không bị quá rộng gây loãng giao diện)
    const glowScale = glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1.0, 1.35], 
    });

    // CẢI TIẾN: Độ mờ biến thiên phi tuyến tính (Giữ rõ nét lúc bắt đầu và tan biến cực nhanh ở giai đoạn cuối)
    const glowOpacity = glowAnim.interpolate({
      inputRange: [0, 0.1, 0.4, 1],
      outputRange: [0, 0.5, 0.4, 0], // Xuất hiện nhanh -> Giữ nhịp lan tỏa nhẹ -> Tan biến hẳn vào nền
    });

    const baseColor = isLocked 
      ? (isDark ? '#3D4A54' : '#CBD5DB') 
      : getNodeColor(node.nodeType, isDark);

    const shadow3DColor = isLocked
      ? (isDark ? '#273138' : '#94A3B8')
      : (node.nodeType === 'FINAL_BOSS' ? (isDark ? '#9A3412' : '#B45309') : (isDark ? '#2E5B4E' : '#417D6B'));

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
        {/* VÒNG TRÒN HIỆU ỨNG LAN TỎA TỰ NHIÊN */}
        {isActive && (
          <Animated.View 
            style={[
              styles.glowRing, 
              { 
                width: nodeSize,
                height: nodeSize,
                borderColor: isDark ? '#34D399' : '#58CC02', 
                borderWidth: 2.5, // Độ dày thanh mảnh tạo cảm giác tinh tế hơn
                position: 'absolute',
                top: 0,
                borderRadius: nodeSize / 2,
                // Lồng đồng bộ nhịp thở của nút gốc vào trước khi bung hiệu ứng radar lan tỏa rộng ra ngoài
                transform: [
                  { scale: breatheAnim },
                  { scale: glowScale }
                ],
                opacity: glowOpacity
              }
            ]} 
          />
        )}

        {/* LAYER STACK 3D - TẦNG DƯỚI (ĐẾ NỀN ĐỔ KHỐI) */}
        <Animated.View
          style={[
            styles.node3DBase,
            {
              width: nodeSize,
              height: nodeSize,
              backgroundColor: shadow3DColor,
              borderRadius: nodeSize / 2,
              position: 'absolute',
              top: DEPTH_3D, 
              transform: [{ scale: isActive ? breatheAnim : 1 }]
            }
          ]}
        />

        {/* LAYER STACK 3D - TẦNG TRÊN (NÚT BẤM CHÍNH) */}
        <Animated.View 
          style={{ 
            width: nodeSize,
            height: nodeSize,
            transform: [
              { translateY }, 
              { scaleX },
              { scaleY },
              { scale: isActive ? breatheAnim : 1 }
            ], 
            zIndex: 2 
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            disabled={isLocked}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={() => handleNodePress(node, index, materialId, navigation, user)}
            style={[
              styles.node3DTop,
              {
                width: nodeSize,
                height: nodeSize,
                backgroundColor: baseColor,
                borderRadius: nodeSize / 2,
              }
            ]}
          >
            {getNodeIcon(node.nodeType, isLocked ? (isDark ? '#627380' : '#7A8691') : 'white')}
          </TouchableOpacity>

          {isCompleted && (
            <View style={[styles.completedBadge, { backgroundColor: isDark ? '#059669' : '#10B981' }]}>
              <Check size={12} color="white" strokeWidth={4} />
            </View>
          )}
        </Animated.View>

        {/* {isActive && (
          <Animated.View style={[styles.activeBadge, { transform: [{ translateY: badgeAnim }] }]}>
            <Text style={styles.activeBadgeText}>HỌC NGAY</Text>
          </Animated.View>
        )} */}
      </View>
    );
  },
);

export default function StudyJourneyScreen({
  route,
  navigation,
}: StudyJourneyScreenProps) {
  const { user, globalHearts, totalXp, refillHeartsWithXp, topUpCount, notificationCount, refreshNotificationCount } = useAuthContext();
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  const [isLoading, setIsLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [journeyData, setJourneyData] = useState<any | null>(null);
  const [searchText, setSearchText] = useState('');
  const [headerHeight, setHeaderHeight] = useState(240);

  const [showOutOfHeartsModal, setShowOutOfHeartsModal] = useState(false);
  const [pendingNode, setPendingNode] = useState<any>(null);

  /* ====================================================================
     3. QUẢN LÝ THOẠI ĐỘNG (SPEECH BUBBLE CHUYÊN NGHIỆP)
     ==================================================================== */
  const [currentSpeech, setCurrentSpeech] = useState('Bắt đầu bài học thôi!');

  const mascotSpeeches = useMemo(() => [
    "Hôm nay trời đẹp để học nè! 🔥",
    "Tuyệt vời! Chặng đua mới đang chờ!",
    "Đừng dừng lại, bạn đang làm rất tốt! ",
    "Sắp tới chặng kết rồi, cố lên!",
    "Bứt phá giới hạn cùng Shark Magic nào! ✨",
  ], []);

  // Thay đổi câu thoại ngẫu nhiên cứ sau mỗi 7 giây để tạo cảm giác linh hoạt
  useEffect(() => {
    const speechInterval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * mascotSpeeches.length);
      setCurrentSpeech(mascotSpeeches[randomIndex]);
    }, 10000);

    return () => clearInterval(speechInterval);
  }, [mascotSpeeches]);

  const materialId = route.params?.materialId ?? 1;
  const mascotSource = require('../../assets/sharkMagic.png');

  const mascotPos = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH / 2, y: 200 })).current;
  const jumpAnim = useRef(new Animated.Value(0)).current;
  const zoomAnim = useRef(new Animated.Value(1)).current;
  const breathAnim = useRef(new Animated.Value(1)).current;
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

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(jumpAnim, { toValue: -12, duration: 900, useNativeDriver: true }),
        Animated.timing(jumpAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ]),
    );

    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, { toValue: 1.03, duration: 1200, useNativeDriver: true }),
        Animated.timing(breathAnim, { toValue: 1.0, duration: 1200, useNativeDriver: true }),
      ])
    );

    animation.start();
    breathing.start();
    return () => {
      animation.stop();
      breathing.stop();
    };
  }, [jumpAnim, breathAnim]);

  const shadowScale = jumpAnim.interpolate({
    inputRange: [-12, 0],
    outputRange: [0.7, 1],
    extrapolate: 'clamp',
  });

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

      Animated.parallel([
        Animated.spring(mascotPos, {
          toValue: { x: activeNode.left, y: activeNode.top - 110 }, // Đẩy mascot lên cao thêm 1 tí để chừa không gian cho Speech Bubble
          useNativeDriver: true,
          friction: 6,
          tension: 40,
        }),
        Animated.sequence([
          Animated.timing(zoomAnim, { toValue: 1.25, duration: 400, useNativeDriver: true }),
          Animated.spring(zoomAnim, { toValue: 1.15, friction: 4, useNativeDriver: true }),
        ]),
      ]).start();
    },
    [headerHeight, mascotPos, zoomAnim],
  );

  const onNodePressWrapper = useCallback(
    (node: any, index: number, matId: number, nav: any, currentUser?: any) => {
      if (globalHearts === 0 && node.nodeType !== 'FLASHCARD') {
        setPendingNode({ node, index, matId, nav, currentUser });
        setShowOutOfHeartsModal(true);
        return;
      }
      handleNodePress(node, index, matId, nav, currentUser);
    },
    [globalHearts],
  );

  const handleBuyHeart = async () => {
    const triggerHaptic = (type: Haptics.NotificationFeedbackType) => {
      if (Platform.OS !== 'web' && Haptics && typeof Haptics.notificationAsync === 'function') {
        try {
          Haptics.notificationAsync(type).catch(() => {});
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
        handleNodePress(pendingNode.node, pendingNode.index, pendingNode.matId, pendingNode.nav, pendingNode.currentUser);
        setPendingNode(null);
      }
    } else {
      triggerHaptic(Haptics.NotificationFeedbackType.Error);
    }
  };

  const loadJourney = useCallback(async () => {
    try {
      if (!user?.id) return;
      const [cardsResponse, studyPathData] = await Promise.all([
        getFlashcards(materialId, user.id),
        getStudyPath(user.id, materialId)
      ]);

      const vocabList = (Array.isArray(cardsResponse) ? cardsResponse : cardsResponse.data || cardsResponse.flashcards || []) as VocabItem[];
      const chunks = chunkVocabulary(vocabList);
      const journeyNodes = generateJourneyNodes(chunks);

      let currentActiveNodeIndex = studyPathData?.currentActiveNodeIndex || 0;
      if (currentActiveNodeIndex > journeyNodes.length) {
         currentActiveNodeIndex = journeyNodes.length;
      }

      const passedNodeIndex = (route.params as any)?.completedNodeIndex;
      if (passedNodeIndex !== undefined && passedNodeIndex > currentActiveNodeIndex) {
         currentActiveNodeIndex = passedNodeIndex;
         await updateStudyPathIndex(user.id, materialId, passedNodeIndex);
      }

      const data = {
        material: studyPathData?.material || { title: 'TIẾN ĐỘ HỌC TẬP' },
        progressPercentage: studyPathData?.progressPercentage || 0,
        journeyNodes,
        currentActiveNodeIndex,
      };

      setJourneyData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, materialId, route.params]);

  useFocusEffect(
    useCallback(() => {
      loadJourney();
      refreshNotificationCount();
    }, [loadJourney, refreshNotificationCount]),
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

  if (isLoading || !journeyData) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
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
            mascotSource={mascotSource}
            searchText={searchText}
            onChangeSearchText={setSearchText}
            onSubmitSearch={() =>
              searchText.trim() &&
              navigation.navigate('Dictionary', { query: searchText.trim() })
            }
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
            colors={getJourneyBackgroundColors(isDark)}
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
            scrollEventThrottle={16}
            onScroll={(e) => setShowScrollTop(e.nativeEvent.contentOffset.y > 400)}
            contentContainerStyle={{
              paddingTop: 30,
              paddingBottom: 240,
              minHeight: journeyData.journeyNodes?.length
                ? journeyData.journeyNodes[journeyData.journeyNodes.length - 1].top + 400
                : SCREEN_HEIGHT,
            }}
          >
          <Svg style={StyleSheet.absoluteFill} width={SCREEN_WIDTH}>
            {activePathD && (
              <Path d={activePathD} stroke={isDark ? '#458571' : '#417D6B'} strokeWidth={6} fill="none" strokeDasharray="8,8" strokeLinecap="round" />
            )}
            {inactivePathD && (
              <Path d={inactivePathD} stroke={isDark ? '#334155' : '#CBD5E1'} strokeWidth={6} fill="none" strokeDasharray="8,8" strokeLinecap="round" />
            )}
          </Svg>

          {/* MASCOT CHỨA VÒM HỘI THOẠI ĐỘNG (SPEECH BUBBLE) */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.mascotWrapper,
              {
                transform: [
                  { translateX: mascotPos.x },
                  { translateY: mascotPos.y },
                  { translateX: -MASCOT_SIZE / 2 },
                  { translateY: jumpAnim },
                  { scale: breathAnim },
                ],
              },
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
            <Animated.View style={[styles.mascotShadow, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)', transform: [{ scale: shadowScale }] }]} />
          </Animated.View>

          {journeyData.journeyNodes.map((node: any, index: number) => (
            <NodeItem
              key={`${node.id}-${index}`}
              node={node}
              index={index}
              activeIdx={journeyData.currentActiveNodeIndex ?? 0}
              navigation={navigation}
              materialId={materialId}
              handleNodePress={onNodePressWrapper}
              zoomAnim={zoomAnim}
              user={user}
              themeColors={colors}
              isDark={isDark}
            />
          ))}
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