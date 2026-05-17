import React from 'react';
import { Modal, View, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

type ExitConfirmModalProps = {
  visible: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
};

export default function ExitConfirmModal({
  visible,
  title = 'Thoát khỏi bài học?',
  message = 'Tiến độ của bạn sẽ được lưu lại. Bạn có chắc muốn thoát không?',
  confirmText = 'Thoát',
  cancelText = 'Tiếp tục học',
  onConfirm,
  onCancel,
  isDangerous = false,
}: ExitConfirmModalProps) {
  const { colors } = useTheme();

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center'
    },
    modal: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 24,
      width: Dimensions.get('window').width - 40,
      alignItems: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: '900',
      color: colors.text,
      marginTop: 16,
      textAlign: 'center',
    },
    message: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 12,
      textAlign: 'center',
      lineHeight: 20,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 16,
      backgroundColor: colors.border,
      alignItems: 'center',
    },
    confirmButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 16,
      backgroundColor: isDangerous ? '#EF4444' : colors.primary,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.text,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    confirmText: {
      fontSize: 14,
      fontWeight: '800',
      color: 'white',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    }
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={dynamicStyles.container}>
        <View style={dynamicStyles.modal}>
          <AlertCircle size={48} color={isDangerous ? '#EF4444' : '#F59E0B'} />
          
          <Text style={dynamicStyles.title}>
            {title}
          </Text>

          <Text style={dynamicStyles.message}>
            {message}
          </Text>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' }}>
            <TouchableOpacity
              onPress={onCancel}
              style={dynamicStyles.cancelButton}
            >
              <Text style={dynamicStyles.cancelText}>
                {cancelText}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              style={dynamicStyles.confirmButton}
            >
              <Text style={dynamicStyles.confirmText}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
