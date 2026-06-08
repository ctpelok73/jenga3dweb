# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Develop / build:**
```bash
npm install
npm run dev          # Vite dev server on http://localhost:5173
npm run build        # production build (terser, manual chunks)
npm run preview      # serve dist/
```

**Tests & verification:**
```bash
npm run test                 # Vitest watch mode
npm run test:run             # Vitest single run (CI mode)
npm run test:e2e             # Playwright; auto-spawns dev server on 127.0.0.1:5173
npm run check:build-budget   # run AFTER `npm run build` — fails if rapier/r3f
                             # chunks leak into index.html or sw.js precache
```

**Single test:**
```bash
npx vitest run src/test/aiController.test.js
npx playwright test tests/e2e/jenga.spec.js --project=desktop   # or --project=mobile
```

Unit tests live in `src/test/` (jsdom env, `src/test/setup.js` clears localStorage per test). E2E lives in `tests/e2e/` with two projects: `desktop` (Chrome) and `mobile` (Pixel 7). `playwright.config.js` reuses an existing dev server if one is already running.

**Environment:** copy `.env.example` to `.env.local`. All `VITE_*` values are optional for development — analytics, ads, Firebase, and payments are gated on real (non-placeholder) values; `VITE_GA_ID=G-XXXXXXXXXX` counts as disabled.

## Architecture

### Layers

1. **UI / state machine** — `src/App.jsx` (top-level component) plus reducer hook `src/hooks/useGameReducer.js`
2. **3D scene** — `src/GameScene.jsx` is a thin lazy boundary; `src/GameSceneWithPhysics.jsx` is the actual Three.js + Rapier scene
3. **Game logic** — `src/aiController.js`, `src/aiControllerAdvanced.js`, `src/physicsOptimizer.js`, `src/towerConfig.js`
4. **Persistence** — `src/{achievements,score,settings,dailyChallenge}Tracker.js` (localStorage)
5. **Services** — `firebaseService`, `analyticsService`, `adService`, `purchaseService`, `shareService`, `soundEngine`

### Data flow

```
App.jsx (state via useGameReducer)
  ├─ blocks: Block[] { id, position, rotation, color, layer }
  ├─ selectedId, phase ∈ { 'start' | 'playing' | 'gameOver' }
  ├─ playerMode: 1 (solo) | 2 (PvP) | 3 (vs AI)
  └─ <GameScene/> (lazy)
       └─ GameSceneWithPhysics  — Three.js + @react-three/rapier
            ├─ <Block/> (memo'd; shared geometry)
            ├─ Physics simulation (fixed timestep)
            └─ ParticleEffect on collapse
```

Turn flow: select block → execute → move block to top → physics runs → stability check → next player (or AI tick).

### Hooks layer (`src/hooks/`)

Game state and side effects live in hooks consumed by `App.jsx`. When changing turn / selection / timer logic, edit these, not App.jsx:

- `useGameReducer.js` — central `useReducer` store. ~25 fields (phase, blocks, selection, simulation, panel toggles, timer values, etc.). Action types include `EXECUTE_MOVE`, `RESET_ROUND`, `INIT_GAME`, `BACK_TO_MENU`, `SET_PHASE`, `SET_AI_THINKING`, `TOGGLE_PANEL`, `INCREMENT_RESTART_KEY`. Action creators (`setPhase`, `setBlocks`, `togglePanel`, …) are exported from the same file — App.jsx imports them as `* as gameActions` and wraps each in a small `useCallback` shim that keeps the legacy `setX(value)` call shape. Newer hooks dispatch directly via `gameActions.*` instead of going through shims. Tutorial-seen state is read from `localStorage['jenga3d_tutorial_done']` on init.
- `useTimers.js` — move-timer countdown + speed-mode total countdown; auto-executes a move on move-timer expiry when a block is selected; calls `onGameOver` on speed-timer expiry. Returns `{moveTimeLeft, speedTimeLeft, startSpeedTimer, clearSpeedTimer}`.
- `useAIPlayer.js` — runs the AI turn when `playerMode===3 && currentPlayer===1 && phase==='playing' && !simulatingBlockIds && !aiThinking`. Delegates choice to `aiControllerAdvanced.chooseAIBlockAdvanced` (or `minimaxAI` on hard difficulty). Owns its own `aiTimersRef` and cancels timers on dependency change — App.jsx must not reach into it. **Known debt:** `aiThinking` is a local `useState` in this hook, but `useGameReducer` also defines `SET_AI_THINKING` and a parallel `aiThinking` field. The reducer field is currently unused; the hook's `useState` is the source of truth. If you reset `aiThinking` from outside the hook (e.g. `resetRoundState`), call the returned `setAiThinking`.
- `useKeyboardNavigation.js` — wires `keyboardController.js` into App; receives action callbacks (`onBlockClick`, `onMakeMove`, `onRestart`, `onBackToMenu`) and panel state, attaches a single `keydown` listener to `window`.
- `useAchievementToasts.js` — owns the toast queue: `timersRef` for active `setTimeout` ids, `showAchievementNotification(unlocks)` to enqueue (3500 ms display, 300 ms gap), `clearToasts()` to cancel pending ones on round reset. Dispatches `gameActions.setAchievementToast` directly. The same `timersRef` is also used by `useGameSimulation` to schedule delayed game-over sound and screen shake — both side effects share one cancellation lifecycle, so a restart wipes everything cleanly.
- `useGameSimulation.js` — owns `handleSimulationComplete`, the largest single side-effect block in the game. Called by `GameSceneWithPhysics` once Rapier reaches a stable state: detects collapse via `isCollapsedBlock`, fires audio / score / achievement / analytics / replay-save / daily-challenge events, swaps players, transitions to `gameOver`. Also exports a pure helper `continueAfterCollapseUpdate(prevBlocks)` used by App.jsx's `handleContinueAfterCollapse` (which stays in App because it needs the function-aware `setBlocks` shim).

### Tower & physics

`src/towerConfig.js` — block geometry uses real Jenga proportions (75×25×15mm scaled): `BLOCK_W=1.5, BLOCK_H=0.3, BLOCK_D=0.5`. Tower is `TOWER_LAYERS=18 × BLOCKS_PER_LAYER=3 = 54 blocks`. `BLOCK_PHYSICS = { mass: 1.0, restitution: 0.01, friction: 0.85, linearDamping: 0.6, angularDamping: 0.8 }` — heavy damping + low restitution intentionally simulates wood-on-wood.

`src/GameSceneWithPhysics.jsx` — each block is a `<RigidBody type={isDynamic ? "dynamic" : "fixed"}>` with a `CuboidCollider`. Only blocks currently being moved or cascading are `dynamic`; everything else is `fixed`. Floor at `y=-0.05`, safety net at `y=-5`, both `type="fixed"`.

### Stability / collapse detection

The collapse check is a **simple Y-coordinate threshold**, not a center-of-mass or tilt calculation. `isCollapsedBlock` (in `src/App.jsx:56`) returns true when:

- `block.position[1] < FALLEN_Y` (FALLEN_Y = -0.5), OR
- For blocks with `layer >= 0`, when `position[1] < expectedY - COLLAPSE_DROP_THRESHOLD`, where `expectedY = layer*(BLOCK_H+LAYER_GAP) + BLOCK_H/2` and `COLLAPSE_DROP_THRESHOLD = (BLOCK_H+LAYER_GAP)*3 ≈ 0.93`

### Lazy loading & build budget

The Rapier WASM, R3F runtime, Three.js, and Firebase are large. They MUST stay out of the initial bundle:

- `App.jsx` lazy-imports `GameScene` (`React.lazy(() => import('./GameScene'))`).
- `vite.config.js` `manualChunks` splits vendors into `react`, `three`, `r3f`, `rapier`, `firebase`.
- `vite-plugin-pwa` workbox config excludes `rapier-*.js` / `r3f-*.js` from precache (`globIgnores`) and runtime-caches them via `CacheFirst` (`heavy-3d-runtime-cache`).
- `scripts/check-build-budget.mjs` enforces both invariants for **all four** heavy chunks (`rapier`, `r3f`, `three`, `firebase`) — it parses `dist/index.html` and `dist/sw.js` and throws if either references them. Run after every `npm run build`.
- **Don't statically import three.js from anything reachable from `App.jsx`.** `src/blockTextureCache.js` exists for exactly this reason — `SettingsPanel` calls `clearTextureCache` on theme change, and the cache + the cleanup live in a no-three module so the THREE chunk doesn't drag into the initial graph. `blockTextures.js` (which does import three) is reachable only via the lazy `GameScene` boundary.

If you add new heavy deps, decide whether they belong in an existing chunk (extend `manualChunks`) or in their own lazy boundary, and update the build-budget script if they should be excluded from precache.

### Performance profiler

`src/performanceProfiler.js` + `src/profilerConsole.js` are loaded by `main.jsx` and expose:

```js
window.profile.start()        // begin sampling
window.profile.stop()         // stop + print
window.profile.stats('physics' | 'rendering' | 'ai' | 'logic' | 'total')
window.profile.report()
window.profile.reset()
```

Measurement marks are wired in `GameSceneWithPhysics.jsx`: `frame_start → frame_total`, `physics_start → physics_check`, `snapshot_start → snapshot`, `cascade_check_start → cascade_check`. Targets and methodology are in `PROFILING.md`. Headless benchmark in `scripts/benchmark.mjs`.

### AI

`src/aiController.js` — basic block selection + drop-slot computation, plus `AI_THINK_DELAY` / `AI_MOVE_DELAY` timing constants. `src/aiControllerAdvanced.js` — `chooseAIBlockAdvanced`, `aiPersonality` (cautious/balanced/aggressive), and `minimaxAI`; difficulty adapts using `getRecentHistory()` from the score tracker.

### Achievements

`src/achievementsExtended.js` defines achievements as `{ id, name, description, icon, condition(stats) }`. `src/achievementsTracker.js` records moves/collapses, evaluates conditions, and persists unlocks under `localStorage['jenga3d_achievements']`. Adding one = appending to the array; if the condition needs a new stat, also extend the tracker.

### Camera & rendering

Orbit camera at `[7, 4, 7]`, target `[0, 2.7, 0]`, FOV 60°, distance clamped to `[2, 15]`. Block geometry is shared (`sharedBlockGeometry` / `sharedEdgesGeometry`) and `Block` is `memo`'d to prevent re-renders during physics ticks.

## Performance targets

- Production bundle: ~800–1000 KB gzipped
- Initial load: <3s on 4G
- Per frame: physics <3ms, rendering <5ms, logic <4ms, AI <2ms (60 FPS budget)

## Notes

- All user data (scores, achievements, settings, tutorial flag) is in `localStorage`. The only optional server sync is the Firebase leaderboard.
- Audio is lazy-loaded and stays muted until the first user interaction (browser autoplay policy).
- Block selection is click-or-keyboard then commit; there is no drag-and-drop.
- The shell on Windows is bash — use `/dev/null` and forward slashes when writing scripts referenced from npm tasks.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
