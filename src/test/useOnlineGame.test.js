import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineGame } from '../hooks/useOnlineGame';

// ─── Mock onlineService with vi.hoisted (prevents hoisting ReferenceError) ─

const { mockOnlineService, mockEventCallbacks, emit } = vi.hoisted(() => {
  const callbacks = {};
  let counter = 0;

  return {
    mockOnlineService: {
      connect: vi.fn(),
      on: vi.fn((event, cb) => {
        if (!callbacks[event]) callbacks[event] = [];
        const id = ++counter;
        callbacks[event].push({ id, cb });
        return () => {
          const arr = callbacks[event];
          if (arr) {
            const idx = arr.findIndex((e) => e.id === id);
            if (idx !== -1) arr.splice(idx, 1);
          }
        };
      }),
      createRoom: vi.fn(),
      joinRoom: vi.fn(),
      quickMatch: vi.fn(),
      makeMove: vi.fn(() => true),
      leaveRoom: vi.fn(),
      reportCollapse: vi.fn(),
    },
    mockEventCallbacks: callbacks,
    emit: (event, data) => {
      const arr = callbacks[event];
      if (arr) {
        arr.forEach(({ cb }) => { try { cb(data); } catch {} });
      }
    },
  };
});

vi.mock('../online/onlineService', () => ({
  onlineService: mockOnlineService,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────

beforeEach(() => {
  Object.keys(mockEventCallbacks).forEach((k) => delete mockEventCallbacks[k]);
  vi.clearAllMocks();
});

describe('useOnlineGame', () => {
  // ─── Initial state ──────────────────────────────────────────────────

  it('returns initial state on mount', () => {
    const { result } = renderHook(() => useOnlineGame());

    expect(result.current.connected).toBe(false);
    expect(result.current.roomState).toBeNull();
    expect(result.current.gameState).toBeNull();
    expect(result.current.waiting).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.opponentName).toBeNull();
    expect(result.current.gameResult).toBeNull();
  });

  it('calls onlineService.connect on mount', () => {
    renderHook(() => useOnlineGame());
    expect(mockOnlineService.connect).toHaveBeenCalledTimes(1);
  });

  it('subscribes to all expected events on mount', () => {
    renderHook(() => useOnlineGame());

    const expectedEvents = [
      'connected', 'disconnected', 'reconnecting',
      'auth_ok', 'room_created', 'waiting_for_opponent',
      'room_joined', 'opponent_joined', 'move_made',
      'opponent_moved', 'game_over', 'opponent_left', 'error',
    ];

    for (const event of expectedEvents) {
      expect(mockOnlineService.on).toHaveBeenCalledWith(event, expect.any(Function));
    }
  });

  // ─── Connection events ──────────────────────────────────────────────

  it('sets connected=true on connected event', () => {
    const { result } = renderHook(() => useOnlineGame());

    act(() => emit('connected'));

    expect(result.current.connected).toBe(true);
  });

  it('sets connected=false on disconnected event', () => {
    const { result } = renderHook(() => useOnlineGame());

    act(() => {
      emit('connected');
      emit('disconnected');
    });

    expect(result.current.connected).toBe(false);
  });

  it('sets connected=false on reconnecting event', () => {
    const { result } = renderHook(() => useOnlineGame());

    act(() => {
      emit('connected');
      emit('reconnecting', { attempt: 1 });
    });

    expect(result.current.connected).toBe(false);
  });

  // ─── Auth events ────────────────────────────────────────────────────

  it('clears opponentName on auth_ok', () => {
    const { result } = renderHook(() => useOnlineGame());

    act(() => emit('opponent_joined', { opponentName: 'Bob' }));
    expect(result.current.opponentName).toBe('Bob');

    act(() => emit('auth_ok', { playerId: 'p_123' }));
    expect(result.current.opponentName).toBeNull();
  });

  // ─── Room creation events ───────────────────────────────────────────

  it('sets waiting and roomState on room_created', () => {
    const { result } = renderHook(() => useOnlineGame());
    const data = {
      roomId: 'room-1',
      roomCode: 'ABC123',
      mode: 'classic',
      blocks: [{ id: 0 }],
    };

    act(() => emit('room_created', data));

    expect(result.current.waiting).toBe(true);
    expect(result.current.roomState).toEqual({
      id: 'room-1',
      code: 'ABC123',
      mode: 'classic',
    });
    expect(result.current.gameState).toEqual({ blocks: [{ id: 0 }] });
    expect(result.current.error).toBeNull();
  });

  it('sets waiting and roomState on waiting_for_opponent', () => {
    const { result } = renderHook(() => useOnlineGame());
    const data = {
      roomId: 'room-2',
      roomCode: 'XYZ789',
      mode: 'speed',
      blocks: [{ id: 1 }],
    };

    act(() => emit('waiting_for_opponent', data));

    expect(result.current.waiting).toBe(true);
    expect(result.current.roomState).toEqual({
      id: 'room-2',
      code: 'XYZ789',
      mode: 'speed',
    });
    expect(result.current.gameState).toEqual({ blocks: [{ id: 1 }] });
    expect(result.current.error).toBeNull();
  });

  // ─── Room join events ───────────────────────────────────────────────

  it('sets gameState and opponentName on room_joined', () => {
    const { result } = renderHook(() => useOnlineGame());
    const data = {
      roomId: 'room-3',
      roomCode: 'DEF456',
      mode: 'classic',
      blocks: [{ id: 2 }],
      currentPlayer: 0,
      yourTurn: false,
      opponentName: 'Alice',
    };

    act(() => emit('room_joined', data));

    expect(result.current.waiting).toBe(false);
    expect(result.current.opponentName).toBe('Alice');
    expect(result.current.roomState).toEqual({
      id: 'room-3',
      code: 'DEF456',
      mode: 'classic',
    });
    expect(result.current.gameState).toEqual({
      blocks: [{ id: 2 }],
      currentPlayer: 0,
      yourTurn: false,
    });
    expect(result.current.error).toBeNull();
  });

  it('sets gameState and opponentName on opponent_joined', () => {
    const { result } = renderHook(() => useOnlineGame());
    const data = {
      opponentName: 'Bob',
      blocks: [{ id: 3 }],
      currentPlayer: 0,
      yourTurn: true,
    };

    act(() => emit('opponent_joined', data));

    expect(result.current.waiting).toBe(false);
    expect(result.current.opponentName).toBe('Bob');
    expect(result.current.gameState).toEqual({
      blocks: [{ id: 3 }],
      currentPlayer: 0,
      yourTurn: true,
    });
    expect(result.current.error).toBeNull();
  });

  // ─── Move events ────────────────────────────────────────────────────

  it('updates gameState on move_made (own move confirmation)', () => {
    const { result } = renderHook(() => useOnlineGame());

    act(() => emit('room_joined', {
      roomId: 'r', roomCode: 'C', mode: 'classic',
      blocks: [{ id: 0, position: [0, 0, 0] }],
      currentPlayer: 0, yourTurn: false, opponentName: 'Alice',
    }));

    act(() => emit('move_made', {
      blocks: [{ id: 0, position: [1, 2, 3] }],
      currentPlayer: 1,
      turnCount: 1,
      yourTurn: false,
      move: { blockId: 0, targetSlot: { slotIndex: 0 } },
    }));

    expect(result.current.gameState.currentPlayer).toBe(1);
    expect(result.current.gameState.turnCount).toBe(1);
    expect(result.current.gameState.yourTurn).toBe(false);
    expect(result.current.gameState.lastMove).toEqual({
      blockId: 0, targetSlot: { slotIndex: 0 },
    });
    expect(result.current.gameState.blocks).toEqual([{ id: 0, position: [1, 2, 3] }]);
  });

  it('updates gameState on opponent_moved', () => {
    const { result } = renderHook(() => useOnlineGame());

    act(() => emit('room_joined', {
      roomId: 'r', roomCode: 'C', mode: 'classic',
      blocks: [{ id: 0 }],
      currentPlayer: 0, yourTurn: false, opponentName: 'Alice',
    }));

    act(() => emit('opponent_moved', {
      blocks: [{ id: 0, position: [2, 3, 4] }],
      currentPlayer: 0,
      turnCount: 1,
      yourTurn: true,
      move: { blockId: 0, targetSlot: { slotIndex: 1 } },
    }));

    expect(result.current.gameState.yourTurn).toBe(true);
    expect(result.current.gameState.turnCount).toBe(1);
  });

  // ─── Game over events ───────────────────────────────────────────────

  it('sets gameResult and marks game over on game_over', () => {
    const { result } = renderHook(() => useOnlineGame());

    act(() => emit('room_joined', {
      roomId: 'r', roomCode: 'C', mode: 'classic',
      blocks: [{ id: 0 }],
      currentPlayer: 0, yourTurn: true, opponentName: 'Alice',
    }));

    act(() => emit('game_over', {
      winner: true,
      collapsed: true,
      turnCount: 5,
    }));

    expect(result.current.gameResult).toEqual({
      winner: true,
      collapsed: true,
      turnCount: 5,
    });
    expect(result.current.gameState.gameOver).toBe(true);
    expect(result.current.gameState.winner).toBe(true);
    expect(result.current.gameState.collapsed).toBe(true);
  });

  it('sets gameResult with opponentLeft=true on opponent_left when gameState exists', () => {
    const { result } = renderHook(() => useOnlineGame());

    act(() => emit('room_joined', {
      roomId: 'r', roomCode: 'C', mode: 'classic',
      blocks: [{ id: 0 }],
      currentPlayer: 0, yourTurn: true, opponentName: 'Alice',
    }));

    act(() => emit('opponent_left', { message: 'Противник отключился' }));

    expect(result.current.error).toBe('Противник отключился');
    expect(result.current.gameResult).toEqual({
      winner: true,
      collapsed: false,
      opponentLeft: true,
      turnCount: 0,
    });
    expect(result.current.gameState.gameOver).toBe(true);
    expect(result.current.gameState.winner).toBe(true);
  });

  it('sets gameResult with turnCount from latest gameState on opponent_left', () => {
    const { result } = renderHook(() => useOnlineGame());

    act(() => emit('room_joined', {
      roomId: 'r', roomCode: 'C', mode: 'classic',
      blocks: [{ id: 0 }],
      currentPlayer: 0, yourTurn: true, opponentName: 'Alice',
    }));
    act(() => emit('move_made', {
      blocks: [{ id: 0 }], currentPlayer: 1, turnCount: 3,
      yourTurn: false, move: { blockId: 0 },
    }));

    act(() => emit('opponent_left', { message: 'Противник покинул игру' }));

    expect(result.current.gameResult.turnCount).toBe(3);
  });

  it('uses default message on opponent_left when no message provided', () => {
    const { result } = renderHook(() => useOnlineGame());

    act(() => emit('opponent_left', {}));

    expect(result.current.error).toBe('Противник покинул игру');
  });

  // ─── Error events ───────────────────────────────────────────────────

  it('sets error on error event with message', () => {
    const { result } = renderHook(() => useOnlineGame());

    act(() => emit('error', { message: 'Комната не найдена' }));

    expect(result.current.error).toBe('Комната не найдена');
  });

  it('sets generic error on error event without message', () => {
    const { result } = renderHook(() => useOnlineGame());

    act(() => emit('error', {}));

    expect(result.current.error).toBe('Неизвестная ошибка');
  });

  // ─── Actions: createRoom ────────────────────────────────────────────

  it('createRoom calls onlineService.createRoom with mode', () => {
    const { result } = renderHook(() => useOnlineGame());

    act(() => result.current.createRoom('speed'));

    expect(mockOnlineService.createRoom).toHaveBeenCalledWith('speed');
  });

  it('createRoom clears error and gameResult', () => {
    const { result } = renderHook(() => useOnlineGame());

    act(() => emit('error', { message: 'Some error' }));
    expect(result.current.error).toBe('Some error');

    act(() => result.current.createRoom('classic'));

    expect(result.current.error).toBeNull();
    expect(result.current.gameResult).toBeNull();
  });

  it('createRoom defaults to classic mode', () => {
    const { result } = renderHook(() => useOnlineGame());

    act(() => result.current.createRoom());

    expect(mockOnlineService.createRoom).toHaveBeenCalledWith('classic');
  });

  // ─── Actions: joinRoom ──────────────────────────────────────────────

  it('joinRoom calls onlineService.joinRoom with room code', () => {
    const { result } = renderHook(() => useOnlineGame());

    act(() => result.current.joinRoom('ABC123'));

    expect(mockOnlineService.joinRoom).toHaveBeenCalledWith('ABC123');
  });

  it('joinRoom clears error and gameResult', () => {
    const { result } = renderHook(() => useOnlineGame());

    act(() => emit('error', { message: 'Error' }));
    act(() => result.current.joinRoom('XYZ789'));

    expect(result.current.error).toBeNull();
    expect(result.current.gameResult).toBeNull();
  });

  // ─── Actions: quickMatch ────────────────────────────────────────────

  it('quickMatch calls onlineService.quickMatch with mode', () => {
    const { result } = renderHook(() => useOnlineGame());

    act(() => result.current.quickMatch('speed'));

    expect(mockOnlineService.quickMatch).toHaveBeenCalledWith('speed');
  });

  it('quickMatch defaults to classic mode', () => {
    const { result } = renderHook(() => useOnlineGame());

    act(() => result.current.quickMatch());

    expect(mockOnlineService.quickMatch).toHaveBeenCalledWith('classic');
  });

  it('quickMatch clears error and gameResult', () => {
    const { result } = renderHook(() => useOnlineGame());

    act(() => emit('error', { message: 'Error' }));
    act(() => result.current.quickMatch());

    expect(result.current.error).toBeNull();
    expect(result.current.gameResult).toBeNull();
  });

  // ─── Actions: makeMove ──────────────────────────────────────────────

  it('makeMove calls onlineService.makeMove when it is your turn', () => {
    const { result } = renderHook(() => useOnlineGame());

    act(() => emit('opponent_joined', {
      opponentName: 'Bob',
      blocks: [{ id: 0 }],
      currentPlayer: 0,
      yourTurn: true,
    }));

    let returned;
    act(() => {
      returned = result.current.makeMove(5, { slotIndex: 0 });
    });

    expect(mockOnlineService.makeMove).toHaveBeenCalledWith(5, { slotIndex: 0 });
    expect(returned).toBe(true);
  });

  it('makeMove sets error and returns false when not your turn', () => {
    const { result } = renderHook(() => useOnlineGame());

    act(() => emit('room_joined', {
      roomId: 'r', roomCode: 'C', mode: 'classic',
      blocks: [{ id: 0 }],
      currentPlayer: 0, yourTurn: false, opponentName: 'Alice',
    }));

    let returned;
    act(() => {
      returned = result.current.makeMove(5, { slotIndex: 0 });
    });

    expect(mockOnlineService.makeMove).not.toHaveBeenCalled();
    expect(returned).toBe(false);
    expect(result.current.error).toBe('Не ваш ход');
  });

  it('makeMove returns onlineService.makeMove result when your turn', () => {
    const { result } = renderHook(() => useOnlineGame());

    mockOnlineService.makeMove.mockReturnValueOnce('custom-result');

    act(() => emit('opponent_joined', {
      opponentName: 'Bob',
      blocks: [{ id: 0 }],
      currentPlayer: 0,
      yourTurn: true,
    }));

    let returned;
    act(() => {
      returned = result.current.makeMove(0, null);
    });

    expect(returned).toBe('custom-result');
  });

  // ─── Actions: leaveRoom ─────────────────────────────────────────────

  it('leaveRoom calls onlineService.leaveRoom', () => {
    const { result } = renderHook(() => useOnlineGame());

    act(() => result.current.leaveRoom());

    expect(mockOnlineService.leaveRoom).toHaveBeenCalledTimes(1);
  });

  it('leaveRoom clears all state', () => {
    const { result } = renderHook(() => useOnlineGame());

    // waiting=true from room_created (not yet overridden by opponent_joined)
    act(() => {
      emit('connected');
      emit('room_created', {
        roomId: 'r', roomCode: 'C', mode: 'classic', blocks: [{ id: 0 }],
      });
    });

    expect(result.current.waiting).toBe(true);
    expect(result.current.roomState).not.toBeNull();
    expect(result.current.gameState).not.toBeNull();

    act(() => result.current.leaveRoom());

    expect(result.current.roomState).toBeNull();
    expect(result.current.gameState).toBeNull();
    expect(result.current.waiting).toBe(false);
    expect(result.current.opponentName).toBeNull();
    expect(result.current.gameResult).toBeNull();
    expect(result.current.error).toBeNull();
    // Connection stays alive after leaving a room
    expect(result.current.connected).toBe(true);
  });

  // ─── Actions: reportCollapse ────────────────────────────────────────

  it('reportCollapse calls onlineService.reportCollapse', () => {
    const { result } = renderHook(() => useOnlineGame());

    act(() => result.current.reportCollapse());

    expect(mockOnlineService.reportCollapse).toHaveBeenCalledTimes(1);
  });

  // ─── Actions: clearError ────────────────────────────────────────────

  it('clearError sets error to null', () => {
    const { result } = renderHook(() => useOnlineGame());

    act(() => emit('error', { message: 'Some error' }));
    expect(result.current.error).toBe('Some error');

    act(() => result.current.clearError());

    expect(result.current.error).toBeNull();
  });

  // ─── Cleanup on unmount ─────────────────────────────────────────────

  it('unsubscribes all listeners on unmount', () => {
    const { unmount } = renderHook(() => useOnlineGame());

    const totalBefore = Object.values(mockEventCallbacks).reduce(
      (sum, arr) => sum + arr.length, 0
    );
    expect(totalBefore).toBeGreaterThan(0);

    unmount();

    const totalAfter = Object.values(mockEventCallbacks).reduce(
      (sum, arr) => sum + arr.length, 0
    );
    expect(totalAfter).toBe(0);
  });

  it('does not emit events after unmount', () => {
    const { result, unmount } = renderHook(() => useOnlineGame());

    unmount();

    expect(() => {
      act(() => {
        emit('room_created', {
          roomId: 'r', roomCode: 'C', mode: 'classic', blocks: [],
        });
        emit('game_over', { winner: true, collapsed: false, turnCount: 0 });
      });
    }).not.toThrow();

    expect(result.current.roomState).toBeNull();
  });
});
