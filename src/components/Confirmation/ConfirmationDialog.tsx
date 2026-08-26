import React, { useEffect } from 'react';

interface ConfirmationDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ message, onConfirm, onCancel }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onConfirm, onCancel]);

  return (
    <div onClick={onCancel} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, animation: 'fade-in 0.15s ease',
    }}>
      <div onClick={e => e.stopPropagation()} className="glass-card" style={{
        width: 400, maxWidth: '90vw', padding: 32,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 16, textAlign: 'center', animation: 'fade-in 0.2s ease',
      }}>
        <div style={{ fontSize: 40, color: 'var(--argus-yellow)', animation: 'pulse-glow 1.5s ease-in-out infinite' }}>⚠</div>
        <div className="text-display" style={{ fontSize: 16, fontWeight: 700, letterSpacing: 3, color: 'var(--argus-yellow)' }}>CONFIRM ACTION</div>
        <div style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 320 }}>{message}</div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button className="btn btn-cancel" onClick={onCancel} style={{ minWidth: 120, justifyContent: 'center', padding: '10px 24px', fontSize: 13, fontWeight: 600, letterSpacing: 1 }}>CANCEL</button>
          <button className="btn btn-confirm" onClick={onConfirm} style={{ minWidth: 120, justifyContent: 'center', padding: '10px 24px', fontSize: 13, fontWeight: 600, letterSpacing: 1 }}>CONFIRM</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
