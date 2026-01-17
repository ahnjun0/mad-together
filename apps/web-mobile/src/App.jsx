import { useMobileStore } from './store/useMobileStore';
import { useMobileSocket } from './hooks/useMobileSocket';
import LoginView from './views/LoginView';
import LobbyView from './views/LobbyView';
import InGameView from './views/InGameView';
import ResultView from './views/ResultView';
import DebugPanel from './components/DebugPanel';

function App() {
  const gameState = useMobileStore((state) => state.gameState);
  
  // Initialize socket connection (side effect)
  useMobileSocket();

  const renderView = () => {
    switch (gameState) {
      case 'WAITING':
        return <LoginView />;
      case 'TUTORIAL':
        return <LobbyView />;
      case 'PLAYING':
        return <InGameView />;
      case 'FINISHED':
        return <ResultView />;
      default:
        return <LoginView />;
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