import db from '../src/config/db.js';

async function run() {
  try {
    const [result] = await db.query(
      'INSERT INTO user_study_sessions (user_id, start_time, end_time, duration, date) VALUES (?, ?, ?, ?, ?)',
      [1, '2026-05-20 08:00:00', '2026-05-20 08:10:00', 10, '2026-05-20']
    );
    console.log('Insert result:', result);

    const [rows] = await db.query('SELECT id, user_id, start_time, end_time, duration, date FROM user_study_sessions WHERE id = ?', [result.insertId]);
    console.table(rows);
    process.exit(0);
  } catch (err) {
    console.error('Insert failed:', err.message);
    process.exit(1);
  }
}

run();
