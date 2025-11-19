
import React, { useEffect, useRef } from 'react';
import { GameState, Point, Snake, Food, Particle, Camera, LeaderboardEntry, SnakePattern, GameSpeedMode } from '../types';
import { 
  WORLD_SIZE, INITIAL_SNAKE_LENGTH, BASE_SPEED, BOOST_SPEED, 
  TURN_SPEED, SEGMENT_DISTANCE, FOOD_COUNT, BOT_COUNT, COLORS, SNAKE_COLORS, FOOD_COLORS, FOOD_VALUE, SNAKE_PATTERNS,
  GAME_SPEEDS, TARGET_FPS
} from '../constants';

interface GameCanvasProps {
  gameState: GameState;
  playerName: string;
  playerColor: string;
  playerPattern: SnakePattern;
  gameSpeed: GameSpeedMode;
  isPaused: boolean;
  isTouchBoosting: boolean;
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  onKill: () => void;
  onLeaderboardUpdate: (leaderboard: LeaderboardEntry[]) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  gameState, 
  playerName, 
  playerColor, 
  playerPattern,
  gameSpeed,
  isPaused,
  isTouchBoosting,
  onGameOver, 
  onScoreUpdate, 
  onKill,
  onLeaderboardUpdate 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Mutable game state refs (for performance, avoiding React render cycle)
  const playerRef = useRef<Snake | null>(null);
  const botsRef = useRef<Snake[]>([]);
  const foodRef = useRef<Food[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const cameraRef = useRef<Camera>({ x: 0, y: 0, zoom: 1 });
  const mouseRef = useRef<Point>({ x: 0, y: 0 });
  const animationFrameRef = useRef<number>();
  const lastLeaderboardUpdateRef = useRef<number>(0);
  const shakeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  
  // Input state refs
  const isMouseBoostRef = useRef(false);
  const isKeyBoostRef = useRef(false);
  const isPausedRef = useRef(isPaused);
  const isTouchBoostingRef = useRef(isTouchBoosting);

  // Sync refs with props
  useEffect(() => {
    isPausedRef.current = isPaused;
    // When unpausing, reset lastTime to avoid huge delta jump
    if (!isPaused) {
        lastTimeRef.current = 0;
    }
  }, [isPaused]);

  useEffect(() => {
    isTouchBoostingRef.current = isTouchBoosting;
  }, [isTouchBoosting]);

  // --- Helpers ---

  const randomColor = () => SNAKE_COLORS[Math.floor(Math.random() * SNAKE_COLORS.length)];
  const randomPattern = () => SNAKE_PATTERNS[Math.floor(Math.random() * SNAKE_PATTERNS.length)] as SnakePattern;

  const triggerShake = (amount: number) => {
    // Add shake, capped at a reasonable maximum to prevent nausea
    shakeRef.current = Math.min(50, shakeRef.current + amount);
  };

  const getSnakeWidth = (snake: Snake) => {
    // Base width is 22. Grows with length.
    const extraWidth = Math.max(0, snake.body.length - INITIAL_SNAKE_LENGTH) * 0.1;
    
    // Cap the maximum added width to 40 (max total width 62px)
    const baseWidth = 22 + Math.min(40, extraWidth);
    
    // Boosting makes the snake look slightly aerodynamic/thinner
    return snake.isBoosting ? baseWidth * 0.85 : baseWidth;
  };

  const getSafeSpawnPosition = (): Point => {
    // If player is dead or doesn't exist, random spawn is fine
    if (!playerRef.current || playerRef.current.isDead) {
      return { x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE };
    }

    const playerHead = playerRef.current.body[0];
    const safeRadius = 1200; 
    let attempts = 0;
    
    while (attempts < 15) {
      const x = Math.random() * WORLD_SIZE;
      const y = Math.random() * WORLD_SIZE;
      const dist = Math.hypot(x - playerHead.x, y - playerHead.y);
      
      if (dist > safeRadius) {
        return { x, y };
      }
      attempts++;
    }
    
    return { x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE };
  };

  const createSnake = (id: string, name: string, isBot: boolean, startX: number, startY: number, overrideColor?: string, overridePattern?: SnakePattern): Snake => {
    const body: Point[] = [];
    for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
      body.push({ x: startX, y: startY + i * SEGMENT_DISTANCE });
    }
    return {
      id,
      name,
      body,
      angle: -Math.PI / 2,
      targetAngle: -Math.PI / 2,
      speed: BASE_SPEED,
      color: overrideColor || (isBot ? randomColor() : COLORS.neonBlue),
      pattern: overridePattern || (isBot ? randomPattern() : 'none'),
      isBoosting: false,
      isDead: false,
      score: 0,
      isBot,
    };
  };

  const createFood = (count: number): Food[] => {
    const foods: Food[] = [];
    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 3;
      foods.push({
        id: Math.random().toString(36).substr(2, 9),
        x: Math.random() * WORLD_SIZE,
        y: Math.random() * WORLD_SIZE,
        color: FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)],
        radius: r, 
        originalRadius: r,
        pulsePhase: Math.random() * Math.PI * 2,
        value: FOOD_VALUE
      });
    }
    return foods;
  };

  const createParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const pColor = color === 'rainbow' 
          ? `hsl(${Math.random() * 360}, 100%, 50%)` 
          : color;

      particlesRef.current.push({
        id: Math.random().toString(),
        x,
        y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
        color: pColor
      });
    }
  };

  // --- Game Logic ---

  const initGame = () => {
    const startX = WORLD_SIZE / 2;
    const startY = WORLD_SIZE / 2;
    
    playerRef.current = createSnake('player', playerName, false, startX, startY, playerColor, playerPattern);
    
    const newBots: Snake[] = [];
    for (let i = 0; i < BOT_COUNT; i++) {
      const { x, y } = getSafeSpawnPosition();
      newBots.push(createSnake(
        `bot-${i}`, 
        `Bot ${i + 1}`, 
        true, 
        x, 
        y
      ));
    }
    botsRef.current = newBots;
    foodRef.current = createFood(FOOD_COUNT);
    particlesRef.current = [];
    cameraRef.current = { x: startX, y: startY, zoom: 1 };
    shakeRef.current = 0;
    lastTimeRef.current = 0;
    
    isMouseBoostRef.current = false;
    isKeyBoostRef.current = false;
  };

  // Added timeScale to normalize speed regardless of framerate
  const updateSnake = (snake: Snake, targetX: number, targetY: number, timeScale: number) => {
    if (snake.isDead) return;

    // 1. Angle calculation
    const head = snake.body[0];
    const dx = targetX - head.x;
    const dy = targetY - head.y;
    
    let desiredAngle = Math.atan2(dy, dx);
    
    // Smooth turning
    let diff = desiredAngle - snake.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    
    // Turn speed scaled by time
    snake.angle += Math.sign(diff) * Math.min(Math.abs(diff), TURN_SPEED * timeScale);

    // 2. Move Head
    const speed = (snake.isBoosting ? BOOST_SPEED : BASE_SPEED) * timeScale;
    
    // Lose mass if boosting
    if (snake.isBoosting && snake.body.length > INITIAL_SNAKE_LENGTH) {
        // Chance scaled by time so it doesn't drain faster at high fps or low fps
        if (Math.random() < 0.1 * timeScale) {
           snake.body.pop();
        }
    }

    const newHead = {
      x: head.x + Math.cos(snake.angle) * speed,
      y: head.y + Math.sin(snake.angle) * speed
    };

    // Boundary Check
    if (newHead.x < 0 || newHead.x > WORLD_SIZE || newHead.y < 0 || newHead.y > WORLD_SIZE) {
      snake.isDead = true;
      if (snake.id === 'player') triggerShake(30);
      return;
    }

    // 3. Body Following
    // Logic constraint: Body segments always follow the one ahead by fixed distance.
    // This creates the "pulling" effect.
    const newBody = [newHead];
    for (let i = 1; i < snake.body.length; i++) {
      const prevSegment = newBody[i - 1]; 
      const currSegment = snake.body[i];
      
      const angle = Math.atan2(prevSegment.y - currSegment.y, prevSegment.x - currSegment.x);
      
      const newSegX = prevSegment.x - Math.cos(angle) * SEGMENT_DISTANCE;
      const newSegY = prevSegment.y - Math.sin(angle) * SEGMENT_DISTANCE;
      
      newBody.push({ x: newSegX, y: newSegY });
    }
    
    snake.body = newBody;
  };

  const checkCollisions = (snake: Snake, allSnakes: Snake[]) => {
    if (snake.isDead) return;
    const head = snake.body[0];
    const snakeWidth = getSnakeWidth(snake);
    const headRadius = snakeWidth / 2; 

    // Check Food
    for (let i = foodRef.current.length - 1; i >= 0; i--) {
      const f = foodRef.current[i];
      const d = Math.hypot(head.x - f.x, head.y - f.y);
      if (d < headRadius + f.originalRadius + 10) { 
        snake.score += f.value;
        
        const tail = snake.body[snake.body.length - 1];
        snake.body.push({ ...tail });
        
        foodRef.current.splice(i, 1);
        
        if (Math.random() < 0.5) {
             foodRef.current.push(...createFood(1));
        }
      }
    }

    // Check Other Snakes
    for (const other of allSnakes) {
      if (other.id === snake.id || other.isDead) continue;
      
      const otherWidth = getSnakeWidth(other);
      const otherRadius = otherWidth / 2;
      const collisionDistance = headRadius + otherRadius - 4; 

      for (let i = 0; i < other.body.length; i += 2) {
        const seg = other.body[i];
        const d = Math.hypot(head.x - seg.x, head.y - seg.y);
        
        if (d < collisionDistance) { 
          snake.isDead = true;
          createParticles(head.x, head.y, snake.color, 20);
          
          if (other.id === 'player') {
             onKill();
             triggerShake(15);
          }

          if (snake.id === 'player') {
             triggerShake(30);
          }

          const foodFromDead = snake.body.map(p => ({
            id: Math.random().toString(),
            x: p.x + (Math.random() - 0.5) * 10,
            y: p.y + (Math.random() - 0.5) * 10,
            color: snake.color === 'rainbow' ? `hsl(${Math.random()*360}, 100%, 50%)` : snake.color,
            radius: 6,
            originalRadius: 6,
            pulsePhase: Math.random() * Math.PI * 2,
            value: 5
          }));
          foodRef.current.push(...foodFromDead);
          
          return;
        }
      }
    }
  };

  const updateBots = (timeScale: number) => {
    botsRef.current.forEach(bot => {
      if (bot.isDead) return;

      const head = bot.body[0];
      
      // 1. Avoid Boundaries
      const margin = 100;
      let avoidX = 0; 
      let avoidY = 0;
      if (head.x < margin) avoidX = 1;
      if (head.x > WORLD_SIZE - margin) avoidX = -1;
      if (head.y < margin) avoidY = 1;
      if (head.y > WORLD_SIZE - margin) avoidY = -1;

      if (avoidX !== 0 || avoidY !== 0) {
         bot.targetAngle = Math.atan2(avoidY, avoidX);
         updateSnake(bot, head.x + avoidX * 100, head.y + avoidY * 100, timeScale);
         return;
      }

      // 2. Find nearest food
      let nearestFood: Food | null = null;
      let minDist = Infinity;
      for (let i = 0; i < foodRef.current.length; i+=5) {
         const f = foodRef.current[i];
         const d = Math.hypot(head.x - f.x, head.y - f.y);
         if (d < minDist && d < 500) { 
           minDist = d;
           nearestFood = f;
         }
      }

      let targetX = head.x + Math.cos(bot.angle) * 100;
      let targetY = head.y + Math.sin(bot.angle) * 100;

      if (nearestFood) {
        targetX = nearestFood.x;
        targetY = nearestFood.y;
      }
      
      // Random jitter (scaled by time logic slightly)
      if (Math.random() < 0.05 * timeScale) {
        targetX += (Math.random() - 0.5) * 400;
        targetY += (Math.random() - 0.5) * 400;
      }

      // Sustained Bot Boost Logic
      if (bot.isBoosting) {
         if (Math.random() < 0.05 * timeScale) bot.isBoosting = false;
      } else {
         if (Math.random() < 0.005 * timeScale) bot.isBoosting = true;
      }

      updateSnake(bot, targetX, targetY, timeScale);
    });
  };

  const render = (timeScale: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Camera Follow Player (Smooth lerp, scaled by time)
    if (playerRef.current && !playerRef.current.isDead) {
      const head = playerRef.current.body[0];
      // 0.1 is the lerp factor at 60fps. Scaling roughly by timeScale
      const lerp = 1 - Math.pow(0.9, timeScale); 
      cameraRef.current.x += (head.x - cameraRef.current.x) * lerp;
      cameraRef.current.y += (head.y - cameraRef.current.y) * lerp;
    }
    const cam = cameraRef.current;

    // --- Determine Leader (High Score) ---
    let leaderId: string | null = null;
    let maxScore = -1;
    
    const activeSnakes = [...botsRef.current.filter(b => !b.isDead)];
    if (playerRef.current && !playerRef.current.isDead) {
        activeSnakes.push(playerRef.current);
    }
    
    activeSnakes.forEach(s => {
        if (s.score > maxScore) {
            maxScore = s.score;
            leaderId = s.id;
        }
    });
    
    if (maxScore <= 0) leaderId = null;

    // --- Draw Background ---
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    
    // Apply Shake
    let shakeX = 0; 
    let shakeY = 0;
    if (shakeRef.current > 0.5) {
        shakeX = (Math.random() - 0.5) * shakeRef.current;
        shakeY = (Math.random() - 0.5) * shakeRef.current;
        // Decay shake
        shakeRef.current *= Math.pow(0.9, timeScale);
    } else {
        shakeRef.current = 0;
    }

    // Center Camera with Shake
    ctx.translate(canvas.width / 2 - cam.x + shakeX, canvas.height / 2 - cam.y + shakeY);

    // Draw Grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 2;
    const gridSize = 100;
    const startX = Math.floor((cam.x - canvas.width / 2) / gridSize) * gridSize;
    const endX = startX + canvas.width + gridSize;
    const startY = Math.floor((cam.y - canvas.height / 2) / gridSize) * gridSize;
    const endY = startY + canvas.height + gridSize;

    ctx.beginPath();
    for (let x = startX; x < endX; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD_SIZE);
    }
    for (let y = startY; y < endY; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD_SIZE, y);
    }
    ctx.stroke();

    // Draw World Borders
    ctx.strokeStyle = '#ff0044';
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE);

    // --- Draw Food ---
    const time = Date.now() / 250; // Pulsing based on absolute time
    
    for (const f of foodRef.current) {
       if (Math.abs(f.x - cam.x) > canvas.width/2 + 50 || Math.abs(f.y - cam.y) > canvas.height/2 + 50) continue;
       
       const pulse = Math.sin(time + f.pulsePhase);
       const drawRadius = f.originalRadius + pulse * 1.5;
       const glowStrength = 10 + pulse * 5;

       ctx.beginPath();
       ctx.arc(f.x, f.y, Math.max(0.1, drawRadius), 0, Math.PI * 2);
       ctx.fillStyle = f.color;
       ctx.shadowBlur = glowStrength;
       ctx.shadowColor = f.color;
       ctx.fill();
       ctx.shadowBlur = 0; 
    }

    // --- Draw Snakes ---
    const drawSnake = (snake: Snake) => {
       if (snake.isDead) return;
       
       const isBoosting = snake.isBoosting;
       const width = getSnakeWidth(snake);
       const isRainbow = snake.color === 'rainbow';
       
       ctx.lineCap = 'round';
       ctx.lineJoin = 'round';
       
       // Aura
       if (isBoosting) {
          ctx.save();
          ctx.globalAlpha = 0.25;
          ctx.lineWidth = width + 16;
          ctx.strokeStyle = isRainbow ? '#ffffff' : snake.color;
          ctx.beginPath();
          if (snake.body.length > 0) {
            ctx.moveTo(snake.body[0].x, snake.body[0].y);
            for (let i = 1; i < snake.body.length; i++) {
                ctx.lineTo(snake.body[i].x, snake.body[i].y);
            }
          }
          ctx.stroke();
          ctx.restore();
       }

       // Body
       ctx.lineWidth = width;
       
       if (isRainbow) {
           ctx.save();
           ctx.shadowBlur = isBoosting ? 40 : 15;
           ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
           ctx.strokeStyle = '#ffffff';
           ctx.beginPath();
           if (snake.body.length > 0) {
             ctx.moveTo(snake.body[0].x, snake.body[0].y);
             for (let i = 1; i < snake.body.length; i++) {
                 ctx.lineTo(snake.body[i].x, snake.body[i].y);
             }
           }
           ctx.stroke();
           ctx.restore();

           for (let i = 0; i < snake.body.length - 1; i++) {
              ctx.beginPath();
              ctx.moveTo(snake.body[i].x, snake.body[i].y);
              ctx.lineTo(snake.body[i+1].x, snake.body[i+1].y);
              const hue = (i * 10 - Date.now() / 5) % 360;
              ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
              ctx.stroke();
           }

       } else {
           ctx.shadowBlur = isBoosting ? 40 : 15;
           ctx.shadowColor = snake.color;
           ctx.strokeStyle = snake.color;
           
           ctx.beginPath();
           if (snake.body.length > 0) {
             ctx.moveTo(snake.body[0].x, snake.body[0].y);
             for (let i = 1; i < snake.body.length; i++) {
                 ctx.lineTo(snake.body[i].x, snake.body[i].y);
             }
           }
           ctx.stroke();
       }
       
       // Pattern
       if (snake.pattern && snake.pattern !== 'none') {
          ctx.shadowBlur = 2; 
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          
          if (snake.pattern === 'stripes') {
              ctx.lineWidth = width * 0.3;
              const step = 3;
              for (let i = 1; i < snake.body.length - 1; i += step) {
                  const curr = snake.body[i];
                  const next = snake.body[i+1];
                  const angle = Math.atan2(next.y - curr.y, next.x - curr.x);
                  const perp = angle + Math.PI / 2;
                  const len = width * 0.8; 
                  const dx = Math.cos(perp) * len/2;
                  const dy = Math.sin(perp) * len/2;
                  ctx.beginPath();
                  ctx.moveTo(curr.x - dx, curr.y - dy);
                  ctx.lineTo(curr.x + dx, curr.y + dy);
                  ctx.stroke();
              }
          } else if (snake.pattern === 'spots') {
              const step = 4;
              const spotRadius = width * 0.3; 
              for (let i = 2; i < snake.body.length - 1; i += step) {
                 ctx.beginPath();
                 ctx.arc(snake.body[i].x, snake.body[i].y, spotRadius, 0, Math.PI*2);
                 ctx.fill();
              }
          }
       }
       
       // Head Glow
       if (snake.id === 'player') {
           const head = snake.body[0];
           ctx.save();
           const glowRadius = isBoosting ? width * 3.5 : width * 2.0;
           const opacity = isBoosting ? 0.5 : 0.25;
           
           const grad = ctx.createRadialGradient(head.x, head.y, width * 0.2, head.x, head.y, glowRadius);
           if (isRainbow) {
               grad.addColorStop(0, 'white');
               grad.addColorStop(0.4, `hsl(${-Date.now() / 5 % 360}, 100%, 50%)`);
               grad.addColorStop(1, 'rgba(0,0,0,0)');
           } else {
               grad.addColorStop(0, snake.color);
               grad.addColorStop(1, 'rgba(0,0,0,0)');
           }
           
           ctx.globalCompositeOperation = 'screen'; 
           ctx.fillStyle = grad;
           ctx.globalAlpha = opacity;
           
           ctx.beginPath();
           ctx.arc(head.x, head.y, glowRadius, 0, Math.PI * 2);
           ctx.fill();
           ctx.restore();
       }

       // Eyes
       const head = snake.body[0];
       ctx.shadowBlur = 0;
       ctx.fillStyle = 'white';
       
       const eyeOffset = width * 0.35; 
       const eyeSize = width * 0.2;
       
       ctx.save();
       ctx.translate(head.x, head.y);
       ctx.rotate(snake.angle);
       ctx.beginPath();
       ctx.arc(eyeOffset, -eyeOffset, eyeSize, 0, Math.PI * 2);
       ctx.arc(eyeOffset, eyeOffset, eyeSize, 0, Math.PI * 2);
       ctx.fill();
       ctx.restore();

       // Name
       ctx.fillStyle = 'white';
       ctx.font = '12px sans-serif';
       ctx.textAlign = 'center';
       ctx.fillText(snake.name, head.x, head.y - width - 5);

       // Crown
       if (snake.id === leaderId) {
           ctx.save();
           const bobOffset = Math.sin(Date.now() / 150) * 5;
           const crownY = head.y - width - 25 + bobOffset;
           ctx.translate(head.x, crownY);
           ctx.fillStyle = '#FFD700'; 
           ctx.shadowColor = '#FFD700';
           ctx.shadowBlur = 15;
           ctx.strokeStyle = 'rgba(0,0,0,0.5)'; 
           ctx.lineWidth = 1;
           const sz = 10; 
           ctx.beginPath();
           ctx.moveTo(-sz, sz * 0.8);
           ctx.lineTo(-sz, -sz * 0.5);
           ctx.lineTo(-sz * 0.33, 0);
           ctx.lineTo(0, -sz * 1.2); 
           ctx.lineTo(sz * 0.33, 0);
           ctx.lineTo(sz, -sz * 0.5);
           ctx.lineTo(sz, sz * 0.8);
           ctx.closePath();
           ctx.fill();
           ctx.stroke();
           ctx.restore();
       }
    };

    botsRef.current.forEach(drawSnake);
    if (playerRef.current) drawSnake(playerRef.current);

    // --- Draw Particles ---
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
       const p = particlesRef.current[i];
       p.x += p.vx * timeScale; // Velocity scaled by time
       p.y += p.vy * timeScale;
       p.life -= 0.05 * timeScale; // Decay scaled by time
       
       if (p.life <= 0) {
         particlesRef.current.splice(i, 1);
         continue;
       }
       
       ctx.globalAlpha = p.life;
       ctx.fillStyle = p.color;
       ctx.beginPath();
       const baseRadius = p.size || 4;
       const radius = Math.max(0, baseRadius * p.life); 
       ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
       ctx.fill();
       ctx.globalAlpha = 1;
    }

    ctx.restore();

    // --- Warning Vignette ---
    if (playerRef.current && !playerRef.current.isDead) {
        const head = playerRef.current.body[0];
        const margin = 800; 
        let minDist = Infinity;
        minDist = Math.min(minDist, head.x);
        minDist = Math.min(minDist, WORLD_SIZE - head.x);
        minDist = Math.min(minDist, head.y);
        minDist = Math.min(minDist, WORLD_SIZE - head.y);

        if (minDist < margin) {
            const intensity = Math.pow(1 - minDist / margin, 2);
            const pulse = (Math.sin(Date.now() / 200) + 1) * 0.5; 
            const alpha = intensity * (0.3 + pulse * 0.2); 

            const vignetteGrad = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, canvas.height * 0.3,
                canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.8
            );
            vignetteGrad.addColorStop(0, 'rgba(255, 0, 0, 0)');
            vignetteGrad.addColorStop(1, `rgba(255, 0, 68, ${alpha})`);

            ctx.fillStyle = vignetteGrad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            if (intensity > 0.5) {
                ctx.strokeStyle = `rgba(255, 0, 68, ${alpha * 1.5})`;
                ctx.lineWidth = 20 + pulse * 10;
                ctx.strokeRect(0, 0, canvas.width, canvas.height);
            }
        }
    }

    // --- Minimap ---
    const mapSize = 130;
    const padding = 20;
    const mapX = canvas.width - mapSize - padding;
    const mapY = canvas.height - mapSize - padding;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'; 
    ctx.fillRect(mapX, mapY, mapSize, mapSize);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)'; 
    ctx.strokeRect(mapX, mapY, mapSize, mapSize);

    const drawMinimapDot = (x: number, y: number, color: string, radius: number) => {
      const rx = x / WORLD_SIZE;
      const ry = y / WORLD_SIZE;
      const mx = mapX + rx * mapSize;
      const my = mapY + ry * mapSize;
      if (mx < mapX || mx > mapX + mapSize || my < mapY || my > mapY + mapSize) return;
      ctx.beginPath();
      ctx.arc(mx, my, radius, 0, Math.PI * 2);
      ctx.fillStyle = color === 'rainbow' ? '#ffffff' : color;
      ctx.fill();
    };

    botsRef.current.forEach(bot => {
      if (!bot.isDead) {
        drawMinimapDot(bot.body[0].x, bot.body[0].y, bot.color, 2.5);
      }
    });

    if (playerRef.current && !playerRef.current.isDead) {
      drawMinimapDot(playerRef.current.body[0].x, playerRef.current.body[0].y, '#ffffff', 4);
      const px = mapX + (playerRef.current.body[0].x / WORLD_SIZE) * mapSize;
      const py = mapY + (playerRef.current.body[0].y / WORLD_SIZE) * mapSize;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.stroke();
    }
  };

  const gameLoop = (timestamp: number) => {
    if (gameState !== GameState.PLAYING) return;
    if (isPausedRef.current) return;

    if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
    }
    
    // Delta Time calculation
    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    // Calculate Time Scale
    // Standard frame time is 1000ms / 60fps = ~16.67ms
    // If deltaTime is 16.67, timeScale is 1.0
    // If deltaTime is 33.33 (30fps), timeScale is 2.0 (move twice as far)
    const targetFrameTime = 1000 / TARGET_FPS;
    const speedMultiplier = GAME_SPEEDS[gameSpeed];
    
    // Cap timeScale to prevent massive jumps on lag spikes (e.g. max 4 frames catchup)
    const timeScale = Math.min(4, (deltaTime / targetFrameTime)) * speedMultiplier;

    // --- Logic ---
    const now = Date.now();

    if (now - lastLeaderboardUpdateRef.current > 500) {
       const allActive = [...botsRef.current.filter(b => !b.isDead)];
       if (playerRef.current && !playerRef.current.isDead) {
          allActive.push(playerRef.current);
       }
       allActive.sort((a, b) => b.score - a.score);
       const topSnakes = allActive.slice(0, 5).map(s => ({
          id: s.id,
          name: s.name,
          score: Math.floor(s.score),
          color: s.color,
          isPlayer: s.id === 'player'
       }));
       onLeaderboardUpdate(topSnakes);
       lastLeaderboardUpdateRef.current = now;
    }

    if (playerRef.current) {
        const canvas = canvasRef.current;
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const dx = mouseRef.current.x - centerX;
            const dy = mouseRef.current.y - centerY;
            
            const angle = Math.atan2(dy, dx);
            const targetX = playerRef.current.body[0].x + Math.cos(angle) * 200;
            const targetY = playerRef.current.body[0].y + Math.sin(angle) * 200;
            
            playerRef.current.isBoosting = isMouseBoostRef.current || isKeyBoostRef.current || isTouchBoostingRef.current;
            updateSnake(playerRef.current, targetX, targetY, timeScale);

            // --- Particles ---
            if (!playerRef.current.isDead) {
                const snake = playerRef.current;
                const head = snake.body[0];
                const tail = snake.body[snake.body.length - 1];
                const width = getSnakeWidth(snake);
                const angle = snake.angle;
                const isBoosting = snake.isBoosting;
                const isRainbow = snake.color === 'rainbow';

                // Probabilities are scaled by timeScale so particle density stays consistent per second
                if (isBoosting || Math.random() < 0.3 * timeScale) {
                     const spread = width * 0.5;
                     const pColor = isRainbow ? `hsl(${Math.random()*360}, 100%, 80%)` : (isBoosting ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)');
                     
                     particlesRef.current.push({
                        id: `head-p-${Math.random()}`,
                        x: head.x + (Math.random() - 0.5) * spread,
                        y: head.y + (Math.random() - 0.5) * spread,
                        vx: -Math.cos(angle) * (Math.random() * 4 + 2),
                        vy: -Math.sin(angle) * (Math.random() * 4 + 2),
                        life: 0.25, 
                        color: pColor,
                        size: isBoosting ? 2.5 : 1.5
                     });
                }

                // Tail Trail
                // Adjust loop count by timeScale for consistency, or simply allow fewer updates
                const trailCount = Math.round((isBoosting ? 3 : 1) * timeScale);
                
                for(let i=0; i<trailCount; i++) {
                   let tColor = snake.color;
                   if (isRainbow) {
                       const hue = (snake.body.length * 10 - Date.now() / 5) % 360;
                       tColor = `hsl(${hue}, 100%, 50%)`;
                   }

                   particlesRef.current.push({
                      id: `tail-p-${Math.random()}`,
                      x: tail.x + (Math.random() - 0.5) * width * 0.5,
                      y: tail.y + (Math.random() - 0.5) * width * 0.5,
                      vx: 0, 
                      vy: 0,
                      life: isBoosting ? 0.6 : 0.3,
                      color: (isBoosting && Math.random() > 0.7) ? '#ffffff' : tColor,
                      size: isBoosting ? 4 : 3
                   });
                }

                if (isBoosting) {
                   const ghostDist = width * 0.8;
                   const ghostX = tail.x - Math.cos(angle) * ghostDist;
                   const ghostY = tail.y - Math.sin(angle) * ghostDist;
                   
                   if(Math.random() < 0.5 * timeScale) {
                       let gColor = snake.color;
                       if (isRainbow) {
                           const hue = (snake.body.length * 10 - Date.now() / 5) % 360;
                           gColor = `hsl(${hue}, 100%, 50%)`;
                       }
                       
                       particlesRef.current.push({
                          id: `ghost-${Math.random()}`,
                          x: ghostX + (Math.random() - 0.5) * width,
                          y: ghostY + (Math.random() - 0.5) * width,
                          vx: (Math.random() - 0.5),
                          vy: (Math.random() - 0.5),
                          life: 0.4,
                          color: gColor,
                          size: width * 0.4
                       });
                   }
                }
            }
            
            if (playerRef.current.isDead) {
                onGameOver(Math.floor(playerRef.current.score));
                return;
            }
            
            onScoreUpdate(Math.floor(playerRef.current.score));
        }
    }

    updateBots(timeScale);
    
    const allSnakes = [...botsRef.current];
    if (playerRef.current) allSnakes.push(playerRef.current);
    
    if (playerRef.current) checkCollisions(playerRef.current, allSnakes);
    botsRef.current.forEach(bot => checkCollisions(bot, allSnakes));
    
    botsRef.current = botsRef.current.filter(b => !b.isDead);
    
    if (botsRef.current.length < BOT_COUNT) {
         const { x, y } = getSafeSpawnPosition();
         botsRef.current.push(createSnake(
            `bot-${Date.now()}`, 
            `Bot ${Math.floor(Math.random()*1000)}`, 
            true, 
            x, 
            y
         ));
    }

    render(timeScale);
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  };

  // --- Effects ---

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      initGame();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  useEffect(() => {
    isPausedRef.current = isPaused;
    
    if (gameState === GameState.PLAYING && !isPaused) {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        lastTimeRef.current = 0; // Reset time tracking on resume
        animationFrameRef.current = requestAnimationFrame(gameLoop);
    } else {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
    
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, isPaused]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault(); 
        isKeyBoostRef.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        isKeyBoostRef.current = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouch = (e: TouchEvent) => {
        if (e.cancelable) e.preventDefault();

        if (e.targetTouches.length > 0) {
            mouseRef.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
        }

        if (e.touches.length > 1) {
            isMouseBoostRef.current = true;
        } else {
            isMouseBoostRef.current = false;
        }
    };

    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('touchmove', handleTouch, { passive: false });
    canvas.addEventListener('touchend', handleTouch, { passive: false });
    canvas.addEventListener('touchcancel', handleTouch, { passive: false });

    return () => {
        canvas.removeEventListener('touchstart', handleTouch);
        canvas.removeEventListener('touchmove', handleTouch);
        canvas.removeEventListener('touchend', handleTouch);
        canvas.removeEventListener('touchcancel', handleTouch);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
  };
  
  const handleMouseDown = () => {
    isMouseBoostRef.current = true;
  };
  
  const handleMouseUp = () => {
    isMouseBoostRef.current = false;
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full cursor-crosshair touch-none"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    />
  );
};

export default GameCanvas;
