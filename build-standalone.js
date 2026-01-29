import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Building Chottu standalone installer...');

// Build frontend
console.log('1. Building frontend...');
execSync('npm run build', { stdio: 'inherit' });

// Copy server files to Tauri resources
console.log('2. Bundling backend...');
const resourcesDir = path.join(__dirname, 'src-tauri', 'resources');
if (!fs.existsSync(resourcesDir)) fs.mkdirSync(resourcesDir, { recursive: true });

// Copy server directory
const serverDir = path.join(__dirname, 'server');
const targetServerDir = path.join(resourcesDir, 'server');
if (fs.existsSync(targetServerDir)) fs.rmSync(targetServerDir, { recursive: true });
fs.cpSync(serverDir, targetServerDir, { recursive: true });

// Copy node_modules for server
console.log('3. Installing server dependencies...');
execSync('npm install --production', { cwd: targetServerDir, stdio: 'inherit' });

// Build Tauri app
console.log('4. Building desktop installer...');
execSync('npm run tauri:build', { stdio: 'inherit' });

console.log('\n✓ Build complete! Installer at: src-tauri/target/release/bundle/');
