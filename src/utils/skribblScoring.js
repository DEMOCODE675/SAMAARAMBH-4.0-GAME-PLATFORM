export const calculateGuessScore = (elapsedSeconds, timeLimit) => {
  const baseScore = 1000;
  const elapsed = elapsedSeconds !== undefined ? Number(elapsedSeconds) : timeLimit;
  const totalLimit = timeLimit || 90;
  const speedBonus = Math.max(0, Math.round(((totalLimit - elapsed) / totalLimit) * 500));
  return baseScore + speedBonus;
};

export const rankPlayers = (scoresMap) => {
  return Object.values(scoresMap).sort((a, b) => {
    if (b.totalScore === a.totalScore) {
      return (a.fastestGuessMs || Infinity) - (b.fastestGuessMs || Infinity);
    }
    return b.totalScore - a.totalScore;
  });
};

export const buildScoreBatch = (guesses, secretWord, sessionDoc) => {
  // Placeholder for score builder if needed
  return [];
};
