/**
 * Word Audio Manager - Web Speech API wrapper for word pronunciation.
 * Works alongside AudioManager (which handles SFX).
 * Uses SpeechSynthesis for zero-asset word pronunciation.
 */

const WordAudioManager = (() => {

  var speechSupported = 'speechSynthesis' in window;
  var preferredVoice = null;
  var voicesLoaded = false;
  var rate = 0.85; // slightly slower for kids
  var muted = false;

  /**
   * Initialize - load preferred voice.
   */
  function init() {
    if (!speechSupported) return;

    // Voices may load asynchronously (especially on Chrome)
    function loadVoices() {
      var voices = speechSynthesis.getVoices();
      if (voices.length === 0) return;
      voicesLoaded = true;

      // Prefer a female English voice (more common for kids' apps)
      var englishVoices = voices.filter(function (v) {
        return v.lang.indexOf('en') === 0;
      });

      // Look for Samantha (iOS) or a Google voice first
      for (var i = 0; i < englishVoices.length; i++) {
        var name = englishVoices[i].name.toLowerCase();
        if (name.indexOf('samantha') !== -1 || name.indexOf('google us') !== -1) {
          preferredVoice = englishVoices[i];
          return;
        }
      }

      // Fallback to first English voice
      if (englishVoices.length > 0) {
        preferredVoice = englishVoices[0];
      }
    }

    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  /**
   * Speak a word using SpeechSynthesis.
   * Returns a Promise that resolves when speech finishes.
   */
  function speakWord(word, options) {
    options = options || {};
    if (muted || !speechSupported) return Promise.resolve();

    return new Promise(function (resolve) {
      // Cancel any in-progress speech
      speechSynthesis.cancel();

      var utterance = new SpeechSynthesisUtterance(word);
      utterance.rate = options.rate || rate;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = resolve;
      utterance.onerror = resolve; // Don't block game on speech error

      speechSynthesis.speak(utterance);
    });
  }

  /**
   * Sanitize a word for audio filename lookup.
   * Must match the sanitization in generate-spelling-audio.js.
   */
  function sanitizeFilename(word) {
    return word.toLowerCase().replace(/'/g, '').replace(/\s+/g, '_');
  }

  /**
   * Try to play a pre-recorded audio file. Returns a promise that
   * resolves on success and rejects if the file doesn't exist.
   */
  function tryRecordedAudio(filename, type) {
    return new Promise(function (resolve, reject) {
      var audio = new Audio('audio/' + type + '/' + filename + '.mp3');
      audio.oncanplaythrough = function () {
        audio.onended = resolve;
        audio.play().catch(reject);
      };
      audio.onerror = reject;
    });
  }

  /**
   * Pronounce a word from a question object.
   * Tries pre-recorded audio first, falls back to SpeechSynthesis.
   */
  function pronounceWord(questionObj) {
    if (muted) return Promise.resolve();

    var filename = sanitizeFilename(questionObj.word);
    return tryRecordedAudio(filename, 'words').catch(function () {
      return speakWord(questionObj.word);
    });
  }

  /**
   * Spell out a word letter by letter.
   * Tries pre-recorded letter audio, falls back to SpeechSynthesis.
   * Returns a Promise that resolves when all letters are spoken.
   */
  function spellWord(word) {
    if (muted) return Promise.resolve();

    var letters = word.split('');
    var index = 0;

    return new Promise(function (resolve) {
      function speakNext() {
        if (index >= letters.length) {
          resolve();
          return;
        }
        var letter = letters[index];
        index++;

        // Try pre-recorded letter audio, fall back to SpeechSynthesis
        tryRecordedAudio(letter.toLowerCase(), 'letters').catch(function () {
          return speakWord(letter, { rate: 1.0 });
        }).then(function () {
          setTimeout(speakNext, 150);
        });
      }
      speakNext();
    });
  }

  /**
   * Set mute state.
   */
  function setMuted(state) {
    muted = state;
    if (muted && speechSupported) {
      speechSynthesis.cancel();
    }
  }

  function isMuted() {
    return muted;
  }

  /**
   * Check if speech synthesis is available.
   */
  function isSupported() {
    return speechSupported;
  }

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    init: init,
    speakWord: speakWord,
    pronounceWord: pronounceWord,
    spellWord: spellWord,
    setMuted: setMuted,
    isMuted: isMuted,
    isSupported: isSupported,
  };

})();
