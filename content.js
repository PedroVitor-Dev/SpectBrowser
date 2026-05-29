// ── Inicializa lendo o storage ──
chrome.storage.local.get(null, (saved) => {
  if (saved && Object.keys(saved).length > 0) {
    applyState(saved);
  }
});

// ── Escuta mudanças no storage em tempo real ──
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  chrome.storage.local.get(null, (saved) => {
    applyState(saved);
  });
});

// ── Recebe mensagens do popup (fallback) ──
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'UPDATE_STATE') {
    applyState(message.state);
  }
});

// ── Aplica estado ──
function applyState(s) {
  if (!s) return;

  const enabled = s.masterEnabled;

  applyAutoplay(enabled && s.blockAutoplay);
  applyAnimations(enabled && s.removeAnimations);
  applyPopups(enabled && s.removePopups);
  applyTimers(enabled && s.hideTimers);
  applyFocusMode(enabled && s.focusMode);
  applyReadingMode(enabled && s.readingMode);
  applyVisualFilters(
    enabled ? (s.brightness ?? 100) : 100,
    enabled ? (s.saturation ?? 100) : 100,
    enabled ? (s.contrast  ?? 100) : 100
  );
}

// ── 1. Bloquear Autoplay ──
function applyAutoplay(active) {
  document.querySelectorAll('video, audio').forEach((el) => {
    if (active) {
      el.pause();
      el.autoplay = false;
    }
  });

  if (active) {
    if (!window._spectAutoplayObserver) {
      window._spectAutoplayObserver = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
          m.addedNodes.forEach((node) => {
            if (node.nodeName === 'VIDEO' || node.nodeName === 'AUDIO') {
              node.pause();
              node.autoplay = false;
            }
            if (node.querySelectorAll) {
              node.querySelectorAll('video, audio').forEach((el) => {
                el.pause();
                el.autoplay = false;
              });
            }
          });
        });
      });
      window._spectAutoplayObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
  } else {
    if (window._spectAutoplayObserver) {
      window._spectAutoplayObserver.disconnect();
      window._spectAutoplayObserver = null;
    }
  }
}

// ── 2. Remover Animações ──
function applyAnimations(active) {
  let style = document.getElementById('spect-no-animations');

  if (active) {
    if (!style) {
      style = document.createElement('style');
      style.id = 'spect-no-animations';
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0.001ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.001ms !important;
          scroll-behavior: auto !important;
        }
      `;
      document.head.appendChild(style);
    }
  } else {
    style?.remove();
  }
}

// ── 3. Remover Popups ──
const POPUP_SELECTORS = [
  '[class*="popup"]',
  '[class*="modal"]',
  '[class*="overlay"]',
  '[class*="banner"]',
  '[class*="cookie"]',
  '[class*="newsletter"]',
  '[class*="subscribe"]',
  '[id*="popup"]',
  '[id*="modal"]',
  '[id*="overlay"]',
  '[id*="cookie"]',
  '[role="dialog"]',
  '[aria-modal="true"]',
].join(',');

function applyPopups(active) {
  if (active) {
    hidePopupElements();
    if (!window._spectPopupObserver) {
      window._spectPopupObserver = new MutationObserver(() => {
        hidePopupElements();
      });
      window._spectPopupObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style'],
      });
    }
  } else {
    restorePopupElements();
    if (window._spectPopupObserver) {
      window._spectPopupObserver.disconnect();
      window._spectPopupObserver = null;
    }
  }
}

function hidePopupElements() {
  document.querySelectorAll(POPUP_SELECTORS).forEach((el) => {
    const style = window.getComputedStyle(el);
    const isFixed = style.position === 'fixed' || style.position === 'sticky';
    const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
    const isLarge = el.offsetWidth > 200 || el.offsetHeight > 100;

    if (isFixed && isVisible && isLarge) {
      el.setAttribute('data-spect-hidden', 'true');
      el.style.setProperty('display', 'none', 'important');
    }
  });

  document.body.style.removeProperty('overflow');
  document.documentElement.style.removeProperty('overflow');
}

function restorePopupElements() {
  document.querySelectorAll('[data-spect-hidden="true"]').forEach((el) => {
    el.removeAttribute('data-spect-hidden');
    el.style.removeProperty('display');
  });
}

// ── 4. Ocultar Timers ──
const TIMER_SELECTORS = [
  '[class*="timer"]',
  '[class*="countdown"]',
  '[class*="urgency"]',
  '[class*="limited"]',
  '[class*="offer"]',
  '[id*="timer"]',
  '[id*="countdown"]',
].join(',');

function applyTimers(active) {
  document.querySelectorAll(TIMER_SELECTORS).forEach((el) => {
    el.style.setProperty('visibility', active ? 'hidden' : '', 'important');
  });
}

// ── 5. Modo Foco ──
function applyFocusMode(active) {
  let style = document.getElementById('spect-focus-mode');

  if (active) {
    if (!style) {
      style = document.createElement('style');
      style.id = 'spect-focus-mode';
      style.textContent = `
        aside,
        [class*="sidebar"],
        [class*="ad"],
        [class*="advertisement"],
        [class*="sponsor"],
        [id*="sidebar"],
        [id*="ad-"],
        [role="complementary"] {
          opacity: 0.15 !important;
          filter: grayscale(100%) !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);
    }
  } else {
    style?.remove();
  }
}

// ── 6. Filtros Visuais ──
function applyVisualFilters(brightness, saturation, contrast) {
  const htmlEl = document.documentElement;

  if (brightness === 100 && saturation === 100 && contrast === 100) {
    htmlEl.style.removeProperty('filter');
  } else {
    htmlEl.style.filter = `brightness(${brightness}%) saturate(${saturation}%) contrast(${contrast}%)`;
  }
}

// ── 7. Modo Leitura ──
function applyReadingMode(active) {
  const existing = document.getElementById('spect-reading-overlay');

  if (!active) {
    existing?.remove();
    document.getElementById('spect-reading-style')?.remove();
    return;
  }

  if (existing) return;

  const candidates = [
    'article',
    '[role="main"]',
    'main',
    '.post-content',
    '.article-body',
    '.entry-content',
    '.content',
    '#content',
    '.post',
  ];

  let mainEl = null;
  for (const sel of candidates) {
    const el = document.querySelector(sel);
    if (el && el.innerText.trim().length > 200) {
      mainEl = el;
      break;
    }
  }

  if (!mainEl) {
    const blocks = [...document.querySelectorAll('div, section')];
    mainEl = blocks.reduce((best, el) => {
      return el.innerText.length > (best?.innerText.length || 0) ? el : best;
    }, null);
  }

  if (!mainEl) return;

  const clone = mainEl.cloneNode(true);

  clone.querySelectorAll(
    'script, style, iframe, [class*="ad"], [class*="banner"], [class*="popup"], nav, header, footer, [class*="sidebar"], [class*="related"], [class*="share"], [class*="social"], [class*="comment"]'
  ).forEach(el => el.remove());

  const overlay = document.createElement('div');
  overlay.id = 'spect-reading-overlay';
  overlay.appendChild(clone);
  document.body.appendChild(overlay);

  const closeBtn = document.createElement('button');
  closeBtn.id = 'spect-reading-close';
  closeBtn.textContent = '✕ fechar leitura';
  closeBtn.addEventListener('click', () => {
    chrome.storage.local.set({ readingMode: false });
    applyReadingMode(false);
  });
  overlay.appendChild(closeBtn);

  const style = document.createElement('style');
  style.id = 'spect-reading-style';
  style.textContent = `
    #spect-reading-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      background: #F0F6FD;
      overflow-y: auto;
      padding: 60px 24px 80px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    #spect-reading-overlay > *:not(#spect-reading-close) {
      width: 100%;
      max-width: 680px;
      font-family: 'Nunito', 'Segoe UI', sans-serif !important;
      font-size: 18px !important;
      line-height: 1.85 !important;
      color: #1A3250 !important;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      margin: 0 auto !important;
      float: none !important;
    }

    #spect-reading-overlay p {
      margin-bottom: 1.4em !important;
      font-size: 18px !important;
      line-height: 1.85 !important;
      color: #1A3250 !important;
    }

    #spect-reading-overlay h1,
    #spect-reading-overlay h2,
    #spect-reading-overlay h3 {
      color: #0F2540 !important;
      font-weight: 600 !important;
      margin-bottom: 0.6em !important;
      margin-top: 1.4em !important;
      line-height: 1.3 !important;
    }

    #spect-reading-overlay h1 { font-size: 26px !important; }
    #spect-reading-overlay h2 { font-size: 22px !important; }
    #spect-reading-overlay h3 { font-size: 19px !important; }

    #spect-reading-overlay img {
      max-width: 100% !important;
      border-radius: 10px !important;
      margin: 1.2em 0 !important;
    }

    #spect-reading-overlay a {
      color: #4A90C4 !important;
      text-decoration: underline !important;
    }

    #spect-reading-close {
      position: fixed;
      top: 16px;
      right: 20px;
      background: #4A90C4;
      color: white;
      border: none;
      border-radius: 20px;
      padding: 7px 16px;
      font-size: 13px;
      font-family: 'Nunito', sans-serif;
      font-weight: 600;
      cursor: pointer;
      z-index: 2147483648;
      transition: background 0.15s;
    }

    #spect-reading-close:hover {
      background: #3A78A8;
    }
  `;
  document.head.appendChild(style);
}