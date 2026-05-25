import mysql from 'mysql2/promise';

async function check() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'japanese'
    });
    const [rows] = await connection.query(
      `SELECT id, material_id, word, kanji, meaning FROM flashcards WHERE material_id = 2`
    );
    console.log('FLASHCARDS in material 2:');
    console.log(JSON.stringify(rows, null, 2));
    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

check();
