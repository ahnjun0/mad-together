import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';

export default function Toast() {
  const alert = useGameStore((state) => state.alert);
  const clearAlert = useGameStore((state) => state.clearAlert);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => {
        clearAlert();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [alert, clearAlert]);

  if (!alert) return null;

  const bgColor = {
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
  }[alert.type] || 'bg-gray-700';

  const icon = {
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  }[alert.type] || '📢';

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-fade-in-down">
      <div
        className={`${bgColor} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[320px] max-w-[500px]`}
      >
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <p className="font-semibold text-base">{alert.message}</p>
          {alert.details && (
            <p className="text-sm opacity-90 mt-1">
              {alert.details.teamACount !== undefined && alert.details.teamBCount !== undefined && (
                <>Team A: {alert.details.teamACount}명 / Team B: {alert.details.teamBCount}명</>
              )}
            </p>
          )}
        </div>
        <button
          onClick={clearAlert}
          className="text-white/80 hover:text-white text-xl font-bold ml-2"
        >
          ×
        </button>
      </div>
    </div>
  );
}
