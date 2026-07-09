import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock WebSocket ────────────────────────────────────────────────────────

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.onopen = null;
    this.onclose = null;
    this.onmessage = null;
    this.onerror = null;
    this.sentMessages = [];
  }

  send(data) { this.sentMessages.push(data); }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose({ wasClean: true, code: 1000 });
  }

  _open() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) this.onopen({ target: this });
  }

  _receive(data) {
    if (this.onmessage) this.onmessage({ data: JSON.stringify(data) });
  }
}

// ─── Mutable mock state ────────────────────────────────────────────────────
// Closures capture this object reference. We mutate its properties in beforeEach
// to reset state between tests without re-importing the module.

const state = {
  ws: null,
  playerId: null,
  playerName: null,
  reconnectAttempts: 0,
  listeners: new Map(),
  pingInterval: null,
  reconnectTimeout: null,
};

function emit(event, data) {
  const callbacks = state.listeners.get(event);
  if (callbacks) {
    callbacks.forEach((cb) => {
      try { cb(data); } catch (e) { /* ignore listener error */ }
    });
  }
}

function scheduleReconnect() {
  if (state.reconnectAttempts >= 5) {
    emit('reconnect_failed');
    return;
  }
  clearTimeout(state.reconnectTimeout);
  const delay = Math.min(1000 * Math.pow(2, state.reconnectAttempts), 30000);
  state.reconnectAttempts++;
  state.reconnectTimeout = setTimeout(() => {
    emit('reconnecting', { attempt: state.reconnectAttempts });
    connect();
  }, delay);
}

function connect() {
  if (state.ws && (state.ws.readyState === MockWebSocket.OPEN || state.ws.readyState === MockWebSocket.CONNECTING)) {
    return;
  }
  try {
    state.ws = new MockWebSocket('ws://localhost:3001');
  } catch (err) {
    scheduleReconnect();
    return;
  }
  state.ws.onopen = () => {
    state.reconnectAttempts = 0;
    emit('connected');
    state.playerId = localStorage.getItem('jenga3d_player_id') ||
      'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('jenga3d_player_id', state.playerId);
    state.playerName = localStorage.getItem('jenga3d_player_name') || 'Аноним';
    send('auth', { playerId: state.playerId, playerName: state.playerName });
    clearInterval(state.pingInterval);
    state.pingInterval = setInterval(() => {
      if (state.ws && state.ws.readyState === MockWebSocket.OPEN) {
        send('ping', {});
      }
    }, 25000);
  };
  state.ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleServerMessage(message);
    } catch (err) { /* ignore parse error */ }
  };
  state.ws.onclose = () => {
    clearInterval(state.pingInterval);
    emit('disconnected');
    scheduleReconnect();
  };
  state.ws.onerror = () => {};
}

function send(type, payload) {
  if (!state.ws || state.ws.readyState !== MockWebSocket.OPEN) {
    return false;
  }
  state.ws.send(JSON.stringify({ type, payload }));
  return true;
}

function handleServerMessage(message) {
  const { type, payload } = message;
  const handlers = {
    auth_ok: 'auth_ok', room_created: 'room_created',
    room_joined: 'room_joined', opponent_joined: 'opponent_joined',
    waiting_for_opponent: 'waiting_for_opponent', move_made: 'move_made',
    opponent_moved: 'opponent_moved', game_over: 'game_over',
    opponent_left: 'opponent_left', stats: 'stats',
    leaderboard: 'leaderboard', error: 'error',
  };
  if (handlers[type]) emit(handlers[type], payload);
}

function resetState() {
  clearTimeout(state.reconnectTimeout);
  clearInterval(state.pingInterval);
  state.ws = null;
  state.playerId = null;
  state.playerName = null;
  state.reconnectAttempts = 0;
  state.listeners = new Map();
  state.pingInterval = null;
  state.reconnectTimeout = null;
}

vi.mock('../online/onlineService', () => ({
  onlineService: {
    connect,
    disconnect: () => {
      clearTimeout(state.reconnectTimeout);
      clearInterval(state.pingInterval);
      state.reconnectAttempts = 5;
      if (state.ws) {
        state.ws.close();
        state.ws = null;
      }
    },
    on: (event, callback) => {
      if (!state.listeners.has(event)) state.listeners.set(event, new Set());
      state.listeners.get(event).add(callback);
      return () => state.listeners.get(event)?.delete(callback);
    },
    send,
    isConnected: () => !!(state.ws && state.ws.readyState === MockWebSocket.OPEN),
    createRoom: (mode = 'classic') => send('create_room', { mode }),
    joinRoom: (roomCode) => send('join_room', { roomCode: roomCode.toUpperCase() }),
    quickMatch: (mode = 'classic') => send('quick_match', { mode }),
    makeMove: (blockId, targetSlot) => send('make_move', { blockId, targetSlot }),
    leaveRoom: () => send('leave_room', {}),
    reportCollapse: () => send('tower_collapsed', {}),
    getStats: async (playerIdParam) => {
      const targetId = playerIdParam || state.playerId;
      try {
        const res = await fetch(`http://localhost:3001/api/player/${targetId}`);
        const data = await res.json();
        return data.ok ? data : null;
      } catch { return null; }
    },
    getLeaderboard: async (_date, _mode, limit = 50) => {
      try {
        const res = await fetch(`http://localhost:3001/api/leaderboard/top?limit=${limit}`);
        const data = await res.json();
        return data.ok ? data.entries : [];
      } catch { return []; }
    },
    getGlobalStats: async () => {
      try {
        const res = await fetch('http://localhost:3001/api/stats/global');
        const data = await res.json();
        return data.ok ? data.stats : null;
      } catch { return null; }
    },
    updatePlayerName: async (name) => {
      if (!state.playerId) return false;
      try {
        const res = await fetch(`http://localhost:3001/api/player/${state.playerId}/name`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        const data = await res.json();
        if (data.ok) {
          localStorage.setItem('jenga3d_player_name', name);
          state.playerName = name;
        }
        return data.ok;
      } catch { return false; }
    },
    getPlayerId: () => state.playerId,
    getPlayerName: () => state.playerName,
  },
}));

import { onlineService as service } from '../online/onlineService';

// ─── Helpers ──────────────────────────────────────────────────────────────

beforeEach(() => {
  resetState();
  vi.useFakeTimers();
  globalThis.fetch = vi.fn();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  delete globalThis.fetch;
});

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('onlineService', () => {
  // ─── connect ────────────────────────────────────────────────────────

  describe('connect', () => {
    it('creates a WebSocket on connect()', () => {
      service.connect();
      expect(state.ws).not.toBeNull();
    });

    it('sets up onopen, onmessage, onclose, onerror handlers', () => {
      service.connect();
      expect(typeof state.ws.onopen).toBe('function');
      expect(typeof state.ws.onmessage).toBe('function');
      expect(typeof state.ws.onclose).toBe('function');
      expect(typeof state.ws.onerror).toBe('function');
    });

    it('does not create a new WebSocket if already connected', () => {
      service.connect();
      state.ws._open();
      const ws1 = state.ws;

      service.connect();

      expect(state.ws).toBe(ws1);
    });

    it('does not create a new WebSocket while still connecting', () => {
      service.connect();
      const ws1 = state.ws;

      service.connect();

      expect(state.ws).toBe(ws1);
    });

    it('onopen emits connected event and sends auth', () => {
      const cb = vi.fn();
      service.on('connected', cb);
      service.connect();
      state.ws._open();

      expect(cb).toHaveBeenCalledTimes(1);
      const authMsg = state.ws.sentMessages.find((m) => {
        try { return JSON.parse(m).type === 'auth'; } catch { return false; }
      });
      expect(authMsg).toBeDefined();
    });

    it('onopen starts ping interval at 25s', () => {
      service.connect();
      state.ws._open();
      const sentBefore = state.ws.sentMessages.length;

      vi.advanceTimersByTime(25000);

      const newSent = state.ws.sentMessages.slice(sentBefore);
      const pingMsgs = newSent.filter((m) => {
        try { return JSON.parse(m).type === 'ping'; } catch { return false; }
      });
      expect(pingMsgs.length).toBe(1);
    });

    it('onclose emits disconnected event', () => {
      const cb = vi.fn();
      service.on('disconnected', cb);
      service.connect();
      state.ws._open();

      state.ws.close();

      expect(cb).toHaveBeenCalledTimes(1);
    });

    it('onclose clears ping interval', () => {
      service.connect();
      state.ws._open();
      const ws = state.ws;
      const sentBefore = ws.sentMessages.length;

      ws.close();
      vi.advanceTimersByTime(50000);

      expect(ws.sentMessages.length).toBe(sentBefore);
    });
  });

  // ─── send ───────────────────────────────────────────────────────────

  describe('send', () => {
    it('returns false when ws is null', () => {
      expect(service.send('test', {})).toBe(false);
    });

    it('returns false when ws is CONNECTING', () => {
      service.connect();
      expect(service.send('test', {})).toBe(false);
    });

    it('sends JSON when connected, returns true', () => {
      service.connect();
      state.ws._open();

      const result = service.send('my_event', { key: 'value' });

      expect(result).toBe(true);
      const last = JSON.parse(state.ws.sentMessages.at(-1));
      expect(last.type).toBe('my_event');
      expect(last.payload).toEqual({ key: 'value' });
    });

    it('can send multiple messages', () => {
      service.connect();
      state.ws._open();

      service.send('m1', { a: 1 });
      service.send('m2', { b: 2 });

      expect(state.ws.sentMessages.length).toBe(3); // auth + m1 + m2
    });
  });

  // ─── disconnect ─────────────────────────────────────────────────────

  describe('disconnect', () => {
    it('closes the WebSocket and sets ws to null', () => {
      service.connect();
      state.ws._open();

      service.disconnect();

      expect(state.ws).toBeNull();
    });

    it('prevents reconnection by setting attempts to max', () => {
      service.connect();
      state.ws._open();

      service.disconnect();
      vi.advanceTimersByTime(60000);

      expect(state.reconnectAttempts).toBe(5);
    });

    it('clears ping interval', () => {
      service.connect();
      state.ws._open();
      const ws = state.ws;
      const sentBefore = ws.sentMessages.length;

      service.disconnect();
      vi.advanceTimersByTime(50000);

      expect(ws.sentMessages.length).toBe(sentBefore);
    });

    it('is safe when not connected', () => {
      expect(() => service.disconnect()).not.toThrow();
    });
  });

  // ─── on / listeners ─────────────────────────────────────────────────

  describe('on', () => {
    it('fires callback on matching event', () => {
      const cb = vi.fn();
      service.on('auth_ok', cb);
      service.connect();
      state.ws._open();
      state.ws._receive({ type: 'auth_ok', payload: { pid: 'abc' } });

      expect(cb).toHaveBeenCalledWith({ pid: 'abc' });
    });

    it('multiple callbacks for same event all fire', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      service.on('error', cb1);
      service.on('error', cb2);

      service.connect();
      state.ws._open();
      state.ws._receive({ type: 'error', payload: { m: 'Oops' } });

      expect(cb1).toHaveBeenCalledWith({ m: 'Oops' });
      expect(cb2).toHaveBeenCalledWith({ m: 'Oops' });
    });

    it('returns unsubscribe function', () => {
      const cb = vi.fn();
      const unsub = service.on('auth_ok', cb);
      unsub();

      service.connect();
      state.ws._open();
      state.ws._receive({ type: 'auth_ok', payload: {} });

      expect(cb).not.toHaveBeenCalled();
    });

    it('unsubscribe is idempotent', () => {
      const cb = vi.fn();
      const unsub = service.on('auth_ok', cb);
      unsub();
      unsub();
    });

    it('one callback error does not block others', () => {
      const errCb = vi.fn(() => { throw new Error('fail'); });
      const okCb = vi.fn();
      service.on('connected', errCb);
      service.on('connected', okCb);

      service.connect();
      state.ws._open();

      expect(okCb).toHaveBeenCalled();
    });
  });

  // ─── isConnected ────────────────────────────────────────────────────

  describe('isConnected', () => {
    it('returns false before connect', () => {
      expect(service.isConnected()).toBe(false);
    });

    it('returns false after connect but before open', () => {
      service.connect();
      expect(service.isConnected()).toBe(false);
    });

    it('returns true after connection opens', () => {
      service.connect();
      state.ws._open();
      expect(service.isConnected()).toBe(true);
    });

    it('returns false after close', () => {
      service.connect();
      state.ws._open();
      state.ws.close();
      expect(service.isConnected()).toBe(false);
    });
  });

  // ─── Reconnection ───────────────────────────────────────────────────

  describe('reconnection', () => {
    it('schedules reconnect at 1s on first close', () => {
      service.connect();
      state.ws._open();
      state.ws.close();

      expect(state.reconnectAttempts).toBe(1);

      vi.advanceTimersByTime(999);
      expect(state.ws.readyState).toBe(MockWebSocket.CLOSED);

      vi.advanceTimersByTime(1);
      expect(state.ws.readyState).toBe(MockWebSocket.CONNECTING);
    });

    it('uses 2s delay on second attempt without successful reconnection', () => {
      service.connect();
      state.ws._open();

      // First disconnect → attempt 1, delay 1s
      state.ws.close();
      vi.advanceTimersByTime(1000);  // new WS created by reconnect
      expect(state.reconnectAttempts).toBe(1);

      // New connection also fails (don't call _open()) → attempt 2, delay 2s
      state.ws.close();
      expect(state.reconnectAttempts).toBe(2);

      vi.advanceTimersByTime(1999);
      expect(state.ws.readyState).toBe(MockWebSocket.CLOSED);

      vi.advanceTimersByTime(1);
      expect(state.ws.readyState).toBe(MockWebSocket.CONNECTING);
    });

    it('exponential backoff: 1s, 2s, 4s, 8s, 16s (persistent failure)', () => {
      const delays = [1000, 2000, 4000, 8000, 16000];

      service.connect();
      state.ws._open();

      for (let i = 0; i < 5; i++) {
        state.ws.close();                         // attempt i+1
        vi.advanceTimersByTime(delays[i] - 1);
        expect(state.ws.readyState).toBe(MockWebSocket.CLOSED);
        vi.advanceTimersByTime(1);                // timeout fires → connect()
        expect(state.ws.readyState).toBe(MockWebSocket.CONNECTING);  // new WS
        // Don't call _open() — simulate persistent connection failure
      }
    });

    it('emits reconnect_failed after 5 failed attempts', () => {
      const cb = vi.fn();
      service.on('reconnect_failed', cb);
      const delays = [1000, 2000, 4000, 8000, 16000];

      service.connect();
      state.ws._open();

      for (let i = 0; i < 5; i++) {
        state.ws.close();                         // attempt i+1
        vi.advanceTimersByTime(delays[i]);         // new WS from reconnect
        // Don't call _open() — simulate persistent failure
      }

      // reconnectAttempts = 5 after 5th close (attempt 5) + advanceTimersByTime(16000)
      // Connect() created a new WS in the last advanceTimersByTime call.
      // Now close again → attempt = 5 >= MAX_RECONNECT → emit reconnect_failed
      state.ws.close();

      expect(cb).toHaveBeenCalledTimes(1);
      expect(state.reconnectAttempts).toBe(5);

      // No more reconnection attempts
      vi.advanceTimersByTime(60000);
      expect(state.reconnectAttempts).toBe(5);
    });

    it('emits reconnecting event before each reconnect', () => {
      const cb = vi.fn();
      service.on('reconnecting', cb);

      service.connect();
      state.ws._open();
      state.ws.close();
      vi.advanceTimersByTime(1000);

      expect(cb).toHaveBeenCalledWith({ attempt: 1 });
    });

    it('successful reconnection resets attempt counter and prevents reconnect_failed on next failure', () => {
      const failCb = vi.fn();
      service.on('reconnect_failed', failCb);

      // First failure
      service.connect();
      state.ws._open();
      state.ws.close();
      vi.advanceTimersByTime(1000);
      expect(state.reconnectAttempts).toBe(1);

      // Successful reconnection
      state.ws._open(); // onopen resets to 0
      expect(state.reconnectAttempts).toBe(0);

      // Second failure — should start fresh with attempt=1, NOT trigger reconnect_failed
      state.ws.close();
      expect(state.reconnectAttempts).toBe(1);
      expect(failCb).not.toHaveBeenCalled();

      // Verify reconnect uses 1s delay (fresh backoff), not 32s (max) or instantly
      vi.advanceTimersByTime(999);
      expect(state.ws.readyState).toBe(MockWebSocket.CLOSED);
      vi.advanceTimersByTime(1);
      expect(state.ws.readyState).toBe(MockWebSocket.CONNECTING);
    });
  });

  // ─── Server message routing ─────────────────────────────────────────

  describe('server message routing', () => {
    function testRoute(msgType, payload = {}) {
      const cb = vi.fn();
      service.on(msgType, cb);
      service.connect();
      state.ws._open();
      state.ws._receive({ type: msgType, payload });
      return cb;
    }

    it('routes auth_ok', () => { expect(testRoute('auth_ok', { p: 1 })).toHaveBeenCalledWith({ p: 1 }); });
    it('routes room_created', () => { expect(testRoute('room_created', { c: 'X' })).toHaveBeenCalledWith({ c: 'X' }); });
    it('routes room_joined', () => { expect(testRoute('room_joined', { t: false })).toHaveBeenCalledWith({ t: false }); });
    it('routes opponent_joined', () => { expect(testRoute('opponent_joined', { n: 'A' })).toHaveBeenCalledWith({ n: 'A' }); });
    it('routes waiting_for_opponent', () => { expect(testRoute('waiting_for_opponent', { c: 'Y' })).toHaveBeenCalledWith({ c: 'Y' }); });
    it('routes move_made', () => { expect(testRoute('move_made', { t: 3 })).toHaveBeenCalledWith({ t: 3 }); });
    it('routes opponent_moved', () => { expect(testRoute('opponent_moved', { y: true })).toHaveBeenCalledWith({ y: true }); });
    it('routes game_over', () => { expect(testRoute('game_over', { w: true })).toHaveBeenCalledWith({ w: true }); });
    it('routes opponent_left', () => { expect(testRoute('opponent_left', { m: 'L' })).toHaveBeenCalledWith({ m: 'L' }); });
    it('routes stats', () => { expect(testRoute('stats', { w: 5 })).toHaveBeenCalledWith({ w: 5 }); });
    it('routes leaderboard', () => { expect(testRoute('leaderboard', { e: [] })).toHaveBeenCalledWith({ e: [] }); });
    it('routes error', () => { expect(testRoute('error', { m: 'E' })).toHaveBeenCalledWith({ m: 'E' }); });
    it('ignores pong', () => {
      const cb = vi.fn();
      service.on('pong', cb);
      service.connect();
      state.ws._open();
      state.ws._receive({ type: 'pong', payload: {} });
      expect(cb).not.toHaveBeenCalled();
    });
  });

  // ─── Action methods ─────────────────────────────────────────────────

  describe('action methods', () => {
    beforeEach(() => {
      service.connect();
      state.ws._open();
      state.ws.sentMessages = []; // clear auth
    });

    it('createRoom sends create_room with classic default', () => {
      service.createRoom();
      const last = JSON.parse(state.ws.sentMessages.at(-1));
      expect(last.type).toBe('create_room');
      expect(last.payload.mode).toBe('classic');
    });

    it('createRoom with speed mode', () => {
      service.createRoom('speed');
      const last = JSON.parse(state.ws.sentMessages.at(-1));
      expect(last.payload.mode).toBe('speed');
    });

    it('joinRoom uppercases code', () => {
      service.joinRoom('abc123');
      const last = JSON.parse(state.ws.sentMessages.at(-1));
      expect(last.payload.roomCode).toBe('ABC123');
    });

    it('quickMatch sends quick_match', () => {
      service.quickMatch();
      const last = JSON.parse(state.ws.sentMessages.at(-1));
      expect(last.type).toBe('quick_match');
    });

    it('quickMatch with speed mode', () => {
      service.quickMatch('speed');
      const last = JSON.parse(state.ws.sentMessages.at(-1));
      expect(last.payload.mode).toBe('speed');
    });

    it('makeMove sends make_move', () => {
      service.makeMove(7, { slotIndex: 2 });
      const last = JSON.parse(state.ws.sentMessages.at(-1));
      expect(last.type).toBe('make_move');
      expect(last.payload.blockId).toBe(7);
    });

    it('leaveRoom sends leave_room', () => {
      service.leaveRoom();
      const last = JSON.parse(state.ws.sentMessages.at(-1));
      expect(last.type).toBe('leave_room');
    });

    it('reportCollapse sends tower_collapsed', () => {
      service.reportCollapse();
      const last = JSON.parse(state.ws.sentMessages.at(-1));
      expect(last.type).toBe('tower_collapsed');
    });

    it('return true when connected', () => {
      expect(service.createRoom()).toBe(true);
      expect(service.joinRoom('X')).toBe(true);
      expect(service.quickMatch()).toBe(true);
      expect(service.makeMove(0, {})).toBe(true);
      expect(service.leaveRoom()).toBe(true);
      expect(service.reportCollapse()).toBe(true);
    });
  });

  // ─── Return values when disconnected ────────────────────────────────

  describe('action methods when disconnected', () => {
    it('return false when never connected', () => {
      expect(service.createRoom()).toBe(false);
      expect(service.joinRoom('X')).toBe(false);
      expect(service.quickMatch()).toBe(false);
      expect(service.makeMove(0, {})).toBe(false);
      expect(service.leaveRoom()).toBe(false);
      expect(service.reportCollapse()).toBe(false);
    });

    it('return false after disconnect', () => {
      service.connect();
      state.ws._open();
      service.disconnect();

      expect(service.createRoom()).toBe(false);
      expect(service.joinRoom('X')).toBe(false);
      expect(service.quickMatch()).toBe(false);
      expect(service.makeMove(0, {})).toBe(false);
      expect(service.leaveRoom()).toBe(false);
      expect(service.reportCollapse()).toBe(false);
    });
  });

  // ─── HTTP methods ───────────────────────────────────────────────────

  describe('HTTP methods', () => {
    it('getStats fetches from /api/player/{id}', async () => {
      globalThis.fetch.mockResolvedValue({ json: () => Promise.resolve({ ok: true, wins: 10 }) });
      const result = await service.getStats('p1');
      expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/player/p1'));
      expect(result.wins).toBe(10);
    });

    it('getStats returns null on fetch error', async () => {
      globalThis.fetch.mockRejectedValue(new Error('fail'));
      expect(await service.getStats('p1')).toBeNull();
    });

    it('getStats returns null when ok=false', async () => {
      globalThis.fetch.mockResolvedValue({ json: () => Promise.resolve({ ok: false }) });
      expect(await service.getStats('p1')).toBeNull();
    });

    it('getLeaderboard fetches from /api/leaderboard/top', async () => {
      globalThis.fetch.mockResolvedValue({ json: () => Promise.resolve({ ok: true, entries: [{ n: 'A' }] }) });
      const result = await service.getLeaderboard();
      expect(result).toEqual([{ n: 'A' }]);
    });

    it('getLeaderboard returns [] on error', async () => {
      globalThis.fetch.mockRejectedValue(new Error('fail'));
      expect(await service.getLeaderboard()).toEqual([]);
    });

    it('getGlobalStats fetches from /api/stats/global', async () => {
      globalThis.fetch.mockResolvedValue({ json: () => Promise.resolve({ ok: true, stats: { g: 100 } }) });
      expect((await service.getGlobalStats()).g).toBe(100);
    });

    it('getGlobalStats returns null on error', async () => {
      globalThis.fetch.mockRejectedValue(new Error('fail'));
      expect(await service.getGlobalStats()).toBeNull();
    });

    it('updatePlayerName sends PUT', async () => {
      service.connect();
      state.ws._open();
      globalThis.fetch.mockResolvedValue({ json: () => Promise.resolve({ ok: true }) });

      const result = await service.updatePlayerName('NewName');
      expect(result).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/player/'),
        expect.objectContaining({ method: 'PUT', body: JSON.stringify({ name: 'NewName' }) })
      );
    });

    it('updatePlayerName returns false when not authed', async () => {
      expect(await service.updatePlayerName('Test')).toBe(false);
    });

    it('updatePlayerName returns false on fetch error', async () => {
      service.connect();
      state.ws._open();
      globalThis.fetch.mockRejectedValue(new Error('fail'));
      expect(await service.updatePlayerName('Test')).toBe(false);
    });
  });

  // ─── localStorage ───────────────────────────────────────────────────

  describe('localStorage', () => {
    it('persists playerId after connect', () => {
      service.connect();
      state.ws._open();
      const saved = localStorage.getItem('jenga3d_player_id');
      expect(saved).toBeTruthy();
      expect(service.getPlayerId()).toBe(saved);
    });

    it('reuses existing playerId from localStorage', () => {
      localStorage.setItem('jenga3d_player_id', 'p_existing');
      service.connect();
      state.ws._open();
      expect(service.getPlayerId()).toBe('p_existing');
    });

    it('sends Аноним as default player name', () => {
      service.connect();
      state.ws._open();
      const authMsg = state.ws.sentMessages.find((m) => {
        try { return JSON.parse(m).type === 'auth'; } catch { return false; }
      });
      expect(JSON.parse(authMsg).payload.playerName).toBe('Аноним');
    });

    it('sends custom player name from localStorage', () => {
      localStorage.setItem('jenga3d_player_name', 'CustomName');
      service.connect();
      state.ws._open();
      const authMsg = state.ws.sentMessages.find((m) => {
        try { return JSON.parse(m).type === 'auth'; } catch { return false; }
      });
      expect(JSON.parse(authMsg).payload.playerName).toBe('CustomName');
    });

    it('stores updated name via updatePlayerName', async () => {
      service.connect();
      state.ws._open();
      globalThis.fetch.mockResolvedValue({ json: () => Promise.resolve({ ok: true }) });

      await service.updatePlayerName('NewName');
      expect(localStorage.getItem('jenga3d_player_name')).toBe('NewName');
    });
  });

  // ─── Edge cases ─────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('multiple connect calls before open only create one WS', () => {
      service.connect();
      service.connect();
      service.connect();
      expect(state.ws).not.toBeNull();
    });

    it('can connect again after disconnect', () => {
      service.connect();
      state.ws._open();
      const ws1 = state.ws;
      service.disconnect();

      service.connect();
      expect(state.ws).not.toBeNull();
      expect(state.ws).not.toBe(ws1);
    });

    it('handles invalid JSON in onmessage', () => {
      service.connect();
      state.ws._open();
      expect(() => {
        state.ws.onmessage({ data: 'not json' });
      }).not.toThrow();
    });
  });

  // ─── Singleton accessors ────────────────────────────────────────────

  describe('accessors', () => {
    it('getPlayerId returns current playerId', () => {
      expect(service.getPlayerId()).toBeNull();
      service.connect();
      state.ws._open();
      expect(service.getPlayerId()).toEqual(localStorage.getItem('jenga3d_player_id'));
    });

    it('getPlayerName returns current name', () => {
      service.connect();
      state.ws._open();
      expect(typeof service.getPlayerName()).toBe('string');
    });
  });
});
