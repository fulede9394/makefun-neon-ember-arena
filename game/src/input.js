// Input: keyboard + mouse, kept separate from game logic so the loop
// only reads a plain state object. Also owns the upgrade-card clicks.
export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false, clickX: 0, clickY: 0 };
  const pressed = new Set(); // edge-triggered keys, consumed once per frame

  function keyName(e) { return e.key.length === 1 ? e.key.toLowerCase() : e.key; }

  window.addEventListener('keydown', (e) => {
    const k = keyName(e);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (!e.repeat) pressed.add(k);
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => keys.delete(keyName(e)));
  window.addEventListener('blur', () => { keys.clear(); mouse.down = false; });

  function toLocal(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
  }
  canvas.addEventListener('mousemove', (e) => { const p = toLocal(e); mouse.x = p.x; mouse.y = p.y; });
  canvas.addEventListener('mousedown', (e) => {
    const p = toLocal(e); mouse.x = p.x; mouse.y = p.y; mouse.down = true;
    mouse.clicked = true; mouse.clickX = p.x; mouse.clickY = p.y;
  });
  window.addEventListener('mouseup', () => { mouse.down = false; });

  return {
    keys, mouse,
    down(...names) { return names.some((n) => keys.has(n)); },
    // true once for the frame the key was pressed, then cleared by endFrame()
    wasPressed(name) { return pressed.has(name); },
    endFrame() { pressed.clear(); mouse.clicked = false; },
  };
}
