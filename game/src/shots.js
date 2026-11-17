// Screenshot mode: ?shot=start|play|end&seed=1 renders a fixed scene with
// no user input, so screenshots can be taken headlessly. The normal game
// never depends on this — it only runs when the query is present.
import { CONFIG, makeRng } from './config.js';
import { createWorld } from './world.js';

export function applyShotMode(game, params) {
  const shot = params.get('shot');
  if (!shot) return false;
  const seed = Number(params.get('seed') || 1);
  const rng = makeRng(seed);
  game.rng = rng;
  // rebuild the world on the seeded RNG so the staged scene is identical
  // every time it is rendered.
  game.world = createWorld(rng);
  if (shot === 'start') {
    game.screen = 'title';
  } else if (shot === 'play') {
    game.screen = 'playing';
    game.world.startWave(4);
    // stage a busy mid-fight: player centre, bullets out, particles, score
    const w = game.world;
    w.state.score = 1250; w.state.kills = 14;
    w.state.player.x = CONFIG.width / 2 - 60; w.state.player.y = CONFIG.height / 2 + 40;
    w.state.player.angle = 0.4; w.state.player.health = 78;
    for (let i = 0; i < 5; i++) w.burst(480 + i * 40, 260, '#ffe66d', 6, 140);
    w.addText(520, 240, '+150', '#ffe66d');
    // let the world tick a little so enemies walk in and bullets fly
    const fakeInput = { down: () => false, mouse: { x: 700, y: 240, down: true } };
    for (let i = 0; i < 150; i++) w.update(1 / 60, fakeInput, { shoot() {}, hit() {}, explode() {}, hurt() {} });
  } else if (shot === 'end') {
    game.screen = 'defeat';
    game.world.state.score = 3420; game.world.state.kills = 41; game.world.state.wave = 7;
    game.world.state.player.lives = 0; game.world.state.player.health = 0;
  }
  return true;
}
