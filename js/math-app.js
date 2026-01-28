/**
 * Math page logic - Game grid, answer mode toggle, question count, game links.
 * Reads shared settings from avagames-settings, math settings from avagames-math.
 */

(function () {
  var GAMES = [
    { id: 'animal-crossing', name: 'Animal Crossing', icon: '\uD83D\uDC2F', playable: true },
    { id: 'traffic-jam', name: 'Traffic Jam', icon: '\uD83D\uDE97', playable: false },
    { id: 'breakfast-helper', name: 'Breakfast Helper', icon: '\uD83C\uDF73', playable: true },
    { id: 'baking-contest', name: 'Baking Contest', icon: '\uD83C\uDF82', playable: false },
    { id: 'pet-feeder', name: 'Pet Feeder', icon: '\uD83D\uDC36', playable: false },
    { id: 'boat-builder', name: 'Boat Builder', icon: '\u26F5', playable: false },
    { id: 'pirate-battle', name: 'Pirate Battle', icon: '\uD83C\uDFF4\u200D\u2620\uFE0F', playable: false },
    { id: 'star-collector', name: 'Star Collector', icon: '\u2B50', playable: false },
  ];

  // Settings
  var sharedSettings = { muted: false };
  var mathSettings = { mode: 'type', questionCount: 10 };

  function loadSettings() {
    try {
      var saved = localStorage.getItem('avagames-settings');
      if (saved) {
        var parsed = JSON.parse(saved);
        sharedSettings = { muted: parsed.muted || false };
      }
    } catch (e) {}

    try {
      var saved = localStorage.getItem('avagames-math');
      if (saved) {
        var parsed = JSON.parse(saved);
        mathSettings = {
          mode: parsed.mode || 'type',
          questionCount: parsed.questionCount || 10,
        };
      }
    } catch (e) {}
  }

  function saveMathSettings() {
    try {
      localStorage.setItem('avagames-math', JSON.stringify(mathSettings));
    } catch (e) {}
  }

  // Build game grid
  function buildGameGrid() {
    var grid = document.getElementById('math-game-grid');
    grid.textContent = '';

    GAMES.forEach(function (game) {
      var card = document.createElement('a');
      card.className = 'subject-game-card ' + (game.playable ? 'playable' : 'locked');

      if (game.playable) {
        card.href = 'game.html?game=' + game.id + '&mode=' + mathSettings.mode + '&count=' + mathSettings.questionCount + '&subject=math';
      }

      var icon = document.createElement('div');
      icon.className = 'subject-game-icon';
      icon.textContent = game.icon;
      card.appendChild(icon);

      var name = document.createElement('div');
      name.className = 'subject-game-name';
      name.textContent = game.name;
      card.appendChild(name);

      if (!game.playable) {
        var lock = document.createElement('div');
        lock.className = 'subject-game-lock';
        lock.textContent = '\uD83D\uDD12 Soon';
        card.appendChild(lock);
      }

      grid.appendChild(card);
    });
  }

  // Update link hrefs when settings change
  function updateGameLinks() {
    var cards = document.querySelectorAll('.subject-game-card.playable');
    cards.forEach(function (card) {
      var url = new URL(card.href);
      url.searchParams.set('mode', mathSettings.mode);
      url.searchParams.set('count', mathSettings.questionCount);
      card.href = url.toString();
    });
  }

  // Setup mode toggle
  function setupModeToggle() {
    var toggle = document.getElementById('math-mode-toggle');
    var buttons = toggle.querySelectorAll('.subject-toggle-btn');

    // Set initial state
    buttons.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.mode === mathSettings.mode);
    });

    toggle.addEventListener('click', function (e) {
      var btn = e.target.closest('.subject-toggle-btn');
      if (!btn || !btn.dataset.mode) return;

      buttons.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      mathSettings.mode = btn.dataset.mode;
      saveMathSettings();
      updateGameLinks();
    });
  }

  // Setup question count buttons
  function setupCountButtons() {
    var container = document.getElementById('math-count-buttons');
    var buttons = container.querySelectorAll('.count-btn');

    // Set initial state
    buttons.forEach(function (btn) {
      btn.classList.toggle('active', parseInt(btn.dataset.count, 10) === mathSettings.questionCount);
    });

    container.addEventListener('click', function (e) {
      var btn = e.target.closest('.count-btn');
      if (!btn) return;

      buttons.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      mathSettings.questionCount = parseInt(btn.dataset.count, 10);
      saveMathSettings();
      updateGameLinks();
    });
  }

  // Setup audio toggle
  function setupAudioToggle() {
    var btn = document.getElementById('audio-toggle');
    var icon = document.getElementById('audio-icon');

    function updateIcon() {
      icon.textContent = sharedSettings.muted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
      btn.classList.toggle('muted', sharedSettings.muted);
      AudioManager.setMuted(sharedSettings.muted);
    }

    updateIcon();

    btn.addEventListener('click', function () {
      sharedSettings.muted = !sharedSettings.muted;
      try {
        localStorage.setItem('avagames-settings', JSON.stringify(sharedSettings));
      } catch (e) {}
      updateIcon();
    });
  }

  // Unlock audio on first interaction (iOS Safari requirement)
  function setupAudioUnlock() {
    var handler = function () {
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
