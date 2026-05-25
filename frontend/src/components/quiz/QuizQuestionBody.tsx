import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  LayoutChangeEvent,
  PanResponder,
  PanResponderInstance,
  Animated as RNAnimated,
  Easing,
} from 'react-native';
import type { LayoutRectangle } from 'react-native';

import Svg, { Path, Circle } from 'react-native-svg';
import { LayoutAnimation, UIManager } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import type { QuizType, QuizWord } from './types';

const COLORS = {
  primary: '#0E513D',
  secondary: '#58A68E',
  accent: '#FFD02C',
  background: '#F8FBF9',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F9F6',
  white: '#FFFFFF',
  wrong: '#EA2B2B',
  correct: '#58CC02',
  border: '#E9F0EE',
  text: '#102722',
  textSecondary: '#8BA39D',
  placeholder: '#A0B3AE',
};

type LayoutMap = Record<
  string,
  {
    x: number;
    y: number;
    width: number;
    height: number;
  }
>;

type Props = {
  activeType: QuizType;
  currentWord: QuizWord;

  inputValue: string;
  selectedOption: string | null;

  chosenTileIds: string[];

  matchedIds: Set<string>;

  wrongPair: boolean;
  matchingContainerHeight: number;
  remainingSeconds: number;
  isMatchMode: boolean;
  selectedAnswer: string | null;

  currentMatchWords: QuizWord[];

  currentMatchRightItems: {
    id: string;
    label: string;
  }[];

  multipleChoiceOptions: string[];

  selectedScrambledChars: string[];

  tiles: {
    id: string;
    char: string;
  }[];

  selectedLeftId: string | null;
  selectedRightId: string | null;

  pairAssignments: Record<string, string>;
  wrongPairs: Set<string>;

  isTimeUp: boolean;
  hasSubmitted: boolean;
  isMatchComplete: boolean;

  matchRound: number;
  matchRoundCount: number;
  matchScore: number;

  onHandlePairSelection: (
    leftId: string,
    rightId: string
  ) => void;

  onChangeInput: (value: string) => void;

  onSelectOption: (
    option: string | null
  ) => void;

  onHandleChoiceAnswer: () => void;

  onPressTile: (tileId: string) => void;
  onRemoveTile?: (tileId: string) => void;

  onResetChosenTileIds: () => void;

  onSetSelectedLeftId: (
    id: string | null
  ) => void;

  onSetSelectedRightId: (
    id: string | null
  ) => void;

  onSetMatchingContainerHeight: (
    height: number
  ) => void;

  leftItemLayouts: React.MutableRefObject<
    LayoutMap
  >;
  rightItemLayouts: React.MutableRefObject<
    LayoutMap
  >;
};

const ChoiceOption = React.memo(
  ({
    option,
    isSelected,
    isCorrect,
    showResult,
    onPress,
  }: {
    option: string;
    isSelected: boolean;
    isCorrect: boolean;
    showResult: boolean;
    onPress: (value: string) => void;
  }) => {
    return (
      <TouchableOpacity
        disabled={showResult}
        activeOpacity={0.85}
        onPress={() => onPress(option)}
        style={[
          styles.choiceOption,

          isSelected &&
            styles.choiceOptionSelected,

          showResult &&
            isCorrect &&
            styles.choiceOptionCorrect,

          showResult &&
            isSelected &&
            !isCorrect &&
            styles.choiceOptionWrong,
        ]}
      >
        <Text
          style={[
            styles.choiceText,

            (isSelected ||
              (showResult &&
                isCorrect)) && {
              color: COLORS.white,
            },
          ]}
        >
          {option}
        </Text>
      </TouchableOpacity>
    );
  }
);

const FlyingTile = ({ char, startX, startY, targetX, targetY, onComplete }: any) => {
  const anim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.timing(anim, {
      toValue: 1,
      duration: 350,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
      useNativeDriver: false,
    }).start(onComplete);
  }, []);

  const x = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [startX, targetX],
  });

  const y = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [startY, startY - 80, targetY], // Arc
  });

  return (
    <RNAnimated.View
      style={[
        styles.tile,
        {
          position: 'absolute',
          left: x,
          top: y,
          zIndex: 999,
          elevation: 10,
          transform: [{ scale: 1.1 }]
        }
      ]}
    >
      <Text style={styles.tileText}>{char}</Text>
    </RNAnimated.View>
  );
};

export default function QuizQuestionBody({
  activeType,
  currentWord,

  inputValue,
  selectedOption,

  chosenTileIds,

  matchedIds,

  wrongPair,
  matchingContainerHeight,
  remainingSeconds,
  isMatchMode,
  selectedAnswer,

  currentMatchWords,
  currentMatchRightItems,

  multipleChoiceOptions,

  selectedScrambledChars,
  tiles,

  selectedLeftId,
  selectedRightId,

  pairAssignments,
  wrongPairs,

  isTimeUp,
  hasSubmitted,
  isMatchComplete,

  matchRound,
  matchRoundCount,
  matchScore,

  onHandlePairSelection,

  onChangeInput,
  onSelectOption,

  onHandleChoiceAnswer,

  onPressTile,
  onRemoveTile,
  onResetChosenTileIds,

  onSetSelectedLeftId,
  onSetSelectedRightId,

  onSetMatchingContainerHeight,

  leftItemLayouts,
  rightItemLayouts,
}: Props) {
  const cardRef = useRef<View>(null);
  const answerRefs = useRef<Record<number, any>>({});
  const bankRefs = useRef<Record<string, any>>({});
  const [flyingTiles, setFlyingTiles] = useState<{ id: string; char: string; startX: number; startY: number; targetX: number; targetY: number }[]>([]);
  const [fallingTiles, setFallingTiles] = useState<{ id: string; char: string; startX: number; startY: number; targetX: number; targetY: number }[]>([]);

  const handleBankPress = (tileId: string, char: string) => {
    if (chosenTileIds.length >= currentWord.hiragana.length) return;
    if (flyingTiles.some(t => t.id === tileId)) return;
    
    const bankEl = bankRefs.current[tileId];
    const answerIndex = chosenTileIds.length;
    const answerEl = answerRefs.current[answerIndex];

    if (!cardRef.current || !bankEl || !answerEl) {
       onPressTile(tileId); return;
    }

    bankEl.measureLayout(
      cardRef.current,
      (startX: number, startY: number) => {
         answerEl.measureLayout(
           cardRef.current,
           (targetX: number, targetY: number) => {
              setFlyingTiles(prev => [...prev, { id: tileId, char, startX, startY, targetX, targetY }]);
           },
           () => onPressTile(tileId)
         );
      },
      () => onPressTile(tileId)
    );
  };

  const handleFlightComplete = (tileId: string) => {
    setFlyingTiles(prev => prev.filter(t => t.id !== tileId));
    onPressTile(tileId);
  };

  const handleRemovePress = (tileId: string, answerIndex: number, char: string) => {
    const bankEl = bankRefs.current[tileId];
    const answerEl = answerRefs.current[answerIndex];

    if (!cardRef.current || !bankEl || !answerEl) {
       onRemoveTile && onRemoveTile(tileId); return;
    }

    answerEl.measureLayout(
      cardRef.current,
      (startX: number, startY: number) => {
         bankEl.measureLayout(
           cardRef.current,
           (targetX: number, targetY: number) => {
              onRemoveTile && onRemoveTile(tileId);
              setFallingTiles(prev => [...prev, { id: tileId, char, startX, startY, targetX, targetY }]);
           },
           () => { onRemoveTile && onRemoveTile(tileId); }
         );
      },
      () => { onRemoveTile && onRemoveTile(tileId); }
    );
  };

  const handleFallComplete = (tileId: string) => {
    setFallingTiles(prev => prev.filter(t => t.id !== tileId));
  };

  const [tempLine, setTempLine] =
    useState<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    } | null>(null);

  const [matchAreaDimensions, setMatchAreaDimensions] = 
    useState({ width: 0, height: 0, x: 0, y: 0 });

  const [columnOffsets, setColumnOffsets] =
    useState({ left: 0, right: 0 });

  const showMatchResults =
    (hasSubmitted || isTimeUp || wrongPairs.size > 0) &&
    (activeType === 'MATCH_HIRA' ||
      activeType === 'MATCH_MEANING');

  const handleLayout = useCallback(
    (
      side: 'left' | 'right',
      id: string,
      layout: LayoutRectangle
    ) => {
      if (side === 'left') {
        leftItemLayouts.current[id] = layout;
      } else {
        rightItemLayouts.current[id] = layout;
      }
    },
    [leftItemLayouts, rightItemLayouts]
  );

  useEffect(() => {
    if (
      !selectedLeftId ||
      !selectedRightId
    ) {
      setTempLine(null);
      return;
    }

    const left =
      leftItemLayouts.current[
        selectedLeftId
      ];

    const right =
      rightItemLayouts.current[
        selectedRightId
      ];

    if (!left || !right) {
      setTempLine(null);
      return;
    }

    setTempLine({
      x1: left.x + columnOffsets.left + left.width,
      y1: left.y + left.height / 2,

      x2: right.x + columnOffsets.right,
      y2: right.y + right.height / 2,
    });
  }, [
    selectedLeftId,
    selectedRightId,
    leftItemLayouts,
    rightItemLayouts,
    columnOffsets,
  ]);

  const assignedLines = useMemo(() => {
    return Object.entries(
      pairAssignments
    )
      .map(([leftId, rightId]) => {
        const left =
          leftItemLayouts.current[leftId];

        const right =
          rightItemLayouts.current[rightId];

        if (!left || !right) {
          return null;
        }

        const pairKey = `${leftId}_||_${rightId}`;

        const isWrong =
          wrongPairs.has(pairKey);

        return {
          x1: left.x + columnOffsets.left + left.width,
          y1:
            left.y + left.height / 2,

          x2: right.x + columnOffsets.right,
          y2:
            right.y + right.height / 2,

          color: showMatchResults
            ? isWrong
              ? COLORS.wrong
              : COLORS.correct
            : COLORS.secondary,
        };
      })
      .filter(Boolean) as {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: string;
    }[];
  }, [
    pairAssignments,
    wrongPairs,
    showMatchResults,
    leftItemLayouts,
    rightItemLayouts,
    matchAreaDimensions,
  ]);

  const matchedRightIds = useMemo(() => {
    const ids = new Set<string>();

    currentMatchWords.forEach(
      (leftWord) => {
        if (
          matchedIds.has(leftWord.id)
        ) {
          const rightId =
            pairAssignments[
              leftWord.id
            ];

          if (rightId) {
            ids.add(rightId);
          }
        }
      }
    );

    return ids;
  }, [
    currentMatchWords,
    matchedIds,
    pairAssignments,
  ]);

  const [dragLine, setDragLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const gestureTouchRef = useRef({ startX: 0, startY: 0 });

  const handlersRef = useRef({ onHandlePairSelection, onSetSelectedLeftId });
  const columnOffsetsRef = useRef({ left: 0, right: 0 });

  useEffect(() => {
    handlersRef.current = { onHandlePairSelection, onSetSelectedLeftId };
    columnOffsetsRef.current = columnOffsets;
  }, [onHandlePairSelection, onSetSelectedLeftId, columnOffsets]);

  const panResponders = useRef<Record<string, any>>({});

  useEffect(() => {
    currentMatchWords.forEach(word => {
      if (!panResponders.current[word.id]) {
        panResponders.current[word.id] = PanResponder.create({
          onStartShouldSetPanResponder: () => !hasSubmitted,
          onMoveShouldSetPanResponder: () => !hasSubmitted,
          onPanResponderGrant: (e, gs) => {
            handlersRef.current.onSetSelectedLeftId(word.id);
            const left = leftItemLayouts.current[word.id];
            if (left) {
              const x1 = left.x + columnOffsetsRef.current.left + left.width;
              const y1 = left.y + left.height / 2;
              const startX = left.x + columnOffsetsRef.current.left + e.nativeEvent.locationX;
              const startY = left.y + e.nativeEvent.locationY;
              gestureTouchRef.current = { startX, startY };
              setDragLine({ x1, y1, x2: startX, y2: startY });
            }
          },
          onPanResponderMove: (e, gs) => {
            setDragLine(prev => {
              if (!prev) return null;
              const fingerX = gestureTouchRef.current.startX + gs.dx;
              const fingerY = gestureTouchRef.current.startY + gs.dy;
              return { ...prev, x2: fingerX, y2: fingerY };
            });
          },
          onPanResponderRelease: (e, gs) => {
            setDragLine(prev => {
              if (!prev) return null;
              const fingerX = gestureTouchRef.current.startX + gs.dx;
              const fingerY = gestureTouchRef.current.startY + gs.dy;
              let hitRightId: string | null = null;
              let hitLayout: {x: number, y: number, width: number, height: number} | null = null;

              for (const [rId, layout] of Object.entries(rightItemLayouts.current)) {
                const rx = layout.x + columnOffsetsRef.current.right;
                const ry = layout.y;
                if (
                  fingerX >= rx - 30 && fingerX <= rx + layout.width + 30 &&
                  fingerY >= ry - 30 && fingerY <= ry + layout.height + 30
                ) {
                  hitRightId = rId;
                  hitLayout = { x: rx, y: ry, width: layout.width, height: layout.height };
                  break;
                }
              }

              if (hitRightId && hitLayout) {
                // Animate snap
                const startX = fingerX;
                const startY = fingerY;
                const targetX = hitLayout.x;
                const targetY = hitLayout.y + hitLayout.height / 2;
                
                let progress = 0;
                const animateSnap = () => {
                  progress += 0.2; // 5 frames to snap
                  if (progress >= 1) {
                    handlersRef.current.onHandlePairSelection(word.id, hitRightId!);
                    setDragLine(null);
                  } else {
                    const currentX = startX + (targetX - startX) * Math.sin(progress * Math.PI / 2);
                    const currentY = startY + (targetY - startY) * Math.sin(progress * Math.PI / 2);
                    setDragLine(d => d ? { ...d, x2: currentX, y2: currentY } : null);
                    requestAnimationFrame(animateSnap);
                  }
                };
                requestAnimationFrame(animateSnap);
                return prev; // keep showing line while snapping
              } else {
                // Snap back to origin
                const startX = fingerX;
                const startY = fingerY;
                const targetX = prev.x1;
                const targetY = prev.y1;

                let progress = 0;
                const animateBack = () => {
                  progress += 0.15; 
                  if (progress >= 1) {
                    setDragLine(null);
                  } else {
                    const currentX = startX + (targetX - startX) * Math.sin(progress * Math.PI / 2);
                    const currentY = startY + (targetY - startY) * Math.sin(progress * Math.PI / 2);
                    setDragLine(d => d ? { ...d, x2: currentX, y2: currentY } : null);
                    requestAnimationFrame(animateBack);
                  }
                };
                requestAnimationFrame(animateBack);
                return prev;
              }
            });
          }
        });
      }
    });
  }, [currentMatchWords, hasSubmitted, leftItemLayouts, rightItemLayouts]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {(activeType ===
          'MATCH_HIRA' ||
          activeType ===
            'MATCH_MEANING') && (
          <View style={styles.matchBox}>
            <View
              style={styles.matchHeader}
            >
              <Text
                style={
                  styles.matchHeaderText
                }
              >
                Kanji
              </Text>

              <Text
                style={
                  styles.matchHeaderText
                }
              >
                Đáp án
              </Text>
            </View>

            <View
              style={styles.matchArea}
              onLayout={(e) => {
                setMatchAreaDimensions({
                  width:
                    e.nativeEvent.layout
                      .width,
                  height:
                    e.nativeEvent.layout
                      .height,
                  x: e.nativeEvent.layout.x,
                  y: e.nativeEvent.layout.y,
                });
              }}
            >
              <Svg
                width={
                  matchAreaDimensions.width
                }
                height={
                  matchAreaDimensions.height
                }
                style={styles.svg}
                pointerEvents="none"
              >
                {assignedLines.map(
                  (line, index) => (
                    <React.Fragment key={`line-${index}`}>
                      <Path
                        d={`M ${line.x1} ${line.y1} C ${line.x1 + 40} ${line.y1}, ${line.x2 - 40} ${line.y2}, ${line.x2} ${line.y2}`}
                        stroke={line.color}
                        strokeWidth={4}
                        strokeLinecap="round"
                        fill="none"
                      />
                      <Circle cx={line.x1} cy={line.y1} r={6} fill={line.color} />
                      <Circle cx={line.x2} cy={line.y2} r={6} fill={line.color} />
                    </React.Fragment>
                  )
                )}

                {dragLine && (
                  <React.Fragment>
                    <Path
                      d={`M ${dragLine.x1} ${dragLine.y1} C ${dragLine.x1 + 40} ${dragLine.y1}, ${dragLine.x2 - 40} ${dragLine.y2}, ${dragLine.x2} ${dragLine.y2}`}
                      stroke={COLORS.secondary}
                      strokeWidth={4}
                      strokeDasharray="8 6"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <Circle cx={dragLine.x1} cy={dragLine.y1} r={6} fill={COLORS.secondary} />
                    <Circle cx={dragLine.x2} cy={dragLine.y2} r={6} fill={COLORS.secondary} />
                  </React.Fragment>
                )}

                {tempLine && (
                  <React.Fragment>
                    <Path
                      d={`M ${tempLine.x1} ${tempLine.y1} C ${tempLine.x1 + 40} ${tempLine.y1}, ${tempLine.x2 - 40} ${tempLine.y2}, ${tempLine.x2} ${tempLine.y2}`}
                      stroke={wrongPair ? COLORS.wrong : COLORS.secondary}
                      strokeWidth={4}
                      strokeDasharray="8 6"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <Circle cx={tempLine.x1} cy={tempLine.y1} r={6} fill={wrongPair ? COLORS.wrong : COLORS.secondary} />
                    <Circle cx={tempLine.x2} cy={tempLine.y2} r={6} fill={wrongPair ? COLORS.wrong : COLORS.secondary} />
                  </React.Fragment>
                )}
              </Svg>

              {/* LEFT */}
              <View
                style={styles.matchColumn}
                onLayout={(e) => {
                  const layout = e.nativeEvent.layout;
                  setColumnOffsets((prev) => ({
                    ...prev,
                    left: layout.x,
                  }));
                }}
              >
                {currentMatchWords.map(
                  (word) => {
                    const isAssigned =
                      pairAssignments[word.id] !== undefined;

                    const isMatched =
                      showMatchResults
                        ? matchedIds.has(word.id)
                        : isAssigned;

                    const isSelected = selectedLeftId === word.id;

                    return (
                      <View
                        key={word.id}
                        style={{width: '100%', touchAction: 'none' as any}}
                        onLayout={(e) => {
                          const layout = e.nativeEvent.layout;
                          handleLayout('left', word.id, layout);
                        }}
                        {...(panResponders.current[word.id]?.panHandlers || {})}
                      >
                        <TouchableOpacity
                          activeOpacity={0.85}
                          disabled={hasSubmitted || wrongPairs.size > 0}
                          onPress={() => {
                            if (isAssigned) {
                              onHandlePairSelection(word.id, 'UNLINK');
                            } else if (selectedRightId) {
                              onHandlePairSelection(word.id, selectedRightId);
                            } else {
                              onSetSelectedLeftId(selectedLeftId === word.id ? null : word.id);
                            }
                          }}
                          style={[
                            styles.matchItem,
                            isSelected && styles.matchSelected,
                            isAssigned && !showMatchResults && styles.matchAssigned,
                            isMatched && showMatchResults && styles.matchCorrect,
                            showMatchResults && !isMatched && styles.matchWrong,
                          ]}
                        >
                          <Text
                            style={[
                              styles.matchKanji,
                              isMatched && { color: COLORS.white },
                            ]}
                          >
                            {word.kanji}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }
                )}
              </View>

              {/* RIGHT */}
              <View
                style={styles.matchColumn}
                onLayout={(e) => {
                  const layout = e.nativeEvent.layout;
                  setColumnOffsets((prev) => ({
                    ...prev,
                    right: layout.x,
                  }));
                }}
              >
                {currentMatchRightItems.map(
                  (item) => {
                    const isAssigned =
                      Object.values(
                        pairAssignments
                      ).includes(item.id);

                    const isMatched =
                      showMatchResults
                        ? matchedRightIds.has(
                            item.id
                          )
                        : isAssigned;

                    const isSelected =
                      selectedRightId ===
                      item.id;

                    return (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={
                          0.85
                        }
                        disabled={
                          hasSubmitted || wrongPairs.size > 0
                        }
                        onLayout={(e) => {
                          const layout = e.nativeEvent.layout;
                          handleLayout('right', item.id, layout);
                        }}
                        onPress={() => {
                          if (isAssigned) {
                            const leftId = Object.keys(pairAssignments).find(key => pairAssignments[key] === item.id);
                            if (leftId) {
                              onHandlePairSelection(leftId, 'UNLINK_RIGHT:' + item.id);
                            }
                          } else if (
                            selectedLeftId
                          ) {
                            onHandlePairSelection(
                              selectedLeftId,
                              item.id
                            );
                          } else {
                            onSetSelectedRightId(
                              selectedRightId === item.id ? null : item.id
                            );
                          }
                        }}
                        style={[
                          styles.matchItem,

                          isSelected &&
                            styles.matchSelected,

                          isAssigned &&
                            !showMatchResults &&
                            styles.matchAssigned,

                          isMatched &&
                            styles.matchCorrect,

                          showMatchResults &&
                            !isMatched &&
                            styles.matchWrong,
                        ]}
                      >
                        <Text
                          style={[
                            styles.matchAnswer,

                            isMatched && {
                              color:
                                COLORS.white,
                            },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>
            </View>

            <View
              style={styles.matchFooter}
            >
              <Text
                style={styles.footerText}
              >
                Hồi{' '}
                {matchRound + 1}/
                {matchRoundCount}
              </Text>

              <Text
                style={styles.footerText}
              >
                Đã ghép{' '}
                {
                  Object.keys(
                    pairAssignments
                  ).length
                }
                /
                {
                  currentMatchWords.length
                }
              </Text>

              {wrongPair && (
                <Text
                  style={
                    styles.errorText
                  }
                >
                  Sai rồi, thử lại nhé!
                </Text>
              )}
            </View>
          </View>
        )}

        {activeType ===
          'MULTIPLE_CHOICE' && (
          <View style={styles.card}>
            <Text style={styles.title}>
              Chọn đáp án đúng
            </Text>

            <Text style={styles.word}>
              {currentWord.kanji}
            </Text>

            <View style={styles.options}>
              {multipleChoiceOptions.map(
                (option) => (
                  <ChoiceOption
                    key={option}
                    option={option}
                    isSelected={
                      selectedOption ===
                      option
                    }
                    isCorrect={
                      option ===
                      currentWord.meaning
                    }
                    showResult={
                      hasSubmitted ||
                      isTimeUp
                    }
                    onPress={(value) =>
                      onSelectOption(
                        value
                      )
                    }
                  />
                )
              )}
            </View>
          </View>
        )}

        {activeType ===
          'SCRAMBLED_HIRA' && (
          <View style={styles.card} ref={cardRef}>
            <Text style={styles.title}>
              Sắp xếp Hiragana
            </Text>

            <Text style={styles.word}>
              {currentWord.kanji}
            </Text>

            <View
              style={[styles.scrambleBox, { flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 48, paddingHorizontal: 12, paddingVertical: 8 }]}
            >
              {Array.from({ length: currentWord.hiragana.length }).map((_, index) => {
                const tileId = chosenTileIds[index];
                const tile = tileId ? tiles.find(t => t.id === tileId) : null;
                
                return (
                  <View
                    key={`ans-slot-${index}`}
                    ref={el => { answerRefs.current[index] = el; }}
                    style={[styles.tile, { backgroundColor: tile ? COLORS.primary : 'rgba(0,0,0,0.05)', borderWidth: tile ? 0 : 1, borderColor: 'rgba(0,0,0,0.1)', borderStyle: 'dashed' }]}
                  >
                    {tile && !fallingTiles.some(f => f.id === tile.id) ? (
                      <TouchableOpacity
                        disabled={hasSubmitted}
                        onPress={() => handleRemovePress(tileId, index, tile.char)}
                        style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}
                      >
                        <Text style={[styles.tileText, { color: COLORS.white }]}>{tile.char}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
            </View>

            <View
              style={styles.tilesWrap}
            >
              {tiles.map((tile) => {
                const used =
                  chosenTileIds.includes(tile.id) ||
                  flyingTiles.some(f => f.id === tile.id) ||
                  fallingTiles.some(f => f.id === tile.id);

                return (
                  <View key={tile.id} ref={el => { bankRefs.current[tile.id] = el; }}>
                    <TouchableOpacity
                      disabled={used || hasSubmitted || chosenTileIds.length >= currentWord.hiragana.length}
                      onPress={() => handleBankPress(tile.id, tile.char)}
                      style={[
                        styles.tile,
                        used && { opacity: 0 },
                      ]}
                    >
                      <Text style={styles.tileText}>{tile.char}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {flyingTiles.map(f => (
              <FlyingTile key={`fly-${f.id}`} char={f.char} startX={f.startX} startY={f.startY} targetX={f.targetX} targetY={f.targetY} onComplete={() => handleFlightComplete(f.id)} />
            ))}
            {fallingTiles.map(f => (
              <FlyingTile key={`fall-${f.id}`} char={f.char} startX={f.startX} startY={f.startY} targetX={f.targetX} targetY={f.targetY} onComplete={() => handleFallComplete(f.id)} />
            ))}

            <TouchableOpacity
              onPress={onResetChosenTileIds}
              style={styles.resetBtn}
            >
              <Text
                style={
                  styles.resetBtnText
                }
              >
                XÓA
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {activeType ===
          'WRITE_HIRA' && (
          <View style={styles.card}>
            <Text style={styles.title}>
              Viết Hiragana
            </Text>

            <Text style={styles.word}>
              {currentWord.kanji}
            </Text>

            <TextInput
              value={inputValue}
              onChangeText={
                onChangeInput
              }
              editable={
                !hasSubmitted
              }
              autoCorrect={false}
              placeholder="Nhập hiragana..."
              placeholderTextColor={
                COLORS.placeholder
              }
              style={styles.input}
            />

            <Text
              style={styles.meaning}
            >
              Nghĩa:{' '}
              {currentWord.meaning}
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  title: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 16,
  },

  word: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 24,
  },

  options: {
    gap: 12,
  },

  choiceOption: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 18,
    backgroundColor:
      COLORS.surface,
  },

  choiceOptionSelected: {
    backgroundColor:
      COLORS.primary,
    borderColor:
      COLORS.primary,
  },

  choiceOptionCorrect: {
    backgroundColor:
      COLORS.correct,
    borderColor:
      COLORS.correct,
  },

  choiceOptionWrong: {
    backgroundColor:
      COLORS.wrong,
    borderColor:
      COLORS.wrong,
  },

  choiceText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },

  matchBox: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },

  matchHeader: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    marginBottom: 20,
  },

  matchHeaderText: {
    fontSize: 13,
    fontWeight: '800',
    color:
      COLORS.textSecondary,
  },

  matchArea: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    position: 'relative',
    gap: 60,
    paddingVertical: 6,
  },

  matchColumn: {
    flex: 1,
    gap: 10,
    backgroundColor: '#F4FBF7',
    borderRadius: 20,
    padding: 10,
  },

  matchItem: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D8E9E2',
    backgroundColor:
      '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  matchSelected: {
    borderColor:
      COLORS.secondary,
    backgroundColor:
      COLORS.surfaceAlt,
  },

  matchAssigned: {
    borderColor:
      COLORS.secondary,
    backgroundColor:
      '#E8F8F5',
  },

  matchCorrect: {
    borderColor:
      COLORS.correct,
    backgroundColor:
      COLORS.correct,
  },

  matchWrong: {
    borderColor:
      COLORS.wrong,
    backgroundColor:
      '#FFF1F1',
  },

  matchKanji: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
  },

  matchAnswer: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },

  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 0,
  },

  matchFooter: {
    marginTop: 24,
    alignItems: 'center',
    gap: 4,
  },

  footerText: {
    fontWeight: '700',
    color:
      COLORS.textSecondary,
  },

  errorText: {
    color: COLORS.wrong,
    fontWeight: '800',
  },

  scrambleBox: {
    minHeight: 90,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },

  scrambleText: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.text,
  },

  tilesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },

  tile: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor:
      COLORS.surface,
  },

  tileUsed: {
    opacity: 0.35,
  },

  tileText: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
  },

  resetBtn: {
    marginTop: 20,
    alignSelf: 'center',
  },

  resetBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.secondary,
  },

  input: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 18,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: COLORS.text,
    backgroundColor:
      COLORS.surface,
  },

  meaning: {
    marginTop: 14,
    textAlign: 'center',
    fontWeight: '700',
    color:
      COLORS.textSecondary,
  },
});