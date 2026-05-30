import { BACKEND_URL } from '../config/BackendConfig';
import { getCachedData, setCachedData, queueMutation, syncPendingMutations } from '../utils/offlineCache';

const parseJson = async (response: Response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const getCacheKeyForPath = (path: string): string | null => {
  if (path.startsWith('/api/materials/')) {
    const parts = path.split('/');
    const userId = parts[parts.length - 1];
    if (/^\d+$/.test(userId)) {
      return `materials:${userId}`;
    }
  }
  if (path.startsWith('/api/progress/study-path/')) {
    const parts = path.split('/');
    const materialId = parts[parts.length - 1];
    const userId = parts[parts.length - 2];
    return `studyPath:${userId}:${materialId}`;
  }
  if (path.startsWith('/api/flashcards/')) {
    const cleanPath = path.split('?')[0];
    const parts = cleanPath.split('/');
    const materialId = parts[parts.length - 1];
    if (/^\d+$/.test(materialId)) {
      return `flashcards:${materialId}`;
    }
  }
  if (path.startsWith('/api/progress/learned-cards/')) {
    const parts = path.split('/');
    const materialId = parts[parts.length - 1];
    const userId = parts[parts.length - 2];
    return `learnedCards:${userId}:${materialId}`;
  }
  if (path.startsWith('/api/user/stats/')) {
    const parts = path.split('/');
    const userId = parts[parts.length - 1];
    return `userStats:${userId}`;
  }
  if (path.startsWith('/api/profile/')) {
    const parts = path.split('/');
    const userId = parts[parts.length - 1];
    return `profile:${userId}`;
  }
  if (path.startsWith('/api/notifications/')) {
    const parts = path.split('/');
    const userId = parts[parts.length - 1];
    return `notifications:${userId}`;
  }
  if (path.startsWith('/api/home/') && path.endsWith('/wrong-words')) {
    const parts = path.split('/');
    const userId = parts[parts.length - 2];
    return `homeWrongWords:${userId}`;
  }
  if (path.startsWith('/api/study/journey/')) {
    const cleanPath = path.split('?')[0];
    const parts = cleanPath.split('/');
    const materialId = parts[parts.length - 1];
    return `studyJourney:${materialId}`;
  }
  return null;
};

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 5000): Promise<Response> => {
  const controller = new AbortController();
  const { signal } = controller;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new TypeError('Failed to fetch (timeout)');
    }
    throw error;
  }
};

const syncRequest = async (path: string, options: any) => {
  const url = `${BACKEND_URL}${path}`;
  const response = await fetchWithTimeout(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  }, 5000);
  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data?.error || `Sync request failed ${response.status}`);
  }
  return data;
};

export const triggerSyncQueue = async () => {
  try {
    await syncPendingMutations(syncRequest);
  } catch (e) {
    console.warn('Failed to manually sync queue:', e);
  }
};

export const request = async (path: string, options: RequestInit = {}) => {
  const method = options.method || 'GET';
  const cacheKey = getCacheKeyForPath(path);

  // Extend timeout for specific endpoints that may take longer
  const extendedPaths = ['/gamification/refill', '/progress/srs-review'];
  const timeoutMs = extendedPaths.some(p => path.includes(p)) ? 15000 : 5000;

  if (method === 'GET') {
    try {
      const url = `${BACKEND_URL}${path}`;
      const response = await fetchWithTimeout(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        ...options,
      }, timeoutMs);
      const data = await parseJson(response);
      if (!response.ok) {
        throw new Error(data?.error || `Request failed ${response.status}`);
      }

      if (cacheKey) {
        await setCachedData(cacheKey, data);
      }

      setTimeout(() => {
        syncPendingMutations(syncRequest).catch(err => console.warn('Background sync failed:', err));
      }, 50);

      return data;
    } catch (error: any) {
      if (cacheKey) {
        console.log(`🌐 Offline mode: falling back to cache for ${path}`);
        const cached = await getCachedData(cacheKey);
        if (cached !== null) {
          return cached;
        }
      }
      throw error;
    }
  } else {
    try {
      const url = `${BACKEND_URL}${path}`;
      const response = await fetchWithTimeout(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
        ...options,
      }, timeoutMs);
      const data = await parseJson(response);
      if (!response.ok) {
        throw new Error(data?.error || `Request failed ${response.status}`);
      }

      setTimeout(() => {
        syncPendingMutations(syncRequest).catch(err => console.warn('Background sync failed:', err));
      }, 50);

      return data;
    } catch (error: any) {
      const isNetworkError = error.message?.includes('Network request failed') ||
                             error.message?.includes('Failed to fetch') ||
                             error.message?.includes('connection') ||
                             error.message?.includes('timeout') ||
                             error.name === 'AbortError' ||
                             error instanceof TypeError;

      if (isNetworkError) {
        console.log(`🌐 Offline mode: queueing mutation for ${method} ${path}`);
        await queueMutation(path, options);
        return { success: true, offline: true };
      }
      throw error;
    }
  }
  // Duplicate request logic removed; original implementation retained above
};

export const login = async (email: string, password: string) => {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const register = async (username: string, email: string, password: string) => {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
};

export const getMaterials = async (userId: number) => {
  return request(`/api/materials/${userId}`);
};

export const createMaterial = async (userId: number, title: string, description?: string) => {
  return request('/api/materials', {
    method: 'POST',
    body: JSON.stringify({ userId, title, description }),
  });
};

export const deleteMaterial = async (materialId: number) => {
  return request(`/api/materials/${materialId}`, {
    method: 'DELETE',
  });
};

export const updateMaterial = async (materialId: number, title: string, description?: string) => {
  return request(`/api/materials/${materialId}`, {
    method: 'PUT',
    body: JSON.stringify({ title, description }),
  });
};

export const getStudyJourney = async (materialId: number, userId?: number) => {
  const query = userId ? `?userId=${userId}` : '';
  return request(`/api/study/journey/${materialId}${query}`);
};

export const getHomeWrongWords = async (userId: number) => {
  return request(`/api/home/${userId}/wrong-words`);
};

export const updateStudyPathIndex = async (userId: number, materialId: number, nodeIndex: number) => {
  return request('/api/progress/update-node-index', {
    method: 'POST',
    body: JSON.stringify({ userId, materialId, nodeIndex }),
  });
};

export const getProfile = async (userId: number) => {
  return request(`/api/profile/${userId}`);
};

export const getProfileAnalytics = async (userId: number) => {
  return request(`/api/profile/${userId}/analytics`);
};

export const getFlashcards = async (materialId: number, userId?: number) => {
  const query = userId ? `?userId=${userId}` : '';
  return request(`/api/flashcards/${materialId}${query}`);
};

export const shareMaterial = async (senderId: number, recipientEmail: string, materialId: number) => {
  return request('/api/materials/share', {
    method: 'POST',
    body: JSON.stringify({ senderId, recipientEmail, materialId }),
  });
};

export const getNotifications = async (userId: number) => {
  return request(`/api/notifications/${userId}`);
};

export const markNotificationsRead = async (userId: number, ids: number[]) => {
  return request('/api/notifications/mark-read', {
    method: 'POST',
    body: JSON.stringify({ userId, ids }),
  });
};

export const createFlashcard = async (materialId: number, card: any) => {
  return request('/api/flashcards', {
    method: 'POST',
    body: JSON.stringify({ materialId, ...card }),
  });
};

export const searchDictionary = async (keyword: string) => {
  const query = keyword.trim();
  if (!query) return null;

  try {
    // 1. Gọi API Mazii lấy thông tin từ vựng gốc (Nghĩa tiếng Việt)
    const wordResponse = await fetch('https://mazii.net/api/search', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        dict: 'javi',
        type: 'word',
        query: query,
        limit: 1,
      }),
    });

    if (!wordResponse.ok) throw new Error('Mazii word lookup failed');
    const wordJson = await wordResponse.json();
    const wordData = wordJson.data || wordJson.results || [];
    const item = wordData[0];

    if (!item) return null;

    // 2. Gom toàn bộ các nét nghĩa trong mảng 'means' lại thành một chuỗi
    let vietnameseMeaning = item.short_mean || '';
    if (!vietnameseMeaning && Array.isArray(item.means)) {
      vietnameseMeaning = item.means.map((m: any) => m.mean).join(', ');
    }

    // 3. Bóc tách tối đa 2 câu ví dụ trực tiếp từ cấu trúc dữ liệu của nét nghĩa
    let exampleText = '';
    if (Array.isArray(item.means) && item.means.length > 0) {
      // Tìm nét nghĩa đầu tiên có chứa danh sách ví dụ mẫu hợp lệ
      const meanWithExample = item.means.find(
        (m: any) => Array.isArray(m.examples) && m.examples.length > 0
      );
      
      if (meanWithExample) {
        exampleText = meanWithExample.examples
          .slice(0, 2) // Lấy tối đa 2 ví dụ
          .map((ex: any) => {
            const ja = ex.content || ''; // Câu tiếng Nhật gốc
            const vi = ex.mean || '';    // Bản dịch tiếng Việt
            return ja && vi ? `${ja}\n(${vi})` : ja || vi || '';
          })
          .filter((str: string) => str !== '')
          .join('\n\n');
      }
    }

    // 4. Lọc sạch chuỗi Hiragana (Chỉ lấy cách đọc chính xác và phổ biến nhất ở cuối mảng)
    let cleanHiragana = item.phonetic || '';
    if (cleanHiragana.includes(' ')) {
      const hiraganaArray = cleanHiragana.trim().split(/\s+/);
      cleanHiragana = hiraganaArray[hiraganaArray.length - 1];
    }

    // 5. Trả về Object dữ liệu chuẩn hóa, Type-safe cho AddVocabularyModal
    return {
      word: item.word || query,
      kanji: item.kanji || '',
      hiragana: cleanHiragana, 
      meaning: vietnameseMeaning || 'Chưa rõ nghĩa',
      example: exampleText || 'Không có ví dụ mẫu', 
    };

  } catch (error) {
    console.error('Lỗi kết nối từ điển Mazii:', error);
    throw error;
  }
};

export const updateFlashcard = async (flashcardId: number, card: any) => {
  return request(`/api/flashcards/${flashcardId}`, {
    method: 'PUT',
    body: JSON.stringify(card),
  });
};

export const deleteFlashcard = async (flashcardId: number) => {
  return request(`/api/flashcards/${flashcardId}`, {
    method: 'DELETE',
  });
};

export const bulkCreateFlashcards = async (materialId: number, cards: any[]) => {
  return request('/api/flashcards/bulk', {
    method: 'POST',
    body: JSON.stringify({ materialId, cards }),
  });
};

export const startStudy = async (materialId: number, userId?: number) => {
  return request(`/api/study/start/${materialId}`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
};

export const syncStudy = async (payload: any) => {
  return request('/api/study/sync', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const getUserStats = async (userId: number) => {
  return request(`/api/user/stats/${userId}`);
};

export const seedDefaultMaterials = async (userId: number) => {
  return request(`/api/materials/seed-default/${userId}`, { method: 'POST' });
};

export const speakText = async (text: string, userId?: number) => {
  return request('/api/text', {
    method: 'POST',
    body: JSON.stringify({ text, userId }),
  });
};

export const speakAudio = async (formData: FormData) => {
  const response = await fetch(`${BACKEND_URL}/api/speak`, {
    method: 'POST',
    body: formData,
  });
  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data?.error || `Request failed ${response.status}`);
  }
  return data;
};

export const getChatHistory = async (userId?: number, all = false) => {
  if (all) {
    return userId ? request(`/api/chat/history/${encodeURIComponent(userId)}`) : request('/api/chat-history');
  }
  if (userId) {
    return request(`/api/chat/history/${encodeURIComponent(userId)}`);
  }
  return request('/api/chat-history');
};

export const clearChatHistory = async (userId?: number) => {
  return request('/api/chat-history/clear', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
};

export const getStudyPath = async (userId: number, materialId: number) => {
  return request(`/api/progress/study-path/${userId}/${materialId}`);
};

export const saveQuizAnswer = async (payload: {
  userId: number;
  materialId: number;
  batchIndex: number;
  questionIndex: number;
  quizStepType: string;
  isCorrect: boolean;
}) => {
  return request('/api/progress/save-quiz-answer', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const getQuizProgress = async (payload: {
  userId: number;
  materialId: number;
  batchIndex: number;
  quizStepType: string;
}) => {
  return request(
    `/api/progress/quiz-progress/${payload.userId}/${payload.materialId}/${payload.batchIndex}/${payload.quizStepType}`
  );
};

export const markCardLearned = async (payload: {
  userId: number;
  materialId: number;
  flashcardId: number;
}) => {
  return request('/api/progress/mark-learned', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const getLearnedCards = async (userId: number, materialId: number) => {
  return request(`/api/progress/learned-cards/${userId}/${materialId}`);
};

export const saveNodeStars = async (payload: {
  userId: number;
  materialId: number;
  nodeId: string;
  stars: number;
}) => {
  return request('/api/progress/node-stars', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updateProgress = async (payload: {
  userId: number;
  materialId: number;
  flashcardId: number;
}) => {
  return request('/api/progress/update', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const resetBatchProgress = async (payload: {
  userId: number;
  materialId: number;
  batchIndex: number;
}) => {
  return request('/api/progress/reset-batch', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const completeQuizSession = async (payload: {
  userId: number;
  materialId: number;
  sessionType: string;
  batchIndex: number;
  totalQuestions: number;
  correctAnswers: number;
  isAlreadyCompleted?: boolean;
}) => {
  return request('/api/progress/complete-quiz', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const completeFlashcardBatch = async (payload: {
  userId: number;
  materialId: number;
  batchIndex: number;
  isAlreadyCompleted?: boolean;
}) => {
  return request('/api/flashcard/complete', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const completeQuizNode = async (payload: {
  userId: number;
  materialId: number;
  nodeId: string;
  sessionType?: string;
  batchIndex?: number;
  totalQuestions?: number;
  correctAnswers?: number;
  isAlreadyCompleted?: boolean;
}) => {
  return request('/api/quiz/complete-node', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const completeSrsReview = async (payload: {
  userId: number;
  materialId: number;
  results: { cardId: number; score: number }[];
}) => {
  return request('/api/progress/srs-review', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const updateGamificationStats = async (payload: {
  userId: number;
  earnedXp: number;
  newStreakCount: number;
  newLastStudyDate: string;
  newHearts?: number;
}) => {
  return request('/api/gamification/update', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const refillHearts = async (userId: number, hearts = 5, cost = 200) => {
  return request('/api/gamification/refill', {
    method: 'POST',
    body: JSON.stringify({ userId, hearts, cost }),
  });
};

export const deductHearts = async (userId: number, amount = 1, reason = 'quiz_failure') => {
  return request('/api/gamification/deduct', {
    method: 'POST',
    body: JSON.stringify({ userId, amount, reason }),
  });
};
