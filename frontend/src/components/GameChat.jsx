import React, { useState, useEffect, useRef } from 'react';

export default function GameChat({ messages = [], onSendMessage, disabled = false }) {
  const [text, setText] = useState('');
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSendMessage(text.trim());
    setText('');
  };

  return (
    <div className="glass-panel chat-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '300px', padding: '16px' }}>
      <h3 style={{ marginBottom: '12px', color: 'var(--color-accent)' }}>💬 Spiel-Chat</h3>
      
      {/* Messages view */}
      <div 
        className="chat-messages" 
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          marginBottom: '12px', 
          paddingRight: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxHeight: '220px'
        }}
      >
        {messages.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', marginTop: '20px', fontSize: '0.9rem' }}>
            Keine Nachrichten vorhanden. Schreib etwas!
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div 
              key={msg.id || idx} 
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '6px 10px',
                borderRadius: 'var(--border-radius-sm)',
                borderLeft: '2px solid rgba(56, 189, 248, 0.4)',
                fontSize: '0.88rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <strong style={{ color: 'var(--color-accent)', fontSize: '0.82rem' }}>{msg.sender_name}</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{msg.created_at || ''}</span>
              </div>
              <p style={{ wordBreak: 'break-word', color: 'var(--text-main)' }}>{msg.message}</p>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder={disabled ? "Chat deaktiviert" : "Nachricht senden..."}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          style={{
            flex: 1,
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 'var(--border-radius-sm)',
            padding: '8px 12px',
            color: 'var(--text-main)',
            fontSize: '0.9rem',
            outline: 'none'
          }}
        />
        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={disabled || !text.trim()}
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          Senden
        </button>
      </form>
    </div>
  );
}
