import db from './src/config/db.js';

async function checkStars() {
  try {
    const [rows] = await db.query('SELECT * FROM user_node_stars');
    console.log('user_node_stars:', rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

checkStars();
