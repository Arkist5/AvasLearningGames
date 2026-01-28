/**
 * Zoo Bedtime - Help zoo animals get to their cozy sleeping spots.
 * Uses Phaser 3 for scene visuals, SpellingGameBase for DOM input/HUD.
 *
 * Flow per word:
 * 1. Animal appears outside habitat gate
 * 2. Word is shown (emoji + spoken), player spells letter by letter
 * 3. Each correct letter lights up a star on the gate
 * 4. Complete word: gate opens, animal enters, celebration
 * 5. Transition to next animal/habitat
 */

var ZooBedtime = (function () {

  var TIMER_SECONDS = 15;
  var MAX_LIVES = 3;

  // Animal definitions with habitat themes
  var ANIMALS = [
    { id: 'lion', emoji: '🦁', habitat: 'savanna', bgColor: 0xD4A574, groundColor: 0xC4956A },
    { id: 'penguin', emoji: '🐧', habitat: 'ice', bgColor: 0xA8D8EA, groundColor: 0xE8F4F8 },
    { id: 'monkey', emoji: '🐵', habitat: 'jungle', bgColor: 0x7CB342, groundColor: 0x558B2F },
    { id: 'bear', emoji: '🐻', habitat: 'forest', bgColor: 0x8D6E63, groundColor: 0x5D4037 },
    { id: 'elephant', emoji: '🐘', habitat: 'watering-hole', bgColor: 0x90CAF9, groundColor: 0xBCAAA4 },
    { id: 'giraffe', emoji: '🦒', habitat: 'tall-trees', bgColor: 0xFFF59D, groundColor: 0xAED581 },
    { id: 'panda', emoji: '🐼', habitat: 'bamboo', bgColor: 0xC5E1A5, groundColor: 0x9CCC65 },
    { id: 'fish', emoji: '🐟', habitat: 'aquarium', bgColor: 0x4FC3F7, groundColor: 0x0288D1 },
  ];

  var phaserGame = null;
  var scene = null;
  var animalsCompleted = 0;
  var animalsFailed = 0;
  var gameOver = false;
  var gameEnded = false;
  var totalAnimals = 0;
  var starsRemaining = MAX_LIVES;
  var starEls = [];
  var currentWordLength = 0;
  var timed = true;
  var usedAnimals = [];
  var currentAnimalIndex = 0;

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
    timed = options.timed !== undefined ? options.timed : true;

    // Map difficulty to input mode
    if (difficulty === 'hard') mode = 'keyboard';

    totalAnimals = questionCount;
    animalsCompleted = 0;
    animalsFailed = 0;
    gameOver = false;
    gameEnded = false;
    starsRemaining = MAX_LIVES;
    starEls = [];
    currentWordLength = 0;
    usedAnimals = [];
    currentAnimalIndex = 0;

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
    ZooBedtime._pendingInit = function (sceneRef) {
      scene = sceneRef;

      // Show/hide timer bar based on mode
      if (timed) {
        scene.showTimerBar();
      } else {
        scene.hideTimerBar();
      }

      SpellingGameBase.init({ hudContainer: hudContainer, inputContainer: inputContainer }, {
        questionCount: questionCount,
        mode: mode,
        presentation: presentation,
        showLives: false,       // Custom star bar
        wrongLosesLife: false,  // We manage lives ourselves
        useCheckpoints: false,
        noDistractors: true,    // Only show letters in the word
        timerDuration: timed ? TIMER_SECONDS : null,
        onCorrect: handleCorrect,
        onWrong: handleWrong,
        onComplete: handleComplete,
        onQuestionShow: handleQuestionShow,
        onTimeout: handleTimeout,
        onTimerTick: handleTimerTick,
        onLetterCorrect: handleLetterCorrect,
        onLetterWrong: handleLetterWrong,
        onWordComplete: handleWordComplete,
      });
    };

    config.scene = [ZooScene];
    phaserGame = new Phaser.Game(config);
  }

  function buildStarBar(container) {
    var bar = el('div', 'zoo-star-bar');
    bar.id = 'zoo-star-bar';
    for (var i = 0; i < MAX_LIVES; i++) {
      var star = el('span', 'zoo-star', '⭐');
      starEls.push(star);
      bar.appendChild(star);
    }
    container.insertBefore(bar, container.firstChild);
  }

  // Get a random animal, cycling through all before repeating
  function getNextAnimal() {
    if (usedAnimals.length >= ANIMALS.length) {
      usedAnimals = []; // Reset pool
    }
    var available = ANIMALS.filter(function (a) {
      return usedAnimals.indexOf(a.id) === -1;
    });
    var idx = Math.floor(Math.random() * available.length);
    var animal = available[idx];
    usedAnimals.push(animal.id);
    return animal;
  }

  // --- Callbacks ---

  function handleQuestionShow(question, index) {
    if (gameOver) return;
    currentWordLength = question.word.length;
    currentAnimalIndex++;

    var animal = getNextAnimal();

    if (scene) {
      scene.showAnimal(animal, currentWordLength);
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

    if (scene) {
      scene.lightStar(position);
      scene.animalReact('happy');
    }

    // Play chime sound for correct letter
    if (typeof AudioManager !== 'undefined') {
      AudioManager.playSfx('chime');
    }
  }

  function handleLetterWrong(letter, position) {
    if (gameOver) return;

    if (scene) {
      scene.shakeGate();
      scene.animalReact('worried');
    }

    // Play wrong sound
    if (typeof AudioManager !== 'undefined') {
      AudioManager.playSfx('wrong');
    }

    // In relaxed mode, wrong letters lose a star
    if (!timed) {
      loseStar();
    }
  }

  function handleWordComplete(question) {
    if (gameOver) return;

    animalsCompleted++;

    if (scene) {
      scene.openGate(function () {
        // Gate animation done
      });
    }

    // Play celebration sounds
    if (typeof AudioManager !== 'undefined') {
      AudioManager.playSfx('chime');
      AudioManager.playSfx('yay');
    }
  }

  function handleCorrect(question, index) {
    // Handled by handleWordComplete
  }

  function handleWrong(question, livesRemaining) {
    if (gameOver) return;
    // Life management is handled in handleLetterWrong and handleTimeout
  }

  function handleTimeout(question, correctAnswer, isComplete) {
    if (gameOver) return;

    animalsFailed++;

    if (scene) {
      scene.showSadAnimal(function () {});
      scene.updateTimerBar(0);
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
      SpellingGameBase.forceNextQuestion();
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
      SpellingGameBase.stopTimer();
      setTimeout(function () {
        showGameOverScreen();
      }, 2500);
    }
  }

  // --- Correct Spelling Flash ---

  function showCorrectSpelling(question) {
    var sceneEl = document.getElementById('game-scene');
    var flash = el('div', 'zoo-answer-flash');
    flash.textContent = question.word.toUpperCase();
    sceneEl.appendChild(flash);
    setTimeout(function () { flash.remove(); }, 2200);
  }

  // --- End Screens ---

  function showVictoryScreen(stats) {
    var screen = el('div', 'zoo-end-screen victory');

    var title = el('div', 'zoo-end-title', '🌙 All Tucked In! 🌙');
    screen.appendChild(title);

    var emoji = el('div', 'zoo-end-emoji', '😴');
    screen.appendChild(emoji);

    // Stars earned
    var starsRow = el('div', 'zoo-end-stars');
    for (var i = 0; i < MAX_LIVES; i++) {
      var s = el('span', '', i < starsRemaining ? '⭐' : '☆');
      starsRow.appendChild(s);
    }
    screen.appendChild(starsRow);

    var statsText = el('div', 'zoo-end-stats');
    var animalWord = animalsCompleted === 1 ? 'animal' : 'animals';
    statsText.textContent = 'You helped ' + animalsCompleted + ' ' + animalWord + ' get to bed!';
    screen.appendChild(statsText);

    // Play Again
    var againBtn = el('button', 'zoo-end-btn primary', 'Play Again!');
    againBtn.addEventListener('click', function () { window.location.reload(); });
    screen.appendChild(againBtn);

    // Home
    var homeBtn = el('button', 'zoo-end-btn secondary', 'Home');
    homeBtn.addEventListener('click', function () {
      window.location.href = 'spelling.html';
    });
    screen.appendChild(homeBtn);

    document.body.appendChild(screen);
  }

  function showGameOverScreen() {
    var screen = el('div', 'zoo-end-screen gameover');

    var title = el('div', 'zoo-end-title', '😴 Sleepy Time Over 😴');
    screen.appendChild(title);

    var subtitle = el('div', 'zoo-end-subtitle', 'The animals are getting restless!');
    screen.appendChild(subtitle);

    var emoji = el('div', 'zoo-end-emoji', '🌙');
    screen.appendChild(emoji);

    if (animalsCompleted > 0) {
      var statsText = el('div', 'zoo-end-stats');
      var animalWord = animalsCompleted === 1 ? 'animal' : 'animals';
      statsText.textContent = 'You helped ' + animalsCompleted + ' ' + animalWord + ' before bedtime ended!';
      screen.appendChild(statsText);
    }

    // Try Again
    var againBtn = el('button', 'zoo-end-btn primary', 'Try Again!');
    againBtn.addEventListener('click', function () { window.location.reload(); });
    screen.appendChild(againBtn);

    // Home
    var homeBtn = el('button', 'zoo-end-btn secondary', 'Home');
    homeBtn.addEventListener('click', function () {
      window.location.href = 'spelling.html';
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
    SpellingGameBase.destroy();
  }

  return {
    start: start,
    destroy: destroy,
  };

})();
