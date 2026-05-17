import db from './db.js';

export const seedDefaultStudyContent = async (userId) => {
  if (!userId) {
    throw new Error('Thiếu userId khi tạo dữ liệu mẫu.');
  }

  const [existing] = await db.query(
    'SELECT id FROM study_materials WHERE user_id = ? AND title = ?',
    [userId, 'Bài học mẫu - ひらがな']
  );

  if (existing.length > 0) {
    return { seeded: false, message: 'Dữ liệu mẫu đã tồn tại.' };
  }

  const [materialResult] = await db.query(
    'INSERT INTO study_materials (user_id, title, description) VALUES (?, ?, ?)',
    [userId, 'Bài học mẫu - ひらがな', 'Bài học mẫu giúp bắt đầu luyện kanji và từ vựng cơ bản.']
  );

  const materialId = materialResult.insertId;
  const cards = [
    { word: 'こんにちは', kanji: null, meaning: 'Xin chào', example: 'こんにちは、元気ですか？' },
    { word: 'ありがとう', kanji: null, meaning: 'Cảm ơn', example: 'ありがとう！本当に助かったよ。' },
    { word: 'さようなら', kanji: null, meaning: 'Tạm biệt', example: 'また明日、さようなら。' },
    { word: '日本', kanji: '日本', meaning: 'Nhật Bản', example: '私は日本が大好きです。' },
    { word: '学生', kanji: '学生', meaning: 'Học sinh', example: '彼は学生です。' }
  ];

  const values = cards.map((card) => [
    materialId,
    card.word,
    card.kanji || null,
    card.meaning,
    card.example || null
  ]);

  await db.query(
    'INSERT INTO flashcards (material_id, word, kanji, meaning, example) VALUES ?',
    [values]
  );

  return { seeded: true, materialId, insertedCards: cards.length };
};
