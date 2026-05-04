import { useEffect, useRef, useState } from 'react';
import { useMobileStore } from '../store/useMobileStore';
import { useMobileSocket } from '../hooks/useMobileSocket';

const GAME_STATES = ['WAITING', 'CINEMATIC', 'TUTORIAL', 'CASTING', 'PLAYING', 'FINISHED'];
const BURST_INTERVAL_MS = 100;

export default function DebugPanel() {
  const { gameState, setGameState, isConnected, roomId, playerId, myTeam, nickname } = useMobileStore();
  const { shake } = useMobileSocket();

  const [collapsed, setCollapsed] = useState(false);
  const [autoShake, setAutoShake] = useState(false);
  const autoShakeRef = useRef(null);

  useEffect(() => {
    if (autoShake) {
      autoShakeRef.current = setInterval(() => shake(1), BURST_INTERVAL_MS);
    }
    return () => {
      if (autoShakeRef.current) {
        clearInterval(autoShakeRef.current);
        autoShakeRef.current = null;
      }
    };
  }, [autoShake, shake]);

  const burstShake = (count) => {
    for (let i = 0; i < count; i += 1) shake(1);
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-4 left-4 bg-black/80 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-50"
      >
        🐛 Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 bg-black/85 text-white p-3 rounded-lg shadow-lg z-50 space-y-2 max-w-xs text-xs">
      <div className="flex items-center justify-between">
        <div className="font-bold">Debug Panel</div>
        <button
          onClick={() => setCollapsed(true)}
          className="px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded"
        >
          –
        </button>
      </div>

      <div className="space-y-0.5 pt-1 border-t border-white/20 font-mono">
        <div>connected: <span className={isConnected ? 'text-green-400' : 'text-red-400'}>{String(isConnected)}</span></div>
        <div>state: <span className="text-yellow-300">{gameState}</span></div>
        <div>nickname: {nickname || '—'}</div>
        <div>team: {myTeam || '—'}</div>
        <div className="truncate">roomId: {roomId || '—'}</div>
        <div className="truncate">playerId: {playerId || '—'}</div>
      </div>

      <div className="space-y-1 pt-2 border-t border-white/20">
        <div className="font-semibold">Set State (local only):</div>
        <div className="flex flex-wrap gap-1">
          {GAME_STATES.map((state) => (
            <button
              key={state}
              onClick={() => setGameState(state)}
              className={`px-2 py-1 rounded ${
                gameState === state
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {state}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1 pt-2 border-t border-white/20">
        <div className="font-semibold">Shake:</div>
        <div className="flex flex-wrap gap-1">
          <button onClick={() => shake(1)} className="px-2 py-1 rounded bg-green-600 hover:bg-green-700">
            x1
          </button>
          <button onClick={() => burstShake(10)} className="px-2 py-1 rounded bg-green-700 hover:bg-green-800">
            x10
          </button>
          <button onClick={() => burstShake(50)} className="px-2 py-1 rounded bg-green-800 hover:bg-green-900">
            x50
          </button>
          <button
            onClick={() => setAutoShake((v) => !v)}
            className={`px-2 py-1 rounded ${autoShake ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            {autoShake ? 'Stop Auto' : `Auto (${1000 / BURST_INTERVAL_MS}/s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
