
import React, { useState, useEffect, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import Overlay from './components/Overlay';
import StartScreen from './components/StartScreen';
import { GameState, LeaderboardEntry, SnakePattern, GameSpeedMode } from './types';
import { generateCommentary } from './services/geminiService';
import { SNAKE_COLORS } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [playerName, setPlayerName] = useState('');
  const [playerColor, setPlayerColor] = useState(SNAKE_COLORS[0]);
  const [playerPattern, setPlayerPattern] = useState<SnakePattern>('none');
  const [gameSpeed, setGameSpeed] = useState<GameSpeedMode>('NORMAL');
  const [score, setScore] = useState(0);
  const [lastScore, setLastScore] = useState<number | undefined>(undefined);
  const [aiCommentary, setAiCommentary] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isTouchBoosting, setIsTouchBoosting] = useState(false);

  const startGame = async (name: string, color: string, pattern: SnakePattern, speed: GameSpeedMode) => {
    setPlayerName(name);
    setPlayerColor(color);
    setPlayerPattern(pattern);
    setGameSpeed(speed);
    setScore(0);
    setGameState(GameState.PLAYING);
    setIsPaused(false);
    setIsTouchBoosting(false);
    
    // Welcome message
    const comment = await generateCommentary('start', name, 0);
    if (comment) setAiCommentary(comment);
  };

  const handleGameOver = async (finalScore: number) => {
    setGameState(GameState.GAME_OVER);
    setLastScore(finalScore);
    setIsPaused(false);
    setIsTouchBoosting(false);
    
    const comment = await generateCommentary('die', playerName, finalScore);
    if (comment) setAiCommentary(comment);
  };

  const handleKill = useCallback(async () => {
      // 20% chance to comment on a kill to avoid spamming API
      if (Math.random() < 0.2) {
          const comment = await generateCommentary('kill', playerName, score);
          if (comment) setAiCommentary(comment);
      }
  }, [playerName, score]);

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
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900 text-white font-sans selection:bg-cyan-500/30">
      
      <GameCanvas 
        gameState={gameState}
        playerName={playerName}
        playerColor={playerColor}
        playerPattern={playerPattern}
        gameSpeed={gameSpeed}
        isPaused={isPaused}
        isTouchBoosting={isTouchBoosting}
        onGameOver={handleGameOver}
        onScoreUpdate={setScore}
        onKill={handleKill}
        onLeaderboardUpdate={setLeaderboard}
      />
      
      <Overlay 
        gameState={gameState}
        score={score}
        commentary={aiCommentary}
        leaderboard={leaderboard}
        isPaused={isPaused}
        onTogglePause={togglePause}
        setIsTouchBoosting={setIsTouchBoosting}
        isTouchBoosting={isTouchBoosting}
      />

      {gameState !== GameState.PLAYING && (
        <StartScreen 
          onStart={startGame} 
          lastScore={lastScore}
          commentary={gameState === GameState.GAME_OVER ? aiCommentary : undefined}
        />
      )}
    </div>
  );
};

export default App;
