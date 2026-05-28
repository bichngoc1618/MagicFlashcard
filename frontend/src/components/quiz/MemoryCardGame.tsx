import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Image } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import type { QuizWord } from './types';
import * as Haptics from 'expo-haptics';

interface MemoryCardGameProps {
  words: QuizWord[];
  onComplete: (correctMatches: number, wrongAttempts: number) => void;
  isRevealed?: boolean;
}

type CardType = 'kanji' | 'hiragana' | 'meaning';

interface CardData {
  id: string; // unique string for the card
  wordId: string; // ID of the word it belongs to
  type: CardType;
  text: string;
}

const { width } = Dimensions.get('window');
const CARD_MARGIN = 6;
// 4 columns to fit on screen without scrolling
const CARD_WIDTH = (width - 32 - CARD_MARGIN * 8) / 4;
const CARD_HEIGHT = CARD_WIDTH * 1.25;

export default function MemoryCardGame({ words, onComplete, isRevealed }: MemoryCardGameProps) {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  const [cards, setCards] = useState<CardData[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [wrongAttempts, setWrongAttempts] = useState(0);

  // Animation values for each card
  const flipAnims = useRef<{ [key: number]: Animated.Value }>({}).current;

  useEffect(() => {
    // Generate cards
    let generatedCards: CardData[] = [];
    
    words.forEach((word) => {
      // Card A: Kanji
      generatedCards.push({
        id: `${word.id}-kanji`,
        wordId: word.id,
        type: 'kanji',
        text: word.kanji || word.hiragana
      });

      // Card B: Hira or Meaning (Randomly mix)
      const isHira = Math.random() > 0.5;
      generatedCards.push({
        id: `${word.id}-${isHira ? 'hira' : 'meaning'}`,
        wordId: word.id,
        type: isHira ? 'hiragana' : 'meaning',
        text: isHira ? word.hiragana : word.meaning
      });
    });

    // Shuffle cards
    generatedCards = generatedCards.sort(() => Math.random() - 0.5);
    setCards(generatedCards);

    // Initialize flip animations
    generatedCards.forEach((_, index) => {
      flipAnims[index] = new Animated.Value(0);
    });
  }, [words]);

  useEffect(() => {
    if (isRevealed) {
      cards.forEach((_, index) => {
        if (!flippedIndices.includes(index) && !matchedIds.has(cards[index].wordId)) {
          flipCardToFront(index);
        }
      });
    }
  }, [isRevealed, cards, flippedIndices, matchedIds]);

  const flipCardToFront = (index: number) => {
    Animated.spring(flipAnims[index], {
      toValue: 180,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  };

  const flipCardToBack = (index: number) => {
    Animated.spring(flipAnims[index], {
      toValue: 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  };

  const handleCardPress = (index: number) => {
    // Prevent pressing if already flipped, matched, or 2 cards are currently flipping
    if (flippedIndices.includes(index) || matchedIds.has(cards[index].wordId) || flippedIndices.length >= 2) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    flipCardToFront(index);
    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      const [firstIndex, secondIndex] = newFlipped;
      const firstCard = cards[firstIndex];
      const secondCard = cards[secondIndex];

      if (firstCard.wordId === secondCard.wordId) {
        // Match!
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => {
          setMatchedIds(prev => {
            const newMatched = new Set(prev).add(firstCard.wordId);
            if (newMatched.size === words.length) {
              onComplete(words.length, wrongAttempts);
            }
            return newMatched;
          });
          setFlippedIndices([]);
        }, 500);
      } else {
        // No match
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setWrongAttempts(prev => prev + 1);
        setTimeout(() => {
          flipCardToBack(firstIndex);
          flipCardToBack(secondIndex);
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  const renderCard = (card: CardData, index: number) => {
    const isFlipped = flippedIndices.includes(index) || matchedIds.has(card.wordId) || isRevealed;
    const isMatched = matchedIds.has(card.wordId);

    const frontOpacity = flipAnims[index]?.interpolate({
      inputRange: [0, 89, 90, 180],
      outputRange: [1, 1, 0, 0],
    }) || 1;

    const maxBackOpacity = isMatched ? 0.7 : 1;
    const backOpacity = flipAnims[index]?.interpolate({
      inputRange: [0, 90, 91, 180],
      outputRange: [0, 0, maxBackOpacity, maxBackOpacity],
    }) || 0;

    const frontAnimatedStyle = {
      opacity: frontOpacity,
      transform: [
        { perspective: 1000 },
        {
          rotateY: flipAnims[index]?.interpolate({
            inputRange: [0, 180],
            outputRange: ['0deg', '180deg'],
          }) || '0deg'
        }
      ]
    };

    const backAnimatedStyle = {
      opacity: backOpacity,
      transform: [
        { perspective: 1000 },
        {
          rotateY: flipAnims[index]?.interpolate({
            inputRange: [0, 180],
            outputRange: ['180deg', '360deg'],
          }) || '180deg'
        }
      ]
    };

    return (
      <View key={card.id} style={styles.cardContainer}>
        {/* Mặt úp (Mặt có logo/chấm hỏi) */}
        <Animated.View style={[
          styles.cardBase, 
          styles.cardFront, 
          frontAnimatedStyle,
          { backgroundColor: isDark ? '#1E293B' : '#E2E8F0', borderColor: isDark ? '#334155' : '#CBD5E1' }
        ]}>
          <TouchableOpacity 
            style={styles.touchable} 
            activeOpacity={1} 
            onPress={() => handleCardPress(index)}
            disabled={isRevealed}
          >
            <Image 
              source={require('../../../assets/sharkMagic.png')} 
              style={{ width: 44, height: 44, resizeMode: 'contain', opacity: isDark ? 0.8 : 1 }} 
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Mặt ngửa (Mặt có chữ) */}
        <Animated.View style={[
          styles.cardBase, 
          styles.cardBack, 
          backAnimatedStyle,
          { 
            backgroundColor: isMatched ? (isDark ? '#065F46' : '#D1FAE5') : (isDark ? '#334155' : '#FFFFFF'),
            borderColor: isMatched ? (isDark ? '#10B981' : '#34D399') : (isDark ? '#475569' : '#E2E8F0'),
          }
        ]}>
          <TouchableOpacity 
            style={styles.touchable} 
            activeOpacity={1} 
            onPress={() => handleCardPress(index)}
            disabled={isRevealed}
          >
            <Text style={[
              styles.cardText, 
              { 
                color: isMatched ? (isDark ? '#A7F3D0' : '#065F46') : colors.text,
                fontSize: card.type === 'meaning' ? 12 : 16 
              }
            ]}>
              {card.text}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.instruction, { color: colors.textSecondary }]}>
        Lật thẻ để tìm các cặp tương ứng
      </Text>
      <View style={styles.grid}>
        {cards.map((card, index) => renderCard(card, index))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  instruction: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    margin: CARD_MARGIN,
    position: 'relative',
  },
  cardBase: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    backfaceVisibility: 'hidden',
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardFront: {
    zIndex: 2,
  },
  cardBack: {
    zIndex: 1,
  },
  touchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  questionMark: {
    fontSize: 32,
    fontWeight: '900',
  },
  cardText: {
    fontWeight: '800',
    textAlign: 'center',
  }
});
