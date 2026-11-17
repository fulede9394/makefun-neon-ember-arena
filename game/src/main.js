// Neon Ember Arena — game loop and state machine.
// Screens: title -> playing <-> paused, playing -> upgrade -> playing,
// playing -> victory (wave 10 cleared) / defeat (no lives left).
// Original top-down arena shooter: survive 10 waves, pick upgrades
// between waves, restart with R. No libraries, no network.
import { CONFIG, makeRng } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { drawUpgrades } from './upgrades.js';
import { createWorld } from './world.js';
import { createRenderer } from './render.js';
import { applyShotMode } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = CONFIG.width;
canvas.height = CONFIG.height;

const input = createInput(canvas);
const audio = createAudio();
const renderer = createRenderer(canvas);
const params = new URLSearchParams(location.search);

const game = {
  screen: 'title',
  rng: makeRng((Math.random() * 1e9) | 0),
  world: null,
  upgradeChoices: [],
  hoverCard: -1,
  shotMode: false,
};

function newWorld() {
  game.world = createWorld(game.rng);
  game.upgradeChoices = [];
}

newWorld();
game.shotMode = applyShotMode(game, params);

function startRun() {
  newWorld();
  game.world.startWave(1);
  game.screen = 'playing';
  audio.unlock(); audio.wave();
}

function resetToTitle() {
  newWorld();
  game.screen = 'title';
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!game.shotMode) tick(dt);
  renderer.draw(game.world.state, game.screen, { upgradeChoices: game.upgradeChoices, hoverCard: game.hoverCard });
  input.endFrame();
  requestAnimationFrame(frame);
}

function tick(dt) {
  // global keys
  if (input.wasPressed('m')) audio.toggleMute();
  if (input.wasPressed('Enter') && game.screen === 'title') { startRun(); return; }
  if (input.mouse.clicked && game.screen === 'title') { startRun(); return; }
  if (input.wasPressed('r') && (game.screen === 'victory' || game.screen === 'defeat')) { resetToTitle(); return; }
  if (input.wasPressed('p') && (game.screen === 'playing' || game.screen === 'paused')) {
    game.screen = game.screen === 'playing' ? 'paused' : 'playing';
    return;
  }

  if (game.screen === 'playing') {
    game.world.update(dt, input, audio);
    const w = game.world.state;
    if (w.player.lives <= 0) {
      game.screen = 'defeat'; audio.defeat();
    } else if (w.enemies.length === 0) {
      if (w.wave >= CONFIG.totalWaves) {
        game.screen = 'victory'; audio.victory();
      } else {
        game.upgradeChoices = drawUpgrades(game.rng);
        game.screen = 'upgrade'; audio.upgrade();
      }
    }
  } else if (game.screen === 'upgrade') {
    // hover tracking for card highlight
    game.hoverCard = -1;
    game.upgradeChoices.forEach((u, i) => {
      const x = 120 + i * 260, y = 200, w = 230, h = 190;
      if (input.mouse.x >= x && input.mouse.x <= x + w && input.mouse.y >= y && input.mouse.y <= y + h) game.hoverCard = i;
    });
    let pick = -1;
    if (input.wasPressed('1')) pick = 0;
    if (input.wasPressed('2')) pick = 1;
    if (input.wasPressed('3')) pick = 2;
    if (input.mouse.clicked && game.hoverCard >= 0) pick = game.hoverCard;
    if (pick >= 0 && pick < game.upgradeChoices.length) {
      game.upgradeChoices[pick].apply(game.world.state.player);
      game.upgradeChoices = [];
      game.world.startWave(game.world.state.wave + 1);
      game.screen = 'playing';
      audio.wave();
    }
  }
}

requestAnimationFrame(frame);
