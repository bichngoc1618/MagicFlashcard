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
  | 'MATCHING_KANA'
  | 'MATCHING_MEANING'
  | 'MULTICHOICE'
  | 'SPELLING'
  | 'REVIEW'
  | 'FINAL_BOSS';

export interface JourneyNode {
  id: string;
  nodeType: NodeType;
  batchIndex: number;
  words: VocabItem[];
  left: number;
  top: number;
}

/**
 * Task 1.1: Thuật toán chia bộ thẻ
 * Logic chia nhóm 10 từ.
 * Xử lý số dư R >= 6 (tạo nhóm mới) và R < 6 (rải ngược về các nhóm trước).
 */
export function chunkVocabulary<T>(vocabList: T[]): T[][] {
  return chunkVocabularyHelper(vocabList);
}

function chunkVocabularyHelper<T>(vocabList: T[]): T[][] {
  const N = vocabList.length;
  if (N === 0) return [];

  const CHUNK_SIZE = 10;
  const numFullChunks = Math.floor(N / CHUNK_SIZE);
  const R = N % CHUNK_SIZE;

  if (numFullChunks === 0) {
    // Nếu tổng số từ < 10, gộp hết vào 1 chunk
    return [vocabList];
  }

  const chunks: T[][] = [];

  if (R >= 6) {
    // R >= 6: Tạo chunk mới cho số dư
    for (let i = 0; i < numFullChunks; i++) {
      chunks.push(vocabList.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
    }
    chunks.push(vocabList.slice(numFullChunks * CHUNK_SIZE));
  } else if (R > 0) {
    // R < 6: Phân phối đều số dư ngược về các chunk trước
    const chunkSizes = new Array(numFullChunks).fill(CHUNK_SIZE);
    let remaining = R;
    let idx = numFullChunks - 1; // Bắt đầu từ chunk cuối

    while (remaining > 0) {
      chunkSizes[idx]++;
      remaining--;
      idx--;
      if (idx < 0) idx = numFullChunks - 1; // Quay vòng nếu cần
    }

    let start = 0;
    for (let i = 0; i < numFullChunks; i++) {
      const size = chunkSizes[i];
      chunks.push(vocabList.slice(start, start + size));
      start += size;
    }
  } else {
    // R = 0: Vừa khít
    for (let i = 0; i < numFullChunks; i++) {
      chunks.push(vocabList.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
    }
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

    // Node 2: MATCHING_KANA (Center)
    nodes.push({
      id: `batch-${batchIndex}-kana`,
      nodeType: 'MATCHING_KANA',
      batchIndex,
      words: chunk,
      left: centerPosition,
      top: topPointer,
    });
    topPointer += verticalGap;

    // Node 3: MATCHING_MEANING (Left or Right opposite to Flashcard)
    nodes.push({
      id: `batch-${batchIndex}-meaning`,
      nodeType: 'MATCHING_MEANING',
      batchIndex,
      words: chunk,
      left: isLeft ? 400 - sideOffset : sideOffset,
      top: topPointer,
    });
    topPointer += verticalGap;

    // Node 4: MULTICHOICE (Center)
    nodes.push({
      id: `batch-${batchIndex}-multi`,
      nodeType: 'MULTICHOICE',
      batchIndex,
      words: chunk,
      left: centerPosition,
      top: topPointer,
    });
    topPointer += verticalGap;

    // Node 5: SPELLING (Back to original side)
    nodes.push({
      id: `batch-${batchIndex}-spell`,
      nodeType: 'SPELLING',
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
