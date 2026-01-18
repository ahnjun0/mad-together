import { useMobileStore } from './store/useMobileStore';
import { useMobileSocket } from './hooks/useMobileSocket';
import LoginView from './views/LoginView';
import LobbyView from './views/LobbyView';
import InGameView from './views/InGameView';
import ResultView from './views/ResultView';
import DebugPanel from './components/DebugPanel';

function App() {
  const gameState = useMobileStore((state) => state.gameState);
  const roomId = useMobileStore((state) => state.roomId);
  
  // Initialize socket connection (side effect)
  useMobileSocket();

  // If not joined, show LoginView
  if (!roomId) {
      return (
        <div className="w-screen h-screen overflow-hidden">
            <LoginView />
            <DebugPanel />
        </div>
      );
  }

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