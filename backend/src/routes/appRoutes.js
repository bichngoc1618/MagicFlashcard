import express from 'express';
import {
  getMaterials,
  createMaterial,
  updateMaterial,
  createFlashcard,
  createFlashcardsBulk,
  updateFlashcard,
  deleteFlashcard,
  deleteMaterial,
  getStudyJourney,
  seedDefaultMaterials,
  getFlashcards,
  getUserStats,
  shareMaterial,
  getNotifications,
  markNotificationsRead,
} from '../controllers/materialController.js';
import { startStudy, syncStudy } from '../controllers/studyController.js';
import {
  getStudyPath,
  getProfileOverview,
  markCardLearned,
  resetBatchProgress,
  completeQuizSession,
  saveQuizAnswer,
  getQuizProgress,
  completeFlashcardBatch,
  completeQuizNode,
  getProfileAnalytics,
  completeSrsReview,
  getHomeWrongWords,
  updateNodeIndex,
  getLearnedCards,
  updateProfile,
  addXp,
} from '../controllers/progressController.js';
import { register, login, updateGamificationStats, refillHearts, deductHearts } from '../controllers/authController.js';
import db from '../config/db.js';

const router = express.Router();

router.get('/materials/:userId', getMaterials);
router.post('/materials', createMaterial);
router.put('/materials/:materialId', updateMaterial);
router.post('/flashcards', createFlashcard);
router.post('/flashcards/bulk', createFlashcardsBulk);
router.put('/flashcards/:flashcardId', updateFlashcard);
router.delete('/flashcards/:flashcardId', deleteFlashcard);
router.delete('/materials/:materialId', deleteMaterial);
router.post('/materials/seed-default/:userId', seedDefaultMaterials);
router.get('/study/journey/:materialId', getStudyJourney);
router.get('/flashcards/:materialId', getFlashcards);
router.post('/study/start/:materialId', startStudy);
router.post('/study/sync', syncStudy);
router.get('/user/stats/:userId', getUserStats);
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/materials/share', shareMaterial);
router.get('/notifications/:userId', getNotifications);
router.post('/notifications/mark-read', markNotificationsRead);

// New progress tracking endpoints
router.get('/progress/study-path/:userId/:materialId', getStudyPath);
router.get('/profile/:userId', getProfileOverview);
router.put('/profile/:userId', updateProfile);
router.get('/profile/:userId/analytics', getProfileAnalytics);
router.post('/progress/:userId/add-xp', addXp);
router.get('/home/:userId/wrong-words', getHomeWrongWords);
router.post('/progress/mark-learned', markCardLearned);
router.post('/progress/update', markCardLearned);
router.post('/progress/reset-batch', resetBatchProgress);
router.get('/progress/quiz-progress/:userId/:materialId/:batchIndex/:quizStepType', getQuizProgress);
router.get('/progress/learned-cards/:userId/:materialId', getLearnedCards);
router.post('/progress/complete-quiz', completeQuizSession);
router.post('/progress/save-quiz-answer', saveQuizAnswer);
router.post('/progress/update-node-index', updateNodeIndex);
router.post('/flashcard/complete', completeFlashcardBatch);
router.post('/quiz/complete-node', completeQuizNode);
router.post('/progress/srs-review', completeSrsReview);
router.post('/gamification/update', updateGamificationStats);
router.post('/gamification/refill', refillHearts);
router.post('/gamification/deduct', deductHearts);

router.get('/chat/history', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, user_id, user_msg, ai_reply, timestamp FROM chat_history ORDER BY timestamp ASC'
    );
    return res.json({ history: rows });
  } catch (error) {
    console.error('GET /chat/history error', error);
    return res.status(500).json({ error: 'Không thể lấy lịch sử chat.' });
  }
});

router.get('/chat/history/:userId', async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const [rows] = await db.query(
      'SELECT id, user_id, user_msg, ai_reply, timestamp FROM chat_history WHERE user_id = ? ORDER BY timestamp ASC LIMIT 100',
      [userId]
    );
    return res.json({ history: rows });
  } catch (error) {
    console.error('GET /chat/history error', error);
    return res.status(500).json({ error: 'Không thể lấy lịch sử chat.' });
  }
});

export default router;
