# Jenga 3D

3D-игра Jenga на **React + Vite + Three.js** с физикой через `@react-three/rapier`.

## Возможности

- Башня 18 × 3 блока с чередованием ориентации слоёв.
- Режимы: один игрок, два игрока, игрок против ИИ (cautious/balanced/aggressive, hard через minimax).
- Выбор блока кликом, клавиатурой и мобильными жестами (swipe / long-press / pinch).
- Перенос блока наверх через кнопку или выбор слота на вершине.
- Физическая стабилизация, каскадное падение слоёв и экран завершения партии.
- Speed-режим с обратным отсчётом, move-таймер на ход.
- Настройки сложности, громкости, темы блоков и окружения.
- Достижения, daily challenge, локальные рекорды, replay-сервис, share-ссылки.
- PWA-сборка с lazy loading тяжёлой 3D/physics части.

## Запуск

```bash
npm install
npm run dev
```

По умолчанию dev-сервер доступен на `http://localhost:5173/`.

## Проверки

```bash
npm run test:run          # Vitest unit (jsdom)
npm run build
npm run check:build-budget
npm run preview
```

`check:build-budget` запускает `scripts/check-build-budget.mjs` и проверяет, что тяжёлые чанки (`rapier`, `r3f`, `three`, `firebase`) не попали ни в `index.html` initial scripts, ни в PWA precache.

E2E (Playwright, проекты `desktop` + `mobile`):

```bash
npm run test:e2e
```

## Конфигурация

Переменные окружения описаны в `.env.example`.

- `VITE_GA_ID` включает GA4. Placeholder `G-XXXXXXXXXX` считается выключенным.
- `VITE_ADSENSE_ID`, `VITE_AD_BANNER_SLOT`, `VITE_AD_REWARDED_SLOT` включают рекламу только при реальных значениях.
- `VITE_PAYMENT_*` задают ссылки покупки.
- `VITE_PURCHASE_VERIFICATION_URL` требуется, чтобы покупка считалась доступной в production UI.

Если payment URL пустые, кнопка премиум-магазина скрывается. Если payment URL есть, но server verification не настроен, товар показывается как требующий серверной проверки.

## Структура

```text
src/
  App.jsx                    # layout + композиция хуков (~620 строк)
  GameScene.jsx              # lazy boundary для 3D сцены
  GameSceneWithPhysics.jsx   # Three/Rapier сцена и симуляция
  main.jsx                   # entry, monkey-patch console.warn, profiler load
  towerConfig.js             # BLOCK_W/H/D, TOWER_LAYERS, BLOCK_PHYSICS
  hooks/                     # 6 хуков: useGameReducer (центральный state),
                             #   useTimers, useAIPlayer, useKeyboardNavigation,
                             #   useAchievementToasts, useGameSimulation
  domain/                    # чистая логика без React: tower (геометрия),
                             #   collapse (Y-threshold), dynamicBlocks (мобайл cap)
  storage/createPersistedStore.js  # фабрика для localStorage-трекеров
  screens/                   # full-screen панели (Start, GameOver, Settings, ...)
  components/                # переиспользуемые UI (AchievementToast, ReplayPlayer, ...)
  aiController.js
  aiControllerAdvanced.js    # AIPersonality + MinimaxAI
  physicsOptimizer.js        # adaptive frame rate, velocity threshold
  performanceProfiler.js     # window.profile API (см. PROFILING.md)
  profilerConsole.js
  keyboardController.js
  touchGestureController.js
  mobileOptimizations.js
  {achievements,score,settings,dailyChallenge}Tracker.js
  {firebase,analytics,ad,purchase,share}Service.js
  soundEngine.js
  blockTextures.js
  blockTextureCache.js       # cache + clearTextureCache БЕЗ импорта three.js
  test/                      # Vitest unit/smoke (40 тестов, jsdom)
tests/e2e/                   # Playwright (desktop + mobile проекты)
scripts/
  check-build-budget.mjs     # запускается после vite build
  benchmark.mjs              # headless puppeteer-бенчмарк профайлера
graphify-out/                # knowledge graph (см. CLAUDE.md → graphify)
```

## Документация

- `CLAUDE.md` — архитектурный обзор для AI-агентов (актуальная карта слоёв и хуков).
- `PROFILING.md` — гайд по профайлеру и performance budget.
- `graphify-out/GRAPH_REPORT.md` — машинно-сгенерированный отчёт о god-nodes и cross-cutting связях.
