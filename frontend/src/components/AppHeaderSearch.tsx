import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View, Platform, Alert } from 'react-native';
import { Bell, Camera, Mic, Moon, Sun, Search, LogOut } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuthContext } from '../context/AuthContext';
import { useGlobalUI } from '../context/GlobalUIContext';
import { calculateLevelInfo } from '../utils/level';

type AppHeaderSearchProps = {
  displayName: string;
  mascotSource: any;
  searchText: string;
  onChangeSearchText: (text: string) => void;
  onSubmitSearch: () => void;
  userXp?: number; // Nhận điểm kinh nghiệm từ file cha để gán vào hàm tính Level giống Profile
  greetingText?: string;
  placeholder?: string;
  notificationCount?: number;
  onNotificationPress?: () => void;
};

export default function AppHeaderSearch({
  displayName,
  mascotSource,
  searchText,
  onChangeSearchText,
  onSubmitSearch,
  userXp,
  greetingText = 'Xin chào 👋🏻',
  placeholder = 'Tìm kiếm từ vựng...',
  notificationCount,
  onNotificationPress,
}: AppHeaderSearchProps) {
  const { theme, colors, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const { logout, totalXp } = useAuthContext();
  const { showAlert } = useGlobalUI();

  const handleLogout = () => {
    showAlert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng không?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: logout }
    ], 'warning');
  };

  // ✅ ĐỒNG BỘ 100% VỚI PROFILE: Sử dụng chính xác hàm trung tâm để tính toán cấp độ hiện tại
  const levelInfo = useMemo(() => calculateLevelInfo(userXp !== undefined ? userXp : totalXp), [userXp, totalXp]);

  const dynamicStyles = {
    container: {
      marginTop: 15,
    },
    topRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
    },
    profileRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      flex: 1,
    },
    avatarCard: {
      width: 64, // Đồng bộ kích thước khung Avatar 64x64 như Profile
      height: 64,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: isDark ? '#1E293B' : '#EEF2F1',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      position: 'relative' as const,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4 },
        android: { elevation: 1 }
      })
    },
    avatar: {
      width: 48, // Đồng bộ ảnh linh vật bên trong đạt tỉ lệ 48 như Profile
      height: 48,
    },
    // 🛠️ ĐỒNG BỘ STYLE HUY HIỆU CAPSULE LEVEL VỚI PROFILE 100%
    levelBadgeMini: {
      position: 'absolute' as const,
      bottom: -6,
      right: -10,
      backgroundColor: '#FFD02C',
      borderColor: colors.card,
      borderWidth: 1.5,
      paddingHorizontal: 5,
      paddingVertical: 1.5,
      borderRadius: 8,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      zIndex: 10,
    },
    levelBadgeText: {
      fontSize: 8.5,
      fontWeight: '900' as const,
      color: '#000000',
    },
    profileText: {
      marginLeft: 16,
    },
    greetingText: {
      fontSize: 12,
      fontWeight: '700' as const,
      color: colors.textSecondary,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.8,
    },
    userName: {
      marginTop: 4,
      fontSize: 20,
      fontWeight: '800' as const,
      color: colors.text,
      lineHeight: 30,
    },
    actionRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginLeft: 12,
    },
    iconButton: {
      width: 35,
      height: 35,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginLeft: 10,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 10,
      elevation: 2,
    },
    notificationBadge: {
      position: 'absolute' as const,
      top: 6,
      right: 6,
      minWidth: 12,
      height: 12,
      borderRadius: 9,
      backgroundColor: '#EF4444',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 4,
    },
    notificationBadgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '800' as const,
    },
    searchCard: {
      marginTop: 24,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.card,
      borderRadius: 24,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 10,
      elevation: 2,
    },
    searchInput: {
      flex: 1,
      marginHorizontal: 14,
      fontSize: 15,
      fontWeight: '500' as const,
      color: colors.text,
    },
    searchActions: {
      flexDirection: 'row' as const,
    },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 14,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginLeft: 8,
    },
  };

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.topRow}>
        <View style={dynamicStyles.profileRow}>
          <View style={dynamicStyles.avatarCard}>
            <Image source={mascotSource} style={dynamicStyles.avatar} resizeMode="contain" />

            {/* Hiển thị chuẩn xác nhãn viên nang phẳng của Level nhận từ hàm trung tâm */}
            <View style={dynamicStyles.levelBadgeMini}>
              <Text style={dynamicStyles.levelBadgeText}>Lv.{levelInfo.level}</Text>
            </View>
          </View>
          <View style={dynamicStyles.profileText}>
            <Text style={dynamicStyles.greetingText}>{greetingText}</Text>
            <Text style={dynamicStyles.userName}>{displayName}</Text>
          </View>
        </View>

        <View style={dynamicStyles.actionRow}>
          <TouchableOpacity
            style={dynamicStyles.iconButton}
            activeOpacity={0.8}
            onPress={toggleTheme}
          >
            {theme === 'light' ? (
              <Moon size={20} color={colors.primary} />
            ) : (
              <Sun size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={dynamicStyles.iconButton}
            activeOpacity={0.8}
            onPress={onNotificationPress}
          >
            <Bell size={20} color={colors.primary} />
            {typeof notificationCount === 'number' && notificationCount > 0 ? (
              <View style={dynamicStyles.notificationBadge}>
                <Text style={dynamicStyles.notificationBadgeText}>{notificationCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity
            style={dynamicStyles.iconButton}
            activeOpacity={0.8}
            onPress={handleLogout}
          >
            <LogOut size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={dynamicStyles.searchCard}>
        <Search size={18} color={colors.textSecondary} />
        <TextInput
          style={dynamicStyles.searchInput}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={searchText}
          onChangeText={onChangeSearchText}
          onSubmitEditing={onSubmitSearch}
          returnKeyType="search"
        />
        <View style={dynamicStyles.searchActions}>
          <TouchableOpacity style={dynamicStyles.iconCircle} activeOpacity={0.8}>
            {/* <Camera size={18} color={colors.textSecondary} /> */}
          </TouchableOpacity>
          <TouchableOpacity style={dynamicStyles.iconCircle} activeOpacity={0.8}>
            {/* <Mic size={18} color={colors.textSecondary} /> */}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 32,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCard: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF2F1',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
  },
  profileText: {
    marginLeft: 16,
  },
  greetingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8BA39D',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  userName: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '800',
    color: '#061C18',
    lineHeight: 30,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8F1EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  searchCard: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E9EFED',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 14,
    fontSize: 15,
    fontWeight: '500',
    color: '#0E513D',
  },
  searchActions: {
    flexDirection: 'row',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});