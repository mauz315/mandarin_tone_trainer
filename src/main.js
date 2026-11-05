import './style.css';
import 'keen-slider/keen-slider.min.css';
import KS from 'keen-slider';

const KeenSlider = KS.default || KS;

let words = [];
let currentItem = null;
let audioInstance = typeof Audio !== 'undefined' ? new Audio() : null;
let audioCtx = null;
const audioBufferCache = new Map();
let currentGameMode = 'tones'; // Options: 'tones', 'initials', 'endings'
let nextQuestionTimer = null; 

// Unlock Web Audio API & HTMLAudioElement on mobile gestures
function unlockAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  if (audioInstance && !audioInstance.src) {
    audioInstance.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
    audioInstance.play().then(() => {
      audioInstance.pause();
    }).catch(() => {});
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('touchstart', unlockAudioContext, { passive: true });
  window.addEventListener('touchend', unlockAudioContext, { passive: true });
  window.addEventListener('click', unlockAudioContext, { passive: true });
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
    });
  }

  if (backFromEngineBtn) {
    backFromEngineBtn.addEventListener('click', () => {
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

async function init() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}single_words.json`);
    if (!response.ok) throw new Error("JSON not found in public folder");
    words = await response.json();
    console.log("App Ready. Vocabulary loaded:", words.length);
    
    setupAudioLibrary();

    setTimeout(() => {
      document.querySelectorAll('.tone-btn').forEach(btn => btn.classList.remove('pop-up'));
    }, 1000);
  } catch (err) {
    console.error("Initialization error:", err);
  }
}

async function playAudio(customPath) {
  unlockAudioContext();
  const audioPath = customPath || (currentItem ? `${import.meta.env.BASE_URL}${currentItem.audio}` : null);
  if (!audioPath) return;

  // 1. Web Audio API (Reliably plays automatically on mobile inside setTimeout)
  if (audioCtx) {
    try {
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      let buffer = audioBufferCache.get(audioPath);
      if (!buffer) {
        const resp = await fetch(audioPath);
        if (resp.ok) {
          const arrayBuf = await resp.arrayBuffer();
          buffer = await audioCtx.decodeAudioData(arrayBuf);
          audioBufferCache.set(audioPath, buffer);
        }
      }
      if (buffer) {
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.start(0);
        return;
      }
    } catch (err) {
      console.warn("Web Audio playback failed, trying HTMLAudio fallback:", err);
    }
  }

  // 2. Fallback to reused HTML5 Audio element
  try {
    if (!audioInstance) {
      audioInstance = new Audio();
    }
    audioInstance.pause();
    audioInstance.currentTime = 0;
    audioInstance.src = audioPath;
    const playPromise = audioInstance.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(e => console.warn("Audio play prevented:", e));
    }
  } catch (e) {
    console.error("Audio failed:", e);
  }
}

function setupButtons() {
  document.querySelectorAll('.tone-btn').forEach((btn, index) => {
    btn.addEventListener('click', (e) => {
      unlockAudioContext();
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
            nextBtn.addEventListener('click', nextQuestion, { once: true });

        } else {
            setTimeout(nextQuestion, 1500);
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
  document.getElementById('play-btn').addEventListener('click', playAudio);
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

  currentItem = words[Math.floor(Math.random() * words.length)];
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
function setupEnginePlaceholders() {
  const recordBtn = document.getElementById('engine-record-btn');
  const nextBtn = document.getElementById('engine-next-btn');
  const resetBtn = document.getElementById('engine-reset-btn');
  const coachPlayBtn = document.getElementById('coach-hear-user-btn');
  const stepCounter = document.getElementById('engine-step-counter');

  // Multi-scenario vocabulary deck across 1, 2, and 3 syllables
  const lessonWords = [
    { syllablesCount: 2, hanzi: "你 好", pinyin: "nǐ hǎo", gloss: "Hello", sandhi: "/ 3rd + 3rd ➔ 2nd + 3rd /", spoken: "ní hǎo" },
    { syllablesCount: 1, hanzi: "妈", pinyin: "mā", gloss: "Mother", sandhi: "/ Tone 1: High Level 55 /", spoken: "mā" },
    { syllablesCount: 3, hanzi: "对 不 起", pinyin: "duì bu qǐ", gloss: "Sorry", sandhi: "/ 4th + Neutral + 3rd /", spoken: "duì bu qǐ" },
    { syllablesCount: 2, hanzi: "可 以", pinyin: "kě yǐ", gloss: "Can / May", sandhi: "/ 3rd + 3rd ➔ 2nd + 3rd /", spoken: "ké yǐ" },
    { syllablesCount: 1, hanzi: "好", pinyin: "hǎo", gloss: "Good", sandhi: "/ Tone 3: Low-Dipping 214 /", spoken: "hǎo" },
    { syllablesCount: 3, hanzi: "冰 淇 淋", pinyin: "bīng qí lín", gloss: "Ice Cream", sandhi: "/ 1st + 2nd + 2nd /", spoken: "bīng qí lín" },
    { syllablesCount: 2, hanzi: "水 果", pinyin: "shuǐ guǒ", gloss: "Fruit", sandhi: "/ 3rd + 3rd ➔ 2nd + 3rd /", spoken: "shuí guǒ" },
    { syllablesCount: 3, hanzi: "没 关 系", pinyin: "méi guān xi", gloss: "It's Okay", sandhi: "/ 2nd + 1st + Neutral /", spoken: "méi guān xi" },
    { syllablesCount: 1, hanzi: "马", pinyin: "mǎ", gloss: "Horse", sandhi: "/ Tone 3: Low-Dipping 214 /", spoken: "mǎ" },
    { syllablesCount: 2, hanzi: "手 表", pinyin: "shǒu biǎo", gloss: "Watch", sandhi: "/ 3rd + 3rd ➔ 2nd + 3rd /", spoken: "shóu biǎo" }
  ];

  let isRecording = false;
  let activeIndex = 0;
  let currentSyllableCount = 2;

  // Reacts dynamically to 1, 2, or 3 syllables across ALL layout components
  function renderSyllableScenario(count, customData) {
    currentSyllableCount = count;

    // 1. Update Top Syllable Selector Button Styles
    const sylBtns = document.querySelectorAll('#engine-syllable-toggle-group button');
    sylBtns.forEach((btn, idx) => {
      const btnCount = idx + 1;
      if (btnCount === count) {
        btn.className = 'px-2 py-0.5 rounded bg-black text-badge-tangerine border border-black font-mono text-[9px] font-bold active-collapse cursor-pointer';
      } else {
        btn.className = 'px-2 py-0.5 rounded bg-white border border-black font-mono text-[9px] font-bold active-collapse cursor-pointer';
      }
    });

    // 2. Resolve Word Data
    let word = customData;
    if (!word) {
      if (count === 1) {
        word = { syllablesCount: 1, hanzi: "妈", pinyin: "mā", gloss: "Mother", sandhi: "/ Tone 1: High Level 55 /", spoken: "mā" };
      } else if (count === 3) {
        word = { syllablesCount: 3, hanzi: "对 不 起", pinyin: "duì bu qǐ", gloss: "Sorry", sandhi: "/ 4th + Neutral + 3rd /", spoken: "duì bu qǐ" };
      } else {
        word = { syllablesCount: 2, hanzi: "你 好", pinyin: "nǐ hǎo", gloss: "Hello", sandhi: "/ 3rd + 3rd ➔ 2nd + 3rd /", spoken: "ní hǎo" };
      }
    }

    // 3. Update Header Context Card
    const hanziEl = document.getElementById('engine-hanzi-display');
    const pinyinEl = document.getElementById('engine-pinyin-display');
    const glossEl = document.getElementById('engine-gloss-display');
    const stageLabel = document.getElementById('engine-stage-label');
    const sandhiBadge = document.getElementById('engine-sandhi-badge');
    const arenaSubtitle = document.getElementById('engine-arena-subtitle');

    if (hanziEl) hanziEl.textContent = word.hanzi;
    if (pinyinEl) pinyinEl.textContent = word.pinyin;
    if (glossEl) glossEl.textContent = `"${word.gloss}"`;

    if (count === 1) {
      if (stageLabel) stageLabel.textContent = '[STAGE 1: ISOLATED SYLLABLE]';
      if (arenaSubtitle) arenaSubtitle.textContent = 'CHAO 5-LEVEL SINGLE-CONTOUR';
      if (sandhiBadge) {
        sandhiBadge.innerHTML = `
          <span class="block text-[9px] text-white/90 uppercase font-black">Isolated Tone Profile</span>
          <span class="font-speed font-black text-xs sm:text-sm text-white">${word.sandhi}</span>
          <span class="block text-[10px] text-black font-black bg-white/90 px-1.5 py-0.2 rounded mt-0.5">Target Spoken: ${word.spoken}</span>
        `;
      }
    } else if (count === 3) {
      if (stageLabel) stageLabel.textContent = '[STAGE 3: 3-SYLLABLE & NEUTRAL TONE]';
      if (arenaSubtitle) arenaSubtitle.textContent = 'CHAO 5-LEVEL TRIPLE-CONTOUR';
      if (sandhiBadge) {
        sandhiBadge.innerHTML = `
          <span class="block text-[9px] text-white/90 uppercase font-black">Compound Rule Applied</span>
          <span class="font-speed font-black text-xs sm:text-sm text-white">${word.sandhi}</span>
          <span class="block text-[10px] text-black font-black bg-white/90 px-1.5 py-0.2 rounded mt-0.5">Target Spoken: ${word.spoken}</span>
        `;
      }
    } else {
      if (stageLabel) stageLabel.textContent = '[STAGE 2: TONE SANDHI]';
      if (arenaSubtitle) arenaSubtitle.textContent = 'CHAO 5-LEVEL DUAL-CONTOUR';
      if (sandhiBadge) {
        sandhiBadge.innerHTML = `
          <span class="block text-[9px] text-white/90 uppercase font-black">Sandhi Rule Applied</span>
          <span class="font-speed font-black text-xs sm:text-sm text-white">${word.sandhi}</span>
          <span class="block text-[10px] text-black font-black bg-white/90 px-1.5 py-0.2 rounded mt-0.5">Target Spoken: ${word.spoken}</span>
        `;
      }
    }

    // 4. Update SVG Pitch Arena Geometry (Narrower Proportional Axis for 1-Syllable Words)
    const pitchChartWrapper = document.getElementById('pitch-chart-wrapper');
    const pitchSvg = document.getElementById('pitch-chart-svg');
    const gridLevelsContainer = document.getElementById('pitch-grid-levels');
    const dividersContainer = document.getElementById('pitch-syllable-dividers');
    const ribbonsContainer = document.getElementById('pitch-target-ribbons');
    const pathsContainer = document.getElementById('user-pitch-paths-container');
    const pointsContainer = document.getElementById('user-pitch-points-container');
    const waveformGroup = document.getElementById('engine-live-waveform-group');
    const milestonesContainer = document.getElementById('pitch-time-milestones');
    const timelineFill = document.getElementById('pitch-timeline-fill');
    const timelineText = document.getElementById('pitch-timeline-text');

    if (count === 1) {
      // 1 Syllable Geometry: Narrower proportional horizontal axis (~0.32s duration)
      if (pitchChartWrapper) {
        pitchChartWrapper.className = 'flex gap-1.5 items-center justify-center max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] mx-auto my-auto transition-all duration-300';
      }
      if (pitchSvg) {
        pitchSvg.setAttribute('viewBox', '0 0 350 155');
      }

      // Proportional Horizontal Grid Lines (Level 5 down to Level 1 across 350px)
      if (gridLevelsContainer) {
        gridLevelsContainer.innerHTML = `
          <line x1="15" y1="15" x2="335" y2="15" />
          <line x1="15" y1="46" x2="335" y2="46" />
          <line x1="15" y1="78" x2="335" y2="78" />
          <line x1="15" y1="110" x2="335" y2="110" />
          <line x1="15" y1="140" x2="335" y2="140" />
        `;
      }

      if (dividersContainer) dividersContainer.innerHTML = '';
      
      const isDipping = word.sandhi && word.sandhi.includes('Dipping');
      if (ribbonsContainer) {
        if (isDipping) {
          // Tone 3 Dipping Ribbon across ~0.32s
          ribbonsContainer.innerHTML = `
            <polygon id="target-ribbon-s1" points="40,105 160,146 310,48 310,30 160,126 40,85" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
          `;
        } else {
          // Tone 1 High-Level Corridor across ~0.32s
          ribbonsContainer.innerHTML = `
            <polygon id="target-ribbon-s1" points="40,22 310,22 310,8 40,8" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
          `;
        }
      }

      if (pathsContainer) {
        if (isDipping) {
          pathsContainer.innerHTML = `
            <path id="user-pitch-path-s1" d="M 40,95 Q 160,142 310,40" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
          `;
        } else {
          pathsContainer.innerHTML = `
            <path id="user-pitch-path-s1" d="M 40,15 Q 175,13 310,15" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
          `;
        }
      }

      if (pointsContainer) {
        if (isDipping) {
          pointsContainer.innerHTML = `
            <g id="user-pitch-points-s1">
              <circle cx="40" cy="95" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="100" cy="118" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="160" cy="142" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="235" cy="95" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="310" cy="40" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
            </g>
          `;
        } else {
          pointsContainer.innerHTML = `
            <g id="user-pitch-points-s1">
              <circle cx="40" cy="15" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="95" cy="14" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="150" cy="13" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="205" cy="13" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="260" cy="14" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="310" cy="15" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
            </g>
          `;
        }
      }

      if (waveformGroup) {
        waveformGroup.innerHTML = `
          <path d="M 30,80 Q 70,50 110,80 T 190,80 T 270,80 T 320,80" fill="none" stroke="#FF5C1C" stroke-width="3" stroke-linecap="round" class="animate-pulse" />
          <text x="175" y="75" class="font-mono text-xs font-black fill-badge-tangerine" text-anchor="middle">CAPTURING VOCAL SPECTRUM...</text>
        `;
      }

      if (milestonesContainer) {
        milestonesContainer.innerHTML = `
          <text x="40" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.00s</text>
          <text x="175" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[${word.pinyin}] ~320ms</text>
          <text x="310" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.32s</text>
        `;
      }

      if (timelineFill) timelineFill.style.width = '55%';
      if (timelineText) timelineText.textContent = '0.18s / 0.32s';

    } else {
      // 2 or 3 Syllables Geometry: Full-width multi-syllable chart
      if (pitchChartWrapper) {
        pitchChartWrapper.className = 'flex gap-1.5 items-center justify-center w-full my-auto transition-all duration-300';
      }
      if (pitchSvg) {
        pitchSvg.setAttribute('viewBox', '0 0 660 155');
      }

      if (gridLevelsContainer) {
        gridLevelsContainer.innerHTML = `
          <line x1="20" y1="15" x2="640" y2="15" />
          <line x1="20" y1="46" x2="640" y2="46" />
          <line x1="20" y1="78" x2="640" y2="78" />
          <line x1="20" y1="110" x2="640" y2="110" />
          <line x1="20" y1="140" x2="640" y2="140" />
        `;
      }

      if (waveformGroup) {
        waveformGroup.innerHTML = `
          <path d="M 50,80 Q 90,50 130,80 T 210,80 T 290,80 T 370,80 T 450,80 T 530,80 T 610,80" fill="none" stroke="#FF5C1C" stroke-width="3" stroke-linecap="round" class="animate-pulse" />
          <text x="330" y="75" class="font-mono text-xs font-black fill-badge-tangerine" text-anchor="middle">CAPTURING VOCAL SPECTRUM...</text>
        `;
      }

      if (count === 3) {
        // 3 Syllables Geometry: 3 partitions (33% each) across ~0.85s
        if (dividersContainer) {
          dividersContainer.innerHTML = `
            <line x1="225" y1="8" x2="225" y2="142" class="stroke-black/30 stroke-[2] stroke-dasharray-[4,4]" />
            <text x="231" y="20" class="font-mono text-[8px] fill-black/60 font-black">SYL 2 [bu] ➔</text>
            <line x1="435" y1="8" x2="435" y2="142" class="stroke-black/30 stroke-[2] stroke-dasharray-[4,4]" />
            <text x="441" y="20" class="font-mono text-[8px] fill-black/60 font-black">SYL 3 [qǐ] ➔</text>
          `;
        }

        if (ribbonsContainer) {
          ribbonsContainer.innerHTML = `
            <polygon id="target-ribbon-s1" points="35,16 195,135 195,115 35,6" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
            <polygon id="target-ribbon-s2" points="245,95 405,102 405,86 245,80" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
            <polygon id="target-ribbon-s3" points="455,98 535,146 625,56 625,38 535,126 455,78" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
          `;
        }

        if (pathsContainer) {
          pathsContainer.innerHTML = `
            <path id="user-pitch-path-s1" d="M 35,18 Q 115,70 195,126" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
            <path id="user-pitch-path-s2" d="M 245,90 Q 325,92 405,96" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
            <path id="user-pitch-path-s3" d="M 455,92 Q 535,142 625,48" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
          `;
        }

        if (pointsContainer) {
          pointsContainer.innerHTML = `
            <g id="user-pitch-points-s1">
              <circle cx="35" cy="18" r="4" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="115" cy="70" r="4" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="195" cy="126" r="4" fill="#B8F526" stroke="#000" stroke-width="2" />
            </g>
            <g id="user-pitch-points-s2">
              <circle cx="245" cy="90" r="4" fill="#FDF197" stroke="#000" stroke-width="2" />
              <circle cx="325" cy="92" r="4" fill="#FF5C1C" stroke="#000" stroke-width="2" />
              <circle cx="405" cy="96" r="4" fill="#FF5C1C" stroke="#000" stroke-width="2" />
            </g>
            <g id="user-pitch-points-s3">
              <circle cx="455" cy="92" r="4" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="535" cy="142" r="4" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="625" cy="48" r="4" fill="#B8F526" stroke="#000" stroke-width="2" />
            </g>
          `;
        }

        if (milestonesContainer) {
          milestonesContainer.innerHTML = `
            <text x="35" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.00s</text>
            <text x="115" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[duì]</text>
            <text x="195" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.28s</text>
            <text x="245" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.30s</text>
            <text x="325" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[bu]</text>
            <text x="405" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.46s</text>
            <text x="455" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.48s</text>
            <text x="540" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[qǐ]</text>
            <text x="625" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.85s</text>
          `;
        }

        if (timelineFill) timelineFill.style.width = '55%';
        if (timelineText) timelineText.textContent = '0.46s / 0.85s';

      } else {
        // 2 Syllables Geometry: Default 50% split across ~0.72s
        if (dividersContainer) {
          dividersContainer.innerHTML = `
            <line x1="330" y1="8" x2="330" y2="142" class="stroke-black/30 stroke-[2] stroke-dasharray-[4,4]" />
            <text x="336" y="20" class="font-mono text-[9px] fill-black/60 font-black">SYLLABLE 2 [hǎo] ➔</text>
          `;
        }

        if (ribbonsContainer) {
          ribbonsContainer.innerHTML = `
            <polygon id="target-ribbon-s1" points="70,95 300,28 300,10 70,75" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
            <polygon id="target-ribbon-s2" points="360,98 470,146 600,52 600,32 470,126 360,78" class="fill-badge-cobalt/20 stroke-badge-cobalt stroke-[2] stroke-dasharray-[3,3]" />
          `;
        }

        if (pathsContainer) {
          pathsContainer.innerHTML = `
            <path id="user-pitch-path-s1" d="M 70,85 Q 180,54 300,48" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
            <path id="user-pitch-path-s2" d="M 360,88 Q 465,138 600,45" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
          `;
        }

        if (pointsContainer) {
          pointsContainer.innerHTML = `
            <g id="user-pitch-points-s1">
              <circle cx="70" cy="85" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="120" cy="70" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="180" cy="58" r="4.5" fill="#FDF197" stroke="#000" stroke-width="2" />
              <circle cx="240" cy="50" r="5" fill="#FF5C1C" stroke="#000" stroke-width="2" />
              <circle cx="300" cy="48" r="5" fill="#FF5C1C" stroke="#000" stroke-width="2" />
            </g>
            <g id="user-pitch-points-s2">
              <circle cx="360" cy="88" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="410" cy="112" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="465" cy="138" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="530" cy="90" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
              <circle cx="600" cy="45" r="4.5" fill="#B8F526" stroke="#000" stroke-width="2" />
            </g>
          `;
        }

        if (milestonesContainer) {
          milestonesContainer.innerHTML = `
            <text x="70" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.00s</text>
            <text x="180" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[Initial: n] [Final: í]</text>
            <text x="300" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.32s</text>
            <text x="360" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.34s</text>
            <text x="480" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">[Initial: h] [Final: ǎo]</text>
            <text x="600" y="152" class="font-mono text-[8px] fill-black/60 font-bold" text-anchor="middle">0.72s</text>
          `;
        }

        if (timelineFill) timelineFill.style.width = '45%';
        if (timelineText) timelineText.textContent = '0.32s / 0.72s';
      }
    }

    // 5. Update Phonetic Audit Section Responsive Grid
    const auditGrid = document.getElementById('phonetic-audit-grid');
    if (auditGrid) {
      if (count === 1) {
        auditGrid.className = 'grid grid-cols-1 max-w-sm sm:max-w-md mx-auto gap-2';
        auditGrid.innerHTML = `
          <div class="bg-white border-[2.5px] border-black rounded-xl p-2.5 shadow-hard-black">
            <div class="flex items-center justify-between mb-1 pb-1 border-b border-black/10">
              <span class="font-speed font-black text-xs uppercase text-black">SYLLABLE 1: [${word.pinyin}]</span>
              <span class="font-mono text-[9px] font-black text-black bg-canvas-acid px-1.5 py-0.2 rounded border border-black">ACCURATE CONTOUR</span>
            </div>
            <div class="grid grid-cols-3 gap-1 font-mono text-center">
              <div class="bg-slate-100 border border-black rounded-lg p-1">
                <span class="block text-[8px] text-black/60 font-black">INITIAL: m</span>
                <span class="font-speed font-black text-xs sm:text-sm text-black">96%</span>
                <span class="block text-[8px] text-emerald-700 font-bold">✓ Clean</span>
              </div>
              <div class="bg-slate-100 border border-black rounded-lg p-1">
                <span class="block text-[8px] text-black/60 font-black">FINAL: a</span>
                <span class="font-speed font-black text-xs sm:text-sm text-black">92%</span>
                <span class="block text-[8px] text-emerald-700 font-bold">✓ Exact</span>
              </div>
              <div class="bg-canvas-acid/40 border border-black rounded-lg p-1">
                <span class="block text-[8px] text-black font-black">TONE: 1</span>
                <span class="font-speed font-black text-xs sm:text-sm text-black">98%</span>
                <span class="block text-[8px] text-emerald-700 font-bold">✓ 55 Flat</span>
              </div>
            </div>
          </div>
        `;
      } else if (count === 3) {
        auditGrid.className = 'grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2';
        auditGrid.innerHTML = `
          <div class="bg-white border-[2.5px] border-black rounded-xl p-2 shadow-hard-black">
            <div class="flex items-center justify-between mb-1 pb-1 border-b border-black/10">
              <span class="font-speed font-black text-[11px] uppercase text-black">SYL 1: [duì]</span>
              <span class="font-mono text-[8px] font-black text-black bg-canvas-acid px-1 rounded border border-black">✓ 4TH</span>
            </div>
            <div class="grid grid-cols-3 gap-1 font-mono text-center">
              <div class="bg-slate-100 border border-black rounded-lg p-0.5">
                <span class="block text-[8px] text-black/60 font-black">INIT: d</span>
                <span class="font-speed font-black text-xs text-black">91%</span>
              </div>
              <div class="bg-slate-100 border border-black rounded-lg p-0.5">
                <span class="block text-[8px] text-black/60 font-black">FIN: ui</span>
                <span class="font-speed font-black text-xs text-black">88%</span>
              </div>
              <div class="bg-canvas-acid/40 border border-black rounded-lg p-0.5">
                <span class="block text-[8px] text-black font-black">TONE: 4</span>
                <span class="font-speed font-black text-xs text-black">94%</span>
              </div>
            </div>
          </div>

          <div class="bg-white border-[2.5px] border-black rounded-xl p-2 shadow-hard-black">
            <div class="flex items-center justify-between mb-1 pb-1 border-b border-black/10">
              <span class="font-speed font-black text-[11px] uppercase text-black">SYL 2: [bu]</span>
              <span class="font-mono text-[8px] font-black text-white bg-badge-tangerine px-1 rounded border border-black">⚠ STRESSED</span>
            </div>
            <div class="grid grid-cols-3 gap-1 font-mono text-center">
              <div class="bg-slate-100 border border-black rounded-lg p-0.5">
                <span class="block text-[8px] text-black/60 font-black">INIT: b</span>
                <span class="font-speed font-black text-xs text-black">89%</span>
              </div>
              <div class="bg-slate-100 border border-black rounded-lg p-0.5">
                <span class="block text-[8px] text-black/60 font-black">FIN: u</span>
                <span class="font-speed font-black text-xs text-black">92%</span>
              </div>
              <div class="bg-badge-tangerine/15 border border-badge-tangerine rounded-lg p-0.5">
                <span class="block text-[8px] text-badge-tangerine font-black">NEUTRAL</span>
                <span class="font-speed font-black text-xs text-badge-tangerine">62%</span>
              </div>
            </div>
          </div>

          <div class="bg-white border-[2.5px] border-black rounded-xl p-2 shadow-hard-black">
            <div class="flex items-center justify-between mb-1 pb-1 border-b border-black/10">
              <span class="font-speed font-black text-[11px] uppercase text-black">SYL 3: [qǐ]</span>
              <span class="font-mono text-[8px] font-black text-black bg-canvas-acid px-1 rounded border border-black">✓ 3RD</span>
            </div>
            <div class="grid grid-cols-3 gap-1 font-mono text-center">
              <div class="bg-slate-100 border border-black rounded-lg p-0.5">
                <span class="block text-[8px] text-black/60 font-black">INIT: q</span>
                <span class="font-speed font-black text-xs text-black">85%</span>
              </div>
              <div class="bg-slate-100 border border-black rounded-lg p-0.5">
                <span class="block text-[8px] text-black/60 font-black">FIN: i</span>
                <span class="font-speed font-black text-xs text-black">90%</span>
              </div>
              <div class="bg-canvas-acid/40 border border-black rounded-lg p-0.5">
                <span class="block text-[8px] text-black font-black">TONE: 3</span>
                <span class="font-speed font-black text-xs text-black">93%</span>
              </div>
            </div>
          </div>
        `;
      } else {
        auditGrid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-2';
        auditGrid.innerHTML = `
          <div class="bg-white border-[2.5px] border-black rounded-xl p-2.5 shadow-hard-black">
            <div class="flex items-center justify-between mb-1 pb-1 border-b border-black/10">
              <span class="font-speed font-black text-xs uppercase text-black">SYLLABLE 1: [ní]</span>
              <span class="font-mono text-[9px] font-black text-white bg-badge-tangerine px-1.5 py-0.2 rounded border border-black">TONE DIVERGENCE</span>
            </div>
            <div class="grid grid-cols-3 gap-1 font-mono text-center">
              <div class="bg-slate-100 border border-black rounded-lg p-1">
                <span class="block text-[8px] text-black/60 font-black">INITIAL: n</span>
                <span class="font-speed font-black text-xs sm:text-sm text-black">94%</span>
                <span class="block text-[8px] text-emerald-700 font-bold">✓ Clean</span>
              </div>
              <div class="bg-slate-100 border border-black rounded-lg p-1">
                <span class="block text-[8px] text-black/60 font-black">FINAL: i</span>
                <span class="font-speed font-black text-xs sm:text-sm text-black">90%</span>
                <span class="block text-[8px] text-emerald-700 font-bold">✓ Exact</span>
              </div>
              <div class="bg-badge-tangerine/15 border-2 border-badge-tangerine rounded-lg p-1">
                <span class="block text-[8px] text-badge-tangerine font-black">TONE: 2</span>
                <span class="font-speed font-black text-xs sm:text-sm text-badge-tangerine">61%</span>
                <span class="block text-[8px] text-badge-tangerine font-bold">⚠ Flat</span>
              </div>
            </div>
          </div>

          <div class="bg-white border-[2.5px] border-black rounded-xl p-2.5 shadow-hard-black">
            <div class="flex items-center justify-between mb-1 pb-1 border-b border-black/10">
              <span class="font-speed font-black text-xs uppercase text-black">SYLLABLE 2: [hǎo]</span>
              <span class="font-mono text-[9px] font-black text-black bg-canvas-acid px-1.5 py-0.2 rounded border border-black">ACCURATE CONTOUR</span>
            </div>
            <div class="grid grid-cols-3 gap-1 font-mono text-center">
              <div class="bg-slate-100 border border-black rounded-lg p-1">
                <span class="block text-[8px] text-black/60 font-black">INITIAL: h</span>
                <span class="font-speed font-black text-xs sm:text-sm text-black">89%</span>
                <span class="block text-[8px] text-emerald-700 font-bold">✓ Clean</span>
              </div>
              <div class="bg-slate-100 border border-black rounded-lg p-1">
                <span class="block text-[8px] text-black/60 font-black">FINAL: ao</span>
                <span class="font-speed font-black text-xs sm:text-sm text-black">85%</span>
                <span class="block text-[8px] text-emerald-700 font-bold">✓ Open</span>
              </div>
              <div class="bg-slate-100 border border-black rounded-lg p-1">
                <span class="block text-[8px] text-black/60 font-black">TONE: 3</span>
                <span class="font-speed font-black text-xs sm:text-sm text-black">94%</span>
                <span class="block text-[8px] text-emerald-700 font-bold">✓ Dipped</span>
              </div>
            </div>
          </div>
        `;
      }
    }

    // 6. Update Coach Advice
    const coachText = document.getElementById('coach-advice-text');
    if (coachText) {
      if (count === 1) {
        coachText.innerHTML = `"Laser-flat pitch! Keep your voice steady at <strong class="bg-black text-white px-1.5 py-0.5 rounded">Level 5 (55)</strong> without letting it drift down at the end."`;
      } else if (count === 3) {
        coachText.innerHTML = `"On the neutral tone <strong class="bg-badge-tangerine text-white px-1.5 py-0.5 rounded">'bu'</strong>, keep it ultra-brief (~100ms) and light. Do not stress or lengthen it—it should bounce smoothly into <em class="text-badge-cobalt font-black">'qǐ'</em>."`;
      } else {
        coachText.innerHTML = `"You flattened out too early on <strong class="bg-badge-tangerine text-white px-1.5 py-0.5 rounded">'ní'</strong>. Keep your pitch climbing all the way to the top, like asking a surprised question: <em class="text-badge-cobalt font-black">'Really?!'</em>"`;
      }
    }
  }

  function activateWordIndex(index) {
    activeIndex = Math.max(0, Math.min(index, lessonWords.length - 1));
    const word = lessonWords[activeIndex];
    if (word) {
      renderSyllableScenario(word.syllablesCount, word);
    }
    if (stepCounter) {
      stepCounter.textContent = `STEP ${activeIndex + 1} / ${lessonWords.length}`;
    }
  }

  // Next Word Button advances to next lesson pair & automatically updates syllable scenario
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const nextIndex = (activeIndex + 1) % lessonWords.length;
      activateWordIndex(nextIndex);
    });
  }

  // Reset Button resets to index 0 and re-primes
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      activateWordIndex(0);
      if (window.PronunciationEngine) {
        window.PronunciationEngine.setRevealState(1);
      }
    });
  }

  // Playback My Voice simulation
  if (coachPlayBtn) {
    coachPlayBtn.addEventListener('click', () => {
      const originalHtml = coachPlayBtn.innerHTML;
      coachPlayBtn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">sync</span> PLAYING USER TRACK...';
      coachPlayBtn.classList.add('bg-badge-tangerine', 'text-white');
      setTimeout(() => {
        coachPlayBtn.innerHTML = originalHtml;
        coachPlayBtn.classList.remove('bg-badge-tangerine', 'text-white');
      }, 1200);
    });
  }

  // Tap-to-Record / Retry toggle simulation
  if (recordBtn) {
    recordBtn.addEventListener('click', () => {
      isRecording = !isRecording;
      const label = recordBtn.querySelector('span:nth-child(2)');
      const pulseDot = recordBtn.querySelector('span:nth-child(1)');
      if (isRecording) {
        recordBtn.classList.replace('bg-badge-tangerine', 'bg-black');
        recordBtn.classList.add('text-badge-tangerine');
        recordBtn.classList.remove('text-white');
        if (label) label.textContent = 'LISTENING... (TAP TO STOP)';
        if (pulseDot) pulseDot.classList.add('bg-badge-tangerine', 'scale-125');
      } else {
        recordBtn.classList.replace('bg-black', 'bg-badge-tangerine');
        recordBtn.classList.remove('text-badge-tangerine');
        recordBtn.classList.add('text-white');
        if (label) label.textContent = 'TAP TO RETRY';
        if (pulseDot) pulseDot.classList.remove('bg-badge-tangerine', 'scale-125');
      }
    });
  }

  // Exposed API on window for future backend / DSP agent
  window.PronunciationEngine = {
    // 0. Progressive Reveal State Switcher (1: Priming, 2: Capture, 4: Audit & Coach)
    setRevealState(state) {
      const userTrack = document.getElementById('user-voice-track-group');
      const waveform = document.getElementById('engine-live-waveform-group');
      const auditSec = document.getElementById('phonetic-audit-section');
      const coachCard = document.getElementById('articulatory-coach-card');
      const stateBtns = document.querySelectorAll('#engine-state-toggle-group button');

      // Update state button styles
      stateBtns.forEach((b, idx) => {
        const targetState = idx === 0 ? 1 : (idx === 1 ? 2 : 4);
        if (targetState === state) {
          b.className = 'px-1.5 py-0.5 rounded bg-black text-badge-tangerine border border-black font-mono text-[9px] font-bold active-collapse cursor-pointer';
        } else {
          b.className = 'px-1.5 py-0.5 rounded bg-white border border-black font-mono text-[9px] font-bold active-collapse cursor-pointer';
        }
      });

      if (state === 1) {
        // State 1: Priming - Target corridor only, no user contour yet
        if (userTrack) userTrack.classList.add('hidden');
        if (waveform) waveform.classList.add('hidden');
        if (auditSec) auditSec.classList.add('hidden');
        if (coachCard) coachCard.classList.add('hidden');
        if (recordBtn) {
          recordBtn.className = 'flex-1 py-3.5 sm:py-4 px-3 sm:px-6 bg-badge-tangerine text-white hover:bg-[#ff4800] border-[3.5px] border-black rounded-2xl shadow-hard-black flex items-center justify-center gap-2 sm:gap-3 active-collapse cursor-pointer';
          recordBtn.innerHTML = `
            <span class="w-4 h-4 rounded-full bg-white animate-pulse border border-black shrink-0"></span>
            <span class="font-speed font-black italic text-base sm:text-xl uppercase tracking-tight sm:tracking-wide">TAP TO RECORD</span>
            <span class="font-mono text-[10px] bg-black text-white px-1.5 py-0.5 rounded hidden sm:inline">[SPACE]</span>
          `;
        }
      } else if (state === 2) {
        // State 2: Capture - Live audio input simulation, waveform pulsing
        if (userTrack) userTrack.classList.add('hidden');
        if (waveform) waveform.classList.remove('hidden');
        if (auditSec) auditSec.classList.add('hidden');
        if (coachCard) coachCard.classList.add('hidden');
        if (recordBtn) {
          recordBtn.className = 'flex-1 py-3.5 sm:py-4 px-3 sm:px-6 bg-black text-badge-tangerine border-[3.5px] border-black rounded-2xl shadow-hard-black flex items-center justify-center gap-2 sm:gap-3 active-collapse cursor-pointer';
          recordBtn.innerHTML = `
            <span class="w-4 h-4 rounded-full bg-badge-tangerine animate-ping border border-black shrink-0"></span>
            <span class="font-speed font-black italic text-base sm:text-xl uppercase tracking-tight sm:tracking-wide">RECORDING...</span>
            <span class="font-mono text-[10px] bg-badge-tangerine text-black px-1.5 py-0.5 rounded hidden sm:inline">[STOP]</span>
          `;
        }
      } else {
        // State 4: Diagnostic Audit & Articulatory Coach
        if (userTrack) userTrack.classList.remove('hidden');
        if (waveform) waveform.classList.add('hidden');
        if (auditSec) auditSec.classList.remove('hidden');
        if (coachCard) coachCard.classList.remove('hidden');
        if (recordBtn) {
          recordBtn.className = 'flex-1 py-3.5 sm:py-4 px-3 sm:px-6 bg-badge-tangerine text-white hover:bg-[#ff4800] border-[3.5px] border-black rounded-2xl shadow-hard-black flex items-center justify-center gap-2 sm:gap-3 active-collapse cursor-pointer';
          recordBtn.innerHTML = `
            <span class="w-4 h-4 rounded-full bg-white animate-pulse border border-black shrink-0"></span>
            <span class="font-speed font-black italic text-base sm:text-xl uppercase tracking-tight sm:tracking-wide">TAP TO RETRY</span>
            <span class="font-mono text-[10px] bg-black text-white px-1.5 py-0.5 rounded hidden sm:inline">[SPACE]</span>
          `;
        }
      }
    },

    // 1. Reactive Syllable Scenario Switcher (1, 2, or 3 Syllables)
    setSyllableCount(count, customData) {
      renderSyllableScenario(count, customData);
    },

    // 2. Update Target Word Information
    setTargetWord(wordData) {
      if (wordData.syllablesCount) {
        renderSyllableScenario(wordData.syllablesCount, wordData);
      } else {
        if (wordData.hanzi) document.getElementById('engine-hanzi-display').textContent = wordData.hanzi;
        if (wordData.pinyin) document.getElementById('engine-pinyin-display').textContent = wordData.pinyin;
        if (wordData.gloss) document.getElementById('engine-gloss-display').textContent = `"${wordData.gloss}"`;
      }
    },

    // 3. Select Word Index Programmatically
    selectWordIndex(idx) {
      activateWordIndex(idx);
    },

    // 4. Redraw User Pitch Splines (SVG Bézier path strings)
    updateUserCurves({ pathS1, pathS2, pathS3 }) {
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
    },

    // 5. Update Target Chao Corridor Ribbons (SVG Polygon points)
    updateTargetRibbons({ pointsS1, pointsS2, pointsS3 }) {
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
    },

    // 6. Update Articulatory Coaching Advice
    setCoachingAdvice(adviceHtml) {
      const coachText = document.getElementById('coach-advice-text');
      if (coachText) coachText.innerHTML = adviceHtml;
    }
  };
}

// Initialize the app
setupButtons();
setupMenu();
setupEnginePlaceholders();
init();