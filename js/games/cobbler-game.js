/**
 * Cobbler's Workshop - Build shoes by answering questions correctly.
 * Works with BOTH math and spelling modes via DualModeAdapter.
 * Uses Phaser 3 for scene visuals, DualModeAdapter for unified input/HUD.
 *
 * Flow per question:
 * 1. Order scroll slides in with emoji/equation prompt
 * 2. Question appears, empty shoe outline on workbench
 * 3. Player answers using appropriate input mode
 * 4. Each correct letter → shoe part animates onto workbench
 * 5. Correct: shoe sparkles, floats to display shelf
 * 6. Timeout/fail: shoe crumbles, lose a star
 */

var CobblersWorkshop = (function () {

  var TIMER_SECONDS = 15;
  var MAX_LIVES = 3;
  var SHOE_PARTS = ['sole', 'upper', 'tongue', 'laces', 'buckle'];

  var phaserGame = null;
  var scene = null;
  var shoesCompleted = 0;
  var shoesFailed = 0;
  var gameOver = false;
  var gameEnded = false;
  var totalShoes = 0;
  var starsRemaining = MAX_LIVES;
  var starEls = [];
  var currentWordLength = 0;
  var timed = true;
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
    timed = options.timed !== undefined ? options.timed : true;

    currentSubject = subject;

    // Map difficulty to input mode
    if (difficulty === 'hard') {
      mode = subject === 'spelling' ? 'keyboard' : 'type';
    }

    totalShoes = questionCount;
    shoesCompleted = 0;
    shoesFailed = 0;
    gameOver = false;
    gameEnded = false;
    starsRemaining = MAX_LIVES;
    starEls = [];
    currentWordLength = 0;

    var sceneEl = document.getElementById('game-scene');
    var hudContainer = document.getElementById('game-hud-container');
    var inputContainer = document.getElementById('game-input-container');

    // Build star bar in the scene area
    buildStarBar(sceneEl);

    // Initialize Phaser
    var config = {
      type: Phaser.AUTO,
      parent: 'game-scene',
      width: sceneEl.clientWidth,
      height: sceneEl.clientHeight - 40, // room for star bar
      transparent: false,
      scene: [],
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      banner: false,
    };

    // Store init function so scene can call when ready
    CobblersWorkshop._pendingInit = function (sceneRef) {
      scene = sceneRef;

      // Show/hide timer bar based on mode
      if (timed) {
        scene.showTimerBar();
      } else {
        scene.hideTimerBar();
      }

      DualModeAdapter.init({
        subject: subject,
        containers: { hudContainer: hudContainer, inputContainer: inputContainer },
        questionCount: questionCount,
        mode: mode,
        presentation: presentation,
        showLives: false,       // Custom star bar
        wrongLosesLife: false,  // We manage lives ourselves
        useCheckpoints: false,
        noDistractors: true,
        timerDuration: timed ? TIMER_SECONDS : null,
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

    config.scene = [CobblersScene];
    phaserGame = new Phaser.Game(config);
  }

  function buildStarBar(container) {
    var bar = el('div', 'cw-star-bar');
    bar.id = 'cw-star-bar';
    for (var i = 0; i < MAX_LIVES; i++) {
      var star = el('span', 'cw-star', '⭐');
      starEls.push(star);
      bar.appendChild(star);
    }
    container.insertBefore(bar, container.firstChild);
  }

  // --- Shoe Part Threshold ---

  function getPartIndex(letterPosition, wordLength) {
    var ratio = (letterPosition + 1) / wordLength;
    return Math.min(Math.floor(ratio * SHOE_PARTS.length), SHOE_PARTS.length - 1);
  }

  // --- Callbacks ---

  function handleQuestionShow(question, index) {
    if (gameOver) return;
    currentWordLength = String(question.display).length;

    if (scene) {
      scene.showOrder({ word: question.display, emoji: question.visual });
      scene.showNewCustomer();
      scene.elfReset();
      scene.elfIdle();
    }
  }

  function handleTimerTick(remaining, total) {
    if (gameOver) return;
    if (scene && timed) {
      scene.updateTimerBar(remaining / total);
    }
  }

  function handleLetterCorrect(letter, position) {
    if (gameOver) return;

    var partIndex = getPartIndex(position, currentWordLength);

    if (scene) {
      scene.addShoePart(partIndex, SHOE_PARTS.length);
      scene.elfTapHammer();
      scene.customerReact('happy');
    }

    // Play hammer tap sound
    if (typeof AudioManager !== 'undefined') {
      AudioManager.playSfx('hammer_tap');
    }
  }

  function handleLetterWrong(letter, position) {
    if (gameOver) return;

    if (scene) {
      scene.playSillyReaction();
      scene.shakeWorkbench();
      scene.elfScratchHead();
      scene.customerReact('worried');
    }

    // Play wrong buzzer sound
    if (typeof AudioManager !== 'undefined') {
      AudioManager.playSfx('wrong');
    }

    // In relaxed mode, wrong letters lose a star
    if (!timed) {
      loseStar();
    }
  }

  function handleWordComplete(question) {
    // Spelling: word completed correctly
    if (gameOver) return;
    handleShoeComplete();
  }

  function handleCorrect(question, index) {
    // Math: answer correct (for spelling, handleWordComplete handles it)
    if (gameOver) return;
    if (currentSubject === 'math') {
      handleShoeComplete();
    }
  }

  function handleShoeComplete() {
    shoesCompleted++;

    if (scene) {
      scene.elfVictoryDance();
      scene.customerExit(true);
      scene.completeShoeToShelf(shoesCompleted, totalShoes, function () {
        // Shelf animation done
      });
    }

    // Play completion sounds
    if (typeof AudioManager !== 'undefined') {
      AudioManager.playSfx('chime');
      AudioManager.playSfx('yay');
    }
  }

  function handleWrong(question, livesRemaining) {
    if (gameOver) return;
    // Life management is handled in handleLetterWrong and handleTimeout
  }

  function handleTimeout(question, correctAnswer, isComplete) {
    if (gameOver) return;

    shoesFailed++;

    if (scene) {
      scene.elfSad();
      scene.customerExit(false);
      scene.failShoe(function () {});
      scene.updateTimerBar(0);
    }

    // Play crumble sound
    if (typeof AudioManager !== 'undefined') {
      AudioManager.playSfx('crumble');
    }

    // Flash correct spelling
    showCorrectSpelling(question);

    // Lose a star (may trigger game over internally)
    loseStar();

    // If loseStar triggered game over, stop here
    if (gameOver) return;

    // If all questions done
    if (isComplete) {
      gameEnded = true;
      setTimeout(function () {
        showVictoryScreen();
      }, 2500);
      return;
    }

    // Advance to next question
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

  // --- Star Management ---

  function loseStar() {
    starsRemaining--;
    if (starsRemaining >= 0 && starEls[starsRemaining]) {
      starEls[starsRemaining].classList.add('lost');
    }

    if (starsRemaining <= 0 && !gameOver) {
      gameOver = true;
      gameEnded = true;
      DualModeAdapter.stopTimer();
      setTimeout(function () {
        showGameOverScreen();
      }, 2500);
    }
  }

  // --- Correct Answer Flash ---

  function showCorrectSpelling(question) {
    var sceneEl = document.getElementById('game-scene');
    var flash = el('div', 'cw-answer-flash');

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
    if (scene) {
      scene.showVictoryPan();
    }

    setTimeout(function () {
      var screen = el('div', 'cw-end-screen victory');

      var title = el('div', 'cw-end-title', 'Amazing Craftsmanship!');
      screen.appendChild(title);

      var emoji = el('div', 'cw-end-emoji', '👞');
      screen.appendChild(emoji);

      // Stars earned
      var starsRow = el('div', 'cw-end-stars');
      for (var i = 0; i < MAX_LIVES; i++) {
        var s = el('span', '', i < starsRemaining ? '⭐' : '☆');
        starsRow.appendChild(s);
      }
      screen.appendChild(starsRow);

      var statsText = el('div', 'cw-end-stats');
      var shoeWord = shoesCompleted === 1 ? 'shoe' : 'shoes';
      statsText.textContent = 'You crafted ' + shoesCompleted + ' ' + shoeWord + '!';
      screen.appendChild(statsText);

      // Play Again
      var againBtn = el('button', 'cw-end-btn primary', 'Play Again!');
      againBtn.addEventListener('click', function () { window.location.reload(); });
      screen.appendChild(againBtn);

      // Home
      var homeBtn = el('button', 'cw-end-btn secondary', 'Home');
      homeBtn.addEventListener('click', function () {
        window.location.href = currentSubject === 'spelling' ? 'spelling.html' : 'math.html';
      });
      screen.appendChild(homeBtn);

      document.body.appendChild(screen);
    }, 1500);
  }

  function showGameOverScreen() {
    var screen = el('div', 'cw-end-screen gameover');

    var title = el('div', 'cw-end-title', 'Workshop Closed!');
    screen.appendChild(title);

    var subtitle = el('div', 'cw-end-subtitle', 'Too many mistakes!');
    screen.appendChild(subtitle);

    var emoji = el('div', 'cw-end-emoji', '🔨');
    screen.appendChild(emoji);

    if (shoesCompleted > 0) {
      var statsText = el('div', 'cw-end-stats');
      var shoeWord = shoesCompleted === 1 ? 'shoe' : 'shoes';
      statsText.textContent = 'You crafted ' + shoesCompleted + ' ' + shoeWord + ' before the workshop closed!';
      screen.appendChild(statsText);
    }

    // Try Again
    var againBtn = el('button', 'cw-end-btn primary', 'Try Again!');
    againBtn.addEventListener('click', function () { window.location.reload(); });
    screen.appendChild(againBtn);

    // Home
    var homeBtn = el('button', 'cw-end-btn secondary', 'Home');
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
