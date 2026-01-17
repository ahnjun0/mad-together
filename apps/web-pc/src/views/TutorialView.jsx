import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';

// PC (Host) only view - Split screen for Tutorial
export default function TutorialView() {
  const { setGameState } = useGameStore();

  // Auto-transition to CASTING after 5 seconds (mock logic)
  useEffect(() => {
    const timer = setTimeout(() => {
      setGameState('CASTING');
    }, 5000);

    return () => clearTimeout(timer);
  }, [setGameState]);

  return (
    <div className="w-full h-full flex">
      {/* Team B - Left Side */}
      <div className="flex-1 bg-white/90 rounded-r-[20px] border-r-2 border-blue-900 p-8 flex flex-col items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-outline text-white mb-4">
            Team B
          </h2>
          <div className="text-cyan-500 text-6xl mb-6">🌊</div>
          <p className="text-xl text-gray-700 font-semibold">
            센서 확인 중...
          </p>
        </div>
      </div>

      {/* Vertical Divider */}
      <div className="w-1 bg-blue-900"></div>

      {/* Team A - Right Side */}
      <div className="flex-1 bg-white/90 rounded-l-[20px] border-l-2 border-blue-900 p-8 flex flex-col items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-outline text-white mb-4">
            Team A
          </h2>
          <div className="text-orange-500 text-6xl mb-6">🔥</div>
          <p className="text-xl text-gray-700 font-semibold">
            센서 확인 중...
          </p>
        </div>
      </div>
    </div>
  );
}
