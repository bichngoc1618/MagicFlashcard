import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { FileSpreadsheet, Search, X } from 'lucide-react-native';
import XLSX from 'xlsx';
import { searchDictionary } from '../api/api';
import { useTheme } from '../context/ThemeContext';

/* ================= TYPES ================= */
type FlashcardPayload = {
  word?: string;
  kanji?: string;
  hiragana?: string;
  meaning?: string;
  example?: string;
};

type Props = {
  visible: boolean;
  materialTitle?: string;
  initialCard: (FlashcardPayload & { id: number }) | null;
  onClose: () => void;
  onSaveCard: (card: FlashcardPayload) => Promise<void>;
  onImportCards: (cards: FlashcardPayload[]) => Promise<void>;
  loading: boolean;
};

export default function AddVocabularyModal({
  visible,
  materialTitle,
  initialCard,
  onClose,
  onSaveCard,
  onImportCards,
  loading,
}: Props) {
  const { colors } = useTheme();
  const [activeOption, setActiveOption] = useState<'manual' | 'excel'>('manual');
  const [inputKanji, setInputKanji] = useState<string>('');
  const [inputHiragana, setInputHiragana] = useState<string>('');
  const [meaning, setMeaning] = useState<string>('');
  const [example, setExample] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoadingLookup, setIsLoadingLookup] = useState<boolean>(false);

  const sheetAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(sheetAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 9,
      }).start();
    }
  }, [visible, sheetAnim]);

  useEffect(() => {
    if (!visible) return;

    if (initialCard) {
      setInputKanji(initialCard.kanji || '');
      setInputHiragana(initialCard.word || '');
      setMeaning(initialCard.meaning || '');
      setExample(initialCard.example || '');
    } else {
      setInputKanji('');
      setInputHiragana('');
      setMeaning('');
      setExample('');
      setError(null);
    }
    setActiveOption('manual');
  }, [visible, initialCard]);

  const closeModal = useCallback(() => {
    Animated.timing(sheetAnim, {
      toValue: 600,
      duration: 220,
      useNativeDriver: true,
    }).start();

    setTimeout(onClose, 100);
  }, [sheetAnim, onClose]);

  const lookup = useCallback(async () => {
    if (!inputKanji.trim()) {
      setError('Vui lòng nhập Kanji hoặc từ vựng cần tra');
      return;
    }

    setIsLoadingLookup(true);
    setError(null);

    try {
      const res = (await searchDictionary(inputKanji.trim())) as any;
      if (!res) {
        setError('Không tìm thấy từ này trong từ điển');
        return;
      }

      let detectedExample = '';
      if (typeof res.example === 'string' && res.example.trim() && res.example !== 'Không có ví dụ') {
        detectedExample = res.example;
      } else if (Array.isArray(res.example) && res.example.length > 0) {
        const firstEx = res.example[0];
        if (typeof firstEx === 'string') {
          detectedExample = firstEx;
        } else if (typeof firstEx === 'object') {
          const ja = firstEx.content || firstEx.w || firstEx.ja || firstEx.japanese || '';
          const vi = firstEx.mean || firstEx.m || firstEx.vi || firstEx.vietnamese || '';
          detectedExample = ja && vi ? `${ja}\n(${vi})` : ja || vi || '';
        }
      }

      if (!detectedExample) {
        const findExamplesDeep = (obj: any): any[] => {
          if (!obj || typeof obj !== 'object') return [];
          if (Array.isArray(obj.examples) && obj.examples.length > 0) return obj.examples;
          if (Array.isArray(obj.example) && obj.example.length > 0) return obj.example;
          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              const found = findExamplesDeep(obj[key]);
              if (found.length > 0) return found;
            }
          }
          return [];
        };

        const deepExamples = findExamplesDeep(res);
        if (deepExamples.length > 0) {
          const firstEx = deepExamples[0];
          if (typeof firstEx === 'string') {
            detectedExample = firstEx;
          } else if (typeof firstEx === 'object') {
            const ja = firstEx.content || firstEx.w || firstEx.ja || firstEx.japanese || '';
            const vi = firstEx.mean || firstEx.m || firstEx.vi || firstEx.vietnamese || '';
            detectedExample = ja && vi ? `${ja}\n(${vi})` : ja || vi || '';
          }
        }
      }

      setInputKanji(res.word || inputKanji.trim());
      setInputHiragana(res.hiragana || res.kanji || '');
      setMeaning(res.meaning || '');
      setExample(detectedExample || '');
      setError(null);
    } catch (err) {
      console.warn('Lookup error:', err);
      setError('Lỗi kết nối API');
    } finally {
      setIsLoadingLookup(false);
    }
  }, [inputKanji]);

  const save = useCallback(async () => {
    if (!inputKanji.trim() && !inputHiragana.trim()) {
      setError('Vui lòng điền thông tin từ vựng');
      return;
    }

    try {
      const payload: FlashcardPayload = {
        word: inputHiragana.trim() || inputKanji.trim(),
        kanji: inputKanji.trim() || inputHiragana.trim(),
        meaning: meaning.trim(),
        example: example.trim(),
      };
      await onSaveCard(payload);
      closeModal();
    } catch (err) {
      console.warn('Save error:', err);
      setError('Lỗi lưu dữ liệu');
    }
  }, [inputKanji, inputHiragana, meaning, example, onSaveCard, closeModal]);

  const pickFile = useCallback(async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
      });

      if (res.canceled) return;

      const fileUri = res.assets[0].uri;
      const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' });
      const wb = XLSX.read(base64, { type: 'base64' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);

      if (!rows || rows.length === 0) {
        setError('File Excel trống');
        return;
      }

      const cards: FlashcardPayload[] = rows.map((r: any) => ({
        word: r.word || r.Word || '',
        kanji: r.kanji || r.Kanji || '',
        hiragana: r.hiragana || r.Hiragana || '',
        meaning: r.meaning || r.Meaning || '',
        example: r.example || r.Example || '',
      }));

      await onImportCards(cards);
      closeModal();
    } catch (err) {
      console.warn('File error:', err);
      setError('Lỗi khi đọc file Excel');
    }
  }, [onImportCards, closeModal]);

  if (!visible) return null;

  const themeStyles = {
    modalOverlay: { backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: { backgroundColor: colors.card },
    title: { color: colors.text },
    subtitle: { color: colors.textSecondary },
    input: {
      borderColor: colors.border,
      backgroundColor: colors.background,
      color: colors.text,
    },
    lookupBtn: { backgroundColor: colors.primary },
    saveBtn: { backgroundColor: colors.primary, shadowColor: colors.primary },
    optionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={closeModal}>
      <View style={[styles.modalOverlay, themeStyles.modalOverlay]} pointerEvents="box-none">
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={closeModal} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <Animated.View
            style={[
              styles.sheet,
              themeStyles.sheet,
              { transform: [{ translateY: sheetAnim }] },
            ]}
          >
            <View style={styles.header}>
              <View>
                <Text style={[styles.title, themeStyles.title]}>
                  {initialCard ? 'Chỉnh sửa từ' : 'Thêm từ mới'}
                </Text>
                {materialTitle ? (
                  <Text style={[styles.subtitle, themeStyles.subtitle]}>{materialTitle}</Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.optionRow}>
              <TouchableOpacity
                onPress={() => setActiveOption('manual')}
                style={[styles.option, activeOption === 'manual' && themeStyles.optionActive]}
              >
                <Search size={18} color={activeOption === 'manual' ? '#FFF' : colors.textSecondary} />
                <Text style={[styles.optionText, { color: activeOption === 'manual' ? '#FFF' : colors.textSecondary }]}>Tra cứu</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveOption('excel')}
                style={[styles.option, activeOption === 'excel' && themeStyles.optionActive]}
              >
                <FileSpreadsheet size={18} color={activeOption === 'excel' ? '#FFF' : colors.textSecondary} />
                <Text style={[styles.optionText, { color: activeOption === 'excel' ? '#FFF' : colors.textSecondary }]}>Excel</Text>
              </TouchableOpacity>
            </View>

            {activeOption === 'manual' ? (
              <View style={styles.flexOne}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={styles.scrollContent}
                >
                  <TextInput
                    value={inputKanji}
                    onChangeText={(text) => {
                      setInputKanji(text);
                      setError(null);
                    }}
                    placeholder="Nhập Kanji / Từ vựng (VD: 家族)..."
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, themeStyles.input]}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={lookup}
                    style={[
                      styles.lookupBtn,
                      themeStyles.lookupBtn,
                      (isLoadingLookup || loading) && styles.btnDisabled,
                    ]}
                    disabled={isLoadingLookup || loading}
                  >
                    {isLoadingLookup ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <>
                        <Search size={16} color="white" />
                        <Text style={styles.whiteText}>Tra từ điển</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <Text style={styles.sectionLabel}>Nhập hoặc chỉnh sửa thủ công</Text>
                  <TextInput
                    value={inputHiragana}
                    onChangeText={setInputHiragana}
                    placeholder="Cách đọc / Hiragana (VD: かぞく)"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, themeStyles.input]}
                    editable={!loading}
                  />
                  <TextInput
                    value={meaning}
                    onChangeText={setMeaning}
                    placeholder="Ý nghĩa"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, themeStyles.input]}
                    editable={!loading}
                  />
                  <TextInput
                    value={example}
                    onChangeText={setExample}
                    placeholder="Ví dụ"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, themeStyles.input, styles.multilineInput]}
                    editable={!loading}
                    multiline
                  />
                  {error && <Text style={styles.errorText}>{error}</Text>}
                </ScrollView>
                <View style={styles.fixedBottomContainer}>
                  <TouchableOpacity
                    onPress={save}
                    style={[styles.saveBtn, themeStyles.saveBtn, loading && styles.btnDisabled]}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={[styles.whiteText, styles.saveBtnText]}>LƯU VÀO BỘ SƯU TẬP</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.excelWrapper}>
                <View style={styles.excelInfo}>
                  <FileSpreadsheet size={48} color={colors.primary} />
                  <Text style={[styles.excelHint, { color: colors.textSecondary }]}>Chọn file .xlsx hoặc .csv có các cột: word, kanji, hiragana, meaning, example.</Text>
                </View>
                {error && <Text style={styles.errorText}>{error}</Text>}
                <TouchableOpacity
                  onPress={pickFile}
                  style={[styles.lookupBtn, themeStyles.lookupBtn, styles.widthFull, loading && styles.btnDisabled]}
                  disabled={loading}
                >
                  <Text style={styles.whiteText}>{loading ? 'Đang xử lý...' : 'Chọn file từ máy'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 999, elevation: 99 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  keyboardView: { flex: 1, justifyContent: 'flex-end', width: '100%' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 30 : 20, maxHeight: '92%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  closeBtn: { padding: 4 },
  flexOne: { flexGrow: 1, maxHeight: 520 },
  scrollContent: { paddingBottom: 12 },
  input: { borderWidth: 1.5, borderRadius: 14, padding: 14, fontSize: 16, marginBottom: 12 },
  multilineInput: { minHeight: 80, textAlignVertical: 'top' },
  lookupBtn: { padding: 14, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  btnDisabled: { opacity: 0.5 },
  fixedBottomContainer: { paddingTop: 8, backgroundColor: 'transparent' },
  saveBtn: { padding: 16, borderRadius: 16, alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  saveBtnText: { fontWeight: '800', letterSpacing: 0.5 },
  optionRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  option: { flex: 1, flexDirection: 'row', padding: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'transparent', backgroundColor: '#f0f0f030' },
  optionText: { fontWeight: '600', fontSize: 14 },
  sectionLabel: { color: '#666', marginTop: 18, marginBottom: 10, fontWeight: '700', fontSize: 14 },
  whiteText: { color: 'white', fontWeight: '600' },
  errorText: { color: '#FF4D4D', marginVertical: 8, textAlign: 'center', fontSize: 13, fontWeight: '600' },
  excelWrapper: { paddingVertical: 20, alignItems: 'center' },
  excelInfo: { alignItems: 'center', marginBottom: 25, paddingHorizontal: 20 },
  excelHint: { textAlign: 'center', marginTop: 15, lineHeight: 20, fontSize: 14 },
  widthFull: { width: '100%' },
});
