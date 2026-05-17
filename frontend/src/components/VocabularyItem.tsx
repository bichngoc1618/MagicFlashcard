import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Pencil, Trash2 } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export type FlashcardData = {
  id: number;
  word?: string;
  kanji?: string;
  hiragana?: string;
  meaning?: string;
  example?: string;
};

type VocabularyItemProps = {
  card: FlashcardData;
  onEdit: (card: FlashcardData) => void;
  onDelete: (id: number) => void;
};

export default function VocabularyItem({ card, onEdit, onDelete }: VocabularyItemProps) {
  const { colors } = useTheme();

  const displayText = useMemo(
    () => card.word || card.hiragana || 'Chưa đặt tên',
    [card.word, card.hiragana],
  );

  const dynamicStyles = StyleSheet.create({
    card: {
      marginBottom: 14,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    },
    word: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    kanji: {
      marginTop: 4,
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    meaning: {
      marginTop: 8,
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    example: {
      marginTop: 8,
      fontSize: 12,
      color: colors.textSecondary,
      fontStyle: 'italic',
      borderLeftWidth: 2,
      borderLeftColor: colors.border,
      paddingLeft: 8,
    },
    button: {
      padding: 12,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 46,
      minHeight: 46,
    },
    editBtn: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    deleteBtn: {
      backgroundColor: '#FFF5F5',
      borderWidth: 1,
      borderColor: '#FEE2E2',
    },
  });

  return (
    <View style={dynamicStyles.card}>
      <View style={styles.row}>
        <View style={styles.content}>
          <Text style={dynamicStyles.word} numberOfLines={1}>
            {displayText}
          </Text>

          {card.kanji && <Text style={dynamicStyles.kanji}>{card.kanji}</Text>}
          {card.meaning && <Text style={dynamicStyles.meaning}>{card.meaning}</Text>}
          {card.example && <Text style={dynamicStyles.example}>{card.example}</Text>}
        </View>

        <View style={styles.actions}>
            <TouchableOpacity
            onPress={() => onEdit(card)}
            style={[dynamicStyles.button, dynamicStyles.editBtn]}
            activeOpacity={0.7}
            hitSlop={styles.hitSlop}
            accessibilityRole="button"
            accessibilityLabel="Chỉnh sửa từ vựng"
          >
            <Pencil size={18} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onDelete(card.id)}
            style={[dynamicStyles.button, dynamicStyles.deleteBtn]}
            activeOpacity={0.7}
            hitSlop={styles.hitSlop}
            accessibilityRole="button"
            accessibilityLabel="Xóa từ vựng"
          >
            <Trash2 size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    paddingRight: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  pressed: {
    opacity: 0.75,
  },
  hitSlop: {
    top: 8,
    bottom: 8,
    left: 8,
    right: 8,
  },
});
