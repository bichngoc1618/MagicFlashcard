import React, {
  useCallback,
  useEffect,
  useMemo,
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
  View,
  StyleSheet,
} from 'react-native';

import { Menu, Plus, X } from 'lucide-react-native';

import { useAuthContext } from '../context/AuthContext';
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
  const { user } = useAuthContext();
  const { colors } = useTheme();

  const [cards, setCards] = useState<FlashcardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState<FlashcardData | null>(null);

  const [toast, setToast] = useState('');

  const slideAnim = useRef(new Animated.Value(400)).current;

  /* ================= LOAD ================= */
  const refreshCards = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);

    try {
      const res = await getFlashcards(materialId, Number(user.id));
      setCards(res.flashcards || []);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [materialId, user?.id]);

  useEffect(() => {
    refreshCards();
  }, [refreshCards]);

  /* ================= TOAST (Đã sửa thành 2s biến mất) ================= */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2000); // 2000ms = 2 giây
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg: string) => setToast(msg);

  /* ================= SHEET ================= */
  const toggleSheet = () => {
    if (isOpen) {
      closeSheet();
    } else {
      setIsOpen(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };

  const closeSheet = () => {
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setIsOpen(false));
  };

  /* ================= EDITOR ================= */
  const openEditor = (card?: FlashcardData) => {
    const doOpen = () => {
      setSelectedCard(card ?? null);
      setEditorVisible(true);
    };

    if (isOpen) {
      closeSheet();
      setTimeout(doOpen, 260);
    } else {
      doOpen();
    }
  };

  const closeEditor = () => {
    setSelectedCard(null);
    setEditorVisible(false);
  };

  /* ================= DELETE ================= */
  const handleDeleteCard = (id: number) => {
    Alert.alert('Xóa từ vựng', 'Bạn chắc chưa?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await deleteFlashcard(id);
            setCards((prev) => prev.filter((c) => c.id !== id));
            showToast('Đã xóa');
          } catch (e) {
            Alert.alert('Lỗi', 'Không xóa được');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  /* ================= SAVE ================= */
  const handleSaveCard = async (payload: any) => {
    if (!user?.id) return;

    setActionLoading(true);

    try {
      if (selectedCard) {
        await updateFlashcard(selectedCard.id, payload);
        showToast('Đã cập nhật');
      } else {
        await createFlashcard(materialId, payload);
        showToast('Đã thêm');
      }

      await refreshCards();
      closeEditor();
    } catch (e) {
      Alert.alert('Lỗi', 'Không lưu được');
    } finally {
      setActionLoading(false);
    }
  };

  /* ================= BULK ================= */
  const handleBulkImport = async (payloads: any[]) => {
    setActionLoading(true);

    try {
      await bulkCreateFlashcards(materialId, payloads);
      await refreshCards();
      showToast(`Đã thêm ${payloads.length} từ`);
    } catch (e) {
      Alert.alert('Lỗi import');
    } finally {
      setActionLoading(false);
    }
  };

  const items = useMemo(() => cards, [cards]);

  /* ================= UI STYLES ================= */
  const dynamicStyles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      minHeight: 400,
      maxHeight: '85%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 15,
      alignItems: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    addBtn: {
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      gap: 6,
    },
    addText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '600',
    },
    line: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 15,
    },
    empty: {
      textAlign: 'center',
      color: colors.textSecondary,
      fontStyle: 'italic',
      marginTop: 20,
    },
    /* 🎨 ĐÃ THAY ĐỔI: Toast thiết kế viên thuốc (Mini-Pill) sang trọng */
    toast: {
      position: 'absolute',
      bottom: 50,                    // Đẩy cao tránh đè thanh điều hướng đáy
      alignSelf: 'center',           // Tự động thu gọn theo text và căn giữa
      backgroundColor: 'rgba(28, 28, 33, 0.95)', // Màu tối mờ huyền bí
      paddingVertical: 10,
      paddingHorizontal: 22,
      borderRadius: 100,             // Bo tròn tuyệt đối
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 5,
      zIndex: 9999,
    },
    toastText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    fab: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 999,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
      zIndex: 10,
    },
  });

  return (
    <>
      {/* BUTTON OPEN */}
      <TouchableOpacity
        style={[styles.fab, dynamicStyles.fab]}
        onPress={toggleSheet}
        activeOpacity={0.8}
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        accessibilityRole="button"
        accessibilityLabel="Quản lý từ vựng"
      >
        <Menu size={iconSize} color={colors.primary} />
      </TouchableOpacity>

      {/* SHEET */}
      <Modal visible={isOpen} transparent animationType="none">
        <View style={dynamicStyles.overlay}>
          <Animated.View
            style={[
              dynamicStyles.sheet,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* HEADER */}
            <View style={dynamicStyles.header}>
              <View>
                <Text style={dynamicStyles.title}>Quản lý từ vựng</Text>
                {materialTitle ? (
                  <Text style={dynamicStyles.subtitle}>{materialTitle}</Text>
                ) : null}
              </View>

              <TouchableOpacity onPress={closeSheet}>
                <X size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* ACTION BAR */}
            <View style={styles.row}>
              <Text style={dynamicStyles.sectionTitle}>
                Danh sách flashcards
              </Text>

              <TouchableOpacity
                style={dynamicStyles.addBtn}
                onPress={() => openEditor()}
              >
                <Plus size={16} color="white" />
                <Text style={dynamicStyles.addText}>Thêm</Text>
              </TouchableOpacity>
            </View>

            <View style={dynamicStyles.line} />

            {/* LIST */}
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
              {loading ? (
                <Text style={dynamicStyles.empty}>Đang tải...</Text>
              ) : items.length === 0 ? (
                <Text style={dynamicStyles.empty}>Chưa có từ vựng</Text>
              ) : (
                items.map((card) => (
                  <VocabularyItem
                    key={card.id}
                    card={card}
                    onEdit={() => openEditor(card)}
                    onDelete={() => handleDeleteCard(card.id)}
                  />
                ))
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* EDITOR */}
      <AddVocabularyModal
        visible={editorVisible}
        materialTitle={materialTitle}
        initialCard={selectedCard}
        onClose={closeEditor}
        onSaveCard={handleSaveCard}
        onImportCards={handleBulkImport}
        loading={actionLoading}
      />

      {/* TOAST GỌN GÀNG TỰ TẮT SAU 2S */}
      {toast ? (
        <View style={dynamicStyles.toast}>
          <Text style={dynamicStyles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </>
  );
}

/* ================= STATIC STYLE ================= */
const styles = StyleSheet.create({
  fab: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 999,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});