import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

export default function Dashboard({
  user,
  token,
  onNavigate,
  onLogout,
  initialChallengeUserId
}) {
  const [activeGames, setActiveGames] = useState([]);
  const [activeTournaments, setActiveTournaments] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  
  // Ongoing games and notifications state
  const [ongoingGames, setOngoingGames] = useState([]);
  const [loadingOngoing, setLoadingOngoing] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState(
    'Notification' in window ? Notification.permission : 'denied'
  );
  
  // Direct challenges and user list state
  const [challenges, setChallenges] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState(null);

  // Game creation state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [eloRelevant, setEloRelevant] = useState(true);
  const [timeControl, setTimeControl] = useState('blitz');
  const [timeLimitMs, setTimeLimitMs] = useState(600000); // 10 mins
  const [preferredColor, setPreferredColor] = useState('random');
  const [isPrivate, setIsPrivate] = useState(false);
  const [allowTakeback, setAllowTakeback] = useState(true);
  const [allowChat, setAllowChat] = useState(true);
  const [error, setError] = useState('');

  // Fetch games, tournaments, challenges & users
  useEffect(() => {
    fetchGames();
    fetchTournaments();
    fetchChallenges();
    fetchRegisteredUsers();
    fetchOngoingGames();

    const interval = setInterval(() => {
      fetchGames();
      fetchTournaments();
      fetchChallenges();
      fetchOngoingGames();
    }, 5000);

    return () => clearInterval(interval);
  }, [token]);

  const fetchOngoingGames = async () => {
    try {
      const res = await fetch(`${API_BASE}/games/ongoing`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setOngoingGames(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOngoing(false);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const fetchGames = async () => {
    try {
      const res = await fetch(`${API_BASE}/games`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setActiveGames(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGames(false);
    }
  };

  const fetchTournaments = async () => {
    try {
      const res = await fetch(`${API_BASE}/tournaments`);
      const data = await res.json();
      if (res.ok) {
        setActiveTournaments(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTournaments(false);
    }
  };

  const fetchChallenges = async () => {
    try {
      const res = await fetch(`${API_BASE}/challenges`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setChallenges(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChallenges(false);
    }
  };

  const fetchRegisteredUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRegisteredUsers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptChallenge = async (gameId) => {
    try {
      const res = await fetch(`${API_BASE}/games/${gameId}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Annehmen der Herausforderung.');
      onNavigate(`game:${gameId}`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeclineChallenge = async (gameId) => {
    if (window.confirm('Herausforderung wirklich ablehnen oder abbrechen?')) {
      try {
        const res = await fetch(`${API_BASE}/games/${gameId}/decline`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Fehler beim Ablehnen.');
        fetchChallenges();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleSendChallenge = async (e) => {
    e.preventDefault();
    if (!selectedOpponent) {
      alert('Bitte wähle einen Gegner aus.');
      return;
    }

    let actualTimeMs = timeLimitMs;
    if (timeControl === 'blitz') actualTimeMs = 600000;
    if (timeControl === '24h') actualTimeMs = 86400000;
    if (timeControl === '48h') actualTimeMs = 172800000;

    try {
      const res = await fetch(`${API_BASE}/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
         },
        body: JSON.stringify({
          opponent_id: selectedOpponent.id,
          elo_relevant: eloRelevant,
          time_control: timeControl,
          time_limit_ms: actualTimeMs,
          preferred_color: preferredColor,
          allow_takeback: allowTakeback,
          allow_chat: allowChat
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Senden.');

      setShowChallengeModal(false);
      setSelectedOpponent(null);
      fetchChallenges();
      onNavigate(`game:${data.gameId}`);
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    if (initialChallengeUserId && registeredUsers.length > 0) {
      const opp = registeredUsers.find(u => u.id === initialChallengeUserId);
      if (opp) {
        setSelectedOpponent(opp);
        setShowChallengeModal(true);
      }
    }
  }, [initialChallengeUserId, registeredUsers]);

  const handleCreateGame = async (e) => {
    e.preventDefault();
    setError('');

    let actualTimeMs = timeLimitMs;
    if (timeControl === 'blitz') actualTimeMs = 600000;
    if (timeControl === '24h') actualTimeMs = 86400000;
    if (timeControl === '48h') actualTimeMs = 172800000;

    try {
      const res = await fetch(`${API_BASE}/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          elo_relevant: eloRelevant,
          time_control: timeControl,
          time_limit_ms: actualTimeMs,
          preferred_color: preferredColor,
          is_private: isPrivate,
          allow_takeback: allowTakeback,
          allow_chat: allowChat
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Erstellen des Spiels.');

      onNavigate(`game:${data.gameId}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleJoinGame = async (gameId) => {
    try {
      const res = await fetch(`${API_BASE}/games/${gameId}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Beitreten.');
      
      onNavigate(`game:${gameId}`);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header Profile Bar */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Willkommen, <span style={{ color: 'var(--color-accent)' }}>{user.username}</span></h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            🏆 ELO: <strong>{user.elo}</strong> {user.isGuest && <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>(Gast-Modus)</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => onNavigate(`profile:${user.id}`)}>👤 Mein Profil</button>
          <button className="btn btn-secondary" onClick={() => onNavigate('leaderboard')}>📊 Bestenliste</button>
          <button className="btn btn-secondary" onClick={() => onNavigate('tournaments')}>⚔️ Turniere</button>
          <button className="btn btn-danger" onClick={onLogout} style={{ padding: '10px 16px' }}>Abmelden</button>
        </div>
      </div>

      {/* Desktop Notification Alert Banner */}
      {notificationPermission === 'default' && (
        <div className="glass-panel animate-fade-in" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          marginBottom: '24px',
          background: 'rgba(56, 189, 248, 0.1)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.5rem' }}>🔔</span>
            <div>
              <strong style={{ display: 'block', fontSize: '0.95rem' }}>Spielzüge per Push erhalten?</strong>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Wir benachrichtigen dich, sobald dein Gegner zieht. (Funktioniert, solange die App in einem Tab geöffnet ist)
              </span>
            </div>
          </div>
          <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={requestNotificationPermission}>
            Aktivieren
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Left Column: Create Game & Challenges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Direct Challenges (Sent and Received) */}
          {challenges.length > 0 && (
            <div className="glass-panel animate-fade-in" style={{ border: '1px solid rgba(56, 189, 248, 0.4)' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--color-accent)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ✉️ Direkte Herausforderungen
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {challenges.map((ch) => {
                  const isSent = ch.challenger_id === user.id;
                  const opponentName = ch.white_player_id === user.id ? ch.black_player_name : ch.white_player_name;
                  
                  return (
                    <div 
                      key={ch.id} 
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 'var(--border-radius-md)',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ fontSize: '0.9rem' }}>
                        {isSent ? (
                          <span>Herausforderung an <strong>{opponentName}</strong> gesendet</span>
                        ) : (
                          <span>Herausforderung von <strong>{opponentName}</strong> erhalten</span>
                        )}
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          ⏱️ {Math.round(ch.time_limit_ms / 60000)} Min | {ch.elo_relevant ? '🏆 Gewertet' : '🤝 Ungewertet'}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {!isSent ? (
                          <>
                            <button 
                              className="btn btn-primary" 
                              onClick={() => handleAcceptChallenge(ch.id)}
                              style={{ flex: 1, padding: '6px 12px', fontSize: '0.8rem' }}
                            >
                              Annehmen
                            </button>
                            <button 
                              className="btn btn-danger" 
                              onClick={() => handleDeclineChallenge(ch.id)}
                              style={{ flex: 1, padding: '6px 12px', fontSize: '0.8rem' }}
                            >
                              Ablehnen
                            </button>
                          </>
                        ) : (
                          <button 
                            className="btn btn-secondary" 
                            onClick={() => handleDeclineChallenge(ch.id)}
                            style={{ width: '100%', padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            Zurückziehen
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="glass-panel">
            {!showCreateForm ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <span style={{ fontSize: '2.5rem' }}>⚔️</span>
                <h3 style={{ fontSize: '1.3rem', margin: '12px 0' }}>Neues Schachspiel starten</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                  Lade einen Freund per Link ein oder fordere einen registrierten User direkt heraus.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowCreateForm(true)}>
                    Freund per Link einladen
                  </button>
                  <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => { setShowChallengeModal(true); setSelectedOpponent(null); }}>
                    ⚔️ Spieler direkt herausfordern
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateGame} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h3 style={{ color: 'var(--color-accent)' }}>🎮 Spiel einrichten</h3>
                {error && <div style={{ color: 'var(--color-danger)', fontSize: '0.88rem' }}>{error}</div>}

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>ELO-Wertung</label>
                  <select 
                    value={eloRelevant ? 'yes' : 'no'} 
                    onChange={(e) => setEloRelevant(e.target.value === 'yes')}
                    disabled={user.isGuest}
                    style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)', padding: '10px', borderRadius: 'var(--border-radius-sm)', outline: 'none' }}
                  >
                    <option value="yes">Ja (Gewertete Partie)</option>
                    <option value="no">Nein (Ungewertet / Freundschaftsspiel)</option>
                  </select>
                  {user.isGuest && <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)' }}>Gastspieler können nur ungewertet spielen.</span>}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Zeitmodus</label>
                  <select 
                    value={timeControl} 
                    onChange={(e) => setTimeControl(e.target.value)}
                    style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)', padding: '10px', borderRadius: 'var(--border-radius-sm)', outline: 'none' }}
                  >
                    <option value="blitz">Blitz (10 Min pro Spieler)</option>
                    <option value="24h">24 Stunden pro Zug</option>
                    <option value="48h">48 Stunden pro Zug</option>
                    <option value="custom">Individuell</option>
                  </select>
                </div>

                {timeControl === 'custom' && (
                  <div className="animate-fade-in">
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Zeitlimit (Minuten)</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="180" 
                      defaultValue="10"
                      onChange={(e) => setTimeLimitMs(parseInt(e.target.value) * 60 * 1000)}
                      style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)', padding: '10px', borderRadius: 'var(--border-radius-sm)', outline: 'none' }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Deine Farbe</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[['random', '🎲 Zufall'], ['white', '⚪ Weiß'], ['black', '⚫ Schwarz']].map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        className={`btn ${preferredColor === val ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                        onClick={() => setPreferredColor(val)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
                    Privates Spiel (nur per Einladungslink)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={allowTakeback} onChange={(e) => setAllowTakeback(e.target.checked)} />
                    Zug-Rücknahmen erlauben
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={allowChat} onChange={(e) => setAllowChat(e.target.checked)} />
                    Chat erlauben
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Erstellen</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>Abbrechen</button>
                </div>
              </form>
            )}
          </div>

          <div className="glass-panel" style={{ textAlign: 'center', padding: '24px' }}>
            <span style={{ fontSize: '2.5rem' }}>🤖</span>
            <h3 style={{ fontSize: '1.3rem', margin: '12px 0' }}>Gegen Computer spielen</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Tritt gegen einen anpassbaren Schach-Bot mit 5 Schwierigkeitsstufen an. Inklusive Tipps & Erklärungen durch einen AI-Trainer.
            </p>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', background: 'linear-gradient(135deg, var(--color-success), #059669)' }} 
              onClick={() => onNavigate('vs-computer')}
            >
              Gegen Bot spielen
            </button>
          </div>

        </div>

        {/* Right Column: Open Games & Tournaments Lobby */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Meine laufenden Spiele */}
          {ongoingGames.length > 0 && (
            <div className="glass-panel animate-fade-in" style={{ border: '1px solid rgba(16, 185, 129, 0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ♟️ Meine laufenden Spiele
                </h3>
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={fetchOngoingGames}>🔄 Aktualisieren</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {ongoingGames.map((game) => {
                  const isWhite = game.white_player_id === user.id;
                  const opponentName = isWhite ? game.black_player_name : game.white_player_name;
                  const timeLimitMins = Math.round(game.time_limit_ms / 60000);
                  
                  // Parse FEN to find who is at turn
                  const fenParts = game.fen ? game.fen.split(' ') : [];
                  const fenTurn = fenParts[1] || 'w'; // 'w' or 'b'
                  const isMyTurn = (fenTurn === 'w' && isWhite) || (fenTurn === 'b' && !isWhite);
                  
                  return (
                    <div 
                      key={game.id} 
                      style={{
                        background: isMyTurn ? 'rgba(16, 185, 129, 0.04)' : 'rgba(255, 255, 255, 0.03)',
                        border: isMyTurn ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 'var(--border-radius-md)',
                        padding: '14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '0.95rem' }}>vs {opponentName}</strong>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '2px 8px', 
                            borderRadius: '12px',
                            fontWeight: 'bold',
                            background: isMyTurn ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.15)',
                            color: isMyTurn ? 'var(--color-success)' : 'var(--color-warning)',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}>
                            {isMyTurn ? '● Du bist am Zug' : '○ Gegner ist am Zug'}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '6px' }}>
                          ⏱️ {timeLimitMins} Min | {game.elo_relevant ? '🏆 Gewertet' : '🤝 Ungewertet'}
                        </div>
                      </div>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => onNavigate(`game:${game.id}`)}
                        style={{ 
                          padding: '8px 16px', 
                          fontSize: '0.85rem',
                          background: isMyTurn ? 'linear-gradient(135deg, var(--color-success), #059669)' : 'linear-gradient(135deg, var(--color-accent), #4f46e5)'
                        }}
                      >
                        Weiterspielen
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Live Lobby */}
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--color-accent)' }}>📡 Offene Herausforderungen</h3>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={fetchGames}>🔄 Aktualisieren</button>
            </div>

            {loadingGames ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Lade offene Spiele...</p>
            ) : activeGames.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>Aktuell keine öffentlichen Spiele ausstehend. Erstelle ein eigenes!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeGames.map((game) => {
                  const creatorName = game.white_player_name !== 'Ausstehend...' ? game.white_player_name : game.black_player_name;
                  const creatorColor = game.white_player_name !== 'Ausstehend...' ? 'Weiß' : 'Schwarz';
                  const timeLimitMins = Math.round(game.time_limit_ms / 60000);
                  
                  return (
                    <div 
                      key={game.id} 
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 'var(--border-radius-md)',
                        padding: '14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.95rem' }}>{creatorName}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}> ({creatorColor})</span>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
                          ⏱️ {timeLimitMins} Min | {game.elo_relevant ? '🏆 ELO gewertet' : '🤝 Ungewertet'}
                        </div>
                      </div>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => handleJoinGame(game.id)}
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      >
                        Beitreten
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tournaments Lobby */}
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--color-accent)' }}>⚔️ Aktive Turniere</h3>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={fetchTournaments}>🔄 Aktualisieren</button>
            </div>

            {loadingTournaments ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Lade Turniere...</p>
            ) : activeTournaments.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>Aktuell keine Turniere aktiv.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeTournaments.map((t) => (
                  <div 
                    key={t.id} 
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 'var(--border-radius-md)',
                      padding: '14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.95rem' }}>{t.name}</strong>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
                        👑 {t.admin_name} | {t.type === 'knockout' ? 'K.-o.-System' : 'Jeder gegen jeden'}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>
                        👥 Spieler: {t.participant_count} / {t.max_participants} | Status: <strong>{t.status === 'pending' ? 'Wartend' : t.status === 'active' ? 'Aktiv' : 'Beendet'}</strong>
                      </div>
                    </div>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => onNavigate(`tournament:${t.id}`)}
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      Ansehen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Challenge Modal */}
      {showChallengeModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div className="glass-panel animate-fade-in" style={{
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)'
          }}>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--color-accent)', marginBottom: '16px' }}>
              ⚔️ Spieler herausfordern
            </h3>
            
            <form onSubmit={handleSendChallenge} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>
                  Gegner auswählen
                </label>
                {selectedOpponent ? (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '10px 14px',
                    borderRadius: 'var(--border-radius-sm)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <strong>{selectedOpponent.username} (ELO: {selectedOpponent.elo})</strong>
                    {(!initialChallengeUserId) && (
                      <button 
                        type="button" 
                        onClick={() => setSelectedOpponent(null)} 
                        style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '0.9rem' }}
                      >
                        Entfernen
                      </button>
                    )}
                  </div>
                ) : (
                  <select
                    onChange={(e) => {
                      const user = registeredUsers.find(u => u.id === e.target.value);
                      setSelectedOpponent(user || null);
                    }}
                    defaultValue=""
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'var(--text-main)',
                      padding: '10px',
                      borderRadius: 'var(--border-radius-sm)',
                      outline: 'none'
                    }}
                  >
                    <option value="" disabled>-- Bitte wählen --</option>
                    {registeredUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.username} (ELO: {u.elo})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>ELO-Wertung</label>
                <select 
                  value={eloRelevant ? 'yes' : 'no'} 
                  onChange={(e) => setEloRelevant(e.target.value === 'yes')}
                  disabled={user.isGuest}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)', padding: '10px', borderRadius: 'var(--border-radius-sm)', outline: 'none' }}
                >
                  <option value="yes">Ja (Gewertete Partie)</option>
                  <option value="no">Nein (Freundschaftsspiel)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Zeitmodus</label>
                <select 
                  value={timeControl} 
                  onChange={(e) => setTimeControl(e.target.value)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)', padding: '10px', borderRadius: 'var(--border-radius-sm)', outline: 'none' }}
                >
                  <option value="blitz">Blitz (10 Min pro Spieler)</option>
                  <option value="24h">24 Stunden pro Zug</option>
                  <option value="48h">48 Stunden pro Zug</option>
                  <option value="custom">Individuell</option>
                </select>
              </div>

              {timeControl === 'custom' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Zeitlimit (Minuten)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="180" 
                    defaultValue="10"
                    onChange={(e) => setTimeLimitMs(parseInt(e.target.value) * 60 * 1000)}
                    style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)', padding: '10px', borderRadius: 'var(--border-radius-sm)', outline: 'none' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Deine Farbe</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[['random', '🎲 Zufall'], ['white', '⚪ Weiß'], ['black', '⚫ Schwarz']].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      className={`btn ${preferredColor === val ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                      onClick={() => setPreferredColor(val)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={allowTakeback} onChange={(e) => setAllowTakeback(e.target.checked)} />
                  Zug-Rücknahmen erlauben
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={allowChat} onChange={(e) => setAllowChat(e.target.checked)} />
                  Chat erlauben
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Herausforderung senden</button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setShowChallengeModal(false);
                    setSelectedOpponent(null);
                    if (initialChallengeUserId) {
                      onNavigate('dashboard');
                    }
                  }}
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
