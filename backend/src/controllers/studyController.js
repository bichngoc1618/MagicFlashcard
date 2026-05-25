import db from '../config/db.js';

// --- HÀM TRỢ GIÚP (HELPER) ---
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

const recalculateStreakFromActivity = async (userId) => {
  const today = new Date();
  const todayStr = formatDate(today);
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

  const activityDates = (rows || []).map((row) => formatDate(row.activity_date));
  let streak = 0;
  let expectedDate = todayStr;

  for (const date of activityDates) {
    if (date !== expectedDate) break;
    streak += 1;
    const nextDate = new Date(expectedDate);
    nextDate.setDate(nextDate.getDate() - 1);
    expectedDate = formatDate(nextDate);
  }

  const latestDate = activityDates[0] || todayStr;
  await db.query('UPDATE users SET streak_count = ?, last_node_completed_date = ?, last_study_date = ? WHERE id = ?', [streak, latestDate, latestDate, userId]);
  return streak;
};

// --- CÁC HÀM EXPORT CHÍNH ---

// 1. Lấy lộ trình zigzag (Hàm này chúng ta vừa viết)
export const getStudyPath = async (req, res) => {
  const { userId, materialId } = req.params;
  try {
    const [material] = await db.query("SELECT * FROM study_materials WHERE id = ?", [materialId]);
    const [cards] = await db.query("SELECT id, is_learned FROM flashcards WHERE material_id = ?", [materialId]);
    const [progress] = await db.query(
      "SELECT current_card_index FROM learning_path WHERE user_id = ? AND material_id = ?",
      [userId, materialId]
    );

    const totalCards = cards.length;
    const currentNodeIndex = progress[0]?.current_card_index || 0;

    // Logic tạo nodes (Giữ nguyên phần zigzag tớ đã viết cho bạn)
    let nodes = [];
    // ... (Phần logic tạo nodes của bạn ở đây) ...

    const totalNodes = nodes.length;
    const completedNodes = Math.min(Math.max(Number(currentNodeIndex) || 0, 0), totalNodes);
    const progressPercentage = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

    res.json({
      material: material[0],
      journeyNodes: nodes,
      currentActiveNodeIndex: currentNodeIndex,
      totalNodes,
      completedNodes,
      progressPercentage,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// 2. Bắt đầu phiên học (Hàm startStudy mà bạn đang thiếu export)
export const startStudy = async (req, res) => {
  try {
    const materialId = Number(req.params.materialId);
    const userId = req.body?.userId || 1;

    console.log(`📚 Starting study session: userId=${userId}, materialId=${materialId}`);

    let [pathRows] = await db.query('SELECT * FROM learning_path WHERE material_id = ? AND user_id = ?', [materialId, userId]);
    if (pathRows.length === 0) {
      await db.query(
        'INSERT INTO learning_path (user_id, material_id, current_card_index, status) VALUES (?, ?, 0, "in_progress")',
        [userId, materialId]
      );
      pathRows = [{ current_card_index: 0 }];
    }

    const [sessionResult] = await db.query(
      'INSERT INTO user_study_sessions (user_id, start_time, date) VALUES (?, NOW(), CURDATE())',
      [userId]
    );

    console.log(`✅ Session created: sessionId=${sessionResult.insertId}`);

    res.json({
      sessionId: sessionResult.insertId,
      current_card_index: pathRows[0]?.current_card_index || 0,
    });
  } catch (error) {
    console.error('❌ POST /study/start error:', error);
    res.status(500).json({ error: 'Không thể bắt đầu học.' });
  }
};

// 3. Đồng bộ tiến độ (Hàm syncStudy mà bạn đang thiếu export)
export const syncStudy = async (req, res) => {
  try {
    const { userId, materialId, cardId, isLearned, currentNodeIndex, sessionId } = req.body;

    if (typeof userId === 'undefined' || typeof materialId === 'undefined' || materialId === null) {
      return res.status(400).json({ error: 'Missing required fields: userId and materialId are required.' });
    }

    const updates = [];
    let shouldUpdateStreak = false;
    let advancedToNodeIndex = null;
    if (cardId && isLearned) {
      updates.push(db.query(
        `INSERT INTO user_flashcard_progress
         (user_id, flashcard_id, material_id, is_learned, times_learned, last_learned_at)
         VALUES (?, ?, ?, 1, 1, NOW())
         ON DUPLICATE KEY UPDATE
           is_learned = 1,
           times_learned = times_learned + 1,
           last_learned_at = NOW()`,
        [userId, cardId, materialId]
      ));
      
      updates.push(db.query(
        `INSERT INTO user_srs_progress
         (user_id, flashcard_id, material_id, repetition, interval_days, easiness_factor, next_review_date)
         VALUES (?, ?, ?, 0, 1, 2.5, DATE_ADD(NOW(), INTERVAL 1 DAY))
         ON DUPLICATE KEY UPDATE material_id = material_id`,
        [userId, cardId, materialId]
      ));
      updates.push(db.query('UPDATE users SET total_xp = total_xp + 5 WHERE id = ?', [userId]));
    }

    if (currentNodeIndex !== undefined) {
      const [pathRows] = await db.query('SELECT current_card_index FROM learning_path WHERE material_id = ? AND user_id = ?', [materialId, userId]);
      const existingIndex = pathRows[0]?.current_card_index ?? 0;

      if (pathRows.length > 0) {
        if (currentNodeIndex > existingIndex + 1) {
          return res.status(400).json({ error: 'Cannot advance by more than one step at a time.' });
        }
        if (currentNodeIndex > existingIndex) {
          updates.push(db.query(
            'UPDATE learning_path SET current_card_index = ? WHERE material_id = ? AND user_id = ?',
            [currentNodeIndex, materialId, userId]
          ));
          // Mark that we advanced to a new node so we can update streak/last_node_completed_date
          shouldUpdateStreak = true;
          advancedToNodeIndex = currentNodeIndex;
        }
      } else {
        updates.push(db.query(
          'INSERT INTO learning_path (user_id, material_id, current_card_index, status) VALUES (?, ?, ?, "in_progress")',
          [userId, materialId, currentNodeIndex]
        ));
        shouldUpdateStreak = true;
        advancedToNodeIndex = currentNodeIndex;
      }
    }

    await Promise.all(updates);

    if (sessionId) {
      await ensureStudySessionForToday(userId, sessionId);
    } else {
      const nodeCompletedFlag = req.body?.nodeCompleted;
      if ((shouldUpdateStreak && advancedToNodeIndex !== null) || nodeCompletedFlag) {
        await ensureStudySessionForToday(userId);
      }
    }

    // Nếu người dùng vừa hoàn thành/tiến tới node mới, cập nhật streak dựa trên nhật ký hoạt động
    try {
      const nodeCompletedFlag = req.body?.nodeCompleted;
      if ((shouldUpdateStreak && advancedToNodeIndex !== null) || nodeCompletedFlag) {
        await recalculateStreakFromActivity(userId);
      }
    } catch (err) {
      console.warn('Không thể cập nhật streak từ nhật ký hoạt động:', err.message || err);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('POST /study/sync error', error);
    res.status(500).json({ error: 'Lỗi đồng bộ.' });
  }
};