/**
 * Audio Manager - Handles audio playback, preloading, and iPad Safari audio unlock.
 */

const AudioManager = (() => {
  let audioContext = null;
  let unlocked = false;
  let muted = false;
  const cache = new Map(); // audioKey -> AudioBuffer
  const audioElements = new Map(); // audioKey -> HTMLAudioElement (fallback)

  /**
   * Initialize the audio context. Must be called from a user gesture on iOS.
   */
  function init() {
    if (audioContext) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // iOS Safari requires resuming the context from a user gesture
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    unlocked = true;
  }

  /**
   * Unlock audio on iOS Safari. Call this from the first user tap/click.
   */
  function unlock() {
    if (unlocked && audioContext && audioContext.state === 'running') return;
    init();

    // Play a silent buffer to unlock
    if (audioContext) {
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
    }
    unlocked = true;
  }

  /**
   * Build the audio file path for a question or answer clip.
   */
  function getAudioPath(audioKey, type) {
    // type: 'questions' or 'answers'
    return `audio/${type}/${audioKey}.mp3`;
  }

  /**
   * Preload an audio clip into cache.
   */
  async function preload(audioKey, type) {
    const path = getAudioPath(audioKey, type);
    const cacheKey = `${type}/${audioKey}`;

    if (cache.has(cacheKey)) return;

    try {
      if (audioContext) {
        const response = await fetch(path);
        if (!response.ok) return;
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        cache.set(cacheKey, audioBuffer);
      }
    } catch (e) {
      // Audio file may not exist yet - that's OK during development
      console.warn(`Could not preload audio: ${path}`, e);
    }
  }

  /**
   * Preload a batch of audio clips for upcoming questions.
   */
  async function preloadBatch(questions, startIndex, count = 5) {
    const end = Math.min(startIndex + count, questions.length);
    const promises = [];
    for (let i = startIndex; i < end; i++) {
      const q = questions[i];
      promises.push(preload(q.audioKey, 'questions'));
      promises.push(preload(q.audioKey, 'answers'));
    }
    await Promise.all(promises);
  }

  /**
   * Play an audio clip. Returns a promise that resolves when playback ends.
   */
  function play(audioKey, type) {
    if (muted) return Promise.resolve();

    const cacheKey = `${type}/${audioKey}`;

    if (audioContext && cache.has(cacheKey)) {
      return new Promise((resolve) => {
        const source = audioContext.createBufferSource();
        source.buffer = cache.get(cacheKey);
        source.connect(audioContext.destination);
        source.onended = resolve;
        source.start(0);
      });
    }

    // Fallback: use HTMLAudioElement
    const path = getAudioPath(audioKey, type);
    return new Promise((resolve) => {
      const audio = new Audio(path);
      audio.onended = resolve;
      audio.onerror = resolve; // Don't block game if audio fails
      audio.play().catch(resolve);
    });
  }

  /**
   * Play a question audio clip ("five plus five equals...").
   */
  function playQuestion(audioKey) {
    return play(audioKey, 'questions');
  }

  /**
   * Play an answer audio clip ("five plus five equals ten").
   */
  function playAnswer(audioKey) {
    return play(audioKey, 'answers');
  }

  /**
   * Play a sound effect.
   */
  function playSfx(name) {
    if (muted) return Promise.resolve();
    const path = `audio/sfx/${name}.mp3`;
    return new Promise((resolve) => {
      const audio = new Audio(path);
      audio.onended = resolve;
      audio.onerror = resolve;
      audio.play().catch(resolve);
    });
  }

  /**
   * Set mute state.
   */
  function setMuted(state) {
    muted = state;
  }

  function isMuted() {
    return muted;
  }

  return {
    init,
    unlock,
    preload,
    preloadBatch,
    play,
    playQuestion,
    playAnswer,
    playSfx,
    setMuted,
    isMuted,
  };
})();
