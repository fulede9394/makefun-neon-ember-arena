// Render: every pixel the player sees. Dark arena, neon grid, glowing
// ember orb player, distinct enemy shapes per type, HUD, title / upgrade /
// pause / victory / defeat screens. Canvas 2D only, no images.
import { CONFIG } from './config.js';

function glow(ctx, x, y, r, color, core) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
  g.addColorStop(0, core);
  g.addColorStop(0.35, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, Math.PI * 2); ctx.fill();
}

function drawEnemy(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  if (e.flash > 0) { ctx.globalAlpha = 0.7; ctx.fillStyle = '#ffffff'; }
  else ctx.fillStyle = e.color;
  ctx.strokeStyle = e.color; ctx.lineWidth = 2;
  if (e.type === 'chaser') {
    // spiky ember shard, rotated toward the player
    ctx.rotate(e.angle);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 === 0 ? e.r + 5 : e.r - 3;
      ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
  } else if (e.type === 'shooter') {
    ctx.beginPath(); ctx.arc(0, 0, e.r, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, e.r * 0.45, 0, Math.PI * 2); ctx.fillStyle = '#070312'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, e.r * 0.2, 0, Math.PI * 2); ctx.fillStyle = e.color; ctx.fill();
  } else {
    // splitter / mini: hexagon
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + e.angle * 0.2;
      ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * e.r, Math.sin(a) * e.r);
    }
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, e.r * 0.4, 0, Math.PI * 2); ctx.fillStyle = 'rgba(7,3,18,0.7)'; ctx.fill();
  }
  // health bar for hurt enemies
  if (e.health < e.maxHealth) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(-e.r, -e.r - 10, e.r * 2, 4);
    ctx.fillStyle = e.color;
    ctx.fillRect(-e.r, -e.r - 10, e.r * 2 * Math.max(0, e.health / e.maxHealth), 4);
  }
  ctx.restore();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10,6,28,0.88)';
  ctx.strokeStyle = 'rgba(46,196,255,0.5)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 14); ctx.fill(); ctx.stroke();
}

function centerText(ctx, text, y, size, color, bold = true) {
  ctx.fillStyle = color;
  ctx.font = `${bold ? '700' : '400'} ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, CONFIG.width / 2, y);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  return {
    draw(state, screen, ui) {
      const { width: W, height: H } = CONFIG;
      ctx.save();
      if (state.shake > 0) ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
      // background + grid
      ctx.fillStyle = CONFIG.palette.background;
      ctx.fillRect(-20, -20, W + 40, H + 40);
      ctx.strokeStyle = CONFIG.palette.grid; ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      // arena border
      ctx.strokeStyle = 'rgba(46,196,255,0.6)'; ctx.lineWidth = 3;
      ctx.strokeRect(4, 4, W - 8, H - 8);

      if (screen === 'title') { this.drawTitle(state); ctx.restore(); return; }

      // bullets
      for (const b of state.bullets) { glow(ctx, b.x, b.y, b.r, '#ffe66d', '#fffbe0'); }
      for (const b of state.enemyBullets) { glow(ctx, b.x, b.y, b.r, '#ff2e88', '#ffd0e6'); }
      // enemies
      for (const e of state.enemies) { glow(ctx, e.x, e.y, e.r * 0.8, e.color, e.color); drawEnemy(ctx, e); }
      // player (blink while invulnerable)
      const p = state.player;
      if (!(p.invulnerable > 0 && Math.floor(state.time * 12) % 2 === 0)) {
        glow(ctx, p.x, p.y, p.r, CONFIG.palette.player, CONFIG.palette.playerCore);
        ctx.fillStyle = CONFIG.palette.playerCore;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.55, 0, Math.PI * 2); ctx.fill();
        // aim tick
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p.x + Math.cos(p.angle) * (p.r + 4), p.y + Math.sin(p.angle) * (p.r + 4));
        ctx.lineTo(p.x + Math.cos(p.angle) * (p.r + 14), p.y + Math.sin(p.angle) * (p.r + 14)); ctx.stroke();
      }
      // particles
      for (const pt of state.particles) {
        ctx.globalAlpha = Math.max(0, pt.life / pt.max);
        ctx.fillStyle = pt.color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // floating score text
      ctx.font = '700 15px system-ui, sans-serif'; ctx.textAlign = 'center';
      for (const t of state.texts) {
        ctx.globalAlpha = Math.max(0, t.life);
        ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      this.drawHud(state, screen);
      if (screen === 'upgrade') this.drawUpgrades(state, ui);
      if (screen === 'paused') { ctx.fillStyle = 'rgba(7,3,18,0.72)'; ctx.fillRect(0, 0, W, H); centerText(ctx, 'PAUSED', H / 2 - 20, 44, '#f2f6ff'); centerText(ctx, 'Press P to resume', H / 2 + 30, 18, '#9aa7c7', false); }
      if (screen === 'victory') this.drawEnd(state, true);
      if (screen === 'defeat') this.drawEnd(state, false);
    },

    drawHud(state, screen) {
      const p = state.player;
      ctx.fillStyle = 'rgba(7,3,18,0.75)';
      ctx.beginPath(); ctx.roundRect(10, 10, 300, 62, 10); ctx.fill();
      ctx.fillStyle = CONFIG.palette.text; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '700 18px system-ui, sans-serif';
      ctx.fillText(`SCORE  ${state.score}`, 22, 30);
      ctx.font = '400 15px system-ui, sans-serif'; ctx.fillStyle = CONFIG.palette.dim;
      ctx.fillText(`Wave ${Math.max(1, state.wave)} / ${CONFIG.totalWaves}    Kills ${state.kills}`, 22, 54);
      // health bar
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath(); ctx.roundRect(CONFIG.width - 240, 16, 200, 16, 8); ctx.fill();
      ctx.fillStyle = p.health / p.maxHealth > 0.35 ? '#2eff8a' : '#ff2e55';
      ctx.beginPath(); ctx.roundRect(CONFIG.width - 240, 16, 200 * Math.max(0, p.health / p.maxHealth), 16, 8); ctx.fill();
      ctx.fillStyle = CONFIG.palette.text; ctx.font = '700 14px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`${Math.ceil(Math.max(0, p.health))} / ${p.maxHealth}`, CONFIG.width - 140, 24);
      // lives as small embers
      for (let i = 0; i < p.lives; i++) { glow(ctx, CONFIG.width - 210 + i * 26, 52, 7, '#ffb347', '#fff3c4'); }
      ctx.fillStyle = CONFIG.palette.dim; ctx.font = '400 13px system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(screen === 'playing' ? 'P pause · M mute' : '', 22, CONFIG.height - 16);
    },

    drawTitle() {
      ctx.fillStyle = 'rgba(7,3,18,0.55)'; ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
      centerText(ctx, 'NEON EMBER', 150, 64, '#ffb347');
      centerText(ctx, 'ARENA', 215, 64, '#2ec4ff');
      centerText(ctx, 'Survive 10 waves of ember fiends. Pick upgrades. Don\u2019t burn out.', 285, 20, '#f2f6ff', false);
      centerText(ctx, 'WASD / Arrows — move      Mouse — aim      Click / Space — shoot', 340, 18, '#9aa7c7', false);
      centerText(ctx, 'Between waves choose 1 of 3 upgrades with keys 1-2-3 or a click.', 370, 18, '#9aa7c7', false);
      centerText(ctx, 'Clear wave 10 to win. Lose all lives and the arena wins.', 400, 18, '#9aa7c7', false);
      ctx.fillStyle = '#ff2e88';
      ctx.beginPath(); ctx.roundRect(CONFIG.width / 2 - 190, 440, 380, 54, 12); ctx.fill();
      centerText(ctx, 'CLICK OR PRESS ENTER TO IGNITE', 468, 19, '#ffffff');
    },

    drawUpgrades(state, ui) {
      ctx.fillStyle = 'rgba(7,3,18,0.72)'; ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
      centerText(ctx, `WAVE ${state.wave} CLEARED`, 110, 40, '#2eff8a');
      centerText(ctx, 'Choose an upgrade — it shapes the rest of your run', 155, 19, '#f2f6ff', false);
      const cards = ui.upgradeChoices;
      cards.forEach((u, i) => {
        const x = 120 + i * 260, y = 200, w = 230, h = 190;
        const hover = ui.hoverCard === i;
        ctx.fillStyle = hover ? 'rgba(46,196,255,0.22)' : 'rgba(10,6,28,0.92)';
        ctx.strokeStyle = hover ? '#2ec4ff' : 'rgba(46,196,255,0.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(x, y, w, h, 14); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#2ec4ff'; ctx.font = '700 15px system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`[${i + 1}]`, x + w / 2, y + 32);
        ctx.fillStyle = '#f2f6ff'; ctx.font = '700 20px system-ui, sans-serif';
        ctx.fillText(u.name, x + w / 2, y + 66);
        ctx.fillStyle = '#9aa7c7'; ctx.font = '400 15px system-ui, sans-serif';
        wrapText(ctx, u.desc, x + w / 2, y + 100, w - 28, 21);
      });
    },

    drawEnd(state, won) {
      ctx.fillStyle = 'rgba(7,3,18,0.78)'; ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
      centerText(ctx, won ? 'ARENA CONQUERED!' : 'THE EMBER FADES', 210, 48, won ? '#2eff8a' : '#ff2e55');
      centerText(ctx, won ? 'You cleared all 10 waves. The arena is yours.' : 'The fiends overran the arena this time.', 275, 19, '#f2f6ff', false);
      centerText(ctx, `Final score  ${state.score}    ·    Waves cleared  ${won ? 10 : Math.max(0, state.wave - 1)}    ·    Kills  ${state.kills}`, 325, 20, '#9aa7c7', false);
      ctx.fillStyle = '#ff2e88';
      ctx.beginPath(); ctx.roundRect(CONFIG.width / 2 - 130, 380, 260, 54, 12); ctx.fill();
      centerText(ctx, 'PRESS R TO PLAY AGAIN', 408, 20, '#ffffff');
    },
  };
}

function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '', yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) { ctx.fillText(line, cx, yy); line = w; yy += lineHeight; }
    else line = test;
  }
  if (line) ctx.fillText(line, cx, yy);
}
