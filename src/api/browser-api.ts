// Browser API shim — replaces Electron IPC with browser-native APIs
// All data stored in localStorage, websites open in new tabs

import { ArgusConfig } from '../types';

const CONFIG_KEY = 'argus_config';const DEFAULT_CONFIG: ArgusConfig = {
  aiProvider: 'groq', apiKey: '', voiceEnabled: true,
  cameraEnabled: false, gestureSensitivity: 0.7, theme: 'dark',
  startupBehavior: 'launch', wakeShortcut: 'Ctrl+Space', setupComplete: false,
};

const ALLOWED_WEBSITES: Record<string, string> = {
  youtube: 'https://www.youtube.com',
  instagram: 'https://www.instagram.com',
  facebook: 'https://www.facebook.com',
  discord: 'https://discord.com',
  reddit: 'https://www.reddit.com',
  whatsapp: 'https://web.whatsapp.com',
  'whatsapp web': 'https://web.whatsapp.com',
  google: 'https://www.google.com',
  gmail: 'https://mail.google.com',
  github: 'https://github.com',
  chatgpt: 'https://chat.openai.com',
  maps: 'https://maps.google.com',
  'google maps': 'https://maps.google.com',
  spotify: 'https://open.spotify.com',
  linkedin: 'https://www.linkedin.com',
  twitter: 'https://twitter.com',
  x: 'https://twitter.com',
};

function loadConfig(): ArgusConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_CONFIG };
}

function saveConfigData(config: Partial<ArgusConfig>) {
  const current = loadConfig();
  const merged = { ...current, ...config };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(merged));
}

function openWebsite(name: string, searchQuery?: string): { success: boolean; message: string; url: string } {
  let url = ALLOWED_WEBSITES[name.toLowerCase()];

  if (!url) {
    // Check if it's a valid URL
    if (name.startsWith('http://') || name.startsWith('https://')) {
      try {
        const parsed = new URL(name);
        if (['http:', 'https:'].includes(parsed.protocol)) {
          url = name;
        }
      } catch {
        return { success: false, message: 'Invalid URL.', url: '' };
      }
    } else {
      return { success: false, message: `Website "${name}" is not in the allowed list.`, url: '' };
    }
  }

  if (searchQuery) {
    const encoded = encodeURIComponent(searchQuery);
    if (url.includes('youtube.com')) {
      url = `https://www.youtube.com/results?search_query=${encoded}`;
    } else if (url.includes('google.com') || url.includes('maps.google.com')) {
      url = `https://www.google.com/search?q=${encoded}`;
    } else if (url.includes('reddit.com')) {
      url = `https://www.reddit.com/search/?q=${encoded}`;
    } else if (url.includes('github.com')) {
      url = `https://github.com/search?q=${encoded}`;
    } else {
      url = `https://www.google.com/search?q=${encoded}`;
    }
  }

  window.open(url, '_blank');
  return {
    success: true,
    message: `Opening ${name}${searchQuery ? ` searching for "${searchQuery}"` : ''}.`,
    url,
  };
}

// Initialize browser API
export function initBrowserAPI() {
  if (window.argusAPI) return; // already initialized

  window.argusAPI = {
    getConfig: async () => loadConfig(),

    saveConfig: async (config) => {
      saveConfigData(config);
      return { success: true };
    },

    isFirstRun: async () => {
      const config = loadConfig();
      return !config.setupComplete;
    },

    completeSetup: async () => {
      saveConfigData({ setupComplete: true });
      return { success: true };
    },

    openWebsite: async (name, searchQuery) => {
      return openWebsite(name, searchQuery);
    },

    getAllowedWebsites: async () => Object.keys(ALLOWED_WEBSITES),

    getAllowedApps: async () => [
      'calculator', 'notepad', 'task manager', 'settings',
      'explorer', 'file explorer', 'cmd', 'command prompt',
      'powershell', 'paint', 'snipping',
    ],

    adjustVolume: async (direction) => {
      // Volume control not available in browser — inform the user
      return { success: false, message: `Volume ${direction} is only available in the desktop version.` };
    },

    minimizeWindow: async () => { /* no-op in browser */ },
    maximizeWindow: async () => { /* no-op in browser */ },
    closeWindow: async () => { /* no-op in browser */ },

    onToggleListen: (callback) => {
      // Keyboard shortcut handled in App.tsx
      void callback;
    },
  };
}
