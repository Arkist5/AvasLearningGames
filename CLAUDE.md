# Ava's Learning Games

Educational games for Ava, built as a vanilla JS progressive web app (PWA) with offline support. Kid-friendly interface optimized for mobile/tablet. Supports multiple subjects (math, spelling).

## Tech Stack

- **Frontend:** Vanilla JavaScript (no frameworks/dependencies), HTML5, CSS3
- **Phaser 3:** CDN-loaded for complex 2D games (Santa's Delivery); most games are vanilla-only
- **Audio:** Web Audio API with HTMLAudioElement fallback; Web Speech API for word pronunciation
- **Offline:** Service Worker with cache-first strategy (also caches CDN resources)
- **Fonts:** Fredoka One (display), Nunito (body)
- **Storage:** LocalStorage for user preferences and spelling word lists

## Architecture

Games follow a modular pattern with shared core systems:

### Math Games
- **MathEngine** (`js/math-engine.js`) - Question generation, session management, progression, checkpoint system
- **AudioManager** (`js/audio-manager.js`) - Audio playback, preloading, iOS unlock, mute persistence
- **GameBase** (`js/game-base.js`) - Shared HUD, input modes (type/choice), feedback overlays, timer system

### Spelling Games
- **SpellingEngine** (`js/spelling-engine.js`) - Word question generation, per-letter validation, distractor generation
- **WordAudioManager** (`js/word-audio-manager.js`) - Web Speech API wrapper for word pronunciation
- **SpellingGameBase** (`js/spelling-game-base.js`) - HUD, letter input (scramble tiles / QWERTY keyboard), presentation modes

### Shared
- **Games** (`js/games/`) - Individual game implementations using IIFE module pattern

### Hybrid Architecture (Phaser + DOM)

Some games (e.g., Santa's Delivery) use Phaser 3 for scene rendering while keeping HUD and input as DOM elements. Phaser is loaded dynamically from CDN only when needed:

```
game.html
├── #game-hud-container (DOM) ← SpellingGameBase builds HUD
├── #game-scene              ← Phaser canvas renders here
└── #game-input-container    ← SpellingGameBase builds letter input (DOM)
```

Phaser games are listed in `PHASER_GAMES` array in `game.html`. The CDN script is loaded dynamically before launching the game.

### Adding a New Math Game

1. Create `js/games/your-game.js` implementing `start(container, options)` and `destroy()`
2. Create `css/your-game.css` for game-specific styles
3. Register in the game map in `game.html` and the game registry in `js/math-app.js`
4. Use `GameBase.init()` to get HUD, input, and math engine integration for free

### Adding a New Spelling Game

1. Create `js/games/your-game.js` implementing `start(options)` and `destroy()`
2. Create CSS file for game-specific styles
3. Register in `game.html` launch logic and in `js/spelling-app.js` GAMES array
4. Use `SpellingGameBase.init()` for HUD, letter input, and spelling engine integration
5. If using Phaser, add game ID to `PHASER_GAMES` array in `game.html`

### Game Launch Flow

Games launch via `game.html` with URL params:
- Math: `?game=animal-crossing&mode=type&count=20`
- Spelling: `?game=santa-delivery&subject=spelling&difficulty=easy&presentation=audio-picture`

## Project Structure

```
js/
  math-app.js           # Math page logic & game registry
  spelling-app.js       # Spelling page logic & game registry
  math-engine.js        # Core math engine
  spelling-engine.js    # Core spelling engine
  audio-manager.js      # Audio system (SFX, question/answer audio)
  word-audio-manager.js # Web Speech API for word pronunciation
  game-base.js          # Shared math game framework
  spelling-game-base.js # Shared spelling game framework
  games/                # Individual game implementations
css/                    # Global + per-game stylesheets
audio/
  questions/            # 100 question audio files (e.g. "3_plus_5.mp3")
  answers/              # 100 answer audio files
  sfx/                  # Sound effects (correct.mp3, wrong.mp3)
```

## Design Conventions

- CSS custom properties for theming (defined in `css/styles.css`)
- IIFE module pattern for all JS modules
- Touch-optimized with no tap highlight, scale feedback on press
- Responsive portrait/landscape layouts
- All games must work offline after first load

## Current Games

| Game | File | Subject | Mechanic |
|------|------|---------|----------|
| Animal Crossing | `animal-crossing.js` | Math | Lives + checkpoints, help animals cross a road |
| Breakfast Helper | `breakfast-helper.js` | Math | Timer-based, cook food before time runs out |
| Santa's Delivery | `santa-delivery.js` + `santa-scene.js` | Spelling | Timer-based Phaser game, spell words to deliver presents |

## Engine Details

### Math Engine
- Generates addition problems (0-9 range by default)
- Checkpoint every 5 questions (lives restore)
- Multiple choice generates 3 distinct options near correct answer
- `submitAnswer()` for turn-based, `advanceQuestion()` for timer-based games

### Spelling Engine
- Loads words from `avagames-spelling` localStorage (falls back to built-in defaults)
- Per-letter validation via `submitLetter()` for real-time feedback
- `generateDistractors()` adds 1-2 extra letters for scrambled tile mode
- `submitAnswer()` for full-word comparison, `advanceQuestion()` for timer expiry
- Emoji lookup map for ~100 common kids' words
