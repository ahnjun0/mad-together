import { useGameStore } from '../store/useGameStore';

const GAME_STATES = ['WAITING', 'TUTORIAL', 'CASTING', 'PLAYING', 'FINISHED'];

export default function DebugPanel() {
  const { gameState, setGameState, isHost, toggleHost } = useGameStore();

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg shadow-lg z-50 space-y-2">
      <div className="text-xs font-bold mb-2">Debug Panel</div>
      <div className="space-y-1">
        <div className="text-xs">Current State: <span className="font-mono">{gameState}</span></div>
        <div className="text-xs">Is Host: <span className="font-mono">{isHost ? 'true' : 'false'}</span></div>
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
        onClick={toggleHost}
        className={`w-full px-2 py-1 text-xs rounded mt-2 ${
          isHost ? 'bg-orange-600' : 'bg-gray-700 hover:bg-gray-600'
        }`}
      >
        Toggle Host
      </button>
    </div>
  );
}
