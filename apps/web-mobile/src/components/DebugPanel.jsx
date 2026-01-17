import { useMobileStore } from '../store/useMobileStore';
import { useMobileSocket } from '../hooks/useMobileSocket';

const GAME_STATES = ['WAITING', 'TUTORIAL', 'PLAYING', 'FINISHED'];

export default function DebugPanel() {
  const { gameState, setGameState, score, updateScore } = useMobileStore();
  const { shake } = useMobileSocket();

  return (
    <div className="fixed bottom-4 left-4 bg-black/80 text-white p-3 rounded-lg shadow-lg z-50 space-y-2 max-w-xs">
      <div className="text-xs font-bold mb-2">Debug Panel</div>
      <div className="space-y-1 text-xs">
        <div>State: <span className="font-mono">{gameState}</span></div>
        <div>Score: A={score.A} B={score.B}</div>
      </div>
      <div className="space-y-1 pt-2 border-t border-white/20">
        <div className="text-xs font-semibold mb-1">Change State:</div>
        <div className="flex flex-wrap gap-1">
          {GAME_STATES.map((state) => (
            <button
              key={state}
              onClick={() => setGameState(state)}
              className={`px-2 py-1 text-xs rounded ${
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
      <button
        onClick={() => shake(1)}
        className="w-full px-2 py-1 text-xs rounded bg-green-600 hover:bg-green-700 mt-2"
      >
        Fake Shake
      </button>
    </div>
  );
}
