import db from '../config/db.js';

const CHUNK_SIZE = 10;
const QUIZ_STEP_TYPES = ['MATCH_MEANING', 'MATCH_HIRA', 'MULTIPLE_CHOICE', 'SCRAMBLED_HIRA'];
const QUIZ_STEP_OFFSETS = {
  MATCH_MEANING: 0,
  MATCH_HIRA: 10,
  MULTIPLE_CHOICE: 20,
  SCRAMBLED_HIRA: 30,
  WRITE_HIRA: 40,
};

const getTotalBatches = (totalCards) => {
  if (!totalCards || totalCards <= 0) return 0;
  const numFullChunks = Math.floor(totalCards / CHUNK_SIZE);
  const remainder = totalCards % CHUNK_SIZE;
  if (numFullChunks === 0) return 1;
  return remainder >= 6 ? numFullChunks + 1 : numFullChunks;
};

const formatDate = (value) => {
  const date = new Date(value);
  return date.toISOString().slice(0, 10);
};

const calculateJourneyNodeProgress = (totalCards, currentCardIndex = 0) => {
  const totalBatches = getTotalBatches(totalCards);
  const totalNodes = totalBatches > 0 ? totalBatches * 5 + Math.floor((totalBatches - 1) / 2) + 1 : 0;
  const completedNodes = Math.min(Math.max(Number(currentCardIndex) || 0, 0), totalNodes);
  const progressPercentage = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;
  return { totalBatches, totalNodes, completedNodes, progressPercentage };
};

const encodeQuestionIndex = (quizStepType, questionIndex) => {
  if (quizStepType && QUIZ_STEP_OFFSETS[quizStepType] !== undefined) {
    return QUIZ_STEP_OFFSETS[quizStepType] + Number(questionIndex);
  }
  return Number(questionIndex);
};

const getQuizQuestionRange = (quizStepType) => {
  if (quizStepType && QUIZ_STEP_OFFSETS[quizStepType] !== undefined) {
    const start = QUIZ_STEP_OFFSETS[quizStepType];
    return { min: start, max: start + 9 };
  }
  return { min: 0, max: 1000 };
};

const generateJourneyNodes = (totalBatches) => {
  const nodes = [];
  const sideOffset = 150;
  const centerX = 200;
  let topPointer = 120;

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    nodes.push({
      id: `flash-${batchIdx}`,
      nodeType: 'FLASHCARD',
      batchIndex: batchIdx,
      left: batchIdx % 2 === 0 ? sideOffset : 400 - sideOffset,
      top: topPointer,
    });
    topPointer += 120;

    for (let quizStep = 0; quizStep < QUIZ_STEP_TYPES.length; quizStep++) {
      nodes.push({
        id: `mini-quiz-${batchIdx}-${quizStep}`,
        nodeType: 'MINI_QUIZ',
        batchIndex: batchIdx,
        quizStep,
        quizStepType: QUIZ_STEP_TYPES[quizStep],
        left: centerX,
        top: topPointer,
      });
      topPointer += 100;
    }

    if ((batchIdx + 1) % 2 === 0 && batchIdx < totalBatches - 1) {
      const reviewRound = Math.floor((batchIdx + 1) / 2) - 1;
      nodes.push({
        id: `review-${reviewRound}`,
        nodeType: 'REVIEW',
        reviewRound,
        batchIndex: reviewRound,
        left: centerX,
        top: topPointer + 40,
      });
      topPointer += 160;
    }
  }

  nodes.push({
    id: 'final-boss',
    nodeType: 'FINAL_BOSS',
    batchIndex: -1,
    left: centerX,
    top: topPointer + 120,
  });

  return nodes;
};

export const getStudyPath = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const materialId = Number(req.params.materialId);

    if (!userId || !materialId) {
      return res.status(400).json({ error: 'Thiếu userId hoặc materialId.' });
    }

    const [materialRows] = await db.query(
      'SELECT id, title, user_id FROM study_materials WHERE id = ?',
      [materialId]
    );
    const material = materialRows[0];
    if (!material) {
      return res.status(404).json({ error: 'Tài liệu không tồn tại.' });
    }

    const [cardsRows] = await db.query(
      'SELECT id FROM flashcards WHERE material_id = ? ORDER BY id ASC',
      [materialId]
    );
    const totalCards = cardsRows.length;
    const totalBatches = getTotalBatches(totalCards);

    const [progressRows] = await db.query(
      `SELECT flashcard_id, is_learned FROM user_flashcard_progress
       WHERE user_id = ? AND material_id = ?`,
      [userId, materialId]
    );

    const learnedCardIds = new Set(
      progressRows.filter((p) => p.is_learned).map((p) => p.flashcard_id)
    );

    const [learningPathRows] = await db.query(
      'SELECT current_card_index FROM learning_path WHERE user_id = ? AND material_id = ?',
      [userId, materialId]
    );

    const currentCardIndex = learningPathRows[0]?.current_card_index ?? 0;

    const journeyNodes = generateJourneyNodes(totalBatches);
    const totalNodes = journeyNodes.length;
    const completedNodes = Math.min(Math.max(Number(currentCardIndex) || 0, 0), totalNodes);
    const progressPercentage = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

    const learnedCount = learnedCardIds.size;
    const currentActiveNodeIndex = Math.max(0, Number(currentCardIndex) || 0);

    return res.json({
      material,
      totalCards,
      totalBatches,
      totalNodes,
      learnedCards: learnedCount,
      completedNodes,
      progressPercentage,
      journeyNodes,
      currentActiveNodeIndex,
    });
  } catch (error) {
    console.error('GET /progress/study-path error', error);
    return res.status(500).json({ error: 'Không thể lấy lộ trình học.' });
  }
};

export const getProfileOverview = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) {
      return res.status(400).json({ error: 'Thiếu userId.' });
    }

    const [userRows] = await db.query(
      `SELECT
         u.username,
         u.total_xp,
         u.streak_count,
         COALESCE((SELECT SUM(duration) FROM user_study_sessions WHERE user_id = ?), 0) AS total_time
       FROM users u
       WHERE u.id = ?`,
      [userId, userId]
    );

    const user = userRows[0];
    if (!user) {
      return res.status(404).json({ error: 'Người dùng không tồn tại.' });
    }

   const [progressRows] = await db.query(
  `SELECT
     sm.id,
     sm.title,
     COUNT(ufp.id) AS learned,
     (SELECT COUNT(*) FROM flashcards WHERE material_id = sm.id) AS total
   FROM study_materials sm
   LEFT JOIN user_flashcard_progress ufp
     ON sm.id = ufp.material_id
     AND ufp.user_id = ?
     AND ufp.is_learned = 1
   WHERE sm.user_id = ?
   GROUP BY sm.id, sm.title
   ORDER BY sm.title ASC`,
  [userId, userId]
);

    const [recentQuizzes] = await db.query(
      `SELECT
         qs.id,
         qs.session_type,
         qs.material_id,
         sm.title AS material_title,
         qs.score,
         qs.correct_answers,
         qs.total_questions,
         qs.completed_at
       FROM quiz_sessions qs
       LEFT JOIN study_materials sm ON sm.id = qs.material_id
       WHERE qs.user_id = ?
       ORDER BY qs.completed_at DESC
       LIMIT 3`,
      [userId]
    );

    return res.json({
      user,
      progress: progressRows,
      recentQuizzes,
    });
  } catch (error) {
    console.error('GET /profile/:userId error', error);
    return res.status(500).json({ error: 'Không thể lấy thông tin profile.' });
  }
};

export const getProfileAnalytics = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) {
      return res.status(400).json({ error: 'Thiếu userId.' });
    }

    const [userRows] = await db.query(
      `SELECT username, email, COALESCE(total_xp, 0) AS total_xp
       FROM users
       WHERE id = ?`,
      [userId]
    );

    const user = userRows[0];
    if (!user) {
      return res.status(404).json({ error: 'Người dùng không tồn tại.' });
    }

    const [vocabRows] = await db.query(
      `SELECT COUNT(*) AS learned_vocabulary_count
       FROM user_flashcard_progress
       WHERE user_id = ? AND is_learned = 1`,
      [userId]
    );
    const learnedVocabularyCount = Number(vocabRows[0]?.learned_vocabulary_count ?? 0);

    const [studyRows] = await db.query(
      `SELECT COALESCE(SUM(duration), 0) AS total_study_duration_minutes
       FROM user_study_sessions
       WHERE user_id = ?`,
      [userId]
    );
    // Convert minutes to seconds so frontend's formatter can handle it as seconds
    const totalStudyDurationMinutes = Number(studyRows[0]?.total_study_duration_minutes ?? 0);
    const totalStudyDuration = totalStudyDurationMinutes * 60;
    console.log(`📊 Study analytics: userId=${userId}, totalDuration=${totalStudyDurationMinutes} minutes (${totalStudyDuration} seconds)`);

    const [accuracyRows] = await db.query(
      `SELECT COALESCE(ROUND(AVG(score), 2), 0) AS average_accuracy
       FROM quiz_sessions
       WHERE user_id = ? AND score IS NOT NULL`,
      [userId]
    );
    const averageAccuracy = Number(accuracyRows[0]?.average_accuracy ?? 0);

    const [quizRows] = await db.query(
      `SELECT DATE(completed_at) AS date, ROUND(AVG(score), 2) AS average_score
       FROM quiz_sessions
       WHERE user_id = ? AND completed_at IS NOT NULL
       GROUP BY DATE(completed_at)
       ORDER BY DATE(completed_at) DESC
       LIMIT 7`,
      [userId]
    );

    const quizTrend = (quizRows || [])
      .map((row) => ({
        // Ensure date is ISO YYYY-MM-DD so frontend can parse reliably
        date: row.date ? (new Date(row.date)).toISOString().slice(0, 10) : null,
        score: Number(row.average_score ?? 0),
      }))
      .filter((item) => item.date !== null)
      .reverse();

    const [heatmapRows] = await db.query(
      `SELECT DATE(date) AS date, COUNT(*) AS count
       FROM user_study_sessions
       WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 27 DAY)
       GROUP BY DATE(date)
       ORDER BY DATE(date) ASC`,
      [userId]
    );

    const heatmap = {};
    (heatmapRows || []).forEach((row) => {
      const dateString = row.date ? (new Date(row.date)).toISOString().slice(0, 10) : null;
      if (dateString) {
        heatmap[dateString] = Number(row.count ?? 0);
      }
    });

    return res.json({
      username: user.username,
      email: user.email,
      total_xp: Number(user.total_xp ?? 0),
      learned_vocabulary_count: learnedVocabularyCount,
      total_study_duration: totalStudyDuration,
      average_accuracy: averageAccuracy,
      quizTrend,
      heatmap,
    });
  } catch (error) {
    console.error('GET /profile/:userId/analytics error', error);
    return res.status(500).json({ error: 'Không thể lấy dữ liệu analytics profile.' });
  }
};

export const markCardLearned = async (req, res) => {
  try {
    const { userId, materialId, flashcardId } = req.body;

    if (!userId || !materialId || !flashcardId) {
      return res.status(400).json({ error: 'Thiếu userId, materialId, hoặc flashcardId.' });
    }

    // Insert or update progress
    await db.query(
      `INSERT INTO user_flashcard_progress (user_id, flashcard_id, material_id, is_learned, times_learned, last_learned_at)
       VALUES (?, ?, ?, 1, 1, NOW())
       ON DUPLICATE KEY UPDATE 
       is_learned = 1, 
       times_learned = times_learned + 1, 
       last_learned_at = NOW()`,
      [userId, flashcardId, materialId]
    );

    // Update user XP
    await db.query('UPDATE users SET total_xp = total_xp + 5 WHERE id = ?', [userId]);

    // Get updated progress
    const [statsRows] = await db.query(
      `SELECT COUNT(*) AS total_cards, 
              SUM(CASE WHEN is_learned = 1 THEN 1 ELSE 0 END) AS learned_cards
       FROM user_flashcard_progress
       WHERE user_id = ? AND material_id = ?`,
      [userId, materialId]
    );

    const stats = statsRows[0] || { total_cards: 0, learned_cards: 0 };
    const progressPercentage =
      stats.total_cards > 0 ? Math.round((stats.learned_cards / stats.total_cards) * 100) : 0;

    return res.json({
      success: true,
      progress: {
        learned_cards: stats.learned_cards,
        total_cards: stats.total_cards,
        progress_percentage: progressPercentage,
      },
    });
  } catch (error) {
    console.error('POST /progress/mark-learned error', error);
    return res.status(500).json({ error: 'Không thể xử lý tiến độ.' });
  }
};

export const updateNodeIndex = async (req, res) => {
  try {
    const { userId, materialId, nodeIndex } = req.body;
    if (!userId || !materialId || nodeIndex === undefined) {
      return res.status(400).json({ error: 'Thiếu tham số bắt buộc.' });
    }

    const [rows] = await db.query(
      'SELECT id FROM learning_path WHERE user_id = ? AND material_id = ?',
      [userId, materialId]
    );

    if (rows.length === 0) {
      await db.query(
        'INSERT INTO learning_path (user_id, material_id, current_card_index, status) VALUES (?, ?, ?, "in_progress")',
        [userId, materialId, nodeIndex]
      );
    } else {
      await db.query(
        'UPDATE learning_path SET current_card_index = ? WHERE user_id = ? AND material_id = ?',
        [nodeIndex, userId, materialId]
      );
    }

    return res.json({ success: true, nodeIndex });
  } catch (error) {
    console.error('POST /progress/update-node-index error', error);
    return res.status(500).json({ error: 'Không thể cập nhật node index.' });
  }
};

export const resetBatchProgress = async (req, res) => {
  try {
    const { userId, materialId, batchIndex } = req.body;

    if (!userId || !materialId || batchIndex === undefined) {
      return res.status(400).json({ error: 'Thiếu tham số.' });
    }

    // Get cards in batch
    const startIdx = batchIndex * CHUNK_SIZE;
    const [cardsRows] = await db.query(
      `SELECT f.id FROM flashcards f
       WHERE f.material_id = ?
       ORDER BY f.id ASC
       LIMIT ?, ?`,
      [materialId, startIdx, CHUNK_SIZE]
    );

    const cardIds = cardsRows.map((r) => r.id);

    if (cardIds.length > 0) {
      // Reset progress for these cards
      const placeholders = cardIds.map(() => '?').join(',');
      await db.query(
        `UPDATE user_flashcard_progress 
         SET is_learned = 0 
         WHERE user_id = ? AND flashcard_id IN (${placeholders})`,
        [userId, ...cardIds]
      );
    }

    return res.json({ success: true, message: 'Đặt lại tiến độ lô thành công.' });
  } catch (error) {
    console.error('POST /progress/reset-batch error', error);
    return res.status(500).json({ error: 'Không thể đặt lại tiến độ lô.' });
  }
};

const bumpLearningPathIndex = async (userId, materialId) => {
  const [rows] = await db.query(
    'SELECT current_card_index FROM learning_path WHERE user_id = ? AND material_id = ?',
    [userId, materialId]
  );

  if (rows.length === 0) {
    await db.query(
      'INSERT INTO learning_path (user_id, material_id, current_card_index, status) VALUES (?, ?, 1, "in_progress")',
      [userId, materialId]
    );
    return 1;
  }

  await db.query(
    'UPDATE learning_path SET current_card_index = current_card_index + 1 WHERE user_id = ? AND material_id = ?',
    [userId, materialId]
  );

  const [updatedRows] = await db.query(
    'SELECT current_card_index FROM learning_path WHERE user_id = ? AND material_id = ?',
    [userId, materialId]
  );
  return updatedRows[0]?.current_card_index ?? null;
};

export const completeFlashcardBatch = async (req, res) => {
  try {
    const { userId, materialId, batchIndex } = req.body;

    if (!userId || !materialId || batchIndex === undefined) {
      return res.status(400).json({ error: 'Thiếu tham số.' });
    }

    const startIdx = batchIndex * CHUNK_SIZE;
    const [cardsRows] = await db.query(
      `SELECT f.id FROM flashcards f
       WHERE f.material_id = ?
       ORDER BY f.id ASC
       LIMIT ?, ?`,
      [materialId, startIdx, CHUNK_SIZE]
    );

    const cardIds = cardsRows.map((r) => r.id);
    if (cardIds.length === 0) {
      return res.status(400).json({ error: 'Không tìm thấy thẻ cho lô này.' });
    }

    const placeholders = cardIds.map(() => '?').join(',');
    await db.query(
      `INSERT INTO user_flashcard_progress
       (user_id, flashcard_id, material_id, is_learned, times_learned, last_learned_at)
       VALUES ${cardIds.map(() => '(?, ?, ?, 1, 1, NOW())').join(', ')}
       ON DUPLICATE KEY UPDATE
         is_learned = 1,
         times_learned = times_learned + 1,
         last_learned_at = NOW()`,
      cardIds.flatMap((cardId) => [userId, cardId, materialId])
    );

    const xpReward = cardIds.length * 5;
    await db.query('UPDATE users SET total_xp = total_xp + ? WHERE id = ?', [xpReward, userId]);
    const currentCardIndex = await bumpLearningPathIndex(userId, materialId);

    return res.json({ success: true, currentCardIndex, learnedCards: cardIds.length });
  } catch (error) {
    console.error('POST /flashcard/complete error', error);
    return res.status(500).json({ error: 'Không thể hoàn thành lô flashcard.' });
  }
};

export const completeQuizNode = async (req, res) => {
  try {
    const { userId, materialId, nodeId, sessionType, batchIndex, totalQuestions, correctAnswers } = req.body;

    if (!userId || !materialId || !nodeId) {
      return res.status(400).json({ error: 'Thiếu tham số.' });
    }

    const score = totalQuestions && correctAnswers !== undefined
      ? (totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0)
      : null;

    await db.query(
      `INSERT INTO quiz_sessions
       (user_id, material_id, node_id, session_type, batch_index, total_questions, correct_answers, score, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        materialId,
        nodeId,
        sessionType || nodeId,
        batchIndex || 0,
        totalQuestions || 0,
        correctAnswers || 0,
        score ?? 0,
      ]
    );

    if (correctAnswers !== undefined) {
      const xpReward = Math.round(correctAnswers * 10);
      await db.query('UPDATE users SET total_xp = total_xp + ? WHERE id = ?', [xpReward, userId]);
    }

    const currentCardIndex = await bumpLearningPathIndex(userId, materialId);
    return res.json({ success: true, currentCardIndex, score });
  } catch (error) {
    console.error('POST /quiz/complete-node error', error);
    return res.status(500).json({ error: 'Không thể hoàn thành node quiz.' });
  }
};

export const saveQuizAnswer = async (req, res) => {
  try {
    const { userId, materialId, batchIndex, questionIndex, quizStepType, isCorrect } = req.body;

    if (
      !userId ||
      !materialId ||
      batchIndex === undefined ||
      questionIndex === undefined ||
      isCorrect === undefined
    ) {
      return res.status(400).json({ error: 'Thiếu tham số.' });
    }

    const encodedIndex = encodeQuestionIndex(quizStepType, questionIndex);

    await db.query(
      `INSERT INTO quiz_question_progress (user_id, material_id, batch_index, question_index, is_correct, answered_at)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE is_correct = VALUES(is_correct), answered_at = NOW()`,
      [userId, materialId, batchIndex, encodedIndex, isCorrect ? 1 : 0]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('POST /progress/save-quiz-answer error', error);
    return res.status(500).json({ error: 'Không thể lưu câu trả lời.' });
  }
};

export const getQuizProgress = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const materialId = Number(req.params.materialId);
    const batchIndex = Number(req.params.batchIndex);
    const quizStepType = req.params.quizStepType;

    if (!userId || !materialId || Number.isNaN(batchIndex) || !quizStepType) {
      return res.status(400).json({ error: 'Thiếu tham số truy vấn quiz progress.' });
    }

    const range = getQuizQuestionRange(quizStepType);
    const [rows] = await db.query(
      `SELECT question_index, is_correct FROM quiz_question_progress
       WHERE user_id = ? AND material_id = ? AND batch_index = ?
         AND question_index BETWEEN ? AND ?
       ORDER BY question_index ASC`,
      [userId, materialId, batchIndex, range.min, range.max]
    );

    return res.json({ answers: rows.map((row) => ({
      questionIndex: row.question_index - QUIZ_STEP_OFFSETS[quizStepType],
      isCorrect: Boolean(row.is_correct),
    })) });
  } catch (error) {
    console.error('GET /progress/quiz-progress error', error);
    return res.status(500).json({ error: 'Không thể lấy tiến độ quiz.' });
  }
};

export const completeQuizSession = async (req, res) => {
  try {
    const { userId, materialId, sessionType, batchIndex, totalQuestions, correctAnswers } = req.body;

    if (
      !userId ||
      !materialId ||
      !sessionType ||
      batchIndex === undefined ||
      totalQuestions === undefined ||
      correctAnswers === undefined
    ) {
      return res.status(400).json({ error: 'Thiếu tham số.' });
    }

    const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    const [result] = await db.query(
      `INSERT INTO quiz_sessions 
       (user_id, material_id, session_type, batch_index, total_questions, correct_answers, score, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, materialId, sessionType, batchIndex, totalQuestions, correctAnswers, score]
    );

    const xpReward = Math.round(correctAnswers * 10);
    await db.query('UPDATE users SET total_xp = total_xp + ? WHERE id = ?', [xpReward, userId]);
    const currentCardIndex = await bumpLearningPathIndex(userId, materialId);

    return res.json({
      success: true,
      quizSessionId: result.insertId,
      score,
      xpEarned: xpReward,
      currentCardIndex,
    });
  } catch (error) {
    console.error('POST /progress/complete-quiz error', error);
    return res.status(500).json({ error: 'Không thể lưu kết quả bài kiểm tra.' });
  }
};

export const getHomeWrongWords = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) {
      return res.status(400).json({ error: 'Thiếu userId.' });
    }

    // Lấy 5 từ sai gần nhất
    const [rows] = await db.query(`
      SELECT f.kanji, f.meaning
      FROM quiz_question_progress qqp
      JOIN flashcards f ON qqp.material_id = f.material_id AND qqp.question_index = f.id
      WHERE qqp.user_id = ? AND qqp.is_correct = 0
      ORDER BY qqp.answered_at DESC
      LIMIT 5
    `, [userId]);

    const wrongWords = rows.map(row => ({ kanji: row.kanji || '', meaning: row.meaning }));

    return res.json({ wrongWords });
  } catch (error) {
    console.error('GET /home/wrong-words error', error);
    return res.status(500).json({ error: 'Không thể lấy danh sách từ sai.' });
  }
};

export const getLearnedCards = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const materialId = Number(req.params.materialId);
    
    if (!userId || !materialId) {
      return res.status(400).json({ error: 'Thiếu tham số.' });
    }

    const [rows] = await db.query(
      'SELECT flashcard_id FROM user_flashcard_progress WHERE user_id = ? AND material_id = ? AND is_learned = 1',
      [userId, materialId]
    );

    const learnedCardIds = rows.map(r => r.flashcard_id);
    return res.json({ learnedCardIds });
  } catch (error) {
    console.error('GET /progress/learned-cards error', error);
    return res.status(500).json({ error: 'Không thể lấy danh sách thẻ đã học.' });
  }
};
