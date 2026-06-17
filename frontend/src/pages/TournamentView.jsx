import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { API_BASE } from '../config';

export default function TournamentView({
  tournamentId,
  user,
  token,
  onNavigate
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTournamentDetails();

    // Listen for real-time tournament updates (players joining, bracket progress)
    socket.connect();
    socket.on('tournament_update', ({ tournamentId: updatedId }) => {
      if (updatedId === tournamentId) {
        fetchTournamentDetails();
      }
    });

    return () => {
      socket.off('tournament_update');
      socket.disconnect();
    };
  }, [tournamentId]);

  const fetchTournamentDetails = async () => {
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Turnier konnte nicht geladen werden.');
      setData(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Fehler beim Beitritt.');
      fetchTournamentDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStart = async () => {
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Fehler beim Starten.');
      fetchTournamentDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div style={{ padding: '40px' }}>Lade Turnierdetails...</div>;
  if (error) return <div style={{ padding: '40px', color: 'var(--color-danger)' }}>Fehler: {error}</div>;
  if (!data) return <div style={{ padding: '40px' }}>Turnier nicht gefunden.</div>;

  const { tournament, participants, games } = data;
  const isAdmin = tournament.admin_id === user.id;
  const isParticipant = participants.some(p => p.user_id === user.id);
  const isFull = participants.length >= tournament.max_participants;

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button className="btn btn-secondary" onClick={() => onNavigate('tournaments')}>
          🏆 Zurück zur Liste
        </button>
        <button className="btn btn-secondary" onClick={() => onNavigate('dashboard')}>
          🏠 Dashboard
        </button>
      </div>

      <div className="glass-panel" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-accent)', textTransform: 'uppercase', fontWeight: 'bold' }}>
              {tournament.type === 'knockout' ? '⚡ K.-o.-System' : '🏆 Jeder gegen jeden'}
            </span>
            <h2 style={{ fontSize: '1.8rem', marginTop: '4px' }}>{tournament.name}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              Veranstalter: <strong>{tournament.admin_name}</strong> | Status: <strong style={{ color: tournament.status === 'active' ? 'var(--color-accent)' : 'inherit' }}>
                {tournament.status === 'pending' ? 'Wartend' : tournament.status === 'active' ? 'Aktiv' : 'Beendet'}
              </strong>
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            {tournament.status === 'pending' && !isParticipant && !isFull && (
              <button className="btn btn-primary" onClick={handleJoin}>⚔️ Beitreten</button>
            )}
            {tournament.status === 'pending' && isAdmin && participants.length >= 2 && (
              <button className="btn btn-primary" onClick={handleStart} style={{ background: 'var(--color-success)' }}>🚀 Turnier starten</button>
            )}
          </div>
        </div>

        {/* Winner Announcement */}
        {tournament.status === 'finished' && tournament.winner_id && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '2px solid var(--color-success)',
            borderRadius: 'var(--border-radius-md)',
            padding: '16px',
            marginTop: '20px',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '2rem' }}>👑</span>
            <h3 style={{ color: 'var(--color-success)', fontSize: '1.2rem', margin: '4px 0' }}>Turniersieger</h3>
            <strong style={{ fontSize: '1.4rem' }}>
              {participants.find(p => p.user_id === tournament.winner_id)?.username || 'Unbekannt'}
            </strong>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        {/* Participants & Standings */}
        <div className="glass-panel">
          <h3 style={{ color: 'var(--color-accent)', marginBottom: '16px', fontSize: '1.2rem' }}>
            {tournament.status === 'pending' ? '👥 Teilnehmerliste' : '📊 Tabelle / Platzierungen'}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {participants.map((p, idx) => (
              <div 
                key={p.user_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '10px 14px',
                  borderRadius: 'var(--border-radius-sm)',
                  borderLeft: p.status === 'eliminated' ? '2px solid var(--color-danger)' : '2px solid var(--color-success)'
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.95rem' }}>#{idx + 1} {p.username}</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '6px' }}>({p.elo} ELO)</span>
                  {p.status === 'eliminated' && (
                    <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginLeft: '8px', fontWeight: 'bold' }}>Eliminiert</span>
                  )}
                </div>
                <div style={{ fontWeight: 'bold', color: 'var(--color-accent)' }}>
                  {p.score} Pkt.
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pairings & Active Matches */}
        <div className="glass-panel">
          <h3 style={{ color: 'var(--color-accent)', marginBottom: '16px', fontSize: '1.2rem' }}>
            {tournament.status === 'pending' ? '🎮 Erwartete Spiele' : '⚔️ Spiele & Paarungen'}
          </h3>

          {tournament.status === 'pending' ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
              Die Paarungen werden automatisch generiert, sobald der Admin das Turnier startet.
            </p>
          ) : games.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>Keine Spiele eingetragen.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '400px' }}>
              {games.map((g, idx) => {
                const gameFinished = g.status === 'finished';
                const isUserInGame = g.white_player_id === user.id || g.black_player_id === user.id;
                
                return (
                  <div 
                    key={g.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: 'var(--border-radius-md)',
                      padding: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Spiel #{idx + 1}</span>
                      <div style={{ fontSize: '0.92rem', fontWeight: '500', marginTop: '2px' }}>
                        <span style={{ color: g.result === 'white_win' ? 'var(--color-success)' : 'inherit' }}>{g.white_player_name}</span> 
                        <span style={{ color: 'var(--text-muted)' }}> vs </span> 
                        <span style={{ color: g.result === 'black_win' ? 'var(--color-success)' : 'inherit' }}>{g.black_player_name}</span>
                      </div>
                      
                      {gameFinished && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Ergebnis: {g.result === 'white_win' ? '1-0' : g.result === 'black_win' ? '0-1' : '1/2-1/2'} ({g.termination})
                        </div>
                      )}
                    </div>

                    <div>
                      {gameFinished ? (
                        <button className="btn btn-secondary" onClick={() => onNavigate(`game:${g.id}`)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                          Ansehen
                        </button>
                      ) : (
                        <button 
                          className="btn btn-primary" 
                          onClick={() => onNavigate(`game:${g.id}`)} 
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: '0.8rem',
                            background: isUserInGame ? 'var(--color-success)' : 'linear-gradient(135deg, var(--color-accent), #4f46e5)'
                          }}
                        >
                          {isUserInGame ? 'Spielen' : 'Zuschauen'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
