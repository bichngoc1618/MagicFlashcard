import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    const [rows] = await connection.execute('SHOW TABLES LIKE "quiz_question_progress"');
    console.log('Table exists:', rows.length > 0);

    if (rows.length > 0) {
      const [columns] = await connection.execute('DESCRIBE quiz_question_progress');
      console.log('Table structure:', columns);
    } else {
      console.log('Table does not exist, creating it...');
      await connection.execute(`
        CREATE TABLE quiz_question_progress (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          material_id INT NOT NULL,
          batch_index INT NOT NULL,
          question_index INT NOT NULL,
          is_correct BOOLEAN NOT NULL,
          answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_answer (user_id, material_id, batch_index, question_index)
        )
      `);
      console.log('Table created successfully');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
})();