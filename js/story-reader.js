/**
 * Story Reader Module
 * Reads stories aloud with word-by-word highlighting using Web Speech API
 */
const StoryReader = (function() {
  // DOM elements
  let inputPanel, displayPanel, controls;
  let textarea, readBtn, display;
  let playPauseBtn, stopBtn, playPauseIcon;
  let voiceSelect, speedSlider, speedValue;
  let audioToggle, audioIcon;

  // State
  let utterance = null;
  let isPaused = false;
  let isReading = false;
  let currentWordIndex = -1;
  let words = [];
  let wordElements = [];
  let charToWordMap = [];
  let selectedVoice = null;
  let speechRate = 0.9;
  let isMuted = false;

  // Fallback timing for browsers without boundary events
  let wordTimingInterval = null;
  let wordStartTime = 0;
  let boundarySupported = true;

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

  /**
   * Setup available voices
   */
  function setupVoices() {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length === 0) return;

      // Filter to English voices, prefer those with "child" or friendly names
      const englishVoices = voices.filter(v =>
        v.lang.startsWith('en')
      );

      // Sort: prioritize Samantha (friendly), then other en-US, then en-GB
      englishVoices.sort((a, b) => {
        if (a.name.includes('Samantha')) return -1;
        if (b.name.includes('Samantha')) return 1;
        if (a.lang === 'en-US' && b.lang !== 'en-US') return -1;
        if (b.lang === 'en-US' && a.lang !== 'en-US') return 1;
        return a.name.localeCompare(b.name);
      });

      // Clear and repopulate select using DOM methods
      while (voiceSelect.firstChild) {
        voiceSelect.removeChild(voiceSelect.firstChild);
      }

      englishVoices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = voice.name.replace('(Enhanced)', '').trim();
        option.dataset.voiceName = voice.name;
        voiceSelect.appendChild(option);
      });

      // Restore saved voice or use first
      const savedVoiceName = localStorage.getItem(STORAGE_VOICE);
      if (savedVoiceName) {
        const savedOption = Array.from(voiceSelect.options).find(
          opt => opt.dataset.voiceName === savedVoiceName
        );
        if (savedOption) {
          voiceSelect.value = savedOption.value;
        }
      }

      selectedVoice = englishVoices[voiceSelect.value] || englishVoices[0];
    };

    // Voices may load async
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
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
      const voices = speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
      selectedVoice = voices[voiceSelect.value];
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
   * Splits into words and creates character-to-word mapping
   */
  function prepareStory(text) {
    words = [];
    wordElements = [];
    charToWordMap = [];
    clearElement(display);

    let charIndex = 0;

    // Split by whitespace but preserve structure
    const tokens = text.split(/(\s+)/);

    tokens.forEach(token => {
      if (/^\s+$/.test(token)) {
        // Whitespace - add to display and map
        const space = document.createTextNode(token);
        display.appendChild(space);
        for (let i = 0; i < token.length; i++) {
          charToWordMap[charIndex++] = words.length - 1;
        }
      } else if (token.length > 0) {
        // Word - create span
        const span = document.createElement('span');
        span.className = 'story-word';
        span.textContent = token;
        span.dataset.wordIndex = words.length;
        display.appendChild(span);

        words.push(token);
        wordElements.push(span);

        // Map each character to this word
        for (let i = 0; i < token.length; i++) {
          charToWordMap[charIndex++] = words.length - 1;
        }
      }
    });
  }

  /**
   * Start reading the story
   */
  function startReading() {
    const text = textarea.value.trim();
    if (!text) return;

    // Cancel any ongoing speech
    speechSynthesis.cancel();
    clearWordTiming();

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
    boundarySupported = true;
    updatePlayPauseIcon();

    // Create utterance
    utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    utterance.pitch = 1;
    utterance.volume = isMuted ? 0 : 1;

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Word boundary event for highlighting
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        boundarySupported = true;
        const wordIndex = getWordIndexFromCharIndex(event.charIndex);
        if (wordIndex >= 0 && wordIndex < words.length) {
          highlightWord(wordIndex);
        }
      }
    };

    // Start fallback timing after a brief delay to detect boundary support
    utterance.onstart = () => {
      // Give a moment for boundary events to fire
      setTimeout(() => {
        if (currentWordIndex === -1 && words.length > 0) {
          // No boundary events received - use fallback timing
          boundarySupported = false;
          startWordTiming();
        }
      }, 200);
    };

    utterance.onend = () => {
      clearWordTiming();
      isReading = false;
      // Keep last word highlighted briefly, then clear
      setTimeout(() => {
        if (!isReading) {
          clearHighlight();
        }
      }, 500);
    };

    utterance.onerror = (event) => {
      if (event.error !== 'canceled') {
        console.error('Speech error:', event.error);
      }
      clearWordTiming();
      isReading = false;
    };

    // Speak!
    speechSynthesis.speak(utterance);
  }

  /**
   * Get word index from character index
   */
  function getWordIndexFromCharIndex(charIndex) {
    // The charToWordMap directly maps character positions to word indices
    if (charIndex >= 0 && charIndex < charToWordMap.length) {
      return charToWordMap[charIndex];
    }
    // If beyond mapped range, estimate based on position
    return Math.min(
      Math.floor((charIndex / charToWordMap.length) * words.length),
      words.length - 1
    );
  }

  /**
   * Highlight a specific word
   */
  function highlightWord(index) {
    if (index === currentWordIndex) return;

    // Remove previous highlight
    if (currentWordIndex >= 0 && currentWordIndex < wordElements.length) {
      wordElements[currentWordIndex].classList.remove('active');
    }

    // Add new highlight
    currentWordIndex = index;
    if (index >= 0 && index < wordElements.length) {
      wordElements[index].classList.add('active');
      scrollToWord(index);
    }
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
    currentWordIndex = -1;
  }

  /**
   * Start word timing fallback for browsers without boundary events
   */
  function startWordTiming() {
    if (words.length === 0) return;

    // Estimate time per word based on speech rate
    // Average English speech is ~150 words per minute at rate 1.0
    const wordsPerMinute = 150 * speechRate;
    const msPerWord = 60000 / wordsPerMinute;

    wordStartTime = Date.now();
    let estimatedIndex = 0;

    // Highlight first word immediately
    highlightWord(0);

    wordTimingInterval = setInterval(() => {
      if (isPaused || !isReading) return;

      const elapsed = Date.now() - wordStartTime;
      estimatedIndex = Math.floor(elapsed / msPerWord);

      if (estimatedIndex < words.length) {
        highlightWord(estimatedIndex);
      } else {
        clearWordTiming();
      }
    }, 50); // Check frequently for smooth updates
  }

  /**
   * Clear word timing interval
   */
  function clearWordTiming() {
    if (wordTimingInterval) {
      clearInterval(wordTimingInterval);
      wordTimingInterval = null;
    }
  }

  /**
   * Toggle play/pause
   */
  function togglePlayPause() {
    if (!isReading) {
      // Restart from beginning
      startReading();
      return;
    }

    if (isPaused) {
      // Resume
      speechSynthesis.resume();
      isPaused = false;
    } else {
      // Pause
      speechSynthesis.pause();
      isPaused = true;
    }

    updatePlayPauseIcon();
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
    clearWordTiming();
    isReading = false;
    isPaused = false;

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

    // Update current utterance volume if playing
    if (utterance && isReading) {
      // Can't change volume mid-utterance, so we just track state
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
