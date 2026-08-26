import React, { useState } from 'react';
import { ArgusConfig } from '../../types';

interface FirstRunSetupProps { onComplete: () => void; }
type SetupStep = 'welcome' | 'apikey' | 'permissions' | 'done';

const FirstRunSetup: React.FC<FirstRunSetupProps> = ({ onComplete }) => {
  const [step, setStep] = useState<SetupStep>('welcome');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(false);

  const handleComplete = async () => {
    const config: Partial<ArgusConfig> = {
      aiProvider: 'openai', apiKey, voiceEnabled, cameraEnabled,
      gestureSensitivity: 0.7, theme: 'dark', startupBehavior: 'launch',
      wakeShortcut: 'Ctrl+Space', setupComplete: true,
    };
    await window.argusAPI.saveConfig(config);
    onComplete();
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: 'linear-gradient(rgba(255,215,0,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,215,0,0.02) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 500, padding: 40, animation: 'fade-in 0.5s ease' }}>
        {step === 'welcome' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 100, height: 100, marginBottom: 12 }}>
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: 20, height: 20, borderRadius: '50%', background: 'var(--argus-yellow)', transform: 'translate(-50%, -50%)', boxShadow: '0 0 30px var(--argus-glow-strong)', animation: 'pulse-glow 1.5s ease-in-out infinite' }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: 50, height: 50, borderRadius: '50%', border: '1px solid rgba(255,215,0,0.5)', transform: 'translate(-50%, -50%)', animation: 'status-pulse 2s ease-in-out infinite' }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: 80, height: 80, borderRadius: '50%', border: '1px solid rgba(255,215,0,0.2)', transform: 'translate(-50%, -50%)', animation: 'status-pulse 2s ease-in-out 0.3s infinite' }} />
            </div>
            <h1 className="text-display" style={{ fontSize: 28, fontWeight: 900, letterSpacing: 6, color: 'var(--argus-yellow)', textShadow: '0 0 30px rgba(255,215,0,0.4)' }}>WELCOME TO ARGUS</h1>
            <p className="text-muted" style={{ fontSize: 14, lineHeight: 1.6 }}>Your futuristic desktop AI assistant is almost ready.<br />Let's configure a few settings.</p>
            <button className="btn btn-primary" onClick={() => setStep('apikey')} style={{ marginTop: 8, minWidth: 200, justifyContent: 'center', padding: '12px 32px', fontSize: 14, letterSpacing: 1 }}>GET STARTED →</button>
          </div>
        )}

        {step === 'apikey' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
            <div className="text-display text-yellow" style={{ fontSize: 36, fontWeight: 900, opacity: 0.3 }}>01</div>
            <h2 className="text-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: 4, color: 'var(--argus-yellow)' }}>AI PROVIDER</h2>
            <p className="text-muted" style={{ marginBottom: 16 }}>Enter your OpenAI API key to enable intelligent responses.<br /><span style={{ fontSize: 12 }}>Get yours at <span className="text-yellow">platform.openai.com</span></span></p>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
              <label style={{ fontSize: 13, fontWeight: 500 }}>API Key</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" type={showApiKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." style={{ flex: 1 }} />
                <button className="btn" onClick={() => setShowApiKey(!showApiKey)}>{showApiKey ? '🙈' : '👁'}</button>
              </div>
              <p className="text-muted" style={{ fontSize: 11, marginTop: 6 }}>Optional — you can skip this and add it later in Settings.</p>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16, width: '100%' }}>
              <button className="btn" onClick={() => setStep('welcome')} style={{ flex: 1, justifyContent: 'center' }}>← Back</button>
              <button className="btn btn-primary" onClick={() => setStep('permissions')} style={{ flex: 1, justifyContent: 'center' }}>Next →</button>
            </div>
          </div>
        )}

        {step === 'permissions' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
            <div className="text-display text-yellow" style={{ fontSize: 36, fontWeight: 900, opacity: 0.3 }}>02</div>
            <h2 className="text-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: 4, color: 'var(--argus-yellow)' }}>PERMISSIONS</h2>
            <p className="text-muted" style={{ marginBottom: 20 }}>Choose which features to enable. Both are optional.</p>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { icon: '🔊', title: 'Voice (Text-to-Speech)', desc: 'ARGUS will speak responses aloud.', enabled: voiceEnabled, toggle: () => setVoiceEnabled(!voiceEnabled) },
                { icon: '📷', title: 'Camera (Gesture Recognition)', desc: 'Enable webcam for hand gestures.', enabled: cameraEnabled, toggle: () => setCameraEnabled(!cameraEnabled) },
              ].map(p => (
                <div key={p.title} className="glass-card" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
                    <span style={{ fontSize: 24 }}>{p.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{p.title}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{p.desc}</div>
                    </div>
                  </div>
                  <div className="toggle-container" onClick={p.toggle}>
                    <div className={`toggle ${p.enabled ? 'active' : ''}`}><div className="toggle-knob" /></div>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{p.enabled ? 'ON' : 'OFF'}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 16, width: '100%' }}>
              <button className="btn" onClick={() => setStep('apikey')} style={{ flex: 1, justifyContent: 'center' }}>← Back</button>
              <button className="btn btn-primary" onClick={() => setStep('done')} style={{ flex: 1, justifyContent: 'center' }}>Finish Setup →</button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 60, height: 60, marginBottom: 8 }}>
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: 14, height: 14, borderRadius: '50%', background: 'var(--argus-yellow)', transform: 'translate(-50%, -50%)', boxShadow: '0 0 30px var(--argus-glow-strong)', animation: 'pulse-glow 1.5s ease-in-out infinite' }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,215,0,0.5)', transform: 'translate(-50%, -50%)', animation: 'status-pulse 2s ease-in-out infinite' }} />
            </div>
            <h2 className="text-display text-yellow" style={{ fontSize: 22, fontWeight: 700, letterSpacing: 4 }}>SETUP COMPLETE</h2>
            <p className="text-muted">ARGUS is ready. Press <span className="text-yellow">Ctrl+Space</span> to start listening.</p>
            <button className="btn btn-primary" onClick={handleComplete} style={{ marginTop: 8, minWidth: 200, justifyContent: 'center', padding: '12px 32px', fontSize: 14, letterSpacing: 1 }}>LAUNCH ARGUS</button>
          </div>
        )}
      </div>

      {/* Progress dots */}
      <div style={{ position: 'absolute', bottom: 30, display: 'flex', gap: 8 }}>
        {(['welcome', 'apikey', 'permissions', 'done'] as SetupStep[]).map((s, i) => (
          <div key={s} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: s === step ? 'var(--argus-yellow)' : ['welcome', 'apikey', 'permissions', 'done'].indexOf(step) > i ? 'rgba(255,215,0,0.4)' : 'var(--text-muted)',
            boxShadow: s === step ? '0 0 8px var(--argus-glow)' : undefined,
            transition: 'all 0.3s ease',
          }} />
        ))}
      </div>
    </div>
  );
};

export default FirstRunSetup;
