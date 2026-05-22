import db from './db.js';

const initDb = async () => {
    try {
        const connection = await db.getConnection();
        await connection.query(
            `CREATE TABLE IF NOT EXISTS quiz_question_progress (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                material_id INT NOT NULL,
                batch_index INT NOT NULL,
                question_index INT NOT NULL,
                is_correct BOOLEAN NOT NULL,
                answered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_quiz_progress (user_id, material_id, batch_index, question_index)
            )`
        );

        await connection.query(
            `CREATE TABLE IF NOT EXISTS material_shares (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sender_user_id INT NOT NULL,
                receiver_user_id INT NOT NULL,
                source_material_id INT NOT NULL,
                recipient_material_id INT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )`
        );

        await connection.query(
            `CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                body TEXT NOT NULL,
                metadata JSON NULL,
                is_read TINYINT(1) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )`
        );

        await connection.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS global_hearts INT NOT NULL DEFAULT 5`);
        connection.release();
        console.log('✅ initDb: Kết nối đến MySQL thành công.');
    } catch (err) {
        console.error('❌ initDb: Không thể kết nối đến MySQL:', err.message);
        throw err;
    }
};

export default initDb;
