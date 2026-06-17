import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

export default function Dashboard({
  user,
  token,
  onNavigate,
  onLogout
}) {
  const [activeGames, setActiveGames] = useState([]);
  const [activeTournaments, setActiveTournaments] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  
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

  // Fetch games & tournaments
  useEffect(() => {
    fetchGames();
    fetchTournaments();
  }, [token]);

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Left Column: Create Game */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-panel">
            {!showCreateForm ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <span style={{ fontSize: '2.5rem' }}>⚔️</span>
                <h3 style={{ fontSize: '1.3rem', margin: '12px 0' }}>Neues Schachspiel starten</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                  Konfiguriere deine Partie und lade einen Freund per Link ein.
                </p>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowCreateForm(true)}>
                  Spiel konfigurieren
                </button>
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

    </div>
  );
}
