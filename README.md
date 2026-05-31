# Jenga 3D

3D-игра Jenga на **React + Vite + Three.js** с физикой через `@react-three/rapier`.

## Возможности

- Башня 18 x 3 блока с чередованием ориентации слоев.
- Режимы: один игрок, два игрока, игрок против ИИ.
- Выбор блока кликом, клавиатурой и мобильными жестами.
- Перенос блока наверх через кнопку или выбор слота на вершине.
- Физическая стабилизация, каскадное падение слоев и экран завершения партии.
- Настройки сложности, громкости, темы блоков и окружения.
- Достижения, daily challenge, локальные рекорды, share/replay-сервисы.
- PWA-сборка с lazy loading тяжелой 3D/physics части.

## Запуск

```bash
npm install
npm run dev
```

По умолчанию dev-сервер доступен на `http://localhost:5173/`.

## Проверки

```bash
npm run test:run
npm run build
npm run check:build-budget
npm run preview
```

`check:build-budget` проверяет, что `rapier`/`r3f` не попали в initial scripts и обязательный PWA precache.

E2E-каркас:

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
  App.jsx                    # состояние игры, экраны, AI turn flow
  GameScene.jsx              # lazy boundary для 3D сцены
  GameSceneWithPhysics.jsx   # Three/Rapier сцена и симуляция
  keyboardController.js      # клавиатурная навигация
  touchGestureController.js  # мобильные свайпы/long-press/pinch
  settingsTracker.js         # локальные настройки
  scoreTracker.js            # локальные рекорды
  purchaseService.js         # premium status и verification gates
  test/                      # Vitest unit/smoke tests
tests/e2e/                   # Playwright smoke scenarios
scripts/                     # build-budget checks
```

## Roadmap

Актуальный план развития находится в `DEVELOPMENT_PLAN.md`; исторические отчеты и чеклисты оставлены в корне проекта для контекста прошлых интеграций.
