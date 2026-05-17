export type LevelInfo = {
  level: number;
  progress: number;
  xpToNextLevel: number;
  totalXp: number;
  currentLevelMinXp: number;
  nextLevelMinXp: number;
};

export const calculateLevelInfo = (totalXp: number): LevelInfo => {
  const normalizedXp = Math.max(0, totalXp);
  const level = Math.floor(Math.sqrt(normalizedXp / 100)) + 1;
  const currentLevelMinXp = 100 * Math.pow(level - 1, 2);
  const nextLevelMinXp = 100 * Math.pow(level, 2);
  const progress = (normalizedXp - currentLevelMinXp) / Math.max(1, nextLevelMinXp - currentLevelMinXp);
  const xpToNextLevel = nextLevelMinXp - normalizedXp;

  return {
    level,
    progress: Math.max(0, Math.min(progress, 1)),
    xpToNextLevel,
    totalXp: normalizedXp,
    currentLevelMinXp,
    nextLevelMinXp,
  };
};
