import React, { createContext, useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';


import { login as loginApi, register as registerApi, updateGamificationStats, refillHearts, getUserStats, deductHearts, getNotifications } from '../api/api';

export type UserProfile = {
  id: number;
  username: string;
  email: string;
  totalXp?: number;
  streakCount?: number;
  lastStudyDate?: string;
  globalHearts?: number;
};

type StreakTriggerResult = {
  isFirstTimeToday: boolean;
  currentStreak: number;
};

type AuthContextValue = {
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (username: string, email: string, password: string) => Promise<UserProfile>;
  logout: () => void;
  isLoggedIn: boolean;
  totalXp: number;
  streakCount: number;
  lastStudyDate: string;
  globalHearts: number;
  setGlobalHearts?: (val: number) => void;
  updateXpAndStreakInDB: (earnedXp: number) => Promise<void>;
  refillHeartsWithXp: (hearts?: number, cost?: number) => Promise<number | undefined>;
  refreshUserStats: () => Promise<void>;
  refreshNotificationCount: () => Promise<void>;
  notificationCount: number;
  handleHeartLoss: () => void;
  deductHeartOnFailure: () => Promise<number>;
  checkAndTriggerDailyStreak: (userId: number) => Promise<StreakTriggerResult>;
  purchaseHeartWithXP: () => Promise<void>;
  topUpCount: number;
  topUpDate: string;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<UserProfile | null>(null);

  // Gamification states
  const [totalXp, setTotalXp] = useState<number>(0);
  const [streakCount, setStreakCount] = useState<number>(0);
  const [lastStudyDate, setLastStudyDate] = useState<string>('');
  const [globalHearts, setGlobalHearts] = useState<number>(5);
  // Export setGlobalHearts to allow external updates (e.g. from QuizScreen)
  const setGlobalHeartsPublic = (val: number) => setGlobalHearts(val);
  
  // Track daily top-up count to limit purchases (max 3 per day)
  const [topUpCount, setTopUpCount] = useState<number>(0);
  const [topUpDate, setTopUpDate] = useState<string>('');
  const [notificationCount, setNotificationCount] = useState<number>(0);

  const setGamificationState = (profile: any) => {
    console.log('🎮 Setting gamification state:', { 
      total_xp: profile.total_xp,
      streak_count: profile.streak_count,
      last_study_date: profile.last_study_date,
      global_hearts: profile.global_hearts 
    });
    setTotalXp(profile.total_xp || 0);
    setStreakCount(profile.streak_count || 0);
    setLastStudyDate(profile.last_study_date || '');
    setGlobalHearts(profile.global_hearts ?? 5);
  };

  const parseHeartResponse = (response: any): number | undefined => {
    let hearts = response?.global_hearts ?? response?.globalHearts;
    if (response?.data) {
      hearts = response.data.global_hearts ?? response.data.globalHearts ?? hearts;
    }
    return hearts !== undefined && hearts !== null ? Number(hearts) : undefined;
  };

  const login = async (email: string, password: string) => {
    const result = await loginApi(email, password);
    const profile: UserProfile = {
      id: result.userId,
      username: result.username,
      email: result.email,
    };
    setUser(profile);
    setGamificationState(result);
    return profile;
  };

  const register = async (username: string, email: string, password: string) => {
    const result = await registerApi(username, email, password);
    const profile: UserProfile = {
      id: result.userId,
      username: result.username,
      email: result.email,
    };
    setUser(profile);
    setTotalXp(0);
    setStreakCount(0);
    setLastStudyDate('');
    setGlobalHearts(5);
    return profile;
  };

  const logout = () => {
    setUser(null);
    setTotalXp(0);
    setStreakCount(0);
    setLastStudyDate('');
    setGlobalHearts(5);
  };

  const handleHeartLoss = () => {
    setGlobalHearts(prev => Math.max(prev - 1, 0));
  };
  
const deductHeartOnFailure = useCallback(async (): Promise<number> => {
  try {
    if (!user?.id) {
      return globalHearts;
    }

    const res = await deductHearts(user.id, 1, 'quiz_failure');

    console.log('API RESPONSE:', res);

    if (!res) {
      return Math.max(globalHearts - 1, 0);
    }

    const backendHearts = parseHeartResponse(res);

    if (typeof backendHearts !== 'number') {
      return Math.max(globalHearts - 1, 0);
    }

    setGlobalHeartsPublic(backendHearts);

    return backendHearts;
  } catch (err) {
    console.error('DEDUCT ERROR:', err);

    return Math.max(globalHearts - 1, 0);
  }
},  [user, globalHearts]);

  const purchaseHeartWithXP = async () => {
    if (!user || totalXp < 200) {
      Alert.alert('Thông báo', 'Bạn không đủ 200 XP để đổi mạng!');
      return;
    }
    setTotalXp((prev) => prev - 200);
    setGlobalHearts((prev) => Math.min(prev + 1, 5));
  };

  // DATABASE TRANSACTION WORKERS
  const getLocalDateString = (date: Date | string) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-CA');
  };

  const restoreHeartsForNewDay = async (userId: number, currentDate: string, currentHearts: number) => {
    if (currentHearts >= 5) return;
    try {
      await refillHearts(userId, 5, 0);
      setGlobalHearts(5);
    } catch (e) {
      console.warn('Failed to restore hearts for new day:', e);
      setGlobalHearts(5);
    }
  };

  // Load user stats and apply daily recovery only for hearts, without changing study date.
  const loadUserData = async () => {
    if (!user) return;
    try {
      const stats = await getUserStats(user.id);
      console.log('📊 User stats loaded:', stats);
      const dbLastDateRaw = stats.last_study_date || null;
      const currentDate = getLocalDateString(new Date());
      const dbLastDate = dbLastDateRaw ? getLocalDateString(dbLastDateRaw) : null;

      if (dbLastDate && dbLastDate < currentDate) {
        console.log('🌅 New day detected - restoring hearts for new day');
        await restoreHeartsForNewDay(user.id, currentDate, stats.global_hearts ?? 0);
      } else {
        console.log('❤️ Loading hearts from DB:', stats.global_hearts);
        setGlobalHearts(stats.global_hearts ?? 5);
      }

      setLastStudyDate(dbLastDateRaw || '');
    } catch (e) {
      console.warn('Failed to load user stats for heart reset:', e);
    }
  };

  const refreshUserStats = async () => {
    if (!user) return;
    try {
      const stats = await getUserStats(user.id);
      console.log('📊 Refreshed user stats:', stats);
      setGamificationState(stats);
    } catch (e) {
      console.warn('Failed to refresh user stats:', e);
    }
  };

  const refreshNotificationCount = async () => {
    if (!user?.id) {
      setNotificationCount(0);
      return;
    }
    try {
      const result = await getNotifications(user.id);
      setNotificationCount(Array.isArray(result.notifications) ? result.notifications.filter((item: any) => item.is_read === 0).length : 0);
    } catch (e) {
      console.warn('Failed to refresh notification count:', e);
    }
  };

  // 🛡️ LÁ CHẮN 2: CHỈ CHẠY loadUserData KHI USER ID THAY ĐỔI THỰC TẾ (Đăng nhập/Đăng xuất), 
  // Loại bỏ hoàn toàn streakCount khỏi mảng dependency để triệt tiêu vòng lặp re-render vô tận.
  useEffect(() => {
    if (user?.id) {
      loadUserData();
      refreshNotificationCount();
    }
  }, [user?.id]); 

  const updateXpAndStreakInDB = async (earnedXp: number) => {
    if (!user) return;

    const today = new Date();
    const currentDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    
    let newStreakCount = streakCount;
    let newLastStudyDate = currentDate;

    if (currentDate === lastStudyDate) {
      // Maintain streak_count
    } else {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = new Date(yesterday.getTime() - (yesterday.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

      if (lastStudyDate === yesterdayStr) {
        newStreakCount += 1;
      } else {
        newStreakCount = 1;
      }
    }

    setTotalXp((prev) => prev + earnedXp);
    setStreakCount(newStreakCount);
    setLastStudyDate(newLastStudyDate);

    try {
      const response = await updateGamificationStats({
        userId: user.id,
        earnedXp,
        newStreakCount,
        newLastStudyDate,
      });
      if (response?.total_xp !== undefined) {
        setTotalXp(Number(response.total_xp));
      }
      if (response?.global_hearts !== undefined) {
        setGlobalHearts(Number(response.global_hearts));
      }
    } catch (e) {
      console.error('Failed to sync XP and streak to DB:', e);
    }
  };

  const checkAndTriggerDailyStreak = async (userId: number): Promise<StreakTriggerResult> => {
    let currentStreak = 0;
    let isFirstTimeToday = false;

    try {
      const stats = await getUserStats(userId);
      const lastStudyDateValue = stats.last_study_date || null;
      const storedStreakCount = Number(stats.streak_count ?? 0);
      const todayDate = getLocalDateString(new Date());

      if (lastStudyDateValue === todayDate) {
        currentStreak = storedStreakCount;
        return { isFirstTimeToday: false, currentStreak };
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDate = getLocalDateString(yesterday);

      if (lastStudyDateValue === yesterdayDate) {
        currentStreak = storedStreakCount + 1;
      } else {
        currentStreak = 1;
      }

      const response = await updateGamificationStats({
        userId,
        earnedXp: 0,
        newStreakCount: currentStreak,
        newLastStudyDate: todayDate,
      });

      if (user?.id === userId) {
        setStreakCount(currentStreak);
        setLastStudyDate(todayDate);
        if (response?.total_xp !== undefined) {
          setTotalXp(Number(response.total_xp));
        }
        if (response?.global_hearts !== undefined) {
          setGlobalHearts(Number(response.global_hearts));
        }
      }

      isFirstTimeToday = true;
    } catch (error) {
      console.error('checkAndTriggerDailyStreak failed:', error);
      currentStreak = Math.max(currentStreak, 0);
    }

    return { isFirstTimeToday, currentStreak };
  };

  const refillHeartsWithXp = async (hearts = 1, cost = 200): Promise<number | undefined> => {
    if (!user || totalXp < cost) return undefined;

    try {
      console.log('⚡ [AuthContext] Refilling hearts. UserId:', user.id, 'Hearts:', hearts, 'Cost:', cost);
      const res = await refillHearts(user.id, hearts, cost);

      const newHearts = parseHeartResponse(res) ?? Math.min((globalHearts || 0) + hearts, 5);
      setTotalXp((prev) => prev - cost);
      setGlobalHearts(newHearts);
      return newHearts;
    } catch (e) {
      console.error('Failed to refill hearts in DB:', e);
      return undefined;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isLoggedIn: !!user,
        totalXp,
        streakCount,
        lastStudyDate,
        globalHearts,
        setGlobalHearts: setGlobalHeartsPublic,
        updateXpAndStreakInDB,
        refillHeartsWithXp,
        refreshUserStats,
        refreshNotificationCount,
        notificationCount,
        purchaseHeartWithXP,
        topUpCount,
        topUpDate,
        handleHeartLoss,
        deductHeartOnFailure,
        checkAndTriggerDailyStreak, // ✨ Đã bổ sung chính xác vào đây để làm sạch lỗi biên dịch
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextValue => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};