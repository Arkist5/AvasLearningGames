/**
 * Game Base - Shared game mechanics, HUD, input components, and game flow.
 * Individual games extend this with their own visual logic.
 */

const GameBase = (() => {
  let session = null;
  let gameCallbacks = {};
  let inputMode = 'type'; // 'type' or 'choice'
  let currentAnswer = '';
  let inputLocked = false;
  let elements = {};

  // Helper to create an element with class and optional text
  function el(tag, className, textContent) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (textContent !== undefined) e.textContent = textContent;
    return e;
  }

  /**
   * Initialize the game base with container elements and game config.
   * @param {Object} containers - { hudContainer, inputContainer }
   * @param {Object} options - game configuration and callbacks
   */
  function init(containers, options = {}) {
    // Support legacy single-element call: init(el, opts)
    let hudContainer, inputContainer;
    if (containers instanceof HTMLElement) {
      hudContainer = containers;
      inputContainer = containers;
    } else {
      hudContainer = containers.hudContainer;
      inputContainer = containers.inputContainer;
    }

    const {
      questionCount = 10,
      mode = 'type',
      onCorrect = null,
      onWrong = null,
      onCheckpoint = null,
      onCheckpointRestart = null,
      onComplete = null,
      onQuestionShow = null,
    } = options;

    inputMode = mode;
    gameCallbacks = { onCorrect, onWrong, onCheckpoint, onCheckpointRestart, onComplete, onQuestionShow };

    // Create math session
    session = MathEngine.createSession({ questionCount });

    // Wire math engine events
    session.onCorrect = handleCorrect;
    session.onWrong = handleWrong;
    session.onLifeLost = handleLifeLost;
    session.onCheckpoint = handleCheckpoint;
    session.onCheckpointRestart = handleCheckpointRestart;
    session.onComplete = handleComplete;

    // Build UI into separate containers
    buildHUD(hudContainer);
    buildInputArea(inputContainer);

    // Preload first batch of audio
    AudioManager.preloadBatch(session.questions, 0, 5);

    // Show first question
    showCurrentQuestion();
  }

  function buildHUD(container) {
    const hud = el('div', 'game-hud');

    const livesEl = el('div', 'hud-lives');
    livesEl.id = 'hud-lives';

    const progressEl = el('div', 'hud-progress');
    progressEl.id = 'hud-progress';

    const checkpointEl = el('div', 'hud-checkpoint');
    checkpointEl.id = 'hud-checkpoint';

    hud.appendChild(livesEl);
    hud.appendChild(progressEl);
    hud.appendChild(checkpointEl);

    container.appendChild(hud);
    elements.hud = hud;
    elements.lives = livesEl;
    elements.progress = progressEl;
    elements.checkpoint = checkpointEl;
    updateHUD();
  }

  function updateHUD() {
    if (!session) return;
    const progress = MathEngine.getProgress(session);

    // Lives as hearts - safe: only static content
    elements.lives.textContent = '';
    for (let i = 0; i < progress.maxLives; i++) {
      const heart = el('span', i < progress.lives ? 'heart full' : 'heart empty');
      heart.textContent = i < progress.lives ? '\u2665' : '\u2661';
      elements.lives.appendChild(heart);
    }

    // Progress counter
    const displayIndex = Math.min(progress.current, progress.total);
    elements.progress.textContent = `${displayIndex} / ${progress.total}`;
  }

  function buildInputArea(container) {
    const inputArea = el('div', 'game-input-area');

    // Question display
    const questionDisplay = el('div', 'question-display');
    questionDisplay.id = 'question-display';
    inputArea.appendChild(questionDisplay);

    // Answer area (number pad or multiple choice)
    const answerArea = el('div', 'answer-area');
    answerArea.id = 'answer-area';
    inputArea.appendChild(answerArea);

    // Feedback overlay
    const feedback = el('div', 'feedback-overlay');
    feedback.id = 'feedback-overlay';
    inputArea.appendChild(feedback);

    container.appendChild(inputArea);
    elements.inputArea = inputArea;
    elements.questionDisplay = questionDisplay;
    elements.answerArea = answerArea;
    elements.feedback = feedback;
  }

  function showCurrentQuestion() {
    const question = MathEngine.getCurrentQuestion(session);
    if (!question) return;

    inputLocked = false;
    currentAnswer = '';

    // Build question display using DOM methods
    elements.questionDisplay.textContent = '';
    const questionText = el('span', 'question-text');

    const equationText = document.createTextNode(`${question.display} = `);
    questionText.appendChild(equationText);

    const answerSlot = el('span', 'answer-slot', '?');
    answerSlot.id = 'answer-slot';
    questionText.appendChild(answerSlot);

    elements.questionDisplay.appendChild(questionText);
    elements.answerSlot = answerSlot;

    // Build input based on mode
    if (inputMode === 'type') {
      buildNumberPad();
    } else {
      buildMultipleChoice(question);
    }

    // Play question audio
    AudioManager.playQuestion(question.audioKey);

    // Preload next batch of audio
    AudioManager.preloadBatch(session.questions, session.currentIndex + 1, 3);

    // Notify game
    if (gameCallbacks.onQuestionShow) {
      gameCallbacks.onQuestionShow(question, session.currentIndex);
    }

    updateHUD();
  }

  function buildNumberPad() {
    const pad = el('div', 'number-pad');

    // Number buttons 1-9
    for (let i = 1; i <= 9; i++) {
      const btn = createPadButton(String(i), () => appendDigit(String(i)));
      pad.appendChild(btn);
    }

    // Bottom row: backspace, 0, submit
    const backBtn = createPadButton('\u232B', handleBackspace, 'pad-btn-back');
    pad.appendChild(backBtn);

    const zeroBtn = createPadButton('0', () => appendDigit('0'));
    pad.appendChild(zeroBtn);

    const submitBtn = createPadButton('\u2713', handleSubmit, 'pad-btn-submit');
    pad.appendChild(submitBtn);

    elements.answerArea.textContent = '';
    elements.answerArea.appendChild(pad);
  }

  function createPadButton(label, onClick, extraClass = '') {
    const btn = document.createElement('button');
    btn.className = `pad-btn ${extraClass}`;
    btn.textContent = label;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!inputLocked) onClick();
    });
    return btn;
  }

  function appendDigit(digit) {
    if (currentAnswer.length >= 2) return; // Max 18, so 2 digits
    currentAnswer += digit;
    if (elements.answerSlot) {
      elements.answerSlot.textContent = currentAnswer;
      elements.answerSlot.classList.add('has-value');
    }
  }

  function handleBackspace() {
    currentAnswer = currentAnswer.slice(0, -1);
    if (elements.answerSlot) {
      elements.answerSlot.textContent = currentAnswer || '?';
      elements.answerSlot.classList.toggle('has-value', currentAnswer.length > 0);
    }
  }

  function handleSubmit() {
    if (currentAnswer === '' || inputLocked) return;
    processAnswer(parseInt(currentAnswer, 10));
  }

  function buildMultipleChoice(question) {
    const choices = MathEngine.generateChoices(question.answer);
    const choiceContainer = el('div', 'choice-container');

    choices.forEach((choice) => {
      const btn = el('button', 'choice-btn', String(choice));
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!inputLocked) {
          if (elements.answerSlot) {
            elements.answerSlot.textContent = choice;
            elements.answerSlot.classList.add('has-value');
          }
          processAnswer(choice);
        }
      });
      choiceContainer.appendChild(btn);
    });

    elements.answerArea.textContent = '';
    elements.answerArea.appendChild(choiceContainer);
  }

  function processAnswer(answer) {
    inputLocked = true;
    const result = MathEngine.submitAnswer(session, answer);
    if (!result) return;

    if (result.correct) {
      showFeedback('correct');
      AudioManager.playAnswer(result.question.audioKey);
      AudioManager.playSfx('correct');

      if (gameCallbacks.onCorrect) {
        gameCallbacks.onCorrect(result.question, session.currentIndex - 1);
      }

      // Delay before next question for animation time
      const delay = result.isCheckpoint ? 2500 : result.isComplete ? 100 : 1500;

      if (result.isCheckpoint) {
        setTimeout(() => showCheckpointCelebration(), 800);
      }

      if (!result.isComplete) {
        setTimeout(() => {
          hideFeedback();
          showCurrentQuestion();
        }, delay);
      }
    } else {
      showFeedback('wrong');
      AudioManager.playSfx('wrong');

      if (gameCallbacks.onWrong) {
        gameCallbacks.onWrong(result.question, result.livesRemaining);
      }

      if (result.checkpointRestart) {
        setTimeout(() => {
          showCheckpointRestart();
          if (gameCallbacks.onCheckpointRestart) {
            gameCallbacks.onCheckpointRestart();
          }
          setTimeout(() => {
            hideFeedback();
            showCurrentQuestion();
          }, 2000);
        }, 1200);
      } else {
        // Same question again after a pause
        setTimeout(() => {
          hideFeedback();
          showCurrentQuestion();
        }, 1500);
      }
    }

    updateHUD();
  }

  function showFeedback(type) {
    elements.feedback.className = `feedback-overlay ${type}`;
    elements.feedback.textContent = type === 'correct' ? '\u2713' : '\u2717';
    elements.feedback.classList.add('show');
  }

  function hideFeedback() {
    elements.feedback.classList.remove('show');
  }

  function showCheckpointCelebration() {
    const checkpoint = el('div', 'checkpoint-celebration');
    const text = el('div', 'checkpoint-text', 'Checkpoint!');
    const stars = el('div', 'checkpoint-stars', '\u2B50 \u2B50 \u2B50');
    checkpoint.appendChild(text);
    checkpoint.appendChild(stars);
    elements.inputArea.appendChild(checkpoint);
    setTimeout(() => checkpoint.remove(), 2000);
  }

  function showCheckpointRestart() {
    const restart = el('div', 'checkpoint-restart');
    const text = el('div', 'restart-text', 'Try again!');
    const sub = el('div', 'restart-subtext', 'Back to checkpoint');
    restart.appendChild(text);
    restart.appendChild(sub);
    elements.inputArea.appendChild(restart);
    setTimeout(() => restart.remove(), 2000);
  }

  // Internal handlers that forward to game callbacks
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

  function getSession() {
    return session;
  }

  function destroy() {
    session = null;
    gameCallbacks = {};
    elements = {};
  }

  return {
    init,
    getSession,
    destroy,
    updateHUD,
  };
})();
