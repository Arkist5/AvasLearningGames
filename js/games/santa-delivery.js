/**
 * Santa's Present Delivery - Deliver presents to houses by answering questions.
 * Works with BOTH math and spelling modes via DualModeAdapter.
 * Uses Phaser 3 for scene visuals, DualModeAdapter for unified input/HUD.
 *
 * Flow per question:
 * 1. House scrolls in from right
 * 2. Question appears (math equation or spelling word)
 * 3. Timer starts (visual bar in Phaser + countdown)
 * 4. Player answers question
 * 5. Correct: present drops into chimney, house lights up
 * 6. Timeout: present misses, house stays dark, lose a life
 */

var SantaDelivery = (function () {

  var TIMER_SECONDS = 12;
  var MAX_LIVES = 3;

  var phaserGame = null;
  var scene = null;
  var housesDelivered = 0;
  var housesMissed = 0;
  var gameOver = false;
  var gameEnded = false;
  var totalHouses = 0;
  var starsRemaining = MAX_LIVES;
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
    var subject = options.subject || 'spelling';
    var mode = options.mode || (subject === 'spelling' ? 'scramble' : 'choice');
    var questionCount = options.questionCount || 10;
    var presentation = options.presentation || 'audio-picture';
    var difficulty = options.difficulty || 'easy';

    currentSubject = subject;

    // Map difficulty to input mode
    if (difficulty === 'hard') {
      mode = subject === 'spelling' ? 'keyboard' : 'type';
    }

    totalHouses = questionCount;
    housesDelivered = 0;
    housesMissed = 0;
    gameOver = false;
    gameEnded = false;
    starsRemaining = MAX_LIVES;
    starEls = [];

    var sceneEl = document.getElementById('game-scene');
    var hudContainer = document.getElementById('game-hud-container');
    var inputContainer = document.getElementById('game-input-container');

    // Build star bar in the scene area
    buildStarBar(sceneEl);

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
    SantaDelivery._pendingInit = function (sceneRef) {
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
        noDistractors: true,
        timerDuration: TIMER_SECONDS,
        callbacks: {
          onQuestionShow: handleQuestionShow,
          onCorrect: handleCorrect,
          onWrong: handleWrong,
          onTimeout: handleTimeout,
          onTimerTick: handleTimerTick,
          onComplete: handleComplete,
          onLetterCorrect: handleLetterCorrect,
          onLetterWrong: handleLetterWrong,
          onWordComplete: handleWordComplete,
        },
      });
    };

    // Include the scene in the config so it starts with the game
    config.scene = [SantaScene];
    phaserGame = new Phaser.Game(config);
  }

  function buildStarBar(container) {
    var bar = el('div', 'sd-star-bar');
    bar.id = 'sd-star-bar';
    for (var i = 0; i < MAX_LIVES; i++) {
      var star = el('span', 'sd-star', '⭐');
      starEls.push(star);
      bar.appendChild(star);
    }
    // Insert at top of scene
    container.insertBefore(bar, container.firstChild);
  }

  // --- Callbacks ---

  function handleQuestionShow(question, index) {
    if (gameOver) return;

    // Show a new house in the Phaser scene
    if (scene) {
      scene.scrollHouseOut(function () {
        scene.showHouse({ word: question.display, emoji: question.visual });
      });
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
    // Could add small visual feedback in scene
  }

  function handleLetterWrong(letter, position) {
    // Wrong letter - small shake on scene
  }

  function handleWordComplete(question) {
    // Spelling: word completed correctly
    if (gameOver) return;
    handleDeliverySuccess();
  }

  function handleCorrect(question, index) {
    // Math: answer correct (for spelling, handleWordComplete handles it)
    if (gameOver) return;
    if (currentSubject === 'math') {
      handleDeliverySuccess();
    }
  }

  function handleDeliverySuccess() {
    housesDelivered++;

    if (scene) {
      scene.dropPresent(true, function () {
        // House lights up (already handled in dropPresent)
      });
    }
  }

  function handleWrong(question, livesRemaining) {
    if (gameOver) return;
    // In timer mode, wrong letters don't lose lives - only timeouts do
  }

  function handleTimeout(question, correctAnswer, isComplete) {
    if (gameOver) return;

    housesMissed++;

    // Present drops and misses
    if (scene) {
      scene.dropPresent(false, function () {});
      scene.updateTimerBar(0);
    }

    // Flash correct spelling
    showCorrectSpelling(question);

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

  function showCorrectSpelling(question) {
    var sceneEl = document.getElementById('game-scene');
    var flash = el('div', 'sd-answer-flash');

    if (currentSubject === 'spelling') {
      flash.textContent = String(question.answer).toUpperCase();
    } else {
      flash.textContent = question.answer;
    }

    sceneEl.appendChild(flash);
    setTimeout(function () { flash.remove(); }, 2200);
  }

  // --- End Screens ---

  function showVictoryScreen(stats) {
    // Fireworks in Phaser scene
    if (scene) {
      scene.showVictoryFireworks();
    }

    setTimeout(function () {
      var screen = el('div', 'sd-end-screen victory');

      var title = el('div', 'sd-end-title', 'Great Delivery!');
      screen.appendChild(title);

      var santaEmoji = el('div', 'sd-end-santa', '🎅');
      screen.appendChild(santaEmoji);

      // Stars earned
      var starsRow = el('div', 'sd-end-stars');
      for (var i = 0; i < MAX_LIVES; i++) {
        var s = el('span', '', i < starsRemaining ? '⭐' : '☆');
        starsRow.appendChild(s);
      }
      screen.appendChild(starsRow);

      var statsText = el('div', 'sd-end-stats');
      var houseWord = housesDelivered === 1 ? 'house' : 'houses';
      statsText.textContent = 'You delivered presents to ' + housesDelivered + ' ' + houseWord + '!';
      screen.appendChild(statsText);

      // Play Again button
      var againBtn = el('button', 'sd-end-btn primary', 'Play Again!');
      againBtn.addEventListener('click', function () { window.location.reload(); });
      screen.appendChild(againBtn);

      // Home button
      var homeBtn = el('button', 'sd-end-btn secondary', 'Home');
      homeBtn.addEventListener('click', function () {
        window.location.href = currentSubject === 'spelling' ? 'spelling.html' : 'math.html';
      });
      screen.appendChild(homeBtn);

      document.body.appendChild(screen);
    }, 1500);
  }

  function showGameOverScreen() {
    var screen = el('div', 'sd-end-screen gameover');

    var title = el('div', 'sd-end-title', 'Oh no!');
    screen.appendChild(title);

    var subtitle = el('div', 'sd-end-subtitle', 'Too many missed deliveries!');
    screen.appendChild(subtitle);

    var santaEmoji = el('div', 'sd-end-santa', '🎅');
    screen.appendChild(santaEmoji);

    if (housesDelivered > 0) {
      var statsText = el('div', 'sd-end-stats');
      var houseWord = housesDelivered === 1 ? 'house' : 'houses';
      statsText.textContent = 'You delivered to ' + housesDelivered + ' ' + houseWord + ' before running out of stars!';
      screen.appendChild(statsText);
    }

    // Try Again button
    var againBtn = el('button', 'sd-end-btn primary', 'Try Again!');
    againBtn.addEventListener('click', function () { window.location.reload(); });
    screen.appendChild(againBtn);

    // Home button
    var homeBtn = el('button', 'sd-end-btn secondary', 'Home');
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
