import React, { useContext, useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, Image, Dimensions, KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Mail, Lock, ArrowRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }: any) {
  const { login } = useContext(AuthContext);
  const { colors } = useTheme();
  const [email, setEmail] = useState('demo@japanese.local');
  const [password, setPassword] = useState('demo123');
  const [isLoading, setIsLoading] = useState(false);

  const mascotSource = require('../../assets/sharkMagic.png');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }
    try {
      setIsLoading(true);
      await login(email, password);
    } catch (error: any) {
      Alert.alert('Đăng nhập thất bại', error.message || 'Kiểm tra lại thông tin và thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: colors.background 
    },
    mascotCircle: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      borderWidth: 2,
      borderColor: colors.border
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      height: 65,
      borderRadius: 20,
      paddingHorizontal: 20,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.02,
      shadowRadius: 8,
      elevation: 2,
    },
    input: { 
      flex: 1, 
      fontSize: 16, 
      color: colors.text, 
      fontWeight: '500' 
    },
    title: { 
      fontSize: 32, 
      color: colors.text, 
      fontWeight: '900', 
      letterSpacing: -1 
    },
    subTitle: { 
      textAlign: 'center', 
      color: colors.textSecondary, 
      marginTop: 10, 
      lineHeight: 20, 
      paddingHorizontal: 20 
    },
    inputIcon: { 
      marginRight: 15,
      color: colors.primary
    },
    loginBtn: { 
      backgroundColor: colors.primary, 
      height: 65, 
      borderRadius: 20, 
      justifyContent: 'center', 
      alignItems: 'center', 
      marginTop: 10,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 5,
    },
    noAccountText: { 
      color: colors.textSecondary, 
      fontSize: 15 
    },
    registerLink: { 
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
        <View style={styles.content}>
          {/* Section 1: Mascot & Welcome */}
          <View style={styles.header}>
            <View style={dynamicStyles.mascotCircle}>
              <Image source={mascotSource} style={styles.mascot} />
            </View>
            <Text style={dynamicStyles.title}>Shark Nihongo</Text>
            <Text style={dynamicStyles.subTitle}>Cùng Same-kun chinh phục tiếng Nhật mỗi ngày!</Text>
          </View>

          {/* Section 2: Form */}
          <View style={styles.form}>
            <View style={dynamicStyles.inputWrapper}>
              <Mail size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput 
                placeholder="Email của bạn" 
                style={dynamicStyles.input} 
                value={email} 
                onChangeText={setEmail} 
                autoCapitalize="none" 
                keyboardType="email-address" 
                placeholderTextColor={colors.textSecondary}
              />
            </View>

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
              style={[dynamicStyles.loginBtn, isLoading && { opacity: 0.8 }]} 
              onPress={handleLogin} 
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <View style={styles.btnContent}>
                  <Text style={styles.loginText}>Đăng nhập</Text>
                  <ArrowRight size={20} color="#FFF" strokeWidth={3} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Section 3: Footer */}
          <View style={styles.footer}>
            <Text style={dynamicStyles.noAccountText}>Chưa có tài khoản?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={dynamicStyles.registerLink}>Đăng ký ngay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 30, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  mascot: { width: 80, height: 80, resizeMode: 'contain' },
  form: { width: '100%' },
  inputIcon: { marginRight: 15 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loginText: { color: '#FFF', fontSize: 18, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  footer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 30,
    gap: 5
  },
});