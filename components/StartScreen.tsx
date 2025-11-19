
import React, { useState } from 'react';
import { Play, Skull, Check, Grip, AlignJustify, Circle, Gauge } from 'lucide-react';
import { SNAKE_COLORS } from '../constants';
import { SnakePattern, GameSpeedMode } from '../types';

interface StartScreenProps {
  onStart: (name: string, color: string, pattern: SnakePattern, speed: GameSpeedMode) => void;
  lastScore?: number;
  commentary?: string;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, lastScore, commentary }) => {
  const [name, setName] = useState('NeonSurfer');
  const [selectedColor, setSelectedColor] = useState(SNAKE_COLORS[0]);
  const [selectedPattern, setSelectedPattern] = useState<SnakePattern>('none');
  const [selectedSpeed, setSelectedSpeed] = useState<GameSpeedMode>('NORMAL');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onStart(name, selectedColor, selectedPattern, selectedSpeed);
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm z-50">
      <div className="relative w-full max-w-md p-8 rounded-2xl bg-slate-800 border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Background decorative elements */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl"></div>

        <div className="relative z-10 text-center">
          {lastScore !== undefined ? (
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 ring-2 ring-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                <Skull className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2 tracking-tight">ELIMINATED</h2>
              <p className="text-cyan-300 text-lg font-mono">Score: {lastScore}</p>
              {commentary && (
                <div className="mt-4 p-3 bg-black/30 rounded-lg border-l-4 border-purple-500 text-purple-200 italic text-sm">
                  "{commentary}"
                </div>
              )}
            </div>
          ) : (
            <div className="mb-6">
               <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-2 tracking-tighter filter drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                NEON<br/>SERPENT
              </h1>
              <p className="text-slate-400 text-sm uppercase tracking-widest">Massively Singleplayer Battle</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg blur opacity-50 group-hover:opacity-100 transition duration-500"></div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter Callsign"
                maxLength={12}
                className="relative w-full bg-slate-900 text-white text-center font-bold py-4 rounded-lg border-none outline-none focus:ring-2 focus:ring-white/20 placeholder-slate-600"
                autoFocus
              />
            </div>

            {/* Color Picker */}
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Select Skin</p>
              <div className="flex justify-center gap-2 flex-wrap">
                {SNAKE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full transition-all duration-200 relative ${
                      selectedColor === color 
                        ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-800 shadow-[0_0_15px_rgba(255,255,255,0.5)]' 
                        : 'hover:scale-110 opacity-70 hover:opacity-100'
                    }`}
                    style={{ 
                      backgroundColor: color === 'rainbow' ? undefined : color,
                      background: color === 'rainbow' ? 'linear-gradient(135deg, #ff0000, #ffff00, #00ff00, #0000ff, #ff00ff)' : undefined,
                      boxShadow: selectedColor === color ? (color === 'rainbow' ? '0 0 15px rgba(255,255,255,0.5)' : `0 0 10px ${color}`) : 'none'
                    }}
                  >
                    {selectedColor === color && (
                      <div className="absolute inset-0 flex items-center justify-center">
                          <Check className="w-4 h-4 text-black/50" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
                {/* Pattern Picker */}
                <div className="flex-1">
                   <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Pattern</p>
                   <div className="flex justify-center gap-2">
                      {(['none', 'stripes', 'spots'] as SnakePattern[]).map((pattern) => (
                         <button
                            key={pattern}
                            type="button"
                            onClick={() => setSelectedPattern(pattern)}
                            className={`flex flex-col items-center justify-center w-full p-2 rounded-lg transition-all ${selectedPattern === pattern ? 'bg-white/10 ring-1 ring-cyan-400' : 'hover:bg-white/5 opacity-60'}`}
                          >
                              <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center border border-white/10 mb-1 overflow-hidden relative">
                                 {pattern === 'none' && <span className="block w-full h-0.5 bg-white/60 rounded"></span>}
                                 {pattern === 'stripes' && (
                                     <div className="absolute inset-0 flex flex-col justify-evenly">
                                         <div className="h-0.5 bg-white/90 w-full"></div>
                                         <div className="h-0.5 bg-white/90 w-full"></div>
                                     </div>
                                 )}
                                 {pattern === 'spots' && (
                                     <div className="flex gap-0.5">
                                         <div className="w-1.5 h-1.5 rounded-full bg-white/90"></div>
                                         <div className="w-1 h-1 rounded-full bg-white/90"></div>
                                     </div>
                                 )}
                              </div>
                              <span className="text-[9px] text-slate-300 uppercase font-bold">{pattern}</span>
                         </button>
                      ))}
                   </div>
                </div>

                {/* Speed Picker */}
                <div className="flex-1">
                   <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Game Speed</p>
                   <div className="flex justify-center gap-2">
                      {(['SLOW', 'NORMAL', 'FAST'] as GameSpeedMode[]).map((speed) => (
                         <button
                            key={speed}
                            type="button"
                            onClick={() => setSelectedSpeed(speed)}
                            className={`flex flex-col items-center justify-center w-full p-2 rounded-lg transition-all ${selectedSpeed === speed ? 'bg-white/10 ring-1 ring-cyan-400' : 'hover:bg-white/5 opacity-60'}`}
                          >
                              <Gauge className={`w-6 h-6 mb-1 ${
                                  speed === 'SLOW' ? 'text-green-400' : 
                                  speed === 'NORMAL' ? 'text-cyan-400' : 'text-red-500'
                              }`} />
                              <span className="text-[9px] text-slate-300 uppercase font-bold">{speed}</span>
                         </button>
                      ))}
                   </div>
                </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-lg shadow-lg transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group mt-4"
            >
              <Play className="w-5 h-5 fill-current group-hover:translate-x-1 transition-transform" />
              {lastScore !== undefined ? 'RESPAWN' : 'ENTER ARENA'}
            </button>
          </form>
          
          <div className="mt-4 text-[10px] text-slate-500">
             Uses Gemini AI for Dynamic Commentary • React • Canvas
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;
