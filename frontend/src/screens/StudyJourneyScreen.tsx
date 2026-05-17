import React, {
  useContext,
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
} from 'react-native';

import {
  Star,
  Lock,
  BookOpen,
  Target,
  Check,
  ChevronUp,
  Sparkles,
} from 'lucide-react-native';

import { StackScreenProps } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';

import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

import type { RootStackParamList } from '../components/AppNavigator';

import ScreenContainer from '../components/ScreenContainer';
import BottomNavigation from '../components/BottomNavigation';
import AppHeaderSearch from '../components/AppHeaderSearch';

import { getStudyPath } from '../api/api';
import { getDeckProgress } from '../utils/learningProgress';

type StudyJourneyScreenProps = StackScreenProps<
  RootStackParamList,
  'StudyJourney'
>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
  Dimensions.get('window');

const HEADER_HEIGHT = Platform.OS === 'ios' ? 140 : 120;

const MASCOT_SIZE = 78;

const NODE_VERTICAL_GAP = 170;
const SIDE_PADDING = 90;

const generateJourneyLayout = (rawNodes: any[]) => {
  let y = 120;

  return rawNodes.map((node, index) => {
    const isLeft = index % 2 === 0;

    let x = isLeft
      ? SIDE_PADDING
      : SCREEN_WIDTH - SIDE_PADDING;

    if (
      node.nodeType === 'FINAL_BOSS' ||
      node.nodeType === 'FINAL_EXAM'
    ) {
      x = SCREEN_WIDTH / 2;
    }

    const newNode = {
      ...node,
      top: y,
      left: x,
    };

    y += NODE_VERTICAL_GAP;

    return newNode;
  });
};

const getNodeColor = (type: string) => {
  switch (type) {
    case 'FLASHCARD':
      return '#0E513D';

    case 'MINI_QUIZ':
      return '#38BDF8';

    case 'REVIEW':
      return '#F59E0B';

    case 'FINAL_BOSS':
    case 'FINAL_EXAM':
      return '#8B5CF6';

    default:
      return '#58A68E';
  }
};

const getNodeIcon = (type: string) => {
  const props = { color: 'white', size: 30 };

  switch (type) {
    case 'FLASHCARD':
      return <BookOpen {...props} size={38} />;

    case 'MINI_QUIZ':
      return <Target {...props} size={28} />;

    case 'REVIEW':
      return <Sparkles {...props} />;

    case 'FINAL_BOSS':
    case 'FINAL_EXAM':
      return (
        <Star
          size={48}
          color="#FFD700"
          fill="#FFD700"
        />
      );

    default:
      return <Star {...props} />;
  }
};

const handleNodePress = (
  node: any,
  index: number,
  materialId: number,
  navigation: any,
) => {
  if (!node || !navigation) return;

  if (node.nodeType === 'FLASHCARD') {
    navigation.navigate('Flashcard', {
      materialId,
      flashcardId: String(materialId),
      batchIndex: node.batchIndex ?? 0,
      nodeIndex: index,
      sessionId: undefined,
    });

    return;
  }

  navigation.navigate('Quiz', {
    materialId,
    flashcardId: String(materialId),
    nodeId: String(node.id),
    groupIndex: node.batchIndex ?? 0,
    subStepIndex: 0,
    nodeType:
      node.nodeType === 'MINI_QUIZ'
        ? 'MINI_QUIZ'
        : node.nodeType,
    quizStepType: node.quizStepType,
    nodeIndex: index,
    sessionId: undefined,
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
  }: any) => {
    const isCompleted = index < activeIdx;
    const isActive = index === activeIdx;
    const isLocked = index > activeIdx;

    let nodeSize = 66;

    if (
      node.nodeType === 'FINAL_BOSS' ||
      node.nodeType === 'FINAL_EXAM'
    ) {
      nodeSize = 100;
    } else if (node.nodeType === 'FLASHCARD') {
      nodeSize = 90;
    } else if (node.nodeType === 'REVIEW') {
      nodeSize = 78;
    }

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
            transform: [
              {
                scale: isActive ? zoomAnim : 1,
              },
            ],
          }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isLocked}
            onPress={() =>
              handleNodePress(
                node,
                index,
                materialId,
                navigation,
              )
            }
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

                borderColor: isActive
                  ? '#FFFFFF'
                  : 'transparent',

                borderWidth: isActive ? 4 : 0,
              },
            ]}
          >
            {isCompleted ? (
              <Check size={32} color="white" />
            ) : isLocked ? (
              <Lock size={24} color="#7A8691" />
            ) : (
              getNodeIcon(node.nodeType)
            )}
          </TouchableOpacity>
        </Animated.View>

        {node.nodeType === 'MINI_QUIZ' && (
          <Text style={styles.quizLabel}>
            {String(
              node.quizStepType || 'QUIZ',
            ).replace(/_/g, ' ')}
          </Text>
        )}

        {isActive &&
          (node.nodeType === 'FINAL_BOSS' ||
            node.nodeType === 'FINAL_EXAM') && (
            <View style={styles.sparkleContainer}>
              <Sparkles
                color="#FFD700"
                size={24}
              />
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
  const { user } = useContext(AuthContext);

  const { colors } = useTheme();

  const [isLoading, setIsLoading] =
    useState(true);

  const [showScrollTop, setShowScrollTop] =
    useState(false);

  const [journeyData, setJourneyData] =
    useState<any | null>(null);

  const [searchText, setSearchText] =
    useState('');

  const [headerHeight, setHeaderHeight] =
    useState(HEADER_HEIGHT);

  const materialId =
    route.params?.materialId ?? 1;

  const mascotSource = require('../../assets/sharkMagic.png');

  const mascotPos = useRef(
    new Animated.ValueXY({
      x: SCREEN_WIDTH / 2,
      y: 200,
    }),
  ).current;

  const jumpAnim = useRef(
    new Animated.Value(0),
  ).current;

  const zoomAnim = useRef(
    new Animated.Value(1),
  ).current;

  const scrollViewRef =
    useRef<ScrollView | null>(null);

  const pathD = useMemo(() => {
    const nodes = journeyData?.journeyNodes;

    if (!nodes || nodes.length < 2) {
      return '';
    }

    let d = `M ${nodes[0].left} ${nodes[0].top}`;

    for (let i = 0; i < nodes.length - 1; i++) {
      const curr = nodes[i];
      const next = nodes[i + 1];

      const midY =
        (curr.top + next.top) / 2;

      d += `
        C
        ${curr.left} ${midY},
        ${next.left} ${midY},
        ${next.left} ${next.top}
      `;
    }

    return d;
  }, [journeyData?.journeyNodes]);

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

    animation.start();

    return () => animation.stop();
  }, []);

  const shadowScale = jumpAnim.interpolate({
    inputRange: [-12, 0],
    outputRange: [0.7, 1],
    extrapolate: 'clamp',
  });

  const focusActiveNode = useCallback(
    (activeNode: any) => {
      if (!activeNode) return;

      const targetY =
        activeNode.top -
        SCREEN_HEIGHT / 2 +
        headerHeight / 2;

      scrollViewRef.current?.scrollTo({
        y: Math.max(0, targetY),
        animated: true,
      });

      Animated.parallel([
        Animated.spring(mascotPos, {
          toValue: {
            x: activeNode.left,
            y: activeNode.top - 95,
          },
          useNativeDriver: true,
          friction: 8,
        }),

        Animated.sequence([
          Animated.timing(zoomAnim, {
            toValue: 1.2,
            duration: 400,
            useNativeDriver: true,
          }),

          Animated.spring(zoomAnim, {
            toValue: 1.1,
            friction: 4,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    },
    [headerHeight],
  );

  const loadJourney = useCallback(async () => {
    try {
      const data = await getStudyPath(
        user?.id || 0,
        materialId,
      );

      const localProgress =
        await getDeckProgress(
          String(materialId),
        );

      let baseNodes = [
        ...data.journeyNodes,
      ];

      const enhancedNodes: any[] = [];

      let quizCount = 0;

      baseNodes.forEach((node) => {
        enhancedNodes.push(node);

        if (
          node.nodeType === 'MINI_QUIZ'
        ) {
          quizCount++;

          if (quizCount % 2 === 0) {
            enhancedNodes.push({
              id: `review-${quizCount}`,
              nodeType: 'REVIEW',
              materialId,
              batchIndex:
                Math.floor(quizCount / 2),
            });
          }
        }
      });

      enhancedNodes.push({
        id: 'final-boss',
        nodeType: 'FINAL_BOSS',
        materialId,
      });

      const finalNodes =
        generateJourneyLayout(
          enhancedNodes,
        );

      data.journeyNodes = finalNodes;

      data.progressPercentage = Math.max(
        data.progressPercentage || 0,
        localProgress?.progressPercentage ||
          0,
      );

      setJourneyData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, materialId]);

  useFocusEffect(
    useCallback(() => {
      loadJourney();
    }, [loadJourney]),
  );

  useEffect(() => {
    if (
      !journeyData?.journeyNodes?.length
    ) {
      return;
    }

    const activeIdx = Math.min(
      Math.max(
        journeyData.currentActiveNodeIndex ??
          0,
        0,
      ),

      journeyData.journeyNodes.length - 1,
    );

    const activeNode =
      journeyData.journeyNodes[activeIdx];

    if (!activeNode) return;

    const timer = setTimeout(() => {
      focusActiveNode(activeNode);
    }, 200);

    return () => clearTimeout(timer);
  }, [journeyData, focusActiveNode]);

  if (isLoading || !journeyData) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }

  return (
    <ScreenContainer>
      <View
        style={[
          styles.screenBackground,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        <View
          style={[
            styles.fixedHeader,
            {
              backgroundColor:
                colors.background,
            },
          ]}
          onLayout={(e) =>
            setHeaderHeight(
              e.nativeEvent.layout.height,
            )
          }
        >
          <AppHeaderSearch
            displayName={
              user?.username || 'Bạn học'
            }
            mascotSource={mascotSource}
            searchText={searchText}
            onChangeSearchText={
              setSearchText
            }
            onSubmitSearch={() =>
              searchText.trim() &&
              navigation.navigate(
                'Dictionary',
                {
                  query:
                    searchText.trim(),
                },
              )
            }
          />

          <View
            style={styles.progressSection}
          >
            <View
              style={styles.headerInfoRow}
            >
              <Text style={styles.deckTitle}>
                {
                  journeyData.material
                    .title
                }
              </Text>

              <Text
                style={styles.progressText}
              >
                {
                  journeyData.progressPercentage
                }
                %
              </Text>
            </View>

            <View
              style={
                styles.progressBarContainer
              }
            >
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${journeyData.progressPercentage}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={{
            marginTop: headerHeight,
          }}
          showsVerticalScrollIndicator={
            false
          }
          scrollEventThrottle={16}
          onScroll={(e) =>
            setShowScrollTop(
              e.nativeEvent.contentOffset.y >
                400,
            )
          }
          contentContainerStyle={{
            paddingTop: 60,
            paddingBottom: 180,

            minHeight:
              journeyData.journeyNodes?.length
                ? journeyData
                    .journeyNodes[
                    journeyData
                      .journeyNodes
                      .length - 1
                  ].top + 300
                : SCREEN_HEIGHT,
          }}
        >
          <Svg
            style={StyleSheet.absoluteFill}
            width={SCREEN_WIDTH}
          >
            <Path
              d={pathD}
              stroke="#D1E5DF"
              strokeWidth={14}
              fill="none"
              strokeDasharray="2,16"
              strokeLinecap="round"
            />
          </Svg>

          <Animated.View
            pointerEvents="none"
            style={[
              styles.mascotWrapper,
              {
                transform: [
                  {
                    translateX:
                      mascotPos.x,
                  },

                  {
                    translateY:
                      mascotPos.y,
                  },

                  {
                    translateX:
                      -MASCOT_SIZE / 2,
                  },

                  {
                    translateY:
                      jumpAnim,
                  },
                ],
              },
            ]}
          >
            <Image
              source={mascotSource}
              style={styles.mascotImg}
            />

            <Animated.View
              style={[
                styles.mascotShadow,
                {
                  transform: [
                    {
                      scale:
                        shadowScale,
                    },
                  ],
                },
              ]}
            />
          </Animated.View>

          {journeyData.journeyNodes.map(
            (
              node: any,
              index: number,
            ) => (
              <NodeItem
                key={`${node.id}-${index}`}
                node={node}
                index={index}
                activeIdx={
                  journeyData.currentActiveNodeIndex ??
                  0
                }
                navigation={navigation}
                materialId={materialId}
                handleNodePress={
                  handleNodePress
                }
                zoomAnim={zoomAnim}
              />
            ),
          )}
        </ScrollView>

        {showScrollTop && (
          <TouchableOpacity
            style={[
              styles.btnBackToActive,
              {
                backgroundColor:
                  colors.primary,
              },
            ]}
            onPress={() =>
              focusActiveNode(
                journeyData
                  .journeyNodes[
                  journeyData.currentActiveNodeIndex ||
                    0
                ],
              )
            }
          >
            <ChevronUp
              size={24}
              color="white"
            />
          </TouchableOpacity>
        )}

        <BottomNavigation activeTab="study" />
      </View>
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
    borderBottomColor:
      'rgba(0,0,0,0.15)',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowRadius: 4,
    shadowOpacity: 0.15,

    elevation: 3,
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

    backgroundColor:
      'rgba(0,0,0,0.15)',

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
});