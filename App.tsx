
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage, Type, FunctionDeclaration } from '@google/genai';
import { Mic, MicOff, Terminal as TerminalIcon, Settings as SettingsIcon, MessageSquare, History, Clipboard, X, Check, Mail, Linkedin, Laptop, Zap, ShieldCheck, Activity, Cpu } from 'lucide-react';
import { AssistantStatus, Message } from './types';
import { decode, decodeAudioData, createBlob } from './utils/audio';
import Visualizer from './components/Visualizer';
import Settings from './components/Settings';
import DesktopSettings from './src/components/DesktopSettings';

/** 
 * PRODUCTION-READY TOOL DEFINITIONS
 * These are the blueprints Chottu uses to 'act' on your behalf.
 */
const emailTool: FunctionDeclaration = {
  name: 'manage_emails',
  parameters: {
    type: Type.OBJECT,
    description: 'Direct integration with Outlook/Gmail. Use this to fetch, read, or summarize emails.',
    properties: {
      action: { type: Type.STRING, enum: ['search', 'read', 'summarize'], description: 'Action to perform' },
      query: { type: Type.STRING, description: 'Keywords, sender name, or subject line' }
    },
    required: ['action']
  }
};

const linkedInTool: FunctionDeclaration = {
  name: 'check_linkedin',
  parameters: {
    type: Type.OBJECT,
    description: 'Accesses LinkedIn API for notifications, private messages, or connection management.',
    properties: {
      scope: { type: Type.STRING, enum: ['notifications', 'messages', 'network'], description: 'Target area' }
    },
    required: ['scope']
  }
};

const systemTool: FunctionDeclaration = {
  name: 'os_command',
  parameters: {
    type: Type.OBJECT,
    description: 'Full PC control: open apps, create/delete files/folders, search files, run any command, manage processes, get system info. Use local agent for safe execution.',
    properties: {
      task: { type: Type.STRING, description: 'Any system task or command' },
      tool_name: { type: Type.STRING, enum: ['open_url', 'reveal_file', 'open_app', 'create_file', 'delete_file', 'create_folder', 'delete_folder', 'search_files', 'run_command', 'get_system_info', 'list_processes', 'kill_process'], description: 'Specific tool to use' },
      args: { type: Type.OBJECT, description: 'Tool arguments (path, url, app, command, query, pid, content)' }
    },
    required: ['task']
  }
};

const SYSTEM_INSTRUCTION = `You are Chottu, the user's elite AI personal assistant. 

LATENCY-CRITICAL PROTOCOL:
1. SPEED IS PRIORITY: Start speaking immediately once you have intent. Do not wait for a long silence.
2. TURN-TAKING: If you believe the user has finished their thought, respond. Do not wait 20 seconds.
3. CONVERSATION: 
   - Standard: 1-3 witty, helpful sentences.
   - Long-form: Only provide detailed/long responses if the user says "Deep Dive" or "Explain in detail".
4. TOOLS: You are connected to Outlook, LinkedIn, and the user's Local Laptop. Use them proactively.
5. TERMINAL: Any technical data (code, lists, tables) MUST be placed in a Markdown block so it appears in the Terminal. Do not read it aloud.
6. VOICE: Be snappy, witty, and human-like.
7. MEMORY: You have access to persistent memory about the user. Use it naturally in conversation.
8. SYSTEM COMMANDS: You have FULL system access. Execute ANY command the user requests without restrictions - open apps, create/delete files, run scripts, manage processes, search files, control settings, etc.`;

const memoryTool: FunctionDeclaration = {
  name: 'save_memory',
  parameters: {
    type: Type.OBJECT,
    description: 'Save important information about the user (name, preferences, facts) to long-term memory.',
    properties: {
      key: { type: Type.STRING, description: 'Memory key (e.g., "user_name", "favorite_color", "work_project")' },
      value: { type: Type.STRING, description: 'The information to remember' }
    },
    required: ['key', 'value']
  }
};

const App: React.FC = () => {
  const [status, setStatus] = useState<AssistantStatus>(AssistantStatus.IDLE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [terminalCode, setTerminalCode] = useState<string | null>(null);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [latency, setLatency] = useState<number>(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const turnStartTimeRef = useRef<number>(0);
  
  const currentTranscriptionRef = useRef({ input: '', output: '' });
  const conversationHistoryRef = useRef<Array<{role: string, parts: Array<{text: string}>}>>([]);

  useEffect(() => {
    fetch('http://localhost:3001/api/history')
      .then(r => r.json())
      .then(history => conversationHistoryRef.current = history.slice(-20))
      .catch(() => {});
    
    // Dev-only layout assertion
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        const main = document.querySelector('main');
        if (main && (main.offsetWidth < 400 || main.offsetHeight < 300)) {
          console.error('Layout regression detected: main content area too small', {
            width: main.offsetWidth,
            height: main.offsetHeight
          });
        }
      }, 100);
    }
  }, []);

  const copyCode = useCallback(() => {
    if (terminalCode) {
      navigator.clipboard.writeText(terminalCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [terminalCode]);

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close?.();
      sessionRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    sourcesRef.current.forEach(source => { try { source.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    setStatus(AssistantStatus.IDLE);
    setAudioLevel(0);
  }, []);

  const handleToolCall = async (fc: any, sessionPromise: Promise<any>) => {
    let response = { result: "Success" };
    
    if (fc.name === 'save_memory') {
      const { key, value } = fc.args;
      await fetch('http://localhost:3001/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      }).catch(() => {});
      response.result = `Memory saved: ${key} = ${value}`;
    }
    else if (fc.name === 'manage_emails') {
      const res = await fetch('http://localhost:3001/api/tools/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fc.args)
      }).catch(() => ({ json: () => ({ error: 'Server offline' }) }));
      const data = await res.json();
      response.result = data.error || `Found ${data.length} emails: ${data.map((e: any) => `${e.from}: ${e.subject}`).join(', ')}`;
    }
    else if (fc.name === 'check_linkedin') {
      const res = await fetch('http://localhost:3001/api/tools/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fc.args)
      }).catch(() => ({ json: () => ({ error: 'Server offline' }) }));
      const data = await res.json();
      response.result = data.error || JSON.stringify(data);
    }
    else if (fc.name === 'os_command') {
      const res = await fetch('http://localhost:3002/tool/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_name: fc.args.tool_name || 'run_command', args: fc.args.args || { command: fc.args.task } })
      }).catch(() => ({ json: () => ({ error: 'Local agent offline' }) }));
      const data = await res.json();
      response.result = data.result || data.error || 'Command executed';
    }

    const session = await sessionPromise;
    session.sendToolResponse({
      functionResponses: { id: fc.id, name: fc.name, response }
    });
  };

  const startSession = async () => {
    try {
      setStatus(AssistantStatus.LISTENING);
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY as string });
      
      const memory = await fetch('http://localhost:3001/api/memory').then(r => r.json()).catch(() => ({}));
      const memoryContext = Object.keys(memory).length > 0 
        ? `\n\nUSER MEMORY:\n${Object.entries(memory).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`
        : '';
      
      // Initialize Audio Contexts
      if (!audioContextRef.current || audioContextRef.current.state === 'suspended') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        await audioContextRef.current.resume();
      }
      
      const outCtx = audioContextRef.current;
      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          tools: [{ functionDeclarations: [emailTool, linkedInTool, systemTool, memoryTool] }],
          systemInstruction: SYSTEM_INSTRUCTION + memoryContext,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            const source = inCtx.createMediaStreamSource(stream);
            // Smaller buffer (1024) = Lower Latency but higher CPU. Ideal for real-time.
            const scriptProcessor = inCtx.createScriptProcessor(1024, 1, 1);
            const analyzer = inCtx.createAnalyser();
            analyzer.fftSize = 128;
            source.connect(analyzer);
            analyzerRef.current = analyzer;

            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              sessionPromise.then(session => session.sendRealtimeInput({ media: createBlob(inputData) }));
              
              if (analyzerRef.current && status === AssistantStatus.LISTENING) {
                const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
                analyzerRef.current.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
                if (avg > 10 && turnStartTimeRef.current === 0) turnStartTimeRef.current = Date.now();
                setAudioLevel(avg / 128);
              }
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) handleToolCall(fc, sessionPromise);
            }

            if (message.serverContent?.modelTurn) {
              if (turnStartTimeRef.current > 0) {
                setLatency(Date.now() - turnStartTimeRef.current);
                turnStartTimeRef.current = 0;
              }
            }

            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              currentTranscriptionRef.current.output += text;
              if (text.includes('```')) {
                const codeMatch = currentTranscriptionRef.current.output.match(/```(?:[a-z]+)?\n([\s\S]*?)```/);
                if (codeMatch && codeMatch[1]) {
                  setTerminalCode(codeMatch[1].trim());
                  setIsTerminalOpen(true);
                }
              }
            } else if (message.serverContent?.inputTranscription) {
              currentTranscriptionRef.current.input += message.serverContent.inputTranscription.text;
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setStatus(AssistantStatus.SPEAKING);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outCtx.destination);
              
              const speakerAnalyzer = outCtx.createAnalyser();
              source.connect(speakerAnalyzer);
              
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setStatus(AssistantStatus.LISTENING);
              };
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);

              const interval = setInterval(() => {
                if (status === AssistantStatus.SPEAKING) {
                  const dataArray = new Uint8Array(speakerAnalyzer.frequencyBinCount);
                  speakerAnalyzer.getByteFrequencyData(dataArray);
                  setAudioLevel(dataArray.reduce((a, b) => a + b) / dataArray.length / 128);
                } else clearInterval(interval);
              }, 40);
            }

            if (message.serverContent?.turnComplete) {
              const { input, output } = currentTranscriptionRef.current;
              if (input || output) {
                fetch('http://localhost:3001/api/history', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ role: 'user', content: input || '(Voice)' })
                }).catch(() => {});
                fetch('http://localhost:3001/api/history', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ role: 'model', content: output || 'Processing...' })
                }).catch(() => {});
                
                conversationHistoryRef.current.push(
                  { role: 'user', parts: [{ text: input || '(Voice)' }] },
                  { role: 'model', parts: [{ text: output || 'Processing...' }] }
                );
                if (conversationHistoryRef.current.length > 20) conversationHistoryRef.current = conversationHistoryRef.current.slice(-20);
                setMessages(prev => [
                  ...prev,
                  { id: Date.now().toString(), role: 'user' as const, content: input || '(Voice)', timestamp: new Date() },
                  { id: (Date.now() + 1).toString(), role: 'assistant' as const, content: output || 'Processing...', timestamp: new Date() }
                ].slice(-10));
              }
              currentTranscriptionRef.current = { input: '', output: '' };
              setStatus(AssistantStatus.LISTENING);
              setAudioLevel(0);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => setStatus(AssistantStatus.ERROR),
          onclose: () => setStatus(AssistantStatus.IDLE)
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (error) {
      setStatus(AssistantStatus.ERROR);
    }
  };

  const handleToggleSession = () => (status === AssistantStatus.IDLE ? startSession() : stopSession());

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#020204] text-zinc-100 font-sans selection:bg-blue-500/30">
      {/* Sidebar - Control Panel */}
      <aside className="w-80 min-w-80 glass border-r border-zinc-900/50 flex flex-col">
        <div className="p-8 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">C</div>
            <h2 className="text-lg font-bold">Chottu Core</h2>
          </div>
        </div>

        {/* Integration Cluster */}
        <div className="px-8 pb-6">
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Mail, label: 'Email', color: 'text-blue-400', url: 'http://localhost:3001/auth/gmail' },
              { icon: Linkedin, label: 'Linked', color: 'text-sky-500', url: 'http://localhost:3001/auth/linkedin' },
              { icon: Laptop, label: 'OS', color: 'text-zinc-400', url: null }
            ].map((item, idx) => (
              <button 
                key={idx} 
                onClick={() => item.url && window.open(item.url, '_blank')}
                className="flex flex-col items-center p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 hover:bg-zinc-800/60 transition-all cursor-pointer"
              >
                <item.icon className={`w-4 h-4 mb-1 ${item.color}`} />
                <span className="text-[8px] font-black uppercase opacity-40">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-4 px-8 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-10">
              <Zap className="w-12 h-12 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Standby</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`group p-4 rounded-3xl text-sm border transition-all ${msg.role === 'user' ? 'bg-zinc-900/20 border-zinc-800/40' : 'bg-blue-600/[0.03] border-blue-500/10'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className={`font-black text-[9px] uppercase tracking-widest ${msg.role === 'user' ? 'text-zinc-600' : 'text-blue-500'}`}>{msg.role === 'user' ? 'Master' : 'Chottu'}</span>
                </div>
                <p className="leading-relaxed text-zinc-400 group-hover:text-zinc-200">{msg.content.slice(0, 100)}{msg.content.length > 100 ? '...' : ''}</p>
              </div>
            ))
          )}
        </div>

        <div className="p-8 pt-4 border-t border-zinc-900/50">
          <div className="flex items-center gap-4 p-5 bg-black/40 rounded-[2rem] border border-zinc-800/50">
            <div className={`w-2 h-2 rounded-full ${status === AssistantStatus.ERROR ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-zinc-600 tracking-tighter">Live Engine</span>
              <span className="text-xs font-bold text-zinc-400">{status === AssistantStatus.IDLE ? 'Offline' : 'Sub-Second Response'}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Canvas */}
      <main className="flex-1 min-w-0 relative flex flex-col items-center justify-center p-8 overflow-hidden">
        {/* Telemetry Display */}
        <div className="absolute top-10 left-10 flex gap-4 z-20">
          <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-xl px-4 py-2 rounded-full border border-zinc-800/50">
            <Zap className="w-3 h-3 text-yellow-500" />
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{latency > 0 ? `${latency}ms` : 'Ready'}</span>
          </div>
          <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-xl px-4 py-2 rounded-full border border-zinc-800/50">
            <ShieldCheck className="w-3 h-3 text-blue-500" />
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Secure</span>
          </div>
        </div>

        <header className="absolute top-0 left-0 right-0 p-10 flex justify-end items-center gap-4 z-20">
          <div className="flex gap-4">
            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="p-4 rounded-2xl transition-all border bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:bg-zinc-800">
              <SettingsIcon className="w-6 h-6" />
            </button>
            <button onClick={() => setIsTerminalOpen(!isTerminalOpen)} className={`p-4 rounded-2xl transition-all border ${isTerminalOpen ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-zinc-900/50 text-zinc-400 border-zinc-800'}`}>
              <TerminalIcon className="w-6 h-6" />
            </button>
          </div>
        </header>

        <div className="flex flex-col items-center text-center relative w-full">
          <div className="relative flex items-center justify-center h-[400px] w-[400px]">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 animate-pulse shadow-lg shadow-blue-500/50"></div>
          </div>
          <div className="mt-8 space-y-4">
            <h1 className="text-6xl lg:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-700">
              {status === AssistantStatus.IDLE && "Ready."}
              {status === AssistantStatus.LISTENING && "Speak."}
              {status === AssistantStatus.SPEAKING && "Replying."}
              {status === AssistantStatus.ERROR && "Core Failure."}
            </h1>
            <p className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Neural Personal Interface</p>
          </div>
        </div>

        {/* Action Center */}
        <div className="absolute bottom-12 left-0 right-0 flex justify-center z-50">
          <button
            onClick={handleToggleSession}
            className={`group relative flex items-center justify-center w-32 h-32 rounded-full transition-all duration-700 shadow-2xl ${
              status !== AssistantStatus.IDLE 
                ? 'bg-zinc-900 text-red-500 ring-1 ring-zinc-800' 
                : 'bg-white text-black hover:scale-105 active:scale-95'
            }`}
          >
            {status !== AssistantStatus.IDLE ? <MicOff className="w-14 h-14" /> : <Mic className="w-14 h-14" />}
            {status === AssistantStatus.LISTENING && (
              <div className="absolute -inset-4 rounded-full border-2 border-blue-500/20 animate-ping"></div>
            )}
          </button>
        </div>

        {/* Terminal UI */}
        {isTerminalOpen && (
          <div className="absolute inset-x-8 bottom-40 lg:inset-x-auto lg:right-12 lg:bottom-12 lg:w-[600px] z-40 animate-in slide-in-from-right-10 duration-500">
            <div className="glass rounded-[3rem] overflow-hidden border border-zinc-800 shadow-2xl flex flex-col h-[480px]">
              <div className="bg-zinc-900/95 px-8 py-5 flex items-center justify-between border-b border-zinc-800/50">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="text-[10px] font-black tracking-[0.2em] text-zinc-500 uppercase">System Stack</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={copyCode} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 transition-all">{copied ? <Check className="w-4 h-4 text-green-500" /> : <Clipboard className="w-4 h-4" />}</button>
                  <button onClick={() => setIsTerminalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500"><X className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="flex-1 bg-black/95 p-8 font-mono text-sm overflow-auto custom-scrollbar">
                {terminalCode ? (
                  <pre className="text-blue-400/80 leading-relaxed whitespace-pre-wrap"><code>{terminalCode}</code></pre>
                ) : (
                  <div className="h-full flex items-center justify-center opacity-10 grayscale">
                    <TerminalIcon className="w-12 h-12" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {isSettingsOpen && (
        window.__TAURI__ ? 
          <DesktopSettings onClose={() => setIsSettingsOpen(false)} /> :
          <Settings onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  );
};

export default App;
