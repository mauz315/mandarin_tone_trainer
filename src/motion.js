/**
 * motion.js — Interrupt-Safe UI Transitions, Tactile Physics & 4-Tier Feedback Primitives
 * Zero external dependencies. Calibrated for Neo-Sponsor 2.5-3px borders on mobile & desktop.
 */

const REDUCED_MQ = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : { matches: false };

const DESKTOP_MQ = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(min-width: 1024px)')
  : { matches: false };

const SHEET_DESKTOP_MQ = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(min-width: 640px)')
  : { matches: false };

export const EASE_SNAP = 'cubic-bezier(0.22, 1, 0.36, 1)';
export const EASE_ENTER = 'cubic-bezier(0.05, 0.7, 0.1, 1)';
export const EASE_EXIT = 'cubic-bezier(0.3, 0, 0.8, 0.15)';
export const EASE_SHEET = 'cubic-bezier(0.32, 0.72, 0, 1)';
export const EASE_SPRING_POP = 'linear(0, 0.009, 0.035 2.1%, 0.141 4.4%, 0.723 12.9%, 0.938 16.7%, 1.017, 1.077 20.4%, 1.121 22.8%, 1.139 25.4%, 1.132 28.4%, 1.031 38.4%, 0.988 43.9%, 0.98 48.2%, 1.003 65%, 1.001 82.9%, 1)';

export function prefersReducedMotion() {
  return Boolean(REDUCED_MQ && REDUCED_MQ.matches);
}

const activeAnims = new WeakMap();
const sheetStateMap = new WeakMap();
let navGeneration = 0;

export function cancelMotion(el) {
  if (!el) return;
  const prev = activeAnims.get(el);
  if (prev) {
    try { prev.cancel(); } catch (_) {}
    activeAnims.delete(el);
  }
}

function trackAnim(el, anim) {
  if (!el || !anim) return anim;
  activeAnims.set(el, anim);
  anim.finished
    .catch(() => {})
    .finally(() => {
      if (activeAnims.get(el) === anim) {
        activeAnims.delete(el);
      }
    });
  return anim;
}

/**
 * Simulates mechanical keycap depression for keyboard shortcuts (1-4, Space, N).
 */
export function pressKeycap(el, durationMs = 95) {
  if (!el) return;
  el.dataset.pressed = 'true';
  clearTimeout(el._pressTimer);
  el._pressTimer = setTimeout(() => {
    delete el.dataset.pressed;
  }, durationMs);
}

/**
 * Interrupt-safe screen transition:
 * - Mobile (<1024px): directional Shared Axis X (+/- 24px)
 * - Desktop (>=1024px): vertical Z/Y settle (12px + scale 0.985)
 * - Reduced motion: clean opacity cross-fade
 */
export async function navigateScreens(outEl, inEl, {
  direction = 'forward',
  heroCard = null,
  targetHeroEl = null,
  onBeforeIn = null,
  onAfterIn = null
} = {}) {
  const gen = ++navGeneration;
  const reduced = prefersReducedMotion();
  const isDesktop = Boolean(DESKTOP_MQ && DESKTOP_MQ.matches);
  const dirSign = direction === 'back' ? -1 : 1;

  if (outEl) cancelMotion(outEl);
  if (inEl) cancelMotion(inEl);

  // Progressive View Transition for primary Menu -> Mode/Trainer hero jumps
  const canViewTransition = Boolean(
    !reduced &&
    heroCard &&
    targetHeroEl &&
    typeof document !== 'undefined' &&
    typeof document.startViewTransition === 'function'
  );

  if (canViewTransition) {
    heroCard.style.viewTransitionName = 'active-hero-card';
    try {
      const vt = document.startViewTransition(() => {
        if (outEl) outEl.classList.add('hidden');
        if (onBeforeIn) onBeforeIn();
        if (inEl) inEl.classList.remove('hidden');
        heroCard.style.viewTransitionName = '';
        targetHeroEl.style.viewTransitionName = 'active-hero-card';
      });
      await vt.finished;
    } catch (_) {
      if (outEl) outEl.classList.add('hidden');
      if (onBeforeIn) onBeforeIn();
      if (inEl) inEl.classList.remove('hidden');
    } finally {
      heroCard.style.viewTransitionName = '';
      targetHeroEl.style.viewTransitionName = '';
    }
    if (gen === navGeneration && onAfterIn) onAfterIn();
    return;
  }

  // Fallback / Rapid-drill WAAPI Shared Axis
  if (outEl && outEl !== inEl && !outEl.classList.contains('hidden')) {
    if (typeof outEl.animate === 'function') {
      const outFrames = reduced
        ? [{ opacity: 1 }, { opacity: 0 }]
        : isDesktop
          ? [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.986)' }]
          : [{ opacity: 1, transform: 'translate3d(0,0,0)' }, { opacity: 0, transform: `translate3d(${-22 * dirSign}px,0,0)` }];

      const outAnim = trackAnim(outEl, outEl.animate(outFrames, {
        duration: reduced ? 100 : 150,
        easing: EASE_EXIT,
        fill: 'forwards'
      }));
      try {
        await outAnim.finished;
      } catch (_) {
        return;
      } finally {
        try { outAnim.cancel(); } catch (_) {}
      }
    }
    if (gen !== navGeneration) return;
    outEl.classList.add('hidden');
  }

  if (onBeforeIn) onBeforeIn();
  if (!inEl || gen !== navGeneration) return;

  inEl.classList.remove('hidden');

  if (typeof inEl.animate === 'function') {
    const inFrames = reduced
      ? [{ opacity: 0 }, { opacity: 1 }]
      : isDesktop
        ? [{ opacity: 0, transform: 'translate3d(0,12px,0) scale(0.986)' }, { opacity: 1, transform: 'translate3d(0,0,0) scale(1)' }]
        : [{ opacity: 0, transform: `translate3d(${26 * dirSign}px,0,0)` }, { opacity: 1, transform: 'translate3d(0,0,0)' }];

    const inAnim = trackAnim(inEl, inEl.animate(inFrames, {
      duration: reduced ? 130 : 250,
      easing: EASE_ENTER,
      fill: 'forwards'
    }));

    try {
      await inAnim.finished;
      if (gen === navGeneration) {
        try { inAnim.commitStyles(); } catch (_) {}
        inEl.style.transform = '';
        inEl.style.opacity = '';
      }
    } catch (_) {
      // Interrupted cleanly
    } finally {
      try { inAnim.cancel(); } catch (_) {}
    }
  }

  if (gen === navGeneration && onAfterIn) onAfterIn();
}

/**
 * In-screen sub-view swap (e.g. #main-menu <-> #submenu, View A <-> View B).
 */
export async function swapViews(hideEls = [], showEls = [], {
  direction = 'forward',
  distancePx = 16,
  onAfterShow = null
} = {}) {
  const reduced = prefersReducedMotion();
  const dirSign = direction === 'back' ? -1 : 1;
  const visibleHide = hideEls.filter(el => el && !el.classList.contains('hidden'));

  if (visibleHide.length > 0 && !reduced) {
    await Promise.all(visibleHide.map(el => {
      cancelMotion(el);
      if (typeof el.animate !== 'function') return Promise.resolve();
      const anim = trackAnim(el, el.animate(
        [{ opacity: 1, transform: 'translate3d(0,0,0)' }, { opacity: 0, transform: `translate3d(0,${-8 * dirSign}px,0)` }],
        { duration: 120, easing: EASE_EXIT }
      ));
      return anim.finished.catch(() => {});
    }));
  }

  hideEls.forEach(el => {
    if (el) {
      cancelMotion(el);
      el.classList.add('hidden');
    }
  });

  showEls.forEach((el, idx) => {
    if (!el) return;
    cancelMotion(el);
    el.classList.remove('hidden');
    if (typeof el.animate !== 'function') return;
    const frames = reduced
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ opacity: 0, transform: `translate3d(0,${distancePx * dirSign}px,0)` }, { opacity: 1, transform: 'translate3d(0,0,0)' }];
    trackAnim(el, el.animate(frames, {
      duration: reduced ? 130 : 220,
      delay: reduced ? 0 : idx * 45,
      easing: EASE_SNAP,
      fill: 'backwards'
    }));
  });

  if (onAfterShow) onAfterShow();
}

/**
 * Reveals an inline element smoothly (such as #engine-quick-speed-btn or #engine-sandhi-badge).
 */
export function revealInline(el, { slideX = 0, slideY = 6, duration = 180 } = {}) {
  if (!el) return;
  const wasHidden = el.classList.contains('hidden');
  el.classList.remove('hidden');
  if (!wasHidden || typeof el.animate !== 'function') return;
  cancelMotion(el);
  const reduced = prefersReducedMotion();
  const frames = reduced
    ? [{ opacity: 0 }, { opacity: 1 }]
    : [{ opacity: 0, transform: `translate3d(${slideX}px, ${slideY}px, 0) scale(0.96)` }, { opacity: 1, transform: 'translate3d(0,0,0) scale(1)' }];
  trackAnim(el, el.animate(frames, {
    duration: reduced ? 120 : duration,
    easing: EASE_SNAP
  }));
}

export async function hideInline(el, { slideX = 0, slideY = 4, duration = 130 } = {}) {
  if (!el || el.classList.contains('hidden')) return;
  const reduced = prefersReducedMotion();
  if (!reduced && typeof el.animate === 'function') {
    cancelMotion(el);
    const anim = trackAnim(el, el.animate(
      [{ opacity: 1, transform: 'translate3d(0,0,0)' }, { opacity: 0, transform: `translate3d(${slideX}px, ${slideY}px, 0) scale(0.96)` }],
      { duration, easing: EASE_EXIT }
    ));
    try { await anim.finished; } catch (_) { return; }
  }
  el.classList.add('hidden');
}

/**
 * Opens a backdrop + card modal/sheet smoothly (bottom sheet on mobile, center pop on sm+).
 */
export function openSheetModal(backdropEl, cardSelector = '.modal-sheet-card') {
  if (!backdropEl) return;
  const token = (sheetStateMap.get(backdropEl) || 0) + 1;
  sheetStateMap.set(backdropEl, token);

  const cardEl = backdropEl.querySelector(cardSelector) || backdropEl.firstElementChild;
  cancelMotion(backdropEl);
  if (cardEl) cancelMotion(cardEl);

  backdropEl.classList.remove('hidden');
  const reduced = prefersReducedMotion();
  const isCenterDesktop = Boolean(SHEET_DESKTOP_MQ && SHEET_DESKTOP_MQ.matches) || Boolean(cardEl && cardEl.classList.contains('modal-center-card'));

  if (typeof backdropEl.animate === 'function') {
    trackAnim(backdropEl, backdropEl.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: reduced ? 120 : 200, easing: 'ease-out' }
    ));
  }

  if (cardEl && typeof cardEl.animate === 'function') {
    cardEl.style.transform = '';
    const frames = reduced
      ? [{ opacity: 0 }, { opacity: 1 }]
      : isCenterDesktop
        ? [{ opacity: 0, transform: 'scale(0.93) translate3d(0, 12px, 0)' }, { opacity: 1, transform: 'scale(1) translate3d(0, 0, 0)' }]
        : [{ opacity: 0, transform: 'translate3d(0, 100%, 0)' }, { opacity: 1, transform: 'translate3d(0, 0, 0)' }];

    trackAnim(cardEl, cardEl.animate(frames, {
      duration: reduced ? 130 : (isCenterDesktop ? 230 : 320),
      easing: isCenterDesktop ? EASE_SNAP : EASE_SHEET
    }));
  }
}

export async function closeSheetModal(backdropEl, cardSelector = '.modal-sheet-card') {
  if (!backdropEl || backdropEl.classList.contains('hidden')) return;
  const token = (sheetStateMap.get(backdropEl) || 0) + 1;
  sheetStateMap.set(backdropEl, token);

  const cardEl = backdropEl.querySelector(cardSelector) || backdropEl.firstElementChild;
  const reduced = prefersReducedMotion();
  const isCenterDesktop = Boolean(SHEET_DESKTOP_MQ && SHEET_DESKTOP_MQ.matches) || Boolean(cardEl && cardEl.classList.contains('modal-center-card'));

  const jobs = [];
  if (typeof backdropEl.animate === 'function') {
    cancelMotion(backdropEl);
    jobs.push(trackAnim(backdropEl, backdropEl.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: reduced ? 100 : 170, easing: EASE_EXIT }
    )).finished.catch(() => {}));
  }
  if (cardEl && typeof cardEl.animate === 'function') {
    cancelMotion(cardEl);
    const currentTf = cardEl.style.transform || 'translate3d(0,0,0)';
    const exitFrames = reduced
      ? [{ opacity: 1 }, { opacity: 0 }]
      : isCenterDesktop
        ? [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.95) translate3d(0, 8px, 0)' }]
        : [{ opacity: 1, transform: currentTf }, { opacity: 0, transform: 'translate3d(0, 100%, 0)' }];
    jobs.push(trackAnim(cardEl, cardEl.animate(exitFrames, {
      duration: reduced ? 100 : 190,
      easing: EASE_EXIT
    })).finished.catch(() => {}));
  }

  await Promise.all(jobs);
  if (sheetStateMap.get(backdropEl) !== token) return;
  if (cardEl) cardEl.style.transform = '';
  backdropEl.classList.add('hidden');
}

/**
 * 1:1 Pointer swipe-down dismissal for mobile bottom sheets.
 */
export function attachSheetSwipeDismiss(backdropEl, handleEl, onClose, { thresholdPx = 95, velocityThreshold = 0.42 } = {}) {
  if (!backdropEl || !handleEl) return;
  const cardEl = backdropEl.querySelector('.modal-sheet-card') || backdropEl.firstElementChild;
  if (!cardEl || handleEl.dataset.swipeBound === 'true') return;
  handleEl.dataset.swipeBound = 'true';

  let startY = 0;
  let lastY = 0;
  let lastT = 0;
  let velocityY = 0;
  let dragging = false;

  handleEl.addEventListener('pointerdown', (e) => {
    if (SHEET_DESKTOP_MQ && SHEET_DESKTOP_MQ.matches) return;
    if (e.target && e.target.closest('button')) return;
    dragging = true;
    startY = lastY = e.clientY;
    lastT = performance.now();
    velocityY = 0;
    cancelMotion(cardEl);
    try { handleEl.setPointerCapture(e.pointerId); } catch (_) {}
  });

  handleEl.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dt = Math.max(1, now - lastT);
    velocityY = (e.clientY - lastY) / dt;
    lastY = e.clientY;
    lastT = now;
    const dy = e.clientY - startY;
    const clampedY = dy < 0 ? dy * 0.16 : dy;
    cardEl.style.transform = `translate3d(0, ${clampedY}px, 0)`;
  });

  const finishDrag = async (e) => {
    if (!dragging) return;
    dragging = false;
    try { handleEl.releasePointerCapture(e.pointerId); } catch (_) {}
    const dy = Math.max(0, e.clientY - startY);
    const shouldDismiss = dy > thresholdPx || velocityY > velocityThreshold;
    if (shouldDismiss) {
      if (onClose) onClose();
      else closeSheetModal(backdropEl);
      return;
    }
    const fromTf = cardEl.style.transform || 'translate3d(0,0,0)';
    cardEl.style.transform = '';
    if (typeof cardEl.animate === 'function') {
      trackAnim(cardEl, cardEl.animate(
        [{ transform: fromTf }, { transform: 'translate3d(0,0,0)' }],
        { duration: 240, easing: EASE_SHEET }
      ));
    }
  };

  handleEl.addEventListener('pointerup', finishDrag);
  handleEl.addEventListener('pointercancel', finishDrag);
}

/**
 * Tier 2 localized damped horizontal shake via WAAPI (never collides with CSS border flash classes).
 */
export function triggerDampedShake(el, { intensity = 7, duration = 260 } = {}) {
  if (!el) return;
  cancelMotion(el);
  if (prefersReducedMotion()) {
    if (typeof el.animate === 'function') {
      trackAnim(el, el.animate(
        [{ outline: '3px solid #E52421', outlineOffset: '2px' }, { outline: '3px solid transparent', outlineOffset: '2px' }],
        { duration: 220, easing: 'ease-out' }
      ));
    }
    return;
  }
  if (typeof el.animate !== 'function') return;
  trackAnim(el, el.animate([
    { transform: 'translate3d(0,0,0)' },
    { transform: `translate3d(${-intensity}px,0,0)` },
    { transform: `translate3d(${Math.round(intensity * 0.8)}px,0,0)` },
    { transform: `translate3d(${-Math.round(intensity * 0.5)}px,0,0)` },
    { transform: `translate3d(${Math.round(intensity * 0.25)}px,0,0)` },
    { transform: 'translate3d(0,0,0)' }
  ], { duration, easing: EASE_SNAP }));
}

/**
 * Tier 1/3 tactile spring pop.
 */
export function animateSpringPop(el, { scalePeak = 1.08, tiltDeg = 0, duration = 280 } = {}) {
  if (!el || typeof el.animate !== 'function') return;
  cancelMotion(el);
  if (prefersReducedMotion()) {
    trackAnim(el, el.animate([{ opacity: 0.7 }, { opacity: 1 }], { duration: 130, easing: 'ease-out' }));
    return;
  }
  const frames = tiltDeg !== 0
    ? [
        { transform: 'scale(0.94) rotate(0deg)' },
        { transform: `scale(${scalePeak}) rotate(${tiltDeg}deg)` },
        { transform: `scale(0.98) rotate(${-tiltDeg * 0.5}deg)` },
        { transform: 'scale(1) rotate(0deg)' }
      ]
    : [
        { transform: 'scale(0.93)' },
        { transform: `scale(${scalePeak})` },
        { transform: 'scale(1)' }
      ];
  trackAnim(el, el.animate(frames, { duration, easing: tiltDeg ? EASE_SNAP : EASE_SPRING_POP }));
}

/**
 * Way B floating micro-reward chip (+1, +1 Mastered, 3x STREAK!).
 */
export function spawnFloatingChip(anchorEl, text, {
  bg = '#B8F526',
  color = '#000000',
  border = '#000000',
  offsetY = -12
} = {}) {
  if (!anchorEl || typeof document === 'undefined') return;
  const rect = anchorEl.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) return;

  const chip = document.createElement('div');
  chip.textContent = text;
  chip.style.cssText = [
    'position:fixed',
    `left:${Math.round(rect.left + rect.width * 0.5)}px`,
    `top:${Math.round(rect.top + 4)}px`,
    'transform:translate(-50%, 0)',
    `background:${bg}`,
    `color:${color}`,
    `border:2px solid ${border}`,
    'box-shadow:2px 2px 0 #000',
    'border-radius:9999px',
    'padding:3px 10px',
    'font-family:"Space Mono",monospace',
    'font-size:11px',
    'font-weight:900',
    'text-transform:uppercase',
    'letter-spacing:0.04em',
    'pointer-events:none',
    'z-index:9999',
    'white-space:nowrap'
  ].join(';');
  document.body.appendChild(chip);

  const reduced = prefersReducedMotion();
  const anim = chip.animate(
    reduced
      ? [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }]
      : [
          { opacity: 0, transform: 'translate(-50%, 4px) scale(0.85)' },
          { opacity: 1, transform: `translate(-50%, ${offsetY}px) scale(1.06)`, offset: 0.25 },
          { opacity: 1, transform: `translate(-50%, ${offsetY - 12}px) scale(1)`, offset: 0.72 },
          { opacity: 0, transform: `translate(-50%, ${offsetY - 24}px) scale(0.95)` }
        ],
    { duration: reduced ? 550 : 760, easing: EASE_SNAP, fill: 'forwards' }
  );
  anim.finished.catch(() => {}).finally(() => {
    if (chip.parentNode) chip.parentNode.removeChild(chip);
  });
}

/**
 * Tier 4 Lightweight Neo-Sponsor Geometric Canvas Confetti (<= 34 black-stroked shapes, auto-disposes).
 */
export function launchNeoConfetti({ particleCount = 32, durationMs = 1050 } = {}) {
  if (prefersReducedMotion() || typeof document === 'undefined' || typeof window === 'undefined') return;

  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:60;';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  const palette = ['#B8F526', '#FDF197', '#FF4092', '#104FE2', '#10B981', '#FF5C1C'];
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.36;
  const particles = Array.from({ length: Math.min(36, particleCount) }, (_, i) => {
    const angle = (-Math.PI / 2) + (Math.random() - 0.5) * Math.PI * 1.45;
    const speed = 4 + Math.random() * 7.5;
    return {
      x: cx + (Math.random() - 0.5) * 40,
      y: cy + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2.2,
      w: 7 + Math.random() * 6,
      h: (i % 3 === 0) ? 7 + Math.random() * 5 : 4 + Math.random() * 3,
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.24,
      color: palette[i % palette.length],
      pill: i % 3 === 1
    };
  });

  const start = performance.now();
  const drawFrame = (now) => {
    const elapsed = now - start;
    const t = Math.min(1, elapsed / durationMs);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const alpha = t > 0.65 ? Math.max(0, 1 - (t - 0.65) / 0.35) : 1;
    ctx.globalAlpha = alpha;

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.26;
      p.vx *= 0.992;
      p.rot += p.vRot;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.6;
      if (p.pill) {
        const r = p.h * 0.5;
        ctx.beginPath();
        ctx.roundRect(-p.w * 0.5, -p.h * 0.5, p.w, p.h, r);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(-p.w * 0.5, -p.h * 0.5, p.w, p.h);
        ctx.strokeRect(-p.w * 0.5, -p.h * 0.5, p.w, p.h);
      }
      ctx.restore();
    }

    if (t < 1 && canvas.parentNode) {
      requestAnimationFrame(drawFrame);
    } else if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  };
  requestAnimationFrame(drawFrame);
}

/**
 * SVG path stroke-dashoffset trace synchronized with reveal/audio timing.
 */
export function animateStrokeDraw(pathEl, { duration = 320, delay = 0 } = {}) {
  if (!pathEl || typeof pathEl.getTotalLength !== 'function') return;
  let len = 0;
  try { len = pathEl.getTotalLength(); } catch (_) { len = 0; }
  if (!len || !Number.isFinite(len)) return;

  if (prefersReducedMotion()) {
    pathEl.style.strokeDasharray = '';
    pathEl.style.strokeDashoffset = '';
    return;
  }

  cancelMotion(pathEl);
  pathEl.style.strokeDasharray = `${len}`;
  pathEl.style.strokeDashoffset = `${len}`;

  if (typeof pathEl.animate === 'function') {
    const anim = trackAnim(pathEl, pathEl.animate(
      [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
      { duration, delay, easing: EASE_SNAP, fill: 'forwards' }
    ));
    anim.finished
      .then(() => {
        pathEl.style.strokeDasharray = '';
        pathEl.style.strokeDashoffset = '';
      })
      .catch(() => {})
      .finally(() => {
        try { anim.cancel(); } catch (_) {}
      });
  }
}

/**
 * Micro-FLIP layout transition for visible items in a flex container (e.g. #component-dock).
 */
export function flipFlexChildren(containerEl, selector, mutateFn, { duration = 185 } = {}) {
  if (!containerEl || typeof mutateFn !== 'function') return;
  if (prefersReducedMotion()) {
    mutateFn();
    return;
  }

  const items = Array.from(containerEl.querySelectorAll(selector));
  const firstRects = new Map();
  items.forEach(el => {
    if (!el.classList.contains('hidden')) {
      firstRects.set(el, el.getBoundingClientRect());
    }
  });

  mutateFn();

  items.forEach(el => {
    if (el.classList.contains('hidden')) return;
    const first = firstRects.get(el);
    const last = el.getBoundingClientRect();
    if (!first) {
      // Newly revealed tile pops cleanly back in
      if (typeof el.animate === 'function') {
        cancelMotion(el);
        trackAnim(el, el.animate(
          [{ opacity: 0, transform: 'scale(0.84)' }, { opacity: 1, transform: 'scale(1)' }],
          { duration, easing: EASE_SNAP }
        ));
      }
      return;
    }
    const dx = first.left - last.left;
    const dy = first.top - last.top;
    if ((Math.abs(dx) > 1 || Math.abs(dy) > 1) && typeof el.animate === 'function') {
      cancelMotion(el);
      trackAnim(el, el.animate(
        [{ transform: `translate3d(${dx}px, ${dy}px, 0)` }, { transform: 'translate3d(0, 0, 0)' }],
        { duration, easing: EASE_SNAP }
      ));
    }
  });
}
