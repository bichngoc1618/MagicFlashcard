import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

// Kiểm tra kết nối
db.getConnection()
    .then(() => console.log("✅ Đã thông tuyến tới MySQL của XAMPP!"))
    .catch(err => console.log("❌ Lỗi kết nối MySQL:", err.message));

export default db;