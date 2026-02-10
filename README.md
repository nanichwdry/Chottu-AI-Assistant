# Aura AI Assistant (Aura Edition)

Your personal AI assistant with voice control and full PC access.

## 🆕 Aura Executor (NEW)

Aura is a unified task execution system inspired by OpenClaw's gateway pattern. It provides:
- **Unified Pipeline**: Same execution path for message and voice inputs
- **Tool Allowlist**: Strict security with default-deny tool execution
- **Session Management**: Conversation continuity across interactions
- **Audit Logging**: Full trace of all tool executions

**Enable Aura**: Set `AURA_EXECUTOR=true` in `server/.env`

📚 **Documentation**:
- [Architecture](AURA_ARCHITECTURE.md)
- [Operations Guide](AURA_RUNBOOK.md)
- [Implementation Details](AURA_IMPLEMENTATION.md)
- [Delivery Summary](AURA_DELIVERY.md)

## Features

🎤 **Voice Interaction**
- Real-time voice conversations using Gemini 2.5 Flash
- Sub-second response times
- Natural language understanding

🧠 **Persistent Memory**
- Remembers your name, preferences, and conversations
- SQLite database storage
- Never forgets what you tell it

💻 **Full PC Control**
- Open applications (Chrome, Notepad, VS Code)
- File operations (create, delete, search)
- System commands
- Process management

📧 **Email Integration**
- Gmail support
- Read and search emails
- Inbox summaries

💼 **LinkedIn Integration**
- Check notifications
- Read messages
- View connections

🔒 **Security**
- All commands audited
- Local agent with token authentication
- Sandboxed file operations
- Confirmation required for destructive actions

## Quick Start

### Prerequisites
- Node.js 18+
- Windows 10/11

### Installation

1. **Clone repository**
```bash
git clone <your-repo-url>
cd "Chottu AI Assistant"
```

2. **Install dependencies**
```bash
npm install
cd server
npm install
```

3. **Configure environment**
```bash
# Copy .env.example to .env in server folder
cp server/.env.example server/.env

# Edit server/.env and add:
VITE_GEMINI_API_KEY=your_gemini_api_key
CHOTU_AGENT_TOKEN=your_random_secure_token
```

4. **Start services**

Terminal 1 - Frontend:
```bash
npm run dev
```

Terminal 2 - Backend:
```bash
cd server
npm start
```

Terminal 3 - Local Agent:
```bash
cd server
node services/local-agent.js
```

5. **Open browser**
```
http://localhost:5173
```

## Usage

### Voice Commands

**PC Control:**
- "Open Notepad"
- "Open Chrome"
- "Open VS Code"
- "Open Gmail"
- "Open GitHub"
- "Search for my documents"

**Memory:**
- "My name is John"
- "Remember I like coffee"
- "What's my name?"

**System:**
- "List running processes"
- "Get system info"

### Desktop App

Build standalone desktop app:
```bash
npm run build
npm run tauri build
```

Installer location:
```
src-tauri\target\release\bundle\msi\
```

## Project Structure

```
Chottu AI Assistant/
├── App.tsx                 # Main React app
├── components/             # UI components
│   ├── Avatar.tsx
│   ├── Settings.tsx
│   └── Visualizer.tsx
├── server/                 # Backend
│   ├── index.js           # Express server
│   ├── routes/            # API routes
│   ├── middleware/        # Auth middleware
│   ├── integrations/      # Gmail, LinkedIn
│   └── services/
│       └── local-agent.js # PC control agent
├── scripts/               # Build scripts
└── src-tauri/            # Desktop app
```

## API Endpoints

### Backend (Port 3001)
- `POST /api/memory` - Save memory
- `GET /api/memory` - Get memories
- `POST /api/history` - Save conversation
- `GET /api/history` - Get history
- `POST /pair/start` - Start device pairing
- `POST /pair/confirm` - Confirm pairing

### PC Control (Port 3001)
- `POST /api/pc/execute` - Execute PC command
- `POST /api/pc/nl` - Natural language PC command

### Local Agent (Port 8787)
- `POST /tool/run` - Execute tool
- `GET /health` - Health check

## Security

- **Agent Token**: Required for all PC control operations
- **Allowlists**: Only whitelisted apps and URLs can be opened
- **Path Sandboxing**: File operations restricted to allowed directories
- **Audit Logging**: All commands logged to `server/local-agent-audit.log`
- **Confirmation**: Destructive actions require explicit confirmation

## Configuration

### Allowed Apps
Edit `server/services/local-agent.js`:
```javascript
const APPS = {
  notepad: { type: "exe", value: "notepad.exe" },
  chrome: { type: "exe", value: "chrome.exe" },
  // Add more apps
};
```

### Allowed URLs
```javascript
const URLS = {
  gmail: "https://mail.google.com",
  github: "https://github.com",
  // Add more URLs
};
```

### Allowed Paths
```javascript
const ALLOWED_ROOTS = [
  "C:\\Users\\YourName\\Documents",
  "C:\\Projects"
];
```

## Development

### Run in dev mode
```bash
npm run dev
```

### Build for production
```bash
npm run build
```

### Run tests
```bash
npm test
```

## Troubleshooting

**Services not starting:**
- Check Node.js is installed and in PATH
- Verify ports 3001, 5173, 8787 are available

**Voice not working:**
- Check microphone permissions
- Verify Gemini API key is set

**PC control not working:**
- Ensure local agent is running
- Check `CHOTU_AGENT_TOKEN` is set
- Verify audit log for errors

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Powered by Google Gemini 2.5 Flash
- Built with React, Vite, Express, Tauri
- Voice UI inspired by modern AI assistants

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review documentation

---

Made with ❤️ by NaniChwdry(Mukharji V)....
