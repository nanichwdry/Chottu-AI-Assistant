# Chottu Desktop App - Build Instructions

## Prerequisites
- Node.js installed
- Rust installed (https://rustup.rs/)
- All dependencies installed

## Build Steps

### 1. Install Tauri CLI
```powershell
npm install
```

### 2. Build Frontend
```powershell
npm run build
```

### 3. Build Desktop App
```powershell
npm run tauri build
```

### 4. Find Installer
Location: `src-tauri\target\release\bundle\msi\Chottu AI Assistant_1.0.0_x64_en-US.msi`

## Testing

### Dev Mode
```powershell
npm run tauri dev
```

### Production Install
1. Double-click the `.msi` file
2. Follow installation wizard
3. Launch "Chottu AI Assistant" from Start Menu
4. App opens with UI
5. Test voice command: "open notepad"

## What Happens on Launch
1. Desktop app starts
2. Launcher script spawns backend (port 3001)
3. Launcher script spawns local agent (port 8787)
4. Window loads UI from localhost:5173
5. All features work as before

## Troubleshooting
- If services don't start, check Node.js is in PATH
- If UI doesn't load, wait 5 seconds and refresh
- Check `server/local-agent-audit.log` for PC control logs
