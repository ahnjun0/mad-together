import { useGameStore } from './store/useGameStore';
import { usePcSocket } from './hooks/usePcSocket';
import HomeView from './views/HomeView';
import WaitingView from './views/WaitingView';
import TutorialView from './views/TutorialView';
import CastingView from './views/CastingView';
import PlayingView from './views/PlayingView';
import FinishedView from './views/FinishedView';
import DevTools from './components/DevTools';
import './App.css';

function App() {
  const gameState = useGameStore((state) => state.gameState);
  
  // Initialize socket connection (side effect)
  usePcSocket();

  const renderView = () => {
    switch (gameState) {
      case 'HOME':
        return <HomeView />;
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
        return <HomeView />;
    }
  };

  return (
    <div className="w-screen h-screen bg-cyan-200 overflow-hidden">
      {renderView()}
      <DevTools />
    </div>
  );
}

export default App
