import db from './src/config/db.js';

(async () => {
  try {
    await db.query("ALTER TABLE users ADD COLUMN avatar_id VARCHAR(50) DEFAULT 'shark_default';");
    console.log('Successfully added avatar_id column.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column avatar_id already exists.');
    } else {
      console.error(err);
    }
  }
  process.exit(0);
})();
