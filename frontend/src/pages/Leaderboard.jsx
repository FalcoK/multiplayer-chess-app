import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

export default function Leaderboard({ onNavigate }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/leaderboard`)
      .then(res => res.json())
      .then(data => {
        setPlayers(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      
      <button className="btn btn-secondary" onClick={() => onNavigate('dashboard')} style={{ marginBottom: '24px' }}>
        🏠 Zurück zum Dashboard
      </button>

      <div className="glass-panel">
        <h2 style={{ color: 'var(--color-accent)', marginBottom: '16px', fontSize: '1.8rem', textAlign: 'center' }}>
          🏆 Globales Leaderboard
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', textAlign: 'center', marginBottom: '24px' }}>
          Die besten Spieler geordnet nach ihrer aktuellen ELO-Zahl.
        </p>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Lade Bestenliste...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px' }}>Platz</th>
                  <th style={{ padding: '12px' }}>Spieler</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>ELO</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Höchste ELO</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, idx) => {
                  const isTop3 = idx < 3;
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                  
                  return (
                    <tr 
                      key={p.id} 
                      style={{ 
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        background: isTop3 ? 'rgba(56, 189, 248, 0.03)' : 'none'
                      }}
                    >
                      <td style={{ padding: '14px 12px', fontWeight: 'bold' }}>
                        {medal ? <span style={{ fontSize: '1.2rem' }}>{medal}</span> : `#${idx + 1}`}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <a 
                          href="#" 
                          onClick={(e) => { e.preventDefault(); onNavigate(`profile:${p.id}`); }}
                          style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: '500' }}
                        >
                          {p.username}
                        </a>
                        {p.is_guest === 1 && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px' }}>(Gast)</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 'bold', color: 'var(--color-accent)' }}>
                        {p.elo}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>
                        {p.highest_elo}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
