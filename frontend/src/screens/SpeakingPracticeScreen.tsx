import React, { useState, useRef, useEffect, useContext } from 'react';
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
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { getChatHistory, speakText, speakAudio } from '../api/api';
import BottomNavigation from '../components/BottomNavigation';
import { useTheme } from '../context/ThemeContext';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
}

export default function SpeakingPracticeScreen() {
  const { user } = useContext(AuthContext);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const { colors } = useTheme();

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

  const speakJapanese = (text: string) => {
    if (!text) return;
    const japanesePart = text.split(/[|()]/)[0].trim();
    Speech.stop();
    Speech.speak(japanesePart, { language: 'ja-JP', pitch: 1.0, rate: 0.85 });
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
      const displayUserText = data.userCorrected || data.userOriginal || userMsg;
      setMessages(prev => prev.map((msg) =>
        msg.id === tempId ? { ...msg, text: displayUserText } : msg
      ).concat([{ id: tempId + 1, text: data.aiReply, sender: 'ai' }]));
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
      // @ts-ignore
      formData.append('file', { uri, type: 'audio/m4a', name: 'recording.m4a' });
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
    if (!recording) return;
    setIsListening(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri) handleVoiceChatWithAI(uri);
    } catch (err) { console.error(err); }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        {/* HEADER */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}> 
          <View>
            <Text style={[styles.screenTitle, { color: colors.text }]}>Luyện nói cùng サメ</Text>
            <View style={styles.statusBadge}>
              <View style={[styles.onlineDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.statusText, { color: colors.primary }]}>AI Online</Text>
            </View>
          </View>
          <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
        </View>

        {/* CHAT AREA */}
        <ScrollView 
          style={[styles.chatContainer, { backgroundColor: colors.background }]} 
          ref={scrollViewRef}
          onContentSizeChange={scrollToBottom}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 15 }}
        >
          {messages.map((msg) => (
            <View key={msg.id} style={[styles.messageWrapper, msg.sender === 'user' ? styles.userRow : styles.aiRow]}>
              {msg.sender === 'ai' && (
                <Image source={require('../../assets/speak.png')} style={styles.miniMascot} />
              )}
              <TouchableOpacity 
                activeOpacity={0.8} 
                style={[
                  styles.chatBox,
                  msg.sender === 'user' ? styles.userBox : styles.aiBox,
                  {
                    backgroundColor: msg.sender === 'user' ? colors.primary : colors.card,
                    borderColor: colors.border,
                  }
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
              <Image source={require('../../assets/speak.png')} style={styles.miniMascot} />
              <View style={[styles.chatBox, styles.aiBox, styles.loadingBox, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            </View>
          )}
        </ScrollView>

        {/* INPUT AREA */}
        <View style={[styles.inputArea, { backgroundColor: colors.card, borderTopColor: colors.border }]}> 
          <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <TextInput 
              style={[styles.textInput, { color: colors.text }]}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor={colors.placeholder}
              value={inputText}
              onChangeText={setInputText}
              multiline={false}
            />
            
            {inputText.length > 0 ? (
              <TouchableOpacity onPress={handleSendText} style={[styles.actionBtn, { backgroundColor: colors.primary }]}> 
                <Ionicons name="send" size={18} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPressIn={handleStartListening}
                onPressOut={handleStopListening}
                style={[styles.actionBtn, { backgroundColor: isListening ? colors.danger : colors.primary }]}
              >
                <FontAwesome5 name={isListening ? "stop" : "microphone"} size={16} color="white" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.hintText, { color: colors.textSecondary }]}> 
            {isListening ? "Đang lắng nghe..." : "Giữ Mic để nói tiếng Nhật"}
          </Text>
        </View>

        {/* CỰC KỲ QUAN TRỌNG: View giữ chỗ này có chiều cao bằng BottomNavigation để không bị che */}
        <View style={{ height: Platform.OS === 'ios' ? 85 : 75 }} />
      </KeyboardAvoidingView>

      <BottomNavigation activeTab="SpeakingPractice" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F1',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#173C35',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2E7B5F',
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2E7B5F',
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
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    backgroundColor: '#DDECE7',
  },
  chatBox: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  aiBox: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  userBox: {
    backgroundColor: '#2E7B5F',
    borderBottomRightRadius: 4,
  },
  loadingBox: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  chatText: {
    fontSize: 14,
    lineHeight: 20,
  },
  aiText: {
    color: '#2C3E50',
  },
  userText: {
    color: '#fff',
  },
  inputArea: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F4F4',
    borderRadius: 25,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  textInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#173C35',
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2E7B5F',
    marginLeft: 8,
  },
  hintText: {
    textAlign: 'center',
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 6,
    fontWeight: '500',
  },
});