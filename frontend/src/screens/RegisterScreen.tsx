import React, { useContext, useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, Image, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { User, Mail, Lock, UserPlus, ArrowLeft } from 'lucide-react-native';

export default function RegisterScreen({ navigation }: any) {
  const { register } = useContext(AuthContext);
  const { colors } = useTheme();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const mascotSource = require('../../assets/sharkMagic.png');

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ username, email và mật khẩu.');
      return;
    }

    try {
      setIsLoading(true);
      await register(username.trim(), email.trim(), password);
    } catch (error: any) {
      Alert.alert('Đăng ký thất bại', error.message || 'Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: colors.background 
    },
    backButton: {
      width: 45,
      height: 45,
      borderRadius: 15,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 20
    },
    mascotCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 15,
      borderWidth: 2,
      borderColor: colors.border
    },
    title: { 
      fontSize: 30, 
      fontWeight: '900', 
      color: colors.text, 
      letterSpacing: -1 
    },
    subTitle: { 
      textAlign: 'center', 
      color: colors.textSecondary, 
      marginTop: 10, 
      lineHeight: 20, 
      paddingHorizontal: 15 
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      height: 60,
      borderRadius: 18,
      paddingHorizontal: 18,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.02,
      shadowRadius: 5,
    },
    input: { 
      flex: 1, 
      fontSize: 16, 
      color: colors.text, 
      fontWeight: '500' 
    },
    registerBtn: { 
      backgroundColor: colors.primary, 
      height: 60, 
      borderRadius: 18, 
      justifyContent: 'center', 
      alignItems: 'center', 
      marginTop: 10,
      elevation: 4,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
    },
    hasAccountText: { 
      color: colors.textSecondary, 
      fontSize: 15 
    },
    loginLink: { 
      color: colors.primary, 
      fontWeight: 'bold', 
      fontSize: 15, 
      textDecorationLine: 'underline' 
    }
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Nút quay lại */}
          <TouchableOpacity 
            style={dynamicStyles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color={colors.primary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={dynamicStyles.mascotCircle}>
              <Image source={mascotSource} style={styles.mascot} />
            </View>
            <Text style={dynamicStyles.title}>Gia nhập biệt đội</Text>
            <Text style={dynamicStyles.subTitle}>Tạo tài khoản để Same-kun đồng hành cùng bạn học tiếng Nhật nhé!</Text>
          </View>

          <View style={styles.form}>
            {/* Input Tên người dùng */}
            <View style={dynamicStyles.inputWrapper}>
              <User size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput 
                placeholder="Tên người dùng" 
                style={dynamicStyles.input} 
                value={username} 
                onChangeText={setUsername} 
                autoCapitalize="none" 
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Input Email */}
            <View style={dynamicStyles.inputWrapper}>
              <Mail size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput 
                placeholder="Email" 
                style={dynamicStyles.input} 
                value={email} 
                onChangeText={setEmail} 
                autoCapitalize="none" 
                keyboardType="email-address" 
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Input Mật khẩu */}
            <View style={dynamicStyles.inputWrapper}>
              <Lock size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput 
                placeholder="Mật khẩu" 
                style={dynamicStyles.input} 
                secureTextEntry 
                value={password} 
                onChangeText={setPassword} 
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <TouchableOpacity 
              style={[dynamicStyles.registerBtn, isLoading && { opacity: 0.8 }]} 
              onPress={handleRegister} 
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <View style={styles.btnContent}>
                  <Text style={styles.registerText}>Tạo tài khoản</Text>
                  <UserPlus size={20} color="#FFF" strokeWidth={3} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={dynamicStyles.hasAccountText}>Đã là thành viên?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={dynamicStyles.loginLink}>Đăng nhập ngay</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 30, paddingBottom: 40, paddingTop: 20 },
  header: { alignItems: 'center', marginBottom: 35 },
  mascot: { width: 65, height: 65, resizeMode: 'contain' },
  form: { width: '100%' },
  inputIcon: { marginRight: 12 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  registerText: { color: '#FFF', fontSize: 18, fontWeight: '900', textTransform: 'uppercase' },
  footer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 25,
    gap: 5
  },
});