import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';

export default function Login({ onLoginSuccess }) {
  const [mode, setMode] = useState('offline'); // 'offline' or 'online'
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if redirected from email verification click (retaining path for legacy support)
  useEffect(() => {
    if (window.location.hash.includes('verified=true')) {
      setSuccessMessage('E-Mail-Adresse erfolgreich verifiziert! Du kannst dich jetzt einloggen.');
      setMode('online');
      setIsRegister(false);
      window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    setLoading(true);
    const endpoint = isRegister ? `${API_BASE}/auth/register` : `${API_BASE}/auth/login`;
    const bodyData = { username, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Etwas ist schiefgelaufen.');
      }

      if (isRegister) {
        // Successful registration: switch to login screen, show success banner
        setIsRegister(false);
        setSuccessMessage(data.message);
        setUsername('');
        setPassword('');
      } else {
        // Successful login
        onLoginSuccess(data.token, data.user);
      }
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setError(`Der Server (${API_BASE}) ist aktuell nicht erreichbar. Bitte stelle sicher, dass das Backend läuft, oder nutze den Offline-Modus.`);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAccess = async () => {
    setError('');
    setSuccessMessage('');
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/guest`, {
        method: 'POST'
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Erstellen des Gast-Kontos.');
      }
      onLoginSuccess(data.token, data.user);
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setError(`Der Server (${API_BASE}) ist aktuell nicht erreichbar. Bitte stelle sicher, dass das Backend läuft, oder nutze den Offline-Modus.`);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '85vh',
      padding: '16px'
    }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '24px 28px' }}>
        
        {/* Header Icon & Title */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '2.5rem' }}>👑</span>
          <h2 style={{ fontSize: '1.6rem', marginTop: '6px', color: 'var(--color-accent)' }}>
            Schach-Arena
          </h2>
        </div>

        {/* Tab Segmented Control */}
        <div style={{ 
          display: 'flex', 
          background: 'rgba(0, 0, 0, 0.25)', 
          borderRadius: 'var(--border-radius-md)', 
          padding: '4px',
          marginBottom: '20px',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <button
            type="button"
            onClick={() => { setMode('offline'); setError(''); setSuccessMessage(''); }}
            style={{
              flex: 1,
              background: mode === 'offline' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              border: 'none',
              borderRadius: 'var(--border-radius-sm)',
              color: mode === 'offline' ? 'var(--color-success)' : 'var(--text-muted)',
              padding: '10px 8px',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            🤖 Offline (Bot & Trainer)
          </button>
          <button
            type="button"
            onClick={() => { setMode('online'); setError(''); setSuccessMessage(''); }}
            style={{
              flex: 1,
              background: mode === 'online' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              border: 'none',
              borderRadius: 'var(--border-radius-sm)',
              color: mode === 'online' ? 'var(--color-accent)' : 'var(--text-muted)',
              padding: '10px 8px',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            👥 Online (Multiplayer)
          </button>
        </div>

        {/* Success Alert notice banner */}
        {successMessage && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid var(--color-success)',
            color: 'var(--color-success)',
            padding: '10px 14px',
            borderRadius: 'var(--border-radius-md)',
            marginBottom: '16px',
            fontSize: '0.82rem',
            lineHeight: '1.4',
            textAlign: 'center',
            fontWeight: '600'
          }}>
            ✅ {successMessage}
          </div>
        )}

        {/* Error Alert notice banner */}
        {error && (
          <div style={{
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid var(--color-danger)',
            color: '#f87171',
            padding: '10px 14px',
            borderRadius: 'var(--border-radius-md)',
            marginBottom: '16px',
            fontSize: '0.82rem',
            lineHeight: '1.4',
            textAlign: 'center'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* --- OFFLINE MODE LAYOUT --- */}
        {mode === 'offline' && (
          <div className="animate-fade-in" style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.5', marginBottom: '20px' }}>
              Tritt direkt gegen eine künstliche Intelligenz (Stufe 1-5) an. Nutze den AI-Trainer für Echtzeit-Tipps und verständliche Analysen zu jedem Zug.
            </p>
            
            <button
              type="button"
              onClick={() => onLoginSuccess('offline_token', { id: 'offline_user', username: 'Lokal-Gast', elo: 1200, isOffline: true })}
              className="btn btn-primary"
              style={{ 
                width: '100%', 
                padding: '12px', 
                fontSize: '1rem', 
                background: 'linear-gradient(135deg, var(--color-success), #059669)',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                fontWeight: 'bold'
              }}
            >
              🎮 Als Gast offline spielen
            </button>
          </div>
        )}

        {/* --- ONLINE MODE LAYOUT --- */}
        {mode === 'online' && (
          <div className="animate-fade-in">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', color: 'var(--text-muted)' }}>
                  Benutzername
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 'var(--border-radius-md)',
                    padding: '10px 12px',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', color: 'var(--text-muted)' }}>
                  Passwort
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 'var(--border-radius-md)',
                    padding: '10px 12px',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', marginTop: '6px', padding: '10px' }}
              >
                {loading ? 'Bitte warten...' : isRegister ? 'Registrieren' : 'Einloggen'}
              </button>
            </form>

            <div style={{ margin: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }}></div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ODER</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }}></div>
            </div>

            <button
              onClick={handleGuestAccess}
              className="btn btn-secondary"
              disabled={loading}
              style={{ width: '100%', marginBottom: '14px', padding: '10px', fontSize: '0.88rem' }}
            >
              🚀 Als Gast spielen (Lobby)
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.82rem' }}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setIsRegister(!isRegister);
                  setError('');
                  setSuccessMessage('');
                }}
                style={{ color: 'var(--color-accent)', textDecoration: 'none' }}
              >
                {isRegister ? 'Bereits ein Konto? Hier anmelden' : 'Noch kein Konto? Hier registrieren'}
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
