# Graph Report - .  (2026-06-08)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 628 nodes · 1214 edges · 25 communities (20 shown, 5 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 67 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fbc3fa05`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Mobile Optimization & Lazy Boundary|Mobile Optimization & Lazy Boundary]]
- [[_COMMUNITY_Audio, Keyboard & Collapse Detection|Audio, Keyboard & Collapse Detection]]
- [[_COMMUNITY_Settings, Purchases & Persistence Factory|Settings, Purchases & Persistence Factory]]
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
- [[_COMMUNITY_Project Documentation & Agent Config|Project Documentation & Agent Config]]
- [[_COMMUNITY_Tower Geometry Domain|Tower Geometry Domain]]
- [[_COMMUNITY_Performance Profiler|Performance Profiler]]
- [[_COMMUNITY_Vercel Deploy Config|Vercel Deploy Config]]
- [[_COMMUNITY_Local Claude Settings|Local Claude Settings]]
- [[_COMMUNITY_Jenga Logo Icons|Jenga Logo Icons]]
- [[_COMMUNITY_E2E Playwright Setup|E2E Playwright Setup]]
- [[_COMMUNITY_E2E Spec File|E2E Spec File]]
- [[_COMMUNITY_App.handleBlockClick (orphan)|App.handleBlockClick (orphan)]]
- [[_COMMUNITY_Community 24|Community 24]]

## God Nodes (most connected - your core abstractions)
1. `App()` - 51 edges
2. `MobileOptimizationManager` - 17 edges
3. `Achievements` - 14 edges
4. `check-build-budget script` - 13 edges
5. `trackEvent()` - 11 edges
6. `getBlockMaterialProps()` - 11 edges
7. `getSettings()` - 11 edges
8. `ReplayPlayer` - 11 edges
9. `Architecture` - 11 edges
10. `Performance Profiling Guide — Jenga 3D` - 11 edges

## Surprising Connections (you probably didn't know these)
- `SettingsPanel()` --semantically_similar_to--> `Achievements`  [INFERRED] [semantically similar]
  src/screens/SettingsPanel.jsx → CLAUDE.md
- `App.jsx (top-level component)` --implements--> `Turn flow`  [INFERRED]
  src/App.jsx → CLAUDE.md
- `GameSceneWithPhysics` --conceptually_related_to--> `Collapse detection (Y-threshold)`  [INFERRED]
  src/GameSceneWithPhysics.jsx → CLAUDE.md
- `GitHub Actions CI` --references--> `package.json (Jenga 3D)`  [EXTRACTED]
  .github/workflows/ci.yml → package.json
- `manualChunks splitter` --implements--> `Lazy loading + build budget invariant`  [INFERRED]
  vite.config.js → CLAUDE.md

## Import Cycles
- None detected.

## Communities (25 total, 5 thin omitted)

### Community 0 - "Mobile Optimization & Lazy Boundary"
Cohesion: 0.07
Nodes (40): aiController, AI test family, Block stability heuristics (AI scoring), EVEN_ROTATION, generateTower(), getDropSlots(), getFreeSlots(), getLayerRotation() (+32 more)

### Community 1 - "Audio, Keyboard & Collapse Detection"
Cohesion: 0.10
Nodes (33): COLLAPSE_DROP_THRESHOLD, FALLEN_Y, isCollapsedBlock(), capDynamicIdsForMobile(), aiTimersRef ReferenceError regression spec, desktop start/pause/menu spec, continueAfterCollapseUpdate(), useTimers() (+25 more)

### Community 2 - "Settings, Purchases & Persistence Factory"
Cohesion: 0.06
Nodes (20): Lazy 3D boundary pattern (heavy chunks excluded from initial bundle), App.executeMove, ErrorBoundary, GameScene(), GameScene.handleCanvasCreated (WebGL context-loss handler), LoadingOverlay(), GameSceneWithPhysics default export, DEVICE_LEVELS (+12 more)

### Community 3 - "Game State Reducer"
Cohesion: 0.09
Nodes (28): Achievements, localStorage tracker pattern, theme_color, SettingsPanel(), UIPanel(), getAchievementById(), getAchievementCategories(), getAchievementProgress() (+20 more)

### Community 4 - "AI Controller & Difficulty"
Cohesion: 0.05
Nodes (41): check-build-budget script, Heavy chunks: rapier, r3f, three, firebase, Lazy loading + build budget invariant, PWA installable offline app, Vercel security headers (CSP-like), index.html (SPA shell), package.json (Jenga 3D), scripts (+33 more)

### Community 5 - "Block Textures & Physics Hand-off"
Cohesion: 0.06
Nodes (25): AI, Architecture, Camera & rendering, Commands, Data flow, graphify, Layers, Notes (+17 more)

### Community 6 - "Daily Challenge & Firebase Leaderboard"
Cohesion: 0.06
Nodes (10): initialState, panelKeyMap, roundResetFields, setShowAchievements(), setShowDailyChallenge(), setShowPauseMenu(), setShowPurchase(), setShowSettings() (+2 more)

### Community 7 - "Replay, Share & Game Over Screen"
Cohesion: 0.11
Nodes (30): SettingsPanel, clearTextureCache(), textureCache, themeMapCache, createTexture(), ENVIRONMENT_THEMES, generateBambooTexture(), generateCandyTexture() (+22 more)

### Community 8 - "NPM Package Manifest"
Cohesion: 0.06
Nodes (32): Before recommending from memory, Bug Fixing Protocol, Communication Style, Core Mission, How to save memories, Implementation Rules, Memory and other forms of persistence, MEMORY.md (+24 more)

### Community 9 - "Build Config & PWA Shell"
Cohesion: 0.14
Nodes (30): addToLeaderboard(), CHALLENGE_TYPES, dateToSeed(), generateDailyTower(), getDailyChallenge(), getDailyChallengeResult(), getDailyLeaderboard(), getDailySeed() (+22 more)

### Community 10 - "Achievements System & UI"
Cohesion: 0.15
Nodes (23): env-gated optional service pattern, placeholder env analytics/ads gating spec, AdBanner(), hideBannerAd(), initAdSDK(), isAdFree(), isBannerAdConfigured(), isRewardedAdConfigured() (+15 more)

### Community 11 - "Analytics & Ads Services"
Cohesion: 0.10
Nodes (12): Persistence test family, Unit test family (Vitest), mobile gesture smoke spec, normalizeEventName(), useTouchGestures(), test/achievements.test.js, test/collapse.test.js, test/keyboardController.test.js (+4 more)

### Community 12 - "Touch Gestures & Test Setup"
Cohesion: 0.07
Nodes (27): author, dependencies, firebase, react, react-dom, @react-three/drei, @react-three/fiber, @react-three/rapier (+19 more)

### Community 13 - "Physics Cascade Simulation Loop"
Cohesion: 0.12
Nodes (10): decodeTowerConfig(), encodeTowerConfig(), generateChallengeLink(), generateGameId(), generateShareLink(), getChallengeFromUrl(), listGameReplays(), _pruneReplays() (+2 more)

### Community 14 - "Project Documentation & Agent Config"
Cohesion: 0.16
Nodes (20): getAvailableEnvThemes(), getAvailableSkins(), getItemStatus(), getPremiumItems(), getPurchaseStatus(), isEnvThemesPurchased(), isPremiumStoreAvailable(), isPurchased() (+12 more)

### Community 15 - "Tower Geometry Domain"
Cohesion: 0.13
Nodes (12): Cascade collapse simulation flow, setSimulation(), App.handleSimulationComplete, Scene.findNextUnsupportedLayer (cascade detector), Scene useFrame settling loop, main.jsx root render, profiler (singleton), AdaptiveFrameRateController (+4 more)

### Community 16 - "Performance Profiler"
Cohesion: 0.10
Nodes (19): 1. **Physics Extraction (Worst Case)**, 2. **Rendering (Baseline)**, 3. **AI Decision-Making**, 4. **Mobile Performance**, AI Too Slow, Architecture, Available Metrics, Common Issues & Fixes (+11 more)

### Community 17 - "Vercel Deploy Config"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, installCommand, outputDirectory, rewrites

### Community 19 - "Jenga Logo Icons"
Cohesion: 1.00
Nodes (3): Jenga 3D logo concept (stacked wooden block tower on blue rounded square with JENGA wordmark), icon-192.svg (Jenga tower icon, 192x192), icon-512.svg (Jenga tower icon, 512x512)

## Knowledge Gaps
- **150 isolated node(s):** `PreToolUse`, `allow`, `name`, `version`, `private` (+145 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Architecture` connect `Block Textures & Physics Hand-off` to `NPM Package Manifest`, `Game State Reducer`?**
  _High betweenness centrality (0.247) - this node is a cross-community bridge._
- **Why does `Achievements` connect `Game State Reducer` to `Audio, Keyboard & Collapse Detection`, `Block Textures & Physics Hand-off`?**
  _High betweenness centrality (0.200) - this node is a cross-community bridge._
- **Why does `Lazy loading & build budget` connect `Block Textures & Physics Hand-off` to `AI Controller & Difficulty`?**
  _High betweenness centrality (0.157) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `App()` (e.g. with `Lazy 3D boundary pattern (heavy chunks excluded from initial bundle)` and `App.handleSimulationComplete`) actually correct?**
  _`App()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Achievements` (e.g. with `AriaAnnouncer.jsx` and `SettingsPanel()`) actually correct?**
  _`Achievements` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PreToolUse`, `allow`, `name` to the rest of the system?**
  _155 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Mobile Optimization & Lazy Boundary` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._