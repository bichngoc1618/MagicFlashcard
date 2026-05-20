import React, { createContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { login as loginApi, register as registerApi, updateGamificationStats, refillHearts, getUserStats, deductHearts } from '../api/api';

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
  refillHeartsWithXp: (hearts?: number, cost?: number) => Promise<void>;
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
  
const deductHeartOnFailure = async (): Promise<number> => {
  if (!user) return globalHearts;
  
  console.log('⚡ [AuthContext] Tiến trình trừ tim an toàn lên server cho userId:', user.id);
  try {
    // 1. Gọi API thực tế gửi lên database của backend
    const res = await deductHearts(user.id, 1, 'quiz_failure');
    console.log('⚡ [AuthContext] Server phản hồi dữ liệu trừ mạng:', res);
    
    // bóc tách dữ liệu từ server (snake_case hoặc camelCase)
    let backendHearts = res?.global_hearts !== undefined ? res.global_hearts : res?.globalHearts;
    if (res?.data && res.data.global_hearts !== undefined) backendHearts = res.data.global_hearts;
    if (res?.data && res.data.globalHearts !== undefined) backendHearts = res.data.globalHearts;

    if (backendHearts !== undefined && backendHearts !== null) {
       const newHearts = Number(backendHearts);
       // 🛡️ BÍ QUYẾT: KHÔNG dùng setGlobalHearts(newHearts) ở đây để chặn đứng lệnh back app!
       return newHearts; 
    } else {
       return Math.max(globalHearts - 1, 0);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('No hearts remaining')) {
      console.warn('⚡ [AuthContext] Không thể trừ tim vì đã hết tim. Trả về 0 tim.');
      return 0;
    }
    console.error('⚡ [AuthContext] Lỗi trừ mạng không phải do hết tim, dùng fallback cục bộ:', e);
    return Math.max(globalHearts - 1, 0);
  }
};

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

  // 🛡️ LÁ CHẮN 2: CHỈ CHẠY loadUserData KHI USER ID THAY ĐỔI THỰC TẾ (Đăng nhập/Đăng xuất), 
  // Loại bỏ hoàn toàn streakCount khỏi mảng dependency để triệt tiêu vòng lặp re-render vô tận.
  useEffect(() => {
    if (user?.id) {
      loadUserData();
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

  const refillHeartsWithXp = async (hearts = 1, cost = 200) => {
    if (!user || totalXp < cost) return;

    try {
      console.log('⚡ [AuthContext] Refilling hearts. UserId:', user.id, 'Hearts:', hearts, 'Cost:', cost);
      const res = await refillHearts(user.id, hearts, cost);
      
      const newHearts = res?.globalHearts ?? Math.min((globalHearts || 0) + hearts, 5);
      
      setTotalXp((prev) => prev - cost);
      setGlobalHearts(newHearts);
    } catch (e) {
      console.error('Failed to refill hearts in DB:', e);
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