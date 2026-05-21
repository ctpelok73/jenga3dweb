# P0 Implementation Plan — Jenga 3D Publication Readiness

> Based on ROADMAP.md analysis: все P0/P1 фичи реализованы, остались **Ad SDK**, **Deploy** и **Accessibility**.

---

## 📊 Current Project Status Summary

| Компонент | Статус | Файл |
|-----------|--------|------|
| Physics engine (Rapier) | ✅ | `GameSceneWithPhysics.jsx` |
| Sound engine (Web Audio) | ✅ | `soundEngine.js` |
| Score persistence | ✅ | `scoreTracker.js` |
| Analytics (GA4) | ✅ | `analyticsService.js` — hooks `trackAdImpression()`/`trackAdClick()` готовы |
| PWA (manifest + SW) | ✅ | `manifest.json`, `sw.js` |
| SEO + Social sharing | ✅ | `index.html`, `SocialSharePanel.jsx` |
| 2-player local | ✅ | `App.jsx` — `playerMode`, `currentPlayer` |
| Achievements | ✅ | `achievementsTracker.js` |
| Tutorial | ✅ | `InteractiveTutorialOverlay.jsx` |
| Settings + Themes | ✅ | `settingsTracker.js`, `blockTextures.js` |
| Drag-and-drop | ✅ | `dragAndDropController.js`, `DragVisualFeedback.jsx` |
| Keyboard accessibility | ⚠️ Частично | `keyboardController.js` — Tab/Arrow navigation есть, но нет ARIA |
| Ad SDK | ❌ Не начат | — |
| Deploy config | ❌ Не начат | — |

---

## 🎯 Phase P0: 3 Steps to Publication

### Step 1: Ad SDK Integration (Google AdSense)

**Цель:** Banner на Start/GameOver экранах + Rewarded video «Продолжить после падения»

#### 1.1. Создать `src/adService.js` — Ad controller

```js
// Новый файл: src/adService.js
// Responsibilities:
// - Load Google AdSense script dynamically (like analyticsService.js pattern)
// - Manage banner ad lifecycle (show/hide per game phase)
// - Manage rewarded video lifecycle (request → show → reward callback)
// - Integration with existing analyticsService.trackAdImpression/trackAdClick
// - Premium check: if user purchased "remove ads", skip all ad calls
```

**Детали реализации:**

| Метод | Описание | Analytics hook |
|-------|----------|----------------|
| `initAdSDK()` | Dynamic script load `pagead2.googlesyndication.com/pagead/js/adsbygoogle.js` | — |
| `showBannerAd(slot)` | Insert `<ins class="adsbygoogle">` into `#ad-banner-container`, push ad | `trackAdImpression('banner')` |
| `hideBannerAd()` | Remove/collapse banner container | — |
| `showRewardedVideo(callback)` | `adsbygoogle.push({ google_ad_type: 'rewarded_video' })` → callback(onReward) | `trackAdImpression('rewarded')` |
| `isAdFree()` | Check localStorage `jenga3d_ad_free` flag | — |

**Зависимости:** 
- Google AdSense account + publisher ID (`data-ad-client`)
- Ad slot IDs (`data-ad-slot`) для banner и rewarded — нужны от Google dashboard
- `VITE_ADSENSE_ID` env variable

#### 1.2. Создать `src/AdBanner.jsx` — React component

```jsx
// Новый файл: src/AdBanner.jsx
// Position: fixed bottom, 320x50 standard mobile banner
// Props: visible (boolean), adSlot (string)
// Renders: <ins class="adsbygoogle"> container
// Lifecycle: mount → push ad, unmount → collapse
```

**Стили:**
- `position: fixed; bottom: 0; left: 0; width: 100%; height: 50px; z-index: 15;`
- Только на `PHASE_START` и `PHASE_GAME_OVER` экранах (не во время игры!)
- Background: `rgba(0,0,0,0.9)` для seamless merge с UI

#### 1.3. Создать `src/RewardedVideoButton.jsx` — «Продолжить» button

```jsx
// Новый файл: src/RewardedVideoButton.jsx
// Appears on GameOverScreen instead of/in addition to "Играть снова"
// Text: "▶ Продолжить (watch ad)" 
// On click: showRewardedVideo → on reward granted → freeze fallen blocks + continue
```

**Критическая логика «Продолжить после падения»:**
1. Game Over → показать кнопку «Продолжить» рядом с «Играть снова»
2. Клик → `showRewardedVideo()` → видео воспроизводится
3. Если reward granted → `handleContinueAfterCollapse()`:
   - Заморозить все упавшие блоки (set `isDynamic: false` для fallen blocks)
   - Вернуть `phase` к `PHASE_PLAYING`
   - Не сбрасывать `turnCount` — продолжаем с того же хода
  - `trackAdClick('rewarded')` в analytics

#### 1.4. Изменить `src/App.jsx` — интеграция ad компонентов

**Точки вставки:**

| Локация | Изменение |
|----------|-----------|
| Line 10 (imports) | `+ import { initAdSDK, showBannerAd, hideBannerAd, showRewardedVideo, isAdFree } from './adService';` |
| Line 505 (App state) | `+ const [adFree, setAdFree] = useState(() => isAdFree());` |
| Line 588-599 (useEffect init) | `+ initAdSDK();` после `initializeAnalytics()` |
| Line 861-869 (StartScreen render) | Обернуть в `<div>` + `<AdBanner visible={phase === PHASE_START && !adFree} />` |
| Line 909-911 (GameOverScreen render) | Добавить `<AdBanner visible={phase === PHASE_GAME_OVER && !adFree} />` + передать `onContinueAfterCollapse` prop |
| Line 390-464 (GameOverScreen) | Добавить кнопку «Продолжить (ad)» рядом с «Играть снова» |
| Line 795-834 (handleSimulationComplete) | Добавить `handleContinueAfterCollapse` логику |
| New state | `+ const [continuedAfterCollapse, setContinuedAfterCollapse] = useState(false);` |

**Новый метод `handleContinueAfterCollapse`:**

```js
const handleContinueAfterCollapse = useCallback(() => {
  // Freeze fallen blocks — set them as fixed so tower stays as-is
  const frozenBlocks = blocks.map(b => {
    if (b.position[1] < -0.5) {
      return { ...b, position: [b.position[0], 0.01, b.position[2]], layer: -1 }; // snap to ground
    }
    return b;
  });
  setBlocks(frozenBlocks);
  setPhase(PHASE_PLAYING);
  setMessage('🔄 Продолжаем! Башня стабилизирована.');
  setContinuedAfterCollapse(true);
  trackAdClick('rewarded');
}, [blocks]);
```

#### 1.5. Изменить `index.html` — AdSense bootstrap

```html
<!-- В <head>, после GA script: -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXX" crossorigin="anonymous"></script>
```

> ⚠️ **Блокер:** Нужен реальный AdSense publisher ID. Без него реклама не работает. Можно использовать тестовый `ca-pub-XXXXXXX` для dev, но для production нужен одобренный Google аккаунт.

#### 1.6. Обновить `src/analyticsService.js` — добавить rewarded tracking

```js
// Новые методы:
export function trackRewardedVideoStart() {
  trackEvent('rewarded_video_start', { timestamp: new Date().toISOString() });
}
export function trackRewardedVideoReward(ad_free_continuation = false) {
  trackEvent('rewarded_video_reward', { ad_free_continuation });
}
export function trackRewardedVideoError(error_code) {
  trackEvent('rewarded_video_error', { error_code });
}
```

---

### Step 2: Accessibility (ARIA + Keyboard polish)

**Цель:** Quick win #5 из ROADMAP — keyboard controls (Tab + Enter) + ARIA атрибуты

> `keyboardController.js` уже реализует Tab/Arrow/Enter навигацию. Но **ARIA атрибуты отсутствуют** — screen readers не понимают UI.

#### 2.1. Изменить `src/App.jsx` — ARIA labels на всех экранах

| Компонент | Изменение |
|-----------|-----------|
| `StartScreen` | `role="dialog"`, `aria-label="Start screen"`, кнопки `aria-label` |
| `GameOverScreen` | `role="dialog"`, `aria-label="Game over"`, статистика `aria-live="polite"` |
| `UIPanel` | `role="status"`, `aria-live="polite"` для message div |
| `SettingsPanel` | `role="dialog"`, `aria-label="Settings"`, slider `aria-label="Volume"` |
| `AchievementsPanel` | `role="dialog"`, `aria-label="Achievements"` |
| `PauseMenu` | `role="dialog"`, `aria-label="Pause menu"` |
| `AchievementToast` | `role="alert"`, `aria-live="assertive"` |

**Примеры конкретных изменений:**

```jsx
// StartScreen — line 331
<div style={screenStyles.container} role="dialog" aria-label="Стартовый экран">

// UIPanel message div — line 488  
<div style={baseStyles.message} aria-live="polite">{message}</div>

// GameOverScreen — line 401
<div style={screenStyles.container} role="dialog" aria-label="Конец игры">

// AchievementToast — line 114
<div style={...} role="alert" aria-live="assertive">

// Settings slider — line 212
<input type="range" aria-label="Громкость" ... />

// Кнопки — добавить aria-label везде
<button aria-label="Начать игру" ...>▶ Начать игру</button>
```

#### 2.2. Изменить `src/GameSceneWithPhysics.jsx` — ARIA на 3D блоках

Блоки в Canvas не доступны для screen readers напрямую. Решение: **скрытый ARIA overlay** вне Canvas.

```jsx
// В App.jsx, после <GameScene>: скрытый div с описанием состояния
<div aria-hidden="true" id="game-state-description" style={{ position: 'absolute', clip: 'rect(0,0,0,0)' }}>
  Башня: {towerHeight} слоёв, {turnCount} ходов. {message}
</div>
```

> ⚡ Canvas-элементы по стандарту WCAG требуют `aria-hidden="true"` на самом `<canvas>`, а состояние передавать через отдельный ARIA-live region.

#### 2.3. Изменить `src/keyboardController.js` — добавить ARIA focus announcement

```js
// В handleKeyEvent → 'focus' action: 
// Добавить aria-activedescendant на game container
// Или создать визуальный focus indicator (уже есть через keyboardFocusId → yellow emissive)
```

Текущая реализация уже подсвечивает блок yellow emissive при keyboard focus (line 68 `GameSceneWithPhysics.jsx`). Это визуально работает, но нужно добавить **screen reader announcement**:

```jsx
// App.jsx — после setKeyboardFocusId:
if (result.action === 'focus') {
  setKeyboardFocusId(result.focusId);
  // Announce to screen reader
  const block = blocks.find(b => b.id === result.focusId);
  if (block) {
    setAnnouncement(`Блок ${result.focusId + 1}, слой ${block.layer + 1}`);
  }
}
```

#### 2.4. Создать `src/AriaAnnouncer.jsx` — live region component

```jsx
// Новый файл: src/AriaAnnouncer.jsx
// Компонент с aria-live="assertive" для объявления изменений состояния
// Используется для: block selection, game over, achievement unlocks
```

---

### Step 3: Deploy Configuration (Vercel/Netlify)

**Цель:** Production-ready deploy с custom domain

#### 3.1. Создать `vercel.json` — Vercel config

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" }
      ]
    }
  ],
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

#### 3.2. Обновить `vite.config.js` — production optimizations

```js
// Добавить в defineConfig:
build: {
  // ... existing chunkSizeWarningLimit + rollupOptions
  minify: 'terser',          // лучше чем esbuild для production
  sourcemap: false,           // не публиковать sourcemaps
  target: 'es2020',           // modern browsers only
},
server: {
  headers: {
    'X-Content-Type-Options': 'nosniff',
  },
},
```

#### 3.3. Обновить `public/sw.js` — cache hashed assets

```js
// Текущий SW caches только /, /index.html, /manifest.json
// Нужно: при build генерировать список всех hashed assets и включать в SW
// Решение: vite-plugin-pwa или ручная генерация

// Простой подход — cache-all-on-install стратегия:
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
];
// + dynamic caching всех /assets/* запросов (уже есть в fetch handler)
```

#### 3.4. Создать `.env.production` — production env vars

```env
VITE_GA_ID=G-XXXXXXXXXX
VITE_ADSENSE_ID=ca-pub-XXXXXXXXXX
VITE_SITE_URL=https://jenga3d.app
```

#### 3.5. Создать `netlify.toml` (альтернатива Vercel)

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## 🏗️ Architectural Considerations

### 1. Ad SDK Architecture Decision

**Google AdSense vs Unity Ads:**

| Критерий | AdSense | Unity Ads |
|-----------|---------|-----------|
| Web support | ✅ Native web | ❌ Requires Unity wrapper |
| Rewarded video | ⚠️ Limited (beta) | ✅ Full support |
| Setup complexity | Low (script tag) | High (SDK wrapper) |
| PWA compatibility | ✅ Works in browser | ❌ Native app only |
| Revenue model | CPM-based | CPI-based |

**Рекомендация:** Google AdSense для banner + **Google Ad Manager** для rewarded video (если AdSense rewarded недоступен, fallback: показать interstitial banner как «rewarded» с таймером 5 сек).

> ⚠️ **Критический блокер:** Google AdSense **rewarded video** доступен только для одобренных publishers с >100k impressions/мес. На начальном этапе нужно использовать **interstitial ad** как pseudo-rewarded (показать fullscreen ad 5 сек → продолжить).

### 2. State Management — `continuedAfterCollapse`

Новый state `continuedAfterCollapse` (boolean) нужен для:
- Отслеживания, что игрок уже использовал «Продолжить» (лимит 1 раз на партию)
- Блокировки повторного rewarded video в той же партии
- Analytics: `trackEvent('game_continued_after_collapse')`

### 3. Ad-Free Premium Flow

`settingsTracker.js` нужно расширить:
```js
// Новый key в DEFAULT_SETTINGS:
adFree: false,  // true после покупки "Remove ads"

// Или отдельный localStorage key:
const AD_FREE_KEY = 'jenga3d_ad_free';
export function isAdFree() {
  try { return localStorage.getItem(AD_FREE_KEY) === '1'; } catch { return false; }
}
export function setAdFree(value) {
  try { localStorage.setItem(AD_FREE_KEY, value ? '1 : '0'); } catch {}
}
```

> Это placeholder для P2 (Stripe/Gumroad purchase). На P0 — просто localStorage flag для тестирования.

### 4. PWA + Ads Compatibility

Service Worker (`sw.js`) должен **не кэшировать** AdSense скрипты и запросы:
```js
// В fetch handler — bypass cache для ad domains:
if (event.request.url.includes('googlesyndication.com') || 
    event.request.url.includes('googleadservices.com') ||
    event.request.url.includes('doubleclick.net')) {
  return; // Не интерceptить ad requests
}
```

### 5. Performance Impact

- Banner ad: ~50KB дополнительный JS (AdSense script) — загружается async, не блокирует
- Rewarded video: ~200KB + video stream — lazy load только при клике «Продолжить»
- ARIA attributes: 0 KB overhead (только HTML attributes)
- Deploy config: 0 KB overhead

---

## 🚧 Potential Blockers

| # | Блокер | Влияние | Решение |
|---|--------|---------|---------|
| 1 | **AdSense account approval** | Не можем показать реальную рекламу | Использовать тестовый режим `data-ad-test="on"` для dev; подать заявку на AdSense параллельно |
| 2 | **AdSense rewarded video beta** | Ограниченный доступ | Fallback: interstitial ad (5 сек fullscreen) |
| 3 | **Custom domain DNS** | `jenga3d.app` нужен DNS настройка | Зарегистрировать domain → Vercel/Netlify auto-config |
| 4 | **CORS для AdSense на PWA** | SW может блокировать ad scripts | Добавить bypass в `sw.js` fetch handler |
| 5 | **iOS Safari ad blocking** | Intelligent Tracking Prevention | AdSense работает, но limited tracking; analytics OK с `anonymize_ip` |
| 6 | **Canvas accessibility** | WCAG 2.1 AA требует text alternative | ARIA-live region + hidden description div |
| 7 | **`vite-plugin-pwa`** | SW не кэширует hashed assets автоматически | Ручное обновление `ASSETS_TO_CACHE` или интеграция `vite-plugin-pwa` |

---

## 📦 Required Dependencies

| Пакет | Версия | Назначение | Когда |
|-------|--------|------------|-------|
| `vite-plugin-pwa` | ^0.21.x | Auto-generate SW с hashed assets | Step 3 |
| `terser` | ^5.x | Production minification (уже в vite) | Step 3 |

> AdSense не требует npm пакет — чисто script tag. Unity Ads тоже не нужен (web-only стратегия).

---

## 📋 Execution Order (Dependency Chain)

```
Step 2 (Accessibility) → независим, можно делать параллельно
Step 1.1 (adService.js) → Step 1.2 (AdBanner.jsx) → Step 1.3 (RewardedVideoButton.jsx) → Step 1.4 (App.jsx integration)
Step 1.5 (index.html) → параллельно с Step 1.1
Step 1.6 (analyticsService.js) → параллельно с Step 1.1
Step 3.1 (vercel.json) → Step 3.2 (vite.config.js) → Step 3.3 (sw.js) → Step 3.4 (.env.production)
Step 3.5 (netlify.toml) → параллельно с Step 3.1
```

**Рекомендуемая последовательность:**
1. **Step 2** (Accessibility) — 0 зависимостей, quick win, можно завершить за 1 час
2. **Step 1.1–1.6** (Ad SDK) — основная работа, 3-4 часа
3. **Step 3.1–3.5** (Deploy) — финальный шаг, 30 мин
4. **Тестирование** — проверить ad load, keyboard nav, deploy build

---

## ✅ Acceptance Criteria для P0

| Критерий | Проверка |
|----------|----------|
| Banner ad показывается на Start screen | Visual test + `trackAdImpression` в GA |
| Banner ad показывается на GameOver screen | Visual test |
| Banner ad НЕ показывается во время игры (PHASE_PLAYING) | No ad container in DOM |
| Rewarded video кнопка видна на GameOver | Button exists |
| После rewarded video → игра продолжается | `phase === PHASE_PLAYING`, blocks frozen |
| Повторный «Продолжить» заблокирован (1 раз/партия) | Button disabled/hidden |
| Tab/Arrow keyboard navigation работает | Focus moves between blocks |
| ARIA labels на всех экранах | Axe/WAVE audit pass |
| `aria-live` announcements для game state | Screen reader test |
| `npm run build` → successful production bundle | No errors |
| Vercel/Netlify deploy → live URL | HTTPS, PWA installable |
| Service worker bypasses ad requests | No CORS/cache errors for AdSense |
| Lighthouse score ≥ 80 (Performance + Accessibility) | Chrome Lighthouse audit |