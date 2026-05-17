import React, { useContext, useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Flame, BookOpen, GraduationCap, ChevronRight, AlertCircle } from 'lucide-react-native';
import { StackScreenProps } from '@react-navigation/stack';
import * as Progress from 'react-native-progress';

import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { RootStackParamList } from '../components/AppNavigator';
import ScreenContainer from '../components/ScreenContainer';
import BottomNavigation from '../components/BottomNavigation';
import AppHeaderSearch from '../components/AppHeaderSearch';
import VocabularyManager from '../components/VocabularyManager';
import { getMaterials, getUserStats } from '../api/api';
import { BACKEND_URL } from '../config/BackendConfig';
import { calculateLevelInfo } from '../utils/level';

type HomeScreenProps = StackScreenProps<RootStackParamList, 'Home'>;

type WrongWord = {
  id: number;
  kanji: string;
  meaning: string;
};

type HomeData = {
  totalXP: number;
  wrongWords: WrongWord[];
};

const COURSES_DATA = [
  { id: '1', title: 'Động từ N3', stats: '15/20 từ', progress: 0.75 },
  { id: '2', title: 'Hán tự N2', stats: '45/100 từ', progress: 0.45 },
  { id: '3', title: 'Ngữ pháp N3', stats: '10/30 mẫu', progress: 0.33 },
  { id: '4', title: 'Từ vựng N1', stats: '0/50 từ', progress: 0 },
];

const fetchHomeData = async (userId: number): Promise<HomeData> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/profile/${userId}`);
    const data = await response.json();
    const totalXP = Number(data.user?.total_xp ?? 0);

    const wrongResponse = await fetch(`${BACKEND_URL}/api/home/${userId}/wrong-words`);
    const wrongData = await wrongResponse.json();
    const wrongWords = wrongData.wrongWords || [];

    return { totalXP, wrongWords };
  } catch (error) {
    console.warn('Error fetching home data:', error);
    return { totalXP: 0, wrongWords: [] };
  }
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [materials, setMaterials] = useState<any[]>([]);
  const [userStats, setUserStats] = useState({ streak: 0 });
  const [homeData, setHomeData] = useState<HomeData>({ totalXP: 0, wrongWords: [] });

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [matsRes, statsRes, homeRes] = await Promise.all([
        getMaterials(user.id),
        getUserStats(user.id),
        fetchHomeData(user.id),
      ]);
      setMaterials(matsRes.materials || []);
      setUserStats({ streak: statsRes.streakCount || 0 });
      setHomeData(homeRes);
    } catch (error) {
      console.warn('Lỗi load data:', error);
    } finally {
      setIsReady(true);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // Logic tính toán Level
  const lvlInfo = useMemo(() => calculateLevelInfo(homeData.totalXP), [homeData.totalXP]);

  const streakMascot = require('../../assets/sharkMagic.png');
  const currentLesson = materials.find(m => m.status === 'in_progress') || materials[0];

  const dynamicStyles = StyleSheet.create({
    loaderContainer: { 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: colors.background 
    },
    scrollContent: { 
      paddingHorizontal: 20, 
      paddingBottom: 100, 
      backgroundColor: colors.background 
    },
  });

  if (!isReady) {
    return (
      <View style={dynamicStyles.loaderContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={dynamicStyles.scrollContent}>
        <AppHeaderSearch
          displayName={user?.username || 'Học viên'}
          mascotSource={streakMascot}
          searchText={searchText}
          onChangeSearchText={setSearchText}
          onSubmitSearch={() => navigation.navigate('Dictionary', { query: searchText })}
        />

        <View style={styles.sectionSpacing} />

        {/* STREAK CARD: Mascot ở góc trái */}
        <View style={styles.streakCard}>
          <Image source={streakMascot} style={styles.streakMascotLeft} resizeMode="contain" />
          
          <View style={styles.streakInfoContainer}>
            <View style={styles.streakTagRow}>
              <Flame size={16} color="#FFD02C" fill="#FFD02C" />
              <Text style={styles.streakTagText}>Chuỗi {userStats.streak} ngày</Text>
            </View>
            <Text style={styles.streakValue}>Lv. {lvlInfo.level}</Text>
            <Text style={styles.streakSubtitle}>Còn {lvlInfo.xpToNextLevel} XP để lên cấp!</Text>
          </View>

          <View style={styles.levelCircle}>
            <Progress.Circle 
              size={70} 
              progress={lvlInfo.progress} 
              color="#FFD02C" 
              unfilledColor="rgba(255,255,255,0.1)" 
              borderWidth={0} 
              thickness={6}
              strokeCap="round"
            />
            <View style={styles.levelInside}>
              <Text style={styles.levelPercentText}>{Math.round(lvlInfo.progress * 100)}%</Text>
            </View>
          </View>
        </View>

        <SectionHeader title="Tiếp tục hành trình" colors={colors} />
        {currentLesson && (
          <TouchableOpacity 
            style={[styles.todayCard, { backgroundColor: colors.card, borderColor: colors.border }]} 
            onPress={() => navigation.navigate('StudyJourney', { materialId: currentLesson.id })}
          >
            <View style={styles.todayCardHeader}>
              <View style={[styles.todayIconBox, { backgroundColor: colors.border }]}>
                <GraduationCap size={28} color={colors.primary} />
              </View>
              <View style={styles.todayCardText}>
                <Text style={[styles.todayCardTitle, { color: colors.text }]}>{currentLesson.title}</Text>
                <Text style={[styles.todayCardSubtitle, { color: colors.textSecondary }]}>Đã học {currentLesson.learned_cards || 0}/{currentLesson.total_cards || 0} từ</Text>
              </View>
              <View style={[styles.todayCardProgressBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.todayCardProgressText}>{Math.round(((currentLesson.learned_cards || 0) / (currentLesson.total_cards || 1)) * 100)}%</Text>
              </View>
            </View>
            <ProgressBar progress={(currentLesson.learned_cards || 0) / (currentLesson.total_cards || 1)} colors={colors} />
          </TouchableOpacity>
        )}

        <SectionHeader title="Cần cải thiện 🔥" colors={colors} />
        <View style={styles.wrongWordsSection}>
          {homeData.wrongWords.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {homeData.wrongWords.map((word, index) => (
                <View key={index} style={[styles.wrongWordCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <AlertCircle size={14} color={colors.danger} style={{marginBottom: 4}} />
                  <Text style={[styles.wrongWordKanji, { color: colors.danger }]}>{word.kanji}</Text>
                  <Text style={[styles.wrongWordMeaning, { color: colors.danger }]} numberOfLines={1}>{word.meaning}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Tuyệt vời! Không có từ nào cần ôn tập.</Text>
          )}
        </View>

        <SectionHeader title="Thư viện của bạn" colors={colors} actionLabel="Xem tất cả" onAction={() => navigation.navigate('Study')} />
        <View style={styles.courseGrid}>
          {materials.map((item) => (
            <SmallCourseCard
              key={item.id}
              materialId={item.id}
              title={item.title}
              stats={`${item.learned_cards || 0}/${item.total_cards || 0} từ`}
              progress={item.total_cards ? item.learned_cards / item.total_cards : 0}
              onPress={() => navigation.navigate('StudyJourney', { materialId: item.id })}
              colors={colors}
            />
          ))}
        </View>
      </ScrollView>
      <BottomNavigation activeTab="home" />
    </ScreenContainer>
  );
}

function SectionHeader({ title, actionLabel, onAction, colors }: any) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {actionLabel && (
        <TouchableOpacity style={styles.sectionAction} onPress={onAction}>
          <Text style={[styles.sectionActionText, { color: colors.primary }]}>{actionLabel}</Text>
          <ChevronRight size={14} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function SmallCourseCard({ title, stats, progress, onPress, materialId, colors }: any) {
  return (
    <View style={[styles.courseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.courseCardHeader}>
        <View style={[styles.courseIconBox, { backgroundColor: colors.border }]}>
          <BookOpen size={20} color={colors.primary} />
        </View>
        <VocabularyManager materialId={materialId} materialTitle={title} iconSize={16} />
      </View>
      <Text style={[styles.courseCardTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
      <Text style={[styles.courseCardStats, { color: colors.textSecondary }]}>{stats}</Text>
      <ProgressBar progress={progress} colors={colors} />
      <TouchableOpacity style={[styles.courseCardButton, { backgroundColor: colors.primary }]} onPress={onPress}>
        <Text style={styles.courseCardButtonText}>Học tiếp</Text>
      </TouchableOpacity>
    </View>
  );
}

function ProgressBar({ progress, colors }: { progress: number; colors: any }) {
  return (
    <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
      <View style={[styles.progressBarFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: colors.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionSpacing: { height: 20 },
  streakCard: {
    backgroundColor: '#0E513D',
    borderRadius: 28,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
    elevation: 4,
  },
  streakMascotLeft: {
    width: 85,
    height: 85,
    marginRight: 15,
  },
  streakInfoContainer: { flex: 1 },
  streakTagRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  streakTagText: { fontSize: 12, fontWeight: '700', color: '#FFD02C', textTransform: 'uppercase', marginLeft: 6 },
  streakValue: { fontSize: 32, fontWeight: '900', color: '#FFFFFF' },
  streakSubtitle: { fontSize: 12, color: '#A7C7C0', marginTop: 4 },
  levelCircle: { justifyContent: 'center', alignItems: 'center' },
  levelInside: { position: 'absolute' },
  levelPercentText: { color: '#FFD02C', fontWeight: '800', fontSize: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  sectionAction: { flexDirection: 'row', alignItems: 'center' },
  sectionActionText: { fontSize: 13, fontWeight: '700', marginRight: 4 },
  todayCard: { borderRadius: 24, padding: 20, marginBottom: 24, elevation: 3, borderWidth: 1 },
  todayCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  todayIconBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  todayCardText: { flex: 1, marginLeft: 15 },
  todayCardTitle: { fontSize: 18, fontWeight: '800' },
  todayCardSubtitle: { fontSize: 13 },
  todayCardProgressBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  todayCardProgressText: { color: 'white', fontSize: 12, fontWeight: '800' },
  wrongWordsSection: { marginBottom: 24 },
  wrongWordCard: { padding: 14, borderRadius: 18, marginRight: 12, width: 130, borderWidth: 1 },
  wrongWordKanji: { fontSize: 18, fontWeight: '800' },
  wrongWordMeaning: { fontSize: 12, marginTop: 2 },
  emptyText: { textAlign: 'center', fontStyle: 'italic' },
  courseGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  courseCard: { width: '48%', borderRadius: 22, padding: 16, marginBottom: 16, elevation: 2, borderWidth: 1 },
  courseCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  courseIconBox: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  courseCardTitle: { fontSize: 15, fontWeight: '800' },
  courseCardStats: { fontSize: 11, marginVertical: 6 },
  courseCardButton: { borderRadius: 12, paddingVertical: 10, marginTop: 15, alignItems: 'center' },
  courseCardButtonText: { color: 'white', fontSize: 12, fontWeight: '800' },
  progressBarContainer: { width: '100%', borderRadius: 10, overflow: 'hidden', height: 6 },
  progressBarFill: { height: '100%', borderRadius: 10 },
});