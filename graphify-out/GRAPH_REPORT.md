# Graph Report - jenga  (2026-06-19)

## Corpus Check
- 95 files · ~52,161 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 693 nodes · 1431 edges · 36 communities (27 shown, 9 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 43 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ae002b8b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Mobile Optimization & Lazy Boundary|Mobile Optimization & Lazy Boundary]]
- [[_COMMUNITY_Audio, Keyboard & Collapse Detection|Audio, Keyboard & Collapse Detection]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Game State Reducer|Game State Reducer]]
- [[_COMMUNITY_AI Controller & Difficulty|AI Controller & Difficulty]]
- [[_COMMUNITY_Block Textures & Physics Hand-off|Block Textures & Physics Hand-off]]
- [[_COMMUNITY_Daily Challenge & Firebase Leaderboard|Daily Challenge & Firebase Leaderboard]]
- [[_COMMUNITY_Replay, Share & Game Over Screen|Replay, Share & Game Over Screen]]
- [[_COMMUNITY_NPM Package Manifest|NPM Package Manifest]]
- [[_COMMUNITY_Build Config & PWA Shell|Build Config & PWA Shell]]
- [[_COMMUNITY_Achievements System & UI|Achievements System & UI]]
- [[_COMMUNITY_Analytics & Ads Services|Analytics & Ads Services]]
- [[_COMMUNITY_Touch Gestures & Test Setup|Touch Gestures & Test Setup]]
- [[_COMMUNITY_Physics Cascade Simulation Loop|Physics Cascade Simulation Loop]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Tower Geometry Domain|Tower Geometry Domain]]
- [[_COMMUNITY_Performance Profiler|Performance Profiler]]
- [[_COMMUNITY_Vercel Deploy Config|Vercel Deploy Config]]
- [[_COMMUNITY_Local Claude Settings|Local Claude Settings]]
- [[_COMMUNITY_Jenga Logo Icons|Jenga Logo Icons]]
- [[_COMMUNITY_E2E Playwright Setup|E2E Playwright Setup]]
- [[_COMMUNITY_E2E Spec File|E2E Spec File]]
- [[_COMMUNITY_App.handleBlockClick (orphan)|App.handleBlockClick (orphan)]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]

## God Nodes (most connected - your core abstractions)
1. `App()` - 55 edges
2. `MobileOptimizationManager` - 17 edges
3. `useModalA11y()` - 16 edges
4. `TouchGestureController` - 15 edges
5. `Achievements` - 14 edges
6. `getSettings()` - 13 edges
7. `Architecture` - 13 edges
8. `AIPersonality` - 12 edges
9. `trackEvent()` - 12 edges
10. `isAdFree()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `SettingsPanel()` --semantically_similar_to--> `Achievements`  [INFERRED] [semantically similar]
  src/screens/SettingsPanel.jsx → CLAUDE.md
- `GitHub Actions CI` --references--> `package.json (Jenga 3D)`  [EXTRACTED]
  .github/workflows/ci.yml → package.json
- `GitHub Actions CI` --calls--> `check-build-budget script`  [EXTRACTED]
  .github/workflows/ci.yml → scripts/check-build-budget.mjs
- `getDailyChallenge()` --semantically_similar_to--> `generateTower()`  [INFERRED] [semantically similar]
  src/dailyChallengeTracker.js → src/domain/tower.js
- `Vercel Deployment Config` --references--> `package.json (Jenga 3D)`  [EXTRACTED]
  vercel.json → package.json

## Import Cycles
- None detected.

## Communities (36 total, 9 thin omitted)

### Community 0 - "Mobile Optimization & Lazy Boundary"
Cohesion: 0.10
Nodes (27): aiController, AI test family, Block stability heuristics (AI scoring), pickRandomDropSlot(), useAIPlayer(), chooseAIBlock(), computeAIDropSlot(), countBlocksInLayer() (+19 more)

### Community 1 - "Audio, Keyboard & Collapse Detection"
Cohesion: 0.06
Nodes (54): useGameReducer hook, COLLAPSE_DROP_THRESHOLD, FALLEN_Y, isCollapsedBlock(), capDynamicIdsForMobile(), aiTimersRef ReferenceError regression spec, desktop start/pause/menu spec, useAchievementToasts() (+46 more)

### Community 2 - "Community 2"
Cohesion: 0.27
Nodes (16): GameScene (lazy boundary), clearTextureCache(), textureCache, themeMapCache, createTexture(), ENVIRONMENT_THEMES, generateBambooTexture(), generateCandyTexture() (+8 more)

### Community 3 - "Game State Reducer"
Cohesion: 0.11
Nodes (35): theme_color, SettingsPanel(), UIPanel(), generateThemedTower(), PurchasePanel(), getAvailableEnvThemes(), getAvailableSkins(), getItemStatus() (+27 more)

### Community 4 - "AI Controller & Difficulty"
Cohesion: 0.06
Nodes (33): check-build-budget script, Heavy chunks: rapier, r3f, three, firebase, PWA installable offline app, Vercel security headers (CSP-like), index.html (SPA shell), package.json (Jenga 3D), background_color, description (+25 more)

### Community 5 - "Block Textures & Physics Hand-off"
Cohesion: 0.10
Nodes (24): AI, Architecture, Camera & rendering, code-review (skill), Codegraph (MCP), Commands, Data flow, feature-dev (skill) (+16 more)

### Community 6 - "Daily Challenge & Firebase Leaderboard"
Cohesion: 0.06
Nodes (11): initialState, panelKeyMap, roundResetFields, setShowAchievements(), setShowDailyChallenge(), setShowPauseMenu(), setShowPurchase(), setShowSettings() (+3 more)

### Community 7 - "Replay, Share & Game Over Screen"
Cohesion: 0.21
Nodes (10): GameSceneWithPhysics, DEVICE_LEVELS, getDeviceLevel(), getGPUInfo(), getPerformanceScore(), getPhysicsSettingsForMobile(), isMobileDevice(), isTouchSupported() (+2 more)

### Community 8 - "NPM Package Manifest"
Cohesion: 0.11
Nodes (18): Before recommending from memory, Bug Fixing Protocol, Communication Style, Core Mission, How to save memories, Implementation Rules, Memory and other forms of persistence, MEMORY.md (+10 more)

### Community 9 - "Build Config & PWA Shell"
Cohesion: 0.13
Nodes (34): env-gated optional service pattern, DailyChallengePanel(), addToLeaderboard(), CHALLENGE_TYPES, dateToSeed(), generateDailyTower(), getDailyChallenge(), getDailyChallengeResult() (+26 more)

### Community 10 - "Achievements System & UI"
Cohesion: 0.15
Nodes (20): placeholder env analytics/ads gating spec, AdBanner(), hideBannerAd(), isAdFree(), isBannerAdConfigured(), isRewardedAdConfigured(), showBannerAd(), showRewardedVideo() (+12 more)

### Community 11 - "Analytics & Ads Services"
Cohesion: 0.13
Nodes (13): Persistence test family, Unit test family (Vitest), mobile gesture smoke spec, normalizeEventName(), TouchGestureController, test/achievements.test.js, test/collapse.test.js, test/keyboardController.test.js (+5 more)

### Community 12 - "Touch Gestures & Test Setup"
Cohesion: 0.06
Nodes (35): author, dependencies, firebase, react, react-dom, @react-three/drei, @react-three/fiber, @react-three/rapier (+27 more)

### Community 13 - "Physics Cascade Simulation Loop"
Cohesion: 0.12
Nodes (7): decodeTowerConfig(), encodeTowerConfig(), generateChallengeLink(), generateShareLink(), listGameReplays(), _pruneReplays(), ReplayPlayer

### Community 15 - "Tower Geometry Domain"
Cohesion: 0.23
Nodes (4): setSimulation(), AdaptiveFrameRateController, PhysicsOptimizer, VelocityThresholdOptimizer

### Community 16 - "Performance Profiler"
Cohesion: 0.06
Nodes (26): main.jsx entry point, 1. **Physics Extraction (Worst Case)**, 2. **Rendering (Baseline)**, 3. **AI Decision-Making**, 4. **Mobile Performance**, AI Too Slow, Architecture, Available Metrics (+18 more)

### Community 17 - "Vercel Deploy Config"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, installCommand, outputDirectory, rewrites

### Community 19 - "Jenga Logo Icons"
Cohesion: 1.00
Nodes (3): Jenga 3D logo concept (stacked wooden block tower on blue rounded square with JENGA wordmark), icon-192.svg (Jenga tower icon, 192x192), icon-512.svg (Jenga tower icon, 512x512)

### Community 24 - "Community 24"
Cohesion: 0.17
Nodes (4): GameScene(), GameScene.handleCanvasCreated (WebGL context-loss handler), MobileOptimizationManager, useMobileOptimizations()

### Community 25 - "Community 25"
Cohesion: 0.12
Nodes (19): BlockBody(), FixedBody(), getEnvironmentTheme(), Block, DropSlot, _euler, GameSceneWithPhysics(), GroundCollider() (+11 more)

### Community 26 - "Community 26"
Cohesion: 0.09
Nodes (29): Achievements, AchievementCard(), AchievementStats(), localStorage tracker pattern, FOCUSABLE_SELECTOR, useModalA11y(), AchievementsPanel(), GameOverScreen() (+21 more)

### Community 29 - "Community 29"
Cohesion: 0.67
Nodes (3): LoadingOverlay(), WasmLoader class, wasmLoader (singleton)

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (3): errors, log(), shot()

### Community 35 - "Community 35"
Cohesion: 0.31
Nodes (13): EVEN_ROTATION, generateTower(), getDropSlots(), getFreeSlots(), getLayerRotation(), getLayerY(), getMaxLayer(), getOccupiedSlots() (+5 more)

## Knowledge Gaps
- **151 isolated node(s):** `PreToolUse`, `allow`, `name`, `version`, `private` (+146 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `theme_color` connect `Game State Reducer` to `AI Controller & Difficulty`?**
  _High betweenness centrality (0.180) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Achievements` (e.g. with `AriaAnnouncer.jsx` and `SettingsPanel()`) actually correct?**
  _`Achievements` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PreToolUse`, `allow`, `name` to the rest of the system?**
  _154 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Mobile Optimization & Lazy Boundary` be split into smaller, more focused modules?**
  _Cohesion score 0.09725158562367865 - nodes in this community are weakly interconnected._
- **Should `Audio, Keyboard & Collapse Detection` be split into smaller, more focused modules?**
  _Cohesion score 0.06487341772151899 - nodes in this community are weakly interconnected._
- **Should `Game State Reducer` be split into smaller, more focused modules?**
  _Cohesion score 0.1073170731707317 - nodes in this community are weakly interconnected._
- **Should `AI Controller & Difficulty` be split into smaller, more focused modules?**
  _Cohesion score 0.06282051282051282 - nodes in this community are weakly interconnected._