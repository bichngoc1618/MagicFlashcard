/**
 * Calculates the next SRS intervals using the SM-2 algorithm.
 * @param {number} quality - The quality of recall (0-5).
 *                           5: perfect response
 *                           4: correct response after a hesitation
 *                           3: correct response recalled with serious difficulty
 *                           2: incorrect response; where the correct one seemed easy to recall
 *                           1: incorrect response; the correct one remembered
 *                           0: complete blackout
 * @param {number} repetition - The current repetition count.
 * @param {number} easiness - The current easiness factor.
 * @param {number} interval - The current interval in days.
 * @returns {object} { repetition, easiness, interval, nextReviewDate }
 */
export const calculateNextReview = (quality, repetition, easiness, interval) => {
    let newEasiness = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (newEasiness < 1.3) newEasiness = 1.3;

    let newRepetition = repetition;
    let newInterval = interval;

    if (quality >= 3) {
        if (repetition === 0) {
            newInterval = 1; // 1 day for the first correct review
        } else if (repetition === 1) {
            newInterval = 6; // 6 days for the second
        } else {
            newInterval = Math.round(interval * newEasiness);
        }
        newRepetition += 1;
    } else {
        newRepetition = 0; // Reset repetition count if incorrect
        newInterval = 1;   // Review again tomorrow
    }

    // Cap the interval to prevent exponential explosion and DB date overflow.
    // A maximum interval of 365 days (1 year) is a standard cap for SRS.
    if (newInterval > 365) {
        newInterval = 365;
    }

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

    return {
        repetition: newRepetition,
        easiness: newEasiness,
        interval: newInterval,
        nextReviewDate,
    };
};

/**
 * Helper to map a percentage score (0-100) to an SM-2 quality score (0-5).
 */
export const mapScoreToQuality = (percentageScore) => {
    if (percentageScore >= 95) return 5;
    if (percentageScore >= 80) return 4;
    if (percentageScore >= 60) return 3;
    if (percentageScore >= 40) return 2;
    if (percentageScore >= 20) return 1;
    return 0;
};
