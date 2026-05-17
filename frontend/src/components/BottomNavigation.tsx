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

type BottomTabKey = 'home' | 'study' | 'library' | 'SpeakingPractice' | 'profile';

type Props = {
  activeTab: BottomTabKey;
};

function AnimatedTab({
  icon,
  label,
  active,
  onPress,
  colors
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onPress?: () => void;
  colors: any;
}) {
  const scale = useRef(new Animated.Value(active ? 1.1 : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: active ? 1.1 : 1,
      useNativeDriver: true,
      friction: 8
    }).start();
  }, [active]);

  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <Animated.View
        style={[
          styles.tabBtn,
          {
            transform: [{ scale }]
          }
        ]}
      >
        <View style={{ opacity: active ? 1 : 0.5 }}>
          {icon}
        </View>
        <Text style={[styles.label, active && styles.labelActive, { color: active ? colors.primary : colors.textSecondary }]}>
          {label}
        </Text>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

export default function BottomNavigation({ activeTab }: Props) {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { colors, theme } = useTheme();

  const dynamicStyles = StyleSheet.create({
    wrapper: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingBottom: Platform.OS === 'ios' ? 25 : 12,
      paddingHorizontal: 12,
      backgroundColor: 'transparent',
      zIndex: 9999
    },
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 30,
      paddingVertical: 10,
      paddingHorizontal: 10,
      shadowColor: '#000',
      shadowOpacity: theme === 'dark' ? 0.3 : 0.1,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 10,
      borderWidth: 1,
      borderColor: colors.border
    }
  });

  return (
    <View style={dynamicStyles.wrapper}>
      <View style={dynamicStyles.container}>
        <AnimatedTab
          label="Trang chủ"
          icon={<Home size={18} color={activeTab === 'home' ? colors.primary : colors.textSecondary} />}
          active={activeTab === 'home'}
          onPress={() => navigation.navigate('Home')}
          colors={colors}
        />

        <AnimatedTab
          label="Hành trình"
          icon={<BookOpenText size={18} color={activeTab === 'study' ? colors.primary : colors.textSecondary} />}
          active={activeTab === 'study'}
          onPress={() => navigation.navigate('StudyJourney', { materialId: 1 })}
          colors={colors}
        />

        <AnimatedTab
          label="Luyện nói"
          icon={<Mic2 size={18} color={activeTab === 'SpeakingPractice' ? colors.primary : colors.textSecondary} />}
          active={activeTab === 'SpeakingPractice'}
          onPress={() => navigation.navigate('SpeakingPractice')}
          colors={colors}
        />

        <AnimatedTab
          label="Thư viện"
          icon={<Library size={18} color={activeTab === 'library' ? colors.primary : colors.textSecondary} />}
          active={activeTab === 'library'}
          onPress={() => navigation.navigate('Study')}
          colors={colors}
        />

        <AnimatedTab
          label="Cá nhân"
          icon={<UserRound size={18} color={activeTab === 'profile' ? colors.primary : colors.textSecondary} />}
          active={activeTab === 'profile'}
          onPress={() => navigation.navigate('Profile')}
          colors={colors}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBtn: {
    flex: 1,
    alignItems: 'center'
  },
  label: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: '500'
  },
  labelActive: {
    fontWeight: '700'
  }
});