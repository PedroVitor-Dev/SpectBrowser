let currentState = null;

// ── Receber mensagens do popup ──
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'UPDATE_STATE') {
    currentState = message.state;
    applyState();
  }
});

// ── Carregar estado ao iniciar ──
chrome.storage.local.get(null, (saved) => {
  currentState = saved;
  applyState();
});

// ── Aplicar estado ──
function applyState() {
  if (!currentState) return;

  const enabled = currentState.masterEnabled;

  applyAutoplay(enabled && currentState.blockAutoplay);
  applyAnimations(enabled && currentState.removeAnimations);
  applyPopups(enabled && currentState.removePopups);
  applyTimers(enabled && currentState.hideTimers);
  applyFocusMode(enabled && currentState.focusMode);
  applyVisualFilters(
    enabled ? currentState.brightness : 100,
    enabled ? currentState.saturation : 100,
    enabled ? currentState.contrast : 100
  );
}

// ── 1. Bloquear Autoplay ──
function applyAutoplay(active) {
  document.querySelectorAll('video, audio').forEach((el) => {
    if (active) {
      el.pause();
      el.autoplay = false;
      el.setAttribute('data-spect-muted', 'true');
    }
  });

  // Observar novos elementos adicionados ao DOM
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

  // Remove body lock de scroll
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
          transition: opacity 0.3s ease !important;
          pointer-events: none !important;
        }

        aside:hover,
        [class*="sidebar"]:hover {
          opacity: 0.5 !important;
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