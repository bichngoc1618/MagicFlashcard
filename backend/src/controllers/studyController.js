import db from '../config/db.js';

// --- HÀM TRỢ GIÚP (HELPER) ---
const formatDate = (value) => new Date(value).toISOString().slice(0, 10);

const calculateMinutes = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return Math.max(0, Math.round((end - start) / 60000));
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

    res.json({
      material: material[0],
      journeyNodes: nodes,
      currentActiveNodeIndex: currentNodeIndex,
      progressPercentage: totalCards > 0 ? Math.round((cards.filter(c => c.is_learned).length / totalCards) * 100) : 0
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// 2. Bắt đầu phiên học (Hàm startStudy mà bạn đang thiếu export)
export const startStudy = async (req, res) => {
  try {
    const materialId = Number(req.params.materialId);
    const userId = req.body.userId || 1;

    let [pathRows] = await db.query('SELECT * FROM learning_path WHERE material_id = ? AND user_id = ?', [materialId, userId]);
    if (pathRows.length === 0) {
      await db.query(
        'INSERT INTO learning_path (user_id, material_id, current_card_index, status) VALUES (?, ?, 0, "in_progress")',
        [userId, materialId]
      );
      pathRows = [{ current_card_index: 0 }];
    }

    const [sessionResult] = await db.query(
      'INSERT INTO user_study_sessions (user_id, start_time, date) VALUES (?, NOW(), ?)',
      [userId, formatDate(new Date())]
    );

    res.json({
      sessionId: sessionResult.insertId,
      current_card_index: pathRows[0]?.current_card_index || 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Không thể bắt đầu học.' });
  }
};

// 3. Đồng bộ tiến độ (Hàm syncStudy mà bạn đang thiếu export)
export const syncStudy = async (req, res) => {
  try {
    const { userId, materialId, cardId, isLearned, currentNodeIndex, sessionId } = req.body;

    const updates = [];
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
        }
      } else {
        updates.push(db.query(
          'INSERT INTO learning_path (user_id, material_id, current_card_index, status) VALUES (?, ?, ?, "in_progress")',
          [userId, materialId, currentNodeIndex]
        ));
      }
    }

    await Promise.all(updates);

    // Cập nhật session nếu có sessionId
    if (sessionId) {
      const now = new Date();
      await db.query('UPDATE user_study_sessions SET end_time = ? WHERE id = ?', [now, sessionId]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('POST /study/sync error', error);
    res.status(500).json({ error: 'Lỗi đồng bộ.' });
  }
};