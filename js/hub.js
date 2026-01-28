/**
 * Hub page logic - Subject selection, audio toggle, settings migration.
 */

(function () {
  // Shared settings (audio only — question count lives on math page)
  let settings = {
    muted: false,
  };

  // --- Settings migration from old format ---
  function migrateOldSettings() {
    try {
      const old = localStorage.getItem('mathfun-settings');
      if (!old) return;

      const parsed = JSON.parse(old);

      // Extract shared settings (audio)
      const shared = {
        muted: parsed.muted || false,
      };
      localStorage.setItem('avagames-settings', JSON.stringify(shared));

      // Extract math-specific settings (mode + question count)
      const math = {
        mode: parsed.mode || 'type',
        questionCount: parsed.questionCount || 10,
      };
      localStorage.setItem('avagames-math', JSON.stringify(math));

      // Remove old key
      localStorage.removeItem('mathfun-settings');
    } catch (e) {
      // Ignore migration errors
    }
  }

  function loadSettings() {
    try {
      const saved = localStorage.getItem('avagames-settings');
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
      localStorage.setItem('avagames-settings', JSON.stringify(settings));
    } catch (e) {
      // Ignore storage errors
    }
  }

  // Setup audio toggle
  function setupAudioToggle() {
    var btn = document.getElementById('audio-toggle');
    var icon = document.getElementById('audio-icon');

    function updateIcon() {
      icon.textContent = settings.muted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
      btn.classList.toggle('muted', settings.muted);
      AudioManager.setMuted(settings.muted);
    }

    updateIcon();

    btn.addEventListener('click', function () {
      settings.muted = !settings.muted;
      saveSettings();
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
    migrateOldSettings();
    loadSettings();
    setupAudioToggle();
    setupAudioUnlock();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
