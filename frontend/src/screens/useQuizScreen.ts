import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutRectangle } from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../components/AppNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFlashcards, updateProgress, completeQuizNode, syncStudy } from '../api/api';
import type { QuizType, QuizWord, AnswerRecord } from '../components/quiz/types';
import { chunkVocabulary } from '../utils/journeyMap';
import { useGlobalUI } from '../context/GlobalUIContext';

const DEFAULT_DISTRACTORS: QuizWord[] = [
  { id: 'distractor-1', kanji: '先生', hiragana: 'せんせい', meaning: 'giáo viên' },
  { id: 'distractor-2', kanji: '学生', hiragana: 'がくせい', meaning: 'học sinh' },
  { id: 'distractor-3', kanji: '友達', hiragana: 'ともだch', meaning: 'bạn bè' },
  { id: 'distractor-4', kanji: '学校', hiragana: 'がっこう', meaning: 'trường học' },
  { id: 'distractor-5', kanji: '日本語', hiragana: 'にほんご', meaning: 'tiếng Nhật' },
  { id: 'distractor-6', kanji: '本', hiragana: 'ほん', meaning: 'sách' },
  { id: 'distractor-7', kanji: '水', hiragana: 'mizu', meaning: 'nước' },
  { id: 'distractor-8', kanji: 'お茶', hiragana: 'おちゃ', meaning: 'trà' },
];

const DEFAULT_MEANINGS = [
  'giáo viên',
  'học sinh',
  'bạn bè',
  'trường học',
  'tiếng Nhật',
  'sách',
  'nước',
  'trà',
  'ngày mai',
  'hôm nay',
  'hôm qua',
  'xe hơi',
  'điện thoại',
  'máy tính',
  'gia đình',
];

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

type QuizQuestion = {
  word: QuizWord;
  type: QuizType;
  batchIndex: number;
  pool?: QuizWord[];
  options?: string[];
  correctAnswer?: string;
};

type UseQuizScreenParams = {
  materialId: number;
  nodeId: string;
  nodeType?: string;
  quizStepType?: QuizType;
  batchIndex: number;
  currentNodeIndex?: number;
  dueCardIds?: number[];
  sessionId?: string;
  user?: { id?: string | number };
  navigation: StackNavigationProp<RootStackParamList, 'Quiz'>;
  deductHeartOnFailure?: () => Promise<number> | number;
  isAlreadyCompleted?: boolean;
};

type UseQuizScreenResult = {
  isLoading: boolean;
  loadError: string | null;
  questions: QuizQuestion[];
  currentIndex: number;
  answers: AnswerRecord[];
  isCorrect: boolean | null;
  showResult: boolean;
  selectedLeftId: string | null;
  selectedRightId: string | null;
  matchedIds: Set<string>;
  wrongPair: boolean;
  matchingContainerHeight: number;
  inputValue: string;
  selectedOption: string | null;
  chosenTileIds: string[];
  leftItemLayouts: React.MutableRefObject<Record<string, LayoutRectangle>>;
  rightItemLayouts: React.MutableRefObject<Record<string, LayoutRectangle>>;
  setMatchingContainerHeight: (height: number) => void;
  setIsCorrect: (correct: boolean | null) => void;
  setSelectedLeftId: (id: string | null) => void;
  setSelectedRightId: (id: string | null) => void;
  setInputValue: (value: string) => void;
  setSelectedOption: (value: string | null) => void;
  setChosenTileIds: React.Dispatch<React.SetStateAction<string[]>>;
  handleCancel: () => void;
  handleNextQuestion: () => void;
  handleContinueQuestion: (skipReview?: boolean | any) => void;
  handleRetry: () => void;
  handleContinue: () => void;
  reloadQuiz: () => void;
  completedQuiz: boolean;
  currentWord: QuizWord | null;
  activeType: QuizType | undefined;
  stepProgress: number;
  questionIndex: number;
  totalCount: number;
  isBoss: boolean;
  correctCount: number;
  score: number;
  displayScore: number;
  resultCorrectCount: number;
  resultTotalCount: number;
  matchWords: QuizWord[];
  matchRightItems: { id: string; label: string }[];
  multipleChoiceOptions: string[];
  wrongPairs: Set<string>;
  pairAssignments: Record<string, string>;
  selectedScrambledChars: string[];
  tiles: { id: string; char: string }[];
  handleCheck: (correct: boolean) => Promise<void>;
  handlePairSelection: (leftId: string, rightId: string) => void;
  submitMatchAnswer: () => void;
  isMatchComplete: boolean;
  matchScore: number;
  currentMatchWords: QuizWord[];
  currentMatchRightItems: { id: string; label: string }[];
  remainingSeconds: number;
  isMatchMode: boolean;
  isTimeUp: boolean;
  hasSubmitted: boolean;
  selectedAnswer: string | null;
  matchRound: number;
  matchRoundCount: number;
  checkInputAnswer: () => void;
  verifyScrambled: () => void;
  handleChoiceAnswer: () => void;
  handleResetMatchState: () => void;
  feedbackMessage: string | null;
  isSubmitting: boolean;
  autoNextCountdown: number;
  canContinue: boolean;
  showWrongPairsReview: boolean;
  setShowWrongPairsReview: (show: boolean) => void;
  proceedAfterReview: () => void;
  showMatchAnswers: () => void;
};

const PRACTICE_STEPS: QuizType[] = ['MATCH_HIRA', 'MATCH_MEANING', 'MULTIPLE_CHOICE', 'SCRAMBLED_HIRA', 'WRITE_HIRA'];

function getTimerForType(type: QuizType): number {
  switch (type) {
    case 'MATCH_HIRA':
    case 'MATCH_MEANING':
      return 20;
    case 'MULTIPLE_CHOICE':
      return 8;
    case 'SCRAMBLED_HIRA':
      return 20;
    case 'WRITE_HIRA':
      return 20;
    default:
      return 20;
  }
}

function buildMultipleChoiceOptions(word: QuizWord, pool: QuizWord[]) {
  const distractors = pool.filter((item) => item.id !== word.id).map((item) => item.meaning);
  const uniqueDistractors = Array.from(new Set(distractors)).filter((meaning) => meaning !== word.meaning);
  
  const selectedDistractors = uniqueDistractors.slice(0, 3);
  
  // Nếu vẫn thiếu đáp án để đủ 4 đáp án (1 đáp án đúng + 3 đáp án nhiễu)
  if (selectedDistractors.length < 3) {
    const fallbackPool = shuffle(DEFAULT_MEANINGS);
    let fallbackIndex = 0;
    while (selectedDistractors.length < 3 && fallbackIndex < fallbackPool.length) {
      const mean = fallbackPool[fallbackIndex];
      if (mean !== word.meaning && !selectedDistractors.includes(mean)) {
        selectedDistractors.push(mean);
      }
      fallbackIndex++;
    }
  }

  return shuffle([word.meaning, ...selectedDistractors]);
}

function buildFinalBossQuestions(words: QuizWord[], nodeType: string): QuizQuestion[] {
  const isBoss = nodeType === 'FINAL_BOSS' || nodeType === 'FINAL_EXAM';
  const maxCount = isBoss ? 50 : 25;
  const count = Math.min(maxCount, words.length);
  const questions: QuizQuestion[] = [];

  const createQuestion = (word: QuizWord): QuizQuestion => {
    const question: QuizQuestion = {
      word,
      type: 'MULTIPLE_CHOICE',
      batchIndex: 0,
    };
    question.options = buildMultipleChoiceOptions(word, words);
    question.correctAnswer = word.meaning;
    return question;
  };

  words.forEach((word) => {
    questions.push(createQuestion(word));
  });

  return shuffle(questions).slice(0, count);
}

function buildQuizQuestions(words: QuizWord[], quizStepType: QuizType, batchIndex: number): QuizQuestion[] {
  if (words.length === 0) return [];

  if (quizStepType === 'MATCH_MEANING' || quizStepType === 'MATCH_HIRA') {
    return [
      {
        word: words[0],
        type: quizStepType,
        batchIndex,
        pool: shuffle(words),
      },
    ];
  }

  return words.map((word) => {
    const question: QuizQuestion = {
      word,
      type: quizStepType,
      batchIndex,
    };

    if (quizStepType === 'MULTIPLE_CHOICE') {
      question.options = buildMultipleChoiceOptions(word, words);
      question.correctAnswer = word.meaning;
    }

    return question;
  });
}

export default function useQuizScreen({
  materialId,
  nodeId,
  nodeType,
  quizStepType,
  batchIndex,
  currentNodeIndex,
  dueCardIds,
  sessionId,
  user,
  navigation,
  deductHeartOnFailure,
  isAlreadyCompleted,
}: UseQuizScreenParams): UseQuizScreenResult {
  const { showAlert } = useGlobalUI();
  const [matchAttempts, setMatchAttempts] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [words, setWords] = useState<QuizWord[]>([]);
  const [resumeIndex, setResumeIndex] = useState(0);
  const [resumeAnswers, setResumeAnswers] = useState<AnswerRecord[]>([]);
  const [reloadToggle, setReloadToggle] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [selectedRightId, setSelectedRightId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState(false);
  const [pairAssignments, setPairAssignments] = useState<Record<string, string>>({});
  const [pairAttempts, setPairAttempts] = useState(0);
  const [matchRoundScore, setMatchRoundScore] = useState(0);
  const [matchingContainerHeight, setMatchingContainerHeight] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [chosenTileIds, setChosenTileIds] = useState<string[]>([]);
  const [timerSeconds, setTimerSeconds] = useState(20);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchRound, setMatchRound] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [wrongPairs, setWrongPairs] = useState<Set<string>>(new Set());
  const [stepAnswers, setStepAnswers] = useState<AnswerRecord[][]>([]);
  const [autoNextCountdown, setAutoNextCountdown] = useState(0);
  const [totalPairAttempts, setTotalPairAttempts] = useState(0);
  const [totalMatchedPairs, setTotalMatchedPairs] = useState(0);
  const [showWrongPairsReview, setShowWrongPairsReview] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoNextRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearAutoNextTimer = useCallback(() => {
    if (autoNextRef.current) {
      clearInterval(autoNextRef.current);
      autoNextRef.current = null;
    }
    setAutoNextCountdown(0);
  }, []);

  const leftItemLayouts = useRef<Record<string, LayoutRectangle>>({});
  const rightItemLayouts = useRef<Record<string, LayoutRectangle>>({});

  const loadFlashcards = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await getFlashcards(materialId, user?.id ? Number(user.id) : undefined);
      const flashcards = response.flashcards || [];
      let normalizedWords = flashcards
        .map((card: any) => ({
          id: String(card.id),
          kanji: card.kanji || '',
          hiragana: card.word || '',
          meaning: card.meaning || '',
          is_learned: card.is_learned,
        }))
        .filter((word: QuizWord) => word.hiragana && word.meaning);
        
      if (dueCardIds && dueCardIds.length > 0) {
        normalizedWords = normalizedWords.filter((word: QuizWord) => dueCardIds.includes(Number(word.id)));
      }
      
      setWords(normalizedWords);
    } catch (error) {
      console.warn('Lỗi lấy dữ liệu quiz:', error);
      setLoadError('Không thể tải dữ liệu quiz từ server.');
    } finally {
      setIsLoading(false);
    }
  }, [materialId, user?.id]);

  useEffect(() => {
    if (materialId <= 0) {
      setLoadError('Material ID không hợp lệ.');
      setIsLoading(false);
      return;
    }
    loadFlashcards();
  }, [materialId, loadFlashcards, reloadToggle]);

  const batchWords = useMemo<QuizWord[]>(() => {
    if (words.length === 0) return [];

    if (nodeType === 'FINAL_BOSS' || nodeType === 'FINAL_EXAM' || nodeType === 'SRS_REVIEW') {
      return shuffle(words).slice(0, Math.min(words.length, 50));
    }

    if (nodeType === 'REVIEW') {
      const chunks = chunkVocabulary(words as any);
      const prevChunk = batchIndex > 0 ? chunks[batchIndex - 1] || [] : [];
      const currentChunk = chunks[batchIndex] || [];
      const combined = [...prevChunk, ...currentChunk] as QuizWord[];
      return shuffle(combined).slice(0, Math.min(combined.length, 25));
    }

    const chunks = chunkVocabulary(words as any);
    const chunk = chunks[batchIndex] || [];
    return chunk as QuizWord[];
  }, [words, nodeType, batchIndex]);

  const effectiveQuizType: QuizType = quizStepType || PRACTICE_STEPS[currentStep] || 'MULTIPLE_CHOICE';

  const questions = useMemo(() => {
    if (nodeType === 'FINAL_BOSS' || nodeType === 'FINAL_EXAM' || nodeType === 'REVIEW') {
      return buildFinalBossQuestions(batchWords, nodeType);
    }
    return buildQuizQuestions(batchWords, effectiveQuizType, batchIndex);
  }, [batchWords, effectiveQuizType, batchIndex, nodeType]);

  // Debug: Log the number of generated questions and the effective quiz type
  // console.log('[useQuizScreen] effectiveQuizType:', effectiveQuizType, 'questions count:', questions?.length);

  // Initialize quiz progress only once when component mounts
  useEffect(() => {
    setCurrentIndex(0);
    setAnswers([]);
  }, []);

  useEffect(() => {
    clearAutoNextTimer();
    setSelectedLeftId(null);
    setSelectedRightId(null);
    setMatchedIds(new Set());
    setWrongPair(false);
    setPairAttempts(0);
    setTotalPairAttempts(0);
    setTotalMatchedPairs(0);
    setMatchRound(0);
    setInputValue('');
    setSelectedOption(null);
    setChosenTileIds([]);
    setIsTimeUp(false);
    setHasSubmitted(false);
    setSelectedAnswer(null);
    // Reset timer for the new question but preserve auto‑next countdown handling
    setTimerSeconds(getTimerForType(effectiveQuizType));
    setFeedbackMessage(null);
    setIsSubmitting(false);
    setShowWrongPairsReview(false);
  }, [currentIndex, questions.length, clearTimer, effectiveQuizType, clearAutoNextTimer]);

  // CRITICAL FIX 2: Loại bỏ hàm completeQuiz chứa lệnh rẽ nhánh tự hủy goBack ngầm.
  // Tiến trình chuyển trang ra Map bây giờ sẽ do file cha QuizScreen điều phối 100%.

  const handleSaveAnswer = useCallback(async (questionIndex: number, question: QuizQuestion, correct: boolean) => {
    const nextAnswers = [...answers];
    const answerRecord: AnswerRecord = {
      wordId: question.word.id,
      type: question.type,
      isCorrect: correct,
      word: question.word,
    };

    if (questionIndex < nextAnswers.length) {
      nextAnswers[questionIndex] = answerRecord;
    } else {
      nextAnswers.push(answerRecord);
    }

    setAnswers(nextAnswers);

    setStepAnswers((prev) => {
      const next = [...prev];
      if (!next[currentStep]) next[currentStep] = [];
      next[currentStep][questionIndex] = answerRecord;
      return next;
    });
  }, [answers, currentStep]);

  const handleCheck = useCallback(async (correct: boolean) => {
    const questionIndex = currentIndex;
    const question = questions[questionIndex];
    if (!question) return;

    setFeedbackMessage(null);
    setIsSubmitting(true);
    setIsCorrect(correct);

    try {
      await handleSaveAnswer(questionIndex, question, correct);
      if (correct && user?.id && materialId > 0) {
        try {
          await updateProgress({
            userId: Number(user.id),
            materialId,
            flashcardId: Number(question.word.id),
          });
        } catch (error) {
          console.warn('Không thể cập nhật tiến độ học flashcard:', error);
        }
      }
    } catch (error) {
      console.error('Error in handleCheck:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [currentIndex, questions, handleSaveAnswer, materialId, user?.id]);

  const handleNextQuestion = useCallback(() => {
    const totalCount = questions.length;
    if (currentIndex + 1 >= totalCount) {
      setShowResult(true);
      return;
    }
    setCurrentIndex((prev) => prev + 1);
  }, [currentIndex, questions.length]);

  const reloadQuiz = useCallback(() => {
    setReloadToggle((prev) => !prev);
  }, []);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const stepScore = useMemo(() => {
    const stepAns = stepAnswers[currentStep] || [];
    const correct = stepAns.filter((item) => item.isCorrect).length;
    return stepAns.length > 0 ? (correct / stepAns.length) * 100 : 0;
  }, [stepAnswers, currentStep]);

  const totalCount = questions.length;
  const questionIndex = totalCount > 0 ? Math.min(currentIndex, totalCount - 1) : 0;
  const currentQuestion = questions[questionIndex];
  const currentWord = currentQuestion?.word ?? null;
  const activeType = currentQuestion?.type;
  const correctCount = answers.filter((item) => item.isCorrect).length;
  const score = totalCount ? (correctCount / totalCount) * 100 : 0;
  const isBoss = nodeType === 'FINAL_BOSS' || nodeType === 'FINAL_EXAM';

  const tiles = useMemo(() => {
    if (!currentWord || !currentWord.hiragana || activeType !== 'SCRAMBLED_HIRA') return [];

    const chars = currentWord.hiragana.split('');
    const noiseCount = Math.floor(Math.random() * 2) + 4;
    const hiraganaAlphabet = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめ moやゆよらりるれろわをん";
    const noiseChars = [];
    for (let i = 0; i < noiseCount; i++) {
      noiseChars.push(hiraganaAlphabet[Math.floor(Math.random() * hiraganaAlphabet.length)]);
    }

    return [...chars, ...noiseChars]
      .map((char, index) => ({ id: `${index}-${char}`, char }))
      .sort(() => Math.random() - 0.5);
  }, [currentWord, activeType]);

  const selectedScrambledChars = useMemo(
    () => chosenTileIds.map((id) => tiles.find((tile) => tile.id === id)?.char ?? ''),
    [chosenTileIds, tiles]
  );

  const matchWords = useMemo<QuizWord[]>(() => {
    if (!currentQuestion || (activeType !== 'MATCH_MEANING' && activeType !== 'MATCH_HIRA')) return [];
    return currentQuestion.pool ? currentQuestion.pool : shuffle(batchWords);
  }, [currentQuestion, batchWords, activeType]);

  const matchRoundCount = matchWords.length < 7 ? 1 : 2;
  const currentMatchWords = useMemo<QuizWord[]>(() => {
    if (matchWords.length === 0) return [];
    
    let base: QuizWord[] = [];
    if (matchRoundCount === 1) {
      base = matchWords;
    } else if (matchWords.length <= 1) {
      base = matchWords;
    } else {
      const half = Math.ceil(matchWords.length / 2);
      base = matchRound === 0 ? matchWords.slice(0, half) : matchWords.slice(half);
    }

    if (base.length < 3) {
      const padded = [...base];
      // 1. Lấy từ các từ khác của bộ thẻ hiện tại (words) mà không nằm trong base
      const otherWordsInMaterial = words.filter((w) => !padded.some((p) => p.id === w.id));
      let otherIdx = 0;
      while (padded.length < 3 && otherIdx < otherWordsInMaterial.length) {
        padded.push(otherWordsInMaterial[otherIdx]);
        otherIdx++;
      }

      // 2. Nếu vẫn thiếu (ví dụ bộ thẻ chỉ có 1 hoặc 2 từ tổng cộng), lấy từ danh sách DEFAULT_DISTRACTORS
      let defIdx = 0;
      while (padded.length < 3 && defIdx < DEFAULT_DISTRACTORS.length) {
        const dist = DEFAULT_DISTRACTORS[defIdx];
        if (!padded.some((p) => p.id === dist.id)) {
          padded.push(dist);
        }
        defIdx++;
      }
      return padded;
    }

    return base;
  }, [matchRound, matchWords, matchRoundCount, words]);

  const currentMatchRightItems = useMemo(
    () =>
      currentMatchWords.length > 0
        ? shuffle(currentMatchWords).map((word) => ({
          id: word.id,
          label: activeType === 'MATCH_HIRA' ? word.hiragana : word.meaning,
        }))
        : [],
    [currentMatchWords, activeType]
  );

  const pairedLeftIds = useMemo(() => new Set(Object.keys(pairAssignments)), [pairAssignments]);
  const pairedRightIds = useMemo(() => new Set(Object.values(pairAssignments)), [pairAssignments]);

  const isMatchMode = activeType === 'MATCH_MEANING' || activeType === 'MATCH_HIRA';

  const hasShownMatchRuleAlert = useRef(false);

  useEffect(() => {
    if (isMatchMode && matchRound === 0 && !hasShownMatchRuleAlert.current) {
      hasShownMatchRuleAlert.current = true;
      showAlert(
        'Luật chơi ghép cặp',
        'Bạn có 3 cơ hội ghép sai. Nếu sai quá 3 lần, bạn sẽ bị trừ 1 tim nhé!',
        [{ text: 'Đã hiểu' }],
        'info'
      );
    }
  }, [isMatchMode, matchRound, showAlert]);

  const stepProgress = isMatchMode ? (matchRound / matchRoundCount) * 100 : (totalCount ? (questionIndex / totalCount) * 100 : 0);
  const totalMatchCount = matchWords.length;
  const isMatchComplete = isMatchMode && currentMatchWords.length > 0 && Object.keys(pairAssignments).length === currentMatchWords.length;
  const currentBatchMatchScore = pairAttempts === 0 ? 0 : Math.round((matchedIds.size / pairAttempts) * 100);
  const overallMatchScore = totalPairAttempts === 0 ? 0 : Math.round((totalMatchedPairs / totalPairAttempts) * 100);

  const isTimerRunning = !showResult && isCorrect === null && !hasSubmitted;

  useEffect(() => {
    if (!isTimerRunning) {
      clearTimer();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimer();
    };
  }, [isTimerRunning, clearTimer, currentIndex]);

  const handleCheckAnswer = useCallback(async (correct: boolean, answer: string | null) => {
    if (hasSubmitted) return;

    clearTimer();
    setHasSubmitted(true);
    setIsTimeUp(timerSeconds === 0);
    setSelectedAnswer(answer);
    setFeedbackMessage((prev) => prev || (timerSeconds === 0 ? 'Hết giờ!' : null));

    await handleCheck(correct);
  }, [clearTimer, handleCheck, hasSubmitted, timerSeconds]);

  const evaluateMatchRound = useCallback(
    async (force = false) => {
      if (!isMatchComplete && !force) return;
      if (hasSubmitted) return;
      setHasSubmitted(true);

      const nextWrongPairs = new Set<string>();
      const nextMatchedIds = new Set<string>();
      let correctCount = 0;

      currentMatchWords.forEach((leftWord) => {
        const rightId = pairAssignments[leftWord.id];
        const rightWord = currentMatchWords.find((word) => word.id === rightId);
        const isMatched = rightWord
          ? activeType === 'MATCH_HIRA'
            ? leftWord.hiragana === rightWord.hiragana
            : leftWord.meaning === rightWord.meaning
          : false;

        if (isMatched) {
          correctCount += 1;
          nextMatchedIds.add(leftWord.id);
        } else {
          nextWrongPairs.add(`${leftWord.id}_||_${rightId ?? 'NONE'}`);
        }
      });

      const score = currentMatchWords.length > 0
        ? Math.round((correctCount / currentMatchWords.length) * 100)
        : 0;

      const hasErrors = nextWrongPairs.size > 0;
      const passed = score >= 80;

      if (hasErrors) {
        const nextAttempts = matchAttempts + 1;
        setMatchAttempts(nextAttempts);

        if (nextAttempts >= 3) {
          // nextAttempts >= 3
          let remainingHearts = -1;
          if (deductHeartOnFailure) {
            try {
              remainingHearts = await deductHeartOnFailure();
            } catch (err) {
              console.warn('Lỗi trừ tim khi nối sai:', err);
            }
          }
          // Only show alert if hearts are NOT depleted to avoid
          // two Modal components stacking (OutOfHeartsInterceptor handles 0 hearts)
          if (remainingHearts > 0 || remainingHearts === -1) {
            showAlert(
              'Thông báo',
              'Bạn đã nối sai 3 lần! Bạn bị trừ 1 tim.',
              [{ text: 'OK' }],
              'warning'
            );
          }
          
          setWrongPairs(nextWrongPairs);
          setMatchedIds(nextMatchedIds);
          setMatchRoundScore(score);
          setIsCorrect(passed);
          return;
        }

        // CẢI TIẾN: Chỉ đánh dấu sai và xoá các cặp sai thay vì kết thúc ván nếu chưa quá 3 lần
        if (nextAttempts < 3) {
          setMatchedIds(nextMatchedIds); // <-- Quan trọng: cập nhật cặp đúng
          setWrongPairs(nextWrongPairs);
          // Wait 1.5s then clear the wrong pairs so user can try again
          setTimeout(() => {
            setPairAssignments(prev => {
              const next = { ...prev };
              nextWrongPairs.forEach(wp => {
                const leftId = wp.split('_||_')[0];
                delete next[leftId];
              });
              return next;
            });
            setWrongPairs(new Set());
            setHasSubmitted(false); // <--- QUAN TRỌNG: Mở khóa tương tác
          }, 1500);
          return; // Do NOT submit yet
        }
      } else {
        setMatchAttempts(0);
        setWrongPairs(nextWrongPairs);
        setMatchedIds(nextMatchedIds);
        setMatchRoundScore(score);
        setIsCorrect(passed);
        setFeedbackMessage(passed ? 'Đạt yêu cầu!' : 'Chưa đạt 80%, làm lại đợt này nhé.');

        if (passed && matchRound === matchRoundCount - 1) {
          handleCheckAnswer(true, 'MATCH_COMPLETE');
        }
      }
    },
    [activeType, currentMatchWords, isMatchComplete, pairAssignments, handleCheckAnswer, matchRound, matchRoundCount, matchAttempts, deductHeartOnFailure, showAlert, hasSubmitted],
  );

  const handleTimerExpire = useCallback(async () => {
    if (!isTimerRunning || hasSubmitted) return;

    setIsTimeUp(true);
    setFeedbackMessage('Hết giờ!');

    if (isMatchMode) {
      evaluateMatchRound(true);
      return;
    }

    if (!currentQuestion) {
      await handleCheckAnswer(false, null);
      return;
    }

    switch (currentQuestion.type) {
      case 'WRITE_HIRA': {
        const answer = inputValue.trim();
        const correct = answer.toLowerCase() === currentQuestion.word.hiragana.toLowerCase();
        await handleCheckAnswer(correct, answer);
        break;
      }
      case 'SCRAMBLED_HIRA': {
        const answer = selectedScrambledChars.join('');
        const correct = answer === currentQuestion.word.hiragana;
        await handleCheckAnswer(correct, answer);
        break;
      }
      case 'MULTIPLE_CHOICE': {
        const correct = selectedOption === currentQuestion.correctAnswer;
        await handleCheckAnswer(correct, selectedOption);
        break;
      }
      default:
        await handleCheckAnswer(false, null);
    }
  }, [currentQuestion, evaluateMatchRound, handleCheckAnswer, isMatchMode, isTimerRunning, hasSubmitted, inputValue, selectedOption, selectedScrambledChars]);

  useEffect(() => {
    if (timerSeconds !== 0 || !isTimerRunning) return;
    handleTimerExpire();
  }, [handleTimerExpire, isTimerRunning, timerSeconds]);

  useEffect(() => {
    clearAutoNextTimer();

    // CRITICAL FIX 3: Ngăn chặn bộ hẹn giờ đếm ngược chạy ngầm khi màn hình kết quả đã mở ra
    if (isCorrect === null || showResult || isMatchMode) {
      return;
    }

    setAutoNextCountdown(3);
    autoNextRef.current = setInterval(() => {
      setAutoNextCountdown((prev) => {
        if (prev <= 1) {
          clearAutoNextTimer();
          handleNextQuestion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearAutoNextTimer();
    };
  }, [isCorrect, showResult, isMatchMode, handleNextQuestion, clearAutoNextTimer, currentIndex]);

  const resetCurrentMatchBatch = useCallback(() => {
    setMatchedIds(new Set());
    setWrongPairs(new Set());
    setWrongPair(false);
    setPairAssignments({});
    setPairAttempts(0);
    setMatchAttempts(0);
    setMatchRoundScore(0);
    setHasSubmitted(false);
    setIsTimeUp(false);
    setIsCorrect(null);
    setSelectedAnswer(null);
    setSelectedLeftId(null);
    setSelectedRightId(null);
    setFeedbackMessage(null);
    setTimerSeconds(getTimerForType(effectiveQuizType));
  }, [effectiveQuizType]);

  const resetMatchStateForQuestion = useCallback(() => {
    setMatchRound(0);
    setMatchedIds(new Set());
    setWrongPairs(new Set());
    setWrongPair(false);
    setPairAssignments({});
    setPairAttempts(0);
    setMatchAttempts(0);
    setTotalPairAttempts(0);
    setTotalMatchedPairs(0);
    setMatchRoundScore(0);
    setHasSubmitted(false);
    setIsTimeUp(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setSelectedLeftId(null);
    setSelectedRightId(null);
    setFeedbackMessage(null);
    setTimerSeconds(getTimerForType(effectiveQuizType));
  }, [effectiveQuizType]);

  const proceedAfterReview = useCallback(() => {
    setShowWrongPairsReview(false);
    if (isCorrect) {
      if (matchRound + 1 < matchRoundCount) {
        setMatchRound((prev) => prev + 1);
        resetCurrentMatchBatch();
      } else {
        setShowResult(true);
      }
    } else {
      resetMatchStateForQuestion();
    }
  }, [isCorrect, matchRound, matchRoundCount, resetCurrentMatchBatch, resetMatchStateForQuestion]);

  const handleContinueQuestion = useCallback(async (skipReview?: boolean | any) => {
    const shouldSkipReview = skipReview === true;

    if (isMatchMode && hasSubmitted) {
      if (!shouldSkipReview && wrongPairs.size > 0) {
        setShowWrongPairsReview(true);
        return;
      }

      if (isCorrect) {
        if (matchRound + 1 < matchRoundCount) {
          setMatchRound((prev) => prev + 1);
          resetCurrentMatchBatch();
          return;
        }
        if (currentQuestion) {
          await handleSaveAnswer(currentIndex, currentQuestion, true);
        }
        setShowResult(true);
        return;
      }

      if (currentQuestion) {
        await handleSaveAnswer(currentIndex, currentQuestion, false);
      }
      setShowResult(true);
      return;
    }
    handleNextQuestion();
  }, [currentIndex, currentQuestion, handleNextQuestion, handleSaveAnswer, hasSubmitted, isCorrect, isMatchMode, matchRound, matchRoundCount, resetCurrentMatchBatch, wrongPairs.size]);

  const handleRetry = useCallback(() => {
    setCurrentIndex(0);
    setAnswers([]);
    setShowResult(false);
    setResumeIndex(0);
    setResumeAnswers([]);
    setMatchRound(0);
    resetMatchStateForQuestion();
    setStepAnswers((prev) => {
      const next = [...prev];
      next[currentStep] = [];
      return next;
    });
  }, [currentStep, resetMatchStateForQuestion]);

  const multipleChoiceOptions = useMemo(() => {
    if (!currentQuestion || currentQuestion.type !== 'MULTIPLE_CHOICE') return [];
    return currentQuestion.options ?? buildMultipleChoiceOptions(currentWord!, batchWords);
  }, [currentQuestion, currentWord, batchWords]);

  const matchScore = matchRoundScore;
  const displayScore = isMatchMode ? matchScore : stepScore;
  const resultCorrectCount = isMatchMode ? matchedIds.size : correctCount;
  const resultTotalCount = isMatchMode ? currentMatchWords.length : totalCount;

  const submitMatchAnswer = useCallback(() => {
    evaluateMatchRound(false);
  }, [evaluateMatchRound]);

  const checkInputAnswer = useCallback(() => {
    if (!currentWord?.hiragana) return;
    const answer = inputValue.trim();
    const isCorrectAnswer = answer.toLowerCase() === currentWord.hiragana.toLowerCase();
    handleCheckAnswer(isCorrectAnswer, answer);
  }, [currentWord, inputValue, handleCheckAnswer]);

  const verifyScrambled = useCallback(() => {
    if (!currentWord?.hiragana) return;
    const answer = selectedScrambledChars.join('');
    handleCheckAnswer(answer === currentWord.hiragana, answer);
  }, [currentWord, selectedScrambledChars, handleCheckAnswer]);

  const handleChoiceAnswer = useCallback(() => {
    if (!currentQuestion?.correctAnswer) return;
    handleCheckAnswer(selectedOption === currentQuestion.correctAnswer, selectedOption);
  }, [currentQuestion, selectedOption, handleCheckAnswer]);

  const handlePairSelection = useCallback(
    (leftId: string, rightId: string) => {
      if (hasSubmitted || wrongPairs.size > 0) return;

      if (rightId === 'UNLINK' || rightId.startsWith('UNLINK_RIGHT:')) {
        setPairAssignments((prev) => {
          const next = { ...prev };
          delete next[leftId];
          return next;
        });
        return;
      }

      if (pairAssignments[leftId] || pairedRightIds.has(rightId)) return;
      const leftWord = currentMatchWords.find((word) => word.id === leftId);
      const rightWord = currentMatchWords.find((word) => word.id === rightId);
      if (!leftWord || !rightWord) return;

      setPairAssignments((prev) => ({ ...prev, [leftId]: rightId }));
      setPairAttempts((prev) => prev + 1);
      setTotalPairAttempts((prev) => prev + 1);
      setWrongPair(false);
      setSelectedLeftId(null);
      setSelectedRightId(null);
    },
    [currentMatchWords, pairAssignments, pairedRightIds, hasSubmitted, wrongPairs.size],
  );

  const handleResetMatchState = useCallback(() => {
    resetMatchStateForQuestion();
    setIsCorrect(null);
  }, [resetMatchStateForQuestion]);

  const showMatchAnswers = useCallback(() => {
    const correctAssignments: Record<string, string> = {};
    const correctIds = new Set<string>();

    currentMatchWords.forEach((word) => {
      correctAssignments[word.id] = word.id;
      correctIds.add(word.id);
    });

    setPairAssignments(correctAssignments);
    setWrongPairs(new Set());
    setMatchedIds(correctIds);
    setHasSubmitted(true);
  }, [currentMatchWords]);

  // CRITICAL FIX 4: Thay đổi cơ chế chuyển Step. Khi hoàn thành toàn bộ bài,
  // hook CHỈ làm duy nhất một việc là chuyển trạng thái showResult sang TRUE.
  // Tuyệt đối không tự kích hoạt navigation sang màn hình khác.
  const handleContinue = useCallback(async () => {
    const threshold = isMatchMode ? 70 : 80;
    if (!quizStepType && currentStep < PRACTICE_STEPS.length - 1 && stepScore < threshold) {
      return;
    }

    if (!quizStepType && currentStep < PRACTICE_STEPS.length - 1) {
      if (user?.id && materialId > 0) {
        try {
          await syncStudy({
            userId: user.id,
            materialId,
            currentNodeIndex: currentNodeIndex,
            sessionId,
            quizStepType: PRACTICE_STEPS[currentStep],
            stepScore: stepScore,
            nodeCompleted: true,
          });
        } catch (error) {
          console.warn('Lỗi lưu tiến độ step:', error);
        }
      }

      setCurrentStep((prev) => prev + 1);
      setCurrentIndex(0);
      setAnswers([]);
      setShowResult(false);
      setResumeIndex(0);
      setResumeAnswers([]);
    } else {
      // Khi học xong bài test cuối cùng, gán biến cờ kết quả để file cha xử lý
      setShowResult(true);
    }
  }, [quizStepType, currentStep, answers, questions.length, stepScore, user?.id, materialId, currentNodeIndex, sessionId, isMatchMode, matchScore]);

  return {
    isLoading,
    loadError,
    questions,
    currentIndex,
    answers,
    isCorrect,
    showResult,
    selectedLeftId,
    selectedRightId,
    matchedIds,
    wrongPair,
    matchingContainerHeight,
    inputValue,
    selectedOption,
    chosenTileIds,
    leftItemLayouts,
    rightItemLayouts,
    setMatchingContainerHeight,
    setIsCorrect,
    setSelectedLeftId,
    setSelectedRightId,
    setInputValue,
    setSelectedOption,
    setChosenTileIds,
    handleCancel,
    handleNextQuestion,
    handleContinueQuestion,
    handleRetry,
    handleContinue,
    reloadQuiz,
    completedQuiz: showResult,
    currentWord,
    activeType,
    stepProgress,
    questionIndex,
    totalCount,
    isBoss,
    correctCount,
    score,
    displayScore,
    resultCorrectCount,
    resultTotalCount,
    matchWords,
    matchRightItems: currentMatchRightItems,
    currentMatchWords,
    currentMatchRightItems,
    multipleChoiceOptions,
    selectedScrambledChars,
    tiles,
    remainingSeconds: timerSeconds,
    isMatchMode,
    isTimeUp,
    hasSubmitted,
    selectedAnswer,
    matchRound,
    matchRoundCount,
    handleCheck,
    handlePairSelection,
    submitMatchAnswer,
    isMatchComplete,
    matchScore,
    wrongPairs,
    pairAssignments,
    checkInputAnswer,
    verifyScrambled,
    handleChoiceAnswer,
    handleResetMatchState,
    feedbackMessage,
    isSubmitting,
    canContinue: (isMatchMode ? matchScore : stepScore) >= 70,
    autoNextCountdown,
    showWrongPairsReview,
    setShowWrongPairsReview,
    proceedAfterReview,
    showMatchAnswers,
  };
}