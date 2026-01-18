import { useMobileStore } from './store/useMobileStore';
import { useMobileSocket } from './hooks/useMobileSocket';
import LoginView from './views/LoginView';
import LobbyView from './views/LobbyView';
import InGameView from './views/InGameView';
import ResultView from './views/ResultView';
import ProfileSetupView from './views/ProfileSetupView';
import DebugPanel from './components/DebugPanel';

function App() {
  const gameState = useMobileStore((state) => state.gameState);
  const roomId = useMobileStore((state) => state.roomId);
  const token = useMobileStore((state) => state.token);
  
  // Initialize socket connection (side effect)
  useMobileSocket();

  // 1. Not Authenticated -> LoginView
  if (!token) {
      return (
        <div className="w-screen h-screen overflow-hidden">
            <LoginView />
            <DebugPanel />
        </div>
      );
  }

  // 2. Authenticated but Not Joined Room -> ProfileSetupView
  if (!roomId) {
      return (
        <div className="w-screen h-screen overflow-hidden">
            <ProfileSetupView />
            <DebugPanel />
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
    </div>
  );
}

export default App;