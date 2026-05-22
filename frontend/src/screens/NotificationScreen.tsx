import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View, RefreshControl } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuthContext } from '../context/AuthContext';
import { getNotifications, markNotificationsRead } from '../api/api';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../components/AppNavigator';
import ScreenContainer from '../components/ScreenContainer';
import { ArrowRight, Bell, MailOpen } from 'lucide-react-native';

type NotificationScreenProps = StackScreenProps<RootStackParamList, 'Notifications'>;

type NotificationItem = {
  id: number;
  title: string;
  body: string;
  type: string;
  metadata: any;
  is_read: number;
  created_at: string;
};

// Hàm helper định dạng thời gian thân thiện (Có thể đưa ra file utils riêng)
const formatTimeAgo = (dateString: string) => {
  const now = new Date();
  const past = new Date(dateString);
  const diffInMs = now.getTime() - past.getTime();
  const diffInMins = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMins / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMins < 1) return 'Vừa xong';
  if (diffInMins < 60) return `${diffInMins} phút trước`;
  if (diffInHours < 24) return `${diffInHours} giờ trước`;
  if (diffInDays === 1) return 'Hôm qua';
  if (diffInDays < 7) return `${diffInDays} ngày trước`;
  
  return past.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function NotificationScreen({ navigation }: NotificationScreenProps) {
  const { colors, isDark } = useTheme();
  const { user } = useAuthContext();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async (showLoadingIndicator = true) => {
    if (!user?.id) return;
    if (showLoadingIndicator) setLoading(true);
    try {
      const data = await getNotifications(user.id);
      setNotifications(data.notifications || []);
    } catch (error) {
      console.warn('Không thể tải thông báo:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications(false);
  };

  const handlePressNotification = async (notification: NotificationItem) => {
    if (!user?.id) return;
    try {
      if (notification.metadata?.materialId) {
        navigation.navigate('StudyJourney', { materialId: Number(notification.metadata.materialId) });
      }
      if (notification.is_read === 0) {
        await markNotificationsRead(user.id, [notification.id]);
        setNotifications((prev) =>
          prev.map((item) => (item.id === notification.id ? { ...item, is_read: 1 } : item))
        );
      }
    } catch (error) {
      console.warn('Không thể đánh dấu thông báo đã đọc:', error);
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const isUnread = item.is_read === 0;

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          { 
            backgroundColor: colors.card, 
            borderColor: isUnread ? colors.primary + '30' : colors.border, // Viền nổi bật nhẹ nếu chưa đọc
            shadowColor: colors.text,
          }
        ]}
        onPress={() => handlePressNotification(item)}
        activeOpacity={0.7}
      >
        <View style={styles.row}>
          {/* Box Icon động theo trạng thái và tương thích Dark Mode */}
          <View 
            style={[
              styles.notificationIconBox, 
              { backgroundColor: isUnread ? colors.primary + '15' : (isDark ? '#2A2A2A' : '#F0F0F0') }
            ]}
          >
            {isUnread ? (
              <Bell size={20} color={colors.primary} />
            ) : (
              <MailOpen size={20} color={colors.textSecondary} />
            )}
          </View>

          <View style={styles.notificationContent}>
            <View style={styles.titleRow}>
              <Text 
                numberOfLines={1}
                style={[
                  styles.notificationTitle, 
                  { color: colors.text, fontWeight: isUnread ? '700' : '500' }
                ]}
              >
                {item.title}
              </Text>
              {/* Chấm tròn xanh báo hiệu chưa đọc */}
              {isUnread && <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]} />}
            </View>
            
            <Text 
              numberOfLines={3}
              style={[
                styles.notificationBody, 
                { color: isUnread ? colors.text : colors.textSecondary }
              ]}
            >
              {item.body}
            </Text>
            
            <Text style={[styles.notificationDate, { color: colors.textSecondary }]}>
              {formatTimeAgo(item.created_at)}
            </Text>
          </View>

          <View style={styles.arrowBox}>
            <ArrowRight size={14} color={colors.textSecondary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer>
      <View style={[styles.pageHeader, { borderBottomColor: colors.border, backgroundColor: colors.background }]}> 
        <Text style={[styles.pageTitle, { color: colors.text }]}>Thông báo</Text>
        <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>Danh sách thẻ đã chia sẻ tới bạn</Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyWrapper}>
          <Bell size={48} color={colors.textSecondary} style={{ marginBottom: 12, opacity: 0.5 }} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Bạn chưa có thông báo mới.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 13,
    fontWeight: '400',
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80, // Đẩy icon lên trên một chút nhìn cân đối hơn
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  notificationCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    // Hiệu ứng đổ bóng nhẹ cho card thêm chiều sâu (iOS)
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    // Android Shadow
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    paddingRight: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  notificationTitle: {
    fontSize: 15,
    flex: 1,
    paddingRight: 8,
  },
  unreadBadge: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  notificationBody: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  notificationDate: {
    fontSize: 11,
    fontWeight: '400',
  },
  arrowBox: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    opacity: 0.7,
  },
});