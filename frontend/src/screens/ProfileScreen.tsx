import React, { useCallback, useMemo, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SharkLoader from '../components/ui/SharkLoader';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Share
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
  Layers,
  LogOut,
  ArrowLeft,
  Lock,
  Star,
  Trophy,
  Settings,
  X,
  Share2
} from 'lucide-react-native';
import * as Progress from 'react-native-progress';
import { useAuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useGlobalUI } from '../context/GlobalUIContext';
import type { RootStackParamList } from '../components/AppNavigator';
import ScreenContainer from '../components/ScreenContainer';
import { BACKEND_URL } from '../config/BackendConfig';
import { calculateLevelInfo } from '../utils/level';
import { LinearGradient } from 'expo-linear-gradient';

type ProfileScreenProps = StackScreenProps<RootStackParamList, 'Profile'>;

type ProfileData = {
  username: string;
  email: string;
  avatar_id?: string;
  totalXP: number;
  averageAccuracy: number;
  streakDays: number;
  totalAnswers: number;
  completedNodes: number;
  vocabStats: {
    mastered: number;
    learning: number;
    notLearned: number;
  };
  weeklyActivity: boolean[];
  heatmap: Record<string, number>;
  quizTrend: { date: string; score: number }[];
  todayQuizCount: number;
};

const screenWidth = Dimensions.get('window').width;

const BADGES_DEF = [
  { id: 'streak_3', title: 'Khởi động', desc: 'Học 3 ngày liên tục', icon: Flame, color: '#FF9500', condition: (d: ProfileData) => d.streakDays >= 3 },
  { id: 'streak_7', title: 'Trùm Chăm Chỉ', desc: 'Học 7 ngày liên tục', icon: Flame, color: '#FF3B30', condition: (d: ProfileData) => d.streakDays >= 7 },
  { id: 'xp_1000', title: 'Tân Binh', desc: 'Đạt 1,000 XP', icon: Star, color: '#FFD02C', condition: (d: ProfileData) => d.totalXP >= 1000 },
  { id: 'xp_5000', title: 'Học Giả', desc: 'Đạt 5,000 XP', icon: Crown, color: '#AF52DE', condition: (d: ProfileData) => d.totalXP >= 5000 },
  { id: 'acc_80', title: 'Bách Phát', desc: 'Độ chính xác > 80%', icon: Target, color: '#4CD964', condition: (d: ProfileData) => d.averageAccuracy >= 80 && d.totalAnswers > 50 },
  { id: 'vocab_100', title: 'Từ Điển Sống', desc: 'Thuộc 100 từ vựng', icon: Layers, color: '#34C759', condition: (d: ProfileData) => (d.vocabStats?.mastered || 0) >= 100 },
  { id: 'master', title: 'Bậc Thầy', desc: '10k XP & Chuỗi 14', icon: Trophy, color: '#FFCC00', condition: (d: ProfileData) => d.totalXP >= 10000 && d.streakDays >= 14 },
];

export type AvatarDef = {
  id: string;
  name: string;
  image: any;
  minLevel?: number;
  badgeId?: string;
  isDefault?: boolean;
};

export const AVATARS: AvatarDef[] = [
  { id: 'shark_magic', name: 'Shark Phép Thuật', image: require('../../assets/avatar/sharkMagic.png'), isDefault: true },
  { id: 'shark_sakura', name: 'Shark Sakura', image: require('../../assets/avatar/shark_sakura.png'), isDefault: true },
  { id: 'shark_tuyet', name: 'Shark Tuyết', image: require('../../assets/avatar/shark_tuyết.png'), isDefault: true },
  { id: 'shark_rb', name: 'Shark Rainbow', image: require('../../assets/avatar/shark_rb.png'), isDefault: true },
  { id: 'shark_1', name: 'Shark Cấp 3', image: require('../../assets/avatar/shark_1.png'), minLevel: 3 },
  { id: 'shark_2', name: 'Shark Cấp 5', image: require('../../assets/avatar/shark_2.png'), minLevel: 5 },
  { id: 'shark_gia', name: 'Shark Lão Gia', image: require('../../assets/avatar/shark_gia.png'), minLevel: 8 },
  { id: 'shark_hary', name: 'Shark Hary', image: require('../../assets/avatar/shark_hary.png'), minLevel: 12 },
  { id: 'shark_hime', name: 'Shark Hime', image: require('../../assets/avatar/shark_hime.png'), minLevel: 15 },
  { id: 'shark_kara', name: 'Shark Kara', image: require('../../assets/avatar/shark_kara.png'), minLevel: 18 },
  { id: 'shark_kim', name: 'Shark Kim', image: require('../../assets/avatar/shark_kim.png'), minLevel: 22 },
  { id: 'shark_kimono', name: 'Shark Kimono', image: require('../../assets/avatar/shark_kimono.png'), minLevel: 25 },
  { id: 'shark_sexy', name: 'Shark Sexy', image: require('../../assets/avatar/shark_sexy.png'), minLevel: 28 },
  { id: 'shark_spider', name: 'Shark Spider', image: require('../../assets/avatar/shark_spider.png'), minLevel: 32 },
  { id: 'shark_spm', name: 'Shark SPM', image: require('../../assets/avatar/shark_spm.png'), minLevel: 35 },
  { id: 'shark_tt', name: 'Shark Tối Thượng', image: require('../../assets/avatar/shark_tt.png'), minLevel: 40 },
  { id: 'shark_tapsu', name: 'Shark Tập Sự', image: require('../../assets/avatar/shark_tapsu.png'), badgeId: 'streak_3' },
  { id: 'shark_cay', name: 'Shark Cày', image: require('../../assets/avatar/shark_cay.png'), badgeId: 'streak_7' },
  { id: 'shark_totnghiep', name: 'Shark Tốt Nghiệp', image: require('../../assets/avatar/shark_totnghiep.png'), badgeId: 'xp_1000' },
  { id: 'shark_ninja', name: 'Shark Ninja', image: require('../../assets/avatar/shark_ninja.png'), badgeId: 'xp_5000' },
  { id: 'shark_doc', name: 'Shark Học Giả', image: require('../../assets/avatar/shark_doc.png'), badgeId: 'acc_80' },
  { id: 'shark_game', name: 'Shark Game', image: require('../../assets/avatar/shark_game.png'), badgeId: 'vocab_100' },
  { id: 'shark_tuongquan', name: 'Shark Tướng Quân', image: require('../../assets/avatar/shark_tuongquan.png'), badgeId: 'master' },
];

function getPersona(xp: number, accuracy: number) {
  if (xp > 20000 && accuracy >= 85) return { title: 'Huyền Thoại', sub: 'Học bá ngôn ngữ', color: '#FFD02C' };
  if (accuracy >= 85) return { title: 'Chiến Thần', sub: 'Phong độ cực ổn định', color: '#4CD964' };
  if (xp > 10000) return { title: 'Mãnh Tướng', sub: 'Sắp thành công rồi!', color: '#FF9500' };
  if (accuracy > 0 && accuracy < 50) return { title: 'Tập Sự', sub: 'Cố lên nào!', color: '#FF3B30' };
  return { title: 'Tân Binh', sub: 'Tăng tốc nào', color: '#3B7A66' };
}

async function fetchProfileData(userId: number): Promise<ProfileData> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/profile/${userId}/analytics`);
    if (!response.ok) throw new Error(`Lỗi API: ${response.status}`);
    const payload = await response.json();
    return {
      username: payload.username || 'Học viên',
      email: payload.email || 'demo@japanese.local',
      avatar_id: payload.avatar_id || 'shark_magic',
      totalXP: Number(payload.totalXP ?? 0),
      averageAccuracy: Number(payload.averageAccuracy ?? 0),
      streakDays: Number(payload.streakDays ?? 0),
      totalAnswers: Number(payload.totalAnswers ?? 0),
      completedNodes: Number(payload.completedNodes ?? 0),
      vocabStats: payload.vocabStats ?? payload.vocab_stats ?? { mastered: 0, learning: 0, notLearned: 0 },
      weeklyActivity: payload.weeklyActivity ?? payload.weekly_activity ?? [false, false, false, false, false, false, false],
      heatmap: payload.heatmap ?? payload.heatMap ?? {},
      quizTrend: payload.quizTrend ?? payload.quiz_trend ?? [],
      todayQuizCount: Number(payload.todayQuizCount ?? 0),
    };
  } catch (error) {
    return {
      username: 'Học viên',
      email: 'demo@japanese.local',
      avatar_id: 'shark_magic',
      totalXP: 0,
      averageAccuracy: 0,
      streakDays: 0,
      totalAnswers: 0,
      completedNodes: 0,
      vocabStats: { mastered: 0, learning: 0, notLearned: 0 },
      weeklyActivity: [false, false, false, false, false, false, false],
      heatmap: {},
      quizTrend: [],
      todayQuizCount: 0,
    };
  }
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, logout, updateUser } = useAuthContext();
  const { colors, theme } = useTheme();
  const { showAlert } = useGlobalUI();
  const isDark = theme === 'dark';
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [tempAvatarId, setTempAvatarId] = useState('shark_magic');
  const [isSaving, setIsSaving] = useState(false);

  const handleLogout = () => {
    showAlert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng không?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout }
    ], 'warning');
  };

  const levelInfo = useMemo(() => calculateLevelInfo(profileData?.totalXP ?? 0), [profileData?.totalXP]);

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
    scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100, backgroundColor: colors.background },
    profileCard: {
      borderRadius: 28, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: isDark ? '#1E293B' : '#FFFFFF',
      ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20 }, android: { elevation: 2 } }),
    },
    username: { fontSize: 24, fontWeight: '900', color: colors.text, marginBottom: 4, letterSpacing: -0.5 },
    emailText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
    xpRemainingText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginTop: 12, textAlign: 'center' },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 16, letterSpacing: -0.3 },
    cardBackground: { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#F8FAFC' }
  }), [colors, isDark]);

  const loadProfileData = useCallback(async () => {
    if (!user?.id) { setProfileData(null); setIsReady(true); return; }
    try {
      const data = await fetchProfileData(Number(user.id));
      setProfileData(data);
      setTempUsername(data.username);
      setTempAvatarId(data.avatar_id || 'shark_magic');
    } catch (error) {
      console.warn(error);
    } finally {
      setIsReady(true);
    }
  }, [user?.id]);

  useFocusEffect(React.useCallback(() => { loadProfileData(); }, [loadProfileData]));

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    if (!tempUsername.trim()) {
      Alert.alert('Lỗi', 'Tên hiển thị không được để trống.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/profile/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: tempUsername, avatar_id: tempAvatarId }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Cập nhật thất bại');
      }
      // Update local state and global AuthContext state
      setProfileData(prev => prev ? { ...prev, username: tempUsername, avatar_id: tempAvatarId } : null);
      if (updateUser) {
        updateUser({ username: tempUsername, avatar_id: tempAvatarId });
      }
      setIsSettingsVisible(false);
      showAlert('Thành công', 'Đã cập nhật hồ sơ.', [], 'success');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const todayActivityCount = useMemo(() => {
    return Number(profileData?.heatmap?.[formatLocalDate(new Date())] ?? 0);
  }, [profileData?.heatmap]);

  const [claimedQuests, setClaimedQuests] = useState<Record<string, boolean>>({});
  const [selectedDateInfo, setSelectedDateInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!profileData || !user?.id) return;

    const checkAndRewardQuest = async (questId: string, condition: boolean, title: string, xpReward: number) => {
      const todayStr = formatLocalDate(new Date());
      const key = `QuestReward_${user.id}_${questId}_${todayStr}`;

      try {
        const hasClaimed = await AsyncStorage.getItem(key);
        if (hasClaimed) {
          setClaimedQuests(prev => {
            if (prev[questId]) return prev;
            return { ...prev, [questId]: true };
          });
          return;
        }

        if (!condition) return;

        await AsyncStorage.setItem(key, 'true');
        const response = await fetch(`${BACKEND_URL}/api/progress/${user.id}/add-xp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: xpReward }),
        });
        if (response.ok) {
          showAlert('Nhiệm vụ hoàn thành!', `Bạn nhận được +${xpReward} XP từ nhiệm vụ: ${title}`, [], 'success');
          setProfileData(prev => prev ? { ...prev, totalXP: prev.totalXP + xpReward } : null);
        }
        setClaimedQuests(prev => ({ ...prev, [questId]: true }));
      } catch (e) {
        console.warn('Lỗi kiểm tra phần thưởng nhiệm vụ', e);
      }
    };

    checkAndRewardQuest('quest_3_lessons', todayActivityCount >= 3, 'Hoàn thành 3 bài học', 5);
    checkAndRewardQuest('quest_5_lessons', todayActivityCount >= 5, 'Hoàn thành 5 bài học', 10);
    checkAndRewardQuest('quest_streak', profileData.streakDays >= 1 && todayActivityCount > 0, 'Duy trì chuỗi học tập', 10);

    const loadShareStatus = async () => {
      const todayStr = formatLocalDate(new Date());
      const key = `QuestReward_${user.id}_quest_share_${todayStr}`;
      const hasClaimed = await AsyncStorage.getItem(key);
      if (hasClaimed) {
        setClaimedQuests(prev => ({ ...prev, quest_share: true }));
      }
    };
    loadShareStatus();

  }, [profileData?.streakDays, todayActivityCount, user?.id]);

  const handleShareApp = async () => {
    try {
      const result = await Share.share({
        message: 'Cùng học bộ thẻ từ vựng siêu thú vị với Shark Magic nhé! Tải ứng dụng ngay hôm nay!',
      });
      if (result.action === Share.sharedAction) {
        if (!claimedQuests['quest_share'] && user?.id) {
          const todayStr = formatLocalDate(new Date());
          const key = `QuestReward_${user.id}_quest_share_${todayStr}`;
          await AsyncStorage.setItem(key, 'true');
          const response = await fetch(`${BACKEND_URL}/api/progress/${user.id}/add-xp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 10 }),
          });
          if (response.ok) {
            showAlert('Nhiệm vụ hoàn thành!', `Bạn nhận được +10 XP từ nhiệm vụ: Chia sẻ bộ thẻ cho bạn bè`, [], 'success');
            setProfileData(prev => prev ? { ...prev, totalXP: prev.totalXP + 10 } : null);
          }
          setClaimedQuests(prev => ({ ...prev, quest_share: true }));
        }
      }
    } catch (error: any) {
      console.error(error.message);
    }
  };

  const currentAvatar = useMemo(() => {
    const aid = profileData?.avatar_id || 'shark_magic';
    return AVATARS.find(a => a.id === aid)?.image || AVATARS[0].image;
  }, [profileData?.avatar_id]);

  const sortedBadges = useMemo(() => {
    if (!profileData) return BADGES_DEF;
    const unlocked = BADGES_DEF.filter(b => b.condition(profileData));
    const locked = BADGES_DEF.filter(b => !b.condition(profileData));
    return [...unlocked, ...locked];
  }, [profileData]);

  return (
    <ScreenContainer>
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#1E293B' : '#F1F5F9', backgroundColor: colors.background, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text, letterSpacing: -0.5 }}>Hồ sơ</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity onPress={() => setIsSettingsVisible(true)} style={{ padding: 10, backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderRadius: 14 }}><Settings size={20} color={colors.textSecondary} /></TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={{ padding: 10, backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderRadius: 14 }}><LogOut size={20} color={colors.primary} /></TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={dynamicStyles.scrollContent} bounces={false}>
        {!isReady ? (
          <View style={dynamicStyles.loaderContainer}><SharkLoader size="small" message="" /></View>
        ) : (
          <>
            {/* THẺ TÀI KHOẢN CAO CẤP */}
            <LinearGradient
              colors={isDark ? ['#1E293B', '#0F172A'] : ['#FFFFFF', '#F8FAFC']}
              style={[dynamicStyles.profileCard, { padding: 24, paddingBottom: 28 }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                <View style={{ position: 'relative' }}>
                  <View style={{ width: 88, height: 88, borderRadius: 30, backgroundColor: isDark ? '#334155' : '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: themePrimaryColor, overflow: 'hidden' }}>
                    <Image source={currentAvatar} style={{ width: '75%', height: '75%', resizeMode: 'contain' }} />
                  </View>
                  <View style={{ position: 'absolute', bottom: -8, alignSelf: 'center', backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 2, borderColor: isDark ? '#0F172A' : '#FFFFFF' }}>
                    <Text style={{ fontSize: 11, fontWeight: '900', color: '#FFF' }}>Lv.{levelInfo.level}</Text>
                  </View>
                </View>
                <View style={{ marginLeft: 20, flex: 1 }}>
                  <Text style={[dynamicStyles.username, { fontSize: 26, letterSpacing: -0.8 }]} numberOfLines={1}>{profileData?.username ?? 'Học viên'}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Mail size={14} color={colors.textSecondary} />
                    <Text style={[dynamicStyles.emailText, { marginLeft: 6 }]} numberOfLines={1}>{profileData?.email ?? 'demo@japanese.local'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: isDark ? 'rgba(59, 122, 102, 0.2)' : '#E9FBF5', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                    <Sparkles size={12} color={themePrimaryColor} />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: themePrimaryColor, marginLeft: 4 }}>{profileData?.totalXP ?? 0} XP</Text>
                  </View>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary }}>Tiến trình cấp {levelInfo.level + 1}</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: themePrimaryColor }}>{levelInfo.xpToNextLevel} XP nữa</Text>
              </View>
              <Progress.Bar progress={levelInfo.progress} height={14} color={themePrimaryColor} unfilledColor={isDark ? '#334155' : '#E2E8F0'} borderWidth={0} borderRadius={10} width={null} style={{ width: '100%' }} />
            </LinearGradient>

            {/* THỐNG KÊ NHANH */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 }}>
              <LinearGradient
                colors={isDark ? ['#3F2007', '#1F1104'] : ['#FFF3E0', '#FFEDD5']}
                style={{ flex: 1, borderRadius: 24, padding: 16, marginRight: 8, borderWidth: 1, borderColor: isDark ? '#7C2D12' : '#FED7AA', ...Platform.select({ ios: { shadowColor: '#EA580C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 }, android: { elevation: 2 } }) }}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: isDark ? 'rgba(234, 88, 12, 0.2)' : '#FFDED1', justifyContent: 'center', alignItems: 'center' }}>
                    <Flame size={24} color="#F97316" />
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: isDark ? '#FFEDD5' : '#9A3412' }}>{profileData?.streakDays ?? 0}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#FDBA74' : '#C2410C' }}>Ngày Chuỗi</Text>
                  </View>
                </View>
              </LinearGradient>

              <LinearGradient
                colors={isDark ? ['#0C2538', '#071520'] : ['#E0F2FE', '#BAE6FD']}
                style={{ flex: 1, borderRadius: 24, padding: 16, marginLeft: 8, borderWidth: 1, borderColor: isDark ? '#0284C7' : '#7DD3FC', ...Platform.select({ ios: { shadowColor: '#0284C7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 }, android: { elevation: 2 } }) }}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: isDark ? 'rgba(2, 132, 199, 0.2)' : '#D0E9FA', justifyContent: 'center', alignItems: 'center' }}>
                    <CheckCircle2 size={24} color="#0EA5E9" />
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: isDark ? '#E0F2FE' : '#075985' }}>{profileData?.completedNodes ?? 0}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: isDark ? '#7DD3FC' : '#0369A1' }}>Hoàn thành</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* HỆ THỐNG HUY HIỆU */}
            <Text style={dynamicStyles.sectionTitle}>Huy hiệu & Thành tựu</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesScrollContent}>
              {sortedBadges.map((badge) => {
                const isUnlocked = badge.condition(profileData || {} as ProfileData);
                const IconComponent = badge.icon;
                return (
                  <View key={badge.id} style={[styles.badgeCard, dynamicStyles.cardBackground, { opacity: isUnlocked ? 1 : 0.6 }]}>
                    <View style={[styles.badgeIconWrapper, { backgroundColor: isUnlocked ? badge.color + '1A' : (isDark ? '#334155' : '#F1F5F9') }]}>
                      {isUnlocked ? (
                        <IconComponent size={28} color={badge.color} fill={badge.id.includes('xp') || badge.id.includes('streak') ? badge.color : 'none'} />
                      ) : (
                        <Lock size={24} color={colors.textSecondary} />
                      )}
                    </View>
                    <Text style={[styles.badgeTitle, { color: colors.text }]} numberOfLines={1}>{badge.title}</Text>
                    <Text style={[styles.badgeDesc, { color: colors.textSecondary }]} numberOfLines={2}>{badge.desc}</Text>
                  </View>
                );
              })}
            </ScrollView>

            {/* NHIỆM VỤ HÀNG NGÀY */}
            <Text style={[dynamicStyles.sectionTitle, { marginTop: 10 }]}>Nhiệm vụ Hàng ngày</Text>
            <View style={{ backgroundColor: colors.card, borderRadius: 28, padding: 20, marginBottom: 30, borderWidth: 1, borderColor: isDark ? '#1E293B' : '#F8FAFC', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 12 }, android: { elevation: 2 } }) }}>

              {/* Quest 1: 3 Bài học */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                <View style={{ width: 50, height: 50, borderRadius: 18, backgroundColor: claimedQuests['quest_3_lessons'] ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5') : (isDark ? '#334155' : '#F1F5F9'), justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                  <Sparkles size={24} color={claimedQuests['quest_3_lessons'] ? "#10B981" : colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>Hoàn thành 3 bài học</Text>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: claimedQuests['quest_3_lessons'] ? "#10B981" : colors.textSecondary }}>{Math.min(todayActivityCount, 3)}<Text style={{ fontSize: 12, color: colors.textSecondary }}>/3</Text></Text>
                  </View>
                  <Progress.Bar progress={Math.min(todayActivityCount / 3, 1)} height={10} color="#F59E0B" unfilledColor={isDark ? '#334155' : '#E2E8F0'} borderWidth={0} borderRadius={6} width={null} style={{ width: '100%' }} />
                  {claimedQuests['quest_3_lessons'] && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 8 }}>
                      <CheckCircle2 size={14} color="#10B981" />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: "#10B981", marginLeft: 4 }}>Hoàn thành (+5 XP)</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Quest 2: 5 Bài học */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                <View style={{ width: 50, height: 50, borderRadius: 18, backgroundColor: claimedQuests['quest_5_lessons'] ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5') : (isDark ? '#334155' : '#F1F5F9'), justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                  <Target size={24} color={claimedQuests['quest_5_lessons'] ? "#10B981" : colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>Hoàn thành 5 bài học</Text>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: claimedQuests['quest_5_lessons'] ? "#10B981" : colors.textSecondary }}>{Math.min(todayActivityCount, 5)}<Text style={{ fontSize: 12, color: colors.textSecondary }}>/5</Text></Text>
                  </View>
                  <Progress.Bar progress={Math.min(todayActivityCount / 5, 1)} height={10} color="#10B981" unfilledColor={isDark ? '#334155' : '#E2E8F0'} borderWidth={0} borderRadius={6} width={null} style={{ width: '100%' }} />
                  {claimedQuests['quest_5_lessons'] && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 8 }}>
                      <CheckCircle2 size={14} color="#10B981" />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: "#10B981", marginLeft: 4 }}>Hoàn thành (+10 XP)</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Quest 3: Duy trì chuỗi */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                <View style={{ width: 50, height: 50, borderRadius: 18, backgroundColor: claimedQuests['quest_streak'] ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5') : (isDark ? '#334155' : '#F1F5F9'), justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                  <Flame size={24} color={claimedQuests['quest_streak'] ? "#10B981" : colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>Duy trì chuỗi học tập</Text>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: claimedQuests['quest_streak'] ? "#10B981" : colors.textSecondary }}>{todayActivityCount > 0 ? 1 : 0}<Text style={{ fontSize: 12, color: colors.textSecondary }}>/1</Text></Text>
                  </View>
                  <Progress.Bar progress={todayActivityCount > 0 ? 1 : 0} height={10} color="#EF4444" unfilledColor={isDark ? '#334155' : '#E2E8F0'} borderWidth={0} borderRadius={6} width={null} style={{ width: '100%' }} />
                  {claimedQuests['quest_streak'] && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 8 }}>
                      <CheckCircle2 size={14} color="#10B981" />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: "#10B981", marginLeft: 4 }}>Hoàn thành (+10 XP)</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Quest 4: Share */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 50, height: 50, borderRadius: 18, backgroundColor: claimedQuests['quest_share'] ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5') : (isDark ? '#334155' : '#F1F5F9'), justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                  <Share2 size={24} color={claimedQuests['quest_share'] ? "#10B981" : colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: colors.text }}>Chia sẻ bộ thẻ cho bạn bè</Text>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: claimedQuests['quest_share'] ? "#10B981" : colors.textSecondary }}>{claimedQuests['quest_share'] ? 1 : 0}<Text style={{ fontSize: 12, color: colors.textSecondary }}>/1</Text></Text>
                  </View>
                  <Progress.Bar progress={claimedQuests['quest_share'] ? 1 : 0} height={10} color="#10B981" unfilledColor={isDark ? '#334155' : '#E2E8F0'} borderWidth={0} borderRadius={6} width={null} style={{ width: '100%' }} />
                  {claimedQuests['quest_share'] ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 8 }}>
                      <CheckCircle2 size={14} color="#10B981" />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: "#10B981", marginLeft: 4 }}>Hoàn thành (+10 XP)</Text>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={handleShareApp} style={{ backgroundColor: themePrimaryColor, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, alignSelf: 'flex-start', marginTop: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFF' }}>Chia sẻ ngay</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

            </View>

            {/* NHẬT KÝ HOẠT ĐỘNG */}
            <Text style={dynamicStyles.sectionTitle}>Nhật kí hoạt động</Text>
            <View style={{ backgroundColor: colors.card, borderRadius: 28, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: isDark ? '#1E293B' : '#F8FAFC', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 10 }, android: { elevation: 2 } }) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Calendar size={18} color={themePrimaryColor} style={{ marginRight: 8 }} />
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}></Text>
                </View>
                {selectedDateInfo && (
                  <Text style={{ fontSize: 12, fontWeight: '700', color: themePrimaryColor, backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#E9FBF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' }}>
                    {selectedDateInfo}
                  </Text>
                )}
              </View>
              <View style={styles.monthGrid}>
                {monthActivityCells.map((cell) => {
                  const [yyyy, mm, dd] = cell.key.split('-');
                  const dayStr = `${dd}/${mm}/${yyyy}`;
                  return (
                    <TouchableOpacity
                      key={cell.key}
                      style={{ width: '14.28%', aspectRatio: 1, padding: 3 }}
                      onPress={() => setSelectedDateInfo(`${dayStr}: ${cell.count > 0 ? `Hoàn thành ${cell.count} bài học` : 'Nghỉ ngơi'}`)}
                    >
                      <View style={[
                        { width: '100%', height: '100%', borderRadius: 6 },
                        {
                          backgroundColor: cell.count ? themePrimaryColor : (isDark ? '#1E293B' : '#F1F5F9'),
                          opacity: cell.count ? (0.4 + Math.min(cell.count * 0.15, 0.6)) : 1,
                        }
                      ]} />
                    </TouchableOpacity>
                  )
                })}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: isDark ? '#1E293B' : '#F1F5F9' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: isDark ? '#1E293B' : '#F1F5F9', marginRight: 6 }} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>Nghỉ ngơi</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: themePrimaryColor, opacity: 0.8, marginRight: 6 }} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>Đang học</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Settings Modal */}
      <Modal visible={isSettingsVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, maxHeight: '90%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: colors.text }}>Chỉnh sửa hồ sơ</Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                  style={{ backgroundColor: themePrimaryColor, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 }}
                >
                  {isSaving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>Lưu</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setIsSettingsVisible(false)} style={{ padding: 8, backgroundColor: isDark ? '#334155' : '#F1F5F9', borderRadius: 16 }}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, marginTop: 10 }}>Tên hiển thị</Text>
              <TextInput
                value={tempUsername}
                onChangeText={setTempUsername}
                style={{ backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderWidth: 1, borderColor: isDark ? '#334155' : '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: colors.text, fontWeight: '600', marginBottom: 24 }}
                placeholder="Nhập tên của bạn"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: 12 }}>Chọn Avatar (Theo cấp độ & thành tựu)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 30 }}>
                {AVATARS.map((avatar) => {
                  let isLocked = false;
                  let lockReason = '';
                  let lockDisplay = '';

                  if (avatar.minLevel) {
                    if (levelInfo.level < avatar.minLevel) {
                      isLocked = true;
                      lockReason = `Avatar này yêu cầu Cấp độ ${avatar.minLevel} trở lên. Hãy học thêm để thăng cấp nhé!`;
                      lockDisplay = `Lv.${avatar.minLevel}`;
                    }
                  } else if (avatar.badgeId) {
                    const badge = BADGES_DEF.find(b => b.id === avatar.badgeId);
                    if (badge) {
                      const unlocked = badge.condition(profileData || {} as ProfileData);
                      if (!unlocked) {
                        isLocked = true;
                        lockReason = `Avatar này yêu cầu đạt danh hiệu "${badge.title}". Hãy cố gắng nhé!`;
                        lockDisplay = `Huy hiệu`;
                      }
                    }
                  }

                  const isSelected = tempAvatarId === avatar.id;
                  return (
                    <TouchableOpacity
                      key={avatar.id}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (isLocked) {
                          Alert.alert('Chưa mở khóa', lockReason);
                        } else {
                          setTempAvatarId(avatar.id);
                        }
                      }}
                      style={[
                        {
                          width: (screenWidth - 48 - 16 * 2) / 3, // 3 cols
                          aspectRatio: 1,
                          borderRadius: 20,
                          borderWidth: 2,
                          borderColor: isSelected ? themePrimaryColor : (isDark ? '#334155' : '#E2E8F0'),
                          backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                          justifyContent: 'center',
                          alignItems: 'center',
                          opacity: isLocked ? 0.6 : 1,
                          position: 'relative',
                          overflow: 'hidden', // Để hình không bị tràn ra ngoài viền
                        },
                        isSelected && Platform.select({
                          ios: { shadowColor: themePrimaryColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
                          android: { elevation: 4 }
                        })
                      ]}
                    >
                      <Image source={avatar.image} style={{ width: '75%', height: '75%', resizeMode: 'contain', opacity: isLocked ? 0.3 : 1 }} />
                      {isLocked && (
                        <View style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', padding: 4, borderRadius: 10 }}>
                          <Lock size={12} color="#FFFFFF" />
                        </View>
                      )}
                      {isLocked && lockDisplay && (
                        <Text style={{ position: 'absolute', bottom: 6, fontSize: 9, fontWeight: '900', color: colors.textSecondary, backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 4, borderRadius: 4 }}>{lockDisplay}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer >
  );
}

const styles = StyleSheet.create({
  profileRow: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 18 },
  avatarContainer: {
    width: 80, height: 80, borderRadius: 28, padding: 10,
    justifyContent: 'center', alignItems: 'center',
    position: 'relative', borderWidth: 1,
    overflow: 'visible',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 3 }
    })
  },
  mascotAvatarImg: { width: '75%', height: '75%', resizeMode: 'contain' },
  profileInfo: { flex: 1 },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  levelBadgeMini: {
    position: 'absolute', bottom: -8, right: -8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 2, zIndex: 10
  },
  levelBadgeText: { fontSize: 9, fontWeight: '900', color: '#000000' },
  levelSection: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, width: '100%' },
  levelRowDetail: { flexDirection: 'row', alignItems: 'center' },
  levelLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  levelMainLabel: { fontSize: 16, fontWeight: '900', letterSpacing: -0.2 },
  xpChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  xpText: { fontWeight: '900', fontSize: 13 },

  badgesScrollContent: { gap: 16, paddingBottom: 24, paddingHorizontal: 4 },
  badgeCard: {
    width: 130, padding: 16, borderRadius: 24, borderWidth: 1, alignItems: 'center',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 10 }, android: { elevation: 2 } }),
  },
  badgeIconWrapper: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  badgeTitle: { fontSize: 14, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  badgeDesc: { fontSize: 11, fontWeight: '600', textAlign: 'center', lineHeight: 16 },

  // Removed old vocab chart styles

  calendarCard: {
    borderRadius: 28, padding: 20, borderWidth: 1, marginBottom: 24,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 10 }, android: { elevation: 2 } }),
  },
  calendarHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
  monthCellWrapper: { width: 36, alignItems: 'center', marginBottom: 10 },
  monthCell: { width: 32, height: 32, borderRadius: 8 },
  activityLegendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 16 },
  activityLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activityLegendDot: { width: 14, height: 14, borderRadius: 5 },
  activityLegendText: { fontSize: 13, fontWeight: '700' },
});