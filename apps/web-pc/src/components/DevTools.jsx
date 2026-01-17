// DevTools component for the game
// This component is used to debug the game and the score
// It is only visible in development mode

import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';

const GAME_STATES = ['WAITING', 'TUTORIAL', 'CASTING', 'PLAYING', 'FINISHED'];

export default function DevTools() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  
  const {
    gameState,
    setGameState,
    score,
    updateScore,
    setScore,
    addMockPlayer,
    toggleReadyAll,
    clearPlayers,
    resetScore,
  } = useGameStore();

  // Mock player ID counter
  const [playerIdCounter, setPlayerIdCounter] = useState(1);

  const generateMockPlayer = (team, name) => ({
    id: `bot-${team}-${playerIdCounter}`,
    nickname: name || `Bot ${team}-${playerIdCounter}`,
    team,
    isReady: false,
    isHost: false,
    sensorChecked: false,
    score: 0,
  });

  const handleAddBotA = () => {
    const player = generateMockPlayer('A', `Bot A-${playerIdCounter}`);
    addMockPlayer('A', player);
    setPlayerIdCounter((prev) => prev + 1);
  };

  const handleAddBotB = () => {
    const player = generateMockPlayer('B', `Bot B-${playerIdCounter}`);
    addMockPlayer('B', player);
    setPlayerIdCounter((prev) => prev + 1);
  };

  const handleFakeShakeA = () => {
    updateScore('A', 10);
  };

  const handleFakeShakeB = () => {
    updateScore('B', 10);
  };

  const handleWinGameA = () => {
    setScore({ A: 1000, B: 500 });
    setGameState('FINISHED');
  };

  const handleWinGameB = () => {
    setScore({ A: 500, B: 1000 });
    setGameState('FINISHED');
  };

  const handleTriggerHit = () => {
    // Reset scores and transition to PLAYING
    resetScore();
    setGameState('PLAYING');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 w-12 h-12 bg-black/80 text-white rounded-full shadow-lg z-50 flex items-center justify-center hover:bg-black/90 transition-all"
        title="Open DevTools"
      >
        <span className="text-xl">⚙️</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[80vh] bg-black/90 text-white rounded-lg shadow-2xl z-50 flex flex-col border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <h2 className="text-sm font-bold">DevTools</h2>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {['State', 'Users', 'Game'].map((tab, index) => (
          <button
            key={tab}
            onClick={() => setActiveTab(index)}
            className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${
              activeTab === index
                ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Tab 1: Game State Control */}
        {activeTab === 0 && (
          <div className="space-y-3">
            <div className="text-xs text-gray-400 mb-2">
              Current: <span className="font-mono text-white">{gameState}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {GAME_STATES.map((state) => (
                <button
                  key={state}
                  onClick={() => setGameState(state)}
                  className={`px-3 py-2 text-xs rounded transition-all ${
                    gameState === state
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  {state}
                </button>
              ))}
            </div>
            <div className="pt-2 border-t border-gray-700">
              <button
                onClick={resetScore}
                className="w-full px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
              >
                Reset Scores
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Mock User Simulation */}
        {activeTab === 1 && (
          <div className="space-y-3">
            <div className="text-xs text-gray-400 mb-2">
              Mock players for UI testing
            </div>
            <div className="space-y-2">
              <button
                onClick={handleAddBotA}
                className="w-full px-3 py-2 text-xs bg-orange-600 hover:bg-orange-700 rounded text-white font-semibold"
              >
                ➕ Add Bot User A
              </button>
              <button
                onClick={handleAddBotB}
                className="w-full px-3 py-2 text-xs bg-cyan-600 hover:bg-cyan-700 rounded text-white font-semibold"
              >
                ➕ Add Bot User B
              </button>
              <button
                onClick={toggleReadyAll}
                className="w-full px-3 py-2 text-xs bg-green-600 hover:bg-green-700 rounded text-white font-semibold"
              >
                ✓ Toggle Ready All
              </button>
              <button
                onClick={clearPlayers}
                className="w-full px-3 py-2 text-xs bg-red-600 hover:bg-red-700 rounded text-white font-semibold"
              >
                🗑️ Clear All Players
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Game Logic Simulation */}
        {activeTab === 2 && (
          <div className="space-y-3">
            <div className="text-xs text-gray-400 mb-2">
              Simulate game events
            </div>
            <div className="space-y-2">
              <button
                onClick={handleTriggerHit}
                className="w-full px-3 py-2 text-xs bg-purple-600 hover:bg-purple-700 rounded text-white font-semibold"
              >
                🎣 Trigger HIT (→ PLAYING)
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleFakeShakeA}
                  className="px-3 py-2 text-xs bg-orange-600 hover:bg-orange-700 rounded text-white font-semibold"
                >
                  📳 Fake Shake (A) +10
                </button>
                <button
                  onClick={handleFakeShakeB}
                  className="px-3 py-2 text-xs bg-cyan-600 hover:bg-cyan-700 rounded text-white font-semibold"
                >
                  📳 Fake Shake (B) +10
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleWinGameA}
                  className="px-3 py-2 text-xs bg-orange-600 hover:bg-orange-700 rounded text-white font-semibold"
                >
                  🏆 Win Game (A)
                </button>
                <button
                  onClick={handleWinGameB}
                  className="px-3 py-2 text-xs bg-cyan-600 hover:bg-cyan-700 rounded text-white font-semibold"
                >
                  🏆 Win Game (B)
                </button>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-700 text-xs">
              <div className="text-gray-400 mb-1">Current Scores:</div>
              <div className="flex justify-between">
                <span className="text-orange-400">A: {score.A}</span>
                <span className="text-cyan-400">B: {score.B}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
