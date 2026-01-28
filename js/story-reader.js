/**
 * Story Reader Module
 * Reads stories aloud with word-by-word highlighting using Web Speech API
 * Uses word-by-word speaking for perfect sync
 */
const StoryReader = (function() {
  // DOM elements
  let inputPanel, displayPanel, controls;
  let textarea, readBtn, display;
  let playPauseBtn, stopBtn, playPauseIcon;
  let voiceSelect, speedSlider, speedValue;
  let audioToggle, audioIcon;

  // State
  let isPaused = false;
  let isReading = false;
  let currentWordIndex = -1;
  let words = [];
  let wordElements = [];
  let selectedVoice = null;
  let speechRate = 0.9;
  let isMuted = false;

  // Storage keys
  const STORAGE_DRAFT = 'avagames-story-draft';
  const STORAGE_VOICE = 'avagames-story-voice';
  const STORAGE_SPEED = 'avagames-story-speed';

  /**
   * Initialize the Story Reader
   */
  function init() {
    cacheDOM();
    loadSettings();
    setupVoices();
    bindEvents();
    loadDraft();
    updateReadButton();
  }

  /**
   * Cache DOM element references
   */
  function cacheDOM() {
    inputPanel = document.getElementById('story-input-panel');
    displayPanel = document.getElementById('story-display-panel');
    controls = document.getElementById('story-controls');
    textarea = document.getElementById('story-textarea');
    readBtn = document.getElementById('story-read-btn');
    display = document.getElementById('story-display');
    playPauseBtn = document.getElementById('story-play-pause-btn');
    stopBtn = document.getElementById('story-stop-btn');
    playPauseIcon = document.getElementById('play-pause-icon');
    voiceSelect = document.getElementById('voice-select');
    speedSlider = document.getElementById('speed-slider');
    speedValue = document.getElementById('speed-value');
    audioToggle = document.getElementById('audio-toggle');
    audioIcon = document.getElementById('audio-icon');
  }

  /**
   * Load saved settings from localStorage
   */
  function loadSettings() {
    const savedSpeed = localStorage.getItem(STORAGE_SPEED);
    if (savedSpeed) {
      speechRate = parseFloat(savedSpeed);
      speedSlider.value = speechRate;
      speedValue.textContent = speechRate + 'x';
    }

    // Load mute state from AudioManager if available
    if (window.AudioManager) {
      isMuted = AudioManager.isMuted();
      updateMuteUI();
    }
  }

  // Store available voices for lookup
  let availableVoices = [];

  /**
   * Get display name for a voice (strip quality tags)
   */
  function getVoiceDisplayName(voice) {
    return voice.name
      .replace(/\s*\(Enhanced\)\s*/i, '')
      .replace(/\s*\(Premium\)\s*/i, '')
      .trim();
  }

  /**
   * Setup available voices
   */
  function setupVoices() {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length === 0) return;

      // Filter to English Premium/Enhanced voices only
      const englishVoices = voices.filter(v =>
        v.lang.startsWith('en') &&
        (v.name.includes('Premium') || v.name.includes('Enhanced'))
      );

      // If no premium/enhanced found, fall back to all English voices
      if (englishVoices.length === 0) {
        availableVoices = voices.filter(v => v.lang.startsWith('en'));
        populateVoiceSelect(availableVoices, false);
        return;
      }

      // Deduplicate: if same voice exists as both Premium and Enhanced, keep only Premium
      const voiceMap = new Map();
      englishVoices.forEach(voice => {
        const baseName = getVoiceDisplayName(voice);
        const existing = voiceMap.get(baseName);

        // Keep this voice if no existing, or if this one is Premium (better than Enhanced)
        if (!existing || voice.name.includes('Premium')) {
          voiceMap.set(baseName, voice);
        }
      });

      // Separate into Premium and Enhanced groups
      const allVoices = Array.from(voiceMap.values());
      const premiumVoices = allVoices
        .filter(v => v.name.includes('Premium'))
        .sort((a, b) => getVoiceDisplayName(a).localeCompare(getVoiceDisplayName(b)));
      const enhancedVoices = allVoices
        .filter(v => v.name.includes('Enhanced'))
        .sort((a, b) => getVoiceDisplayName(a).localeCompare(getVoiceDisplayName(b)));

      // Combine: Premium first (best), then Enhanced
      availableVoices = [...premiumVoices, ...enhancedVoices];

      populateVoiceSelect(availableVoices, true, premiumVoices.length, enhancedVoices.length);
    };

    // Voices may load async
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }

  /**
   * Populate the voice select dropdown
   * @param {Array} voices - Array of voice objects
   * @param {boolean} useGroups - Whether to use optgroup sections
   * @param {number} premiumCount - Number of premium voices (for grouping)
   * @param {number} enhancedCount - Number of enhanced voices (for grouping)
   */
  function populateVoiceSelect(voices, useGroups, premiumCount = 0, enhancedCount = 0) {
    // Clear existing options
    while (voiceSelect.firstChild) {
      voiceSelect.removeChild(voiceSelect.firstChild);
    }

    if (useGroups && (premiumCount > 0 || enhancedCount > 0)) {
      let currentIndex = 0;

      // Premium voices section (best quality)
      if (premiumCount > 0) {
        const premiumGroup = document.createElement('optgroup');
        premiumGroup.label = '⭐ Best Quality';

        for (let i = 0; i < premiumCount; i++) {
          const voice = voices[currentIndex];
          const option = document.createElement('option');
          option.value = currentIndex;
          option.textContent = getVoiceDisplayName(voice);
          option.dataset.voiceName = voice.name;
          premiumGroup.appendChild(option);
          currentIndex++;
        }

        voiceSelect.appendChild(premiumGroup);
      }

      // Enhanced voices section (good quality)
      if (enhancedCount > 0) {
        const enhancedGroup = document.createElement('optgroup');
        enhancedGroup.label = '✓ Good Quality';

        for (let i = 0; i < enhancedCount; i++) {
          const voice = voices[currentIndex];
          const option = document.createElement('option');
          option.value = currentIndex;
          option.textContent = getVoiceDisplayName(voice);
          option.dataset.voiceName = voice.name;
          enhancedGroup.appendChild(option);
          currentIndex++;
        }

        voiceSelect.appendChild(enhancedGroup);
      }
    } else {
      // No grouping - just list all voices
      voices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = getVoiceDisplayName(voice);
        option.dataset.voiceName = voice.name;
        voiceSelect.appendChild(option);
      });
    }

    // Restore saved voice or use first
    const savedVoiceName = localStorage.getItem(STORAGE_VOICE);
    if (savedVoiceName) {
      const savedOption = Array.from(voiceSelect.querySelectorAll('option')).find(
        opt => opt.dataset.voiceName === savedVoiceName
      );
      if (savedOption) {
        voiceSelect.value = savedOption.value;
      }
    }

    selectedVoice = availableVoices[voiceSelect.value] || availableVoices[0];
  }

  /**
   * Bind event listeners
   */
  function bindEvents() {
    // Text input
    textarea.addEventListener('input', () => {
      saveDraft();
      updateReadButton();
    });

    // Read button
    readBtn.addEventListener('click', startReading);

    // Playback controls
    playPauseBtn.addEventListener('click', togglePlayPause);
    stopBtn.addEventListener('click', stopReading);

    // Voice selection
    voiceSelect.addEventListener('change', () => {
      selectedVoice = availableVoices[voiceSelect.value];
      localStorage.setItem(STORAGE_VOICE, selectedVoice?.name || '');
    });

    // Speed slider
    speedSlider.addEventListener('input', () => {
      speechRate = parseFloat(speedSlider.value);
      speedValue.textContent = speechRate + 'x';
      localStorage.setItem(STORAGE_SPEED, speechRate);
    });

    // Audio toggle
    audioToggle.addEventListener('click', toggleMute);

    // iOS requires user interaction to unlock speech
    document.addEventListener('touchstart', unlockSpeech, { once: true });
    document.addEventListener('click', unlockSpeech, { once: true });
  }

  /**
   * Unlock speech synthesis on iOS (requires user gesture)
   */
  function unlockSpeech() {
    const unlock = new SpeechSynthesisUtterance('');
    unlock.volume = 0;
    speechSynthesis.speak(unlock);
  }

  /**
   * Save current draft to localStorage
   */
  function saveDraft() {
    localStorage.setItem(STORAGE_DRAFT, textarea.value);
  }

  /**
   * Load draft from localStorage
   */
  function loadDraft() {
    const draft = localStorage.getItem(STORAGE_DRAFT);
    if (draft) {
      textarea.value = draft;
    }
  }

  /**
   * Update the Read button state based on text content
   */
  function updateReadButton() {
    const hasText = textarea.value.trim().length > 0;
    readBtn.disabled = !hasText;
  }

  /**
   * Clear all children from an element safely
   */
  function clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  /**
   * Prepare the story text for display
   * Splits into words and creates spans for each
   */
  function prepareStory(text) {
    words = [];
    wordElements = [];
    clearElement(display);

    // Split by whitespace but preserve structure
    const tokens = text.split(/(\s+)/);

    tokens.forEach(token => {
      if (/^\s+$/.test(token)) {
        // Whitespace - add to display
        const space = document.createTextNode(token);
        display.appendChild(space);
      } else if (token.length > 0) {
        // Word - create span
        const span = document.createElement('span');
        span.className = 'story-word';
        span.textContent = token;
        span.dataset.wordIndex = words.length;
        display.appendChild(span);

        words.push(token);
        wordElements.push(span);
      }
    });
  }

  /**
   * Get pause duration after a word based on punctuation
   * Returns milliseconds to wait before next word
   */
  function getPauseAfterWord(word) {
    const lastChar = word.slice(-1);

    // Longer pause after sentence-ending punctuation
    if ('.!?'.includes(lastChar)) {
      return 300 / speechRate;
    }
    // Medium pause after commas, semicolons, colons
    if (',;:'.includes(lastChar)) {
      return 150 / speechRate;
    }
    // Short pause between regular words
    return 50 / speechRate;
  }

  /**
   * Start reading the story
   */
  function startReading() {
    const text = textarea.value.trim();
    if (!text) return;

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    // Prepare display
    prepareStory(text);

    // Switch to reading mode
    inputPanel.classList.add('hidden');
    displayPanel.classList.remove('hidden');
    controls.classList.remove('hidden');

    // Reset state
    currentWordIndex = -1;
    isPaused = false;
    isReading = true;
    updatePlayPauseIcon();

    // Start speaking word by word
    speakNextWord();
  }

  /**
   * Speak the next word in the sequence
   */
  function speakNextWord() {
    // Check if we should stop
    if (!isReading || isPaused) {
      return;
    }

    // Move to next word
    currentWordIndex++;

    // Check if we're done
    if (currentWordIndex >= words.length) {
      finishReading();
      return;
    }

    // Highlight current word
    highlightWord(currentWordIndex);

    // Get the word to speak (strip punctuation for cleaner speech)
    const word = words[currentWordIndex];
    const cleanWord = word.replace(/[^\w']/g, '') || word;

    // Create utterance for this word
    const utterance = new SpeechSynthesisUtterance(cleanWord);
    utterance.rate = speechRate;
    utterance.pitch = 1;
    utterance.volume = isMuted ? 0 : 1;

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // When word finishes, pause briefly then speak next
    utterance.onend = () => {
      if (!isReading || isPaused) return;

      const pauseDuration = getPauseAfterWord(word);
      setTimeout(() => {
        speakNextWord();
      }, pauseDuration);
    };

    utterance.onerror = (event) => {
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        console.error('Speech error:', event.error);
      }
      // Try to continue even on error
      if (isReading && !isPaused) {
        setTimeout(() => speakNextWord(), 100);
      }
    };

    // Speak the word
    speechSynthesis.speak(utterance);
  }

  /**
   * Finish reading - called when all words are done
   */
  function finishReading() {
    isReading = false;
    updatePlayPauseIcon();

    // Keep last word highlighted briefly, then clear
    setTimeout(() => {
      if (!isReading) {
        clearHighlight();
      }
    }, 1000);
  }

  /**
   * Highlight a specific word
   */
  function highlightWord(index) {
    // Remove previous highlight
    if (currentWordIndex >= 0 && currentWordIndex < wordElements.length &&
        currentWordIndex !== index) {
      // Don't remove if it's the same word
    }
    wordElements.forEach((el, i) => {
      if (i === index) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Scroll to keep highlighted word visible
    scrollToWord(index);
  }

  /**
   * Scroll to keep highlighted word visible
   */
  function scrollToWord(index) {
    const wordEl = wordElements[index];
    if (!wordEl) return;

    const container = displayPanel;
    const wordRect = wordEl.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Check if word is below visible area
    if (wordRect.bottom > containerRect.bottom - 20) {
      container.scrollTop += wordRect.bottom - containerRect.bottom + 40;
    }
    // Check if word is above visible area
    else if (wordRect.top < containerRect.top + 20) {
      container.scrollTop -= containerRect.top - wordRect.top + 40;
    }
  }

  /**
   * Clear all word highlights
   */
  function clearHighlight() {
    wordElements.forEach(el => el.classList.remove('active'));
  }

  /**
   * Toggle play/pause
   */
  function togglePlayPause() {
    if (!isReading && currentWordIndex >= words.length - 1) {
      // Finished - restart from beginning
      currentWordIndex = -1;
      isReading = true;
      isPaused = false;
      updatePlayPauseIcon();
      speakNextWord();
      return;
    }

    if (!isReading) {
      // Start fresh
      startReading();
      return;
    }

    if (isPaused) {
      // Resume - continue from current word
      isPaused = false;
      updatePlayPauseIcon();
      speakNextWord();
    } else {
      // Pause
      speechSynthesis.cancel();
      isPaused = true;
      updatePlayPauseIcon();
    }
  }

  /**
   * Update play/pause button icon
   */
  function updatePlayPauseIcon() {
    if (isPaused || !isReading) {
      playPauseIcon.textContent = '\u25B6\uFE0F'; // Play
      playPauseBtn.classList.add('paused');
    } else {
      playPauseIcon.textContent = '\u23F8\uFE0F'; // Pause
      playPauseBtn.classList.remove('paused');
    }
  }

  /**
   * Stop reading and return to input mode
   */
  function stopReading() {
    speechSynthesis.cancel();
    isReading = false;
    isPaused = false;
    currentWordIndex = -1;

    // Switch back to input mode
    displayPanel.classList.add('hidden');
    controls.classList.add('hidden');
    inputPanel.classList.remove('hidden');

    updatePlayPauseIcon();
  }

  /**
   * Toggle mute state
   */
  function toggleMute() {
    isMuted = !isMuted;

    // Update AudioManager if available
    if (window.AudioManager) {
      AudioManager.setMuted(isMuted);
    }

    updateMuteUI();
  }

  /**
   * Update mute button UI
   */
  function updateMuteUI() {
    if (isMuted) {
      audioIcon.textContent = '\uD83D\uDD07'; // Muted speaker
      audioToggle.classList.add('muted');
    } else {
      audioIcon.textContent = '\uD83D\uDD0A'; // Speaker with sound
      audioToggle.classList.remove('muted');
    }
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API
  return {
    startReading,
    stopReading,
    togglePlayPause
  };
})();
