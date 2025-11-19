
import React from 'react';
import { GameState, LeaderboardEntry } from '../types';
import { Trophy, Activity, Zap, Crown, PauseCircle, PlayCircle, Pause } from 'lucide-react';

interface OverlayProps {
  gameState: GameState;
  score: number;
  commentary: string;
  leaderboard: LeaderboardEntry[];
  isPaused: boolean;
  onTogglePause: () => void;
  setIsTouchBoosting: (boosting: boolean) => void;
  isTouchBoosting: boolean;
}

const Overlay: React.FC<OverlayProps> = ({ 
  gameState, 
  score, 
  commentary, 
  leaderboard, 
  isPaused, 
  onTogglePause,
  setIsTouchBoosting,
  isTouchBoosting
}) => {
  if (gameState !== GameState.PLAYING) return null;

  return (
    <>
        <div className="pointer-events-none absolute inset-0 w-full h-full p-4 flex flex-col justify-between z-20">
        {/* Top Bar Container */}
        <div className="flex justify-between items-start">
            
            {/* Top Left: Score & Pause */}
            <div className="flex items-start gap-2">
                <button 
                    onClick={onTogglePause}
                    className="pointer-events-auto bg-gray-900/80 backdrop-blur border border-cyan-500/30 p-3 rounded-lg text-cyan-400 hover:text-cyan-200 hover:bg-gray-800 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95"
                    title="Pause Game (P)"
                >
                    {isPaused ? <PlayCircle className="w-5 h-5" /> : <PauseCircle className="w-5 h-5" />}
                </button>

                <div className="bg-gray-900/80 backdrop-blur border border-cyan-500/30 p-3 rounded-lg text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <div className="flex items-center gap-2 text-xl font-bold">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <span>Score: {score}</span>
                </div>
                <div className="text-xs text-cyan-600/80 mt-1">Length: {Math.floor(score / 5) + 10}</div>
                </div>
            </div>
            
            {/* Top Right Group */}
            <div className="flex flex-col items-end gap-2">
                {/* Leaderboard */}
                <div className="bg-gray-900/80 backdrop-blur border border-white/10 p-3 rounded-lg w-48">
                    <h3 className="text-xs text-slate-400 uppercase font-bold mb-2 flex items-center gap-1 border-b border-white/10 pb-1">
                        <Crown className="w-3 h-3 text-yellow-500" /> Leaderboard
                    </h3>
                    <div className="flex flex-col gap-1">
                        {leaderboard.map((entry, index) => (
                            <div key={entry.id} className={`flex justify-between items-center text-xs ${entry.isPlayer ? 'text-white font-bold bg-white/10 -mx-1 px-1 rounded' : 'text-slate-300'}`}>
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="w-3 text-slate-500">{index + 1}.</span>
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></span>
                                    <span className="truncate max-w-[80px]">{entry.name}</span>
                                </div>
                                <span className="font-mono">{entry.score}</span>
                            </div>
                        ))}
                        {leaderboard.length === 0 && <div className="text-xs text-slate-500">Waiting for data...</div>}
                    </div>
                </div>

                {/* AI Commentator */}
                <div className="bg-gray-900/80 backdrop-blur border border-purple-500/30 p-3 rounded-lg max-w-md text-right hidden sm:block">
                    <h3 className="text-xs text-purple-400 uppercase font-tracking-wider mb-1 flex items-center justify-end gap-1">
                        <Activity className="w-3 h-3" /> 
                        AI Commentator
                    </h3>
                    <p className="text-white/90 text-sm italic animate-pulse">
                    {commentary || "Connecting to neural network..."}
                    </p>
                </div>
            </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex justify-between items-end relative">
            <div className="bg-gray-900/80 backdrop-blur border border-white/10 p-3 rounded-lg text-white/70 text-xs">
            <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">M</div>
                <span>Move Mouse / Touch to Steer</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]"><Zap className="w-2 h-2" /></div>
                <span>Click / Space / Tap to Boost</span>
            </div>
            </div>

            {/* Mobile Boost Button (Visible on bottom right, mainly for touch) */}
            <button
                className={`pointer-events-auto absolute bottom-0 right-0 w-24 h-24 mb-4 mr-4 rounded-full bg-cyan-500/20 backdrop-blur-sm border-2 border-cyan-400/50 flex flex-col items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all active:scale-95 active:bg-cyan-400/40 active:shadow-[0_0_40px_rgba(6,182,212,0.6)] ${isTouchBoosting ? 'scale-95 bg-cyan-400/40 shadow-[0_0_40px_rgba(6,182,212,0.6)]' : 'hover:scale-105'}`}
                onTouchStart={(e) => { e.preventDefault(); setIsTouchBoosting(true); }}
                onTouchEnd={(e) => { e.preventDefault(); setIsTouchBoosting(false); }}
                onMouseDown={() => setIsTouchBoosting(true)}
                onMouseUp={() => setIsTouchBoosting(false)}
                onMouseLeave={() => setIsTouchBoosting(false)}
            >
                <Zap className={`w-8 h-8 mb-1 ${isTouchBoosting ? 'text-white fill-white' : 'text-cyan-400'}`} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Boost</span>
            </button>
        </div>
        </div>

        {/* PAUSE MODAL */}
        {isPaused && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                <div className="bg-slate-800 border border-cyan-500/50 p-8 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.4)] text-center pointer-events-auto">
                    <Pause className="w-16 h-16 text-cyan-400 mx-auto mb-4 opacity-80" />
                    <h2 className="text-4xl font-black text-white mb-2 tracking-wider">PAUSED</h2>
                    <p className="text-slate-400 mb-8 text-sm">Take a breath, neon warrior.</p>
                    
                    <button 
                        onClick={onTogglePause}
                        className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-full shadow-lg transform hover:scale-105 transition-all flex items-center justify-center gap-2 mx-auto"
                    >
                        <PlayCircle className="w-5 h-5" />
                        RESUME
                    </button>
                </div>
            </div>
        )}
    </>
  );
};

export default Overlay;
