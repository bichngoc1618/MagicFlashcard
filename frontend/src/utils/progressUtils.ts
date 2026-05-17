import { getStudyPath } from '../api/api';

/**
 * Tính toán tiến độ hiện tại dựa trên số thẻ được ghi nhớ
 * @param learned số thẻ được ghi nhớ
 * @param total tổng số thẻ
 */
export const calculateProgress = (learned: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((learned / total) * 100);
};

/**
 * Tải lại tiến độ từ backend
 */
export const refreshProgress = async (userId: number, materialId: number) => {
  try {
    const data = await getStudyPath(userId, materialId);
    return {
      progressPercentage: data.progressPercentage,
      learnedCards: data.learnedCards,
      totalCards: data.totalCards,
    };
  } catch (error) {
    console.warn('Lỗi tải tiến độ:', error);
    return null;
  }
};
