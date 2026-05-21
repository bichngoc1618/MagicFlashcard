import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Cấu hình SSL động: Nếu có biến môi trường DB_SSL bằng 'true' hoặc HOST không phải localhost
const useSSL = process.env.DB_SSL === 'true' || (process.env.DB_HOST && !process.env.DB_HOST.includes('localhost'));

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 4000, // TiDB mặc định là 4000, XAMPP là 3306
    waitForConnections: true,
    connectionLimit: 10,
    // Ép kiểu cấu hình SSL chuẩn chỉnh theo đúng cú pháp TiDB Cloud yêu cầu
    ssl: useSSL ? { minVersion: 'TLSv1.2', rejectUnauthorized: false } : null
});

// Kiểm tra kết nối
db.getConnection()
    .then((connection) => {
        console.log("✅ Đã kết nối cơ sở dữ liệu thành công!");
        connection.release(); // Giải phóng connection sau khi test xong để tránh tràn pool
    })
    .catch(err => console.log("❌ Lỗi kết nối Database:", err.message));

export default db;