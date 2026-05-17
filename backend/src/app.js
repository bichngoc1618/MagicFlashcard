console.log("🚀 Starting server...");

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// 1. Import kết nối Database (Tự động kích hoạt log kiểm tra)
import db from "./config/db.js";
import initDb from "./config/initDb.js";
import aiRoutes from "./services/serverAi.js";
import appRoutes from "./routes/appRoutes.js";

// Nạp biến môi trường từ .env
dotenv.config();

const app = express();

// --- CẤU HÌNH MIDDLEWARE ---
app.use(cors()); // Cho phép Frontend (React Native) gọi API
app.use(express.json()); // Đọc dữ liệu JSON từ body request
app.use(express.urlencoded({ extended: true }));

// --- KIỂM TRA THƯ MỤC UPLOADS ---
// Tự động tạo thư mục uploads nếu Ngọc quên chưa tạo, tránh lỗi Multer
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
    console.log("📁 Đã tự động tạo thư mục /uploads cho bạn.");
}

// --- GẮN ROUTES ---
// Toàn bộ logic AI (speak, text) sẽ bắt đầu bằng tiền tố /api
app.use("/api", aiRoutes);
app.use("/api", appRoutes);

// Route kiểm tra trạng thái server (Optional)
app.get("/", (req, res) => {
    res.send("🦈 Same-kun đang bơi lội bình thường!");
});

// --- KHỞI CHẠY SERVER ---
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await initDb();
        app.listen(PORT, () => {
            console.log("==========================================");
            console.log(`🦈 SERVER: Same-kun đã tỉnh giấc tại cổng ${PORT}`);
            console.log(`🌐 Local: http://localhost:${PORT}`);
            console.log(`🚀 Sẵn sàng nhận lệnh từ Ngọc!`);
            console.log("==========================================");
        });
    } catch (err) {
        console.error('❌ Không thể khởi động server:', err);
        process.exit(1);
    }
};

startServer();