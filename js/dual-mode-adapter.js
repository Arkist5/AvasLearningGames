/**
 * Dual Mode Adapter - Unified interface for math and spelling game engines.
 *
 * This adapter wraps either GameBase (math) or SpellingGameBase (spelling)
 * and provides a normalized callback interface to game code. Phaser scenes
 * can be written once and work identically for both subjects.
 *
 * Usage:
 *   DualModeAdapter.init({
 *     subject: 'math' | 'spelling',
 *     containers: { hudContainer, inputContainer },
 *     questionCount: 10,
 *     mode: 'type' | 'choice' | 'scramble' | 'keyboard',
 *     presentation: 'audio-picture' | 'audio-text' | 'audio-only',
 *     timerDuration: 12,
 *     callbacks: {
 *       onQuestionShow: (question, index) => {},
 *       onCorrect: (question, index) => {},
 *       onWrong: (question, lives) => {},
 *       onTimeout: (question, answer, isComplete) => {},
 *       onTimerTick: (remaining, total) => {},
 *       onComplete: (stats) => {},
 *       // Spelling-specific (safe to provide for math - they won't fire)
 *       onLetterCorrect: (letter, position) => {},
 *       onLetterWrong: (letter, position) => {},
 *       onWordComplete: (question) => {},
 *     }
 *   });
 */

var DualModeAdapter = (function () {
  var subject = 'math';
  var baseFramework = null; // GameBase or SpellingGameBase

  /**
   * Initialize the adapter with the appropriate game framework.
   * @param {Object} options - Configuration
   */
  function init(options) {
    options = options || {};
    subject = options.subject || 'math';
    var containers = options.containers || {};
    var callbacks = options.callbacks || {};

    if (subject === 'spelling') {
      // Use SpellingGameBase
      baseFramework = SpellingGameBase;

      SpellingGameBase.init(containers, {
        questionCount: options.questionCount || 10,
        mode: options.mode || 'scramble',
        presentation: options.presentation || 'audio-picture',
        showLives: options.showLives !== undefined ? options.showLives : false,
        wrongLosesLife: options.wrongLosesLife !== undefined ? options.wrongLosesLife : false,
        useCheckpoints: options.useCheckpoints !== undefined ? options.useCheckpoints : false,
        noDistractors: options.noDistractors !== undefined ? options.noDistractors : true,
        timerDuration: options.timerDuration || null,

        // Wire callbacks to normalized interface
        onQuestionShow: function (question, index) {
          if (callbacks.onQuestionShow) {
            callbacks.onQuestionShow(normalizeQuestion(question), index);
          }
        },
        onCorrect: function (question, index) {
          if (callbacks.onCorrect) {
            callbacks.onCorrect(normalizeQuestion(question), index);
          }
        },
        onWrong: function (question, lives) {
          if (callbacks.onWrong) {
            callbacks.onWrong(normalizeQuestion(question), lives);
          }
        },
        onTimeout: function (question, answer, isComplete) {
          if (callbacks.onTimeout) {
            callbacks.onTimeout(normalizeQuestion(question), answer, isComplete);
          }
        },
        onTimerTick: function (remaining, total) {
          if (callbacks.onTimerTick) {
            callbacks.onTimerTick(remaining, total);
          }
        },
        onComplete: function (stats) {
          if (callbacks.onComplete) {
            callbacks.onComplete(stats);
          }
        },
        onLetterCorrect: function (letter, position) {
          if (callbacks.onLetterCorrect) {
            callbacks.onLetterCorrect(letter, position);
          }
        },
        onLetterWrong: function (letter, position) {
          if (callbacks.onLetterWrong) {
            callbacks.onLetterWrong(letter, position);
          }
        },
        onWordComplete: function (question) {
          if (callbacks.onWordComplete) {
            callbacks.onWordComplete(normalizeQuestion(question));
          }
        },
      });
    } else {
      // Use GameBase (math)
      baseFramework = GameBase;

      GameBase.init(containers, {
        engine: MathEngine,
        questionCount: options.questionCount || 10,
        mode: options.mode || 'type',
        showLives: options.showLives !== undefined ? options.showLives : false,
        wrongLosesLife: options.wrongLosesLife !== undefined ? options.wrongLosesLife : false,
        useCheckpoints: options.useCheckpoints !== undefined ? options.useCheckpoints : false,
        timerDuration: options.timerDuration || null,

        // Wire callbacks to normalized interface
        onQuestionShow: function (question, index) {
          if (callbacks.onQuestionShow) {
            callbacks.onQuestionShow(normalizeQuestion(question), index);
          }
        },
        onCorrect: function (question, index) {
          if (callbacks.onCorrect) {
            callbacks.onCorrect(normalizeQuestion(question), index);
          }
        },
        onWrong: function (question, lives) {
          if (callbacks.onWrong) {
            callbacks.onWrong(normalizeQuestion(question), lives);
          }
        },
        onTimeout: function (question, answer, isComplete) {
          if (callbacks.onTimeout) {
            callbacks.onTimeout(normalizeQuestion(question), answer, isComplete);
          }
        },
        onTimerTick: function (remaining, total) {
          if (callbacks.onTimerTick) {
            callbacks.onTimerTick(remaining, total);
          }
        },
        onComplete: function (stats) {
          if (callbacks.onComplete) {
            callbacks.onComplete(stats);
          }
        },
        onCheckpoint: function () {
          if (callbacks.onCheckpoint) {
            callbacks.onCheckpoint();
          }
        },
        onCheckpointRestart: function () {
          if (callbacks.onCheckpointRestart) {
            callbacks.onCheckpointRestart();
          }
        },
      });
    }
  }

  /**
   * Normalize question objects to a consistent format.
   * Math questions have: { a, b, op, answer, display, audioKey }
   * Spelling questions have: { word, emoji }
   *
   * Normalized format:
   * {
   *   display: string,      // What to show (e.g., "3 + 5" or the word)
   *   answer: string|number, // Correct answer
   *   visual: string,       // Emoji or icon for the question
   *   original: object,     // Original question object
   * }
   */
  function normalizeQuestion(question) {
    if (!question) return null;

    if (subject === 'spelling') {
      return {
        display: question.word,
        answer: question.word,
        visual: question.emoji || '',
        original: question,
      };
    } else {
      // Math
      return {
        display: question.display,
        answer: question.answer,
        visual: '', // Math doesn't have emoji
        original: question,
      };
    }
  }

  /**
   * Get the current subject.
   */
  function getSubject() {
    return subject;
  }

  /**
   * Get the underlying session.
   */
  function getSession() {
    if (baseFramework) {
      return baseFramework.getSession();
    }
    return null;
  }

  /**
   * Force advance to the next question (after timeout animation).
   */
  function forceNextQuestion() {
    if (baseFramework) {
      baseFramework.forceNextQuestion();
    }
  }

  /**
   * Stop the timer.
   */
  function stopTimer() {
    if (baseFramework) {
      baseFramework.stopTimer();
    }
  }

  /**
   * Update the HUD.
   */
  function updateHUD() {
    if (baseFramework) {
      baseFramework.updateHUD();
    }
  }

  /**
   * Clean up resources.
   */
  function destroy() {
    if (baseFramework) {
      baseFramework.destroy();
    }
    baseFramework = null;
    subject = 'math';
  }

  return {
    init: init,
    getSubject: getSubject,
    getSession: getSession,
    forceNextQuestion: forceNextQuestion,
    stopTimer: stopTimer,
    updateHUD: updateHUD,
    destroy: destroy,
  };
})();
