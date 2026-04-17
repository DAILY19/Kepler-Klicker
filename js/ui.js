// ============================================================
// UI Utilities
// ============================================================

/** Show a view by id, hiding all others */
export function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(viewId);
  if (target) target.classList.add('active');
}

/** Show a temporary message */
export function showError(elementId, message, duration = 3000) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  if (duration > 0) {
    setTimeout(() => { el.textContent = ''; }, duration);
  }
}

/** Create a DOM element with optional classes and text */
export function createElement(tag, classes = [], textContent = '') {
  const el = document.createElement(tag);
  classes.forEach(c => el.classList.add(c));
  if (textContent) el.textContent = textContent;
  return el;
}

/** Show the castastrophe banner with text */
export function showCastastropheBanner(text, duration = 2000) {
  const banner = document.getElementById('castastrophe-banner');
  if (!banner) return;
  banner.textContent = `!! ${text}`;
  banner.style.display = 'block';
  banner.classList.add('show');
  setTimeout(() => {
    banner.classList.remove('show');
    banner.style.display = 'none';
  }, duration);
}

/** Show a game message (e.g., "Get Ready!") */
export function showGameMessage(text, duration = 2000) {
  const msg = document.getElementById('game-message');
  if (!msg) return;
  msg.textContent = text;
  msg.classList.add('visible');
  if (duration > 0) {
    setTimeout(() => msg.classList.remove('visible'), duration);
  }
}

/** Countdown overlay (3, 2, 1, Go!) */
export function showCountdown() {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'countdown-overlay';
    document.body.appendChild(overlay);

    const nums = ['3', '2', '1', 'Go!'];
    let i = 0;

    const tick = () => {
      if (i >= nums.length) {
        overlay.remove();
        resolve();
        return;
      }
      overlay.innerHTML = '';
      const num = createElement('div', ['countdown-number'], nums[i]);
      overlay.appendChild(num);
      i++;
      setTimeout(tick, 800);
    };

    tick();
  });
}

/** Render a catch display (sprite or emoji + name + points) */
export function showCatchDisplay(emoji, name, points, imagePath = null) {
  const canvas = document.getElementById('game-canvas');
  const existing = canvas.querySelector('.catch-display');
  if (existing) existing.remove();

  const el = createElement('div', ['catch-display']);
  const visual = imagePath
    ? `<img class="catch-fish-img" src="${imagePath}" alt="${name}">`
    : `<div class="catch-emoji">${emoji}</div>`;

  el.innerHTML = `
    ${visual}
    <div class="catch-name">${name}</div>
    <div class="catch-points ${points < 0 ? 'negative' : ''}">${points > 0 ? '+' : ''}${points} pts</div>
  `;
  canvas.appendChild(el);

  setTimeout(() => el.remove(), 2500);
}

const MEME_IMAGES = [
  'assets/memes/baby-ai-meme.gif',
  "assets/memes/baldi's-basics-baldi.webp",
  'assets/memes/beard-bear.gif',
  'assets/memes/best-banana-cat.webp',
  'assets/memes/chill-chil.webp',
  'assets/memes/erm-actuay-emoji.webp',
  'assets/memes/knooye.webp',
  'assets/memes/meme-emoji.webp',
  'assets/memes/meri-marziii.webp',
  'assets/memes/mike_wazowski_meme.png',
  'assets/memes/niche-fruit-niche-fruits.webp',
  'assets/memes/repogame-repo-game.gif',
  'assets/memes/spongebob.webp',
  'assets/memes/ugly-plankton-meme-ugly-plankton.gif',
  'assets/memes/white-toothless-dancing-meme-white-toothless.webp',
  'assets/memes/yes-cat-thumbs-up.webp',
];

/** Show a random meme image over the game canvas briefly */
export function showMemeOverlay(duration = 2500) {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;

  const existing = canvas.querySelector('.meme-overlay');
  if (existing) existing.remove();

  const src = MEME_IMAGES[Math.floor(Math.random() * MEME_IMAGES.length)];
  const img = document.createElement('img');
  img.className = 'meme-overlay';
  img.src = src;
  img.alt = '';
  canvas.appendChild(img);

  // Trigger animation on next frame
  requestAnimationFrame(() => img.classList.add('show'));

  setTimeout(() => img.remove(), duration);
}
