import React from 'react';
import { AppState } from '../types';

interface StatusBarProps {
  appState: AppState;
  cameraActive: boolean;
  micActive: boolean;
}

const STATUS_LABELS: Record<AppState, string> = {
  idle: 'STANDBY', listening: 'LISTENING', thinking: 'THINKING',
  executing: 'EXECUTING', speaking: 'SPEAKING', error: 'ERROR',
  startup: 'STARTING', setup: 'SETUP',
};

const StatusBar: React.FC<StatusBarProps> = ({ appState, cameraActive, micActive }) => {
  return (
    <div className="glass-panel" style={{
      height: 28,
      borderTop: '1px solid rgba(255,215,0,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 12px', fontSize: 10, userSelect: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span className={`status-dot ${appState === 'error' ? 'offline' : appState === 'idle' ? 'standby' : 'online'}`} />
          <span className="text-mono" style={{ fontSize: 10, letterSpacing: 1 }}>
            {STATUS_LABELS[appState]}
          </span>
        </div>
      </div>

      <div className="text-mono" style={{ fontSize: 10, letterSpacing: 2, color: 'var(--text-muted)', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
        ARGUS v1.0.0 — WEB
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 11 }}>📷</span>
          <span className="text-mono" style={{ fontSize: 10, color: cameraActive ? 'var(--argus-yellow)' : 'var(--text-muted)' }}>
            CAM: {cameraActive ? 'ON' : 'OFF'}
          </span>
        </div>
        <div style={{ width: 1, height: 14, background: 'var(--border-subtle)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 11 }}>{micActive ? '🎙' : '🎤'}</span>
          <span className="text-mono" style={{ fontSize: 10, color: micActive ? 'var(--argus-yellow)' : 'var(--text-muted)' }}>
            MIC: {micActive ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
