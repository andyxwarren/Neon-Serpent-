
export interface Point {
  x: number;
  y: number;
}

export type SnakePattern = 'none' | 'stripes' | 'spots' | 'waves' | 'camouflage';
export type GameSpeedMode = 'SLOW' | 'NORMAL' | 'FAST';
export type SnakeSkin = 'standard' | 'digital' | 'shard' | 'ghost' | 'pixel' | 'cobra' | 'flames';
export type SnakeFace = 'none' | 'happy' | 'angry' | 'confused' | 'cheeky' | 'evil';

export interface Snake {
  id: string;
  name: string;
  body: Point[];
  angle: number;
  targetAngle: number;
  speed: number;
  color: string;
  pattern: SnakePattern;
  skin: SnakeSkin;
  face: SnakeFace;
  isBoosting: boolean;
  boostValue: number; // 0 to 100
  isDead: boolean;
  score: number;
  isBot: boolean;
  killStreak: number;
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
  decay?: number;
  shrink?: boolean;
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
  killStreak: number;
}

export interface PlayerPreferences {
  name: string;
  color: string;
  pattern: SnakePattern;
  skin: SnakeSkin;
  face: SnakeFace;
  speed: GameSpeedMode;
}
