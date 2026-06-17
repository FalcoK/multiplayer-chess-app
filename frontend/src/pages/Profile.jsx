import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

export default function Profile({
  userId,
  user: currentUser, // Logged in user details
  token,
  onNavigate
}) {
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [h2hHistory, setH2HHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isOwnProfile = currentUser.id === userId;

  useEffect(() => {
    fetchProfileData();
  }, [userId]);

  const fetchProfileData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch Stats
      const statsRes = await fetch(`${API_BASE}/users/${userId}/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (!statsRes.ok) throw new Error(statsData.error || 'Fehler beim Laden des Profils.');
      setProfile(statsData);

      // 2. Fetch game history
      const historyRes = await fetch(`${API_BASE}/users/${userId}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const historyData = await historyRes.json();
      if (historyRes.ok) setHistory(historyData);

      // 3. Fetch Head to Head if not own profile
      if (!isOwnProfile) {
        const h2hRes = await fetch(`${API_BASE}/users/${currentUser.id}/history?opponentId=${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const h2hData = await h2hRes.json();
        if (h2hRes.ok) setH2HHistory(h2hData);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '40px' }}>Lade Profil...</div>;
  if (error) return <div style={{ padding: '40px', color: 'var(--color-danger)' }}>{error}</div>;
  if (!profile) return <div style={{ padding: '40px' }}>Profil existiert nicht.</div>;

  const { user, stats } = profile;

  // Calculate H2H stats
  let h2hWins = 0;
  let h2hLosses = 0;
  let h2hDraws = 0;
  
  if (!isOwnProfile && h2hHistory.length > 0) {
    h2hHistory.forEach(g => {
      const isWhite = g.white_player_id === currentUser.id;
      if (g.result === 'draw') {
        h2hDraws++;
      } else if ((isWhite && g.result === 'white_win') || (!isWhite && g.result === 'black_win')) {
        h2hWins++;
      } else {
        h2hLosses++;
      }
    });
  }

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      
      <button className="btn btn-secondary" onClick={() => onNavigate('dashboard')} style={{ marginBottom: '24px' }}>
        🏠 Zurück zum Dashboard
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Left Card: Stats Overview */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px' }}>
            <span style={{ fontSize: '3.5rem' }}>👤</span>
            <h2 style={{ fontSize: '1.6rem', color: 'var(--color-accent)', marginTop: '8px' }}>{user.username}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Mitglied seit: {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unbekannt'}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 'var(--border-radius-md)', textAlign: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Aktuelle ELO</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--color-accent)', marginTop: '4px' }}>{user.elo}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 'var(--border-radius-md)', textAlign: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Höchste ELO</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--color-warning)', marginTop: '4px' }}>{user.highest_elo}</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>Statistiken</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Gespielte Partien:</span>
              <strong>{stats.totalGames}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Siege:</span>
              <strong style={{ color: 'var(--color-success)' }}>{stats.wins}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Niederlagen:</span>
              <strong style={{ color: 'var(--color-danger)' }}>{stats.losses}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Remis:</span>
              <strong>{stats.draws}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Gewinnrate:</span>
              <strong>{stats.winRate}%</strong>
            </div>
          </div>

          {/* Head to Head Widget */}
          {!isOwnProfile && (
            <div style={{ marginTop: '10px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '16px', borderRadius: 'var(--border-radius-md)' }}>
              <h4 style={{ color: 'var(--color-accent)', marginBottom: '8px', fontSize: '0.95rem' }}>⚔️ Direkte Bilanz (H2H)</h4>
              {h2hHistory.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Noch keine gemeinsamen Spiele ausgetragen.</p>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-around', margin: '10px 0', fontSize: '1.2rem', fontWeight: 'bold' }}>
                    <span style={{ color: 'var(--color-success)' }}>{h2hWins} S</span>
                    <span style={{ color: 'var(--text-main)' }}>{h2hDraws} U</span>
                    <span style={{ color: 'var(--color-danger)' }}>{h2hLosses} N</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>Aus {h2hHistory.length} gespielten Partien gegen dich.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Card: Game History */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ color: 'var(--color-accent)', fontSize: '1.3rem' }}>📜 Letzte Partien</h3>
          
          {history.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>Keine Spiele in der Historie vorhanden.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '500px' }}>
              {history.map(g => {
                const isWhite = g.white_player_id === userId;
                const opponentName = isWhite ? g.black_player_name : g.white_player_name;
                const resultText = g.result === 'draw' ? 'Remis' : 
                                   ((isWhite && g.result === 'white_win') || (!isWhite && g.result === 'black_win')) ? 'Sieg' : 'Niederlage';
                const resultColor = resultText === 'Sieg' ? 'var(--color-success)' :
                                    resultText === 'Niederlage' ? 'var(--color-danger)' : 'var(--text-main)';

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
                      <div style={{ fontSize: '0.95rem', fontWeight: '500' }}>
                        vs <span style={{ color: 'var(--color-accent)' }}>{opponentName}</span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {isWhite ? 'Spielt als Weiß' : 'Spielt als Schwarz'} | {g.time_control === 'blitz' ? 'Blitz' : 'Langzeit'}
                      </span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ color: resultColor, fontSize: '0.95rem' }}>{resultText}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {new Date(g.created_at).toLocaleDateString()}
                      </div>
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
