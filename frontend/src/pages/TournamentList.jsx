import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

export default function TournamentList({ token, onNavigate }) {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Creation form state
  const [name, setName] = useState('');
  const [type, setType] = useState('round_robin');
  const [eloRelevant, setEloRelevant] = useState(true);
  const [timeControl, setTimeControl] = useState('blitz');
  const [maxParticipants, setMaxParticipants] = useState(8);
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tournaments`);
      const data = await res.json();
      if (res.ok) setTournaments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`${API_BASE}/tournaments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          type,
          elo_relevant: eloRelevant,
          time_control: timeControl,
          max_participants: parseInt(maxParticipants),
          is_private: isPrivate
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Erstellen des Turniers.');

      onNavigate(`tournament:${data.id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      
      <button className="btn btn-secondary" onClick={() => onNavigate('dashboard')} style={{ marginBottom: '24px' }}>
        🏠 Zurück zum Dashboard
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Left Column: Create Form */}
        <div className="glass-panel">
          {!showCreate ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <span style={{ fontSize: '3rem' }}>🏆</span>
              <h3 style={{ margin: '14px 0', fontSize: '1.4rem' }}>Turnier veranstalten</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                Erstelle ein Turnier im K.-o.-System oder als Liga und lade Spieler ein.
              </p>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowCreate(true)}>
                Turnier konfigurieren
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ color: 'var(--color-accent)' }}>🏆 Turnier erstellen</h3>
              {error && <div style={{ color: 'var(--color-danger)', fontSize: '0.88rem' }}>{error}</div>}

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Turniername</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)', padding: '10px', borderRadius: 'var(--border-radius-sm)', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Turniertyp</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)', padding: '10px', borderRadius: 'var(--border-radius-sm)', outline: 'none' }}
                >
                  <option value="round_robin">Jeder gegen jeden (Liga)</option>
                  <option value="knockout">K.-o.-System (KO)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Maximale Teilnehmerzahl</label>
                <input
                  type="number"
                  min="2"
                  max="32"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)', padding: '10px', borderRadius: 'var(--border-radius-sm)', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-muted)' }}>Zeitmodus</label>
                <select
                  value={timeControl}
                  onChange={(e) => setTimeControl(e.target.value)}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)', padding: '10px', borderRadius: 'var(--border-radius-sm)', outline: 'none' }}
                >
                  <option value="blitz">Blitz (10 Min)</option>
                  <option value="24h">24 Stunden pro Zug</option>
                  <option value="48h">48 Stunden pro Zug</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={eloRelevant} onChange={(e) => setEloRelevant(e.target.checked)} />
                  ELO-relevant (Wertung anpassen)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
                  Privates Turnier (nur per Einladungslink)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Turnier erstellen</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Abbrechen</button>
              </div>
            </form>
          )}
        </div>

        {/* Right Column: List of Tournaments */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: 'var(--color-accent)', fontSize: '1.3rem' }}>📡 Laufende Turniere</h3>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={fetchTournaments}>🔄 Aktualisieren</button>
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Lade Turniere...</p>
          ) : tournaments.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Keine öffentlichen Turniere gefunden.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tournaments.map(t => (
                <div 
                  key={t.id} 
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: 'var(--border-radius-md)',
                    padding: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <strong>{t.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Typ: {t.type === 'knockout' ? 'KO' : 'Liga'} | Admin: {t.admin_name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Spieler: {t.participant_count} / {t.max_participants} | Status: <strong>{t.status === 'pending' ? 'Wartend' : t.status === 'active' ? 'Laufend' : 'Beendet'}</strong>
                    </div>
                  </div>
                  <button className="btn btn-secondary" onClick={() => onNavigate(`tournament:${t.id}`)} style={{ padding: '8px 14px', fontSize: '0.85rem' }}>Ansehen</button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
