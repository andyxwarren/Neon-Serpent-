
import React from 'react';
import { GameState, LeaderboardEntry } from '../types';
import { Trophy, Zap, Crown, PauseCircle, PlayCircle, Pause, Flame } from 'lucide-react';

interface OverlayProps {
  gameState: GameState;
  score: number;
  leaderboard: LeaderboardEntry[];
  isPaused: boolean;
  onTogglePause: () => void;
}

const Overlay: React.FC<OverlayProps> = ({ 
  gameState, 
  score, 
  leaderboard, 
  isPaused, 
  onTogglePause
}) => {
  if (gameState !== GameState.PLAYING) return null;

  return (
    <>
        <div className="pointer-events-none absolute inset-0 w-full h-full p-3 sm:p-4 flex flex-col justify-between z-20">
        {/* Top Bar Container */}
        <div className="flex justify-between items-start">
            
            {/* Top Left: Score & Pause */}
            <div className="flex items-start gap-2">
                <button 
                    onClick={onTogglePause}
                    className="pointer-events-auto bg-gray-900/80 backdrop-blur border border-cyan-500/30 p-2 sm:p-3 rounded-lg text-cyan-400 hover:text-cyan-200 hover:bg-gray-800 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95"
                    title="Pause Game (P)"
                >
                    {isPaused ? <PlayCircle className="w-5 h-5 sm:w-5 sm:h-5" /> : <PauseCircle className="w-5 h-5 sm:w-5 sm:h-5" />}
                </button>

                <div className="bg-gray-900/80 backdrop-blur border border-cyan-500/30 p-2 sm:p-3 rounded-lg text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <div className="flex items-center gap-2 text-lg sm:text-xl font-bold">
                    <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                    <span>{score}</span>
                </div>
                </div>
            </div>
            
            {/* Top Right Group */}
            <div className="flex flex-col items-end gap-2">
                {/* Leaderboard - Responsive Width */}
                <div className="bg-gray-900/80 backdrop-blur border border-white/10 p-2 sm:p-3 rounded-lg w-32 sm:w-48 transition-all">
                    <h3 className="text-[10px] sm:text-xs text-slate-400 uppercase font-bold mb-1 sm:mb-2 flex items-center gap-1 border-b border-white/10 pb-1">
                        <Crown className="w-3 h-3 text-yellow-500" /> Leaderboard
                    </h3>
                    <div className="flex flex-col gap-0.5 sm:gap-1">
                        {leaderboard.map((entry, index) => (
                            <div key={entry.id} className={`flex justify-between items-center text-[10px] sm:text-xs ${entry.isPlayer ? 'text-white font-bold bg-white/10 -mx-1 px-1 rounded' : 'text-slate-300'}`}>
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                    <span className="w-3 text-slate-500">{index + 1}.</span>
                                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></span>
                                    <span className="truncate max-w-[40px] sm:max-w-[60px]">{entry.name}</span>
                                    {entry.killStreak >= 3 && (
                                        <div className="flex items-center text-orange-500 ml-0.5" title="Killstreak">
                                            <Flame className="w-2.5 h-2.5 fill-orange-500 animate-pulse" />
                                            <span className="text-[9px] font-bold">{entry.killStreak}</span>
                                        </div>
                                    )}
                                </div>
                                <span className="font-mono">{entry.score}</span>
                            </div>
                        ))}
                        {leaderboard.length === 0 && <div className="text-[10px] text-slate-500">Waiting...</div>}
                    </div>
                </div>
            </div>
        </div>

        {/* Bottom Bar - Instructions */}
        <div className="flex justify-between items-end relative pointer-events-none">
            <div className="bg-gray-900/80 backdrop-blur border border-white/10 p-2 rounded-lg text-white/50 text-[10px] sm:text-xs mb-2 opacity-60 hidden sm:block">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-white/20 flex items-center justify-center text-[8px]"><Zap className="w-2 h-2" /></div>
                    <span>Tap/Click to Boost</span>
                </div>
            </div>
        </div>
        </div>

        {/* PAUSE MODAL */}
        {isPaused && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                <div className="bg-slate-800 border border-cyan-500/50 p-6 sm:p-8 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.4)] text-center pointer-events-auto mx-4">
                    <Pause className="w-12 h-12 sm:w-16 sm:h-16 text-cyan-400 mx-auto mb-4 opacity-80" />
                    <h2 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-wider">PAUSED</h2>
                    <p className="text-slate-400 mb-6 sm:mb-8 text-xs sm:text-sm">Take a breath, neon warrior.</p>
                    
                    <button 
                        onClick={onTogglePause}
                        className="px-6 py-2 sm:px-8 sm:py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-full shadow-lg transform hover:scale-105 transition-all flex items-center justify-center gap-2 mx-auto text-sm sm:text-base"
                    >
                        <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        RESUME
                    </button>
                </div>
            </div>
        )}
    </>
  );
};

export default Overlay;
