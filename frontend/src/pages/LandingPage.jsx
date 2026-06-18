import React, { useState } from 'react';

const APPS_DATA = [
  {
    id: 'chess-arena',
    title: 'Schach-Arena',
    icon: '👑',
    category: 'Spiele',
    description: 'Echtzeit-Schach-Arena mit Elo-Ranglisten, Turniermodus, einem cleveren AI-Trainer (Mentor) und einem lokalen Computer-Gegner mit 5 Schwierigkeitsstufen.',
    path: '#dashboard',
    isExternal: false,
    isNextJs: false,
    features: ['Realtime Multiplayer', 'Elo Leaderboard', 'AI-Trainer Mentor', '5-Stufen Computergegner'],
    tech: 'React, Node.js, Socket.io, SQLite'
  },
  {
    id: 'crazy-day-planner',
    title: 'Crazy Day Planner',
    icon: '📅',
    category: 'Tools',
    description: 'Ein flexibler und intelligenter Tagesplaner, der dich bei deiner täglichen Zeitplanung und Priorisierung von Aufgaben unterstützt.',
    path: '/crazy-day-planner/',
    isExternal: true,
    isNextJs: false,
    features: ['Dynamische Zeitplanung', 'Aufgabenpriorisierung', 'Fortschrittsvisuals'],
    tech: 'React, TypeScript, Vite'
  },
  {
    id: 'ai-weather-decision-coach',
    title: 'AI Wetter-Coach',
    icon: '🌤️',
    category: 'Garten & Wetter',
    description: 'Dein intelligenter Assistent, der dir basierend auf präzisen Wetterdaten die besten Vorschläge für deine Outdoor- und Indoor-Aktivitäten gibt.',
    path: '/ai-weather-decision-coach/',
    isExternal: true,
    isNextJs: false,
    features: ['Aktivitäts-Planer', 'Smarte Empfehlungen', 'Präzise Wetterberichte'],
    tech: 'React, Vite, OpenAI API'
  },
  {
    id: 'biertimer',
    title: 'Biertimer',
    icon: '🍺',
    category: 'Tools',
    description: 'Der ultimative Timer, der berechnet, wann deine Getränke im Gefrierfach perfekt gekühlt sind, ohne dass sie gefrieren.',
    path: '/biertimer/',
    isExternal: true,
    isNextJs: false,
    features: ['Getränke-Konfigurator', 'Gefrierwarnung', 'Präziser Countdown', 'Mikro-Animationen'],
    tech: 'HTML5, CSS3, Vanilla JS'
  },
  {
    id: 'contextual-news',
    title: 'Contextual News',
    icon: '📰',
    category: 'News',
    description: 'Ein intelligenter, personalisierter News-Reader, der Schlagzeilen filtert und sie im richtigen Kontext für dich aufbereitet.',
    path: '/contextual-news/',
    isExternal: true,
    isNextJs: false,
    features: ['Personalisierte Feeds', 'Kontext-Filterung', 'Fokus-Lese-Ansicht'],
    tech: 'React, Vite, AI Engine'
  },
  {
    id: 'elevator-bet',
    title: 'Elevator Bet',
    icon: '🛗',
    category: 'Spiele',
    description: 'Ein spannendes Minispiel, bei dem du Wetten auf die Bewegungen und Passagiere von Aufzügen in einem Wolkenkratzer abschließt.',
    path: '/elevator-bet/',
    isExternal: true,
    isNextJs: false,
    features: ['Simulierter Fahrstuhl', 'Wett-Mechanik', 'Statistiken & Historie'],
    tech: 'React, Vite, Canvas'
  },
  {
    id: 'fifa-slot-machine',
    title: 'FIFA Slot Machine',
    icon: '⚽',
    category: 'Spiele',
    description: 'Ein witziger Team-Zufallsgenerator im Slot-Machine-Design, der dir überraschende Mannschafts- und Spieler-Kombinationen für deine FIFA-Duelle ausspuckt.',
    path: '/fifa-slot-machine/',
    isExternal: true,
    isNextJs: false,
    features: ['Reel Spinning Animation', 'Team Randomizer', 'Match Generator'],
    tech: 'HTML5, CSS3, Vanilla JS'
  },
  {
    id: 'garten-coach',
    title: 'Garten Coach',
    icon: '🌱',
    category: 'Garten & Wetter',
    description: 'Dein digitaler Gartenhelfer für optimale Pflanzenpflege, Aussaatkalender und die perfekte Beetplanung über das ganze Jahr.',
    path: '/garten-coach/',
    isExternal: true,
    isNextJs: false,
    features: ['Interaktiver Beet-Editor', 'Aussaatkalender', 'Pflegetipps'],
    tech: 'React, Vite, LocalStorage'
  },
  {
    id: 'garten-wetter',
    title: 'Garten Wetter',
    icon: '🌦️',
    category: 'Garten & Wetter',
    description: 'Wettervorhersagen und automatische Bewässerungs-Empfehlungen, die speziell auf den Wasserbedarf deiner Gartenpflanzen abgestimmt sind.',
    path: '/garten-wetter/',
    isExternal: true,
    isNextJs: false,
    features: ['Niederschlags-Tracker', 'Bewässerungs-Indikator', 'Pflanzen-Datenbank'],
    tech: 'React, Vite, Weather API'
  },
  {
    id: 'golf-reisen-cup',
    title: 'Golf Reisen Cup',
    icon: '⛳',
    category: 'Tools',
    description: 'Das komplette Verwaltungstool für deine Golf-Urlaubsrunden. Beinhaltet Spielermanagement, Live-Leaderboard und automatische Punkteberechnung.',
    path: '/golf-reisen-cup/',
    isExternal: true,
    isNextJs: false,
    features: ['Stableford-Rechner', 'Live-Leaderboard', 'Mehrrunden-Turniere'],
    tech: 'React, Vite, AppWrite / Local'
  },
  {
    id: 'health-assistant',
    title: 'Health Assistant',
    icon: '💧',
    category: 'Tools',
    description: 'Tracker für deine täglichen Fitnessziele, Wassertrinken und Bewegung, um dich fit und vital zu halten.',
    path: '/health-assistant/',
    isExternal: true,
    isNextJs: false,
    features: ['Wassertrink-Tracker', 'Schrittzähler-Dashboard', 'Gewohnheiten-Planner'],
    tech: 'React, Vite, Charts.js'
  },
  {
    id: 'skiwetter-app',
    title: 'Skiwetter App',
    icon: '⛷️',
    category: 'Garten & Wetter',
    description: 'Schneeberichte, Wetterkonditionen, geöffnete Pisten und interaktive Skigebiets-Karten auf einen Blick.',
    path: '/skiwetter-app/',
    isExternal: true,
    isNextJs: false,
    features: ['Pistenstatus-Tracker', 'Schneehöhen-Berichte', 'Skigebiets-Infos'],
    tech: 'React, Vite, OpenWeather'
  },
  {
    id: 'weather-decision-assistant',
    title: 'Wetter-Assistent',
    icon: '☔',
    category: 'Garten & Wetter',
    description: 'Hilft dir bei der Entscheidung, welche Aktivitäten bei der aktuellen Wetterlage am besten geeignet sind.',
    path: '/weather-decision-assistant/',
    isExternal: true,
    isNextJs: false,
    features: ['Aktivitäten-Filter', 'Prognose-Übersicht', 'Bekleidungs-Tipps'],
    tech: 'React, Vite, Weather API'
  },
  {
    id: 'wetter-com-garten',
    title: 'wetter.com Garten-Planer',
    icon: '🏡',
    category: 'Garten & Wetter',
    description: 'Die perfekte Verbindung von intelligenter Beetplanung und den präzisen Vorhersagen von wetter.com für erfolgreiches Gärtnern.',
    path: '/wetter-com-garten/',
    isExternal: true,
    isNextJs: false,
    features: ['wetter.com Integration', 'Pflanzen-Nachbarschafts-Matrix', 'Frost-Warnungen'],
    tech: 'React, Vite, Custom API'
  },
  {
    id: 'wetter-slot-machine',
    title: 'Wetter Slot Machine',
    icon: '🎰',
    category: 'Spiele',
    description: 'Lass das Wetter entscheiden! Ein Spielautomat, der wetterabhängige Aktivitäten und Challenges für dich auswählt.',
    path: '/wetter-slot-machine/',
    isExternal: true,
    isNextJs: false,
    features: ['Interaktive Reels', 'Wetter-Challenges', 'Zufalls-Vorschläge'],
    tech: 'HTML5, CSS3, Vanilla JS'
  },
  {
    id: 'wm-tippspiel',
    title: 'WM Tippspiel',
    icon: '🏆',
    category: 'Spiele',
    description: 'Organisiere Tippgemeinschaften, tippe auf WM-Spiele und verfolge das Live-Ranking unter deinen Freunden.',
    path: '/wm-tippspiel/',
    isExternal: true,
    isNextJs: false,
    features: ['Tipp-Gruppen', 'Live-Ranking', 'Automatische Auswertung'],
    tech: 'HTML5, CSS3, Vanilla JS'
  },
  {
    id: 'ab-testing-tool',
    title: 'A/B-Testing Tool',
    icon: '🧪',
    category: 'Tools',
    description: 'Erstelle und analysiere wissenschaftliche Usability-Tests für deine Benutzeroberflächen mit übersichtlichen Diagrammen.',
    path: 'http://localhost:3000',
    isExternal: true,
    isNextJs: true,
    features: ['Next.js Web-App', 'Statistische Auswertung', 'Conversion-Diagramme', 'Supabase Integration'],
    tech: 'Next.js, TailwindCSS, Supabase, Recharts'
  }
];

const CATEGORIES = ['Alle', 'Spiele', 'Tools', 'Garten & Wetter', 'News'];

function LandingPage({ onNavigate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Alle');

  const filteredApps = APPS_DATA.filter(app => {
    const matchesSearch = 
      app.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.tech.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.features.some(f => f.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesCategory = activeCategory === 'Alle' || app.category === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '40px 24px',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      gap: '40px',
      animation: 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards'
    }}>
      {/* Header Area */}
      <header style={{
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '3rem' }}>🚀</span>
          <h1 style={{
            fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
            background: 'linear-gradient(135deg, var(--color-accent), #818cf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0
          }}>
            Falcos App-Sammlung
          </h1>
        </div>
        <p style={{
          color: 'var(--text-muted)',
          fontSize: 'clamp(1rem, 2vw, 1.15rem)',
          maxWidth: '640px',
          lineHeight: '1.6',
          margin: 0
        }}>
          Entdecke alle unsere gemeinsam entwickelten Webanwendungen an einem zentralen Ort. 
          Gestartet auf dem Port <code>5173</code> der Schach-Arena.
        </p>
      </header>

      {/* Controls: Search & Categories */}
      <div className="glass-panel" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '24px',
        borderRadius: '16px'
      }}>
        {/* Search Field */}
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            id="app-search-input"
            type="text"
            placeholder="Suche nach Apps, Features oder Technologien..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 20px',
              paddingLeft: '48px',
              fontSize: '1rem',
              borderRadius: '9999px',
              border: 'var(--border-premium)',
              background: 'rgba(0, 0, 0, 0.15)',
              color: 'var(--text-main)',
              outline: 'none',
              transition: 'all 0.2s ease',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-accent)';
              e.target.style.boxShadow = '0 0 0 3px var(--border-glow)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.2)';
            }}
          />
          <span style={{
            position: 'absolute',
            left: '18px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '1.2rem',
            opacity: 0.6
          }}>🔍</span>
          {searchTerm && (
            <button
              id="clear-search-btn"
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '18px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '1.1rem'
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Selector Tabs */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          justifyContent: 'center'
        }}>
          {CATEGORIES.map(category => (
            <button
              key={category}
              id={`cat-btn-${category.toLowerCase().replace(/\s/g, '-')}`}
              onClick={() => setActiveCategory(category)}
              style={{
                padding: '8px 16px',
                borderRadius: '9999px',
                border: '1px solid',
                borderColor: activeCategory === category ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.1)',
                background: activeCategory === category 
                  ? 'linear-gradient(135deg, var(--color-accent), rgba(56, 189, 248, 0.2))' 
                  : 'rgba(255, 255, 255, 0.03)',
                color: activeCategory === category ? '#ffffff' : 'var(--text-muted)',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                boxShadow: activeCategory === category ? '0 4px 12px var(--border-glow)' : 'none'
              }}
              onMouseOver={(e) => {
                if (activeCategory !== category) {
                  e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                  e.currentTarget.style.color = 'var(--text-main)';
                }
              }}
              onMouseOut={(e) => {
                if (activeCategory !== category) {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Content */}
      {filteredApps.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '24px'
        }}>
          {filteredApps.map(app => (
            <div
              key={app.id}
              className="glass-panel"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '20px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'var(--color-accent)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.4), 0 0 15px var(--border-glow)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.boxShadow = 'var(--shadow-premium)';
              }}
            >
              {/* Card Header & Content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <span style={{
                      fontSize: '2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}>{app.icon}</span>
                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{app.title}</h3>
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    background: app.category === 'Spiele' ? 'rgba(244, 63, 94, 0.15)' :
                                app.category === 'Tools' ? 'rgba(56, 189, 248, 0.15)' :
                                app.category === 'Garten & Wetter' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: app.category === 'Spiele' ? '#f43f5e' :
                           app.category === 'Tools' ? '#38bdf8' :
                           app.category === 'Garten & Wetter' ? '#10b981' : '#f59e0b',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    fontWeight: 600
                  }}>{app.category}</span>
                </div>

                <p style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  minHeight: '68px',
                  margin: 0
                }}>{app.description}</p>

                {/* Features Bullet List */}
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  {app.features.map((feature, idx) => (
                    <li key={idx} style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{ color: 'var(--color-success)', fontSize: '0.9rem' }}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Card Footer Tech & Button */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                paddingTop: '16px'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <strong style={{ color: 'var(--text-main)' }}>Tech:</strong> {app.tech}
                </div>

                {app.isNextJs ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <a
                      id={`open-app-${app.id}`}
                      href={app.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{
                        width: '100%',
                        fontSize: '0.9rem',
                        padding: '10px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>App auf Port 3000 öffnen</span> ↗
                    </a>
                    <span style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-warning)',
                      textAlign: 'center',
                      background: 'rgba(245, 158, 11, 0.06)',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px dashed rgba(245, 158, 11, 0.2)'
                    }}>
                      Führe zuerst <code>npm run dev</code> im Ordner <code>ab-testing-tool</code> aus.
                    </span>
                  </div>
                ) : (
                  <button
                    id={`open-app-${app.id}`}
                    onClick={() => {
                      if (app.isExternal) {
                        window.open(app.path, '_blank');
                      } else {
                        onNavigate('dashboard');
                      }
                    }}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      fontSize: '0.9rem',
                      padding: '10px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>App öffnen</span> {app.isExternal ? '↗' : '→'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel" style={{
          padding: '48px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          borderRadius: '16px'
        }}>
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '16px' }}>📭</span>
          <h3>Keine Apps gefunden</h3>
          <p style={{ marginTop: '8px' }}>Es gibt keine Webanwendungen, die deinen Suchfiltern entsprechen.</p>
        </div>
      )}
      
      {/* Footer Branding */}
      <footer style={{
        marginTop: 'auto',
        textAlign: 'center',
        padding: '24px 0',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        borderTop: '1px solid rgba(255, 255, 255, 0.04)'
      }}>
        Falcos Workspace Hub © {new Date().getFullYear()} • Mit ❤️ & KI entwickelt.
      </footer>
    </div>
  );
}

export default LandingPage;
