import db from './db.js';

const addIndexIfNotExists = async (connection, tableName, indexName, columnsStr) => {
    try {
        const [rows] = await connection.query(
            `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
             WHERE TABLE_SCHEMA = DATABASE() 
               AND TABLE_NAME = ? 
               AND INDEX_NAME = ?`,
            [tableName, indexName]
        );
        if (rows.length === 0) {
            await connection.query(`ALTER TABLE ${tableName} ADD INDEX ${indexName} (${columnsStr})`);
            console.log(`[initDb] Added index ${indexName} to table ${tableName}`);
        }
    } catch (err) {
        console.warn(`[initDb] Warning adding index ${indexName} to table ${tableName}:`, err.message);
    }
};

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

        await connection.query(
            `CREATE TABLE IF NOT EXISTS user_srs_progress (
                user_id INT NOT NULL,
                flashcard_id INT NOT NULL,
                material_id INT NOT NULL,
                repetition INT NOT NULL DEFAULT 0,
                interval_days FLOAT NOT NULL DEFAULT 0,
                easiness_factor FLOAT NOT NULL DEFAULT 2.5,
                next_review_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                last_reviewed_at TIMESTAMP NULL,
                PRIMARY KEY (user_id, flashcard_id)
            )`
        );

        await connection.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS global_hearts INT NOT NULL DEFAULT 5`);

        // Thêm chỉ mục tối ưu hóa hiệu năng
        await addIndexIfNotExists(connection, 'notifications', 'idx_notifications_user_id', 'user_id');
        await addIndexIfNotExists(connection, 'material_shares', 'idx_material_shares_receiver', 'receiver_user_id');
        await addIndexIfNotExists(connection, 'material_shares', 'idx_material_shares_sender', 'sender_user_id');

        connection.release();
        console.log('✅ initDb: Kết nối đến MySQL thành công.');
    } catch (err) {
        console.error('❌ initDb: Không thể kết nối đến MySQL:', err.message);
        throw err;
    }
};

export default initDb;
