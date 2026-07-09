# Graph Report - jenga  (2026-07-02)

## Corpus Check
- 119 files · ~87,150 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 801 nodes · 1573 edges · 41 communities (34 shown, 7 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 43 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9c4fa61d`
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
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]

## God Nodes (most connected - your core abstractions)
1. `App()` - 56 edges
2. `useModalA11y()` - 18 edges
3. `MobileOptimizationManager` - 17 edges
4. `TouchGestureController` - 15 edges
5. `Achievements` - 14 edges
6. `Performance Profiling Guide — Jenga 3D` - 13 edges
7. `getSettings()` - 13 edges
8. `Architecture` - 13 edges
9. `scripts` - 12 edges
10. `AIPersonality` - 12 edges

## Surprising Connections (you probably didn't know these)
- `SettingsPanel()` --semantically_similar_to--> `Achievements`  [INFERRED] [semantically similar]
  src/screens/SettingsPanel.jsx → CLAUDE.md
- `GitHub Actions CI` --calls--> `check-build-budget script`  [EXTRACTED]
  .github/workflows/ci.yml → scripts/check-build-budget.mjs
- `generateThemedTower()` --calls--> `generateTower()`  [INFERRED]
  src/App.jsx → server/index.js
- `getDailyChallenge()` --semantically_similar_to--> `generateTower()`  [INFERRED] [semantically similar]
  src/dailyChallengeTracker.js → src/domain/tower.js
- `GameSceneWithPhysics()` --calls--> `getDynamicBlockLimit()`  [EXTRACTED]
  src/GameSceneWithPhysics.jsx → src/mobileOptimizations.js

## Import Cycles
- None detected.

## Communities (41 total, 7 thin omitted)

### Community 0 - "Mobile Optimization & Lazy Boundary"
Cohesion: 0.08
Nodes (39): aiController, AI test family, Block stability heuristics (AI scoring), EVEN_ROTATION, generateTower(), getDropSlots(), getFreeSlots(), getLayerRotation() (+31 more)

### Community 1 - "Audio, Keyboard & Collapse Detection"
Cohesion: 0.06
Nodes (48): COLLAPSE_DROP_THRESHOLD, FALLEN_Y, isCollapsedBlock(), capDynamicIdsForMobile(), getMaxLayer(), getTopCompleteLayer(), aiTimersRef ReferenceError regression spec, desktop start/pause/menu spec (+40 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (33): DB_PATH, __dirname, ensurePlayer(), getGlobalStats(), getLeaderboard(), getPlayerStats(), initDB(), recordPlayerAction() (+25 more)

### Community 3 - "Game State Reducer"
Cohesion: 0.05
Nodes (57): Achievements, AchievementCard(), AchievementStats(), localStorage tracker pattern, PWA installable offline app, FOCUSABLE_SELECTOR, useModalA11y(), background_color (+49 more)

### Community 4 - "AI Controller & Difficulty"
Cohesion: 0.25
Nodes (7): Jenga 3D, Возможности, Документация, Запуск, Конфигурация, Проверки, Структура

### Community 5 - "Block Textures & Physics Hand-off"
Cohesion: 0.10
Nodes (24): AI, Architecture, Camera & rendering, code-review (skill), Codegraph (MCP), Commands, Data flow, feature-dev (skill) (+16 more)

### Community 6 - "Daily Challenge & Firebase Leaderboard"
Cohesion: 0.06
Nodes (13): initialState, panelKeyMap, roundResetFields, setShowAchievements(), setShowDailyChallenge(), setShowOnlineLobby(), setShowOnlineStats(), setShowPauseMenu() (+5 more)

### Community 7 - "Replay, Share & Game Over Screen"
Cohesion: 0.07
Nodes (19): ErrorBoundary, GameScene(), GameSceneWithPhysics, LoadingOverlay(), DEVICE_LEVELS, getDeviceLevel(), getDynamicBlockLimit(), getGPUInfo() (+11 more)

### Community 8 - "NPM Package Manifest"
Cohesion: 0.11
Nodes (18): Before recommending from memory, Bug Fixing Protocol, Communication Style, Core Mission, How to save memories, Implementation Rules, Memory and other forms of persistence, MEMORY.md (+10 more)

### Community 9 - "Build Config & PWA Shell"
Cohesion: 0.13
Nodes (33): DailyChallengePanel(), addToLeaderboard(), CHALLENGE_TYPES, dateToSeed(), generateDailyTower(), getDailyChallenge(), getDailyChallengeResult(), getDailyLeaderboard() (+25 more)

### Community 10 - "Achievements System & UI"
Cohesion: 0.14
Nodes (23): env-gated optional service pattern, placeholder env analytics/ads gating spec, AdBanner(), hideBannerAd(), isAdFree(), isBannerAdConfigured(), isRewardedAdConfigured(), showBannerAd() (+15 more)

### Community 11 - "Analytics & Ads Services"
Cohesion: 0.13
Nodes (13): Persistence test family, Unit test family (Vitest), mobile gesture smoke spec, normalizeEventName(), TouchGestureController, test/achievements.test.js, test/collapse.test.js, test/keyboardController.test.js (+5 more)

### Community 12 - "Touch Gestures & Test Setup"
Cohesion: 0.18
Nodes (11): scripts, build, check:build-budget, dev, dev:server, preview, server:install, server:start (+3 more)

### Community 13 - "Physics Cascade Simulation Loop"
Cohesion: 0.12
Nodes (7): decodeTowerConfig(), encodeTowerConfig(), generateChallengeLink(), generateShareLink(), listGameReplays(), _pruneReplays(), ReplayPlayer

### Community 15 - "Tower Geometry Domain"
Cohesion: 0.24
Nodes (4): setSimulation(), AdaptiveFrameRateController, PhysicsOptimizer, VelocityThresholdOptimizer

### Community 16 - "Performance Profiler"
Cohesion: 0.09
Nodes (26): 1. **Physics Extraction (Worst Case)**, 2. **Rendering (Baseline)**, 3. **AI Decision-Making**, 4. **Mobile Performance**, Adaptive Frame Rate, AI Too Slow, Architecture, Available Metrics (+18 more)

### Community 17 - "Vercel Deploy Config"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, installCommand, outputDirectory, rewrites

### Community 19 - "Jenga Logo Icons"
Cohesion: 1.00
Nodes (3): Jenga 3D logo concept (stacked wooden block tower on blue rounded square with JENGA wordmark), icon-192.svg (Jenga tower icon, 192x192), icon-512.svg (Jenga tower icon, 512x512)

### Community 21 - "E2E Spec File"
Cohesion: 0.20
Nodes (17): PurchasePanel(), getItemStatus(), getPremiumItems(), getPurchaseStatus(), isEnvThemesPurchased(), isPurchased(), isSkinPackPurchased(), loadPurchases() (+9 more)

### Community 24 - "Community 24"
Cohesion: 0.21
Nodes (6): main.jsx entry point, _warn, PerformanceProfiler, profiler, setupGPUProfiler(), initGPUProfiler()

### Community 25 - "Community 25"
Cohesion: 0.07
Nodes (43): _color, _euler, getBlockEdgeColor(), InstancedBlocks, _matrix, mergeEdgeGeometries(), _pos, _quat (+35 more)

### Community 26 - "Community 26"
Cohesion: 0.17
Nodes (12): devDependencies, esbuild, jsdom, @playwright/test, puppeteer, @testing-library/jest-dom, @testing-library/react, vite (+4 more)

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (9): check-build-budget script, distDir, distPath, files, forbiddenInitial, indexHtml, initialScripts, swFile (+1 more)

### Community 28 - "Community 28"
Cohesion: 0.22
Nodes (8): author, description, keywords, license, name, private, type, version

### Community 29 - "Community 29"
Cohesion: 0.25
Nodes (8): dependencies, firebase, react, react-dom, @react-three/drei, @react-three/fiber, @react-three/rapier, three

### Community 33 - "Community 33"
Cohesion: 0.10
Nodes (16): useOnlineGame(), connect(), createRoom(), emit(), handleServerMessage(), joinRoom(), leaveRoom(), listeners (+8 more)

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (3): errors, log(), shot()

### Community 36 - "Community 36"
Cohesion: 0.11
Nodes (17): API Endpoints, Auth, Create Room, Database, Global Stats, Health Check, Jenga 3D Online Server, Join Room (+9 more)

### Community 37 - "Community 37"
Cohesion: 0.14
Nodes (13): dependencies, better-sqlite3, cors, express, uuid, ws, description, name (+5 more)

## Knowledge Gaps
- **195 isolated node(s):** `Architecture`, `Quick Start (Browser DevTools)`, `Expected Performance Budget (60 FPS = 16.67ms/frame)`, `1. **Physics Extraction (Worst Case)**`, `2. **Rendering (Baseline)**` (+190 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `generateThemedTower()` connect `Community 2` to `Mobile Optimization & Lazy Boundary`, `Audio, Keyboard & Collapse Detection`, `Game State Reducer`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `Architecture` connect `Block Textures & Physics Hand-off` to `Community 24`, `Game State Reducer`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Achievements` (e.g. with `AriaAnnouncer.jsx` and `SettingsPanel()`) actually correct?**
  _`Achievements` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Architecture`, `Quick Start (Browser DevTools)`, `Expected Performance Budget (60 FPS = 16.67ms/frame)` to the rest of the system?**
  _198 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Mobile Optimization & Lazy Boundary` be split into smaller, more focused modules?**
  _Cohesion score 0.07706766917293233 - nodes in this community are weakly interconnected._
- **Should `Audio, Keyboard & Collapse Detection` be split into smaller, more focused modules?**
  _Cohesion score 0.06160506160506161 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.10317460317460317 - nodes in this community are weakly interconnected._