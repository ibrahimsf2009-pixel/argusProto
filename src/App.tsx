import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, ChatMessage, ArgusConfig, View, ActionInfo, GestureResult, HandPosition } from './types';
import TitleBar from './components/TitleBar';
import OrbView from './components/Orb/OrbView';
import ChatPanel from './components/Chat/ChatPanel';
import SettingsPanel from './components/Settings/SettingsPanel';
import ConfirmationDialog from './components/Confirmation/ConfirmationDialog';
import StartupScreen from './components/Startup/StartupScreen';
import FirstRunSetup from './components/Setup/FirstRunSetup';
import StatusBar from './components/StatusBar';
import CameraView from './components/Camera/CameraView';
import GestureGuide from './components/Gestures/GestureGuide';

// ─── AI Intent Parser ─────────────────────────────────────────────────────
interface ParsedCommand {
  action: 'website' | 'search' | 'ai' | 'system';
  target: string;
  searchQuery?: string;
  systemCommand?: 'shutdown' | 'restart' | 'sleep';
}

const WEBSITE_MAP: Record<string, string> = {
  youtube: 'youtube', instagram: 'instagram', facebook: 'facebook',
  discord: 'discord', reddit: 'reddit', whatsapp: 'whatsapp',
  google: 'google', gmail: 'gmail', github: 'github',
  chatgpt: 'chatgpt', maps: 'maps', 'google maps': 'maps',
  spotify: 'spotify', linkedin: 'linkedin', twitter: 'twitter', x: 'twitter',
};

function parseInput(text: string): ParsedCommand {
  const lower = text.toLowerCase().trim();

  // System power commands
  if (lower.match(/\b(shut\s*down|shutdown|power\s*off|turn\s*off)\b/)) {
    return { action: 'system', target: 'shutdown', systemCommand: 'shutdown' };
  }
  if (lower.match(/\b(restart|reboot|restart\s*(the\s*)?(pc|computer|laptop|system|machine))\b/)) {
    return { action: 'system', target: 'restart', systemCommand: 'restart' };
  }
  if (lower.match(/\b(sleep|go\s*to\s*sleep|put\s*(to\s*)?sleep|hibernate)\b/)) {
    return { action: 'system', target: 'sleep', systemCommand: 'sleep' };
  }

  // Search patterns
  const ytSearchMatch = lower.match(/(?:search|look up|find)\s+(.+?)\s+(?:on|in|at)\s+youtube/);
  const youtubeSearchMatch = lower.match(/youtube\s+(?:for|search|look up)\s+(.+)/);
  if (ytSearchMatch) return { action: 'search', target: 'youtube', searchQuery: ytSearchMatch[1].trim() };
  if (youtubeSearchMatch) return { action: 'search', target: 'youtube', searchQuery: youtubeSearchMatch[1].trim() };

  // Open website patterns
  const openMatch = lower.match(/(?:open|go to|launch|start)\s+(.+)/);
  if (openMatch) {
    const target = openMatch[1].trim();
    const ytMatch = target.match(/youtube\s+(?:for|search|look up|and search)\s+(.+)/);
    if (ytMatch) return { action: 'search', target: 'youtube', searchQuery: ytMatch[1].trim() };

    for (const [key, value] of Object.entries(WEBSITE_MAP)) {
      if (target.includes(key)) return { action: 'website', target: value };
    }
  }

  // Default: send to AI
  return { action: 'ai', target: lower };
}

// ─── AI Call (supports OpenAI and Groq) ───────────────────────────────────
const PROVIDER_CONFIG: Record<string, { url: string; model: string }> = {
  openai: { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-3.5-turbo' },
  groq: { url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.1-8b-instant' },
};

async function callAI(provider: string, apiKey: string, userMessage: string, history: ChatMessage[]): Promise<string> {
  const systemPrompt = `You are ARGUS, a futuristic AI desktop assistant. You are intelligent, calm, fast, and concise. You help users with questions, open websites, and provide guidance. Keep responses brief unless the user asks for detail. You are running as a web application in the user's browser.`;

  const chatHistory = history.slice(-20).map(m => ({
    role: m.role === 'argus' ? 'assistant' as const : 'user' as const,
    content: m.content,
  }));

  const cfg = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.openai;

  const response = await fetch(cfg.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory,
        { role: 'user', content: userMessage },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No response received.';
}

const PANEL_ORDER: Array<Exclude<View, 'main'>> = ['camera', 'gestures', 'settings'];

// ─── Main App ──────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('startup');
  const [view, setView] = useState<View>('main');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [config, setConfig] = useState<ArgusConfig | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    message: string;
    action: string;
    resolve: (confirmed: boolean) => void;
  } | null>(null);
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [handPosition, setHandPosition] = useState<HandPosition | null>(null);
  const [sleepMode, setSleepMode] = useState(false);
  const messagesRef = useRef<ChatMessage[]>([]);

  // Keep a ref to latest messages so executeCommand can stay dependency-stable
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const addMessage = useCallback((role: 'user' | 'argus', content: string, action?: ActionInfo, isError?: boolean) => {
    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role, content, timestamp: Date.now(), action, isError,
    };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);

  // Pick a smooth male voice from available voices
  const selectMaleVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    // Prefer these male voices in order
    const preferred = [
      'Google UK English Male',
      'Microsoft David',
      'Microsoft Mark',
      'Daniel',
      'Alex',
    ];
    for (const name of preferred) {
      const found = voices.find(v => v.name.includes(name));
      if (found) return found;
    }
    // Fallback: find any English male voice
    const englishMale = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('male'));
    if (englishMale) return englishMale;
    // Fallback: any English voice
    return voices.find(v => v.lang.startsWith('en')) ?? null;
  }, []);

  const argusRespond = useCallback((text: string, action?: ActionInfo, isError?: boolean) => {
    setAppState('speaking');
    addMessage('argus', text, action, isError);
    if (config?.voiceEnabled && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = selectMaleVoice();
      if (voice) utterance.voice = voice;
      utterance.rate = 1.0;
      utterance.pitch = 0.85;
      utterance.volume = 0.9;
      utterance.onend = () => setAppState('idle');
      utterance.onerror = () => setAppState('idle');
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setAppState('idle'), 800);
    }
  }, [config, addMessage, selectMaleVoice]);

  const executeCommand = useCallback(async (text: string) => {
    setAppState('thinking');
    addMessage('user', text);
    await new Promise(r => setTimeout(r, 400));

    const parsed = parseInput(text);

    switch (parsed.action) {
      case 'system': {
        setAppState('executing');
        const cmd = parsed.systemCommand!;
        const cmdLabels = { shutdown: 'Shut Down', restart: 'Restart', sleep: 'Sleep' };
        addMessage('argus', `Preparing to ${cmdLabels[cmd]}...`, { type: 'system', name: cmdLabels[cmd], status: 'executing' });
        await new Promise(r => setTimeout(r, 500));
        if (cmd === 'shutdown') {
          const confirmed = await new Promise<boolean>(resolve =>
            setPendingConfirmation({ message: 'Shut down Argus? This closes the application.', action: cmd, resolve })
          );
          if (!confirmed) {
            addMessage('argus', 'Shut down cancelled.', { type: 'system', name: 'Shut Down', status: 'cancelled' });
            setAppState('idle');
            break;
          }
          const result = await window.argusAPI.shutdown();
          addMessage('argus', result.message, { type: 'system', name: 'Shut Down', status: 'success' });
        } else if (cmd === 'restart') {
          const confirmed = await new Promise<boolean>(resolve =>
            setPendingConfirmation({ message: 'Restart Argus? The application will reload.', action: cmd, resolve })
          );
          if (!confirmed) {
            addMessage('argus', 'Restart cancelled.', { type: 'system', name: 'Restart', status: 'cancelled' });
            setAppState('idle');
            break;
          }
          const result = await window.argusAPI.restart();
          addMessage('argus', result.message, { type: 'system', name: 'Restart', status: 'success' });
        } else if (cmd === 'sleep') {
          const result = await window.argusAPI.sleep();
          addMessage('argus', result.message, { type: 'system', name: 'Sleep', status: 'success' });
          // Show sleep overlay
          setSleepMode(true);
        }
        setAppState('idle');
        break;
      }
      case 'website': {
        setAppState('executing');
        addMessage('argus', `Opening ${parsed.target}.`, { type: 'website', name: parsed.target, status: 'executing' });
        const result = await window.argusAPI.openWebsite(parsed.target);
        addMessage('argus', result.message, { type: 'website', name: parsed.target, status: result.success ? 'success' : 'failed' });
        setAppState('idle');
        break;
      }
      case 'search': {
        setAppState('executing');
        addMessage('argus', `Searching ${parsed.target} for "${parsed.searchQuery}".`, { type: 'search', name: parsed.target, status: 'executing' });
        const result = await window.argusAPI.openWebsite(parsed.target, parsed.searchQuery);
        addMessage('argus', result.message, { type: 'search', name: parsed.target, status: result.success ? 'success' : 'failed' });
        setAppState('idle');
        break;
      }
      case 'ai': {
        setAppState('thinking');
        try {
          if (config?.apiKey) {
            const response = await callAI(config.aiProvider, config.apiKey, text, messagesRef.current);
            argusRespond(response);
          } else {
            const providerName = config?.aiProvider === 'groq' ? 'Groq' : 'OpenAI';
            argusRespond(`No API key configured. Go to Settings and add your ${providerName} API key. Get a free key at ${config?.aiProvider === 'groq' ? 'console.groq.com' : 'platform.openai.com'}.`, undefined, true);
          }
        } catch (err: any) {
          const msg = err.message || '';
          const provider = config?.aiProvider || 'openai';
          if (msg.includes('Incorrect API key') || msg.includes('invalid') || msg.includes('401')) {
            const link = provider === 'groq' ? 'console.groq.com/keys' : 'platform.openai.com/account/api-keys';
            argusRespond(`Invalid API key. Make sure you pasted the correct ${provider === 'groq' ? 'Groq' : 'OpenAI'} key. Get one at ${link}`, undefined, true);
          } else if (msg.includes('no credits') || msg.includes('billing') || msg.includes('429')) {
            argusRespond('No credits remaining. Switch to Groq (free) in Settings, or add credits at platform.openai.com/settings/organization/billing.', undefined, true);
          } else {
            argusRespond(`AI service error: ${msg}`, undefined, true);
          }
        }
        break;
      }
      default:
        argusRespond("I'm not sure how to help with that. Try asking me to open a website or ask a question.");
    }
  }, [addMessage, argusRespond, config]);

  // ─── Gesture handler — hand commands control the assistant ───────────
  const handleGestureDetected = useCallback((gesture: GestureResult) => {
    switch (gesture.gesture) {
      case 'thumbs_up':
        if (pendingConfirmation) {
          pendingConfirmation.resolve(true);
          setPendingConfirmation(null);
        }
        break;
      case 'thumbs_down':
        if (pendingConfirmation) {
          pendingConfirmation.resolve(false);
          setPendingConfirmation(null);
        }
        break;
      case 'fist':
        // Silence — stop Argus mid-sentence / stop speaking
        if (micActive) setMicActive(false);
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        setAppState('idle');
        break;
      case 'open_palm':
        // Wake — leave sleep mode
        setSleepMode(false);
        break;
      case 'point_right':
      case 'point_left': {
        // Cycle through panels: camera → gestures → settings
        setView(prevView => {
          const idx = PANEL_ORDER.indexOf(prevView as Exclude<View, 'main'>);
          if (idx === -1) {
            // From main view, pointing opens the first panel (or last when pointing left)
            return gesture.gesture === 'point_right' ? PANEL_ORDER[0] : PANEL_ORDER[PANEL_ORDER.length - 1];
          }
          const next = gesture.gesture === 'point_right'
            ? (idx + 1) % PANEL_ORDER.length
            : (idx - 1 + PANEL_ORDER.length) % PANEL_ORDER.length;
          return PANEL_ORDER[next];
        });
        break;
      }
      default:
        break;
    }
  }, [pendingConfirmation, micActive]);

  // ─── Startup ───────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const firstRun = await window.argusAPI.isFirstRun();
        setIsFirstRun(firstRun);
        const cfg = await window.argusAPI.getConfig();
        setConfig(cfg);
        if (firstRun) {
          setAppState('setup');
        } else {
          setAppState('startup');
          setTimeout(() => setAppState('idle'), 3500);
        }
      } catch {
        setAppState('startup');
        setConfig({
          aiProvider: 'groq', apiKey: '', voiceEnabled: true,
          cameraEnabled: false, gestureSensitivity: 0.7, theme: 'dark',
          startupBehavior: 'launch', wakeShortcut: 'Ctrl+Space',
        });
        setTimeout(() => setAppState('idle'), 3500);
      }
    };
    init();
  }, []);

  // ─── Keyboard shortcut (Ctrl+Space) ──────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        setMicActive(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─── Sync camera state with config ────────────────────────────────────
  useEffect(() => {
    if (config) {
      setCameraActive(config.cameraEnabled);
    }
  }, [config]);

  // ─── Render ────────────────────────────────────────────────────────────
  if (appState === 'startup') return <StartupScreen />;

  if (isFirstRun && appState === 'setup') {
    return (
      <FirstRunSetup
        onComplete={async () => {
          await window.argusAPI.completeSetup();
          setIsFirstRun(false);
          setAppState('startup');
          setTimeout(() => setAppState('idle'), 3500);
        }}
      />
    );
  }

  // Sleep mode overlay
  if (sleepMode) {
    return (
      <div
        onClick={() => setSleepMode(false)}
        onKeyDown={() => setSleepMode(false)}
        tabIndex={0}
        style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: '#000', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          zIndex: 9999, outline: 'none',
        }}
      >
        <div style={{
          fontSize: 18, fontFamily: 'var(--font-display)', letterSpacing: 6,
          color: 'rgba(200, 255, 50, 0.3)', marginBottom: 16,
        }}>ARGUS</div>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '2px solid rgba(200, 255, 50, 0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'status-pulse 2s ease-in-out infinite',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(200, 255, 50, 0.4)' }} />
        </div>
        <div style={{
          marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,0.2)',
          fontFamily: 'var(--font-mono)', letterSpacing: 2,
        }}>Click anywhere to wake</div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <TitleBar
        view={view}
        onSettingsClick={() => setView(view === 'settings' ? 'main' : 'settings')}
        onCameraClick={() => setView(view === 'camera' ? 'main' : 'camera')}
        onGesturesClick={() => setView(view === 'gestures' ? 'main' : 'gestures')}
      />

      {/* Hidden hand-tracking detector — always active when camera enabled */}
      {cameraActive && (
        <CameraView
          enabled={cameraActive}
          onGestureDetected={handleGestureDetected}
          onHandPosition={setHandPosition}
        />
      )}

      <div className="app-body">
        {view === 'settings' ? (
          <SettingsPanel
            config={config}
            onConfigChange={async (newConfig) => {
              await window.argusAPI.saveConfig(newConfig);
              setConfig(prev => prev ? { ...prev, ...newConfig } : null);
            }}
            onClose={() => setView('main')}
          />
        ) : view === 'gestures' ? (
          <GestureGuide
            cameraEnabled={!!config?.cameraEnabled}
            onClose={() => setView('main')}
          />
        ) : (
          <>
            <OrbView state={appState} handPosition={handPosition} />
            <ChatPanel
              messages={messages}
              appState={appState}
              onSend={executeCommand}
              onToggleMic={() => setMicActive(prev => !prev)}
              micActive={micActive}
            />
          </>
        )}
      </div>

      <StatusBar appState={appState} cameraActive={cameraActive} micActive={micActive} />

      {pendingConfirmation && (
        <ConfirmationDialog
          message={pendingConfirmation.message}
          onConfirm={() => { pendingConfirmation.resolve(true); setPendingConfirmation(null); }}
          onCancel={() => { pendingConfirmation.resolve(false); setPendingConfirmation(null); }}
        />
      )}
    </div>
  );
};

export default App;
