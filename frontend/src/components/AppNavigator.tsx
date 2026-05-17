import React, { useContext } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Import các màn hình
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DictionaryScreen from '../screens/DictionaryScreen';
import StudyScreen from '../screens/LibraryScreen';
import StudyJourneyScreen from '../screens/StudyJourneyScreen';
import FlashcardScreen from '../screens/FlashcardScreen';
import QuizScreen from '../screens/QuizScreen';
import SpeakingPracticeScreen from '../screens/SpeakingPracticeScreen';
import ProfileScreen from '../screens/ProfileScreen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Dictionary: { query?: string } | undefined;
  Study: undefined;
  SpeakingPractice: undefined;
  Profile: undefined;

  // 🦈 Màn hình Lộ trình: Dùng materialId làm khóa chính
  StudyJourney: { 
    materialId: number; 
    flashcardId?: string; // Giữ lại để back-compatibility nếu cần
    completedNodeId?: string;
    sessionId?: number;
  };

  // 🦈 Màn hình Flashcard: Thêm nodeIndex để biết đang ở nút nào trên zigzag
  Flashcard: {
    materialId: number;
    nodeIndex?: number;      // Optional
    flashcardId: string;
    groupIndex: number;
    batchIndex: number;
    chunkStart?: number;
    chunkSize?: number;
    nextQuizNodeId?: string;
    nextNodeIndex?: number;
    sessionId?: number;
  };

  // 🦈 Màn hình Quiz: Thêm nodeIndex và materialId
  Quiz: {
    materialId: number;     // 👈 Thêm để đồng bộ với backend
    nodeIndex?: number;      // Optional
    flashcardId: string;
    nodeId: string;
    groupIndex: number;
    subStepIndex: number;
    nodeType?: 'QUIZ_GROUP' | 'MINI_QUIZ' | 'REVIEW' | 'FINAL_BOSS' | 'FINAL_EXAM';
    quizStepType?: 'MATCH_MEANING' | 'MATCH_HIRA' | 'MULTIPLE_CHOICE' | 'SCRAMBLED_HIRA' | 'WRITE_HIRA';
    chunkStart?: number;
    chunkSize?: number;
    learnedCount?: number;
    sessionId?: number;
  };
};
const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { isLoggedIn } = useContext(AuthContext);
  const { colors } = useTheme();

  if (!isLoggedIn) {
    return (
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{ headerShown: false, cardStyle: { backgroundColor: colors.background } }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background }
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Study" component={StudyScreen} />
      <Stack.Screen name="StudyJourney" component={StudyJourneyScreen} />
      <Stack.Screen name="Flashcard" component={FlashcardScreen} />
      <Stack.Screen name="Quiz" component={QuizScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Dictionary" component={DictionaryScreen} />
      <Stack.Screen name="SpeakingPractice" component={SpeakingPracticeScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;