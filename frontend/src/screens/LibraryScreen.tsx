import React, { useContext, useMemo, useState } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { StackScreenProps } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  ChevronRight,
  Flame,
  BookOpenCheck,
  Trophy,
  Target,
  LayoutGrid,
  CheckCircle,
} from 'lucide-react-native';

import { AuthContext } from '../context/AuthContext';
import type { RootStackParamList } from '../components/AppNavigator';
import ScreenContainer from '../components/ScreenContainer';
import BottomNavigation from '../components/BottomNavigation';
import AppHeaderSearch from '../components/AppHeaderSearch';
import VocabularyManager from '../components/VocabularyManager';
import { getMaterials, getUserStats } from '../api/api';

type StudyScreenProps = StackScreenProps<RootStackParamList, 'Study'>;
type TabType = 'inProgress' | 'completed';

export default function StudyScreen({ navigation }: StudyScreenProps) {
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();

  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [materials, setMaterials] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('inProgress');

  // Xác định giao diện Sáng/Tối dựa trên màu nền để điều chỉnh màu chữ Dashboard
  const isLightMode = colors.background.toLowerCase() === '#f8fbf9' || colors.background.toLowerCase() === '#ffffff';
  
  // Màu sắc động cho Dashboard để không bị mờ chữ
  const dashboardTextColor = isLightMode ? '#2c3c38' : '#FFFFFF';
  const dashboardSubColor = isLightMode ? 'rgba(28, 52, 45, 0.7)' : 'rgba(255, 255, 255, 0.7)';
  const dashboardBg = isLightMode ? '#A7D7C5' : colors.card;

  const loadData = async () => {
    if (!user?.id) return;
    try {
      const [materialsRes, statsRes] = await Promise.all([
        getMaterials(user.id),
        getUserStats(user.id),
      ]);
      setMaterials(materialsRes.materials || []);
      setStreak(statsRes.streakCount || 0);
    } catch (e) {
      console.warn(e);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [user?.id])
  );

  const stats = useMemo(() => {
    const all = materials.map((item) => {
      const learned = item.learned_cards ?? 0;
      const total = item.total_cards ?? 0;
      const progress = total ? learned / total : 0;
      return { ...item, learned, total, progress, isFinished: progress >= 1 };
    });

    return {
      inProgress: all.filter((i) => !i.isFinished),
      completed: all.filter((i) => i.isFinished),
      overall: {
        learned: all.reduce((s, i) => s + i.learned, 0),
        total: all.reduce((s, i) => s + i.total, 0),
      },
    };
  }, [materials]);

  const displayMaterials = activeTab === 'inProgress' ? stats.inProgress : stats.completed;

  if (isLoading) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Đang tải lộ trình học...</Text>
      </View>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView 
        contentContainerStyle={[styles.scroll, { backgroundColor: colors.background }]} 
        showsVerticalScrollIndicator={false}
      >
        <AppHeaderSearch
          displayName={user?.username || 'User'}
          mascotSource={require('../../assets/sharkMagic.png')}
          searchText={searchText}
          onChangeSearchText={setSearchText}
          onSubmitSearch={() => {
            if (searchText.trim()) {
              navigation.navigate('Dictionary', { query: searchText.trim() });
            }
          }}
        />

        {/* DASHBOARD CARD - Đã tối ưu màu sắc */}
        <View style={[styles.dashboardCard, { backgroundColor: dashboardBg, borderColor: colors.border }] }>
          <View style={styles.statsMain}>
            <View style={styles.statsHeader}>
              <Target size={14} color={dashboardTextColor} />
              <Text style={[styles.statsLabel, { color: dashboardSubColor }]}>TIẾN ĐỘ HỌC TẬP</Text>
            </View>
            <Text style={[styles.statsNumber, { color: dashboardTextColor }]}>
              {stats.overall.learned}
              <Text style={[styles.statsTotal, { color: dashboardTextColor, opacity: 0.6 }]}>/{stats.overall.total} từ</Text>
            </Text>
            <View style={[styles.mainProgressContainer, { backgroundColor: isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.12)' }]}>
              <View 
                style={[
                  styles.mainProgressFill, 
                  { 
                    width: `${stats.overall.total ? (stats.overall.learned / stats.overall.total) * 100 : 0}%`,
                    backgroundColor: isLightMode ? '#064E3B' : '#FFD02C' 
                  }
                ]} 
              />
            </View>
          </View>

          <View style={[styles.streakSection, { borderLeftColor: isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' }]}>
            <Flame size={26} color={isLightMode ? '#064E3B' : '#FFD02C'} />
            <Text style={[styles.streakValue, { color: dashboardTextColor }]}>{streak}</Text>
            <Text style={[styles.streakLabel, { color: dashboardSubColor }]}>Ngày</Text>
          </View>
        </View>

        {/* SEGMENTED TAB */}
        <View style={[styles.tabWrapper, { backgroundColor: isLightMode ? '#F1F5F9' : colors.surfaceAlt }]}>
          <TouchableOpacity 
            activeOpacity={0.7}
            style={[styles.tabItem, activeTab === 'inProgress' && { backgroundColor: colors.card }]} 
            onPress={() => setActiveTab('inProgress')}
          >
            <LayoutGrid size={16} color={activeTab === 'inProgress' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.tabText, { color: activeTab === 'inProgress' ? colors.text : colors.textSecondary }]}>
              Đang học
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            activeOpacity={0.7}
            style={[styles.tabItem, activeTab === 'completed' && { backgroundColor: colors.card }]} 
            onPress={() => setActiveTab('completed')}
          >
            <CheckCircle size={16} color={activeTab === 'completed' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.tabText, { color: activeTab === 'completed' ? colors.text : colors.textSecondary }]}>
              Hoàn thành
            </Text>
          </TouchableOpacity>
        </View>

        {/* CONTENT LIST */}
        {displayMaterials.length > 0 ? (
          displayMaterials.map((card) => (
            <StudyCardItem
              key={card.id}
              card={card}
              isDone={activeTab === 'completed'}
              onPress={() =>
                navigation.navigate('StudyJourney', { materialId: Number(card.id) })
              }
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Chưa có bài học nào ở đây.</Text>
          </View>
        )}
      </ScrollView>

      <BottomNavigation activeTab="library" />
    </ScreenContainer>
  );
}

/* ================= STUDY CARD ITEM ================= */

function StudyCardItem({ card, onPress, isDone }: any) {
  const progressPercent = Math.round(card.progress * 100);
  const { colors } = useTheme();

  return (
    <TouchableOpacity activeOpacity={0.85} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress}>
      <View style={[styles.cardIconBox, { backgroundColor: isDone ? colors.primary + '20' : colors.surfaceAlt }]}> 
        {isDone ? (
          <Trophy size={22} color={colors.primary} />
        ) : (
          <BookOpenCheck size={22} color={colors.primary} />
        )}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{card.title}</Text>
          <View style={[styles.percentBadge, { backgroundColor: colors.surfaceAlt }, isDone && { backgroundColor: colors.primary + '30' }]}>
            <Text style={[styles.percentText, { color: isDone ? colors.primary : colors.textSecondary }]}>
              {progressPercent}%
            </Text>
          </View>
        </View>

        <View style={[styles.cardProgressBg, { backgroundColor: colors.border }]}> 
          <View 
            style={[
              styles.cardProgressFill, 
              { 
                width: `${progressPercent}%`, 
                backgroundColor: isDone ? colors.primary : colors.success 
              }
            ]} 
          />
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }] }>
            {isDone ? 'Mục tiêu đã đạt!' : `${card.learned}/${card.total} từ vựng`}
          </Text>
          <View style={styles.miniManager}>
            <VocabularyManager
              materialId={Number(card.id)}
              materialTitle={card.title}
            />
          </View>
        </View>
      </View>

      <ChevronRight size={14} color={colors.textSecondary} style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 140,
    paddingHorizontal: 16,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  // Dashboard
  dashboardCard: {
    marginTop: 20,
    borderRadius: 28,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  statsMain: {
    flex: 1,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  statsNumber: {
    fontSize: 26,
    fontWeight: '900',
  },
  statsTotal: {
    fontSize: 13,
    fontWeight: '600',
  },
  mainProgressContainer: {
    height: 5,
    borderRadius: 10,
    marginTop: 12,
    width: '85%',
    overflow: 'hidden',
  },
  mainProgressFill: {
    height: '100%',
  },
  streakSection: {
    alignItems: 'center',
    paddingLeft: 18,
    borderLeftWidth: 1,
  },
  streakValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  streakLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
  // Tabs
  tabWrapper: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Card Item
  card: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 14,
    marginTop: 14,
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
    minWidth: 0,
  },
  percentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 46,
    alignItems: 'center',
  },
  percentText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardProgressBg: {
    height: 5,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardProgressFill: {
    height: '100%',
    borderRadius: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  cardSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  miniManager: {
    transform: [{ scale: 0.8 }],
    marginRight: -6,
  },
  emptyState: {
    marginTop: 50,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
});