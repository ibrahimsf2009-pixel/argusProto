import React, { useState, useEffect, useCallback } from 'react';
import { AppState, ChatMessage, ArgusConfig, View, ActionInfo, GestureResult } from './types';
import TitleBar from './components/TitleBar';
import OrbView from './components/Orb/OrbView';
import ChatPanel from './components/Chat/ChatPanel';
import SettingsPanel from './components/Settings/SettingsPanel';
import ConfirmationDialog from './components/Confirmation/ConfirmationDialog';
import StartupScreen from './components/Startup/StartupScreen';
import FirstRunSetup from './components/Setup/FirstRunSetup';
import StatusBar from './components/StatusBar';
import CameraView from './components/Camera/CameraView';

// ─── AI Intent Parser ─────────────────────────────────────────────────────
interface ParsedCommand {
  action: 'website' | 'search' | 'ai';
  target: string;
  searchQuery?: string;
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

// ─── OpenAI Call ───────────────────────────────────────────────────────────
async function callOpenAI(apiKey: string, userMessage: string, history: ChatMessage[]): Promise<string> {
  const systemPrompt = `You are ARGUS, a futuristic AI desktop assistant. You are intelligent, calm, fast, and concise. You help users with questions, open websites, and provide guidance. Keep responses brief unless the user asks for detail. You are running as a web application in the user's browser.`;

  const chatHistory = history.slice(-20).map(m => ({
    role: m.role === 'argus' ? 'assistant' as const : 'user' as const,
    content: m.content,
  }));

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
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

  const addMessage = useCallback((role: 'user' | 'argus', content: string, action?: ActionInfo, isError?: boolean) => {
    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role, content, timestamp: Date.now(), action, isError,
    };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);

  const argusRespond = useCallback((text: string, action?: ActionInfo, isError?: boolean) => {
    setAppState('speaking');
    addMessage('argus', text, action, isError);
    if (config?.voiceEnabled && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;
      utterance.onend = () => setAppState('idle');
      utterance.onerror = () => setAppState('idle');
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setAppState('idle'), 800);
    }
  }, [config, addMessage]);

  const executeCommand = useCallback(async (text: string) => {
    setAppState('thinking');
    addMessage('user', text);
    await new Promise(r => setTimeout(r, 400));

    const parsed = parseInput(text);

    switch (parsed.action) {
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
            const response = await callOpenAI(config.apiKey, text, messages);
            argusRespond(response);
          } else {
            argusRespond('No AI provider configured. Please add your API key in Settings to enable intelligent responses.');
          }
        } catch (err: any) {
          argusRespond(`I'm unable to reach the AI service right now. ${err.message || ''}`, undefined, true);
        }
        break;
      }
      default:
        argusRespond("I'm not sure how to help with that. Try asking me to open a website or ask a question.");
    }
  }, [addMessage, argusRespond, config, messages]);

  // ─── Gesture handler ─────────────────────────────────────────────────
  const handleGestureDetected = useCallback((gesture: GestureResult) => {
    switch (gesture.gesture) {
      case 'thumbs_up':
        if (pendingConfirmation) {
          pendingConfirmation.resolve(true);
          setPendingConfirmation(null);
          addMessage('argus', 'Thumbs up — action confirmed.');
        } else {
          argusRespond('Thumbs up detected. No pending action to confirm.');
        }
        break;
      case 'thumbs_down':
        if (pendingConfirmation) {
          pendingConfirmation.resolve(false);
          setPendingConfirmation(null);
          addMessage('argus', 'Thumbs down — action cancelled.');
        } else {
          argusRespond('Thumbs down detected. No pending action to cancel.');
        }
        break;
      case 'open_palm':
      case 'fist':
        setMicActive(prev => !prev);
        addMessage('argus', `${gesture.gesture === 'open_palm' ? 'Open palm' : 'Fist'} detected — toggling listen mode.`);
        break;
      default:
        break;
    }
  }, [pendingConfirmation, addMessage, argusRespond]);

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
          aiProvider: 'openai', apiKey: '', voiceEnabled: true,
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

  return (
    <div className="app-layout">
      <TitleBar
        view={view}
        onSettingsClick={() => setView(view === 'settings' ? 'main' : 'settings')}
        onCameraClick={() => setView(view === 'camera' ? 'main' : 'camera')}
      />

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
        ) : view === 'camera' ? (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <CameraView
              enabled={cameraActive}
              onGestureDetected={handleGestureDetected}
            />
            <ChatPanel
              messages={messages}
              appState={appState}
              onSend={executeCommand}
              onToggleMic={() => setMicActive(prev => !prev)}
              micActive={micActive}
            />
          </div>
        ) : (
          <>
            <OrbView state={appState} />
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
