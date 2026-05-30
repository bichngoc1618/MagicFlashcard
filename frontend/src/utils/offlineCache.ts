import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const CACHE_PREFIX = '@cache/';
const QUEUE_KEY = '@sync/queue';

export interface PendingMutation {
  id: string;
  path: string;
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  };
  timestamp: number;
}

// Helper to get all cache keys matching a pattern
async function getCacheKeysMatching(pattern: string): Promise<string[]> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    return allKeys.filter(key => key.includes(pattern));
  } catch (e) {
    console.warn('Failed to get cache keys:', e);
    return [];
  }
}

export async function getCachedData(key: string): Promise<any> {
  try {
    const data = await AsyncStorage.getItem(CACHE_PREFIX + key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn(`Failed to get cached data for key ${key}:`, e);
    return null;
  }
}

export async function setCachedData(key: string, data: any): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed to set cached data for key ${key}:`, e);
  }
}

export async function queueMutation(path: string, options: any): Promise<void> {
  try {
    const pendingStr = await AsyncStorage.getItem(QUEUE_KEY);
    const queue: PendingMutation[] = pendingStr ? JSON.parse(pendingStr) : [];
    
    const newMutation: PendingMutation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      path,
      options: {
        method: options.method || 'POST',
        headers: options.headers,
        body: options.body,
      },
      timestamp: Date.now(),
    };
    
    queue.push(newMutation);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log(' queued mutation:', path);
    
    // Apply local optimistic update
    await updateLocalCacheOptimistically(path, newMutation.options.method || 'POST', options.body ? JSON.parse(options.body) : {});
  } catch (e) {
    console.warn('Failed to queue mutation:', e);
  }
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  try {
    const pendingStr = await AsyncStorage.getItem(QUEUE_KEY);
    return pendingStr ? JSON.parse(pendingStr) : [];
  } catch (e) {
    console.warn('Failed to get pending mutations:', e);
    return [];
  }
}

export async function removeMutation(id: string): Promise<void> {
  try {
    const pendingStr = await AsyncStorage.getItem(QUEUE_KEY);
    if (!pendingStr) return;
    const queue: PendingMutation[] = JSON.parse(pendingStr);
    const filtered = queue.filter(item => item.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to remove mutation:', e);
  }
}

// Apply local optimistic update
async function updateLocalCacheOptimistically(path: string, method: string, body: any): Promise<void> {
  try {
    console.log(`🔮 Optimistic update: ${method} ${path}`, body);
    
    // 1. Create Material (POST /api/materials)
    if (path === '/api/materials' && method === 'POST') {
      const { userId, title, description } = body;
      const key = `materials:${userId}`;
      const cached = await getCachedData(key);
      if (cached && Array.isArray(cached.materials)) {
        const mockMaterial = {
          id: Date.now(),
          title,
          description: description || '',
          completed_nodes: 0,
          total_nodes: 0,
          learned_cards: 0,
          total_cards: 0,
          status: 'in_progress',
        };
        cached.materials.unshift(mockMaterial);
        await setCachedData(key, cached);
      }
    }
    
    // 2. Edit Material (PUT /api/materials/:id)
    else if (path.startsWith('/api/materials/') && method === 'PUT') {
      const parts = path.split('/');
      const materialId = parseInt(parts[parts.length - 1], 10);
      const { title, description } = body;
      
      const keys = await getCacheKeysMatching('materials:');
      for (const k of keys) {
        const cacheKey = k.replace(CACHE_PREFIX, '');
        const cached = await getCachedData(cacheKey);
        if (cached && Array.isArray(cached.materials)) {
          const index = cached.materials.findIndex((m: any) => m.id === materialId);
          if (index !== -1) {
            cached.materials[index].title = title;
            if (description !== undefined) {
              cached.materials[index].description = description;
            }
            await setCachedData(cacheKey, cached);
            break;
          }
        }
      }
    }
    
    // 3. Delete Material (DELETE /api/materials/:id)
    else if (path.startsWith('/api/materials/') && method === 'DELETE') {
      const parts = path.split('/');
      const materialId = parseInt(parts[parts.length - 1], 10);
      
      const keys = await getCacheKeysMatching('materials:');
      for (const k of keys) {
        const cacheKey = k.replace(CACHE_PREFIX, '');
        const cached = await getCachedData(cacheKey);
        if (cached && Array.isArray(cached.materials)) {
          const filtered = cached.materials.filter((m: any) => m.id !== materialId);
          await setCachedData(cacheKey, { ...cached, materials: filtered });
          break;
        }
      }
    }
    
    // 4. Create Flashcard (POST /api/flashcards)
    else if (path === '/api/flashcards' && method === 'POST') {
      const { materialId, kanji, hiragana, meaning, example } = body;
      const key = `flashcards:${materialId}`;
      const cached = await getCachedData(key);
      if (cached && Array.isArray(cached.flashcards)) {
        const mockCard = {
          id: Date.now(),
          kanji: kanji || '',
          hiragana: hiragana || '',
          meaning: meaning || '',
          example: example || '',
          is_learned: 0,
        };
        cached.flashcards.push(mockCard);
        await setCachedData(key, cached);
      }
    }
    
    // 5. Edit Flashcard (PUT /api/flashcards/:id)
    else if (path.startsWith('/api/flashcards/') && method === 'PUT') {
      const parts = path.split('/');
      const flashcardId = parseInt(parts[parts.length - 1], 10);
      const { kanji, hiragana, meaning, example } = body;
      
      const keys = await getCacheKeysMatching('flashcards:');
      for (const k of keys) {
        const cacheKey = k.replace(CACHE_PREFIX, '');
        const cached = await getCachedData(cacheKey);
        if (cached && Array.isArray(cached.flashcards)) {
          const index = cached.flashcards.findIndex((c: any) => c.id === flashcardId);
          if (index !== -1) {
            cached.flashcards[index] = {
              ...cached.flashcards[index],
              kanji: kanji !== undefined ? kanji : cached.flashcards[index].kanji,
              hiragana: hiragana !== undefined ? hiragana : cached.flashcards[index].hiragana,
              meaning: meaning !== undefined ? meaning : cached.flashcards[index].meaning,
              example: example !== undefined ? example : cached.flashcards[index].example,
            };
            await setCachedData(cacheKey, cached);
            break;
          }
        }
      }
    }
    
    // 6. Delete Flashcard (DELETE /api/flashcards/:id)
    else if (path.startsWith('/api/flashcards/') && method === 'DELETE') {
      const parts = path.split('/');
      const flashcardId = parseInt(parts[parts.length - 1], 10);
      
      const keys = await getCacheKeysMatching('flashcards:');
      for (const k of keys) {
        const cacheKey = k.replace(CACHE_PREFIX, '');
        const cached = await getCachedData(cacheKey);
        if (cached && Array.isArray(cached.flashcards)) {
          const filtered = cached.flashcards.filter((c: any) => c.id !== flashcardId);
          await setCachedData(cacheKey, { ...cached, flashcards: filtered });
          break;
        }
      }
    }
    
    // 7. Mark Learned (POST /api/progress/mark-learned or POST /api/progress/update)
    else if ((path === '/api/progress/mark-learned' || path === '/api/progress/update') && method === 'POST') {
      const { userId, materialId, flashcardId } = body;
      const key = `learnedCards:${userId}:${materialId}`;
      const cached = await getCachedData(key);
      const learnedIds = cached && Array.isArray(cached.learnedCardIds) ? cached.learnedCardIds : [];
      if (!learnedIds.includes(String(flashcardId))) {
        learnedIds.push(String(flashcardId));
      }
      await setCachedData(key, { learnedCardIds: learnedIds });
    }
    
    // 8. Update Study Path Node Index (POST /api/progress/update-node-index)
    else if (path === '/api/progress/update-node-index' && method === 'POST') {
      const { userId, materialId, nodeIndex } = body;
      const key = `studyPath:${userId}:${materialId}`;
      const cached = await getCachedData(key);
      if (cached) {
        cached.currentActiveNodeIndex = nodeIndex;
        await setCachedData(key, cached);
      }
    }
    
    // 9. Node Stars (POST /api/progress/node-stars)
    else if (path === '/api/progress/node-stars' && method === 'POST') {
      const { userId, materialId, nodeId, stars } = body;
      const key = `studyPath:${userId}:${materialId}`;
      const cached = await getCachedData(key);
      if (cached) {
        cached.nodeStars = cached.nodeStars || {};
        cached.nodeStars[nodeId] = stars;
        await setCachedData(key, cached);
      }
    }
    
    // 10. Gamification Stats (POST /api/gamification/update)
    else if (path === '/api/gamification/update' && method === 'POST') {
      const { userId, earnedXp, newStreakCount, newLastStudyDate } = body;
      const key = `userStats:${userId}`;
      const cached = await getCachedData(key);
      if (cached) {
        cached.total_xp = (cached.total_xp || 0) + earnedXp;
        cached.streak_count = newStreakCount;
        cached.last_study_date = newLastStudyDate;
        await setCachedData(key, cached);
      }
      const profileKey = `profile:${userId}`;
      const cachedProfile = await getCachedData(profileKey);
      if (cachedProfile) {
        cachedProfile.total_xp = (cachedProfile.total_xp || 0) + earnedXp;
        cachedProfile.streak_count = newStreakCount;
        cachedProfile.last_study_date = newLastStudyDate;
        await setCachedData(profileKey, cachedProfile);
      }
    }
    
    // 11. Refill Hearts (POST /api/gamification/refill)
    else if (path === '/api/gamification/refill' && method === 'POST') {
      const { userId, hearts, cost } = body;
      const key = `userStats:${userId}`;
      const cached = await getCachedData(key);
      if (cached) {
        cached.global_hearts = Math.min((cached.global_hearts || 0) + hearts, 5);
        cached.total_xp = Math.max((cached.total_xp || 0) - cost, 0);
        await setCachedData(key, cached);
      }
      const profileKey = `profile:${userId}`;
      const cachedProfile = await getCachedData(profileKey);
      if (cachedProfile) {
        cachedProfile.global_hearts = Math.min((cachedProfile.global_hearts || 0) + hearts, 5);
        cachedProfile.total_xp = Math.max((cachedProfile.total_xp || 0) - cost, 0);
        await setCachedData(profileKey, cachedProfile);
      }
    }
    
    // 12. Deduct Hearts (POST /api/gamification/deduct)
    else if (path === '/api/gamification/deduct' && method === 'POST') {
      const { userId, amount } = body;
      const key = `userStats:${userId}`;
      const cached = await getCachedData(key);
      if (cached) {
        cached.global_hearts = Math.max((cached.global_hearts || 0) - amount, 0);
        await setCachedData(key, cached);
      }
      const profileKey = `profile:${userId}`;
      const cachedProfile = await getCachedData(profileKey);
      if (cachedProfile) {
        cachedProfile.global_hearts = Math.max((cachedProfile.global_hearts || 0) - amount, 0);
        await setCachedData(profileKey, cachedProfile);
      }
    }

    // 13. Complete Quiz/Node (POST /api/progress/complete-quiz or POST /api/quiz/complete-node)
    else if ((path === '/api/progress/complete-quiz' || path === '/api/quiz/complete-node') && method === 'POST') {
      const { userId, materialId, isAlreadyCompleted } = body;
      if (!isAlreadyCompleted) {
        const key = `studyPath:${userId}:${materialId}`;
        const cached = await getCachedData(key);
        if (cached) {
          cached.currentActiveNodeIndex = (cached.currentActiveNodeIndex || 0) + 1;
          await setCachedData(key, cached);
        }
      }
    }

    // 14. Complete Flashcard Batch (POST /api/flashcard/complete)
    else if (path === '/api/flashcard/complete' && method === 'POST') {
      const { userId, materialId, batchIndex, isAlreadyCompleted } = body;
      if (!isAlreadyCompleted) {
        const key = `studyPath:${userId}:${materialId}`;
        const cached = await getCachedData(key);
        if (cached) {
          cached.currentActiveNodeIndex = (cached.currentActiveNodeIndex || 0) + 1;
          await setCachedData(key, cached);
        }
      }

      const flashcardsKey = `flashcards:${materialId}`;
      const flashcardsCached = await getCachedData(flashcardsKey);
      if (flashcardsCached && Array.isArray(flashcardsCached.flashcards)) {
        const chunks = [];
        const list = flashcardsCached.flashcards;
        for (let i = 0; i < list.length; i += 10) {
          chunks.push(list.slice(i, i + 10));
        }
        const batch = chunks[batchIndex] || [];
        const cardIds = batch.map((c: any) => String(c.id));

        const learnedKey = `learnedCards:${userId}:${materialId}`;
        const cachedLearned = await getCachedData(learnedKey);
        const learnedIds = cachedLearned && Array.isArray(cachedLearned.learnedCardIds) ? cachedLearned.learnedCardIds : [];
        cardIds.forEach((id: string) => {
          if (!learnedIds.includes(id)) {
            learnedIds.push(id);
          }
        });
        await setCachedData(learnedKey, { learnedCardIds: learnedIds });
      }
    }
  } catch (e) {
    console.warn('Failed to apply optimistic local cache update:', e);
  }
}

// Background sync worker
let isSyncing = false;
export async function syncPendingMutations(requestFn: (path: string, options: any) => Promise<any>): Promise<void> {
  if (isSyncing) return;
  
  const queue = await getPendingMutations();
  if (queue.length === 0) return;
  
  isSyncing = true;
  console.log(`🔄 Sync worker started. Syncing ${queue.length} pending mutations...`);
  
  for (const mutation of queue) {
    try {
      await requestFn(mutation.path, mutation.options);
      await removeMutation(mutation.id);
      console.log(`✅ Synced mutation: ${mutation.path}`);
    } catch (e) {
      console.warn(`❌ Failed to sync mutation ${mutation.path}. Stopping sync queue.`, e);
      break; // Stop syncing remainder to maintain sequence ordering in case of server failure
    }
  }
  
  isSyncing = false;
}
