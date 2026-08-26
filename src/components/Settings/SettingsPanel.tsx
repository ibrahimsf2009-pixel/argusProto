import React, { useState, useEffect } from 'react';
import { ArgusConfig } from '../../types';

interface SettingsPanelProps {
  config: ArgusConfig | null;
  onConfigChange: (config: Partial<ArgusConfig>) => void;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, onConfigChange, onClose }) => {
  const [localConfig, setLocalConfig] = useState<ArgusConfig | null>(config);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setLocalConfig(config); }, [config]);

  const updateConfig = (key: keyof ArgusConfig, value: any) => {
    if (!localConfig) return;
    setLocalConfig({ ...localConfig, [key]: value });
  };

  const handleSave = () => {
    if (!localConfig) return;
    onConfigChange(localConfig);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!localConfig) return null;

  const sectionStyle: React.CSSProperties = { padding: 20, display: 'flex', flexDirection: 'column', gap: 12 };
  const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
        <h2 className="text-display" style={{ fontSize: 16, fontWeight: 700, letterSpacing: 3, color: 'var(--argus-yellow)' }}>SETTINGS</h2>
        <button className="btn" onClick={onClose}>✕ Close</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>
        {/* AI Provider */}
        <div className="glass-card" style={sectionStyle}>
          <h3 className="text-display" style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, color: 'var(--argus-yellow)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🧠</span> AI Provider
          </h3>
          <p className="text-muted" style={{ fontSize: 12 }}>Configure which AI model ARGUS uses for intelligent responses.</p>

          <div style={fieldStyle}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Provider</label>
            <select className="input" value={localConfig.aiProvider} onChange={e => updateConfig('aiProvider', e.target.value)}>
              <option value="openai">OpenAI (GPT)</option>
              <option value="local">Local Model</option>
              <option value="future">Future Provider</option>
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>API Key</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" type={showApiKey ? 'text' : 'password'} value={localConfig.apiKey}
                onChange={e => updateConfig('apiKey', e.target.value)} placeholder="sk-..." style={{ flex: 1 }} />
              <button className="btn" onClick={() => setShowApiKey(!showApiKey)} style={{ flexShrink: 0 }}>
                {showApiKey ? '🙈' : '👁'}
              </button>
            </div>
            <p className="text-muted" style={{ fontSize: 11, marginTop: 6 }}>
              Your API key is stored locally in your browser and never sent anywhere except the AI provider.
            </p>
          </div>
        </div>

        {/* Voice */}
        <div className="glass-card" style={sectionStyle}>
          <h3 className="text-display" style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, color: 'var(--argus-yellow)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🔊</span> Voice
          </h3>
          <div style={fieldStyle}>
            <div className="toggle-container" onClick={() => updateConfig('voiceEnabled', !localConfig.voiceEnabled)}>
              <div className={`toggle ${localConfig.voiceEnabled ? 'active' : ''}`}><div className="toggle-knob" /></div>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Text-to-Speech</span>
            </div>
            <p className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>ARGUS will speak responses using your browser's built-in TTS.</p>
          </div>
        </div>

        {/* Camera */}
        <div className="glass-card" style={sectionStyle}>
          <h3 className="text-display" style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, color: 'var(--argus-yellow)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📷</span> Camera & Gestures
          </h3>
          <div style={fieldStyle}>
            <div className="toggle-container" onClick={() => updateConfig('cameraEnabled', !localConfig.cameraEnabled)}>
              <div className={`toggle ${localConfig.cameraEnabled ? 'active' : ''}`}><div className="toggle-knob" /></div>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Enable Camera</span>
            </div>
            <p className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>Enable webcam for hand gesture recognition. Camera data never leaves your computer.</p>
          </div>
          {localConfig.cameraEnabled && (
            <div style={fieldStyle}>
              <label style={{ fontSize: 13, fontWeight: 500 }}>Gesture Sensitivity</label>
              <input type="range" min="0.3" max="1" step="0.05" value={localConfig.gestureSensitivity}
                onChange={e => updateConfig('gestureSensitivity', parseFloat(e.target.value))}
                style={{ width: '100%', height: 4, background: 'var(--bg-tertiary)', borderRadius: 2, outline: 'none', cursor: 'pointer' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span className="text-muted">Low</span>
                <span className="text-yellow">{(localConfig.gestureSensitivity * 100).toFixed(0)}%</span>
                <span className="text-muted">High</span>
              </div>
            </div>
          )}
        </div>

        {/* General */}
        <div className="glass-card" style={sectionStyle}>
          <h3 className="text-display" style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, color: 'var(--argus-yellow)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⚙</span> General
          </h3>
          <div style={fieldStyle}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Wake Shortcut</label>
            <div className="input" style={{ opacity: 0.6, cursor: 'not-allowed' }}>Ctrl + Space</div>
            <p className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>Press Ctrl+Space to activate ARGUS listening.</p>
          </div>
        </div>

        {/* Save */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <button className="btn btn-primary" onClick={handleSave} style={{ minWidth: 200, justifyContent: 'center', padding: '12px 32px', fontSize: 14, letterSpacing: 1 }}>
            {saved ? '✓ SAVED' : '💾 SAVE SETTINGS'}
          </button>
        </div>

        {/* About */}
        <div className="glass-card" style={{ padding: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="text-display" style={{ fontSize: 14, letterSpacing: 3, color: 'var(--argus-yellow)' }}>ARGUS</div>
          <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>Version 1.0.0 — Futuristic Desktop AI Assistant</div>
          <div className="text-muted" style={{ fontSize: 10, marginTop: 8 }}>Built with React + TypeScript + Vite</div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
