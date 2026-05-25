import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  Animated,
  Alert,
  Modal,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  FlatList,
  ScrollView,
} from 'react-native';

import { Menu, Plus, X, Share2, Trash2, Edit2 } from 'lucide-react-native';

import { useAuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useGlobalUI } from '../context/GlobalUIContext';
import {
  createFlashcard,
  deleteFlashcard,
  getFlashcards,
  bulkCreateFlashcards,
  updateFlashcard,
  shareMaterial,
  deleteMaterial,
  updateMaterial,
} from '../api/api';
import { BACKEND_URL } from '../config/BackendConfig';

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
  onMaterialDeleted?: () => void;
  onMaterialUpdated?: (newTitle: string) => void;
};

export default function VocabularyManager({
  materialId,
  materialTitle,
  iconSize = 18,
  onMaterialDeleted,
  onMaterialUpdated,
}: VocabularyManagerProps) {
  const { user, refreshNotificationCount } = useAuthContext();
  const { colors } = useTheme();
  const { showAlert, showLoader, hideLoader } = useGlobalUI();

  const [cards, setCards] = useState<FlashcardData[]>([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownAnchor, setDropdownAnchor] = useState<{ x: number; y: number } | null>(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [shareError, setShareError] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState(materialTitle || '');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

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
    showAlert('Xóa từ vựng', 'Bạn chắc chắn muốn xóa từ vựng này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => performDeleteCard(id) },
    ], 'warning');
  };

  const performDeleteCard = async (id: number) => {
    showLoader('Đang xóa từ vựng...');
    try {
      await deleteFlashcard(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
      showToast('Đã xóa từ vựng');
    } catch (e) {
      showAlert('Lỗi', 'Không xóa được từ vựng', undefined, 'error');
    } finally {
      hideLoader();
    }
  };

  const handleDeleteMaterial = () => {
    setDropdownVisible(false);
    showAlert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa bộ thẻ "${materialTitle || 'này'}" không? Mọi dữ liệu liên quan sẽ bị xóa vĩnh viễn.`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: performDeleteMaterial }
      ],
      'warning'
    );
  };

  const performDeleteMaterial = async () => {
    showLoader('Đang xóa bộ thẻ...');
    try {
      await deleteMaterial(materialId);
      if (onMaterialDeleted) {
        onMaterialDeleted();
      }
    } catch (error) {
      showAlert('Lỗi', 'Không xóa được bộ thẻ', undefined, 'error');
    } finally {
      hideLoader();
    }
  };

  /* ================= SAVE ================= */
  const handleSaveCard = async (payload: any) => {
    if (!user?.id) return;

    showLoader('Đang lưu từ vựng...');

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
      showAlert('Lỗi', 'Không lưu được', undefined, 'error');
    } finally {
      hideLoader();
    }
  };

  const openEditModal = () => {
    setEditTitle(materialTitle || '');
    setEditError('');
    setEditModalVisible(true);
    setDropdownVisible(false);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditTitle('');
    setEditError('');
  };

  const handleEditTitle = async () => {
    if (!editTitle.trim()) {
      setEditError('Vui lòng nhập tên bộ thẻ.');
      return;
    }
    setEditLoading(true);
    setEditError('');
    try {
      await updateMaterial(materialId, editTitle.trim());
      closeEditModal();
      showToast('Đã đổi tên bộ thẻ!');
      if (onMaterialUpdated) {
        onMaterialUpdated(editTitle.trim());
      }
    } catch (e: any) {
      setEditError(e.message || 'Không thể cập nhật tên bộ thẻ.');
    } finally {
      setEditLoading(false);
    }
  };

  /* ================= RENDER ================= */
  const handleBulkImport = async (payloads: any[]) => {
    showLoader('Đang import...');

    try {
      await bulkCreateFlashcards(materialId, payloads);
      await refreshCards();
      showToast(`Đã thêm ${payloads.length} từ`);
    } catch (e) {
      showAlert('Lỗi', 'Không import được', undefined, 'error');
    } finally {
      hideLoader();
    }
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const openShareModal = () => {
    setDropdownVisible(false);
    setRecipientEmail('');
    setShareError('');
    setShareModalVisible(true);
  };

  const closeShareModal = () => {
    setShareModalVisible(false);
    setRecipientEmail('');
    setShareError('');
  };

  const handleShareMaterial = async () => {
    if (!user?.id) return;
    const email = recipientEmail.trim();
    if (!email || !isValidEmail(email)) {
      setShareError('Vui lòng nhập email hợp lệ.');
      return;
    }

    showLoader('Đang chia sẻ...');
    try {
      const result = await shareMaterial(Number(user.id), email, materialId);
      showToast(`Đã chia sẻ thẻ cho ${email}`);
      showAlert('Chia sẻ thành công', `Bạn đã chia sẻ thẻ cho ${email}, chúc mừng bạn được +100xp.`, undefined, 'success');
      closeShareModal();
      if (refreshNotificationCount) {
        refreshNotificationCount();
      }

      // Đánh dấu hoàn thành nhiệm vụ chia sẻ hàng ngày
      try {
        const d = new Date();
        const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const key = `QuestReward_${user.id}_quest_share_${todayStr}`;
        const hasClaimed = await AsyncStorage.getItem(key);
        if (!hasClaimed) {
          await AsyncStorage.setItem(key, 'true');
          await fetch(`${BACKEND_URL}/api/progress/${user.id}/add-xp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 10 }),
          });
        }
      } catch (err) {
        console.warn('Lỗi cập nhật nhiệm vụ chia sẻ', err);
      }

      if (result?.senderXp !== undefined) {
        // Optional: refresh UI or update context if needed
      }
    } catch (error: any) {
      const message = error?.message || 'Không thể gửi yêu cầu chia sẻ. Vui lòng thử lại.';
      showAlert('Lỗi chia sẻ', message, undefined, 'error');
    } finally {
      hideLoader();
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
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingBottom: 40,
      minHeight: '92%',
      maxHeight: '95%',
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 16,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    addBtn: {
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 14,
      gap: 6,
    },
    addText: {
      color: 'white',
      fontSize: 13,
      fontWeight: '700',
    },
    line: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 12,
      marginHorizontal: 20,
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
    dropdownOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'flex-end',
    },
    dropdownBox: {
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      paddingVertical: 10,
      borderWidth: 1,
      marginHorizontal: 14,
      marginBottom: 20,
    },
    dropdownItem: {
      paddingVertical: 16,
      paddingHorizontal: 18,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dropdownText: {
      fontSize: 15,
      fontWeight: '700',
    },
    dropdownRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    shareCard: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      marginHorizontal: 16,
      marginBottom: 100,
    },
    input: {
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 16,
      fontSize: 15,
    },
    actionBtn: {
      borderRadius: 16,
      paddingVertical: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionBtnText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
    errorText: {
      marginBottom: 14,
      fontSize: 13,
      fontWeight: '600',
    },
  });

  return (
    <>
      {/* BUTTON OPEN */}
      <TouchableOpacity
        style={[styles.fab, dynamicStyles.fab]}
        onPressIn={(e) => {
          const { pageX, pageY } = e.nativeEvent;
          setDropdownAnchor({ x: pageX, y: pageY });
        }}
        onPress={() => setDropdownVisible(true)}
        activeOpacity={0.8}
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        accessibilityRole="button"
        accessibilityLabel="Quản lý hoặc chia sẻ từ vựng"
      >
        <Menu size={iconSize} color={colors.primary} />
      </TouchableOpacity>

      <Modal visible={dropdownVisible} transparent animationType="fade">
        <TouchableOpacity style={dynamicStyles.dropdownOverlay} activeOpacity={1} onPress={() => setDropdownVisible(false)}>
          {/* Positioned dropdown anchored to press coordinates */}
          {dropdownAnchor ? (
            (() => {
              const { width: screenW } = Dimensions.get('window');
              const boxWidth = Math.min(260, screenW - 24);
              const left = Math.max(8, Math.min(dropdownAnchor.x - boxWidth + 32, screenW - boxWidth - 8));
              const top = dropdownAnchor.y + 8;
              return (
                <View style={{ position: 'absolute', left, top, width: boxWidth }}>
                  <View style={[dynamicStyles.dropdownBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <TouchableOpacity style={dynamicStyles.dropdownItem} onPress={() => { setDropdownVisible(false); toggleSheet(); }}>
                      <Text style={[dynamicStyles.dropdownText, { color: colors.text }]}>Quản lý thẻ</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={dynamicStyles.dropdownItem} onPress={openEditModal}>
                      <View style={dynamicStyles.dropdownRow}>
                        <Edit2 size={16} color={colors.primary} />
                        <Text style={[dynamicStyles.dropdownText, { color: colors.text }]}>Đổi tên bộ thẻ</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={dynamicStyles.dropdownItem} onPress={openShareModal}>
                      <View style={dynamicStyles.dropdownRow}>
                        <Share2 size={16} color={colors.primary} />
                        <Text style={[dynamicStyles.dropdownText, { color: colors.text }]}>Chia sẻ</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={[dynamicStyles.dropdownItem, { borderBottomWidth: 0 }]} onPress={handleDeleteMaterial}>
                      <View style={dynamicStyles.dropdownRow}>
                        <Trash2 size={16} color={colors.danger || '#EF4444'} />
                        <Text style={[dynamicStyles.dropdownText, { color: colors.danger || '#EF4444' }]}>Xóa bộ thẻ</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()
          ) : null}
        </TouchableOpacity>
      </Modal>

      <Modal visible={shareModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity style={dynamicStyles.dropdownOverlay} activeOpacity={1} onPress={closeShareModal} />
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }} keyboardShouldPersistTaps="handled">
            <View style={[dynamicStyles.shareCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={dynamicStyles.header}>
                <View>
                  <Text style={dynamicStyles.title}>Chia sẻ thẻ Material</Text>
                  <Text style={dynamicStyles.subtitle}>Nhập email người nhận để gửi toàn bộ bộ từ vựng.</Text>
                </View>
                <TouchableOpacity onPress={closeShareModal}>
                  <X size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={[dynamicStyles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                placeholder="Email người nhận"
                placeholderTextColor={colors.textSecondary}
                value={recipientEmail}
                onChangeText={(text) => { setRecipientEmail(text); setShareError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              {shareError ? <Text style={[dynamicStyles.errorText, { color: '#EF4444' }]}>{shareError}</Text> : null}
              <TouchableOpacity
                style={[dynamicStyles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={handleShareMaterial}
                activeOpacity={0.8}
                disabled={shareLoading}
              >
                <Text style={dynamicStyles.actionBtnText}>{shareLoading ? 'Đang gửi...' : 'Gửi'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* EDIT MODAL */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity style={dynamicStyles.dropdownOverlay} activeOpacity={1} onPress={closeEditModal} />
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }} keyboardShouldPersistTaps="handled">
            <View style={[dynamicStyles.shareCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={dynamicStyles.header}>
                <View>
                  <Text style={dynamicStyles.title}>Đổi tên bộ thẻ</Text>
                  <Text style={dynamicStyles.subtitle}>Nhập tên mới cho bộ thẻ này.</Text>
                </View>
                <TouchableOpacity onPress={closeEditModal}>
                  <X size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={[dynamicStyles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                placeholder="Ví dụ: N5 Bài 1..."
                placeholderTextColor={colors.textSecondary}
                value={editTitle}
                onChangeText={(text) => { setEditTitle(text); setEditError(''); }}
                autoFocus
              />
              {editError ? <Text style={[dynamicStyles.errorText, { color: colors.danger || '#EF4444' }]}>{editError}</Text> : null}
              <TouchableOpacity
                style={[dynamicStyles.actionBtn, { backgroundColor: colors.primary, opacity: editLoading ? 0.7 : 1 }]}
                activeOpacity={0.8}
                onPress={handleEditTitle}
                disabled={editLoading}
              >
                <Text style={dynamicStyles.actionBtnText}>{editLoading ? 'Đang lưu...' : 'Lưu thay đổi'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* SHEET */}
      <Modal visible={isOpen} transparent animationType="none">
        <View style={dynamicStyles.overlay}>
          <Animated.View
            style={[
              dynamicStyles.sheet,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* DRAG HANDLE */}
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View style={{
                width: 40, height: 4, borderRadius: 100,
                backgroundColor: colors.border,
              }} />
            </View>

            {/* HEADER */}
            <View style={dynamicStyles.header}>
              <View style={{ flex: 1 }}>
                <Text style={dynamicStyles.title}>Quản lý từ vựng</Text>
                {materialTitle ? (
                  <Text style={dynamicStyles.subtitle} numberOfLines={1}>{materialTitle}</Text>
                ) : null}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {/* Badge số thẻ */}
                <View style={{
                  backgroundColor: colors.primary + '18',
                  paddingHorizontal: 10, paddingVertical: 4,
                  borderRadius: 99,
                }}>
                  <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '700' }}>
                    {items.length} thẻ
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={closeSheet}
                  style={{
                    width: 32, height: 32, borderRadius: 99,
                    backgroundColor: colors.border + '88',
                    alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <X size={16} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* ACTION BAR */}
            <View style={[styles.row, { paddingHorizontal: 20, paddingVertical: 12 }]}>
              <Text style={dynamicStyles.sectionTitle}>
                Danh sách
              </Text>

              <TouchableOpacity
                style={dynamicStyles.addBtn}
                onPress={() => openEditor()}
              >
                <Plus size={15} color="white" />
                <Text style={dynamicStyles.addText}>Thêm từ</Text>
              </TouchableOpacity>
            </View>

            <View style={dynamicStyles.line} />

            {/* LIST */}
            <View style={{ flex: 1, paddingBottom: 20 }}>
              {loading ? (
                <Text style={[dynamicStyles.empty, { marginTop: 40 }]}>Đang tải...</Text>
              ) : items.length === 0 ? (
                <View style={{ alignItems: 'center', paddingTop: 40, paddingHorizontal: 20 }}>
                  <Text style={{ fontSize: 40, marginBottom: 12 }}>📭</Text>
                  <Text style={[dynamicStyles.title, { fontSize: 15 }]}>Chưa có từ vựng</Text>
                  <Text style={[dynamicStyles.subtitle, { textAlign: 'center', marginTop: 6 }]}>
                    Bấm "Thêm từ" để bắt đầu xây dựng bộ thẻ!
                  </Text>
                  <TouchableOpacity
                    style={[dynamicStyles.addBtn, { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12 }]}
                    onPress={() => openEditor()}
                  >
                    <Plus size={16} color="white" />
                    <Text style={dynamicStyles.addText}>Thêm từ đầu tiên</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={items}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <VocabularyItem
                      card={item}
                      onEdit={() => openEditor(item)}
                      onDelete={() => handleDeleteCard(item.id)}
                    />
                  )}
                  initialNumToRender={12}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80, paddingTop: 4 }}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
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