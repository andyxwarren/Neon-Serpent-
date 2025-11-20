
import React, { useEffect, useRef } from 'react';
import { GameState, Point, Snake, Food, Particle, Camera, LeaderboardEntry, SnakePattern, GameSpeedMode, SnakeSkin, SnakeFace } from '../types';
import { 
  WORLD_SIZE, INITIAL_SNAKE_LENGTH, BASE_SPEED, BOOST_SPEED, 
  TURN_SPEED, SEGMENT_DISTANCE, FOOD_COUNT, BOT_COUNT, COLORS, SNAKE_COLORS, FOOD_COLORS, FOOD_VALUE, SNAKE_PATTERNS, SNAKE_SKINS, SNAKE_FACES,
  GAME_SPEEDS, TARGET_FPS, MAX_BOOST_ENERGY, BOOST_COST, BOOST_REGEN
} from '../constants';

interface GameCanvasProps {
  gameState: GameState;
  playerName: string;
  playerColor: string;
  playerPattern: SnakePattern;
  playerSkin: SnakeSkin;
  playerFace: SnakeFace;
  gameSpeed: GameSpeedMode;
  isPaused: boolean;
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
  playerSkin,
  playerFace,
  gameSpeed,
  isPaused,
  onGameOver, 
  onScoreUpdate, 
  onKill,
  onLeaderboardUpdate 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Mutable game state refs
  const playerRef = useRef<Snake | null>(null);
  const botsRef = useRef<Snake[]>([]);
  const foodRef = useRef<Food[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const cameraRef = useRef<Camera>({ x: 0, y: 0, zoom: 1 });
  const mouseRef = useRef<Point>({ x: 0, y: 0 });
  const animationFrameRef = useRef<number>(0);
  const lastLeaderboardUpdateRef = useRef<number>(0);
  const shakeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  
  // Input state refs
  const isMouseBoostRef = useRef(false);
  const isKeyBoostRef = useRef(false);
  const isPausedRef = useRef(isPaused);

  // Sync refs with props
  useEffect(() => {
    isPausedRef.current = isPaused;
    if (!isPaused) {
        lastTimeRef.current = 0;
    }
  }, [isPaused]);

  // --- Helpers ---

  const randomColor = () => SNAKE_COLORS[Math.floor(Math.random() * SNAKE_COLORS.length)];
  const randomPattern = () => SNAKE_PATTERNS[Math.floor(Math.random() * SNAKE_PATTERNS.length)] as SnakePattern;
  const randomSkin = () => Math.random() > 0.8 ? SNAKE_SKINS[Math.floor(Math.random() * SNAKE_SKINS.length)] as SnakeSkin : 'standard';
  const randomFace = () => Math.random() > 0.5 ? SNAKE_FACES[Math.floor(Math.random() * SNAKE_FACES.length)] as SnakeFace : 'none';

  const triggerShake = (amount: number) => {
    shakeRef.current = Math.min(50, shakeRef.current + amount);
  };

  const getSnakeWidth = (snake: Snake) => {
    const extraWidth = Math.max(0, snake.body.length - INITIAL_SNAKE_LENGTH) * 0.1;
    const baseWidth = 22 + Math.min(40, extraWidth);
    return snake.isBoosting ? baseWidth * 0.85 : baseWidth;
  };

  const getSafeSpawnPosition = (): Point => {
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

  const createSnake = (id: string, name: string, isBot: boolean, startX: number, startY: number, overrideColor?: string, overridePattern?: SnakePattern, overrideSkin?: SnakeSkin, overrideFace?: SnakeFace): Snake => {
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
      skin: overrideSkin || (isBot ? randomSkin() : 'standard'),
      face: overrideFace || (isBot ? randomFace() : 'none'),
      isBoosting: false,
      boostValue: MAX_BOOST_ENERGY,
      isDead: false,
      score: 0,
      isBot,
      killStreak: 0
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

  const createParticles = (x: number, y: number, color: string, count: number, speedBase: number = 10, sizeBase: number = 4) => {
    for (let i = 0; i < count; i++) {
      const pColor = color === 'rainbow' 
          ? `hsl(${Math.random() * 360}, 100%, 50%)` 
          : color;

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * speedBase;

      particlesRef.current.push({
        id: Math.random().toString(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color: pColor,
        size: sizeBase * (0.5 + Math.random() * 0.5),
        decay: 0.02,
        shrink: true
      });
    }
  };

  const createSparkles = (x: number, y: number, count: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 20 + 5;
      particlesRef.current.push({
        id: `sparkle-${Math.random()}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: Math.random() * 0.4 + 0.1, // Short lived
        color: '#ffffff',
        size: Math.random() * 2 + 1,
        decay: 0.05,
        shrink: true
      });
    }
  };

  const createExplosion = (x: number, y: number, color: string) => {
    // 1. Debris (Snake Body Parts)
    for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 12 + 8;
        const pColor = color === 'rainbow' ? `hsl(${Math.random()*360}, 100%, 50%)` : color;
        
        particlesRef.current.push({
            id: `debris-${Math.random()}`,
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            color: pColor,
            size: Math.random() * 5 + 3,
            decay: 0.015 + Math.random() * 0.015,
            shrink: true
        });
    }

    // 2. Smoke / Dust Cloud
    for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1;
        particlesRef.current.push({
            id: `smoke-${Math.random()}`,
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            color: 'rgba(255, 255, 255, 0.15)', // Translucent white smoke
            size: Math.random() * 20 + 15,
            decay: 0.008 + Math.random() * 0.005, // Slow decay
            shrink: false // Don't shrink, just fade
        });
    }
    
    // 3. Flash / Sparks
    for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 25 + 15;
        particlesRef.current.push({
            id: `flash-${Math.random()}`,
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            color: '#ffffff',
            size: Math.random() * 3 + 2,
            decay: 0.08, // Dies very fast
            shrink: true
        });
    }
  };

  // --- Game Logic ---

  const initGame = () => {
    const startX = WORLD_SIZE / 2;
    const startY = WORLD_SIZE / 2;
    
    playerRef.current = createSnake('player', playerName, false, startX, startY, playerColor, playerPattern, playerSkin, playerFace);
    
    createExplosion(startX, startY, '#ffffff');

    const newBots: Snake[] = [];
    for (let i = 0; i < BOT_COUNT; i++) {
      const { x, y } = getSafeSpawnPosition();
      const bot = createSnake(
        `bot-${i}`, 
        `Bot ${i + 1}`, 
        true, 
        x, 
        y
      );
      newBots.push(bot);
      createParticles(x, y, '#ffffff', 10, 8, 3);
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

  const updateSnake = (snake: Snake, targetX: number, targetY: number, timeScale: number, isMouseBoosting: boolean, isKeyBoosting: boolean) => {
    if (snake.isDead) return;

    // Boost Logic (Energy Based)
    const wantsToBoost = isMouseBoosting || isKeyBoosting || (snake.isBot && snake.isBoosting);
    
    if (wantsToBoost && snake.boostValue > 0) {
        snake.isBoosting = true;
        snake.boostValue = Math.max(0, snake.boostValue - BOOST_COST * timeScale);
    } else {
        snake.isBoosting = false;
        if (snake.boostValue < MAX_BOOST_ENERGY) {
            snake.boostValue = Math.min(MAX_BOOST_ENERGY, snake.boostValue + BOOST_REGEN * timeScale);
        }
    }

    // Movement
    const head = snake.body[0];
    const dx = targetX - head.x;
    const dy = targetY - head.y;
    
    let desiredAngle = Math.atan2(dy, dx);
    let diff = desiredAngle - snake.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    
    snake.angle += Math.sign(diff) * Math.min(Math.abs(diff), TURN_SPEED * timeScale);

    const speed = (snake.isBoosting ? BOOST_SPEED : BASE_SPEED) * timeScale;
    
    const newHead = {
      x: head.x + Math.cos(snake.angle) * speed,
      y: head.y + Math.sin(snake.angle) * speed
    };

    if (newHead.x < 0 || newHead.x > WORLD_SIZE || newHead.y < 0 || newHead.y > WORLD_SIZE) {
      snake.isDead = true;
      if (snake.id === 'player') triggerShake(30);
      createExplosion(head.x, head.y, snake.color);
      return;
    }

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

    for (let i = foodRef.current.length - 1; i >= 0; i--) {
      const f = foodRef.current[i];
      const d = Math.hypot(head.x - f.x, head.y - f.y);
      if (d < headRadius + f.originalRadius + 10) { 
        snake.score += f.value;
        const tail = snake.body[snake.body.length - 1];
        snake.body.push({ ...tail });
        createParticles(f.x, f.y, f.color, 4, 5, 3);
        
        if (snake.id === 'player') {
            createSparkles(f.x, f.y, 5);
        }

        foodRef.current.splice(i, 1);
        if (Math.random() < 0.5) {
             foodRef.current.push(...createFood(1));
        }
      }
    }

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
          other.killStreak += 1; // Increment killstreak for the winner
          
          // Use new explosion effect instead of generic particles
          createExplosion(head.x, head.y, snake.color);
          
          if (other.id === 'player') {
             onKill();
             triggerShake(20);
             createSparkles(head.x, head.y, 30); // Extra sparkles for player kill
          }
          if (snake.id === 'player') {
             triggerShake(35);
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
      const margin = 100;
      let avoidX = 0; 
      let avoidY = 0;
      if (head.x < margin) avoidX = 1;
      if (head.x > WORLD_SIZE - margin) avoidX = -1;
      if (head.y < margin) avoidY = 1;
      if (head.y > WORLD_SIZE - margin) avoidY = -1;

      if (avoidX !== 0 || avoidY !== 0) {
         bot.targetAngle = Math.atan2(avoidY, avoidX);
         updateSnake(bot, head.x + avoidX * 100, head.y + avoidY * 100, timeScale, false, false);
         return;
      }

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
      
      if (Math.random() < 0.05 * timeScale) {
        targetX += (Math.random() - 0.5) * 400;
        targetY += (Math.random() - 0.5) * 400;
      }

      // Bot Boosting Logic
      if (bot.isBoosting) {
         if (Math.random() < 0.05 * timeScale || bot.boostValue < 10) bot.isBoosting = false;
      } else {
         if (Math.random() < 0.005 * timeScale && bot.boostValue > 50) bot.isBoosting = true;
      }

      updateSnake(bot, targetX, targetY, timeScale, false, false);
    });
  };

  const render = (timeScale: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    if (playerRef.current && !playerRef.current.isDead) {
      const head = playerRef.current.body[0];
      const lerp = 1 - Math.pow(0.9, timeScale); 
      cameraRef.current.x += (head.x - cameraRef.current.x) * lerp;
      cameraRef.current.y += (head.y - cameraRef.current.y) * lerp;
    }
    const cam = cameraRef.current;

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

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    let shakeX = 0; 
    let shakeY = 0;
    if (shakeRef.current > 0.5) {
        shakeX = (Math.random() - 0.5) * shakeRef.current;
        shakeY = (Math.random() - 0.5) * shakeRef.current;
        shakeRef.current *= Math.pow(0.9, timeScale);
    } else {
        shakeRef.current = 0;
    }

    ctx.translate(canvas.width / 2 - cam.x + shakeX, canvas.height / 2 - cam.y + shakeY);

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

    ctx.strokeStyle = '#ff0044';
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE);

    const time = Date.now() / 250; 
    
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

    const drawSnake = (snake: Snake) => {
       if (snake.isDead) return;
       
       const isBoosting = snake.isBoosting;
       const width = getSnakeWidth(snake);
       const isRainbow = snake.color === 'rainbow';
       const isPlayer = snake.id === 'player';
       const skin = snake.skin || 'standard';
       
       let lineCap: CanvasLineCap = 'round';
       let lineJoin: CanvasLineJoin = 'round';
       let alpha = 1.0;

       if (skin === 'digital') {
           lineCap = 'square';
           lineJoin = 'bevel';
       } else if (skin === 'shard') {
           lineCap = 'butt';
           lineJoin = 'miter';
       } else if (skin === 'ghost') {
           alpha = 0.6;
       }

       ctx.lineCap = lineCap;
       ctx.lineJoin = lineJoin;
       ctx.globalAlpha = alpha;
       
       // Aura
       if (isBoosting) {
          ctx.save();
          ctx.globalAlpha = 0.25 * alpha;
          ctx.lineWidth = width + 16;
          ctx.strokeStyle = isRainbow ? '#ffffff' : snake.color;
          
          if (skin === 'pixel') {
               for (let i = 0; i < snake.body.length; i++) {
                   const p = snake.body[i];
                   ctx.fillStyle = isRainbow ? '#ffffff' : snake.color;
                   ctx.fillRect(p.x - (width + 16)/2, p.y - (width + 16)/2, width + 16, width + 16);
               }
          } else {
              ctx.beginPath();
              if (snake.body.length > 0) {
                ctx.moveTo(snake.body[0].x, snake.body[0].y);
                for (let i = 1; i < snake.body.length; i++) {
                    ctx.lineTo(snake.body[i].x, snake.body[i].y);
                }
              }
              ctx.stroke();
          }
          ctx.restore();
       }

       // Outline Pass
       ctx.save();
       ctx.shadowBlur = 0;
       ctx.globalAlpha = alpha;
       
       if (skin === 'pixel') {
           ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
           const outlineSize = width + 4;
           for (const p of snake.body) {
               ctx.fillRect(p.x - outlineSize/2, p.y - outlineSize/2, outlineSize, outlineSize);
           }
       } else {
           ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
           ctx.lineWidth = width + 4; 
           ctx.beginPath();
           if (snake.body.length > 0) {
               ctx.moveTo(snake.body[0].x, snake.body[0].y);
               for (let i = 1; i < snake.body.length; i++) {
                   ctx.lineTo(snake.body[i].x, snake.body[i].y);
               }
           }
           ctx.stroke();
       }
       ctx.restore();

       // Body Rendering
       ctx.lineWidth = width;
       let shadowBlur = isBoosting ? 40 : 15;
       if (isPlayer) {
           const pulse = (Math.sin(Date.now() / 200) + 1) * 0.5; 
           shadowBlur += pulse * 15;
       }

       if (isRainbow) {
           ctx.save();
           ctx.shadowBlur = shadowBlur;
           ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
           
           if (skin === 'pixel') {
                for (let i = 0; i < snake.body.length; i++) {
                    const p = snake.body[i];
                    const hue = (i * 10 - Date.now() / 5) % 360;
                    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                    ctx.fillRect(p.x - width/2, p.y - width/2, width, width);
                }
           } else {
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
           }

       } else if (skin === 'flames') {
           // --- FLAMES SKIN RENDERING ---
           ctx.shadowBlur = isBoosting ? 40 : 20;
           ctx.shadowColor = '#ff4500'; // OrangeRed glow

           // 1. Base Dark Layer
           ctx.strokeStyle = '#220a0a'; // Dark charred core
           ctx.lineWidth = width;
           ctx.beginPath();
           if (snake.body.length > 0) {
               ctx.moveTo(snake.body[0].x, snake.body[0].y);
               for (let i = 1; i < snake.body.length; i++) {
                   ctx.lineTo(snake.body[i].x, snake.body[i].y);
               }
           }
           ctx.stroke();

           // 2. Pulsating Fire Core
           const now = Date.now();
           for (let i = 0; i < snake.body.length - 1; i++) {
              const curr = snake.body[i];
              const next = snake.body[i+1];
              
              // Calculate pulse based on index to create flowing animation
              // Faster frequency when boosting
              const freq = isBoosting ? 80 : 150;
              const pulse = Math.sin((now / freq) - (i * 0.3)) * 0.3 + 0.7;
              
              // Fire core width varies with pulse
              const fireWidth = width * (isBoosting ? 0.8 : 0.5) * pulse;
              
              // Color gradient simulation: Yellow/White (hot) -> Orange/Red (cool)
              // Shift hue slightly over time
              const hueBase = 15; // Orange-Red
              const hueVar = Math.sin(now / 200 - i * 0.1) * 15;
              const hue = hueBase + hueVar; 
              const lightness = isBoosting ? 70 : 60; // Brighter when boosting

              ctx.strokeStyle = `hsl(${hue}, 100%, ${lightness}%)`;
              ctx.lineWidth = fireWidth;
              
              ctx.beginPath();
              ctx.moveTo(curr.x, curr.y);
              ctx.lineTo(next.x, next.y);
              ctx.stroke();
           }

       } else {
           // Standard Rendering
           ctx.shadowBlur = shadowBlur;
           ctx.shadowColor = skin === 'ghost' ? '#ffffff' : snake.color;
           ctx.strokeStyle = snake.color;
           ctx.fillStyle = snake.color;
           
           if (skin === 'ghost') {
               ctx.lineWidth = width * 0.5;
               ctx.shadowBlur = 20; 
           }

           if (skin === 'pixel') {
                for (const p of snake.body) {
                   ctx.fillRect(p.x - width/2, p.y - width/2, width, width);
                }
           } else {
                ctx.beginPath();
                if (snake.body.length > 0) {
                    ctx.moveTo(snake.body[0].x, snake.body[0].y);
                    for (let i = 1; i < snake.body.length; i++) {
                        ctx.lineTo(snake.body[i].x, snake.body[i].y);
                    }
                }
                ctx.stroke();
           }

           if (skin === 'ghost') {
              ctx.save();
              ctx.globalAlpha = 0.3;
              ctx.lineWidth = width;
              ctx.strokeStyle = snake.color;
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
       }
       
       // Pattern logic
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
                 if (skin === 'digital' || skin === 'pixel') {
                     ctx.rect(snake.body[i].x - spotRadius, snake.body[i].y - spotRadius, spotRadius*2, spotRadius*2);
                 } else {
                     ctx.arc(snake.body[i].x, snake.body[i].y, spotRadius, 0, Math.PI*2);
                 }
                 ctx.fill();
              }
          } else if (snake.pattern === 'waves') {
              ctx.lineWidth = width * 0.2;
              ctx.beginPath();
              for (let i = 1; i < snake.body.length - 1; i++) {
                  const curr = snake.body[i];
                  const next = snake.body[i+1];
                  const angle = Math.atan2(next.y - curr.y, next.x - curr.x);
                  const perp = angle + Math.PI / 2;
                  const offset = Math.sin(i * 0.5) * (width * 0.35);
                  const wx = curr.x + Math.cos(perp) * offset;
                  const wy = curr.y + Math.sin(perp) * offset;
                  if (i === 1) ctx.moveTo(wx, wy);
                  else ctx.lineTo(wx, wy);
              }
              ctx.stroke();
          } else if (snake.pattern === 'camouflage') {
               const step = 4;
               for (let i = 2; i < snake.body.length - 1; i += step) {
                  const rand = Math.sin(i * 123.45); 
                  const size = width * (0.4 + Math.abs(rand) * 0.3);
                  ctx.save();
                  ctx.translate(snake.body[i].x, snake.body[i].y);
                  ctx.rotate(rand * Math.PI * 2);
                  ctx.beginPath();
                  ctx.moveTo(-size/2, -size/2);
                  ctx.lineTo(size/2, -size/3);
                  ctx.lineTo(0, size/2);
                  ctx.fill();
                  ctx.restore();
               }
          }
       }
       
       // Head Glow
       if (isPlayer) {
           const head = snake.body[0];
           ctx.save();
           const glowRadius = isBoosting ? width * 3.5 : width * 2.0;
           const opacity = isBoosting ? 0.5 : 0.25;
           
           const grad = ctx.createRadialGradient(head.x, head.y, width * 0.2, head.x, head.y, glowRadius);
           if (isRainbow) {
               grad.addColorStop(0, 'white');
               grad.addColorStop(0.4, `hsl(${-Date.now() / 5 % 360}, 100%, 50%)`);
               grad.addColorStop(1, 'rgba(0,0,0,0)');
           } else if (skin === 'flames') {
               grad.addColorStop(0, '#ffff00');
               grad.addColorStop(0.4, '#ff4500');
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

       // --- HEAD & FACE DRAWING ---
       const head = snake.body[0];
       ctx.shadowBlur = 0;
       ctx.fillStyle = 'white';
       ctx.globalAlpha = 1.0;
       
       const isPixel = (skin === 'digital' || skin === 'pixel');
       const eyeOffset = width * 0.35; 
       const eyeSize = width * 0.35; 

       ctx.save();
       ctx.translate(head.x, head.y);
       ctx.rotate(snake.angle);

       // 1. Head Shape
       if (isPixel) {
           ctx.fillStyle = isRainbow ? '#fff' : snake.color;
           ctx.fillRect(-width/2, -width/2, width, width);
           ctx.fillStyle = 'white'; 
       } else if (skin === 'shard') {
           ctx.fillStyle = isRainbow ? '#fff' : snake.color;
           ctx.beginPath();
           ctx.moveTo(width * 0.8, 0);
           ctx.lineTo(-width * 0.5, width * 0.6);
           ctx.lineTo(-width * 0.5, -width * 0.6);
           ctx.closePath();
           ctx.fill();
           ctx.fillStyle = 'white';
       } else if (skin === 'cobra') {
            ctx.fillStyle = isRainbow ? '#fff' : snake.color;
            
            // Hood Flaring: Expand width when boosting with a slight flutter
            const boostFlutter = isBoosting ? Math.sin(Date.now() / 50) * 0.1 : 0;
            const hoodWidthScale = isBoosting ? (1.9 + boostFlutter) : 1.4;
            const hoodW = width * hoodWidthScale;

            ctx.beginPath();
            // Main hood
            ctx.ellipse(-width * 0.2, 0, width * 0.8, hoodW, 0, 0, Math.PI * 2);
            ctx.fill();

            // Scale Texture (Subtle dots pattern on hood)
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            for(let lx = -width * 0.6; lx < width * 0.2; lx += width * 0.3) {
                for(let ly = -hoodW * 0.8; ly < hoodW * 0.8; ly += width * 0.3) {
                     // Simple check to keep texture roughly inside ellipse
                     if (Math.abs(ly) < hoodW * 0.7) {
                         ctx.beginPath();
                         ctx.arc(lx, ly, width * 0.08, 0, Math.PI * 2);
                         ctx.fill();
                     }
                }
            }
            
            // Spectacle mark (V shape) on the hood
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            ctx.lineWidth = width * 0.15;
            ctx.lineCap = 'round';
            ctx.beginPath();
            // Adjust markings based on hood width
            ctx.moveTo(-width * 0.5, -hoodW * 0.5);
            ctx.bezierCurveTo(-width * 0.2, 0, -width * 0.2, 0, -width * 0.5, hoodW * 0.5);
            ctx.stroke();
            
            ctx.fillStyle = 'white';
       } else if (skin === 'flames') {
           // --- Flames Head ---
           const pulse = (Math.sin(Date.now() / 100) + 1) * 0.5; 
           ctx.fillStyle = '#ff3300'; // Red-Orange
           ctx.shadowColor = '#ffff00';
           ctx.shadowBlur = 20 * pulse;
           
           // Draw a more organic fire head shape
           ctx.beginPath();
           ctx.arc(0, 0, width * 0.55, 0, Math.PI * 2);
           ctx.fill();

           // Inner hot spot
           ctx.fillStyle = '#ffff00';
           ctx.beginPath();
           ctx.arc(0, 0, width * 0.3 * (0.8 + pulse * 0.4), 0, Math.PI * 2);
           ctx.fill();
           ctx.shadowBlur = 0;
       }

       // 2. Face Rendering (High Visibility Update)
       const face = snake.face || 'none';
       
       // Common settings
       ctx.fillStyle = 'white';
       ctx.strokeStyle = 'rgba(0,0,0,0.7)'; // Dark outline for contrast
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
           // Standard Googly Eyes
           drawEyeContainer(eyeOffset * 0.6, -eyeOffset, eyeSize);
           drawEyeContainer(eyeOffset * 0.6, eyeOffset, eyeSize);
           drawPupil(eyeOffset * 0.8, -eyeOffset, eyeSize * 0.4);
           drawPupil(eyeOffset * 0.8, eyeOffset, eyeSize * 0.4);

       } else if (face === 'happy') {
           // Closed eyes ^ ^
           ctx.beginPath();
           ctx.lineWidth = 3;
           ctx.strokeStyle = 'white';
           ctx.shadowColor = 'black';
           ctx.shadowBlur = 3;

           // Left Arched Eye
           if (isPixel) {
               ctx.moveTo(-eyeSize/2, -eyeOffset);
               ctx.lineTo(eyeSize/2, -eyeOffset - eyeSize);
               ctx.lineTo(eyeSize*1.5, -eyeOffset);
           } else {
               ctx.arc(eyeOffset * 0.6, -eyeOffset, eyeSize, Math.PI, 0);
           }
           ctx.stroke();
           
           // Right Arched Eye
           ctx.beginPath();
           if (isPixel) {
               ctx.moveTo(-eyeSize/2, eyeOffset);
               ctx.lineTo(eyeSize/2, eyeOffset + eyeSize);
               ctx.lineTo(eyeSize*1.5, eyeOffset);
           } else {
               ctx.arc(eyeOffset * 0.6, eyeOffset, eyeSize, Math.PI, 0);
           }
           ctx.stroke();

           ctx.shadowBlur = 0; // Reset

           // Mouth
           ctx.fillStyle = 'white';
           ctx.strokeStyle = 'rgba(0,0,0,0.7)';
           ctx.lineWidth = 2;
           ctx.beginPath();
           if (isPixel) {
               ctx.rect(0, -eyeSize/2, eyeSize, eyeSize);
           } else {
               ctx.arc(width * 0.2, 0, eyeSize * 0.6, 0, Math.PI * 2);
           }
           ctx.fill();
           ctx.stroke();

       } else if (face === 'angry') {
           // Angled Eyelids
           
           // Left Eye
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
           // Pupil
           drawPupil(0, 0, eyeSize * 0.3);
           ctx.restore();

           // Right Eye
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
           // Pupil
           drawPupil(0, 0, eyeSize * 0.3);
           ctx.restore();

       } else if (face === 'confused') {
           // Mismatched Eyes + Squiggle Mouth
           drawEyeContainer(eyeOffset * 0.6, -eyeOffset, eyeSize * 1.3);
           drawPupil(eyeOffset * 0.6, -eyeOffset, eyeSize * 0.3);

           drawEyeContainer(eyeOffset * 0.6, eyeOffset, eyeSize * 0.6);
           drawPupil(eyeOffset * 0.6, eyeOffset, eyeSize * 0.2);

           ctx.beginPath();
           ctx.strokeStyle = 'white';
           ctx.lineWidth = 3;
           ctx.shadowColor = 'black';
           ctx.shadowBlur = 2;
           ctx.moveTo(0, -width * 0.15);
           ctx.lineTo(width * 0.2, 0);
           ctx.lineTo(0, width * 0.15);
           ctx.stroke();
           ctx.shadowBlur = 0;

       } else if (face === 'cheeky') {
           // Wink and Tongue
           // Left Normal
           drawEyeContainer(eyeOffset * 0.6, -eyeOffset, eyeSize);
           drawPupil(eyeOffset * 0.6, -eyeOffset, eyeSize * 0.4);

           // Right Wink
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

           // Tongue
           ctx.fillStyle = '#ff4081'; 
           ctx.strokeStyle = 'rgba(0,0,0,0.5)';
           ctx.lineWidth = 1;
           ctx.beginPath();
           if (isPixel) {
               ctx.rect(width*0.3, width*0.1, width*0.4, width*0.3);
           } else {
               ctx.arc(width * 0.4, width * 0.2, width * 0.18, 0, Math.PI * 2);
           }
           ctx.fill();
           ctx.stroke();

       } else if (face === 'evil') {
           // Yellow Cat Eyes
           ctx.fillStyle = '#ffeb3b'; 
           
           // Left
           ctx.beginPath();
           if (isPixel) {
               ctx.rect(0, -eyeOffset - eyeSize, eyeSize*2, eyeSize * 1.5);
           } else {
               ctx.ellipse(eyeOffset * 0.8, -eyeOffset, eyeSize * 1.2, eyeSize * 0.7, 0.3, 0, Math.PI * 2);
           }
           ctx.fill();
           ctx.stroke();
           
           // Right
           ctx.beginPath();
           if (isPixel) {
               ctx.rect(0, eyeOffset - eyeSize * 0.5, eyeSize*2, eyeSize * 1.5);
           } else {
               ctx.ellipse(eyeOffset * 0.8, eyeOffset, eyeSize * 1.2, eyeSize * 0.7, -0.3, 0, Math.PI * 2);
           }
           ctx.fill();
           ctx.stroke();

           // Slit Pupils
           ctx.fillStyle = 'black';
           ctx.beginPath();
           if (isPixel) {
                ctx.rect(eyeOffset, -eyeOffset - eyeSize, width * 0.1, eyeSize * 1.5);
                ctx.rect(eyeOffset, eyeOffset - eyeSize * 0.5, width * 0.1, eyeSize * 1.5);
           } else {
                ctx.ellipse(eyeOffset * 0.8, -eyeOffset, eyeSize * 0.3, eyeSize * 0.6, 0.3, 0, Math.PI * 2);
                ctx.ellipse(eyeOffset * 0.8, eyeOffset, eyeSize * 0.3, eyeSize * 0.6, -0.3, 0, Math.PI * 2);
           }
           ctx.fill();
       }

       ctx.restore();

       // Name
       ctx.fillStyle = 'white';
       ctx.font = '12px sans-serif';
       ctx.textAlign = 'center';
       ctx.fillText(snake.name, head.x, head.y - width - 5);

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

    // Render Particles with improved lifecycle support
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
       const p = particlesRef.current[i];
       p.x += p.vx * timeScale; 
       p.y += p.vy * timeScale;
       const drag = Math.pow(0.95, timeScale);
       p.vx *= drag;
       p.vy *= drag;
       
       // Use optional decay if provided, otherwise default
       p.life -= (p.decay || 0.02) * timeScale;
       
       if (p.life <= 0) {
         particlesRef.current.splice(i, 1);
         continue;
       }
       
       ctx.globalAlpha = p.life;
       ctx.fillStyle = p.color;
       ctx.beginPath();
       const baseRadius = p.size || 4;
       
       // Shrink logic: Smoke (shrink=false) stays puffy, debris (shrink=true) shrinks
       const radius = (p.shrink === false) ? baseRadius : Math.max(0, baseRadius * p.life);
       
       ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
       ctx.fill();
       ctx.globalAlpha = 1;
    }

    ctx.restore();

    // ... (Vignette and HUD rendering remains unchanged)
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

        // --- HUD BOOST BAR & MAP ---
        const boostVal = playerRef.current.boostValue;
        const barWidth = 200;
        const barHeight = 10;
        const barX = canvas.width - barWidth - 20;
        const barY = canvas.height - 30; 
        const isRegenerating = !playerRef.current.isBoosting && boostVal < MAX_BOOST_ENERGY;

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth, barHeight, 5);
        ctx.fill();
        
        // Fill
        const fillWidth = (boostVal / MAX_BOOST_ENERGY) * barWidth;
        const boostColor = boostVal < 20 ? '#ef4444' : '#06b6d4'; 
        ctx.fillStyle = boostColor;
        ctx.shadowColor = boostColor;
        ctx.shadowBlur = isRegenerating ? 15 : 10;
        ctx.beginPath();
        ctx.roundRect(barX, barY, Math.max(0, fillWidth), barHeight, 5);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Recharging Animation overlay
        if (isRegenerating) {
           const pulse = (Math.sin(Date.now() / 150) + 1) * 0.5;
           ctx.save();
           ctx.fillStyle = `rgba(255, 255, 255, ${pulse * 0.4})`;
           ctx.beginPath();
           ctx.roundRect(barX, barY, Math.max(0, fillWidth), barHeight, 5);
           ctx.fill();
           ctx.restore();
        }

        // Border
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth, barHeight, 5);
        ctx.stroke();

        // Icon
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText("BOOST", barX + barWidth / 2, barY - 5);
    }

    const mapSize = 130;
    const padding = 20;
    const mapX = canvas.width - mapSize - padding;
    const mapY = canvas.height - mapSize - padding - 50;

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

  // ... (Game Loop and Effects remain unchanged)
  const gameLoop = (timestamp: number) => {
      if (gameState !== GameState.PLAYING) return;
      if (isPausedRef.current) return;

      if (!lastTimeRef.current) {
          lastTimeRef.current = timestamp;
      }
      
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      const targetFrameTime = 1000 / TARGET_FPS;
      const speedMultiplier = GAME_SPEEDS[gameSpeed];
      const timeScale = Math.min(4, (deltaTime / targetFrameTime)) * speedMultiplier;

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
            isPlayer: s.id === 'player',
            killStreak: s.killStreak
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
              
              updateSnake(
                  playerRef.current, 
                  targetX, targetY, timeScale, 
                  isMouseBoostRef.current, 
                  isKeyBoostRef.current
              );
              
              // ... (Particle effects logic)
              if (!playerRef.current.isDead) {
                const snake = playerRef.current;
                const head = snake.body[0];
                const tail = snake.body[snake.body.length - 1];
                const width = getSnakeWidth(snake);
                const angle = snake.angle;
                const isBoosting = snake.isBoosting;
                const isRainbow = snake.color === 'rainbow';

                // Ambient Sparkles around player
                if (Math.random() < 0.05 * timeScale) {
                     createSparkles(
                        head.x + (Math.random() - 0.5) * width * 2,
                        head.y + (Math.random() - 0.5) * width * 2,
                        1
                     );
                }

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
                        size: isBoosting ? 2.5 : 1.5,
                        decay: 0.08,
                        shrink: true
                     });
                }
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
                      vx: 0, vy: 0,
                      life: isBoosting ? 0.6 : 0.3,
                      color: (isBoosting && Math.random() > 0.7) ? '#ffffff' : tColor,
                      size: isBoosting ? 4 : 3,
                      decay: 0.04,
                      shrink: true
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
                          size: width * 0.4,
                          decay: 0.03,
                          shrink: false
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
          const newBot = createSnake(
              `bot-${Date.now()}`, 
              `Bot ${Math.floor(Math.random()*1000)}`, 
              true, 
              x, 
              y
          );
          botsRef.current.push(newBot);
          createExplosion(x, y, '#ffffff');
      }

      render(timeScale);
      animationFrameRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      initGame();
    }
  }, [gameState]);

  useEffect(() => {
    isPausedRef.current = isPaused;
    if (gameState === GameState.PLAYING && !isPaused) {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        lastTimeRef.current = 0; 
        animationFrameRef.current = requestAnimationFrame(gameLoop);
    } else {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
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
