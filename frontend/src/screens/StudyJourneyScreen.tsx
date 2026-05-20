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
import * as Haptics from 'expo-haptics';

import {
  Star,
  Lock,
  BookOpen,
  Target,
  Check,
  ChevronUp,
  Sparkles,
  Link,
  Puzzle,
  ListTodo,
  Keyboard,
} from 'lucide-react-native';

import { StackScreenProps } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuthContext } from '../context/AuthContext';
import DuoHearts from '../components/quiz/DuoHearts';

import { useTheme } from '../context/ThemeContext';

import type { RootStackParamList } from '../components/AppNavigator';

import ScreenContainer from '../components/ScreenContainer';
import BottomNavigation from '../components/BottomNavigation';
import AppHeaderSearch from '../components/AppHeaderSearch';

import { getStudyPath, getFlashcards, updateStudyPathIndex, startStudy } from '../api/api';
import { chunkVocabulary, generateJourneyNodes, JourneyNode, VocabItem } from '../utils/journeyMap';

type StudyJourneyScreenProps = StackScreenProps<
  RootStackParamList,
  'StudyJourney'
>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const HEADER_HEIGHT = Platform.OS === 'ios' ? 140 : 120;
const MASCOT_SIZE = 78;

const getNodeColor = (type: string) => {
  switch (type) {
    case 'FLASHCARD':
      return '#0E513D';
    case 'MATCHING_KANA':
      return '#38BDF8';
    case 'MATCHING_MEANING':
      return '#F59E0B';
    case 'MULTICHOICE':
      return '#EF4444';
    case 'SPELLING':
      return '#EC4899';
    case 'REVIEW':
      return '#10B981';
    case 'FINAL_BOSS':
      return '#8B5CF6';
    default:
      return '#58A68E';
  }
};

const getNodeIcon = (type: string, color: string = 'white') => {
  const props = { color, size: 30 };
  switch (type) {
    case 'FLASHCARD':
      return <BookOpen {...props} size={38} />;
    case 'MATCHING_KANA':
      return <Link {...props} size={28} />;
    case 'MATCHING_MEANING':
      return <Puzzle {...props} size={28} />;
    case 'MULTICHOICE':
      return <ListTodo {...props} size={28} />;
    case 'SPELLING':
      return <Keyboard {...props} size={28} />;
    case 'REVIEW':
      return <Sparkles {...props} />;
    case 'FINAL_BOSS':
      return <Star size={48} color={color === 'white' ? '#FFD700' : color} fill={color === 'white' ? '#FFD700' : 'transparent'} />;
    default:
      return <Star {...props} />;
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

  // Start study session to get sessionId
  let sessionId: string | undefined;
  if (user?.id) {
    try {
      const response = await startStudy(materialId, user.id);
      sessionId = response.sessionId;
      console.log('📚 Study session started:', sessionId);
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
  }: any) => {
    const isCompleted = index < activeIdx;
    const isActive = index === activeIdx;
    const isLocked = index > activeIdx;

    let nodeSize = 66;
    if (node.nodeType === 'FINAL_BOSS') {
      nodeSize = 100;
    } else if (node.nodeType === 'FLASHCARD') {
      nodeSize = 90;
    } else if (node.nodeType === 'REVIEW') {
      nodeSize = 80;
    }

    const pressAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const badgeAnim = useRef(new Animated.Value(0)).current;
    
    const [isPressed, setIsPressed] = useState(false);

    useEffect(() => {
      if (isActive) {
        Animated.loop(
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 6000,
            useNativeDriver: true,
          })
        ).start();

        Animated.loop(
          Animated.sequence([
            Animated.timing(badgeAnim, {
              toValue: -6,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(badgeAnim, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    }, [isActive, rotateAnim, badgeAnim]);

    const handlePressIn = () => {
      setIsPressed(true);
      Animated.spring(pressAnim, {
        toValue: 1,
        useNativeDriver: false,
      }).start();
    };

    const handlePressOut = () => {
      setIsPressed(false);
      Animated.spring(pressAnim, {
        toValue: 0,
        useNativeDriver: false,
      }).start();
    };

    const rotateInterpolate = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    const translateY = pressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 4],
    });

    return (
      <View
        style={[
          styles.nodeContainer,
          {
            left: node.left - nodeSize / 2,
            top: node.top - nodeSize / 2,
            width: nodeSize,
            alignItems: 'center',
          },
        ]}
      >
        <Animated.View
          style={{
            transform: [{ scale: isActive ? zoomAnim : 1 }],
            zIndex: 2,
          }}
        >
          <Animated.View
            style={{
              transform: [{ translateY }],
            }}
          >
            {isActive && (
              <Animated.View
              style={{
                position: 'absolute',
                top: -8,
                left: -8,
                right: -8,
                bottom: -8,
                borderRadius: 999,
                borderWidth: 2,
                borderColor: getNodeColor(node.nodeType),
                borderStyle: 'dashed',
                transform: [{ rotate: rotateInterpolate }],
                opacity: 0.6,
              }}
            />
          )}

          <TouchableOpacity
            activeOpacity={1}
            disabled={!isActive}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={() =>
              handleNodePress(node, index, materialId, navigation, user)
            }
          >
            <Animated.View
              style={[
                styles.nodeBase,
                {
                  width: nodeSize,
                  height: nodeSize,
                  backgroundColor: isCompleted
                    ? '#58A68E'
                    : isLocked
                    ? '#CBD5DB'
                    : getNodeColor(node.nodeType),
                  borderColor: isActive ? '#FFFFFF' : 'transparent',
                  borderWidth: isActive ? 4 : 0,
                  borderBottomWidth: isPressed ? 2 : 6,
                  borderBottomColor: 'rgba(0,0,0,0.25)',
                  shadowColor: isActive ? getNodeColor(node.nodeType) : '#000',
                  shadowOpacity: isActive ? 0.6 : 0.15,
                  shadowRadius: isActive ? 10 : 4,
                  elevation: isActive ? 8 : 3,
                },
              ]}
            >
              {getNodeIcon(node.nodeType, isLocked ? '#7A8691' : 'white')}
            </Animated.View>
            
            {isCompleted && (
              <View style={{
                position: 'absolute',
                top: -4,
                right: -4,
                backgroundColor: '#10B981',
                borderRadius: 12,
                width: 24,
                height: 24,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 2,
                borderColor: 'white',
              }}>
                <Check size={14} color="white" strokeWidth={3} />
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {isActive && (
          <Animated.View style={[styles.activeBadge, { transform: [{ translateY: badgeAnim }] }]}>
            <Text style={styles.activeBadgeText}>HỌC NGAY</Text>
          </Animated.View>
        )}

        {isActive && node.nodeType === 'FINAL_BOSS' && (
          <View style={styles.sparkleContainer}>
            <Sparkles color="#FFD700" size={24} />
          </View>
        )}
      </View>
    );
  },
);

export default function StudyJourneyScreen({
  route,
  navigation,
}: StudyJourneyScreenProps) {
  const { user, globalHearts, totalXp, refillHeartsWithXp, topUpCount } = useAuthContext();
  const { colors } = useTheme();

  const [isLoading, setIsLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [journeyData, setJourneyData] = useState<any | null>(null);
  const [searchText, setSearchText] = useState('');
  const [headerHeight, setHeaderHeight] = useState(HEADER_HEIGHT);

  const [showOutOfHeartsModal, setShowOutOfHeartsModal] = useState(false);
  const [pendingNode, setPendingNode] = useState<any>(null);

  const materialId = route.params?.materialId ?? 1;

  const mascotSource = require('../../assets/sharkMagic.png');

  const mascotPos = useRef(
    new Animated.ValueXY({
      x: SCREEN_WIDTH / 2,
      y: 200,
    }),
  ).current;

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
        Animated.timing(jumpAnim, {
          toValue: -12,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(jumpAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );

    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, {
          toValue: 1.03,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(breathAnim, {
          toValue: 1.0,
          duration: 1200,
          useNativeDriver: true,
        }),
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

      const targetY =
        activeNode.top - SCREEN_HEIGHT / 2 + headerHeight / 2;

      scrollViewRef.current?.scrollTo({
        y: Math.max(0, targetY),
        animated: true,
      });

      // Mascot animation swimming to current node
      Animated.parallel([
        Animated.spring(mascotPos, {
          toValue: {
            x: activeNode.left,
            y: activeNode.top - 95,
          },
          useNativeDriver: true,
          friction: 6,
          tension: 40,
        }),

        Animated.sequence([
          Animated.timing(zoomAnim, {
            toValue: 1.25,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(zoomAnim, {
            toValue: 1.15,
            friction: 4,
            useNativeDriver: true,
          }),
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
    if (topUpCount >= 3) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (totalXp >= 200) {
      await refillHeartsWithXp(1, 200);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowOutOfHeartsModal(false);
      if (pendingNode) {
        handleNodePress(pendingNode.node, pendingNode.index, pendingNode.matId, pendingNode.nav, pendingNode.currentUser);
        setPendingNode(null);
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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

      // 2. REFACTOR UPDATE LOGIC
      // Whenever route.params.completedNodeIndex is passed, we explicitly update the DB
      // Note: Other screens should pass route.params.completedNodeIndex when finishing a node
      const passedNodeIndex = (route.params as any)?.completedNodeIndex;
      if (passedNodeIndex !== undefined && passedNodeIndex > currentActiveNodeIndex) {
         currentActiveNodeIndex = passedNodeIndex;
         await updateStudyPathIndex(user.id, materialId, passedNodeIndex);
      }

      const data = {
        material: studyPathData?.material || { title: 'Tài liệu học' },
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
    }, [loadJourney]),
  );

  useEffect(() => {
    if (!journeyData?.journeyNodes?.length) {
      return;
    }

    const activeIdx = Math.min(
      Math.max(journeyData.currentActiveNodeIndex ?? 0, 0),
      journeyData.journeyNodes.length - 1,
    );

    const activeNode = journeyData.journeyNodes[activeIdx];
    if (!activeNode) return;

    // Auto-scroll
    const timer = setTimeout(() => {
      focusActiveNode(activeNode);
    }, 400); // 400ms delay to ensure UI is laid out

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
        <View
          style={[styles.fixedHeader, { backgroundColor: colors.background }]}
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
          />
           {/* Hearts widget */}
           <View style={styles.heartOverlay}>
             <DuoHearts />
           </View>
           <View style={styles.progressSection}>
            <View style={styles.headerInfoRow}>
              <Text style={styles.deckTitle}>
                {journeyData.material.title}
              </Text>
              <Text style={styles.progressText}>
                {journeyData.progressPercentage}%
              </Text>
            </View>

            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${journeyData.progressPercentage}%` },
                ]}
              />
            </View>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={{ marginTop: headerHeight }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => setShowScrollTop(e.nativeEvent.contentOffset.y > 400)}
          contentContainerStyle={{
            paddingTop: 60,
            paddingBottom: 220,
            minHeight: journeyData.journeyNodes?.length
              ? journeyData.journeyNodes[journeyData.journeyNodes.length - 1].top + 400
              : SCREEN_HEIGHT,
          }}
        >
          <Svg style={StyleSheet.absoluteFill} width={SCREEN_WIDTH}>
            {/* Active Track */}
            {activePathD ? (
              <>
                <Path
                  d={activePathD}
                  stroke="#0F766E"
                  strokeWidth={14}
                  fill="none"
                  strokeDasharray="2,16"
                  strokeLinecap="round"
                  transform="translate(0, 3)"
                />
                <Path
                  d={activePathD}
                  stroke="#2DD4BF"
                  strokeWidth={14}
                  fill="none"
                  strokeDasharray="2,16"
                  strokeLinecap="round"
                />
              </>
            ) : null}

            {/* Inactive Track */}
            {inactivePathD ? (
              <>
                <Path
                  d={inactivePathD}
                  stroke="#94A3B8"
                  strokeWidth={14}
                  fill="none"
                  strokeDasharray="2,16"
                  strokeLinecap="round"
                  transform="translate(0, 3)"
                />
                <Path
                  d={inactivePathD}
                  stroke="#CBD5E1"
                  strokeWidth={14}
                  fill="none"
                  strokeDasharray="2,16"
                  strokeLinecap="round"
                />
              </>
            ) : null}
          </Svg>

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
            <Image source={mascotSource} style={styles.mascotImg} />
            <Animated.View
              style={[styles.mascotShadow, { transform: [{ scale: shadowScale }] }]}
            />
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
            />
          ))}
        </ScrollView>

        {showScrollTop && (
          <TouchableOpacity
            style={[styles.btnBackToActive, { backgroundColor: colors.primary }]}
            onPress={() => {
              const activeIndex = journeyData.currentActiveNodeIndex ?? 0;
              const targetIndex = Math.min(
                activeIndex,
                journeyData.journeyNodes.length - 1,
              );
              focusActiveNode(journeyData.journeyNodes[targetIndex]);
            }}
          >
            <ChevronUp size={24} color="white" />
          </TouchableOpacity>
        )}

        <BottomNavigation activeTab="study" />
      </View>

      <Modal visible={showOutOfHeartsModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Image source={require('../../assets/sharkCry.png')} style={styles.modalImage} />
            <Text style={styles.modalTitle}>Bạn hiện đã hết tim!</Text>
            <Text style={styles.modalText}>
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
              {topUpCount >= 3 && (
                <View style={styles.disabledBadge}>
                  <Text style={styles.disabledBadgeText}>Đã đạt giới hạn hôm nay</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.btnSecondary} 
              onPress={() => {
                setShowOutOfHeartsModal(false);
                setPendingNode(null);
              }}
            >
              <Text style={styles.btnSecondaryText}>Để sau</Text>
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
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  progressSection: {
    marginTop: 15,
  },
  heartOverlay: { position: 'absolute', right: 16, top: 8 },
  headerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  deckTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1A1A1A',
  },
  progressText: {
    color: '#58A68E',
    fontWeight: '900',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#E9F0EE',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#58A68E',
    borderRadius: 5,
  },
  nodeContainer: {
    position: 'absolute',
    zIndex: 5,
  },
  nodeBase: {
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.15)',
  },
  mascotWrapper: {
    position: 'absolute',
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
    zIndex: 20,
    alignItems: 'center',
  },
  mascotImg: {
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
    resizeMode: 'contain',
  },
  mascotShadow: {
    width: 40,
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 20,
    marginTop: -5,
  },
  quizLabel: {
    marginTop: 10,
    lineHeight: 14,
    maxWidth: 80,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  activeBadge: {
    position: 'absolute',
    top: -15,
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFF',
    zIndex: 10,
    elevation: 4,
  },
  activeBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  sparkleContainer: {
    position: 'absolute',
    top: -12,
    right: -12,
  },
  btnBackToActive: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowOpacity: 0.3,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
  },
  modalImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  btnPrimary: {
    backgroundColor: '#FF4B4B',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    elevation: 2,
    borderBottomWidth: 4,
    borderBottomColor: '#CC3A3A',
  },
  btnDisabled: {
    backgroundColor: '#CBD5E1',
    borderBottomColor: '#94A3B8',
  },
  btnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
  disabledBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  disabledBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  btnSecondary: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: 'bold',
  }
});