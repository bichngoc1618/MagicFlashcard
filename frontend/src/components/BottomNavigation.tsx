import React, { useEffect, useRef } from 'react';
import {
  Text,
  TouchableWithoutFeedback,
  View,
  StyleSheet,
  Animated,
  Platform
} from 'react-native';
import { Home, BookOpenText, Library, Mic2, UserRound } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../context/ThemeContext';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

type BottomTabKey = 'home' | 'study' | 'library' | 'SpeakingPractice' | 'profile';

type Props = {
  activeTab: BottomTabKey;
};

function AnimatedTab({
  icon,
  label,
  active,
  onPress,
  colors,
  themePrimaryColor
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onPress?: () => void;
  colors: any;
  themePrimaryColor: string;
}) {
  // Đồng bộ hiệu ứng mờ mịn màng tinh tế thay vì phóng to thu nhỏ cơ học thô cứng
  const fadeAnim = useRef(new Animated.Value(active ? 1 : 0.45)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: active ? 1 : 0.45,
      duration: 200,
      useNativeDriver: true
    }).start();
  }, [active]);

  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <Animated.View
        style={[
          styles.tabBtn,
          {
            opacity: fadeAnim
          }
        ]}
      >
        <View style={styles.iconContainer}>
          {icon}
        </View>
        <Text
          style={[
            styles.label,
            active ? styles.labelActive : styles.labelInactive,
            { color: active ? themePrimaryColor : colors.textSecondary }
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}



export default function BottomNavigation(props: any) {
  const { state, navigation: tabNavigation, activeTab } = props;
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  const globalNavigation = useNavigation<any>();

  const activeRouteName = state ? state.routes[state.index].name :
    activeTab === 'study' ? 'Study' :
      activeTab === 'profile' ? 'Profile' :
        activeTab === 'home' ? 'Home' :
          activeTab === 'SpeakingPractice' ? 'SpeakingPractice' : '';

  const handleNavigate = (screenName: string, params?: any) => {
    if (tabNavigation) {
      tabNavigation.navigate(screenName, params);
    } else {
      globalNavigation.navigate('MainTabs', { screen: screenName, params });
    }
  };

  // Ép đồng bộ bộ màu sắc tố đậm lục bảo thống nhất của hệ thống
  const themePrimaryColor = isDark ? '#2A5C4D' : '#3B7A66';

  const dynamicStyles = StyleSheet.create({
    wrapper: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingBottom: Platform.OS === 'ios' ? 24 : 12,
      paddingHorizontal: 16,
      backgroundColor: 'transparent',
      zIndex: 9999
    },
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 24, // Đồng bộ bán kính bo cong 24 với các thẻ bài học
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderWidth: 1,
      borderColor: isDark ? '#1E293B' : '#fdfdfdff',
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOpacity: isDark ? 0.25 : 0.03, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
        android: { elevation: 4 },
      }),
    }
  });

  return (
    <View style={dynamicStyles.wrapper}>
      <View style={dynamicStyles.container}>
        <AnimatedTab
          label="Trang chủ"
          icon={<Home size={18} color={activeRouteName === 'Home' ? themePrimaryColor : colors.textSecondary} />}
          active={activeRouteName === 'Home'}
          onPress={() => handleNavigate('Home')}
          colors={colors}
          themePrimaryColor={themePrimaryColor}
        />

        <AnimatedTab
          label="Hành trình"
          icon={<BookOpenText size={18} color={activeRouteName === 'StudyJourney' ? themePrimaryColor : colors.textSecondary} />}
          active={activeRouteName === 'StudyJourney'}
          onPress={() => handleNavigate('StudyJourney', { materialId: null })}
          colors={colors}
          themePrimaryColor={themePrimaryColor}
        />

        <AnimatedTab
          label="Luyện nói"
          icon={<Mic2 size={18} color={activeRouteName === 'SpeakingPractice' ? themePrimaryColor : colors.textSecondary} />}
          active={activeRouteName === 'SpeakingPractice'}
          onPress={() => handleNavigate('SpeakingPractice')}
          colors={colors}
          themePrimaryColor={themePrimaryColor}
        />

        <AnimatedTab
          label="Thư viện"
          icon={<Library size={18} color={activeRouteName === 'Study' ? themePrimaryColor : colors.textSecondary} />}
          active={activeRouteName === 'Study'}
          onPress={() => handleNavigate('Study')}
          colors={colors}
          themePrimaryColor={themePrimaryColor}
        />

        <AnimatedTab
          label="Cá nhân"
          icon={<UserRound size={18} color={activeRouteName === 'Profile' ? themePrimaryColor : colors.textSecondary} />}
          active={activeRouteName === 'Profile'}
          onPress={() => handleNavigate('Profile')}
          colors={colors}
          themePrimaryColor={themePrimaryColor}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconContainer: {
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    marginTop: 5,
    fontSize: 10,
    letterSpacing: -0.1,
    textAlign: 'center',
  },
  labelActive: {
    fontWeight: '900',
  },
  labelInactive: {
    fontWeight: '700',
  }
});