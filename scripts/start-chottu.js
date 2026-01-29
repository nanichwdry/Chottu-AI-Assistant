import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverDir = join(__dirname, '..', 'server');

function startDetached(script, cwd) {
  const child = spawn('node', [script], {
    cwd,
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
  return child.pid;
}

console.log('Starting Chottu services...');

const backendPid = startDetached('index.js', serverDir);
console.log(`Backend started (PID: ${backendPid})`);

const agentPid = startDetached(join('services', 'local-agent.js'), serverDir);
console.log(`Local agent started (PID: ${agentPid})`);

console.log('All services running');
