import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306, // Thêm cổng kết nối linh hoạt
    waitForConnections: true,
    connectionLimit: 10,
    ssl: process.env.DB_HOST !== 'localhost' ? { rejectUnauthorized: false } : false 
    // Tự động bật SSL khi deploy lên Render, ở máy local (localhost) thì tắt đi để chạy XAMPP bình thường.
});

// Kiểm tra kết nối
db.getConnection()
    .then(() => console.log("✅ Đã kết nối cơ sở dữ liệu thành công!"))
    .catch(err => console.log("❌ Lỗi kết nối Database:", err.message));

export default db;