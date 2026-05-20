import db from '../src/config/db.js';

async function run() {
  try {
    const date = '2026-05-19';
    const [rows] = await db.query('SELECT id, user_id, start_time, end_time, duration, date FROM user_study_sessions WHERE date = ? ORDER BY id DESC', [date]);
    console.log('Sessions on', date);
    console.table(rows);
    const [sumRows] = await db.query('SELECT SUM(duration) AS totalMinutes FROM user_study_sessions WHERE date = ?', [date]);
    console.log('Total duration on', date, ':', sumRows[0].totalMinutes);
    process.exit(0);
  } catch (err) {
    console.error('Failed to query sessions by date:', err.message);
    process.exit(1);
  }
}

run();
