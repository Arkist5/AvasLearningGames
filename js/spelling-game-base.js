/**
 * Spelling Game Base - Shared HUD, letter input modes, presentation modes, and game flow
 * for spelling games. Parallel to GameBase (which handles math games).
 *
 * Input modes:
 *   'scramble' - shuffled letter tiles + distractors, tap to fill slots
 *   'keyboard' - full QWERTY keyboard, tap letters in order
 *
 * Presentation modes:
 *   'audio-picture' - emoji shown + word spoken
 *   'audio-text'    - word displayed + word spoken
 *   'audio-only'    - nothing shown, just word spoken
 */

const SpellingGameBase = (() => {
  var session = null;
  var gameCallbacks = {};
  var gameOptions = {};
  var inputMode = 'scramble'; // 'scramble' or 'keyboard'
  var presentationMode = 'audio-picture';
  var inputLocked = false;
  var elements = {};

  // Timer state
  var timerInterval = null;
  var timerRemaining = 0;

  // Scramble tile state
  var tileElements = [];   // the letter tile buttons
  var slotElements = [];   // the answer slot elements
  var usedTileIndices = []; // which tiles have been placed

  function el(tag, className, textContent) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (textContent !== undefined) e.textContent = textContent;
    return e;
  }

  /**
   * Initialize spelling game base.
   * @param {Object} containers - { hudContainer, inputContainer }
   * @param {Object} options - game configuration and callbacks
   */
  function init(containers, options) {
    options = options || {};
    var hudContainer = containers.hudContainer;
    var inputContainer = containers.inputContainer;

    var questionCount = options.questionCount || 10;
    var mode = options.mode || 'scramble';
    var presentation = options.presentation || 'audio-picture';
    var showLives = options.showLives !== undefined ? options.showLives : true;
    var wrongLosesLife = options.wrongLosesLife !== undefined ? options.wrongLosesLife : true;
    var useCheckpoints = options.useCheckpoints !== undefined ? options.useCheckpoints : true;
    var timerDuration = options.timerDuration || null;

    inputMode = mode;
    presentationMode = presentation;
    gameCallbacks = {
      onCorrect: options.onCorrect || null,
      onWrong: options.onWrong || null,
      onCheckpoint: options.onCheckpoint || null,
      onCheckpointRestart: options.onCheckpointRestart || null,
      onComplete: options.onComplete || null,
      onQuestionShow: options.onQuestionShow || null,
      onTimeout: options.onTimeout || null,
      onTimerTick: options.onTimerTick || null,
      onLetterCorrect: options.onLetterCorrect || null,
      onLetterWrong: options.onLetterWrong || null,
      onWordComplete: options.onWordComplete || null,
    };
    gameOptions = {
      showLives: showLives,
      wrongLosesLife: wrongLosesLife,
      useCheckpoints: useCheckpoints,
      timerDuration: timerDuration,
    };

    // Create spelling session
    session = SpellingEngine.createSession({
      questionCount: questionCount,
      useCheckpoints: useCheckpoints,
      wrongLosesLife: wrongLosesLife,
    });

    // Wire engine callbacks
    session.onCorrect = handleCorrect;
    session.onWrong = handleWrong;
    session.onLifeLost = handleLifeLost;
    session.onCheckpoint = handleCheckpoint;
    session.onCheckpointRestart = handleCheckpointRestart;
    session.onComplete = handleComplete;

    // Build UI
    buildHUD(hudContainer);
    buildInputArea(inputContainer);

    // Show first question
    showCurrentQuestion();
  }

  // --- HUD ---

  function buildHUD(container) {
    var hud = el('div', 'game-hud');

    var livesEl = el('div', 'hud-lives');
    livesEl.id = 'hud-lives';

    var progressEl = el('div', 'hud-progress');
    progressEl.id = 'hud-progress';

    hud.appendChild(livesEl);
    hud.appendChild(progressEl);

    container.appendChild(hud);
    elements.hud = hud;
    elements.lives = livesEl;
    elements.progress = progressEl;
    updateHUD();
  }

  function updateHUD() {
    if (!session) return;
    var progress = SpellingEngine.getProgress(session);

    // Lives as hearts
    elements.lives.textContent = '';
    if (gameOptions.showLives) {
      for (var i = 0; i < progress.maxLives; i++) {
        var heart = el('span', i < progress.lives ? 'heart full' : 'heart empty');
        heart.textContent = i < progress.lives ? '\u2665' : '\u2661';
        elements.lives.appendChild(heart);
      }
    }

    // Progress counter
    var displayIndex = Math.min(progress.current, progress.total);
    elements.progress.textContent = displayIndex + ' / ' + progress.total;
  }

  // --- Input Area ---

  function buildInputArea(container) {
    var inputArea = el('div', 'spelling-input-area');

    // Question/prompt display (word, emoji, or nothing depending on mode)
    var promptDisplay = el('div', 'spelling-prompt');
    promptDisplay.id = 'spelling-prompt';
    inputArea.appendChild(promptDisplay);

    // Speak button
    var speakBtn = el('button', 'spelling-speak-btn', '🔊');
    speakBtn.id = 'spelling-speak-btn';
    speakBtn.setAttribute('aria-label', 'Hear word again');
    speakBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var q = SpellingEngine.getCurrentQuestion(session);
      if (q) WordAudioManager.pronounceWord(q);
    });
    inputArea.appendChild(speakBtn);

    // Answer slots row
    var slotsRow = el('div', 'spelling-slots');
    slotsRow.id = 'spelling-slots';
    inputArea.appendChild(slotsRow);

    // Input area (tiles or keyboard)
    var inputZone = el('div', 'spelling-input-zone');
    inputZone.id = 'spelling-input-zone';
    inputArea.appendChild(inputZone);

    // Feedback overlay
    var feedback = el('div', 'feedback-overlay');
    feedback.id = 'spelling-feedback';
    inputArea.appendChild(feedback);

    container.appendChild(inputArea);
    elements.inputArea = inputArea;
    elements.prompt = promptDisplay;
    elements.speakBtn = speakBtn;
    elements.slotsRow = slotsRow;
    elements.inputZone = inputZone;
    elements.feedback = feedback;
  }

  // --- Timer ---

  function startTimer() {
    if (!gameOptions.timerDuration) return;
    stopTimer();
    timerRemaining = gameOptions.timerDuration;

    timerInterval = setInterval(function () {
      timerRemaining--;
      if (gameCallbacks.onTimerTick) {
        gameCallbacks.onTimerTick(timerRemaining, gameOptions.timerDuration);
      }
      if (timerRemaining <= 0) {
        handleTimeout();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function handleTimeout() {
    stopTimer();
    inputLocked = true;

    var question = SpellingEngine.getCurrentQuestion(session);
    var isComplete = SpellingEngine.advanceQuestion(session);

    if (gameCallbacks.onTimeout) {
      gameCallbacks.onTimeout(question, question ? question.word : '', isComplete);
    }

    updateHUD();
  }

  // --- Question Display ---

  function showCurrentQuestion() {
    var question = SpellingEngine.getCurrentQuestion(session);
    if (!question) return;

    inputLocked = false;
    SpellingEngine.resetCurrentWord(session);
    tileElements = [];
    slotElements = [];
    usedTileIndices = [];

    // Build prompt based on presentation mode
    elements.prompt.textContent = '';
    if (presentationMode === 'audio-picture') {
      var emojiEl = el('div', 'spelling-emoji', question.emoji);
      elements.prompt.appendChild(emojiEl);
    } else if (presentationMode === 'audio-text') {
      var textEl = el('div', 'spelling-word-display', question.word);
      elements.prompt.appendChild(textEl);
    }
    // audio-only: prompt stays empty

    // Build answer slots
    buildSlots(question.word);

    // Build input
    if (inputMode === 'scramble') {
      buildScrambleTiles(question);
    } else {
      buildKeyboard();
    }

    // Speak the word
    WordAudioManager.pronounceWord(question);

    // Notify game
    if (gameCallbacks.onQuestionShow) {
      gameCallbacks.onQuestionShow(question, session.currentIndex);
    }

    updateHUD();
    startTimer();
  }

  function buildSlots(word) {
    elements.slotsRow.textContent = '';
    slotElements = [];

    for (var i = 0; i < word.length; i++) {
      var slot = el('div', 'spelling-slot');
      slot.setAttribute('data-index', i);
      slot.setAttribute('data-expected', word[i]);

      // Tap to remove letter from slot (returns to tray in scramble mode)
      (function (idx) {
        slot.addEventListener('click', function (e) {
          e.preventDefault();
          if (!inputLocked) removeLetterFromSlot(idx);
        });
      })(i);

      slotElements.push(slot);
      elements.slotsRow.appendChild(slot);
    }
  }

  // --- Scramble Tiles ---

  function buildScrambleTiles(question) {
    var letters = SpellingEngine.generateDistractors(question.word);
    elements.inputZone.textContent = '';
    tileElements = [];
    usedTileIndices = [];

    var tray = el('div', 'spelling-tile-tray');

    for (var i = 0; i < letters.length; i++) {
      (function (letter, idx) {
        var tile = el('button', 'spelling-tile', letter.toUpperCase());
        tile.setAttribute('data-letter', letter);
        tile.setAttribute('data-tile-index', idx);
        tile.addEventListener('click', function (e) {
          e.preventDefault();
          if (!inputLocked) handleTileTap(idx);
        });
        tileElements.push(tile);
        tray.appendChild(tile);
      })(letters[i], i);
    }

    elements.inputZone.appendChild(tray);
  }

  function handleTileTap(tileIndex) {
    // Check if tile already used
    for (var i = 0; i < usedTileIndices.length; i++) {
      if (usedTileIndices[i] === tileIndex) return;
    }

    var tile = tileElements[tileIndex];
    var letter = tile.getAttribute('data-letter');

    // Submit letter to engine
    var result = SpellingEngine.submitLetter(session, letter);
    if (!result) return;

    if (result.correct) {
      // Place in slot
      var slot = slotElements[result.position];
      slot.textContent = letter.toUpperCase();
      slot.classList.add('filled', 'correct');
      slot.setAttribute('data-tile-index', tileIndex);

      // Dim the tile
      tile.classList.add('used');
      usedTileIndices.push(tileIndex);

      if (gameCallbacks.onLetterCorrect) {
        gameCallbacks.onLetterCorrect(letter, result.position);
      }

      // Check word completion
      if (result.wordComplete) {
        handleWordComplete();
      }
    } else {
      // Wrong letter - flash the slot red briefly
      var nextSlot = slotElements[result.position];
      if (nextSlot) {
        nextSlot.textContent = letter.toUpperCase();
        nextSlot.classList.add('wrong');
        setTimeout(function () {
          nextSlot.textContent = '';
          nextSlot.classList.remove('wrong');
        }, 400);
      }

      if (gameCallbacks.onLetterWrong) {
        gameCallbacks.onLetterWrong(letter, result.position);
      }
    }
  }

  function removeLetterFromSlot(slotIndex) {
    var slot = slotElements[slotIndex];
    if (!slot.classList.contains('filled')) return;

    // Only allow removing the last filled slot
    var lastFilledIndex = -1;
    for (var i = slotElements.length - 1; i >= 0; i--) {
      if (slotElements[i].classList.contains('filled')) {
        lastFilledIndex = i;
        break;
      }
    }
    if (slotIndex !== lastFilledIndex) return;

    // Return tile to tray
    var tileIndex = parseInt(slot.getAttribute('data-tile-index'), 10);
    if (!isNaN(tileIndex) && tileElements[tileIndex]) {
      tileElements[tileIndex].classList.remove('used');
      // Remove from usedTileIndices
      for (var j = usedTileIndices.length - 1; j >= 0; j--) {
        if (usedTileIndices[j] === tileIndex) {
          usedTileIndices.splice(j, 1);
          break;
        }
      }
    }

    // Clear slot
    slot.textContent = '';
    slot.classList.remove('filled', 'correct');
    slot.removeAttribute('data-tile-index');

    // Remove from engine progress
    SpellingEngine.removeLetter(session);
  }

  // --- Keyboard ---

  function buildKeyboard() {
    elements.inputZone.textContent = '';

    var rows = [
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm', "'", '⌫']
    ];

    var keyboard = el('div', 'spelling-keyboard');

    for (var r = 0; r < rows.length; r++) {
      var row = el('div', 'spelling-kb-row');
      for (var k = 0; k < rows[r].length; k++) {
        (function (key) {
          var isBackspace = key === '⌫';
          var btn = el('button',
            'spelling-kb-key' + (isBackspace ? ' kb-backspace' : ''),
            key.toUpperCase()
          );
          btn.addEventListener('click', function (e) {
            e.preventDefault();
            if (inputLocked) return;
            if (isBackspace) {
              handleKeyboardBackspace();
            } else {
              handleKeyboardTap(key);
            }
          });
          row.appendChild(btn);
        })(rows[r][k]);
      }
      keyboard.appendChild(row);
    }

    elements.inputZone.appendChild(keyboard);
  }

  function handleKeyboardTap(letter) {
    var result = SpellingEngine.submitLetter(session, letter);
    if (!result) return;

    if (result.correct) {
      var slot = slotElements[result.position];
      slot.textContent = letter.toUpperCase();
      slot.classList.add('filled', 'correct');

      if (gameCallbacks.onLetterCorrect) {
        gameCallbacks.onLetterCorrect(letter, result.position);
      }

      if (result.wordComplete) {
        handleWordComplete();
      }
    } else {
      var nextSlot = slotElements[result.position];
      if (nextSlot) {
        nextSlot.textContent = letter.toUpperCase();
        nextSlot.classList.add('wrong');
        setTimeout(function () {
          nextSlot.textContent = '';
          nextSlot.classList.remove('wrong');
        }, 400);
      }

      if (gameCallbacks.onLetterWrong) {
        gameCallbacks.onLetterWrong(letter, result.position);
      }
    }
  }

  function handleKeyboardBackspace() {
    var removed = SpellingEngine.removeLetter(session);
    if (removed === null) return;

    // Find last filled slot and clear it
    for (var i = slotElements.length - 1; i >= 0; i--) {
      if (slotElements[i].classList.contains('filled')) {
        slotElements[i].textContent = '';
        slotElements[i].classList.remove('filled', 'correct');
        break;
      }
    }
  }

  // --- Word Completion ---

  function handleWordComplete() {
    inputLocked = true;
    stopTimer();

    // Flash all slots green
    for (var i = 0; i < slotElements.length; i++) {
      slotElements[i].classList.add('complete');
    }

    // Submit the complete word to the engine
    var question = SpellingEngine.getCurrentQuestion(session);
    var result = SpellingEngine.submitAnswer(session, question.word);

    showFeedback('correct');
    if (typeof AudioManager !== 'undefined') {
      AudioManager.playSfx('correct');
    }

    if (gameCallbacks.onWordComplete) {
      gameCallbacks.onWordComplete(question);
    }

    if (gameCallbacks.onCorrect) {
      gameCallbacks.onCorrect(question, session.currentIndex - 1);
    }

    var delay = result.isCheckpoint ? 4500 : result.isComplete ? 100 : 2500;

    if (result.isCheckpoint) {
      setTimeout(function () { showCheckpointCelebration(); }, 800);
    }

    if (!result.isComplete) {
      setTimeout(function () {
        hideFeedback();
        showCurrentQuestion();
      }, delay);
    }

    updateHUD();
  }

  // --- Feedback ---

  function showFeedback(type) {
    elements.feedback.className = 'feedback-overlay ' + type;
    elements.feedback.textContent = type === 'correct' ? '\u2713' : '\u2717';
    elements.feedback.classList.add('show');
  }

  function hideFeedback() {
    elements.feedback.classList.remove('show');
  }

  function showCheckpointCelebration() {
    var checkpoint = el('div', 'checkpoint-celebration');
    var text = el('div', 'checkpoint-text', 'Checkpoint!');
    var stars = el('div', 'checkpoint-stars', '⭐ ⭐ ⭐');
    checkpoint.appendChild(text);
    checkpoint.appendChild(stars);
    elements.inputArea.appendChild(checkpoint);
    setTimeout(function () { checkpoint.remove(); }, 2000);
  }

  // --- Internal Handlers ---

  function handleCorrect() {}
  function handleWrong() {}
  function handleLifeLost() {}
  function handleCheckpoint() {}
  function handleCheckpointRestart() {}
  function handleComplete(stats) {
    if (gameCallbacks.onComplete) {
      gameCallbacks.onComplete(stats);
    }
  }

  // --- Public API ---

  function getSession() {
    return session;
  }

  function forceNextQuestion() {
    hideFeedback();
    showCurrentQuestion();
  }

  function destroy() {
    stopTimer();
    session = null;
    gameCallbacks = {};
    gameOptions = {};
    elements = {};
    tileElements = [];
    slotElements = [];
    usedTileIndices = [];
  }

  return {
    init: init,
    getSession: getSession,
    destroy: destroy,
    updateHUD: updateHUD,
    forceNextQuestion: forceNextQuestion,
    stopTimer: stopTimer,
    showFeedback: showFeedback,
    hideFeedback: hideFeedback,
  };

})();
