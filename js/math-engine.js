/**
 * Math Engine - Decoupled question generation, validation, and checkpoint logic.
 * Supports pluggable operations (addition now, subtraction/multiplication later).
 */

const MathEngine = (() => {

  // Number-to-word mapping for audio file names and TTS
  const NUMBER_WORDS = [
    'zero','one','two','three','four','five','six','seven','eight','nine','ten',
    'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen'
  ];

  const OPERATORS = {
    addition: { symbol: '+', word: 'plus', fn: (a, b) => a + b },
    // Future:
    // subtraction: { symbol: '-', word: 'minus', fn: (a, b) => a - b },
    // multiplication: { symbol: '×', word: 'times', fn: (a, b) => a * b },
  };

  /**
   * Generate all unique problems for a given operation and range.
   */
  function generatePool(operation = 'addition', min = 0, max = 9) {
    const op = OPERATORS[operation];
    if (!op) throw new Error(`Unknown operation: ${operation}`);
    const pool = [];
    for (let a = min; a <= max; a++) {
      for (let b = min; b <= max; b++) {
        pool.push({
          a,
          b,
          answer: op.fn(a, b),
          symbol: op.symbol,
          word: op.word,
          display: `${a} ${op.symbol} ${b}`,
          audioKey: `${a}_plus_${b}`,
        });
      }
    }
    return pool;
  }

  /**
   * Shuffle array in place (Fisher-Yates).
   */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Generate wrong answer choices for multiple choice mode.
   * Returns array of 3 distinct values including the correct answer.
   */
  function generateChoices(correctAnswer) {
    const choices = new Set([correctAnswer]);
    const minVal = 0;
    const maxVal = 18;
    let attempts = 0;

    while (choices.size < 3 && attempts < 50) {
      // Generate within ±3 of correct answer
      let wrong = correctAnswer + Math.floor(Math.random() * 7) - 3;
      wrong = Math.max(minVal, Math.min(maxVal, wrong));
      if (wrong !== correctAnswer) {
        choices.add(wrong);
      }
      attempts++;
    }

    // Fallback: if we couldn't get 3 distinct values (edge cases near 0 or 18)
    let fallback = 0;
    while (choices.size < 3) {
      if (!choices.has(fallback)) choices.add(fallback);
      fallback++;
    }

    return shuffle([...choices]);
  }

  /**
   * Create a new game session.
   */
  function createSession(options = {}) {
    const {
      questionCount = 10,
      operation = 'addition',
      checkpointInterval = 5,
      maxLives = 3,
      useCheckpoints = true,
      wrongLosesLife = true,
    } = options;

    const pool = generatePool(operation);
    shuffle(pool);
    const questions = pool.slice(0, questionCount);

    const session = {
      questions,
      questionCount,
      operation,
      checkpointInterval,
      maxLives,
      useCheckpoints,
      wrongLosesLife,
      currentIndex: 0,
      lives: maxLives,
      lastCheckpoint: 0,
      totalCorrect: 0,
      totalWrong: 0,
      // Track which segment questions we're in for checkpoint restart
      segmentStartIndex: 0,

      // Event callbacks - games wire these up
      onQuestion: null,     // (question, index, total) => {}
      onCorrect: null,      // (question, index) => {}
      onWrong: null,        // (question, livesRemaining) => {}
      onLifeLost: null,     // (livesRemaining) => {}
      onCheckpoint: null,   // (checkpointNumber) => {}
      onCheckpointRestart: null, // (segmentStartIndex) => {}
      onComplete: null,     // (stats) => {}
    };

    return session;
  }

  /**
   * Get the current question.
   */
  function getCurrentQuestion(session) {
    if (session.currentIndex >= session.questionCount) return null;
    return session.questions[session.currentIndex];
  }

  /**
   * Submit an answer for the current question.
   * Returns { correct, question, livesRemaining, isCheckpoint, isComplete }
   */
  function submitAnswer(session, answer) {
    const question = getCurrentQuestion(session);
    if (!question) return null;

    const correct = parseInt(answer, 10) === question.answer;
    const result = {
      correct,
      question,
      livesRemaining: session.lives,
      isCheckpoint: false,
      isComplete: false,
      checkpointRestart: false,
    };

    if (correct) {
      session.totalCorrect++;
      session.currentIndex++;

      if (session.onCorrect) {
        session.onCorrect(question, session.currentIndex - 1);
      }

      // Check if we hit a checkpoint
      const questionsInSegment = session.currentIndex - session.segmentStartIndex;
      if (questionsInSegment >= session.checkpointInterval &&
          session.currentIndex < session.questionCount) {
        result.isCheckpoint = true;
        session.lastCheckpoint = session.currentIndex;
        session.segmentStartIndex = session.currentIndex;
        session.lives = session.maxLives;
        result.livesRemaining = session.lives;

        if (session.onCheckpoint) {
          session.onCheckpoint(Math.floor(session.currentIndex / session.checkpointInterval));
        }
      }

      // Check if game is complete
      if (session.currentIndex >= session.questionCount) {
        result.isComplete = true;
        if (session.onComplete) {
          session.onComplete({
            totalCorrect: session.totalCorrect,
            totalWrong: session.totalWrong,
            questionCount: session.questionCount,
          });
        }
      }
    } else {
      session.totalWrong++;

      if (session.wrongLosesLife) {
        session.lives--;
        result.livesRemaining = session.lives;

        if (session.onLifeLost) {
          session.onLifeLost(session.lives);
        }
      }

      if (session.onWrong) {
        session.onWrong(question, session.lives);
      }

      // Check if out of lives - restart from checkpoint
      if (session.useCheckpoints && session.wrongLosesLife && session.lives <= 0) {
        result.checkpointRestart = true;
        session.lives = session.maxLives;
        result.livesRemaining = session.lives;

        // Re-shuffle the segment questions
        const segmentStart = session.segmentStartIndex;
        const segmentEnd = Math.min(segmentStart + session.checkpointInterval, session.questionCount);
        const segment = session.questions.slice(segmentStart, segmentEnd);
        shuffle(segment);
        for (let i = 0; i < segment.length; i++) {
          session.questions[segmentStart + i] = segment[i];
        }

        session.currentIndex = segmentStart;

        if (session.onCheckpointRestart) {
          session.onCheckpointRestart(segmentStart);
        }
      }
    }

    return result;
  }

  /**
   * Advance past the current question without submitting an answer.
   * Used by timer-based games when time runs out.
   * Returns true if the game is now complete.
   */
  function advanceQuestion(session) {
    session.currentIndex++;
    return session.currentIndex >= session.questionCount;
  }

  /**
   * Get session progress info.
   */
  function getProgress(session) {
    return {
      current: session.currentIndex + 1,
      total: session.questionCount,
      lives: session.lives,
      maxLives: session.maxLives,
      checkpointNumber: Math.floor(session.segmentStartIndex / session.checkpointInterval),
      questionsInSegment: session.currentIndex - session.segmentStartIndex,
    };
  }

  // Public API
  return {
    createSession,
    getCurrentQuestion,
    submitAnswer,
    advanceQuestion,
    getProgress,
    generateChoices,
    NUMBER_WORDS,
    OPERATORS,
  };

})();
