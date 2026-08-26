import React, { useEffect, useRef, useMemo } from 'react';
import { AppState, HandPosition } from '../../types';

interface OrbViewProps {
  state: AppState;
  handPosition?: HandPosition | null;
}

const STATE_LABELS: Record<AppState, string> = {
  idle: 'STANDBY', listening: 'LISTENING', thinking: 'THINKING',
  executing: 'EXECUTING', speaking: 'SPEAKING', error: 'ERROR',
  startup: 'STARTING', setup: 'SETUP',
};

const STATE_ICONS: Record<AppState, string> = {
  idle: '●', listening: '◉', thinking: '◌', executing: '⚡',
  speaking: '◈', error: '✕', startup: '○', setup: '⚙',
};

const OrbView: React.FC<OrbViewProps> = ({ state, handPosition }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Array<{
    x: number; y: number; vx: number; vy: number;
    life: number; maxLife: number; size: number; hue: number;
  }>>([]);
  const frameRef = useRef<number>(0);
  const timeRef = useRef(0);
  const orbOffsetRef = useRef({ x: 0, y: 0, z: 0 });
  const handPosRef = useRef<HandPosition | null>(null);
  const lastTimeRef = useRef(performance.now());

  // Keep hand position in a ref so animation loop reads latest without re-render
  useEffect(() => {
    handPosRef.current = handPosition ?? null;
  }, [handPosition]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) { canvas.width = parent.clientWidth; canvas.height = parent.clientHeight; }
    };
    resize();
    window.addEventListener('resize', resize);

    const animate = (now: number) => {
      // Delta time for smooth animation regardless of frame rate
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05); // cap at 50ms
      lastTimeRef.current = now;
      timeRef.current += dt;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      let pulseSpeed = 1, particleRate = 0.3, glowIntensity = 0.3, ringCount = 3;
      switch (state) {
        case 'listening': pulseSpeed = 2; particleRate = 0.8; glowIntensity = 0.5; ringCount = 4; break;
        case 'thinking': pulseSpeed = 3; particleRate = 1.2; glowIntensity = 0.7; ringCount = 5; break;
        case 'executing': pulseSpeed = 4; particleRate = 2.0; glowIntensity = 0.8; ringCount = 6; break;
        case 'speaking': pulseSpeed = 2.5; particleRate = 1.0; glowIntensity = 0.6; ringCount = 4; break;
        case 'error': pulseSpeed = 0.5; particleRate = 0.5; glowIntensity = 0.4; ringCount = 2; break;
      }

      const time = timeRef.current;
      const baseRadius = Math.min(w, h) * 0.15;
      const pulse = Math.sin(time * pulseSpeed) * 0.1 + 1;

      // Smooth hand tracking — read from ref for zero-delay updates
      // Flip X axis because selfie camera is mirrored
      const hp = handPosRef.current;
      const targetX = hp ? (0.5 - hp.x) * w * 0.7 : 0;
      const targetY = hp ? (hp.y - 0.5) * h * 0.7 : 0;
      const targetZ = hp ? hp.z * 100 : 0;

      // Frame-rate independent lerp — works at any FPS
      const smoothFactor = 1 - Math.pow(0.001, dt); // ~0.18 at 60fps, smooth at any rate
      orbOffsetRef.current.x += (targetX - orbOffsetRef.current.x) * smoothFactor;
      orbOffsetRef.current.y += (targetY - orbOffsetRef.current.y) * smoothFactor;
      orbOffsetRef.current.z += (targetZ - orbOffsetRef.current.z) * smoothFactor;

      const offsetX = orbOffsetRef.current.x;
      const offsetY = orbOffsetRef.current.y;
      const scaleFromZ = 1 + orbOffsetRef.current.z * 0.004;
      const radius = baseRadius * pulse * scaleFromZ;
      const cx = w / 2 + offsetX;
      const cy = h / 2 + offsetY;

      // Outer glow
      const gradient = ctx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius * 2.5);
      gradient.addColorStop(0, `rgba(255, 215, 0, ${glowIntensity * 0.6})`);
      gradient.addColorStop(0.3, `rgba(255, 180, 0, ${glowIntensity * 0.3})`);
      gradient.addColorStop(0.7, `rgba(255, 160, 0, ${glowIntensity * 0.1})`);
      gradient.addColorStop(1, 'rgba(255, 160, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath(); ctx.arc(cx, cy, radius * 2.5, 0, Math.PI * 2); ctx.fill();

      // Core orb
      const coreGrad = ctx.createRadialGradient(cx, cy - radius * 0.2, 0, cx, cy, radius);
      coreGrad.addColorStop(0, `rgba(255, 240, 150, ${0.9 * pulse})`);
      coreGrad.addColorStop(0.4, `rgba(255, 215, 0, ${0.7 * pulse})`);
      coreGrad.addColorStop(0.8, `rgba(200, 160, 0, ${0.5 * pulse})`);
      coreGrad.addColorStop(1, `rgba(100, 80, 0, ${0.3 * pulse})`);
      ctx.fillStyle = coreGrad;
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();

      // Inner bright spot
      const innerGrad = ctx.createRadialGradient(cx, cy - radius * 0.3, 0, cx, cy, radius * 0.6);
      innerGrad.addColorStop(0, `rgba(255, 255, 230, ${0.8 * pulse})`);
      innerGrad.addColorStop(1, 'rgba(255, 255, 200, 0)');
      ctx.fillStyle = innerGrad;
      ctx.beginPath(); ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2); ctx.fill();

      // Rotating rings
      for (let i = 0; i < ringCount; i++) {
        const ringRadius = radius * (1.4 + i * 0.35);
        const angle = time * (0.5 + i * 0.3) * (i % 2 === 0 ? 1 : -1);
        const segments = 60;
        const arcLength = Math.PI * 2 / segments;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
        for (let s = 0; s < segments; s++) {
          const segAngle = s * arcLength;
          const opacity = (Math.sin(segAngle * 3 + time * 2) * 0.3 + 0.4) * (0.3 - i * 0.04);
          if (opacity <= 0) continue;
          ctx.strokeStyle = `rgba(255, 215, 0, ${opacity})`;
          ctx.lineWidth = 1.5 - i * 0.2;
          ctx.beginPath(); ctx.arc(0, 0, ringRadius, segAngle, segAngle + arcLength * 0.6); ctx.stroke();
        }
        ctx.restore();
      }

      // Hexagonal frame
      if (state !== 'idle') {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(time * 0.2);
        const hexRadius = radius * 1.8;
        ctx.strokeStyle = `rgba(255, 215, 0, ${0.1 + Math.sin(time * 2) * 0.05})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 2;
          const x = Math.cos(angle) * hexRadius;
          const y = Math.sin(angle) * hexRadius;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.stroke(); ctx.restore();
      }

      // Audio visualizer bars
      if (state === 'speaking' || state === 'thinking') {
        const barCount = 24;
        const barWidth = 3;
        const maxBarHeight = 30;
        for (let i = 0; i < barCount; i++) {
          const angle = (Math.PI * 2 / barCount) * i;
          const dist = radius * 1.2;
          const barHeight = (Math.sin(time * 4 + i * 0.5) * 0.5 + 0.5) * maxBarHeight * (state === 'speaking' ? 1 : 0.6);
          const x1 = cx + Math.cos(angle) * dist;
          const y1 = cy + Math.sin(angle) * dist;
          const x2 = cx + Math.cos(angle) * (dist + barHeight);
          const y2 = cy + Math.sin(angle) * (dist + barHeight);
          ctx.strokeStyle = `rgba(255, 215, 0, ${0.3 + barHeight / maxBarHeight * 0.4})`;
          ctx.lineWidth = barWidth;
          ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        }
      }

      // Particles
      if (Math.random() < particleRate * 0.1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.3 + Math.random() * 0.8;
        particlesRef.current.push({
          x: cx + Math.cos(angle) * radius * 0.5,
          y: cy + Math.sin(angle) * radius * 0.5,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          life: 1, maxLife: 0.8 + Math.random() * 1.2,
          size: 1 + Math.random() * 2, hue: 45 + Math.random() * 15,
        });
      }

      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx; p.y += p.vy; p.life -= dt / p.maxLife;
        if (p.life <= 0) return false;
        ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${p.life * 0.6})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill();
        return true;
      });

      if (particlesRef.current.length > 100) particlesRef.current = particlesRef.current.slice(-80);
      frameRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    frameRef.current = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frameRef.current); window.removeEventListener('resize', resize); };
  }, [state]); // No handPosition in deps — we read from ref

  const statusClass = useMemo(() => {
    switch (state) {
      case 'error': return 'orb-status--error';
      case 'listening': return 'orb-status--active';
      case 'thinking': return 'orb-status--thinking';
      case 'executing': return 'orb-status--executing';
      case 'speaking': return 'orb-status--speaking';
      default: return 'orb-status--idle';
    }
  }, [state]);

  return (
    <div style={{
      flex: 1, position: 'relative', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg-primary)', overflow: 'hidden', minWidth: 400,
    }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, pointerEvents: 'none' }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800,
          letterSpacing: 8, color: 'var(--argus-yellow)',
          textShadow: '0 0 30px rgba(255,215,0,0.5), 0 0 60px rgba(255,215,0,0.2)',
        }}>ARGUS</div>

        <div className={`orb-status ${statusClass}`} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500,
          letterSpacing: 2, padding: '4px 16px', borderRadius: 20,
          border: '1px solid transparent', transition: 'all 0.3s ease',
        }}>
          <span style={{ fontSize: 14 }}>{STATE_ICONS[state]}</span>
          <span style={{ textTransform: 'uppercase' }}>{STATE_LABELS[state]}</span>
        </div>
      </div>

      {/* Ambient dots */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute', width: 2, height: 2, borderRadius: '50%',
            background: 'var(--argus-yellow)', opacity: 0,
            left: `${10 + Math.random() * 80}%`, top: `${10 + Math.random() * 80}%`,
            animation: `ambient-float ${3 + Math.random() * 4}s ease-in-out ${Math.random() * 5}s infinite`,
          }} />
        ))}
      </div>

      <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 10, opacity: 0.5 }}>
        <span className="text-muted" style={{ fontSize: 11 }}>Ctrl+Space to activate</span>
      </div>

      <style>{`
        .orb-status--idle { color: var(--text-muted); border-color: var(--border-subtle); background: rgba(10,10,10,0.5); }
        .orb-status--active { color: var(--argus-yellow); border-color: var(--argus-yellow); background: rgba(255,215,0,0.05); box-shadow: 0 0 20px rgba(255,215,0,0.15); animation: status-pulse 1.5s ease-in-out infinite; }
        .orb-status--thinking { color: var(--argus-amber); border-color: var(--argus-amber); background: rgba(255,171,0,0.05); box-shadow: 0 0 20px rgba(255,171,0,0.15); animation: status-pulse 0.8s ease-in-out infinite; }
        .orb-status--executing { color: var(--argus-gold); border-color: var(--argus-gold); background: rgba(255,193,7,0.08); box-shadow: 0 0 25px rgba(255,193,7,0.2); animation: status-pulse 0.5s ease-in-out infinite; }
        .orb-status--speaking { color: var(--argus-yellow); border-color: rgba(255,215,0,0.6); background: rgba(255,215,0,0.05); box-shadow: 0 0 20px rgba(255,215,0,0.12); animation: status-pulse 1.2s ease-in-out infinite; }
        .orb-status--error { color: #ff5050; border-color: rgba(255,80,80,0.4); background: rgba(255,80,80,0.05); }
      `}</style>
    </div>
  );
};

export default OrbView;
