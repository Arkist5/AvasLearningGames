/**
 * Homepage logic - Settings, navigation, game grid.
 */

(function () {
  const GAMES = [
    { id: 'animal-crossing', name: 'Animal Crossing', icon: '\uD83D\uDC2F', playable: true },
    { id: 'traffic-jam', name: 'Traffic Jam', icon: '\uD83D\uDE97', playable: false },
    { id: 'breakfast-helper', name: 'Breakfast Helper', icon: '\uD83C\uDF73', playable: false },
    { id: 'baking-contest', name: 'Baking Contest', icon: '\uD83C\uDF82', playable: false },
    { id: 'pet-feeder', name: 'Pet Feeder', icon: '\uD83D\uDC36', playable: false },
    { id: 'boat-builder', name: 'Boat Builder', icon: '\u26F5', playable: false },
    { id: 'pirate-battle', name: 'Pirate Battle', icon: '\uD83C\uDFF4\u200D\u2620\uFE0F', playable: false },
    { id: 'star-collector', name: 'Star Collector', icon: '\u2B50', playable: false },
  ];

  // Settings state
  let settings = {
    mode: 'type',
    questionCount: 10,
    muted: false,
  };

  // Load saved settings
  function loadSettings() {
    try {
      const saved = localStorage.getItem('mathfun-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        settings = { ...settings, ...parsed };
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem('mathfun-settings', JSON.stringify(settings));
    } catch (e) {
      // Ignore storage errors
    }
  }

  // Build game grid
  function buildGameGrid() {
    const grid = document.getElementById('game-grid');
    grid.textContent = '';

    GAMES.forEach((game) => {
      const card = document.createElement('a');
      card.className = `game-card ${game.playable ? 'playable' : 'locked'}`;

      if (game.playable) {
        card.href = `game.html?game=${game.id}&mode=${settings.mode}&count=${settings.questionCount}`;
      }

      const icon = document.createElement('div');
      icon.className = 'game-icon';
      icon.textContent = game.icon;
      card.appendChild(icon);

      const name = document.createElement('div');
      name.className = 'game-name';
      name.textContent = game.name;
      card.appendChild(name);

      if (!game.playable) {
        const lock = document.createElement('div');
        lock.className = 'game-lock';
        lock.textContent = '\uD83D\uDD12 Soon';
        card.appendChild(lock);
      }

      grid.appendChild(card);
    });
  }

  // Update link hrefs when settings change
  function updateGameLinks() {
    const cards = document.querySelectorAll('.game-card.playable');
    cards.forEach((card) => {
      const url = new URL(card.href);
      url.searchParams.set('mode', settings.mode);
      url.searchParams.set('count', settings.questionCount);
      card.href = url.toString();
    });
  }

  // Setup mode toggle
  function setupModeToggle() {
    const toggle = document.getElementById('mode-toggle');
    const buttons = toggle.querySelectorAll('.mode-btn');

    // Set initial state
    buttons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === settings.mode);
    });

    toggle.addEventListener('click', (e) => {
      const btn = e.target.closest('.mode-btn');
      if (!btn) return;

      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      settings.mode = btn.dataset.mode;
      saveSettings();
      updateGameLinks();
    });
  }

  // Setup question count buttons
  function setupCountButtons() {
    const container = document.getElementById('count-buttons');
    const buttons = container.querySelectorAll('.count-btn');

    // Set initial state
    buttons.forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.dataset.count, 10) === settings.questionCount);
    });

    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.count-btn');
      if (!btn) return;

      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      settings.questionCount = parseInt(btn.dataset.count, 10);
      saveSettings();
      updateGameLinks();
    });
  }

  // Setup audio toggle
  function setupAudioToggle() {
    const btn = document.getElementById('audio-toggle');
    const icon = document.getElementById('audio-icon');

    function updateIcon() {
      icon.textContent = settings.muted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
      btn.classList.toggle('muted', settings.muted);
      AudioManager.setMuted(settings.muted);
    }

    updateIcon();

    btn.addEventListener('click', () => {
      settings.muted = !settings.muted;
      saveSettings();
      updateIcon();
    });
  }

  // Unlock audio on first interaction (iOS Safari requirement)
  function setupAudioUnlock() {
    const handler = () => {
      AudioManager.unlock();
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('click', handler);
    };
    document.addEventListener('touchstart', handler, { once: true });
    document.addEventListener('click', handler, { once: true });
  }

  // Init
  function init() {
    loadSettings();
    buildGameGrid();
    setupModeToggle();
    setupCountButtons();
    setupAudioToggle();
    setupAudioUnlock();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
