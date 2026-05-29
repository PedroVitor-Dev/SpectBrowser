// Estado padrão
const DEFAULT_STATE = {
  masterEnabled: false,
  blockAutoplay: false,
  removeAnimations: false,
  removePopups: false,
  hideTimers: false,
  focusMode: false,
  brightness: 100,
  saturation: 100,
  contrast: 100,
  activeMode: null,
};

// Definição dos modos rápidos
const MODES = {
  neuro: {
    blockAutoplay: true,
    removeAnimations: true,
    removePopups: true,
    hideTimers: true,
    focusMode: false,
    brightness: 95,
    saturation: 70,
    contrast: 95,
  },
  focus: {
    blockAutoplay: true,
    removeAnimations: true,
    removePopups: true,
    hideTimers: false,
    focusMode: true,
    brightness: 100,
    saturation: 100,
    contrast: 100,
  },
  read: {
    blockAutoplay: false,
    removeAnimations: true,
    removePopups: true,
    hideTimers: false,
    focusMode: false,
    brightness: 90,
    saturation: 50,
    contrast: 90,
  },
  safe: {
    blockAutoplay: true,
    removeAnimations: true,
    removePopups: true,
    hideTimers: true,
    focusMode: false,
    brightness: 85,
    saturation: 60,
    contrast: 90,
  },
};

let state = { ...DEFAULT_STATE };

// ── Carregar estado salvo ──
async function loadState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(DEFAULT_STATE, (saved) => {
      state = { ...DEFAULT_STATE, ...saved };
      resolve();
    });
  });
}

// ── Salvar estado ──
function saveState() {
  chrome.storage.local.set(state);
}

// ── Aplicar estado na UI ──
function applyToUI() {
  document.getElementById('masterToggle').checked = state.masterEnabled;

  document.getElementById('blockAutoplay').checked = state.blockAutoplay;
  document.getElementById('removeAnimations').checked = state.removeAnimations;
  document.getElementById('removePopups').checked = state.removePopups;
  document.getElementById('hideTimers').checked = state.hideTimers;
  document.getElementById('focusMode').checked = state.focusMode;

  setSlider('brightness', state.brightness);
  setSlider('saturation', state.saturation);
  setSlider('contrast', state.contrast);

  // Modos ativos
  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === state.activeMode);
  });
}

function setSlider(id, value) {
  const el = document.getElementById(id);
  const val = document.getElementById(id + 'Val');
  if (el) el.value = value;
  if (val) val.textContent = value + '%';
}

// ── Enviar estado para a aba ativa ──
function sendToTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'UPDATE_STATE',
      state,
    }).catch(() => {
      // Tab pode não ter o content script ainda — ignora silenciosamente
    });
  });
}

// ── Listeners ──
function setupListeners() {
  // Master toggle
  document.getElementById('masterToggle').addEventListener('change', (e) => {
    state.masterEnabled = e.target.checked;
    saveState();
    sendToTab();
  });

  // Toggles individuais
  const toggleIds = ['blockAutoplay', 'removeAnimations', 'removePopups', 'hideTimers', 'focusMode'];
  toggleIds.forEach((id) => {
    document.getElementById(id).addEventListener('change', (e) => {
      state[id] = e.target.checked;
      state.activeMode = null; // deseleciona modo rápido
      document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
      saveState();
      sendToTab();
    });
  });

  // Sliders visuais
  ['brightness', 'saturation', 'contrast'].forEach((id) => {
    document.getElementById(id).addEventListener('input', (e) => {
      state[id] = parseInt(e.target.value);
      document.getElementById(id + 'Val').textContent = state[id] + '%';
      saveState();
      sendToTab();
    });
  });

  // Modos rápidos
  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;

      if (state.activeMode === mode) {
        // Desativar modo
        state.activeMode = null;
        Object.assign(state, {
          blockAutoplay: false,
          removeAnimations: false,
          removePopups: false,
          hideTimers: false,
          focusMode: false,
          brightness: 100,
          saturation: 100,
          contrast: 100,
        });
      } else {
        // Ativar modo
        state.activeMode = mode;
        Object.assign(state, MODES[mode]);
        if (!state.masterEnabled) {
          state.masterEnabled = true;
        }
      }

      saveState();
      applyToUI();
      sendToTab();
    });
  });
}

// ── Init ──
(async () => {
  await loadState();
  applyToUI();
  setupListeners();
})();