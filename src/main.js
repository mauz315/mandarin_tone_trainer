import './style.css';
import 'keen-slider/keen-slider.min.css';
import KS from 'keen-slider';
import { AudioPipeline } from './audio/audioPipeline.js';

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

// Resilient Web Audio & HTMLAudio pipeline for mobile browsers
let audioCtx = null;
let currentWebAudioSource = null;
let htmlAudioInstance = typeof Audio !== 'undefined' ? new Audio() : null;
const audioBufferCache = new Map();

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

function setAppBackground(colorClass) {
  const app = document.getElementById('app');
  if (!app) return;
  app.className = app.className.replace(/bg-canvas-\w+/g, '');
  app.classList.add(colorClass);
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

    setTimeout(() => {
      document.querySelectorAll('.tone-btn').forEach(btn => btn.classList.remove('pop-up'));
    }, 1000);
  } catch (err) {
    console.error('Initialization error:', err);
  }
}

async function playAudio(customPath) {
  ensureAudioUnlocked();
  const audioPath = (typeof customPath === 'string' && customPath.trim().length > 0)
    ? customPath.trim()
    : (currentItem ? `${import.meta.env.BASE_URL}${currentItem.audio}` : null);

  console.log('[DEBUG] playAudio | customPath:', customPath, '| resolved:', audioPath, '| currentItem:', currentItem ? currentItem.audio : null);

  if (!audioPath) {
    console.warn('[DEBUG] playAudio: no audioPath, aborting');
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
        if (currentWebAudioSource) {
          try { currentWebAudioSource.stop(); } catch (_) {}
          currentWebAudioSource = null;
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
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
    console.log('[DEBUG] HTMLAudio .play() called for:', audioPath);
    const playPromise = htmlAudioInstance.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise
        .then(() => console.log('[DEBUG] HTMLAudio play resolved OK'))
        .catch(e => console.error('[DEBUG] HTMLAudio play rejected:', e));
    }
  } catch (e) {
    console.error('[DEBUG] HTMLAudio threw synchronously:', e);
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
            nextPendingItem = words[Math.floor(Math.random() * words.length)];
            if (nextPendingItem && nextPendingItem.audio) {
              preloadAudio(`${import.meta.env.BASE_URL}${nextPendingItem.audio}`);
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

  if (nextPendingItem) {
    currentItem = nextPendingItem;
    nextPendingItem = null;
  } else {
    currentItem = words[Math.floor(Math.random() * words.length)];
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
        const matchingWords = words.filter(w => w.initial === initialKey && w.ending_base === selectedFinal);

        if (matchingWords.length > 0) {
            selectionDisplay.innerHTML = `
                <span class="font-chinese font-black text-2xl sm:text-3xl text-black">${pinyinBase}</span>
                <span class="ml-2 font-mono text-[11px] sm:text-xs uppercase tracking-wider font-bold bg-black text-canvas-acid px-2 py-0.5 rounded border border-black shadow-sm">
                  ${matchingWords.length} TONE${matchingWords.length > 1 ? 'S' : ''}
                </span>
            `;
            mainPlayBtn.disabled = false;
        } else {
            selectionDisplay.innerHTML = `
                <span class="font-chinese text-2xl font-bold text-black/30 line-through">${pinyinBase}</span>
                <span class="ml-2 font-mono text-xs uppercase tracking-wider text-badge-red font-black">(No syllable)</span>
            `;
            mainPlayBtn.disabled = true;
        }
    }

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

            if (word) {
                btn.disabled = false;
                btn.classList.remove('opacity-30', 'cursor-not-allowed', 'pointer-events-none');
                btn.classList.add('hover:bg-white', 'cursor-pointer');
            } else {
                btn.disabled = true;
                btn.classList.add('opacity-30', 'cursor-not-allowed', 'pointer-events-none');
                btn.classList.remove('hover:bg-white', 'cursor-pointer');
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
                const audioPath = `${import.meta.env.BASE_URL}${word.audio}`;
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
    if (e.code === 'Space') {
      e.preventDefault();
      const recordBtn = document.getElementById('engine-record-btn');
      if (recordBtn) recordBtn.click();
    }
  }
});

// ========================================================
// ACOUSTIC PRONUNCIATION ENGINE: EXTENSIBLE UI HOOKS
// Aero Sky Ice & Racing Tangerine Palette | Multi-Syllable Scenarios (1, 2, 3)
// ========================================================
// ========================================================
// ACOUSTIC PRONUNCIATION ENGINE: EXTENSIBLE UI HOOKS
// Aero Sky Ice & Racing Tangerine Palette | Dynamic Multi-Syllable Scenarios (1-4 Syllables)
// ========================================================
function setupEnginePlaceholders() {
  const recordBtn = document.getElementById('engine-record-btn');
  const nextBtn = document.getElementById('engine-next-btn');
  const resetBtn = document.getElementById('engine-reset-btn');
  const coachPlayBtn = document.getElementById('coach-hear-user-btn');
  const stepCounter = document.getElementById('engine-step-counter');
  const practiceCounter = document.getElementById('engine-practice-counter');
  const playNativeBtn = document.getElementById('engine-play-native-btn');
  const hanziDisplay = document.getElementById('engine-hanzi-display');
  const pinyinDisplay = document.getElementById('engine-pinyin-display');

  let currentDeckFilter = 'all'; // 'all' | 'hsk1' | 'hsk2'
  let shuffleBag = [];
  let currentTargetWord = null;
  let practicedCount = 0;
  let currentSyllableCount = 1;

  let currentEngineState = 1; // 1: Priming (Record), 2: Capture (Recording...), 4: Audit (Try Again)
  let audioPipeline = null;
  let lastUserAudioBlob = null;
  let lastUserAudioUrl = null;
  const RECORDING_DURATION_SEC = 4;
  let countdownSeconds = RECORDING_DURATION_SEC;
  let countdownInterval = null;

  // Syllable horizontal SVG spans (ViewBox 0 0 660 155)
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

  // Mandarin Tone Sandhi & Formula Analyzer
  function getToneSandhiInfo(word, syllables) {
    const tones = (syllables || []).map(s => s.tone);
    const hanzi = (word.hanzi_simp || word.hanzi || '').trim();

    // Rule 1: Two consecutive 3rd tones -> 2nd + 3rd
    for (let i = 0; i < tones.length - 1; i++) {
      if (tones[i] === 3 && tones[i + 1] === 3) {
        return {
          title: 'TONE SANDHI: 3RD + 3RD ➔ 2ND + 3RD',
          pattern: 'Tone 3 + Tone 3 ➔ Tone 2 + Tone 3',
          subtext: 'First 3rd tone shifts to 2nd rising tone (35).',
          isSandhi: true,
        };
      }
    }

    // Rule 2: "一" (yī) Tone Sandhi
    if (hanzi.includes('一') && tones.length > 1) {
      const idx = hanzi.indexOf('一');
      if (idx < tones.length - 1) {
        const nextTone = tones[idx + 1];
        if (nextTone === 4) {
          return {
            title: 'TONE SANDHI: 一 (YĪ) BEFORE 4TH TONE',
            pattern: 'Tone 1 + Tone 4 ➔ Tone 2 + Tone 4',
            subtext: '一 shifts from Tone 1 to rising Tone 2 (yí).',
            isSandhi: true,
          };
        } else if ([1, 2, 3].includes(nextTone)) {
          return {
            title: `TONE SANDHI: 一 (YĪ) BEFORE TONE ${nextTone}`,
            pattern: `Tone 1 + Tone ${nextTone} ➔ Tone 4 + Tone ${nextTone}`,
            subtext: `一 shifts from Tone 1 to falling Tone 4 (yì).`,
            isSandhi: true,
          };
        }
      }
    }

    // Rule 3: "不" (bù) Tone Sandhi
    if (hanzi.includes('不') && tones.length > 1) {
      const idx = hanzi.indexOf('不');
      if (idx < tones.length - 1) {
        const nextTone = tones[idx + 1];
        if (nextTone === 4) {
          return {
            title: 'TONE SANDHI: 不 (BÙ) BEFORE 4TH TONE',
            pattern: 'Tone 4 + Tone 4 ➔ Tone 2 + Tone 4',
            subtext: '不 shifts from Tone 4 to rising Tone 2 (bú).',
            isSandhi: true,
          };
        }
      }
    }

    // Standard tone pattern (not sandhi)
    const toneNames = { 1: '55 High', 2: '35 Rising', 3: '214 Dip', 4: '51 Falling', 5: 'Neutral' };
    return {
      title: `TONE PROFILE: ${tones.map(t => 'T' + t).join(' + ')}`,
      pattern: tones.map(t => `T${t} (${toneNames[t] || 'Standard'})`).join(' • '),
      subtext: (syllables || []).map(s => s.syllable).join(' '),
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

  function initShuffleBag() {
    let pool = hskDeck;
    if (currentDeckFilter === 'hsk1') {
      pool = hskDeck.filter(w => (w.hsk_level || '').toLowerCase().includes('1'));
    } else if (currentDeckFilter === 'hsk2') {
      pool = hskDeck.filter(w => (w.hsk_level || '').toLowerCase().includes('2'));
    }
    if (!pool || pool.length === 0) pool = hskDeck;

    // Fisher-Yates shuffle
    shuffleBag = [...pool];
    for (let i = shuffleBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffleBag[i], shuffleBag[j]] = [shuffleBag[j], shuffleBag[i]];
    }

    if (stepCounter) {
      const label = currentDeckFilter === 'all' ? 'HSK 1+2' : currentDeckFilter.toUpperCase();
      stepCounter.textContent = `${label} • ${pool.length} WORDS`;
    }
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

  function renderCanvasGeometry(count, syllables, profile) {
    const dividersContainer = document.getElementById('pitch-syllable-dividers') || document.getElementById('pitch-canvas-dividers');
    const ribbonsContainer = document.getElementById('pitch-target-ribbons');
    const userPaths = document.getElementById('user-pitch-paths-container');
    const userPts = document.getElementById('user-pitch-points-container');

    // 1. Dividers and syllable labels
    if (dividersContainer) {
      const dividers = getDividers(count);
      const spans = getSyllableSpans(count);
      let divHtml = '';
      dividers.forEach(x => {
        divHtml += `<line x1="${x}" y1="8" x2="${x}" y2="148" stroke="#000000" stroke-width="1.5" stroke-dasharray="4,3" />`;
      });
      spans.forEach((span, i) => {
        const syl = syllables[i] || { syllable: '', tone: '?' };
        const midX = (span.xMin + span.xMax) / 2;
        divHtml += `<text x="${midX.toFixed(1)}" y="148" font-family="monospace" font-size="9" font-weight="900" text-anchor="middle" fill="#000000" letter-spacing="0.5">${syl.syllable || ''} (T${syl.tone})</text>`;
      });
      dividersContainer.innerHTML = divHtml;
    }

    // 2. Reference Target Corridor Ribbons
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
            const centerY = Math.max(16, Math.min(138, 78 - st * 16));
            upperPts.push(`${x.toFixed(1)},${Math.max(8, centerY - 10.35).toFixed(1)}`);
            lowerPts.unshift(`${x.toFixed(1)},${Math.min(146, centerY + 10.35).toFixed(1)}`);
          }
        } else {
          // Fallback canonical Chao ribbon
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
            lowerPts.unshift(`${x.toFixed(1)},${Math.min(146, centerY + 10.35).toFixed(1)}`);
          }
        }
        const allPts = upperPts.concat(lowerPts).join(' ');
        ribbonsHtml += `<polygon id="${span.id}" points="${allPts}" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />`;
      });
      ribbonsContainer.innerHTML = ribbonsHtml;
    }

    // 3. Clear user pitch paths & points
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
    currentTargetWord = word;
    lastProcessedResult = null; // Reset previous utterance for new word

    // Resolve reference tone profile using active track (TTS or Human Story)
    const refProfile = getActiveProfileForWord(word);

    // Determine syllables and count
    let syllables = [];
    if (refProfile && refProfile.syllables && refProfile.syllables.length > 0) {
      syllables = refProfile.syllables;
    } else {
      syllables = parsePinyinSyllables(word.pinyin);
    }
    const count = syllables.length;
    currentSyllableCount = count;

    // 1. Update Header Context Card
    const hanziEl = document.getElementById('engine-hanzi-display');
    const pinyinEl = document.getElementById('engine-pinyin-display');
    const glossEl = document.getElementById('engine-gloss-display');
    const stageLabel = document.getElementById('engine-stage-label');
    const arenaSubtitle = document.getElementById('engine-arena-subtitle');
    const syllableBadge = document.getElementById('engine-syllable-badge');

    if (hanziEl) hanziEl.textContent = word.hanzi_simp || word.hanzi || '';
    if (pinyinEl) pinyinEl.textContent = word.pinyin || '';
    if (glossEl) {
      const gloss = word.english || (word.translations ? word.translations.join(', ') : word.gloss || '');
      glossEl.textContent = `"${gloss}"`;
    }
    if (stageLabel) {
      const idxStr = word.word_index != null ? `#${String(word.word_index + 1).padStart(3, '0')}` : '';
      stageLabel.textContent = `[${word.hsk_level || 'HSK'} • ${idxStr || (word.hanzi_simp || word.hanzi)}]`;
    }
    if (arenaSubtitle) {
      const contourLabels = { 1: 'SINGLE-CONTOUR', 2: 'DUAL-CONTOUR', 3: 'TRIPLE-CONTOUR', 4: 'QUAD-CONTOUR' };
      arenaSubtitle.textContent = `CHAO 5-LEVEL ${contourLabels[count] || 'MULTI-CONTOUR'}`;
    }
    if (syllableBadge) {
      const sylWord = count === 1 ? 'SYLLABLE' : 'SYLLABLES';
      syllableBadge.textContent = `${count} ${sylWord} • ${word.hsk_level || 'HSK'}`;
    }

    // 2. Update Dynamic Tone Sandhi Banner
    const sandhiInfo = getToneSandhiInfo(word, syllables);
    const sandhiBadge = document.getElementById('engine-sandhi-badge');
    const toneTitle = document.getElementById('engine-tone-title');
    const tonePattern = document.getElementById('engine-tone-pattern');
    const toneSubtext = document.getElementById('engine-tone-subtext');

    if (toneTitle) toneTitle.textContent = sandhiInfo.title;
    if (tonePattern) tonePattern.textContent = sandhiInfo.pattern;
    if (toneSubtext) toneSubtext.textContent = sandhiInfo.subtext;

    if (sandhiBadge) {
      if (sandhiInfo.isSandhi) {
        sandhiBadge.className = 'bg-badge-tangerine text-white border-2 border-black rounded-xl p-2 font-mono text-xs font-bold text-right shadow-sm z-10 transition-colors';
      } else {
        sandhiBadge.className = 'bg-badge-cobalt text-white border-2 border-black rounded-xl p-2 font-mono text-xs font-bold text-right shadow-sm z-10 transition-colors';
      }
    }

    // 3. Render SVG Canvas Geometry & Pitch Ribbons
    renderCanvasGeometry(count, syllables, refProfile);

    // 4. Reset Timeline and Recording State
    lastUserAudioBlob = null;
    const timelineFill = document.getElementById('pitch-timeline-fill');
    const timelineText = document.getElementById('pitch-timeline-text');
    if (timelineFill) timelineFill.style.width = '0%';
    if (timelineText) timelineText.textContent = `0.0s / ${RECORDING_DURATION_SEC}s`;

    // 5. Default Articulatory Coach Prompt for the word
    const coachText = document.getElementById('coach-advice-text');
    if (coachText) {
      if (sandhiInfo.isSandhi) {
        coachText.innerHTML = `Tone Sandhi active! Notice how <strong>'${word.hanzi_simp || word.hanzi}'</strong> shifts tone: <em class="text-badge-cobalt font-black">${sandhiInfo.subtext}</em>`;
      } else {
        coachText.innerHTML = `Listen to the native model, then press <strong class="bg-badge-tangerine text-white px-1.5 py-0.5 rounded">RECORD</strong> to trace your voice against the Chao corridor.`;
      }
    }

    // 6. Reset reveal state to State 1 (Priming / Record)
    if (window.PronunciationEngine) {
      window.PronunciationEngine.setRevealState(1);
    }
  }

  // Backwards compatibility shim
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

      // Initial timeline reset for the 4-second window
      const timelineFill = document.getElementById('pitch-timeline-fill');
      const timelineText = document.getElementById('pitch-timeline-text');
      if (timelineFill) timelineFill.style.width = '0%';
      if (timelineText) timelineText.textContent = `0.0s / ${RECORDING_DURATION_SEC}s`;

      const startTime = performance.now();
      if (countdownInterval) clearInterval(countdownInterval);

      let elapsedMs = 0;
      const totalMs = RECORDING_DURATION_SEC * 1000;

      countdownInterval = setInterval(() => {
        elapsedMs = performance.now() - startTime;
        const remainingSec = Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000));
        
        const countValEl = document.getElementById('record-countdown-val');
        if (countValEl) {
          countValEl.textContent = remainingSec;
        }

        if (timelineFill) {
          const progress = (elapsedMs / totalMs) * 100;
          timelineFill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        }
        if (timelineText) {
          const currentSec = (Math.min(totalMs, elapsedMs) / 1000).toFixed(1);
          timelineText.textContent = `${currentSec}s / ${RECORDING_DURATION_SEC}s`;
        }

        // Auto-stop exactly at 4.0 seconds
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
        window.PronunciationEngine.setRevealState(4);
      }
      return;
    }

    if (recordBtn) {
      recordBtn.innerHTML = `
        <span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
        <span class="font-speed font-black italic text-base sm:text-xl uppercase tracking-tight">ANALYZING PITCH...</span>
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

      console.log('[AudioEngine] Utterance result:', result);
      lastProcessedResult = result;
      lastUserAudioBlob = result.userAudioBlob;

      // Update practice counter telemetry
      practicedCount++;
      if (practiceCounter) {
        practiceCounter.textContent = `PRACTICED: ${practicedCount}`;
      }

      // Update timeline display with real user duration
      const timelineText = document.getElementById('pitch-timeline-text');
      const timelineFill = document.getElementById('pitch-timeline-fill');
      if (timelineText) {
        timelineText.textContent = `${result.duration.toFixed(2)}s / ${result.duration.toFixed(2)}s`;
      }
      if (timelineFill) {
        timelineFill.style.width = '100%';
      }

      // Draw real user pitch curve on SVG chart!
      renderUserPitchOnChart(result, currentWord, refProfile);

      // Render diagnostic audit cards and coach feedback
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
        const centerY = Math.max(16, Math.min(138, 78 - st * 16));
        upperPts.push(`${x.toFixed(1)},${Math.max(8, centerY - 10.35).toFixed(1)}`);
        lowerPts.unshift(`${x.toFixed(1)},${Math.min(146, centerY + 10.35).toFixed(1)}`);
      }
      const allPts = upperPts.concat(lowerPts).join(' ');
      ribbonsHtml += `<polygon id="${span.id}" points="${allPts}" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />`;
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
        return; // Unvoiced / silent
      }

      // Convert normalized points to (x, y) coordinates independently of vector length
      const pts = [];
      const numPts = syl.userF0Norm.length;
      for (let k = 0; k < numPts; k++) {
        const x = span.xMin + (k / (numPts - 1)) * (span.xMax - span.xMin);
        const st = syl.userF0Norm[k];
        const y = Math.max(12, Math.min(142, 78 - st * 16));
        pts.push({ x, y, st });
      }

      // Generate smooth SVG path d
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

      // Select 5 milestone circles mapped proportionally across vector lengths
      const circleIndices = [0, Math.floor(numPts * 0.25), Math.floor(numPts * 0.5), Math.floor(numPts * 0.75), numPts - 1];
      let sylPointsHtml = `<g id="${span.ptsId}">`;
      circleIndices.forEach(idx => {
        const pt = pts[idx];
        if (!pt) return;
        let color = '#B8F526'; // Green
        if (syl.referenceF0Norm && syl.referenceF0Norm.length > 0) {
          const t = numPts > 1 ? idx / (numPts - 1) : 0;
          const refIdx = Math.min(syl.referenceF0Norm.length - 1, Math.round(t * (syl.referenceF0Norm.length - 1)));
          const refVal = syl.referenceF0Norm[refIdx];
          if (refVal !== undefined && refVal !== null) {
            const refY = Math.max(12, Math.min(142, 78 - refVal * 16));
            const diff = Math.abs(pt.y - refY);
            if (diff > 35) color = '#FF5C1C';
            else if (diff > 20) color = '#FDF197';
          }
        }
        sylPointsHtml += `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="4.5" fill="${color}" stroke="#000" stroke-width="2" />`;
      });
      sylPointsHtml += `</g>`;
      pointsHtml += sylPointsHtml;
    });

    if (pathHtml) {
      pathsContainer.innerHTML = pathHtml;
      pointsContainer.innerHTML = pointsHtml;
    }
  }

  function renderDynamicAudit(result, wordData, refProfile) {
    const auditGrid = document.getElementById('phonetic-audit-grid');
    const coachText = document.getElementById('coach-advice-text');
    if (!auditGrid) return;

    let cardHtml = '';
    const adviceList = [];

    result.syllables.forEach((syl, i) => {
      const finalScore = syl.finalScore !== undefined ? syl.finalScore : 88;
      const dtwScore = syl.dtwScore !== undefined ? syl.dtwScore : 90;
      const slopeScore = syl.slopeScore !== undefined ? syl.slopeScore : 85;
      const status = syl.status || 'ACCURATE CONTOUR';
      const comment = syl.comment || '✓ Exact';

      let toneBadgeClass = 'bg-canvas-acid text-black';
      let toneCommentClass = 'text-emerald-700 font-bold';
      let dtwCommentClass = 'text-emerald-700 font-bold';

      if (!syl.userF0Norm) {
        toneBadgeClass = 'bg-slate-300 text-black';
        toneCommentClass = 'text-slate-600 font-bold';
        dtwCommentClass = 'text-slate-600 font-bold';
        adviceList.push(`Could not detect vocal pitch on <strong>'${syl.syllable}'</strong>. Speak closer to the microphone.`);
      } else if (finalScore < 70) {
        toneBadgeClass = 'bg-badge-tangerine text-white';
        toneCommentClass = 'text-badge-tangerine font-bold';
        dtwCommentClass = dtwScore < 70 ? 'text-badge-tangerine font-bold' : 'text-emerald-700 font-bold';
        if (syl.advice) adviceList.push(syl.advice);
      } else if (finalScore < 85) {
        toneBadgeClass = 'bg-badge-tangerine text-white';
        toneCommentClass = 'text-amber-700 font-bold';
        if (syl.advice) adviceList.push(syl.advice);
      }

      cardHtml += `
        <div class="bg-white border-[2.5px] border-black rounded-xl p-2.5 shadow-hard-black">
          <div class="flex items-center justify-between mb-1 pb-1 border-b border-black/10">
            <span class="font-speed font-black text-xs uppercase text-black">SYLLABLE ${i + 1}: [${syl.syllable}]</span>
            <span class="font-mono text-[9px] font-black px-1.5 py-0.2 rounded border border-black ${toneBadgeClass}">${status}</span>
          </div>
          <div class="grid grid-cols-3 gap-1 font-mono text-center">
            <div class="bg-slate-100 border border-black rounded-lg p-1">
              <span class="block text-[8px] text-black/60 font-black">ALIGNMENT</span>
              <span class="font-speed font-black text-xs sm:text-sm text-black">${dtwScore}%</span>
              <span class="block text-[8px] ${dtwCommentClass}">${dtwScore >= 80 ? '✓ DTW Match' : '⚠ Distorted'}</span>
            </div>
            <div class="bg-slate-100 border border-black rounded-lg p-1">
              <span class="block text-[8px] text-black/60 font-black">DIRECTION</span>
              <span class="font-speed font-black text-xs sm:text-sm text-black">${slopeScore}%</span>
              <span class="block text-[8px] ${toneCommentClass}">${slopeScore >= 80 ? '✓ Slope Check' : '⚠ Wrong Slope'}</span>
            </div>
            <div class="bg-slate-100 border border-black rounded-lg p-1">
              <span class="block text-[8px] text-black/60 font-black">TONE: ${syl.tone}</span>
              <span class="font-speed font-black text-xs sm:text-sm text-black">${finalScore}%</span>
              <span class="block text-[8px] ${toneCommentClass}">${comment}</span>
            </div>
          </div>
        </div>
      `;
    });

    auditGrid.innerHTML = cardHtml;

    if (coachText) {
      if (adviceList.length > 0) {
        coachText.innerHTML = `"${adviceList.join(' ')}"`;
      } else {
        const accuracy = result.overallScore !== undefined ? result.overallScore : 94;
        coachText.innerHTML = `"Outstanding pitch contour! Your pronunciation on <strong class="bg-black text-white px-1.5 py-0.5 rounded">'${wordData.hanzi_simp || wordData.hanzi}'</strong> matched the native model with <strong class="text-emerald-600 font-bold">${accuracy}%</strong> accuracy."`;
      }
    }
  }

  function activateWordIndex(index) {
    if (!hskDeck || hskDeck.length === 0) return;
    const safeIdx = Math.max(0, Math.min(index, hskDeck.length - 1));
    displayWord(hskDeck[safeIdx]);
  }

  // Next Word Button picks a random word from the shuffle bag
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
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

  // Reset Button resets current word or repicks
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
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
      if (window.PronunciationEngine) {
        window.PronunciationEngine.setRevealState(1);
      }
    });
  }

  // Deck filter buttons (ALL, HSK 1, HSK 2)
  const deckFilterBtns = document.querySelectorAll('#engine-deck-filter-group button');
  deckFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter || 'all';
      currentDeckFilter = filter;
      deckFilterBtns.forEach(b => {
        if (b === btn) {
          b.className = 'px-2 py-0.5 rounded bg-black text-badge-tangerine border border-black font-mono text-[9px] font-bold active-collapse cursor-pointer';
        } else {
          b.className = 'px-2 py-0.5 rounded bg-white border border-black font-mono text-[9px] font-bold active-collapse cursor-pointer';
        }
      });
      initShuffleBag();
      pickRandomWord();
    });
  });

  // Native Reference Audio Trigger (Supports Dual-Track: Neural TTS & Human Story + 0.65x Speed)
  function playCurrentNativeAudio() {
    const currentWord = currentTargetWord || (hskDeck && hskDeck[0]);
    if (!currentWord) return;

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
      const audio = new Audio(`${import.meta.env.BASE_URL}${audioSrc}`);
      audio.playbackRate = targetSpeed;
      if (playNativeBtn) {
        playNativeBtn.classList.add('bg-badge-cobalt');
        audio.onended = () => playNativeBtn.classList.remove('bg-badge-cobalt');
        audio.onerror = () => playNativeBtn.classList.remove('bg-badge-cobalt');
      }
      audio.play().catch(e => console.warn('Native audio play error:', e));
    }
  }

  // Dual-Track UI State Controller & Real-Time Rescoring
  function updateAudioTrackUI() {
    const ttsBtn = document.getElementById('audio-track-tts-btn');
    const humanBtn = document.getElementById('audio-track-human-btn');
    const humanSpeedControls = document.getElementById('human-speed-controls');
    const speed1xBtn = document.getElementById('audio-speed-1x-btn');
    const speed065xBtn = document.getElementById('audio-speed-065x-btn');
    const speed08xBtn = document.getElementById('audio-speed-08x-btn');

    if (ttsBtn && humanBtn) {
      if (audioTrackMode === 'tts') {
        ttsBtn.className = 'px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase transition-all bg-black text-white shadow-xs cursor-pointer';
        humanBtn.className = 'px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase transition-all bg-transparent text-black hover:bg-black/10 cursor-pointer';
        if (humanSpeedControls) humanSpeedControls.classList.add('hidden');
      } else {
        ttsBtn.className = 'px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase transition-all bg-transparent text-black hover:bg-black/10 cursor-pointer';
        humanBtn.className = 'px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase transition-all bg-black text-white shadow-xs cursor-pointer';
        if (humanSpeedControls) humanSpeedControls.classList.remove('hidden');
      }
    }

    const isSlow = (humanPlaybackSpeed === 0.65 || humanPlaybackSpeed === 0.8);
    if (speed1xBtn && (speed065xBtn || speed08xBtn)) {
      if (isSlow) {
        speed1xBtn.className = 'px-1.5 py-0.5 rounded text-[10px] font-mono font-black uppercase transition-all bg-transparent text-black hover:bg-black/10 cursor-pointer';
      } else {
        speed1xBtn.className = 'px-1.5 py-0.5 rounded text-[10px] font-mono font-black uppercase transition-all bg-black text-white shadow-xs cursor-pointer';
      }
    }

    [speed065xBtn, speed08xBtn].forEach(btn => {
      if (btn) {
        if (isSlow) {
          btn.className = 'px-1.5 py-0.5 rounded text-[10px] font-mono font-black uppercase transition-all bg-black text-white shadow-xs cursor-pointer';
        } else {
          btn.className = 'px-1.5 py-0.5 rounded text-[10px] font-mono font-black uppercase transition-all bg-transparent text-black hover:bg-black/10 cursor-pointer';
        }
      }
    });
  }

  function reevaluateUtteranceAgainstProfile(result, wordData, profile) {
    if (!result || !result.syllables) return;

    result.syllables.forEach((syl, i) => {
      let refContour = null;
      if (profile?.syllables?.[i]?.f0_norm && profile.syllables[i].f0_norm.length >= 2) {
        refContour = PitchTracker.resampleContour(profile.syllables[i].f0_norm, 30);
      } else if (profile?.f0_norm && profile.f0_norm.length >= 2) {
        const fullRef = profile.f0_norm;
        const ptsPerSyl = Math.floor(fullRef.length / result.syllables.length);
        const sliceStart = i * ptsPerSyl;
        const sliceEnd = i === result.syllables.length - 1 ? fullRef.length : (i + 1) * ptsPerSyl;
        const sylSlice = fullRef.slice(sliceStart, sliceEnd);
        refContour = PitchTracker.resampleContour(sylSlice, 30);
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
        syl.finalScore = Math.round(0.60 * dtwResult.score + 0.40 * evalResult.score);
        syl.status = evalResult.status;
        syl.comment = evalResult.comment;
        syl.tip = evalResult.tip;
      }
    });

    renderUserPitchOnChart(result, wordData, profile);
    renderDynamicAudit(result, wordData, profile);
  }

  function setAudioTrackMode(mode) {
    audioTrackMode = mode;
    localStorage.setItem('tone_trainer_track_mode', mode);
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
  const speed08xBtn = document.getElementById('audio-speed-08x-btn');

  if (trackTtsBtn) trackTtsBtn.addEventListener('click', () => setAudioTrackMode('tts'));
  if (trackHumanBtn) trackHumanBtn.addEventListener('click', () => setAudioTrackMode('human'));
  if (speed1xBtn) speed1xBtn.addEventListener('click', () => setHumanPlaybackSpeed(1.0));
  if (speed065xBtn) speed065xBtn.addEventListener('click', () => setHumanPlaybackSpeed(0.65));
  if (speed08xBtn) speed08xBtn.addEventListener('click', () => setHumanPlaybackSpeed(0.65));

  // Initialize UI buttons state on load
  updateAudioTrackUI();

  if (playNativeBtn) playNativeBtn.addEventListener('click', playCurrentNativeAudio);
  if (hanziDisplay) hanziDisplay.addEventListener('click', playCurrentNativeAudio);
  if (pinyinDisplay) pinyinDisplay.addEventListener('click', playCurrentNativeAudio);

  // Playback My Voice
  if (coachPlayBtn) {
    coachPlayBtn.addEventListener('click', () => {
      if (!lastUserAudioBlob) {
        alert("Please record your voice first!");
        return;
      }
      if (lastUserAudioUrl) {
        URL.revokeObjectURL(lastUserAudioUrl);
      }
      lastUserAudioUrl = URL.createObjectURL(lastUserAudioBlob);
      const userAudio = new Audio(lastUserAudioUrl);
      const originalHtml = coachPlayBtn.innerHTML;
      coachPlayBtn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">volume_up</span> PLAYING YOUR RECORDING...';
      coachPlayBtn.classList.add('bg-badge-tangerine', 'text-white');
      userAudio.onended = () => {
        coachPlayBtn.innerHTML = originalHtml;
        coachPlayBtn.classList.remove('bg-badge-tangerine', 'text-white');
      };
      userAudio.onerror = () => {
        coachPlayBtn.innerHTML = originalHtml;
        coachPlayBtn.classList.remove('bg-badge-tangerine', 'text-white');
      };
      userAudio.play();
    });
  }

  // Tap-to-Record / Try Again
  if (recordBtn) {
    recordBtn.addEventListener('click', () => {
      if (currentEngineState === 2) {
        stopRealRecordingAndCalculate();
      } else {
        startRealRecording();
      }
    });
  }

  // Exposed API on window for future backend / DSP agent
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

      if (state === 1) {
        if (userTrack) userTrack.classList.add('hidden');
        if (waveform) waveform.classList.add('hidden');
        if (auditSec) auditSec.classList.add('hidden');
        if (coachCard) coachCard.classList.add('hidden');
        if (recordBtn) {
          recordBtn.className = 'flex-1 py-3.5 sm:py-4 px-3 sm:px-6 bg-badge-tangerine text-white hover:bg-[#ff4800] border-[3.5px] border-black rounded-2xl shadow-hard-black flex items-center justify-center gap-2 sm:gap-3 active-collapse cursor-pointer';
          recordBtn.innerHTML = `
            <span class="w-4 h-4 rounded-full bg-white animate-pulse border border-black shrink-0"></span>
            <span class="font-speed font-black italic text-base sm:text-xl uppercase tracking-tight sm:tracking-wide">RECORD</span>
            <span class="font-mono text-[10px] bg-black text-white px-1.5 py-0.5 rounded hidden sm:inline">[SPACE]</span>
          `;
        }
      } else if (state === 2) {
        if (userTrack) userTrack.classList.add('hidden');
        if (waveform) waveform.classList.remove('hidden');
        if (auditSec) auditSec.classList.add('hidden');
        if (coachCard) coachCard.classList.add('hidden');
        if (recordBtn) {
          recordBtn.className = 'flex-1 py-3.5 sm:py-4 px-3 sm:px-6 bg-black text-badge-tangerine border-[3.5px] border-black rounded-2xl shadow-hard-black flex items-center justify-center gap-2 sm:gap-3 active-collapse cursor-pointer';
          recordBtn.innerHTML = `
            <span class="w-4 h-4 rounded-full bg-badge-tangerine animate-ping border border-black shrink-0"></span>
            <span class="font-speed font-black italic text-base sm:text-xl uppercase tracking-tight sm:tracking-wide">RECORDING... (<span id="record-countdown-val">${countdownSeconds}</span>s)</span>
            <span class="font-mono text-[10px] bg-badge-tangerine text-black px-1.5 py-0.5 rounded hidden sm:inline">[STOP]</span>
          `;
        }
      } else {
        if (userTrack) userTrack.classList.remove('hidden');
        if (waveform) waveform.classList.add('hidden');
        if (auditSec) auditSec.classList.remove('hidden');
        if (coachCard) coachCard.classList.remove('hidden');
        if (recordBtn) {
          recordBtn.className = 'flex-1 py-3.5 sm:py-4 px-3 sm:px-6 bg-badge-tangerine text-white hover:bg-[#ff4800] border-[3.5px] border-black rounded-2xl shadow-hard-black flex items-center justify-center gap-2 sm:gap-3 active-collapse cursor-pointer';
          recordBtn.innerHTML = `
            <span class="w-4 h-4 rounded-full bg-white animate-pulse border border-black shrink-0"></span>
            <span class="font-speed font-black italic text-base sm:text-xl uppercase tracking-tight sm:tracking-wide">TRY AGAIN</span>
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
      if (pathS1) {
        const p1 = document.getElementById('user-pitch-path-s1');
        if (p1) p1.setAttribute('d', pathS1);
      }
      if (pathS2) {
        const p2 = document.getElementById('user-pitch-path-s2');
        if (p2) p2.setAttribute('d', pathS2);
      }
      if (pathS3) {
        const p3 = document.getElementById('user-pitch-path-s3');
        if (p3) p3.setAttribute('d', pathS3);
      }
      if (pathS4) {
        const p4 = document.getElementById('user-pitch-path-s4');
        if (p4) p4.setAttribute('d', pathS4);
      }
    },

    updateTargetRibbons({ pointsS1, pointsS2, pointsS3, pointsS4 }) {
      if (pointsS1) {
        const r1 = document.getElementById('target-ribbon-s1');
        if (r1) r1.setAttribute('points', pointsS1);
      }
      if (pointsS2) {
        const r2 = document.getElementById('target-ribbon-s2');
        if (r2) r2.setAttribute('points', pointsS2);
      }
      if (pointsS3) {
        const r3 = document.getElementById('target-ribbon-s3');
        if (r3) r3.setAttribute('points', pointsS3);
      }
      if (pointsS4) {
        const r4 = document.getElementById('target-ribbon-s4');
        if (r4) r4.setAttribute('points', pointsS4);
      }
    },

    setCoachingAdvice(adviceHtml) {
      const coachText = document.getElementById('coach-advice-text');
      if (coachText) coachText.innerHTML = adviceHtml;
    },

    reset() {
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

// Initialize the app
setupButtons();
setupMenu();
setupEnginePlaceholders();
init();
