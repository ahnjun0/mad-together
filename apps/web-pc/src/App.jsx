import { useGameStore } from './store/useGameStore';
import { usePcSocket } from './hooks/usePcSocket';
import LoginView from './views/LoginView';
import HomeView from './views/HomeView';
import WaitingView from './views/WaitingView';
import CinematicView from './views/CinematicView';
import TutorialView from './views/TutorialView';
import CastingView from './views/CastingView';
import PlayingView from './views/PlayingView';
import FinishedView from './views/FinishedView';
import DevTools from './components/DevTools';
import './App.css';

function App() {
  const gameState = useGameStore((state) => state.gameState);
  const isAuthenticated = useGameStore((state) => state.isAuthenticated);

  // Initialize socket connection only after authentication
  // usePcSocket reads accessToken from store
  usePcSocket();

  const renderView = () => {
    // 인증되지 않았으면 로그인 화면
    if (!isAuthenticated && gameState === 'LOGIN') {
      return <LoginView />;
    }

    switch (gameState) {
      case 'LOGIN':
        return <LoginView />;
      case 'HOME':
        return <HomeView />;
      case 'WAITING':
        return <WaitingView />;
      case 'CINEMATIC':
        return <CinematicView />;
      case 'TUTORIAL':
        return <TutorialView />;
      case 'CASTING':
        return <CastingView />;
      case 'PLAYING':
        return <PlayingView />;
      case 'FINISHED':
        return <FinishedView />;
      default:
        return <LoginView />;
    }
  };

  return (
    <div className="w-screen h-screen bg-cyan-200 overflow-hidden">
      {renderView()}
      {isAuthenticated && <DevTools />}
    </div>
  );
}

export default App
