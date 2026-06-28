import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'jenga.db');

let db;

export function initDB() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'Аноним',
      created_at TEXT DEFAULT (datetime('now')),
      last_seen TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT,
      player_id TEXT NOT NULL,
      opponent_id TEXT,
      won INTEGER DEFAULT 0,
      turns INTEGER DEFAULT 0,
      game_mode TEXT DEFAULT 'classic',
      collapsed INTEGER DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (player_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS player_stats (
      player_id TEXT PRIMARY KEY,
      total_games INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      best_turns INTEGER DEFAULT 0,
      total_turns INTEGER DEFAULT 0,
      win_streak INTEGER DEFAULT 0,
      best_win_streak INTEGER DEFAULT 0,
      total_moves INTEGER DEFAULT 0,
      fast_moves INTEGER DEFAULT 0,
      bottom_pulls INTEGER DEFAULT 0,
      games_classic INTEGER DEFAULT 0,
      games_speed INTEGER DEFAULT 0,
      games_online INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (player_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      payload TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (player_id) REFERENCES players(id)
    );

    CREATE INDEX IF NOT EXISTS idx_games_player ON games(player_id);
    CREATE INDEX IF NOT EXISTS idx_games_created ON games(created_at);
    CREATE INDEX IF NOT EXISTS idx_stats_wins ON player_stats(wins DESC);
    CREATE INDEX IF NOT EXISTS idx_actions_player ON actions(player_id);
  `);

  console.log('[DB] Initialized at', DB_PATH);
}

export function ensurePlayer(playerId, name = 'Аноним') {
  if (!db) return;
  const existing = db.prepare('SELECT id FROM players WHERE id = ?').get(playerId);
  if (!existing) {
    db.prepare('INSERT INTO players (id, name) VALUES (?, ?)').run(playerId, name);
  } else {
    db.prepare('UPDATE players SET last_seen = datetime(\'now\'), name = ? WHERE id = ?').run(name, playerId);
  }
}

export function saveGameResult(playerId, { won, turns, gameMode, opponent, roomId }) {
  if (!db) return;
  ensurePlayer(playerId);

  db.prepare(`
    INSERT INTO games (room_id, player_id, opponent_id, won, turns, game_mode, collapsed)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(roomId || null, playerId, opponent || null, won ? 1 : 0, turns, gameMode, won ? 0 : 1);

  // Update player_stats
  const stats = db.prepare('SELECT * FROM player_stats WHERE player_id = ?').get(playerId);
  if (!stats) {
    db.prepare(`
      INSERT INTO player_stats (player_id, total_games, wins, losses, best_turns, total_turns, games_online)
      VALUES (?, 1, ?, ?, ?, ?, 1)
    `).run(playerId, won ? 1 : 0, won ? 0 : 1, turns, turns);
  } else {
    const newWins = stats.wins + (won ? 1 : 0);
    const newLosses = stats.losses + (won ? 0 : 1);
    const newBest = Math.max(stats.best_turns, turns);
    const newTotalTurns = stats.total_turns + turns;
    const newWinStreak = won ? stats.win_streak + 1 : 0;
    const newBestStreak = Math.max(stats.best_win_streak, newWinStreak);

    db.prepare(`
      UPDATE player_stats SET
        total_games = total_games + 1,
        wins = ?,
        losses = ?,
        best_turns = ?,
        total_turns = ?,
        win_streak = ?,
        best_win_streak = ?,
        games_online = games_online + 1,
        updated_at = datetime('now')
      WHERE player_id = ?
    `).run(newWins, newLosses, newBest, newTotalTurns, newWinStreak, newBestStreak, playerId);
  }
}

export function recordPlayerAction(playerId, actionType, payload = {}) {
  if (!db) return;
  ensurePlayer(playerId);

  db.prepare(`
    INSERT INTO actions (player_id, action_type, payload)
    VALUES (?, ?, ?)
  `).run(playerId, actionType, JSON.stringify(payload));

  // Update total_moves in stats
  db.prepare(`
    UPDATE player_stats SET total_moves = total_moves + 1, updated_at = datetime('now')
    WHERE player_id = ?
  `).run(playerId);
}

export function getPlayerStats(playerId) {
  if (!db) return null;

  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
  const stats = db.prepare('SELECT * FROM player_stats WHERE player_id = ?').get(playerId);
  const recentGames = db.prepare(`
    SELECT * FROM games WHERE player_id = ? ORDER BY created_at DESC LIMIT 10
  `).all(playerId);

  return {
    player: player || { id: playerId, name: 'Аноним' },
    stats: stats ? {
      ...stats,
      best_score: stats.best_turns,
    } : {
      total_games: 0, wins: 0, losses: 0, best_turns: 0, best_score: 0,
      total_turns: 0, win_streak: 0, best_win_streak: 0,
      total_moves: 0, fast_moves: 0, bottom_pulls: 0,
      games_classic: 0, games_speed: 0, games_online: 0,
    },
    recentGames,
  };
}

export function getLeaderboard(limit = 50) {
  if (!db) return [];

  return db.prepare(`
    SELECT
      p.id,
      p.name as player_name,
      ps.wins,
      ps.losses,
      ps.best_turns as score,
      ps.total_games,
      ps.win_streak,
      ps.best_win_streak
    FROM player_stats ps
    JOIN players p ON p.id = ps.player_id
    ORDER BY ps.wins DESC, ps.best_turns DESC
    LIMIT ?
  `).all(limit);
}

export function getGlobalStats() {
  if (!db) return { totalPlayers: 0, totalGames: 0, totalMoves: 0 };

  const row = db.prepare(`
    SELECT
      COUNT(DISTINCT player_id) as totalPlayers,
      SUM(total_games) as totalGames,
      SUM(total_moves) as totalMoves,
      SUM(wins) as totalWins,
      SUM(losses) as totalLosses
    FROM player_stats
  `).get();

  return {
    totalPlayers: row?.totalPlayers || 0,
    totalGames: row?.totalGames || 0,
    totalMoves: row?.totalMoves || 0,
    totalWins: row?.totalWins || 0,
    totalLosses: row?.totalLosses || 0,
  };
}

export function updatePlayerName(playerId, name) {
  if (!db) return;
  ensurePlayer(playerId);
  db.prepare('UPDATE players SET name = ? WHERE id = ?').run(name, playerId);
}
