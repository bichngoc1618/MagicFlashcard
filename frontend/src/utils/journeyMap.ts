export interface VocabItem {
  id: string | number;
  word?: string;
  kanji?: string;
  hiragana?: string;
  reading?: string;
  meaning: string;
  example?: string;
  is_learned?: number;
}

export type NodeType =
  | 'FLASHCARD'
  | 'MATCH_HIRA'
  | 'MATCH_MEANING'
  | 'PRACTICE_2'
  | 'PRACTICE_3'
  | 'REVIEW'
  | 'FINAL_BOSS'
  | 'SRS_REVIEW'
  | 'TREASURE_CHEST';

export interface JourneyNode {
  id: string;
  nodeType: NodeType;
  batchIndex: number;
  words: VocabItem[];
  left: number;
  top: number;
}

/**
 * Thuật toán chia bộ thẻ
 * Chia nhóm tối đa 10 từ.
 * Đảm bảo các từ mới thêm luôn nằm ở cuối (gộp vào node chưa đầy hoặc tạo node mới)
 */
export function chunkVocabulary<T>(vocabList: T[]): T[][] {
  return chunkVocabularyHelper(vocabList);
}

function chunkVocabularyHelper<T>(vocabList: T[]): T[][] {
  const CHUNK_SIZE = 10;
  const chunks: T[][] = [];
  
  for (let i = 0; i < vocabList.length; i += CHUNK_SIZE) {
    chunks.push(vocabList.slice(i, i + CHUNK_SIZE));
  }
  
  return chunks;
}

/**
 * Task 1.3: Viết hàm sinh lộ trình tự động
 * Tạo ra mảng chứa tọa độ (left, top) và cấu trúc cây phân nhánh
 */
export function generateJourneyNodes(chunks: VocabItem[][]): JourneyNode[] {
  const nodes: JourneyNode[] = [];
  const sideOffset = 90; // Cách lề 90px
  const centerPosition = 200; // Hoặc width/2 trong thực tế
  const verticalGap = 170; // Khoảng cách chiều dọc giữa các node
  
  let topPointer = 120;
  let allWords: VocabItem[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const batchIndex = i;
    allWords = allWords.concat(chunk);
    
    // Node 1: FLASHCARD (Left or Right zigzag)
    const isLeft = batchIndex % 2 === 0;
    const xBase = isLeft ? sideOffset : 400 - sideOffset; // Giả sử chiều rộng màn hình là 400

    nodes.push({
      id: `batch-${batchIndex}-flashcard`,
      nodeType: 'FLASHCARD',
      batchIndex,
      words: chunk,
      left: xBase,
      top: topPointer,
    });
    topPointer += verticalGap;

    // Node 2: MATCH_HIRA (Center) - Nối chữ
    nodes.push({
      id: `batch-${batchIndex}-kana`,
      nodeType: 'MATCH_HIRA',
      batchIndex,
      words: chunk,
      left: centerPosition,
      top: topPointer,
    });
    topPointer += verticalGap;

    // Node 3: MATCH_MEANING (Left or Right opposite to Flashcard)
    nodes.push({
      id: `batch-${batchIndex}-match-meaning`,
      nodeType: 'MATCH_MEANING',
      batchIndex,
      words: chunk,
      left: isLeft ? 400 - sideOffset : sideOffset,
      top: topPointer,
    });
    topPointer += verticalGap;

    // Node 4: PRACTICE_2 (Center) - Đa giác quan
    nodes.push({
      id: `batch-${batchIndex}-practice-2`,
      nodeType: 'PRACTICE_2',
      batchIndex,
      words: chunk,
      left: centerPosition,
      top: topPointer,
    });
    topPointer += verticalGap;

    // Rương báu (Thỉnh thoảng xuất hiện, luôn có ở cụm đầu tiên để người dùng dễ nhận thấy)
    if (batchIndex === 0 || batchIndex % 2 !== 0) {
      nodes.push({
        id: `batch-${batchIndex}-treasure`,
        nodeType: 'TREASURE_CHEST',
        batchIndex,
        words: [],
        left: isLeft ? centerPosition + 70 : centerPosition - 70, // Đẩy ra xa một chút cho cân đối
        top: topPointer - (verticalGap / 2),
      });
      // Không cộng topPointer vì rương báu nằm lệch ngang giữa 2 node chính
    }

    // Node 5: PRACTICE_3 (Back to original side) - Thực chiến
    nodes.push({
      id: `batch-${batchIndex}-practice-3`,
      nodeType: 'PRACTICE_3',
      batchIndex,
      words: chunk,
      left: xBase,
      top: topPointer,
    });
    topPointer += verticalGap;

    // Review Node sau mỗi 2 chunks
    if ((batchIndex + 1) % 2 === 0) {
      // Lấy danh sách từ của 2 chunks gần nhất
      const lastTwoChunksWords = [...chunks[i - 1], ...chunks[i]];
      nodes.push({
        id: `review-${Math.floor((batchIndex + 1) / 2)}`,
        nodeType: 'REVIEW',
        batchIndex,
        words: lastTwoChunksWords,
        left: centerPosition,
        top: topPointer + 50, // Khoảng cách xa hơn chút cho node đặc biệt
      });
      topPointer += verticalGap + 50;
    }
  }

  // Final Boss ở cuối
  nodes.push({
    id: 'final-boss',
    nodeType: 'FINAL_BOSS',
    batchIndex: chunks.length,
    words: allWords, // Boss test toàn bộ từ vựng
    left: centerPosition,
    top: topPointer + 80,
  });

  return nodes;
}
