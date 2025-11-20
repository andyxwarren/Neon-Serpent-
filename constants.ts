
export const WORLD_SIZE = 4000;
export const INITIAL_SNAKE_LENGTH = 20;
export const BASE_SPEED = 4;
export const BOOST_SPEED = 7;
export const TURN_SPEED = 0.14;
export const SEGMENT_DISTANCE = 8; // Distance between body parts
export const FOOD_VALUE = 1;
export const FOOD_COUNT = 600;
export const BOT_COUNT = 15;
export const TARGET_FPS = 60;

// Boost Mechanics
export const MAX_BOOST_ENERGY = 100;
export const BOOST_COST = 0.2; // Energy lost per frame while boosting (Reduced for longer duration)
export const BOOST_REGEN = 0.2; // Energy gained per frame while resting

export const GAME_SPEEDS = {
  SLOW: 0.7,
  NORMAL: 1.0,
  FAST: 1.4
};

export const COLORS = {
  neonBlue: '#00f3ff',
  neonPink: '#ff00ff',
  neonGreen: '#00ff00',
  neonOrange: '#ff9900',
  neonPurple: '#bc13fe',
  neonRed: '#ff0044',
  grid: '#1e293b',
  background: '#0f172a'
};

export const SNAKE_COLORS = [
  COLORS.neonBlue,
  COLORS.neonPink,
  COLORS.neonGreen,
  COLORS.neonOrange,
  COLORS.neonPurple,
  COLORS.neonRed,
  'rainbow'
];

export const SNAKE_PATTERNS = ['none', 'stripes', 'spots', 'waves', 'camouflage'];
export const SNAKE_SKINS = ['standard', 'digital', 'shard', 'ghost', 'pixel', 'cobra', 'flames'];
export const SNAKE_FACES = ['none', 'happy', 'angry', 'confused', 'cheeky', 'evil'];

export const FOOD_COLORS = [
  '#00f3ff', // Blue
  '#ff00ff', // Pink
  '#00ff00', // Green
  '#ff9900', // Orange
  '#bc13fe', // Purple
  '#ff0044', // Red
  '#ffe700', // Yellow
  '#00ff99', // Mint
  '#ffffff'  // White
];

export const GEMINI_MODEL = 'gemini-2.5-flash';
