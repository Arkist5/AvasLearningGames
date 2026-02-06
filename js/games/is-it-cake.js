/**
 * Is It Cake? - Based on the Netflix show Ava loves!
 * 3 items on display, one is secretly cake. Answer questions to earn slices!
 *
 * Uses Phaser 3 for scene visuals, DualModeAdapter for unified input/HUD.
 *
 * Flow per round:
 * 1. Three items appear on pedestals (one is secretly cake)
 * 2. Question appears (math or spelling, 12s timer)
 * 3. Correct answer -> items become tappable, "Which one is cake?"
 * 4. Ava taps an item -> knife slice animation
 *    - CAKE: item splits, layers revealed, sprinkles, confetti, +points
 *    - NOT CAKE: knife bounces, sparks, item eliminated
 * 5. Timeout -> lose a life (cake slice), same round continues
 * 6. Two items eliminated -> last auto-revealed as cake
 * 7. Game ends when all questions answered OR all 3 lives lost
 */

var IsItCake = (function () {

  var TIMER_SECONDS = 12;
  var MAX_LIVES = 3;

  // 16 items in the pool
  var ITEM_POOL = [
    { name: 'Sneaker', emoji: '\uD83D\uDC5F' },
    { name: 'Backpack', emoji: '\uD83C\uDF92' },
    { name: 'Burger', emoji: '\uD83C\uDF54' },
    { name: 'Basketball', emoji: '\uD83C\uDFC0' },
    { name: 'Teddy Bear', emoji: '\uD83E\uDDF8' },
    { name: 'Taco', emoji: '\uD83C\uDF2E' },
    { name: 'Pizza', emoji: '\uD83C\uDF55' },
    { name: 'Top Hat', emoji: '\uD83C\uDFA9' },
    { name: 'Rubber Duck', emoji: '\uD83E\uDD86' },
    { name: 'Phone', emoji: '\uD83D\uDCF1' },
    { name: 'Guitar', emoji: '\uD83C\uDFB8' },
    { name: 'Diamond', emoji: '\uD83D\uDC8E' },
    { name: 'Cactus', emoji: '\uD83C\uDF35' },
    { name: 'Magnet', emoji: '\uD83E\uDDF2' },
    { name: 'Tent', emoji: '\u26FA' },
    { name: 'Squid', emoji: '\uD83E\uDD91' },
  ];

  var phaserGame = null;
  var scene = null;
  var livesRemaining = MAX_LIVES;
  var lifeEls = [];
  var gameOver = false;
  var gameEnded = false;
  var currentSubject = 'math';
  var score = 0;
  var cakesFound = 0;
  var totalRounds = 0;

  // Round state
  var roundItems = [];        // [{name, emoji, isCake, eliminated}]
  var needNewRound = true;    // Generate new items on next onQuestionShow
  var pickingMode = false;    // Waiting for Ava to tap an item
  var slicesUsedThisRound = 0;
  var usedItemNames = [];     // Track used items to avoid repeats

  function el(tag, className, textContent) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (textContent !== undefined) e.textContent = textContent;
    return e;
  }

  function start(options) {
    options = options || {};
    var subject = options.subject || 'math';
    var mode = options.mode || (subject === 'spelling' ? 'scramble' : 'choice');
    var questionCount = options.questionCount || 10;
    var presentation = options.presentation || 'audio-picture';
    var difficulty = options.difficulty || 'easy';

    if (difficulty === 'hard') {
      mode = subject === 'spelling' ? 'keyboard' : 'type';
    }

    // Reset state
    livesRemaining = MAX_LIVES;
    lifeEls = [];
    gameOver = false;
    gameEnded = false;
    currentSubject = subject;
    score = 0;
    cakesFound = 0;
    totalRounds = 0;
    roundItems = [];
    needNewRound = true;
    pickingMode = false;
    slicesUsedThisRound = 0;
    usedItemNames = [];

    var sceneEl = document.getElementById('game-scene');
    var hudContainer = document.getElementById('game-hud-container');
    var inputContainer = document.getElementById('game-input-container');

    // Build life bar
    buildLifeBar(sceneEl);

    // Phaser config
    var config = {
      type: Phaser.AUTO,
      parent: 'game-scene',
      width: sceneEl.clientWidth,
      height: sceneEl.clientHeight - 40,
      transparent: false,
      scene: [],
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      banner: false,
    };

    IsItCake._pendingInit = function (sceneRef) {
      scene = sceneRef;

      DualModeAdapter.init({
        subject: subject,
        containers: { hudContainer: hudContainer, inputContainer: inputContainer },
        questionCount: questionCount,
        mode: mode,
        presentation: presentation,
        showLives: false,
        wrongLosesLife: false,
        useCheckpoints: false,
        noDistractors: subject === 'spelling',
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

    config.scene = [IsItCakeScene];
    phaserGame = new Phaser.Game(config);
  }

  function buildLifeBar(container) {
    var bar = el('div', 'iic-life-bar');
    bar.id = 'iic-life-bar';
    for (var i = 0; i < MAX_LIVES; i++) {
      var life = el('span', 'iic-life', '\uD83C\uDF70');
      lifeEls.push(life);
      bar.appendChild(life);
    }
    container.insertBefore(bar, container.firstChild);
  }

  // --- Round Generation ---

  function generateRound() {
    // Pick 3 unique items not recently used
    var available = ITEM_POOL.filter(function (item) {
      return usedItemNames.indexOf(item.name) === -1;
    });

    // If pool is exhausted, reset
    if (available.length < 3) {
      usedItemNames = [];
      available = ITEM_POOL.slice();
    }

    // Shuffle and pick 3
    var shuffled = available.sort(function () { return Math.random() - 0.5; });
    var picked = shuffled.slice(0, 3);

    // Randomly assign one as cake
    var cakeIndex = Math.floor(Math.random() * 3);

    roundItems = picked.map(function (item, idx) {
      usedItemNames.push(item.name);
      return {
        name: item.name,
        emoji: item.emoji,
        isCake: idx === cakeIndex,
        eliminated: false,
      };
    });

    slicesUsedThisRound = 0;
    totalRounds++;
  }

  // --- Callbacks ---

  function handleQuestionShow(question, index) {
    if (gameOver) return;

    // If we're in picking mode, the framework auto-advanced but we're not ready.
    // Stop the timer and hide input until picking is done.
    if (pickingMode) {
      DualModeAdapter.stopTimer();
      hideInput();
      return;
    }

    // Show input for this question
    showInput();

    if (needNewRound) {
      generateRound();
      needNewRound = false;

      if (scene) {
        scene.showNewRound(roundItems);
      }
    }
  }

  function handleTimerTick(remaining, total) {
    if (gameOver || pickingMode) return;
    if (scene) {
      scene.updateTimerBar(remaining / total);
    }
  }

  function handleLetterCorrect(letter, position) {
    if (scene) {
      scene.onLetterCorrect();
    }
  }

  function handleLetterWrong(letter, position) {
    AudioManager.playSfx('wrong');
  }

  function handleWordComplete(question) {
    if (gameOver) return;
    handleSuccess(question);
  }

  function handleCorrect(question, index) {
    if (gameOver) return;
    if (currentSubject === 'math') {
      handleSuccess(question);
    }
  }

  function handleSuccess(question) {
    DualModeAdapter.stopTimer();
    AudioManager.playSfx('yay');

    // Enter picking mode - let Ava choose which item to slice
    pickingMode = true;

    // Hide input while picking
    hideInput();

    if (scene) {
      scene.enableSlicing();
    }
  }

  function handleWrong(question, livesRemaining) {
    if (gameOver || pickingMode) return;
    // Wrong answers don't lose lives in timer mode - timer continues
  }

  function handleTimeout(question, correctAnswer, isComplete) {
    if (gameOver) return;

    // If in picking mode, ignore timeout (framework auto-advanced while picking)
    if (pickingMode) return;

    AudioManager.playSfx('oops');

    // Show correct answer flash
    showCorrectAnswer(question);

    if (scene) {
      scene.updateTimerBar(0);
    }

    // Lose a life
    livesRemaining--;
    if (livesRemaining >= 0 && lifeEls[livesRemaining]) {
      lifeEls[livesRemaining].classList.add('lost');
    }

    // Check game over
    if (livesRemaining <= 0) {
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

    // Same round continues - advance to next question
    setTimeout(function () {
      DualModeAdapter.forceNextQuestion();
    }, 2500);
  }

  // --- Input visibility during picking ---

  function hideInput() {
    var inputContainer = document.getElementById('game-input-container');
    if (inputContainer) inputContainer.style.display = 'none';
  }

  function showInput() {
    var inputContainer = document.getElementById('game-input-container');
    if (inputContainer) inputContainer.style.display = '';
  }

  function handleComplete(stats) {
    if (gameOver || gameEnded) return;
    gameEnded = true;
    setTimeout(function () {
      showVictoryScreen(stats);
    }, 1500);
  }

  // --- Item Picking (called from scene) ---

  function onItemPicked(index) {
    if (!pickingMode || gameOver) return;
    pickingMode = false;

    var item = roundItems[index];
    if (!item || item.eliminated) return;

    slicesUsedThisRound++;

    if (item.isCake) {
      // CAKE FOUND!
      var points = Math.max(1, 4 - slicesUsedThisRound); // 3, 2, or 1
      score += points;
      cakesFound++;

      AudioManager.playSfx('hooray');

      if (scene) {
        scene.playCakeReveal(index, points, function () {
          needNewRound = true;

          // Check if game is complete (adapter handles question count)
          DualModeAdapter.forceNextQuestion();
        });
      }
    } else {
      // NOT CAKE
      item.eliminated = true;
      AudioManager.playSfx('wrong');

      // Count remaining non-eliminated items
      var remaining = roundItems.filter(function (r) { return !r.eliminated; });

      if (remaining.length <= 1) {
        // Auto-reveal last item as cake
        var lastItem = remaining[0];
        var lastIndex = roundItems.indexOf(lastItem);
        score += 1; // Minimum points
        cakesFound++;

        if (scene) {
          scene.playNotCakeReveal(index, function () {
            AudioManager.playSfx('yay');
            scene.playAutoReveal(lastIndex, function () {
              needNewRound = true;
              DualModeAdapter.forceNextQuestion();
            });
          });
        }
      } else {
        // More items left - answer next question, pick again
        if (scene) {
          scene.playNotCakeReveal(index, function () {
            DualModeAdapter.forceNextQuestion();
          });
        }
      }
    }
  }

  // --- Correct Answer Flash ---

  function showCorrectAnswer(question) {
    var sceneEl = document.getElementById('game-scene');
    var flash = el('div', 'iic-answer-flash');
    var answerText = String(question.answer);
    flash.textContent = currentSubject === 'spelling' ? answerText.toUpperCase() : answerText;
    sceneEl.appendChild(flash);
    setTimeout(function () { flash.remove(); }, 2500);
  }

  // --- End Screens ---

  function showVictoryScreen(stats) {
    AudioManager.playSfx('hooray');

    if (scene) {
      scene.showVictoryAnimation();
    }

    setTimeout(function () {
      var screen = el('div', 'iic-end-screen victory');

      var title = el('div', 'iic-end-title', 'Cake Detective!');
      screen.appendChild(title);

      var icon = el('div', 'iic-end-icon', '\uD83C\uDF82');
      screen.appendChild(icon);

      // Score display
      var scoreRow = el('div', 'iic-end-score');
      scoreRow.textContent = score + ' points';
      screen.appendChild(scoreRow);

      // Life display
      var livesRow = el('div', 'iic-end-lives');
      for (var i = 0; i < MAX_LIVES; i++) {
        var s = el('span', '', i < livesRemaining ? '\uD83C\uDF70' : '\u2B50');
        if (i >= livesRemaining) s.style.opacity = '0.3';
        livesRow.appendChild(s);
      }
      screen.appendChild(livesRow);

      var statsText = el('div', 'iic-end-stats');
      var cakeWord = cakesFound === 1 ? 'cake' : 'cakes';
      statsText.textContent = 'You found ' + cakesFound + ' ' + cakeWord + '!';
      screen.appendChild(statsText);

      var againBtn = el('button', 'iic-end-btn primary', 'Play Again!');
      againBtn.addEventListener('click', function () { window.location.reload(); });
      screen.appendChild(againBtn);

      var homeBtn = el('button', 'iic-end-btn secondary', 'Home');
      homeBtn.addEventListener('click', function () {
        window.location.href = 'games.html?subject=' + currentSubject;
      });
      screen.appendChild(homeBtn);

      document.body.appendChild(screen);
    }, 1500);
  }

  function showGameOverScreen() {
    AudioManager.playSfx('oh_no');

    var screen = el('div', 'iic-end-screen gameover');

    var title = el('div', 'iic-end-title', 'Bakery Closed!');
    screen.appendChild(title);

    var subtitle = el('div', 'iic-end-subtitle', 'Out of cake slices!');
    screen.appendChild(subtitle);

    var icon = el('div', 'iic-end-icon', '\uD83C\uDF82');
    screen.appendChild(icon);

    if (cakesFound > 0) {
      var statsText = el('div', 'iic-end-stats');
      var cakeWord = cakesFound === 1 ? 'cake' : 'cakes';
      statsText.textContent = 'You found ' + cakesFound + ' ' + cakeWord + ' (' + score + ' pts)!';
      screen.appendChild(statsText);
    }

    var againBtn = el('button', 'iic-end-btn primary', 'Try Again!');
    againBtn.addEventListener('click', function () { window.location.reload(); });
    screen.appendChild(againBtn);

    var homeBtn = el('button', 'iic-end-btn secondary', 'Home');
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
    _onItemPicked: onItemPicked,
  };

})();
