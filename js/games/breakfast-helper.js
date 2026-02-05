/**
 * Breakfast Helper - Cook breakfast by answering questions before the timer runs out.
 * Works with BOTH math and spelling modes via DualModeAdapter.
 * Each question has a 10-second countdown. If time expires, the food burns and a star is lost.
 * 5 stars lost = game over.
 */

const BreakfastHelper = (() => {
  const FOODS = [
    { name: 'Pancakes', emoji: '\uD83E\uDD5E' },
    { name: 'Bacon', emoji: '\uD83E\uDD53' },
    { name: 'Eggs', emoji: '\uD83C\uDF73' },
    { name: 'Toast', emoji: '\uD83C\uDF5E' },
    { name: 'Waffles', emoji: '\uD83E\uDDC7' },
    { name: 'Hash Browns', emoji: '\uD83E\uDD54' },
  ];

  const MAX_STARS = 5;
  const TIMER_SECONDS = 10;

  let sceneEl = null;
  let starsRemaining = MAX_STARS;
  let cookedFoods = [];
  let currentFoodIndex = 0;
  let gameOver = false;
  let gameEnded = false; // prevents double end-screen
  let currentSubject = 'math';

  // DOM refs
  let starEls = [];
  let burnerRing = null;
  let foodEl = null;
  let timerTextEl = null;
  let plateArea = null;
  let stoveArea = null;

  function el(tag, className, textContent) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (textContent !== undefined) e.textContent = textContent;
    return e;
  }

  function start(options = {}) {
    const subject = options.subject || 'math';
    const mode = options.mode || (subject === 'spelling' ? 'scramble' : 'type');
    const questionCount = options.questionCount || 10;
    const presentation = options.presentation || 'audio-picture';
    const difficulty = options.difficulty || 'easy';

    currentSubject = subject;

    sceneEl = document.getElementById('game-scene');
    const hudContainer = document.getElementById('game-hud-container');
    const inputContainer = document.getElementById('game-input-container');

    // Reset state
    starsRemaining = MAX_STARS;
    cookedFoods = [];
    currentFoodIndex = 0;
    gameOver = false;
    gameEnded = false;
    starEls = [];

    // Build kitchen scene
    buildScene();

    // Init via DualModeAdapter (handles math or spelling engine)
    DualModeAdapter.init({
      subject: subject,
      containers: { hudContainer, inputContainer },
      questionCount,
      mode,
      presentation,
      showLives: false,
      wrongLosesLife: false,
      useCheckpoints: false,
      noDistractors: true,
      timerDuration: TIMER_SECONDS,
      callbacks: {
        onCorrect: handleCorrect,
        onWrong: handleWrong,
        onComplete: handleComplete,
        onQuestionShow: handleQuestionShow,
        onTimeout: handleTimeout,
        onTimerTick: handleTimerTick,
        onLetterCorrect: handleLetterCorrect,
        onLetterWrong: handleLetterWrong,
        onWordComplete: handleWordComplete,
      },
    });
  }

  function buildScene() {
    sceneEl.textContent = '';

    const kitchen = el('div', 'bh-kitchen');

    // Star bar
    const starBar = el('div', 'bh-star-bar');
    for (let i = 0; i < MAX_STARS; i++) {
      const star = el('span', 'bh-star', '\u2B50');
      starEls.push(star);
      starBar.appendChild(star);
    }
    kitchen.appendChild(starBar);

    // Stove area
    stoveArea = el('div', 'bh-stove-area');

    const stove = el('div', 'bh-stove');
    burnerRing = el('div', 'bh-burner-ring');
    burnerRing.setAttribute('data-urgency', 'safe');

    foodEl = el('div', 'bh-food-on-stove');
    burnerRing.appendChild(foodEl);
    stove.appendChild(burnerRing);
    stoveArea.appendChild(stove);

    // Timer text
    timerTextEl = el('div', 'bh-timer-text', String(TIMER_SECONDS));
    stoveArea.appendChild(timerTextEl);

    kitchen.appendChild(stoveArea);

    // Plate area
    plateArea = el('div', 'bh-plate-area');
    const plateLabel = el('div', 'bh-plate-label', '\uD83C\uDF7D\uFE0F');
    plateArea.appendChild(plateLabel);
    kitchen.appendChild(plateArea);

    sceneEl.appendChild(kitchen);
  }

  function getFood(index) {
    return FOODS[index % FOODS.length];
  }

  // --- Callbacks ---

  function handleQuestionShow(question, index) {
    if (gameOver) return;

    // Place food on stove
    const food = getFood(currentFoodIndex);
    foodEl.textContent = food.emoji;
    foodEl.className = 'bh-food-on-stove cooking';

    // Reset burner
    burnerRing.setAttribute('data-urgency', 'safe');

    // Reset timer display
    timerTextEl.textContent = String(TIMER_SECONDS);
    timerTextEl.classList.remove('danger');
  }

  function handleTimerTick(remaining, total) {
    if (gameOver) return;

    // Update timer number
    timerTextEl.textContent = String(remaining);

    // Update burner color based on ratio
    const ratio = remaining / total;
    if (ratio > 0.5) {
      burnerRing.setAttribute('data-urgency', 'safe');
      timerTextEl.classList.remove('danger');
    } else if (ratio > 0.2) {
      burnerRing.setAttribute('data-urgency', 'warning');
      timerTextEl.classList.remove('danger');
    } else {
      burnerRing.setAttribute('data-urgency', 'danger');
      timerTextEl.classList.add('danger');
    }

    // Sizzle at <= 3 seconds
    if (remaining <= 3 && foodEl) {
      foodEl.className = 'bh-food-on-stove sizzle';
    }
  }

  function handleLetterCorrect(letter, position) {
    // Small visual feedback - food sizzles positively
  }

  function handleLetterWrong(letter, position) {
    if (gameOver) return;
    // Brief sizzle effect for wrong letter
    if (foodEl) {
      foodEl.className = 'bh-food-on-stove sizzle';
      setTimeout(() => {
        if (foodEl && !gameOver) {
          foodEl.className = 'bh-food-on-stove cooking';
        }
      }, 300);
    }
  }

  function handleWordComplete(question) {
    // Spelling: word completed correctly
    if (gameOver) return;
    if (currentSubject === 'spelling') {
      handleFoodCooked();
    }
  }

  function handleCorrect(question, index) {
    // Math: answer correct (for spelling, handleWordComplete handles it)
    if (gameOver) return;
    if (currentSubject === 'math') {
      handleFoodCooked();
    }
  }

  function handleFoodCooked() {
    // Food cooked - slide to plate animation
    foodEl.className = 'bh-food-on-stove cooked';

    // Add to plate
    const food = getFood(currentFoodIndex);
    cookedFoods.push(food);

    const plateFood = el('span', 'bh-plate-food', food.emoji);
    plateArea.appendChild(plateFood);

    currentFoodIndex++;
  }

  function handleWrong(question, livesRemaining) {
    if (gameOver) return;

    // Brief sizzle effect - visual reminder time is wasting
    if (foodEl) {
      foodEl.className = 'bh-food-on-stove sizzle';
      setTimeout(() => {
        if (foodEl && !gameOver) {
          foodEl.className = 'bh-food-on-stove cooking';
        }
      }, 400);
    }
  }

  function handleTimeout(question, correctAnswer, isComplete) {
    if (gameOver) return;

    // Burn the food
    if (foodEl) {
      foodEl.className = 'bh-food-on-stove burned';
    }

    // Smoke effect
    spawnSmoke();

    // Flash correct answer
    const flash = el('div', 'bh-answer-flash');
    if (currentSubject === 'spelling') {
      flash.textContent = String(correctAnswer).toUpperCase();
    } else {
      flash.textContent = 'The answer was ' + correctAnswer + '!';
    }
    sceneEl.querySelector('.bh-kitchen').appendChild(flash);

    // Lose a star
    starsRemaining--;
    if (starsRemaining >= 0 && starEls[starsRemaining]) {
      starEls[starsRemaining].classList.add('lost');
    }

    currentFoodIndex++;

    // Check game over
    if (starsRemaining <= 0) {
      gameOver = true;
      gameEnded = true;
      DualModeAdapter.stopTimer();
      setTimeout(() => {
        flash.remove();
        showGameOverScreen();
      }, 2000);
      return;
    }

    // If all questions done (isComplete), show victory
    if (isComplete) {
      gameEnded = true;
      setTimeout(() => {
        flash.remove();
        showVictoryScreen();
      }, 2000);
      return;
    }

    // Otherwise advance to next question after delay
    setTimeout(() => {
      flash.remove();
      DualModeAdapter.forceNextQuestion();
    }, 2500);
  }

  function handleComplete(stats) {
    if (gameOver || gameEnded) return;
    gameEnded = true;
    setTimeout(() => showVictoryScreen(stats), 500);
  }

  // --- Effects ---

  function spawnSmoke() {
    const kitchen = sceneEl.querySelector('.bh-kitchen');
    if (!kitchen) return;

    // Spawn 3 smoke puffs at slightly different positions
    for (let i = 0; i < 3; i++) {
      const smoke = el('div', 'bh-smoke', '\uD83D\uDCA8');
      const offsetX = -20 + Math.random() * 40;
      const stoveRect = stoveArea.getBoundingClientRect();
      const kitchenRect = kitchen.getBoundingClientRect();
      const centerX = stoveRect.left - kitchenRect.left + stoveRect.width / 2;
      const topY = stoveRect.top - kitchenRect.top;

      smoke.style.left = (centerX + offsetX) + 'px';
      smoke.style.top = topY + 'px';
      smoke.style.animationDelay = (i * 0.2) + 's';

      kitchen.appendChild(smoke);
      setTimeout(() => smoke.remove(), 2000);
    }
  }

  // --- End Screens ---

  function showVictoryScreen(stats) {
    const screen = el('div', 'bh-end-screen victory');

    const title = el('div', 'bh-end-title', 'Great Job, Chef!');
    screen.appendChild(title);

    // Stars earned
    const starsRow = el('div', 'bh-end-stars');
    for (let i = 0; i < MAX_STARS; i++) {
      const s = el('span', '', i < starsRemaining ? '\u2B50' : '\u2606');
      starsRow.appendChild(s);
    }
    screen.appendChild(starsRow);

    const statsText = el('div', 'bh-end-stats');
    const foodWord = cookedFoods.length === 1 ? 'food' : 'foods';
    statsText.textContent = 'You cooked ' + cookedFoods.length + ' ' + foodWord + '!';
    screen.appendChild(statsText);

    // Show cooked food emojis
    if (cookedFoods.length > 0) {
      const foodsRow = el('div', 'bh-end-foods');
      cookedFoods.forEach((f) => {
        const foodSpan = el('span', '', f.emoji);
        foodsRow.appendChild(foodSpan);
      });
      screen.appendChild(foodsRow);
    }

    // Cook Again button
    const againBtn = el('button', 'bh-end-btn primary', 'Cook Again!');
    againBtn.addEventListener('click', () => window.location.reload());
    screen.appendChild(againBtn);

    // Home button
    const homeBtn = el('button', 'bh-end-btn secondary', 'Home');
    homeBtn.addEventListener('click', () => {
      var subject = new URLSearchParams(window.location.search).get('subject') || 'math';
      window.location.href = subject === 'spelling' ? 'spelling.html' : 'math.html';
    });
    screen.appendChild(homeBtn);

    document.body.appendChild(screen);
  }

  function showGameOverScreen() {
    const screen = el('div', 'bh-end-screen gameover');

    const title = el('div', 'bh-end-title', 'Oh no! Too smoky!');
    screen.appendChild(title);

    const smoke = el('div', '', '\uD83D\uDCA8 \uD83D\uDCA8 \uD83D\uDCA8');
    smoke.style.fontSize = '2.5rem';
    screen.appendChild(smoke);

    if (cookedFoods.length > 0) {
      const statsText = el('div', 'bh-end-stats');
      const foodWord = cookedFoods.length === 1 ? 'food' : 'foods';
      statsText.textContent = 'You cooked ' + cookedFoods.length + ' ' + foodWord + ' before the smoke alarm!';
      screen.appendChild(statsText);
    }

    // Try Again button
    const againBtn = el('button', 'bh-end-btn primary', 'Try Again!');
    againBtn.addEventListener('click', () => window.location.reload());
    screen.appendChild(againBtn);

    // Home button
    const homeBtn = el('button', 'bh-end-btn secondary', 'Home');
    homeBtn.addEventListener('click', () => {
      var subject = new URLSearchParams(window.location.search).get('subject') || 'math';
      window.location.href = subject === 'spelling' ? 'spelling.html' : 'math.html';
    });
    screen.appendChild(homeBtn);

    document.body.appendChild(screen);
  }

  function destroy() {
    gameOver = true;
    DualModeAdapter.destroy();
  }

  return {
    start,
    destroy,
  };
})();
