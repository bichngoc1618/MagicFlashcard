import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { LineChart } from 'react-native-chart-kit';
import { User, Mail, Sparkles, BookOpen, Clock3, TrendingUp, ChevronRight } from 'lucide-react-native';
import * as Progress from 'react-native-progress';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { RootStackParamList } from '../components/AppNavigator';
import ScreenContainer from '../components/ScreenContainer';
import BottomNavigation from '../components/BottomNavigation';
import { BACKEND_URL } from '../config/BackendConfig';
import { calculateLevelInfo } from '../utils/level';

type ProfileScreenProps = StackScreenProps<RootStackParamList, 'Profile'>;

type QuizTrendPoint = {
  date: string;
  score: number;
};

type ProfileData = {
  username: string;
  email: string;
  totalXP: number;
  learnedVocabularyCount: number;
  totalStudyDuration: number;
  averageAccuracy: number;
  quizTrend: QuizTrendPoint[];
  heatmap: Record<string, number>;
};

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function buildHeatmapGrid(heatmap: Record<string, number | string>) {
  const normalizedHeatmap: Record<string, number> = {};
  Object.entries(heatmap).forEach(([date, count]) => {
    normalizedHeatmap[date] = Number(count ?? 0) || 0;
  });

  const today = new Date();
  const dates: { date: string; count: number }[] = [];
  for (let i = 27; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    dates.push({ date: key, count: normalizedHeatmap[key] ?? 0 });
  }
  return dates;
}

function normalizeQuizTrendItem(item: any): QuizTrendPoint {
  const rawDate = item?.date ?? item?.dateString ?? '';
  const parsedTime = Date.parse(rawDate);
  const dateString = !Number.isNaN(parsedTime) ? new Date(parsedTime).toISOString().slice(0, 10) : String(rawDate || '');
  return {
    date: dateString,
    score: Number(item?.score ?? item?.average_score ?? 0),
  };
}

async function fetchProfileData(userId: number): Promise<ProfileData> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/profile/${userId}/analytics`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Profile analytics lỗi: ${response.status} ${errorText}`);
    }

    const payload = await response.json();
    return {
      username: payload.username || 'Học viên',
      email: payload.email || 'demo@japanese.local',
      totalXP: Number(payload.total_xp ?? payload.totalXP ?? 0),
      learnedVocabularyCount: Number(payload.learned_vocabulary_count ?? payload.learnedVocabularyCount ?? 0),
      totalStudyDuration: Number(payload.total_study_duration ?? payload.totalStudyDuration ?? 0),
      averageAccuracy: Number(payload.average_accuracy ?? payload.averageAccuracy ?? 0),
      quizTrend: Array.isArray(payload.quizTrend)
        ? payload.quizTrend.map((item: any) => normalizeQuizTrendItem(item))
        : [],
      heatmap: payload.heatmap && typeof payload.heatmap === 'object' ? payload.heatmap : {},
    };
  } catch (error) {
    console.warn('fetchProfileData error:', error);
    return {
      username: 'Học viên',
      email: 'demo@japanese.local',
      totalXP: 0,
      learnedVocabularyCount: 0,
      totalStudyDuration: 0,
      averageAccuracy: 0,
      quizTrend: [],
      heatmap: {},
    };
  }
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isReady, setIsReady] = useState(false);

  const levelInfo = useMemo(() => 
    calculateLevelInfo(profileData?.totalXP ?? user?.total_xp ?? 0),
    [profileData?.totalXP, user?.total_xp]
  );

  const dynamicStyles = useMemo(() => StyleSheet.create({
    loaderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingBottom: 32,
      backgroundColor: colors.background,
    },
    headerCard: {
      backgroundColor: colors.card,
      borderRadius: 28,
      padding: 24,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    username: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.text,
      marginBottom: 4,
    },
    emailText: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    levelMainLabel: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
    },
    xpDetailText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    },
    xpRemainingText: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 8,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    }
  }), [colors]);

  const loadProfileData = useCallback(async () => {
    if (!user?.id) {
      setProfileData(null);
      setIsReady(true);
      return;
    }
    setIsReady(false);
    try {
      const data = await fetchProfileData(Number(user.id));
      setProfileData(data);
    } catch (error) {
      console.warn('Lỗi tải Profile:', error);
      setProfileData(null);
    } finally {
      setIsReady(true);
    }
  }, [user?.id]);

  useFocusEffect(
    React.useCallback(() => {
      loadProfileData();
    }, [loadProfileData]),
  );

  const chartLabels = useMemo(
    () => (profileData?.quizTrend ?? []).map((point) => {
      const parsedTime = Date.parse(point.date);
      if (!Number.isNaN(parsedTime)) {
        const date = new Date(parsedTime);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      }
      return point.date || '--';
    }),
    [profileData],
  );

  const chartValues = useMemo(() => (profileData?.quizTrend ?? []).map((point) => point.score), [profileData]);
  const heatmapData = useMemo(
    () => buildHeatmapGrid(profileData?.heatmap ?? {}),
    [profileData],
  );

  const chartConfig = useMemo(() => ({
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => colors.primary,
    labelColor: (opacity = 1) => colors.textSecondary,
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: colors.card,
    },
    propsForBackgroundLines: {
      stroke: colors.border,
      strokeDasharray: '',
    },
  }), [colors]);

  // Temporarily comment out early return to debug hook issue
  // if (!isReady) {
  //   return (
  //     <View style={dynamicStyles.loaderContainer}>
  //       <ActivityIndicator color={colors.primary} size="large" />
  //     </View>
  //   );
  // }

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={dynamicStyles.scrollContent}>
        {!isReady ? (
          <View style={dynamicStyles.loaderContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <>
            <View style={dynamicStyles.headerCard}>
              <View style={styles.headerInfo}>
                <View style={[styles.avatarBadge, { backgroundColor: colors.surfaceAlt }]}>
                  <User size={32} color={colors.primary} />
                  <View style={[styles.levelBadgeMini, { borderColor: colors.card }]}>
                    <Text style={[styles.levelBadgeText, { color: colors.primary }]}>{levelInfo.level}</Text>
                  </View>
                </View>
                <View style={styles.headerText}>
                  <Text style={dynamicStyles.username} numberOfLines={1}>{profileData?.username ?? user?.username ?? 'Học viên'}</Text>
                  <View style={styles.emailRow}>
                    <Mail size={14} color={colors.primary} />
                    <Text style={dynamicStyles.emailText} numberOfLines={1}>{profileData?.email ?? user?.email ?? 'demo@japanese.local'}</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.levelSection, { borderTopColor: colors.border }]}>
                <View style={styles.levelLabels}>
                  <Text style={dynamicStyles.levelMainLabel}>Cấp độ {levelInfo.level}</Text>
                  <Text style={dynamicStyles.xpDetailText}>
                    {levelInfo.totalXp} / <Text style={{fontWeight: '900'}}>{levelInfo.nextLevelMinXp}</Text> XP
                  </Text>
                </View>
                <Progress.Bar 
                  progress={levelInfo.progress} 
                  width={null} 
                  height={10}
                  color={colors.primary}
                  unfilledColor={colors.border}
                  borderWidth={0}
                  borderRadius={10}
                />
                <Text style={dynamicStyles.xpRemainingText}>
                  Còn {levelInfo.xpToNextLevel} XP nữa để lên cấp {levelInfo.level + 1} 🚀
                </Text>
              </View>

              <View style={[styles.xpChip, { backgroundColor: colors.primary }]}>
                <Sparkles size={16} color="#FFFFFF" />
                <Text style={styles.xpText}>{profileData?.totalXP ?? 0} XP</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <StatCard icon={<BookOpen size={20} color={colors.primary} />} label="Từ vựng" value={`${profileData?.learnedVocabularyCount ?? 0}`} colors={colors} />
              <StatCard icon={<Clock3 size={20} color={colors.primary} />} label="Thời gian" value={formatDuration(profileData?.totalStudyDuration ?? 0)} colors={colors} />
              <StatCard icon={<TrendingUp size={20} color={colors.primary} />} label="Độ chính xác" value={`${Math.round(profileData?.averageAccuracy ?? 0)}%`} colors={colors} />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={dynamicStyles.sectionTitle}>Xu hướng Quiz</Text>
              <TouchableOpacity style={styles.sectionAction} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                <Text style={[styles.sectionActionText, { color: colors.primary }]}>Quay lại</Text>
                <ChevronRight size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }] }>
              {chartValues.length > 0 ? (
                <LineChart
                  data={{ labels: chartLabels, datasets: [{ data: chartValues }] }}
                  width={Dimensions.get('window').width - 64}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chartStyle}
                  withVerticalLines={false}
                  yAxisSuffix="%"
                  fromZero
                  segments={4}
                />
              ) : (
                <View style={styles.emptyChartContainer}>
                  <Text style={{ color: colors.textSecondary }}>Chưa có dữ liệu quiz.</Text>
                </View>
              )}
            </View>

            <View style={styles.sectionSubheader}>
              <Text style={[styles.statsSectionTitle, { color: colors.text }]}>Lịch sử học tập</Text>
              <Text style={[styles.statsSectionDescription, { color: colors.textSecondary }]}>Tần suất học tập trong 28 ngày qua.</Text>
            </View>

            <View style={[styles.heatmapCard, { backgroundColor: colors.card, borderColor: colors.border }] }>
              <View style={styles.heatmapGrid}>
                {heatmapData.map((item) => {
                  const shade = Math.min(4, item.count);
                  return (
                    <View
                      key={item.date}
                      style={[
                        styles.heatmapCell,
                        shade === 0 && { backgroundColor: colors.border },
                        shade === 1 && styles.heatmapLevel1,
                        shade === 2 && styles.heatmapLevel2,
                        shade === 3 && styles.heatmapLevel3,
                        shade >= 4 && { backgroundColor: colors.primary },
                      ]}
                    />
                  );
                })}
              </View>
              <View style={styles.heatmapLegendRow}>
                <Text style={styles.legendLabel}>Ít</Text>
                <View style={styles.legendBoxes}>
                  <View style={[styles.legendBox, { backgroundColor: colors.border }]} />
                  <View style={[styles.legendBox, styles.heatmapLevel1]} />
                  <View style={[styles.legendBox, styles.heatmapLevel2]} />
                  <View style={[styles.legendBox, styles.heatmapLevel3]} />
                  <View style={[styles.legendBox, { backgroundColor: colors.primary }]} />
                </View>
                <Text style={styles.legendLabel}>Nhiều</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
      <BottomNavigation activeTab="profile" />
    </ScreenContainer>
  );
}

function StatCard({ icon, label, value, colors }: { icon: React.ReactNode; label: string; value: string; colors: any }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
      <View style={[styles.statIcon, { backgroundColor: colors.surfaceAlt }]}>{icon}</View>
      <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  levelBadgeMini: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FFD02C',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    zIndex: 10,
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  levelSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    marginBottom: 16,
  },
  levelLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  xpChip: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
  },
  xpText: {
    color: '#FFFFFF',
    fontWeight: '800',
    marginLeft: 6,
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 4,
  },
  chartCard: {
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  chartStyle: {
    borderRadius: 24,
  },
  emptyChartContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionSubheader: {
    marginBottom: 12,
  },
  statsSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  statsSectionDescription: {
    fontSize: 13,
  },
  heatmapCard: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 40,
    borderWidth: 1,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  heatmapCell: {
    width: (Dimensions.get('window').width - 110) / 7,
    height: 24,
    borderRadius: 6,
  },
  heatmapLevel1: { backgroundColor: '#D7EAE4' },
  heatmapLevel2: { backgroundColor: '#A7D3BE' },
  heatmapLevel3: { backgroundColor: '#66B58E' },
  heatmapLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
  },
  legendBoxes: {
    flexDirection: 'row',
    gap: 4,
  },
  legendBox: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
});