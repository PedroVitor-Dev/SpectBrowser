const DEFAULT_STATE = {
  masterEnabled: false,
  blockAutoplay: false,
  removeAnimations: false,
  removePopups: false,
  hideTimers: false,
  focusMode: false,
  readingMode: false,
  brightness: 100,
  saturation: 100,
  contrast: 100,
  activeMode: null,
};

const MODES = {
  neuro: {
    blockAutoplay: true,
    removeAnimations: true,
    removePopups: true,
    hideTimers: true,
    focusMode: false,
    readingMode: false,
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
    readingMode: false,
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
    readingMode: true,
    brightness: 100,
    saturation: 100,
    contrast: 100,
  },
  safe: {
    blockAutoplay: true,
    removeAnimations: true,
    removePopups: true,
    hideTimers: true,
    focusMode: false,
    readingMode: false,
    brightness: 85,
    saturation: 60,
    contrast: 90,
  },
};

let state = { ...DEFAULT_STATE };

async function loadState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(DEFAULT_STATE, (saved) => {
      state = { ...DEFAULT_STATE, ...saved };
      resolve();
    });
  });
}

function saveState() {
  chrome.storage.local.set(state);
}

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

  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === state.activeMode);
  });

  const readingBtn = document.getElementById('readingModeBtn');
  const readingStatus = document.getElementById('readingStatus');
  if (state.readingMode) {
    readingBtn.classList.add('active');
    readingStatus.textContent = 'on';
  } else {
    readingBtn.classList.remove('active');
    readingStatus.textContent = 'off';
  }
}

function setSlider(id, value) {
  const el = document.getElementById(id);
  const val = document.getElementById(id + 'Val');
  if (el) el.value = value;
  if (val) val.textContent = value + '%';
}

function sendToTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;
    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'UPDATE_STATE',
      state,
    }).catch(() => {});
  });
}

function setupListeners() {
  document.getElementById('masterToggle').addEventListener('change', (e) => {
    state.masterEnabled = e.target.checked;
    saveState();
    sendToTab();
  });

  const toggleIds = ['blockAutoplay', 'removeAnimations', 'removePopups', 'hideTimers', 'focusMode'];
  toggleIds.forEach((id) => {
    document.getElementById(id).addEventListener('change', (e) => {
      state[id] = e.target.checked;
      state.activeMode = null;
      document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
      saveState();
      sendToTab();
    });
  });

  ['brightness', 'saturation', 'contrast'].forEach((id) => {
    document.getElementById(id).addEventListener('input', (e) => {
      state[id] = parseInt(e.target.value);
      document.getElementById(id + 'Val').textContent = state[id] + '%';
      saveState();
      sendToTab();
    });
  });

  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;

      if (state.activeMode === mode) {
        state.activeMode = null;
        Object.assign(state, {
          blockAutoplay: false,
          removeAnimations: false,
          removePopups: false,
          hideTimers: false,
          focusMode: false,
          readingMode: false,
          brightness: 100,
          saturation: 100,
          contrast: 100,
        });
      } else {
        state.activeMode = mode;
        Object.assign(state, MODES[mode]);
        state.masterEnabled = true;
      }

      saveState();
      applyToUI();
      sendToTab();
    });
  });

  document.getElementById('readingModeBtn').addEventListener('click', () => {
    state.readingMode = !state.readingMode;
    state.masterEnabled = true;
    state.activeMode = null;
    document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
    saveState();
    applyToUI();
    sendToTab();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadState();
  applyToUI();
  setupListeners();
});