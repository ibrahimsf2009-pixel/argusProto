import React, { useState, useEffect } from 'react';

interface BootLine { label: string; status: 'loading' | 'ready' | 'error'; delay: number; }

const BOOT_LINES: BootLine[] = [
  { label: 'AI CORE', status: 'loading', delay: 400 },
  { label: 'VOICE', status: 'loading', delay: 800 },
  { label: 'VISION', status: 'loading', delay: 1200 },
  { label: 'SYSTEM', status: 'loading', delay: 1600 },
  { label: 'SECURITY', status: 'loading', delay: 2000 },
  { label: 'NETWORK', status: 'loading', delay: 2400 },
];

const StartupScreen: React.FC = () => {
  const [lines, setLines] = useState<BootLine[]>(BOOT_LINES.map(l => ({ ...l })));
  const [online, setOnline] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    BOOT_LINES.forEach((line, i) => {
      setTimeout(() => setLines(prev => { const u = [...prev]; u[i] = { ...u[i], status: 'ready' }; return u; }), line.delay);
    });
    setTimeout(() => setOnline(true), 2800);
    setTimeout(() => setFadeOut(true), 3400);
  }, []);

  return (
    <div style={{
      width: '100vw', height: '100vh', background: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden', opacity: fadeOut ? 0 : 1, transition: 'opacity 0.5s ease',
    }}>
      {/* Grid background */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        backgroundImage: 'linear-gradient(rgba(255,215,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,215,0,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', width: 80, height: 80 }}>
            {[40, 60, 80].map((s, i) => (
              <div key={i} style={{
                position: 'absolute', top: '50%', left: '50%', width: s, height: s,
                borderRadius: '50%', border: `1px solid rgba(255,215,0,${0.8 - i * 0.3})`,
                transform: 'translate(-50%, -50%)', animation: `status-pulse 2s ease-in-out ${i * 0.3}s infinite`,
              }} />
            ))}
            <div style={{
              position: 'absolute', top: '50%', left: '50%', width: 16, height: 16,
              borderRadius: '50%', background: 'var(--argus-yellow)',
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 20px var(--argus-glow-strong), 0 0 40px var(--argus-glow)',
              animation: 'pulse-glow 1.5s ease-in-out infinite',
            }} />
          </div>
          <div className="text-display" style={{ fontSize: 36, fontWeight: 900, letterSpacing: 12, color: 'var(--argus-yellow)', textShadow: '0 0 30px rgba(255,215,0,0.5)' }}>ARGUS</div>
          <div className="text-mono text-muted" style={{ fontSize: 11, letterSpacing: 3 }}>FUTURISTIC DESKTOP AI ASSISTANT</div>
        </div>

        {/* Boot sequence */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div className="text-mono text-muted" style={{ fontSize: 11, letterSpacing: 2 }}>INITIALIZING...</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
            {lines.map((line, i) => (
              <div key={i} className={`text-mono ${line.status === 'ready' ? '' : ''}`} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                color: line.status === 'ready' ? 'var(--text-primary)' : 'var(--text-muted)',
                transition: 'color 0.3s ease',
              }}>
                <span style={{ minWidth: 80, textAlign: 'right', letterSpacing: 1 }}>{line.label}</span>
                <span style={{ color: 'var(--text-muted)', opacity: 0.3, letterSpacing: 2 }}>{'·'.repeat(20 - line.label.length)}</span>
                <span className={`text-mono ${line.status === 'ready' ? 'text-yellow' : ''}`} style={{ minWidth: 60 }}>
                  {line.status === 'loading' ? '...' : line.status === 'ready' ? 'READY' : 'ERROR'}
                </span>
              </div>
            ))}
          </div>
          {online && (
            <div className="text-display" style={{ fontSize: 18, fontWeight: 800, letterSpacing: 6, color: 'var(--argus-yellow)', textShadow: '0 0 20px rgba(255,215,0,0.5)', animation: 'fade-in 0.5s ease', marginTop: 12 }}>
              ARGUS ONLINE
            </div>
          )}
        </div>
      </div>

      <div className="text-mono text-muted" style={{ position: 'absolute', bottom: 20, right: 20, fontSize: 10 }}>v1.0.0</div>
    </div>
  );
};

export default StartupScreen;
