import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
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
} from 'react-native';
import type { LayoutRectangle } from 'react-native';

import Svg, { Line } from 'react-native-svg';

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
  onResetChosenTileIds,

  onSetSelectedLeftId,
  onSetSelectedRightId,

  onSetMatchingContainerHeight,

  leftItemLayouts,
  rightItemLayouts,
}: Props) {
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
    (hasSubmitted || isTimeUp) &&
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

        const pairKey = `${leftId}-${rightId}`;

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
                    <Line
                      key={`line-${index}`}
                      x1={line.x1}
                      y1={line.y1}
                      x2={line.x2}
                      y2={line.y2}
                      stroke={line.color}
                      strokeWidth={4}
                      strokeLinecap="round"
                    />
                  )
                )}

                {tempLine && (
                  <Line
                    x1={tempLine.x1}
                    y1={tempLine.y1}
                    x2={tempLine.x2}
                    y2={tempLine.y2}
                    stroke={
                      wrongPair
                        ? COLORS.wrong
                        : COLORS.secondary
                    }
                    strokeWidth={4}
                    strokeDasharray="8 6"
                    strokeLinecap="round"
                  />
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
                      pairAssignments[
                        word.id
                      ] !== undefined;

                    const isMatched =
                      showMatchResults
                        ? matchedIds.has(
                            word.id
                          )
                        : isAssigned;

                    const isSelected =
                      selectedLeftId ===
                      word.id;

                    return (
                      <TouchableOpacity
                        key={word.id}
                        activeOpacity={
                          0.85
                        }
                        disabled={
                          hasSubmitted
                        }
                        onLayout={(e) => {
                          const layout = e.nativeEvent.layout;
                          handleLayout('left', word.id, layout);
                        }}
                        onPress={() =>
                          onSetSelectedLeftId(
                            word.id
                          )
                        }
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
                            styles.matchKanji,

                            isMatched && {
                              color:
                                COLORS.white,
                            },
                          ]}
                        >
                          {word.kanji}
                        </Text>
                      </TouchableOpacity>
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
                          hasSubmitted
                        }
                        onLayout={(e) => {
                          const layout = e.nativeEvent.layout;
                          handleLayout('right', item.id, layout);
                        }}
                        onPress={() => {
                          if (
                            selectedLeftId
                          ) {
                            onHandlePairSelection(
                              selectedLeftId,
                              item.id
                            );
                          } else {
                            onSetSelectedRightId(
                              item.id
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
          <View style={styles.card}>
            <Text style={styles.title}>
              Sắp xếp Hiragana
            </Text>

            <View
              style={styles.scrambleBox}
            >
              <Text
                style={
                  styles.scrambleText
                }
              >
                {selectedScrambledChars.join(
                  ''
                )}
              </Text>
            </View>

            <View
              style={styles.tilesWrap}
            >
              {tiles.map((tile) => {
                const used =
                  chosenTileIds.includes(
                    tile.id
                  );

                return (
                  <TouchableOpacity
                    key={tile.id}
                    disabled={
                      used ||
                      hasSubmitted
                    }
                    onPress={() =>
                      onPressTile(
                        tile.id
                      )
                    }
                    style={[
                      styles.tile,

                      used &&
                        styles.tileUsed,
                    ]}
                  >
                    <Text
                      style={
                        styles.tileText
                      }
                    >
                      {tile.char}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={
                onResetChosenTileIds
              }
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
    gap: 12,
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