console.log("🚀 Starting server...");

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import axios from "axios"; // Đã thêm axios vào để dùng cho tính năng tự ping

// 1. Import kết nối Database (Tự động kích hoạt log kiểm tra)
import db from "./config/db.js";
//import initDb from "./config/initDb.js";
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

// --- THÊM ROUTE PING & TỰ ĐỘNG GIỮ THỨC ---
app.get("/ping", (req, res) => {
    res.status(200).send("Pong! Same-kun vẫn đang thức tỉnh.");
});

const startPingInterval = () => {
    // Thay bằng link Render thật của Ngọc, ví dụ: https://magicflashcard.onrender.com/ping
    const BACKEND_URL = "https://magicflashcard.onrender.com/ping"; 
    
    // Đặt lịch cứ mỗi 10 phút (600.000 ms) tự động gửi 1 request HTTP GET đến chính nó
    setInterval(async () => {
        try {
            const response = await axios.get(BACKEND_URL);
            console.log(`🤖 Tự động duy trì: ${response.data}`);
        } catch (error) {
            console.error("❌ Lỗi tự động giữ thức:", error.message);
        }
    }, 600000); 
};
// ------------------------------------------

// --- KHỞI CHẠY SERVER ---
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        //await initDb();
        app.listen(PORT, () => {
            console.log("==========================================");
            console.log(`🦈 SERVER: Same-kun đã tỉnh giấc tại cổng ${PORT}`);
            console.log(`🌐 Local: http://localhost:${PORT}`);
            console.log(`🚀 Server đang chạy!`);
            console.log("==========================================");
            
            // Chỉ kích hoạt vòng lặp tự ping khi chạy trên môi trường Render online
            if (process.env.DB_HOST !== 'localhost') {
                startPingInterval();
                console.log("🤖 Đã kích hoạt hệ thống tự động giữ thức 24/7!");
            }
        });
    } catch (err) {
        console.error('❌ Không thể khởi động server:', err);
        process.exit(1);
    }
};

startServer();