# Jenga 3D Online Server

Сервер для онлайн-режима и статистики игры Jenga 3D.

## Установка

```bash
cd server
npm install
```

## Запуск

```bash
# Development (с авто-перезагрузкой)
npm run dev

# Production
npm start
```

Сервер запускается на порту 3001 (или `PORT`环境变量).

## API Endpoints

### Health Check
```
GET /api/health
```

### Global Stats
```
GET /api/stats/global
```

### Leaderboard
```
GET /api/leaderboard/top?limit=10
GET /api/leaderboard/:date?mode=classic&limit=50
```

### Player
```
GET /api/player/:id
GET /api/player/:id/stats
PUT /api/player/:id/name
```

## WebSocket Protocol

### Auth
```json
{ "type": "auth", "payload": { "playerId": "xxx", "playerName": "Player" } }
```

### Create Room
```json
{ "type": "create_room", "payload": { "mode": "classic" } }
```

### Join Room
```json
{ "type": "join_room", "payload": { "roomCode": "ABC123" } }
```

### Quick Match
```json
{ "type": "quick_match", "payload": { "mode": "classic" } }
```

### Make Move
```json
{ "type": "make_move", "payload": { "blockId": 5, "targetSlot": { ... } } }
```

### Leave Room
```json
{ "type": "leave_room", "payload": {} }
```

## Database

SQLite база данных хранится в `server/data/jenga.db`.

Таблицы:
- `players` - профили игроков
- `games` - истории игр
- `game_moves` - ходы в играх
- `leaderboard` - таблица лидеров
- `player_stats` - статистика игроков

## Запуск вместе с клиентом

```bash
# Из корня проекта
npm run dev:all
```

Или вручную в двух терминалах:
```bash
# Terminal 1
npm run dev

# Terminal 2
npm run dev:server
```
