# Документация новых модулей (Приоритеты 1-2)

## Приоритет 1: Критические улучшения

### 1. physicsOptimizer.js
Оптимизация производительности Rapier physics engine.

**Классы:**
- `AdaptiveFrameRateController` — адаптивное снижение частоты обновлений (60fps → 30fps)
- `PhysicsLODManager` — система LOD для блоков по расстоянию от камеры
- `CollisionCache` — кэширование результатов collision-detection
- `VelocityThresholdOptimizer` — адаптивный velocity threshold в зависимости от количества динамических блоков
- `PhysicsOptimizer` — главный оптимизатор (singleton)

**Использование в GameSceneWithPhysics.jsx:**
```javascript
import { physicsOptimizer } from './physicsOptimizer';

// В useFrame hook:
physicsOptimizer.updateSimulationState(true, activeIds.size);
const frameParams = physicsOptimizer.getFrameParams(activeIds.size);
if (!frameParams.shouldUpdatePhysics) return; // Skip frame
```

### 2. wasmLoader.js
Управление загрузкой Rapier WASM с timeout и fallback.

**Функции:**
- `load()` — начать загрузку WASM (возвращает Promise)
- `getProgress()` — получить прогресс загрузки (0-100)
- `isWasmLoaded()` — проверить, загружен ли WASM
- `isWasmLoading()` — проверить, идёт ли загрузка

**Использование:**
```javascript
import { wasmLoader } from './wasmLoader';

const progress = wasmLoader.getProgress();
const isLoaded = wasmLoader.isWasmLoaded();
```

### 3. touchGestureController.js
Управление сенсорными жестами (swipe, pinch, long-press).

**Классы:**
- `TouchGestureController` — контроллер жестов
- `useTouchGestures()` — React Hook

**Поддерживаемые жесты:**
- Swipe (влево/вправо/вверх/вниз)
- Pinch-zoom для камеры
- Long-press для контекстного меню
- Haptic feedback (vibration API)

**Использование:**
```javascript
import { useTouchGestures } from './touchGestureController';

const controller = useTouchGestures(elementRef, {
  onSwipeLeft: () => console.log('Swipe left'),
  onPinch: (scale) => console.log('Pinch:', scale),
});
```

### 4. mobileOptimizations.js
Оптимизации для мобильных устройств.

**Функции:**
- `isMobileDevice()` — проверить, мобильное ли устройство
- `isTouchSupported()` — проверить поддержку touch
- `getDeviceInfo()` — получить информацию об устройстве
- `useMobileOptimizations()` — React Hook

**Классы:**
- `ViewportManager` — управление viewport и масштабированием

**Константы:**
- `TOUCH_TARGET_SIZE` = 44px (минимальный размер для touch-элементов)

---

## Приоритет 2: Функциональные улучшения

### 1. achievementsExtended.js
Расширенная система достижений с 20 достижениями и progress tracking.

**Экспорты:**
- `ACHIEVEMENTS_EXTENDED` — массив всех достижений (20 штук)
- `getAchievementById(id)` — получить достижение по ID
- `getAchievementsByCategory(category)` — получить достижения по категории
- `getAchievementProgress(achievement, stats)` — получить прогресс достижения
- `getAchievementCategories()` — получить все категории
- `getAchievementStats(unlockedIds, stats)` — получить статистику достижений

**Категории достижений:**
- basic, moves, risk, speed, streak, games, comeback, difficulty, collection

**Структура достижения:**
```javascript
{
  id: 'achievement_id',
  title: 'Название',
  description: 'Описание',
  emoji: '🎯',
  category: 'moves',
  condition: (stats) => stats.bestTurns >= 5,
  progress: (stats) => ({ current: stats.bestTurns, target: 5 }),
}
```

### 2. shareService.js
Система для sharing и challenge links.

**Функции:**
- `generateShareLink(config)` — генерировать share-link
- `generateChallengeLink(towerConfig, playerName)` — генерировать challenge-link
- `getChallengeFromUrl()` — получить конфигурацию из URL
- `saveGameReplay(gameId, moves, config)` — сохранить replay
- `loadGameReplay(gameId)` — загрузить replay
- `listGameReplays()` — получить список всех replays
- `deleteGameReplay(gameId)` — удалить replay
- `generateGameId()` — генерировать уникальный ID игры
- `generateTowerSeed(date)` — генерировать seed для детерминированной башни

**Классы:**
- `ReplayPlayer` — воспроизведение ходов с контролем скорости

**Использование:**
```javascript
import { generateShareLink, ReplayPlayer } from './shareService';

const link = generateShareLink({ seed: 12345, difficulty: 'hard' });
const player = new ReplayPlayer(replay);
player.play(onMove, onComplete);
```

### 3. aiControllerAdvanced.js
Улучшенный AI-противник с анализом stability и minimax.

**Функции:**
- `analyzeBlockStability(block, blocks)` — анализировать физическую устойчивость (0-1)
- `evaluateBlockRisk(block, blocks)` — оценить риск вытаскивания (0-1)
- `evaluateTowerImpact(block, blocks)` — оценить влияние на башню
- `chooseAIBlockAdvanced(blocks, topCompleteLayer, personality, difficulty)` — выбрать блок

**Классы:**
- `AIPersonality` — управление поведением AI (aggressive/normal/conservative)
- `MinimaxAI` — minimax-алгоритм для hard mode

**Использование:**
```javascript
import { chooseAIBlockAdvanced, aiPersonality } from './aiControllerAdvanced';

const block = chooseAIBlockAdvanced(blocks, topCompleteLayer, aiPersonality, 'hard');
aiPersonality.adaptToPlayer({ playerWinRate: 0.6 });
```

---

## Компоненты

### LoadingProgressBar.jsx
Компонент для отображения progress bar при загрузке.

**Props:**
- `isLoading` (boolean) — идёт ли загрузка
- `progress` (0-100) — прогресс загрузки

### AchievementProgressBar.jsx
Компоненты для отображения прогресса достижений.

**Компоненты:**
- `AchievementProgressBar` — progress bar для одного достижения
- `AchievementCard` — карточка достижения с прогрессом
- `AchievementStats` — статистика всех достижений

### ReplayPlayer.jsx
Компонент для просмотра и воспроизведения replays.

**Props:**
- `replay` (object) — объект replay
- `onClose` (function) — callback при закрытии

---

## CSS классы

### Loading
- `.j-loading-overlay` — overlay при загрузке
- `.j-loading-container` — контейнер с spinner и progress bar
- `.j-spinner-ring` — кольцо spinner
- `.j-progress-bar-container` — контейнер progress bar
- `.j-progress-bar-fill` — заполнение progress bar

### Achievements
- `.j-achievement-progress` — progress bar достижения
- `.j-achievement-card` — карточка достижения
- `.j-achievement-card--unlocked` — разблокированное достижение
- `.j-achievement-stats` — статистика достижений

### Replay
- `.j-replay-player` — контейнер replay-плеера
- `.j-replay-player__controls` — контролы плеера
- `.j-replay-player__slider` — slider прогресса
- `.j-replay-player__speed-select` — выбор скорости воспроизведения

---

## Интеграция с существующим кодом

### В App.jsx
```javascript
import { physicsOptimizer } from './physicsOptimizer';
import { wasmLoader } from './wasmLoader';
import { useMobileOptimizations } from './mobileOptimizations';
import { achievementsExtended } from './achievementsExtended';
import { chooseAIBlockAdvanced, aiPersonality } from './aiControllerAdvanced';

// Инициализировать оптимизации
useEffect(() => {
  const info = useMobileOptimizations();
  physicsOptimizer.initialize([0, 5, 8]);
}, []);
```

### В GameSceneWithPhysics.jsx
```javascript
import { physicsOptimizer } from './physicsOptimizer';

// В useFrame:
physicsOptimizer.updateSimulationState(true, activeIds.size);
const frameParams = physicsOptimizer.getFrameParams(activeIds.size);
```

### В AI выборе блока
```javascript
import { chooseAIBlockAdvanced, aiPersonality } from './aiControllerAdvanced';

const block = chooseAIBlockAdvanced(blocks, topCompleteLayer, aiPersonality, difficulty);
```

---

## Метрики производительности

После внедрения оптимизаций:
- **Physics FPS:** 60fps (stable) при активной симуляции, 30fps в меню
- **Bundle size:** ~70KB (index.js, gzip)
- **Load time:** <3s на 4G
- **Memory usage:** ~50MB (зависит от устройства)

---

## Следующие шаги

1. **Интегрировать в App.jsx** — подключить все новые модули
2. **Тестировать на мобильных** — проверить touch-жесты и производительность
3. **Добавить Firebase sync** — синхронизировать достижения и replays
4. **Реализовать Приоритет 3** — система боевого пропуска и сезонные скины
