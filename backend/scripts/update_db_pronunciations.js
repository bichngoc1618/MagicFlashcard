import db from '../src/config/db.js';

async function run() {
  try {
    console.log('Updating database flashcard pronunciations for material_id = 2...');
    await db.query(`
      UPDATE flashcards 
      SET word = CASE id
        WHEN 27 THEN 'きぼう'
        WHEN 28 THEN 'よやく'
        WHEN 29 THEN 'さんか'
        WHEN 30 THEN 'しっぱい'
      END
      WHERE id IN (27, 28, 29, 30) AND material_id = 2;
    `);
    console.log('Database updated successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Update failed:', err.message);
    process.exit(1);
  }
}

run();
