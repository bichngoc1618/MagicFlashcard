import React from 'react';
import { View, Image, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface SharkLoaderProps {
  message?: string;
  size?: 'small' | 'large';
  fullscreen?: boolean;
}

export default function SharkLoader({ message = 'Đang tải...', size = 'large', fullscreen = false }: SharkLoaderProps) {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const imageSize = size === 'large' ? 100 : 50;
  const containerStyle = fullscreen ? [styles.fullscreen, { backgroundColor: colors.background }] : styles.inline;

  return (
    <View style={containerStyle}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Image 
          source={require('../../../assets/sharkMagic.png')} 
          style={{ width: imageSize, height: imageSize, opacity: 0.9 }} 
          resizeMode="contain"
        />
      </Animated.View>
      {message ? (
        <Text style={[styles.text, { color: colors.textSecondary, fontSize: size === 'large' ? 15 : 13, marginTop: size === 'large' ? 16 : 8 }]}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inline: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: '600',
  }
});
