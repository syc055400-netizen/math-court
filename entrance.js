// Court entry is cosmetic: skipping it never changes the player's saved run.
let activeEntrance = null;

function doorSound() {
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return () => {};
    const context = new Context();
    context.resume().catch(() => {});
    const now = context.currentTime;
    const master = context.createGain();
    master.gain.value = 0.15;
    master.connect(context.destination);
    // Low wooden resonance and a quiet hinge creak; no media or network calls.
    const wood = context.createOscillator();
    const woodGain = context.createGain();
    wood.type = 'triangle';
    wood.frequency.setValueAtTime(92, now + 0.65);
    wood.frequency.exponentialRampToValueAtTime(48, now + 1.9);
    woodGain.gain.setValueAtTime(0, now);
    woodGain.gain.linearRampToValueAtTime(0.5, now + 0.75);
    woodGain.gain.exponentialRampToValueAtTime(0.001, now + 2);
    wood.connect(woodGain); woodGain.connect(master);
    wood.start(now); wood.stop(now + 2.1);
    const hinge = context.createOscillator();
    const hingeGain = context.createGain();
    hinge.type = 'sine';
    hinge.frequency.setValueAtTime(290, now + 0.7);
    hinge.frequency.linearRampToValueAtTime(410, now + 1.2);
    hinge.frequency.linearRampToValueAtTime(240, now + 1.8);
    hingeGain.gain.setValueAtTime(0, now);
    hingeGain.gain.linearRampToValueAtTime(0.08, now + 0.9);
    hingeGain.gain.exponentialRampToValueAtTime(0.001, now + 1.9);
    hinge.connect(hingeGain); hingeGain.connect(master);
    hinge.start(now); hinge.stop(now + 2.1);
    return () => { context.close().catch(() => {}); };
  } catch { return () => {}; }
}

/** Render the case first, then call this. Resolves after 2.8s or an explicit skip. */
export function enterCourt({ title = '', chapter = '미적분Ⅰ', sound = false } = {}) {
  activeEntrance?.();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const previousFocus = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = `court-entrance${reduced ? ' court-entrance--reduced' : ''}`;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '법정 입장');
  overlay.innerHTML = `
    <div class="entrance-darkness" aria-hidden="true"></div>
    <div class="entrance-portal" aria-hidden="true">
      <div class="entrance-door entrance-door--left"><i class="door-panel door-panel--top"></i><i class="door-panel door-panel--bottom"></i><i class="door-handle"></i></div>
      <div class="entrance-door entrance-door--right"><i class="door-panel door-panel--top"></i><i class="door-panel door-panel--bottom"></i><i class="door-handle"></i></div>
      <div class="entrance-light"></div>
    </div>
    <div class="entrance-letterbox entrance-letterbox--top" aria-hidden="true"></div>
    <div class="entrance-letterbox entrance-letterbox--bottom" aria-hidden="true"></div>
    <div class="entrance-caption"><span class="entrance-kicker"></span><strong class="entrance-case"></strong><span class="entrance-ready">지금, 재판을 시작합니다.</span></div>
    <button type="button" class="entrance-skip">건너뛰기 <span aria-hidden="true">›</span></button>`;
  overlay.querySelector('.entrance-kicker').textContent = chapter;
  overlay.querySelector('.entrance-case').textContent = title;
  const siblings = [...document.body.children].map(node => ({ node, inert: node.inert }));
  siblings.forEach(({ node }) => { node.inert = true; });
  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  document.body.append(overlay);
  let stopSound = sound && !reduced ? doorSound() : () => {};
  let timer, frame, finished = false;

  return new Promise(resolve => {
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer); cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      stopSound(); stopSound = () => {};
      overlay.remove();
      siblings.forEach(({ node, inert }) => { node.inert = inert; });
      document.body.style.overflow = previousOverflow;
      activeEntrance = null;
      const target = document.querySelector('.question') || (previousFocus?.isConnected ? previousFocus : null);
      target?.focus({ preventScroll: true });
      resolve();
    };
    const onKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); finish(); }
      // The overlay has a single control. Keep focus off the inert game below it.
      if (event.key === 'Tab') { event.preventDefault(); overlay.querySelector('button').focus(); }
    };
    activeEntrance = finish;
    overlay.querySelector('button').addEventListener('click', finish);
    document.addEventListener('keydown', onKey);
    overlay.querySelector('button').focus({ preventScroll: true });
    frame = requestAnimationFrame(() => overlay.classList.add('is-opening'));
    timer = setTimeout(finish, reduced ? 120 : 2800);
  });
}
