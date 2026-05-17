import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutRectangle } from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../components/AppNavigator';
import { getFlashcards, updateProgress, saveQuizAnswer, completeQuizNode, syncStudy, getQuizProgress } from '../api/api';
import type { QuizType, QuizWord, AnswerRecord } from '../components/quiz/types';

// Utility function to shuffle array
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
  sessionId?: string;
  user?: { id?: string | number };
  navigation: StackNavigationProp<RootStackParamList, 'Quiz'>;
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
  handleContinueQuestion: () => void;
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
};

const CHUNK_SIZE = 10;
const MATCH_BATCH_SIZE = 5;
const PRACTICE_STEPS: QuizType[] = ['MATCH_HIRA', 'MATCH_MEANING', 'MULTIPLE_CHOICE', 'SCRAMBLED_HIRA', 'WRITE_HIRA'];

function getTimerForType(type: QuizType): number {
  switch (type) {
    case 'MATCH_HIRA':
    case 'MATCH_MEANING':
      return 20;
    case 'MULTIPLE_CHOICE':
      return 8;
    case 'SCRAMBLED_HIRA':
      return 10;
    case 'WRITE_HIRA':
      return 12;
    default:
      return 20;
  }
}

function buildMultipleChoiceOptions(word: QuizWord, pool: QuizWord[]) {
  const distractors = shuffle(pool.filter((item) => item.id !== word.id)).slice(0, 3);
  return shuffle([word.meaning, ...distractors.map((item) => item.meaning)]);
}

function buildFinalBossQuestions(words: QuizWord[], min = 25, max = 30): QuizQuestion[] {
  const count = Math.max(min, Math.min(max, Math.max(min, words.length)));
  const questions: QuizQuestion[] = [];

  const createQuestion = (word: QuizWord): QuizQuestion => {
    const type = PRACTICE_STEPS[Math.floor(Math.random() * PRACTICE_STEPS.length)];
    const question: QuizQuestion = {
      word,
      type,
      batchIndex: 0,
    };

    if (type === 'MATCH_MEANING' || type === 'MATCH_HIRA') {
      question.pool = shuffle(words);
    }

    if (type === 'MULTIPLE_CHOICE') {
      question.options = buildMultipleChoiceOptions(word, words);
      question.correctAnswer = word.meaning;
    }

    return question;
  };

  words.forEach((word) => {
    questions.push(createQuestion(word));
  });

  while (questions.length < count) {
    const word = words[Math.floor(Math.random() * words.length)];
    questions.push(createQuestion(word));
  }

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
  sessionId,
  user,
  navigation,
}: UseQuizScreenParams): UseQuizScreenResult {
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
      const normalizedWords = flashcards
        .map((card: any) => ({
          id: String(card.id),
          kanji: card.kanji || '',
          hiragana: card.word || '',
          meaning: card.meaning || '',
        }))
        .filter((word: QuizWord) => word.hiragana && word.meaning);
      setWords(normalizedWords);
    } catch (error) {
      console.warn('Lỗi lấy dữ liệu quiz:', error);
      setLoadError('Không thể tải dữ liệu quiz từ server.');
    } finally {
      setIsLoading(false);
    }
  }, [materialId]);

  useEffect(() => {
    if (materialId <= 0) {
      setLoadError('Material ID không hợp lệ.');
      setIsLoading(false);
      return;
    }
    loadFlashcards();
  }, [materialId, loadFlashcards, reloadToggle]);

  const batchWords = useMemo(() => {
    if (words.length === 0) return [];

    if (nodeType === 'MINI_QUIZ') {
      const start = batchIndex * CHUNK_SIZE;
      return words.slice(start, start + CHUNK_SIZE);
    }

    if (nodeType === 'REVIEW') {
      return words.slice(0, Math.min(words.length, 25));
    }

    if (nodeType === 'FINAL_BOSS' || nodeType === 'FINAL_EXAM') {
      return shuffle(words).slice(0, Math.min(words.length, 30));
    }

    return words;
  }, [words, nodeType, batchIndex]);

  const effectiveQuizType: QuizType = PRACTICE_STEPS[currentStep] || 'MULTIPLE_CHOICE';

  const questions = useMemo(() => {
    if (nodeType === 'FINAL_BOSS' || nodeType === 'FINAL_EXAM') {
      return buildFinalBossQuestions(batchWords);
    }
    return buildQuizQuestions(batchWords, effectiveQuizType, batchIndex);
  }, [batchWords, effectiveQuizType, batchIndex, nodeType]);

  const loadQuizProgress = useCallback(async () => {
    if (!user?.id || materialId <= 0 || !quizStepType) return;

    try {
      const response = await getQuizProgress({
        userId: Number(user.id),
        materialId,
        batchIndex,
        quizStepType,
      });

      const answered = (response.answers || []).filter(
        (item: { questionIndex: number; isCorrect: boolean }) =>
          item.questionIndex >= 0 && item.questionIndex < questions.length
      );

      const filledAnswers = answered.map((item: any) => ({
        wordId: questions[item.questionIndex].word.id,
        type: questions[item.questionIndex].type,
        isCorrect: item.isCorrect,
        word: questions[item.questionIndex].word,
      }));

      const nextIndex = answered.reduce((index: number, item: any) => Math.max(index, item.questionIndex + 1), 0);
      setResumeAnswers(filledAnswers);
      setResumeIndex(Math.min(nextIndex, questions.length));
    } catch (error) {
      console.warn('Lỗi lấy tiến độ quiz:', error);
    }
  }, [user?.id, materialId, batchIndex, quizStepType, questions]);

  useEffect(() => {
    if (!questions.length) return;
    loadQuizProgress();
  }, [questions, loadQuizProgress]);

  useEffect(() => {
    setCurrentIndex(resumeIndex);
    setAnswers(resumeAnswers);
  }, [resumeIndex, resumeAnswers]);

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
    setTimerSeconds(getTimerForType(effectiveQuizType));
    setFeedbackMessage(null);
    setIsSubmitting(false);
  }, [currentIndex, questions.length, clearTimer, effectiveQuizType, clearAutoNextTimer]);

  const onSaveAnswerInternal = useCallback(async (questionIndex: number, question: QuizQuestion, isCorrectValue: boolean) => {
    if (!user?.id || materialId <= 0 || !quizStepType) return;

    try {
      await saveQuizAnswer({
        userId: Number(user.id),
        materialId,
        batchIndex,
        questionIndex,
        quizStepType,
        isCorrect: isCorrectValue,
      });
    } catch (error) {
      console.warn('Lỗi lưu câu hỏi quiz:', error);
    }
  }, [user?.id, materialId, batchIndex, quizStepType]);

  const completeQuiz = useCallback(async (result: { answers: AnswerRecord[]; correctCount: number; totalCount: number }) => {
    if (!user?.id || materialId <= 0) {
      navigation.goBack();
      return;
    }

    try {
      await completeQuizNode({
        userId: Number(user.id),
        materialId,
        nodeId,
        sessionType: quizStepType || nodeType || 'QUIZ',
        batchIndex,
        totalQuestions: result.totalCount,
        correctAnswers: result.correctCount,
      });
    } catch (error) {
      console.warn('Lỗi hoàn thành quiz:', error);
    }

    try {
      await syncStudy({
        userId: user.id,
        materialId,
        currentNodeIndex: typeof currentNodeIndex === 'number' ? currentNodeIndex + 1 : undefined,
        sessionId,
      });
    } catch (error) {
      console.warn('Lỗi đồng bộ lộ trình sau khi hoàn thành quiz:', error);
    }

    navigation.navigate('StudyJourney', {
      materialId,
      completedNodeId: nodeId,
    });
  }, [user?.id, materialId, nodeId, quizStepType, nodeType, batchIndex, currentNodeIndex, sessionId, navigation]);

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

    // Cập nhật stepAnswers
    setStepAnswers((prev) => {
      const next = [...prev];
      if (!next[currentStep]) next[currentStep] = [];
      next[currentStep][questionIndex] = answerRecord;
      return next;
    });

    await onSaveAnswerInternal(questionIndex, question, correct);
  }, [answers, currentStep, onSaveAnswerInternal]);

  const handleCheck = useCallback(async (correct: boolean) => {
    console.log('handleCheck called with correct:', correct);
    const questionIndex = currentIndex;
    const question = questions[questionIndex];
    if (!question) return;

    setFeedbackMessage(null);
    setIsSubmitting(true);
    console.log('Setting isCorrect to:', correct);
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
    console.log('handleNextQuestion called, currentIndex:', currentIndex, 'totalCount:', questions.length);
    const totalCount = questions.length;
    if (currentIndex + 1 >= totalCount) {
      console.log('Setting showResult to true');
      setShowResult(true);
      return;
    }
    console.log('Setting currentIndex to:', currentIndex + 1);
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

  const handleContinue = useCallback(async () => {
    if (currentStep < PRACTICE_STEPS.length - 1 && stepScore < 80) {
      return;
    }

    if (currentStep < PRACTICE_STEPS.length - 1) {
      // Lưu tiến độ step hiện tại trước khi chuyển
      if (user?.id && materialId > 0) {
        try {
          await syncStudy({
            userId: user.id,
            materialId,
            currentNodeIndex: currentNodeIndex,
            sessionId,
            quizStepType: PRACTICE_STEPS[currentStep],
            stepScore: stepScore,
          });
        } catch (error) {
          console.warn('Lỗi lưu tiến độ step:', error);
        }
      }

      // Chuyển sang step tiếp theo
      setCurrentStep((prev) => prev + 1);
      setCurrentIndex(0);
      setAnswers([]);
      setShowResult(false);
      setResumeIndex(0);
      setResumeAnswers([]);
    } else {
      // Hoàn thành tất cả steps
      completeQuiz({
        answers,
        correctCount: answers.filter((item) => item.isCorrect).length,
        totalCount: questions.length,
      });
    }
  }, [currentStep, answers, completeQuiz, questions.length, stepScore, user?.id, materialId, currentNodeIndex, sessionId]);

  const totalCount = questions.length;
  const questionIndex = totalCount > 0 ? Math.min(currentIndex, totalCount - 1) : 0;
  const currentQuestion = questions[questionIndex];
  const currentWord = currentQuestion?.word ?? null;
  const activeType = currentQuestion?.type;
  const correctCount = answers.filter((item) => item.isCorrect).length;
  const score = totalCount ? (correctCount / totalCount) * 100 : 0;
  const stepProgress = totalCount ? (questionIndex / totalCount) * 100 : 0;
  const isBoss = nodeType === 'FINAL_BOSS' || nodeType === 'FINAL_EXAM';

  const tiles = useMemo(() => {
    if (!currentWord || !currentWord.hiragana || activeType !== 'SCRAMBLED_HIRA') return [];
    return currentWord.hiragana
      .split('')
      .map((char, index) => ({ id: `${index}-${char}`, char }))
      .sort(() => Math.random() - 0.5);
  }, [currentWord, activeType]);

  const selectedScrambledChars = useMemo(
    () => chosenTileIds.map((id) => tiles.find((tile) => tile.id === id)?.char ?? ''),
    [chosenTileIds, tiles]
  );

  const matchWords = useMemo(() => {
    if (!currentQuestion || (activeType !== 'MATCH_MEANING' && activeType !== 'MATCH_HIRA')) return [];
    return currentQuestion.pool ? currentQuestion.pool : shuffle(batchWords);
  }, [currentQuestion, batchWords, activeType]);

  const matchRoundCount = Math.max(1, Math.ceil(matchWords.length / MATCH_BATCH_SIZE));
  const currentMatchWords = useMemo(
    () => matchWords.slice(matchRound * MATCH_BATCH_SIZE, (matchRound + 1) * MATCH_BATCH_SIZE),
    [matchRound, matchWords]
  );

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
  const totalMatchCount = matchWords.length;
  const isMatchComplete = isMatchMode && currentMatchWords.length > 0 && Object.keys(pairAssignments).length === currentMatchWords.length;
  const currentBatchMatchScore =
    pairAttempts === 0 ? 0 : Math.round((matchedIds.size / pairAttempts) * 100);
  const overallMatchScore = totalPairAttempts === 0 ? 0 : Math.round((totalMatchedPairs / totalPairAttempts) * 100);

  const isTimerRunning = !showResult && isCorrect === null && !hasSubmitted;

  console.log('useQuizScreen isTimerRunning:', isTimerRunning, 'timerSeconds:', timerSeconds, 'isCorrect:', isCorrect, 'hasSubmitted:', hasSubmitted);

  useEffect(() => {
    console.log('Timer useEffect running, isTimerRunning:', isTimerRunning);
    if (!isTimerRunning) {
      clearTimer();
      return;
    }

    console.log('Setting timer interval');
    timerRef.current = setInterval(() => {
      console.log('Timer tick, current timerSeconds:', timerSeconds);
      setTimerSeconds((prev) => {
        console.log('setTimerSeconds prev:', prev);
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      console.log('Cleaning up timer');
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
    (force = false) => {
      if (!isMatchComplete && !force) return;

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
          nextWrongPairs.add(`${leftWord.id}-${rightId ?? 'NONE'}`);
        }
      });

      const score = currentMatchWords.length > 0
        ? Math.round((correctCount / currentMatchWords.length) * 100)
        : 0;

      const passed = score >= 80;

      setWrongPairs(nextWrongPairs);
      setMatchedIds(nextMatchedIds);
      setMatchRoundScore(score);
      setHasSubmitted(true);
      setIsCorrect(passed);
      setFeedbackMessage(passed ? 'Đạt yêu cầu!' : 'Chưa đạt 80%, làm lại đợt này nhé.');

      if (passed && matchRound === matchRoundCount - 1) {
        handleCheckAnswer(true, 'MATCH_COMPLETE');
      }
    },
    [activeType, currentMatchWords, isMatchComplete, pairAssignments, handleCheckAnswer, matchRound, matchRoundCount],
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

  // Auto-next countdown: Sau 3 giây khi hiển thị đáp án, tự động chuyển câu
  useEffect(() => {
    clearAutoNextTimer();
    
    if (isCorrect === null || showResult || isMatchMode) {
      return;
    }

    // Bắt đầu countdown 3 giây
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
  }, [isCorrect, showResult, isMatchMode, handleNextQuestion, clearAutoNextTimer]);

  const resetCurrentMatchBatch = useCallback(() => {
    setMatchedIds(new Set());
    setWrongPairs(new Set());
    setWrongPair(false);
    setPairAssignments({});
    setPairAttempts(0);
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

  const handleContinueQuestion = useCallback(async () => {
    if (isMatchMode && hasSubmitted) {
      if (isCorrect) {
        if (matchRound + 1 < matchRoundCount) {
          setMatchRound((prev) => prev + 1);
          resetCurrentMatchBatch();
          return;
        }

        if (currentQuestion) {
          const existingAnswer = answers[currentIndex];
          if (!existingAnswer || existingAnswer.wordId !== currentQuestion.word.id) {
            await handleSaveAnswer(currentIndex, currentQuestion, true);
          }
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
  }, [
    answers,
    currentIndex,
    currentQuestion,
    handleNextQuestion,
    handleSaveAnswer,
    hasSubmitted,
    isCorrect,
    isMatchMode,
    matchRound,
    matchRoundCount,
    resetCurrentMatchBatch,
  ]);

  const resetMatchStateForQuestion = useCallback(() => {
    setMatchRound(0);
    setMatchedIds(new Set());
    setWrongPairs(new Set());
    setWrongPair(false);
    setPairAssignments({});
    setPairAttempts(0);
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
    [currentMatchWords, pairAssignments, pairedRightIds],
  );

  const handleResetMatchState = useCallback(() => {
    resetMatchStateForQuestion();
    setIsCorrect(null);
  }, [resetMatchStateForQuestion]);

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
    canContinue: stepScore >= 80,
    autoNextCountdown,
  };
}
