import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import ChessBoard from '../components/ChessBoard';
import { getBestMove } from '../utils/chessEngine';
import { explainMove } from '../utils/chessCoach';

// Synthesize satisfying audio effects using the Web Audio API (no external file dependencies)
const playSound = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'move') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'capture') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'check') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
      
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.setValueAtTime(490, now + 0.12);
      gain2.gain.setValueAtTime(0.25, now + 0.12);
      gain2.gain.linearRampToValueAtTime(0.01, now + 0.22);
      
      osc.start(now);
      osc.stop(now + 0.1);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.22);
    }
  } catch (e) {
    console.error('AudioContext error:', e);
  }
};

const BOT_LEVEL_DETAILS = {
  1: { name: 'Anfänger 🧑‍🎓', desc: 'Macht viele Spielfehler. Perfekt für den Einstieg.', depth: 1 },
  2: { name: 'Gelegenheitsspieler ♟️', desc: 'Solide Grundlagen, übersieht aber manchmal Taktiken.', depth: 2 },
  3: { name: 'Vereinsspieler 🛡️', desc: 'Spielt vorausschauend und kontrolliert das Zentrum.', depth: 3 },
  4: { name: 'Meister 🧠', desc: 'Starke taktische Rechentiefe und aggressive Angriffe.', depth: 4 },
  5: { name: 'Superlegende Großmeister 👑', desc: 'Maximale Rechentiefe. Nahezu fehlerfreies Spiel.', depth: 5 }
};

export default function GameVsComputer({ user, onNavigate, onLogout }) {
  // Local storage resume check
  const getSavedState = (key, fallback) => {
    try {
      const val = localStorage.getItem(`sp_chess_${key}`);
      return val ? JSON.parse(val) : fallback;
    } catch {
      return fallback;
    }
  };

  const [gameStarted, setGameStarted] = useState(getSavedState('started', false));
  const [fen, setFen] = useState(getSavedState('fen', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'));
  const [playerColor, setPlayerColor] = useState(getSavedState('player_color', 'white'));
  const [botLevel, setBotLevel] = useState(getSavedState('bot_level', 2));
  const [boardTheme, setBoardTheme] = useState(getSavedState('board_theme', 'modern'));
  const [history, setHistory] = useState(getSavedState('history', [{ fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', lastMove: null }]));
  const [lastMove, setLastMove] = useState(getSavedState('last_move', null));
  const [isThinking, setIsThinking] = useState(false);
  const isThinkingRef = useRef(false);

  // Coach states
  const [coachMessage, setCoachMessage] = useState('');
  const [coachHighlight, setCoachHighlight] = useState(null);
  const [coachLoading, setCoachLoading] = useState(false);

  // Scroll ref for move history container
  const scrollContainerRef = useRef(null);

  // Sync state to local storage on changes
  useEffect(() => {
    localStorage.setItem('sp_chess_started', JSON.stringify(gameStarted));
    localStorage.setItem('sp_chess_fen', JSON.stringify(fen));
    localStorage.setItem('sp_chess_player_color', JSON.stringify(playerColor));
    localStorage.setItem('sp_chess_bot_level', JSON.stringify(botLevel));
    localStorage.setItem('sp_chess_board_theme', JSON.stringify(boardTheme));
    localStorage.setItem('sp_chess_history', JSON.stringify(history));
    localStorage.setItem('sp_chess_last_move', JSON.stringify(lastMove));
  }, [gameStarted, fen, playerColor, botLevel, boardTheme, history, lastMove]);

  // Scroll history down internally when moves are added (without shifting the window viewport)
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [history]);

  const chess = new Chess(fen);
  const isGameOver = chess.isGameOver();
  const isCheckmate = chess.isCheckmate();
  const isDraw = chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial();
  const isChecked = chess.inCheck();
  const activeColor = chess.turn(); // 'w' or 'b'
  const playerColorSymbol = playerColor === 'white' ? 'w' : 'b';
  const isComputerTurn = activeColor !== playerColorSymbol && !isGameOver;

  // Bot response effect loop
  useEffect(() => {
    if (gameStarted && isComputerTurn && !isThinkingRef.current) {
      isThinkingRef.current = true;
      setIsThinking(true);
      
      const thinkingDelay = Math.max(500, 300 + Math.random() * 600); // 500ms - 900ms
      
      const timer = setTimeout(() => {
        const currentChess = new Chess(fen);
        const bestMove = getBestMove(fen, botLevel);
        
        if (bestMove) {
          const executed = currentChess.move(bestMove);
          if (executed) {
            const nextFen = currentChess.fen();
            setFen(nextFen);
            const mObj = { from: bestMove.from, to: bestMove.to };
            setLastMove(mObj);
            setHistory(prev => [...prev, { fen: nextFen, lastMove: mObj }]);
            
            // Audio feed
            if (currentChess.inCheck()) {
              playSound('check');
            } else if (executed.captured) {
              playSound('capture');
            } else {
              playSound('move');
            }
          }
        }
        isThinkingRef.current = false;
        setIsThinking(false);
      }, thinkingDelay);

      return () => clearTimeout(timer);
    }
  }, [fen, gameStarted, isComputerTurn, botLevel]);

  // Handle human move on board
  const handlePlayerMove = (move) => {
    if (isThinking || isComputerTurn || isGameOver) return;

    const currentChess = new Chess(fen);
    try {
      const executed = currentChess.move(move);
      if (executed) {
        const nextFen = currentChess.fen();
        setFen(nextFen);
        const mObj = { from: move.from, to: move.to };
        setLastMove(mObj);
        setHistory(prev => [...prev, { fen: nextFen, lastMove: mObj }]);
        
        // Audio feed
        if (currentChess.inCheck()) {
          playSound('check');
        } else if (executed.captured) {
          playSound('capture');
        } else {
          playSound('move');
        }

        // Wipe hint indicators
        setCoachHighlight(null);
        setCoachMessage('');
      }
    } catch (e) {
      console.warn("Ungültiger Zug:", e);
    }
  };

  // Undo button logic (pops bot and user move)
  const handleUndo = () => {
    if (isThinking || isComputerTurn) return;
    const minLength = playerColor === 'white' ? 3 : 4;
    if (history.length < minLength) return;

    // Roll back two steps
    const newHistory = history.slice(0, -2);
    const targetState = newHistory[newHistory.length - 1];
    
    setHistory(newHistory);
    setFen(targetState.fen);
    setLastMove(targetState.lastMove);
    setCoachHighlight(null);
    setCoachMessage('');
  };

  // AI Coach advice request
  const handleAskCoach = () => {
    if (isThinking || isComputerTurn || isGameOver) return;
    
    setCoachLoading(true);
    // Simulate slight coach deliberation delay
    setTimeout(() => {
      // Calculate best move using depth 3 (a solid recommendation)
      const adviceMove = getBestMove(fen, 3);
      if (adviceMove) {
        const explanation = explainMove(fen, adviceMove);
        setCoachMessage(explanation);
        setCoachHighlight({ from: adviceMove.from, to: adviceMove.to });
      } else {
        setCoachMessage("Keine Vorschläge verfügbar.");
      }
      setCoachLoading(false);
    }, 400);
  };

  // Reset and restart config
  const handleStartNewGame = () => {
    localStorage.removeItem('sp_chess_started');
    localStorage.removeItem('sp_chess_fen');
    localStorage.removeItem('sp_chess_player_color');
    localStorage.removeItem('sp_chess_bot_level');
    localStorage.removeItem('sp_chess_history');
    localStorage.removeItem('sp_chess_last_move');
    
    setFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    setLastMove(null);
    setCoachHighlight(null);
    setCoachMessage('');
    setGameStarted(false);
  };

  // Trigger setup submit
  const handleConfigureSubmit = (e) => {
    e.preventDefault();
    const actualColor = playerColor === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : playerColor;
    
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    setFen(startFen);
    setLastMove(null);
    setCoachHighlight(null);
    setCoachMessage('');
    
    const initialHistory = [{ fen: startFen, lastMove: null }];
    setHistory(initialHistory);

    // If computer starts, trigger it by updating initial fen sequence if player color is black
    if (actualColor === 'black') {
      // Set properties so the computer turn effect gets triggered
      setPlayerColor('black');
    } else {
      setPlayerColor('white');
    }
    
    setGameStarted(true);
  };

  // Parse moves list for rendering
  const parseHistoryMoves = () => {
    const list = [];
    const tempChess = new Chess();
    // Exclude start fen
    for (let i = 1; i < history.length; i++) {
      const state = history[i];
      const prevState = history[i - 1];
      const testChess = new Chess(prevState.fen);
      
      // We search which legal move yields this state's FEN
      const legalMoves = testChess.moves({ verbose: true });
      const matchingMove = legalMoves.find(m => {
        const tc = new Chess(prevState.fen);
        tc.move(m);
        return tc.fen() === state.fen;
      });

      if (matchingMove) {
        list.push(matchingMove.san);
      }
    }
    return list;
  };

  const moveList = parseHistoryMoves();
  const formatMovePairs = () => {
    const pairs = [];
    for (let i = 0; i < moveList.length; i += 2) {
      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: moveList[i],
        black: moveList[i + 1] || ''
      });
    }
    return pairs;
  };
  const movePairs = formatMovePairs();

  // ----------------------------------------------------
  // Configuration UI (Setup Screen)
  // ----------------------------------------------------
  if (!gameStarted) {
    return (
      <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '700px', margin: '40px auto' }}>
        <div className="glass-panel" style={{ position: 'relative' }}>
          
          <button 
            className="btn btn-secondary" 
            onClick={() => user?.isOffline ? onLogout() : onNavigate('dashboard')} 
            style={{ position: 'absolute', top: '24px', left: '24px', padding: '8px 14px', fontSize: '0.85rem' }}
          >
            {user?.isOffline ? '⬅️ Zurück zum Login' : '⬅️ Zurück zum Dashboard'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '48px', marginBottom: '24px' }}>
            <span style={{ fontSize: '3rem' }}>🤖</span>
            <h2 style={{ fontSize: '1.8rem', marginTop: '12px', color: 'var(--color-accent)' }}>Gegen Computer spielen</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px' }}>
              Tritt gegen eine künstliche Intelligenz an und nutze den AI-Trainer für Echtzeit-Tipps.
            </p>
          </div>

          <form onSubmit={handleConfigureSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Level selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-muted)' }}>
                Schwierigkeitsstufe wählen:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map((lvl) => {
                  const active = botLevel === lvl;
                  return (
                    <div 
                      key={lvl}
                      onClick={() => setBotLevel(lvl)}
                      style={{
                        background: active ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255,255,255,0.02)',
                        border: active ? '2px solid var(--color-accent)' : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 'var(--border-radius-md)',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <strong style={{ color: active ? 'var(--color-accent)' : 'var(--text-main)' }}>
                          {BOT_LEVEL_DETAILS[lvl].name}
                        </strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {BOT_LEVEL_DETAILS[lvl].desc}
                        </div>
                      </div>
                      <span style={{ 
                        fontSize: '0.8rem', 
                        background: active ? 'var(--color-accent)' : 'rgba(255,255,255,0.1)', 
                        color: active ? '#000' : 'var(--text-muted)',
                        padding: '2px 8px', 
                        borderRadius: '10px',
                        fontWeight: 'bold'
                      }}>
                        Tiefe: {BOT_LEVEL_DETAILS[lvl].depth}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Preferred Color */}
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-muted)' }}>
                Deine Spielfarbe:
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[
                  ['white', '⚪ Weiß (Zieht zuerst)'],
                  ['black', '⚫ Schwarz'],
                  ['random', '🎲 Zufall']
                ].map(([val, label]) => {
                  const active = playerColor === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '10px 14px', fontSize: '0.9rem' }}
                      onClick={() => setPlayerColor(val)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Board theme selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-muted)' }}>
                Spielfeld-Design:
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[
                  ['modern', 'Modern (Blau-Grau)'],
                  ['wood', 'Holz-Klassik'],
                  ['green', 'Schach-Grün'],
                  ['blue', 'Deep Blue']
                ].map(([themeVal, themeLabel]) => {
                  const active = boardTheme === themeVal;
                  return (
                    <button
                      key={themeVal}
                      type="button"
                      className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                      onClick={() => setBoardTheme(themeVal)}
                    >
                      {themeLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '14px', fontSize: '1.1rem', marginTop: '10px' }}
            >
              🎮 Partie starten
            </button>

          </form>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Main Active Game Play Area
  // ----------------------------------------------------
  return (
    <div className="game-container animate-fade-in">
      
      {/* Header bar */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px', padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.8rem' }}>🤖</span>
          <div>
            <h3 style={{ fontSize: '1.2rem' }}>
              Du vs. <span style={{ color: 'var(--color-accent)' }}>Computer ({BOT_LEVEL_DETAILS[botLevel]?.name})</span>
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Farbe: <strong>{playerColor === 'white' ? 'Weiß' : 'Schwarz'}</strong> | Design: <strong>{boardTheme}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => user?.isOffline ? onLogout() : onNavigate('dashboard')} 
            style={{ padding: '8px 16px', fontSize: '0.88rem' }}
          >
            {user?.isOffline ? '🚪 Offline beenden' : '🏠 Dashboard'}
          </button>
          <button className="btn btn-danger" onClick={handleStartNewGame} style={{ padding: '8px 16px', fontSize: '0.88rem' }}>
            ⚙️ Neues Spiel
          </button>
        </div>
      </div>

      <div className="game-layout-grid">
        
        {/* Left column: Chessboard */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          
          {/* Opponent (Computer) Info Badge */}
          <div style={{
            width: '100%',
            maxWidth: '560px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 'var(--border-radius-md) var(--border-radius-md) 0 0',
            border: '1px solid rgba(255,255,255,0.06)',
            borderBottom: 'none'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>⚙️</span>
              <strong style={{ fontSize: '0.9rem' }}>Computer ({BOT_LEVEL_DETAILS[botLevel]?.name})</strong>
            </div>
            {isThinking && (
              <span style={{ fontSize: '0.8rem', color: 'var(--color-accent)', animation: 'pulse-coach 1s infinite alternate' }}>
                ⚡ Rechnet...
              </span>
            )}
          </div>

          <ChessBoard
            fen={fen}
            orientation={playerColor}
            lastMove={lastMove}
            onMove={handlePlayerMove}
            disabled={isThinking || isComputerTurn || isGameOver}
            theme={boardTheme}
            coachHighlight={coachHighlight}
          />

          {/* Player Info Badge */}
          <div style={{
            width: '100%',
            maxWidth: '560px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '0 0 var(--border-radius-md) var(--border-radius-md)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderTop: 'none',
            marginTop: '-4px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>👤</span>
              <strong style={{ fontSize: '0.9rem' }}>Du</strong>
            </div>
            {!isComputerTurn && !isGameOver && (
              <span style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 'bold' }}>
                🟢 Du bist am Zug
              </span>
            )}
          </div>

        </div>

        {/* Right column: Coach Sidebar, Control Panel & Moves */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* AI Coach Assistant Bubble */}
          <div className="glass-panel" style={{ 
            border: coachHighlight ? '1px solid var(--color-success)' : 'var(--border-premium)',
            transition: 'border 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              {/* Intelligent robot coach avatar design inside dashboard */}
              <svg width="40" height="40" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 2px 5px rgba(16, 185, 129, 0.4))' }}>
                <circle cx="50" cy="50" r="46" fill="rgba(16, 185, 129, 0.15)" stroke="var(--color-success)" strokeWidth="3" />
                <path d="M30 40 L70 40 L70 70 L30 70 Z" fill="none" stroke="var(--color-success)" strokeWidth="3" strokeLinejoin="round" />
                <circle cx="42" cy="50" r="4" fill="var(--color-success)" />
                <circle cx="58" cy="50" r="4" fill="var(--color-success)" />
                <path d="M45 60 L55 60" stroke="var(--color-success)" strokeWidth="3" strokeLinecap="round" />
                <path d="M50 20 L50 30" stroke="var(--color-success)" strokeWidth="3" />
                <circle cx="50" cy="18" r="3" fill="var(--color-success)" />
                <path d="M22 55 L30 55 M70 55 L78 55" stroke="var(--color-success)" strokeWidth="2" />
              </svg>
              <div>
                <h4 style={{ color: 'var(--color-success)', fontSize: '1.05rem', margin: 0 }}>AI-Trainer Mentor</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Verbessere deine Taktik in jedem Zug</p>
              </div>
            </div>

            <div style={{
              background: 'rgba(0,0,0,0.2)',
              borderRadius: 'var(--border-radius-md)',
              padding: '12px 16px',
              minHeight: '80px',
              fontSize: '0.9rem',
              lineHeight: '1.45',
              border: '1px solid rgba(255,255,255,0.04)',
              color: coachMessage ? 'var(--text-main)' : 'var(--text-muted)',
              fontStyle: coachMessage ? 'normal' : 'italic',
              marginBottom: '14px',
              position: 'relative'
            }}>
              {coachLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success)' }}>
                  <span className="animate-pulse">⏳ Berechne besten Zug und Strategie...</span>
                </div>
              ) : coachMessage ? (
                <div dangerouslySetInnerHTML={{ __html: coachMessage.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--color-success)">$1</strong>') }} />
              ) : (
                "Klicke auf den Button unten, wenn du nicht weiterweißt. Ich zeige dir den besten Zug und erkläre dir detailliert, warum dieser Zug sinnvoll ist."
              )}
            </div>

            <button 
              className="btn btn-secondary" 
              onClick={handleAskCoach}
              disabled={isThinking || isComputerTurn || isGameOver || coachLoading}
              style={{
                width: '100%',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                background: 'rgba(16, 185, 129, 0.08)',
                color: 'var(--color-success)',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.background = 'rgba(16, 185, 129, 0.18)';
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)';
              }}
            >
              💡 Trainer fragen (Empfehlung & Begründung)
            </button>
          </div>

          {/* Control Panel */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h4 style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>⚙️ Spielsteuerung</h4>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={handleUndo}
                disabled={isThinking || isComputerTurn || history.length < (playerColor === 'white' ? 3 : 4)}
                style={{ flex: 1, padding: '10px 14px', fontSize: '0.85rem' }}
              >
                ↩️ Zug zurücknehmen
              </button>

              <button 
                className="btn btn-danger" 
                onClick={handleStartNewGame}
                style={{ flex: 1, padding: '10px 14px', fontSize: '0.85rem' }}
              >
                🏳️ Aufgeben / Neu
              </button>
            </div>
          </div>

          {/* Move History Log */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '220px' }}>
            <h4 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '10px' }}>📊 Zugprotokoll</h4>
            
            <div 
              ref={scrollContainerRef}
              style={{ 
                flex: 1, 
                overflowY: 'auto', 
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 'var(--border-radius-sm)',
                padding: '10px',
                fontFamily: 'monospace',
                fontSize: '0.88rem'
              }}
            >
              {movePairs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>Noch keine Züge gemacht.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                      <th style={{ textAlign: 'left', width: '25%', paddingBottom: '4px' }}>Zug</th>
                      <th style={{ textAlign: 'left', width: '38%', paddingBottom: '4px' }}>Weiß</th>
                      <th style={{ textAlign: 'left', width: '37%', paddingBottom: '4px' }}>Schwarz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movePairs.map((pair) => (
                      <tr key={pair.num} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '4px 0', color: 'var(--text-muted)' }}>{pair.num}.</td>
                        <td style={{ padding: '4px 0', fontWeight: 'bold' }}>{pair.white}</td>
                        <td style={{ padding: '4px 0', color: pair.black ? 'var(--text-main)' : 'transparent' }}>{pair.black || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Game Over Banner Overlay Modal */}
      {isGameOver && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{ maxWidth: '440px', width: '90%', textAlign: 'center', padding: '32px' }}>
            <span style={{ fontSize: '3.5rem' }}>
              {isCheckmate ? (activeColor === playerColorSymbol ? '❌' : '🏆') : '🤝'}
            </span>
            
            <h2 style={{ fontSize: '1.8rem', marginTop: '16px', color: 'var(--color-accent)' }}>
              Partie Beendet!
            </h2>
            
            <p style={{ fontSize: '1.1rem', marginTop: '12px', fontWeight: 'bold' }}>
              {isCheckmate ? (
                activeColor === playerColorSymbol ? 'Der Computer hat gewonnen (Schachmatt).' : 'Du hast gewonnen! (Schachmatt)'
              ) : (
                'Remis! Unentschieden durch Patt, Materialmangel oder Zugwiederholung.'
              )}
            </p>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '8px' }}>
              Schwierigkeitsstufe: {BOT_LEVEL_DETAILS[botLevel]?.name}
            </p>

            <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
              <button className="btn btn-primary" onClick={handleStartNewGame} style={{ flex: 1 }}>
                🔄 Neues Spiel starten
              </button>
              <button className="btn btn-secondary" onClick={() => onNavigate('dashboard')} style={{ flex: 1 }}>
                🏠 Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
