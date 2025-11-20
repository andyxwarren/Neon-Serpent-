
import React, { useState, useEffect, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import Overlay from './components/Overlay';
import StartScreen from './components/StartScreen';
import { GameState, LeaderboardEntry, SnakePattern, GameSpeedMode, SnakeSkin, SnakeFace, PlayerPreferences } from './types';
import { SNAKE_COLORS } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [playerName, setPlayerName] = useState('');
  const [playerColor, setPlayerColor] = useState(SNAKE_COLORS[0]);
  const [playerPattern, setPlayerPattern] = useState<SnakePattern>('none');
  const [playerSkin, setPlayerSkin] = useState<SnakeSkin>('standard');
  const [playerFace, setPlayerFace] = useState<SnakeFace>('none');
  const [gameSpeed, setGameSpeed] = useState<GameSpeedMode>('NORMAL');
  const [score, setScore] = useState(0);
  const [lastScore, setLastScore] = useState<number | undefined>(undefined);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [initialPrefs, setInitialPrefs] = useState<PlayerPreferences | undefined>(undefined);

  // Load preferences from local storage on mount
  useEffect(() => {
    try {
      const savedPrefs = localStorage.getItem('neonSerpentPrefs');
      if (savedPrefs) {
        setInitialPrefs(JSON.parse(savedPrefs));
      }
    } catch (e) {
      console.error('Failed to load preferences', e);
    }
  }, []);

  const startGame = async (name: string, color: string, pattern: SnakePattern, skin: SnakeSkin, face: SnakeFace, speed: GameSpeedMode) => {
    setPlayerName(name);
    setPlayerColor(color);
    setPlayerPattern(pattern);
    setPlayerSkin(skin);
    setPlayerFace(face);
    setGameSpeed(speed);
    setScore(0);
    setGameState(GameState.PLAYING);
    setIsPaused(false);
    
    // Save preferences
    try {
      const prefs: PlayerPreferences = { name, color, pattern, skin, face, speed };
      localStorage.setItem('neonSerpentPrefs', JSON.stringify(prefs));
    } catch (e) {
      console.error('Failed to save preferences', e);
    }
  };

  const handleGameOver = async (finalScore: number) => {
    setGameState(GameState.GAME_OVER);
    setLastScore(finalScore);
    setIsPaused(false);
  };

  const handleKill = useCallback(() => {
      // Logic for kill events can be added here if needed (e.g. sound effects)
  }, []);

  const togglePause = useCallback(() => {
    if (gameState === GameState.PLAYING) {
      setIsPaused(prev => !prev);
    }
  }, [gameState]);

  // Global key listener for Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p') {
        togglePause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePause]);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-slate-900 text-white font-sans selection:bg-cyan-500/30 touch-none overscroll-none">
      
      <GameCanvas 
        gameState={gameState}
        playerName={playerName}
        playerColor={playerColor}
        playerPattern={playerPattern}
        playerSkin={playerSkin}
        playerFace={playerFace}
        gameSpeed={gameSpeed}
        isPaused={isPaused}
        onGameOver={handleGameOver}
        onScoreUpdate={setScore}
        onKill={handleKill}
        onLeaderboardUpdate={setLeaderboard}
      />
      
      <Overlay 
        gameState={gameState}
        score={score}
        leaderboard={leaderboard}
        isPaused={isPaused}
        onTogglePause={togglePause}
      />

      {gameState !== GameState.PLAYING && (
        <StartScreen 
          onStart={startGame} 
          lastScore={lastScore}
          initialValues={initialPrefs}
        />
      )}
    </div>
  );
};

export default App;
