
export interface Point {
  x: number;
  y: number;
}

export type SnakePattern = 'none' | 'stripes' | 'spots';
export type GameSpeedMode = 'SLOW' | 'NORMAL' | 'FAST';

export interface Snake {
  id: string;
  name: string;
  body: Point[];
  angle: number;
  targetAngle: number;
  speed: number;
  color: string;
  pattern: SnakePattern;
  isBoosting: boolean;
  isDead: boolean;
  score: number;
  isBot: boolean;
  skin?: string; // Could be used for advanced rendering later
}

export interface Food {
  id: string;
  x: number;
  y: number;
  color: string;
  radius: number;
  originalRadius: number;
  pulsePhase: number;
  value: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size?: number;
}

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  color: string;
  isPlayer: boolean;
}
