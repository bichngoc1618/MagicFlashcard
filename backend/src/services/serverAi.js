import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import db from "../config/db.js";

dotenv.config();

const router = express.Router();
const upload = multer({ dest: "uploads/" });

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const HEADERS = {
    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    "Content-Type": "application/json"
};

// --- HÀM 1: AI SỬA LỖI (Giữ nguyên gốc) ---
async function correctUserSpeech(rawText) {
    try {
        const res = await axios.post(GROQ_URL, {
            model: "llama-3.1-8b-instant",
            messages: [{
                role: "system",
                content: "Bạn là chuyên gia chỉnh lỗi tiếng Nhật. Hãy sửa lại câu của người dùng thành tiếng Nhật đúng ngữ pháp và tự nhiên nhất. Chỉ trả về văn bản đã sửa."
            }, { role: "user", content: rawText }],
            temperature: 0.1
        }, { headers: HEADERS });
        return res.data?.choices?.[0]?.message?.content?.trim() || rawText;
    } catch { return rawText; }
}

// --- HÀM 2: AI CÁ MẬP PHẢN HỒI (Giữ nguyên gốc) ---
async function getSameReply(correctedText) {
    try {
        const res = await axios.post(GROQ_URL, {
            model: "llama-3.1-8b-instant",
            messages: [{
                role: "system",
                content: `Bạn là さめ (Same) - cá mập Nhật Bản cực kỳ thân thiện.
                Quy tắc:
                1. Trả lời bằng tiếng Nhật tự nhiên (khẩu ngữ).
                2. Định dạng: [Tiếng Nhật] | [Nghĩa tiếng Việt ngắn].
                3. Luôn kết thúc bằng 1 câu hỏi để người dùng luyện nói tiếp.
                Ví dụ: 元気だった？ | Bạn có khỏe không?`
            }, { role: "user", content: correctedText }],
            temperature: 0.8
        }, { headers: HEADERS });
        return res.data?.choices?.[0]?.message?.content?.trim();
    } catch { return "すみません、エラーです | Xin lỗi, mình gặp lỗi rồi 🦈"; }
}

const saveChatHistory = async (userId, userMsg, aiReply) => {
    try {
        await db.query(
            'INSERT INTO chat_history (user_id, user_msg, ai_reply) VALUES (?, ?, ?)',
            [userId || null, userMsg || '', aiReply || '']
        );
    } catch (error) {
        console.error('Lưu chat_history thất bại:', error);
    }
};

// API 1: Voice
router.post("/speak", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) return res.json({ error: "No audio file" });
        const audioPath = path.resolve(req.file.path);
        const userId = req.body?.userId ? Number(req.body.userId) : null;

        const originalName = req.file.originalname || 'audio.webm';
        const ext = path.extname(originalName) || (originalName.endsWith('.m4a') ? '.m4a' : '.webm');
        const filename = `audio${ext}`;

        const formData = new FormData();
        formData.append("file", fs.createReadStream(audioPath), { filename: filename, contentType: req.file.mimetype || 'audio/webm' });
        formData.append("model", "whisper-large-v3-turbo");
        formData.append("response_format", "json");
        formData.append("language", "ja");

        try {
            const transcriptionRes = await axios.post("https://api.groq.com/openai/v1/audio/transcriptions", formData, {
                headers: {
                    ...formData.getHeaders(),
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                },
            });
            let rawText = transcriptionRes.data?.text?.trim() || "";

            if (!rawText) {
                if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
                return res.json({
                    userOriginal: "",
                    userCorrected: "",
                    aiReply: "聞こえないよ！もう一度言ってね？ | Mình không nghe rõ, nói lại nhé?"
                });
            }

            const correctedText = await correctUserSpeech(rawText);
            const aiReply = await getSameReply(correctedText);
            await saveChatHistory(userId, correctedText || rawText, aiReply);

            if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

            return res.json({
                userOriginal: rawText,
                userCorrected: correctedText,
                aiReply: aiReply
            });
        } catch (transcriptionErr) {
            console.error("Lỗi Groq Whisper API:", transcriptionErr?.response?.data || transcriptionErr.message);
            if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
            return res.json({
                userOriginal: "",
                userCorrected: "",
                aiReply: "聞こえないよ！もう一度言ってね？ | Mình không nghe rõ, nói lại nhé?"
            });
        }
    } catch (err) { 
        console.error("Server Error in /speak:", err);
        res.status(500).json({ error: "Server error" }); 
    }
});

// API 2: Text
router.post("/text", async (req, res) => {
    try {
        const { text, userId } = req.body;
        if (!text) return res.json({ error: "No text" });
        const numericUserId = userId ? Number(userId) : null;

        const aiReply = await getSameReply(text);
        await saveChatHistory(numericUserId, text, aiReply);

        return res.json({
            userOriginal: text,
            userCorrected: text,
            aiReply: aiReply
        });
    } catch (err) { res.status(500).json({ error: "Server error" }); }
});

// API 3: Chat history
const fetchChatHistory = async (userId) => {
    let query = "SELECT id, user_id, user_msg, ai_reply, timestamp FROM chat_history";
    const params = [];

    if (userId) {
        query += " WHERE user_id = ?";
        params.push(userId);
    }

    query += " ORDER BY timestamp ASC LIMIT 100";
    const [rows] = await db.query(query, params);
    return rows;
};

const clearUserChatHistory = async (req, res) => {
    try {
        const userId = req.body.userId ? Number(req.body.userId) : null;
        if (!userId) {
            return res.json({ success: true });
        }

        await db.query('DELETE FROM chat_history WHERE user_id = ?', [userId]);
        return res.json({ success: true });
    } catch (err) {
        console.error('Xóa chat history thất bại:', err);
        return res.status(500).json({ error: "Could not clear chat history" });
    }
};

router.post("/chat/history/clear", clearUserChatHistory);
router.post("/chat-history/clear", clearUserChatHistory);

router.get("/chat-history", async (req, res) => {
    try {
        const userId = req.query.userId ? Number(req.query.userId) : null;
        const rows = await fetchChatHistory(userId);
        return res.json({ history: rows });
    } catch (err) {
        console.error('Lấy chat history thất bại:', err);
        return res.status(500).json({ error: "Could not load chat history" });
    }
});

router.get("/chat/history/:userId", async (req, res) => {
    try {
        const userId = req.params.userId ? Number(req.params.userId) : null;
        const rows = await fetchChatHistory(userId);
        return res.json({ history: rows });
    } catch (err) {
        console.error('Lấy chat history thất bại:', err);
        return res.status(500).json({ error: "Could not load chat history" });
    }
});

export default router;