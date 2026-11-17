// Upgrades: the choices between waves. Each one is a real trade-off in
// the player's build — fire rate, extra projectiles, health, speed,
// piercing, or a fresh life — picked with keys 1/2/3 or a mouse click.
export const UPGRADE_POOL = [
  {
    id: 'rapid', name: 'Rapid Ember', key: '1',
    desc: 'Fire 25% faster. Your orb spits embers in a hurry.',
    apply(p) { p.fireInterval *= 0.75; },
  },
  {
    id: 'spread', name: 'Spread Shot', key: '2',
    desc: '+1 projectile per shot, fanned out. Crowds melt.',
    apply(p) { p.projectiles += 1; },
  },
  {
    id: 'bulwark', name: 'Bulwark Core', key: '3',
    desc: '+40 max health and heal 40 now.',
    apply(p) { p.maxHealth += 40; p.health = Math.min(p.maxHealth, p.health + 40); },
  },
  {
    id: 'swift', name: 'Swift Boots', key: '4',
    desc: 'Move 15% faster. Outrun the chasers.',
    apply(p) { p.speed *= 1.15; },
  },
  {
    id: 'pierce', name: 'Piercing Embers', key: '5',
    desc: 'Bullets punch through +1 enemy.',
    apply(p) { p.pierce += 1; },
  },
  {
    id: 'life', name: 'Second Spark', key: '6',
    desc: '+1 life. A spare ember for a bad wave.',
    apply(p) { p.lives += 1; },
  },
];

// Pick 3 distinct upgrades at random. `rng` is seeded in screenshot mode.
export function drawUpgrades(rng) {
  const pool = [...UPGRADE_POOL];
  const picks = [];
  while (picks.length < 3 && pool.length) {
    picks.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return picks;
}
