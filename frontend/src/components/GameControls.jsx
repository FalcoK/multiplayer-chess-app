import React from 'react';

export default function GameControls({
  status,
  isMyTurn,
  allowTakeback,
  allowChat,
  onResign,
  onOfferDraw,
  onRespondDraw,
  onRequestTakeback,
  onRespondTakeback,
  userColor, // 'white' or 'black'
  moveCount
}) {
  const isPendingDraw = 
    (status === 'draw_offered_white' && userColor === 'black') ||
    (status === 'draw_offered_black' && userColor === 'white');

  const isMyDrawOfferPending = 
    (status === 'draw_offered_white' && userColor === 'white') ||
    (status === 'draw_offered_black' && userColor === 'black');

  const isPendingTakeback = 
    (status === 'takeback_requested_white' && userColor === 'black') ||
    (status === 'takeback_requested_black' && userColor === 'white');

  const isMyTakebackPending = 
    (status === 'takeback_requested_white' && userColor === 'white') ||
    (status === 'takeback_requested_black' && userColor === 'black');

  const gameInProgress = status === 'playing' || status.startsWith('draw_offered') || status.startsWith('takeback_requested');

  if (!gameInProgress) return null;

  return (
    <div className="glass-panel game-controls" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ color: 'var(--color-accent)', marginBottom: '4px' }}>⚙️ Aktionen</h3>

      {/* Main Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <button 
          className="btn btn-danger" 
          onClick={onResign}
          style={{ padding: '10px 16px', fontSize: '0.88rem' }}
        >
          🏳️ Aufgeben
        </button>

        <button 
          className="btn btn-secondary" 
          onClick={onOfferDraw}
          disabled={status.startsWith('draw_offered') || status.startsWith('takeback_requested')}
          style={{ padding: '10px 16px', fontSize: '0.88rem' }}
        >
          🤝 Remis anbieten
        </button>
      </div>

      {allowTakeback && (
        <button
          className="btn btn-secondary"
          onClick={onRequestTakeback}
          disabled={moveCount === 0 || status.startsWith('draw_offered') || status.startsWith('takeback_requested')}
          style={{ width: '100%', padding: '10px 16px', fontSize: '0.88rem' }}
        >
          ⏪ Zug zurücknehmen
        </button>
      )}

      {/* Draw Offer Notification */}
      {isPendingDraw && (
        <div className="animate-fade-in" style={{
          background: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid var(--color-warning)',
          padding: '12px',
          borderRadius: 'var(--border-radius-md)',
          textAlign: 'center',
          marginTop: '8px'
        }}>
          <p style={{ marginBottom: '10px', fontWeight: '500' }}>Gegner bietet Remis an.</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => onRespondDraw(true)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Annehmen</button>
            <button className="btn btn-secondary" onClick={() => onRespondDraw(false)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Ablehnen</button>
          </div>
        </div>
      )}

      {isMyDrawOfferPending && (
        <div style={{ color: 'var(--color-warning)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center' }}>
          Warte auf Remis-Antwort des Gegners...
        </div>
      )}

      {/* Takeback Offer Notification */}
      {isPendingTakeback && (
        <div className="animate-fade-in" style={{
          background: 'rgba(56, 189, 248, 0.15)',
          border: '1px solid var(--color-accent)',
          padding: '12px',
          borderRadius: 'var(--border-radius-md)',
          textAlign: 'center',
          marginTop: '8px'
        }}>
          <p style={{ marginBottom: '10px', fontWeight: '500' }}>Gegner bittet um Zug-Rücknahme.</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => onRespondTakeback(true)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Erlauben</button>
            <button className="btn btn-secondary" onClick={() => onRespondTakeback(false)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Verweigern</button>
          </div>
        </div>
      )}

      {isMyTakebackPending && (
        <div style={{ color: 'var(--color-accent)', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center' }}>
          Warte auf Rücknahme-Antwort des Gegners...
        </div>
      )}
    </div>
  );
}
