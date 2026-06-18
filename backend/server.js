const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Chess } = require('chess.js');

const db = require('./database');
const { sendVerificationEmail, isMockMode } = require('./emailService');
const { calculateElo, validateAndMakeMove } = require('./gameLogic');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;
const JWT_SECRET = 'local_chess_jwt_secret_998877';

// Middleware
app.use(cors());
app.use(express.json());

// Auth Helper
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentifizierungstoken fehlt.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Ungültiges Token.' });
    req.user = user;
    next();
  });
}

// ----------------- HTTP API ROUTES -----------------

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Benutzername und Passwort erforderlich.' });
  }

  if (username.trim().length < 3) {
    return res.status(400).json({ error: 'Der Benutzername muss mindestens 3 Zeichen lang sein.' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Das Passwort muss mindestens 4 Zeichen lang sein.' });
  }

  try {
    const existingUsername = await db.get('SELECT * FROM users WHERE username = ?', [username.trim()]);
    if (existingUsername) {
      return res.status(400).json({ error: 'Benutzername bereits vergeben.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const id = uuidv4();

    await db.run(
      'INSERT INTO users (id, username, password_hash, is_guest, is_verified) VALUES (?, ?, ?, 0, 1)',
      [id, username.trim(), passwordHash]
    );

    res.json({ message: 'Registrierung erfolgreich! Du kannst dich jetzt sofort einloggen.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Datenbankfehler bei der Registrierung.' });
  }
});

// Verify Email Link Clicked
app.get('/api/auth/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).send('<h3>Ungültiger oder fehlender Verifizierungstoken.</h3>');
  }

  try {
    const user = await db.get('SELECT * FROM users WHERE verification_token = ?', [token]);
    if (!user) {
      return res.status(400).send('<h3>Der Verifizierungstoken ist ungültig oder abgelaufen.</h3>');
    }

    await db.run(
      'UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?',
      [user.id]
    );

    const frontendUrl = process.env.FRONTEND_URL || `http://${req.headers.host.split(':')[0]}:5173`;
    let redirectDest = `${frontendUrl}/#login?verified=true`;
    
    if (process.env.FRONTEND_URL) {
      redirectDest = `${process.env.FRONTEND_URL}/#login?verified=true`;
    } else if (req.headers.host && !req.headers.host.includes('localhost') && !req.headers.host.includes('127.0.0.1')) {
      const hostClean = req.headers.host;
      redirectDest = `http://${hostClean}/multiplayer-chess-app/#login?verified=true`;
    }

    res.send(`
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h2 style="color: #10b981;">E-Mail-Adresse erfolgreich verifiziert! 🚀</h2>
        <p>Dein Schach-Konto wurde aktiviert. Du wirst in Kürze weitergeleitet...</p>
        <p>Falls du nicht weitergeleitet wirst, klicke bitte <a href="${redirectDest}" style="color: #38bdf8; font-weight: bold;">hier</a>.</p>
        <script>
          setTimeout(function() {
            window.location.href = "${redirectDest}";
          }, 3000);
        </script>
      </div>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send('<h3>Interner Serverfehler bei der Verifizierung.</h3>');
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Benutzername und Passwort erforderlich.' });
  }
  try {
    const user = await db.get('SELECT * FROM users WHERE username = ? AND is_guest = 0', [username]);
    if (!user) {
      return res.status(400).json({ error: 'Ungültige Anmeldedaten.' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Ungültige Anmeldedaten.' });
    }

    if (user.is_verified === 0) {
      return res.status(400).json({ error: 'Bitte bestätige deine E-Mail-Adresse vor der Anmeldung.' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, isGuest: false }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, elo: user.elo, isGuest: false } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Datenbankfehler beim Login.' });
  }
});

// Guest Session
app.post('/api/auth/guest', async (req, res) => {
  try {
    const id = uuidv4();
    const shortId = id.substring(0, 6);
    const username = `Gast_${shortId}`;

    await db.run(
      'INSERT INTO users (id, username, is_guest) VALUES (?, ?, 1)',
      [id, username]
    );

    const token = jwt.sign({ id, username, isGuest: true }, JWT_SECRET);
    res.json({ token, user: { id, username, elo: 1200, isGuest: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Erstellen des Gast-Kontos.' });
  }
});

// Create Game
app.post('/api/games', authenticateToken, async (req, res) => {
  const {
    opponent_id,
    elo_relevant,
    time_control,
    time_limit_ms,
    preferred_color,
    is_private,
    allow_takeback,
    allow_chat,
    tournament_id
  } = req.body;

  const gameId = uuidv4();
  const playerColor = preferred_color === 'random' 
    ? (Math.random() < 0.5 ? 'white' : 'black') 
    : preferred_color;

  let white_player_id = null;
  let black_player_id = null;
  let white_player_name = 'Ausstehend...';
  let black_player_name = 'Ausstehend...';
  let challenger_id = null;
  let final_is_private = is_private ? 1 : 0;

  try {
    if (opponent_id) {
      const opponent = await db.get('SELECT id, username FROM users WHERE id = ?', [opponent_id]);
      if (!opponent) {
        return res.status(404).json({ error: 'Herausgeforderter Spieler nicht gefunden.' });
      }
      challenger_id = req.user.id;
      final_is_private = 1; // Direct challenges are private

      if (playerColor === 'white') {
        white_player_id = req.user.id;
        white_player_name = req.user.username;
        black_player_id = opponent.id;
        black_player_name = opponent.username;
      } else {
        black_player_id = req.user.id;
        black_player_name = req.user.username;
        white_player_id = opponent.id;
        white_player_name = opponent.username;
      }
    } else {
      if (playerColor === 'white') {
        white_player_id = req.user.id;
        white_player_name = req.user.username;
      } else {
        black_player_id = req.user.id;
        black_player_name = req.user.username;
      }
    }

    // Clocks
    const defaultClocks = {
      blitz: 600000, // 10 mins
      '24h': 86400000,
      '48h': 172800000,
      custom: time_limit_ms || 600000
    };
    const timer = defaultClocks[time_control] || defaultClocks.blitz;

    await db.run(
      `INSERT INTO games (
        id, white_player_id, black_player_id, white_player_name, black_player_name,
        elo_relevant, time_control, time_limit_ms, white_time_left, black_time_left,
        status, allow_takeback, allow_chat, is_private, tournament_id, challenger_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
      [
        gameId,
        white_player_id,
        black_player_id,
        white_player_name,
        black_player_name,
        elo_relevant ? 1 : 0,
        time_control,
        timer,
        timer,
        timer,
        allow_takeback ? 1 : 0,
        allow_chat ? 1 : 0,
        final_is_private,
        tournament_id || null,
        challenger_id
      ]
    );

    res.json({ gameId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Erstellen des Spiels.' });
  }
});

// Join Game / Accept Challenge
app.post('/api/games/:gameId/join', authenticateToken, async (req, res) => {
  const { gameId } = req.params;
  try {
    const game = await db.get('SELECT * FROM games WHERE id = ?', [gameId]);
    if (!game) return res.status(404).json({ error: 'Spiel nicht gefunden.' });
    if (game.status !== 'pending') return res.status(400).json({ error: 'Spiel läuft bereits oder ist beendet.' });

    // Check if it's a direct challenge with both players already assigned
    if (game.challenger_id && game.white_player_id && game.black_player_id) {
      if (req.user.id !== game.white_player_id && req.user.id !== game.black_player_id) {
        return res.status(403).json({ error: 'Dieses Spiel ist eine private Herausforderung.' });
      }

      if (req.user.id === game.challenger_id) {
        return res.json({ message: 'Bereits im Spiel.' });
      } else {
        // The opponent accepts the challenge
        await db.run(
          "UPDATE games SET status = 'playing', last_move_timestamp = ? WHERE id = ?",
          [Date.now(), gameId]
        );

        // Notify room
        io.to(`game:${gameId}`).emit('game_joined', {
          white_player_id: game.white_player_id,
          white_player_name: game.white_player_name,
          black_player_id: game.black_player_id,
          black_player_name: game.black_player_name,
          status: 'playing'
        });

        return res.json({ success: true, message: 'Herausforderung angenommen.' });
      }
    }

    // Check if player is already in the game (for regular invite/public links)
    if (game.white_player_id === req.user.id || game.black_player_id === req.user.id) {
      return res.json({ message: 'Bereits im Spiel.' });
    }

    let query = '';
    let params = [];

    if (!game.white_player_id) {
      query = "UPDATE games SET white_player_id = ?, white_player_name = ?, status = 'playing', last_move_timestamp = ? WHERE id = ?";
      params = [req.user.id, req.user.username, Date.now(), gameId];
    } else if (!game.black_player_id) {
      query = "UPDATE games SET black_player_id = ?, black_player_name = ?, status = 'playing', last_move_timestamp = ? WHERE id = ?";
      params = [req.user.id, req.user.username, Date.now(), gameId];
    } else {
      return res.status(400).json({ error: 'Spiel ist voll.' });
    }

    await db.run(query, params);

    // Notify room
    io.to(`game:${gameId}`).emit('game_joined', {
      white_player_id: game.white_player_id || req.user.id,
      white_player_name: game.white_player_name !== 'Ausstehend...' ? game.white_player_name : req.user.username,
      black_player_id: game.black_player_id || req.user.id,
      black_player_name: game.black_player_name !== 'Ausstehend...' ? game.black_player_name : req.user.username,
      status: 'playing'
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Beitritt.' });
  }
});

// Decline or Cancel Game Challenge
app.post('/api/games/:gameId/decline', authenticateToken, async (req, res) => {
  const { gameId } = req.params;
  try {
    const game = await db.get('SELECT * FROM games WHERE id = ?', [gameId]);
    if (!game) return res.status(404).json({ error: 'Spiel nicht gefunden.' });
    if (game.status !== 'pending') return res.status(400).json({ error: 'Spiel läuft bereits oder ist beendet.' });

    // Only challenger or challenged player can delete/decline
    if (req.user.id !== game.white_player_id && req.user.id !== game.black_player_id) {
      return res.status(403).json({ error: 'Nicht berechtigt.' });
    }

    await db.run('DELETE FROM games WHERE id = ?', [gameId]);

    // Notify room that challenge has been cancelled/declined
    io.to(`game:${gameId}`).emit('game_declined', { gameId });

    res.json({ success: true, message: 'Herausforderung abgelehnt/abgebrochen.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Ablehnen der Herausforderung.' });
  }
});

// List Direct Challenges
app.get('/api/challenges', authenticateToken, async (req, res) => {
  try {
    const challenges = await db.all(
      `SELECT * FROM games 
       WHERE status = 'pending' 
         AND challenger_id IS NOT NULL 
         AND (white_player_id = ? OR black_player_id = ?)`,
      [req.user.id, req.user.id]
    );
    res.json(challenges);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Herausforderungen.' });
  }
});

// List Registered Users to Challenge
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await db.all(
      `SELECT id, username, elo FROM users 
       WHERE is_guest = 0 AND id != ? 
       ORDER BY username ASC`,
      [req.user.id]
    );
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Benutzerliste.' });
  }
});

// Get Game Info
app.get('/api/games/:gameId', async (req, res) => {
  const { gameId } = req.params;
  try {
    const game = await db.get('SELECT * FROM games WHERE id = ?', [gameId]);
    if (!game) return res.status(404).json({ error: 'Spiel nicht gefunden.' });
    
    // Fetch moves & chat
    const moves = await db.all('SELECT * FROM moves WHERE game_id = ? ORDER BY move_number ASC, created_at ASC', [gameId]);
    const chat = await db.all('SELECT * FROM chat_messages WHERE game_id = ? ORDER BY created_at ASC', [gameId]);

    res.json({ game, moves, chat });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Spieldetails.' });
  }
});

// List Active Public Games
app.get('/api/games', async (req, res) => {
  try {
    const games = await db.all("SELECT * FROM games WHERE is_private = 0 AND status = 'pending'");
    res.json(games);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Spiele.' });
  }
});

// Profile Stats & History
app.get('/api/users/:userId/stats', async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await db.get('SELECT id, username, elo, highest_elo, created_at FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden.' });

    // Count games
    const gamesCount = await db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN (white_player_id = ? AND result = 'white_win') OR (black_player_id = ? AND result = 'black_win') THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN (white_player_id = ? AND result = 'black_win') OR (black_player_id = ? AND result = 'white_win') THEN 1 ELSE 0 END) as losses,
        SUM(CASE WHEN result = 'draw' THEN 1 ELSE 0 END) as draws
      FROM games 
      WHERE (white_player_id = ? OR black_player_id = ?) AND status = 'finished'
    `, [userId, userId, userId, userId, userId, userId]);

    res.json({
      user,
      stats: {
        totalGames: gamesCount.total || 0,
        wins: gamesCount.wins || 0,
        losses: gamesCount.losses || 0,
        draws: gamesCount.draws || 0,
        winRate: gamesCount.total ? Math.round((gamesCount.wins / gamesCount.total) * 100) : 0
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Statistiken.' });
  }
});

// History & Head-to-Head
app.get('/api/users/:userId/history', async (req, res) => {
  const { userId } = req.params;
  const { opponentId } = req.query;

  try {
    let games;
    if (opponentId) {
      games = await db.all(`
        SELECT * FROM games 
        WHERE ((white_player_id = ? AND black_player_id = ?) OR (white_player_id = ? AND black_player_id = ?))
          AND status = 'finished'
        ORDER BY created_at DESC
      `, [userId, opponentId, opponentId, userId]);
    } else {
      games = await db.all(`
        SELECT * FROM games 
        WHERE (white_player_id = ? OR black_player_id = ?) 
        ORDER BY created_at DESC
        LIMIT 20
      `, [userId, userId]);
    }
    res.json(games);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Spielhistorie.' });
  }
});

// Leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const players = await db.all('SELECT id, username, elo, highest_elo, is_guest FROM users ORDER BY elo DESC LIMIT 50');
    res.json(players);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Bestenliste.' });
  }
});

// ----------------- TOURNAMENT ENDPOINTS -----------------

// Create Tournament
app.post('/api/tournaments', authenticateToken, async (req, res) => {
  const { name, type, elo_relevant, time_control, max_participants, is_private, start_time } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'Name und Turniertyp erforderlich.' });

  const id = uuidv4();
  try {
    await db.run(
      `INSERT INTO tournaments (
        id, name, admin_id, type, status, elo_relevant, time_control, max_participants, is_private, start_time
      ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        req.user.id,
        type,
        elo_relevant ? 1 : 0,
        time_control || 'blitz',
        max_participants || 8,
        is_private ? 1 : 0,
        start_time || null
      ]
    );

    // Auto join admin
    await db.run(
      'INSERT INTO tournament_participants (tournament_id, user_id) VALUES (?, ?)',
      [id, req.user.id]
    );

    res.json({ id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Erstellen des Turniers.' });
  }
});

// List Tournaments
app.get('/api/tournaments', async (req, res) => {
  try {
    const list = await db.all(`
      SELECT t.*, u.username as admin_name,
        (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id) as participant_count
      FROM tournaments t
      JOIN users u ON t.admin_id = u.id
      WHERE t.is_private = 0 OR t.status != 'pending'
      ORDER BY t.created_at DESC
    `);
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Turniere.' });
  }
});

// Get Tournament details, participants & games
app.get('/api/tournaments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const tournament = await db.get(`
      SELECT t.*, u.username as admin_name
      FROM tournaments t
      JOIN users u ON t.admin_id = u.id
      WHERE t.id = ?
    `, [id]);
    if (!tournament) return res.status(404).json({ error: 'Turnier nicht gefunden.' });

    const participants = await db.all(`
      SELECT tp.*, u.username, u.elo
      FROM tournament_participants tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.tournament_id = ?
      ORDER BY tp.score DESC, u.elo DESC
    `, [id]);

    const games = await db.all('SELECT * FROM games WHERE tournament_id = ?', [id]);

    res.json({ tournament, participants, games });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Abrufen der Turnierdetails.' });
  }
});

// Join Tournament
app.post('/api/tournaments/:id/join', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const t = await db.get('SELECT * FROM tournaments WHERE id = ?', [id]);
    if (!t) return res.status(404).json({ error: 'Turnier nicht gefunden.' });
    if (t.status !== 'pending') return res.status(400).json({ error: 'Turnier hat bereits begonnen.' });

    const countRes = await db.get('SELECT COUNT(*) as cnt FROM tournament_participants WHERE tournament_id = ?', [id]);
    if (countRes.cnt >= t.max_participants) {
      return res.status(400).json({ error: 'Turnier ist voll.' });
    }

    const joined = await db.get('SELECT * FROM tournament_participants WHERE tournament_id = ? AND user_id = ?', [id, req.user.id]);
    if (joined) return res.json({ message: 'Bereits beigetreten.' });

    await db.run(
      'INSERT INTO tournament_participants (tournament_id, user_id) VALUES (?, ?)',
      [id, req.user.id]
    );

    io.emit('tournament_update', { tournamentId: id });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Beitreten.' });
  }
});

// Start Tournament (Create Pairings)
app.post('/api/tournaments/:id/start', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const t = await db.get('SELECT * FROM tournaments WHERE id = ?', [id]);
    if (!t) return res.status(404).json({ error: 'Turnier nicht gefunden.' });
    if (t.admin_id !== req.user.id) return res.status(403).json({ error: 'Nur der Admin kann das Turnier starten.' });
    if (t.status !== 'pending') return res.status(400).json({ error: 'Turnier hat bereits begonnen.' });

    const participants = await db.all(`
      SELECT tp.user_id, u.username
      FROM tournament_participants tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.tournament_id = ?
    `, [id]);

    if (participants.length < 2) {
      return res.status(400).json({ error: 'Mindestens 2 Spieler erforderlich.' });
    }

    await db.run("UPDATE tournaments SET status = 'active' WHERE id = ?", [id]);

    // Create matches
    if (t.type === 'round_robin') {
      // Create all pairs
      for (let i = 0; i < participants.length; i++) {
        for (let j = i + 1; j < participants.length; j++) {
          const gameId = uuidv4();
          // Alternate white and black
          const white = i % 2 === 0 ? participants[i] : participants[j];
          const black = i % 2 === 0 ? participants[j] : participants[i];

          await db.run(
            `INSERT INTO games (
              id, white_player_id, black_player_id, white_player_name, black_player_name,
              elo_relevant, time_control, status, tournament_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'playing', ?)`,
            [
              gameId,
              white.user_id,
              black.user_id,
              white.username,
              black.username,
              t.elo_relevant,
              t.time_control,
              id
            ]
          );
        }
      }
    } else {
      // K.o. System Round 1
      // Shuffle participants
      const players = [...participants].sort(() => Math.random() - 0.5);
      
      // If odd, one gets a bye (we'll just promote them or give them score, or for simplicity, we do pairs)
      for (let i = 0; i < players.length; i += 2) {
        if (i + 1 < players.length) {
          const gameId = uuidv4();
          await db.run(
            `INSERT INTO games (
              id, white_player_id, black_player_id, white_player_name, black_player_name,
              elo_relevant, time_control, status, tournament_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'playing', ?)`,
            [
              gameId,
              players[i].user_id,
              players[i + 1].user_id,
              players[i].username,
              players[i + 1].username,
              t.elo_relevant,
              t.time_control,
              id
            ]
          );
        } else {
          // Odd player gets automatic bypass
          await db.run(
            'UPDATE tournament_participants SET score = score + 1.0 WHERE tournament_id = ? AND user_id = ?',
            [id, players[i].user_id]
          );
        }
      }
    }

    io.emit('tournament_update', { tournamentId: id });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Starten des Turniers.' });
  }
});


// ----------------- SOCKET.IO CHESS ROOMS -----------------

io.on('connection', (socket) => {
  console.log('Socket client connected:', socket.id);

  socket.on('join_game', async ({ gameId, token }) => {
    try {
      socket.join(`game:${gameId}`);
      console.log(`Socket ${socket.id} joined game room ${gameId}`);
      
      // Broadcast online status if needed
      socket.emit('joined_room_ok');
    } catch (err) {
      console.error('Socket join_game error:', err);
    }
  });

  socket.on('make_move', async ({ gameId, move, token }) => {
    try {
      // Decode user
      const decoded = jwt.verify(token, JWT_SECRET);
      const game = await db.get('SELECT * FROM games WHERE id = ?', [gameId]);
      if (!game || game.status !== 'playing') return;

      const isWhite = game.white_player_id === decoded.id;
      const isBlack = game.black_player_id === decoded.id;
      if (!isWhite && !isBlack) return; // Spectator cannot make moves

      // Check Turn
      const chess = new Chess(game.fen);
      const currentTurn = chess.turn(); // 'w' or 'b'
      if ((currentTurn === 'w' && !isWhite) || (currentTurn === 'b' && !isBlack)) {
        return; // Not player's turn
      }

      // Calculate time consumption since last move
      const now = Date.now();
      let whiteTime = game.white_time_left;
      let blackTime = game.black_time_left;

      if (game.last_move_timestamp) {
        const timeDiff = now - game.last_move_timestamp;
        if (currentTurn === 'w') {
          whiteTime = Math.max(0, whiteTime - timeDiff);
        } else {
          blackTime = Math.max(0, blackTime - timeDiff);
        }
      }

      // Check for Timeout
      if (whiteTime === 0 || blackTime === 0) {
        await finishGameDueToTimeout(gameId, whiteTime === 0 ? 'white' : 'black');
        return;
      }

      // Validate Chess Move
      const validation = validateAndMakeMove(game.fen, move, game.pgn);
      if (!validation.valid) {
        socket.emit('move_rejected', { reason: 'Illegaler Zug' });
        return;
      }

      // Update Game State in Database
      const nextMoveNumber = Math.ceil((new Chess(validation.fen).history().length) / 2);
      const newMoveId = uuidv4();

      await db.run(
        `INSERT INTO moves (id, game_id, move_number, color, from_square, to_square, piece, san, fen_after)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newMoveId,
          gameId,
          nextMoveNumber,
          currentTurn,
          move.from,
          move.to,
          move.piece || 'p',
          validation.san,
          validation.fen
        ]
      );

      let status = 'playing';
      let result = validation.result;
      let termination = validation.termination;

      if (validation.isGameOver) {
        status = 'finished';
      }

      await db.run(
        `UPDATE games SET 
          fen = ?, pgn = ?, white_time_left = ?, black_time_left = ?, 
          last_move_timestamp = ?, status = ?, result = ?, termination = ?
         WHERE id = ?`,
        [
          validation.fen,
          validation.pgn,
          whiteTime,
          blackTime,
          now,
          status,
          result,
          termination,
          gameId
        ]
      );

      // Fetch fresh game state
      const updatedGame = await db.get('SELECT * FROM games WHERE id = ?', [gameId]);
      const addedMove = {
        id: newMoveId,
        game_id: gameId,
        move_number: nextMoveNumber,
        color: currentTurn,
        from_square: move.from,
        to_square: move.to,
        piece: move.piece,
        san: validation.san,
        fen_after: validation.fen
      };

      // Broadcast move to room
      io.to(`game:${gameId}`).emit('move_made', {
        game: updatedGame,
        move: addedMove
      });

      // Handle Game Over ELO updates
      if (validation.isGameOver) {
        await handleGameCompletionEloAndTournament(updatedGame);
      }

    } catch (err) {
      console.error('Socket make_move error:', err);
    }
  });

  socket.on('send_chat', async ({ gameId, message, token }) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const game = await db.get('SELECT * FROM games WHERE id = ?', [gameId]);
      if (!game || !game.allow_chat) return;

      const msgId = uuidv4();
      await db.run(
        'INSERT INTO chat_messages (id, game_id, sender_id, sender_name, message) VALUES (?, ?, ?, ?, ?)',
        [msgId, gameId, decoded.id, decoded.username, message]
      );

      io.to(`game:${gameId}`).emit('chat_received', {
        id: msgId,
        game_id: gameId,
        sender_id: decoded.id,
        sender_name: decoded.username,
        message,
        created_at: new Date().toLocaleTimeString()
      });
    } catch (err) {
      console.error(err);
    }
  });

  // Takeback request
  socket.on('request_takeback', async ({ gameId, token }) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const game = await db.get('SELECT * FROM games WHERE id = ?', [gameId]);
      if (!game || game.status !== 'playing' || !game.allow_takeback) return;

      const isWhite = game.white_player_id === decoded.id;
      const isBlack = game.black_player_id === decoded.id;
      if (!isWhite && !isBlack) return;

      const requester = isWhite ? 'white' : 'black';
      await db.run(
        'UPDATE games SET status = ? WHERE id = ?',
        [isWhite ? 'takeback_requested_white' : 'takeback_requested_black', gameId]
      );

      socket.to(`game:${gameId}`).emit('takeback_offered', { requester });
    } catch (err) {
      console.error(err);
    }
  });

  // Respond Takeback
  socket.on('respond_takeback', async ({ gameId, accept, token }) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const game = await db.get('SELECT * FROM games WHERE id = ?', [gameId]);
      if (!game) return;

      const isWhite = game.white_player_id === decoded.id;
      const isBlack = game.black_player_id === decoded.id;
      if (!isWhite && !isBlack) return;

      if (accept) {
        // Rollback moves
        const moves = await db.all('SELECT * FROM moves WHERE game_id = ? ORDER BY move_number DESC, created_at DESC', [gameId]);
        if (moves.length > 0) {
          // Find out how many moves to rollback
          // In chess, we usually roll back 1 ply (if it was the opponent's turn) or 2 plies (to return to player's turn)
          // To be simple and robust: we delete the very last move.
          const lastMove = moves[0];
          await db.run('DELETE FROM moves WHERE id = ?', [lastMove.id]);

          // Recalculate FEN/PGN from remaining history
          const remainingMoves = await db.all('SELECT * FROM moves WHERE game_id = ? ORDER BY move_number ASC, created_at ASC', [gameId]);
          const freshChess = new Chess();
          
          for (const m of remainingMoves) {
            freshChess.move({ from: m.from_square, to: m.to_square, promotion: 'q' });
          }

          await db.run(
            `UPDATE games SET fen = ?, pgn = ?, status = 'playing' WHERE id = ?`,
            [freshChess.fen(), freshChess.pgn(), gameId]
          );

          const updatedGame = await db.get('SELECT * FROM games WHERE id = ?', [gameId]);
          io.to(`game:${gameId}`).emit('takeback_accepted', { game: updatedGame });
        } else {
          // No moves to rollback
          await db.run("UPDATE games SET status = 'playing' WHERE id = ?", [gameId]);
          io.to(`game:${gameId}`).emit('takeback_declined');
        }
      } else {
        await db.run("UPDATE games SET status = 'playing' WHERE id = ?", [gameId]);
        io.to(`game:${gameId}`).emit('takeback_declined');
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Draw Offer
  socket.on('offer_draw', async ({ gameId, token }) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const game = await db.get('SELECT * FROM games WHERE id = ?', [gameId]);
      if (!game || game.status !== 'playing') return;

      const isWhite = game.white_player_id === decoded.id;
      const isBlack = game.black_player_id === decoded.id;
      if (!isWhite && !isBlack) return;

      const requester = isWhite ? 'white' : 'black';
      await db.run(
        'UPDATE games SET status = ? WHERE id = ?',
        [isWhite ? 'draw_offered_white' : 'draw_offered_black', gameId]
      );

      socket.to(`game:${gameId}`).emit('draw_offered', { requester });
    } catch (err) {
      console.error(err);
    }
  });

  // Respond Draw
  socket.on('respond_draw', async ({ gameId, accept, token }) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const game = await db.get('SELECT * FROM games WHERE id = ?', [gameId]);
      if (!game) return;

      if (accept) {
        await db.run(
          `UPDATE games SET status = 'finished', result = 'draw', termination = 'draw_agreement' WHERE id = ?`,
          [gameId]
        );
        const updatedGame = await db.get('SELECT * FROM games WHERE id = ?', [gameId]);
        io.to(`game:${gameId}`).emit('game_finished', { game: updatedGame });
        await handleGameCompletionEloAndTournament(updatedGame);
      } else {
        await db.run("UPDATE games SET status = 'playing' WHERE id = ?", [gameId]);
        io.to(`game:${gameId}`).emit('draw_declined');
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Resign
  socket.on('resign', async ({ gameId, token }) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const game = await db.get('SELECT * FROM games WHERE id = ?', [gameId]);
      if (!game || game.status !== 'playing') return;

      const isWhite = game.white_player_id === decoded.id;
      const isBlack = game.black_player_id === decoded.id;
      if (!isWhite && !isBlack) return;

      const result = isWhite ? 'black_win' : 'white_win';
      await db.run(
        `UPDATE games SET status = 'finished', result = ?, termination = 'resign' WHERE id = ?`,
        [result, gameId]
      );

      const updatedGame = await db.get('SELECT * FROM games WHERE id = ?', [gameId]);
      io.to(`game:${gameId}`).emit('game_finished', { game: updatedGame });
      await handleGameCompletionEloAndTournament(updatedGame);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket client disconnected:', socket.id);
  });
});

// Helper for Timeout terminations
async function finishGameDueToTimeout(gameId, timedOutPlayerColor) {
  const result = timedOutPlayerColor === 'white' ? 'black_win' : 'white_win';
  await db.run(
    `UPDATE games SET status = 'finished', result = ?, termination = 'timeout' WHERE id = ?`,
    [result, gameId]
  );
  const updatedGame = await db.get('SELECT * FROM games WHERE id = ?', [gameId]);
  io.to(`game:${gameId}`).emit('game_finished', { game: updatedGame });
  await handleGameCompletionEloAndTournament(updatedGame);
}

// Global Matchplay ELO Adjustments & Tournament Round bracket resolution
async function handleGameCompletionEloAndTournament(game) {
  // 1. Elo calculations
  if (game.elo_relevant && game.white_player_id && game.black_player_id) {
    const white = await db.get('SELECT elo, highest_elo FROM users WHERE id = ?', [game.white_player_id]);
    const black = await db.get('SELECT elo, highest_elo FROM users WHERE id = ?', [game.black_player_id]);

    if (white && black) {
      const eloResults = calculateElo(white.elo, black.elo, game.result);
      
      // Update DB for White
      await db.run(
        'UPDATE users SET elo = ?, highest_elo = MAX(highest_elo, ?) WHERE id = ?',
        [eloResults.newWhiteElo, eloResults.newWhiteElo, game.white_player_id]
      );
      // Update DB for Black
      await db.run(
        'UPDATE users SET elo = ?, highest_elo = MAX(highest_elo, ?) WHERE id = ?',
        [eloResults.newBlackElo, eloResults.newBlackElo, game.black_player_id]
      );

      console.log(`ELO updated: White (${white.elo} -> ${eloResults.newWhiteElo}), Black (${black.elo} -> ${eloResults.newBlackElo})`);
    }
  }

  // 2. Tournament score handling
  if (game.tournament_id) {
    const t = await db.get('SELECT * FROM tournaments WHERE id = ?', [game.tournament_id]);
    if (!t) return;

    if (t.type === 'round_robin') {
      let whiteScoreDelta = 0.0;
      let blackScoreDelta = 0.0;
      
      if (game.result === 'white_win') {
        whiteScoreDelta = 1.0;
      } else if (game.result === 'black_win') {
        blackScoreDelta = 1.0;
      } else if (game.result === 'draw') {
        whiteScoreDelta = 0.5;
        blackScoreDelta = 0.5;
      }

      await db.run(
        'UPDATE tournament_participants SET score = score + ? WHERE tournament_id = ? AND user_id = ?',
        [whiteScoreDelta, game.tournament_id, game.white_player_id]
      );
      await db.run(
        'UPDATE tournament_participants SET score = score + ? WHERE tournament_id = ? AND user_id = ?',
        [blackScoreDelta, game.tournament_id, game.black_player_id]
      );

      // Check if all tournament games are finished to auto-finish tournament
      const unfinishedGames = await db.all("SELECT * FROM games WHERE tournament_id = ? AND status != 'finished'", [game.tournament_id]);
      if (unfinishedGames.length === 0) {
        // Find winner
        const topParticipant = await db.get(`
          SELECT user_id FROM tournament_participants 
          WHERE tournament_id = ? 
          ORDER BY score DESC 
          LIMIT 1
        `, [game.tournament_id]);

        if (topParticipant) {
          await db.run(
            "UPDATE tournaments SET status = 'finished', winner_id = ? WHERE id = ?",
            [topParticipant.user_id, game.tournament_id]
          );
        }
      }
    } else if (t.type === 'knockout') {
      // KO system: loser eliminated, winner stays.
      let winnerId = null;
      let loserId = null;

      if (game.result === 'white_win') {
        winnerId = game.white_player_id;
        loserId = game.black_player_id;
      } else if (game.result === 'black_win') {
        winnerId = game.black_player_id;
        loserId = game.white_player_id;
      }

      if (winnerId && loserId) {
        // Eliminate loser
        await db.run(
          'UPDATE tournament_participants SET status = "eliminated" WHERE tournament_id = ? AND user_id = ?',
          [game.tournament_id, loserId]
        );

        // Update winner score as round-progress tracker
        await db.run(
          'UPDATE tournament_participants SET score = score + 1.0 WHERE tournament_id = ? AND user_id = ?',
          [game.tournament_id, winnerId]
        );

        // Check if all games of the current "round" are done.
        // We know a KO round is done when all active matches in the DB are finished.
        const activeMatches = await db.all("SELECT * FROM games WHERE tournament_id = ? AND status != 'finished'", [game.tournament_id]);
        if (activeMatches.length === 0) {
          // Generate next round pairings for remaining active participants
          const remaining = await db.all(`
            SELECT user_id, u.username 
            FROM tournament_participants tp
            JOIN users u ON tp.user_id = u.id
            WHERE tp.tournament_id = ? AND tp.status = 'active'
          `, [game.tournament_id]);

          if (remaining.length === 1) {
            // One player left, tournament won!
            await db.run(
              "UPDATE tournaments SET status = 'finished', winner_id = ? WHERE id = ?",
              [remaining[0].user_id, game.tournament_id]
            );
          } else if (remaining.length > 1) {
            // Pair remaining active players
            for (let i = 0; i < remaining.length; i += 2) {
              if (i + 1 < remaining.length) {
                const newGameId = uuidv4();
                await db.run(
                  `INSERT INTO games (
                    id, white_player_id, black_player_id, white_player_name, black_player_name,
                    elo_relevant, time_control, status, tournament_id
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, 'playing', ?)`,
                  [
                    newGameId,
                    remaining[i].user_id,
                    remaining[i + 1].user_id,
                    remaining[i].username,
                    remaining[i + 1].username,
                    t.elo_relevant,
                    t.time_control,
                    game.tournament_id
                  ]
                );
              } else {
                // If odd number (should not happen if powers of 2, but just in case), they get an automatic pass
                await db.run(
                  'UPDATE tournament_participants SET score = score + 1.0 WHERE tournament_id = ? AND user_id = ?',
                  [game.tournament_id, remaining[i].user_id]
                );
              }
            }
          }
        }
      }
    }

    io.emit('tournament_update', { tournamentId: game.tournament_id });
  }
}

// Start Server
db.initDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`Express and Socket.io server running locally on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
