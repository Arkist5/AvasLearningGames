/**
 * Spelling Engine - Word question generation, session management, per-letter validation.
 * Mirrors MathEngine's API contract so it plugs into the same architecture.
 */

const SpellingEngine = (() => {

  // Default word list if localStorage is empty
  const DEFAULT_WORDS = [
    { word: 'cat', emoji: '🐱' },
    { word: 'dog', emoji: '🐶' },
    { word: 'sun', emoji: '☀️' },
    { word: 'hat', emoji: '🎩' },
    { word: 'bed', emoji: '🛏️' },
    { word: 'cup', emoji: '☕' },
    { word: 'fish', emoji: '🐟' },
    { word: 'star', emoji: '⭐' },
    { word: 'tree', emoji: '🌳' },
    { word: 'cake', emoji: '🎂' },
    { word: 'moon', emoji: '🌙' },
    { word: 'book', emoji: '📖' },
    { word: 'ball', emoji: '⚽' },
    { word: 'frog', emoji: '🐸' },
    { word: 'rain', emoji: '🌧️' },
    { word: 'bear', emoji: '🐻' },
    { word: 'bird', emoji: '🐦' },
    { word: 'hand', emoji: '✋' },
    { word: 'ring', emoji: '💍' },
    { word: 'snow', emoji: '❄️' },
  ];

  // Emoji lookup for user-provided words (best-effort)
  const WORD_EMOJI_MAP = {
    cat: '🐱', dog: '🐶', sun: '☀️', hat: '🎩', bed: '🛏️',
    cup: '☕', fish: '🐟', star: '⭐', tree: '🌳', cake: '🎂',
    moon: '🌙', book: '📖', ball: '⚽', frog: '🐸', rain: '🌧️',
    bear: '🐻', bird: '🐦', hand: '✋', ring: '💍', snow: '❄️',
    apple: '🍎', house: '🏠', car: '🚗', boat: '⛵', horse: '🐴',
    mouse: '🐭', flower: '🌸', heart: '❤️', fire: '🔥', water: '💧',
    lion: '🦁', tiger: '🐯', elephant: '🐘', monkey: '🐒', rabbit: '🐰',
    pig: '🐷', cow: '🐮', duck: '🦆', chicken: '🐔', sheep: '🐑',
    butterfly: '🦋', bee: '🐝', ant: '🐜', spider: '🕷️', snake: '🐍',
    pizza: '🍕', milk: '🥛', egg: '🥚', bread: '🍞', candy: '🍬',
    ice: '🧊', cookie: '🍪', banana: '🍌', grape: '🍇', orange: '🍊',
    lemon: '🍋', corn: '🌽', carrot: '🥕', potato: '🥔', tomato: '🍅',
    school: '🏫', bus: '🚌', train: '🚂', plane: '✈️', ship: '🚢',
    rock: '🪨', gem: '💎', crown: '👑', sword: '⚔️', shield: '🛡️',
    key: '🔑', lock: '🔒', bell: '🔔', drum: '🥁', guitar: '🎸',
    piano: '🎹', paint: '🎨', robot: '🤖', ghost: '👻', angel: '😇',
    rocket: '🚀', earth: '🌍', cloud: '☁️', wind: '💨', leaf: '🍃',
    rose: '🌹', tulip: '🌷', cactus: '🌵', mushroom: '🍄', shell: '🐚',
    lamp: '💡', clock: '🕐', phone: '📱', camera: '📷', map: '🗺️',
    flag: '🏁', gift: '🎁', balloon: '🎈', party: '🎉', magic: '✨',
  };

  /**
   * Shuffle array in place (Fisher-Yates).
   */
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  /**
   * Load words from localStorage or use defaults.
   * Returns array of { word, emoji } objects.
   */
  function loadWordList() {
    var words = [];
    try {
      var saved = localStorage.getItem('avagames-spelling');
      if (saved) {
        var parsed = JSON.parse(saved);
        if (parsed.words && parsed.words.length > 0) {
          words = parsed.words.map(function (w) {
            var lower = w.toLowerCase().trim();
            return {
              word: lower,
              emoji: WORD_EMOJI_MAP[lower] || '📝',
            };
          });
        }
      }
    } catch (e) {}

    if (words.length === 0) {
      words = DEFAULT_WORDS.slice();
    }
    return words;
  }

  /**
   * Build question objects from word list.
   */
  function buildQuestions(wordList, count) {
    shuffle(wordList);
    var questions = [];
    for (var i = 0; i < count && i < wordList.length; i++) {
      var w = wordList[i];
      questions.push({
        word: w.word,
        answer: w.word,
        display: w.word,
        emoji: w.emoji,
        audioKey: w.word,
        hasCustomAudio: false,
      });
    }
    // If we need more questions than words, cycle
    if (count > wordList.length) {
      var idx = 0;
      while (questions.length < count) {
        var w = wordList[idx % wordList.length];
        questions.push({
          word: w.word,
          answer: w.word,
          display: w.word,
          emoji: w.emoji,
          audioKey: w.word,
          hasCustomAudio: false,
        });
        idx++;
      }
    }
    return questions;
  }

  /**
   * Generate 1-2 distractor letters for scrambled tile mode.
   * Returns the word's letters plus distractors, shuffled.
   */
  function generateDistractors(word) {
    var letters = word.split('');
    var alphabet = 'abcdefghijklmnopqrstuvwxyz';
    var wordLetterSet = {};
    for (var i = 0; i < letters.length; i++) {
      wordLetterSet[letters[i]] = true;
    }

    // Add 1-2 distractors
    var distractorCount = word.length <= 3 ? 1 : 2;
    var distractors = [];
    var attempts = 0;
    while (distractors.length < distractorCount && attempts < 50) {
      var c = alphabet[Math.floor(Math.random() * 26)];
      // Prefer letters not in the word, but allow duplicates as fallback
      if (!wordLetterSet[c] || attempts > 30) {
        var already = false;
        for (var j = 0; j < distractors.length; j++) {
          if (distractors[j] === c) { already = true; break; }
        }
        if (!already) {
          distractors.push(c);
        }
      }
      attempts++;
    }

    return shuffle(letters.concat(distractors));
  }

  /**
   * Create a new spelling session.
   */
  function createSession(options) {
    options = options || {};
    var questionCount = options.questionCount || 10;
    var maxLives = options.maxLives || 3;
    var useCheckpoints = options.useCheckpoints !== undefined ? options.useCheckpoints : true;
    var wrongLosesLife = options.wrongLosesLife !== undefined ? options.wrongLosesLife : true;
    var words = options.words || null;
    var checkpointInterval = options.checkpointInterval || 5;

    // Load words
    var wordList;
    if (words && words.length > 0) {
      wordList = words.map(function (w) {
        var lower = (typeof w === 'string') ? w.toLowerCase().trim() : w.word;
        return { word: lower, emoji: WORD_EMOJI_MAP[lower] || '📝' };
      });
    } else {
      wordList = loadWordList();
    }

    var questions = buildQuestions(wordList, questionCount);

    var session = {
      questions: questions,
      questionCount: questionCount,
      checkpointInterval: checkpointInterval,
      maxLives: maxLives,
      useCheckpoints: useCheckpoints,
      wrongLosesLife: wrongLosesLife,
      currentIndex: 0,
      lives: maxLives,
      lastCheckpoint: 0,
      totalCorrect: 0,
      totalWrong: 0,
      segmentStartIndex: 0,

      // Per-letter tracking for current word
      letterProgress: [],  // array of entered letters
      currentWord: '',     // the current word being spelled

      // Event callbacks
      onQuestion: null,
      onCorrect: null,
      onWrong: null,
      onLifeLost: null,
      onCheckpoint: null,
      onCheckpointRestart: null,
      onComplete: null,
    };

    return session;
  }

  /**
   * Get the current question.
   */
  function getCurrentQuestion(session) {
    if (session.currentIndex >= session.questionCount) return null;
    var q = session.questions[session.currentIndex];
    // Initialize letter progress for this word
    if (session.currentWord !== q.word) {
      session.currentWord = q.word;
      session.letterProgress = [];
    }
    return q;
  }

  /**
   * Submit a letter at the next position.
   * Returns { correct, letter, position, wordComplete, word }
   */
  function submitLetter(session, letter) {
    var question = getCurrentQuestion(session);
    if (!question) return null;

    var position = session.letterProgress.length;
    var expectedLetter = question.word[position];
    var correct = letter.toLowerCase() === expectedLetter;

    var result = {
      correct: correct,
      letter: letter.toLowerCase(),
      position: position,
      wordComplete: false,
      word: question.word,
    };

    if (correct) {
      session.letterProgress.push(letter.toLowerCase());
      // Check if word is complete
      if (session.letterProgress.length === question.word.length) {
        result.wordComplete = true;
      }
    }

    return result;
  }

  /**
   * Remove the last correctly entered letter (backspace).
   * Returns the removed letter or null.
   */
  function removeLetter(session) {
    if (session.letterProgress.length === 0) return null;
    return session.letterProgress.pop();
  }

  /**
   * Reset letter progress for current word.
   */
  function resetCurrentWord(session) {
    session.letterProgress = [];
  }

  /**
   * Submit a complete answer (full word string comparison).
   * Mirrors MathEngine.submitAnswer's return shape.
   */
  function submitAnswer(session, answer) {
    var question = getCurrentQuestion(session);
    if (!question) return null;

    var correct = answer.toLowerCase().trim() === question.answer;
    var result = {
      correct: correct,
      question: question,
      livesRemaining: session.lives,
      isCheckpoint: false,
      isComplete: false,
      checkpointRestart: false,
    };

    if (correct) {
      session.totalCorrect++;
      session.currentIndex++;
      session.letterProgress = [];
      session.currentWord = '';

      if (session.onCorrect) {
        session.onCorrect(question, session.currentIndex - 1);
      }

      // Checkpoint check
      var questionsInSegment = session.currentIndex - session.segmentStartIndex;
      if (session.useCheckpoints &&
          questionsInSegment >= session.checkpointInterval &&
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

      // Completion check
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

      // Checkpoint restart if out of lives
      if (session.useCheckpoints && session.wrongLosesLife && session.lives <= 0) {
        result.checkpointRestart = true;
        session.lives = session.maxLives;
        result.livesRemaining = session.lives;

        var segmentStart = session.segmentStartIndex;
        var segmentEnd = Math.min(segmentStart + session.checkpointInterval, session.questionCount);
        var segment = session.questions.slice(segmentStart, segmentEnd);
        shuffle(segment);
        for (var i = 0; i < segment.length; i++) {
          session.questions[segmentStart + i] = segment[i];
        }

        session.currentIndex = segmentStart;
        session.letterProgress = [];
        session.currentWord = '';

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
   */
  function advanceQuestion(session) {
    session.currentIndex++;
    session.letterProgress = [];
    session.currentWord = '';
    return session.currentIndex >= session.questionCount;
  }

  /**
   * Get session progress info (same shape as MathEngine).
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
    createSession: createSession,
    getCurrentQuestion: getCurrentQuestion,
    submitAnswer: submitAnswer,
    submitLetter: submitLetter,
    removeLetter: removeLetter,
    resetCurrentWord: resetCurrentWord,
    advanceQuestion: advanceQuestion,
    getProgress: getProgress,
    generateDistractors: generateDistractors,
    DEFAULT_WORDS: DEFAULT_WORDS,
    WORD_EMOJI_MAP: WORD_EMOJI_MAP,
  };

})();
