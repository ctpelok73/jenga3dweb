# Performance Profiling Guide — Jenga 3D

## Architecture

The profiler is plumbed in three places:

- **`src/performanceProfiler.js`** — `profiler` instance. Tracks avg, max, p95, sample count per system (`physics`, `rendering`, `ai`, `logic`, `total`). Up to 300 samples (~5 s at 60 fps). Zero overhead when disabled.
- **`src/profilerConsole.js`** — exposes `window.profile.{start, stop, report, stats, reset}`. Auto-loaded by `main.jsx`.
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

## Common Issues & Fixes

### Frame Rate Drops During Cascade
**Symptom:** avg=5ms, max=12ms (physics spikes)

**Fixes to try:**
1. Lower `maxDynamicBlocks` for the active device tier in `mobileOptimizations.js` (or rely on `capDynamicIdsForMobile` in `src/domain/dynamicBlocks.js`, already wired through `useGameSimulation`).
2. Increase the post-move stabilization delay before the next AI tick (see `AI_THINK_DELAY` / `AI_MOVE_DELAY` in `src/aiController.js`).
3. Tighten the velocity threshold in `physicsOptimizer.VelocityThresholdOptimizer` so simulation finishes earlier.

### High Memory Usage
**Symptom:** Chrome shows >200MB for tab

**Fixes to try:**
1. Enable low power mode on mobile
2. Reduce particle count in `ParticleEffect.jsx`
3. Check texture memory: `stats.memory.textures`

### Consistent Jank (steady 8-10ms)
**Symptom:** avg=8ms, p95=9ms (no spikes, just slow)

**Fixes to try:**
1. Profile individual systems to find culprit
2. Check draw call count: `window.profile.stats('rendering')`
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

## GPU Profiling (Advanced)

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
   - Reduce substeps
   - Lower max active bodies
   - Use lower collision accuracy

2. **If rendering is slow (>5ms):**
   - Reduce particle count
   - Use lower shadow resolution
   - Batch block rendering

3. **If logic is slow (>4ms):**
   - Cache tower state checks
   - Use dirty flags for re-evaluation
   - Profile AI with separate tool

4. **If all systems are fast but framerate jank:**
   - Check for garbage collection (GC pause)
   - Profile memory allocation patterns
   - Look for 60→30fps drops (mobile thermal throttle)
