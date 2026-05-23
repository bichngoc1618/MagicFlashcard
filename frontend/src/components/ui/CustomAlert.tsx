import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Image, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export interface CustomAlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: CustomAlertButton[];
  onDismiss?: () => void;
  type?: 'success' | 'error' | 'warning' | 'info';
}

export default function CustomAlert({
  visible,
  title,
  message,
  buttons = [],
  onDismiss,
  type = 'info'
}: CustomAlertProps) {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  // Default button if none provided
  const activeButtons = buttons.length > 0 ? buttons : [{ text: 'OK', onPress: onDismiss }];

  const getImageSource = () => {
    switch (type) {
      case 'error': return require('../../../assets/sharkCry.png');
      case 'success': return require('../../../assets/sharkMagic.png');
      case 'warning': return require('../../../assets/sharkCry.png');
      case 'info':
      default: return require('../../../assets/sharkMagic.png');
    }
  };

  const getButtonColor = (btnStyle?: 'default' | 'cancel' | 'destructive') => {
    if (btnStyle === 'destructive') return colors.danger || '#EF4444';
    if (btnStyle === 'cancel') return isDark ? '#334155' : '#94A3B8';
    return isDark ? '#2A5C4D' : '#3B7A66'; // primary
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#E2EBE8' }]}>
          <Image source={getImageSource()} style={styles.image} />
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {message ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{message}</Text>
          ) : null}
          
          <View style={styles.buttonContainer}>
            {activeButtons.map((btn, index) => {
              const btnColor = getButtonColor(btn.style);
              return (
                <View key={index} style={[styles.btn3DWrapper, activeButtons.length > 1 && { flex: 1, marginHorizontal: 4 }]}>
                  <View style={[styles.btn3DBase, { backgroundColor: btn.style === 'destructive' ? '#991B1B' : (btn.style === 'cancel' ? (isDark ? '#1E293B' : '#CBD5E1') : (isDark ? '#193D32' : '#275245')) }]} />
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.btnPrimary, { backgroundColor: btnColor }]}
                    onPress={() => {
                      if (btn.onPress) btn.onPress();
                      if (onDismiss) onDismiss();
                    }}
                  >
                    <Text style={styles.btnTextPrimary}>{btn.text}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 32,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 32 },
      android: { elevation: 12 },
    }),
  },
  image: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  btn3DWrapper: {
    height: 52,
    width: '100%',
    position: 'relative',
    marginTop: 8,
  },
  btn3DBase: {
    position: 'absolute',
    top: 4,
    left: 0,
    right: 0,
    bottom: -4,
    borderRadius: 16,
  },
  btnPrimary: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  btnTextPrimary: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
