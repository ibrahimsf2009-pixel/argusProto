import React from 'react';
import { View } from '../types';

interface TitleBarProps {
  view: View;
  onSettingsClick: () => void;
  onCameraClick: () => void;
  onGesturesClick: () => void;
}

const TitleBar: React.FC<TitleBarProps> = ({ view, onSettingsClick, onCameraClick, onGesturesClick }) => {
  return (
    <div className="titlebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="titlebar-title">ARGUS</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className="btn"
            style={{
              fontSize: 11, padding: '3px 10px',
              background: view === 'main' ? 'rgba(255,215,0,0.1)' : 'transparent',
              borderColor: view === 'main' ? 'var(--argus-yellow)' : 'transparent',
              color: view === 'main' ? 'var(--argus-yellow)' : 'var(--text-muted)',
            }}
            onClick={() => { if (view !== 'main') onSettingsClick(); }}
          >
            ◉ ASSISTANT
          </button>
          <button
            className="btn"
            style={{
              fontSize: 11, padding: '3px 10px',
              background: view === 'camera' ? 'rgba(255,215,0,0.1)' : 'transparent',
              borderColor: view === 'camera' ? 'var(--argus-yellow)' : 'transparent',
              color: view === 'camera' ? 'var(--argus-yellow)' : 'var(--text-muted)',
            }}
            onClick={onCameraClick}
          >
            ◎ VISION
          </button>
          <button
            className="btn"
            style={{
              fontSize: 11, padding: '3px 10px',
              background: view === 'gestures' ? 'rgba(255,215,0,0.1)' : 'transparent',
              borderColor: view === 'gestures' ? 'var(--argus-yellow)' : 'transparent',
              color: view === 'gestures' ? 'var(--argus-yellow)' : 'var(--text-muted)',
            }}
            onClick={onGesturesClick}
          >
            ✋ GESTURES
          </button>
          <button
            className="btn"
            style={{
              fontSize: 11, padding: '3px 10px',
              background: view === 'settings' ? 'rgba(255,215,0,0.1)' : 'transparent',
              borderColor: view === 'settings' ? 'var(--argus-yellow)' : 'transparent',
              color: view === 'settings' ? 'var(--argus-yellow)' : 'var(--text-muted)',
            }}
            onClick={onSettingsClick}
          >
            ⚙ SETTINGS
          </button>
        </div>
      </div>

      <div className="titlebar-controls">
        <button className="titlebar-btn" title="About">ℹ</button>
      </div>
    </div>
  );
};

export default TitleBar;
