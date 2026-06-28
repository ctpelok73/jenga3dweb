const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

let ws = null;
let playerId = null;
let playerName = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 5;
const listeners = new Map();
let pingInterval = null;
let reconnectTimeout = null;

function generatePlayerId() {
  let id = localStorage.getItem('jenga3d_player_id');
  if (!id) {
    id = 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('jenga3d_player_id', id);
  }
  return id;
}

function getPlayerName() {
  return localStorage.getItem('jenga3d_player_name') || 'Аноним';
}

function setPlayerName(name) {
  localStorage.setItem('jenga3d_player_name', name);
}

function emit(event, data) {
  const callbacks = listeners.get(event);
  if (callbacks) {
    callbacks.forEach(cb => {
      try { cb(data); } catch (e) { console.error('[Online] Listener error:', e); }
    });
  }
}

function on(event, callback) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(callback);
  return () => listeners.get(event)?.delete(callback);
}

function send(type, payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('[Online] Not connected, cannot send:', type);
    return false;
  }
  ws.send(JSON.stringify({ type, payload }));
  return true;
}

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    ws = new WebSocket(WS_URL);
  } catch (err) {
    console.error('[Online] Connection failed:', err);
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    console.log('[Online] Connected');
    reconnectAttempts = 0;
    emit('connected');
    
    playerId = generatePlayerId();
    playerName = getPlayerName();
    send('auth', { playerId, playerName });

    clearInterval(pingInterval);
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        send('ping', {});
      }
    }, 25000);
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleServerMessage(message);
    } catch (err) {
      console.error('[Online] Parse error:', err);
    }
  };

  ws.onclose = () => {
    console.log('[Online] Disconnected');
    clearInterval(pingInterval);
    emit('disconnected');
    scheduleReconnect();
  };

  ws.onerror = (err) => {
    console.error('[Online] WebSocket error:', err);
  };
}

function scheduleReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT) {
    emit('reconnect_failed');
    return;
  }
  
  clearTimeout(reconnectTimeout);
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
  reconnectAttempts++;
  
  reconnectTimeout = setTimeout(() => {
    emit('reconnecting', { attempt: reconnectAttempts });
    connect();
  }, delay);
}

function handleServerMessage(message) {
  const { type, payload } = message;
  
  switch (type) {
    case 'auth_ok':
      emit('auth_ok', payload);
      break;
    case 'room_created':
      emit('room_created', payload);
      break;
    case 'room_joined':
      emit('room_joined', payload);
      break;
    case 'opponent_joined':
      emit('opponent_joined', payload);
      break;
    case 'waiting_for_opponent':
      emit('waiting_for_opponent', payload);
      break;
    case 'move_made':
      emit('move_made', payload);
      break;
    case 'opponent_moved':
      emit('opponent_moved', payload);
      break;
    case 'game_over':
      emit('game_over', payload);
      break;
    case 'opponent_left':
      emit('opponent_left', payload);
      break;
    case 'stats':
      emit('stats', payload);
      break;
    case 'leaderboard':
      emit('leaderboard', payload);
      break;
    case 'error':
      emit('error', payload);
      break;
    case 'pong':
      break;
    default:
      console.warn('[Online] Unknown message type:', type);
  }
}

function disconnect() {
  clearTimeout(reconnectTimeout);
  clearInterval(pingInterval);
  reconnectAttempts = MAX_RECONNECT;
  if (ws) {
    ws.close();
    ws = null;
  }
}

function isConnected() {
  return ws && ws.readyState === WebSocket.OPEN;
}

function createRoom(mode = 'classic') {
  return send('create_room', { mode });
}

function joinRoom(roomCode) {
  return send('join_room', { roomCode: roomCode.toUpperCase() });
}

function quickMatch(mode = 'classic') {
  return send('quick_match', { mode });
}

function makeMove(blockId, targetSlot) {
  return send('make_move', { blockId, targetSlot });
}

function leaveRoom() {
  return send('leave_room', {});
}

function reportCollapse() {
  return send('tower_collapsed', {});
}

async function getStats(playerIdParam) {
  const targetId = playerIdParam || playerId;
  try {
    const res = await fetch(`${API_URL}/api/player/${targetId}`);
    const data = await res.json();
    return data.ok ? data : null;
  } catch {
    return null;
  }
}

async function getLeaderboard(date, mode, limit = 50) {
  try {
    const params = new URLSearchParams();
    if (mode) params.set('mode', mode);
    params.set('limit', limit.toString());
    const url = date 
      ? `${API_URL}/api/leaderboard/${date}?${params}`
      : `${API_URL}/api/leaderboard/top?${params}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.ok ? data.entries : [];
  } catch {
    return [];
  }
}

async function getGlobalStats() {
  try {
    const res = await fetch(`${API_URL}/api/stats/global`);
    const data = await res.json();
    return data.ok ? data.stats : null;
  } catch {
    return null;
  }
}

async function updatePlayerName(name) {
  if (!playerId) return false;
  try {
    const res = await fetch(`${API_URL}/api/player/${playerId}/name`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.ok) {
      setPlayerName(name);
      playerName = name;
    }
    return data.ok;
  } catch {
    return false;
  }
}

export const onlineService = {
  connect,
  disconnect,
  on,
  send,
  isConnected,
  createRoom,
  joinRoom,
  quickMatch,
  makeMove,
  leaveRoom,
  reportCollapse,
  getStats,
  getLeaderboard,
  getGlobalStats,
  updatePlayerName,
  getPlayerId: () => playerId,
  getPlayerName: () => playerName,
};
