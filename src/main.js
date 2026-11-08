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

  const startWordsBtn = document.getElementById('start-words-btn');
  const wordTrainerScreen = document.getElementById('word-trainer-screen');
  const backFromWordsBtn = document.getElementById('back-from-words-btn');

  if (startWordsBtn) {
    startWordsBtn.addEventListener('click', () => {
      menuScreen.classList.add('hidden');
      mainMenu.classList.remove('hidden');
      submenu.classList.add('hidden');
      if (wordTrainerScreen) wordTrainerScreen.classList.remove('hidden');
      setAppBackground('bg-[#F5F3FF]');
      if (typeof window.initWordTrainerCanvas === 'function') {
        window.initWordTrainerCanvas();
      }
    });
  }

  if (backFromWordsBtn) {
    backFromWordsBtn.addEventListener('click', () => {
      if (wordTrainerScreen) wordTrainerScreen.classList.add('hidden');
      menuScreen.classList.remove('hidden');
      mainMenu.classList.remove('hidden');
      setAppBackground('bg-canvas-acid');
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
  let currentSyllables = [];

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
    currentSyllables = syllables;

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
        sandhiBadge.className = 'w-full bg-badge-tangerine text-white border-2 border-black rounded-xl p-2 font-mono text-xs font-bold shadow-sm z-10 transition-colors flex items-center justify-between gap-2 min-h-[50px]';
      } else {
        sandhiBadge.className = 'w-full bg-badge-cobalt text-white border-2 border-black rounded-xl p-2 font-mono text-xs font-bold shadow-sm z-10 transition-colors flex items-center justify-between gap-2 min-h-[50px]';
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

  function getTriadTheme(score, tier) {
    if (score >= 85 || tier === 'EMERALD') {
      return {
        boxClass: 'bg-emerald-500/10 border-emerald-500 text-emerald-950',
        scoreClass: 'text-emerald-700',
        labelClass: 'text-emerald-800 font-bold',
        badgeClass: 'bg-emerald-600 text-white',
      };
    }
    if (score >= 65 || tier === 'AMBER') {
      return {
        boxClass: 'bg-amber-500/10 border-amber-500 text-amber-950',
        scoreClass: 'text-amber-700',
        labelClass: 'text-amber-800 font-bold',
        badgeClass: 'bg-amber-600 text-white',
      };
    }
    return {
      boxClass: 'bg-rose-500/10 border-rose-500 text-rose-950',
      scoreClass: 'text-rose-700',
      labelClass: 'text-rose-800 font-bold',
      badgeClass: 'bg-rose-600 text-white',
    };
  }

  function decomposePinyin(sylPinyin) {
    if (!sylPinyin) return { initial: '∅', final: '—' };
    const clean = sylPinyin.toLowerCase();
    const initials = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'];
    for (const init of initials) {
      if (clean.startsWith(init)) {
        return { initial: init, final: sylPinyin.slice(init.length) || '—' };
      }
    }
    return { initial: '∅', final: sylPinyin };
  }

  function renderEmptyAudit() {
    const auditGrid = document.getElementById('phonetic-audit-grid');
    const priorityHeader = document.getElementById('coach-priority-header');
    const priorityDot = document.getElementById('coach-priority-dot');
    const coachPlayBtn = document.getElementById('coach-hear-user-btn');
    if (!auditGrid) return;

    const syllables = (currentSyllables && currentSyllables.length > 0)
      ? currentSyllables
      : (currentTargetWord ? parsePinyinSyllables(currentTargetWord.pinyin) : [{ syllable: '', tone: 1 }]);
    const sylCount = syllables.length;

    // Dynamically adjust grid columns across full 12-column width (same as renderDynamicAudit)
    if (sylCount === 1) {
      auditGrid.className = 'grid grid-cols-1 max-w-xl mx-auto gap-3.5';
    } else if (sylCount === 2) {
      auditGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-3.5';
    } else if (sylCount === 3) {
      auditGrid.className = 'grid grid-cols-1 md:grid-cols-3 gap-3';
    } else {
      auditGrid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3';
    }

    let cardHtml = '';
    syllables.forEach((syl, i) => {
      const sylPinyin = syl.syllable || (syl.initial ? (syl.initial + (syl.final || '')) : `S${i + 1}`);
      const toneNum = syl.tone || 1;
      const decomp = decomposePinyin(sylPinyin);
      const initSym = syl.initial || decomp.initial;
      const finSym = syl.final || decomp.final;

      cardHtml += `
        <div class="bg-white border-[2.5px] border-black/30 rounded-xl p-3 sm:p-3.5 shadow-sm flex flex-col justify-between border-dashed">
          <!-- Card Header: Syllable label & Overall Badge (Empty / Primed) -->
          <div class="flex items-center justify-between mb-2.5 pb-2 border-b border-black/10">
            <div class="flex items-center gap-2">
              <span class="font-speed font-black text-sm uppercase text-black/60">SYLLABLE ${i + 1}:</span>
              <span class="font-mono text-sm font-black bg-black/10 text-black/80 px-2 py-0.5 rounded shadow-xs">[${sylPinyin}]</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-mono text-[10px] font-bold text-black/40 uppercase">OVERALL:</span>
              <span class="font-speed font-black text-xs sm:text-sm px-2.5 py-0.5 rounded border border-black/20 bg-slate-100 text-black/40">
                --%
              </span>
              <span class="hidden sm:inline-block font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded border border-black/20 bg-slate-50 text-black/50">
                AWAITING RECORDING
              </span>
            </div>
          </div>

          <!-- Phonetic Triad Grid: Initial -> Tone -> Final -->
          <div class="grid grid-cols-3 gap-2 font-mono text-center">
            <!-- 1. INITIAL -->
            <div class="border-[1.5px] border-dashed border-black/20 bg-slate-50/70 rounded-lg p-2 flex flex-col justify-between">
              <span class="block text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-black/45 truncate">[1. INITIAL: ${initSym}]</span>
              <span class="font-speed font-black text-sm sm:text-base md:text-lg my-0.5 text-black/30">--%</span>
              <span class="block text-[9px] sm:text-[10px] font-bold leading-tight text-black/40 truncate">Ready to Record</span>
              <span class="block text-[8px] sm:text-[9px] text-black/35 font-semibold mt-0.5 truncate">Voiced Attack</span>
            </div>

            <!-- 2. TONE -->
            <div class="border-[1.5px] border-dashed border-black/20 bg-slate-50/70 rounded-lg p-2 flex flex-col justify-between">
              <span class="block text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-black/45 truncate">[2. TONE: T${toneNum}]</span>
              <span class="font-speed font-black text-sm sm:text-base md:text-lg my-0.5 text-black/30">--%</span>
              <span class="block text-[9px] sm:text-[10px] font-bold leading-tight text-black/40 truncate">Corridor Primed</span>
              <span class="block text-[8px] sm:text-[9px] text-black/35 font-semibold mt-0.5 truncate">Chao DTW</span>
            </div>

            <!-- 3. FINAL -->
            <div class="border-[1.5px] border-dashed border-black/20 bg-slate-50/70 rounded-lg p-2 flex flex-col justify-between">
              <span class="block text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-black/45 truncate">[3. FINAL: ${finSym}]</span>
              <span class="font-speed font-black text-sm sm:text-base md:text-lg my-0.5 text-black/30">--%</span>
              <span class="block text-[9px] sm:text-[10px] font-bold leading-tight text-black/40 truncate">Ready to Record</span>
              <span class="block text-[8px] sm:text-[9px] text-black/35 font-semibold mt-0.5 truncate">Formant Track</span>
            </div>
          </div>
        </div>
      `;
    });

    auditGrid.innerHTML = cardHtml;

    if (priorityHeader && priorityDot) {
      priorityHeader.textContent = 'AWAITING VOCAL CAPTURE • COACH READY';
      priorityDot.className = 'w-2.5 h-2.5 rounded-full bg-slate-300 border border-black';
    }

    if (coachPlayBtn) {
      coachPlayBtn.classList.add('opacity-40', 'pointer-events-none', 'cursor-not-allowed');
    }
  }

  function renderDynamicAudit(result, wordData, refProfile) {
    const auditGrid = document.getElementById('phonetic-audit-grid');
    const coachText = document.getElementById('coach-advice-text');
    const priorityHeader = document.getElementById('coach-priority-header');
    const priorityDot = document.getElementById('coach-priority-dot');
    if (!auditGrid) return;

    // Dynamically adjust grid columns across full 12-column width
    const sylCount = result.syllables.length;
    if (sylCount === 1) {
      auditGrid.className = 'grid grid-cols-1 max-w-xl mx-auto gap-3.5';
    } else if (sylCount === 2) {
      auditGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-3.5';
    } else if (sylCount === 3) {
      auditGrid.className = 'grid grid-cols-1 md:grid-cols-3 gap-3';
    } else {
      auditGrid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3';
    }

    let cardHtml = '';

    result.syllables.forEach((syl, i) => {
      const compositeScore = syl.finalScore !== undefined ? syl.finalScore : 88;
      const toneScore = syl.toneScore !== undefined ? syl.toneScore : (syl.toneResult?.score || 85);
      const toneSublabel = syl.toneResult?.sublabel || syl.comment || '✓ Exact';
      const toneDtw = syl.dtwScore !== undefined ? syl.dtwScore : 90;

      const init = syl.initial || { symbol: '', score: 92, sublabel: '✓ Clean Onset', tier: 'EMERALD', votMs: 0 };
      const fin = syl.final || { symbol: 'a', score: 88, sublabel: '✓ Open Vowel', tier: 'EMERALD', f1Hz: 750, f2Hz: 1200 };

      const initTheme = getTriadTheme(init.score, init.tier);
      const toneTheme = getTriadTheme(toneScore, syl.toneResult?.tier || (toneScore >= 85 ? 'EMERALD' : (toneScore >= 65 ? 'AMBER' : 'ROSE')));
      const finalTheme = getTriadTheme(fin.score, fin.tier);
      const overallTheme = getTriadTheme(compositeScore);

      // Formatting human-readable sub-metrics
      let initMetricText = 'Voiced Attack';
      if (init.votMs !== undefined && init.votMs > 0) {
        initMetricText = `VOT: ${init.votMs}ms`;
      } else if (init.cogHz) {
        initMetricText = `CoG: ${init.cogHz}Hz`;
      }

      const toneMetricText = `DTW: ${toneDtw}%`;
      const finalMetricText = fin.f1Hz && fin.f2Hz ? `F1: ${fin.f1Hz} • F2: ${fin.f2Hz}` : `Vowel Clarity`;

      // Status pill at card top
      let statusText = 'TARGET MET';
      if (!syl.userF0Norm) {
        statusText = 'NO VOICING';
      } else if (compositeScore < 65) {
        statusText = 'NEEDS POLISH';
      } else if (compositeScore < 85) {
        statusText = 'COMPREHENSIBLE';
      }

      cardHtml += `
        <div class="bg-white border-[2.5px] border-black rounded-xl p-3 sm:p-3.5 shadow-hard-black flex flex-col justify-between">
          <!-- Card Header: Syllable label & Overall Badge -->
          <div class="flex items-center justify-between mb-2.5 pb-2 border-b border-black/10">
            <div class="flex items-center gap-2">
              <span class="font-speed font-black text-sm uppercase text-black">SYLLABLE ${i + 1}:</span>
              <span class="font-mono text-sm font-black bg-black text-white px-2 py-0.5 rounded shadow-xs">[${syl.syllable}]</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-mono text-[10px] font-bold text-black/60 uppercase">OVERALL:</span>
              <span class="font-speed font-black text-xs sm:text-sm px-2.5 py-0.5 rounded border border-black ${overallTheme.badgeClass}">
                ${compositeScore}%
              </span>
              <span class="hidden sm:inline-block font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded border border-black/30 bg-slate-100 text-black/80">
                ${statusText}
              </span>
            </div>
          </div>

          <!-- Phonetic Triad Grid: Initial -> Tone -> Final -->
          <div class="grid grid-cols-3 gap-2 font-mono text-center">
            <!-- 1. INITIAL -->
            <div class="border-[1.5px] rounded-lg p-2 flex flex-col justify-between ${initTheme.boxClass}">
              <span class="block text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-black/75 truncate">[1. INITIAL: ${init.symbol || '∅'}]</span>
              <span class="font-speed font-black text-sm sm:text-base md:text-lg my-0.5 ${initTheme.scoreClass}">${init.score}%</span>
              <span class="block text-[9px] sm:text-[10px] font-bold leading-tight line-clamp-1 ${initTheme.labelClass}" title="${init.sublabel}">${init.sublabel}</span>
              <span class="block text-[8px] sm:text-[9px] text-black/60 font-semibold mt-0.5 truncate">${initMetricText}</span>
            </div>

            <!-- 2. TONE -->
            <div class="border-[1.5px] rounded-lg p-2 flex flex-col justify-between ${toneTheme.boxClass}">
              <span class="block text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-black/75 truncate">[2. TONE: T${syl.tone}]</span>
              <span class="font-speed font-black text-sm sm:text-base md:text-lg my-0.5 ${toneTheme.scoreClass}">${toneScore}%</span>
              <span class="block text-[9px] sm:text-[10px] font-bold leading-tight line-clamp-1 ${toneTheme.labelClass}" title="${toneSublabel}">${toneSublabel}</span>
              <span class="block text-[8px] sm:text-[9px] text-black/60 font-semibold mt-0.5 truncate">${toneMetricText}</span>
            </div>

            <!-- 3. FINAL -->
            <div class="border-[1.5px] rounded-lg p-2 flex flex-col justify-between ${finalTheme.boxClass}">
              <span class="block text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-black/75 truncate">[3. FINAL: ${fin.symbol || 'V'}]</span>
              <span class="font-speed font-black text-sm sm:text-base md:text-lg my-0.5 ${finalTheme.scoreClass}">${fin.score}%</span>
              <span class="block text-[9px] sm:text-[10px] font-bold leading-tight line-clamp-1 ${finalTheme.labelClass}" title="${fin.sublabel}">${fin.sublabel}</span>
              <span class="block text-[8px] sm:text-[9px] text-black/60 font-semibold mt-0.5 truncate">${finalMetricText}</span>
            </div>
          </div>
        </div>
      `;
    });

    auditGrid.innerHTML = cardHtml;

    // The "One Critical Fix" Articulatory Coach Card
    if (coachText) {
      if (result.coachingAdvice) {
        coachText.innerHTML = `"${result.coachingAdvice}"`;
      } else {
        const accuracy = result.overallScore !== undefined ? result.overallScore : 94;
        coachText.innerHTML = `"Outstanding pitch contour! Your pronunciation on <strong class="bg-black text-white px-1.5 py-0.5 rounded">'${wordData.hanzi_simp || wordData.hanzi}'</strong> matched the native model with <strong class="text-emerald-600 font-bold">${accuracy}%</strong> accuracy."`;
      }
    }

    if (priorityHeader && priorityDot) {
      const p = result.coachingPriority;
      if (p === 'TONE') {
        priorityHeader.textContent = `PRIORITY FIX: TONE CONTOUR DIRECTION`;
        priorityDot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse border border-black';
      } else if (p === 'FINAL') {
        priorityHeader.textContent = `PRIORITY FIX: VOWEL MOUTH & LIP SHAPE`;
        priorityDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse border border-black';
      } else if (p === 'INITIAL') {
        priorityHeader.textContent = `PRIORITY FIX: CONSONANT BREATH RELEASE`;
        priorityDot.className = 'w-2.5 h-2.5 rounded-full bg-badge-tangerine animate-pulse border border-black';
      } else {
        priorityHeader.textContent = `PHONETIC TRIAD VERIFIED (NATIVE RESIDUAL)`;
        priorityDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black';
      }
    }

    const coachPlayBtn = document.getElementById('coach-hear-user-btn');
    if (coachPlayBtn) {
      coachPlayBtn.classList.remove('opacity-40', 'pointer-events-none', 'cursor-not-allowed');
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
        syl.toneScore = Math.round(0.60 * dtwResult.score + 0.40 * evalResult.score);
        syl.status = evalResult.status;
        syl.comment = evalResult.comment;
        syl.advice = evalResult.advice;

        if (syl.toneResult) {
          syl.toneResult.score = syl.toneScore;
          syl.toneResult.dtwScore = dtwResult.score;
          syl.toneResult.slopeScore = evalResult.score;
          syl.toneResult.sublabel = evalResult.comment || "✓ Exact";
          syl.toneResult.tier = syl.toneScore >= 85 ? "EMERALD" : (syl.toneScore >= 65 ? "AMBER" : "ROSE");
          syl.toneResult.advice = evalResult.advice || "";
        }

        const initialScore = syl.initial?.score !== undefined ? syl.initial.score : 90;
        const finalScore = syl.final?.score !== undefined ? syl.final.score : 85;
        syl.finalScore = Math.round(0.50 * syl.toneScore + 0.30 * finalScore + 0.20 * initialScore);
        syl.overallScore = syl.finalScore;
      }
    });

    result.overallScore = result.syllables.length > 0
      ? Math.round(result.syllables.reduce((acc, s) => acc + s.finalScore, 0) / result.syllables.length)
      : 0;

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

      // Audit section and Coach Card always remain visible in layout to maintain constant vertical height
      if (auditSec) auditSec.classList.remove('hidden');
      if (coachCard) coachCard.classList.remove('hidden');

      if (state === 1) {
        if (userTrack) userTrack.classList.add('hidden');
        if (waveform) waveform.classList.add('hidden');
        renderEmptyAudit();
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

// ========================================================
// WORD TRAINER MODULE: UI HOOKS, DRAWING ENGINE & VALIDATION
// Celadon Jade & Seal Vermilion Palette | Multisensory Lab
// ========================================================
function setupWordTrainerUI() {
  const scaffoldToggleBtn = document.getElementById('scaffold-toggle-btn');
  const clearCanvasBtn = document.getElementById('clear-canvas-btn');
  const toneBtns = document.querySelectorAll('.tone-choice-btn');
  const submitBtn = document.getElementById('submit-word-btn');
  const phaseBtns = document.querySelectorAll('.phase-btn');
  const audioReplayBtn = document.getElementById('audio-replay-btn');
  
  const cardRevealModal = document.getElementById('card-reveal-modal');
  const modalNextBtn = document.getElementById('modal-next-btn');
  const modalReplayBtn = document.getElementById('modal-replay-btn');
  
  const phaseCompleteModal = document.getElementById('phase-complete-modal');
  const advancePhaseBtn = document.getElementById('advance-phase-btn');
  const stayPhaseBtn = document.getElementById('stay-phase-btn');

  const canvasGhostChar = document.getElementById('canvas-ghost-char');
  const paintCanvas = document.getElementById('hanzi-paint-canvas');
  const feedbackBanner = document.getElementById('validation-feedback-banner');
  const feedbackIcon = document.getElementById('validation-feedback-icon');
  const feedbackText = document.getElementById('validation-feedback-text');
  const attemptPips = document.getElementById('attempt-pips');
  
  let isScaffoldOn = true;
  let selectedTone = null;
  let attemptsLeft = 3;
  const targetTone = 4; // '日' rì (Tone 4 - falling)

  // ----------------------------------------------------
  // A. NATIVE HTML5 CANVAS DRAWING ENGINE (MOUSE + TOUCH)
  // ----------------------------------------------------
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let strokeCount = 0;
  let currentStrokeLength = 0;
  let totalDrawnLength = 0;
  let ctx = null;

  if (paintCanvas) {
    ctx = paintCanvas.getContext('2d');
  }

  function initWordTrainerCanvas() {
    if (!paintCanvas || !ctx) return;
    const rect = paintCanvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    
    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);

    if (paintCanvas.width !== targetW || paintCanvas.height !== targetH) {
      let savedImg = null;
      if (paintCanvas.width > 0 && paintCanvas.height > 0) {
        try { savedImg = ctx.getImageData(0, 0, paintCanvas.width, paintCanvas.height); } catch (_) {}
      }
      paintCanvas.width = targetW;
      paintCanvas.height = targetH;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(10, Math.round(14 * dpr));
      ctx.strokeStyle = '#1E1B2E';
      if (savedImg) {
        try { ctx.putImageData(savedImg, 0, 0); } catch (_) {}
      }
    }
  }
  window.initWordTrainerCanvas = initWordTrainerCanvas;

  function getCanvasCoords(e) {
    if (!paintCanvas) return { x: 0, y: 0 };
    const rect = paintCanvas.getBoundingClientRect();
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    const dpr = window.devicePixelRatio || 1;
    return {
      x: (clientX - rect.left) * dpr,
      y: (clientY - rect.top) * dpr
    };
  }

  function startDrawing(e) {
    if (!paintCanvas || !ctx) return;
    initWordTrainerCanvas();
    if (e.cancelable && (e.type.startsWith('touch') || e.type.startsWith('pointer'))) {
      e.preventDefault();
    }
    isDrawing = true;
    const coords = getCanvasCoords(e);
    lastX = coords.x;
    lastY = coords.y;
    currentStrokeLength = 0;

    ctx.beginPath();
    ctx.arc(lastX, lastY, ctx.lineWidth / 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#1E1B2E';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);

    // If feedback had error, reset to guidance
    if (feedbackBanner && (feedbackBanner.classList.contains('border-rose-500') || feedbackBanner.classList.contains('border-rose-600') || feedbackBanner.classList.contains('border-amber-500'))) {
      updateFeedback('neutral', 'Drawing strokes... Select tone and submit when ready.');
    }
  }

  function moveDrawing(e) {
    if (!isDrawing || !ctx) return;
    if (e.cancelable && (e.type.startsWith('touch') || e.type.startsWith('pointer'))) {
      e.preventDefault();
    }
    const coords = getCanvasCoords(e);
    const dist = Math.hypot(coords.x - lastX, coords.y - lastY);
    currentStrokeLength += dist;
    totalDrawnLength += dist;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    lastX = coords.x;
    lastY = coords.y;
  }

  function stopDrawing(e) {
    if (!isDrawing || !ctx) return;
    isDrawing = false;
    if (currentStrokeLength > 8) {
      strokeCount++;
    }
    ctx.closePath();
  }

  if (paintCanvas) {
    // Pointer Events (Unified Mouse, Pen, Touch)
    paintCanvas.addEventListener('pointerdown', (e) => {
      try { paintCanvas.setPointerCapture(e.pointerId); } catch (_) {}
      startDrawing(e);
    });
    paintCanvas.addEventListener('pointermove', moveDrawing);
    paintCanvas.addEventListener('pointerup', (e) => {
      stopDrawing(e);
      try { paintCanvas.releasePointerCapture(e.pointerId); } catch (_) {}
    });
    paintCanvas.addEventListener('pointercancel', (e) => {
      stopDrawing(e);
      try { paintCanvas.releasePointerCapture(e.pointerId); } catch (_) {}
    });

    // Touch Event fallbacks to guarantee no mobile scrolling while drawing
    paintCanvas.addEventListener('touchstart', startDrawing, { passive: false });
    paintCanvas.addEventListener('touchmove', moveDrawing, { passive: false });
    paintCanvas.addEventListener('touchend', stopDrawing);
    paintCanvas.addEventListener('touchcancel', stopDrawing);

    // Mouse Event fallbacks for legacy browsers
    paintCanvas.addEventListener('mousedown', startDrawing);
    window.addEventListener('mousemove', (e) => { if (isDrawing) moveDrawing(e); });
    window.addEventListener('mouseup', (e) => { if (isDrawing) stopDrawing(e); });
  }

  function clearPaintCanvas() {
    if (paintCanvas && ctx) {
      ctx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
    }
    strokeCount = 0;
    currentStrokeLength = 0;
    totalDrawnLength = 0;
  }

  // Window resize listener to keep canvas in sync
  window.addEventListener('resize', () => {
    initWordTrainerCanvas();
  });

  // ----------------------------------------------------
  // B. VALIDATION FEEDBACK BANNER CONTROLLER
  // ----------------------------------------------------
  function updateFeedback(status, message) {
    if (!feedbackBanner || !feedbackText) return;
    feedbackText.textContent = message;

    // Reset styles
    feedbackBanner.className = 'order-3 lg:order-3 w-full rounded-xl p-2.5 sm:p-3 border-2 transition-all font-mono text-xs font-bold shadow-xs flex items-center gap-2.5';

    if (status === 'hanzi-error') {
      feedbackBanner.classList.add('bg-amber-50', 'border-amber-500', 'text-amber-950');
      if (feedbackIcon) {
        feedbackIcon.className = 'material-symbols-outlined text-amber-600 text-lg shrink-0';
        feedbackIcon.textContent = 'draw';
      }
    } else if (status === 'tone-error') {
      feedbackBanner.classList.add('bg-rose-50', 'border-rose-500', 'text-rose-950');
      if (feedbackIcon) {
        feedbackIcon.className = 'material-symbols-outlined text-rose-600 text-lg shrink-0';
        feedbackIcon.textContent = 'music_off';
      }
    } else if (status === 'both-error') {
      feedbackBanner.classList.add('bg-rose-50', 'border-rose-600', 'text-rose-950');
      if (feedbackIcon) {
        feedbackIcon.className = 'material-symbols-outlined text-rose-600 text-lg shrink-0';
        feedbackIcon.textContent = 'error';
      }
    } else if (status === 'correct') {
      feedbackBanner.classList.add('bg-emerald-50', 'border-emerald-600', 'text-emerald-950');
      if (feedbackIcon) {
        feedbackIcon.className = 'material-symbols-outlined text-emerald-600 text-lg shrink-0';
        feedbackIcon.textContent = 'check_circle';
      }
    } else {
      feedbackBanner.classList.add('bg-white', 'border-black/20', 'text-black/70');
      if (feedbackIcon) {
        feedbackIcon.className = 'material-symbols-outlined text-black/50 text-lg shrink-0';
        feedbackIcon.textContent = 'lightbulb';
      }
    }
  }

  function shakeElement(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('shake-error');
    void el.offsetWidth; // Force CSS reflow to re-trigger keyframe
    el.classList.add('shake-error');
  }

  function updateAttemptPips() {
    if (!attemptPips) return;
    if (attemptsLeft === 3) {
      attemptPips.innerHTML = '<span class="pip text-[#D97706]">●</span><span class="pip text-[#D97706]">●</span><span class="pip text-[#D97706]">●</span>';
    } else if (attemptsLeft === 2) {
      attemptPips.innerHTML = '<span class="pip text-[#D97706]">●</span><span class="pip text-[#D97706]">●</span><span class="pip text-black/30">○</span>';
    } else if (attemptsLeft === 1) {
      attemptPips.innerHTML = '<span class="pip text-red-500 animate-pulse">●</span><span class="pip text-black/30">○</span><span class="pip text-black/30">○</span>';
    } else {
      attemptPips.innerHTML = '<span class="pip text-black/30">○</span><span class="pip text-black/30">○</span><span class="pip text-black/30">○</span>';
    }
  }

  // ----------------------------------------------------
  // C. PHASE STEPPER BUTTONS
  // ----------------------------------------------------
  const phaseMetadata = {
    1: { title: 'Phase 1: Elemental Atoms', count: 55 },
    2: { title: 'Phase 2: Compound Characters', count: 80 },
    3: { title: 'Phase 3: Core Binary Compounds', count: 115 },
    4: { title: 'Phase 4: Semantic Networks', count: 120 },
    5: { title: 'Phase 5: Idiomatic & Poly-Syllabic', count: 127 },
  };

  phaseBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.getAttribute('data-phase');
      phaseBtns.forEach(b => {
        b.classList.remove('phase-active', 'bg-[#4C1D95]', 'text-white', 'shadow-hard-black');
        b.classList.add('phase-available', 'bg-white', 'text-black', 'shadow-sm');
      });
      btn.classList.add('phase-active', 'bg-[#4C1D95]', 'text-white', 'shadow-hard-black');
      btn.classList.remove('phase-available', 'bg-white', 'text-black', 'shadow-sm');

      const meta = phaseMetadata[p] || phaseMetadata[1];
      const titleEl = document.getElementById('phase-title');
      const progressLabel = document.getElementById('overall-progress-label');
      if (titleEl) titleEl.textContent = meta.title;
      if (progressLabel) progressLabel.textContent = `Progress: 0 / ${meta.count} Words`;

      if (window.WordTrainerEngine && typeof window.WordTrainerEngine.switchPhase === 'function') {
        window.WordTrainerEngine.switchPhase(parseInt(p, 10));
      }
    });
  });

  // ----------------------------------------------------
  // D. SCAFFOLDING GUIDE TOGGLE
  // ----------------------------------------------------
  if (scaffoldToggleBtn) {
    scaffoldToggleBtn.addEventListener('click', () => {
      isScaffoldOn = !isScaffoldOn;
      if (isScaffoldOn) {
        scaffoldToggleBtn.className = 'scaffold-on flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white border-2 border-black font-mono text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active-collapse cursor-pointer transition-all';
        scaffoldToggleBtn.innerHTML = '<span class="material-symbols-outlined text-base">visibility</span><span>GUIDE: ON</span>';
        if (canvasGhostChar) {
          canvasGhostChar.classList.remove('opacity-0');
          canvasGhostChar.classList.add('opacity-100');
        }
      } else {
        scaffoldToggleBtn.className = 'scaffold-off flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl bg-[#18181b] hover:bg-[#27272a] text-white/80 border-2 border-black font-mono text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active-collapse cursor-pointer transition-all';
        scaffoldToggleBtn.innerHTML = '<span class="material-symbols-outlined text-base">visibility_off</span><span>GUIDE: OFF</span>';
        if (canvasGhostChar) {
          canvasGhostChar.classList.remove('opacity-100');
          canvasGhostChar.classList.add('opacity-0');
        }
      }
      if (window.WordTrainerEngine && typeof window.WordTrainerEngine.toggleScaffolding === 'function') {
        window.WordTrainerEngine.toggleScaffolding(isScaffoldOn);
      }
    });
  }

  // ----------------------------------------------------
  // E. CLEAR CANVAS BUTTON
  // ----------------------------------------------------
  if (clearCanvasBtn) {
    clearCanvasBtn.addEventListener('click', () => {
      clearPaintCanvas();
      const targetCanvas = document.getElementById('hanzi-target-canvas');
      if (targetCanvas) {
        targetCanvas.classList.add('opacity-30');
        setTimeout(() => targetCanvas.classList.remove('opacity-30'), 150);
      }
      updateFeedback('neutral', 'Canvas cleared. Draw the character and select its tone.');
      if (window.WordTrainerEngine && typeof window.WordTrainerEngine.clearCanvas === 'function') {
        window.WordTrainerEngine.clearCanvas();
      }
    });
  }

  // ----------------------------------------------------
  // F. TONE CHOICE BUTTONS
  // ----------------------------------------------------
  toneBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toneBtns.forEach(b => b.classList.remove('tone-selected'));
      btn.classList.add('tone-selected');
      selectedTone = parseInt(btn.getAttribute('data-tone'), 10);
      
      const activeSlot = document.querySelector('.tone-slot.active .tone-slot-val');
      if (activeSlot) {
        activeSlot.textContent = `T${selectedTone}`;
      }

      // If feedback had tone error, soften to neutral
      if (feedbackBanner && (feedbackBanner.classList.contains('border-rose-500') || feedbackBanner.classList.contains('border-rose-600'))) {
        updateFeedback('neutral', `Tone ${selectedTone} selected. Submit to verify.`);
      }

      if (window.WordTrainerEngine && typeof window.WordTrainerEngine.handleToneSelection === 'function') {
        window.WordTrainerEngine.handleToneSelection(selectedTone);
      }
    });
  });

  // ----------------------------------------------------
  // G. SUBMIT & DUAL VERIFICATION PROMPT (HANZI VS TONE)
  // ----------------------------------------------------
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      if (window.WordTrainerEngine && typeof window.WordTrainerEngine.validateSubmission === 'function') {
        window.WordTrainerEngine.validateSubmission();
        return;
      }

      // Evaluation criteria
      const hasHanzi = (strokeCount >= 2 || totalDrawnLength > 50);
      const hasTone = (selectedTone !== null);
      const isToneCorrect = (selectedTone === targetTone);

      // Scenario 1: Both Hanzi and Tone are missing/incomplete
      if (!hasHanzi && !hasTone) {
        updateFeedback('both-error', "⚠️ Incomplete: Draw the character '日' and select a tone before submitting.");
        shakeElement('canvas-arena');
        shakeElement('interaction-footer');
        return;
      }

      // Scenario 2: Hanzi is missing or incomplete, but Tone was selected
      if (!hasHanzi && hasTone) {
        updateFeedback('hanzi-error', `⚠️ Hanzi Error: Tone ${selectedTone} chosen, but character strokes are incomplete! Draw '日' on the grid.`);
        shakeElement('canvas-arena');
        return;
      }

      // Scenario 3: Hanzi is drawn, but Tone is missing
      if (hasHanzi && !hasTone) {
        updateFeedback('tone-error', "⚠️ Tone Missing: Character drawing accepted! Please choose a tone (1st, 2nd, 3rd, 4th, or Neutral).");
        shakeElement('interaction-footer');
        return;
      }

      // Scenario 4: Hanzi is drawn, but Tone is INCORRECT
      if (hasHanzi && !isToneCorrect) {
        attemptsLeft = Math.max(0, attemptsLeft - 1);
        updateAttemptPips();
        shakeElement('interaction-footer');

        if (attemptsLeft > 0) {
          updateFeedback('tone-error', `❌ Tone Error: Hanzi strokes accepted, but Tone ${selectedTone} is incorrect for '日' (Expected: 4th Tone ˋ)! Tries left: ${attemptsLeft}`);
        } else {
          // Graceful reveal after 3 attempts exhausted
          updateFeedback('tone-error', "❌ Attempts exhausted! Revealing full card solution for review.");
          setTimeout(() => {
            if (cardRevealModal) cardRevealModal.classList.remove('hidden');
          }, 450);
        }
        return;
      }

      // Scenario 5: Both Hanzi and Tone are CORRECT!
      updateFeedback('correct', "🎉 Correct! Character verified and Tone 4 (ˋ rì) confirmed.");
      setTimeout(() => {
        if (cardRevealModal) cardRevealModal.classList.remove('hidden');
      }, 350);
    });
  }

  // ----------------------------------------------------
  // H. AUDIO REPLAY
  // ----------------------------------------------------
  const triggerAudioPlay = () => {
    if (audioReplayBtn) {
      audioReplayBtn.classList.add('brightness-125', 'scale-[1.02]');
      setTimeout(() => audioReplayBtn.classList.remove('brightness-125', 'scale-[1.02]'), 600);
    }
    if (window.WordTrainerEngine && typeof window.WordTrainerEngine.playActiveWordAudio === 'function') {
      window.WordTrainerEngine.playActiveWordAudio();
    }
  };
  if (audioReplayBtn) audioReplayBtn.addEventListener('click', triggerAudioPlay);
  if (modalReplayBtn) modalReplayBtn.addEventListener('click', triggerAudioPlay);

  // ----------------------------------------------------
  // I. MODALS ADVANCEMENT & QUEUE HOOKS
  // ----------------------------------------------------
  if (modalNextBtn) {
    modalNextBtn.addEventListener('click', () => {
      if (cardRevealModal) cardRevealModal.classList.add('hidden');
      // Reset card state for next exercise
      clearPaintCanvas();
      selectedTone = null;
      attemptsLeft = 3;
      updateAttemptPips();
      toneBtns.forEach(b => b.classList.remove('tone-selected'));
      updateFeedback('neutral', 'Draw the character in the arena and select its tone to verify.');

      if (window.WordTrainerEngine && typeof window.WordTrainerEngine.advanceToNextWord === 'function') {
        window.WordTrainerEngine.advanceToNextWord();
      }
    });
  }

  if (advancePhaseBtn) {
    advancePhaseBtn.addEventListener('click', () => {
      if (phaseCompleteModal) phaseCompleteModal.classList.add('hidden');
      if (window.WordTrainerEngine && typeof window.WordTrainerEngine.advanceToNextPhase === 'function') {
        window.WordTrainerEngine.advanceToNextPhase();
      }
    });
  }

  if (stayPhaseBtn) {
    stayPhaseBtn.addEventListener('click', () => {
      if (phaseCompleteModal) phaseCompleteModal.classList.add('hidden');
    });
  }

  // Export helper methods on window for tests and engines
  window.WordTrainerDrawing = {
    getStrokeCount: () => strokeCount,
    getTotalLength: () => totalDrawnLength,
    clear: clearPaintCanvas,
    init: initWordTrainerCanvas
  };
}

// Initialize the app
setupButtons();
setupMenu();
setupEnginePlaceholders();
setupWordTrainerUI();
init();
