import sys
import os
import logging
from faster_whisper import WhisperModel

# Tắt các dòng log thông báo của hệ thống để không làm bẩn stdout
logging.basicConfig()
logging.getLogger("faster_whisper").setLevel(logging.ERROR)

# Ép kiểu encoding UTF-8 để hiển thị tiếng Nhật chuẩn xác
sys.stdout.reconfigure(encoding='utf-8')

# Cấu hình model
model_size = "small"
model = WhisperModel(model_size, device="cpu", compute_type="int8")

def transcribe_audio(path):
    if not os.path.exists(path):
        return

    try:
        # Thuật toán nhận diện: ép cứng tiếng Nhật (ja)
        segments, info = model.transcribe(
            path,
            language="ja",
            beam_size=5,
            vad_filter=True
        )

        full_text = "".join([s.text for s in segments]).strip()
        
        # Chỉ in duy nhất kết quả văn bản
        if full_text:
            print(full_text)
            
    except Exception as e:
        pass # Không in lỗi ra stdout để tránh làm hỏng dữ liệu của Node.js

if __name__ == "__main__":
    if len(sys.argv) > 1:
        transcribe_audio(sys.argv[1])