import db from './src/config/db.js';

async function createTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_node_stars (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        material_id INT NOT NULL,
        node_id VARCHAR(50) NOT NULL,
        stars INT NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_node (user_id, material_id, node_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);
    console.log('Successfully created user_node_stars table.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

createTable();
