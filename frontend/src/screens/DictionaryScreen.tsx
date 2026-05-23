import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  KeyboardAvoidingView,
  Keyboard,
  StyleSheet,
  Platform,
  FlatList,
  Modal,
  ActivityIndicator,
} from 'react-native';

import { ChevronLeft, Search, Volume2, Plus, BookOpen, X } from 'lucide-react-native';
import { useAuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useGlobalUI } from '../context/GlobalUIContext';
import { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../components/AppNavigator';
import ScreenContainer from '../components/ScreenContainer';
import BottomNavigation from '../components/BottomNavigation';
import { Audio } from 'expo-av';
import { speakTextToSpeech } from '../utils/tts';
import SharkLoader from '../components/ui/SharkLoader';
import { getMaterials, createFlashcard } from '../api/api';

import * as wanakana from 'wanakana';

type Props = StackScreenProps<RootStackParamList, 'Dictionary'>;

export default function DictionaryScreen({
  navigation,
  route,
}: Props) {
  const { user } = useAuthContext();
  const { colors } = useTheme();
  const { showAlert } = useGlobalUI();

  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [userMaterials, setUserMaterials] = useState<any[]>([]);
  const [isFetchingMaterials, setIsFetchingMaterials] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);

  const [searchText, setSearchText] = useState(
    route.params?.query ?? ''
  );

  const [resultData, setResultData] =
    useState<any>(null);

  const [activeTab, setActiveTab] = useState<
    'word' | 'kanji' | 'example' | 'grammar'
  >('word');

  const mascot = require('../../assets/sharkQuestion.png');

  const audioSource = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
    resultData?.title || ''
  )}&tl=ja&client=tw-ob`;

  const soundRef = useRef<Audio.Sound | null>(null);

  const handlePlayAudio = async () => {
    try {
      if (!resultData?.title) return;

      if (Platform.OS === 'web') {
        await speakTextToSpeech(resultData.title, { language: 'ja-JP' });
        return;
      }

      if (soundRef.current) {
        await soundRef.current.stopAsync().catch(() => { });
        await soundRef.current.unloadAsync().catch(() => { });
        soundRef.current = null;
      }
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioSource },
        { shouldPlay: true }
      );
      soundRef.current = newSound;
      newSound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          await newSound.unloadAsync().catch(() => { });
          if (soundRef.current === newSound) {
            soundRef.current = null;
          }
        }
      });
    } catch (e) {
      console.log('Error playing audio:', e);
    }
  };

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => { });
      }
    };
  }, []);

  const fetchUserMaterials = async () => {
    if (!user?.id) return;
    setIsFetchingMaterials(true);
    try {
      const res = await getMaterials(user.id);
      console.log('fetchUserMaterials:', res);
      const data = res?.materials || res?.data || (Array.isArray(res) ? res : []);
      setUserMaterials(data);
    } catch (error) {
      console.error('Failed to fetch materials:', error);
      showAlert('Lỗi', 'Không thể lấy danh sách bộ thẻ', undefined, 'error');
    } finally {
      setIsFetchingMaterials(false);
    }
  };

  const handleOpenAddModal = () => {
    setIsAddModalVisible(true);
    fetchUserMaterials();
  };

  const handleSaveToMaterial = async (materialId: number) => {
    if (!resultData || !user?.id) return;

    setIsAddingCard(true);
    try {
      // Chuẩn hóa dữ liệu flashcard từ kết quả tra cứu
      const newCard = {
        word: resultData.title || '',
        kanji: '', // resultData ko có trường kanji riêng cho từ chính, dùng title
        hiragana: resultData.subTitle || '',
        meaning: resultData.description || resultData.details?.[0]?.mean || 'Chưa rõ nghĩa',
        example: '', // Để trống hoặc bóc từ details
      };

      await createFlashcard(materialId, newCard);
      setIsAddModalVisible(false);
      showAlert('Thành công', 'Đã thêm từ vựng vào bộ thẻ!', undefined, 'success');
    } catch (error: any) {
      console.error('Lỗi khi thêm thẻ:', error);
      showAlert('Lỗi', error.message || 'Không thể lưu từ vựng', undefined, 'error');
    } finally {
      setIsAddingCard(false);
    }
  };

  const handleSearch = useCallback(
    async (
      query: string,
      type = activeTab
    ) => {
      if (!query.trim()) return;

      Keyboard.dismiss();
      setIsLoading(true);

      try {
        let finalQuery = query.trim();

        // Detect romaji
        const isRomaji =
          /^[a-zA-Z\s]+$/.test(finalQuery);

        // Convert romaji -> hiragana
        if (isRomaji) {
          finalQuery =
            wanakana.toHiragana(
              finalQuery
            );
        }

        const body = {
          dict: 'javi',
          type,
          query: finalQuery,
          limit: 10,
        };

        const res = await fetch(
          'https://mazii.net/api/search',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify(body),
          }
        );

        const json = await res.json();

        const data =
          json.data ||
          json.results ||
          [];

        if (data.length > 0) {
          let mappedData: any = {};

          // WORD
          if (type === 'word') {
            const item = data[0];

            mappedData = {
              title:
                item.word ||
                item.kanji ||
                '',

              subTitle:
                item.phonetic ||
                item.kana ||
                '',

              description:
                item.short_mean ||
                item.mean ||
                item.means?.[0]
                  ?.mean ||
                '',

              details:
                item.means ||
                [
                  {
                    mean:
                      item.mean,
                  },
                ],
            };
          }

          // KANJI
          else if (
            type === 'kanji'
          ) {
            mappedData = {
              isKanjiList: true,

              kanjis: data.map(
                (item: any) => ({
                  kanji:
                    item.kanji,

                  hanviet:
                    item.hanviet,

                  kunyomi:
                    item.kun,

                  onyomi:
                    item.on,

                  strokeCount:
                    item.stroke_count,

                  jlpt:
                    item.level,

                  mean:
                    item.mean,

                  detail:
                    item.detail,

                  strokeUri: `https://raw.githubusercontent.com/Mistuha/kanji_images/master/images/${item.kanji}.png`,
                })
              ),
            };
          }

          // EXAMPLE
          else if (
            type === 'example'
          ) {
            mappedData = {
              title: 'Ví dụ',

              subTitle: query,

              description:
                'Các câu ví dụ:',

              details: data.map(
                (ex: any) => ({
                  mean: `${ex.content}\n→ ${ex.mean}`,
                })
              ),
            };
          }

          // GRAMMAR
          else if (
            type === 'grammar'
          ) {
            const item = data[0];

            mappedData = {
              title:
                item.title,

              subTitle:
                item.usage,

              description:
                item.meaning,

              details: [
                {
                  mean:
                    item.explanation,
                },
              ],
            };
          }

          setResultData(
            mappedData
          );
        } else {
          setResultData(null);
        }
      } catch (e) {
        console.log(e);
        setResultData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab]
  );

  const onTabPress = (
    tab: string
  ) => {
    let type: any = 'word';

    if (tab === 'Kanji')
      type = 'kanji';

    if (tab === 'Ví dụ')
      type = 'example';

    if (tab === 'Cấu trúc')
      type = 'grammar';

    setActiveTab(type);

    if (searchText) {
      handleSearch(
        searchText,
        type
      );
    }
  };

  useEffect(() => {
    const timer = setTimeout(
      () => setIsReady(true),
      100
    );

    if (route.params?.query) {
      setSearchText(
        route.params.query
      );

      handleSearch(
        route.params.query,
        'word'
      );
    }

    return () =>
      clearTimeout(timer);
  }, [route.params?.query]);

  if (!isReady) return null;

  return (
    <ScreenContainer>
      <View
        style={{
          flex: 1,
          backgroundColor:
            colors.background,
        }}
      >
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={[
            styles.container,
            {
              backgroundColor:
                colors.background,
            },
          ]}
        >
          {/* HEADER */}
          <View
            style={styles.header}
          >
            <TouchableOpacity
              onPress={() =>
                navigation.goBack()
              }
              style={[
                styles.backBtn,
                {
                  backgroundColor:
                    colors.card,

                  borderColor:
                    colors.border,
                },
              ]}
            >
              <ChevronLeft
                size={20}
                color={
                  colors.primary
                }
              />
            </TouchableOpacity>

            <Text
              style={[
                styles.headerText,
                {
                  color:
                    colors.textSecondary,
                },
              ]}
            >
              TỪ ĐIỂN NHẬT VIỆT
            </Text>
          </View>

          {/* SEARCH */}
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor:
                  colors.card,

                borderColor:
                  colors.border,
              },
            ]}
          >
            <TextInput
              placeholder="Nhập từ tiếng Nhật hoặc romaji..."
              style={[
                styles.input,
                {
                  color:
                    colors.text,
                },
              ]}
              value={searchText}
              onChangeText={
                setSearchText
              }
              onSubmitEditing={() =>
                handleSearch(
                  searchText
                )
              }
              placeholderTextColor={
                colors.textSecondary
              }
            />

            {isLoading ? (
              <View style={{ marginRight: 10 }}>
                <SharkLoader size="small" message="" />
              </View>
            ) : (
              <TouchableOpacity
                onPress={() =>
                  handleSearch(
                    searchText
                  )
                }
              >
                <Search
                  size={20}
                  color={
                    colors.primary
                  }
                />
              </TouchableOpacity>
            )}
          </View>

          {/* TABS */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            style={styles.tabs}
          >
            {[
              'Từ vựng',
              'Kanji',
              'Ví dụ',
              'Cấu trúc',
            ].map((tab) => {
              const isSelected =
                (tab ===
                  'Từ vựng' &&
                  activeTab ===
                  'word') ||
                (tab ===
                  'Kanji' &&
                  activeTab ===
                  'kanji') ||
                (tab ===
                  'Ví dụ' &&
                  activeTab ===
                  'example') ||
                (tab ===
                  'Cấu trúc' &&
                  activeTab ===
                  'grammar');

              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() =>
                    onTabPress(
                      tab
                    )
                  }
                  style={[
                    styles.tabBtn,
                    isSelected &&
                    styles.tabActive,
                    {
                      backgroundColor:
                        isSelected
                          ? colors.primary
                          : colors.card,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      isSelected &&
                      styles.tabTextActive,
                      {
                        color:
                          isSelected
                            ? '#fff'
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* RESULT */}
          {resultData ? (
            <View
              style={
                styles.resultWrapper
              }
            >
              {resultData.isKanjiList ? (
                <FlatList
                  data={resultData.kanjis}
                  keyExtractor={(_, index) => index.toString()}
                  renderItem={({ item: k }) => (
                    <View
                      style={[
                        styles.card,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.rowBetween}>
                        <View>
                          <Text style={[styles.kanji, { color: colors.text }]}>{k.kanji}</Text>
                          <Text style={styles.hanviet}>{k.hanviet}</Text>
                        </View>
                        <Image source={{ uri: k.strokeUri }} style={styles.kanjiImg} />
                      </View>
                      <Text style={[styles.desc, { color: colors.text }]}>{k.mean}</Text>
                    </View>
                  )}
                  initialNumToRender={10}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                  scrollEnabled={false}
                />
              ) : (
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor:
                        colors.card,

                      borderColor:
                        colors.border,
                    },
                  ]}
                >
                  <View
                    style={
                      styles.rowBetween
                    }
                  >
                    <View
                      style={{
                        flex: 1,
                      }}
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
                        {
                          resultData.title
                        }
                      </Text>

                      <Text
                        style={
                          styles.sub
                        }
                      >
                        {
                          resultData.subTitle
                        }
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <TouchableOpacity onPress={handlePlayAudio}>
                        <View style={styles.audioButton}>
                          <Volume2 size={22} color="#fff" />
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleOpenAddModal}>
                        <View style={[styles.audioButton, { backgroundColor: '#145737ff', width: 'auto', paddingHorizontal: 14, flexDirection: 'row', gap: 6 }]}>
                          <Plus size={18} color="#fff" />
                          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Lưu từ vựng</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text
                    style={[
                      styles.desc,
                      {
                        color:
                          colors.text,
                      },
                    ]}
                  >
                    {
                      resultData.description
                    }
                  </Text>

                  {resultData.details?.map(
                    (
                      d: any,
                      i: number
                    ) => (
                      <Text
                        key={i}
                        style={[
                          styles.detail,
                          {
                            color:
                              colors.textSecondary,
                          },
                        ]}
                      >
                        {i + 1}.{' '}
                        {d.mean}
                      </Text>
                    )
                  )}
                </View>
              )}
            </View>
          ) : !isLoading ? (
            <View
              style={styles.empty}
            >
              <Search
                size={50}
                color={
                  colors.primary
                }
              />

              <Text
                style={{
                  marginTop: 10,
                  color:
                    colors.textSecondary,
                }}
              >
                Không tìm thấy dữ
                liệu
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={{ zIndex: 10, position: 'relative' }}>
          <BottomNavigation activeTab="" />
        </View>

        {/* ADD TO DECK MODAL */}
        <Modal visible={isAddModalVisible} transparent animationType="fade" onRequestClose={() => setIsAddModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Lưu từ vựng</Text>
                <TouchableOpacity onPress={() => setIsAddModalVisible(false)} style={styles.modalCloseBtn}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                Chọn bộ thẻ để lưu "{resultData?.title}"
              </Text>

              {isFetchingMaterials ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : userMaterials.length > 0 ? (
                <ScrollView style={{ maxHeight: 300, marginTop: 10 }} showsVerticalScrollIndicator={false}>
                  {userMaterials.map(mat => (
                    <TouchableOpacity
                      key={mat.id}
                      style={[styles.materialItem, { backgroundColor: colors.background, borderColor: colors.border }]}
                      onPress={() => handleSaveToMaterial(mat.id)}
                      disabled={isAddingCard}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <BookOpen size={18} color={colors.primary} style={{ marginRight: 10 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.materialTitle, { color: colors.text }]} numberOfLines={1}>{mat.title}</Text>
                          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{mat.learned_cards || 0}/{mat.total_cards || 0} từ</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <Text style={{ textAlign: 'center', marginTop: 20, color: colors.textSecondary }}>Bạn chưa có bộ thẻ nào.</Text>
              )}
            </View>
          </View>
        </Modal>

      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 160,
    backgroundColor: '#F8FBF9',
  },

  header: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
  },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },

  headerText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },

  searchBox: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },

  input: {
    flex: 1,
    fontSize: 15,
  },

  tabs: {
    marginTop: 20,
  },

  tabBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },

  tabActive: {
    backgroundColor: '#0E513D',
  },

  tabText: {
    fontWeight: '700',
  },

  tabTextActive: {
    color: '#fff',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 10,
  },
  materialItem: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  materialTitle: {
    fontSize: 15,
    fontWeight: '700',
  },

  resultWrapper: {
    marginTop: 24,
  },

  card: {
    padding: 22,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
  },

  title: {
    fontSize: 32,
    fontWeight: '800',
  },

  sub: {
    marginTop: 6,
    color: '#58A68E',
    fontSize: 15,
    fontWeight: '600',
  },

  audioButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0E513D',
    justifyContent: 'center',
    alignItems: 'center',
  },

  kanji: {
    fontSize: 54,
    fontWeight: 'bold',
  },

  hanviet: {
    color: '#58A68E',
    fontSize: 16,
    marginTop: 4,
    fontWeight: '600',
  },

  kanjiImg: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
  },

  desc: {
    marginTop: 18,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
  },

  detail: {
    marginTop: 12,
    lineHeight: 24,
    fontSize: 15,
  },

  empty: {
    marginTop: 100,
    alignItems: 'center',
    opacity: 0.5,
  },
});