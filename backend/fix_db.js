import db from './src/config/db.js';

(async () => {
  try {
    await db.query('ALTER TABLE users ADD COLUMN last_node_completed_date DATE DEFAULT NULL AFTER last_study_date;');
    console.log('Successfully added last_node_completed_date');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists');
    } else {
      console.error(err);
    }
  }
  process.exit(0);
})();
