import { useState, useEffect, useCallback, useRef } from 'react';
import { onlineService } from '../online/onlineService';

export function useOnlineGame() {
  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState(null);
  const [opponentName, setOpponentName] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const cleanupRefs = useRef([]);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  useEffect(() => {
    const cleanups = [];

    cleanups.push(onlineService.on('connected', () => setConnected(true)));
    cleanups.push(onlineService.on('disconnected', () => setConnected(false)));
    cleanups.push(onlineService.on('reconnecting', () => setConnected(false)));

    cleanups.push(onlineService.on('auth_ok', (data) => {
      setOpponentName(null);
    }));

    cleanups.push(onlineService.on('room_created', (data) => {
      setRoomState({
        id: data.roomId,
        code: data.roomCode,
        mode: data.mode,
      });
      setGameState({ blocks: data.blocks });
      setWaiting(true);
      setError(null);
    }));

    cleanups.push(onlineService.on('waiting_for_opponent', (data) => {
      setRoomState({
        id: data.roomId,
        code: data.roomCode,
        mode: data.mode,
      });
      setGameState({ blocks: data.blocks });
      setWaiting(true);
      setError(null);
    }));

    cleanups.push(onlineService.on('room_joined', (data) => {
      setRoomState({
        id: data.roomId,
        code: data.roomCode,
        mode: data.mode,
      });
      setGameState({
        blocks: data.blocks,
        currentPlayer: data.currentPlayer,
        yourTurn: data.currentPlayer === 0,
      });
      setOpponentName(data.opponentName);
      setWaiting(false);
      setError(null);
    }));

    cleanups.push(onlineService.on('opponent_joined', (data) => {
      setOpponentName(data.opponentName);
      setGameState({
        blocks: data.blocks,
        currentPlayer: data.currentPlayer,
        yourTurn: data.currentPlayer === 0,
      });
      setWaiting(false);
      setError(null);
    }));

    cleanups.push(onlineService.on('move_made', (data) => {
      setGameState(prev => ({
        ...prev,
        blocks: data.blocks,
        currentPlayer: data.currentPlayer,
        turnCount: data.turnCount,
        yourTurn: data.yourTurn,
        lastMove: data.move,
      }));
    }));

    cleanups.push(onlineService.on('opponent_moved', (data) => {
      setGameState(prev => ({
        ...prev,
        blocks: data.blocks,
        currentPlayer: data.currentPlayer,
        turnCount: data.turnCount,
        yourTurn: data.yourTurn,
        lastMove: data.move,
      }));
    }));

    cleanups.push(onlineService.on('game_over', (data) => {
      setGameResult(data);
      setGameState(prev => ({
        ...prev,
        gameOver: true,
        winner: data.winner,
        collapsed: data.collapsed,
      }));
    }));

    cleanups.push(onlineService.on('opponent_left', (data) => {
      const latestState = gameStateRef.current;
      setError(data?.message || 'Противник покинул игру');
      setGameResult({ winner: true, collapsed: false, opponentLeft: true, turnCount: latestState?.turnCount || 0 });
      setGameState(prev => prev ? { ...prev, gameOver: true, winner: true } : null);
    }));

    cleanups.push(onlineService.on('error', (data) => {
      setError(data?.message || 'Неизвестная ошибка');
    }));

    cleanupRefs.current = cleanups;
    onlineService.connect();

    return () => {
      cleanupRefs.current.forEach(fn => fn?.());
      cleanupRefs.current = [];
    };
  }, []);

  const createRoom = useCallback((mode = 'classic') => {
    setError(null);
    setGameResult(null);
    onlineService.createRoom(mode);
  }, []);

  const joinRoom = useCallback((roomCode) => {
    setError(null);
    setGameResult(null);
    onlineService.joinRoom(roomCode);
  }, []);

  const quickMatch = useCallback((mode = 'classic') => {
    setError(null);
    setGameResult(null);
    onlineService.quickMatch(mode);
  }, []);

  const makeMove = useCallback((blockId, targetSlot) => {
    if (!gameState?.yourTurn) {
      setError('Не ваш ход');
      return false;
    }
    return onlineService.makeMove(blockId, targetSlot);
  }, [gameState?.yourTurn]);

  const leaveRoom = useCallback(() => {
    onlineService.leaveRoom();
    setRoomState(null);
    setGameState(null);
    setWaiting(false);
    setOpponentName(null);
    setGameResult(null);
    setError(null);
  }, []);

  const reportCollapse = useCallback(() => {
    onlineService.reportCollapse();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    connected,
    roomState,
    gameState,
    waiting,
    error,
    opponentName,
    gameResult,
    createRoom,
    joinRoom,
    quickMatch,
    makeMove,
    leaveRoom,
    reportCollapse,
    clearError,
  };
}

export default useOnlineGame;
