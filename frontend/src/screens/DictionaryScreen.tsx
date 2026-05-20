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
  StyleSheet
} from 'react-native';
import { ChevronLeft, Search, Volume2 } from 'lucide-react-native';
import { useAuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../components/AppNavigator';
import ScreenContainer from '../components/ScreenContainer';
import BottomNavigation from '../components/BottomNavigation';
import { useAudioPlayer } from 'expo-audio';

type Props = StackScreenProps<RootStackParamList, 'Dictionary'>;

export default function DictionaryScreen({ navigation, route }: Props) {
  const { user } = useAuthContext();
  const { colors } = useTheme();

  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState(route.params?.query ?? '');
  const [resultData, setResultData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'word' | 'kanji' | 'example' | 'grammar'>('word');

  const mascot = require('../../assets/sharkQuestion.png');

  const audioSource = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(resultData?.title || '')}&tl=ja&client=tw-ob`;
  const player = useAudioPlayer(audioSource);

  const handleSearch = useCallback(async (query: string, type = activeTab) => {
    if (!query.trim()) return;
    Keyboard.dismiss();
    setIsLoading(true);

    try {
      const res = await fetch('https://mazii.net/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dict: "javi", type, query: query.trim(), limit: 10 })
      });

      const json = await res.json();
      const data = json.data || json.results || [];

      if (data.length > 0) {
        let mappedData: any = {};

        if (type === 'word') {
          const item = data[0];
          mappedData = {
            title: item.word,
            subTitle: item.phonetic,
            description: item.short_mean || item.means?.[0]?.mean,
            details: item.means || []
          };
        } else if (type === 'kanji') {
          mappedData = {
            isKanjiList: true,
            kanjis: data.map((item: any) => ({
              kanji: item.kanji,
              hanviet: item.hanviet,
              kunyomi: item.kun,
              onyomi: item.on,
              strokeCount: item.stroke_count,
              jlpt: item.level,
              mean: item.mean,
              detail: item.detail,
              strokeUri: `https://raw.githubusercontent.com/Mistuha/kanji_images/master/images/${item.kanji}.png`
            }))
          };
        } else if (type === 'example') {
          mappedData = {
            title: "Ví dụ",
            subTitle: query,
            description: "Các câu ví dụ:",
            details: data.map((ex: any) => ({ mean: `${ex.content}\n-> ${ex.mean}` }))
          };
        } else if (type === 'grammar') {
          const item = data[0];
          mappedData = {
            title: item.title,
            subTitle: item.usage,
            description: item.meaning,
            details: [{ mean: item.explanation }]
          };
        }

        setResultData(mappedData);
      } else {
        setResultData(null);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  const onTabPress = (tab: string) => {
    let type: any = 'word';
    if (tab === 'Kanji') type = 'kanji';
    if (tab === 'Ví dụ') type = 'example';
    if (tab === 'Cấu trúc') type = 'grammar';

    setActiveTab(type);
    if (searchText) handleSearch(searchText, type);
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);

    if (route.params?.query) {
      setSearchText(route.params.query);
      handleSearch(route.params.query, 'word');
    }

    return () => clearTimeout(timer);
  }, [route.params?.query]);

  if (!isReady) return null;

  return (
    <ScreenContainer>
      <View style={{ flex: 1, backgroundColor: colors.background }}>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
        >

          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ChevronLeft size={20} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.headerText, { color: colors.textSecondary } ]}>TỪ ĐIỂN NHẬT VIỆT</Text>
          </View>

          {/* SEARCH */}
          <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              placeholder="Tìm kiếm..."
              style={[styles.input, { color: colors.text }]}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={() => handleSearch(searchText)}
              placeholderTextColor={colors.textSecondary}
            />

            {isLoading
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <TouchableOpacity onPress={() => handleSearch(searchText)}>
                  <Search size={20} color={colors.primary} />
                </TouchableOpacity>}
          </View>

          {/* TABS */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
            {['Từ vựng', 'Kanji', 'Ví dụ', 'Cấu trúc'].map((tab) => {
              const isSelected =
                (tab === 'Từ vựng' && activeTab === 'word') ||
                (tab === 'Kanji' && activeTab === 'kanji') ||
                (tab === 'Ví dụ' && activeTab === 'example') ||
                (tab === 'Cấu trúc' && activeTab === 'grammar');

              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => onTabPress(tab)}
                  style={[styles.tabBtn, isSelected && styles.tabActive, { backgroundColor: isSelected ? colors.primary : colors.card }]}
                >
                  <Text style={[styles.tabText, isSelected && styles.tabTextActive, { color: isSelected ? '#fff' : colors.textSecondary }]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* RESULT */}
          {resultData ? (
            <View style={styles.resultWrapper}>
              {resultData.isKanjiList ? (
                resultData.kanjis.map((k: any, index: number) => (
                  <View key={index} style={styles.card}>

                    <View style={styles.rowBetween}>
                      <View>
                        <Text style={styles.kanji}>{k.kanji}</Text>
                        <Text style={styles.hanviet}>{k.hanviet}</Text>
                      </View>

                      <Image
                        source={{ uri: k.strokeUri }}
                        style={styles.kanjiImg}
                      />
                    </View>

                    <Text style={styles.desc}>{k.mean}</Text>

                  </View>
                ))
              ) : (
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.title}>{resultData.title}</Text>
                      <Text style={styles.sub}>{resultData.subTitle}</Text>
                    </View>

                    <Image source={mascot} style={styles.mascot} />
                  </View>

                  <Text style={styles.desc}>{resultData.description}</Text>

                  {resultData.details.map((d: any, i: number) => (
                    <Text key={i} style={styles.detail}>
                      {i + 1}. {d.mean}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ) : !isLoading && (
            <View style={styles.empty}>
              <Search size={50} color={colors.primary} />
              <Text style={{ marginTop: 10, color: colors.textSecondary }}>Không tìm thấy dữ liệu</Text>
            </View>
          )}

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
    backgroundColor: '#F8FBF9'
  },

  header: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center'
  },

  headerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#8BA39D'
  },

  searchBox: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12
  },

  input: {
    flex: 1
  },

  tabs: {
    marginTop: 20
  },

  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8
  },

  tabActive: {
    backgroundColor: '#0E513D'
  },

  tabText: {
    color: '#6D8B82',
    fontWeight: 'bold'
  },

  tabTextActive: {
    color: '#fff'
  },

  resultWrapper: {
    marginTop: 20
  },

  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold'
  },

  sub: {
    color: '#58A68E'
  },

  mascot: {
    width: 60,
    height: 60
  },

  kanji: {
    fontSize: 48,
    fontWeight: 'bold'
  },

  hanviet: {
    color: '#58A68E'
  },

  kanjiImg: {
    width: 80,
    height: 80
  },

  desc: {
    marginTop: 12,
    fontWeight: 'bold'
  },

  detail: {
    marginTop: 6,
    color: '#444'
  },

  empty: {
    marginTop: 80,
    alignItems: 'center',
    opacity: 0.5
  }
});