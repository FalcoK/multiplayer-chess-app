import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GameView from './pages/GameView';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import TournamentList from './pages/TournamentList';
import TournamentView from './pages/TournamentView';
import GameVsComputer from './pages/GameVsComputer';

function App() {
  const [token, setToken] = useState(localStorage.getItem('chess_token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('chess_user')) || null);
  const [theme, setTheme] = useState(localStorage.getItem('chess_theme') || 'dark');
  
  // Custom hash routing state
  const [route, setRoute] = useState({ page: 'dashboard', param: null });

  // Sync theme to body class list
  useEffect(() => {
    localStorage.setItem('chess_theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  // Handle URL hash changes
  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash.substring(1); // Remove '#'
      if (!hash) {
        setRoute({ page: 'dashboard', param: null });
        return;
      }

      if (hash.startsWith('game:')) {
        setRoute({ page: 'game', param: hash.split(':')[1] });
      } else if (hash.startsWith('profile:')) {
        setRoute({ page: 'profile', param: hash.split(':')[1] });
      } else if (hash.startsWith('tournament:')) {
        setRoute({ page: 'tournament', param: hash.split(':')[1] });
      } else {
        setRoute({ page: hash, param: null });
      }
    };

    // Initial parse
    parseHash();

    // Listen for changes
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, []);

  const handleLoginSuccess = (newToken, newUser) => {
    localStorage.setItem('chess_token', newToken);
    localStorage.setItem('chess_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    if (newUser && newUser.isOffline) {
      window.location.hash = '#vs-computer';
    } else {
      window.location.hash = '#dashboard';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('chess_token');
    localStorage.removeItem('chess_user');
    setToken(null);
    setUser(null);
    window.location.hash = '';
  };

  const navigateTo = (dest) => {
    window.location.hash = `#${dest}`;
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const renderThemeToggle = () => (
    <button
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Zu hellem Design wechseln' : 'Zu dunklem Design wechseln'}
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 1000,
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        border: 'var(--border-premium)',
        background: 'var(--bg-panel)',
        color: 'var(--text-main)',
        fontSize: '1.2rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'var(--shadow-premium)',
        transition: 'all 0.2s ease',
        backdropFilter: 'var(--backdrop-blur)',
        WebkitBackdropFilter: 'var(--backdrop-blur)'
      }}
      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );

  // If not logged in, enforce Login Page
  if (!token || !user) {
    return (
      <div className="app-container">
        {renderThemeToggle()}
        <Login onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Render view based on parsed hash route
  return (
    <div className="app-container">
      {renderThemeToggle()}

      {route.page === 'dashboard' && (
        <Dashboard 
          user={user} 
          token={token} 
          onNavigate={navigateTo} 
          onLogout={handleLogout} 
        />
      )}
      
      {route.page === 'game' && (
        <GameView 
          gameId={route.param} 
          user={user} 
          token={token} 
          onNavigate={navigateTo} 
        />
      )}

      {route.page === 'vs-computer' && (
        <GameVsComputer 
          user={user}
          onNavigate={navigateTo} 
          onLogout={handleLogout}
        />
      )}

      {route.page === 'leaderboard' && (
        <Leaderboard 
          onNavigate={navigateTo} 
        />
      )}

      {route.page === 'profile' && (
        <Profile 
          userId={route.param} 
          user={user} 
          token={token} 
          onNavigate={navigateTo} 
        />
      )}

      {route.page === 'tournaments' && (
        <TournamentList 
          token={token} 
          onNavigate={navigateTo} 
        />
      )}

      {route.page === 'tournament' && (
        <TournamentView 
          tournamentId={route.param} 
          user={user} 
          token={token} 
          onNavigate={navigateTo} 
        />
      )}
    </div>
  );
}

export default App;
