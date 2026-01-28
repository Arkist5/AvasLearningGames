/**
 * Spelling page logic - Game grid (all locked), word input.
 * Reads shared settings from avagames-settings, spelling settings from avagames-spelling.
 */

(function () {
  var GAMES = [
    { id: 'word-builder', name: 'Word Builder', icon: '\uD83E\uDDE9', playable: false },
    { id: 'letter-rain', name: 'Letter Rain', icon: '\uD83C\uDF27\uFE0F', playable: false },
    { id: 'spell-garden', name: 'Spell Garden', icon: '\uD83C\uDF3B', playable: false },
    { id: 'word-rescue', name: 'Word Rescue', icon: '\uD83D\uDE80', playable: false },
    { id: 'bee-speller', name: 'Bee Speller', icon: '\uD83D\uDC1D', playable: false },
    { id: 'letter-chef', name: 'Letter Chef', icon: '\uD83D\uDC68\u200D\uD83C\uDF73', playable: false },
    { id: 'word-train', name: 'Word Train', icon: '\uD83D\uDE82', playable: false },
    { id: 'spell-castle', name: 'Spell Castle', icon: '\uD83C\uDFF0', playable: false },
  ];

  // Settings
  var sharedSettings = { muted: false };
  var spellingSettings = { words: [] };

  function loadSettings() {
    try {
      var saved = localStorage.getItem('avagames-settings');
      if (saved) {
        var parsed = JSON.parse(saved);
        sharedSettings = { muted: parsed.muted || false };
      }
    } catch (e) {}

    try {
      var saved = localStorage.getItem('avagames-spelling');
      if (saved) {
        var parsed = JSON.parse(saved);
        spellingSettings = {
          words: parsed.words || [],
        };
      }
    } catch (e) {}
  }

  function saveSpellingSettings() {
    try {
      localStorage.setItem('avagames-spelling', JSON.stringify(spellingSettings));
    } catch (e) {}
  }

  // Parse words from text — one per line, trimmed, deduplicated, non-empty
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

  // Build game grid
  function buildGameGrid() {
    var grid = document.getElementById('spelling-game-grid');
    grid.textContent = '';

    GAMES.forEach(function (game) {
      var card = document.createElement('a');
      card.className = 'subject-game-card ' + (game.playable ? 'playable' : 'locked');

      if (game.playable) {
        card.href = 'game.html?game=' + game.id + '&subject=spelling';
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

  // Setup word input
  function setupWordInput() {
    var textarea = document.getElementById('spelling-word-input');
    var countEl = document.getElementById('spelling-word-count');

    // Populate from saved words
    if (spellingSettings.words.length > 0) {
      textarea.value = spellingSettings.words.join('\n');
    }
    updateWordCount();

    // Save on input (debounced)
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
    setupWordInput();
    setupAudioToggle();
    setupAudioUnlock();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
