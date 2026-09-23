export function createHud() {
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('startBtn');
  const droneBtn = document.getElementById('droneBtn');
  const hud = document.getElementById('hud');
  const stats = document.getElementById('stats');
  const status = document.getElementById('status');

  let fpsAccum = 0;
  let fpsFrames = 0;
  let fpsValue = 0;

  function showOverlay(visible, title, bodyHtml, buttonText, { modeChoice = false } = {}) {
    if (title) {
      const h = overlay.querySelector('h1');
      if (h) h.textContent = title;
    }
    if (bodyHtml != null) {
      const b = overlay.querySelector('.body');
      if (b) b.innerHTML = bodyHtml;
    }
    if (buttonText) startBtn.textContent = buttonText;
    if (droneBtn) droneBtn.classList.toggle('hidden', !modeChoice);
    overlay.classList.toggle('hidden', !visible);
  }

  function showHud(visible) {
    hud.classList.toggle('hidden', !visible);
  }

  function onStart(fn) {
    startBtn.addEventListener('click', fn);
  }

  function onDrone(fn) {
    if (droneBtn) droneBtn.addEventListener('click', fn);
  }

  function setButtonEnabled(on) {
    startBtn.disabled = !on;
    if (droneBtn) droneBtn.disabled = !on;
  }

  function update(dt, { altitude, walked }) {
    fpsAccum += dt;
    fpsFrames += 1;
    if (fpsAccum >= 0.5) {
      fpsValue = Math.round(fpsFrames / fpsAccum);
      fpsAccum = 0;
      fpsFrames = 0;
      stats.textContent = `${fpsValue} fps · alt ${altitude.toFixed(0)} m · ${walked.toFixed(0)} m walked`;
    } else {
      stats.textContent = `${fpsValue || '--'} fps · alt ${altitude.toFixed(0)} m · ${walked.toFixed(0)} m walked`;
    }
  }

  function setStatus(text) {
    status.textContent = text;
  }

  return { showOverlay, showHud, onStart, onDrone, setButtonEnabled, update, setStatus };
}
