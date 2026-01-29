# Chottu Desktop App Setup

## Prerequisites

1. Install Rust: https://rustup.rs/
2. Install Tauri CLI: `cargo install tauri-cli`
3. Node.js and npm already installed

## Development Setup

### 1. Start Core Server
```bash
cd server
npm install
npm start
# Server runs on http://localhost:3001
```

### 2. Start Local Agent (Optional)
```bash
npm run local-agent
# Agent runs on http://127.0.0.1:3002
```

### 3. Start Desktop App
```bash
npm run tauri:dev
# Desktop app opens with web UI
```

## Production Build

```bash
npm run tauri:build
# Creates installer in src-tauri/target/release/bundle/
```

## Desktop Features

- **System Tray**: Right-click for menu
- **Global Hotkey**: Ctrl+Space to show/hide
- **Settings**: Configure server URL and device pairing
- **Secure Storage**: Device tokens stored in OS keychain

## Pairing Process

1. Open desktop app settings
2. Set server URL (e.g., http://192.168.1.20:3001)
3. Get pairing code from web UI at server URL
4. Enter code and device name
5. Click "Pair" to authenticate

## Environment Variables

Create `.env` in server directory:
```
AUTH_REQUIRED=true
VITE_GEMINI_API_KEY=your_key_here
```

Set `AUTH_REQUIRED=false` for local development only.

## Security Notes

- Device tokens stored securely in OS keychain
- Local agent only accepts localhost connections
- All system commands go through allowlist
- Audit log tracks all local agent calls

## Troubleshooting

- **Rust not found**: Install from https://rustup.rs/
- **Build fails**: Run `cargo clean` in src-tauri/
- **Tray not working**: Restart desktop app
- **Pairing fails**: Check server URL and network connectivity