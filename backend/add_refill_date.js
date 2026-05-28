import db from './src/config/db.js';

async function addColumn() {
  try {
    await db.query('ALTER TABLE users ADD COLUMN last_heart_refill_date DATE DEFAULT NULL;');
    console.log('Successfully added last_heart_refill_date column.');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists.');
    } else {
      console.error('Error:', error);
    }
  } finally {
    process.exit();
  }
}

addColumn();
