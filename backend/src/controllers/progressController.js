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

const getSeparatedTotalBatches = (totalCards, learnedCards) => {
  const learnedCount = Number(learnedCards) || 0;
  const unlearnedCount = Math.max(0, (Number(totalCards) || 0) - learnedCount);
  
  const getHelperBatches = (count) => {
    if (!count || count <= 0) return 0;
    const numFullChunks = Math.floor(count / CHUNK_SIZE);
    const remainder = count % CHUNK_SIZE;
    if (numFullChunks === 0) return 1;
    return remainder >= 6 ? numFullChunks + 1 : numFullChunks;
  };
  
  return getHelperBatches(learnedCount) + getHelperBatches(unlearnedCount);
};

const chunkVocabularyHelper = (vocabList) => {
  const N = vocabList.length;
  if (N === 0) return [];

  const numFullChunks = Math.floor(N / CHUNK_SIZE);
  const R = N % CHUNK_SIZE;

  if (numFullChunks === 0) {
    return [vocabList];
  }

  const chunks = [];

  if (R >= 6) {
    for (let i = 0; i < numFullChunks; i++) {
      chunks.push(vocabList.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
    }
    chunks.push(vocabList.slice(numFullChunks * CHUNK_SIZE));
  } else if (R > 0) {
    const chunkSizes = new Array(numFullChunks).fill(CHUNK_SIZE);
    let remaining = R;
    let idx = numFullChunks - 1;

    while (remaining > 0) {
      chunkSizes[idx]++;
      remaining--;
      idx--;
      if (idx < 0) idx = numFullChunks - 1;
    }

    let start = 0;
    for (let i = 0; i < numFullChunks; i++) {
      const size = chunkSizes[i];
      chunks.push(vocabList.slice(start, start + size));
      start += size;
    }
  } else {
    for (let i = 0; i < numFullChunks; i++) {
      chunks.push(vocabList.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
    }
  }

  return chunks;
};

const chunkVocabulary = (vocabList) => {
  const learned = vocabList.filter((item) => item && item.is_learned === 1);
  const unlearned = vocabList.filter((item) => !item || item.is_learned !== 1);

  const chunksLearned = chunkVocabularyHelper(learned);
  const chunksUnlearned = chunkVocabularyHelper(unlearned);

  return [...chunksLearned, ...chunksUnlearned];
};

const getSortedAndChunkedFlashcards = async (userId, materialId) => {
  const [flashcards] = await db.query(
    `SELECT
       f.id,
       f.word,
       f.kanji,
       f.meaning,
       f.example,
       COALESCE(ufp.is_learned, 0) AS is_learned
     FROM flashcards f
     LEFT JOIN user_flashcard_progress ufp
       ON ufp.flashcard_id = f.id AND ufp.user_id = ?
     WHERE f.material_id = ?
     ORDER BY COALESCE(ufp.is_learned, 0) DESC, f.id ASC`,
    [userId, materialId]
  );
  return chunkVocabulary(flashcards);
};

const calculateJourneyNodeProgress = (totalCards, learnedCards, currentCardIndex = 0) => {
  const totalBatches = getSeparatedTotalBatches(totalCards, learnedCards);
  const totalNodes = totalBatches > 0 ? totalBatches * 5 + Math.floor((totalBatches - 1) / 2) + 1 : 0;
  const completedNodes = Math.min(Math.max(Number(currentCardIndex) || 0, 0), totalNodes);
  const progressPercentage = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;
  return { totalBatches, totalNodes, completedNodes, progressPercentage };
};

const formatDate = (value) => {
  const date = new Date(value);
  const timezoneOffsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
};

const calculateMinutes = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return Math.max(0, Math.round((end - start) / 60000));
};

const getActivityDatesForUser = async (userId) => {
  const [rows] = await db.query(
    `SELECT DISTINCT DATE(activity_date) AS activity_date
     FROM (
       SELECT date AS activity_date FROM user_study_sessions WHERE user_id = ?
       UNION
       SELECT DATE(completed_at) AS activity_date FROM quiz_sessions WHERE user_id = ?
     ) AS all_activity
     WHERE activity_date IS NOT NULL
     ORDER BY activity_date DESC`,
    [userId, userId]
  );
  return (rows || []).map((row) => formatDate(row.activity_date));
};

const calculateStreakFromDates = (dates) => {
  if (!Array.isArray(dates) || dates.length === 0) return 0;
  let streak = 0;
  let expectedDate = dates[0];

  for (const date of dates) {
    if (date !== expectedDate) break;
    streak += 1;
    const nextDate = new Date(expectedDate);
    nextDate.setDate(nextDate.getDate() - 1);
    expectedDate = formatDate(nextDate);
  }

  return streak;
};

const ensureStudySessionForToday = async (userId, sessionId = null) => {
  const today = formatDate(new Date());
  if (sessionId) {
    const [rows] = await db.query('SELECT id, start_time FROM user_study_sessions WHERE id = ?', [sessionId]);
    if (rows.length > 0) {
      const startTime = rows[0].start_time;
      const endTime = new Date();
      const duration = calculateMinutes(startTime, endTime);
      await db.query('UPDATE user_study_sessions SET end_time = ?, duration = ? WHERE id = ?', [endTime, duration, sessionId]);
      return sessionId;
    }
  }

  const [existingRows] = await db.query(
    'SELECT id, start_time FROM user_study_sessions WHERE user_id = ? AND date = ? ORDER BY id DESC LIMIT 1',
    [userId, today]
  );

  if (existingRows.length > 0) {
    const startTime = existingRows[0].start_time;
    const endTime = new Date();
    const duration = calculateMinutes(startTime, endTime);
    await db.query('UPDATE user_study_sessions SET end_time = ?, duration = ? WHERE id = ?', [endTime, duration, existingRows[0].id]);
    return existingRows[0].id;
  }

  const [result] = await db.query(
    'INSERT INTO user_study_sessions (user_id, start_time, end_time, duration, date) VALUES (?, NOW(), NOW(), 0, CURDATE())',
    [userId]
  );
  return result.insertId;
};

const updateUserStreakForToday = async (userId) => {
  const activityDates = await getActivityDatesForUser(userId);
  const newStreak = calculateStreakFromDates(activityDates);
  const latestDate = activityDates[0] || formatDate(new Date());
  await db.query(
    'UPDATE users SET streak_count = ?, last_node_completed_date = ?, last_study_date = ? WHERE id = ?',
    [newStreak, latestDate, latestDate, userId]
  );
  return newStreak;
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

    const [[{ count: totalCards }]] = await db.query(
      'SELECT COUNT(*) AS count FROM flashcards WHERE material_id = ?',
      [materialId]
    );

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

    const learnedCount = learnedCardIds.size;
    const totalBatches = getSeparatedTotalBatches(totalCards, learnedCount);

    const journeyNodes = generateJourneyNodes(totalBatches);
    const totalNodes = journeyNodes.length;
    const completedNodes = Math.min(Math.max(Number(currentCardIndex) || 0, 0), totalNodes);
    const progressPercentage = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

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

    // Tính streak_count chuẩn xác dựa trên lịch sử hoạt động (giống Analytics)
    const [activityRows] = await db.query(
      `SELECT DISTINCT activity_date AS date
       FROM (
         SELECT DATE(date) AS activity_date FROM user_study_sessions WHERE user_id = ?
         UNION
         SELECT DATE(completed_at) AS activity_date FROM quiz_sessions WHERE user_id = ? AND completed_at IS NOT NULL
       ) AS all_activity
       WHERE activity_date IS NOT NULL
       ORDER BY activity_date DESC`,
      [userId, userId]
    );

    const activityDates = (activityRows || []).map((row) => row.date ? new Date(row.date).toISOString().slice(0, 10) : null).filter(Boolean);
    let calculatedStreak = 0;
    let expectedDate = activityDates.length > 0 ? new Date(activityDates[0]) : null;

    if (expectedDate) {
      expectedDate = new Date(expectedDate.toISOString().slice(0, 10));
      for (const dateString of activityDates) {
        if (dateString === expectedDate.toISOString().slice(0, 10)) {
          calculatedStreak += 1;
          expectedDate.setDate(expectedDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

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
      username: user.username,
      email: user.email,
      total_xp: Number(user.total_xp ?? 0),
      streak_count: calculatedStreak,
      total_time: Number(user.total_time ?? 0),
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

    const [answersRows] = await db.query(
      `SELECT COALESCE(SUM(total_questions), 0) AS total_answers
       FROM quiz_sessions
       WHERE user_id = ?`,
      [userId]
    );
    const totalAnswers = Number(answersRows[0]?.total_answers ?? 0);

    const [totalCardsRows] = await db.query(
      `SELECT COUNT(f.id) AS total_cards
       FROM study_materials sm
       LEFT JOIN flashcards f ON sm.id = f.material_id
       WHERE sm.user_id = ?`,
      [userId]
    );
    const totalCards = Number(totalCardsRows[0]?.total_cards ?? 0);

    const [inProgressRows] = await db.query(
      `SELECT COUNT(*) AS in_progress_count
       FROM user_flashcard_progress
       WHERE user_id = ?
         AND is_learned = 0`,
      [userId]
    );
    const inProgressCount = Number(inProgressRows[0]?.in_progress_count ?? 0);
    const notLearnedCount = Math.max(totalCards - learnedVocabularyCount - inProgressCount, 0);

    const [weeklyRows] = await db.query(
      `SELECT activity_date AS date, COUNT(*) AS count
       FROM (
         SELECT DATE(date) AS activity_date FROM user_study_sessions WHERE user_id = ?
         UNION ALL
         SELECT DATE(completed_at) AS activity_date FROM quiz_sessions WHERE user_id = ? AND completed_at IS NOT NULL
       ) AS activity_union
       WHERE activity_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY activity_date
       ORDER BY activity_date ASC`,
      [userId, userId]
    );

    const weeklyActivityMap = {};
    (weeklyRows || []).forEach((row) => {
      const dateString = row.date ? new Date(row.date).toISOString().slice(0, 10) : null;
      if (dateString) {
        weeklyActivityMap[dateString] = Number(row.count ?? 0);
      }
    });

    const weeklyActivity = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      weeklyActivity.push(Boolean(weeklyActivityMap[key]));
    }

    // Tính streak dựa trên những ngày liên tục có hoạt động, không chỉ 7 ngày gần nhất.
    const [activityRows] = await db.query(
      `SELECT DISTINCT activity_date AS date
       FROM (
         SELECT DATE(date) AS activity_date FROM user_study_sessions WHERE user_id = ?
         UNION
         SELECT DATE(completed_at) AS activity_date FROM quiz_sessions WHERE user_id = ? AND completed_at IS NOT NULL
       ) AS all_activity
       WHERE activity_date IS NOT NULL
       ORDER BY activity_date DESC`,
      [userId, userId]
    );

    const activityDates = (activityRows || []).map((row) => row.date ? formatDate(row.date) : null).filter(Boolean);
    let streakDays = 0;
    let expectedDate = activityDates.length > 0 ? new Date(activityDates[0]) : null;

    if (expectedDate) {
      expectedDate = new Date(expectedDate.toISOString().slice(0, 10));
      for (const dateString of activityDates) {
        if (dateString === expectedDate.toISOString().slice(0, 10)) {
          streakDays += 1;
          expectedDate.setDate(expectedDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

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
        date: row.date ? formatDate(row.date) : null,
        score: Number(row.average_score ?? 0),
      }))
      .filter((item) => item.date !== null)
      .reverse();

    const [heatmapRows] = await db.query(
      `SELECT activity_date AS date, COUNT(*) AS count
       FROM (
         SELECT DATE(date) AS activity_date FROM user_study_sessions WHERE user_id = ?
         UNION ALL
         SELECT DATE(completed_at) AS activity_date FROM quiz_sessions WHERE user_id = ? AND completed_at IS NOT NULL
       ) AS activity_union
       WHERE activity_date >= DATE_SUB(CURDATE(), INTERVAL 27 DAY)
       GROUP BY activity_date
       ORDER BY activity_date ASC`,
      [userId, userId]
    );

    const heatmap = {};
    (heatmapRows || []).forEach((row) => {
      const dateString = row.date ? formatDate(row.date) : null;
      if (dateString) {
        heatmap[dateString] = Number(row.count ?? 0);
      }
    });

    return res.json({
      username: user.username,
      email: user.email,
      total_xp: Number(user.total_xp ?? 0),
      totalXP: Number(user.total_xp ?? 0),
      streakDays,
      totalAnswers: totalAnswers,
      learned_vocabulary_count: learnedVocabularyCount,
      learnedVocabularyCount: learnedVocabularyCount,
      total_study_duration: totalStudyDuration,
      totalStudyDuration: totalStudyDuration,
      average_accuracy: averageAccuracy,
      averageAccuracy: averageAccuracy,
      vocabStats: {
        mastered: learnedVocabularyCount,
        learning: inProgressCount,
        notLearned: notLearnedCount,
      },
      weeklyActivity,
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

    const chunks = await getSortedAndChunkedFlashcards(userId, materialId);
    const batch = chunks[batchIndex] || [];
    const cardIds = batch.map((r) => r.id);

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

    const chunks = await getSortedAndChunkedFlashcards(userId, materialId);
    const batch = chunks[batchIndex] || [];
    const cardIds = batch.map((r) => r.id);
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
    await ensureStudySessionForToday(userId);
    await updateUserStreakForToday(userId);

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
    await ensureStudySessionForToday(userId);
    await updateUserStreakForToday(userId);
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
    await ensureStudySessionForToday(userId);
    await updateUserStreakForToday(userId);

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

    // Lấy 5 từ sai trong quiz gần nhất — tìm completed_at mới nhất rồi lấy câu trả lời sai trong khoảng thời gian gần đó
    const [[lastRow]] = await db.query(
      `SELECT MAX(completed_at) AS last_completed_at FROM quiz_sessions WHERE user_id = ? AND completed_at IS NOT NULL`,
      [userId]
    );

    let rows = [];
    if (lastRow && lastRow.last_completed_at) {
      // Chọn những câu trả lời có timestamp trong vòng 2 giờ trước completed_at
      const [recentRows] = await db.query(
        `WITH numbered_flashcards AS (
           SELECT f.id, f.material_id, f.kanji, f.meaning,
                  ROW_NUMBER() OVER (
                    PARTITION BY f.material_id 
                    ORDER BY COALESCE(ufp.is_learned, 0) DESC, f.id ASC
                  ) - 1 AS row_num
           FROM flashcards f
           LEFT JOIN user_flashcard_progress ufp 
             ON ufp.flashcard_id = f.id AND ufp.user_id = ?
         )
         SELECT nf.kanji, nf.meaning
         FROM quiz_question_progress qqp
         JOIN numbered_flashcards nf 
           ON qqp.material_id = nf.material_id 
           AND (qqp.batch_index * 10 + (qqp.question_index % 10)) = nf.row_num
         WHERE qqp.user_id = ? AND qqp.is_correct = 0
           AND qqp.answered_at <= ?
           AND qqp.answered_at >= DATE_SUB(?, INTERVAL 2 HOUR)
         ORDER BY qqp.answered_at DESC
         LIMIT 5`,
        [userId, userId, lastRow.last_completed_at, lastRow.last_completed_at]
      );

      rows = recentRows;
    }

    // Fallback: nếu không có quiz gần nhất hoặc không tìm thấy câu sai, dùng 5 câu sai gần nhất theo thời gian
    if (!rows || rows.length === 0) {
      const [fallbackRows] = await db.query(`
        WITH numbered_flashcards AS (
           SELECT f.id, f.material_id, f.kanji, f.meaning,
                  ROW_NUMBER() OVER (
                    PARTITION BY f.material_id 
                    ORDER BY COALESCE(ufp.is_learned, 0) DESC, f.id ASC
                  ) - 1 AS row_num
           FROM flashcards f
           LEFT JOIN user_flashcard_progress ufp 
             ON ufp.flashcard_id = f.id AND ufp.user_id = ?
         )
         SELECT nf.kanji, nf.meaning
         FROM quiz_question_progress qqp
         JOIN numbered_flashcards nf 
           ON qqp.material_id = nf.material_id 
           AND (qqp.batch_index * 10 + (qqp.question_index % 10)) = nf.row_num
         WHERE qqp.user_id = ? AND qqp.is_correct = 0
         ORDER BY qqp.answered_at DESC
         LIMIT 5
      `, [userId, userId]);
      rows = fallbackRows;
    }

    const wrongWords = (rows || []).map(row => ({ kanji: row.kanji || '', meaning: row.meaning }));

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
