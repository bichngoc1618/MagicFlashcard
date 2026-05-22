import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import { getChatHistory, clearChatHistory, speakText, speakAudio } from '../api/api';
import { speakTextToSpeech } from '../utils/tts';
import BottomNavigation from '../components/BottomNavigation';
import { useTheme } from '../context/ThemeContext';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
}

export default function SpeakingPracticeScreen() {
  const { user } = useAuthContext();
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [speechRate, setSpeechRate] = useState<number>(0.85);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const webMediaRecorderRef = useRef<any>(null);
  const webAudioChunksRef = useRef<Blob[]>([]);
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    const loadAllHistory = async () => {
      try {
        setIsLoadingAI(true);
        const data = await getChatHistory(user?.id, true);
        if (Array.isArray(data.history) && data.history.length > 0) {
          const historyMessages = data.history.flatMap((entry: any) => [
            { id: entry.id * 2, text: entry.user_msg || '', sender: 'user' as const },
            { id: entry.id * 2 + 1, text: entry.ai_reply || '', sender: 'ai' as const }
          ]);
          setMessages(historyMessages);
        } else {
          setMessages([{ id: Date.now(), text: 'Chào bạn! Nhấn giữ micro hoặc gõ tin nhắn để trò chuyện cùng サメ!', sender: 'ai' }]);
        }
      } catch (err) {
        console.error('Lỗi tải lịch sử:', err);
      } finally {
        setIsLoadingAI(false);
        scrollToBottom();
      }
    };
    loadAllHistory();
  }, [user?.id]);

  const speakJapanese = async (text: string) => {
    if (!text) return;
    const japanesePart = text.split(/[|()]/)[0].trim();
    await speakTextToSpeech(japanesePart, {
      language: 'ja-JP',
      rate: speechRate,
      pitch: 1.0,
    });
  };

  const getSpeechSpeedLabel = () => {
    if (speechRate <= 0.75) return 'Chậm';
    if (speechRate >= 1.2) return 'Rất nhanh';
    if (speechRate === 1.0) return 'Nhanh';
    return 'Bình thường';
  };

  const clearConversation = async () => {
    setSettingsOpen(false);
    setShowClearConfirm(false);
    setIsLoadingAI(true);
    try {
      if (user?.id) {
        await clearChatHistory(user.id);
      }
      setMessages([{ id: Date.now(), text: 'Chào bạn! Nhấn giữ micro hoặc gõ tin nhắn để trò chuyện cùng サメ!', sender: 'ai' }]);
    } catch (err) {
      console.error('Không thể xóa lịch sử chat:', err);
    } finally {
      setIsLoadingAI(false);
      scrollToBottom();
    }
  };

  const confirmClearConversation = () => {
    setSettingsOpen(false);
    setShowClearConfirm(true);
  };

  const handleSendText = async () => {
    if (!inputText.trim()) return;
    const userMsg = inputText.trim();
    setInputText('');
    const tempId = Date.now();
    setMessages(prev => [...prev, { id: tempId, text: userMsg, sender: 'user' }]);
    setIsLoadingAI(true);
    scrollToBottom();

    try {
      const data = await speakText(userMsg, user?.id);
      setMessages(prev => prev.concat([{ id: tempId + 1, text: data.aiReply, sender: 'ai' }]));
      speakJapanese(data.aiReply);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now(), text: 'サメ gặp sự cố kết nối...', sender: 'ai' }]);
    } finally {
      setIsLoadingAI(false);
      scrollToBottom();
    }
  };

  const handleVoiceChatWithAI = async (uri: string) => {
    setIsLoadingAI(true);
    scrollToBottom();
    try {
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        const file = new File([blob], 'recording.wav', { type: blob.type || 'audio/wav' });
        formData.append('file', file);
      } else {
        // @ts-ignore
        formData.append('file', { uri, type: 'audio/m4a', name: 'recording.m4a' });
      }
      if (user?.id) {
        formData.append('userId', String(user.id));
      }
      const data = await speakAudio(formData);
      const displayUserText = data.userCorrected || data.userOriginal || '(Âm thanh không rõ)';
      setMessages(prev => [
        ...prev,
        { id: Date.now(), text: displayUserText, sender: 'user' },
        { id: Date.now() + 1, text: data.aiReply, sender: 'ai' }
      ]);
      speakJapanese(data.aiReply);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingAI(false);
      scrollToBottom();
    }
  };

  const handleStartListening = async () => {
    if (Platform.OS === 'web') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new (window.MediaRecorder || (window as any).webkitMediaRecorder)(stream);
        webMediaRecorderRef.current = mediaRecorder;
        webAudioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event: any) => {
          if (event.data && event.data.size > 0) {
            webAudioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(webAudioChunksRef.current, { type: 'audio/wav' });
          const audioUrl = URL.createObjectURL(audioBlob);
          handleVoiceChatWithAI(audioUrl);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsListening(true);
      } catch (err) {
        console.error('Error starting web recording:', err);
      }
      return;
    }

    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsListening(true);
    } catch (err) { console.error(err); }
  };

  const handleStopListening = async () => {
    if (Platform.OS === 'web') {
      if (webMediaRecorderRef.current && webMediaRecorderRef.current.state !== 'inactive') {
        webMediaRecorderRef.current.stop();
        setIsListening(false);
      }
      return;
    }

    if (!recording) return;
    setIsListening(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) handleVoiceChatWithAI(uri);
    } catch (err) { console.error(err); }
  };

  // Hệ màu phẳng đậm lục bảo đồng bộ hóa
  const themePrimaryColor = isDark ? '#2A5C4D' : '#3B7A66';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        {/* HEADER ĐỒNG BỘ */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: isDark ? '#1E293B' : '#F1F5F9' }]}> 
          <View>
            <Text style={[styles.screenTitle, { color: colors.text }]}>Luyện nói cùng サメ</Text>
            <View style={styles.statusBadge}>
              <View style={[styles.onlineDot, { backgroundColor: themePrimaryColor }]} />
              <Text style={[styles.statusText, { color: themePrimaryColor }]}>AI Online</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setSettingsOpen(prev => !prev)} style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* MENU CÀI ĐẶT FLAT TỐI GIẢN */}
        {settingsOpen && (
          <View style={[styles.settingsMenu, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
            <TouchableOpacity style={styles.settingsItem} onPress={() => setSpeechRate(0.5)}>
              <Text style={[styles.settingsItemLabel, { color: colors.text }]}>Tốc độ rất chậm</Text>
              <Text style={[styles.settingsItemValue, { color: speechRate === 0.5 ? themePrimaryColor : colors.textSecondary }]}>0.5x</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsItem} onPress={() => setSpeechRate(0.75)}>
              <Text style={[styles.settingsItemLabel, { color: colors.text }]}>Tốc độ chậm</Text>
              <Text style={[styles.settingsItemValue, { color: speechRate === 0.75 ? themePrimaryColor : colors.textSecondary }]}>0.75x</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsItem} onPress={() => setSpeechRate(1.0)}>
              <Text style={[styles.settingsItemLabel, { color: colors.text }]}>Tốc độ bình thường</Text>
              <Text style={[styles.settingsItemValue, { color: speechRate === 1.0 ? themePrimaryColor : colors.textSecondary }]}>1.0x</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsItem} onPress={() => setSpeechRate(1.2)}>
              <Text style={[styles.settingsItemLabel, { color: colors.text }]}>Tốc độ nhanh</Text>
              <Text style={[styles.settingsItemValue, { color: speechRate === 1.2 ? themePrimaryColor : colors.textSecondary }]}>1.2x</Text>
            </TouchableOpacity>
            <View style={[styles.settingsDivider, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]} />
            <TouchableOpacity style={styles.settingsItem} onPress={confirmClearConversation}>
              <Text style={[styles.settingsItemLabel, { color: colors.danger || '#FF4B4B' }]}>Xóa lịch sử chat</Text>
            </TouchableOpacity>
            <Text style={[styles.settingsFooter, { color: colors.textSecondary }]}>Tốc độ hiện tại: {getSpeechSpeedLabel()}</Text>
          </View>
        )}

        {/* MODAL XÁC NHẬN XÓA LỊCH SỬ CHAT ĐỒNG BỘ POPUP HOME */}
        <Modal visible={showClearConfirm} transparent animationType="fade" onRequestClose={() => setShowClearConfirm(false)}>
          <View style={styles.confirmOverlay}>
            <View style={[styles.confirmBox, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#E2E8F0' }]}> 
              <Text style={[styles.confirmTitle, { color: colors.text }]}>Bạn có chắc chắn?</Text>
              <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>Hành động này sẽ xóa toàn bộ lịch sử chat của bạn.</Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity style={[styles.confirmButton, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]} onPress={() => setShowClearConfirm(false)}>
                  <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>HỦY</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.confirmButton, { backgroundColor: colors.danger || '#FF4B4B' }]} onPress={clearConversation}>
                  <Text style={{ color: '#FFF', fontWeight: '700' }}>XÁC NHẬN</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* KHÔNG GIAN CUỘN TIN NHẮN */}
        <ScrollView 
          style={[styles.chatContainer, { backgroundColor: colors.background }]} 
          ref={scrollViewRef}
          onContentSizeChange={scrollToBottom}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 16 }}
        >
          {messages.map((msg) => (
            <View key={msg.id} style={[styles.messageWrapper, msg.sender === 'user' ? styles.userRow : styles.aiRow]}>
              {msg.sender === 'ai' && (
                <Image source={require('../../assets/speak.png')} style={[styles.miniMascot, { backgroundColor: isDark ? 'rgba(59, 122, 102, 0.15)' : '#E9FBF5' }]} />
              )}
              <TouchableOpacity 
                activeOpacity={0.9} 
                style={[
                  styles.chatBox,
                  msg.sender === 'user' ? [styles.userBox, { backgroundColor: themePrimaryColor }] : [styles.aiBox, { backgroundColor: colors.card }],
                  { borderColor: isDark ? '#1E293B' : '#F1F5F9' }
                ]}
                onPress={() => speakJapanese(msg.text)}
              >
                <Text style={[styles.chatText, { color: msg.sender === 'user' ? '#FFFFFF' : colors.text }]}>
                  {msg.text}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
          
          {isLoadingAI && (
            <View style={styles.aiRow}>
              <Image source={require('../../assets/speak.png')} style={[styles.miniMascot, { backgroundColor: isDark ? 'rgba(59, 122, 102, 0.15)' : '#E9FBF5' }]} />
              <View style={[styles.chatBox, styles.aiBox, styles.loadingBox, { backgroundColor: colors.card, borderColor: isDark ? '#1E293B' : '#F1F5F9' }]}> 
                <ActivityIndicator size="small" color={themePrimaryColor} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* INPUT KHU VỰC NHẬP LIỆU VÀ MICRO CAPSULE CHUẨN FLAT */}
        <View style={[styles.inputArea, { backgroundColor: colors.card, borderTopColor: isDark ? '#1E293B' : '#F1F5F9' }]}> 
          <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: isDark ? '#1E293B' : '#E2E8F0' }]}> 
            <TextInput 
              style={[styles.textInput, { color: colors.text }]}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={inputText}
              onChangeText={setInputText}
              multiline={false}
            />
            
            {inputText.length > 0 ? (
              <TouchableOpacity onPress={handleSendText} style={[styles.actionBtn, { backgroundColor: themePrimaryColor }]}> 
                <Ionicons name="send" size={16} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPressIn={handleStartListening}
                onPressOut={handleStopListening}
                style={[styles.actionBtn, { backgroundColor: isListening ? (colors.danger || '#FF4B4B') : themePrimaryColor }]}
              >
                <FontAwesome5 name={isListening ? "stop" : "microphone"} size={14} color="white" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.hintText, { color: colors.textSecondary }]}> 
            {isListening ? "Đang lắng nghe..." : "Giữ Mic để nói tiếng Nhật"}
          </Text>
        </View>

        {/* Giữ khoảng cách cố định dưới chân tránh BottomNavigation đè */}
        <View style={{ height: Platform.OS === 'ios' ? 85 : 75 }} />
      </KeyboardAvoidingView>


    </SafeAreaView>
  );
}

/* ================= STYLES CHUẨN FLAT ĐỒNG BỘ HỆ THỐNG ================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  screenTitle: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageWrapper: {
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  aiRow: {
    justifyContent: 'flex-start',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  miniMascot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
  },
  chatBox: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  aiBox: {
    borderBottomLeftRadius: 20,
  },
  userBox: {
    borderBottomRightRadius: 20,
  },
  loadingBox: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  chatText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  inputArea: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.03, shadowRadius: 10 },
      android: { elevation: 10 },
    }),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    height: 42,
    fontSize: 15,
    fontWeight: '500',
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  hintText: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 8,
    fontWeight: '700',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsMenu: {
    position: 'absolute',
    right: 20,
    top: Platform.OS === 'ios' ? 90 : 80,
    width: 240,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16 },
      android: { elevation: 8 },
    }),
    zIndex: 50,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  settingsItemLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  settingsItemValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  settingsDivider: {
    height: 1,
    marginVertical: 6,
  },
  settingsFooter: {
    fontSize: 12,
    paddingHorizontal: 18,
    paddingBottom: 10,
    fontWeight: '600',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmBox: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20 },
      android: { elevation: 6 },
    }),
  },
  confirmTitle: {
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  confirmMessage: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});