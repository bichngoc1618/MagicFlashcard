import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Animated,
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  Pressable,
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import { Menu, Plus, X } from 'lucide-react-native';

import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  createFlashcard,
  deleteFlashcard,
  getFlashcards,
  bulkCreateFlashcards,
  updateFlashcard,
} from '../api/api';

import VocabularyItem from './VocabularyItem';
import AddVocabularyModal from './AddVocabularyModal';

export type FlashcardData = {
  id: number;
  word?: string;
  kanji?: string;
  hiragana?: string;
  meaning?: string;
  example?: string;
};

type VocabularyManagerProps = {
  materialId: number;
  materialTitle?: string;
  iconSize?: number;
};

export default function VocabularyManager({
  materialId,
  materialTitle,
  iconSize = 18,
}: VocabularyManagerProps) {
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();

  const [cards, setCards] = useState<FlashcardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState<FlashcardData | null>(null);

  const [toast, setToast] = useState('');

  const slideAnim = useRef(new Animated.Value(600)).current;

  const refreshCards = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await getFlashcards(materialId, Number(user.id));
      setCards(res.flashcards || []);
    } catch (e) {
      console.warn('Lỗi tải từ vựng:', e);
    } finally {
      setLoading(false);
    }
  }, [materialId, user?.id]);

  useEffect(() => {
    refreshCards();
  }, [refreshCards]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = useCallback((msg: string) => setToast(msg), []);

  const openEditor = useCallback((card?: FlashcardData) => {
    setSelectedCard(card ?? null);
    setEditorVisible(true);
  }, []);

  const closeEditor = useCallback(() => {
    setSelectedCard(null);
    setEditorVisible(false);
  }, []);

  const closeSheet = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 600,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setIsOpen(false));
  }, [slideAnim]);

  const toggleSheet = useCallback(() => {
    if (isOpen) {
      closeSheet();
      return;
    }

    setIsOpen(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 40,
      friction: 9,
    }).start();
  }, [closeSheet, isOpen, slideAnim]);

  const handleDeleteCard = useCallback((id: number) => {
    Alert.alert('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa từ vựng này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await deleteFlashcard(id);
            setCards((prev) => prev.filter((c) => c.id !== id));
            showToast('Đã xóa thành công');
          } catch (e) {
            Alert.alert('Lỗi', 'Không thể xóa từ vựng');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }, [showToast]);

  const handleSaveCard = useCallback(async (payload: any) => {
    if (!user?.id) return;
    setActionLoading(true);
    try {
      if (selectedCard) {
        await updateFlashcard(selectedCard.id, payload);
        showToast('Cập nhật thành công');
      } else {
        await createFlashcard(materialId, payload);
        showToast('Thêm từ mới thành công');
      }
      await refreshCards();
      closeEditor();
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lưu dữ liệu');
    } finally {
      setActionLoading(false);
    }
  }, [closeEditor, materialId, refreshCards, selectedCard, showToast, user?.id]);

  const handleBulkImport = useCallback(async (payloads: any[]) => {
    setActionLoading(true);
    try {
      await bulkCreateFlashcards(materialId, payloads);
      await refreshCards();
      showToast(`Đã nhập thành công ${payloads.length} từ`);
    } catch (e) {
      Alert.alert('Lỗi', 'Quá trình Import gặp sự cố');
    } finally {
      setActionLoading(false);
    }
  }, [materialId, refreshCards, showToast]);

  const dynamicStyles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'flex-end',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'transparent',
    },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.card,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      padding: 20,
      minHeight: '60%',
      maxHeight: '85%',
      zIndex: 10,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
      alignItems: 'center',
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    addBtn: {
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 14,
      elevation: 2,
      shadowColor: colors.primary,
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    line: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 15,
      opacity: 0.5,
    },
    toast: {
      position: 'absolute',
      bottom: 40,
      left: 20,
      right: 20,
      backgroundColor: '#333',
      padding: 14,
      borderRadius: 16,
      alignItems: 'center',
      zIndex: 9999,
    },
  });

  return (
    <>
      <Pressable
        onPress={toggleSheet}
        style={styles.fab}
        hitSlop={styles.hitSlop}
        accessibilityRole="button"
        accessibilityLabel="Mở danh sách từ vựng"
      >
        <Menu size={iconSize} color={colors.primary} />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={closeSheet}
        statusBarTranslucent
      >
        <View style={dynamicStyles.modalContainer}>
          <Pressable style={dynamicStyles.overlay} onPress={closeSheet} />

          <Animated.View
            style={[
              dynamicStyles.sheet,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={dynamicStyles.header}>
              <View>
                <Text style={dynamicStyles.title}>Từ vựng của bạn</Text>
                {materialTitle && (
                  <Text style={dynamicStyles.subtitle}>{materialTitle}</Text>
                )}
              </View>
              <TouchableOpacity onPress={closeSheet} style={styles.closeIcon} activeOpacity={0.7}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.row, { marginBottom: 12 }]}> 
              <Text style={dynamicStyles.sectionTitle}>
                {cards.length} Flashcards
              </Text>
              <TouchableOpacity
                onPress={() => openEditor()}
                style={[dynamicStyles.addBtn]}
                activeOpacity={0.8}
                hitSlop={styles.hitSlop}
                accessibilityRole="button"
                accessibilityLabel="Thêm flashcard mới"
              >
                <Plus size={18} color="white" />
                <Text style={styles.addText}>Thêm</Text>
              </TouchableOpacity>
            </View>

            <View style={dynamicStyles.line} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
              keyboardShouldPersistTaps="handled"
            >
              {loading ? (
                <View style={{ marginTop: 40 }}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : cards.length === 0 ? (
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                  <Text style={styles.emptyText}>Chưa có từ vựng nào trong mục này.</Text>
                  <TouchableOpacity
                    onPress={() => openEditor()}
                    style={[
                      dynamicStyles.addBtn,
                      { marginTop: 20 },
                    ]}
                    activeOpacity={0.8}
                    hitSlop={styles.hitSlop}
                    accessibilityRole="button"
                    accessibilityLabel="Thêm flashcard mới"
                  >
                    <Plus size={18} color="white" />
                    <Text style={styles.addText}>Thêm từ đầu tiên</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {cards.map((card) => (
                    <VocabularyItem
                      key={card.id}
                      card={card}
                      onEdit={() => openEditor(card)}
                      onDelete={() => handleDeleteCard(card.id)}
                    />
                  ))}
                  <View style={{ alignItems: 'center', marginTop: 20 }}>
                    <TouchableOpacity
                      onPress={() => openEditor()}
                      style={dynamicStyles.addBtn}
                      activeOpacity={0.8}
                      hitSlop={styles.hitSlop}
                      accessibilityRole="button"
                      accessibilityLabel="Thêm flashcard mới"
                    >
                      <Plus size={18} color="white" />
                      <Text style={styles.addText}>Thêm từ mới</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </Animated.View>

          <AddVocabularyModal
            visible={editorVisible}
            materialTitle={materialTitle}
            initialCard={selectedCard}
            onClose={closeEditor}
            onSaveCard={handleSaveCard}
            onImportCards={handleBulkImport}
            loading={actionLoading}
          />
        </View>
      </Modal>

      {!!toast && (
        <View style={dynamicStyles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  hitSlop: {
    top: 8,
    bottom: 8,
    left: 8,
    right: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeIcon: {
    padding: 8,
    backgroundColor: '#f0f0f030',
    borderRadius: 99,
  },
  addText: {
    color: 'white',
    fontWeight: 'bold',
  },
  pressedButton: {
    opacity: 0.85,
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 50,
    fontStyle: 'italic',
  },
  toastText: {
    color: 'white',
    fontWeight: '600',
  },
});
