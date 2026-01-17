import { useGameStore } from './store/useGameStore';
import WaitingView from './views/WaitingView';
import TutorialView from './views/TutorialView';
import CastingView from './views/CastingView';
import PlayingView from './views/PlayingView';
import FinishedView from './views/FinishedView';
import DebugPanel from './components/DebugPanel';
import './App.css';

function App() {
  const gameState = useGameStore((state) => state.gameState);

  const renderView = () => {
    switch (gameState) {
      case 'WAITING':
        return <WaitingView />;
      case 'TUTORIAL':
        return <TutorialView />;
      case 'CASTING':
        return <CastingView />;
      case 'PLAYING':
        return <PlayingView />;
      case 'FINISHED':
        return <FinishedView />;
      default:
        return <WaitingView />;
    }
  };

  return (
    <div className="w-screen h-screen bg-cyan-200 overflow-hidden">
      {renderView()}
      <DebugPanel />
    </div>
  );
}

export default App
