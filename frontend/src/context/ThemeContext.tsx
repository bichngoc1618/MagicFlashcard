import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Theme = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSecondary: string;
  border: string;
  card: string;
  primary: string;
  success: string;
  warning: string;
  danger: string;
  muted: string;
  placeholder: string;
  overlay: string;
  nav: string;
}

export interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 🌿 BẢNG MÀU LIGHT MODE: Thanh lịch, sạch sẽ và tăng tối đa công năng đọc
const lightColors: ThemeColors = {
  background: '#F9FBFA',     // Trắng ngả ngọc siêu nhẹ, giảm lóa mắt ban ngày
  surface: '#F0F5F3',        // Bề mặt khối phụ mịn màng
  surfaceAlt: '#E2ECE8',     // Màu nhấn cho các khu vực đặc biệt
  text: '#091E1A',           // Xanh đen thẫm (Deep Forest) thay cho đen thuần, trông cao cấp hơn
  textSecondary: '#5A756E',  // Tăng độ tương phản so với bản cũ để đọc rõ ràng hơn
  border: '#E3ECE9',         // Đường kẻ mảnh sạch sẽ, tự nhiên
  card: '#FFFFFF',           // Thẻ trắng tinh khôi tạo hiệu ứng nổi bật (Elevation)
  primary: '#0B4A3A',        // Xanh rêu đậm hoàng gia (Deep Emerald) tạo điểm nhấn thương hiệu mạnh
  success: '#10B981',        // Xanh lá tươi hiện đại phong cách Tailwind
  warning: '#F59E0B',        // Vàng hổ phách ấm áp
  danger: '#EF4444',         // Đỏ san hô dịu, không bị gai mắt
  muted: '#64748B',          // Xám trung tính
  placeholder: '#94A3B8',    // Màu giữ chỗ vừa vặn
  overlay: 'rgba(9, 30, 26, 0.4)',
  nav: '#FFFFFF',
};

// 🌙 BẢNG MÀU DARK MODE: Có chiều sâu, tối ưu hóa tuyệt đối cho trải nghiệm ban đêm
const darkColors: ThemeColors = {
  background: '#0B1311',     // Đêm đen sâu thẳm ngả ngọc (Midnight Emerald), dịu tuyệt đối cho mắt
  surface: '#142421',        // Bề mặt khối tối giản
  surfaceAlt: '#1D3430',     // Khối nhấn nhẹ
  text: '#F1F7F5',           // Chữ trắng ngà mềm mại, tránh mỏi mắt
  textSecondary: '#8CA39E',  // Chữ phụ sáng vừa đủ nhìn, không bị mờ chìm
  border: '#1D3430',         // Đường viền chìm tinh tế vào nền ban đêm
  card: '#121F1C',           // Thẻ hơi xám xanh thẫm phối tương thích mượt mà với Shadow ngầm
  primary: '#52C7B8',        // Xanh ngọc Neon dịu nhẹ (Mint Emerald) - phát sáng xuất sắc trên nền tối
  success: '#34D399',        // Xanh lá dịu cho chế độ đêm
  warning: '#FBBF24',        // Vàng nhạt dễ chịu
  danger: '#F87171',         // Đỏ nhạt an toàn cho mắt
  muted: '#475569',          // Xám trầm
  placeholder: '#334155',    // Màu giữ chỗ chìm
  overlay: 'rgba(0, 0, 0, 0.7)',
  nav: '#121F1C',
};

export const ThemeProvider = ({ children }: any) => {
  const [theme, setTheme] = useState<Theme>('light');
  const [isLoaded, setIsLoaded] = useState(false);
  const systemColorScheme = useColorScheme();

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        if (savedTheme) {
          setTheme(savedTheme as Theme);
        } else if (systemColorScheme) {
          setTheme(systemColorScheme);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadTheme();
  }, [systemColorScheme]);

  const toggleTheme = async () => {
    try {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const colors = theme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};