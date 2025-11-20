
import React, { useState, useEffect, useRef } from 'react';
import { Play, Check, Wand2, PaintBucket, Layers, Smile, Frown, Meh, HelpCircle, Zap, Ghost, Grid3x3, Shield, Circle, Square, Triangle, Palette, Flame } from 'lucide-react';
import { SNAKE_COLORS, SNAKE_PATTERNS, SNAKE_SKINS, SNAKE_FACES } from '../constants';
import { SnakePattern, GameSpeedMode, SnakeSkin, SnakeFace, PlayerPreferences } from '../types';

interface StartScreenProps {
  onStart: (name: string, color: string, pattern: SnakePattern, skin: SnakeSkin, face: SnakeFace, speed: GameSpeedMode) => void;
  lastScore?: number;
  initialValues?: PlayerPreferences;
}

// --- Live Preview Component ---
const SnakePreview: React.FC<{ color: string; skin: SnakeSkin; pattern: SnakePattern; face: SnakeFace }> = ({ color, skin, pattern, face }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Handle DPI/Resolution
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.scale(dpr, dpr);

    let animationFrameId: number;
    const startTime = Date.now();

    const render = () => {
      const time = Date.now() - startTime;
      // Use logic coords (CSS pixels)
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      // Draw scrolling grid background
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      const gridSize = 30;
      const scrollX = (time * 0.05) % gridSize; 
      
      ctx.beginPath();
      for(let x = -scrollX; x < width; x+=gridSize) { 
          ctx.moveTo(x,0); 
          ctx.lineTo(x,height); 
      }
      for(let y=0; y<height; y+=gridSize) { 
          ctx.moveTo(0,y); 
          ctx.lineTo(width,y); 
      }
      ctx.stroke();

      // Simulate Snake Body
      const centerX = width / 2;
      const centerY = height / 2;
      const snakeWidth = 22;
      const isRainbow = color === 'rainbow';
      
      const bodySegments = [];
      for (let i = 0; i < 15; i++) {
         const offset = i * 12;
         const wave = Math.sin((time / 200) + (i * 0.3)) * 10;
         bodySegments.push({ x: centerX - offset + 60, y: centerY + wave });
      }

      // --- DRAWING LOGIC ---
      let lineCap: CanvasLineCap = 'round';
      let lineJoin: CanvasLineJoin = 'round';
      let alpha = 1.0;

      if (skin === 'digital') { lineCap = 'square'; lineJoin = 'bevel'; }
      else if (skin === 'shard') { lineCap = 'butt'; lineJoin = 'miter'; }
      else if (skin === 'ghost') { alpha = 0.6; }

      ctx.lineCap = lineCap;
      ctx.lineJoin = lineJoin;
      ctx.globalAlpha = alpha;

      // Body
      if (isRainbow) {
          ctx.shadowBlur = skin === 'ghost' ? 30 : 20;
          ctx.shadowColor = 'rgba(255,255,255,0.5)';

          if (skin === 'pixel') {
               for (let i = 0; i < bodySegments.length; i++) {
                    const p = bodySegments[i];
                    const hue = (i * 20 - time / 5) % 360;
                    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                    ctx.fillRect(p.x - snakeWidth/2, p.y - snakeWidth/2, snakeWidth, snakeWidth);
               }
          } else {
               ctx.lineWidth = snakeWidth;
               for (let i = 0; i < bodySegments.length - 1; i++) {
                   ctx.beginPath();
                   ctx.moveTo(bodySegments[i].x, bodySegments[i].y);
                   ctx.lineTo(bodySegments[i+1].x, bodySegments[i+1].y);
                   const hue = (i * 20 - time / 5) % 360;
                   ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
                   ctx.stroke();
               }
          }
      } else if (skin === 'flames') {
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#ff4500'; 
          
          ctx.lineWidth = snakeWidth;
          ctx.strokeStyle = '#220a0a'; 
          ctx.beginPath();
          if (bodySegments.length > 0) {
              ctx.moveTo(bodySegments[0].x, bodySegments[0].y);
              for (let i = 1; i < bodySegments.length; i++) ctx.lineTo(bodySegments[i].x, bodySegments[i].y);
          }
          ctx.stroke();

          for (let i = 0; i < bodySegments.length - 1; i++) {
              const curr = bodySegments[i];
              const next = bodySegments[i+1];
              
              const pulse = Math.sin((time / 150) - (i * 0.5)) * 0.3 + 0.7;
              const fireWidth = snakeWidth * 0.6 * pulse;
              
              const hue = 20 + Math.sin(time / 200 - i * 0.2) * 20; 
              ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
              ctx.lineWidth = fireWidth;
              
              ctx.beginPath();
              ctx.moveTo(curr.x, curr.y);
              ctx.lineTo(next.x, next.y);
              ctx.stroke();
          }

      } else {
          ctx.strokeStyle = color;
          ctx.fillStyle = color;
          if (skin === 'ghost') {
             ctx.lineWidth = snakeWidth * 0.5;
             ctx.shadowBlur = 20; 
             ctx.shadowColor = '#ffffff';
          } else {
             ctx.lineWidth = snakeWidth;
             ctx.shadowBlur = 20;
             ctx.shadowColor = color;
          }

          if (skin === 'pixel') {
              for (const p of bodySegments) {
                 ctx.fillRect(p.x - snakeWidth/2, p.y - snakeWidth/2, snakeWidth, snakeWidth);
              }
          } else {
              ctx.beginPath();
              if (bodySegments.length > 0) {
                  ctx.moveTo(bodySegments[0].x, bodySegments[0].y);
                  for (let i = 1; i < bodySegments.length; i++) ctx.lineTo(bodySegments[i].x, bodySegments[i].y);
              }
              ctx.stroke();
          }

          if (skin === 'ghost') {
              ctx.save();
              ctx.globalAlpha = 0.3;
              ctx.lineWidth = snakeWidth;
              ctx.strokeStyle = color;
              ctx.shadowBlur = 0;
              ctx.beginPath();
              if (bodySegments.length > 0) {
                  ctx.moveTo(bodySegments[0].x, bodySegments[0].y);
                  for (let i = 1; i < bodySegments.length; i++) ctx.lineTo(bodySegments[i].x, bodySegments[i].y);
              }
              ctx.stroke();
              ctx.restore();
          }
      }

      // Patterns
      if (pattern !== 'none') {
          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          
          if (pattern === 'stripes') {
              ctx.lineWidth = snakeWidth * 0.3;
              for (let i = 1; i < bodySegments.length - 1; i += 2) {
                  const curr = bodySegments[i];
                  ctx.beginPath();
                  ctx.moveTo(curr.x, curr.y - 8);
                  ctx.lineTo(curr.x, curr.y + 8);
                  ctx.stroke();
              }
          } else if (pattern === 'spots') {
              for (let i = 2; i < bodySegments.length - 1; i += 3) {
                 ctx.beginPath();
                 ctx.arc(bodySegments[i].x, bodySegments[i].y, snakeWidth * 0.3, 0, Math.PI*2);
                 ctx.fill();
              }
          } else if (pattern === 'waves') {
              ctx.lineWidth = snakeWidth * 0.2;
              ctx.beginPath();
              for (let i = 1; i < bodySegments.length - 1; i++) {
                  const curr = bodySegments[i];
                  const offset = Math.sin(i * 0.8) * (snakeWidth * 0.35);
                  if (i === 1) ctx.moveTo(curr.x, curr.y + offset);
                  else ctx.lineTo(curr.x, curr.y + offset);
              }
              ctx.stroke();
          } else if (pattern === 'camouflage') {
               for (let i = 2; i < bodySegments.length - 1; i += 3) {
                  const size = snakeWidth * 0.6;
                  ctx.fillRect(bodySegments[i].x - size/2, bodySegments[i].y - size/2, size, size);
               }
          }
      }

      // Head
      const head = bodySegments[0];
      const headAngle = Math.atan2(bodySegments[0].y - bodySegments[1].y, bodySegments[0].x - bodySegments[1].x);
      
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'white';
      ctx.globalAlpha = 1.0;
      
      ctx.save();
      ctx.translate(head.x, head.y);
      ctx.rotate(headAngle);
      
      const isPixel = (skin === 'digital' || skin === 'pixel');

      if (isPixel) {
          ctx.fillStyle = isRainbow ? '#fff' : color;
          ctx.fillRect(-snakeWidth/2, -snakeWidth/2, snakeWidth, snakeWidth);
          ctx.fillStyle = 'white';
      } else if (skin === 'shard') {
          ctx.fillStyle = isRainbow ? '#fff' : color;
          ctx.beginPath();
          ctx.moveTo(snakeWidth * 0.8, 0);
          ctx.lineTo(-snakeWidth * 0.5, snakeWidth * 0.6);
          ctx.lineTo(-snakeWidth * 0.5, -snakeWidth * 0.6);
          ctx.fill();
          ctx.fillStyle = 'white';
      } else if (skin === 'cobra') {
          ctx.fillStyle = isRainbow ? '#fff' : color;
          const breath = Math.sin(time / 300) * 0.05;
          const hoodWidthScale = 1.4 + breath;
          const hoodW = snakeWidth * hoodWidthScale;
          
          ctx.beginPath();
          ctx.ellipse(-snakeWidth * 0.2, 0, snakeWidth * 0.8, hoodW, 0, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          for(let lx = -snakeWidth * 0.6; lx < snakeWidth * 0.2; lx += snakeWidth * 0.3) {
              for(let ly = -hoodW * 0.8; ly < hoodW * 0.8; ly += snakeWidth * 0.3) {
                   if (Math.abs(ly) < hoodW * 0.7) {
                       ctx.beginPath();
                       ctx.arc(lx, ly, snakeWidth * 0.08, 0, Math.PI * 2);
                       ctx.fill();
                   }
              }
          }

          ctx.strokeStyle = 'rgba(0,0,0,0.4)';
          ctx.lineWidth = snakeWidth * 0.15;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-snakeWidth * 0.5, -hoodW * 0.5);
          ctx.bezierCurveTo(-snakeWidth * 0.2, 0, -snakeWidth * 0.2, 0, -snakeWidth * 0.5, hoodW * 0.5);
          ctx.stroke();
          
          ctx.fillStyle = 'white';
      } else if (skin === 'flames') {
         const pulse = Math.sin(time / 150) * 0.2 + 1.0;
         ctx.fillStyle = '#ff3300';
         ctx.shadowColor = '#ffaa00';
         ctx.shadowBlur = 15 * pulse;
         
         ctx.beginPath();
         ctx.arc(0, 0, snakeWidth * 0.55, 0, Math.PI * 2);
         ctx.fill();
         
         ctx.fillStyle = '#ffff00';
         ctx.beginPath();
         ctx.arc(0, 0, snakeWidth * 0.3 * pulse, 0, Math.PI * 2);
         ctx.fill();
         ctx.shadowBlur = 0;
      }

       const eyeOffset = snakeWidth * 0.35; 
       const eyeSize = snakeWidth * 0.35; 

       ctx.fillStyle = 'white';
       ctx.strokeStyle = 'rgba(0,0,0,0.7)';
       ctx.lineWidth = 2;

       const drawEyeContainer = (x: number, y: number, radius: number) => {
            ctx.beginPath();
            if (isPixel) {
                ctx.rect(x - radius, y - radius, radius * 2, radius * 2);
            } else {
                ctx.arc(x, y, radius, 0, Math.PI * 2);
            }
            ctx.fill();
            ctx.stroke();
       };
       
       const drawPupil = (x: number, y: number, radius: number) => {
            ctx.fillStyle = 'black';
            ctx.beginPath();
            if (isPixel) {
                ctx.rect(x - radius, y - radius, radius * 2, radius * 2);
            } else {
                ctx.arc(x, y, radius, 0, Math.PI * 2);
            }
            ctx.fill();
       };

       if (face === 'none') {
           drawEyeContainer(eyeOffset * 0.6, -eyeOffset, eyeSize);
           drawEyeContainer(eyeOffset * 0.6, eyeOffset, eyeSize);
           drawPupil(eyeOffset * 0.8, -eyeOffset, eyeSize * 0.4);
           drawPupil(eyeOffset * 0.8, eyeOffset, eyeSize * 0.4);

       } else if (face === 'happy') {
           ctx.beginPath();
           ctx.lineWidth = 3;
           ctx.strokeStyle = 'white';
           ctx.shadowColor = 'black';
           ctx.shadowBlur = 3;

           if (isPixel) {
               ctx.moveTo(-eyeSize/2, -eyeOffset);
               ctx.lineTo(eyeSize/2, -eyeOffset - eyeSize);
               ctx.lineTo(eyeSize*1.5, -eyeOffset);
           } else {
               ctx.arc(eyeOffset * 0.6, -eyeOffset, eyeSize, Math.PI, 0);
           }
           ctx.stroke();
           
           ctx.beginPath();
           if (isPixel) {
               ctx.moveTo(-eyeSize/2, eyeOffset);
               ctx.lineTo(eyeSize/2, eyeOffset + eyeSize);
               ctx.lineTo(eyeSize*1.5, eyeOffset);
           } else {
               ctx.arc(eyeOffset * 0.6, eyeOffset, eyeSize, Math.PI, 0);
           }
           ctx.stroke();

           ctx.shadowBlur = 0; 

           ctx.fillStyle = 'white';
           ctx.strokeStyle = 'rgba(0,0,0,0.7)';
           ctx.lineWidth = 2;
           ctx.beginPath();
           if (isPixel) {
               ctx.rect(0, -eyeSize/2, eyeSize, eyeSize);
           } else {
               ctx.arc(snakeWidth * 0.2, 0, eyeSize * 0.6, 0, Math.PI * 2);
           }
           ctx.fill();
           ctx.stroke();

       } else if (face === 'angry') {
           ctx.save();
           ctx.translate(eyeOffset * 0.6, -eyeOffset);
           ctx.rotate(0.4); 
           ctx.beginPath();
           if (isPixel) {
               ctx.rect(-eyeSize, -eyeSize/2, eyeSize*2, eyeSize);
           } else {
               ctx.arc(0, 0, eyeSize, Math.PI, 0);
           }
           ctx.fillStyle = 'white';
           ctx.fill();
           ctx.stroke();
           drawPupil(0, 0, eyeSize * 0.3);
           ctx.restore();

           ctx.save();
           ctx.translate(eyeOffset * 0.6, eyeOffset);
           ctx.rotate(-0.4); 
           ctx.beginPath();
           if (isPixel) {
               ctx.rect(-eyeSize, -eyeSize/2, eyeSize*2, eyeSize);
           } else {
               ctx.arc(0, 0, eyeSize, Math.PI, 0);
           }
           ctx.fillStyle = 'white';
           ctx.fill();
           ctx.stroke();
           drawPupil(0, 0, eyeSize * 0.3);
           ctx.restore();

       } else if (face === 'confused') {
           drawEyeContainer(eyeOffset * 0.6, -eyeOffset, eyeSize * 1.3);
           drawPupil(eyeOffset * 0.6, -eyeOffset, eyeSize * 0.3);

           drawEyeContainer(eyeOffset * 0.6, eyeOffset, eyeSize * 0.6);
           drawPupil(eyeOffset * 0.6, eyeOffset, eyeSize * 0.2);

           ctx.beginPath();
           ctx.strokeStyle = 'white';
           ctx.lineWidth = 3;
           ctx.shadowColor = 'black';
           ctx.shadowBlur = 2;
           ctx.moveTo(0, -snakeWidth * 0.15);
           ctx.lineTo(snakeWidth * 0.2, 0);
           ctx.lineTo(0, snakeWidth * 0.15);
           ctx.stroke();
           ctx.shadowBlur = 0;

       } else if (face === 'cheeky') {
           drawEyeContainer(eyeOffset * 0.6, -eyeOffset, eyeSize);
           drawPupil(eyeOffset * 0.6, -eyeOffset, eyeSize * 0.4);

           ctx.beginPath();
           ctx.strokeStyle = 'white';
           ctx.lineWidth = 3;
           ctx.shadowColor = 'black';
           ctx.shadowBlur = 2;
           ctx.moveTo(0, eyeOffset - eyeSize/2);
           ctx.lineTo(eyeOffset, eyeOffset);
           ctx.lineTo(0, eyeOffset + eyeSize/2);
           ctx.stroke();
           ctx.shadowBlur = 0;

           ctx.fillStyle = '#ff4081'; 
           ctx.strokeStyle = 'rgba(0,0,0,0.5)';
           ctx.lineWidth = 1;
           ctx.beginPath();
           if (isPixel) {
               ctx.rect(snakeWidth*0.3, snakeWidth*0.1, snakeWidth*0.4, snakeWidth*0.3);
           } else {
               ctx.arc(snakeWidth * 0.4, snakeWidth * 0.2, snakeWidth * 0.18, 0, Math.PI * 2);
           }
           ctx.fill();
           ctx.stroke();

       } else if (face === 'evil') {
           ctx.fillStyle = '#ffeb3b'; 
           
           ctx.beginPath();
           if (isPixel) {
               ctx.rect(0, -eyeOffset - eyeSize, eyeSize*2, eyeSize * 1.5);
           } else {
               ctx.ellipse(eyeOffset * 0.8, -eyeOffset, eyeSize * 1.2, eyeSize * 0.7, 0.3, 0, Math.PI * 2);
           }
           ctx.fill();
           ctx.stroke();
           
           ctx.beginPath();
           if (isPixel) {
               ctx.rect(0, eyeOffset - eyeSize * 0.5, eyeSize*2, eyeSize * 1.5);
           } else {
               ctx.ellipse(eyeOffset * 0.8, eyeOffset, eyeSize * 1.2, eyeSize * 0.7, -0.3, 0, Math.PI * 2);
           }
           ctx.fill();
           ctx.stroke();

           ctx.fillStyle = 'black';
           ctx.beginPath();
           if (isPixel) {
                ctx.rect(eyeOffset, -eyeOffset - eyeSize, snakeWidth * 0.1, eyeSize * 1.5);
                ctx.rect(eyeOffset, eyeOffset - eyeSize * 0.5, snakeWidth * 0.1, eyeSize * 1.5);
           } else {
                ctx.ellipse(eyeOffset * 0.8, -eyeOffset, eyeSize * 0.3, eyeSize * 0.6, 0.3, 0, Math.PI * 2);
                ctx.ellipse(eyeOffset * 0.8, eyeOffset, eyeSize * 0.3, eyeSize * 0.6, -0.3, 0, Math.PI * 2);
           }
           ctx.fill();
       }
      
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    // Add resize listener for canvas
    const handleResize = () => {
       const dpr = window.devicePixelRatio || 1;
       const rect = canvas.getBoundingClientRect();
       canvas.width = rect.width * dpr;
       canvas.height = rect.height * dpr;
       ctx.scale(dpr, dpr);
    };
    window.addEventListener('resize', handleResize);

    render();
    return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', handleResize);
    };
  }, [color, skin, pattern, face]);

  return (
    <div className="absolute inset-0 flex items-center justify-center">
       <canvas ref={canvasRef} className="w-full h-full object-contain" />
       <div className="absolute bottom-4 left-0 w-full text-center pointer-events-none">
            <span className="px-3 py-1 bg-black/50 rounded-full text-[10px] text-cyan-300 uppercase tracking-wider border border-cyan-500/30 shadow-lg backdrop-blur-sm">
                {skin} • {face}
            </span>
       </div>
    </div>
  );
};

const StartScreen: React.FC<StartScreenProps> = ({ onStart, lastScore, initialValues }) => {
    const [name, setName] = useState('NeonSurfer');
    const [selectedColor, setSelectedColor] = useState(SNAKE_COLORS[0]);
    const [customColor, setCustomColor] = useState('#ffffff');
    const [selectedPattern, setSelectedPattern] = useState<SnakePattern>('none');
    const [selectedSkin, setSelectedSkin] = useState<SnakeSkin>('standard');
    const [selectedFace, setSelectedFace] = useState<SnakeFace>('none');
    const [selectedSpeed, setSelectedSpeed] = useState<GameSpeedMode>('NORMAL');
    const [activeTab, setActiveTab] = useState<'skin' | 'face' | 'pattern' | 'color'>('skin');
    const isCustomSelected = !SNAKE_COLORS.includes(selectedColor);

    useEffect(() => {
        if (initialValues) {
            setName(initialValues.name || 'NeonSurfer');
            if (initialValues.color) {
                if (SNAKE_COLORS.includes(initialValues.color)) {
                    setSelectedColor(initialValues.color);
                } else if (initialValues.color.startsWith('#')) {
                    setSelectedColor(initialValues.color);
                    setCustomColor(initialValues.color);
                }
            }
            if (initialValues.pattern) setSelectedPattern(initialValues.pattern);
            if (initialValues.skin) setSelectedSkin(initialValues.skin);
            if (initialValues.face) setSelectedFace(initialValues.face);
            if (initialValues.speed) setSelectedSpeed(initialValues.speed);
        }
    }, [initialValues]);

    const renderSkinIcon = (skin: SnakeSkin) => {
        switch (skin) {
            case 'digital': return <Square className="w-8 h-8 mb-1 opacity-80" />;
            case 'shard': return <Triangle className="w-8 h-8 mb-1 opacity-80" />;
            case 'ghost': return <Ghost className="w-8 h-8 mb-1 opacity-80" />;
            case 'pixel': return <Grid3x3 className="w-8 h-8 mb-1 opacity-80" />;
            case 'cobra': return <Shield className="w-8 h-8 mb-1 opacity-80" />;
            case 'flames': return <Flame className="w-8 h-8 mb-1 opacity-80 text-orange-500" />;
            default: return <Circle className="w-8 h-8 mb-1 opacity-80" />;
        }
    };
  
    const renderFaceIcon = (face: SnakeFace) => {
        switch (face) {
            case 'happy': return <Smile className="w-8 h-8 mb-1 opacity-80" />;
            case 'angry': return <Frown className="w-8 h-8 mb-1 opacity-80" />;
            case 'confused': return <HelpCircle className="w-8 h-8 mb-1 opacity-80" />;
            case 'cheeky': return <Zap className="w-8 h-8 mb-1 opacity-80" />;
            case 'evil': return <Ghost className="w-8 h-8 mb-1 opacity-80" />;
            default: return <Meh className="w-8 h-8 mb-1 opacity-80" />;
        }
    };

    return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/95 backdrop-blur-md z-50 p-4">
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>

      <div className="w-full max-w-4xl bg-slate-800/50 border border-cyan-500/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[95vh] md:h-[600px]">
        
        <div className="w-full md:w-1/3 bg-slate-900/80 p-6 flex flex-col relative border-b md:border-b-0 md:border-r border-white/10 shrink-0">
            <div className="mb-4 md:mb-6 text-center">
                {lastScore !== undefined ? (
                    <div className="animate-fade-in">
                         <h2 className="text-2xl font-black text-red-500 tracking-tight mb-1">ELIMINATED</h2>
                         <div className="text-white text-4xl font-mono font-bold mb-4">{lastScore} <span className="text-sm text-slate-400 font-sans font-normal">PTS</span></div>
                    </div>
                ) : (
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tighter filter drop-shadow-lg">
                            NEON<br/>SERPENT
                        </h1>
                        <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-2">v2.0 • Online</p>
                    </div>
                )}
            </div>

            <div className="flex-grow relative min-h-[150px] rounded-xl overflow-hidden bg-slate-800/50">
                <div className="absolute -inset-4 bg-cyan-500/10 blur-2xl rounded-full"></div>
                <SnakePreview color={selectedColor} skin={selectedSkin} pattern={selectedPattern} face={selectedFace} />
            </div>
        </div>

        <div className="w-full md:w-2/3 p-6 md:p-8 flex flex-col overflow-y-auto scrollbar-hide">
            <form onSubmit={(e) => { e.preventDefault(); onStart(name, selectedColor, selectedPattern, selectedSkin, selectedFace, selectedSpeed); }} className="flex flex-col h-full">
                <div className="mb-6 md:mb-8">
                    <label className="block text-slate-400 text-xs uppercase font-bold mb-2">Operator Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="ENTER NAME"
                        maxLength={12}
                        className="w-full bg-slate-900/50 text-white text-lg font-bold py-3 px-4 rounded-xl border border-white/10 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder-slate-600"
                        autoFocus
                    />
                </div>

                <div className="flex-grow">
                    <div className="flex gap-2 mb-4 bg-slate-900/50 p-1 rounded-lg border border-white/5 overflow-x-auto">
                        {[
                            { id: 'skin', icon: Wand2, label: 'Skin' },
                            { id: 'face', icon: Smile, label: 'Face' },
                            { id: 'pattern', icon: Layers, label: 'Pattern' },
                            { id: 'color', icon: PaintBucket, label: 'Color' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 min-w-[80px] flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold uppercase transition-all duration-200 active:scale-95 ${
                                    activeTab === tab.id 
                                    ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25 scale-105' 
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <tab.icon className="w-3 h-3" /> {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="bg-slate-900/30 rounded-xl p-4 border border-white/5 min-h-[200px]">
                        
                        {activeTab === 'skin' && (
                            <div className="grid grid-cols-3 gap-3">
                                {SNAKE_SKINS.map((skin) => (
                                    <button
                                        key={skin}
                                        type="button"
                                        onClick={() => setSelectedSkin(skin as SnakeSkin)}
                                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 aspect-square active:scale-95 ${
                                            selectedSkin === skin 
                                            ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)] scale-105' 
                                            : 'border-transparent bg-slate-800 hover:bg-slate-750 hover:shadow-lg hover:shadow-cyan-500/5 text-slate-500 hover:text-slate-200 hover:scale-105'
                                        }`}
                                    >
                                        {renderSkinIcon(skin as SnakeSkin)}
                                        <span className="text-[10px] uppercase font-bold mt-2">{skin}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {activeTab === 'face' && (
                            <div className="grid grid-cols-3 gap-3">
                                {SNAKE_FACES.map((face) => (
                                    <button
                                        key={face}
                                        type="button"
                                        onClick={() => setSelectedFace(face as SnakeFace)}
                                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 aspect-square active:scale-95 ${
                                            selectedFace === face 
                                            ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)] scale-105' 
                                            : 'border-transparent bg-slate-800 hover:bg-slate-750 hover:shadow-lg hover:shadow-cyan-500/5 text-slate-500 hover:text-slate-200 hover:scale-105'
                                        }`}
                                    >
                                        {renderFaceIcon(face as SnakeFace)}
                                        <span className="text-[10px] uppercase font-bold mt-2">{face}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {activeTab === 'pattern' && (
                            <div className="grid grid-cols-2 gap-3">
                                {SNAKE_PATTERNS.map((pattern) => (
                                    <button
                                        key={pattern}
                                        type="button"
                                        onClick={() => setSelectedPattern(pattern as SnakePattern)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border border-transparent transition-all duration-200 active:scale-95 ${
                                            selectedPattern === pattern 
                                            ? 'bg-white/10 border-white/30 text-white scale-[1.02]' 
                                            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white hover:scale-[1.02]'
                                        }`}
                                    >
                                        <div className="w-8 h-8 rounded bg-slate-900 border border-white/10 relative overflow-hidden">
                                                {pattern === 'stripes' && <div className="absolute top-1/2 w-full h-1 bg-white/50 -translate-y-1/2"></div>}
                                                {pattern === 'spots' && <div className="absolute inset-0 flex items-center justify-center"><div className="w-2 h-2 bg-white/50 rounded-full"></div></div>}
                                                {pattern === 'waves' && <div className="absolute inset-0 flex items-center justify-center text-[8px]">~</div>}
                                                {pattern === 'camouflage' && <div className="absolute top-0 left-0 w-4 h-4 bg-white/30 rotate-45"></div>}
                                        </div>
                                        <span className="text-xs uppercase font-bold">{pattern}</span>
                                        {selectedPattern === pattern && <Check className="w-4 h-4 ml-auto text-cyan-400" />}
                                    </button>
                                ))}
                            </div>
                        )}

                        {activeTab === 'color' && (
                            <div className="flex flex-wrap gap-3 justify-center">
                                {SNAKE_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setSelectedColor(color)}
                                        className={`w-12 h-12 rounded-full shadow-lg transition-transform duration-200 hover:scale-110 active:scale-95 relative ${
                                            selectedColor === color ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                                        }`}
                                        style={{ 
                                            background: color === 'rainbow' ? 'linear-gradient(135deg, #ff0000, #ffff00, #00ff00, #0000ff, #ff00ff)' : color
                                        }}
                                    >
                                        {selectedColor === color && <Check className="w-6 h-6 text-black/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" strokeWidth={3} />}
                                    </button>
                                ))}
                                
                                <div className={`relative w-12 h-12 rounded-full border flex items-center justify-center overflow-hidden cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 ${
                                    isCustomSelected 
                                    ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900 border-white/50' 
                                    : 'bg-slate-700 border-white/20 hover:bg-slate-600'
                                }`}>
                                    <input 
                                        type="color" 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        onChange={(e) => {
                                            setSelectedColor(e.target.value);
                                            setCustomColor(e.target.value);
                                        }}
                                        value={customColor}
                                    />
                                    {isCustomSelected ? (
                                        <div className="absolute inset-0 w-full h-full" style={{ background: customColor }}></div>
                                    ) : (
                                        <Palette className="w-5 h-5 text-slate-300 pointer-events-none" />
                                    )}
                                    {isCustomSelected && <Check className="w-6 h-6 text-black/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20" strokeWidth={3} />}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between gap-4">
                    <div className="flex-1">
                        <label className="block text-slate-500 text-[10px] uppercase font-bold mb-2">Initial Velocity</label>
                        <div className="flex bg-slate-900 rounded-lg p-1">
                            {(['SLOW', 'NORMAL', 'FAST'] as GameSpeedMode[]).map((speed) => (
                                <button
                                    key={speed}
                                    type="button"
                                    onClick={() => setSelectedSpeed(speed)}
                                    className={`flex-1 py-2 text-[10px] font-bold rounded transition-all ${
                                        selectedSpeed === speed 
                                        ? (speed === 'SLOW' ? 'bg-green-500/20 text-green-400' : speed === 'NORMAL' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-red-500/20 text-red-400') 
                                        : 'text-slate-500 hover:text-slate-300'
                                    }`}
                                >
                                    {speed}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => onStart(name, selectedColor, selectedPattern, selectedSkin, selectedFace, selectedSpeed)}
                        type="button"
                        className="flex-1 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transform hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <Play className="w-5 h-5 fill-current" />
                        {lastScore !== undefined ? 'RE-ENGAGE' : 'START'}
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;
