import './style.css';
import 'keen-slider/keen-slider.min.css';
import KS from 'keen-slider';
import { AudioPipeline } from './audio/audioPipeline.js';
import { PitchTracker } from './audio/pitchTracker.js';
import { DTWComparator } from './audio/dtwComparator.js';
import { ToneClassifier } from './audio/toneClassifier.js';
import { WordTrainerEngine, getConciseEnglish, getModeMasteryCounts } from './wordTrainerEngine.js';

const KeenSlider = KS.default || KS;

let words = [];
let hskDeck = [];
let currentItem = null;
let nextPendingItem = null;
let currentGameMode = 'tones'; // Options: 'tones', 'initials', 'endings'
let nextQuestionTimer = null; 
let toneProfiles = {}; // Human story audio reference profiles (tone_profiles.json)
let toneProfilesTTS = {}; // Neural citation TTS reference profiles (tone_profiles_tts.json)

// Parallel Audio Track & Speed State (TTS vs Human Story)
let audioTrackMode = localStorage.getItem('tone_trainer_track_mode') || 'tts'; // 'tts' | 'human'
let parsedSpeed = parseFloat(localStorage.getItem('tone_trainer_human_speed') || '1.0');
let humanPlaybackSpeed = (parsedSpeed === 0.8 || parsedSpeed === 0.65) ? 0.65 : 1.0; // 1.0 | 0.65 (0.8 migrated to 0.65)
let lastProcessedResult = null; 

// Pinyin Inventory Audio Source Toggle (Human Voice vs Neural TTS - Strategy 2 Lexical Filtering)
let audioSourceMode = localStorage.getItem('tone_trainer_audio_source') || 'human'; // 'human' | 'tts'

function getEligibleWords() {
  if (audioSourceMode === 'tts') {
    // Strategy 2: Lexical Filtering - only return syllables with genuine Chinese Hanzi
    const lexical = words.filter(w => w.is_lexical !== false && w.audio_tts);
    return lexical.length > 0 ? lexical : words;
  }
  return words;
}

function updateAudioSourceToggleUI() {
  const isHuman = audioSourceMode === 'human';

  const toggleHuman = document.getElementById('toggle-audio-human');
  const toggleTTS = document.getElementById('toggle-audio-tts');
  if (toggleHuman && toggleTTS) {
    if (isHuman) {
      toggleHuman.className = 'audio-toggle-btn px-2.5 sm:px-3 py-1 rounded-full font-mono text-[10px] sm:text-xs font-black uppercase transition-all bg-canvas-acid text-black';
      toggleTTS.className = 'audio-toggle-btn px-2.5 sm:px-3 py-1 rounded-full font-mono text-[10px] sm:text-xs font-black uppercase transition-all text-white/70 hover:text-white';
    } else {
      toggleTTS.className = 'audio-toggle-btn px-2.5 sm:px-3 py-1 rounded-full font-mono text-[10px] sm:text-xs font-black uppercase transition-all bg-badge-pink text-white';
      toggleHuman.className = 'audio-toggle-btn px-2.5 sm:px-3 py-1 rounded-full font-mono text-[10px] sm:text-xs font-black uppercase transition-all text-white/70 hover:text-white';
    }
  }

  const libToggleHuman = document.getElementById('lib-toggle-audio-human');
  const libToggleTTS = document.getElementById('lib-toggle-audio-tts');
  if (libToggleHuman && libToggleTTS) {
    if (isHuman) {
      libToggleHuman.className = 'lib-audio-toggle-btn px-2.5 sm:px-3 py-1 rounded-full font-mono text-[10px] sm:text-xs font-black uppercase transition-all bg-canvas-acid text-black';
      libToggleTTS.className = 'lib-audio-toggle-btn px-2.5 sm:px-3 py-1 rounded-full font-mono text-[10px] sm:text-xs font-black uppercase transition-all text-white/70 hover:text-white';
    } else {
      libToggleTTS.className = 'lib-audio-toggle-btn px-2.5 sm:px-3 py-1 rounded-full font-mono text-[10px] sm:text-xs font-black uppercase transition-all bg-badge-pink text-white';
      libToggleHuman.className = 'lib-audio-toggle-btn px-2.5 sm:px-3 py-1 rounded-full font-mono text-[10px] sm:text-xs font-black uppercase transition-all text-white/70 hover:text-white';
    }
  }
}

function setAudioSourceMode(mode) {
  audioSourceMode = mode === 'tts' ? 'tts' : 'human';
  localStorage.setItem('tone_trainer_audio_source', audioSourceMode);
  updateAudioSourceToggleUI();

  // If in game screen and current item is non-lexical while in TTS mode, advance to lexical word
  if (audioSourceMode === 'tts' && currentItem && currentItem.is_lexical === false) {
    nextQuestion();
  } else if (currentItem) {
    // Preload next pending item with correct audio mode
    const pool = getEligibleWords();
    nextPendingItem = pool[Math.floor(Math.random() * pool.length)];
    if (nextPendingItem) {
      const p = (audioSourceMode === 'tts' && nextPendingItem.is_lexical && nextPendingItem.audio_tts)
        ? `${import.meta.env.BASE_URL}${nextPendingItem.audio_tts}`
        : `${import.meta.env.BASE_URL}${nextPendingItem.audio}`;
      preloadAudio(p);
    }
  }

  // Sync twin tumblers in Audio Library
  if (window.syncAudioLibrarySelection) {
    window.syncAudioLibrarySelection();
  }
}

function setupAudioSourceToggles() {
  const toggleHuman = document.getElementById('toggle-audio-human');
  const toggleTTS = document.getElementById('toggle-audio-tts');
  const libToggleHuman = document.getElementById('lib-toggle-audio-human');
  const libToggleTTS = document.getElementById('lib-toggle-audio-tts');

  if (toggleHuman) toggleHuman.addEventListener('click', () => setAudioSourceMode('human'));
  if (toggleTTS) toggleTTS.addEventListener('click', () => setAudioSourceMode('tts'));
  if (libToggleHuman) libToggleHuman.addEventListener('click', () => setAudioSourceMode('human'));
  if (libToggleTTS) libToggleTTS.addEventListener('click', () => setAudioSourceMode('tts'));

  updateAudioSourceToggleUI();
} 

// Resilient Web Audio & HTMLAudio pipeline for mobile browsers
let audioCtx = null;
let currentWebAudioSource = null;
let htmlAudioInstance = typeof Audio !== 'undefined' ? new Audio() : null;
const audioBufferCache = new Map();

export function stopGlobalAudio() {
  if (currentWebAudioSource) {
    try { currentWebAudioSource.stop(); } catch (_) {}
    currentWebAudioSource = null;
  }
  if (htmlAudioInstance) {
    try {
      htmlAudioInstance.pause();
      htmlAudioInstance.currentTime = 0;
    } catch (_) {}
  }
}
if (typeof window !== 'undefined') {
  window.stopGlobalAudio = stopGlobalAudio;
}

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function ensureAudioUnlocked() {
  // Request 'play-and-record' audio session so iOS ignores the hardware mute switch,
  // matching the behaviour of native media apps while keeping mic recording enabled.
  if (navigator.audioSession && navigator.audioSession.type !== 'play-and-record') {
    try {
      navigator.audioSession.type = 'play-and-record';
    } catch (_) {}
  }
  getAudioContext();
  if (!htmlAudioInstance && typeof Audio !== 'undefined') {
    htmlAudioInstance = new Audio();
  }
}

if (typeof window !== 'undefined') {
  const unlockEvents = ['touchstart', 'touchend', 'click', 'keydown'];
  const unlockHandler = () => {
    ensureAudioUnlocked();
  };
  unlockEvents.forEach(evt => {
    window.addEventListener(evt, unlockHandler, { passive: true });
  });

  // Mobile-only debug helpers
  if (/iPhone|iPad|iPod|Android/.test(navigator.userAgent)) {
    console.log('[DEBUG] Mobile UA detected:', navigator.userAgent);
    window.addEventListener('error', (e) => {
      console.error('[DEBUG] Uncaught error:', e.message, 'at', e.filename, 'line', e.lineno);
    });
    window.addEventListener('unhandledrejection', (e) => {
      console.error('[DEBUG] Unhandled rejection:', e.reason);
    });
  }
}

function decodeAudioDataSafe(ctx, arrayBuffer) {
  return new Promise((resolve, reject) => {
    try {
      const bufferCopy = arrayBuffer.slice(0);
      let isResolved = false;

      const promise = ctx.decodeAudioData(
        bufferCopy,
        (decoded) => {
          if (!isResolved) {
            isResolved = true;
            resolve(decoded);
          }
        },
        (err) => {
          if (!isResolved) {
            isResolved = true;
            reject(err);
          }
        }
      );

      if (promise && typeof promise.then === 'function') {
        promise.then(
          (decoded) => {
            if (!isResolved) {
              isResolved = true;
              resolve(decoded);
            }
          },
          (err) => {
            if (!isResolved) {
              isResolved = true;
              reject(err);
            }
          }
        );
      }
    } catch (e) {
      reject(e);
    }
  });
}

async function preloadAudio(url) {
  if (!url || audioBufferCache.has(url)) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const resp = await fetch(url);
    if (!resp.ok) return;
    const arrayBuf = await resp.arrayBuffer();
    const buffer = await decodeAudioDataSafe(ctx, arrayBuf);
    if (buffer) {
      audioBufferCache.set(url, buffer);
    }
  } catch (_) {
    // Ignore preload failures
  }
} 

// --- Audio Library State ---
let selectedInitial = null;
let selectedFinal = null;
let initialsSlider = null;
let finalsSlider = null;

function removeTones(str) {
  const toneMap = {
    'ā':'a', 'á':'a', 'ǎ':'a', 'à':'a',
    'ē':'e', 'é':'e', 'ě':'e', 'è':'e',
    'ī':'i', 'í':'i', 'ǐ':'i', 'ì':'i',
    'ō':'o', 'ó':'o', 'ǒ':'o', 'ò':'o',
    'ū':'u', 'ú':'u', 'ǔ':'u', 'ù':'u',
    'ǖ':'ü', 'ǘ':'ü', 'ǚ':'ü', 'ǜ':'ü'
  };
  return str.replace(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/g, match => toneMap[match]);
}

function pinyin_to_tone(pinyin_with_number) {
    const base_clean = pinyin_with_number.replace('uu', 'ü').replace('v', 'ü').replace('lue', 'lüe').replace('nue', 'nüe');
    const tones = {'a': 'āáǎà', 'e': 'ēéěè', 'i': 'īíǐì', 'o': 'ōóǒò', 'u': 'ūúǔù', 'v': 'ǖǘǚǜ', 'ü': 'ǖǘǚǜ'};
    if (!base_clean.slice(-1).match(/\d/)) return base_clean;
    try { 
        const tone_num = parseInt(base_clean.slice(-1));
        const base = base_clean.slice(0, -1);
        if (tone_num === 0 || tone_num === 5) return base;
        let idx_to_change = -1;
        for (const v of ['a', 'e', 'o']) {
            if (base.includes(v)) {
                idx_to_change = base.indexOf(v);
                break;
            }
        }
        if (idx_to_change === -1) {
            for (let i = base.length - 1; i >= 0; i--) {
                if ("iuvü".includes(base[i])) {
                    idx_to_change = i;
                    break;
                }
            }
        }
        if (idx_to_change !== -1) {
            let char = base[idx_to_change];
            if (char === 'v') char = 'ü';
            if (char in tones) {
                return base.slice(0, idx_to_change) + tones[char][tone_num - 1] + base.slice(idx_to_change + 1);
            }
        }
    } catch (e) { return base_clean; }
    return base_clean;
}

const CANVAS_COLOR_HEX = {
  'bg-canvas-navy': '#202A36',
  'bg-canvas-acid': '#B8F526',
  'bg-canvas-ice': '#B4D7E8',
  'bg-canvas-graphite': '#282A2E',
  'bg-canvas-lavender': '#9CA4FC',
  'bg-canvas-butter': '#FDF197',
  'bg-canvas-pink': '#FF8DB8',
  'bg-canvas-mint': '#8EF48A',
  'bg-canvas-celadon': '#064E3B',
  'bg-canvas-builder': '#F0FDF4',
  'bg-canvas-calligraphy': '#F5F3FF'
};

function resolveCanvasColorHex(colorClass) {
  if (!colorClass) return '#B8F526';
  if (CANVAS_COLOR_HEX[colorClass]) return CANVAS_COLOR_HEX[colorClass];
  const hexMatch = colorClass.match(/^bg-\[(#[0-9a-fA-F]{3,8})\]$/);
  return hexMatch ? hexMatch[1] : '#B8F526';
}

function isIOSStandaloneApp() {
  if (typeof window === 'undefined') return false;
  const navStandalone = Boolean(window.navigator && window.navigator.standalone);
  const mediaStandalone = Boolean(
    window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
  );
  const ua = (window.navigator && window.navigator.userAgent) || '';
  const platform = (window.navigator && window.navigator.platform) || '';
  const touchPoints = (window.navigator && window.navigator.maxTouchPoints) || 0;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && touchPoints > 1);
  return isIOS && (navStandalone || mediaStandalone);
}

function replaceThemeColorMeta(hexColor) {
  if (typeof document === 'undefined' || !document.head) return;
  document.querySelectorAll('meta[name="theme-color"]').forEach(el => el.remove());
  const meta = document.createElement('meta');
  meta.id = 'theme-color-meta';
  meta.name = 'theme-color';
  meta.content = hexColor;
  document.head.appendChild(meta);
}

function setAppBackground(colorClass) {
  const app = document.getElementById('app');
  if (!app) return;

  const resolvedHex = resolveCanvasColorHex(colorClass);
  const targets = [app, document.body];
  targets.forEach(el => {
    if (!el) return;
    // Remove all previous background color classes (named canvas tokens and arbitrary hex classes)
    const bgClassesToRemove = Array.from(el.classList).filter(
      c => c.startsWith('bg-canvas-') || c.startsWith('bg-[')
    );
    bgClassesToRemove.forEach(c => el.classList.remove(c));
    if (colorClass) {
      el.classList.add(colorClass);
    }
  });

  if (document.documentElement) {
    document.documentElement.style.backgroundColor = resolvedHex;
  }
  if (document.body) {
    document.body.style.backgroundColor = resolvedHex;
  }

  const statusBarBackdrop = document.getElementById('status-bar-backdrop');
  if (statusBarBackdrop) {
    statusBarBackdrop.style.backgroundColor = resolvedHex;
    if (isIOSStandaloneApp()) {
      void statusBarBackdrop.offsetHeight;
    }
  }

  // Keep dynamic <meta name="theme-color"> for Safari tabs & Android Chrome via node replacement,
  // while removing it inside iOS Home Screen standalone so it cannot override black-translucent.
  if (isIOSStandaloneApp()) {
    if (typeof document !== 'undefined') {
      document.querySelectorAll('meta[name="theme-color"]').forEach(el => el.remove());
    }
  } else {
    replaceThemeColorMeta(resolvedHex);
  }
}

function setupMenu() {
  const menuScreen = document.getElementById('menu-screen');
  const gameScreen = document.getElementById('game-screen');
  const audioLibraryScreen = document.getElementById('audio-library-screen');
  
  const mainMenu = document.getElementById('main-menu');
  const submenu = document.getElementById('submenu');
  
  const startTonesBtn = document.getElementById('start-tones-btn');
  const openSubmenuBtn = document.getElementById('open-submenu-btn');
  const closeSubmenuBtn = document.getElementById('close-submenu-btn');
  const openLibraryBtn = document.getElementById('open-library-btn');
  const backToMainMenuBtn = document.getElementById('back-to-main-menu-btn');
  
  const startInitialsBtn = document.getElementById('start-initials-btn');
  const startEndingsBtn = document.getElementById('start-endings-btn');
  
  const backBtn = document.getElementById('back-to-menu-btn');
  const engineScreen = document.getElementById('engine-screen');
  const openEngineBtn = document.getElementById('open-engine-btn');
  const backFromEngineBtn = document.getElementById('back-from-engine-btn');

  const startWordsBtn = document.getElementById('start-words-btn');
  const modeSelectionScreen = document.getElementById('mode-selection-screen');
  const modeSelectBackBtn = document.getElementById('mode-select-back-btn');
  const startBuilderBtn = document.getElementById('start-builder-btn');
  const startCalligraphyBtn = document.getElementById('start-calligraphy-btn');
  const wordTrainerScreen = document.getElementById('word-trainer-screen');
  const backFromWordsBtn = document.getElementById('back-from-words-btn');
  const wtModeBuilderBtn = document.getElementById('wt-mode-builder-btn');
  const wtModeCalligraphyBtn = document.getElementById('wt-mode-calligraphy-btn');
  const gatewayBuilderProgress = document.getElementById('gateway-builder-progress');
  const gatewayCalligraphyProgress = document.getElementById('gateway-calligraphy-progress');

  function updateGatewayProgressUI() {
    const counts = getModeMasteryCounts();
    if (gatewayBuilderProgress) {
      gatewayBuilderProgress.textContent = `${counts.builder.mastered} / ${counts.builder.total} mastered`;
    }
    if (gatewayCalligraphyProgress) {
      gatewayCalligraphyProgress.textContent = `${counts.calligraphy.mastered} / ${counts.calligraphy.total} mastered`;
    }
  }
  updateGatewayProgressUI();

  function launchWordTrainerMode(mode) {
    stopGlobalAudio();
    if (window.WordTrainerEngine && typeof window.WordTrainerEngine.stopAudio === 'function') {
      window.WordTrainerEngine.stopAudio();
    }
    if (modeSelectionScreen) modeSelectionScreen.classList.add('hidden');
    if (wordTrainerScreen) {
      wordTrainerScreen.classList.remove('mobile-result-active', 'mobile-phase-open', 'mobile-result-peek');
      wordTrainerScreen.classList.remove('hidden');
    }
    const mobilePhaseTriggerEl = document.getElementById('mobile-phase-trigger');
    if (mobilePhaseTriggerEl) mobilePhaseTriggerEl.setAttribute('aria-expanded', 'false');
    localStorage.setItem('mandarin_trainer_selected_mode', mode);

    const canvasArena = document.getElementById('canvas-arena');
    const openPlacementArena = document.getElementById('open-placement-arena');

    if (wtModeBuilderBtn) {
      const active = mode === 'builder';
      wtModeBuilderBtn.classList.toggle('wt-mode-active', active);
      wtModeBuilderBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    if (wtModeCalligraphyBtn) {
      const active = mode !== 'builder';
      wtModeCalligraphyBtn.classList.toggle('wt-mode-active', active);
      wtModeCalligraphyBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    if (mode === 'builder') {
      if (wordTrainerScreen) {
        wordTrainerScreen.classList.remove('theme-calligraphy');
        wordTrainerScreen.classList.add('theme-builder');
      }
      setAppBackground('bg-canvas-builder');

      if (canvasArena) canvasArena.classList.add('hidden');
      if (openPlacementArena) openPlacementArena.classList.remove('hidden');

      if (typeof window.initComponentBuilderArena === 'function') {
        window.initComponentBuilderArena();
      }
    } else {
      if (wordTrainerScreen) {
        wordTrainerScreen.classList.remove('theme-builder');
        wordTrainerScreen.classList.add('theme-calligraphy');
      }
      setAppBackground('bg-canvas-calligraphy');

      if (openPlacementArena) openPlacementArena.classList.add('hidden');
      if (canvasArena) canvasArena.classList.remove('hidden');

      if (typeof window.initWordTrainerCanvas === 'function') {
        window.initWordTrainerCanvas();
      }
    }

    if (window.WordTrainerEngine) {
      if (!window.WordTrainerEngine.isInitialized) {
        localStorage.setItem('mandarin_trainer_selected_mode', mode);
        window.WordTrainerEngine.init();
      } else {
        window.WordTrainerEngine.switchMode(mode);
      }
      if (mode === 'calligraphy' && typeof window.WordTrainerEngine.syncCanvasDimensions === 'function') {
        window.WordTrainerEngine.syncCanvasDimensions();
        requestAnimationFrame(() => window.WordTrainerEngine.syncCanvasDimensions());
      } else if (mode === 'builder' && window.WordTrainerEngine.componentBuilder) {
        requestAnimationFrame(() => window.WordTrainerEngine.componentBuilder.updateWatermarkSizing());
      }
    }
  }

  if (wtModeBuilderBtn) {
    wtModeBuilderBtn.addEventListener('click', () => {
      if (window.WordTrainerEngine && window.WordTrainerEngine.getMode() === 'builder') return;
      launchWordTrainerMode('builder');
    });
  }

  if (wtModeCalligraphyBtn) {
    wtModeCalligraphyBtn.addEventListener('click', () => {
      if (window.WordTrainerEngine && window.WordTrainerEngine.getMode() === 'calligraphy') return;
      launchWordTrainerMode('calligraphy');
    });
  }

  if (startWordsBtn) {
    startWordsBtn.addEventListener('click', () => {
      updateGatewayProgressUI();
      menuScreen.classList.add('hidden');
      mainMenu.classList.remove('hidden');
      submenu.classList.add('hidden');
      if (modeSelectionScreen) modeSelectionScreen.classList.remove('hidden');
      setAppBackground('bg-canvas-celadon');
    });
  }

  if (modeSelectBackBtn) {
    modeSelectBackBtn.addEventListener('click', () => {
      if (modeSelectionScreen) modeSelectionScreen.classList.add('hidden');
      menuScreen.classList.remove('hidden');
      mainMenu.classList.remove('hidden');
      setAppBackground('bg-canvas-acid');
    });
  }

  if (startBuilderBtn) {
    startBuilderBtn.addEventListener('click', () => launchWordTrainerMode('builder'));
  }

  if (startCalligraphyBtn) {
    startCalligraphyBtn.addEventListener('click', () => launchWordTrainerMode('calligraphy'));
  }

  if (backFromWordsBtn) {
    backFromWordsBtn.addEventListener('click', () => {
      stopGlobalAudio();
      if (wordTrainerScreen) {
        wordTrainerScreen.classList.remove('mobile-result-active', 'mobile-phase-open', 'mobile-result-peek');
        wordTrainerScreen.classList.add('hidden');
      }
      if (modeSelectionScreen) {
        modeSelectionScreen.classList.remove('hidden');
        setAppBackground('bg-canvas-celadon');
      } else {
        menuScreen.classList.remove('hidden');
        mainMenu.classList.remove('hidden');
        setAppBackground('bg-canvas-acid');
      }
      if (window.WordTrainerEngine) {
        if (typeof window.WordTrainerEngine.closeMobilePhaseBar === 'function') {
          window.WordTrainerEngine.closeMobilePhaseBar();
        }
        if (typeof window.WordTrainerEngine.hidePhaseCompleteModal === 'function') {
          window.WordTrainerEngine.hidePhaseCompleteModal();
        }
        if (typeof window.WordTrainerEngine.closeStrokeGuideModal === 'function') {
          window.WordTrainerEngine.closeStrokeGuideModal();
        }
        if (typeof window.WordTrainerEngine.clearResultShowcase === 'function') {
          window.WordTrainerEngine.clearResultShowcase();
        }
        if (typeof window.WordTrainerEngine.stopAudio === 'function') {
          window.WordTrainerEngine.stopAudio();
        }
      }
      updateGatewayProgressUI();
    });
  }

  if (openEngineBtn) {
    openEngineBtn.addEventListener('click', () => {
      menuScreen.classList.add('hidden');
      mainMenu.classList.remove('hidden');
      submenu.classList.add('hidden');
      if (engineScreen) engineScreen.classList.remove('hidden');
      setAppBackground('bg-canvas-ice');
      if (window.PronunciationEngine) {
        window.PronunciationEngine.setRevealState(1);
        if (typeof window.PronunciationEngine.hasPickedWord === 'function') {
          if (!window.PronunciationEngine.hasPickedWord()) {
            window.PronunciationEngine.pickRandomWord();
          }
        }
      }
    });
  }

  if (backFromEngineBtn) {
    backFromEngineBtn.addEventListener('click', () => {
      stopGlobalAudio();
      const settingsModal = document.getElementById('engine-settings-modal');
      if (settingsModal) settingsModal.classList.add('hidden');
      if (window.PronunciationEngine && typeof window.PronunciationEngine.reset === 'function') {
        window.PronunciationEngine.reset();
      }
      if (engineScreen) engineScreen.classList.add('hidden');
      menuScreen.classList.remove('hidden');
      mainMenu.classList.remove('hidden');
      setAppBackground('bg-canvas-acid');
    });
  }

  openSubmenuBtn.addEventListener('click', () => {
    mainMenu.classList.add('hidden');
    submenu.classList.remove('hidden');
    submenu.classList.add('flex');
    setAppBackground('bg-canvas-lavender');
  });
  
  closeSubmenuBtn.addEventListener('click', () => {
    submenu.classList.add('hidden');
    submenu.classList.remove('flex');
    mainMenu.classList.remove('hidden');
    setAppBackground('bg-canvas-acid');
  });

  openLibraryBtn.addEventListener('click', () => {
    menuScreen.classList.add('hidden');
    mainMenu.classList.remove('hidden');
    submenu.classList.add('hidden');
    audioLibraryScreen.classList.remove('hidden');
    setAppBackground('bg-canvas-navy');
    setTimeout(() => {
      if (initialsSlider) initialsSlider.update();
      if (finalsSlider) finalsSlider.update();
    }, 60);
  });

  backToMainMenuBtn.addEventListener('click', () => {
    audioLibraryScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    mainMenu.classList.remove('hidden');
    setAppBackground('bg-canvas-acid');
  });

  startTonesBtn.addEventListener('click', () => startGame('tones'));
  startInitialsBtn.addEventListener('click', () => startGame('initials'));
  startEndingsBtn.addEventListener('click', () => startGame('endings'));

  backBtn.addEventListener('click', () => {
    gameScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    
    // If returning from Initials or Endings, return to the Submenu (Lavender)
    if (currentGameMode === 'initials' || currentGameMode === 'endings') {
      mainMenu.classList.add('hidden');
      submenu.classList.remove('hidden');
      submenu.classList.add('flex');
      setAppBackground('bg-canvas-lavender');
    } else {
      submenu.classList.add('hidden');
      submenu.classList.remove('flex');
      mainMenu.classList.remove('hidden');
      setAppBackground('bg-canvas-acid');
    }

    document.querySelector('.options').style.display = 'grid';
    document.getElementById('play-btn').style.transform = "scale(1)";
    document.getElementById('feedback').innerHTML = "[IDENTIFY THE CORRECT TONE CONTOUR]";
  });
}

function startGame(mode) {
  ensureAudioUnlocked();
  currentGameMode = mode;
  document.getElementById('menu-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
  
  const modeBadge = document.getElementById('game-mode-badge');
  if (mode === 'tones') {
    setAppBackground('bg-canvas-mint');
    if (modeBadge) modeBadge.textContent = 'DRILL // TONE TRAINER';
  } else if (mode === 'initials') {
    setAppBackground('bg-canvas-butter');
    if (modeBadge) modeBadge.textContent = 'DRILL // INITIALS (声母)';
  } else if (mode === 'endings') {
    setAppBackground('bg-canvas-pink');
    if (modeBadge) modeBadge.textContent = 'DRILL // ENDINGS (韵母)';
  }

  nextQuestion(); 
}

async function fetchJsonSafe(relativePath) {
  const urlsToTry = [
    `${import.meta.env.BASE_URL}${relativePath}`,
    relativePath,
    `/${relativePath}`,
  ];
  for (const url of urlsToTry) {
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        return await resp.json();
      }
    } catch (_) {}
  }
  return null;
}

async function init() {
  try {
    const loadedWords = await fetchJsonSafe('single_words.json');
    if (loadedWords) {
      words = loadedWords;
      console.log('App Ready. Vocabulary loaded:', words.length);
    }

    // Load pre-calculated native tone curves for the pronunciation engine (Human Story)
    const profilePromise = fetchJsonSafe('tone_profiles.json')
      .then(data => {
        if (data) {
          toneProfiles = data;
          console.log('[ToneEngine] Reference tone profiles loaded:', Object.keys(toneProfiles).length);
        }
      })
      .catch(e => console.warn('[ToneEngine] tone_profiles.json could not be loaded:', e));

    // Load pre-calculated native tone curves for Neural TTS citation audio
    const ttsProfilePromise = fetchJsonSafe('tone_profiles_tts.json')
      .then(data => {
        if (data) {
          toneProfilesTTS = data;
          console.log('[ToneEngine] TTS reference tone profiles loaded:', Object.keys(toneProfilesTTS).length);
        }
      })
      .catch(e => console.warn('[ToneEngine] tone_profiles_tts.json could not be loaded:', e));

    // Load combined HSK 1 & HSK 2 2026 deck (497 words)
    const deckPromise = fetchJsonSafe('hsk_deck.json')
      .then(data => {
        if (data && Array.isArray(data)) {
          hskDeck = data;
          console.log('[PronunciationDeck] Loaded HSK deck:', hskDeck.length, 'words');
        }
      })
      .catch(e => console.warn('[PronunciationDeck] hsk_deck.json could not be loaded:', e));

    await Promise.all([profilePromise, ttsProfilePromise, deckPromise]);

    // Initialize random shuffle bag and immediately prime the first random word
    if (window.PronunciationEngine && typeof window.PronunciationEngine.initDeck === 'function') {
      window.PronunciationEngine.initDeck(hskDeck);
    }

    setupAudioLibrary();
    setupAudioSourceToggles();

    setTimeout(() => {
      document.querySelectorAll('.tone-btn').forEach(btn => btn.classList.remove('pop-up'));
    }, 1000);
  } catch (err) {
    console.error('Initialization error:', err);
  }
}

async function playAudio(customPath, options = {}) {
  const { playbackRate = 1.0, onEnded = null } = options || {};
  ensureAudioUnlocked();
  stopGlobalAudio();
  let rawPath = null;
  if (typeof customPath === 'string' && customPath.trim().length > 0) {
    rawPath = customPath.trim();
  } else if (currentItem) {
    if (audioSourceMode === 'tts' && currentItem.is_lexical && currentItem.audio_tts) {
      rawPath = `${import.meta.env.BASE_URL}${currentItem.audio_tts}`;
    } else {
      rawPath = `${import.meta.env.BASE_URL}${currentItem.audio}`;
    }
  }

  // Handle TTS route rewrite if a syllable audio path was passed
  let audioPath = rawPath;
  if (audioSourceMode === 'tts' && rawPath) {
    if (rawPath.includes('audio/') && !rawPath.includes('audio/tts/') && !rawPath.includes('hsk_tts/')) {
      audioPath = rawPath.replace('audio/', 'audio/tts/');
    }
  }

  console.log('[DEBUG] playAudio | customPath:', customPath, '| resolved:', audioPath, '| currentItem:', currentItem ? currentItem.audio : null);

  if (!audioPath) {
    console.warn('[DEBUG] playAudio: no audioPath, aborting');
    if (typeof onEnded === 'function') onEnded();
    return;
  }

  const ctx = getAudioContext();
  console.log('[DEBUG] AudioContext state:', ctx ? ctx.state : 'null');

  // 1. Primary Engine: Web Audio API
  if (ctx) {
    try {
      if (ctx.state === 'suspended') {
        console.log('[DEBUG] Resuming suspended AudioContext...');
        await ctx.resume();
        console.log('[DEBUG] AudioContext state after resume:', ctx.state);
      }
      let buffer = audioBufferCache.get(audioPath);
      if (!buffer) {
        console.log('[DEBUG] Fetching audio:', audioPath);
        const resp = await fetch(audioPath);
        console.log('[DEBUG] Fetch response:', resp.status, resp.ok);
        if (resp.ok) {
          const arrayBuf = await resp.arrayBuffer();
          buffer = await decodeAudioDataSafe(ctx, arrayBuf);
          if (buffer) {
            audioBufferCache.set(audioPath, buffer);
            console.log('[DEBUG] Buffer decoded and cached');
          } else {
            console.warn('[DEBUG] decodeAudioDataSafe returned null');
          }
        } else {
          console.error('[DEBUG] Fetch failed with status:', resp.status);
        }
      } else {
        console.log('[DEBUG] Using cached buffer for:', audioPath);
      }
      if (buffer) {
        stopGlobalAudio();
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = Number.isFinite(playbackRate) && playbackRate > 0 ? playbackRate : 1.0;
        source.connect(ctx.destination);
        source.onended = () => {
          if (currentWebAudioSource === source) currentWebAudioSource = null;
          if (typeof onEnded === 'function') onEnded();
        };
        source.start(0);
        currentWebAudioSource = source;
        console.log('[DEBUG] WebAudio playback started OK');
        return;
      }
    } catch (err) {
      console.warn('[DEBUG] Web Audio failed, falling back to HTMLAudio:', err);
    }
  }

  // 2. HTML5 Audio fallback
  try {
    if (!htmlAudioInstance) {
      htmlAudioInstance = new Audio();
    }
    htmlAudioInstance.pause();
    htmlAudioInstance.currentTime = 0;
    htmlAudioInstance.src = audioPath;
    htmlAudioInstance.playbackRate = Number.isFinite(playbackRate) && playbackRate > 0 ? playbackRate : 1.0;
    htmlAudioInstance.onended = () => {
      if (typeof onEnded === 'function') onEnded();
    };
    htmlAudioInstance.onerror = () => {
      if (typeof onEnded === 'function') onEnded();
    };
    console.log('[DEBUG] HTMLAudio .play() called for:', audioPath);
    const playPromise = htmlAudioInstance.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise
        .then(() => console.log('[DEBUG] HTMLAudio play resolved OK'))
        .catch(e => {
          console.error('[DEBUG] HTMLAudio play rejected:', e);
          if (typeof onEnded === 'function') onEnded();
        });
    }
  } catch (e) {
    console.error('[DEBUG] HTMLAudio threw synchronously:', e);
    if (typeof onEnded === 'function') onEnded();
  }
}

function setupButtons() {
  document.querySelectorAll('.tone-btn').forEach((btn, index) => {
    btn.addEventListener('click', (e) => {
      ensureAudioUnlocked();
      const optionSpan = btn.querySelector('.option-text');
      const userGuess = (optionSpan ? optionSpan.textContent : btn.textContent || '').trim().toLowerCase();
      let isCorrect = false;

      if (currentGameMode === 'tones') {
        const correct = (currentItem.pinyin_correct || '').trim().toLowerCase();
        if (userGuess === correct) {
          isCorrect = true;
        }
      } else if (currentGameMode === 'initials') {
        const correct = (currentItem.initial || '').trim().toLowerCase();
        if (userGuess === correct || (userGuess === '∅' && correct === '')) {
          isCorrect = true;
        }
      } else if (currentGameMode === 'endings') {
        const correct = (currentItem.ending_base || '').trim().toLowerCase();
        if (userGuess === correct) {
          isCorrect = true;
        }
      }

      if (isCorrect) {
        document.getElementById('feedback').innerHTML = `<span class="bg-black text-canvas-acid px-3 py-1 rounded-full border border-black font-mono font-bold text-xs uppercase shadow-hard-black tracking-wider animate-bounce">CORRECT! +1</span>`;
        document.querySelector('.options').style.display = 'none';
        
        const fabContainer = document.getElementById('fab-container');
        fabContainer.innerHTML = `
          <div class="w-14 h-14 rounded-2xl bg-canvas-acid text-black border-2 border-black shadow-hard-black flex items-center justify-center animate-[pop-up_0.3s_ease-out]">
            <span class="material-symbols-outlined text-3xl">check</span>
          </div>
        `;
        fabContainer.classList.remove('hidden');

        document.getElementById('pinyin-display').innerHTML = `
            <div class="font-chinese font-black text-5xl sm:text-6xl text-black leading-none">${currentItem.hanzi}</div>
            <div class="font-speed font-black italic text-2xl sm:text-3xl text-black">${currentItem.pinyin_correct}</div>
        `;
        
        const explanationBox = document.getElementById('explanation-box');
        let explanationContent = '';

        if (currentGameMode === 'initials' || currentGameMode === 'endings') {
            const term = (currentGameMode === 'initials') ? (currentItem.initial || '∅') : currentItem.ending_base;
            const explanation = (currentGameMode === 'initials') ? currentItem.initial_explanation : currentItem.final_explanation;

            explanationContent = `
                <div class="relative p-2 text-center">
                    <p class="font-mono text-xs sm:text-sm text-left text-black">
                        <strong class="font-speed font-black text-black">${term}:</strong> 
                        ${explanation}
                    </p>
                    <button id="next-question-btn" class="mt-3 px-5 py-2 rounded-full bg-black text-white hover:bg-badge-pink border-2 border-black font-mono text-xs font-black uppercase tracking-wider shadow-hard-black flex items-center gap-2 mx-auto active-collapse transition-colors cursor-pointer">
                        <span>NEXT QUESTION</span>
                        <span class="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                </div>
            `;
            explanationBox.innerHTML = explanationContent;
            explanationBox.classList.remove('hidden');

            const nextBtn = document.getElementById('next-question-btn');
            nextBtn.addEventListener('click', () => nextQuestion(), { once: true });

        } else {
            // Tone Trainer: Pre-select next item and preload audio immediately during user gesture!
            const pool = getEligibleWords();
            nextPendingItem = pool[Math.floor(Math.random() * pool.length)];
            if (nextPendingItem) {
              const audioUrl = (audioSourceMode === 'tts' && nextPendingItem.is_lexical && nextPendingItem.audio_tts)
                ? `${import.meta.env.BASE_URL}${nextPendingItem.audio_tts}`
                : `${import.meta.env.BASE_URL}${nextPendingItem.audio}`;
              preloadAudio(audioUrl);
            }
            if (nextQuestionTimer) {
              clearTimeout(nextQuestionTimer);
            }
            nextQuestionTimer = setTimeout(nextQuestion, 1500);
        }
      } else {
        document.getElementById('feedback').innerHTML = `<span class="bg-badge-red text-white px-3 py-1 rounded-full border border-black font-mono font-bold text-xs uppercase shadow-hard-black tracking-wider">TRY AGAIN</span>`;
        
        const fabContainer = document.getElementById('fab-container');
        fabContainer.innerHTML = `
          <div class="w-14 h-14 rounded-2xl bg-badge-red text-white border-2 border-black shadow-hard-black flex items-center justify-center animate-[pop-up_0.3s_ease-out]">
            <span class="material-symbols-outlined text-3xl">close</span>
          </div>
        `;
        fabContainer.classList.remove('hidden');
        
        setTimeout(() => {
            fabContainer.classList.add('hidden');
        }, 1000);

        playAudio();
      }
    });
  });
  document.getElementById('play-btn').addEventListener('click', () => playAudio());
}

function nextQuestion() {
  if (nextQuestionTimer) {
    clearTimeout(nextQuestionTimer);
    nextQuestionTimer = null;
  }

  document.querySelector('.options').style.display = 'grid'; 
  const playBtn = document.getElementById('play-btn');
  playBtn.style.transform = "scale(1)"; 
  
  document.getElementById('fab-container').classList.add('hidden');
  document.getElementById('explanation-box').classList.add('hidden');

  const pool = getEligibleWords();
  if (nextPendingItem && (audioSourceMode === 'human' || (nextPendingItem.is_lexical !== false && nextPendingItem.audio_tts))) {
    currentItem = nextPendingItem;
    nextPendingItem = null;
  } else {
    currentItem = pool[Math.floor(Math.random() * pool.length)] || words[0];
  }
  const display = document.getElementById('pinyin-display');
  const buttons = document.querySelectorAll('.tone-btn');

  if (currentGameMode === 'tones') {
      display.innerHTML = `
        <div class="font-chinese font-black text-5xl sm:text-6xl text-black leading-none">${currentItem.hanzi}</div>
        <div class="font-speed font-black italic text-2xl sm:text-3xl text-black">${currentItem.pinyin_base}</div>
      `;
      const toneNames = ['High', 'Rising', 'Dipping', 'Falling'];
      buttons.forEach((btn, i) => {
          btn.querySelector('.option-text').textContent = currentItem.tone_options[i];
          const hint = btn.querySelector('.tone-hint');
          if (hint) hint.textContent = toneNames[i];
      });

  } else if (currentGameMode === 'initials') {
      display.innerHTML = `
        <div class="font-chinese font-black text-5xl sm:text-6xl text-black leading-none">${currentItem.hanzi}</div>
        <div class="font-speed font-black italic text-2xl sm:text-3xl text-black flex items-end justify-center gap-1">
          <span class="inline-block w-6 md:w-8 border-b-4 border-black mb-1"></span>${currentItem.ending_correct}
        </div>
      `;
      buttons.forEach((btn, i) => {
          btn.querySelector('.option-text').textContent = currentItem.initial_options[i] === "" ? "∅" : currentItem.initial_options[i];
          const hint = btn.querySelector('.tone-hint');
          if (hint) hint.textContent = '';
      });

  } else if (currentGameMode === 'endings') {
      display.innerHTML = `
        <div class="font-chinese font-black text-5xl sm:text-6xl text-black leading-none">${currentItem.hanzi}</div>
        <div class="font-speed font-black italic text-2xl sm:text-3xl text-black flex items-end justify-center gap-1">
          ${currentItem.initial}<span class="inline-block w-8 md:w-12 border-b-4 border-black mb-1"></span>
        </div>
      `;
      buttons.forEach((btn, i) => {
          btn.querySelector('.option-text').textContent = removeTones(currentItem.ending_options[i]);
          const hint = btn.querySelector('.tone-hint');
          if (hint) hint.textContent = '';
      });
  }

  buttons.forEach(btn => void btn.offsetWidth);

  document.getElementById('feedback').innerHTML = '<span class="text-white/80">[IDENTIFY THE TARGET SOUND]</span>';
  playAudio();
}

function WheelPlugin(slider) {
  let isMoving = false;
  slider.on('created', () => {
    slider.container.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        if (isMoving) return;
        const delta = e.deltaY;
        if (Math.abs(delta) < 8) return;
        isMoving = true;
        if (delta > 0) {
          slider.next();
        } else {
          slider.prev();
        }
        setTimeout(() => {
          isMoving = false;
        }, 90);
      },
      { passive: false }
    );
  });
}

function setupAudioLibrary() {
    const initialsContainer = document.getElementById('initials-scroller');
    const finalsContainer = document.getElementById('finals-scroller');
    const toneModal = document.getElementById('library-tone-modal');
    const modalPinyinDisplay = document.getElementById('modal-pinyin-display');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const selectionDisplay = document.getElementById('library-selection-display');
    const mainPlayBtn = document.getElementById('library-main-play-btn');

    const allInitials = [...new Set(words.map(w => w.initial))].sort();
    const allFinals = [...new Set(words.map(w => w.ending_base))].sort();

    initialsContainer.innerHTML = '';
    finalsContainer.innerHTML = '';

    allInitials.forEach((item, index) => {
        const slide = document.createElement('div');
        slide.className = 'keen-slider__slide flex items-center justify-center cursor-pointer select-none';
        slide.dataset.index = index;

        const label = document.createElement('span');
        label.className = 'slide-label font-speed text-xl sm:text-2xl font-bold transition-all duration-150';
        label.textContent = item === '' ? '∅' : item;
        slide.appendChild(label);

        initialsContainer.appendChild(slide);
    });

    allFinals.forEach((item, index) => {
        const slide = document.createElement('div');
        slide.className = 'keen-slider__slide flex items-center justify-center cursor-pointer select-none';
        slide.dataset.index = index;

        const label = document.createElement('span');
        label.className = 'slide-label font-speed text-xl sm:text-2xl font-bold transition-all duration-150';
        label.textContent = item;
        slide.appendChild(label);

        finalsContainer.appendChild(slide);
    });

    function updateSlideStyles(slider, type) {
        if (!slider.track || !slider.track.details) return;
        const details = slider.track.details;
        const labels = slider.container.querySelectorAll('.slide-label');
        details.slides.forEach((slideDetail, idx) => {
            const label = labels[idx];
            if (!label) return;
            const distance = Math.abs(slideDetail.distance);
            if (distance < 0.5) {
                label.style.opacity = '1';
                label.style.transform = `scale(${1.2 - distance * 0.15})`;
                label.style.color = type === 'initial' ? '#000000' : '#104FE2';
                label.style.fontWeight = '900';
            } else if (distance < 1.5) {
                label.style.opacity = '0.6';
                label.style.transform = 'scale(0.95)';
                label.style.color = '#000000';
                label.style.fontWeight = '700';
            } else if (distance < 2.5) {
                label.style.opacity = '0.35';
                label.style.transform = 'scale(0.85)';
                label.style.color = '#000000';
                label.style.fontWeight = '600';
            } else {
                label.style.opacity = '0.15';
                label.style.transform = 'scale(0.75)';
                label.style.color = '#000000';
                label.style.fontWeight = '500';
            }
        });
    }

    function syncSelection() {
        if (!initialsSlider || !finalsSlider) return;
        if (!initialsSlider.track || !finalsSlider.track) return;
        if (!initialsSlider.track.details || !finalsSlider.track.details) return;
        
        const initIdx = initialsSlider.track.details.rel;
        const finalIdx = finalsSlider.track.details.rel;
        selectedInitial = allInitials[initIdx];
        selectedFinal = allFinals[finalIdx];

        const initialKey = selectedInitial === '∅' ? '' : selectedInitial;
        const pinyinBase = initialKey + selectedFinal;
        const matchingWords = words.filter(w => {
            if (w.initial !== initialKey || w.ending_base !== selectedFinal) return false;
            if (audioSourceMode === 'tts') {
                return w.is_lexical !== false && w.audio_tts;
            }
            return true;
        });

        if (matchingWords.length > 0) {
            selectionDisplay.innerHTML = `
                <span class="font-chinese font-black text-2xl sm:text-3xl text-black">${pinyinBase}</span>
                <span class="ml-2 font-mono text-[11px] sm:text-xs uppercase tracking-wider font-bold bg-black text-canvas-acid px-2 py-0.5 rounded border border-black shadow-sm">
                  ${matchingWords.length} TONE${matchingWords.length > 1 ? 'S' : ''}${audioSourceMode === 'tts' ? ' (TTS)' : ''}
                </span>
            `;
            mainPlayBtn.disabled = false;
        } else {
            selectionDisplay.innerHTML = `
                <span class="font-chinese text-2xl font-bold text-black/30 line-through">${pinyinBase}</span>
                <span class="ml-2 font-mono text-xs uppercase tracking-wider text-badge-red font-black">${audioSourceMode === 'tts' ? '(No lexical TTS tone)' : '(No syllable)'}</span>
            `;
            mainPlayBtn.disabled = true;
        }
    }

    window.syncAudioLibrarySelection = syncSelection;

    initialsSlider = new KeenSlider(initialsContainer, {
        vertical: true,
        mode: 'free-snap',
        rubberband: true,
        slides: {
            origin: 'center',
            perView: 7,
            spacing: 0,
        },
        initial: 0,
        created(s) {
            updateSlideStyles(s, 'initial');
        },
        detailsChanged(s) {
            updateSlideStyles(s, 'initial');
        },
        slideChanged() {
            syncSelection();
        },
    }, [WheelPlugin]);

    finalsSlider = new KeenSlider(finalsContainer, {
        vertical: true,
        mode: 'free-snap',
        rubberband: true,
        slides: {
            origin: 'center',
            perView: 7,
            spacing: 0,
        },
        initial: 0,
        created(s) {
            updateSlideStyles(s, 'final');
        },
        detailsChanged(s) {
            updateSlideStyles(s, 'final');
        },
        slideChanged() {
            syncSelection();
        },
    }, [WheelPlugin]);

    // Click on slide to center it smoothly
    initialsContainer.addEventListener('click', e => {
        const slide = e.target.closest('.keen-slider__slide');
        if (slide && initialsSlider) {
            const idx = parseInt(slide.dataset.index);
            initialsSlider.moveToIdx(idx, true, { duration: 250 });
        }
    });

    finalsContainer.addEventListener('click', e => {
        const slide = e.target.closest('.keen-slider__slide');
        if (slide && finalsSlider) {
            const idx = parseInt(slide.dataset.index);
            finalsSlider.moveToIdx(idx, true, { duration: 250 });
        }
    });

    function openToneModal() {
        if (!selectedInitial || !selectedFinal) syncSelection();
        const initialKey = selectedInitial === '∅' ? '' : selectedInitial;
        const pinyinBase = initialKey + selectedFinal;
        modalPinyinDisplay.textContent = pinyinBase;

        const toneButtons = toneModal.querySelectorAll('.tone-select-btn');
        toneButtons.forEach((btn, i) => {
            const tone = i + 1;
            const pinyinWithTone = pinyin_to_tone(`${pinyinBase}${tone}`);
            btn.textContent = pinyinWithTone;

            const word = words.find(w => 
                w.initial === initialKey && 
                w.ending_base === selectedFinal && 
                w.tone === tone
            );

            // Under Strategy 2 Lexical Filtering: if audioSourceMode === 'tts', only enable if lexical
            const isAvailable = word && (audioSourceMode === 'human' || (word.is_lexical !== false && word.audio_tts));

            if (isAvailable) {
                btn.disabled = false;
                btn.classList.remove('opacity-30', 'cursor-not-allowed', 'pointer-events-none');
                btn.classList.add('hover:bg-white', 'cursor-pointer');
                btn.title = '';
            } else {
                btn.disabled = true;
                btn.classList.add('opacity-30', 'cursor-not-allowed', 'pointer-events-none');
                btn.classList.remove('hover:bg-white', 'cursor-pointer');
                btn.title = (word && !word.is_lexical) ? 'Non-lexical practice gap (Switch to Human to audition)' : '';
            }
        });

        toneModal.classList.remove('hidden');
    }

    mainPlayBtn.addEventListener('click', openToneModal);

    closeModalBtn.addEventListener('click', () => {
        toneModal.classList.add('hidden');
    });

    toneModal.addEventListener('click', e => {
        const toneBtn = e.target.closest('.tone-select-btn');
        if (toneBtn && !toneBtn.disabled) {
            const tone = parseInt(toneBtn.dataset.tone);
            const initialKey = selectedInitial === '∅' ? '' : selectedInitial;
            
            const word = words.find(w => 
                w.initial === initialKey && 
                w.ending_base === selectedFinal && 
                w.tone === tone
            );

            if (word) {
                const audioPath = (audioSourceMode === 'tts' && word.is_lexical && word.audio_tts)
                    ? `${import.meta.env.BASE_URL}${word.audio_tts}`
                    : `${import.meta.env.BASE_URL}${word.audio}`;
                playAudio(audioPath);
            } else {
                console.warn(`No audio found for ${initialKey}${selectedFinal}${tone}`);
            }
        }
    });

    // Initial sync
    setTimeout(syncSelection, 50);
}

// Global Keyboard Navigation (1, 2, 3, 4 and Space)
window.addEventListener('keydown', (e) => {
  const gameScreen = document.getElementById('game-screen');
  const engineScreen = document.getElementById('engine-screen');

  if (gameScreen && !gameScreen.classList.contains('hidden')) {
    if (e.key >= '1' && e.key <= '4') {
      const index = parseInt(e.key) - 1;
      const targetBtn = document.querySelectorAll('.tone-btn')[index];
      if (targetBtn && document.querySelector('.options').style.display !== 'none') {
        targetBtn.click();
      }
    } else if (e.code === 'Space') {
      e.preventDefault();
      playAudio();
    }
  } else if (engineScreen && !engineScreen.classList.contains('hidden')) {
    const settingsModal = document.getElementById('engine-settings-modal');
    if (settingsModal && !settingsModal.classList.contains('hidden')) {
      if (e.code === 'Escape') {
        e.preventDefault();
        settingsModal.classList.add('hidden');
      }
      return;
    }
    const tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) return;
    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      const recordBtn = document.getElementById('engine-record-btn');
      if (recordBtn) recordBtn.click();
    } else if (e.code === 'KeyN' && !e.repeat && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      const nextBtn = document.getElementById('engine-next-btn');
      if (nextBtn) nextBtn.click();
    }
  }
});

// ========================================================
// ACOUSTIC PRONUNCIATION ENGINE: ELSA 3-TIER UI & DSP HOOKS
// Progressive Disclosure | Plain-English Coaching | Seekable Playback
// ========================================================
function setupEnginePlaceholders() {
  const recordBtn = document.getElementById('engine-record-btn');
  const nextBtn = document.getElementById('engine-next-btn');
  const resetBtn = document.getElementById('engine-reset-btn');
  const coachPlayBtn = document.getElementById('coach-hear-user-btn');
  const coachNativeBtn = document.getElementById('coach-hear-native-btn');
  const practiceCounter = document.getElementById('engine-practice-counter');
  const playNativeBtn = document.getElementById('engine-play-native-btn');
  const hanziDisplay = document.getElementById('engine-hanzi-display');
  const pinyinDisplay = document.getElementById('engine-pinyin-display');

  const settingsBtn = document.getElementById('engine-settings-btn');
  const settingsModal = document.getElementById('engine-settings-modal');
  const settingsCloseBtn = document.getElementById('engine-settings-close-btn');
  const settingsDoneBtn = document.getElementById('engine-settings-done-btn');
  const settingsSummaryEl = document.getElementById('engine-settings-summary');
  const quickSpeedBtn = document.getElementById('engine-quick-speed-btn');

  let currentDeckFilter = 'all'; // 'all' | 'hsk1' | 'hsk2'
  let shuffleBag = [];
  let currentTargetWord = null;
  let practicedCount = 0;
  let currentSyllableCount = 1;
  let currentSyllables = [];
  let selectedSyllableIdx = 0;

  let currentEngineState = 1; // 1: Priming, 2: Recording, 4: Audit
  let audioPipeline = null;
  let lastUserAudioBlob = null;
  let lastUserAudioUrl = null;
  let activeUserAudio = null;
  let userAudioRafId = null;
  let lastDurationSec = 0;
  const RECORDING_DURATION_SEC = 4;
  let countdownSeconds = RECORDING_DURATION_SEC;
  let countdownInterval = null;

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const INITIAL_PLAIN = {
    NO_AUDIO: 'Too quiet to hear clearly',
    UNVOICED_FAIL: 'Speak a bit louder and clearer',
    ACCURATE_ASPIRATED: 'Strong, clear burst of air',
    LAX_ASPIRATED: 'Slightly light air burst — push more breath',
    UNDER_ASPIRATED: 'Needs a stronger burst of air',
    ACCURATE_UNASPIRATED: 'Clean, dry consonant without extra air',
    SLIGHT_ASPIRATION: 'Keep extra breath out on release',
    OVER_ASPIRATED: 'Too much air — release gently',
    SHORT_FRICATIVE: 'Hold the starting friction sound slightly longer',
    EXACT_DENTAL: 'Crisp S sound right behind front teeth',
    MID_DENTAL: 'Slide tongue tip slightly forward',
    SLURRED_DENTAL: 'Point tongue closer to teeth for a crisp S',
    EXACT_RETROFLEX: 'Good curled-tongue SH sound',
    FORWARD_RETROFLEX: 'Curl tongue tip slightly back',
    DEEP_RETROFLEX: 'Sounded slightly deep — bring tongue forward',
    EXACT_PALATAL: 'Clear soft X/Q/J sound',
    PASS_PALATAL: 'Widen lips slightly for a brighter sound',
    PASS_GENERIC_FRICATIVE: 'Clear consonant onset',
    PASS_SONORANT: 'Smooth, natural voiced start',
    PASS_FRICATIVE: 'Clear consonant onset',
    PASS: 'Clear consonant onset'
  };

  const TONE_PLAIN = {
    EXACT: {
      1: 'Steady high pitch',
      2: 'Crisp upward rise',
      3: 'Dipped low cleanly',
      4: 'Sharp downward drop',
      5: 'Light neutral tone'
    },
    UNVOICED: 'No clear pitch detected',
    DROPPED: 'Pitch drifted down at the end — hold it level',
    CLIMBED: 'Pitch rose at the end — hold it flat',
    TOO_LOW: 'Flat pitch, but start higher',
    FLAT_RISE: 'Needs a stronger upward lift',
    FALLING_INSTEAD_OF_RISING: 'Dropped instead of rising — sweep up firmly',
    SHALLOW_DIP: 'Drop pitch lower before lifting',
    ROSE_TOO_EARLY: 'Stay low a bit longer before rising',
    NOT_FALLING: 'Drop pitch decisively from top to bottom'
  };

  const FINAL_PLAIN = {
    NO_AUDIO: 'Vowel too brief to read',
    PASS_GENERIC_AUDIBLE: 'Clear vowel resonance',
    EXACT_OPEN: 'Wide, clear A vowel',
    MID_OPEN: 'Drop jaw slightly wider for A',
    CLOSED_JAW: 'Open mouth wider for A',
    EXACT_BACK: 'Deep rounded U sound',
    MID_BACK: 'Pull tongue slightly back for U',
    FRONTED_VOWEL: 'Round lips tightly and pull tongue back',
    EXACT_FRONT: 'Bright, clear EE sound',
    LAX_FRONT: 'Widen corners of mouth like a gentle smile',
    PASS_PHONOTACTIC_I: 'Clear front vowel',
    BACKED_VOWEL: 'Lift front of tongue higher',
    EXACT_ROUNDED_FRONT: 'Clear rounded Ü with tight lips',
    PASS_PHONOTACTIC_U: 'Clear rounded vowel',
    UNROUNDED_LIPS: 'Hold EE tongue, purse lips like whistling',
    SLIPPED_TO_U: 'Push tongue forward while keeping lips rounded',
    WEAK_ROUNDING: 'Round lips into a smaller circle',
    PASS_GENERIC: 'Clear vowel sound'
  };

  function getInitialPlain(init) {
    if (!init) return 'Clean onset';
    return INITIAL_PLAIN[init.diagnosticCode] || 'Clear starting sound';
  }

  function getTonePlain(syl) {
    const code = syl?.diagnosticCode || syl?.toneResult?.diagnosticCode || 'EXACT';
    const tone = Number(syl?.tone) || 1;
    const score = syl?.toneScore !== undefined ? syl.toneScore : (syl?.toneResult?.score ?? 90);
    if (code === 'EXACT') {
      if (tone === 2 && score < 85) return 'Gentle rise — sweep slightly higher';
      if (tone === 4 && score < 85) return 'Soft drop — make the fall sharper';
      return TONE_PLAIN.EXACT[tone] || 'Accurate tone contour';
    }
    return TONE_PLAIN[code] || 'Adjust tone contour';
  }

  function getFinalPlain(fin) {
    if (!fin) return 'Clear vowel sound';
    return FINAL_PLAIN[fin.diagnosticCode] || 'Clear vowel resonance';
  }

  function stripHtmlTags(str) {
    return String(str ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  function humanizeCoachAdviceText(rawAdvice, wordData, result) {
    const clean = stripHtmlTags(rawAdvice);
    if (!clean || result?.coachingPriority === 'PERFECT') {
      const hanzi = wordData?.hanzi_simp || wordData?.hanzi || '';
      const score = result?.overallScore !== undefined ? result.overallScore : 90;
      if (score >= 85) {
        return `Nice work on "${hanzi}" — your tones matched the native model closely (${score}%).`;
      }
      return `Good clarity on "${hanzi}". Replay Native vs My Voice to fine-tune the contour.`;
    }
    return clean
      .replace(/Level 5 \(high soprano\/head voice\)/gi, 'the top of your comfortable pitch range')
      .replace(/chest register \(Level 1\)/gi, 'your lowest relaxed pitch')
      .replace(/Chao corridor/gi, 'target curve')
      .replace(/phonemic targets/gi, 'sound targets')
      .replace(/All phonemic targets verified\.?/gi, 'Everything sounded clear.');
  }

  function getSyllableSpans(count) {
    if (count === 1) {
      return [{ xMin: 80, xMax: 580, id: 'target-ribbon-s1', pathId: 'user-pitch-path-s1', ptsId: 'user-pitch-points-s1' }];
    } else if (count === 2) {
      return [
        { xMin: 70, xMax: 300, id: 'target-ribbon-s1', pathId: 'user-pitch-path-s1', ptsId: 'user-pitch-points-s1' },
        { xMin: 360, xMax: 600, id: 'target-ribbon-s2', pathId: 'user-pitch-path-s2', ptsId: 'user-pitch-points-s2' },
      ];
    } else if (count === 3) {
      return [
        { xMin: 35, xMax: 195, id: 'target-ribbon-s1', pathId: 'user-pitch-path-s1', ptsId: 'user-pitch-points-s1' },
        { xMin: 245, xMax: 405, id: 'target-ribbon-s2', pathId: 'user-pitch-path-s2', ptsId: 'user-pitch-points-s2' },
        { xMin: 455, xMax: 625, id: 'target-ribbon-s3', pathId: 'user-pitch-path-s3', ptsId: 'user-pitch-points-s3' },
      ];
    } else {
      return [
        { xMin: 25, xMax: 155, id: 'target-ribbon-s1', pathId: 'user-pitch-path-s1', ptsId: 'user-pitch-points-s1' },
        { xMin: 185, xMax: 315, id: 'target-ribbon-s2', pathId: 'user-pitch-path-s2', ptsId: 'user-pitch-points-s2' },
        { xMin: 345, xMax: 475, id: 'target-ribbon-s3', pathId: 'user-pitch-path-s3', ptsId: 'user-pitch-points-s3' },
        { xMin: 505, xMax: 635, id: 'target-ribbon-s4', pathId: 'user-pitch-path-s4', ptsId: 'user-pitch-points-s4' },
      ];
    }
  }

  function getDividers(count) {
    if (count === 2) return [330];
    if (count === 3) return [220, 430];
    if (count === 4) return [170, 330, 490];
    return [];
  }

  function getToneSandhiInfo(word, syllables) {
    const tones = (syllables || []).map(s => s.tone);
    const hanzi = (word.hanzi_simp || word.hanzi || '').trim();

    for (let i = 0; i < tones.length - 1; i++) {
      if (tones[i] === 3 && tones[i + 1] === 3) {
        return {
          title: 'Tone Shift',
          subtext: 'Two 3rd tones together: the first rises like Tone 2.',
          isSandhi: true,
        };
      }
    }

    if (hanzi.includes('一') && tones.length > 1) {
      const idx = hanzi.indexOf('一');
      if (idx < tones.length - 1) {
        const nextTone = tones[idx + 1];
        if (nextTone === 4) {
          return {
            title: 'Tone Shift',
            subtext: '一 (yī) rises to Tone 2 (yí) before a 4th tone.',
            isSandhi: true,
          };
        } else if ([1, 2, 3].includes(nextTone)) {
          return {
            title: 'Tone Shift',
            subtext: `一 (yī) drops to Tone 4 (yì) before Tone ${nextTone}.`,
            isSandhi: true,
          };
        }
      }
    }

    if (hanzi.includes('不') && tones.length > 1) {
      const idx = hanzi.indexOf('不');
      if (idx < tones.length - 1 && tones[idx + 1] === 4) {
        return {
          title: 'Tone Shift',
          subtext: '不 (bù) rises to Tone 2 (bú) before a 4th tone.',
          isSandhi: true,
        };
      }
    }

    return {
      title: '',
      subtext: '',
      isSandhi: false,
    };
  }

  function parsePinyinSyllables(pinyinStr) {
    if (!pinyinStr) return [{ syllable: '', tone: 1 }];
    const parts = pinyinStr.trim().split(/\s+/);
    return parts.map(p => {
      let tone = 5;
      if (/[āēīōūǖ]/.test(p)) tone = 1;
      else if (/[áéíóúǘ]/.test(p)) tone = 2;
      else if (/[ǎěǐǒǔǚ]/.test(p)) tone = 3;
      else if (/[àèìòùǜ]/.test(p)) tone = 4;
      return { syllable: p, tone };
    });
  }

  function updateEngineSettingsSummary() {
    const deckLabel = currentDeckFilter === 'all' ? 'All' : (currentDeckFilter === 'hsk1' ? 'HSK 1' : 'HSK 2');
    const isSlow = audioTrackMode === 'human' && (humanPlaybackSpeed === 0.65 || humanPlaybackSpeed === 0.8);
    const voiceLabel = audioTrackMode === 'tts'
      ? 'Studio'
      : (isSlow ? 'Natural 0.65×' : 'Natural');

    if (settingsSummaryEl) {
      settingsSummaryEl.textContent = `${deckLabel} • ${voiceLabel}`;
    }

    if (quickSpeedBtn) {
      if (audioTrackMode === 'human') {
        quickSpeedBtn.classList.remove('hidden');
        quickSpeedBtn.textContent = isSlow ? '0.65×' : '1.0×';
        quickSpeedBtn.setAttribute('aria-pressed', isSlow ? 'true' : 'false');
        if (isSlow) {
          quickSpeedBtn.className = 'min-w-[44px] min-h-[44px] px-2.5 rounded-xl bg-amber-300 hover:bg-amber-400 text-black border-2 border-black font-mono text-xs font-black active-collapse cursor-pointer shadow-sm shrink-0 transition-colors';
        } else {
          quickSpeedBtn.className = 'min-w-[44px] min-h-[44px] px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-black border-2 border-black font-mono text-xs font-black active-collapse cursor-pointer shadow-sm shrink-0 transition-colors';
        }
      } else {
        quickSpeedBtn.classList.add('hidden');
      }
    }
  }

  function openSettingsModal() {
    if (settingsModal) settingsModal.classList.remove('hidden');
  }

  function closeSettingsModal() {
    if (settingsModal) settingsModal.classList.add('hidden');
  }

  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openSettingsModal();
    });
  }
  if (settingsCloseBtn) {
    settingsCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeSettingsModal();
    });
  }
  if (settingsDoneBtn) {
    settingsDoneBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeSettingsModal();
    });
  }
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        closeSettingsModal();
      }
    });
  }
  if (quickSpeedBtn) {
    quickSpeedBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const next = (humanPlaybackSpeed === 0.65 || humanPlaybackSpeed === 0.8) ? 1.0 : 0.65;
      setHumanPlaybackSpeed(next);
    });
  }

  function initShuffleBag() {
    let pool = hskDeck;
    if (currentDeckFilter === 'hsk1') {
      pool = hskDeck.filter(w => (w.hsk_level || '').toLowerCase().includes('1'));
    } else if (currentDeckFilter === 'hsk2') {
      pool = hskDeck.filter(w => (w.hsk_level || '').toLowerCase().includes('2'));
    }
    if (!pool || pool.length === 0) pool = hskDeck;

    shuffleBag = [...pool];
    for (let i = shuffleBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffleBag[i], shuffleBag[j]] = [shuffleBag[j], shuffleBag[i]];
    }
    updateEngineSettingsSummary();
  }

  async function pickRandomWord() {
    if (!hskDeck || hskDeck.length === 0) {
      const data = await fetchJsonSafe('hsk_deck.json');
      if (data && Array.isArray(data)) {
        hskDeck = data;
        initShuffleBag();
      } else {
        console.warn('[PronunciationEngine] hsk_deck.json could not be loaded.');
        return;
      }
    }
    if (!shuffleBag || shuffleBag.length === 0) {
      initShuffleBag();
    }
    const nextWord = shuffleBag.pop();
    if (nextWord) {
      displayWord(nextWord);
    }
  }

  function getActiveDurationSec() {
    if (lastProcessedResult && Number.isFinite(lastProcessedResult.duration) && lastProcessedResult.duration > 0) {
      return lastProcessedResult.duration;
    }
    if (lastDurationSec > 0) return lastDurationSec;
    return RECORDING_DURATION_SEC;
  }

  function updateTimelineProgressUI(fraction, durSec = getActiveDurationSec(), showCursor = false) {
    const clamped = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
    const fill = document.getElementById('pitch-timeline-fill');
    const thumb = document.getElementById('pitch-timeline-thumb');
    const text = document.getElementById('pitch-timeline-text');
    const cursor = document.getElementById('pitch-playback-cursor');

    if (fill) fill.style.width = `${(clamped * 100).toFixed(1)}%`;
    if (thumb) thumb.style.left = `${(clamped * 100).toFixed(1)}%`;
    if (text) {
      const total = Math.max(0.1, Number.isFinite(durSec) ? durSec : RECORDING_DURATION_SEC);
      const cur = (clamped * total).toFixed(2);
      text.textContent = `${cur}s / ${total.toFixed(2)}s`;
    }
    if (cursor) {
      const spans = getSyllableSpans(currentSyllableCount);
      const xStart = spans[0] ? spans[0].xMin : 25;
      const xEnd = spans[spans.length - 1] ? spans[spans.length - 1].xMax : 635;
      const x = xStart + clamped * (xEnd - xStart);
      cursor.setAttribute('x1', x.toFixed(1));
      cursor.setAttribute('x2', x.toFixed(1));
      cursor.classList.toggle('hidden', !showCursor);
    }
  }

  function setCoachPlayButtonState(isPlaying) {
    if (!coachPlayBtn) return;
    if (isPlaying) {
      coachPlayBtn.innerHTML = '<span class="material-symbols-outlined text-base animate-pulse">stop_circle</span><span>Playing…</span>';
      coachPlayBtn.classList.add('bg-badge-tangerine', 'text-white');
      coachPlayBtn.classList.remove('bg-black');
    } else {
      coachPlayBtn.innerHTML = '<span class="material-symbols-outlined text-base">play_circle</span><span>My Voice</span>';
      coachPlayBtn.classList.remove('bg-badge-tangerine');
      coachPlayBtn.classList.add('bg-black', 'text-white');
    }
  }

  function stopUserPlayback({ resetCursor = true } = {}) {
    if (userAudioRafId) {
      cancelAnimationFrame(userAudioRafId);
      userAudioRafId = null;
    }
    if (activeUserAudio) {
      try {
        activeUserAudio.pause();
        activeUserAudio.currentTime = 0;
      } catch (_) {}
    }
    setCoachPlayButtonState(false);
    if (resetCursor) {
      const cursor = document.getElementById('pitch-playback-cursor');
      if (cursor) cursor.classList.add('hidden');
    }
  }

  function seekUserAudio(fraction) {
    const clamped = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
    const totalDur = (activeUserAudio && Number.isFinite(activeUserAudio.duration) && activeUserAudio.duration > 0)
      ? activeUserAudio.duration
      : getActiveDurationSec();

    if (activeUserAudio && Number.isFinite(totalDur) && totalDur > 0) {
      try {
        activeUserAudio.currentTime = clamped * totalDur;
      } catch (_) {}
    }
    updateTimelineProgressUI(clamped, totalDur, Boolean(lastUserAudioBlob));
  }

  function bindTimelineScrubber() {
    const hitEl = document.getElementById('pitch-timeline-hit');
    if (!hitEl || hitEl.dataset.bound === 'true') return;
    hitEl.dataset.bound = 'true';

    let isDragging = false;
    const fractionFromEvent = (e) => {
      const rect = hitEl.getBoundingClientRect();
      if (!rect || rect.width <= 0) return 0;
      return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    };

    hitEl.addEventListener('pointerdown', (e) => {
      if (!lastUserAudioBlob) return;
      isDragging = true;
      try { hitEl.setPointerCapture(e.pointerId); } catch (_) {}
      seekUserAudio(fractionFromEvent(e));
    });

    hitEl.addEventListener('pointermove', (e) => {
      if (!isDragging || !lastUserAudioBlob) return;
      seekUserAudio(fractionFromEvent(e));
    });

    const endDrag = () => {
      isDragging = false;
    };
    hitEl.addEventListener('pointerup', endDrag);
    hitEl.addEventListener('pointercancel', endDrag);
  }
  bindTimelineScrubber();

  function renderCanvasGeometry(count, syllables, profile) {
    const dividersContainer = document.getElementById('pitch-syllable-dividers') || document.getElementById('pitch-canvas-dividers');
    const ribbonsContainer = document.getElementById('pitch-target-ribbons');
    const milestonesContainer = document.getElementById('pitch-time-milestones');
    const userPaths = document.getElementById('user-pitch-paths-container');
    const userPts = document.getElementById('user-pitch-points-container');
    const cursor = document.getElementById('pitch-playback-cursor');

    if (milestonesContainer) milestonesContainer.innerHTML = '';
    if (cursor) cursor.classList.add('hidden');

    if (dividersContainer) {
      const dividers = getDividers(count);
      const spans = getSyllableSpans(count);
      let divHtml = '';
      dividers.forEach(x => {
        divHtml += `<line x1="${x}" y1="8" x2="${x}" y2="142" stroke="#000000" stroke-opacity="0.22" stroke-width="1.5" stroke-dasharray="4,3" />`;
      });
      spans.forEach((span, i) => {
        const syl = syllables[i] || { syllable: '', tone: 1 };
        const midX = (span.xMin + span.xMax) / 2;
        divHtml += `<text x="${midX.toFixed(1)}" y="149" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="11" font-weight="900" text-anchor="middle" fill="#000000" letter-spacing="0.4">${escapeHtml(syl.syllable || '')}</text>`;
      });
      dividersContainer.innerHTML = divHtml;
    }

    if (ribbonsContainer) {
      const spans = getSyllableSpans(count);
      let ribbonsHtml = '';

      spans.forEach((span, i) => {
        let sylF0 = null;
        if (profile?.syllables?.[i]?.f0_norm && profile.syllables[i].f0_norm.length >= 2) {
          sylF0 = profile.syllables[i].f0_norm;
        } else if (profile?.f0_norm && profile.f0_norm.length >= 2) {
          const f0 = profile.f0_norm;
          const ptsPerSyl = Math.floor(f0.length / spans.length);
          const sliceStart = i * ptsPerSyl;
          const sliceEnd = i === spans.length - 1 ? f0.length : (i + 1) * ptsPerSyl;
          sylF0 = f0.slice(sliceStart, sliceEnd);
        }

        const upperPts = [];
        const lowerPts = [];

        if (sylF0 && sylF0.length >= 2) {
          for (let k = 0; k < sylF0.length; k++) {
            const x = span.xMin + (k / (sylF0.length - 1)) * (span.xMax - span.xMin);
            const st = sylF0[k];
            const centerY = Math.max(16, Math.min(136, 78 - st * 16));
            upperPts.push(`${x.toFixed(1)},${Math.max(8, centerY - 10.35).toFixed(1)}`);
            lowerPts.unshift(`${x.toFixed(1)},${Math.min(142, centerY + 10.35).toFixed(1)}`);
          }
        } else {
          const syl = syllables[i] || { tone: 1 };
          const N = 10;
          for (let k = 0; k < N; k++) {
            const x = span.xMin + (k / (N - 1)) * (span.xMax - span.xMin);
            const t = k / (N - 1);
            let centerY = 78;
            if (syl.tone === 1) centerY = 24;
            else if (syl.tone === 2) centerY = 78 - t * 54;
            else if (syl.tone === 3) centerY = t < 0.5 ? 95 + t * 60 : 125 - (t - 0.5) * 140;
            else if (syl.tone === 4) centerY = 24 + t * 105;
            upperPts.push(`${x.toFixed(1)},${Math.max(8, centerY - 10.35).toFixed(1)}`);
            lowerPts.unshift(`${x.toFixed(1)},${Math.min(142, centerY + 10.35).toFixed(1)}`);
          }
        }
        const allPts = upperPts.concat(lowerPts).join(' ');
        ribbonsHtml += `<polygon id="${span.id}" points="${allPts}" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3] transition-all duration-150" />`;
      });
      ribbonsContainer.innerHTML = ribbonsHtml;
    }

    if (userPaths) userPaths.innerHTML = '';
    if (userPts) userPts.innerHTML = '';
  }

  function getActiveProfileForWord(word) {
    if (!word) return null;
    const audioRel = word.audio || '';
    const origFname = audioRel.split('/').pop();

    if (audioTrackMode === 'tts') {
      const ttsFname = origFname.replace('hskstory-', 'tts-');
      if (toneProfilesTTS && toneProfilesTTS[ttsFname]) {
        return toneProfilesTTS[ttsFname];
      }
      const cleanHanzi = (word.hanzi_simp || word.hanzi || '').replace(/\s+/g, '');
      const found = Object.values(toneProfilesTTS || {}).find(p => p && p.hanzi_simp === cleanHanzi);
      if (found) return found;
    }

    if (toneProfiles && toneProfiles[origFname]) {
      return toneProfiles[origFname];
    }
    const cleanHanzi = (word.hanzi_simp || word.hanzi || '').replace(/\s+/g, '');
    const found = Object.values(toneProfiles || {}).find(p => p && p.hanzi_simp === cleanHanzi);
    return found || null;
  }

  function displayWord(word) {
    if (!word) return;
    stopUserPlayback();
    if (activeUserAudio) {
      activeUserAudio = null;
    }
    if (lastUserAudioUrl) {
      try { URL.revokeObjectURL(lastUserAudioUrl); } catch (_) {}
      lastUserAudioUrl = null;
    }

    currentTargetWord = word;
    lastProcessedResult = null;
    lastUserAudioBlob = null;
    lastDurationSec = 0;
    selectedSyllableIdx = 0;

    const refProfile = getActiveProfileForWord(word);
    let syllables = [];
    if (refProfile && refProfile.syllables && refProfile.syllables.length > 0) {
      syllables = refProfile.syllables;
    } else {
      syllables = parsePinyinSyllables(word.pinyin);
    }
    const count = syllables.length;
    currentSyllableCount = count;
    currentSyllables = syllables;

    const glossEl = document.getElementById('engine-gloss-display');
    const hskTagEl = document.getElementById('engine-hsk-tag');

    if (hanziDisplay) hanziDisplay.textContent = word.hanzi_simp || word.hanzi || '';
    if (pinyinDisplay) pinyinDisplay.textContent = word.pinyin || '';
    if (glossEl) {
      glossEl.textContent = getConciseEnglish(word);
    }
    if (hskTagEl) {
      hskTagEl.textContent = (word.hsk_level || 'HSK').toUpperCase();
    }

    // Tone Sandhi notice only when an actual tone shift rule applies
    const sandhiInfo = getToneSandhiInfo(word, syllables);
    const sandhiBadge = document.getElementById('engine-sandhi-badge');
    const toneTitle = document.getElementById('engine-tone-title');
    const toneSubtext = document.getElementById('engine-tone-subtext');

    if (sandhiBadge) {
      if (sandhiInfo.isSandhi) {
        if (toneTitle) toneTitle.textContent = sandhiInfo.title;
        if (toneSubtext) toneSubtext.textContent = sandhiInfo.subtext;
        sandhiBadge.classList.remove('hidden');
      } else {
        sandhiBadge.classList.add('hidden');
      }
    }

    renderCanvasGeometry(count, syllables, refProfile);
    updateTimelineProgressUI(0, RECORDING_DURATION_SEC, false);

    if (window.PronunciationEngine) {
      window.PronunciationEngine.setRevealState(1);
    }
  }

  function renderSyllableScenario(count, customData) {
    if (customData) {
      displayWord(customData);
    } else if (hskDeck && hskDeck.length > 0) {
      const match = hskDeck.find(w => {
        const fname = (w.audio || '').split('/').pop();
        const p = toneProfiles ? toneProfiles[fname] : null;
        return p && p.syllables && p.syllables.length === count;
      });
      if (match) displayWord(match);
      else pickRandomWord();
    }
  }

  async function startRealRecording() {
    ensureAudioUnlocked();
    stopGlobalAudio();
    stopUserPlayback();
    if (typeof navigator !== 'undefined' && navigator.audioSession) {
      try {
        navigator.audioSession.type = 'play-and-record';
      } catch (_) {}
    }

    if (!audioPipeline) {
      audioPipeline = new AudioPipeline({
        onVolumeChange: (rms) => {
          const pulsePath = document.querySelector('#engine-live-waveform-group path');
          if (pulsePath) {
            const stroke = Math.min(10, Math.max(2, 2 + rms * 35));
            pulsePath.setAttribute('stroke-width', stroke.toFixed(1));
          }
        }
      });
    }

    try {
      await audioPipeline.start();
      countdownSeconds = RECORDING_DURATION_SEC;
      if (window.PronunciationEngine) {
        window.PronunciationEngine.setRevealState(2);
      }

      const startTime = performance.now();
      if (countdownInterval) clearInterval(countdownInterval);
      const totalMs = RECORDING_DURATION_SEC * 1000;

      countdownInterval = setInterval(() => {
        const elapsedMs = performance.now() - startTime;
        const remainingSec = Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000));
        const countValEl = document.getElementById('record-countdown-val');
        if (countValEl) countValEl.textContent = remainingSec;

        if (elapsedMs >= totalMs) {
          clearInterval(countdownInterval);
          countdownInterval = null;
          stopRealRecordingAndCalculate();
        }
      }, 50);
    } catch (err) {
      console.error('[AudioEngine] Microphone access failed:', err);
      alert('Microphone access denied or audio device unavailable: ' + err.message);
      if (window.PronunciationEngine) {
        window.PronunciationEngine.setRevealState(1);
      }
    }
  }

  async function stopRealRecordingAndCalculate() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }

    if (!audioPipeline || !audioPipeline.isRecording) {
      if (window.PronunciationEngine) {
        window.PronunciationEngine.setRevealState(currentTargetWord && lastProcessedResult ? 4 : 1);
      }
      return;
    }

    if (recordBtn) {
      recordBtn.innerHTML = `
        <span class="material-symbols-outlined text-base animate-spin">progress_activity</span>
        <span class="font-speed font-black italic text-base sm:text-xl uppercase tracking-tight">Analyzing pitch…</span>
      `;
    }

    try {
      const currentWord = currentTargetWord || (hskDeck && hskDeck[0]) || { hanzi: '你好', pinyin: 'nǐ hǎo' };
      const refProfile = getActiveProfileForWord(currentWord);

      const result = await audioPipeline.stopAndProcess({
        word: currentWord.hanzi_simp || currentWord.hanzi,
        pinyin: currentWord.pinyin,
        referenceProfile: refProfile,
      });

      lastProcessedResult = result;
      lastUserAudioBlob = result.userAudioBlob;
      lastDurationSec = Number.isFinite(result.duration) ? result.duration : RECORDING_DURATION_SEC;
      selectedSyllableIdx = 0;

      if (activeUserAudio) {
        activeUserAudio.pause();
        activeUserAudio = null;
      }
      if (lastUserAudioUrl) {
        try { URL.revokeObjectURL(lastUserAudioUrl); } catch (_) {}
        lastUserAudioUrl = null;
      }

      practicedCount++;
      if (practiceCounter) {
        practiceCounter.textContent = `Practiced: ${practicedCount}`;
      }

      updateTimelineProgressUI(0, lastDurationSec, Boolean(lastUserAudioBlob));
      renderUserPitchOnChart(result, currentWord, refProfile);
      renderDynamicAudit(result, currentWord, refProfile);

      if (window.PronunciationEngine) {
        window.PronunciationEngine.setRevealState(4);
      }
    } catch (err) {
      console.error('[AudioEngine] Processing error:', err);
      alert('Audio processing error: ' + err.message);
      if (window.PronunciationEngine) {
        window.PronunciationEngine.setRevealState(1);
      }
    }
  }

  function renderTargetRibbonFromProfile(refProfile, count) {
    const ribbonsContainer = document.getElementById('pitch-target-ribbons');
    if (!ribbonsContainer || !refProfile) return;

    const spans = getSyllableSpans(count);
    let ribbonsHtml = '';
    const hasSylNorm = refProfile.syllables && refProfile.syllables.some(s => s.f0_norm && s.f0_norm.length >= 2);
    const hasFullNorm = refProfile.f0_norm && refProfile.f0_norm.length >= 2;
    if (!hasSylNorm && !hasFullNorm) return;

    spans.forEach((span, i) => {
      let sylF0 = null;
      if (refProfile.syllables && refProfile.syllables[i]?.f0_norm && refProfile.syllables[i].f0_norm.length >= 2) {
        sylF0 = refProfile.syllables[i].f0_norm;
      } else if (hasFullNorm) {
        const f0 = refProfile.f0_norm;
        const ptsPerSyl = Math.floor(f0.length / spans.length);
        const sliceStart = i * ptsPerSyl;
        const sliceEnd = i === spans.length - 1 ? f0.length : (i + 1) * ptsPerSyl;
        sylF0 = f0.slice(sliceStart, sliceEnd);
      }
      if (!sylF0 || sylF0.length < 2) return;

      const upperPts = [];
      const lowerPts = [];
      for (let k = 0; k < sylF0.length; k++) {
        const x = span.xMin + (k / (sylF0.length - 1)) * (span.xMax - span.xMin);
        const st = sylF0[k];
        const centerY = Math.max(16, Math.min(136, 78 - st * 16));
        upperPts.push(`${x.toFixed(1)},${Math.max(8, centerY - 10.35).toFixed(1)}`);
        lowerPts.unshift(`${x.toFixed(1)},${Math.min(142, centerY + 10.35).toFixed(1)}`);
      }
      const allPts = upperPts.concat(lowerPts).join(' ');
      const activeRibbonClass = (lastProcessedResult && i === selectedSyllableIdx)
        ? 'fill-badge-cobalt/35 stroke-badge-cobalt stroke-[2.5] stroke-dasharray-[3,3] transition-all duration-150'
        : 'fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3] transition-all duration-150';
      ribbonsHtml += `<polygon id="${span.id}" points="${allPts}" class="${activeRibbonClass}" />`;
    });

    if (ribbonsHtml) {
      ribbonsContainer.innerHTML = ribbonsHtml;
    }
  }

  function renderUserPitchOnChart(result, wordData, refProfile) {
    const count = (wordData.syllables ? wordData.syllables.length : (wordData.syllablesCount || result.syllables.length)) || 1;
    const pathsContainer = document.getElementById('user-pitch-paths-container');
    const pointsContainer = document.getElementById('user-pitch-points-container');
    if (!pathsContainer || !pointsContainer) return;

    let pathHtml = '';
    let pointsHtml = '';
    const syllableSpans = getSyllableSpans(count);

    result.syllables.forEach((syl, i) => {
      const span = syllableSpans[i] || syllableSpans[syllableSpans.length - 1];
      if (!syl.userF0Norm || syl.userF0Norm.length < 3) {
        return;
      }

      const pts = [];
      const numPts = syl.userF0Norm.length;
      for (let k = 0; k < numPts; k++) {
        const x = span.xMin + (k / (numPts - 1)) * (span.xMax - span.xMin);
        const st = syl.userF0Norm[k];
        const y = Math.max(12, Math.min(140, 78 - st * 16));
        pts.push({ x, y, st });
      }

      let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
      for (let j = 1; j < pts.length; j++) {
        const prev = pts[j - 1];
        const curr = pts[j];
        const mx = (prev.x + curr.x) / 2;
        const my = (prev.y + curr.y) / 2;
        d += ` Q ${prev.x.toFixed(1)},${prev.y.toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`;
      }
      d += ` L ${pts[pts.length - 1].x.toFixed(1)},${pts[pts.length - 1].y.toFixed(1)}`;

      pathHtml += `<path id="${span.pathId}" d="${d}" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />`;

      const circleIndices = [0, Math.floor(numPts * 0.25), Math.floor(numPts * 0.5), Math.floor(numPts * 0.75), numPts - 1];
      let sylPointsHtml = `<g id="${span.ptsId}">`;
      circleIndices.forEach(idx => {
        const pt = pts[idx];
        if (!pt) return;
        let color = '#10B981';
        if (syl.referenceF0Norm && syl.referenceF0Norm.length > 0) {
          const t = numPts > 1 ? idx / (numPts - 1) : 0;
          const refIdx = Math.min(syl.referenceF0Norm.length - 1, Math.round(t * (syl.referenceF0Norm.length - 1)));
          const refVal = syl.referenceF0Norm[refIdx];
          if (refVal !== undefined && refVal !== null) {
            const refY = Math.max(12, Math.min(140, 78 - refVal * 16));
            const diff = Math.abs(pt.y - refY);
            if (diff > 35) color = '#FF5C1C';
            else if (diff > 20) color = '#FBBF24';
          }
        }
        sylPointsHtml += `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="4.5" fill="${color}" stroke="#000" stroke-width="2" />`;
      });
      sylPointsHtml += `</g>`;
      pointsHtml += sylPointsHtml;
    });

    pathsContainer.innerHTML = pathHtml;
    pointsContainer.innerHTML = pointsHtml;
  }

  function getPillToneStyle(score) {
    if (score >= 80) {
      return {
        pill: 'bg-emerald-50 border-emerald-500 text-emerald-950',
        mark: '✓'
      };
    }
    if (score >= 60) {
      return {
        pill: 'bg-amber-50 border-amber-500 text-amber-950',
        mark: '!'
      };
    }
    return {
      pill: 'bg-rose-50 border-rose-500 text-rose-950',
      mark: '!'
    };
  }

  function getCellSurfaceClass(score) {
    if (score >= 85) return 'bg-emerald-50/80 text-emerald-950';
    if (score >= 65) return 'bg-amber-50/80 text-amber-950';
    return 'bg-rose-50/80 text-rose-950';
  }

  function getScoreColorClass(score) {
    if (score >= 85) return 'text-emerald-700';
    if (score >= 65) return 'text-amber-700';
    return 'text-rose-700';
  }

  function selectAuditSyllable(idx) {
    if (!lastProcessedResult || !Array.isArray(lastProcessedResult.syllables) || lastProcessedResult.syllables.length === 0) return;
    selectedSyllableIdx = Math.max(0, Math.min(idx, lastProcessedResult.syllables.length - 1));

    const pillsWrap = document.getElementById('phonetic-audit-pills');
    const detailWrap = document.getElementById('phonetic-syllable-detail');

    if (pillsWrap) {
      pillsWrap.querySelectorAll('button[data-syl-idx]').forEach(btn => {
        const bIdx = parseInt(btn.dataset.sylIdx, 10);
        const active = bIdx === selectedSyllableIdx;
        btn.classList.toggle('ring-2', active);
        btn.classList.toggle('ring-black', active);
        btn.classList.toggle('shadow-hard-black', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }

    const spans = getSyllableSpans(lastProcessedResult.syllables.length);
    spans.forEach((span, i) => {
      const poly = document.getElementById(span.id);
      if (!poly) return;
      poly.setAttribute(
        'class',
        i === selectedSyllableIdx
          ? 'fill-badge-cobalt/35 stroke-badge-cobalt stroke-[2.5] stroke-dasharray-[3,3] transition-all duration-150'
          : 'fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3] transition-all duration-150'
      );
    });

    if (!detailWrap) return;
    const syl = lastProcessedResult.syllables[selectedSyllableIdx];
    const init = syl.initial || { symbol: '', score: 90, diagnosticCode: 'PASS_SONORANT', votMs: 0 };
    const fin = syl.final || { symbol: '', score: 88, diagnosticCode: 'PASS_GENERIC', f1Hz: 0, f2Hz: 0 };
    const toneScore = syl.toneScore !== undefined ? syl.toneScore : (syl.toneResult?.score ?? 85);
    const toneDtw = syl.dtwScore !== undefined ? syl.dtwScore : 90;

    const initDesc = getInitialPlain(init);
    const toneDesc = getTonePlain(syl);
    const finDesc = getFinalPlain(fin);

    const initMetric = init.cogHz
      ? `CoG ${init.cogHz} Hz`
      : (init.votMs !== undefined ? `VOT ${init.votMs} ms` : 'Voiced onset');
    const toneMetric = `Shape match ${toneDtw}%`;
    const finMetric = (fin.f1Hz && fin.f2Hz) ? `F1 ${fin.f1Hz} Hz • F2 ${fin.f2Hz} Hz` : 'Formants nominal';

    detailWrap.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div class="rounded-xl p-2.5 ${getCellSurfaceClass(init.score)}">
          <div class="flex items-center justify-between gap-2 mb-1">
            <span class="font-mono text-[11px] font-black text-black/75">Start (${escapeHtml(init.symbol || 'none')})</span>
            <span class="font-speed font-black text-sm ${getScoreColorClass(init.score)}">${init.score}%</span>
          </div>
          <p class="font-mono text-xs font-bold leading-snug text-black/85">${escapeHtml(initDesc)}</p>
        </div>

        <div class="rounded-xl p-2.5 ${getCellSurfaceClass(toneScore)}">
          <div class="flex items-center justify-between gap-2 mb-1">
            <span class="font-mono text-[11px] font-black text-black/75">Tone (T${Number(syl.tone) || 1})</span>
            <span class="font-speed font-black text-sm ${getScoreColorClass(toneScore)}">${toneScore}%</span>
          </div>
          <p class="font-mono text-xs font-bold leading-snug text-black/85">${escapeHtml(toneDesc)}</p>
        </div>

        <div class="rounded-xl p-2.5 ${getCellSurfaceClass(fin.score)}">
          <div class="flex items-center justify-between gap-2 mb-1">
            <span class="font-mono text-[11px] font-black text-black/75">Vowel (${escapeHtml(fin.symbol || '—')})</span>
            <span class="font-speed font-black text-sm ${getScoreColorClass(fin.score)}">${fin.score}%</span>
          </div>
          <p class="font-mono text-xs font-bold leading-snug text-black/85">${escapeHtml(finDesc)}</p>
        </div>
      </div>

      <details class="mt-2 pt-1.5 border-t border-black/10 group">
        <summary class="cursor-pointer select-none font-mono text-[11px] font-bold text-black/60 hover:text-black list-none flex items-center gap-1 min-h-[44px]">
          <span class="material-symbols-outlined text-sm transition-transform group-open:rotate-90">chevron_right</span>
          <span>Acoustic Metrics</span>
        </summary>
        <div class="mt-1.5 grid grid-cols-3 gap-2 font-mono text-[11px] text-black/70 bg-slate-50 rounded-xl p-2">
          <div><strong class="block text-black">Consonant</strong>${escapeHtml(initMetric)}</div>
          <div><strong class="block text-black">Pitch Curve</strong>${escapeHtml(toneMetric)}</div>
          <div><strong class="block text-black">Resonance</strong>${escapeHtml(finMetric)}</div>
        </div>
      </details>
    `;
  }

  function renderDynamicAudit(result, wordData, refProfile) {
    const pillsWrap = document.getElementById('phonetic-audit-pills');
    const detailWrap = document.getElementById('phonetic-syllable-detail');
    const coachText = document.getElementById('coach-advice-text');
    const priorityHeader = document.getElementById('coach-priority-header');

    if (pillsWrap && result && Array.isArray(result.syllables)) {
      pillsWrap.innerHTML = '';
      result.syllables.forEach((syl, i) => {
        const compositeScore = syl.finalScore !== undefined ? syl.finalScore : 88;
        const style = getPillToneStyle(compositeScore);
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.dataset.sylIdx = String(i);
        pill.setAttribute('role', 'tab');
        pill.setAttribute('aria-selected', i === selectedSyllableIdx ? 'true' : 'false');
        pill.className = `min-h-[44px] px-3.5 py-2 rounded-xl border-2 font-mono text-xs sm:text-sm font-black flex items-center gap-2 cursor-pointer transition-all active-collapse ${style.pill} ${i === selectedSyllableIdx ? 'ring-2 ring-black shadow-hard-black' : ''}`;
        pill.innerHTML = `<span>${escapeHtml(syl.syllable || `S${i + 1}`)}</span><span class="font-speed italic">${compositeScore}%</span><span>${style.mark}</span>`;
        pill.addEventListener('click', () => selectAuditSyllable(i));
        pillsWrap.appendChild(pill);
      });

      selectAuditSyllable(selectedSyllableIdx);
    } else if (detailWrap) {
      detailWrap.innerHTML = '';
    }

    if (priorityHeader) {
      const p = result?.coachingPriority;
      if (p === 'TONE') {
        priorityHeader.textContent = 'Adjust Pitch Direction';
      } else if (p === 'FINAL') {
        priorityHeader.textContent = 'Shape Your Vowel';
      } else if (p === 'INITIAL') {
        priorityHeader.textContent = 'Check Starting Sound';
      } else {
        priorityHeader.textContent = 'Great Tone Match!';
      }
    }

    if (coachText) {
      coachText.textContent = humanizeCoachAdviceText(result?.coachingAdvice, wordData, result);
    }

    if (coachPlayBtn) {
      const hasBlob = Boolean(lastUserAudioBlob);
      coachPlayBtn.classList.toggle('opacity-40', !hasBlob);
      coachPlayBtn.classList.toggle('pointer-events-none', !hasBlob);
      coachPlayBtn.classList.toggle('cursor-not-allowed', !hasBlob);
    }
  }

  function activateWordIndex(index) {
    if (!hskDeck || hskDeck.length === 0) return;
    const safeIdx = Math.max(0, Math.min(index, hskDeck.length - 1));
    displayWord(hskDeck[safeIdx]);
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      stopGlobalAudio();
      stopUserPlayback();
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      if (audioPipeline && audioPipeline.isRecording) {
        audioPipeline.recorder.stop();
      }
      pickRandomWord();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      stopGlobalAudio();
      stopUserPlayback();
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      if (audioPipeline && audioPipeline.isRecording) {
        audioPipeline.recorder.stop();
      }
      if (currentTargetWord) {
        displayWord(currentTargetWord);
      } else {
        pickRandomWord();
      }
    });
  }

  const deckFilterBtns = document.querySelectorAll('#engine-deck-filter-group button');
  function updateDeckFilterBtnsUI() {
    deckFilterBtns.forEach(b => {
      const isSel = (b.dataset.filter || 'all') === currentDeckFilter;
      if (isSel) {
        b.className = 'flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-black text-white border-2 border-black font-mono text-xs font-black uppercase shadow-hard-black active-collapse cursor-pointer transition-all';
      } else {
        b.className = 'flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-black border-2 border-black font-mono text-xs font-black uppercase active-collapse cursor-pointer transition-all';
      }
    });
  }
  deckFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentDeckFilter = btn.dataset.filter || 'all';
      updateDeckFilterBtnsUI();
      initShuffleBag();
      pickRandomWord();
    });
  });
  updateDeckFilterBtnsUI();

  function playCurrentNativeAudio() {
    const currentWord = currentTargetWord || (hskDeck && hskDeck[0]);
    if (!currentWord) return;
    stopUserPlayback();

    let audioSrc = currentWord.audio;
    let targetSpeed = 1.0;

    if (audioTrackMode === 'tts') {
      const origFname = (currentWord.audio || '').split('/').pop();
      const ttsFname = origFname.replace('hskstory-', 'tts-');
      audioSrc = `audio/hsk_tts/${ttsFname}`;
      targetSpeed = 1.0;
    } else {
      audioSrc = currentWord.audio;
      targetSpeed = (humanPlaybackSpeed === 0.8 || humanPlaybackSpeed === 0.65) ? 0.65 : humanPlaybackSpeed;
    }

    if (audioSrc) {
      if (playNativeBtn) {
        playNativeBtn.classList.remove('bg-black');
        playNativeBtn.classList.add('bg-badge-cobalt', 'text-white');
      }
      if (coachNativeBtn) {
        coachNativeBtn.classList.remove('bg-white', 'text-black');
        coachNativeBtn.classList.add('bg-badge-cobalt', 'text-white');
      }
      playAudio(`${import.meta.env.BASE_URL}${audioSrc}`, {
        playbackRate: targetSpeed,
        onEnded: () => {
          if (playNativeBtn) {
            playNativeBtn.classList.remove('bg-badge-cobalt');
            playNativeBtn.classList.add('bg-black', 'text-white');
          }
          if (coachNativeBtn) {
            coachNativeBtn.classList.remove('bg-badge-cobalt', 'text-white');
            coachNativeBtn.classList.add('bg-white', 'text-black');
          }
        }
      });
    }
  }

  function updateAudioTrackUI() {
    const ttsBtn = document.getElementById('audio-track-tts-btn');
    const humanBtn = document.getElementById('audio-track-human-btn');
    const humanSpeedControls = document.getElementById('human-speed-controls');
    const speed1xBtn = document.getElementById('audio-speed-1x-btn');
    const speed065xBtn = document.getElementById('audio-speed-065x-btn');

    if (ttsBtn && humanBtn) {
      if (audioTrackMode === 'tts') {
        ttsBtn.className = 'flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-mono font-black transition-all bg-black text-white border-2 border-black shadow-hard-black cursor-pointer';
        humanBtn.className = 'flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-mono font-black transition-all bg-white text-black border-2 border-black hover:bg-slate-50 cursor-pointer';
        if (humanSpeedControls) humanSpeedControls.classList.add('hidden');
      } else {
        ttsBtn.className = 'flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-mono font-black transition-all bg-white text-black border-2 border-black hover:bg-slate-50 cursor-pointer';
        humanBtn.className = 'flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-mono font-black transition-all bg-black text-white border-2 border-black shadow-hard-black cursor-pointer';
        if (humanSpeedControls) humanSpeedControls.classList.remove('hidden');
      }
    }

    const isSlow = (humanPlaybackSpeed === 0.65 || humanPlaybackSpeed === 0.8);
    if (speed1xBtn && speed065xBtn) {
      if (isSlow) {
        speed1xBtn.className = 'flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-mono font-black transition-all bg-white text-black border-2 border-black hover:bg-slate-50 cursor-pointer';
        speed065xBtn.className = 'flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-mono font-black transition-all bg-black text-white border-2 border-black shadow-hard-black cursor-pointer';
      } else {
        speed1xBtn.className = 'flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-mono font-black transition-all bg-black text-white border-2 border-black shadow-hard-black cursor-pointer';
        speed065xBtn.className = 'flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-mono font-black transition-all bg-white text-black border-2 border-black hover:bg-slate-50 cursor-pointer';
      }
    }

    updateEngineSettingsSummary();
  }

  function reevaluateUtteranceAgainstProfile(result, wordData, profile) {
    if (!result || !result.syllables) return;
    stopUserPlayback();

    result.syllables.forEach((syl, i) => {
      let refContour = null;
      if (profile?.syllables?.[i]?.f0_norm && profile.syllables[i].f0_norm.length >= 2) {
        refContour = PitchTracker.resampleContour(profile.syllables[i].f0_norm, 30);
      } else if (profile?.f0_norm && profile.f0_norm.length >= 2) {
        const fullRef = profile.f0_norm;
        const ptsPerSyl = Math.floor(fullRef.length / result.syllables.length);
        const sliceStart = i * ptsPerSyl;
        const sliceEnd = i === result.syllables.length - 1 ? fullRef.length : (i + 1) * ptsPerSyl;
        refContour = PitchTracker.resampleContour(fullRef.slice(sliceStart, sliceEnd), 30);
      }
      if (!refContour || refContour.length < 2) {
        refContour = DTWComparator.getCanonicalContour(syl.tone, 30);
      }

      syl.referenceF0Norm = refContour;
      if (syl.userF0Norm && syl.userF0Norm.length >= 3) {
        const dtwResult = DTWComparator.compare(syl.userF0Norm, refContour);
        const evalResult = ToneClassifier.evaluate(syl.userF0Norm, syl.tone, syl.syllable);
        syl.dtwScore = dtwResult.score;
        syl.slopeScore = evalResult.score;
        syl.toneScore = Math.round(0.60 * dtwResult.score + 0.40 * evalResult.score);
        syl.status = evalResult.status;
        syl.comment = evalResult.comment;
        syl.diagnosticCode = evalResult.diagnosticCode;
        syl.advice = evalResult.advice;

        if (syl.toneResult) {
          syl.toneResult.score = syl.toneScore;
          syl.toneResult.dtwScore = dtwResult.score;
          syl.toneResult.slopeScore = evalResult.score;
          syl.toneResult.sublabel = evalResult.comment || '✓ Exact';
          syl.toneResult.diagnosticCode = evalResult.diagnosticCode;
          syl.toneResult.tier = syl.toneScore >= 85 ? 'EMERALD' : (syl.toneScore >= 65 ? 'AMBER' : 'ROSE');
          syl.toneResult.advice = evalResult.advice || '';
        }

        const initialScore = syl.initial?.score !== undefined ? syl.initial.score : 90;
        const finalScore = syl.final?.score !== undefined ? syl.final.score : 85;
        syl.finalScore = Math.round(0.50 * syl.toneScore + 0.30 * finalScore + 0.20 * initialScore);
        syl.overallScore = syl.finalScore;

        if (syl.toneScore < 65) {
          syl.coachingPriority = 'TONE';
          syl.coachingAdvice = evalResult.advice || `Tone ${syl.tone} pitch contour shifted. Adjust pitch direction.`;
        } else if (finalScore < 65) {
          syl.coachingPriority = 'FINAL';
          syl.coachingAdvice = syl.final?.advice || 'Open or shape your vowel clearly.';
        } else if (initialScore < 65) {
          syl.coachingPriority = 'INITIAL';
          syl.coachingAdvice = syl.initial?.advice || 'Check breath release on the starting consonant.';
        } else if (syl.toneScore < 85) {
          syl.coachingPriority = 'TONE';
          syl.coachingAdvice = evalResult.advice || 'Good tone contour. Keep pitch steady.';
        } else if (finalScore < 85) {
          syl.coachingPriority = 'FINAL';
          syl.coachingAdvice = syl.final?.advice || 'Almost clear vowel. Fine-tune lip and jaw shape.';
        } else if (initialScore < 85) {
          syl.coachingPriority = 'INITIAL';
          syl.coachingAdvice = syl.initial?.advice || 'Good starting consonant.';
        } else {
          syl.coachingPriority = 'PERFECT';
          syl.coachingAdvice = 'Everything sounded clear.';
        }
      }
    });

    result.overallScore = result.syllables.length > 0
      ? Math.round(result.syllables.reduce((acc, s) => acc + s.finalScore, 0) / result.syllables.length)
      : 0;

    let utterancePriority = 'PERFECT';
    let primaryAdvice = '';
    const criticalTone = result.syllables.find(s => s.toneScore < 65);
    if (criticalTone) {
      utterancePriority = 'TONE';
      primaryAdvice = criticalTone.advice || criticalTone.coachingAdvice;
    } else {
      const criticalFinal = result.syllables.find(s => s.final?.score < 65);
      if (criticalFinal) {
        utterancePriority = 'FINAL';
        primaryAdvice = criticalFinal.final?.advice || criticalFinal.coachingAdvice;
      } else {
        const criticalInit = result.syllables.find(s => s.initial?.score < 65);
        if (criticalInit) {
          utterancePriority = 'INITIAL';
          primaryAdvice = criticalInit.initial?.advice || criticalInit.coachingAdvice;
        } else {
          const amberSyl = result.syllables.find(s => s.finalScore < 85 && s.coachingAdvice);
          if (amberSyl) {
            utterancePriority = amberSyl.coachingPriority;
            primaryAdvice = amberSyl.coachingAdvice;
          }
        }
      }
    }
    result.coachingPriority = utterancePriority;
    result.coachingAdvice = primaryAdvice;

    selectedSyllableIdx = Math.max(0, Math.min(selectedSyllableIdx, result.syllables.length - 1));
    renderUserPitchOnChart(result, wordData, profile);
    renderDynamicAudit(result, wordData, profile);
  }

  function setAudioTrackMode(mode) {
    audioTrackMode = mode === 'human' ? 'human' : 'tts';
    localStorage.setItem('tone_trainer_track_mode', audioTrackMode);
    updateAudioTrackUI();

    if (currentTargetWord) {
      const activeProf = getActiveProfileForWord(currentTargetWord);
      renderTargetRibbonFromProfile(activeProf, currentSyllableCount);

      if (lastProcessedResult && lastProcessedResult.syllables) {
        reevaluateUtteranceAgainstProfile(lastProcessedResult, currentTargetWord, activeProf);
      }
    }
  }

  function setHumanPlaybackSpeed(speed) {
    humanPlaybackSpeed = speed;
    localStorage.setItem('tone_trainer_human_speed', speed.toString());
    updateAudioTrackUI();
  }

  const trackTtsBtn = document.getElementById('audio-track-tts-btn');
  const trackHumanBtn = document.getElementById('audio-track-human-btn');
  const speed1xBtn = document.getElementById('audio-speed-1x-btn');
  const speed065xBtn = document.getElementById('audio-speed-065x-btn');

  if (trackTtsBtn) trackTtsBtn.addEventListener('click', () => setAudioTrackMode('tts'));
  if (trackHumanBtn) trackHumanBtn.addEventListener('click', () => setAudioTrackMode('human'));
  if (speed1xBtn) speed1xBtn.addEventListener('click', () => setHumanPlaybackSpeed(1.0));
  if (speed065xBtn) speed065xBtn.addEventListener('click', () => setHumanPlaybackSpeed(0.65));

  updateAudioTrackUI();

  if (playNativeBtn) playNativeBtn.addEventListener('click', playCurrentNativeAudio);
  if (coachNativeBtn) coachNativeBtn.addEventListener('click', playCurrentNativeAudio);
  if (hanziDisplay) hanziDisplay.addEventListener('click', playCurrentNativeAudio);
  if (pinyinDisplay) pinyinDisplay.addEventListener('click', playCurrentNativeAudio);

  if (coachPlayBtn) {
    coachPlayBtn.addEventListener('click', () => {
      if (!lastUserAudioBlob) return;
      stopGlobalAudio();

      if (activeUserAudio && !activeUserAudio.paused) {
        stopUserPlayback();
        return;
      }

      if (!lastUserAudioUrl) {
        lastUserAudioUrl = URL.createObjectURL(lastUserAudioBlob);
      }
      if (!activeUserAudio || activeUserAudio.src !== lastUserAudioUrl) {
        activeUserAudio = new Audio(lastUserAudioUrl);
      }
      activeUserAudio.currentTime = 0;

      const stepFrame = () => {
        if (!activeUserAudio || activeUserAudio.paused) return;
        const total = (Number.isFinite(activeUserAudio.duration) && activeUserAudio.duration > 0)
          ? activeUserAudio.duration
          : getActiveDurationSec();
        const frac = total > 0 ? Math.min(1, activeUserAudio.currentTime / total) : 0;
        updateTimelineProgressUI(frac, total, true);
        userAudioRafId = requestAnimationFrame(stepFrame);
      };

      activeUserAudio.onended = () => {
        stopUserPlayback({ resetCursor: false });
        updateTimelineProgressUI(1, getActiveDurationSec(), true);
      };
      activeUserAudio.onerror = () => {
        stopUserPlayback();
      };

      setCoachPlayButtonState(true);
      updateTimelineProgressUI(0, getActiveDurationSec(), true);
      activeUserAudio.play()
        .then(() => {
          userAudioRafId = requestAnimationFrame(stepFrame);
        })
        .catch(() => stopUserPlayback());
    });
  }

  if (recordBtn) {
    recordBtn.addEventListener('click', () => {
      if (currentEngineState === 2) {
        stopRealRecordingAndCalculate();
      } else {
        startRealRecording();
      }
    });
  }

  window.PronunciationEngine = {
    setRevealState(state) {
      currentEngineState = state;
      if (state !== 2 && countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }

      const userTrack = document.getElementById('user-voice-track-group');
      const waveform = document.getElementById('engine-live-waveform-group');
      const auditSec = document.getElementById('phonetic-audit-section');
      const coachCard = document.getElementById('articulatory-coach-card');
      const timelineWrap = document.getElementById('pitch-timeline-wrap');
      const state1Hint = document.getElementById('engine-state1-hint');
      const cursor = document.getElementById('pitch-playback-cursor');

      if (state === 1) {
        if (userTrack) userTrack.classList.add('hidden');
        if (waveform) waveform.classList.add('hidden');
        if (auditSec) auditSec.classList.add('hidden');
        if (coachCard) coachCard.classList.add('hidden');
        if (timelineWrap) timelineWrap.classList.add('hidden');
        if (cursor) cursor.classList.add('hidden');
        if (state1Hint) state1Hint.classList.remove('hidden');
        if (recordBtn) {
          recordBtn.className = 'flex-1 min-h-[52px] py-3 sm:py-3.5 px-4 sm:px-6 bg-badge-tangerine text-white hover:bg-[#ff4800] border-[3px] border-black rounded-2xl shadow-hard-black flex items-center justify-center gap-2 sm:gap-3 active-collapse cursor-pointer';
          recordBtn.innerHTML = `
            <span class="w-3.5 h-3.5 rounded-full bg-white animate-pulse border border-black shrink-0"></span>
            <span class="font-speed font-black italic text-base sm:text-xl uppercase tracking-tight">Record</span>
            <span class="font-mono text-[10px] bg-black text-white px-1.5 py-0.5 rounded hidden sm:inline">[SPACE]</span>
          `;
        }
      } else if (state === 2) {
        if (userTrack) userTrack.classList.add('hidden');
        if (waveform) waveform.classList.remove('hidden');
        if (auditSec) auditSec.classList.add('hidden');
        if (coachCard) coachCard.classList.add('hidden');
        if (timelineWrap) timelineWrap.classList.add('hidden');
        if (cursor) cursor.classList.add('hidden');
        if (state1Hint) state1Hint.classList.add('hidden');
        if (recordBtn) {
          recordBtn.className = 'flex-1 min-h-[52px] py-3 sm:py-3.5 px-4 sm:px-6 bg-black text-badge-tangerine border-[3px] border-black rounded-2xl shadow-hard-black flex items-center justify-center gap-2 sm:gap-3 active-collapse cursor-pointer';
          recordBtn.innerHTML = `
            <span class="w-3.5 h-3.5 rounded-full bg-badge-tangerine animate-ping border border-black shrink-0"></span>
            <span class="font-speed font-black italic text-base sm:text-xl uppercase tracking-tight">Stop Recording (<span id="record-countdown-val">${countdownSeconds}</span>s)</span>
          `;
        }
      } else {
        if (userTrack) userTrack.classList.remove('hidden');
        if (waveform) waveform.classList.add('hidden');
        if (state1Hint) state1Hint.classList.add('hidden');
        if (auditSec) auditSec.classList.remove('hidden');
        if (coachCard) coachCard.classList.remove('hidden');
        if (timelineWrap) timelineWrap.classList.remove('hidden');
        if (recordBtn) {
          recordBtn.className = 'flex-1 min-h-[52px] py-3 sm:py-3.5 px-4 sm:px-6 bg-badge-tangerine text-white hover:bg-[#ff4800] border-[3px] border-black rounded-2xl shadow-hard-black flex items-center justify-center gap-2 sm:gap-3 active-collapse cursor-pointer';
          recordBtn.innerHTML = `
            <span class="w-3.5 h-3.5 rounded-full bg-white animate-pulse border border-black shrink-0"></span>
            <span class="font-speed font-black italic text-base sm:text-xl uppercase tracking-tight">Record Again</span>
            <span class="font-mono text-[10px] bg-black text-white px-1.5 py-0.5 rounded hidden sm:inline">[SPACE]</span>
          `;
        }
      }
    },

    initDeck(deck) {
      hskDeck = deck || [];
      initShuffleBag();
      pickRandomWord();
    },

    hasPickedWord() {
      return currentTargetWord !== null;
    },

    getCurrentWord() {
      return currentTargetWord;
    },

    pickRandomWord() {
      pickRandomWord();
    },

    displayWord(word) {
      displayWord(word);
    },

    setDeckFilter(filter) {
      currentDeckFilter = filter;
      updateDeckFilterBtnsUI();
      initShuffleBag();
      pickRandomWord();
    },

    setSyllableCount(count, customData) {
      renderSyllableScenario(count, customData);
      window.PronunciationEngine.setRevealState(1);
    },

    setTargetWord(wordData) {
      displayWord(wordData);
    },

    selectWordIndex(idx) {
      activateWordIndex(idx);
    },

    updateUserCurves({ pathS1, pathS2, pathS3, pathS4 }) {
      const updates = [
        ['user-pitch-path-s1', pathS1],
        ['user-pitch-path-s2', pathS2],
        ['user-pitch-path-s3', pathS3],
        ['user-pitch-path-s4', pathS4]
      ];
      updates.forEach(([id, path]) => {
        if (path) {
          const el = document.getElementById(id);
          if (el) el.setAttribute('d', path);
        }
      });
    },

    updateTargetRibbons({ pointsS1, pointsS2, pointsS3, pointsS4 }) {
      const updates = [
        ['target-ribbon-s1', pointsS1],
        ['target-ribbon-s2', pointsS2],
        ['target-ribbon-s3', pointsS3],
        ['target-ribbon-s4', pointsS4]
      ];
      updates.forEach(([id, pts]) => {
        if (pts) {
          const el = document.getElementById(id);
          if (el) el.setAttribute('points', pts);
        }
      });
    },

    setCoachingAdvice(adviceHtml) {
      const coachText = document.getElementById('coach-advice-text');
      if (coachText) coachText.textContent = stripHtmlTags(adviceHtml);
    },

    reset() {
      stopUserPlayback();
      closeSettingsModal();
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      if (audioPipeline && audioPipeline.isRecording) {
        audioPipeline.recorder.stop();
      }
      this.setRevealState(1);
    }
  };

  if (window.PronunciationEngine) {
    window.PronunciationEngine.setRevealState(1);
  }
}

// ========================================================
// WORD TRAINER CANVAS & BUILDER INITIALIZATION BRIDGE
// All Word Trainer UI state, validation & controls live in WordTrainerEngine
// ========================================================
function initWordTrainerCanvas() {
  if (window.WordTrainerEngine && typeof window.WordTrainerEngine.syncCanvasDimensions === 'function') {
    window.WordTrainerEngine.syncCanvasDimensions();
  }
}

function initComponentBuilderArena() {
  if (window.WordTrainerEngine && window.WordTrainerEngine.componentBuilder) {
    window.WordTrainerEngine.componentBuilder.initDom();
    if (window.WordTrainerEngine.activeWord) {
      window.WordTrainerEngine.componentBuilder.mountWord(window.WordTrainerEngine.activeWord);
    }
  }
}

if (typeof window !== 'undefined') {
  window.initWordTrainerCanvas = initWordTrainerCanvas;
  window.initComponentBuilderArena = initComponentBuilderArena;
}

// Initialize the app
setAppBackground('bg-canvas-acid');
setupButtons();
setupMenu();
setupAudioSourceToggles();
setupEnginePlaceholders();
init();
