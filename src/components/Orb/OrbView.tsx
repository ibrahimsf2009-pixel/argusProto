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
  // Adaptive range tracking for hand normalization
  const handRangeRef = useRef({ minX: 0.3, maxX: 0.7, minY: 0.3, maxY: 0.7, samples: 0 });

  useEffect(() => {
    handPosRef.current = handPosition ?? null;
    // Adapt range over time
    if (handPosition) {
      const r = handRangeRef.current;
      r.minX = Math.min(r.minX, handPosition.x);
      r.maxX = Math.max(r.maxX, handPosition.x);
      r.minY = Math.min(r.minY, handPosition.y);
      r.maxY = Math.max(r.maxY, handPosition.y);
      r.samples++;
    }
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
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;
      timeRef.current += dt;

      const w = canvas.width;
      const h = canvas.height;

      // Dark background with subtle radial gradient
      const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
      bgGrad.addColorStop(0, 'rgba(15, 12, 5, 1)');
      bgGrad.addColorStop(1, 'rgba(5, 5, 8, 1)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      let pulseSpeed = 1, glowIntensity = 0.4, spiralSpeed = 0.5, spiralArms = 3;
      switch (state) {
        case 'listening': pulseSpeed = 2; glowIntensity = 0.6; spiralSpeed = 1.0; spiralArms = 4; break;
        case 'thinking': pulseSpeed = 3; glowIntensity = 0.7; spiralSpeed = 1.5; spiralArms = 5; break;
        case 'executing': pulseSpeed = 4; glowIntensity = 0.9; spiralSpeed = 2.0; spiralArms = 6; break;
        case 'speaking': pulseSpeed = 2.5; glowIntensity = 0.7; spiralSpeed = 1.2; spiralArms = 4; break;
        case 'error': pulseSpeed = 0.5; glowIntensity = 0.3; spiralSpeed = 0.2; spiralArms = 2; break;
      }

      const time = timeRef.current;
      const baseRadius = Math.min(w, h) * 0.12;
      const pulse = Math.sin(time * pulseSpeed) * 0.15 + 1;

      // ─── Hand tracking with adaptive normalization ───
      const hp = handPosRef.current;
      const r = handRangeRef.current;
      let targetX = 0, targetY = 0, targetZ = 0;
      if (hp) {
        const rangeX = Math.max(r.maxX - r.minX, 0.15);
        const rangeY = Math.max(r.maxY - r.minY, 0.15);
        // Normalize to -1..1 within observed range, then scale to canvas
        const normX = -((hp.x - r.minX) / rangeX - 0.5) * 2; // flip for mirror
        const normY = ((hp.y - r.minY) / rangeY - 0.5) * 2;
        targetX = normX * w * 0.4;
        targetY = normY * h * 0.4;
        targetZ = hp.z * 80;
      }

      const smoothFactor = 1 - Math.pow(0.0003, dt);
      orbOffsetRef.current.x += (targetX - orbOffsetRef.current.x) * smoothFactor;
      orbOffsetRef.current.y += (targetY - orbOffsetRef.current.y) * smoothFactor;
      orbOffsetRef.current.z += (targetZ - orbOffsetRef.current.z) * smoothFactor;

      const offsetX = orbOffsetRef.current.x;
      const offsetY = orbOffsetRef.current.y;
      const scaleFromZ = 1 + orbOffsetRef.current.z * 0.004;
      const radius = baseRadius * pulse * scaleFromZ;
      const cx = w / 2 + offsetX;
      const cy = h / 2 + offsetY;

      // ─── Outer neon glow ───
      const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 3);
      glowGrad.addColorStop(0, `rgba(200, 255, 50, ${glowIntensity * 0.5})`);
      glowGrad.addColorStop(0.2, `rgba(180, 255, 30, ${glowIntensity * 0.3})`);
      glowGrad.addColorStop(0.5, `rgba(100, 200, 0, ${glowIntensity * 0.1})`);
      glowGrad.addColorStop(1, 'rgba(50, 100, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath(); ctx.arc(cx, cy, radius * 3, 0, Math.PI * 2); ctx.fill();

      // ─── Neon spiral arms ───
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(time * spiralSpeed * 0.3);
      for (let arm = 0; arm < spiralArms; arm++) {
        const armOffset = (Math.PI * 2 / spiralArms) * arm;
        const points = 120;
        const maxAngle = Math.PI * 4; // 2 full turns
        ctx.beginPath();
        for (let i = 0; i < points; i++) {
          const t = i / points;
          const angle = t * maxAngle + armOffset + time * spiralSpeed;
          const spiralR = t * radius * 2.2;
          const x = Math.cos(angle) * spiralR;
          const y = Math.sin(angle) * spiralR;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        const armOpacity = (0.15 + Math.sin(time * 2 + arm) * 0.1) * glowIntensity;
        ctx.strokeStyle = `rgba(200, 255, 50, ${armOpacity})`;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'rgba(180, 255, 30, 0.8)';
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.restore();

      // ─── Inner spinning rings ───
      for (let i = 0; i < 3; i++) {
        const ringR = radius * (0.8 + i * 0.4);
        const angle = time * (1.5 + i * 0.5) * (i % 2 === 0 ? 1 : -1);
        const segments = 60;
        const arcLen = Math.PI * 2 / segments;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
        for (let s = 0; s < segments; s++) {
          const segAngle = s * arcLen;
          const opacity = (Math.sin(segAngle * 3 + time * 3) * 0.3 + 0.4) * 0.25;
          if (opacity <= 0) continue;
          ctx.strokeStyle = `rgba(200, 255, 50, ${opacity})`;
          ctx.lineWidth = 1.5 - i * 0.3;
          ctx.shadowColor = 'rgba(180, 255, 30, 0.5)';
          ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.arc(0, 0, ringR, segAngle, segAngle + arcLen * 0.5); ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // ─── Core bright spot ───
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.8);
      coreGrad.addColorStop(0, `rgba(230, 255, 180, ${0.95 * pulse})`);
      coreGrad.addColorStop(0.3, `rgba(200, 255, 50, ${0.6 * pulse})`);
      coreGrad.addColorStop(0.7, `rgba(100, 200, 0, ${0.2 * pulse})`);
      coreGrad.addColorStop(1, 'rgba(50, 100, 0, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath(); ctx.arc(cx, cy, radius * 0.8, 0, Math.PI * 2); ctx.fill();

      // ─── Hexagonal wireframe ───
      if (state !== 'idle') {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(time * 0.15);
        const hexR = radius * 2;
        ctx.strokeStyle = `rgba(200, 255, 50, ${0.08 + Math.sin(time * 2) * 0.04})`;
        ctx.lineWidth = 1;
        ctx.shadowColor = 'rgba(180, 255, 30, 0.3)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 2;
          const x = Math.cos(a) * hexR;
          const y = Math.sin(a) * hexR;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // ─── Particles ───
      if (Math.random() < 0.15) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.2 + Math.random() * 0.6;
        particlesRef.current.push({
          x: cx + Math.cos(angle) * radius * 0.3,
          y: cy + Math.sin(angle) * radius * 0.3,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          life: 1, maxLife: 0.6 + Math.random() * 1,
          size: 1 + Math.random() * 2.5, hue: 70 + Math.random() * 30,
        });
      }

      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx; p.y += p.vy; p.life -= dt / p.maxLife;
        if (p.life <= 0) return false;
        ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.life * 0.7})`;
        ctx.shadowColor = `hsla(${p.hue}, 100%, 60%, 0.5)`;
        ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        return true;
      });

      if (particlesRef.current.length > 80) particlesRef.current = particlesRef.current.slice(-60);
      frameRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    frameRef.current = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frameRef.current); window.removeEventListener('resize', resize); };
  }, [state]);

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
      justifyContent: 'center', overflow: 'hidden', minWidth: 400,
    }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, pointerEvents: 'none' }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800,
          letterSpacing: 8, color: '#c8ff32',
          textShadow: '0 0 20px rgba(200,255,50,0.6), 0 0 40px rgba(200,255,50,0.3), 0 0 80px rgba(200,255,50,0.15)',
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

      <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 10, opacity: 0.4 }}>
        <span className="text-muted" style={{ fontSize: 11, letterSpacing: 1 }}>Ctrl+Space to activate</span>
      </div>

      <style>{`
        .orb-status--idle { color: var(--text-muted); border-color: rgba(200,255,50,0.1); background: rgba(10,10,10,0.5); backdrop-filter: blur(12px); }
        .orb-status--active { color: #c8ff32; border-color: rgba(200,255,50,0.4); background: rgba(200,255,50,0.05); box-shadow: 0 0 20px rgba(200,255,50,0.15); animation: status-pulse 1.5s ease-in-out infinite; }
        .orb-status--thinking { color: #d4ff40; border-color: rgba(212,255,64,0.4); background: rgba(212,255,64,0.05); box-shadow: 0 0 20px rgba(212,255,64,0.15); animation: status-pulse 0.8s ease-in-out infinite; }
        .orb-status--executing { color: #e0ff50; border-color: rgba(224,255,80,0.4); background: rgba(224,255,80,0.08); box-shadow: 0 0 25px rgba(224,255,80,0.2); animation: status-pulse 0.5s ease-in-out infinite; }
        .orb-status--speaking { color: #c8ff32; border-color: rgba(200,255,50,0.5); background: rgba(200,255,50,0.05); box-shadow: 0 0 20px rgba(200,255,50,0.12); animation: status-pulse 1.2s ease-in-out infinite; }
        .orb-status--error { color: #ff5050; border-color: rgba(255,80,80,0.4); background: rgba(255,80,80,0.05); }
      `}</style>
    </div>
  );
};

export default OrbView;
