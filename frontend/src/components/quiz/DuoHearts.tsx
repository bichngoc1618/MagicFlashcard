import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withSpring, withDelay, runOnJS } from 'react-native-reanimated';
import { Heart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuthContext } from '../../context/AuthContext';

const HeartItem = ({ index, globalHearts }: { index: number; globalHearts: number }) => {
  const isAlive = index < globalHearts;
  
  // use a ref to track previous state
  const prevAlive = React.useRef(isAlive);
  const scale = useSharedValue(1);
  const shard1X = useSharedValue(0);
  const shard1Y = useSharedValue(0);
  const shard2X = useSharedValue(0);
  const shard2Y = useSharedValue(0);
  const shard3X = useSharedValue(0);
  const shard3Y = useSharedValue(0);
  const shard4X = useSharedValue(0);
  const shard4Y = useSharedValue(0);
  const shardOpacity = useSharedValue(0);
  const shardScale = useSharedValue(1);
  const [localAlive, setLocalAlive] = useState(isAlive);
  const [shattered, setShattered] = useState(false);

  const shardStyle = (x: Animated.SharedValue<number>, y: Animated.SharedValue<number>) =>
    useAnimatedStyle(() => ({
      opacity: shardOpacity.value,
      transform: [
        { translateX: x.value },
        { translateY: y.value },
        { scale: shardScale.value },
      ],
    }));

  const shard1Style = shardStyle(shard1X, shard1Y);
  const shard2Style = shardStyle(shard2X, shard2Y);
  const shard3Style = shardStyle(shard3X, shard3Y);
  const shard4Style = shardStyle(shard4X, shard4Y);

  React.useEffect(() => {
    if (prevAlive.current === true && isAlive === false) {
      setShattered(true);
      shardOpacity.value = withTiming(1, { duration: 10 });
      shardScale.value = 1;
      shard1X.value = withTiming(-16, { duration: 250 });
      shard1Y.value = withTiming(-18, { duration: 250 });
      shard2X.value = withTiming(16, { duration: 250 });
      shard2Y.value = withTiming(-18, { duration: 250 });
      shard3X.value = withTiming(-12, { duration: 250 });
      shard3Y.value = withTiming(18, { duration: 250 });
      shard4X.value = withTiming(12, { duration: 250 });
      shard4Y.value = withTiming(18, { duration: 250 });

      scale.value = withSequence(
        withTiming(0, { duration: 200 }, () => {
          runOnJS(setLocalAlive)(false);
          runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Error);
        }),
        withSpring(1, { damping: 12 }, () => {
          shardOpacity.value = withDelay(100, withTiming(0, { duration: 150 }));
          runOnJS(() => {
            setTimeout(() => setShattered(false), 400);
          })();
        })
      );
    } else if (prevAlive.current === false && isAlive === true) {
      setLocalAlive(true);
      scale.value = withSequence(
        withTiming(0, { duration: 100 }),
        withSpring(1, { damping: 12 })
      );
    } else {
      setLocalAlive(isAlive);
    }
    prevAlive.current = isAlive;
  }, [isAlive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.heart, animatedStyle]}>
      <Heart size={24} color={localAlive ? "#FF4B4B" : "#CBD5E1"} fill={localAlive ? "#FF4B4B" : "none"} />
      {shattered && (
        <>
          <Animated.View style={[styles.shard, shard1Style]}>
            <Heart size={10} color="#FF4B4B" fill="#FF4B4B" />
          </Animated.View>
          <Animated.View style={[styles.shard, shard2Style]}>
            <Heart size={10} color="#FF4B4B" fill="#FF4B4B" />
          </Animated.View>
          <Animated.View style={[styles.shard, shard3Style]}>
            <Heart size={10} color="#FF4B4B" fill="#FF4B4B" />
          </Animated.View>
          <Animated.View style={[styles.shard, shard4Style]}>
            <Heart size={10} color="#FF4B4B" fill="#FF4B4B" />
          </Animated.View>
        </>
      )}
    </Animated.View>
  );
};

type DuoHeartsProps = {
  hearts?: number;
};

export default function DuoHearts({ hearts }: DuoHeartsProps) {
  const { globalHearts } = useAuthContext();
  const displayHearts = hearts !== undefined ? hearts : globalHearts;
  console.log('💓 DuoHearts rendering with globalHearts:', displayHearts);

  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: 5 }).map((_, i) => (
        <HeartItem key={i} index={i} globalHearts={displayHearts} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
  },
  heart: {
    // Individual heart styling is handled by the animated view.
  },
});
