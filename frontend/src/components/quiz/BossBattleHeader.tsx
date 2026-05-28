import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AVATARS } from '../../screens/ProfileScreen';
import { useTheme } from '../../context/ThemeContext';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  withRepeat,
  cancelAnimation
} from 'react-native-reanimated';
import { useAuthContext } from '../../context/AuthContext';

interface BossBattleHeaderProps {
  energyPosition: number; // 0 to 100
  bossName?: string;
  isTakingDamage?: boolean; // User wrong
  isHealing?: boolean; // User correct
  remainingSeconds: number;
  hearts: number;
}

export default function BossBattleHeader({
  energyPosition,
  bossName = 'Mega Boss',
  isTakingDamage = false,
  isHealing = false,
  remainingSeconds,
  hearts,
}: BossBattleHeaderProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user } = useAuthContext();

  const userAvatarImage = user?.avatar_id
    ? AVATARS.find(a => a.id === user.avatar_id)?.image || AVATARS[0].image
    : AVATARS[0].image;

  const playerShake = useSharedValue(0);
  const bossShake = useSharedValue(0);
  const energyAnim = useSharedValue(50);
  const timerScale = useSharedValue(1);

  useEffect(() => {
    // Animate energy bar smoothly
    energyAnim.value = withSpring(energyPosition, { damping: 15, stiffness: 90 });
  }, [energyPosition]);

  useEffect(() => {
    if (isTakingDamage) {
      // User is wrong, Player Avatar shakes
      playerShake.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [isTakingDamage]);

  useEffect(() => {
    if (isHealing) {
      // User is correct, Boss Avatar shakes
      bossShake.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [isHealing]);

  useEffect(() => {
    if (remainingSeconds <= 5 && remainingSeconds > 0) {
      timerScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 150 }),
          withTiming(1, { duration: 300 })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(timerScale);
      timerScale.value = withTiming(1);
    }
  }, [remainingSeconds]);

  const playerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: playerShake.value }]
  }));

  const bossAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: bossShake.value }]
  }));

  const energyStyle = useAnimatedStyle(() => ({
    width: `${energyAnim.value}%`
  }));

  const timerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: timerScale.value }]
  }));

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1E1E2E' : '#2D2D3A' }]}>

      {/* Player Corner */}
      <Animated.View style={[styles.avatarContainer, playerAnimatedStyle]}>
        <Image
          source={userAvatarImage}
          style={styles.avatarImage}
        />
        <Text style={styles.nameText} numberOfLines={1}>{user?.display_name || user?.username || 'Bạn'}</Text>
        <View style={styles.heartsContainer}>
          <Ionicons name="heart" size={14} color="#F43F5E" style={{ marginRight: 2 }} />
          <Text style={styles.heartText}>{hearts}</Text>
        </View>
      </Animated.View>

      {/* Center Tug-of-war Energy Bar */}
      <View style={styles.centerContainer}>
        {/* Timer floating above the bar */}
        <Animated.View style={[
          styles.timerCircle,
          remainingSeconds <= 5 && { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.2)' },
          timerAnimatedStyle
        ]}>
          <Text style={[styles.timerText, remainingSeconds <= 5 && { color: '#EF4444' }]}>
            {remainingSeconds}
          </Text>
        </Animated.View>

        {/* Energy Bar Track */}
        <View style={styles.energyTrack}>
          {/* Boss Side (Red) - Background */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#EF4444' }]} />

          {/* Player Side (Green) - Foreground */}
          <Animated.View style={[styles.energyFill, { backgroundColor: '#10B981' }, energyStyle]} />

          {/* Vạch phân chia 50% mờ mờ để biết mốc */}
          <View style={styles.middleMarker} />
        </View>
      </View>

      {/* Boss Corner */}
      <Animated.View style={[styles.avatarContainer, bossAnimatedStyle]}>
        <Image
          source={require('../../../assets/evil_boss.png')}
          style={styles.avatarImage}
        />
        <Text style={styles.nameText} numberOfLines={1}>{bossName}</Text>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 45 : 15,
    paddingBottom: 12,
    borderBottomWidth: 3,
    borderBottomColor: '#FF4B4B',
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 90,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFF',
    marginBottom: 4,
  },
  nameText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 2,
  },
  heartsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  heartText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    position: 'relative',
  },
  timerCircle: {
    position: 'absolute',
    top: -20,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#334155',
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  timerText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
  },
  energyTrack: {
    width: '100%',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    position: 'relative',
    marginTop: 12,
  },
  energyFill: {
    height: '100%',
    borderRightWidth: 2,
    borderRightColor: '#FFF',
  },
  middleMarker: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
    transform: [{ translateX: -1 }],
  }
});
