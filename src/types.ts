// ─── Message Types ──────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: 'user' | 'argus';
  content: string;
  timestamp: number;
  action?: ActionInfo;
  isError?: boolean;
}

export interface ActionInfo {
  type: 'website' | 'app' | 'system' | 'volume' | 'search' | 'ai' | 'gesture';
  name: string;
  status: 'pending' | 'executing' | 'success' | 'failed' | 'confirmed' | 'cancelled';
  detail?: string;
}

// ─── App State ─────────────────────────────────────────────────────────────
export type AppState = 'idle' | 'listening' | 'thinking' | 'executing' | 'speaking' | 'error' | 'startup' | 'setup';

export type View = 'main' | 'settings' | 'camera';

// ─── Config ────────────────────────────────────────────────────────────────
export interface ArgusConfig {
  aiProvider: 'openai' | 'local' | 'future';
  apiKey: string;
  voiceEnabled: boolean;
  cameraEnabled: boolean;
  gestureSensitivity: number;
  theme: 'dark' | 'light';
  startupBehavior: 'launch' | 'minimize';
  wakeShortcut: string;
  setupComplete?: boolean;
}

// ─── Gesture ───────────────────────────────────────────────────────────────
export interface HandPosition {
  x: number; // 0-1, left to right
  y: number; // 0-1, top to bottom
  z: number; // depth, negative = closer to camera
}

export interface GestureResult {
  gesture: 'open_palm' | 'thumbs_up' | 'thumbs_down' | 'point_left' | 'point_right' | 'fist' | 'none';
  confidence: number;
  handPosition: HandPosition | null;
}

// ─── Window API Bridge ─────────────────────────────────────────────────────
export interface ArgusAPI {
  getConfig: () => Promise<ArgusConfig>;
  saveConfig: (config: Partial<ArgusConfig>) => Promise<{ success: boolean }>;
  isFirstRun: () => Promise<boolean>;
  completeSetup: () => Promise<{ success: boolean }>;
  openWebsite: (name: string, searchQuery?: string) => Promise<{ success: boolean; message: string; url: string }>;
  getAllowedWebsites: () => Promise<string[]>;
  getAllowedApps: () => Promise<string[]>;
  adjustVolume: (direction: 'up' | 'down' | 'mute') => Promise<{ success: boolean; message: string }>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  onToggleListen: (callback: () => void) => void;
}

declare global {
  interface Window {
    argusAPI: ArgusAPI;
  }
}
