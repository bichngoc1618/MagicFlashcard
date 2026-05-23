import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  Platform,
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { StackScreenProps } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  ChevronRight,
  Flame,
  BookOpen,
  Trophy,
  LayoutGrid,
  CheckCircle,
  Plus,
  X,
  Layers,
  Award,
  Sparkles
} from 'lucide-react-native';

import { useAuthContext } from '../context/AuthContext';
import type { RootStackParamList } from '../components/AppNavigator';
import ScreenContainer from '../components/ScreenContainer';
import BottomNavigation from '../components/BottomNavigation';
import AppHeaderSearch from '../components/AppHeaderSearch';
import VocabularyManager from '../components/VocabularyManager';
import SharkLoader from '../components/ui/SharkLoader';
import { getMaterials, getUserStats, createMaterial } from '../api/api';

type StudyScreenProps = StackScreenProps<RootStackParamList, 'Study'>;
type TabType = 'inProgress' | 'completed';

// ====================================================================
// ĐỒNG BỘ BỘ MÀU SẮC ĐẬM ĐÀ TỪ HOMESCREEN
// ====================================================================
const getMaterialColorStyle = (title: string, isDark: boolean) => {
  const normalizedTitle = title.toLowerCase();
  
  // if (normalizedTitle.includes('kanji') || normalizedTitle.includes('hán tự') || normalizedTitle.includes('ngữ pháp')) {
  //   return {
  //     primary: isDark ? '#C26D03' : '#D97706',
  //     shadow: isDark ? '#782E00' : '#9A3412',
  //     lightBg: isDark ? 'rgba(194, 109, 3, 0.18)' : '#FEE2E2',
  //   };
  // }
  
  return {
    primary: isDark ? '#2A5C4D' : '#3B7A66',
    shadow: isDark ? '#193D32' : '#275245',
    lightBg: isDark ? 'rgba(59, 122, 102, 0.18)' : '#D1FAE5',
  };
};

export default function StudyScreen({ navigation }: StudyScreenProps) {
  const { user, notificationCount, refreshNotificationCount } = useAuthContext();
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [materials, setMaterials] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('inProgress');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newMaterialTitle, setNewMaterialTitle] = useState('');
  const [newMaterialDescription, setNewMaterialDescription] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creatingMaterial, setCreatingMaterial] = useState(false);

  const isLightMode = colors.background.toLowerCase() === '#f8fbf9' || colors.background.toLowerCase() === '#ffffff';

  const loadData = async () => {
    if (!user?.id) return;
    try {
      const [materialsRes, statsRes] = await Promise.all([
        getMaterials(user.id),
        getUserStats(user.id),
      ]);
      setMaterials(materialsRes.materials || []);
      setStreak(statsRes.streakCount || 0);
    } catch (e) {
      console.warn(e);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
      refreshNotificationCount();
    }, [user?.id, refreshNotificationCount])
  );

  // Cải tiến sửa đổi: Khôi phục chính xác hàm set state tránh crash ngầm
  const openAddModal = () => {
    setNewMaterialTitle('');
    setNewMaterialDescription('');
    setCreateError(null);
    setAddModalVisible(true);
  };

  const closeAddModal = () => {
    setAddModalVisible(false);
    setCreateError(null);
  };

  const handleCreateMaterial = async () => {
    if (!newMaterialTitle.trim()) {
      setCreateError('Vui lòng nhập tên bộ từ vựng');
      return;
    }
    if (!user?.id) {
      setCreateError('Không tìm thấy người dùng');
      return;
    }

    setCreatingMaterial(true);
    try {
      await createMaterial(Number(user.id), newMaterialTitle.trim(), newMaterialDescription.trim());
      await loadData();
      closeAddModal();
    } catch (error) {
      console.warn('Không tạo được bộ từ vựng', error);
      setCreateError('Không tạo được bộ từ vựng. Vui lòng thử lại.');
    } finally {
      setCreatingMaterial(false);
    }
  };

  const stats = useMemo(() => {
    let totalLearnedWordsAllDecks = 0;

    const all = materials.map((item) => {
      const learned = item.completed_nodes ?? item.learned_cards ?? 0;
      const total = item.total_nodes ?? item.total_cards ?? 0;
      const progress = total ? learned / total : 0;
      
      totalLearnedWordsAllDecks += learned;

      return { ...item, learned, total, progress, isFinished: progress >= 1 };
    });

    const inProgressArr = all.filter((i) => !i.isFinished);
    const completedArr = all.filter((i) => i.isFinished);

    return {
      inProgress: inProgressArr,
      completed: completedArr,
      overall: {
        inProgressCount: inProgressArr.length,
        completedCount: completedArr.length,
        totalDecks: all.length,
        totalLearnedWords: totalLearnedWordsAllDecks,
      },
    };
  }, [materials]);

  const displayMaterials = activeTab === 'inProgress' ? stats.inProgress : stats.completed;

  if (isLoading) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: colors.background }]}>
        <SharkLoader size="small" message="" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Đang tải lộ trình học...</Text>
      </View>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView 
        contentContainerStyle={[styles.scroll, { backgroundColor: colors.background }]} 
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER SEARCH */}
        <AppHeaderSearch
          displayName={user?.username || 'User'}
          mascotSource={require('../../assets/sharkMagic.png')}
          searchText={searchText}
          onChangeSearchText={setSearchText}
          onSubmitSearch={() => {
            if (searchText.trim()) {
              navigation.navigate('Dictionary', { query: searchText.trim() });
            }
          }}
          notificationCount={notificationCount}
          onNotificationPress={() => navigation.navigate('Notifications')}
        />

        {/* THẺ THỐNG KÊ MÀU ĐẬM ĐỒNG BỘ */}
        <View style={styles.statsGrid}>
          <View style={[styles.statsGridCard, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
            <View style={[styles.iconWrapper, { backgroundColor: isDark ? 'rgba(59, 122, 102, 0.18)' : '#D1FAE5' }]}>
              <Layers size={18} color={isDark ? '#34D399' : '#275245'} />
            </View>
            <View style={styles.statsCardContent}>
              <Text style={[styles.statsGridValue, { color: colors.text }]}>
                {stats.overall.inProgressCount}
                <Text style={[styles.statsGridSubValue, { color: colors.textSecondary }]}>/{stats.overall.completedCount}</Text>
              </Text>
              <Text style={[styles.statsGridLabel, { color: colors.textSecondary }]}>Đang học / Đã xong</Text>
            </View>
          </View>

          <View style={[styles.statsGridCard, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
            <View style={[styles.iconWrapper, { backgroundColor: '#FFD02C18' }]}>
              <Award size={18} color="#FFD02C" />
            </View>
            <View style={styles.statsCardContent}>
              <Text style={[styles.statsGridValue, { color: colors.text }]}>{stats.overall.totalLearnedWords}</Text>
              <Text style={[styles.statsGridLabel, { color: colors.textSecondary }]}>Từ vựng đã thuộc</Text>
            </View>
          </View>
        </View>

        {/* DÒNG TIÊU ĐỀ & NÚT THÊM MỚI 3D */}
        <View style={styles.sectionHeaderRow}>
          <View style={[styles.streakBadge, { backgroundColor: isDark ? '#0A3B2F' : 'rgba(59, 122, 102, 0.15)' }]}>
            <Flame size={14} color="#FFD02C" fill="#FFD02C" />
            <Text style={[styles.streakBadgeText, { color: isDark ? '#34D399' : '#275245' }]}>{streak} Ngày học</Text>
          </View>
          
          {/* NÚT TẠO BỘ MỚI ĐỔ KHỐI 3D ĐỒNG BỘ */}
          <View style={styles.addBtn3DWrapper}>
            <View style={[styles.addBtn3DBase, { backgroundColor: isDark ? '#193D32' : '#275245' }]} />
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.addMaterialButton, { backgroundColor: isDark ? '#2A5C4D' : '#3B7A66' }]}
              onPress={openAddModal}
            >
              <Plus size={14} color="#fff" strokeWidth={3} />
              <Text style={styles.addMaterialText}>Tạo bộ mới</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* TABS PHÂN LOẠI */}
        <View style={[styles.tabWrapper, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
          <TouchableOpacity 
            activeOpacity={0.7}
            style={[styles.tabItem, activeTab === 'inProgress' && { backgroundColor: colors.card, ...styles.shadowTab }]} 
            onPress={() => setActiveTab('inProgress')}
          >
            <LayoutGrid size={15} color={activeTab === 'inProgress' ? (isDark ? '#34D399' : '#3B7A66') : colors.textSecondary} />
            <Text style={[styles.tabText, { color: activeTab === 'inProgress' ? colors.text : colors.textSecondary }]}>
              Đang học ({stats.overall.inProgressCount})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            activeOpacity={0.7}
            style={[styles.tabItem, activeTab === 'completed' && { backgroundColor: colors.card, ...styles.shadowTab }]} 
            onPress={() => setActiveTab('completed')}
          >
            <CheckCircle size={15} color={activeTab === 'completed' ? (isDark ? '#34D399' : '#3B7A66') : colors.textSecondary} />
            <Text style={[styles.tabText, { color: activeTab === 'completed' ? colors.text : colors.textSecondary }]}>
              Hoàn thành ({stats.overall.completedCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* DANH SÁCH BỘ TỪ VỰNG */}
        {displayMaterials.length > 0 ? (
          displayMaterials.map((card) => (
            <StudyCardItem
              key={card.id}
              card={card}
              isDone={activeTab === 'completed'}
              isDark={isDark}
              colors={colors}
              onMaterialDeleted={loadData}
              onPress={() =>
                navigation.navigate('StudyJourney', { materialId: Number(card.id) })
              }
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Chưa có bài học nào ở mục này.</Text>
          </View>
        )}
      </ScrollView>



      {/* POPUP THÊM MỚI CHỐNG BÀN PHÍM ĐÈ HOÀN HẢO */}
      <Modal visible={addModalVisible} transparent animationType="fade" onRequestClose={closeAddModal}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardView}
            >
              <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#E2E8F0' }]}> 
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Tạo bộ từ vựng mới</Text>
                  <TouchableOpacity onPress={closeAddModal} style={styles.modalCloseBtn}>
                    <X size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Tên bộ từ vựng <Text style={{color: '#FF4B4B'}}>*</Text></Text>
                  <TextInput
                    value={newMaterialTitle}
                    onChangeText={(text) => {
                      setNewMaterialTitle(text);
                      setCreateError(null);
                    }}
                    placeholder="Ví dụ: Từ vựng N3 - Mimikara Oboeru"
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    style={[styles.modalInput, { borderColor: isDark ? '#1E293B' : '#E2E8F0', color: colors.text, backgroundColor: colors.background }]}
                  />

                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Mô tả bộ từ</Text>
                  <TextInput
                    value={newMaterialDescription}
                    onChangeText={(text) => {
                      setNewMaterialDescription(text);
                      setCreateError(null);
                    }}
                    placeholder="Nhập mục tiêu hoặc mô tả ngắn gọn..."
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    style={[styles.modalInput, styles.modalTextarea, { borderColor: isDark ? '#1E293B' : '#E2E8F0', color: colors.text, backgroundColor: colors.background }]}
                    multiline
                  />
                  
                  {createError ? <Text style={styles.modalError}>{createError}</Text> : null}
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.modalButton, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                    onPress={closeAddModal}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Huỷ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[styles.modalButton, { backgroundColor: isDark ? '#2A5C4D' : '#3B7A66' }]}
                    onPress={handleCreateMaterial}
                    disabled={creatingMaterial}
                  >
                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>
                      {creatingMaterial ? 'Đang tạo...' : 'Tạo bộ thẻ'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScreenContainer>
  );
}

/* ================= STUDY CARD ITEM ĐỒNG BỘ FLAT & ĐẬM MÀU ================= */
function StudyCardItem({ card, onPress, isDone, isDark, colors, onMaterialDeleted }: any) {
  const [displayTitle, setDisplayTitle] = useState(card.title);
  const progressPercent = Math.round(card.progress * 100);
  const nodePalette = useMemo(() => getMaterialColorStyle(displayTitle, isDark), [displayTitle, isDark]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#F1F5F9' }]}> 
      <TouchableOpacity
        activeOpacity={0.9}
        style={StyleSheet.absoluteFill}
        onPress={onPress}
      />

      <View style={[styles.cardIconBox, { backgroundColor: nodePalette.lightBg }]}> 
        {isDone ? (
          <Trophy size={18} color={nodePalette.primary} />
        ) : (
          <BookOpen size={18} color={nodePalette.primary} />
        )}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{displayTitle}</Text>
          <View style={[styles.percentBadge, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }, isDone && { backgroundColor: nodePalette.lightBg }]}>
            <Text style={[styles.percentText, { color: isDone ? nodePalette.primary : colors.textSecondary }]}>
              {progressPercent}%
            </Text>
          </View>
        </View>

        <View style={[styles.cardProgressBg, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}> 
          <View 
            style={[
              styles.cardProgressFill, 
              { 
                width: `${Math.min(progressPercent, 100)}%`, 
                backgroundColor: nodePalette.primary 
              }
            ]} 
          />
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }] }>
            {isDone ? 'Mục tiêu đã đạt!' : `Đã học ${card.learned}/${card.total} mục`}
          </Text>
          <View style={styles.miniManager}>
            <VocabularyManager
              materialId={Number(card.id)}
              materialTitle={displayTitle}
              onMaterialDeleted={onMaterialDeleted}
              onMaterialUpdated={(newTitle: string) => setDisplayTitle(newTitle)}
            />
          </View>
        </View>
      </View>

      <ChevronRight size={14} color={colors.textSecondary} style={{ marginLeft: 8, zIndex: 1 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 140,
    paddingHorizontal: 16,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '500'
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  statsGridCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statsCardContent: {
    flex: 1,
  },
  statsGridValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  statsGridSubValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  statsGridLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  streakBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  addBtn3DWrapper: {
    height: 36,
    position: 'relative',
    minWidth: 115,
  },
  addBtn3DBase: {
    position: 'absolute',
    top: 3,
    left: 0,
    right: 0,
    bottom: -3,
    borderRadius: 12,
  },
  addMaterialButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 4,
  },
  addMaterialText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  tabWrapper: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 16,
    marginTop: 16,
    marginBottom: 6,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 13,
  },
  shadowTab: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  tabText: {
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 16,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8 },
      android: { elevation: 1 },
    }),
  },
  cardIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.2
  },
  percentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignItems: 'center',
  },
  percentText: {
    fontSize: 11,
    fontWeight: '900',
  },
  cardProgressBg: {
    height: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardProgressFill: {
    height: '100%',
    borderRadius: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  miniManager: {
    transform: [{ scale: 0.85 }],
    marginRight: -6,
    overflow: 'visible',
    zIndex: 10,
  },
  emptyState: {
    marginTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)', 
    justifyContent: 'center',
  },
  keyboardView: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    maxHeight: '90%', 
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24 },
      android: { elevation: 8 },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  modalCloseBtn: {
    padding: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginLeft: 2,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 14,
    fontWeight: '500'
  },
  modalTextarea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  modalError: {
    color: '#FF4B4B',
    marginBottom: 14,
    fontSize: 12,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
});