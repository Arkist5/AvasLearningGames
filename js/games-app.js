/**
 * Unified games page logic - Subject toggle, game grid, math & spelling settings.
 * Merges math-app.js + spelling-app.js into a single page with subject switching.
 */

(function () {
  var GAMES = [
    // Live (same 8 games for both subjects)
    { id: 'animal-crossing', name: 'Animal Crossing', icon: '\uD83D\uDC2F', playable: true },
    { id: 'breakfast-helper', name: 'Breakfast Helper', icon: '\uD83C\uDF73', playable: true },
    { id: 'paper-boy', name: 'Paper Boy', icon: '\uD83D\uDEB4', playable: true },
    { id: 'supermarket-cashier', name: 'Supermarket Cashier', icon: '\uD83D\uDED2', playable: true },
    { id: 'doggy-daycare', name: 'Doggy Daycare', icon: '\uD83D\uDC36', playable: true },
    { id: 'santa-delivery', name: "Santa's Delivery", icon: '\uD83C\uDF85', playable: true },
    { id: 'cobbler', name: "Cobbler's Workshop", icon: '\uD83D\uDC5E', playable: true },
    { id: 'zoo', name: 'Zoo Bedtime', icon: '\uD83E\uDD81', playable: true },
    // Coming soon
    { id: 'traffic-jam', name: 'Traffic Jam', icon: '\uD83D\uDE97', playable: false },
    { id: 'baking-contest', name: 'Baking Contest', icon: '\uD83C\uDF82', playable: false },
    { id: 'pet-feeder', name: 'Pet Feeder', icon: '\uD83D\uDC36', playable: false },
    { id: 'boat-builder', name: 'Boat Builder', icon: '\u26F5', playable: false },
    { id: 'pirate-battle', name: 'Pirate Battle', icon: '\uD83C\uDFF4\u200D\u2620\uFE0F', playable: false },
    { id: 'star-collector', name: 'Star Collector', icon: '\u2B50', playable: false },
  ];

  // State
  var currentSubject = 'math';
  var sharedSettings = { muted: false };
  var mathSettings = { mode: 'type', questionCount: 10 };
  var spellingSettings = { words: [], timed: true };

  // Determine initial subject: URL param > localStorage > default
  function getInitialSubject() {
    var params = new URLSearchParams(window.location.search);
    var fromUrl = params.get('subject');
    if (fromUrl === 'math' || fromUrl === 'spelling') return fromUrl;

    try {
      var saved = localStorage.getItem('avagames-last-subject');
      if (saved === 'math' || saved === 'spelling') return saved;
    } catch (e) {}

    return 'math';
  }

  // Load all settings from localStorage
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

    try {
      var saved = localStorage.getItem('avagames-spelling');
      if (saved) {
        var parsed = JSON.parse(saved);
        spellingSettings = {
          words: parsed.words || [],
          timed: parsed.timed !== undefined ? parsed.timed : true,
        };
      }
    } catch (e) {}
  }

  function saveMathSettings() {
    try {
      localStorage.setItem('avagames-math', JSON.stringify(mathSettings));
    } catch (e) {}
  }

  function saveSpellingSettings() {
    try {
      localStorage.setItem('avagames-spelling', JSON.stringify(spellingSettings));
    } catch (e) {}
  }

  function saveSubject() {
    try {
      localStorage.setItem('avagames-last-subject', currentSubject);
    } catch (e) {}
  }

  // --- Subject Toggle ---

  function switchSubject(subject) {
    currentSubject = subject;
    saveSubject();

    var title = document.getElementById('games-title');
    var subtitle = document.getElementById('games-subtitle');
    var mathPanel = document.getElementById('math-settings');
    var spellingPanel = document.getElementById('spelling-settings');
    var pickerBtns = document.querySelectorAll('.subject-picker-btn');

    // Update picker buttons
    pickerBtns.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.subject === subject);
    });

    // Update title and subtitle
    if (subject === 'math') {
      title.textContent = 'Math Games';
      title.classList.remove('spelling');
      subtitle.textContent = "Pick a game and let's practice!";
      mathPanel.style.display = '';
      spellingPanel.style.display = 'none';
    } else {
      title.textContent = 'Spelling Games';
      title.classList.add('spelling');
      subtitle.textContent = "Pick a game and let's spell!";
      mathPanel.style.display = 'none';
      spellingPanel.style.display = '';
    }

    // Rebuild game grid with new subject params
    buildGameGrid();
  }

  function setupSubjectPicker() {
    var picker = document.getElementById('subject-picker');
    picker.addEventListener('click', function (e) {
      var btn = e.target.closest('.subject-picker-btn');
      if (!btn || !btn.dataset.subject) return;
      switchSubject(btn.dataset.subject);
    });
  }

  // --- Game Grid ---

  function getGameHref(game) {
    if (currentSubject === 'math') {
      return 'game.html?game=' + game.id + '&mode=' + mathSettings.mode + '&count=' + mathSettings.questionCount + '&subject=math';
    } else {
      return 'game.html?game=' + game.id + '&subject=spelling&difficulty=easy&presentation=audio-picture&timed=' + spellingSettings.timed;
    }
  }

  function buildGameGrid() {
    var grid = document.getElementById('game-grid');
    grid.textContent = '';

    GAMES.forEach(function (game) {
      var card = document.createElement('a');
      card.className = 'subject-game-card ' + (game.playable ? 'playable' : 'locked');

      if (game.playable) {
        card.href = getGameHref(game);
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

  function updateGameLinks() {
    var cards = document.querySelectorAll('.subject-game-card.playable');
    cards.forEach(function (card, idx) {
      // Find the matching playable game
      var playable = GAMES.filter(function (g) { return g.playable; });
      if (playable[idx]) {
        card.href = getGameHref(playable[idx]);
      }
    });
  }

  // --- Math Settings ---

  function setupMathModeToggle() {
    var toggle = document.getElementById('math-mode-toggle');
    var buttons = toggle.querySelectorAll('.subject-toggle-btn');

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

  function setupMathCountButtons() {
    var container = document.getElementById('math-count-buttons');
    var buttons = container.querySelectorAll('.count-btn');

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

  // --- Spelling Settings ---

  function parseWords(text) {
    var lines = text.split(/[\n,]+/);
    var seen = {};
    var words = [];
    for (var i = 0; i < lines.length; i++) {
      var word = lines[i].trim().toLowerCase();
      if (word && !seen[word]) {
        seen[word] = true;
        words.push(word);
      }
    }
    return words;
  }

  function setupSpellingWordInput() {
    var textarea = document.getElementById('spelling-word-input');
    var countEl = document.getElementById('spelling-word-count');

    if (spellingSettings.words.length > 0) {
      textarea.value = spellingSettings.words.join('\n');
    }
    updateWordCount();

    var saveTimer = null;
    textarea.addEventListener('input', function () {
      updateWordCount();
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        spellingSettings.words = parseWords(textarea.value);
        saveSpellingSettings();
      }, 500);
    });

    function updateWordCount() {
      var words = parseWords(textarea.value);
      var count = words.length;
      countEl.textContent = count === 1 ? '1 word' : count + ' words';
    }
  }

  function setupSpellingTimedToggle() {
    var container = document.getElementById('spelling-timed-toggle');
    var timedBtn = container.querySelector('[data-mode="timed"]');
    var relaxedBtn = container.querySelector('[data-mode="relaxed"]');
    if (!timedBtn || !relaxedBtn) return;

    function updateToggle() {
      timedBtn.classList.toggle('active', spellingSettings.timed);
      relaxedBtn.classList.toggle('active', !spellingSettings.timed);
    }

    updateToggle();

    timedBtn.addEventListener('click', function () {
      spellingSettings.timed = true;
      saveSpellingSettings();
      updateToggle();
      updateGameLinks();
    });

    relaxedBtn.addEventListener('click', function () {
      spellingSettings.timed = false;
      saveSpellingSettings();
      updateToggle();
      updateGameLinks();
    });
  }

  // --- Audio ---

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

  function setupAudioUnlock() {
    var handler = function () {
      AudioManager.unlock();
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('click', handler);
    };
    document.addEventListener('touchstart', handler, { once: true });
    document.addEventListener('click', handler, { once: true });
  }

  // --- Init ---

  function init() {
    currentSubject = getInitialSubject();
    loadSettings();
    setupSubjectPicker();
    setupMathModeToggle();
    setupMathCountButtons();
    setupSpellingWordInput();
    setupSpellingTimedToggle();
    setupAudioToggle();
    setupAudioUnlock();

    // Apply initial subject state (updates title, panels, grid)
    switchSubject(currentSubject);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
