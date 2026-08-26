import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, AppState } from '../../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  appState: AppState;
  onSend: (text: string) => void;
  onToggleMic: () => void;
  micActive: boolean;
}

const ACTION_ICONS: Record<string, string> = {
  website: '🌐', search: '🔍', ai: '🧠', gesture: '✋',
};
const STATUS_ICONS: Record<string, string> = {
  pending: '○', executing: '◉', success: '✓', failed: '✕', confirmed: '✓', cancelled: '⊘',
};

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, appState, onSend, onToggleMic, micActive }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported] = useState(() => typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { inputRef.current?.focus(); }, [appState]);

  const startListening = useCallback(() => {
    if (!speechSupported) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    if (recognitionRef.current) recognitionRef.current.abort();

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      let interim = '', final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t; else interim += t;
      }
      if (interim) setInput(interim);
      if (final) { setInput(''); onSend(final.trim()); }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => { setIsListening(false); recognitionRef.current = null; onToggleMic(); };

    recognitionRef.current = recognition;
    recognition.start();
  }, [speechSupported, onSend, onToggleMic]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    setIsListening(false);
  }, []);

  useEffect(() => {
    if (micActive && !isListening) startListening();
    else if (!micActive && isListening) stopListening();
  }, [micActive, isListening, startListening, stopListening]);

  useEffect(() => () => { if (recognitionRef.current) { recognitionRef.current.abort(); recognitionRef.current = null; } }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    onSend(text);
  };

  const fmt = (ts: number) => new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const disabled = appState === 'thinking' || appState === 'executing';

  return (
    <div style={{ width: 380, minWidth: 320, maxWidth: 450, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-subtle)' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 32, color: 'var(--argus-yellow)', animation: 'pulse-glow 2s ease-in-out infinite' }}>◉</div>
            <div className="text-display" style={{ fontSize: 20, fontWeight: 800, letterSpacing: 4, color: 'var(--argus-yellow)' }}>ARGUS</div>
            <div className="text-muted" style={{ fontSize: 13 }}>How can I help you today?</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {['Open YouTube', 'What time is it?', 'Search YouTube for coding tutorials'].map(s => (
                <button key={s} onClick={() => onSend(s)} style={{
                  fontFamily: 'var(--font-body)', fontSize: 12, padding: '6px 14px',
                  borderRadius: 20, border: '1px solid var(--border-medium)',
                  background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 150ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--argus-yellow)'; e.currentTarget.style.color = 'var(--argus-yellow)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-medium)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} style={{ animation: 'fade-in 0.2s ease', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="text-display" style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: msg.role === 'user' ? 'var(--text-secondary)' : 'var(--argus-yellow)' }}>
                {msg.role === 'user' ? 'YOU' : 'ARGUS'}
              </span>
              <span className="text-muted" style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}>{fmt(msg.timestamp)}</span>
            </div>
            <div style={{
              fontSize: 14, lineHeight: 1.5, color: msg.isError ? '#ff8080' : 'var(--text-primary)',
              padding: '8px 12px', borderRadius: 12, maxWidth: '90%',
              background: msg.role === 'user' ? 'var(--bg-tertiary)' : msg.isError ? 'rgba(255,80,80,0.08)' : 'rgba(255,215,0,0.06)',
              border: `1px solid ${msg.role === 'user' ? 'var(--border-subtle)' : msg.isError ? 'rgba(255,80,80,0.2)' : 'rgba(255,215,0,0.1)'}`,
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              borderTopRightRadius: msg.role === 'user' ? 4 : 12,
              borderTopLeftRadius: msg.role === 'argus' ? 4 : 12,
            }}>{msg.content}</div>
            {msg.action && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px',
                borderRadius: 12, fontSize: 11, fontFamily: 'var(--font-mono)',
                border: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)',
                width: 'fit-content',
                borderColor: msg.action.status === 'success' ? 'rgba(100,200,100,0.3)' : msg.action.status === 'failed' ? 'rgba(255,80,80,0.3)' : msg.action.status === 'executing' ? 'rgba(255,215,0,0.3)' : undefined,
                color: msg.action.status === 'success' ? '#80d080' : msg.action.status === 'failed' ? '#ff8080' : msg.action.status === 'executing' ? 'var(--argus-yellow)' : undefined,
                animation: msg.action.status === 'executing' ? 'status-pulse 0.8s ease-in-out infinite' : undefined,
              }}>
                <span>{ACTION_ICONS[msg.action.type] || '◆'}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{msg.action.name}</span>
                <span>{STATUS_ICONS[msg.action.status] || '○'}</span>
              </div>
            )}
          </div>
        ))}

        {appState === 'thinking' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="text-display" style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--argus-yellow)' }}>ARGUS</span>
            <div style={{ display: 'flex', gap: 4, padding: '12px 16px' }}>
              {[0, 200, 400].map(d => (
                <span key={d} style={{
                  width: 6, height: 6, borderRadius: '50%', background: 'var(--argus-yellow)',
                  animation: `typing-dot 1.2s ease-in-out ${d}ms infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-primary)' }}>
        <button type="button" onClick={onToggleMic} title={micActive ? 'Stop listening' : 'Start listening'} style={{
          width: 38, height: 38, borderRadius: 10, border: `1px solid ${micActive ? 'var(--argus-yellow)' : 'var(--border-subtle)'}`,
          background: micActive ? 'rgba(255,215,0,0.15)' : 'var(--bg-tertiary)',
          fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          animation: micActive ? 'status-pulse 1s ease-in-out infinite' : undefined,
          boxShadow: micActive ? 'var(--shadow-glow)' : undefined,
        }}>{micActive ? '🎙' : '🎤'}</button>

        <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
          placeholder={isListening ? 'Listening...' : 'Type a command or ask a question...'}
          disabled={disabled} autoComplete="off" spellCheck={false}
          style={{
            flex: 1, fontFamily: 'var(--font-body)', fontSize: 14, padding: '10px 14px',
            background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
            borderRadius: 10, color: 'var(--text-primary)', outline: 'none',
          }}
        />

        <button type="submit" disabled={!input.trim() || disabled} title="Send" style={{
          width: 38, height: 38, borderRadius: 10, border: '1px solid var(--border-medium)',
          background: 'var(--bg-tertiary)', color: 'var(--argus-yellow)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          opacity: !input.trim() || disabled ? 0.3 : 1,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
