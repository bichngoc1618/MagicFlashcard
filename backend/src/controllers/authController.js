import bcrypt from 'bcrypt';
import db from '../config/db.js';

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10', 10);

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Vui lòng cung cấp username, email và password.' });
    }

    const [existing] = await db.query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Tài khoản đã tồn tại.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    // Initialize gamification fields if they don't have default values natively
    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash, total_xp, streak_count, global_hearts) VALUES (?, ?, ?, 0, 0, 5)',
      [username, email, passwordHash]
    );

    return res.json({ userId: result.insertId, username, email, total_xp: 0, streak_count: 0, global_hearts: 5, last_study_date: null });
  } catch (error) {
    console.error('POST /auth/register error', error);
    return res.status(500).json({ error: 'Không thể đăng ký người dùng mới.' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Vui lòng cung cấp email và password.' });
    }

    const [rows] = await db.query(
      `SELECT id, username, password_hash, total_xp, streak_count, last_study_date, last_node_completed_date, global_hearts,
              CASE WHEN last_study_date IS NOT NULL AND last_study_date < CURRENT_DATE() THEN 1 ELSE 0 END AS should_reset_hearts
       FROM users WHERE email = ?`,
      [email]
    );
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Thông tin đăng nhập không hợp lệ.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Thông tin đăng nhập không hợp lệ.' });
    }

    let finalHearts = user.global_hearts;
    let needsUpdate = false;

    // Daily Heart Reset: Only if the stored study date is from a previous day.
    if (user.should_reset_hearts === 1) {
      finalHearts = 5;
      needsUpdate = true;
    } else if (user.last_study_date === null) {
      // First login or no study date yet: preserve DB hearts and only initialize when missing.
      if (finalHearts === null || finalHearts === undefined) {
        finalHearts = 5;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await db.query('UPDATE users SET global_hearts = ? WHERE id = ?', [finalHearts, user.id]);
    }

    // Check last node completion date on login and decrement streak if days have passed
    try {
      const lastNodeDateRaw = user.last_node_completed_date;
      if (lastNodeDateRaw) {
        const today = new Date();
        const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        const lastNodeDate = new Date(lastNodeDateRaw);
        const lastNodeStr = new Date(lastNodeDate.getTime() - (lastNodeDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        const diffMs = new Date(todayStr).getTime() - new Date(lastNodeStr).getTime();
        const daysPassed = Math.floor(diffMs / 86400000);

        if (daysPassed > 0) {
          const decreasedStreak = Math.max(0, Number(user.streak_count || 0) - daysPassed);
          if (decreasedStreak !== Number(user.streak_count || 0)) {
            await db.query('UPDATE users SET streak_count = ? WHERE id = ?', [decreasedStreak, user.id]);
            user.streak_count = decreasedStreak;
          }
        }
      }
    } catch (err) {
      console.warn('Không thể điều chỉnh streak khi login:', err && err.message ? err.message : err);
    }

    return res.json({ 
      userId: user.id, 
      username: user.username, 
      email,
      total_xp: user.total_xp,
      streak_count: user.streak_count,
      last_study_date: user.last_study_date,
      global_hearts: finalHearts
    });
  } catch (error) {
    console.error('POST /auth/login error', error);
    return res.status(500).json({ error: 'Không thể đăng nhập.' });
  }
};

export const updateGamificationStats = async (req, res) => {
  try {
    const { userId, earnedXp, newStreakCount, newLastStudyDate, newHearts } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    // Build dynamic update query
    let updateFields = ['total_xp = total_xp + ?', 'streak_count = ?', 'last_study_date = ?'];
    let updateValues = [earnedXp || 0, newStreakCount || 0, newLastStudyDate || null];
    
    // If newHearts is provided (e.g., daily reset), include it in update
    if (newHearts !== undefined && newHearts !== null) {
      updateFields.push('global_hearts = ?');
      updateValues.push(newHearts);
    }
    
    updateValues.push(userId);

    await db.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Return updated user stats
    const [rows] = await db.query(
      'SELECT id, username, total_xp, streak_count, last_study_date, global_hearts FROM users WHERE id = ?',
      [userId]
    );
    const updatedUser = rows[0];
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ 
      success: true,
      userId: updatedUser.id,
      total_xp: updatedUser.total_xp,
      streak_count: updatedUser.streak_count,
      last_study_date: updatedUser.last_study_date,
      global_hearts: updatedUser.global_hearts
    });
  } catch (error) {
    console.error('POST /gamification/update error', error);
    return res.status(500).json({ error: 'Failed to update stats.' });
  }
};

export const refillHearts = async (req, res) => {
  try {
    const { userId, hearts = 1, cost = 200 } = req.body;
    console.log('⚡ [API] Refilling hearts. UserId:', userId, 'Hearts:', hearts, 'Cost:', cost);
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    // Read current
    const [rows] = await db.query('SELECT global_hearts, total_xp FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const newHearts = Math.min(Number(rows[0].global_hearts) + Number(hearts), 5);
    
    await db.query(
      'UPDATE users SET total_xp = total_xp - ?, global_hearts = ? WHERE id = ?',
      [cost, newHearts, userId]
    );
    console.log('⚡ [API] Refilled hearts successfully. New count:', newHearts);

    return res.json({ success: true, globalHearts: newHearts });
  } catch (error) {
    console.error('POST /gamification/refill error', error);
    return res.status(500).json({ error: 'Failed to refill hearts.' });
  }
};

export const deductHearts = async (req, res) => {
  try {
    const { userId, amount = 1, reason = 'quiz_failure' } = req.body;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    console.log('⚡ [API] Deducting hearts. UserId:', userId, 'Amount:', amount);
    // Read current hearts
    const [rows] = await db.query('SELECT global_hearts FROM users WHERE id = ?', [userId]);
    const current = rows && rows[0] ? Number(rows[0].global_hearts || 0) : 0;
    console.log('⚡ [API] Current hearts in DB:', current);
    if (current <= 0) {
      console.log('⚡ [API] No hearts remaining');
      return res.status(400).json({ error: 'No hearts remaining', global_hearts: current });
    }

    const newVal = Math.max(current - Number(amount), 0);
    console.log('⚡ [API] New value to update:', newVal);

    // Update users
    await db.query('UPDATE users SET global_hearts = ? WHERE id = ?', [newVal, userId]);

    // Insert into history table if exists (best-effort)
    try {
      await db.query('INSERT INTO heart_transactions (user_id, change_amount, reason) VALUES (?, ?, ?)', [userId, -Number(amount), reason]);
    } catch (err) {
      // Non-fatal: table might not exist in older schemas — warn and continue.
      console.warn('Could not write heart transaction (table missing or other issue):', err.message);
    }

    return res.json({ success: true, global_hearts: newVal });
  } catch (error) {
    console.error('POST /gamification/deduct error', error);
    return res.status(500).json({ error: 'Failed to deduct hearts.' });
  }
};

