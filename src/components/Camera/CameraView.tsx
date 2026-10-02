import React, { useRef, useEffect } from 'react';
import { GestureResult, HandPosition } from '../../types';

interface CameraViewProps {
  enabled: boolean;
  onGestureDetected?: (gesture: GestureResult) => void;
  onHandPosition?: (position: HandPosition | null) => void;
}

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
  const palmZ = (wrist.z + indexMcp.z + pinkyMcp.z) / 3;
  const handPosition: HandPosition = { x: palmX, y: palmY, z: palmZ };

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
    // Camera frames are unmirrored (like another person seeing you), so the
    // image's left side is the USER's right. Name gestures from the user's
    // point of view: finger drifting toward image-left = user points RIGHT.
    const dx = indexTip.x - indexMcp.x;
    if (dx < -0.05) return { gesture: 'point_right', confidence: 0.8, handPosition };
    if (dx > 0.05) return { gesture: 'point_left', confidence: 0.8, handPosition };
  }

  return { gesture: 'none', confidence: 0, handPosition };
}

/**
 * Hidden hand-tracking detector — no visible camera feed.
 * MediaPipe runs on a hidden video element to detect hand position and gestures.
 */
const CameraView: React.FC<CameraViewProps> = ({ enabled, onGestureDetected, onHandPosition }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handsRef = useRef<any>(null);
  const lastGestureRef = useRef<string>('none');
  const lastGestureTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);
  const detectorReadyRef = useRef<boolean>(false);
  const GESTURE_COOLDOWN_MS = 1200;

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
        if (!Hands) return;

        const hands = new Hands({ locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
        hands.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.6, minTrackingConfidence: 0.5 });
        hands.onResults((results: any) => {
          if (cancelled) return;
          if (results.multiHandLandmarks?.length > 0) {
            const gesture = classifyGesture(results.multiHandLandmarks[0]);
            // Always emit continuous hand position
            if (gesture.handPosition) {
              onHandPosition?.(gesture.handPosition);
            }
            const now = Date.now();
            if (gesture.gesture !== 'none' && gesture.gesture !== lastGestureRef.current && now - lastGestureTimeRef.current > GESTURE_COOLDOWN_MS) {
              lastGestureRef.current = gesture.gesture;
              lastGestureTimeRef.current = now;
              onGestureDetected?.(gesture);
            } else if (gesture.gesture === 'none') {
              lastGestureRef.current = 'none';
            }
          } else {
            onHandPosition?.(null);
          }
        });

        handsRef.current = hands;
        detectorReadyRef.current = true;
      } catch {
        // Silent fail — no UI to show errors
      }
    };

    loadMediaPipe();
    return () => { cancelled = true; handsRef.current = null; detectorReadyRef.current = false; onHandPosition?.(null); };
  }, [enabled, onGestureDetected, onHandPosition]);

  // Camera + processing loop
  useEffect(() => {
    if (!enabled) {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
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
          videoRef.current.play().catch(() => {});
        }
      } catch {
        // Silent fail
      }
    };

    startCamera();

    // Processing loop — send frames to MediaPipe
    const processFrame = async () => {
      if (cancelled) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2 && handsRef.current && detectorReadyRef.current) {
        try { await handsRef.current.send({ image: video }); } catch { /* ignore */ }
      }
      animFrameRef.current = requestAnimationFrame(processFrame);
    };
    animFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [enabled]);

  // Hidden video element — never shown to user
  return (
    <video
      ref={videoRef}
      playsInline
      muted
      style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
    />
  );
};

export default CameraView;
