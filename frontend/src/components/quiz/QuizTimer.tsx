import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

type QuizTimerProps = {
  duration: number;
  isActive: boolean;
  onExpire: () => void;
  resetKey?: string;
  label?: string;
};

export default function QuizTimer({ duration, isActive, onExpire, resetKey, label = 'Th?i gian' }: QuizTimerProps) {
  const [remaining, setRemaining] = useState(duration);
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
    setRemaining(duration);
  }, [duration, resetKey]);

  useEffect(() => {
    if (!isActive || remaining <= 0) return;

    const interval = setInterval(() => {
      setRemaining((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, remaining]);

  useEffect(() => {
    if (!isActive || remaining > 0 || expiredRef.current) return;
    expiredRef.current = true;
    onExpire();
  }, [isActive, remaining, onExpire]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.time}>{formatted}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B4B4B',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  time: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1F1F1F',
  },
});
