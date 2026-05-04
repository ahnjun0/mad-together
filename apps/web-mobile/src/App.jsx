import { useMobileStore } from './store/useMobileStore';
import { useMobileSocket } from './hooks/useMobileSocket';
import { useWakeLock } from './hooks/useWakeLock';
import LoginView from './views/LoginView';
import LobbyView from './views/LobbyView';
import InGameView from './views/InGameView';
import ResultView from './views/ResultView';
import ProfileSetupView from './views/ProfileSetupView';
import DebugPanel from './components/DebugPanel';

// Kick 모달 컴포넌트
function KickModal({ isOpen, message, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl border border-gray-700">
        <div className="text-center space-y-4">
          <div className="text-5xl">🚫</div>
          <h2 className="text-xl font-bold text-white">퇴장되었습니다</h2>
          <p className="text-gray-300 text-sm">{message}</p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

// Room Full 모달 컴포넌트
function RoomFullModal({ isOpen, message, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl border border-gray-700">
        <div className="text-center space-y-4">
          <div className="text-5xl">🚷</div>
          <h2 className="text-xl font-bold text-white">입장 불가</h2>
          <p className="text-gray-300 text-sm">{message}</p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const gameState = useMobileStore((state) => state.gameState);
  const roomId = useMobileStore((state) => state.roomId);
  const token = useMobileStore((state) => state.token);
  const kickModal = useMobileStore((state) => state.kickModal);
  const closeKickModalAndReset = useMobileStore((state) => state.closeKickModalAndReset);
  const roomFullModal = useMobileStore((state) => state.roomFullModal);
  const closeRoomFullModalAndReset = useMobileStore((state) => state.closeRoomFullModalAndReset);

  // Initialize socket connection (side effect)
  useMobileSocket();

  // Initialize Screen Wake Lock
  useWakeLock();

  // 1. Not Authenticated -> LoginView
  if (!token) {
      return (
        <div className="w-screen h-screen overflow-hidden">
            <LoginView />
            <DebugPanel />
            {/* Room Full 모달 (전역) */}
            <RoomFullModal
              isOpen={roomFullModal.isOpen}
              message={roomFullModal.message}
              onClose={closeRoomFullModalAndReset}
            />
        </div>
      );
  }

  // 2. Authenticated but Not Joined Room -> ProfileSetupView
  if (!roomId) {
      return (
        <div className="w-screen h-screen overflow-hidden">
            <ProfileSetupView />
            <DebugPanel />
            {/* Room Full 모달 (전역) */}
            <RoomFullModal
              isOpen={roomFullModal.isOpen}
              message={roomFullModal.message}
              onClose={closeRoomFullModalAndReset}
            />
        </div>
      );
  }

  // 3. Joined Room -> Render based on Game State
  const renderView = () => {
    switch (gameState) {
      case 'WAITING':
        return <LobbyView />;
      case 'TUTORIAL':
        return <InGameView />;
      case 'CINEMATIC':
        return <InGameView />;
      case 'CASTING':
        return <InGameView />;
      case 'PLAYING':
        return <InGameView />;
      case 'FINISHED':
        return <ResultView />;
      default:
        return <LobbyView />;
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden">
      {renderView()}
      <DebugPanel />
      {/* Kick 모달 (전역) */}
      <KickModal
        isOpen={kickModal.isOpen}
        message={kickModal.message}
        onClose={closeKickModalAndReset}
      />
      {/* Room Full 모달 (전역) */}
      <RoomFullModal
        isOpen={roomFullModal.isOpen}
        message={roomFullModal.message}
        onClose={closeRoomFullModalAndReset}
      />
    </div>
  );
}

export default App;
