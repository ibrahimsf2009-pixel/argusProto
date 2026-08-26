# ARGUS — Futuristic Desktop AI Assistant (Web Version)

A futuristic personal computer assistant with a glowing yellow AI core, voice commands, camera gesture recognition, and intelligent responses — running in your browser.

🔗 **Live Demo:** [argus-proto.vercel.app](https://argus-proto.vercel.app)

---

## Features

### 🧠 AI Brain
- OpenAI GPT integration for intelligent responses
- Natural language command understanding
- General questions, reasoning, coding help
- API key stored locally in your browser (never hardcoded)

### 🎨 Futuristic Interface
- Electric yellow/amber theme on dark background
- Animated AI core orb with pulse, listen, think, speak states
- Glassmorphism effects and ambient particles
- Smooth transitions and state indicators

### 💬 Chat Interface
- Text commands with natural language
- Action status indicators (executing, success, failed)
- Quick command suggestions
- Timestamped message history

### 🌐 Website Control
- Open 14+ popular websites via voice or text
- Secure URL mapping (no arbitrary URL opening)
- Search YouTube, Google, Reddit, GitHub
- All URLs validated and encoded

### 📷 Camera & Gestures (WebRTC)
- Optional webcam gesture recognition via MediaPipe Hands
- Hand landmark visualization with glowing overlay
- Gesture detection: Open Palm, Thumbs Up/Down, Point Left/Right, Fist
- Camera data never leaves your computer

### 🔊 Voice
- Text-to-speech responses (browser TTS)
- Speech-to-Text voice input (Web Speech API)
- Keyboard shortcut activation (Ctrl+Space)

### 🔒 Security
- No arbitrary shell execution
- No file system access
- No credential access
- No silent recording
- Camera and mic are optional

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Bundler | Vite 5 |
| AI | OpenAI API (fetch) |
| Vision | MediaPipe Hands (CDN) + WebRTC |
| Voice | Web Speech API |
| Storage | localStorage |
| Hosting | Vercel |

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Opens at `http://localhost:5173`

### 3. Build for Production

```bash
npm run build
```

Output in `dist/`

---

## Usage

### Basic Commands

| Command | Action |
|---------|--------|
| "Open YouTube" | Opens YouTube in new tab |
| "What time is it?" | Tells you the current time |
| "Search YouTube for coding tutorials" | Opens YouTube search |
| "What is React?" | Sends question to AI |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Space` | Toggle listening mode |
| `Enter` | Send message |
| `Escape` | Cancel confirmation |

### Gestures (when camera is enabled)

| Gesture | Action |
|---------|--------|
| Open Palm | Toggle interface |
| Thumbs Up | Confirm action |
| Thumbs Down | Cancel action |
| Point Left/Right | Navigate |
| Fist | Toggle listening |

---

## Configuration

Settings are stored in your browser's localStorage.

| Setting | Default | Description |
|---------|---------|-------------|
| `aiProvider` | openai | AI provider to use |
| `apiKey` | (empty) | OpenAI API key |
| `voiceEnabled` | true | Text-to-speech |
| `cameraEnabled` | false | Camera gestures |
| `gestureSensitivity` | 0.7 | Gesture confidence |

---

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Or connect your GitHub repo to Vercel for automatic deployments.

---

## Project Structure

```
argusProto/
├── src/
│   ├── api/
│   │   └── browser-api.ts    # Browser API shim (replaces Electron IPC)
│   ├── components/
│   │   ├── Camera/           # Camera vision + gesture recognition
│   │   ├── Chat/             # Chat interface with speech input
│   │   ├── Confirmation/     # Confirmation dialogs
│   │   ├── Orb/              # Animated AI core visualization
│   │   ├── Settings/         # Settings panel
│   │   ├── Setup/            # First-run wizard
│   │   ├── Startup/          # Boot animation
│   │   ├── StatusBar.tsx     # Bottom status bar
│   │   └── TitleBar.tsx      # Top navigation bar
│   ├── styles/
│   │   └── global.css        # Futuristic theme
│   ├── types.ts              # TypeScript types
│   ├── App.tsx               # Root component
│   └── main.tsx              # Entry point
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vercel.json
└── README.md
```

---

## Safety

ARGUS follows a **SMART BRAIN + STRICT TOOLS** philosophy:

- ✅ AI handles reasoning and natural language
- ✅ Camera and microphone are opt-in
- ✅ No file system access
- ✅ No credential access
- ✅ No silent recording
- ✅ User always remains in control

---

**ARGUS** — Smart Brain + Strict Tools + Explicit Permissions + User Confirmation
