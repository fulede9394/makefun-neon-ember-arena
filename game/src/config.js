// Neon Ember Arena — tuning constants. One place for every number the
// designers (us) want to tweak: arena size, player feel, enemy stats,
// wave scaling and scoring. Nothing here touches the DOM or canvas.
export const CONFIG = {
  width: 960,
  height: 600,
  totalWaves: 10,
  player: {
    radius: 16,
    speed: 260,
    maxHealth: 100,
    lives: 3,
    fireInterval: 0.22,
    bulletSpeed: 560,
    bulletDamage: 34,
    bulletRadius: 5,
  },
  enemies: {
    chaser: { radius: 15, speed: 95, health: 40, damage: 12, score: 100, color: '#ff2e88' },
    shooter: { radius: 16, speed: 62, health: 55, damage: 10, score: 150, color: '#ff9f1c' },
    splitter: { radius: 26, speed: 58, health: 90, damage: 16, score: 200, color: '#2ec4ff' },
    mini: { radius: 9, speed: 150, health: 18, damage: 8, score: 50, color: '#7ef9ff' },
  },
  waves: {
    // wave n (1-based): how many enemies, and how much faster/tougher they get
    count: (n) => 4 + n * 2,
    speedScale: (n) => 1 + (n - 1) * 0.07,
    healthScale: (n) => 1 + (n - 1) * 0.12,
    // mix shifts from chasers toward shooters and splitters as waves rise
    mix: (n) => {
      const shooterChance = Math.min(0.15 + n * 0.03, 0.4);
      const splitterChance = n < 3 ? 0 : Math.min(0.08 + n * 0.02, 0.25);
      return { shooterChance, splitterChance };
    },
  },
  palette: {
    background: '#070312',
    grid: '#1b1040',
    player: '#ffb347',
    playerCore: '#fff3c4',
    bullet: '#ffe66d',
    text: '#f2f6ff',
    dim: '#9aa7c7',
    cyan: '#2ec4ff',
    magenta: '#ff2e88',
    orange: '#ff9f1c',
  },
};

// Seeded RNG (mulberry32) so screenshot mode is deterministic.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
