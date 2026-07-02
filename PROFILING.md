# Performance Profiling Guide — Jenga 3D

## Architecture

The profiler is plumbed in three places:

- **`src/performanceProfiler.js`** — `profiler` instance. Tracks avg, max, p95, sample count per system (`physics`, `rendering`, `ai`, `logic`, `total`). Up to 300 samples (~5 s at 60 fps). Zero overhead when disabled.
- **`src/profilerConsole.js`** — exposes `window.profile.{start, stop, report, stats, reset, gpu}`. Auto-loaded by `main.jsx` in dev mode. Also exports `initGPUProfiler(renderer)` to wire up the GPU profiler.
- **`src/GameSceneWithPhysics.jsx`** — `useFrame` is instrumented with these marks:
  - `frame_start` → `frame_total` — overall frame time
  - `physics_start` → `physics_check` — physics update
  - `snapshot_start` → `snapshot` — block-state snapshot
  - `cascade_check_start` → `cascade_check` — cascade detection

The bundle cost when profiling is disabled is ~2 KB gzipped.

## Quick Start (Browser DevTools)

1. **Run dev server:**
   ```bash
   npm run dev
   ```

2. **Open browser DevTools** (F12)

3. **In Console tab**, run:
   ```javascript
   window.profile.start()
   ```

4. **Play the game:**
   - Start a game
   - Extract 3-5 blocks (this triggers physics simulation)
   - Let tower settle

5. **Stop profiling:**
   ```javascript
   window.profile.stop()
   ```

6. **View report:**
   ```javascript
   window.profile.report()  // Full breakdown
   window.profile.stats('physics')  // Physics only
   window.profile.stats('rendering')  // Rendering only
   window.profile.stats('logic')  // Game logic only
   ```

7. **GPU stats** (available after a render cycle in dev mode):
   ```javascript
   window.profile.gpu.drawCalls()
   window.profile.gpu.triangles()
   window.profile.gpu.textures()
   window.profile.gpu.geometries()
   ```

---

## Expected Performance Budget (60 FPS = 16.67ms/frame)

| System | Target | Current |
|--------|--------|---------|
| **Physics** | 3ms | ? |
| **Rendering** | 5ms | ? |
| **Logic** | 4ms | ? |
| **AI** | 2ms | ? |
| **Margin** | 2.67ms | ? |

---

## What to Profile

### 1. **Physics Extraction (Worst Case)**
- Extract a block from the middle of tower
- Measure frame time during cascade
- Look for spikes when layers settle

### 2. **Rendering (Baseline)**
- Start menu (no physics)
- Measure frame time before game starts
- Compare to gameplay frame time

### 3. **AI Decision-Making**
- Play vs AI on Hard difficulty
- Measure frame time when AI is "thinking"
- Should complete in <2ms

### 4. **Mobile Performance**
- Use Chrome DevTools mobile emulation
- Check memory usage
- Profile on actual phone (Bluetooth DevTools)

---

## Available Metrics

```javascript
window.profile.stats()      // Show all systems
window.profile.stats('total')      // Total frame time
window.profile.stats('physics')    // Physics only
window.profile.stats('rendering')  // Rendering only
window.profile.stats('ai')         // AI decisions
window.profile.stats('logic')      // Game logic
```

Output format:
```
system: avg=X.XXms, max=X.XXms, p95=X.XXms (N samples)
```

- **avg** — Average frame time (target: under budget)
- **max** — Worst-case frame time (spikes)
- **p95** — 95th percentile (tells if typical is fast)

---

## Physics Optimizer

The physics optimizer (`src/physicsOptimizer.js`) uses two strategies:

### Adaptive Frame Rate
Reduces physics update frequency when there's no active simulation:
- **Idle:** 30 fps (skip every other frame)
- **Simulation (1-8 blocks):** 60 fps
- **Simulation (9-15 blocks):** 30 fps
- **Simulation (>15 blocks):** 20 fps

### Velocity Threshold
Physics simulation stops when all dynamic blocks settle below a velocity threshold.
Threshold scales with block count:

| Dynamic Blocks | Velocity Threshold | Max Timeout |
|----------------|-------------------|-------------|
| 1              | 0.06              | 2000ms      |
| 6              | 0.09              | 3200ms      |
| 12+            | 0.12              | 5000ms      |

**Tuning:** Lower `baseThreshold` / `maxThreshold` in `VelocityThresholdOptimizer` to make simulation finish faster (but may cut off mid-motion on slow devices).

### Common Issues & Fixes

### Frame Rate Drops During Cascade
**Symptom:** avg=5ms, max=12ms (physics spikes)

**Fixes to try:**
1. Lower `maxDynamicBlocks` for the active device tier in `mobileOptimizations.js`.
2. Increase the post-move stabilization delay before the next AI tick (see `AI_THINK_DELAY` / `AI_MOVE_DELAY` in `src/aiController.js`).
3. Tighten the velocity threshold in `physicsOptimizer.VelocityThresholdOptimizer` so simulation finishes earlier.

### High Memory Usage
**Symptom:** Chrome shows >200MB for tab

**Fixes to try:**
1. Enable low power mode on mobile
2. Reduce particle count in `ParticleEffect.jsx`
3. Check texture memory via `window.profile.gpu.textures()`

### Consistent Jank (steady 8-10ms)
**Symptom:** avg=8ms, p95=9ms (no spikes, just slow)

**Fixes to try:**
1. Profile individual systems to find culprit
2. Check draw call count: `window.profile.gpu.drawCalls()`
3. Look at Rapier collider count

### AI Too Slow
**Symptom:** Visible pause when AI moves (>500ms)

**Fixes to try:**
1. Use `aiControllerAdvanced.js` instead of basic AI
2. Lower search depth in minimax
3. Cache board evaluations

---

## Profiler API

```javascript
// Start/stop
window.profile.start()
window.profile.stop()

// Get stats for a system
const stats = window.profile.stats('physics')
// Returns: "physics: avg=2.50ms, max=8.20ms, p95=3.10ms (300 samples)"

// Print full report
window.profile.report()

// Reset metrics
window.profile.reset()
```

### GPU Profiling API

The GPU profiler is automatically wired in dev mode via `GameScene.jsx`'s `handleCanvasCreated`. It reads Three.js WebGLInfo:

```javascript
// Draw calls per frame (target: <50)
window.profile.gpu.drawCalls()

// Triangles per frame (target: <5k)
window.profile.gpu.triangles()

// Active textures (target: <10MB)
window.profile.gpu.textures()

// Active geometries
window.profile.gpu.geometries()
```

If the GPU profiler isn't wired (e.g. in production), call manually:

```javascript
import { initGPUProfiler } from './profilerConsole';
// Pass the Three.js WebGLRenderer instance:
initGPUProfiler(renderer);
```

---

## Build & Bundle Optimization

### Build Command
```bash
npm run build        # Production build with esbuild minification (~1-2s)
npm run check:build-budget  # Verify heavy chunks are lazy-loaded
```

The build uses **esbuild** for both JS and CSS minification (was Terser).
This reduced build time from ~15-20s to ~1-2s.

### Bundle Budget

| Chunk | Size (gzip) | Load Strategy |
|-------|-------------|---------------|
| `index.js` (app shell) | ~35 kB | **Initial** |
| `react.js` | ~57 kB | **Initial** |
| `r3f.js` (R3F + Drei) | ~271 kB | **Lazy** (React.lazy) |
| `rapier.js` (WASM) | ~853 kB | **Lazy** (cache-first PWA) |
| `three.js` | ~0 kB | **Split** into r3f chunk |
| `firebase.js` | ~0 kB | **Lazy** (only if configured) |

**Invariants enforced by `scripts/check-build-budget.mjs`:**
- No heavy chunk (`rapier-*.js`, `r3f-*.js`, `three-*.js`, `firebase-*.js`) appears in `index.html` as a `<script>` or `modulepreload`
- No heavy chunk is precached by the PWA service worker
- Heavy chunks are runtime-cached via `CacheFirst` strategy (`heavy-3d-runtime-cache`)

---

## Profiling with Chrome DevTools (Alternative)

1. **Performance tab** → Record
2. **Play the game** (extract blocks)
3. **Stop recording**
4. **Look for:**
   - **Frame rendering time** (green bars < 16.67ms)
   - **Long tasks** (yellow/red bars = delays)
   - **GPU bottleneck** (Composite time high)
   - **Main thread blocked** (JavaScript time high)

5. **Bottom panel:**
   - Click **Main** to see where time is spent
   - Hover over `useFrame` to see duration
   - Check memory growth over time

---

## GPU Profiling (Browser Native)

Enable in browser:
1. Chrome: Settings → Three dots → Rendering → Show rendering stats
2. Firefox: Enable WebGL profiler
3. Look for:
   - Draw calls (target: <50 for Jenga)
   - Triangle count (target: <5k)
   - Texture memory (target: <10MB)

---

## Next Steps After Profiling

1. **If physics is slow (>3ms):**
   - Reduce substeps (lower `timeStep` in `getPhysicsSettingsForMobile()`)
   - Lower `maxDynamicBlocks` for the device tier
   - Tighten velocity thresholds in `VelocityThresholdOptimizer`

2. **If rendering is slow (>5ms):**
   - Reduce particle count in `ParticleEffect.jsx`
   - Lower shadow resolution (shadow-mapSize)
   - Check draw calls: `window.profile.gpu.drawCalls()`
   - Enable low power mode (disables shadows, reduces dpr)

3. **If logic is slow (>4ms):**
   - Cache tower state checks
   - Use dirty flags for re-evaluation
   - Profile AI with `window.profile.stats('ai')`

4. **If all systems are fast but framerate jank:**
   - Check for garbage collection (GC pause)
   - Profile memory allocation patterns
   - Look for 60→30fps drops (mobile thermal throttle)
