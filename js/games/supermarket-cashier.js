/**
 * Supermarket Cashier - Check out customers by answering questions correctly.
 * Works with BOTH math and spelling modes via DualModeAdapter.
 *
 * Uses Phaser 3 for scene visuals, DualModeAdapter for unified input/HUD.
 *
 * Flow per question:
 * 1. Item appears on conveyor belt
 * 2. Question appears (math total or spelling item name)
 * 3. Timer starts (visual bar in Phaser + countdown)
 * 4. Player answers question
 * 5. Correct: item beeps through scanner, customer happy
 * 6. Timeout: item falls off belt, customer sad, lose a star
 */

var SupermarketCashier = (function () {

  var TIMER_SECONDS = 12;
  var MAX_STARS = 3;

  var phaserGame = null;
  var scene = null;
  var customersServed = 0;
  var customersMissed = 0;
  var gameOver = false;
  var gameEnded = false;
  var totalCustomers = 0;
  var starsRemaining = MAX_STARS;
  var starEls = [];
  var currentSubject = 'spelling';

  function el(tag, className, textContent) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (textContent !== undefined) e.textContent = textContent;
    return e;
  }

  function start(options) {
    options = options || {};
    var mode = options.mode || 'scramble';
    var questionCount = options.questionCount || 10;
    var presentation = options.presentation || 'audio-picture';
    var difficulty = options.difficulty || 'easy';
    var subject = options.subject || 'spelling';

    currentSubject = subject;

    // Map difficulty to input mode
    if (difficulty === 'hard') {
      mode = subject === 'spelling' ? 'keyboard' : 'type';
    }

    totalCustomers = questionCount;
    customersServed = 0;
    customersMissed = 0;
    gameOver = false;
    gameEnded = false;
    starsRemaining = MAX_STARS;
    starEls = [];

    var sceneEl = document.getElementById('game-scene');
    var hudContainer = document.getElementById('game-hud-container');
    var inputContainer = document.getElementById('game-input-container');

    // Build star bar in the scene area
    buildStarBar(sceneEl);

    // Build switch mode button in HUD
    buildSwitchButton(hudContainer, subject, questionCount, difficulty, presentation);

    // Initialize Phaser into the game-scene element
    var config = {
      type: Phaser.AUTO,
      parent: 'game-scene',
      width: sceneEl.clientWidth,
      height: sceneEl.clientHeight - 40, // leave room for star bar
      transparent: false,
      scene: [],
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      banner: false,
    };

    // Store init function so the scene can call it when ready
    SupermarketCashier._pendingInit = function (sceneRef) {
      scene = sceneRef;

      DualModeAdapter.init({
        subject: subject,
        containers: { hudContainer: hudContainer, inputContainer: inputContainer },
        questionCount: questionCount,
        mode: mode,
        presentation: presentation,
        showLives: false, // We use custom star bar
        wrongLosesLife: false, // We manage lives ourselves (timer-based)
        useCheckpoints: false,
        noDistractors: true, // Only show letters in the word (spelling)
        timerDuration: TIMER_SECONDS,
        callbacks: {
          onQuestionShow: handleQuestionShow,
          onCorrect: handleCorrect,
          onWrong: handleWrong,
          onTimeout: handleTimeout,
          onTimerTick: handleTimerTick,
          onComplete: handleComplete,
          // Spelling-specific (these won't fire for math)
          onLetterCorrect: handleLetterCorrect,
          onLetterWrong: handleLetterWrong,
          onWordComplete: handleWordComplete,
        },
      });
    };

    // Include the scene in the config
    config.scene = [SupermarketCashierScene];
    phaserGame = new Phaser.Game(config);
  }

  function buildStarBar(container) {
    var bar = el('div', 'sc-star-bar');
    bar.id = 'sc-star-bar';
    for (var i = 0; i < MAX_STARS; i++) {
      var star = el('span', 'sc-star', '\u2B50');
      starEls.push(star);
      bar.appendChild(star);
    }
    // Insert at top of scene
    container.insertBefore(bar, container.firstChild);
  }

  function buildSwitchButton(container, subject, questionCount, difficulty, presentation) {
    var btn = el('button', 'sc-switch-btn');
    var otherSubject = subject === 'spelling' ? 'math' : 'spelling';
    btn.textContent = 'Switch to ' + (otherSubject === 'math' ? 'Math' : 'Spelling');

    btn.addEventListener('click', function () {
      // Build URL for other subject
      var params = new URLSearchParams(window.location.search);
      params.set('subject', otherSubject);
      params.set('game', 'supermarket-cashier');
      window.location.href = 'game.html?' + params.toString();
    });

    container.appendChild(btn);
  }

  // --- Callbacks ---

  function handleQuestionShow(question, index) {
    if (gameOver) return;

    // Show a new item on conveyor belt
    if (scene) {
      scene.showItem({ display: question.display, visual: question.visual });
    }
  }

  function handleTimerTick(remaining, total) {
    if (gameOver) return;

    // Update Phaser timer bar
    if (scene) {
      scene.updateTimerBar(remaining / total);
    }
  }

  function handleLetterCorrect(letter, position) {
    // Item moves slightly closer to scanner
    if (scene) {
      scene.onLetterProgress();
    }
  }

  function handleLetterWrong(letter, position) {
    // Could shake item slightly
  }

  function handleWordComplete(question) {
    // Spelling: word completed correctly
    if (gameOver) return;
    handleSuccess(question);
  }

  function handleCorrect(question, index) {
    // Math: answer correct
    // For spelling, this is called after handleWordComplete
    if (gameOver) return;

    if (currentSubject === 'math') {
      handleSuccess(question);
    }
    // For spelling, handleWordComplete already handled it
  }

  function handleSuccess(question) {
    customersServed++;

    if (scene) {
      scene.scanItem(true, function () {
        // Success animation complete
      });
    }
  }

  function handleWrong(question, livesRemaining) {
    if (gameOver) return;
    // In timer mode, wrong answers don't immediately lose lives
    // The timer continues until timeout
  }

  function handleTimeout(question, correctAnswer, isComplete) {
    if (gameOver) return;

    customersMissed++;

    // Item falls off with animation
    if (scene) {
      scene.scanItem(false, function () {});
      scene.updateTimerBar(0);
    }

    // Flash correct answer
    showCorrectAnswer(question);

    // Lose a star
    starsRemaining--;
    if (starsRemaining >= 0 && starEls[starsRemaining]) {
      starEls[starsRemaining].classList.add('lost');
    }

    // Check game over (all stars lost)
    if (starsRemaining <= 0) {
      gameOver = true;
      gameEnded = true;
      DualModeAdapter.stopTimer();
      setTimeout(function () {
        showGameOverScreen();
      }, 2500);
      return;
    }

    // If all questions done
    if (isComplete) {
      gameEnded = true;
      setTimeout(function () {
        showVictoryScreen();
      }, 2500);
      return;
    }

    // Advance to next question after showing correct answer
    setTimeout(function () {
      DualModeAdapter.forceNextQuestion();
    }, 2500);
  }

  function handleComplete(stats) {
    if (gameOver || gameEnded) return;
    gameEnded = true;
    setTimeout(function () {
      showVictoryScreen(stats);
    }, 1500);
  }

  // --- Correct Answer Flash ---

  function showCorrectAnswer(question) {
    var sceneEl = document.getElementById('game-scene');
    var flash = el('div', 'sc-answer-flash');

    // Format answer based on subject
    if (currentSubject === 'spelling') {
      flash.textContent = question.answer.toUpperCase();
    } else {
      flash.textContent = question.answer;
    }

    sceneEl.appendChild(flash);
    setTimeout(function () { flash.remove(); }, 2200);
  }

  // --- End Screens ---

  function showVictoryScreen(stats) {
    // Victory animation in Phaser scene
    if (scene) {
      scene.showVictoryAnimation();
    }

    setTimeout(function () {
      var screen = el('div', 'sc-end-screen victory');

      var title = el('div', 'sc-end-title', 'Great Job!');
      screen.appendChild(title);

      var cartEmoji = el('div', 'sc-end-icon', '\uD83D\uDED2');
      screen.appendChild(cartEmoji);

      // Stars earned
      var starsRow = el('div', 'sc-end-stars');
      for (var i = 0; i < MAX_STARS; i++) {
        var s = el('span', '', i < starsRemaining ? '\u2B50' : '\u2606');
        starsRow.appendChild(s);
      }
      screen.appendChild(starsRow);

      var statsText = el('div', 'sc-end-stats');
      var customerWord = customersServed === 1 ? 'customer' : 'customers';
      statsText.textContent = 'You helped ' + customersServed + ' ' + customerWord + '!';
      screen.appendChild(statsText);

      // Play Again button
      var againBtn = el('button', 'sc-end-btn primary', 'Play Again!');
      againBtn.addEventListener('click', function () { window.location.reload(); });
      screen.appendChild(againBtn);

      // Home button
      var homeBtn = el('button', 'sc-end-btn secondary', 'Home');
      homeBtn.addEventListener('click', function () {
        window.location.href = currentSubject === 'spelling' ? 'spelling.html' : 'math.html';
      });
      screen.appendChild(homeBtn);

      document.body.appendChild(screen);
    }, 1500);
  }

  function showGameOverScreen() {
    var screen = el('div', 'sc-end-screen gameover');

    var title = el('div', 'sc-end-title', 'Store Closed!');
    screen.appendChild(title);

    var subtitle = el('div', 'sc-end-subtitle', 'Too many unhappy customers!');
    screen.appendChild(subtitle);

    var cartEmoji = el('div', 'sc-end-icon', '\uD83D\uDED2');
    screen.appendChild(cartEmoji);

    if (customersServed > 0) {
      var statsText = el('div', 'sc-end-stats');
      var customerWord = customersServed === 1 ? 'customer' : 'customers';
      statsText.textContent = 'You helped ' + customersServed + ' ' + customerWord + ' before the store closed!';
      screen.appendChild(statsText);
    }

    // Try Again button
    var againBtn = el('button', 'sc-end-btn primary', 'Try Again!');
    againBtn.addEventListener('click', function () { window.location.reload(); });
    screen.appendChild(againBtn);

    // Home button
    var homeBtn = el('button', 'sc-end-btn secondary', 'Home');
    homeBtn.addEventListener('click', function () {
      window.location.href = currentSubject === 'spelling' ? 'spelling.html' : 'math.html';
    });
    screen.appendChild(homeBtn);

    document.body.appendChild(screen);
  }

  function destroy() {
    gameOver = true;
    if (phaserGame) {
      phaserGame.destroy(true);
      phaserGame = null;
    }
    scene = null;
    DualModeAdapter.destroy();
  }

  return {
    start: start,
    destroy: destroy,
  };

})();
