import AsyncStorage from '@react-native-async-storage/async-storage';

export type DeckProgress = {
  currentActiveNodeIndex: number;
  quizSubSteps: Record<string, number>;
  completedNodes: Record<string, boolean>;
  completedDeck: boolean;
  streakTimestamp?: number;
  progressPercentage: number;
};

const STORAGE_KEY = 'learning_progress_v1';

type ProgressMap = Record<string, DeckProgress>;

const memoryFallbackStorage: Record<string, string> = {};
const hasLocalStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

function createDefaultDeckProgress(): DeckProgress {
  return {
    currentActiveNodeIndex: 0,
    quizSubSteps: {},
    completedNodes: {},
    completedDeck: false,
    progressPercentage: 0,
  };
}

async function safeGetItem(key: string): Promise<string | null> {
  if (hasLocalStorage) {
    return window.localStorage.getItem(key);
  }

  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.warn('AsyncStorage unavailable, using fallback in-memory storage.', error);
    return memoryFallbackStorage[key] ?? null;
  }
}

async function safeSetItem(key: string, value: string): Promise<void> {
  if (hasLocalStorage) {
    window.localStorage.setItem(key, value);
    return;
  }

  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.warn('AsyncStorage unavailable, using fallback in-memory storage.', error);
    memoryFallbackStorage[key] = value;
  }
}

export async function getAllProgress(): Promise<ProgressMap> {
  const raw = await safeGetItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as ProgressMap;
  } catch {
    return {};
  }
}

export async function getDeckProgress(deckId: string): Promise<DeckProgress> {
  const all = await getAllProgress();
  return all[deckId] ?? createDefaultDeckProgress();
}

export async function updateDeckProgress(
  deckId: string,
  updater: (current: DeckProgress) => DeckProgress
): Promise<DeckProgress> {
  const all = await getAllProgress();
  const current = all[deckId] ?? createDefaultDeckProgress();
  const next = updater(current);
  all[deckId] = next;
  await safeSetItem(STORAGE_KEY, JSON.stringify(all));
  return next;
}
