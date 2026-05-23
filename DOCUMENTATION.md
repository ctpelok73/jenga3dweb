# Jenga 3D — Документация проекта

## Описание

3D-игра Дженга на базе **React 19 + Vite 8 + Three.js** (через `@react-three/fiber` и `@react-three/rapier`). Классическая механика: вытаскивай блоки, ставь наверх, не урони башню. PWA-приложение с монетизацией (ads + premium).

---

## Технологии

| Технология | Версия | Назначение |
|---|---|---|
| React | 19.2.6 | UI-фреймворк |
| Vite | 8.0.13 | Build-tool, dev-server |
| three | 0.184.0 | 3D-рендеринг |
| @react-three/fiber | 9.6.1 | React-renderer для Three.js |
| @react-three/drei | 10.7.7 | Helper-компоненты (OrbitControls) |
| @react-three/rapier | 2.2.0 | Физический движок Rapier WASM |
| firebase | 12.13.0 | Auth + Realtime DB (leaderboard) |
| vite-plugin-pwa | 1.3.0 | Автогенерация Service Worker |

---

## Запуск

```bash
npm install          # зависимости
npm run dev          # dev-server → http://localhost:5173
npm run build        # production-сборка
npm run preview      # просмотр production-сборки
```

---

## Структура проекта

```
.
├─ index.html                  # HTML-entry, SEO, OG-tags, Google Fonts
├─ package.json                 # зависимости, скрипты
├─ vite.config.js               # Vite + PWA + code splitting
├─ vercel.json                  # deploy-конфиг Vercel
├─ netlify.toml                 # deploy-конфиг Netlify
├─ .env.example                 # шаблон env-переменных
├─ .env.production              # production env-переменные
├─ public/
│  ├─ manifest.json             # PWA manifest
│  ├─ icon-192.svg              # SVG-иконка 192px
│  ├─ icon-512.svg              # SVG-иконка 512px
├─ src/
│  ├─ main.jsx                  # React-entry point
│  ├─ App.jsx                   # Корневой компонент, game-state, handlers
│  ├─ styles.js                 # Shared CSS-in-JS + PLAYER_COLORS/PLAYER_NAMES
│  ├─ towerConfig.js            # Константы геометрии башни + физики
│  ├─ GameScene.jsx             # Canvas-wrapper + ErrorBoundary + LoadingOverlay
│  ├─ GameSceneWithPhysics.jsx  # 3D-сцена + Rapier Physics + cascade
│  ├─ blockTextures.js          # Процедурные текстуры (6 themes) + env-themes (4)
│  ├─ soundEngine.js            # Web Audio API, процедурная генерация звуков
│  ├─ scoreTracker.js           # localStorage: best score, total games, history
│  ├─ settingsTracker.js        # Settings persistence + difficulty physics + theme colors
│  ├─ achievementsTracker.js    # 12 achievements + stats tracking
│  ├─ dailyChallengeTracker.js  # Daily seed → deterministic tower + local leaderboard
│  ├─ firebaseService.js        # Firebase lazy-load: auth, submitScore, subscribeLeaderboard
│  ├─ adService.js              # AdSense: banner + rewarded video + ad-free check
│  ├─ analyticsService.js       # GA4: dynamic script load, event tracking
│  ├─ purchaseService.js        # Stripe/Gumroad purchase tracking + unlock validation
│  ├─ keyboardController.js     # Keyboard accessibility: Tab/Arrow/Enter/Escape/M/R
│  ├─ dragAndDropController.js  # Mouse/touch drag-and-drop for blocks
│  ├─ ParticleEffect.jsx        # 3D particle burst при успешном ходе
│  ├─ AriaAnnouncer.jsx         # aria-live="assertive" для screen reader
│  ├─ AdBanner.jsx              # Fixed bottom banner (Start/GameOver screens only)
│  ├─ RewardedVideoButton.jsx   # «Продолжить после падения» → rewarded video
│  ├─ QRCodeDisplay.jsx         # QR-код (dynamic CDN load qrcode.js)
│  ├─ SocialSharePanel.jsx      # Twitter/Telegram/Facebook/WhatsApp/Copy Link
│  ├─ InteractiveTutorialOverlay.jsx # 3-шаговый tutorial overlay
│  ├─ PauseMenu.jsx             # Fullscreen pause menu (Escape)
│  ├─ DailyChallengePanel.jsx   # Daily challenge UI + leaderboard tabs
│  ├─ PurchasePanel.jsx         # Premium shop + activation codes
│  ├─ DragVisualFeedback.jsx    # Drag trajectory visual feedback
│  ├─ components/
│  │  └─ AchievementToast.jsx   # Slide-in achievement notification
│  ├─ screens/
│  │  ├─ StartScreen.jsx        # Start screen: mode selector, stats, navigation
│  │  ├─ GameOverScreen.jsx     # Game over: stats, QR, share, rewarded video
│  │  ├─ UIPanel.jsx            # In-game HUD: info, move button, pause
│  │  ├─ SettingsPanel.jsx      # Volume, timer, difficulty, theme, environment
│  │  └─ AchievementsPanel.jsx  # Grid of unlocked/locked achievements
```

---

## Game Flow

### Фазы игры

| Фаза | Константа | Описание |
|---|---|---|
| Start | `PHASE_START` | Стартовый экран, выбор режима |
| Playing | `PHASE_PLAYING` | Игровой процесс, блоки выбираются и перемещаются |
| Game Over | `PHASE_GAME_OVER` | Башня рухнула, показ статистики и sharing |

### Механика хода

1. Игрок кликает блок (или выбирает через keyboard)
2. Блок выделяется (blue emissive), drop slots появляются наверху
3. Клик на drop slot (или кнопка «Сделать ход») → блок перемещается наверх
4. Начинается физическая симуляция (Rapier):
   - Блок и его siblings в том слое → dynamic (gravity/collisions)
   - Все блоки выше извлечённого слоя → dynamic (gravity проверяет устойчивость)
   - Cascade: если опорный слой рухнул → следующий слой тоже dynamic
5. После settling → проверка: любой блок ниже y=-0.5 → Game Over
6. Если не рухнула → ход засчитан, переключение игрока (2-player mode)

### Выбор блока

- **Клик/тач** на блок → `handleBlockClick(id)`
- **Keyboard**: Tab (цикл), Arrow Up/Down (слой), Arrow Left/Right (в слое), Enter/Space (выбор/ход)
- Нельзя выбирать из `topCompleteLayer` (верхний полный слой)
- Нельзя выбирать dynamic/ghost блоки

---

## Физическая модель (Rapier)

### Типы RigidBody

| Тип | Rapier value | Когда |
|---|---|---|
| Fixed | 1 | Все блоки по умолчанию — неподвижны |
| Dynamic | 0 | Блоки в `simulatingBlockIds` — подчиняются гравитации |

### Что становится dynamic после хода

**Ключевое правило:** все блоки **выше** извлечённого слоя ВСЕГДА dynamic — Rapier сам определяет устойчивость.

| Difficulty | Dynamic-блоки |
|---|---|
| easy | Только извлечённый блок + все выше (siblings остаются fixed) |
| normal | Извлечённый + siblings в том слое + все выше |
| hard | Извлечённый + siblings + слой ниже + все выше |

### Cascade-логика

После settling initial dynamic-блоков:
1. Проверяется: есть ли unsupported слой выше?
2. Unsupported = dynamic-слой рухнул (все блоки fallen или `fixedInSupport === 0`)
3. Если найден → его блоки добавляются в dynamic set, 150ms delay, продолжение симуляции
4. Cascade повторяется пока есть unsupported слои

### Settling-детекция

- Минимальное время: 300ms
- Velocity threshold: linSpeed + angSpeed < 0.08 для всех dynamic блоков
- Timeout: 8000ms (fallback)

---

## Константы башни (`towerConfig.js`)

Реальные пропорции Jenga: 75mm × 25mm × 15mm. Scale: 1 unit ≈ 5cm.

| Константа | Значение | Описание |
|---|---|---|
| `BLOCK_W` | 1.5 | Длина блока (long dimension) |
| `BLOCK_H` | 0.3 | Толщина блока (thin) |
| `BLOCK_D` | 0.5 | Ширина блока (short cross-section) |
| `GAP` | 0.02 | Зазор между блоками в слое |
| `LAYER_GAP` | 0.01 | Зазор между слоями |
| `TOWER_LAYERS` | 18 | Количество слоёв |
| `BLOCKS_PER_LAYER` | 3 | Блоков в слое |
| `STEP` | 0.52 | `BLOCK_D + GAP`, offset для размещения |
| `BLOCK_PHYSICS` | mass=1.0, restitution=0.05, friction=0.7, damping=0.4/0.6 | Физические параметры |

Начальная башня: 18 × 3 = **54 блока**, чередование ориентации на 90° каждый слой.

---

## Темы блоков (6 themes)

| Theme | Стиль текстуры | Roughness | Metalness | Emissive |
|---|---|---|---|---|
| classic | Wood grain + knots | 0.75 | 0.0 | #000000 |
| neon | Gradient + glow lines | 0.2 | 0.6 | color (0.15) |
| marble | Veins + ellipses | 0.35 | 0.1 | #000000 |
| ice | Cracks + highlights | 0.05 | 0.3 | #aaddff (0.08) |
| bamboo | Segments + fibers | 0.6 | 0.0 | #000000 |
| candy | Stripes + sprinkles | 0.15 | 0.1 | color (0.1) |

Все текстуры процедурно генерируются через Canvas2D, кэшируются в Map. Для каждой темы: albedo-map + normal-map + roughness-map.

---

## Темы окружения (4 env themes)

| Theme | Ground | Fog | Background | Lighting |
|---|---|---|---|---|
| classic | Wood floor (#6b4226), 4×4 | Dark fog | #2a2a2a | Warm directional + hemisphere |
| space | Dark floor (#1a1a2e), 8×8 | Deep space | #0a0a1e | Cool lights + spotlight + stars |
| beach | Sand (#d4a862), 10×10 | Sky | #87ceeb | Warm sunlight + hemisphere |
| library | Dark wood (#3e2723), 5×5 | Warm dark | #1a1008 | Reading lamp spotlight + warm |

---

## Звуковая система (`soundEngine.js`)

Web Audio API, процедурная генерация. 0 KB external audio files.

| Функция | Описание | Техника |
|---|---|---|
| `playSelect()` | Клик выбора | 880Hz square, 0.08s |
| `playPull()` | Вытаскивание | Noise 0.3s + 220Hz sawtooth 0.2s |
| `playPlace()` | Установка | 150Hz triangle 0.15s + noise 0.1s |
| `playCollapse()` | Падение | Noise 0.8s + 80Hz sawtooth 0.5s + sub-crashes |
| `playStabilize()` | Стабилизация | 660Hz + 880Hz sine |
| `playGameOver()` | Game over | 440→80Hz sawtooth sweep 1.2s |
| `playAchievementUnlock()` | Achievement | 523→659→784→1047Hz arpeggio |
| `playTimerWarning()` | Timer warning | 660Hz + 880Hz square |
| `playTimerExpired()` | Timer expired | 440→330→220Hz square |
| `playCombo()` | Combo | 440→550→660Hz sine |
| `playShake()` | Shake | 60Hz sawtooth + noise |

Master volume: `settings.volume / 100`, single AudioContext + masterGainNode.

---

## Achievements (12)

| ID | Название | Условие |
|---|---|---|
| first_move | Первый ход | totalMoves >= 1 |
| five_moves | Начинающий | bestTurns >= 5 |
| ten_moves | Строитель | bestTurns >= 10 |
| twenty_moves | Мастер | bestTurns >= 20 |
| thirty_moves | Грандмастер | bestTurns >= 30 |
| risk_taker | Риск-тейкер | bottomLayerPulls >= 1 |
| speed_demon | Быстрый | fastMoves >= 1 (within 3s) |
| steady_hand | Уверенная рука | streak >= 5 |
| veteran | Ветеран | totalGames >= 10 |
| centurion | Центурион | totalGames >= 100 |
| comeback | Камбэк | 3 losses then 10+ moves |
| perfect_game | Идеальная игра | bestTurns >= 25 |

Toast-уведомления: slideInRight animation, auto-dismiss 3.5s, sequential queue.

---

## Daily Challenge (`dailyChallengeTracker.js`)

- Deterministic seed из даты (YYYY-MM-DD → hash) → одинаковая башня для всех
- 10 типов челленджей (survive_5/10/15/20/25, reach_layer_10/12/15, speed_5/8)
- Local leaderboard (top 10/day) + Firebase online leaderboard (top 50/day)
- Challenge completion tracking в localStorage

---

## Firebase Integration (`firebaseService.js`)

**Lazy-load:** Firebase модули загружаются через dynamic `import()` только при `FIREBASE_ENABLED=true`. При placeholder env vars → Firebase полностью исключён из bundle (-216KB).

| Функция | Описание |
|---|---|
| `isFirebaseEnabled()` | Sync check env vars (не загружает модули) |
| `waitForAuth()` | Anonymous auth, returns currentUser |
| `submitScore(date, name, turns, height)` | Push entry to `leaderboard/{date}` |
| `getOnlineLeaderboard(date, limit)` | Fetch + orderByChild('turns') |
| `subscribeLeaderboard(date, limit, cb)` | Real-time onValue + cancelled-flag cleanup |

---

## Ad Integration (`adService.js`)

Google AdSense integration:

| Функция | Описание |
|---|---|
| `initAdSDK()` | Dynamic load AdSense script |
| `showBannerAd(container, slot)` | Insert `<ins class="adsbygoogle">` |
| `hideBannerAd(container)` | Remove banner |
| `showRewardedVideo(onReward, onError)` | Rewarded video → callback on reward |
| `isAdFree()` | localStorage `jenga3d_ad_free` flag |

Banner: fixed bottom, только на Start/GameOver screens. Rewarded: «Продолжить после падения» кнопка.

---

## Monetization (`purchaseService.js`)

Stripe/Gumroad payment links + localStorage purchase tracking:

| Функция | Описание |
|---|---|
| `isPurchased(itemId)` | Check localStorage purchase flag |
| `isRemoveAdsPurchased()` | Check ad-free purchase |
| `getAvailableSkins()` | Return skins unlocked by purchase |
| `getAvailableEnvThemes()` | Return env themes unlocked by purchase |

Env variables: `VITE_PAYMENT_SKIN_PACK`, `VITE_PAYMENT_REMOVE_ADS`, `VITE_PAYMENT_ENV_THEMES`.

---

## Keyboard Accessibility (`keyboardController.js`)

| Key | Action |
|---|---|
| Tab / Shift+Tab | Cycle forward/backward через блоки |
| Arrow Up / Down | Jump to adjacent layer |
| Arrow Left / Right | Cycle within current layer |
| Enter / Space | Select focused block / make move |
| Escape | Deselect / open pause menu |
| M | Open pause menu |
| R | Restart game |

---

## Drag-and-Drop (`dragAndDropController.js`)

`DragAndDropController` class:
- Mouse + touch event listeners (passive: false для preventDefault)
- Events: dragStart, drag, dragEnd, dropSlotEnter, dropSlotLeave
- `destroy()` для cleanup всех listeners

---

## PWA Configuration

### manifest.json

| Field | Value |
|---|---|
| name | Jenga 3D |
| short_name | Jenga |
| display | standalone |
| orientation | portrait |
| theme_color | #2a6eff |
| background_color | #2a2a2a |
| icons | 192x192 SVG + 512x512 SVG |

### vite-plugin-pwa (в vite.config.js)

- `registerType: 'autoUpdate'` — SW auto-updates
- `manifest: false` — использует static manifest.json
- `maximumFileSizeToCacheInBytes: 3MB` — позволяет cache rapier WASM
- Runtime caching: Google Fonts → CacheFirst (1 year), ad domains → NetworkOnly
- Precache: 11 entries (JS/CSS/HTML/SVG/JSON)
- `navigateFallback: '/index.html'`

---

## Analytics (`analyticsService.js`)

Google Analytics 4, dynamic script load, `VITE_GA_ID` env var.

| Функция | Event |
|---|---|
| `trackGameStart(source, mode)` | game_start |
| `trackBlockPlaced(turn, height)` | block_placed |
| `trackGameOver(turns, best, isRecord)` | game_over |
| `trackShareClick(platform)` | share_click |
| `trackAdImpression/Click(type)` | ad_impression/ad_click |
| `trackRewardedVideoStart/Reward/Error()` | rewarded_video lifecycle |
| `trackPWAInstall()` | pwa_install |
| `trackPremiumPurchase(price, currency)` | premium_purchase |

---

## Env Variables

| Variable | Обязательно | Описание |
|---|---|---|
| `VITE_GA_ID` | Нет | GA4 Measurement ID |
| `VITE_SITE_URL` | Нет | URL для social sharing |
| `VITE_ADSENSE_ID` | Нет | AdSense publisher ID |
| `VITE_AD_BANNER_SLOT` | Нет | Banner ad slot ID |
| `VITE_AD_REWARDED_SLOT` | Нет | Rewarded video slot ID |
| `VITE_FIREBASE_API_KEY` | Нет | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Нет | Firebase Auth domain |
| `VITE_FIREBASE_DATABASE_URL` | Нет | Firebase Realtime DB URL |
| `VITE_FIREBASE_PROJECT_ID` | Нет | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Нет | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Нет | Firebase sender ID |
| `VITE_FIREBASE_APP_ID` | Нет | Firebase app ID |
| `VITE_PAYMENT_SKIN_PACK` | Нет | Stripe/Gumroad URL для skin pack |
| `VITE_PAYMENT_REMOVE_ADS` | Нет | Stripe/Gumroad URL для remove ads |
| `VITE_PAYMENT_ENV_THEMES` | Нет | Stripe/Gumroad URL для env themes |

Все env variables опциональны. Placeholder values → соответствующая фича отключается (Firebase, ads, analytics).

---

## Production Build

```
dist/
├─ index.html                    2.43 KB  (gzip: 1.06 KB)
├─ registerSW.js                  0.13 KB
├─ sw.js                          2.33 KB  (auto-generated by vite-plugin-pwa)
├─ workbox-c121765f.js            ~66 KB   (Workbox runtime)
├─ assets/
│  ├─ react-*.js                  178 KB   (gzip: 56 KB)
│  ├─ r3f-*.js                    918 KB   (gzip: 243 KB)
│  ├─ rapier-*.js                  2263 KB  (gzip: 851 KB)
│  ├─ index-*.js                   84 KB    (gzip: 23 KB)  — App + services
│  ├─ GameSceneWithPhysics-*.js    9 KB     (gzip: 3.4 KB)
│  ├─ rolldown-runtime-*.js        0.69 KB
```

Firebase chunk: **отсутствует** при `FIREBASE_ENABLED=false` (dynamic import + tree-shaking). При включении Firebase → lazy chunk ~216KB загружается по требованию.

---

## Deployment

### Vercel

```bash
npm run build
# Deploy: vercel deploy --prod
```

Config: `vercel.json` — security headers, immutable cache для /assets/, SPA rewrite.

### Netlify

```bash
npm run build
# Deploy: netlify deploy --prod --dir=dist
```

Config: `netlify.toml` — эквивалент Vercel config.

---

## Game State (App.jsx)

25 useState hooks управляют всем состоянием:

| State | Default | Описание |
|---|---|---|
| phase | 'start' | Фаза игры |
| blocks | generateThemedTower() | Данные блоков башни |
| selectedId | null | ID выбранного блока |
| message | '' | Статус-сообщение |
| turnCount | 0 | Количество ходов |
| simulatingBlockIds | null | Set dynamic-блоков в симуляции |
| restartKey | 0 | Key для remount Physics |
| showTutorial | !hasSeenTutorial() | Tutorial overlay |
| playerMode | 1 | 1/2 игрока |
| currentPlayer | 0 | Текущий игрок (0/1) |
| lastMovedBlockId | null | ID последнего перемещённого блока |
| achievementToast | null | Текущее achievement-уведомление |
| showSettings | false | Settings panel |
| showAchievements | false | Achievements panel |
| showPauseMenu | false | Pause menu |
| showDailyChallenge | false | Daily challenge panel |
| isDailyChallengeMode | false | Режим daily challenge |
| showPurchase | false | Purchase panel |
| keyboardFocusId | null | Keyboard-focused block ID |
| announcement | '' | ARIA announcement |
| continuedAfterCollapse | false | Rewarded video continuation flag |
| adFree | isAdFree() || isRemoveAdsPurchased() | Ads disabled |
| currentSettings | getSettings() | Settings snapshot |

---

## Screen Components

### StartScreen
- Mode selector (1/2 player)
- Best score + total games stats
- Navigation: settings, achievements, daily challenge, premium

### GameOverScreen
- Stats: turns, best, total
- QR code toggle
- Rewarded video button «Продолжить после падения»
- Social share panel (Twitter/Telegram/Facebook/WhatsApp)

### UIPanel
- In-game HUD: tower info, move button, pause button
- Player indicator in 2-player mode
- Stabilizing status

### SettingsPanel
- Volume slider (0-100)
- Move timer (off/15/30/60s)
- Difficulty (easy/normal/hard)
- Block theme (6 themes)
- Environment theme (4 themes)

### AchievementsPanel
- Grid layout: unlocked + locked
- Unlocked date display
- Progress counter

---

## 2-Player Mode

- `playerMode: 1|2` — выбор на Start screen
- `currentPlayer: 0|1` — чередование ходов
- `PLAYER_COLORS`: ['#2a6eff', '#ff4444'] — blue/red
- `PLAYER_NAMES`: ['Игрок 1', 'Игрок 2']
- Game Over показывает кто уронил башню
- Pause menu показывает текущего игрока

---

## Accessibility

- **Keyboard navigation**: Tab/Arrow/Enter/Space (full gameplay without mouse)
- **Screen reader**: AriaAnnouncer (aria-live="assertive") announces block selection, game phases, achievements
- **ARIA attributes**: role="dialog" на всех screen overlays, aria-label на кнопках
- **Canvas**: aria-hidden="true" на Canvas, состояние передаётся через ARIA-live region
- **Visual focus**: keyboard-focused block → yellow emissive (#ffcc00)

---

## Known Limitations

1. AdSense rewarded video доступен только для одобренных publishers (>100k impressions/мес)
2. Firebase Realtime Database rules нужно настроить вручную (write: auth != null, read: true)
3. Rapier WASM 2.3MB — largest chunk, inherent to physics engine
4. No online multiplayer (planned for P3 in ROADMAP)
5. Purchase flow uses localStorage placeholder (Stripe/Gumroad integration needed)
6. Daily leaderboard online tab requires Firebase configuration