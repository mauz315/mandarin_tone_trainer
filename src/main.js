import './style.css';
import 'keen-slider/keen-slider.min.css';
import KS from 'keen-slider';

const KeenSlider = KS.default || KS;

let words = [];
let currentItem = null;
let audioInstance = null;
let currentGameMode = 'tones'; // Options: 'tones', 'initials', 'endings'
let nextQuestionTimer = null; 

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

  openSubmenuBtn.addEventListener('click', () => {
    mainMenu.classList.add('hidden');
    submenu.classList.remove('hidden');
    submenu.classList.add('flex');
    setAppBackground('bg-canvas-ice');
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
    submenu.classList.add('hidden');
    mainMenu.classList.remove('hidden');
    setAppBackground('bg-canvas-acid');
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
    setAppBackground('bg-canvas-acid');
    if (modeBadge) modeBadge.textContent = 'DRILL // TONE TRAINER';
  } else if (mode === 'initials') {
    setAppBackground('bg-canvas-ice');
    if (modeBadge) modeBadge.textContent = 'DRILL // INITIALS (声母)';
  } else if (mode === 'endings') {
    setAppBackground('bg-canvas-ice');
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

function playAudio() {
  if (!currentItem) return;
  if (audioInstance) {
    audioInstance.pause();
    audioInstance.currentTime = 0;
  }
  const audioPath = `${import.meta.env.BASE_URL}${currentItem.audio}`;
  audioInstance = new Audio(audioPath);
  audioInstance.play().catch(e => console.error("Audio failed:", e));
}

function setupButtons() {
  document.querySelectorAll('.tone-btn').forEach((btn, index) => {
    btn.addEventListener('click', (e) => {
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
                if (audioInstance) audioInstance.pause();
                const audioPath = `${import.meta.env.BASE_URL}${word.audio}`;
                audioInstance = new Audio(audioPath);
                audioInstance.play().catch(err => console.error("Audio failed:", err));
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
  }
});

// Initialize the app
setupButtons();
setupMenu();
init();