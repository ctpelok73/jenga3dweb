# CLAUDE.md

This file provides guidance to Claude (claude.ai/code) when working with code in this repository.

## Quick Commands

**Development:**
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build locally
```

**Environment Setup:**
- Copy `.env.example` to `.env.local` for local development
- Firebase config is optional; required only for online leaderboard
- AdSense/Analytics IDs are optional for development

## Architecture Overview

### High-Level Structure

**Jenga 3D** is a React + Three.js 3D game with the following layers:

1. **UI Layer** (`App.jsx`) — Game state machine, player turns, menus
2. **3D Rendering** (`GameScene.jsx` → `GameSceneWithPhysics.jsx`) — Three.js canvas with physics
3. **Game Logic** — Tower generation, block selection, stability checks, AI
4. **Data Persistence** — localStorage for achievements, settings, scores
5. **Services** — Analytics, ads, Firebase, audio, purchases

### Key Data Flow

```
App.jsx (state machine)
  ├─ blocks: Block[] (position, rotation, color, layer)
  ├─ selectedId: number (player selection)
  ├─ phase: 'start' | 'playing' | 'gameOver'
  └─ playerMode: 1 (solo) | 2 (pvp) | 3 (vs AI)
         ↓
    GameScene.jsx (lazy-loaded)
         ↓
    GameSceneWithPhysics.jsx (Three.js + Rapier physics)
         ├─ Block components (memo'd for perf)
         ├─ Physics simulation
         └─ Particle effects
```

### Game State Machine

**Phases:**
- `PHASE_START` — Menu, difficulty selection, tutorial
- `PHASE_PLAYING` — Active game, turn-based moves
- `PHASE_GAME_OVER` — Collapse detected, show score/restart

**Turn Flow:**
1. Player selects block (click or keyboard)
2. Player executes move (button or Enter key)
3. Block moves to top of tower
4. Physics simulation runs
5. Stability check: if tower tilts >threshold → collapse
6. Next player's turn (or AI if applicable)

### Block & Tower Configuration

**File:** `towerConfig.js`
- `BLOCK_W=1.5, BLOCK_H=0.3, BLOCK_D=0.5` — Real Jenga proportions (75mm × 25mm × 15mm scaled)
- `TOWER_LAYERS=18, BLOCKS_PER_LAYER=3` — 54 blocks total
- Layers alternate 90° rotation (X-axis then Z-axis)
- Physics: mass=1.0, friction=0.7, restitution=0.05 (low bounce)

### Component Organization

**Screens** (`src/screens/`) — Full-screen UI panels:
- `StartScreen.jsx` — Menu, difficulty, mode selection
- `GameOverScreen.jsx` — Score, achievements, restart
- `SettingsPanel.jsx` — Audio, graphics, theme
- `AchievementsPanel.jsx` — Unlocked achievements list
- `UIPanel.jsx` — In-game HUD (turn count, player names)

**Components** (`src/components/`) — Reusable UI:
- `LoadingProgressBar.jsx` — WASM/physics engine loading
- `AchievementToast.jsx` — Toast notifications for unlocks
- `ReplayPlayer.jsx` — Replay viewer
- `AchievementProgressBar.jsx` — Progress toward achievements

**Core 3D** (`src/`):
- `GameSceneWithPhysics.jsx` — Block rendering, physics bodies, collision detection
- `Block` component (memo'd) — Individual block with rigid body
- `ParticleEffect.jsx` — Dust/debris on collapse

### Services & Utilities

**Game Logic:**
- `aiController.js` — Basic AI block selection
- `aiControllerAdvanced.js` — Personality-based AI with difficulty adaptation
- `physicsOptimizer.js` — Rapier physics tuning, stability checks
- `towerConfig.js` — Block dimensions, physics constants

**Data Persistence:**
- `achievementsTracker.js` — Unlock tracking, stats (localStorage)
- `achievementsExtended.js` — Achievement definitions with unlock conditions
- `scoreTracker.js` — Best score, total games (localStorage)
- `settingsTracker.js` — Audio, graphics, theme preferences (localStorage)
- `dailyChallengeTracker.js` — Daily challenge seed generation

**External Services:**
- `firebaseService.js` — Online leaderboard (optional)
- `analyticsService.js` — Google Analytics events
- `adService.js` — AdSense integration
- `purchaseService.js` — In-app purchases (Stripe/Gumroad)
- `shareService.js` — Social sharing, replay links
- `soundEngine.js` — Audio playback (select, place, collapse, etc.)

**Input & Mobile:**
- `keyboardController.js` — Keyboard input (arrow keys, Enter, Escape)
- `touchGestureController.js` — Swipe, pinch gestures
- `mobileOptimizations.js` — Device detection, LOD adjustments

**Visuals:**
- `blockTextures.js` — Material properties, environment themes
- `ui.css` — Styling for all UI elements

### Physics & Stability Detection

**File:** `physicsOptimizer.js`

**Stability Check:**
```javascript
// Collapse if:
// 1. Tower center of mass shifts >0.3 units horizontally
// 2. Any block falls >1 unit below expected position
// 3. Tower tilts >0.4 radians (~23°)
```

**Physics Bodies:**
- Static blocks (before move): `RigidBody type=1` (kinematic)
- Moving block: Switched to `type=0` (dynamic) during extraction
- Collision: `CuboidCollider` for each block

### Rendering & Performance

**Optimization Techniques:**
1. **Code Splitting** — `GameSceneWithPhysics` lazy-loaded
2. **Memo'd Components** — `Block` component prevents re-renders
3. **Shared Geometries** — Single `BoxGeometry` for all blocks
4. **Chunk Splitting** (vite.config.js):
   - `react` chunk (React + React-DOM)
   - `three` chunk (Three.js)
   - `r3f` chunk (@react-three/fiber, drei)
   - `rapier` chunk (@react-three/rapier)
   - `firebase` chunk (Firebase)

**Camera & Controls:**
- Orbit camera: position `[7, 4, 7]`, target `[0, 2.7, 0]`
- FOV: 60°, damping enabled for smooth interaction
- Max distance: 15 units, min: 2 units

### Achievement System

**File:** `achievementsExtended.js`

**Unlock Conditions:**
- Achievements are defined with `condition(stats)` functions
- Stats tracked: `totalMoves`, `bestTurns`, `bottomLayerPulls`, `fastMoves`, `streak`, `winStreak`, etc.
- Unlocks trigger `AchievementToast` notifications
- Persisted in localStorage under `jenga3d_achievements`

### AI System

**Basic AI** (`aiController.js`):
- Chooses block based on difficulty (random, safe, risky)
- Computes drop slot (where block lands on tower)

**Advanced AI** (`aiControllerAdvanced.js`):
- Personality types: Cautious, Balanced, Aggressive
- Adapts to player win rate
- Difficulty scaling: Easy, Normal, Hard, Expert

### Build & Deployment

**Vite Configuration** (`vite.config.js`):
- **PWA Support** — Service worker, offline caching
- **Code Splitting** — Manual chunks for vendor libraries
- **Minification** — Terser (production)
- **Target** — ES2020
- **Cache Busting** — Automatic for assets

**Environment Variables** (`.env.local`):
```
VITE_GA_ID              # Google Analytics ID
VITE_ADSENSE_ID         # AdSense publisher ID
VITE_FIREBASE_*         # Firebase config (optional)
VITE_PAYMENT_*          # Payment links (Stripe/Gumroad)
VITE_SITE_URL           # For social sharing
```

## Common Development Tasks

### Adding a New Achievement

1. Define in `achievementsExtended.js`:
```javascript
{
  id: 'new_achievement',
  name: 'Achievement Name',
  description: 'Description',
  icon: '🎯',
  condition: (stats) => stats.totalMoves > 100,
}
```

2. Update stats tracking in `achievementsTracker.js` if needed

3. Achievement unlocks automatically when condition is met

### Modifying Block Physics

Edit `towerConfig.js`:
```javascript
export const BLOCK_PHYSICS = {
  mass: 1.0,           // Block weight
  restitution: 0.05,   // Bounciness
  friction: 0.7,       // Wood-on-wood friction
  linearDamping: 0.4,  // Linear velocity decay
  angularDamping: 0.6, // Rotational velocity decay
};
```

Then adjust stability thresholds in `physicsOptimizer.js` if needed.

### Adding a New Game Mode

1. Add mode constant to `App.jsx`
2. Update `playerMode` state and turn logic
3. Modify `generateThemedTower()` if needed
4. Add UI in `StartScreen.jsx`
5. Update `GameOverScreen.jsx` for mode-specific scoring

### Debugging Physics Issues

1. Enable Rapier debug rendering (in `GameSceneWithPhysics.jsx`):
```javascript
import { Debug } from '@react-three/rapier';
// Add <Debug /> inside <Physics>
```

2. Log block positions/rotations in `useFrame` callback

3. Check `physicsOptimizer.js` for stability thresholds

### Testing on Mobile

1. Run `npm run dev`
2. Get local IP: `ipconfig getifaddr en0` (macOS) or `hostname -I` (Linux)
3. Open `http://<IP>:5173` on mobile device
4. Test touch gestures via `touchGestureController.js`

## Important Notes

- **Physics Simulation:** Rapier runs at fixed timestep (50Hz default). Rendering interpolates for smoothness.
- **Block Selection:** Click/tap selects block; move executes immediately (no drag-and-drop currently).
- **Stability:** Uses simplified heuristics (center of mass, block drop distance, tilt angle), not full rigid body analysis.
- **Persistence:** All user data (scores, achievements, settings) stored in localStorage; no server sync except optional Firebase leaderboard.
- **Audio:** Lazy-loaded; muted on mobile until user interaction (browser policy).
- **Ads:** AdSense integration optional; game works without ads.

## Integration Checklist (from QUICKSTART.md)

Remaining integrations to complete:
- [ ] `touchGestureController` — Already integrated in `App.jsx` (line 97)
- [ ] `mobileOptimizations` — Already integrated in `App.jsx` (line 95)
- [ ] `achievementsExtended` — Already integrated in `achievementsTracker.js` (line 4)
- [ ] `shareService` — Available for `GameOverScreen.jsx` integration
- [ ] `aiControllerAdvanced` — Already integrated in `App.jsx` (line 27)

## File Size & Performance Targets

- Dev bundle: ~2-3 MB (uncompressed)
- Production bundle: ~800-1000 KB (gzipped)
- Initial load: <3s on 4G
- Physics frame: <5ms (60 FPS target)
- Render frame: <5ms (60 FPS target)
