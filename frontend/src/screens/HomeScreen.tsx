import React, { useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Flame, BookOpen, GraduationCap, ChevronRight, Sparkles } from 'lucide-react-native';
import { StackScreenProps } from '@react-navigation/stack';
import * as Progress from 'react-native-progress';

import { useAuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { RootStackParamList } from '../components/AppNavigator';
import ScreenContainer from '../components/ScreenContainer';
import BottomNavigation from '../components/BottomNavigation';
import AppHeaderSearch from '../components/AppHeaderSearch';
import VocabularyManager from '../components/VocabularyManager';
import { getMaterials, getNotifications, markNotificationsRead, getProfile, getHomeWrongWords } from '../api/api';
import { calculateLevelInfo } from '../utils/level';

type HomeScreenProps = StackScreenProps<RootStackParamList, 'Home'>;

type WrongWord = {
  id: number;
  kanji: string;
  meaning: string;
};

type HomeData = {
  totalXP: number;
  streakDays?: number;
  wrongWords: WrongWord[];
};

type NotificationItem = {
  id: number;
  title: string;
  body: string;
  type: string;
  metadata: any;
  is_read: number;
  created_at: string;
};

// ====================================================================
// HÀM ĐỒNG BỘ MÀU SẮC ĐỘNG GIỮA HOME CARD VÀ JOURNEY NODE (ĐÃ ĐẬM MÀU)
// ====================================================================
const getMaterialColorStyle = (title: string, isDark: boolean) => {
  const normalizedTitle = title.toLowerCase();
  
  // Phối tone màu Cam Hổ Phách đậm sắc sảo
  // if (normalizedTitle.includes('kanji') || normalizedTitle.includes('hán tự') || normalizedTitle.includes('ngữ pháp')) {
  //   return {
  //     primary: isDark ? '#C26D03' : '#D97706',
  //     shadow: isDark ? '#782E00' : '#9A3412',
  //     lightBg: isDark ? 'rgba(194, 109, 3, 0.18)' : '#FEE2E2', // Nền icon đậm đà hơn
  //   };
  // }
  
  // Phối tone màu Xanh Ngọc lục bảo sâu thẳm
  return {
    primary: isDark ? '#2A5C4D' : '#3B7A66',
    shadow: isDark ? '#193D32' : '#275245',
    lightBg: isDark ? 'rgba(59, 122, 102, 0.18)' : '#D1FAE5',
  };
};

const fetchHomeData = async (userId: number): Promise<HomeData & { recentQuizzes?: any[] }> => {
  try {
    const profile = await getProfile(userId);

    const totalXP = Number(profile?.total_xp ?? 0);
    const streakDays = Number(profile?.streak_count ?? 0);
    const wrongRes = await getHomeWrongWords(userId);
    const wrongWords = wrongRes?.wrongWords || [];

    return {
      totalXP,
      streakDays,
      wrongWords,
      recentQuizzes: profile?.recentQuizzes || [],
    };
  } catch (error) {
    console.warn('Error fetching home data:', error);
    return { totalXP: 0, wrongWords: [] };
  }
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { user, streakCount, notificationCount, refreshNotificationCount } = useAuthContext();
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  const [isReady, setIsReady] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [materials, setMaterials] = useState<any[]>([]);
  const [homeData, setHomeData] = useState<HomeData>({ totalXP: 0, wrongWords: [] });
  const [giftNotification, setGiftNotification] = useState<NotificationItem | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [matsRes, homeRes] = await Promise.all([
        getMaterials(user.id),
        fetchHomeData(user.id),
      ]);

      const allMaterials = matsRes.materials || [];
      const recentQuizzes = homeRes.recentQuizzes || [];
      const materialMap: Record<number, any> = {};
      allMaterials.forEach((m: any) => { materialMap[m.id] = m; });

      const recentMaterials: any[] = [];
      for (const q of recentQuizzes) {
        const mid = Number(q.material_id || q.materialId);
        if (mid && materialMap[mid] && !recentMaterials.find((r) => r.id === mid)) {
          recentMaterials.push(materialMap[mid]);
        }
        if (recentMaterials.length >= 4) break;
      }

      if (recentMaterials.length < 4) {
        const others = allMaterials.filter((m: any) => !recentMaterials.find((r) => r.id === m.id));
        for (const o of others) {
          recentMaterials.push(o);
          if (recentMaterials.length >= 4) break;
        }
      }

      setMaterials(recentMaterials);
      setHomeData(homeRes);
    } catch (error) {
      console.warn('Lỗi load data:', error);
    } finally {
      setIsReady(true);
    }
  }, [user?.id]);

  const checkNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { notifications } = await getNotifications(user.id);
      await refreshNotificationCount(notifications);

      const unreadShares = (notifications || []).filter(
        (item: NotificationItem) => item.type === 'share_received' && item.is_read === 0
      );
      if (unreadShares.length === 1) {
        setGiftNotification(unreadShares[0]);
      } else if (unreadShares.length > 1) {
        setGiftNotification({
          id: -1,
          title: 'Bạn đã nhận được thẻ từ bạn bè',
          body: `Bạn có ${unreadShares.length} thẻ mới.`,
          type: 'share_received_aggregated',
          metadata: { count: unreadShares.length },
          is_read: 0,
          created_at: new Date().toISOString(),
        } as unknown as NotificationItem);
      }
    } catch (error) {
      console.warn('Không thể kiểm tra thông báo nhận thẻ:', error);
    }
  }, [user?.id, refreshNotificationCount]);

  useFocusEffect(useCallback(() => {
    loadData();
    checkNotifications();
  }, [loadData, checkNotifications]));

  const lvlInfo = useMemo(() => calculateLevelInfo(homeData.totalXP), [homeData.totalXP]);

  const streakDisplay = homeData.streakDays ?? streakCount ?? 0;
  const streakMascot = require('../../assets/sharkMagic.png');
  const currentLesson = materials.find(m => m.status === 'in_progress') || materials[0];
  const currentLessonCompleted = currentLesson ? (currentLesson.completed_nodes ?? currentLesson.learned_cards ?? 0) : 0;
  const currentLessonTotal = currentLesson ? (currentLesson.total_nodes ?? currentLesson.total_cards ?? 0) : 0;
  const currentLessonProgress = currentLessonTotal ? (currentLesson.node_progress_percentage ?? 0) / 100 : 0;

  if (!isReady) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // Ép sắc độ nền Card Streak xuống đậm hẳn để giữ tương phản tốt
  const streakBgColor = isDark ? '#0A3B2F' : '#2A6351';

  return (
    <ScreenContainer>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}
      >
        <AppHeaderSearch
          displayName={user?.username || 'Học viên'}
          mascotSource={streakMascot}
          searchText={searchText}
          onChangeSearchText={setSearchText}
          onSubmitSearch={() => searchText.trim() && navigation.navigate('Dictionary', { query: searchText.trim() })}
          userXp={homeData.totalXP}
          notificationCount={notificationCount}
          onNotificationPress={() => navigation.navigate('Notifications')}
        />

        {/* MODAL THÔNG BÁO QUÀ TẶNG */}
        <Modal visible={!!giftNotification} transparent animationType="fade">
          <View style={styles.notificationModalOverlay}>
            <View style={[styles.notificationModalCard, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#E2E8F0' }]}> 
              <Text style={[styles.notificationModalTitle, { color: colors.text }]}>
                {giftNotification?.type === 'share_received_aggregated' ? 'Bạn đã nhận được thẻ từ bạn bè' : 'Bạn đã nhận được bài học mới'}
              </Text>
              <Text style={[styles.notificationModalText, { color: colors.textSecondary }]}> 
                {giftNotification?.type === 'share_received_aggregated'
                  ? `Bạn có ${giftNotification?.metadata?.count ?? 0} bài học mới được chia sẻ.`
                  : `Từ ${giftNotification?.metadata?.senderName || 'Người dùng'}: ${giftNotification?.body}`}
              </Text>
              <View style={styles.notificationModalActions}>
                <TouchableOpacity
                  style={[styles.notificationModalButton, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                  onPress={async () => {
                    if (!user?.id || !giftNotification) return;
                    if (giftNotification.type === 'share_received_aggregated') {
                      const { notifications } = await getNotifications(user.id);
                      const unreadShares = (notifications || []).filter((n: NotificationItem) => n.type === 'share_received' && n.is_read === 0).map((n: NotificationItem) => n.id);
                      if (unreadShares.length > 0) await markNotificationsRead(user.id, unreadShares);
                    } else {
                      await markNotificationsRead(user.id, [giftNotification.id]);
                    }
                    setGiftNotification(null);
                  }}
                >
                  <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Đóng</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.notificationModalButton, { backgroundColor: colors.primary }]}
                  onPress={async () => {
                    if (!user?.id || !giftNotification) return;
                    if (giftNotification.type === 'share_received_aggregated') {
                      const { notifications } = await getNotifications(user.id);
                      const unreadShares = (notifications || []).filter((n: NotificationItem) => n.type === 'share_received' && n.is_read === 0).map((n: NotificationItem) => n.id);
                      if (unreadShares.length > 0) await markNotificationsRead(user.id, unreadShares);
                      setGiftNotification(null);
                      navigation.navigate('Notifications');
                      return;
                    }
                    await markNotificationsRead(user.id, [giftNotification.id]);
                    setGiftNotification(null);
                    if (giftNotification?.metadata?.materialId) {
                      navigation.navigate('StudyJourney', { materialId: Number(giftNotification.metadata.materialId) });
                    }
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '500' }}>Xem ngay</Text>
                </TouchableOpacity>

              </View>
            </View>
          </View>
        </Modal>

        <View style={styles.sectionSpacing} />

        {/* STREAK CARD FLAT ĐẬM ĐÀ NỔI BẬT */}
        <View style={[styles.streakCard, { backgroundColor: streakBgColor }]}>
          <Image source={streakMascot} style={styles.streakMascotLeft} resizeMode="contain" />
          
          <View style={styles.streakInfoContainer}>
            <View style={styles.streakTagRow}>
              <Flame size={14} color="#FFD02C" fill="#FFD02C" />
              <Text style={styles.streakTagText}>Chuỗi {streakDisplay} ngày</Text>
            </View>
            <Text style={styles.streakValue}>Cấp {lvlInfo.level}</Text>
            
            <View style={styles.xpRow}>
              <Sparkles size={12} color="rgba(255, 255, 255, 0.75)" style={{ marginRight: 4 }} />
              <Text style={styles.streakSubtitle}>Còn {lvlInfo.xpToNextLevel} XP để lên cấp!</Text>
            </View>
          </View>

          <View style={styles.levelCircle}>
            <Progress.Circle 
              size={72} 
              progress={lvlInfo.progress} 
              color="#FFD02C" 
              unfilledColor="rgba(255,255,255,0.2)" 
              borderWidth={0} 
              thickness={7}
              strokeCap="round"
            />
            <View style={styles.levelInside}>
              <Text style={styles.levelPercentText}>{Math.round(lvlInfo.progress * 100)}%</Text>
            </View>
          </View>
        </View>

        {/* TIẾP TỤC HÀNH TRÌNH */}
        <SectionHeader title="Tiếp tục hành trình" colors={colors} />
        {currentLesson ? (
          <TouchableOpacity 
            activeOpacity={0.95}
            style={[styles.todayCard, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#E2E8F0' }]} 
            onPress={() => navigation.navigate('StudyJourney', { materialId: currentLesson.id })}
          >
            <View style={styles.todayCardHeader}>
              <View style={[styles.todayIconBox, { backgroundColor: isDark ? 'rgba(59, 122, 102, 0.15)' : '#D1FAE5' }]}>
                <GraduationCap size={24} color={isDark ? '#34D399' : '#275245'} />
              </View>
              <View style={styles.todayCardText}>
                <Text style={[styles.todayCardTitle, { color: colors.text }]} numberOfLines={1}>
                  {currentLesson.title}
                </Text>
                <Text style={[styles.todayCardSubtitle, { color: colors.textSecondary }]}>
                  Đã hoàn thành {currentLessonCompleted}/{currentLessonTotal} mục
                </Text>
              </View>
              <View style={[styles.todayCardProgressBadge, { backgroundColor: isDark ? '#193D32' : '#D1FAE5' }]}> 
                <Text style={[styles.todayCardProgressText, { color: isDark ? '#34D399' : '#275245' }]}>
                  {Math.round(currentLessonProgress * 100)}%
                </Text>
              </View>
            </View>
            <ProgressBar progress={currentLessonProgress} colors={colors} isDark={isDark} title={currentLesson.title} height={12} />
          </TouchableOpacity>
        ) : null}

        {/* THƯ VIỆN CỦA BẠN */}
        <SectionHeader 
          title="Thư viện của bạn" 
          colors={colors} 
          actionLabel="Xem tất cả" 
          onAction={() => navigation.navigate('Study')} 
        />
        <View style={styles.courseGrid}>
          {materials.map((item) => {
            const statsCount = item.completed_nodes !== undefined && item.total_nodes !== undefined
              ? `${item.completed_nodes}/${item.total_nodes} mục`
              : `${item.learned_cards || 0}/${item.total_cards || 0} từ`;
            const progressValue = item.total_nodes 
              ? (item.node_progress_percentage || 0) / 100 
              : item.total_cards ? item.learned_cards / item.total_cards : 0;
            return (
              <SmallCourseCard
                key={item.id}
                materialId={item.id}
                title={item.title}
                stats={statsCount}
                progress={progressValue}
                onPress={() => navigation.navigate('StudyJourney', { materialId: item.id })}
                colors={colors}
                isDark={isDark}
              />
            );
          })}
        </View>
      </ScrollView>

    </ScreenContainer>
  );
}

function SectionHeader({ title, actionLabel, onAction, colors }: any) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {actionLabel && (
        <TouchableOpacity style={styles.sectionAction} activeOpacity={0.6} onPress={onAction}>
          <Text style={[styles.sectionActionText, { color: colors.primary }]}>{actionLabel}</Text>
          <ChevronRight size={14} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function SmallCourseCard({ title, stats, progress, onPress, materialId, colors, isDark }: any) {
  const nodePalette = useMemo(() => getMaterialColorStyle(title, isDark), [title, isDark]);

  return (
    <View style={[styles.courseCard, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
      <View style={styles.courseCardHeader}>
        <View style={[styles.courseIconBox, { backgroundColor: nodePalette.lightBg }]}>
          <BookOpen size={16} color={nodePalette.primary} />
        </View>
        <VocabularyManager materialId={materialId} materialTitle={title} iconSize={16} />
      </View>
      
      <Text style={[styles.courseCardTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
      <Text style={[styles.courseCardStats, { color: colors.textSecondary }]}>{stats}</Text>
      
      <ProgressBar progress={progress} colors={colors} isDark={isDark} title={title} height={8} />
      
      <View style={styles.btn3DWrapper}>
        <View style={[styles.btn3DBase, { backgroundColor: nodePalette.shadow }]} />
        <TouchableOpacity 
          activeOpacity={0.9} 
          style={[styles.btn3DTop, { backgroundColor: nodePalette.primary }]} 
          onPress={onPress}
        >
          <Text style={styles.courseCardButtonText}>Học tiếp</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ProgressBar({ progress, isDark, title, height = 10 }: { progress: number; colors: any; isDark: boolean; title: string; height?: number }) {
  const nodePalette = useMemo(() => getMaterialColorStyle(title, isDark), [title, isDark]);
  const trackBg = isDark ? '#1E293B' : '#E2E8F0';
  
  return (
    <View style={[styles.progressBarContainer, { backgroundColor: trackBg, height }]}>
      <View 
        style={[
          styles.progressBarFill, 
          { 
            width: `${Math.min(progress * 100, 100)}%`,
            backgroundColor: nodePalette.primary 
          }
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loaderContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  scrollContent: { 
    paddingHorizontal: 16, 
    paddingBottom: 110 
  },
  sectionSpacing: { height: 12 },
  streakCard: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  streakMascotLeft: {
    width: 84,
    height: 84,
    marginRight: 16,
  },
  streakInfoContainer: { flex: 1 },
  streakTagRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20
  },
  streakTagText: { fontSize: 11, fontWeight: '500', color: '#FFD02C', letterSpacing: 0.5, marginLeft: 4 },
  streakValue: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  xpRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  streakSubtitle: { fontSize: 12, color: 'rgba(255, 255, 255, 0.95)', fontWeight: '600' },
  levelCircle: { justifyContent: 'center', alignItems: 'center' },
  levelInside: { position: 'absolute' },
  levelPercentText: { color: '#FFD02C', fontWeight: '900', fontSize: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, marginTop: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5, color: '#28a068' },
  sectionAction: { flexDirection: 'row', alignItems: 'center' },
  sectionActionText: { fontSize: 13, fontWeight: '700', marginRight: 2 },
  todayCard: { 
    borderRadius: 24, 
    padding: 20, 
    marginBottom: 20, 
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  todayCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  todayIconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  todayCardText: { flex: 1, marginLeft: 14 },
  todayCardTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  todayCardSubtitle: { fontSize: 13, marginTop: 2, fontWeight: '600' },
  todayCardProgressBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  todayCardProgressText: { fontSize: 12, fontWeight: '900' },
  courseGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  courseCard: { 
    width: '48%', 
    borderRadius: 24, 
    padding: 16, 
    marginBottom: 16, 
    borderWidth: 1,
    justifyContent: 'space-between',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 1 },
    }),
  },
  courseCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  courseIconBox: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  courseCardTitle: { fontSize: 16, fontWeight: '900', letterSpacing: -0.3 },
  courseCardStats: { fontSize: 12, marginTop: 2, marginBottom: 12, fontWeight: '600' },
  courseCardButtonText: { color: 'white', fontSize: 13, fontWeight: '900' },
  progressBarContainer: { width: '100%', borderRadius: 12, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 12 },
  
  btn3DWrapper: {
    marginTop: 14,
    height: 38,
    position: 'relative',
  },
  btn3DBase: {
    position: 'absolute',
    top: 3,
    left: 0,
    right: 0,
    bottom: -3,
    borderRadius: 14,
  },
  btn3DTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 24,
  },
  notificationModalCard: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24 },
      android: { elevation: 8 },
    }),
  },
  notificationModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: -0.3
  },
  notificationModalText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  notificationModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  notificationModalButton: {
    minWidth: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
});