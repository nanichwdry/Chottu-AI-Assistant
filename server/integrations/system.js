import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function executeCommand(command) {
  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
    return { success: true, output: stdout || stderr };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function searchFiles(query) {
  const isWindows = process.platform === 'win32';
  const cmd = isWindows 
    ? `dir /s /b *${query}* 2>nul` 
    : `find ~ -name "*${query}*" 2>/dev/null | head -20`;
  
  return await executeCommand(cmd);
}
