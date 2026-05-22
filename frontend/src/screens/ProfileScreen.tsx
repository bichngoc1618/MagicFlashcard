import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { 
  Mail, 
  Sparkles, 
  Award, 
  Target, 
  Crown, 
  Flame, 
  CheckCircle2, 
  Calendar,
  Layers
} from 'lucide-react-native';
import * as Progress from 'react-native-progress';
import { PieChart } from 'react-native-chart-kit';
import { useAuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { RootStackParamList } from '../components/AppNavigator';
import ScreenContainer from '../components/ScreenContainer';
import BottomNavigation from '../components/BottomNavigation';
import { BACKEND_URL } from '../config/BackendConfig';
import { calculateLevelInfo } from '../utils/level';

type ProfileScreenProps = StackScreenProps<RootStackParamList, 'Profile'>;

type ProfileData = {
  username: string;
  email: string;
  totalXP: number;
  averageAccuracy: number;
  streakDays: number;
  totalAnswers: number;
  vocabStats: {
    mastered: number;
    learning: number;
    notLearned: number;
  };
  weeklyActivity: boolean[];
  heatmap: Record<string, number>;
};

const screenWidth = Dimensions.get('window').width;

function getPersona(xp: number, accuracy: number) {
  if (xp > 10000 && accuracy >= 85) return { title: 'Độc Cô Cầu Bại', sub: 'Học bá', color: '#FFD02C' };
  if (accuracy >= 85) return { title: 'Nhất Kích Tất Trúng', sub: 'Siêu cấp', color: '#4CD964' };
  if (xp > 5000) return { title: 'Cần Cù Bù Thông Minh', sub: 'Chiến thần', color: '#FF9500' };
  if (accuracy > 0 && accuracy < 50) return { title: 'Sát Thủ Trắc Nghiệm', sub: 'Cần ôn tập kỹ hơn', color: '#FF3B30' };
  return { title: 'Tân Binh', sub: 'Đang trên đà bứt phá', color: '#3B7A66' };
}

async function fetchProfileData(userId: number): Promise<ProfileData> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/profile/${userId}/analytics`);
    if (!response.ok) throw new Error(`Lỗi API: ${response.status}`);
    const payload = await response.json();
    return {
      username: payload.username || 'Học viên',
      email: payload.email || 'demo@japanese.local',
      totalXP: Number(payload.totalXP ?? 0),
      averageAccuracy: Number(payload.averageAccuracy ?? 0),
      streakDays: Number(payload.streakDays ?? 0),
      totalAnswers: Number(payload.totalAnswers ?? 0),
      vocabStats: payload.vocabStats ?? payload.vocab_stats ?? { mastered: 0, learning: 0, notLearned: 0 },
      weeklyActivity: payload.weeklyActivity ?? payload.weekly_activity ?? [false, false, false, false, false, false, false],
      heatmap: payload.heatmap ?? payload.heatMap ?? {},
    };
  } catch (error) {
    return {
      username: 'Học viên',
      email: 'demo@japanese.local',
      totalXP: 0,
      averageAccuracy: 0,
      streakDays: 0,
      totalAnswers: 0,
      vocabStats: { mastered: 0, learning: 0, notLearned: 0 },
      weeklyActivity: [false, false, false, false, false, false, false],
      heatmap: {},
    };
  }
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user } = useAuthContext();
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isReady, setIsReady] = useState(false);

  const levelInfo = useMemo(() => calculateLevelInfo(profileData?.totalXP ?? 0), [profileData?.totalXP]);
  const persona = useMemo(() => getPersona(profileData?.totalXP ?? 0, profileData?.averageAccuracy ?? 0), [profileData]);

  // Gộp nhóm từ vựng sang cấu trúc 2 phân vùng dữ liệu thẳng phẳng sạch sẽ: Đã Thuộc / Chưa Thuộc
  const totalInVocabStore = useMemo(() => {
    if (!profileData?.vocabStats) return 0;
    const { mastered, notLearned } = profileData.vocabStats;
    return mastered + notLearned;
  }, [profileData?.vocabStats]);

  const statsPercentages = useMemo(() => {
    if (!totalInVocabStore) return { mastered: 0, notLearned: 0 };
    return {
      mastered: Math.round(((profileData?.vocabStats?.mastered ?? 0) / totalInVocabStore) * 100),
      notLearned: Math.round(((profileData?.vocabStats?.notLearned ?? 0) / totalInVocabStore) * 100),
    };
  }, [profileData?.vocabStats, totalInVocabStore]);

  const chartData = useMemo(() => {
    return [
      {
        name: 'Đã thuộc',
        population: profileData?.vocabStats?.mastered ?? 0,
        color: '#10B981',
        legendFontColor: 'transparent',
        legendFontSize: 0,
      },
      {
        name: 'Chưa thuộc',
        population: profileData?.vocabStats?.notLearned ?? 0,
        color: isDark ? '#475569' : '#CBD5E1',
        legendFontColor: 'transparent',
        legendFontSize: 0,
      },
    ];
  }, [profileData?.vocabStats, isDark]);

  const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  };

  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const monthActivityCells = useMemo(() => {
    const cells = [] as Array<{ key: string; date: Date; count: number }>;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 27);

    for (let i = 0; i < 28; i += 1) {
      const date = new Date(startDate.getTime());
      date.setDate(startDate.getDate() + i);
      const key = formatLocalDate(date);
      cells.push({
        key,
        date,
        count: Number(profileData?.heatmap?.[key] ?? 0),
      });
    }

    return cells;
  }, [profileData?.heatmap]);

  const themePrimaryColor = isDark ? '#2A5C4D' : '#3B7A66';

  const dynamicStyles = useMemo(() => StyleSheet.create({
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, backgroundColor: colors.background },
    profileCard: {
      backgroundColor: colors.card, borderRadius: 24, padding: 20, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: isDark ? '#1E293B' : '#F1F5F9',
      ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.01, shadowRadius: 8 }, android: { elevation: 1 } }),
    },
    username: { fontSize: 22, fontWeight: '900', color: colors.text, marginBottom: 4, letterSpacing: -0.5 },
    emailText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
    xpRemainingText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 10, textAlign: 'center' },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: colors.text, marginBottom: 12, letterSpacing: -0.2 }
  }), [colors, isDark]);

  const loadProfileData = useCallback(async () => {
    if (!user?.id) { setProfileData(null); setIsReady(true); return; }
    setIsReady(false);
    try {
      const data = await fetchProfileData(Number(user.id));
      setProfileData(data);
    } catch (error) {
      setProfileData(null);
    } finally { 
      setIsReady(true); 
    }
  }, [user?.id]);

  useFocusEffect(React.useCallback(() => { loadProfileData(); }, [loadProfileData]));

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={dynamicStyles.scrollContent} bounces={false}>
        {!isReady ? (
          <View style={dynamicStyles.loaderContainer}>
            <ActivityIndicator color={themePrimaryColor} size="large" />
          </View>
        ) : (
          <>
            {/* THẺ TÀI KHOẢN CAO CẤP */}
            <View style={dynamicStyles.profileCard}>
              <View style={styles.profileRow}>
                <View style={[styles.avatarContainer, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
                  <Image 
                    source={require('../../assets/sharkMagic.png')} 
                    style={styles.mascotAvatarImg}
                  />
                  <View style={[styles.levelBadgeMini, { backgroundColor: '#FFD02C', borderColor: colors.card }]}>
                    <Text style={styles.levelBadgeText}>Lv.{levelInfo.level}</Text>
                  </View>
                </View>
                
                <View style={styles.profileInfo}>
                  <Text style={dynamicStyles.username} numberOfLines={1}>{profileData?.username ?? user?.username ?? 'Học viên'}</Text>
                  <View style={styles.emailRow}>
                    <Mail size={13} color={colors.textSecondary} />
                    <Text style={dynamicStyles.emailText} numberOfLines={1}>{profileData?.email ?? user?.email ?? 'demo@japanese.local'}</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.levelSection, { borderTopColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <View style={styles.levelLabels}>
                  <View style={styles.levelRowDetail}>
                    <Award size={16} color={themePrimaryColor} style={{ marginRight: 4 }} />
                    <Text style={[styles.levelMainLabel, { color: colors.text }]}>Cấp độ {levelInfo.level}</Text>
                  </View>
                  <View style={[styles.xpChip, { backgroundColor: isDark ? 'rgba(59, 122, 102, 0.15)' : '#E9FBF5' }]}>
                    <Sparkles size={11} color={themePrimaryColor} />
                    <Text style={[styles.xpText, { color: themePrimaryColor }]}>{profileData?.totalXP ?? 0} XP</Text>
                  </View>
                </View>
                <Progress.Bar progress={levelInfo.progress} height={10} color={themePrimaryColor} unfilledColor={isDark ? '#1E293B' : '#E2E8F0'} borderWidth={0} borderRadius={8} width={screenWidth - 72} />
                <Text style={dynamicStyles.xpRemainingText}>Còn {levelInfo.xpToNextLevel} XP để thăng cấp Cấp {levelInfo.level + 1} 🚀</Text>
              </View>
            </View>

            {/* CHIẾN TÍCH CÁ NHÂN */}
            <Text style={dynamicStyles.sectionTitle}>Chiến tích cá nhân</Text>
            <View style={styles.analyticsGrid}>
              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <View style={[styles.iconWrapper, { backgroundColor: persona.color + '15' }]}><Crown size={16} color={persona.color} fill={persona.color} /></View>
                <View style={styles.statContent}>
                  <Text style={[styles.statValueText, { color: colors.text }]} numberOfLines={1}>{persona.title}</Text>
                  <Text style={[styles.statLabelText, { color: colors.textSecondary }]}>{persona.sub}</Text>
                </View>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <View style={[styles.iconWrapper, { backgroundColor: '#FF950015' }]}><Flame size={16} color="#FF9500" fill="#FF9500" /></View>
                <View style={styles.statContent}>
                  <Text style={[styles.statValueText, { color: colors.text }]}>{profileData?.streakDays ?? 0} Ngày</Text>
                  <Text style={[styles.statLabelText, { color: colors.textSecondary }]}>Chuỗi hiện tại</Text>
                </View>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <View style={[styles.iconWrapper, { backgroundColor: '#10B98115' }]}><Target size={16} color="#10B981" /></View>
                <View style={styles.statContent}>
                  <Text style={[styles.statValueText, { color: colors.text }]}>{profileData?.averageAccuracy ? `${Math.round(profileData.averageAccuracy)}%` : '--'}</Text>
                  <Text style={[styles.statLabelText, { color: colors.textSecondary }]}>Độ chính xáC</Text>
                </View>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                <View style={[styles.iconWrapper, { backgroundColor: '#3B82F615' }]}><CheckCircle2 size={16} color="#3B82F6" /></View>
                <View style={styles.statContent}>
                  <Text style={[styles.statValueText, { color: colors.text }]}>{profileData?.totalAnswers ?? 0} câu</Text>
                  <Text style={[styles.statLabelText, { color: colors.textSecondary }]}>Tổng câu trả lời</Text>
                </View>
              </View>
            </View>

            {/* PHÂN TÍCH KHO TỪ VỰNG */}
            <Text style={dynamicStyles.sectionTitle}>Phân tích kho từ vựng</Text>
            <View style={[styles.vocabCard, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <View style={styles.vocabHeader}>
                <View style={[styles.miniIconWrapper, { backgroundColor: isDark ? 'rgba(59, 122, 102, 0.15)' : '#E9FBF5' }]}>
                  <Layers size={13} color={themePrimaryColor} />
                </View>
                <Text style={[styles.vocabMainTitle, { color: colors.text }]}>
                  Tổng tích lũy: <Text style={{ color: themePrimaryColor, fontWeight: '900' }}>{totalInVocabStore}</Text> từ vựng
                </Text>
              </View>

              {totalInVocabStore > 0 ? (
                <View style={styles.chartContainerRow}>
                  <View style={styles.chartWrapper}>
                    <PieChart
                      data={chartData}
                      width={140}
                      height={140}
                      chartConfig={chartConfig}
                      accessor={"population"}
                      backgroundColor={"transparent"}
                      paddingLeft={"35"} 
                      center={[0, 0]}
                      hasLegend={false} 
                      absolute
                    />
                    <View style={[styles.donutHole, { backgroundColor: colors.card }]} />
                  </View>

                  <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendIndicator, { backgroundColor: '#10B981' }]} />
                      <View style={styles.legendTextContainer}>
                        <Text style={[styles.legendLabel, { color: colors.text }]}>Đã thuộc vững</Text>
                        <Text style={[styles.legendValue, { color: colors.textSecondary }]}>
                          {profileData?.vocabStats?.mastered ?? 0} từ ({statsPercentages.mastered}%)
                        </Text>
                      </View>
                    </View>

                    <View style={styles.legendItem}>
                      <View style={[styles.legendIndicator, { backgroundColor: isDark ? '#475569' : '#CBD5E1' }]} />
                      <View style={styles.legendTextContainer}>
                        <Text style={[styles.legendLabel, { color: colors.text }]}>Chưa thuộc</Text>
                        <Text style={[styles.legendValue, { color: colors.textSecondary }]}>
                          {profileData?.vocabStats?.notLearned ?? 0} từ ({statsPercentages.notLearned}%)
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ) : (
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: 24, fontSize: 13, fontWeight: '600' }}>
                  Chưa có tiến trình phân tích dữ liệu.
                </Text>
              )}
            </View>

            {/* NHẬT KÝ HOẠT ĐỘNG TRONG THÁNG */}
            <Text style={dynamicStyles.sectionTitle}>Nhật ký hoạt động tháng này</Text>
            <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#F1F5F9' }]}> 
              <View style={styles.calendarHeaderRow}>
                <Calendar size={14} color={colors.textSecondary} />
              </View>
              <View style={styles.monthGrid}>
                {monthActivityCells.map((cell) => (
                  <View key={cell.key} style={styles.monthCellWrapper}>
                    <View style={[
                      styles.monthCell, 
                      { 
                        backgroundColor: cell.count ? themePrimaryColor : (isDark ? '#1E293B' : '#F1F5F9'), 
                        borderColor: 'transparent' 
                      }
                    ]} />
                    <Text style={[styles.monthCellLabel, { color: colors.textSecondary }]}>{cell.date.getDate()}</Text>
                  </View>
                ))}
              </View>
              <View style={[styles.activityLegendRow, { borderTopColor: isDark ? '#1E293B' : '#F1F5F9' }]}> 
                <View style={styles.activityLegendItem}>
                  <View style={[styles.activityLegendDot, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: 'transparent' }]} />
                  <Text style={[styles.activityLegendText, { color: colors.textSecondary }]}>Nghỉ ngơi</Text>
                </View>
                <View style={styles.activityLegendItem}>
                  <View style={[styles.activityLegendDot, { backgroundColor: themePrimaryColor, borderColor: 'transparent' }]} />
                  <Text style={[styles.activityLegendText, { color: colors.textSecondary }]}>Đang học</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
      <BottomNavigation activeTab="profile" />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  profileRow: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 16 },
  avatarContainer: { 
    width: 64, height: 64, borderRadius: 20, 
    justifyContent: 'center', alignItems: 'center', 
    position: 'relative', borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4 },
      android: { elevation: 1 }
    })
  },
  mascotAvatarImg: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  profileInfo: { flex: 1 },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  levelBadgeMini: { 
    position: 'absolute', 
    bottom: -6, 
    right: -10, 
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 8, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1.5, 
    zIndex: 10 
  },
  levelBadgeText: { fontSize: 8.5, fontWeight: '900', color: '#000000' },
  levelSection: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, width: '100%' },
  levelRowDetail: { flexDirection: 'row', alignItems: 'center' },
  levelLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  levelMainLabel: { fontSize: 14, fontWeight: '900', letterSpacing: -0.2 },
  xpChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 },
  xpText: { fontWeight: '900', fontSize: 11 },
  analyticsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statBox: {
    width: (Dimensions.get('window').width - 44) / 2, borderRadius: 20, padding: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.01, shadowRadius: 6 }, android: { elevation: 1 } }),
  },
  iconWrapper: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statContent: { flex: 1 },
  statValueText: { fontSize: 14, fontWeight: '900', marginBottom: 2, letterSpacing: -0.2 },
  statLabelText: { fontSize: 10, fontWeight: '700' },
  vocabCard: {
    borderRadius: 24, padding: 18, borderWidth: 1, marginBottom: 20,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.01, shadowRadius: 6 }, android: { elevation: 1 } }),
  },
  vocabHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  miniIconWrapper: { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  vocabMainTitle: { fontSize: 14, fontWeight: '700', letterSpacing: -0.1 },
  chartContainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  chartWrapper: {
    position: 'relative',
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  donutHole: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    zIndex: 2,
    left: '50%',
    top: '50%',
    transform: [{ translateX: -42 }, { translateY: -42 }],
  },
  legendContainer: {
    flex: 1,
    paddingLeft: 16,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  legendIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  legendValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  calendarCard: {
    borderRadius: 24, padding: 16, borderWidth: 1, marginBottom: 20,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.01, shadowRadius: 6 }, android: { elevation: 1 } }),
  },
  calendarHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 6 },
  monthCellWrapper: { width: 32, alignItems: 'center', marginBottom: 12 },
  monthCell: { width: 32, height: 32, borderRadius: 10 },
  monthCellLabel: { fontSize: 10, marginTop: 4, fontWeight: '700' },
  activityLegendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 14 },
  activityLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activityLegendDot: { width: 12, height: 12, borderRadius: 4 },
  activityLegendText: { fontSize: 12, fontWeight: '700' },
});