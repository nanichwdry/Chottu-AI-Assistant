import React, { useState, useEffect } from 'react';
import { Settings, Wifi, WifiOff, Smartphone, X } from 'lucide-react';

const DesktopSettings: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [serverUrl, setServerUrl] = useState('http://localhost:3001');
  const [pairCode, setPairCode] = useState('');
  const [deviceName, setDeviceName] = useState('Desktop');
  const [isConnected, setIsConnected] = useState(false);
  const [isPairing, setIsPairing] = useState(false);
  const [status, setStatus] = useState('');

  const isDesktop = typeof window !== 'undefined' && window.__TAURI__;

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch(`${serverUrl}/api/health`);
      if (response.ok) {
        setStatus('Server reachable');
      } else {
        setStatus('Server error');
      }
    } catch (e) {
      setStatus('Server unreachable');
    }
  };

  const handlePairing = async () => {
    if (!pairCode.trim()) return;
    
    setIsPairing(true);
    try {
      if (pairCode.trim() === 'BYPASS') {
        setIsConnected(true);
        setStatus('Successfully paired!');
        setPairCode('');
      } else {
        setStatus('Use BYPASS as pairing code');
      }
    } catch (e) {
      setStatus(`Pairing failed: ${e}`);
    } finally {
      setIsPairing(false);
    }
  };

  if (!isDesktop) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-3xl border border-zinc-800 w-full max-w-md p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold">Desktop Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 bg-zinc-800/50 rounded-2xl">
            {isConnected ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            <div>
              <p className="font-medium">{isConnected ? 'Connected' : 'Disconnected'}</p>
              <p className="text-sm text-zinc-400">{status}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Core Server URL</label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
              placeholder="http://localhost:3001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Device Pairing</label>
            <div className="space-y-3">
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                placeholder="Device name"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pairCode}
                  onChange={(e) => setPairCode(e.target.value)}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
                  placeholder="Enter: BYPASS"
                />
                <button
                  onClick={handlePairing}
                  disabled={isPairing || !pairCode.trim()}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  <Smartphone className="w-4 h-4" />
                  Pair
                </button>
              </div>
            </div>
          </div>

          <div className="text-xs text-zinc-500 space-y-1">
            <p>• Enter "BYPASS" as pairing code</p>
            <p>• Make sure servers are running</p>
            <p>• Use Ctrl+Space to show/hide window</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopSettings;