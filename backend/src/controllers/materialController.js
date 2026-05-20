import db from '../config/db.js';
import { seedDefaultStudyContent } from '../config/defaultSeed.js';

const CHUNK_SIZE = 10;

const getTotalBatches = (totalCards) => {
  if (!totalCards || totalCards <= 0) return 0;
  const numFullChunks = Math.floor(totalCards / CHUNK_SIZE);
  const remainder = totalCards % CHUNK_SIZE;
  if (numFullChunks === 0) return 1;
  return remainder >= 6 ? numFullChunks + 1 : numFullChunks;
};

const calculateNodeProgress = (totalCards, currentNodeIndex = 0) => {
  const totalBatches = getTotalBatches(totalCards);
  const totalNodes = totalBatches > 0 ? totalBatches * 5 + Math.floor((totalBatches - 1) / 2) + 1 : 0;
  const completedNodes = Math.min(Math.max(Number(currentNodeIndex) || 0, 0), totalNodes);
  const progressPercentage = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;
  return { totalNodes, completedNodes, progressPercentage };
};

export const getMaterials = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const [materials] = await db.query(
      `SELECT
         m.id,
         m.title,
         m.description,
         m.created_at,
         COALESCE(COUNT(f.id), 0) AS total_cards,
         COALESCE(SUM(COALESCE(ufp.is_learned, 0)), 0) AS learned_cards,
         COALESCE(lp.current_card_index, 0) AS current_card_index,
         COALESCE(lp.status, 'in_progress') AS status
       FROM study_materials m
       LEFT JOIN flashcards f ON f.material_id = m.id
       LEFT JOIN user_flashcard_progress ufp ON ufp.flashcard_id = f.id AND ufp.user_id = ?
       LEFT JOIN learning_path lp ON lp.material_id = m.id AND lp.user_id = ?
       WHERE m.user_id = ?
       GROUP BY m.id
       ORDER BY m.created_at DESC`,
      [userId, userId, userId]
    );

    const materialsWithProgress = materials.map((item) => {
      const { totalNodes, completedNodes, progressPercentage } = calculateNodeProgress(item.total_cards, item.current_card_index);
      return {
        ...item,
        total_nodes: totalNodes,
        completed_nodes: completedNodes,
        node_progress_percentage: progressPercentage,
        progress_percentage: progressPercentage,
      };
    });

    return res.json({ materials: materialsWithProgress });
  } catch (error) {
    console.error('GET /materials error', error);
    return res.status(500).json({ error: 'Không thể lấy danh sách tài liệu.' });
  }
};

export const createMaterial = async (req, res) => {
  try {
    const { userId, title, description } = req.body;
    if (!userId || !title) {
      return res.status(400).json({ error: 'Thiếu userId hoặc title.' });
    }

    const [result] = await db.query(
      'INSERT INTO study_materials (user_id, title, description) VALUES (?, ?, ?)',
      [Number(userId), title, description || null]
    );

    return res.json({ materialId: result.insertId, title, description: description || '' });
  } catch (error) {
    console.error('POST /materials error', error);
    return res.status(500).json({ error: 'Không thể tạo study material mới.' });
  }
};

export const createFlashcard = async (req, res) => {
  try {
    const { materialId, word, kanji, meaning, example } = req.body;
    if (!materialId || !word) {
      return res.status(400).json({ error: 'Thiếu materialId hoặc word.' });
    }

    const [result] = await db.query(
      'INSERT INTO flashcards (material_id, word, kanji, meaning, example) VALUES (?, ?, ?, ?, ?)',
      [Number(materialId), word, kanji || null, meaning || null, example || null]
    );

    return res.json({ flashcardId: result.insertId, materialId: Number(materialId), word, kanji, meaning, example });
  } catch (error) {
    console.error('POST /flashcards error', error);
    return res.status(500).json({ error: 'Không thể tạo flashcard mới.' });
  }
};

export const createFlashcardsBulk = async (req, res) => {
  try {
    const { materialId, cards } = req.body;
    if (!materialId || !Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ error: 'Thiếu materialId hoặc cards.' });
    }

    const values = cards.map((card) => [
      Number(materialId),
      card.word,
      card.kanji || null,
      card.meaning || null,
      card.example || null
    ]);

    await db.query(
      'INSERT INTO flashcards (material_id, word, kanji, meaning, example) VALUES ?',
      [values]
    );

    return res.json({ inserted: values.length });
  } catch (error) {
    console.error('POST /flashcards/bulk error', error);
    return res.status(500).json({ error: 'Không thể tạo hàng loạt flashcards.' });
  }
};

export const seedDefaultMaterials = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const result = await seedDefaultStudyContent(userId);
    return res.json(result);
  } catch (error) {
    console.error('POST /materials/seed-default error', error);
    return res.status(500).json({ error: 'Không thể tạo dữ liệu mẫu.' });
  }
};

export const getFlashcards = async (req, res) => {
  try {
    const materialId = Number(req.params.materialId);
    const userId = Number(req.query.userId) || null;
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
       ORDER BY f.id ASC`,
      [userId, materialId]
    );

    return res.json({ flashcards });
  } catch (error) {
    console.error('GET /flashcards error', error);
    return res.status(500).json({ error: 'Không thể lấy flashcards.' });
  }
};

export const getStudyJourney = async (req, res) => {
  try {
    const materialId = Number(req.params.materialId);
    const [materials] = await db.query(
      'SELECT id, user_id, title, description FROM study_materials WHERE id = ?',
      [materialId]
    );
    const material = materials[0];
    if (!material) {
      return res.status(404).json({ error: 'Tài liệu không tồn tại.' });
    }

    const userId = Number(req.query.userId) || material.user_id;
    const [pathRows] = await db.query(
      'SELECT current_card_index, status FROM learning_path WHERE material_id = ? AND user_id = ?',
      [materialId, userId]
    );
    const learningPath = pathRows[0] || { current_card_index: 0, status: 'not_started' };

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
       ORDER BY f.id ASC`,
      [userId, materialId]
    );

    const [statsRows] = await db.query(
      `SELECT
         COUNT(*) AS total_cards,
         SUM(CASE WHEN COALESCE(ufp.is_learned, 0) = 1 THEN 1 ELSE 0 END) AS learned_cards
       FROM flashcards f
       LEFT JOIN user_flashcard_progress ufp
         ON ufp.flashcard_id = f.id AND ufp.user_id = ?
       WHERE f.material_id = ?`,
      [userId, materialId]
    );
    const stats = statsRows[0] || { total_cards: 0, learned_cards: 0 };

    const totalBatches = getTotalBatches(stats.total_cards);
    const totalNodes = totalBatches > 0 ? totalBatches * 5 + Math.floor((totalBatches - 1) / 2) + 1 : 0;
    const completedNodes = Math.min(Math.max(Number(learningPath.current_card_index) || 0, 0), totalNodes);
    const progressPercentage = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

    return res.json({
      material: {
        id: material.id,
        title: material.title,
        description: material.description,
        user_id: material.user_id,
        total_cards: stats.total_cards,
        learned_cards: stats.learned_cards,
        total_nodes: totalNodes,
        completed_nodes: completedNodes,
        progress_percentage: progressPercentage,
        learningPath,
      },
      flashcards,
    });
  } catch (error) {
    console.error('GET /study/journey error', error);
    return res.status(500).json({ error: 'Không thể lấy dữ liệu hành trình học.' });
  }
};

export const updateFlashcard = async (req, res) => {
  try {
    const flashcardId = Number(req.params.flashcardId);
    const { word, kanji, meaning, example } = req.body;
    if (!flashcardId || !word) {
      return res.status(400).json({ error: 'Thiếu flashcardId hoặc word.' });
    }

    await db.query(
      'UPDATE flashcards SET word = ?, kanji = ?, meaning = ?, example = ? WHERE id = ?',
      [word, kanji || null, meaning || null, example || null, flashcardId]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('PUT /flashcards/:id error', error);
    return res.status(500).json({ error: 'Không thể cập nhật flashcard.' });
  }
};

export const deleteFlashcard = async (req, res) => {
  try {
    const flashcardId = Number(req.params.flashcardId);
    if (!flashcardId) {
      return res.status(400).json({ error: 'Thiếu flashcardId.' });
    }

    await db.query('DELETE FROM flashcards WHERE id = ?', [flashcardId]);
    return res.json({ success: true });
  } catch (error) {
    console.error('DELETE /flashcards/:id error', error);
    return res.status(500).json({ error: 'Không thể xóa flashcard.' });
  }
};

export const getUserStats = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const [userRows] = await db.query('SELECT streak_count, total_xp, last_study_date, global_hearts FROM users WHERE id = ?', [userId]);
    const user = userRows[0];
    if (!user) {
      return res.status(404).json({ error: 'Người dùng không tồn tại.' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const [sessionRows] = await db.query(
      `SELECT SUM(duration) AS totalMinutes FROM user_study_sessions WHERE user_id = ? AND date = ?`,
      [userId, today]
    );
    const todayMinutes = sessionRows[0]?.totalMinutes ?? 0;

    const [activeRows] = await db.query(
      `SELECT start_time FROM user_study_sessions WHERE user_id = ? AND date = ? AND end_time IS NULL ORDER BY start_time DESC LIMIT 1`,
      [userId, today]
    );
    let activeMinutes = 0;
    if (activeRows[0]) {
      activeMinutes = Math.max(0, Math.round((new Date() - new Date(activeRows[0].start_time)) / 60000));
    }

    return res.json({ 
      streakCount: user.streak_count,
      streak_count: user.streak_count,
      total_xp: user.total_xp,
      last_study_date: user.last_study_date,
      global_hearts: user.global_hearts,
      todayMinutes: todayMinutes + activeMinutes 
    });
  } catch (error) {
    console.error('GET /user/stats error', error);
    return res.status(500).json({ error: 'Không thể lấy thống kê người dùng.' });
  }
};
