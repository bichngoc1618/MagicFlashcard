import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

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
  Alert,
} from 'react-native';

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import {
  FileSpreadsheet,
  Search,
  X,
  Download,
} from 'lucide-react-native';

import * as XLSX from 'xlsx';

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

  initialCard:
    | (FlashcardPayload & {
        id: number;
      })
    | null;

  onClose: () => void;

  onSaveCard: (
    card: FlashcardPayload
  ) => Promise<void>;

  onImportCards: (
    cards: FlashcardPayload[]
  ) => Promise<void>;

  loading: boolean;
};

const REQUIRED_COLUMNS = [
  'kanji',
  'hiragana',
  'meaning',
  'example',
];

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

  const [activeOption, setActiveOption] =
    useState<'manual' | 'excel'>(
      'manual'
    );

  const [inputKanji, setInputKanji] =
    useState('');

  const [
    inputHiragana,
    setInputHiragana,
  ] = useState('');

  const [meaning, setMeaning] =
    useState('');

  const [example, setExample] =
    useState('');

  const [error, setError] = useState<
    string | null
  >(null);

  const [
    isLoadingLookup,
    setIsLoadingLookup,
  ] = useState(false);

  const sheetAnim = useRef(
    new Animated.Value(600)
  ).current;

  /* ================= ANIMATION ================= */

  useEffect(() => {
    if (visible) {
      Animated.spring(sheetAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 9,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    if (initialCard) {
      setInputKanji(
        initialCard.kanji || ''
      );

      setInputHiragana(
        initialCard.word || ''
      );

      setMeaning(
        initialCard.meaning || ''
      );

      setExample(
        initialCard.example || ''
      );
    } else {
      resetForm();
    }

    setActiveOption('manual');
  }, [visible, initialCard]);

  const resetForm = () => {
    setInputKanji('');
    setInputHiragana('');
    setMeaning('');
    setExample('');
    setError(null);
  };

  /* ================= CLOSE ================= */

  const closeModal = useCallback(() => {
    Animated.timing(sheetAnim, {
      toValue: 600,
      duration: 220,
      useNativeDriver: true,
    }).start();

    setTimeout(onClose, 200);
  }, [onClose]);

  /* ================= LOOKUP ================= */

  const lookup = useCallback(async () => {
    if (!inputKanji.trim()) {
      setError(
        'Vui lòng nhập từ vựng'
      );

      return;
    }

    try {
      setIsLoadingLookup(true);

      const res = (await searchDictionary(
        inputKanji.trim()
      )) as any;

      if (!res) {
        setError(
          'Không tìm thấy từ'
        );

        return;
      }

      setInputKanji(
        res.word || ''
      );

      setInputHiragana(
        res.hiragana || ''
      );

      setMeaning(
        res.meaning || ''
      );

      setExample(
        res.example || ''
      );

      setError(null);
    } catch (err) {
      console.log(err);

      setError(
        'Lỗi kết nối từ điển'
      );
    } finally {
      setIsLoadingLookup(false);
    }
  }, [inputKanji]);

  /* ================= SAVE ================= */

  const save = useCallback(async () => {
    if (
      !inputKanji.trim() &&
      !inputHiragana.trim()
    ) {
      setError(
        'Vui lòng nhập dữ liệu'
      );

      return;
    }

    try {
      await onSaveCard({
        kanji:
          inputKanji.trim(),

        hiragana:
          inputHiragana.trim(),

        meaning:
          meaning.trim(),

        example:
          example.trim(),

        word:
          inputHiragana.trim() ||
          inputKanji.trim(),
      });

      closeModal();
    } catch (err) {
      console.log(err);

      setError(
        'Lỗi lưu dữ liệu'
      );
    }
  }, [
    inputKanji,
    inputHiragana,
    meaning,
    example,
  ]);

  /* ================= TEMPLATE ================= */

  const downloadTemplate =
    useCallback(async () => {
      try {
        const templateData = [
          {
            kanji: '家族',
            hiragana: 'かぞく',
            meaning: 'gia đình',
            example:
              '家族と旅行します',
          },

          {
            kanji: '食べる',
            hiragana: 'たべる',
            meaning: 'ăn',
            example:
              '寿司を食べる',
          },
        ];

        const worksheet =
          XLSX.utils.json_to_sheet(
            templateData
          );

        const workbook =
          XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
          workbook,
          worksheet,
          'Flashcards'
        );

        const wbout = XLSX.write(
          workbook,
          {
            type: 'base64',
            bookType: 'xlsx',
          }
        );

        if (Platform.OS === 'web') {
          const binary = atob(wbout);
          const data = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i += 1) {
            data[i] = binary.charCodeAt(i);
          }

          const blob = new Blob([data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });

          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = 'flashcard_template.xlsx';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
          return;
        }

        const uri =
          FileSystem.cacheDirectory +
          'flashcard_template.xlsx';

        await FileSystem.writeAsStringAsync(
          uri,
          wbout,
          {
            encoding: 'base64',
          }
        );

        await Sharing.shareAsync(uri);
      } catch (err) {
        console.log(err);

        Alert.alert(
          'Lỗi',
          'Không thể tạo file mẫu'
        );
      }
    }, []);

  /* ================= IMPORT EXCEL ================= */

  const pickFile = useCallback(async () => {
    try {
      setError(null);

      const result =
        await DocumentPicker.getDocumentAsync(
          {
            type: [
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/vnd.ms-excel',
            ],

            copyToCacheDirectory:
              true,
          }
        );

      if (result.canceled) return;

      const file =
        result.assets[0];

      const base64 =
        await FileSystem.readAsStringAsync(
          file.uri,
          {
            encoding: 'base64',
          }
        );

      const workbook =
        XLSX.read(base64, {
          type: 'base64',
        });

      if (
        !workbook.SheetNames ||
        workbook.SheetNames.length === 0
      ) {
        Alert.alert(
          'Lỗi',
          'File không hợp lệ'
        );

        return;
      }

      const worksheet =
        workbook.Sheets[
          workbook.SheetNames[0]
        ];

      const rows: any[] =
        XLSX.utils.sheet_to_json(
          worksheet
        );

      if (!rows.length) {
        Alert.alert(
          'Thông báo',
          'File không có dữ liệu'
        );

        return;
      }

      /* ================= VALIDATE TEMPLATE ================= */

      const firstRow = rows[0];

      const fileColumns =
        Object.keys(
          firstRow
        ).map((k) =>
          k
            .toLowerCase()
            .trim()
        );

      const isValid =
        REQUIRED_COLUMNS.every(
          (col) =>
            fileColumns.includes(
              col
            )
        );

      if (!isValid) {
        Alert.alert(
          'Sai định dạng file',
          'Vui lòng tải file mẫu và nhập đúng cấu trúc.'
        );

        return;
      }

      /* ================= PARSE ================= */

      const cards: FlashcardPayload[] =
        rows
          .map((r: any) => ({
            kanji: String(
              r.kanji || ''
            ).trim(),

            hiragana: String(
              r.hiragana || ''
            ).trim(),

            meaning: String(
              r.meaning || ''
            ).trim(),

            example: String(
              r.example || ''
            ).trim(),

            word: String(
              r.hiragana ||
                r.kanji ||
                ''
            ).trim(),
          }))

          /* remove empty rows */
          .filter(
            (card) =>
              card.kanji ||
              card.hiragana ||
              card.meaning
          );

      if (!cards.length) {
        Alert.alert(
          'Thông báo',
          'Không có dữ liệu hợp lệ'
        );

        return;
      }

      /* ================= REMOVE DUPLICATES ================= */

      const uniqueMap =
        new Set();

      const uniqueCards =
        cards.filter((card) => {
          const key = `${card.kanji}-${card.meaning}`;

          if (
            uniqueMap.has(key)
          ) {
            return false;
          }

          uniqueMap.add(key);

          return true;
        });

      /* ================= IMPORT ================= */

      await onImportCards(
        uniqueCards
      );

      Alert.alert(
        'Import thành công',
        `Đã thêm ${uniqueCards.length} flashcards`
      );

      closeModal();
    } catch (err) {
      console.log(err);

      Alert.alert(
        'Lỗi',
        'Không thể đọc file Excel'
      );
    }
  }, [
    onImportCards,
    closeModal,
  ]);

  if (!visible) return null;

  /* ================= RENDER ================= */

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={closeModal}
    >
      <View
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={closeModal}
        />

        <KeyboardAvoidingView
          behavior={
            Platform.OS ===
            'ios'
              ? 'padding'
              : undefined
          }
          style={styles.keyboard}
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor:
                  colors.card,

                transform: [
                  {
                    translateY:
                      sheetAnim,
                  },
                ],
              },
            ]}
          >
            {/* HEADER */}

            <View
              style={styles.header}
            >
              <Text
                style={[
                  styles.title,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                Thêm từ mới
              </Text>

              <TouchableOpacity
                onPress={
                  closeModal
                }
              >
                <X
                  size={24}
                  color={
                    colors.textSecondary
                  }
                />
              </TouchableOpacity>
            </View>

            {/* OPTIONS */}

            <View
              style={
                styles.optionRow
              }
            >
              <TouchableOpacity
                onPress={() =>
                  setActiveOption(
                    'manual'
                  )
                }
                style={[
                  styles.option,
                  activeOption ===
                    'manual' && {
                    backgroundColor:
                      colors.primary,
                  },
                ]}
              >
                <Search
                  size={18}
                  color={
                    activeOption ===
                    'manual'
                      ? '#fff'
                      : colors.textSecondary
                  }
                />

                <Text
                  style={[
                    styles.optionText,
                    {
                      color:
                        activeOption ===
                        'manual'
                          ? '#fff'
                          : colors.textSecondary,
                    },
                  ]}
                >
                  Tra cứu
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  setActiveOption(
                    'excel'
                  )
                }
                style={[
                  styles.option,
                  activeOption ===
                    'excel' && {
                    backgroundColor:
                      colors.primary,
                  },
                ]}
              >
                <FileSpreadsheet
                  size={18}
                  color={
                    activeOption ===
                    'excel'
                      ? '#fff'
                      : colors.textSecondary
                  }
                />

                <Text
                  style={[
                    styles.optionText,
                    {
                      color:
                        activeOption ===
                        'excel'
                          ? '#fff'
                          : colors.textSecondary,
                    },
                  ]}
                >
                  Excel
                </Text>
              </TouchableOpacity>
            </View>

            {/* MANUAL */}

            {activeOption ===
            'manual' ? (
              <>
                <ScrollView
                  showsVerticalScrollIndicator={
                    false
                  }
                >
                  <TextInput
                    value={
                      inputKanji
                    }
                    onChangeText={
                      setInputKanji
                    }
                    placeholder="Kanji / Từ vựng"
                    placeholderTextColor={
                      colors.textSecondary
                    }
                    style={[
                      styles.input,
                      {
                        borderColor:
                          colors.border,

                        backgroundColor:
                          colors.background,

                        color:
                          colors.text,
                      },
                    ]}
                  />

                  <TouchableOpacity
                    onPress={
                      lookup
                    }
                    style={[
                      styles.lookupBtn,
                      {
                        backgroundColor:
                          colors.primary,
                      },
                    ]}
                  >
                    {isLoadingLookup ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <Search
                          size={16}
                          color="white"
                        />

                        <Text
                          style={
                            styles.whiteText
                          }
                        >
                          Tra từ điển
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TextInput
                    value={
                      inputHiragana
                    }
                    onChangeText={
                      setInputHiragana
                    }
                    placeholder="Hiragana"
                    placeholderTextColor={
                      colors.textSecondary
                    }
                    style={[
                      styles.input,
                      {
                        borderColor:
                          colors.border,

                        backgroundColor:
                          colors.background,

                        color:
                          colors.text,
                      },
                    ]}
                  />

                  <TextInput
                    value={
                      meaning
                    }
                    onChangeText={
                      setMeaning
                    }
                    placeholder="Ý nghĩa"
                    placeholderTextColor={
                      colors.textSecondary
                    }
                    style={[
                      styles.input,
                      {
                        borderColor:
                          colors.border,

                        backgroundColor:
                          colors.background,

                        color:
                          colors.text,
                      },
                    ]}
                  />

                  <TextInput
                    value={
                      example
                    }
                    onChangeText={
                      setExample
                    }
                    multiline
                    placeholder="Ví dụ"
                    placeholderTextColor={
                      colors.textSecondary
                    }
                    style={[
                      styles.input,
                      styles.multiInput,
                      {
                        borderColor:
                          colors.border,

                        backgroundColor:
                          colors.background,

                        color:
                          colors.text,
                      },
                    ]}
                  />

                  {error && (
                    <Text
                      style={
                        styles.error
                      }
                    >
                      {error}
                    </Text>
                  )}
                </ScrollView>

                <TouchableOpacity
                  onPress={save}
                  style={[
                    styles.saveBtn,
                    {
                      backgroundColor:
                        colors.primary,
                    },
                  ]}
                >
                  <Text
                    style={
                      styles.whiteText
                    }
                  >
                    Lưu flashcard
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              /* EXCEL */

              <View
                style={
                  styles.excelContainer
                }
              >
                <View style={styles.excelTopRow}>
                <FileSpreadsheet size={60} color={colors.primary} />
                <Text style={[styles.excelText, { color: colors.textSecondary }]}>Upload file Excel đúng mẫu</Text>
              </View>

              <Text style={[styles.excelHint, { color: colors.textSecondary }]}>Tải xuống mẫu để giữ định dạng cột đúng rồi chọn file .xlsx để import.</Text>

              {/* TEMPLATE */}

              <TouchableOpacity onPress={downloadTemplate} style={[styles.templateBtn, { borderColor: colors.primary + '30' }]}> 
                <Download size={18} color={colors.primary} />
                <Text style={[styles.templateText, { color: colors.primary }]}>Tải file mẫu</Text>
              </TouchableOpacity>

              {/* PICK FILE */}

              <TouchableOpacity onPress={pickFile} style={[styles.importBtn, { backgroundColor: colors.primary }]}> 
                <Text style={styles.whiteText}>Chọn file Excel</Text>
              </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent:
      'flex-end',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      'rgba(0,0,0,0.5)',
  },

  keyboard: {
    width: '100%',
  },

  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '92%',
  },

  header: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
  },

  optionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },

  option: {
    flex: 1,
    flexDirection: 'row',
    justifyContent:
      'center',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor:
      '#f0f0f030',
  },

  optionText: {
    fontWeight: '700',
  },

  input: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    fontSize: 16,
  },

  multiInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },

  lookupBtn: {
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent:
      'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },

  saveBtn: {
    marginTop: 10,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },

  whiteText: {
    color: 'white',
    fontWeight: '700',
  },

  error: {
    color: '#FF4D4D',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },

  excelContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 16,
    width: '100%',
  },

  excelTopRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 14,
  },

  excelText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '700',
  },

  excelHint: {
    width: '100%',
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },

  templateBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'transparent',
    marginBottom: 14,
  },

  templateText: {
    fontWeight: '700',
    fontSize: 15,
  },

  importBtn: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
});