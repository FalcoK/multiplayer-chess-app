-- Universal SQL Schema for Multiplayer Chess App (SQLite & PostgreSQL Compatible)

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT, -- NULL for guest accounts
  is_guest INTEGER DEFAULT 0, -- 0 for registered, 1 for guest
  is_verified INTEGER DEFAULT 0,
  verification_token TEXT,
  elo INTEGER DEFAULT 1200,
  highest_elo INTEGER DEFAULT 1200,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  admin_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'round_robin' or 'knockout'
  status TEXT DEFAULT 'pending', -- 'pending', 'active', 'finished'
  elo_relevant INTEGER DEFAULT 1, -- 0 or 1
  time_control TEXT DEFAULT 'blitz', -- 'blitz', '24h', '48h', 'custom'
  max_participants INTEGER DEFAULT 8,
  is_private INTEGER DEFAULT 0,
  start_time TEXT,
  winner_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  white_player_id TEXT,
  black_player_id TEXT,
  white_player_name TEXT NOT NULL,
  black_player_name TEXT NOT NULL,
  elo_relevant INTEGER DEFAULT 1,
  time_control TEXT DEFAULT 'blitz',
  time_limit_ms INTEGER DEFAULT 600000, -- 10 minutes default (blitz)
  white_time_left INTEGER DEFAULT 600000,
  black_time_left INTEGER DEFAULT 600000,
  last_move_timestamp BIGINT, -- Using BIGINT/INTEGER for ms timestamps
  status TEXT DEFAULT 'pending', -- 'pending', 'playing', 'draw_offered_white', 'draw_offered_black', 'takeback_requested_white', 'takeback_requested_black', 'finished'
  result TEXT, -- 'white_win', 'black_win', 'draw'
  termination TEXT, -- 'checkmate', 'stalemate', 'resign', 'draw_agreement', 'timeout', 'draw_insufficient_material', 'threefold_repetition'
  allow_takeback INTEGER DEFAULT 1,
  allow_chat INTEGER DEFAULT 1,
  is_private INTEGER DEFAULT 0,
  pgn TEXT DEFAULT '',
  fen TEXT DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', -- Active board state
  tournament_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (white_player_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (black_player_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

-- Moves table
CREATE TABLE IF NOT EXISTS moves (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  move_number INTEGER NOT NULL,
  color TEXT NOT NULL, -- 'w' or 'b'
  from_square TEXT NOT NULL,
  to_square TEXT NOT NULL,
  piece TEXT NOT NULL,
  san TEXT NOT NULL, -- Algebraic notation (e.g. e4, Nf3)
  fen_after TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Tournament participants table
CREATE TABLE IF NOT EXISTS tournament_participants (
  tournament_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  score REAL DEFAULT 0.0,
  status TEXT DEFAULT 'active', -- 'active', 'eliminated'
  PRIMARY KEY (tournament_id, user_id),
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
