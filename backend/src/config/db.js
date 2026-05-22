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
    port: Number(process.env.DB_PORT || 3306), // MySQL/XAMPP mặc định là 3306, TiDB có thể dùng 4000
    waitForConnections: true,
    connectionLimit: 10,
    // Ép kiểu cấu hình SSL chuẩn chỉnh theo đúng cú pháp TiDB Cloud yêu cầu
    ssl: useSSL ? { minVersion: 'TLSv1.2', rejectUnauthorized: false } : null
});

// Short-term workaround: remove ONLY_FULL_GROUP_BY from session sql_mode so
// legacy GROUP BY queries continue to work on hosts that enforce it.
(async () => {
    try {
        await db.query("SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))");
        console.log('⚙️ Adjusted DB session sql_mode to remove ONLY_FULL_GROUP_BY');
    } catch (err) {
        console.warn('⚠️ Could not adjust sql_mode:', err.message);
    }
})();

// Kiểm tra kết nối
db.getConnection()
    .then((connection) => {
        console.log("✅ Đã kết nối cơ sở dữ liệu thành công!");
        connection.release(); // Giải phóng connection sau khi test xong để tránh tràn pool
    })
    .catch(err => console.log("❌ Lỗi kết nối Database:", err.message));

export default db;