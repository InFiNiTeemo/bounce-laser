// constants.js - All game constants
export const W = 640, H = 480;
export const PX = 2;
export const SHIELD_RADIUS = 40;
export const MAX_LEVEL = 24;
export const MAX_BULLETS = 50;
export const PRISM_MIN_LEVEL = 4;
export const PRISM_UNIT_W = 40;
export const PRISM_MAX_SEGMENTS = 8;

export const COLORS = {
  bg: '#0f0f1a', grid: '#151525', player: '#00ff88', playerDark: '#009955',
  gun: '#cccccc', bullet: '#00ffcc', bulletTrail: '#00ff8855',
  enemy: '#ff4466', enemyDark: '#aa2244', enemyBullet: '#ff6644',
  wall: '#1a1a2e', text: '#00ff88', warning: '#ffdd44',
  explosion: ['#ff4444','#ff8844','#ffcc44','#ffffff'],
  laserGlow: '#00ffcc', shield: '#00ccff', shieldGlow: '#00eeff',
};

export const PRISM_COLORS = { body: '#aa44ff', bodyDark: '#6622aa', glow: '#cc66ff', destructible: '#ff88cc', destructibleDark: '#aa4488' };

export const PORTAL_COLORS = { blue: '#4488ff', blueBright: '#66ccff', blueGlow: '#2266dd', orange: '#ff8844', orangeBright: '#ffcc66', orangeGlow: '#dd6622' };
export const PORTAL_RADIUS = 16;
export const PORTAL_MIN_LEVEL = 6;

export const ENEMY_COLORS = {
  patrol: { body:'#4488ff', dark:'#2255cc', eye:'#002266' },
  tank:   { body:'#aa44ff', dark:'#6622cc', eye:'#330066' },
  sniper: { body:'#ffcc00', dark:'#aa8800', eye:'#664400' },
  healer: { body:'#44cc88', dark:'#228855', eye:'#004422' },
  ghost:  { body:'#44ddcc', dark:'#228877', eye:'#004433' },
};

export const BARREL_COLORS = { body: '#ff8822', bodyDark: '#aa5511', band: '#ffcc44', danger: '#ff2200', glow: '#ffaa33' };
export const BARREL_MIN_LEVEL = 3;
export const BARREL_EXPLOSION_RADIUS = 120;

export const GRAVITY_WELL_MIN_LEVEL = 13;
export const GRAVITY_WELL_RADIUS = 80;
export const GRAVITY_WELL_COLORS = {
  attract: '#4488ff', attractBright: '#66aaff', attractGlow: '#2266dd',
  repel: '#ffaa44', repelBright: '#ffcc66', repelGlow: '#dd8822',
  pulse: '#aa66ff', pulseBright: '#cc88ff', pulseGlow: '#8844dd',
  core: '#ffffff',
};

export const AMPLIFIER_MIN_LEVEL = 15;
export const AMPLIFIER_RADIUS = 14;
export const AMPLIFIER_COLORS = {
  body: '#44ff88', bodyDark: '#22aa55', glow: '#88ffbb',
  charge: '#ffcc44', flash: '#ffffff',
};

// Demo canvas dimensions
export const DW = 320, DH = 180;
