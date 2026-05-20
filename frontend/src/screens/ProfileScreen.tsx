import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { BarChart } from 'react-native-chart-kit';
import { User, Mail, Sparkles, Flame, BookOpen, Clock3, ChevronRight, Award } from 'lucide-react-native';
import * as Progress from 'react-native-progress';
import { useAuthContext } from '../context/AuthContext';
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
  totalStudyDuration: number; // Đảm bảo lưu trữ dạng số nguyên
  averageAccuracy: number;
  quizTrend: QuizTrendPoint[];
  heatmap: Record<string, number>;
};

// 🛠️ HÀM FORMAT THỜI GIAN ĐÃ ĐƯỢC FIX LỖI TÍNH TOÁN
function formatDuration(inputTime: number) {
  if (!inputTime || inputTime <= 0) return '0p';
  
  // Tự động kiểm tra: Nếu số quá lớn (> 100,000,000), chứng tỏ backend đang trả về mili-giây, ta đổi về giây.
  let seconds = inputTime;
  if (inputTime > 10000000) {
    seconds = Math.floor(inputTime / 1000);
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}g ${minutes}p`;
  }
  return `${minutes > 0 ? minutes : 1}p`; // Ít nhất hiển thị 1 phút nếu thời gian quá nhỏ
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
    
    // 🛠️ FIX KHỚP DATA BACKEND: Đọc hết các trường hợp đặt tên biến của server
    const rawDuration = payload.total_study_duration ?? payload.totalStudyDuration ?? payload.study_time ?? payload.studyTime ?? 0;

    return {
      username: payload.username || 'Học viên',
      email: payload.email || 'demo@japanese.local',
      totalXP: Number(payload.total_xp ?? payload.totalXP ?? 0),
      learnedVocabularyCount: Number(payload.learned_vocabulary_count ?? payload.learnedVocabularyCount ?? payload.vocab_count ?? 0),
      totalStudyDuration: Number(rawDuration), 
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
  const { user, streakCount } = useAuthContext();
  const { colors } = useTheme();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isReady, setIsReady] = useState(false);

  const levelInfo = useMemo(() => 
    calculateLevelInfo(profileData?.totalXP ?? user?.totalXp ?? 0),
    [profileData?.totalXP, user?.totalXp]
  );

  const dynamicStyles = useMemo(() => StyleSheet.create({
    loaderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 40,
      backgroundColor: colors.background,
    },
    profileCard: {
      backgroundColor: colors.card,
      borderRadius: 32,
      padding: 24,
      alignItems: 'center',
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 12 },
        android: { elevation: 2 },
      }),
    },
    username: {
      fontSize: 24,
      fontWeight: '900',
      color: colors.text,
      marginBottom: 4,
      textAlign: 'center',
    },
    emailText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '500',
    },
    xpRemainingText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 10,
      textAlign: 'center',
    },
    sectionTitle: {
      fontSize: 18,
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

  const processedQuizTrend = useMemo(() => {
    const rawTrend = profileData?.quizTrend ?? [];
    return rawTrend.slice(-5); 
  }, [profileData]);

  const chartLabels = useMemo(
    () => processedQuizTrend.map((point) => {
      const parsedTime = Date.parse(point.date);
      if (!Number.isNaN(parsedTime)) {
        const date = new Date(parsedTime);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      }
      return point.date || '--';
    }),
    [processedQuizTrend],
  );

  const chartValues = useMemo(() => processedQuizTrend.map((point) => point.score), [processedQuizTrend]);
  const heatmapData = useMemo(
    () => buildHeatmapGrid(profileData?.heatmap ?? {}),
    [profileData],
  );

  const rgbPrimary = useMemo(() => {
    const hex = colors.primary.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    return `${r}, ${g}, ${b}`;
  }, [colors.primary]);

  const chartConfig = useMemo(() => ({
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(${rgbPrimary}, ${Math.max(opacity, 0.2)})`,
    labelColor: () => colors.textSecondary,
    barPercentage: 0.5,
    style: {
      borderRadius: 24,
    },
    propsForBackgroundLines: {
      stroke: colors.border,
      strokeDasharray: '4',
      strokeWidth: 1,
    },
    propsForLabels: {
      fontSize: 10,
      fontWeight: '600',
    }
  }), [colors, rgbPrimary]);

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={dynamicStyles.scrollContent}>
        {!isReady ? (
          <View style={dynamicStyles.loaderContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <>
            {/* THẺ THÔNG TIN TÀI KHOẢN */}
            <View style={dynamicStyles.profileCard}>
              <View style={[styles.avatarContainer, { backgroundColor: colors.surfaceAlt }]}>
                <User size={38} color={colors.primary} />
                <View style={[styles.levelBadgeMini, { backgroundColor: '#FFD02C', borderColor: colors.card }]}>
                  <Text style={[styles.levelBadgeText, { color: '#000000' }]}>{levelInfo.level}</Text>
                </View>
              </View>

              <Text style={dynamicStyles.username} numberOfLines={1}>
                {profileData?.username ?? user?.username ?? 'Học viên'}
              </Text>

              <View style={styles.emailRow}>
                <Mail size={14} color={colors.textSecondary} />
                <Text style={dynamicStyles.emailText} numberOfLines={1}>
                  {profileData?.email ?? user?.email ?? 'demo@japanese.local'}
                </Text>
              </View>

              {/* KHU VỰC TIẾN ĐỘ CẤP ĐỘ */}
              <View style={[styles.levelSection, { borderColor: colors.border }]}>
                <View style={styles.levelLabels}>
                  <View style={styles.levelRow}>
                    <Award size={16} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={[styles.levelMainLabel, { color: colors.text }]}>Cấp độ {levelInfo.level}</Text>
                  </View>
                  <View style={[styles.xpChip, { backgroundColor: colors.primary + '15' }]}>
                    <Sparkles size={12} color={colors.primary} />
                    <Text style={[styles.xpText, { color: colors.primary }]}>{profileData?.totalXP ?? 0} ĐIỂM XP</Text>
                  </View>
                </View>

                <Progress.Bar
                  progress={levelInfo.progress}
                  height={8}
                  color={colors.primary}
                  unfilledColor={colors.surfaceAlt}
                  borderWidth={0}
                  borderRadius={8}
                  width={Dimensions.get('window').width - 88}
                />
                <Text style={dynamicStyles.xpRemainingText}>
                  Còn {levelInfo.xpToNextLevel} XP nữa để lên cấp {levelInfo.level + 1} 🚀
                </Text>
              </View>
            </View>

            {/* LƯỚI THỐNG KÊ TỔNG QUAN */}
            <View style={styles.statsRow}>
              <StatCard icon={<BookOpen size={20} color={colors.primary} />} label="Từ vựng" value={`${profileData?.learnedVocabularyCount ?? 0}`} colors={colors} />
              
              {/* 🛠️ CARD THỜI GIAN ĐÃ ĐƯỢC ĐẢM BẢO CONFIG ĐÚNG */}
              <StatCard icon={<Clock3 size={20} color={colors.primary} />} label="Thời gian học" value={formatDuration(profileData?.totalStudyDuration ?? 0)} colors={colors} />
              
              <StatCard icon={<Flame size={20} color="#FFD02C" fill="#FFD02C" />} label="Chuỗi học" value={`${streakCount ?? 0} ngày`} colors={colors} />
            </View>

            {/* TIÊU ĐỀ BIỂU ĐỒ QUIZ */}
            <View style={styles.sectionHeader}>
              <Text style={dynamicStyles.sectionTitle}>Xu hướng kết quả</Text>
              <TouchableOpacity style={styles.sectionAction} onPress={() => navigation.goBack()} activeOpacity={0.7}>
                <Text style={[styles.sectionActionText, { color: colors.primary }]}>Quay lại</Text>
                <ChevronRight size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* KHU VỰC BIỂU ĐỒ CỘT */}
            <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {chartValues.length > 0 ? (
                <BarChart
                  data={{ labels: chartLabels, datasets: [{ data: chartValues }] }}
                  width={Dimensions.get('window').width - 48}
                  height={220}
                  chartConfig={chartConfig}
                  style={styles.chartStyle}
                  withInnerLines={true}
                  yAxisSuffix="%"
                  fromZero
                  showBarTops={false}
                  flatColor={true}
                  yAxisLabel=""
                  verticalLabelRotation={0}
                />
              ) : (
                <View style={styles.emptyChartContainer}>
                  <Text style={{ color: colors.textSecondary, fontWeight: '500' }}>Chưa có dữ liệu kiểm tra gần đây.</Text>
                </View>
              )}
            </View>

            {/* LỊCH SỬ HOẠT ĐỘNG (HEATMAP) */}
            <View style={styles.sectionSubheader}>
              <Text style={[styles.statsSectionTitle, { color: colors.text }]}>Lịch sử học tập</Text>
              <Text style={[styles.statsSectionDescription, { color: colors.textSecondary }]}>Tần suất phân bổ hoạt động trong 28 ngày qua.</Text>
            </View>

            <View style={[styles.heatmapCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.heatmapGrid}>
{heatmapData.map((item) => {
  const shade = Math.min(4, item.count);
  const zeroBg = colors.border ?? '#e0e0e0';
  return (
    <View
      key={item.date}
      style={[
        styles.heatmapCell,
        shade === 0 && { backgroundColor: zeroBg },
        shade === 1 && { backgroundColor: colors.primary + '30' },
        shade === 2 && { backgroundColor: colors.primary + '60' },
        shade === 3 && { backgroundColor: colors.primary + 'A0' },
        shade >= 4 && { backgroundColor: colors.primary },
      ]}
    />
  );
})}
              </View>
              <View style={styles.heatmapLegendRow}>
                <Text style={styles.legendLabel}>Ít hoạt động</Text>
                <View style={styles.legendBoxes}>
                  <View style={[styles.legendBox, { backgroundColor: colors.surfaceAlt }]} />
                  <View style={[styles.legendBox, { backgroundColor: colors.primary + '30' }]} />
                  <View style={[styles.legendBox, { backgroundColor: colors.primary + '60' }]} />
                  <View style={[styles.legendBox, { backgroundColor: colors.primary + 'A0' }]} />
                  <View style={[styles.legendBox, { backgroundColor: colors.primary }]} />
                </View>
                <Text style={styles.legendLabel}>Chăm chỉ</Text>
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
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  levelBadgeMini: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    zIndex: 10,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  levelSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    width: '100%',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelMainLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  xpChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  xpText: {
    fontWeight: '800',
    fontSize: 11,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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
    marginRight: 2,
  },
  chartCard: {
    borderRadius: 28,
    paddingVertical: 20,
    paddingRight: 16,
    paddingLeft: 4,
    marginBottom: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartStyle: {
    borderRadius: 24,
  },
  emptyChartContainer: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionSubheader: {
    marginBottom: 16,
  },
  statsSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  statsSectionDescription: {
    fontSize: 13,
    fontWeight: '500',
  },
  heatmapCard: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  heatmapCell: {
    width: (Dimensions.get('window').width - 104) / 7,
    height: 26,
    borderRadius: 7,
  },
  heatmapLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
  },
  legendBoxes: {
    flexDirection: 'row',
    gap: 4,
  },
  legendBox: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
});