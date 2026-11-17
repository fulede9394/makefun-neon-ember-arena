// World: everything that moves and fights — player, enemies, bullets,
// particles and floating score text — plus wave spawning and collisions.
// No drawing here; render.js reads this state.
import { CONFIG, clamp, dist2 } from './config.js';

export function createWorld(rng) {
  const W = CONFIG.width, H = CONFIG.height;
  const state = {
    player: {
      x: W / 2, y: H / 2, r: CONFIG.player.radius,
      speed: CONFIG.player.speed, health: CONFIG.player.maxHealth,
      maxHealth: CONFIG.player.maxHealth, lives: CONFIG.player.lives,
      fireInterval: CONFIG.player.fireInterval, fireTimer: 0,
      projectiles: 1, pierce: 0, invulnerable: 0, angle: -Math.PI / 2,
    },
    enemies: [], bullets: [], enemyBullets: [], particles: [], texts: [],
    score: 0, wave: 0, kills: 0, shake: 0, time: 0,
  };

  function spawnPoint() {
    // spawn just outside a random edge, so enemies walk in
    const side = Math.floor(rng() * 4);
    const m = 30;
    if (side === 0) return { x: rng() * W, y: -m };
    if (side === 1) return { x: rng() * W, y: H + m };
    if (side === 2) return { x: -m, y: rng() * H };
    return { x: W + m, y: rng() * H };
  }

  function makeEnemy(type) {
    const base = CONFIG.enemies[type];
    const scale = CONFIG.waves.healthScale(state.wave);
    const p = spawnPoint();
    return {
      type, x: p.x, y: p.y, r: base.radius,
      speed: base.speed * CONFIG.waves.speedScale(state.wave) * (0.9 + rng() * 0.2),
      health: base.health * scale, maxHealth: base.health * scale,
      damage: base.damage, score: base.score, color: base.color,
      shootTimer: 1 + rng() * 2, flash: 0, angle: 0,
    };
  }

  function startWave(n) {
    state.wave = n;
    const { shooterChance, splitterChance } = CONFIG.waves.mix(n);
    const count = CONFIG.waves.count(n);
    for (let i = 0; i < count; i++) {
      const roll = rng();
      const type = roll < splitterChance ? 'splitter' : roll < splitterChance + shooterChance ? 'shooter' : 'chaser';
      state.enemies.push(makeEnemy(type));
    }
  }

  function burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2;
      const s = speed * (0.4 + rng() * 0.8);
      state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + rng() * 0.4, max: 0.9, color, r: 2 + rng() * 3 });
    }
  }

  function addText(x, y, text, color) {
    state.texts.push({ x, y, text, color, life: 0.9 });
  }

  function damageEnemy(e, dmg) {
    e.health -= dmg; e.flash = 0.12;
    if (e.health <= 0) {
      state.kills += 1;
      state.score += e.score;
      addText(e.x, e.y, `+${e.score}`, '#ffe66d');
      burst(e.x, e.y, e.color, e.type === 'splitter' ? 22 : 12, 220);
      state.shake = Math.min(10, state.shake + 3);
      if (e.type === 'splitter') {
        for (let i = 0; i < 2; i++) {
          state.enemies.push({
            type: 'mini', x: e.x + (rng() - 0.5) * 30, y: e.y + (rng() - 0.5) * 30,
            r: CONFIG.enemies.mini.radius, speed: CONFIG.enemies.mini.speed,
            health: CONFIG.enemies.mini.health, maxHealth: CONFIG.enemies.mini.health,
            damage: CONFIG.enemies.mini.damage, score: CONFIG.enemies.mini.score,
            color: CONFIG.enemies.mini.color, shootTimer: 0, flash: 0, angle: 0,
          });
        }
      }
      return true;
    }
    return false;
  }

  function firePlayer() {
    const p = state.player;
    const spread = 0.16;
    for (let i = 0; i < p.projectiles; i++) {
      const offset = (i - (p.projectiles - 1) / 2) * spread;
      const a = p.angle + offset;
      state.bullets.push({
        x: p.x + Math.cos(a) * (p.r + 6), y: p.y + Math.sin(a) * (p.r + 6),
        vx: Math.cos(a) * CONFIG.player.bulletSpeed, vy: Math.sin(a) * CONFIG.player.bulletSpeed,
        r: CONFIG.player.bulletRadius, damage: CONFIG.player.bulletDamage, pierce: p.pierce,
      });
    }
  }

  function update(dt, input, audio) {
    const p = state.player;
    state.time += dt;
    if (p.invulnerable > 0) p.invulnerable -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);

    // --- movement (WASD / arrows) ---
    let mx = (input.down('d', 'ArrowRight') ? 1 : 0) - (input.down('a', 'ArrowLeft') ? 1 : 0);
    let my = (input.down('s', 'ArrowDown') ? 1 : 0) - (input.down('w', 'ArrowUp') ? 1 : 0);
    const len = Math.hypot(mx, my);
    if (len > 0) { mx /= len; my /= len; p.x = clamp(p.x + mx * p.speed * dt, p.r, W - p.r); p.y = clamp(p.y + my * p.speed * dt, p.r, H - p.r); }
    p.angle = Math.atan2(input.mouse.y - p.y, input.mouse.x - p.x);

    // --- firing (hold mouse or Space) ---
    p.fireTimer -= dt;
    if ((input.mouse.down || input.down(' ')) && p.fireTimer <= 0) {
      firePlayer(); p.fireTimer = p.fireInterval; audio.shoot();
    }

    // --- player bullets ---
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt;
      let dead = b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20;
      if (!dead) {
        for (let j = state.enemies.length - 1; j >= 0; j--) {
          const e = state.enemies[j];
          if (dist2(b.x, b.y, e.x, e.y) < (b.r + e.r) * (b.r + e.r)) {
            const killed = damageEnemy(e, b.damage);
            if (killed) { state.enemies.splice(j, 1); audio.explode(); }
            else audio.hit();
            burst(b.x, b.y, '#ffe66d', 4, 120);
            if (b.pierce > 0) { b.pierce -= 1; } else { dead = true; }
            break;
          }
        }
      }
      if (dead) state.bullets.splice(i, 1);
    }

    // --- enemies ---
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      if (e.flash > 0) e.flash -= dt;
      const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
      e.angle = Math.atan2(dy, dx);
      if (e.type === 'shooter') {
        // keep some distance, then shoot at the player
        if (d > 260) { e.x += (dx / d) * e.speed * dt; e.y += (dy / d) * e.speed * dt; }
        else if (d < 180) { e.x -= (dx / d) * e.speed * 0.6 * dt; e.y -= (dy / d) * e.speed * 0.6 * dt; }
        e.shootTimer -= dt;
        if (e.shootTimer <= 0 && d < 520) {
          e.shootTimer = 2.2;
          state.enemyBullets.push({ x: e.x, y: e.y, vx: (dx / d) * 220, vy: (dy / d) * 220, r: 6, damage: e.damage });
        }
      } else {
        e.x += (dx / d) * e.speed * dt; e.y += (dy / d) * e.speed * dt;
      }
      // touch damage
      if (d < e.r + p.r && p.invulnerable <= 0) {
        p.health -= e.damage; p.invulnerable = 0.9; state.shake = 10; audio.hurt();
        burst(p.x, p.y, '#ff2e88', 10, 200);
        if (p.health <= 0) { p.lives -= 1; p.health = p.lives > 0 ? p.maxHealth : 0; p.invulnerable = 2; burst(p.x, p.y, '#ffb347', 30, 300); }
      }
    }

    // --- enemy bullets ---
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
      const b = state.enemyBullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt;
      let dead = b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20;
      if (!dead && p.invulnerable <= 0 && dist2(b.x, b.y, p.x, p.y) < (b.r + p.r) * (b.r + p.r)) {
        p.health -= b.damage; p.invulnerable = 0.9; state.shake = 10; audio.hurt(); dead = true;
        if (p.health <= 0) { p.lives -= 1; p.health = p.lives > 0 ? p.maxHealth : 0; p.invulnerable = 2; }
      }
      if (dead) state.enemyBullets.splice(i, 1);
    }

    // --- particles & floating text ---
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const pt = state.particles[i];
      pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vx *= 0.96; pt.vy *= 0.96; pt.life -= dt;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.texts.length - 1; i >= 0; i--) {
      const t = state.texts[i]; t.y -= 40 * dt; t.life -= dt;
      if (t.life <= 0) state.texts.splice(i, 1);
    }
  }

  return { state, startWave, update, burst, addText };
}
