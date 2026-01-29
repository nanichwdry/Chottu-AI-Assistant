const AGENT_URL = 'http://127.0.0.1:8787/tool/run';
const AGENT_TOKEN = process.env.CHOTU_AGENT_TOKEN;

const SAFE_TOOLS = [
  'open_app', 'open_url', 'open_url_id', 'open_project',
  'search_files', 'reveal_file', 'create_file', 'create_folder',
  'get_system_info', 'list_processes'
];

const DESTRUCTIVE_TOOLS = ['delete_file', 'delete_folder', 'kill_process'];

const NL_MAP = {
  'open notepad': { tool_name: 'open_app', args: { app_id: 'notepad' } },
  'open chrome': { tool_name: 'open_app', args: { app_id: 'chrome' } },
  'open vscode': { tool_name: 'open_app', args: { app_id: 'vscode' } },
  'open gmail': { tool_name: 'open_url_id', args: { id: 'gmail' } },
  'open calendar': { tool_name: 'open_url_id', args: { id: 'calendar' } },
  'open linkedin': { tool_name: 'open_url_id', args: { id: 'linkedin' } },
  'open git': { tool_name: 'open_url_id', args: { id: 'github' } },
  'open github': { tool_name: 'open_url_id', args: { id: 'github' } },
  'open chotu project': { tool_name: 'open_project', args: { project_id: 'chotu' } },
  'open careerflow project': { tool_name: 'open_project', args: { project_id: 'careerflow' } }
};

export function setupPcControlRoutes(app) {
  app.post('/api/pc/execute', async (req, res) => {
    const { tool_name, args, confirm } = req.body;

    if (!AGENT_TOKEN) {
      return res.status(500).json({ ok: false, error: 'Agent token not configured' });
    }

    if (!SAFE_TOOLS.includes(tool_name) && !DESTRUCTIVE_TOOLS.includes(tool_name)) {
      return res.status(403).json({ ok: false, error: 'Tool not allowed' });
    }

    if (DESTRUCTIVE_TOOLS.includes(tool_name) && !confirm) {
      return res.status(400).json({ ok: false, error: 'Confirmation required for destructive action' });
    }

    try {
      const headers = { 'Content-Type': 'application/json', 'x-agent-token': AGENT_TOKEN };
      if (confirm) headers['x-confirm'] = 'YES';

      const response = await fetch(AGENT_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ tool_name, args })
      });

      const data = await response.json();
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post('/api/pc/nl', async (req, res) => {
    const { text, confirm } = req.body;
    const normalized = String(text || '').toLowerCase().trim();

    const match = NL_MAP[normalized];
    if (!match) {
      return res.json({ ok: false, error: 'No PC action matched' });
    }

    try {
      const headers = { 'Content-Type': 'application/json', 'x-agent-token': AGENT_TOKEN };
      if (confirm) headers['x-confirm'] = 'YES';

      const response = await fetch(AGENT_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(match)
      });

      const data = await response.json();
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });
}
