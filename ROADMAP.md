# Jenga 3D — Roadmap монетизации и развития

## ✅ Реализовано (текущая версия)

### Критические исправления (баги физики)
- Quaternion → Euler синхронизация вращений
- Только relevant блоки dynamic (не все 54)
- Settling-детекция по скорости (не таймер)
- Table collider выровнен с визуальной поверхностью

### Продуктовые фичи
- 🔊 **Звуковые эффекты** — Web Audio API, процедурная генерация (0 KB)
  - `playSelect()` — клик выбора блока
  - `playPull()` — вытаскивание
  - `playPlace()` — постановка наверх
  - `playCollapse()` — падение башни
  - `playGameOver()` — драматичный тон
  - `playStabilize()` — стабилизация башни
- 🏠 **Стартовый экран** — «Начать игру» + статистика (лучший результат, игр сыграно) + выбор режима (1/2 игрока)
- 💥 **Экран Game Over** — «Башня рухнула!» + ходы / лучший / всего игр + QR-код + социальный шеринг
- 📊 **Score Tracker** — localStorage persistence (best score, total games, history)
- 📱 **PWA** — manifest + service worker + SVG icons → installable на телефон
- 🎨 **Упрощённая сцена** — чистая поверхность + 2 directional lights (без комнаты/стола/лампы)
- 📐 **Реалистичные пропорции** — BLOCK_H=0.3 (тонкие доски, не квадратные бруски)

### P0 — Реализовано ✅
- ✅ **Drag-and-drop блоков** — `dragAndDropController.js` + `DragVisualFeedback.jsx`
  - Mouse + touch перетаскивание
  - Визуальная траектория от блока к слоту, подсвечивание целевого слота
- ✅ **Analytics** — `analyticsService.js` (Google Analytics 4)
  - `trackGameStart`, `trackGameOver`, `trackShareClick`, `trackAdImpression`, `trackAdClick`
- ✅ **SEO** — `<title>`, `<meta description>`, Open Graph + Twitter Card tags в `index.html`
- ✅ **Social sharing** — `SocialSharePanel.jsx` (Twitter, Telegram, Facebook, WhatsApp, Copy Link)
- ✅ **Favicon / Icons** — SVG icons `icon-192.svg`, `icon-512.svg` + apple-touch-icon

### P1 — Реализовано ✅
- ✅ **2-player local** — чередование ходов на одном устройстве
  - `playerMode` state (1/2), `currentPlayer` switching, `PLAYER_COLORS`, `PLAYER_NAMES`
  - Game Over показывает, кто уронил башню
- ✅ **Achievements** — `achievementsTracker.js` + AchievementsPanel UI
  - first_move, five_moves, ten_moves, twenty_moves, steady_hand, speed_demon, no_collapse, architect, survivor, jenga_master
  - Toast-уведомления при разблокировке
- ✅ **Tutorial** — `InteractiveTutorialOverlay.jsx` (3-шаговый overlay с подсветкой элементов)
  - «Кликни блок → Перетащи наверх → Не урони!»
  - localStorage-флаг `jenga3d_tutorial_done`
- ✅ **Ежедневные челленджи** — `dailyChallengeTracker.js` + `DailyChallengePanel.jsx`
  - Deterministic daily seed из даты → одинаковая башня для всех игроков сегодня
  - Challenge types: survive_10, survive_15, survive_20, reach_layer_12, reach_layer_15
  - Local leaderboard (top 10 per day) с localStorage persistence
  - UI: описание челленджа, статус завершения, leaderboard таблица

### Дополнительные фичи (не были в ROADMAP)
- ✅ **Settings Panel** — `settingsTracker.js` + UI
  - Громкость (0-100%), таймер хода (15/30/60 сек), сложность (easy/normal/hard), тема блоков
- ✅ **Темы блоков** — classic (wood), neon (glow), marble (stone) — `getThemeColors()`
- ✅ **Процедурные текстуры блоков** — `blockTextures.js` (Canvas2D генерация wood grain, neon glow, marble vein)
  - Кэширование в Map, albedo-текстуры без внешних файлов
- ✅ **Difficulty-зависимая физика** — `getDifficultyDynamicIds()` меняет количество dynamic блоков
- ✅ **Particle effects** — `ParticleEffect.jsx` (взрыв зелёных звёзд при успешном ходе)
- ✅ **QR Code** — `QRCodeDisplay.jsx` (динамическая загрузка qrcode.js из CDN)
- ✅ **Achievement Toast** — slideInRight-анимация, auto-dismiss 3.5 сек
- ✅ **Pause Menu** — `PauseMenu.jsx` (полноэкранное меню паузы)
  - CSS-классы с :hover/:active/:focus, подтверждение деструктивных действий
  - Escape для закрытия, адаптивный мобильный дизайн
  - Player tag с индикацией текущего игрока
- ✅ **Keyboard accessibility** — `keyboardController.js` (Tab/Shift+Tab, Enter/Space, Arrow keys, Escape, M, R)
  - `getSelectableBlocks()`, `cycleBlock()` — навигация по блокам
- ✅ **Screen reader support** — `AriaAnnouncer.jsx` (aria-live="assertive" region)
  - Объявления: выбор блока, фазы игры, ачивки, результаты ходов

---

## 🎯 Стратегия монетизации

### Модель: Freemium + Ads

**Core loop бесплатный:** классическая Дженга, 1/2 игрока, бесконечные партии.

**Monetization layers:**

| Уровень | Фича | Цена | ROI |
|---------|-------|------|-----|
| **Ads** | Banner между партиями | $0 | 💰 CPM $2-5 |
| **Ads** | Rewarded video: «Продолжить после падения» | $0 | 💰 CPM $10-20, retention +30% |
| **Premium** | Скины блоков (неоновый, мрамор, лед) | $1-3 | 💰 5-10% conversion |
| **Premium** | Темы окружения (космос, пляж, библиотека) | $1-3 | 💰 visual variety |
| **Premium** | «Remove ads» | $2-5 | 💰 3-5% conversion |
| **SaaS** | Мультиплеер (2 игрока online) | subscription | 💰 long-term retention |

---

## 📋 Приоритетный план доработки

### P0 — Готовность к публикации (осталось: Deploy)

- ✅ **Ad SDK интеграция** — Google AdSense
  - `adService.js` — dynamic script load, banner lifecycle, rewarded video, premium ad-free check
  - `AdBanner.jsx` — fixed bottom banner, only on Start/GameOver screens (not during gameplay!)
  - `RewardedVideoButton.jsx` — «Продолжить после падения» кнопка на GameOver → видео → заморозка упавших блоков
  - `analyticsService.js` — `trackRewardedVideoStart()`, `trackRewardedVideoReward()`, `trackRewardedVideoError()` добавлены
  - `App.jsx` — `handleContinueAfterCollapse()`, `AdBanner` на Start/GameOver, `continuedAfterCollapse` state
  - `.env.production` — `VITE_ADSENSE_ID`, `VITE_AD_BANNER_SLOT`, `VITE_AD_REWARDED_SLOT` (placeholder)
  - ⚠️ **Блокер:** Нужен реальный AdSense publisher ID и ad slot IDs от Google dashboard
- [ ] **Deploy** — Vercel/Netlify (бесплатно для static)
  - ✅ `vercel.json` + `netlify.toml` конфиги готовы (headers, rewrites, cache)
  - Custom domain: `jenga3d.app` или `playjenga.com`

### P1 — Retention & Engagement (осталось: Online Leaderboard)

- ✅ **Ежедневные челленджи** — `dailyChallengeTracker.js` + `DailyChallengePanel.jsx`
  - Daily seed → одинаковая башня для всех игроков сегодня
  - Local leaderboard (top 10 per day) с localStorage
- [ ] **Online Leaderboard** — Firebase Realtime Database
  - Глобальный рейтинг ежедневных челленджей
  - Опционально: анонимный вход через Firebase Auth

### P2 — Premium content (4-8 недели)

- [ ] **Полные скины блоков** — набор текстур (albedo + normal + roughness)
  - Neon glow, Marble, Ice/crystal, Bamboo, Candy
  - ✅ Процедурные albedo-текстуры уже есть (`blockTextures.js`) — нужно добавить normal + roughness maps
- [ ] **Темы окружения** — разные GroundSurface + lighting + fog
  - Space (звёзды, туман), Beach (песок, голубой свет), Library (тёмное дерево)
- [ ] **In-app purchase flow** — Stripe или Gumroad для web
  - Или RevenueCat если оборачиваем в Capacitor/Cordova для App Store

### P3 — Мультиплеер (8-12 недели)

- [ ] **WebSocket backend** — Node.js + Socket.IO или Supabase Realtime
- [ ] **Matchmaking** — quick match или invite link
- [ ] **Spectator mode** — смотреть чужую партию
- [ ] **Rankings** — ELO-based leaderboard

### P4 — Mobile App (12+ недели)

- [ ] **Capacitor** — обёртка PWA в native iOS/Android
- [ ] **App Store / Google Play** — $99/год Apple, $25 Google
- [ ] **Push notifications** — «Твой друг играет, присоединись!»
- [ ] **Rate limiting** — 1 бесплатная партия / час → premium unlimited

---

## 📈 KPI для отслеживания

| Метрика | Цель (30 дней) | Инструмент |
|---------|----------------|------------|
| DAU | 500 | Analytics |
| Avg session length | 3+ минуты | Analytics |
| Retention D7 | 15% | Analytics |
| Ad revenue | $5/день | AdSense |
| Premium conversion | 5% | Stripe |
| Install rate (PWA) | 10% от DAU | SW events |

---

## 💡 Quick wins (0 cost, immediate impact)

1. ✅ **SEO** — `<title>`, `<meta description>`, Open Graph tags → поисковики
2. ✅ **Social sharing** — кнопка «Поделиться результатом» → Twitter/Telegram
3. ✅ **Favicon** — SVG icon → брендинг в табе браузера
4. ✅ **Performance** — lazy load Rapier (уже сделано) → быстрый первый экран
5. ✅ **Accessibility** — keyboard controls (`keyboardController.js`) + screen reader (`AriaAnnouncer.jsx`)