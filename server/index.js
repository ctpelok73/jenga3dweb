import { WebSocketServer } from 'ws';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';
import { initDB, saveGameResult, getPlayerStats, getLeaderboard, recordPlayerAction, ensurePlayer, getGlobalStats, updatePlayerName as dbUpdateName } from './database.js';

const PORT = process.env.PORT || 3001;

// ─── HTTP Server for REST API ──────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  if (req.method === 'GET' && path.startsWith('/api/player/')) {
    const playerId = path.split('/api/player/')[1];
    if (!playerId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Missing player ID' }));
      return;
    }
    const stats = getPlayerStats(playerId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, ...stats }));
    return;
  }

  if (req.method === 'PUT' && path.match(/^\/api\/player\/[^/]+\/name$/)) {
    const playerId = path.split('/api/player/')[1].split('/')[0];
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { name } = JSON.parse(body);
        if (!name || name.trim().length < 1 || name.trim().length > 20) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Invalid name' }));
          return;
        }
        dbUpdateName(playerId, name.trim());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (req.method === 'GET' && path === '/api/leaderboard/top') {
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const board = getLeaderboard(limit);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, entries: board }));
    return;
  }

  if (req.method === 'GET' && path.startsWith('/api/leaderboard/')) {
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const board = getLeaderboard(limit);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, entries: board }));
    return;
  }

  if (req.method === 'GET' && path === '/api/stats/global') {
    const stats = getGlobalStats();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, stats }));
    return;
  }

  if (req.method === 'GET' && path === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, uptime: process.uptime() }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'Not found' }));
});

// ─── WebSocket Server ──────────────────────────────────────────────────────
const wss = new WebSocketServer({ server });

const rooms = new Map();
const playerToRoom = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function createRoom(playerId, playerName, mode = 'classic') {
  const roomId = uuidv4();
  const code = generateRoomCode();
  const room = {
    id: roomId,
    code,
    host: playerId,
    players: new Map(),
    state: 'waiting',
    blocks: null,
    currentPlayer: 0,
    turnCount: 0,
    mode,
    createdAt: Date.now(),
  };
  room.players.set(playerId, { ws: null, name: playerName });
  rooms.set(roomId, room);
  return room;
}

function serializeRoom(room) {
  const players = [];
  for (const [pid, p] of room.players) {
    players.push({ id: pid, name: p.name });
  }
  return {
    roomId: room.id,
    roomCode: room.code,
    mode: room.mode,
    players,
  };
}

function send(ws, message) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  }
}

function getOpponentName(room, playerId) {
  for (const [pid, p] of room.players) {
    if (pid !== playerId) return p.name;
  }
  return null;
}

function getOpponentWs(room, playerId) {
  for (const [pid, p] of room.players) {
    if (pid !== playerId && p.ws && p.ws.readyState === 1) return p.ws;
  }
  return null;
}

// ─── Tower generation (mirrors client domain/tower.js) ─────────────────────
const BLOCK_H = 0.3;
const LAYER_GAP = 0.01;
const BLOCK_D = 0.5;
const GAP = 0.02;
const STEP = BLOCK_D + GAP;
const TOWER_LAYERS = 18;
const BLOCKS_PER_LAYER = 3;

function generateTower() {
  const colors = [
    '#b5651d', '#a0522d', '#8b4513', '#cd853f', '#deb887',
    '#d2b48c', '#c19a6b', '#b8860b', '#daa520', '#bc8f8f',
  ];
  const blocks = [];
  let id = 0;
  for (let layer = 0; layer < TOWER_LAYERS; layer++) {
    const y = layer * (BLOCK_H + LAYER_GAP) + BLOCK_H / 2;
    const isOdd = layer % 2 === 1;
    const rotation = isOdd ? [0, Math.PI / 2, 0] : [0, 0, 0];
    for (let b = 0; b < BLOCKS_PER_LAYER; b++) {
      const offset = -STEP + b * STEP;
      blocks.push({
        id,
        position: isOdd ? [offset, y, 0] : [0, y, offset],
        rotation,
        color: colors[id % colors.length],
        layer,
      });
      id++;
    }
  }
  return blocks;
}

function getLayerY(layer) {
  return layer * (BLOCK_H + LAYER_GAP) + BLOCK_H / 2;
}

function isOddLayer(layer) {
  return layer % 2 === 1;
}

function getLayerRotation(layer) {
  return isOddLayer(layer) ? [0, Math.PI / 2, 0] : [0, 0, 0];
}

function getSlotPosition(layer, slotIndex) {
  const y = getLayerY(layer);
  const offset = -STEP + slotIndex * STEP;
  return isOddLayer(layer) ? [offset, y, 0] : [0, y, offset];
}

function getMaxLayer(blocks) {
  return blocks.reduce((m, b) => Math.max(m, b.layer), 0);
}

function getSlotIndexFromPosition(layer, position) {
  const val = isOddLayer(layer) ? position[0] : position[2];
  if (!Number.isFinite(val)) return 0;
  return Math.max(0, Math.min(BLOCKS_PER_LAYER - 1, Math.round((val + STEP) / STEP)));
}

function getFreeSlots(blocks, layer) {
  const occupied = new Set(
    blocks.filter(b => b.layer === layer).map(b => getSlotIndexFromPosition(layer, b.position))
  );
  const free = [];
  for (let s = 0; s < BLOCKS_PER_LAYER; s++) {
    if (!occupied.has(s)) free.push(s);
  }
  return free;
}

function computeMoveResult(blocks, blockId, targetSlot) {
  const moveBlock = blocks.find(b => b.id === blockId);
  if (!moveBlock) return null;

  // targetSlot can be either a raw slot index (number) or a slot object
  // from the client ({ slotIndex, position, rotation, newLayer })
  const targetSlotIndex = (targetSlot !== undefined && targetSlot !== null)
    ? (typeof targetSlot === 'object' ? targetSlot.slotIndex : targetSlot)
    : null;

  const removedLayer = moveBlock.layer;
  const maxLayer = getMaxLayer(blocks);
  const topLayerBlocks = blocks.filter(b => b.layer === maxLayer);

  let newLayer, newSlot;
  if (targetSlotIndex !== null) {
    if (topLayerBlocks.length >= BLOCKS_PER_LAYER) {
      newLayer = maxLayer + 1;
      newSlot = targetSlotIndex;
    } else {
      newLayer = maxLayer;
      newSlot = targetSlotIndex;
    }
  } else {
    if (topLayerBlocks.length >= BLOCKS_PER_LAYER) {
      newLayer = maxLayer + 1;
      newSlot = 0;
    } else {
      newLayer = maxLayer;
      const free = getFreeSlots(blocks, maxLayer);
      newSlot = free.length > 0 ? free[0] : 0;
    }
  }

  const newPosition = getSlotPosition(newLayer, newSlot);
  const newRotation = getLayerRotation(newLayer);

  const updatedBlocks = blocks.map(b =>
    b.id === blockId
      ? { ...b, position: newPosition, rotation: newRotation, layer: newLayer }
      : b
  );

  return { updatedBlocks, extractionPosition: [...moveBlock.position] };
}

// ─── Game Logic ────────────────────────────────────────────────────────────
function handleMove(room, playerId, moveData) {
  if (room.state !== 'playing') return;

  const playerIndex = [...room.players.keys()].indexOf(playerId);
  if (playerIndex !== room.currentPlayer) {
    send(room.players.get(playerId)?.ws, {
      type: 'error',
      payload: { message: 'Не ваш ход' },
    });
    return;
  }

  // Compute new block state server-side
  const result = computeMoveResult(room.blocks, moveData.blockId, moveData.targetSlot);
  if (!result) {
    send(room.players.get(playerId)?.ws, {
      type: 'error',
      payload: { message: 'Невозможно выполнить ход' },
    });
    return;
  }

  room.blocks = result.updatedBlocks;
  room.turnCount++;
  room.currentPlayer = room.currentPlayer === 0 ? 1 : 0;

  recordPlayerAction(playerId, 'move', {
    turn: room.turnCount,
    blockId: moveData.blockId,
    targetSlot: moveData.targetSlot,
  });

  const movePayload = {
    blocks: room.blocks,
    currentPlayer: room.currentPlayer,
    turnCount: room.turnCount,
    move: {
      blockId: moveData.blockId,
      targetSlot: moveData.targetSlot,
      extractionPosition: result.extractionPosition,
    },
  };

  // Notify opponent
  const opponentWs = getOpponentWs(room, playerId);
  if (opponentWs) {
    send(opponentWs, {
      type: 'opponent_moved',
      payload: { ...movePayload, yourTurn: true },
    });
  }

  // Acknowledge to mover
  send(room.players.get(playerId)?.ws, {
    type: 'move_made',
    payload: { ...movePayload, yourTurn: false },
  });
}

function handleCollapse(room, playerId) {
  if (room.state !== 'playing') return;

  room.state = 'finished';
  const winnerId = [...room.players.keys()].find(id => id !== playerId);

  for (const [pid] of room.players) {
    const won = pid === winnerId;
    saveGameResult(pid, {
      won,
      turns: room.turnCount,
      gameMode: room.mode,
      opponent: winnerId,
      roomId: room.id,
    });
  }

  // Send different results to winner and loser
  for (const [pid, p] of room.players) {
    if (p.ws && p.ws.readyState === 1) {
      send(p.ws, {
        type: 'game_over',
        payload: {
          winner: pid === winnerId,
          collapsed: true,
          turnCount: room.turnCount,
        },
      });
    }
  }
}

// ─── Quick Match ───────────────────────────────────────────────────────────
function quickMatch(playerId, playerName, mode) {
  for (const [, room] of rooms) {
    if (room.state === 'waiting' && room.mode === mode && room.players.size === 1) {
      return { room, isJoining: true };
    }
  }
  return { room: createRoom(playerId, playerName, mode), isJoining: false };
}

// ─── Start game helper ─────────────────────────────────────────────────────
function startGameInRoom(room) {
  room.state = 'playing';
  room.currentPlayer = 0;
  room.turnCount = 0;
  if (!room.blocks) {
    room.blocks = generateTower();
  }

  const playerIds = [...room.players.keys()];

  // Player 0 (host) goes first
  for (let i = 0; i < playerIds.length; i++) {
    const pid = playerIds[i];
    const p = room.players.get(pid);
    if (!p.ws || p.ws.readyState !== 1) continue;

    const opponentName = getOpponentName(room, pid);
    const isFirst = i === 0;

    send(p.ws, {
      type: isFirst ? 'opponent_joined' : 'room_joined',
      payload: {
        roomId: room.id,
        roomCode: room.code,
        mode: room.mode,
        blocks: room.blocks,
        currentPlayer: 0,
        yourTurn: isFirst,
        opponentName,
      },
    });
  }
}

// ─── WebSocket Connection Handler ──────────────────────────────────────────
wss.on('connection', (ws) => {
  let playerId = null;
  let playerName = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      send(ws, { type: 'error', payload: { message: 'Invalid message' } });
      return;
    }

    const { type, payload } = msg;

    switch (type) {
      case 'auth': {
        playerId = payload.playerId || ('p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8));
        playerName = payload.playerName || 'Аноним';
        ensurePlayer(playerId, playerName);
        send(ws, { type: 'auth_ok', payload: { playerId } });
        break;
      }

      case 'create_room': {
        if (!playerId) {
          send(ws, { type: 'error', payload: { message: 'Not authenticated' } });
          return;
        }
        const mode = payload.mode || 'classic';
        const room = createRoom(playerId, playerName, mode);
        room.players.get(playerId).ws = ws;
        playerToRoom.set(ws, room.id);

        const blocks = generateTower();
        room.blocks = blocks;

        // FIX: send 'room_created' so client shows waiting screen
        send(ws, {
          type: 'room_created',
          payload: {
            roomId: room.id,
            roomCode: room.code,
            mode: room.mode,
            blocks,
          },
        });
        break;
      }

      case 'join_room': {
        if (!playerId) {
          send(ws, { type: 'error', payload: { message: 'Not authenticated' } });
          return;
        }
        const code = (payload.roomCode || '').toUpperCase();
        let targetRoom = null;
        for (const [, r] of rooms) {
          if (r.code === code && r.state === 'waiting') {
            targetRoom = r;
            break;
          }
        }
        if (!targetRoom) {
          send(ws, { type: 'error', payload: { message: 'Комната не найдена' } });
          return;
        }
        if (targetRoom.players.size >= 2) {
          send(ws, { type: 'error', payload: { message: 'Комната полна' } });
          return;
        }

        targetRoom.players.set(playerId, { ws, name: playerName });
        playerToRoom.set(ws, targetRoom.id);

        startGameInRoom(targetRoom);
        break;
      }

      case 'quick_match': {
        if (!playerId) {
          send(ws, { type: 'error', payload: { message: 'Not authenticated' } });
          return;
        }
        const mode = payload.mode || 'classic';
        const { room, isJoining } = quickMatch(playerId, playerName, mode);

        if (!isJoining) {
          // Created new room — waiting
          room.players.get(playerId).ws = ws;
          playerToRoom.set(ws, room.id);

          const blocks = generateTower();
          room.blocks = blocks;

          send(ws, {
            type: 'waiting_for_opponent',
            payload: {
              roomId: room.id,
              roomCode: room.code,
              mode: room.mode,
              blocks,
            },
          });
        } else {
          // Joining existing room — start game
          room.players.get(playerId).ws = ws;
          playerToRoom.set(ws, room.id);
          startGameInRoom(room);
        }
        break;
      }

      case 'make_move': {
        const roomId = playerToRoom.get(ws);
        const room = rooms.get(roomId);
        if (!room || room.state !== 'playing') return;
        handleMove(room, playerId, payload);
        break;
      }

      case 'tower_collapsed': {
        const roomId = playerToRoom.get(ws);
        const room = rooms.get(roomId);
        if (!room || room.state !== 'playing') return;
        handleCollapse(room, playerId);
        break;
      }

      case 'leave_room': {
        const roomId = playerToRoom.get(ws);
        if (!roomId) return;
        const room = rooms.get(roomId);
        if (room) {
          for (const [pid, p] of room.players) {
            if (pid !== playerId && p.ws && p.ws.readyState === 1) {
              send(p.ws, {
                type: 'opponent_left',
                payload: { message: 'Противник покинул игру' },
              });
            }
          }
          rooms.delete(roomId);
        }
        playerToRoom.delete(ws);
        break;
      }

      case 'ping': {
        send(ws, { type: 'pong', payload: {} });
        break;
      }

      default:
        send(ws, { type: 'error', payload: { message: 'Unknown message type' } });
    }
  });

  ws.on('close', () => {
    const roomId = playerToRoom.get(ws);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        for (const [pid, p] of room.players) {
          if (pid !== playerId && p.ws && p.ws.readyState === 1) {
            send(p.ws, {
              type: 'opponent_left',
              payload: { message: 'Противник отключился' },
            });
          }
        }
        rooms.delete(roomId);
      }
      playerToRoom.delete(ws);
    }
  });

  ws.on('error', () => {
    playerToRoom.delete(ws);
  });
});

// ─── Cleanup stale rooms every 5 minutes ───────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (room.players.size === 0 || now - room.createdAt > 3600000) {
      rooms.delete(id);
    }
  }
}, 300000);

// ─── Start ─────────────────────────────────────────────────────────────────
initDB();

server.listen(PORT, () => {
  console.log(`[Jenga Server] Running on http://localhost:${PORT}`);
  console.log(`[Jenga Server] WebSocket on ws://localhost:${PORT}`);
});
