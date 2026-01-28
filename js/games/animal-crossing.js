/**
 * Animal Crossing - Help animals cross a busy street by answering math questions.
 */

const AnimalCrossing = (() => {
  const ANIMALS = [
    { name: 'Tiger', emoji: '\uD83D\uDC2F' },
    { name: 'Elephant', emoji: '\uD83D\uDC18' },
    { name: 'Lion', emoji: '\uD83E\uDD81' },
    { name: 'Red Fox', emoji: '\uD83E\uDD8A' },
    { name: 'Chipmunk', emoji: '\uD83D\uDC3F\uFE0F' },
  ];

  // Car emojis for variety
  const CARS = ['\uD83D\uDE97', '\uD83D\uDE99', '\uD83D\uDE8C', '\uD83D\uDE95', '\uD83D\uDE93'];

  let sceneEl = null;
  let currentAnimalIndex = 0;
  let activeAnimalEl = null;
  let savedAnimals = [];
  let savedAnimalsContainer = null;
  let trafficLights = {};
  let carInterval = null;

  function el(tag, className, textContent) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (textContent !== undefined) e.textContent = textContent;
    return e;
  }

  function start(options = {}) {
    const { mode = 'type', questionCount = 10, engine } = options;

    sceneEl = document.getElementById('game-scene');
    const hudContainer = document.getElementById('game-hud-container');
    const inputContainer = document.getElementById('game-input-container');

    currentAnimalIndex = 0;
    savedAnimals = [];

    // Build scene
    buildScene();

    // Start background cars
    startBackgroundCars();

    // Init game base (engine + UI)
    GameBase.init({ hudContainer, inputContainer }, {
      engine,
      questionCount,
      mode,
      onCorrect: handleCorrect,
      onWrong: handleWrong,
      onCheckpoint: handleCheckpoint,
      onCheckpointRestart: handleCheckpointRestart,
      onComplete: handleComplete,
      onQuestionShow: handleQuestionShow,
    });
  }

  function buildScene() {
    sceneEl.textContent = '';

    // Sky
    const sky = el('div', 'ac-sky');
    sceneEl.appendChild(sky);

    // Clouds
    addClouds(sky);

    // Waiting zone (left)
    const waitingZone = el('div', 'ac-waiting-zone');
    sceneEl.appendChild(waitingZone);

    // Road
    const road = el('div', 'ac-road');
    const crosswalk = el('div', 'ac-crosswalk');
    road.appendChild(crosswalk);
    sceneEl.appendChild(road);

    // Safe zone (right)
    const safeZone = el('div', 'ac-safe-zone');

    // Tree decorations in safe zone
    const tree1 = el('div', '', '\uD83C\uDF33');
    tree1.style.cssText = 'font-size:2rem;position:absolute;top:10%;left:20%';
    safeZone.appendChild(tree1);

    const tree2 = el('div', '', '\uD83C\uDF32');
    tree2.style.cssText = 'font-size:1.8rem;position:absolute;top:25%;right:10%';
    safeZone.appendChild(tree2);

    sceneEl.appendChild(safeZone);

    // Saved animals container
    savedAnimalsContainer = el('div', 'ac-saved-animals');
    sceneEl.appendChild(savedAnimalsContainer);

    // Traffic light
    const trafficLight = el('div', 'ac-traffic-light');
    const redDot = el('div', 'traffic-dot red');
    const yellowDot = el('div', 'traffic-dot yellow');
    const greenDot = el('div', 'traffic-dot green');
    trafficLight.appendChild(redDot);
    trafficLight.appendChild(yellowDot);
    trafficLight.appendChild(greenDot);
    sceneEl.appendChild(trafficLight);

    trafficLights = { red: redDot, yellow: yellowDot, green: greenDot };
    setTrafficLight('red');

    // Place first animal at curb
    placeAnimalAtCurb();
  }

  function addClouds(skyEl) {
    for (let i = 0; i < 3; i++) {
      const cloud = el('div', 'ac-cloud');
      cloud.style.width = `${60 + Math.random() * 60}px`;
      cloud.style.height = `${25 + Math.random() * 15}px`;
      cloud.style.top = `${10 + Math.random() * 50}%`;
      cloud.style.left = `${Math.random() * 80}%`;
      cloud.style.animation = `cloudDrift ${15 + Math.random() * 10}s linear infinite`;
      cloud.style.animationDelay = `${-Math.random() * 15}s`;
      skyEl.appendChild(cloud);
    }
  }

  function setTrafficLight(color) {
    trafficLights.red.classList.toggle('active', color === 'red');
    trafficLights.yellow.classList.toggle('active', color === 'yellow');
    trafficLights.green.classList.toggle('active', color === 'green');
  }

  function getAnimal(index) {
    return ANIMALS[index % ANIMALS.length];
  }

  function placeAnimalAtCurb() {
    if (activeAnimalEl) {
      activeAnimalEl.remove();
    }

    const animal = getAnimal(currentAnimalIndex);
    activeAnimalEl = el('div', 'ac-animal', animal.emoji);

    // Position at left curb (waiting zone edge)
    const sceneRect = sceneEl.getBoundingClientRect();
    activeAnimalEl.style.left = '12%';
    activeAnimalEl.style.top = '55%';

    sceneEl.appendChild(activeAnimalEl);

    // Pop-in animation
    activeAnimalEl.style.animation = 'popIn 0.4s ease-out';
    setTimeout(() => {
      if (activeAnimalEl) activeAnimalEl.style.animation = '';
    }, 400);
  }

  function handleQuestionShow(question, index) {
    // Set traffic light to red (cars can go, animal waits)
    setTrafficLight('red');
  }

  function handleCorrect(question, index) {
    // Traffic goes green for the animal
    setTrafficLight('green');

    // Animate animal crossing the road
    if (activeAnimalEl) {
      activeAnimalEl.classList.add('walking');

      // Move across the road to safe zone
      activeAnimalEl.style.left = '82%';

      // After crossing animation completes
      setTimeout(() => {
        if (activeAnimalEl) {
          activeAnimalEl.classList.remove('walking');
          activeAnimalEl.classList.add('celebrating');
        }

        // Add to saved animals
        const savedEl = el('span', 'ac-saved-animal', getAnimal(currentAnimalIndex).emoji);
        savedAnimalsContainer.appendChild(savedEl);
        savedAnimals.push(currentAnimalIndex);

        // Remove active animal
        setTimeout(() => {
          currentAnimalIndex++;
          placeAnimalAtCurb();
        }, 300);
      }, 1200);
    }
  }

  function handleWrong(question, livesRemaining) {
    // Traffic stays red - car honks by
    setTrafficLight('red');

    // Animal flinches
    if (activeAnimalEl) {
      activeAnimalEl.classList.add('flinch');
      setTimeout(() => {
        if (activeAnimalEl) activeAnimalEl.classList.remove('flinch');
      }, 500);
    }

    // Drive a car across quickly
    driveCar(true);
  }

  function handleCheckpoint() {
    // Brief celebration - traffic light goes yellow
    setTrafficLight('yellow');
    setTimeout(() => setTrafficLight('red'), 2000);
  }

  function handleCheckpointRestart() {
    // Reset traffic light
    setTrafficLight('red');

    // Flash the scene briefly
    sceneEl.style.transition = 'filter 0.3s';
    sceneEl.style.filter = 'brightness(1.3)';
    setTimeout(() => {
      sceneEl.style.filter = '';
    }, 300);
  }

  function handleComplete(stats) {
    // Stop background cars
    if (carInterval) {
      clearInterval(carInterval);
      carInterval = null;
    }

    // Show victory screen after a short delay
    setTimeout(() => showVictoryScreen(stats), 500);
  }

  function showVictoryScreen(stats) {
    const victory = el('div', 'victory-screen');

    const title = el('div', 'victory-title', 'Great Job!');
    victory.appendChild(title);

    const statsText = el('div', 'victory-stats');
    statsText.textContent = `You helped ${stats.questionCount} animals cross safely!`;
    victory.appendChild(statsText);

    // Show all saved animal emojis
    const animalsRow = el('div', 'victory-animals');
    for (let i = 0; i < Math.min(savedAnimals.length, 10); i++) {
      const a = el('span', '', getAnimal(savedAnimals[i]).emoji);
      a.style.fontSize = '2.5rem';
      a.style.animationDelay = `${i * 0.1}s`;
      animalsRow.appendChild(a);
    }
    victory.appendChild(animalsRow);

    // Play again button
    const playAgainBtn = el('button', 'victory-btn', 'Play Again');
    playAgainBtn.addEventListener('click', () => {
      window.location.reload();
    });
    victory.appendChild(playAgainBtn);

    // Home button
    const homeBtn = el('button', 'victory-btn');
    homeBtn.textContent = 'Home';
    homeBtn.style.background = 'var(--color-secondary)';
    homeBtn.style.marginTop = 'var(--space-md)';
    homeBtn.addEventListener('click', () => {
      var subject = new URLSearchParams(window.location.search).get('subject') || 'math';
      window.location.href = subject === 'spelling' ? 'spelling.html' : 'math.html';
    });
    victory.appendChild(homeBtn);

    document.body.appendChild(victory);
  }

  // Background car animations
  function startBackgroundCars() {
    // Drive a car every 3-5 seconds
    driveCar(false);
    carInterval = setInterval(() => {
      if (Math.random() > 0.4) {
        driveCar(false);
      }
    }, 3500);
  }

  function driveCar(isHonk) {
    const car = el('div', 'ac-car');
    const carEmoji = CARS[Math.floor(Math.random() * CARS.length)];
    car.textContent = carEmoji;
    car.style.fontSize = '2rem';
    car.style.display = 'flex';
    car.style.alignItems = 'center';
    car.style.justifyContent = 'center';

    // Random horizontal position on the road (between waiting and safe zones)
    const roadLeft = 22; // percentage - inside the road area
    const roadRight = 72;
    const leftPos = roadLeft + Math.random() * (roadRight - roadLeft);
    car.style.left = `${leftPos}%`;

    // Determine direction: top-to-bottom or bottom-to-top
    const goingDown = Math.random() > 0.5;
    if (goingDown) {
      car.style.top = '-60px';
      car.style.transform = 'rotate(90deg)';
    } else {
      car.style.top = 'calc(100% + 60px)';
      car.style.transform = 'rotate(-90deg)';
    }

    sceneEl.appendChild(car);

    // Animate down/up the road
    requestAnimationFrame(() => {
      car.classList.add('driving');
      const speed = isHonk ? 1.2 : 2;
      car.style.transition = `top ${speed}s linear`;
      if (goingDown) {
        car.style.top = 'calc(100% + 60px)';
      } else {
        car.style.top = '-60px';
      }
    });

    // Remove after animation
    setTimeout(() => {
      car.remove();
    }, isHonk ? 1500 : 2500);
  }

  function destroy() {
    if (carInterval) {
      clearInterval(carInterval);
      carInterval = null;
    }
    GameBase.destroy();
  }

  return {
    start,
    destroy,
  };
})();
