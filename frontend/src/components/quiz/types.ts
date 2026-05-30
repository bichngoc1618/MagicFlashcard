export type QuizType = 'MATCH_MEANING' | 'MATCH_HIRA' | 'MULTIPLE_CHOICE' | 'WRITE_HIRA' | 'SCRAMBLED_HIRA' | 'LISTENING' | 'TRUE_FALSE' | 'MEMORY_CARD' | 'PRACTICE_1' | 'PRACTICE_2' | 'PRACTICE_3' | 'FINAL_BOSS';

export type QuizWord = {
  id: string;
  kanji: string;
  hiragana: string;
  meaning: string;
  is_learned?: number;
};

export type Tile = {
  id: string;
  char: string;
};

export type Connection = {
  start: { x: number; y: number };
  end: { x: number; y: number };
  rightId: string;
};

export type AnswerRecord = {
  wordId: string;
  type: QuizType;
  isCorrect: boolean;
  word: QuizWord;
  userRightId?: string;
  rightItemsOrder?: { id: string; label: string }[];
  leftItemsOrder?: QuizWord[];
  activeDebuff?: 'DOUBLE_DAMAGE' | 'FREEZE' | null;
};

export type QuizQuestion = {
  word: QuizWord;
  type: QuizType;
  batchIndex: number;
  pool?: QuizWord[];
  options?: string[];
  correctAnswer?: string;
  promptType?: string;
};
export interface QuizUIProps {
  activeType: QuizType;
  currentWord: QuizWord;
  // SỬA DÒNG NÀY: Phải có (correct: boolean)
  onCheck: (correct: boolean) => void; 
  onNext: () => void;
  onTimerExpire: () => void;
  timerKey: string;
  isCorrect: boolean | null;
  questionIndex: number;
  totalQuestionCount: number;
  promptType?: string;
  correctAnswer?: string;
}