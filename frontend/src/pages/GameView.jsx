import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import ChessBoard from '../components/ChessBoard';
import GameChat from '../components/GameChat';
import GameControls from '../components/GameControls';
import { API_BASE } from '../config';

export default function GameView({
  gameId,
  user,
  token,
  onNavigate
}) {
  const [game, setGame] = useState(null);
  const [moves, setMoves] = useState([]);
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Board Styling Design Theme local override
  const [boardTheme, setBoardTheme] = useState('modern');

  // Timers local state
  const [whiteTime, setWhiteTime] = useState(0);
  const [blackTime, setBlackTime] = useState(0);

  // Load initial game state
  useEffect(() => {
    fetchGameDetails();
  }, [gameId]);

  const fetchGameDetails = async () => {
    try {
      const res = await fetch(`${API_BASE}/games/${gameId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Spiel konnte nicht geladen werden.');
      
      setGame(data.game);
      setMoves(data.moves);
      setChat(data.chat);
      setWhiteTime(data.game.white_time_left);
      setBlackTime(data.game.black_time_left);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Socket Connection and Event Listeners
  useEffect(() => {
    socket.connect();
    
    // Join room
    socket.emit('join_game', { gameId, token });

    socket.on('game_joined', (updatedPlayerDetails) => {
      setGame(prev => prev ? { ...prev, ...updatedPlayerDetails } : null);
    });

    socket.on('game_declined', () => {
      alert('Diese Herausforderung wurde abgelehnt oder abgebrochen.');
      onNavigate('dashboard');
    });

    socket.on('move_made', ({ game: updatedGame, move }) => {
      setGame(updatedGame);
      setMoves(prev => {
        // Prevent duplicate append
        if (prev.some(m => m.id === move.id)) return prev;
        return [...prev, move];
      });
      setWhiteTime(updatedGame.white_time_left);
      setBlackTime(updatedGame.black_time_left);
    });

    socket.on('chat_received', (msg) => {
      setChat(prev => [...prev, msg]);
    });

    socket.on('takeback_offered', ({ requester }) => {
      setGame(prev => prev ? { ...prev, status: requester === 'white' ? 'takeback_requested_white' : 'takeback_requested_black' } : null);
    });

    socket.on('takeback_accepted', ({ game: updatedGame }) => {
      setGame(updatedGame);
      // Refetch full list of moves as history rolled back
      fetchGameDetails();
    });

    socket.on('takeback_declined', () => {
      setGame(prev => prev ? { ...prev, status: 'playing' } : null);
      alert('Rücknahme-Anfrage vom Gegner abgelehnt.');
    });

    socket.on('draw_offered', ({ requester }) => {
      setGame(prev => prev ? { ...prev, status: requester === 'white' ? 'draw_offered_white' : 'draw_offered_black' } : null);
    });

    socket.on('draw_declined', () => {
      setGame(prev => prev ? { ...prev, status: 'playing' } : null);
      alert('Remis-Angebot vom Gegner abgelehnt.');
    });

    socket.on('game_finished', ({ game: updatedGame }) => {
      setGame(updatedGame);
      setWhiteTime(updatedGame.white_time_left);
      setBlackTime(updatedGame.black_time_left);
    });

    return () => {
      socket.off('game_joined');
      socket.off('game_declined');
      socket.off('move_made');
      socket.off('chat_received');
      socket.off('takeback_offered');
      socket.off('takeback_accepted');
      socket.off('takeback_declined');
      socket.off('draw_offered');
      socket.off('draw_declined');
      socket.off('game_finished');
      // Connection is managed globally in App.jsx
    };
  }, [gameId, token]);

  const handleAcceptDirect = async () => {
    try {
      const res = await fetch(`${API_BASE}/games/${gameId}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Beitreten.');
      fetchGameDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeclineDirect = async () => {
    if (window.confirm('Herausforderung wirklich ablehnen oder abbrechen?')) {
      try {
        const res = await fetch(`${API_BASE}/games/${gameId}/decline`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Fehler beim Ablehnen.');
        onNavigate('dashboard');
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Chess Clocks Tick Effect
  useEffect(() => {
    if (!game || game.status !== 'playing') return;

    // Determine whose turn it is
    const activeColor = moves.length % 2 === 0 ? 'white' : 'black';
    
    const interval = setInterval(() => {
      if (activeColor === 'white') {
        setWhiteTime(prev => Math.max(0, prev - 1000));
      } else {
        setBlackTime(prev => Math.max(0, prev - 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [game, moves]);

  if (loading) return <div style={{ padding: '40px', textLight: 'center' }}>Lade Partie...</div>;
  if (error) return <div style={{ padding: '40px', color: 'var(--color-danger)' }}>Fehler: {error}</div>;
  if (!game) return <div style={{ padding: '40px' }}>Spiel existiert nicht.</div>;

  // Determine user identity
  const isWhite = game.white_player_id === user.id;
  const isBlack = game.black_player_id === user.id;
  const userColor = isWhite ? 'white' : isBlack ? 'black' : 'spectator';
  const myTurn = (moves.length % 2 === 0 && isWhite) || (moves.length % 2 !== 0 && isBlack);

  const handleMakeMove = (move) => {
    // Inject active piece color
    const activeColorSymbol = moves.length % 2 === 0 ? 'w' : 'b';
    socket.emit('make_move', { 
      gameId, 
      move: { ...move, piece: move.piece || 'p' }, 
      token 
    });
  };

  const handleSendMessage = (text) => {
    socket.emit('send_chat', { gameId, message: text, token });
  };

  // Actions
  const handleResign = () => {
    if (window.confirm('Möchtest du diese Partie wirklich aufgeben?')) {
      socket.emit('resign', { gameId, token });
    }
  };

  const handleOfferDraw = () => {
    socket.emit('offer_draw', { gameId, token });
  };

  const handleRespondDraw = (accept) => {
    socket.emit('respond_draw', { gameId, accept, token });
  };

  const handleRequestTakeback = () => {
    socket.emit('request_takeback', { gameId, token });
  };

  const handleRespondTakeback = (accept) => {
    socket.emit('respond_takeback', { gameId, accept, token });
  };

  // Clipboard share
  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/#game:${gameId}`;
    navigator.clipboard.writeText(inviteLink);
    alert('Einladungslink in die Zwischenablage kopiert!');
  };

  // Clock formatter
  const formatTime = (ms) => {
    if (ms <= 0) return '00:00';
    const totalSecs = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    
    const pad = (n) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  // Find last move to highlight on board
  const lastMoveObj = moves.length > 0 ? moves[moves.length - 1] : null;
  const boardLastMove = lastMoveObj ? { from: lastMoveObj.from_square, to: lastMoveObj.to_square } : null;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Return to Dashboard */}
      <button className="btn btn-secondary" onClick={() => onNavigate('dashboard')} style={{ marginBottom: '20px' }}>
        🏠 Zurück zum Dashboard
      </button>

      {/* Invitation pane for pending games */}
      {game.status === 'pending' && (
        <div className="glass-panel text-center animate-fade-in" style={{ padding: '32px', marginBottom: '24px', textAlign: 'center' }}>
          {game.challenger_id ? (
            game.challenger_id === user.id ? (
              // Current user is the challenger
              <div>
                <span style={{ fontSize: '2.5rem' }}>⏳</span>
                <h3 style={{ margin: '12px 0', fontSize: '1.4rem' }}>Herausforderung gesendet</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                  Warte darauf, dass <strong>{game.white_player_id === user.id ? game.black_player_name : game.white_player_name}</strong> deine Herausforderung annimmt...
                </p>
                <button className="btn btn-danger" onClick={handleDeclineDirect}>
                  Herausforderung zurückziehen
                </button>
              </div>
            ) : (
              // Current user is the challenged opponent
              <div>
                <span style={{ fontSize: '2.5rem' }}>⚔️</span>
                <h3 style={{ margin: '12px 0', fontSize: '1.4rem' }}>Herausforderung erhalten!</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                  <strong>{game.challenger_id === game.white_player_id ? game.white_player_name : game.black_player_name}</strong> hat dich zu einer Partie herausgefordert.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button className="btn btn-primary" onClick={handleAcceptDirect}>
                    Annehmen
                  </button>
                  <button className="btn btn-danger" onClick={handleDeclineDirect}>
                    Ablehnen
                  </button>
                </div>
              </div>
            )
          ) : (
            // Standard invite link flow
            <div>
              <span style={{ fontSize: '2.5rem' }}>⏳</span>
              <h3 style={{ margin: '12px 0', fontSize: '1.4rem' }}>Warte auf Gegner</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                Gib deinem Gegner diesen Einladungslink, um die Partie zu starten:
              </p>
              <div style={{ display: 'flex', gap: '12px', maxWidth: '500px', margin: '0 auto' }}>
                <input 
                  type="text" 
                  readOnly 
                  value={`${window.location.origin}/#game:${gameId}`} 
                  style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)', padding: '10px', borderRadius: 'var(--border-radius-sm)', outline: 'none' }}
                />
                <button className="btn btn-primary" onClick={copyInviteLink}>Kopieren</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid Layout for Play Mode */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column: Board Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Opponent Info Row */}
          <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>👤</span>
              <div>
                <strong>{userColor === 'white' ? game.black_player_name : game.white_player_name}</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                  (Gegner)
                </span>
              </div>
            </div>
            {/* Clock */}
            <div style={{ 
              background: userColor === 'white' ? (moves.length % 2 !== 0 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(0,0,0,0.3)') : (moves.length % 2 === 0 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(0,0,0,0.3)'),
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '6px 14px',
              borderRadius: 'var(--border-radius-sm)',
              fontFamily: 'monospace',
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}>
              ⏱️ {formatTime(userColor === 'white' ? blackTime : whiteTime)}
            </div>
          </div>

          {/* Active Chessboard */}
          <ChessBoard
            fen={game.fen}
            orientation={userColor === 'black' ? 'black' : 'white'}
            lastMove={boardLastMove}
            onMove={handleMakeMove}
            disabled={!myTurn || game.status !== 'playing'}
            theme={boardTheme}
          />

          {/* Self Info Row */}
          <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>👤</span>
              <div>
                <strong>{user.username}</strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                  (Du - {userColor === 'white' ? 'Weiß' : userColor === 'black' ? 'Schwarz' : 'Zuschauer'})
                </span>
              </div>
            </div>
            {/* Clock */}
            <div style={{ 
              background: myTurn ? 'rgba(56, 189, 248, 0.2)' : 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '6px 14px',
              borderRadius: 'var(--border-radius-sm)',
              fontFamily: 'monospace',
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }}>
              ⏱️ {formatTime(userColor === 'white' ? whiteTime : blackTime)}
            </div>
          </div>

        </div>

        {/* Right Column: Game Info sidebar, Chat, and Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Game Over announcement panel */}
          {game.status === 'finished' && (
            <div className="glass-panel animate-fade-in" style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid var(--color-success)',
              padding: '20px',
              textAlign: 'center'
            }}>
              <h3 style={{ color: 'var(--color-success)', fontSize: '1.3rem' }}>Spiel Beendet!</h3>
              <p style={{ margin: '8px 0', fontSize: '0.95rem' }}>
                Ergebnis: <strong>{
                  game.result === 'white_win' ? 'Weiß gewinnt' :
                  game.result === 'black_win' ? 'Schwarz gewinnt' : 'Remis'
                }</strong>
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Grund: {
                  game.termination === 'checkmate' ? 'Schachmatt' :
                  game.termination === 'stalemate' ? 'Patt (Stalemate)' :
                  game.termination === 'resign' ? 'Aufgabe' :
                  game.termination === 'draw_agreement' ? 'Remis-Vereinbarung' :
                  game.termination === 'timeout' ? 'Zeitüberschreitung' : 'Unentschieden'
                }
              </p>
            </div>
          )}

          {/* Theme & Options Panel */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>
              🎨 Schachbrett-Design
            </label>
            <select
              value={boardTheme}
              onChange={(e) => setBoardTheme(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-main)',
                padding: '8px 12px',
                borderRadius: 'var(--border-radius-sm)',
                outline: 'none',
                fontSize: '0.9rem'
              }}
            >
              <option value="wood">🟫 Klassisch Holz</option>
              <option value="modern">⬜ Modern Hell/Dunkel</option>
              <option value="green">🟩 Grün/Weiß</option>
              <option value="blue">🟦 Blau/Grau</option>
            </select>
          </div>

          {/* Game controls (Resign, Draw, Takeback) */}
          {userColor !== 'spectator' && (
            <GameControls
              status={game.status}
              isMyTurn={myTurn}
              allowTakeback={!!game.allow_takeback}
              allowChat={!!game.allow_chat}
              onResign={handleResign}
              onOfferDraw={handleOfferDraw}
              onRespondDraw={handleRespondDraw}
              onRequestTakeback={handleRequestTakeback}
              onRespondTakeback={handleRespondTakeback}
              userColor={userColor}
              moveCount={moves.length}
            />
          )}

          {/* Move Log History (PGN) */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <h4 style={{ color: 'var(--color-accent)', marginBottom: '8px', fontSize: '0.95rem' }}>📋 Zughistorie</h4>
            <div style={{ 
              maxHeight: '120px', 
              overflowY: 'auto', 
              fontSize: '0.85rem', 
              fontFamily: 'monospace',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '6px'
            }}>
              {moves.length === 0 ? (
                <div style={{ gridColumn: 'span 2', color: 'var(--text-muted)', fontStyle: 'italic' }}>Keine Züge bisher.</div>
              ) : (
                moves.reduce((acc, m, idx) => {
                  const round = Math.floor(idx / 2) + 1;
                  if (idx % 2 === 0) {
                    acc.push({ round, w: m.san, b: '' });
                  } else {
                    acc[acc.length - 1].b = m.san;
                  }
                  return acc;
                }, []).map(r => (
                  <div key={r.round} style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', padding: '2px 8px', background: r.round % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'none' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{r.round}.</span>
                    <span>{r.w}</span>
                    <span style={{ marginRight: '20px' }}>{r.b}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Live Chat Widget */}
          {!!game.allow_chat && (
            <GameChat
              messages={chat}
              onSendMessage={handleSendMessage}
              disabled={userColor === 'spectator'}
            />
          )}

        </div>

      </div>

    </div>
  );
}
