import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GestureResult } from '../../types';

interface CameraViewProps {
  enabled: boolean;
  onGestureDetected?: (gesture: GestureResult) => void;
}

const GESTURE_LABELS: Record<string, string> = {
  open_palm: 'Open Palm', thumbs_up: 'Thumbs Up', thumbs_down: 'Thumbs Down',
  point_left: 'Point Left', point_right: 'Point Right', fist: 'Fist', none: 'No Gesture',
};

function classifyGesture(landmarks: Array<{ x: number; y: number; z: number }>): GestureResult {
  if (!landmarks || landmarks.length < 21) return { gesture: 'none', confidence: 0, handPosition: null };

  const wrist = landmarks[0];
  const thumbTip = landmarks[4], indexTip = landmarks[8], middleTip = landmarks[12];
  const ringTip = landmarks[16], pinkyTip = landmarks[20];
  const indexMcp = landmarks[5], pinkyMcp = landmarks[17];
  const thumbIp = landmarks[3], indexPip = landmarks[6], middlePip = landmarks[10];
  const ringPip = landmarks[14], pinkyPip = landmarks[18];

  const palmX = (wrist.x + indexMcp.x + pinkyMcp.x) / 3;
  const palmY = (wrist.y + indexMcp.y + pinkyMcp.y) / 3;
  const handPosition = { x: palmX, y: palmY };

  const indexExtended = indexTip.y < indexPip.y;
  const middleExtended = middleTip.y < middlePip.y;
  const ringExtended = ringTip.y < ringPip.y;
  const pinkyExtended = pinkyTip.y < pinkyPip.y;
  const thumbExtended = thumbTip.x < thumbIp.x;
  const extendedCount = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;

  if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended && thumbTip.y < wrist.y)
    return { gesture: 'thumbs_up', confidence: 0.85, handPosition };
  if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended && thumbTip.y > wrist.y)
    return { gesture: 'thumbs_down', confidence: 0.85, handPosition };
  if (extendedCount >= 3 && thumbExtended)
    return { gesture: 'open_palm', confidence: 0.9, handPosition };
  if (extendedCount === 0 && !thumbExtended)
    return { gesture: 'fist', confidence: 0.85, handPosition };
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    const dx = indexTip.x - indexMcp.x;
    if (dx > 0.05) return { gesture: 'point_right', confidence: 0.8, handPosition };
    if (dx < -0.05) return { gesture: 'point_left', confidence: 0.8, handPosition };
  }

  return { gesture: 'none', confidence: 0, handPosition };
}

const CameraView: React.FC<CameraViewProps> = ({ enabled, onGestureDetected }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentGesture, setCurrentGesture] = useState<GestureResult>({ gesture: 'none', confidence: 0, handPosition: null });
  const [gestureLog, setGestureLog] = useState<string[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const handsRef = useRef<any>(null);
  const lastGestureRef = useRef<string>('none');
  const lastGestureTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);
  const detectorReadyRef = useRef<boolean>(false);
  const GESTURE_COOLDOWN_MS = 800;

  const addGestureLog = useCallback((msg: string) => {
    setGestureLog(prev => [...prev.slice(-8), `${new Date().toLocaleTimeString()} — ${msg}`]);
  }, []);

  // Load MediaPipe Hands
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const loadMediaPipe = async () => {
      try {
        if (!(window as any).Hands) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';
            s.crossOrigin = 'anonymous';
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Failed to load camera_utils'));
            document.head.appendChild(s);
          });
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
            s.crossOrigin = 'anonymous';
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Failed to load hands'));
            document.head.appendChild(s);
          });
        }
        if (cancelled) return;

        const Hands = (window as any).Hands;
        if (!Hands) { addGestureLog('MediaPipe not available'); return; }

        const hands = new Hands({ locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
        hands.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.6, minTrackingConfidence: 0.5 });
        hands.onResults((results: any) => {
          if (cancelled) return;
          if (results.multiHandLandmarks?.length > 0) {
            const gesture = classifyGesture(results.multiHandLandmarks[0]);
            const now = Date.now();
            if (gesture.gesture !== 'none' && gesture.gesture !== lastGestureRef.current && now - lastGestureTimeRef.current > GESTURE_COOLDOWN_MS) {
              lastGestureRef.current = gesture.gesture;
              lastGestureTimeRef.current = now;
              setCurrentGesture(gesture);
              addGestureLog(`${GESTURE_LABELS[gesture.gesture]} (${(gesture.confidence * 100).toFixed(0)}%)`);
              onGestureDetected?.(gesture);
            } else if (gesture.gesture === 'none') {
              lastGestureRef.current = 'none';
              setCurrentGesture(gesture);
            }
          } else {
            setCurrentGesture({ gesture: 'none', confidence: 0, handPosition: null });
          }
        });

        handsRef.current = hands;
        detectorReadyRef.current = true;
        addGestureLog('MediaPipe Hands loaded');
      } catch (err: any) {
        addGestureLog(`Vision init: ${err.message}`);
      }
    };

    loadMediaPipe();
    return () => { cancelled = true; handsRef.current = null; detectorReadyRef.current = false; };
  }, [enabled, onGestureDetected, addGestureLog]);

  // Camera + processing loop
  useEffect(() => {
    if (!enabled) {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setCameraReady(false);
      return;
    }

    let cancelled = false;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => { videoRef.current?.play(); setCameraReady(true); setError(null); addGestureLog('Camera active'); };
        }
      } catch (err: any) {
        setError(err.name === 'NotAllowedError' ? 'Camera access denied.' : 'Unable to access camera.');
        setCameraReady(false);
      }
    };

    startCamera();
    return () => { cancelled = true; streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [enabled, addGestureLog]);

  // Canvas overlay
  useEffect(() => {
    if (!cameraReady || !canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let running = true;
    const video = videoRef.current;

    const processFrame = async () => {
      if (!running || !video || video.readyState < 2) { animFrameRef.current = requestAnimationFrame(processFrame); return; }
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.02)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (handsRef.current && detectorReadyRef.current) {
        try { await handsRef.current.send({ image: video }); } catch { /* ignore */ }
      }

      // Hand position glow
      if (currentGesture.handPosition) {
        const hx = currentGesture.handPosition.x * canvas.width;
        const hy = currentGesture.handPosition.y * canvas.height;
        const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, 30);
        glow.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
        glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(hx, hy, 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.beginPath(); ctx.arc(hx, hy, 4, 0, Math.PI * 2); ctx.fill();
      }

      // Corner brackets
      const m = 20, c = 30;
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
      ctx.lineWidth = 2;
      [[m, m + c, m, m, m + c, m], [canvas.width - m - c, m, canvas.width - m, m, canvas.width - m, m + c],
       [m, canvas.height - m - c, m, canvas.height - m, m + c, canvas.height - m],
       [canvas.width - m - c, canvas.height - m, canvas.width - m, canvas.height - m, canvas.width - m, canvas.height - m - c]
      ].forEach(([x1, y1, x2, y2, x3, y3]) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.stroke(); });

      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
      ctx.fillText('VISION: ACTIVE', m + 5, m + 15);
      if (currentGesture.gesture !== 'none') {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.fillText(`GESTURE: ${GESTURE_LABELS[currentGesture.gesture]}`, m + 5, m + 35);
      }

      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    animFrameRef.current = requestAnimationFrame(processFrame);
    return () => { running = false; if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [cameraReady, currentGesture]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, padding: 16, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 className="text-display" style={{ fontSize: 14, letterSpacing: 2, color: 'var(--argus-yellow)' }}>CAMERA VISION</h3>
        <span className={`status-dot ${cameraReady ? 'online' : 'offline'}`} />
      </div>

      <div style={{ width: '100%', aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-medium)', background: '#000', position: 'relative' }}>
        {error ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-secondary)', padding: 20, textAlign: 'center' }}>
            <span style={{ fontSize: 32 }}>📷</span><p>{error}</p>
          </div>
        ) : !enabled ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-secondary)', padding: 20, textAlign: 'center' }}>
            <span style={{ fontSize: 32 }}>📷</span>
            <p className="text-muted">Camera is disabled.</p>
            <p className="text-muted" style={{ fontSize: 11 }}>Enable it in Settings to use gesture recognition.</p>
          </div>
        ) : (
          <>
            <video ref={videoRef} playsInline muted style={{ display: cameraReady ? 'none' : 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
            <canvas ref={canvasRef} style={{ display: cameraReady ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'cover' }} />
          </>
        )}
      </div>

      {/* Detected gesture */}
      {enabled && (
        <div className="glass-card" style={{ padding: '12px 16px', borderRadius: 12 }}>
          <div className="text-display" style={{ fontSize: 11, letterSpacing: 1, color: 'var(--argus-yellow)', marginBottom: 8 }}>DETECTED GESTURE</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="text-display" style={{ fontSize: 14, fontWeight: 600, letterSpacing: 1, color: 'var(--argus-yellow)' }}>
              {currentGesture.gesture !== 'none' ? GESTURE_LABELS[currentGesture.gesture] : '—'}
            </span>
            {currentGesture.confidence > 0 && <span className="text-mono text-muted" style={{ fontSize: 12 }}>{(currentGesture.confidence * 100).toFixed(0)}%</span>}
          </div>
        </div>
      )}

      {/* Gesture log */}
      {enabled && gestureLog.length > 0 && (
        <div className="glass-card" style={{ padding: '12px 16px', borderRadius: 12 }}>
          <div className="text-display" style={{ fontSize: 11, letterSpacing: 1, color: 'var(--argus-yellow)', marginBottom: 8 }}>VISION LOG</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 120, overflowY: 'auto' }}>
            {gestureLog.map((entry, i) => <div key={i} className="text-mono text-muted" style={{ fontSize: 10, padding: '2px 0', opacity: 0.7 }}>{entry}</div>)}
          </div>
        </div>
      )}

      {/* Gesture reference */}
      <div style={{ padding: 16, borderRadius: 12, border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
        <div className="text-display" style={{ fontSize: 11, letterSpacing: 1, color: 'var(--argus-yellow)', marginBottom: 8 }}>GESTURE REFERENCE</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[['🖐', 'Open Palm — Toggle'], ['👍', 'Thumbs Up — Confirm'], ['👎', 'Thumbs Down — Cancel'], ['👉', 'Point Right — Next'], ['👈', 'Point Left — Previous'], ['✊', 'Fist — Toggle Listen']].map(([icon, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--text-secondary)', padding: '4px 0' }}>
              <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{icon}</span><span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CameraView;
