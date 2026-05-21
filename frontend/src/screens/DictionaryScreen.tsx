import React, { useEffect, useState, useCallback } from 'react';
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Keyboard,
  StyleSheet,
} from 'react-native';

import { ChevronLeft, Search, Volume2 } from 'lucide-react-native';
import { useAuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../components/AppNavigator';
import ScreenContainer from '../components/ScreenContainer';
import BottomNavigation from '../components/BottomNavigation';
import { useAudioPlayer } from 'expo-audio';

import * as wanakana from 'wanakana';

type Props = StackScreenProps<RootStackParamList, 'Dictionary'>;

export default function DictionaryScreen({
  navigation,
  route,
}: Props) {
  const { user } = useAuthContext();
  const { colors } = useTheme();

  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  const player = useAudioPlayer(audioSource);

  const handlePlayAudio = async () => {
    try {
      await player.seekTo(0);
      player.play();
    } catch (e) {
      console.log(e);
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
              <ActivityIndicator
                size="small"
                color={
                  colors.primary
                }
              />
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
                resultData.kanjis.map(
                  (
                    k: any,
                    index: number
                  ) => (
                    <View
                      key={index}
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
                        <View>
                          <Text
                            style={[
                              styles.kanji,
                              {
                                color:
                                  colors.text,
                              },
                            ]}
                          >
                            {
                              k.kanji
                            }
                          </Text>

                          <Text
                            style={
                              styles.hanviet
                            }
                          >
                            {
                              k.hanviet
                            }
                          </Text>
                        </View>

                        <Image
                          source={{
                            uri: k.strokeUri,
                          }}
                          style={
                            styles.kanjiImg
                          }
                        />
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
                        {k.mean}
                      </Text>
                    </View>
                  )
                )
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

                    <TouchableOpacity
                      onPress={
                        handlePlayAudio
                      }
                    >
                      <View
                        style={
                          styles.audioButton
                        }
                      >
                        <Volume2
                          size={22}
                          color="#fff"
                        />
                      </View>
                    </TouchableOpacity>
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

        <BottomNavigation activeTab="study" />
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