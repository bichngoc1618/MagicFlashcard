import db from '../config/db.js';
import { seedDefaultStudyContent } from '../config/defaultSeed.js';

const CHUNK_SIZE = 10;

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

const calculateNodeProgress = (totalCards, learnedCards, currentNodeIndex = 0) => {
  const totalBatches = getSeparatedTotalBatches(totalCards, learnedCards);
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
         COALESCE(MAX(lp.current_card_index), 0) AS current_card_index,
         COALESCE(MAX(lp.status), 'in_progress') AS status
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
      const { totalNodes, completedNodes, progressPercentage } = calculateNodeProgress(item.total_cards, item.learned_cards, item.current_card_index);
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
       ORDER BY COALESCE(ufp.is_learned, 0) DESC, f.id ASC`,
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
       ORDER BY COALESCE(ufp.is_learned, 0) DESC, f.id ASC`,
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

    const totalBatches = getSeparatedTotalBatches(stats.total_cards, stats.learned_cards);
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

export const deleteMaterial = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const materialId = Number(req.params.materialId);
    if (!materialId) {
      return res.status(400).json({ error: 'Thiếu materialId.' });
    }

    await connection.beginTransaction();

    // Xoá tiến độ các flashcard thuộc material này
    await connection.query(
      'DELETE FROM user_flashcard_progress WHERE flashcard_id IN (SELECT id FROM flashcards WHERE material_id = ?)', 
      [materialId]
    );
    // Xoá các flashcard thuộc material này
    await connection.query('DELETE FROM flashcards WHERE material_id = ?', [materialId]);
    // Xoá learning path
    await connection.query('DELETE FROM learning_path WHERE material_id = ?', [materialId]);
    // Xoá shares
    await connection.query('DELETE FROM material_shares WHERE source_material_id = ? OR recipient_material_id = ?', [materialId, materialId]);
    // Xoá material
    await connection.query('DELETE FROM study_materials WHERE id = ?', [materialId]);

    await connection.commit();
    return res.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('DELETE /materials/:id error', error);
    return res.status(500).json({ error: 'Không thể xóa bộ thẻ.' });
  } finally {
    connection.release();
  }
};

export const getUserStats = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const [userRows] = await db.query('SELECT total_xp, last_study_date, global_hearts FROM users WHERE id = ?', [userId]);
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

    // Tính streak_count chuẩn xác dựa trên lịch sử hoạt động
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

    return res.json({ 
      streakCount: calculatedStreak,
      streak_count: calculatedStreak,
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

const createNotification = async (connection, { userId, type, title, body, metadata = {} }) => {
  await connection.query(
    'INSERT INTO notifications (user_id, type, title, body, metadata) VALUES (?, ?, ?, ?, ?)',
    [userId, type, title, body, JSON.stringify(metadata)]
  );
};

export const shareMaterial = async (req, res) => {
  try {
    const { senderId, recipientEmail, materialId } = req.body;
    if (!senderId || !recipientEmail || !materialId) {
      return res.status(400).json({ error: 'Thiếu senderId, recipientEmail hoặc materialId.' });
    }

    const normalizedEmail = recipientEmail.trim().toLowerCase();
    const [senderRows] = await db.query('SELECT id, username FROM users WHERE id = ?', [Number(senderId)]);
    const sender = senderRows[0];
    if (!sender) return res.status(404).json({ error: 'Người gửi không tồn tại.' });

    const [recipientRows] = await db.query('SELECT id, username FROM users WHERE email = ?', [normalizedEmail]);
    const recipient = recipientRows[0];
    if (!recipient) return res.status(404).json({ error: 'Email người nhận không tồn tại.' });
    if (recipient.id === sender.id) return res.status(400).json({ error: 'Bạn không thể chia sẻ cho chính mình.' });

    const [materialRows] = await db.query('SELECT id, title, description FROM study_materials WHERE id = ? AND user_id = ?', [Number(materialId), Number(senderId)]);
    const material = materialRows[0];
    if (!material) return res.status(404).json({ error: 'Không tìm thấy thẻ Material để chia sẻ.' });

    const [flashcardRows] = await db.query('SELECT word, kanji, meaning, example FROM flashcards WHERE material_id = ?', [Number(materialId)]);
    if (!flashcardRows.length) return res.status(400).json({ error: 'Thẻ Material không có dữ liệu để chia sẻ.' });

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [insertRes] = await connection.query(
        'INSERT INTO study_materials (user_id, title, description, created_at) VALUES (?, ?, ?, NOW())',
        [recipient.id, material.title, material.description || null]
      );
      const recipientMaterialId = insertRes.insertId;

      const values = flashcardRows.map((card) => [
        recipientMaterialId,
        card.word,
        card.kanji || null,
        card.meaning || null,
        card.example || null,
      ]);

      if (values.length > 0) {
        await connection.query('INSERT INTO flashcards (material_id, word, kanji, meaning, example) VALUES ?', [values]);
      }

      await connection.query(
        'INSERT INTO material_shares (sender_user_id, receiver_user_id, source_material_id, recipient_material_id) VALUES (?, ?, ?, ?)',
        [sender.id, recipient.id, material.id, recipientMaterialId]
      );

      await createNotification(connection, {
        userId: recipient.id,
        type: 'share_received',
        title: 'Bạn đã nhận được một thẻ Material mới',
        body: `${sender.username} đã gửi cho bạn thẻ “${material.title}”.`,
        metadata: { materialId: recipientMaterialId, sourceMaterialId: material.id, senderId: sender.id, senderName: sender.username },
      });

      await createNotification(connection, {
        userId: sender.id,
        type: 'share_sent',
        title: 'Bạn đã chia sẻ thẻ',
        body: `Bạn đã chia sẻ thẻ cho ${recipient.username}, chúc mừng bạn được +100xp.`,
        metadata: { recipientId: recipient.id, recipientName: recipient.username, materialId: material.id },
      });

      await connection.query('UPDATE users SET total_xp = total_xp + 100 WHERE id = ?', [sender.id]);
      const [updatedSenderRows] = await connection.query('SELECT total_xp FROM users WHERE id = ?', [sender.id]);
      const updatedSender = updatedSenderRows[0] || { total_xp: 0 };

      await connection.commit();

      return res.json({ success: true, recipientMaterialId, senderXp: Number(updatedSender.total_xp || 0) });
    } catch (error) {
      await connection.rollback();
      console.error('POST /materials/share transaction error', error);
      return res.status(500).json({ error: 'Không thể chia sẻ thẻ Material.' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('POST /materials/share error', error);
    return res.status(500).json({ error: 'Lỗi khi gửi yêu cầu chia sẻ.' });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) {
      return res.status(400).json({ error: 'Thiếu userId.' });
    }

    const [rows] = await db.query(
      'SELECT id, type, title, body, metadata, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    return res.json({ notifications: rows });
  } catch (error) {
    console.error('GET /notifications error', error);
    return res.status(500).json({ error: 'Không thể lấy thông báo.' });
  }
};

export const markNotificationsRead = async (req, res) => {
  try {
    const { userId, ids } = req.body;
    if (!userId || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Thiếu userId hoặc ids.' });
    }

    await db.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id IN (?)',
      [Number(userId), ids]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('POST /notifications/mark-read error', error);
    return res.status(500).json({ error: 'Không thể cập nhật trạng thái thông báo.' });
  }
};
