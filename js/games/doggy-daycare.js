/**
 * Doggy Daycare - Help dogs at the daycare by answering questions!
 * Dual-mode game supporting both spelling and math via DualModeAdapter.
 *
 * Uses Phaser 3 for scene visuals, DualModeAdapter for unified input/HUD.
 *
 * Flow per question:
 * 1. Dog approaches doing potty dance
 * 2. Speech bubble shows emoji (spelling) or math problem (math)
 * 3. Timer starts (dog's dance gets more frantic)
 * 4. Player answers the question
 * 5. Correct: dog gets treat, hearts float, dog exits happy
 * 6. Timeout: dog has accident (poop!), dog exits angry, lose a paw
 */

var DoggyDaycare = (function () {

  var TIMER_SECONDS = 12;
  var MAX_PAWS = 3;

  var phaserGame = null;
  var scene = null;
  var dogsHelped = 0;
  var dogsMissed = 0;
  var gameOver = false;
  var gameEnded = false;
  var totalDogs = 0;
  var pawsRemaining = MAX_PAWS;
  var pawEls = [];
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

    // Map difficulty to input mode
    if (difficulty === 'hard') {
      mode = subject === 'spelling' ? 'keyboard' : 'type';
    }

    totalDogs = questionCount;
    dogsHelped = 0;
    dogsMissed = 0;
    gameOver = false;
    gameEnded = false;
    pawsRemaining = MAX_PAWS;
    pawEls = [];
    currentSubject = subject;

    var sceneEl = document.getElementById('game-scene');
    var hudContainer = document.getElementById('game-hud-container');
    var inputContainer = document.getElementById('game-input-container');

    // Build paw print bar in the scene area
    buildPawBar(sceneEl);

    // Initialize Phaser into the game-scene element
    var config = {
      type: Phaser.AUTO,
      parent: 'game-scene',
      width: sceneEl.clientWidth,
      height: sceneEl.clientHeight - 40, // leave room for paw bar
      transparent: false,
      scene: [],
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      banner: false,
    };

    // Store init function so the scene can call it when ready
    DoggyDaycare._pendingInit = function (sceneRef) {
      scene = sceneRef;

      DualModeAdapter.init({
        subject: subject,
        containers: { hudContainer: hudContainer, inputContainer: inputContainer },
        questionCount: questionCount,
        mode: mode,
        presentation: presentation,
        showLives: false, // We use custom paw bar
        wrongLosesLife: false, // We manage lives ourselves (timer-based)
        useCheckpoints: false,
        noDistractors: subject === 'spelling', // Only for spelling - show letters in word only
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

    // Include the scene in the config
    config.scene = [DoggyDaycareScene];
    phaserGame = new Phaser.Game(config);
  }

  function buildPawBar(container) {
    var bar = el('div', 'dd-paw-bar');
    bar.id = 'dd-paw-bar';
    for (var i = 0; i < MAX_PAWS; i++) {
      var paw = el('span', 'dd-paw', '\uD83D\uDC3E');
      pawEls.push(paw);
      bar.appendChild(paw);
    }
    // Insert at top of scene
    container.insertBefore(bar, container.firstChild);
  }

  // --- Callbacks ---

  function handleQuestionShow(question, index) {
    if (gameOver) return;

    // Show a new dog with speech bubble
    if (scene) {
      scene.showNewDog({ display: question.display, visual: question.visual });
    }
  }

  function handleTimerTick(remaining, total) {
    if (gameOver) return;

    // Update Phaser timer bar (which also updates potty dance intensity)
    if (scene) {
      scene.updateTimerBar(remaining / total);
    }
  }

  function handleLetterCorrect(letter, position) {
    // Dog gets slightly happier
    if (scene) {
      scene.onLetterCorrect();
    }
  }

  function handleLetterWrong(letter, position) {
    // Play wrong sound on incorrect letter
    AudioManager.play('wrong');
  }

  function handleWordComplete(question) {
    // Spelling: word completed correctly
    if (gameOver) return;
    handleSuccess(question);
  }

  function handleCorrect(question, index) {
    // For spelling, handleWordComplete already handled success
    // For math, this is the only success callback
    if (gameOver) return;
    if (currentSubject === 'math') {
      handleSuccess(question);
    }
  }

  function handleSuccess(question) {
    dogsHelped++;

    // Stop timer immediately to prevent timeout during animation
    DualModeAdapter.stopTimer();

    // Play success sound
    AudioManager.play('yay');

    if (scene) {
      scene.dogSuccess(function () {
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

    dogsMissed++;

    // Play oops sound for accident
    AudioManager.play('oops');

    // Dog has accident!
    if (scene) {
      scene.dogAccident(function () {});
      scene.updateTimerBar(0);
    }

    // Flash correct answer
    showCorrectAnswer(question);

    // Lose a paw
    pawsRemaining--;
    if (pawsRemaining >= 0 && pawEls[pawsRemaining]) {
      pawEls[pawsRemaining].classList.add('lost');
    }

    // Check game over (all paws lost)
    if (pawsRemaining <= 0) {
      gameOver = true;
      gameEnded = true;
      DualModeAdapter.stopTimer();
      setTimeout(function () {
        showGameOverScreen();
      }, 3000);
      return;
    }

    // If all questions done
    if (isComplete) {
      gameEnded = true;
      setTimeout(function () {
        showVictoryScreen();
      }, 3000);
      return;
    }

    // Advance to next question after showing correct answer
    setTimeout(function () {
      DualModeAdapter.forceNextQuestion();
    }, 3000);
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
    var flash = el('div', 'dd-answer-flash');
    // Handle both string (spelling) and number (math) answers
    var answerText = String(question.answer);
    flash.textContent = currentSubject === 'spelling' ? answerText.toUpperCase() : answerText;

    sceneEl.appendChild(flash);
    setTimeout(function () { flash.remove(); }, 2500);
  }

  // --- End Screens ---

  function showVictoryScreen(stats) {
    // Play hooray sound for victory!
    AudioManager.play('hooray');

    // Victory animation in Phaser scene
    if (scene) {
      scene.showVictoryAnimation();
    }

    setTimeout(function () {
      var screen = el('div', 'dd-end-screen victory');

      var title = el('div', 'dd-end-title', 'Best Daycare Ever!');
      screen.appendChild(title);

      var dogEmoji = el('div', 'dd-end-icon', '\uD83D\uDC36');
      screen.appendChild(dogEmoji);

      // Paws earned
      var pawsRow = el('div', 'dd-end-paws');
      for (var i = 0; i < MAX_PAWS; i++) {
        var p = el('span', '', i < pawsRemaining ? '\uD83D\uDC3E' : '\u2B50');
        if (i >= pawsRemaining) p.style.opacity = '0.3';
        pawsRow.appendChild(p);
      }
      screen.appendChild(pawsRow);

      var statsText = el('div', 'dd-end-stats');
      var pupWord = dogsHelped === 1 ? 'pup' : 'pups';
      statsText.textContent = 'You helped ' + dogsHelped + ' happy ' + pupWord + '!';
      screen.appendChild(statsText);

      // Play Again button
      var againBtn = el('button', 'dd-end-btn primary', 'Play Again!');
      againBtn.addEventListener('click', function () { window.location.reload(); });
      screen.appendChild(againBtn);

      // Home button
      var homeBtn = el('button', 'dd-end-btn secondary', 'Home');
      homeBtn.addEventListener('click', function () {
        window.location.href = 'games.html?subject=' + currentSubject;
      });
      screen.appendChild(homeBtn);

      document.body.appendChild(screen);
    }, 1500);
  }

  function showGameOverScreen() {
    // Play oh_no sound for game over
    AudioManager.play('oh_no');

    var screen = el('div', 'dd-end-screen gameover');

    var title = el('div', 'dd-end-title', 'Daycare Closed!');
    screen.appendChild(title);

    var subtitle = el('div', 'dd-end-subtitle', 'Too many accidents!');
    screen.appendChild(subtitle);

    var dogEmoji = el('div', 'dd-end-icon', '\uD83D\uDC36');
    screen.appendChild(dogEmoji);

    if (dogsHelped > 0) {
      var statsText = el('div', 'dd-end-stats');
      var pupWord = dogsHelped === 1 ? 'pup' : 'pups';
      statsText.textContent = 'You helped ' + dogsHelped + ' happy ' + pupWord + ' before closing!';
      screen.appendChild(statsText);
    }

    // Try Again button
    var againBtn = el('button', 'dd-end-btn primary', 'Try Again!');
    againBtn.addEventListener('click', function () { window.location.reload(); });
    screen.appendChild(againBtn);

    // Home button
    var homeBtn = el('button', 'dd-end-btn secondary', 'Home');
    homeBtn.addEventListener('click', function () {
      window.location.href = 'games.html?subject=' + currentSubject;
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
