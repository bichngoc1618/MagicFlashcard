import React from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Bell, Camera, Mic, Moon, Sun, Search } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

type AppHeaderSearchProps = {
  displayName: string;
  mascotSource: any;
  searchText: string;
  onChangeSearchText: (text: string) => void;
  onSubmitSearch: () => void;
  greetingText?: string;
  placeholder?: string;
};

export default function AppHeaderSearch({
  displayName,
  mascotSource,
  searchText,
  onChangeSearchText,
  onSubmitSearch,
  greetingText = 'Xin chào 👋🏻',
  placeholder = 'Tìm kiếm từ vựng...',
}: AppHeaderSearchProps) {
  const { theme, colors, toggleTheme } = useTheme();

  const dynamicStyles = {
    container: {
      marginTop: 32,
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
      width: 56,
      height: 56,
      borderRadius: 22,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 10,
      elevation: 2,
    },
    avatar: {
      width: 40,
      height: 40,
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
      fontSize: 24,
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
      width: 42,
      height: 42,
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
    searchCard: {
      marginTop: 24,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.card,
      borderRadius: 24,
      paddingHorizontal: 18,
      paddingVertical: 14,
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
          <TouchableOpacity style={dynamicStyles.iconButton} activeOpacity={0.8}>
            <Bell size={20} color={colors.primary} />
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
            <Camera size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={dynamicStyles.iconCircle} activeOpacity={0.8}>
            <Mic size={18} color={colors.textSecondary} />
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
    width: 56,
    height: 56,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF2F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  avatar: {
    width: 40,
    height: 40,
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
