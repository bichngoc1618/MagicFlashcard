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
    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    return res.json({ userId: result.insertId, username, email });
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

    const [rows] = await db.query('SELECT id, username, password_hash FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Thông tin đăng nhập không hợp lệ.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Thông tin đăng nhập không hợp lệ.' });
    }

    return res.json({ userId: user.id, username: user.username, email });
  } catch (error) {
    console.error('POST /auth/login error', error);
    return res.status(500).json({ error: 'Không thể đăng nhập.' });
  }
};
