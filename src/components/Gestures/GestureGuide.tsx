import React from 'react';

interface GestureGuideProps {
  onClose: () => void;
  cameraEnabled: boolean;
}

interface GestureDoc {
  icon: string;
  name: string;
  how: string;
  action: string;
}

const GESTURES: GestureDoc[] = [
  {
    icon: '✊',
    name: 'CLOSED FIST',
    how: 'Curl all your fingers into your palm, thumb tucked in.',
    action: 'Silence — instantly stops Argus mid-sentence.',
  },
  {
    icon: '🖐',
    name: 'OPEN PALM',
    how: 'Open your hand with all five fingers extended, facing the camera.',
    action: 'Wake — brings Argus back from sleep mode.',
  },
  {
    icon: '👍',
    name: 'THUMBS UP',
    how: 'Make a fist, then point your thumb upward.',
    action: 'Confirm — approves a pending action such as Shut Down or Restart.',
  },
  {
    icon: '👎',
    name: 'THUMBS DOWN',
    how: 'Make a fist, then point your thumb downward.',
    action: 'Cancel — rejects a pending action.',
  },
  {
    icon: '👉',
    name: 'POINT RIGHT',
    how: 'Extend only your index finger and aim it to the right.',
    action: 'Next panel — cycles Assistant → Vision → Gestures → Settings.',
  },
  {
    icon: '👈',
    name: 'POINT LEFT',
    how: 'Extend only your index finger and aim it to the left.',
    action: 'Previous panel — cycles the interface backward.',
  },
];

const TIPS = [
  'Enable the camera first — Settings → Camera & Gestures.',
  'Hold your hand roughly 30–80 cm from the webcam, palm toward the camera.',
  'Show one hand at a time and keep it inside the camera frame.',
  'Hold each gesture for about a second — gestures fire once, then a 1.2 s cooldown.',
  'Good lighting dramatically improves detection accuracy.',
  'Camera data is processed locally in your browser and never uploaded.',
];

const GestureGuide: React.FC<GestureGuideProps> = ({ onClose, cameraEnabled }) => {
  const sectionStyle: React.CSSProperties = { padding: 20, display: 'flex', flexDirection: 'column', gap: 12 };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
        <h2 className="text-display" style={{ fontSize: 16, fontWeight: 700, letterSpacing: 3, color: 'var(--argus-yellow)' }}>✋ GESTURES</h2>
        <button className="btn" onClick={onClose}>✕ Close</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}>
        {/* Intro */}
        <div className="glass-card" style={sectionStyle}>
          <h3 className="text-display" style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, color: 'var(--argus-yellow)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>👋</span> Hand Commands
          </h3>
          <p className="text-muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
            When the camera is enabled, ARGUS watches for hand gestures in the background — no camera feed is ever shown.
            Make one of the gestures below and ARGUS reacts immediately. Each gesture fires once, with a short cooldown
            between detections.
          </p>

          {cameraEnabled ? (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(100,200,100,0.08)', border: '1px solid rgba(100,200,100,0.2)' }}>
              <p className="text-muted" style={{ fontSize: 11, margin: 0 }}>
                ✓ <strong>Camera active</strong> — gestures are being tracked. Raise a hand to try it now.
              </p>
            </div>
          ) : (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,171,0,0.08)', border: '1px solid rgba(255,171,0,0.25)' }}>
              <p className="text-muted" style={{ fontSize: 11, margin: 0 }}>
                ⚠ Camera is currently <strong style={{ color: 'var(--argus-yellow)' }}>OFF</strong>. Enable it in{' '}
                <strong>Settings → Camera &amp; Gestures</strong> to use hand commands.
              </p>
            </div>
          )}
        </div>

        {/* Gesture cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {GESTURES.map(g => (
            <div key={g.name} className="glass-card" style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 34, lineHeight: 1, filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.35))' }}>{g.icon}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <div className="text-display" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: 'var(--argus-yellow)' }}>
                  {g.name}
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: 10, letterSpacing: 1, marginBottom: 2 }}>HOW</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{g.how}</div>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: 10, letterSpacing: 1, marginBottom: 2 }}>ARGUS DOES</div>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>{g.action}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tips */}
        <div className="glass-card" style={sectionStyle}>
          <h3 className="text-display" style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, color: 'var(--argus-yellow)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>💡</span> Tips
          </h3>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, margin: 0, padding: 0 }}>
            {TIPS.map(tip => (
              <li key={tip} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, display: 'flex', gap: 8 }}>
                <span style={{ color: 'var(--argus-yellow)' }}>▸</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GestureGuide;
