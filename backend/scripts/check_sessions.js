import db from '../src/config/db.js';

async function run() {
  try {
    const userId = 1;
    const [rows] = await db.query('SELECT id, user_id, start_time, end_time, duration, date FROM user_study_sessions WHERE user_id = ? ORDER BY id DESC LIMIT 50', [userId]);
    console.log('Sessions for user', userId);
    console.table(rows);

    const [sumRows] = await db.query('SELECT SUM(duration) AS totalMinutes FROM user_study_sessions WHERE user_id = ?', [userId]);
    console.log('Total duration minutes:', sumRows[0].totalMinutes);
    process.exit(0);
  } catch (err) {
    console.error('Failed to query sessions:', err.message);
    process.exit(1);
  }
}

run();
