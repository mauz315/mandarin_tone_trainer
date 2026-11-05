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
  });
  
  closeSubmenuBtn.addEventListener('click', () => {
    submenu.classList.add('hidden');
    mainMenu.classList.remove('hidden');
  });

  openLibraryBtn.addEventListener('click', () => {
    mainMenu.classList.add('hidden');
    submenu.classList.add('hidden');
    audioLibraryScreen.classList.remove('hidden');
    setTimeout(() => {
      if (initialsSlider) initialsSlider.update();
      if (finalsSlider) finalsSlider.update();
    }, 60);
  });

  backToMainMenuBtn.addEventListener('click', () => {
    audioLibraryScreen.classList.add('hidden');
    mainMenu.classList.remove('hidden');
  });

  startTonesBtn.addEventListener('click', () => startGame('tones'));
  startInitialsBtn.addEventListener('click', () => startGame('initials'));
  startEndingsBtn.addEventListener('click', () => startGame('endings'));

  backBtn.addEventListener('click', () => {
    gameScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    submenu.classList.add('hidden');
    mainMenu.classList.remove('hidden');
    document.querySelector('.options').style.display = 'grid';
    document.getElementById('play-btn').style.transform = "scale(1)";
    document.getElementById('feedback').innerText = "";
  });
}

function startGame(mode) {
  currentGameMode = mode;
  document.getElementById('menu-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
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
      const userGuess = btn.querySelector('.option-text').innerText;
      let isCorrect = false;

      if (currentGameMode === 'tones' && userGuess === currentItem.pinyin_correct) {
          isCorrect = true;
      } else if (currentGameMode === 'initials' && (userGuess === currentItem.initial || (userGuess === '∅' && currentItem.initial === ''))) {
          isCorrect = true;
      } else if (currentGameMode === 'endings' && userGuess === currentItem.ending_base) {
          isCorrect = true;
      }

      if (isCorrect) {
        document.getElementById('feedback').innerText = "CORRECT";
        document.getElementById('feedback').className = "mb-2 font-label tracking-widest font-bold uppercase text-sm h-6 text-tertiary text-center";
        document.querySelector('.options').style.display = 'none';
        
        const fabContainer = document.getElementById('fab-container');
        fabContainer.innerHTML = `
          <button class="w-14 h-14 rounded-full bg-secondary text-on-secondary shadow-xl flex items-center justify-center animate-[pop-up_0.3s_ease-out]">
            <span class="material-symbols-outlined text-2xl">check</span>
          </button>
        `;
        fabContainer.classList.remove('hidden');

        document.getElementById('pinyin-display').innerHTML = `
            <div class="font-headline text-6xl md:text-8xl font-black text-on-surface tracking-tighter mb-4">${currentItem.hanzi}</div>
            <div class="font-body text-on-surface-variant text-xl md:text-3xl font-medium">${currentItem.pinyin_correct}</div>
        `;
        
        const explanationBox = document.getElementById('explanation-box');
        let explanationContent = '';

        if (currentGameMode === 'initials' || currentGameMode === 'endings') {
            const term = (currentGameMode === 'initials') ? (currentItem.initial || '∅') : currentItem.ending_base;
            const explanation = (currentGameMode === 'initials') ? currentItem.initial_explanation : currentItem.final_explanation;

            explanationContent = `
                <div class="relative p-4 text-center">
                    <p class="text-sm text-left">
                        <strong class="font-bold text-on-surface">${term}:</strong> 
                        ${explanation}
                    </p>
                    <button id="next-question-btn" class="mt-4 w-12 h-12 rounded-full bg-primary-container text-on-primary-container shadow-lg flex items-center justify-center mx-auto hover:scale-110 transition-transform">
                        <span class="material-symbols-outlined">arrow_forward</span>
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
        document.getElementById('feedback').innerText = "TRY AGAIN";
        document.getElementById('feedback').className = "mb-2 font-label tracking-widest font-bold uppercase text-sm h-6 text-tertiary-fixed-dim text-center"; 
        
        const fabContainer = document.getElementById('fab-container');
        fabContainer.innerHTML = `
          <button class="w-14 h-14 rounded-full bg-tertiary-fixed-dim text-on-tertiary-fixed shadow-xl flex items-center justify-center animate-[pop-up_0.3s_ease-out]">
            <span class="material-symbols-outlined text-2xl">close</span>
          </button>
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
        <div class="font-headline text-6xl md:text-8xl font-black text-on-surface tracking-tighter mb-4">${currentItem.hanzi}</div>
        <div class="font-body text-on-surface-variant text-xl md:text-3xl font-medium">${currentItem.pinyin_base}</div>
      `;
      buttons.forEach((btn, i) => {
          btn.querySelector('.option-text').innerText = currentItem.tone_options[i]
      });

  } else if (currentGameMode === 'initials') {
      display.innerHTML = `
        <div class="font-headline text-6xl md:text-8xl font-black text-on-surface tracking-tighter mb-4">${currentItem.hanzi}</div>
        <div class="font-body text-on-surface-variant text-xl md:text-3xl font-medium flex items-end justify-center gap-1">
          <span class="inline-block w-6 md:w-8 border-b-4 border-on-surface-variant mb-1"></span>${currentItem.ending_correct}
        </div>
      `;
      buttons.forEach((btn, i) => {
          btn.querySelector('.option-text').innerText = currentItem.initial_options[i] === "" ? "∅" : currentItem.initial_options[i];
      });

  } else if (currentGameMode === 'endings') {
      display.innerHTML = `
        <div class="font-headline text-6xl md:text-8xl font-black text-on-surface tracking-tighter mb-4">${currentItem.hanzi}</div>
        <div class="font-body text-on-surface-variant text-xl md:text-3xl font-medium flex items-end justify-center gap-1">
          ${currentItem.initial}<span class="inline-block w-8 md:w-12 border-b-4 border-on-surface-variant mb-1"></span>
        </div>
      `;
      buttons.forEach((btn, i) => {
          btn.querySelector('.option-text').innerText = removeTones(currentItem.ending_options[i]);
      });
  }

  buttons.forEach(btn => void btn.offsetWidth);

  document.getElementById('feedback').innerText = "";
  document.getElementById('feedback').className = "mb-2 font-label tracking-widest font-bold uppercase text-sm h-6";
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
        label.className = 'slide-label font-headline text-2xl font-bold transition-all duration-150';
        label.textContent = item === '' ? '∅' : item;
        slide.appendChild(label);

        initialsContainer.appendChild(slide);
    });

    allFinals.forEach((item, index) => {
        const slide = document.createElement('div');
        slide.className = 'keen-slider__slide flex items-center justify-center cursor-pointer select-none';
        slide.dataset.index = index;

        const label = document.createElement('span');
        label.className = 'slide-label font-headline text-2xl font-bold transition-all duration-150';
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
                label.style.transform = `scale(${1.25 - distance * 0.2})`;
                label.style.color = type === 'initial' ? '#8e001b' : '#2559bd';
                label.style.fontWeight = '900';
            } else if (distance < 1.5) {
                label.style.opacity = '0.5';
                label.style.transform = 'scale(0.95)';
                label.style.color = '';
                label.style.fontWeight = '600';
            } else {
                label.style.opacity = '0.2';
                label.style.transform = 'scale(0.8)';
                label.style.color = '';
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
                <span class="font-headline text-3xl font-black text-primary">${pinyinBase}</span>
                <span class="ml-2 text-xs uppercase tracking-wider font-bold text-on-surface-variant/70">
                  (${matchingWords.length} tone${matchingWords.length > 1 ? 's' : ''})
                </span>
            `;
            mainPlayBtn.disabled = false;
        } else {
            selectionDisplay.innerHTML = `
                <span class="font-headline text-2xl font-bold text-on-surface/30 line-through">${pinyinBase}</span>
                <span class="ml-2 text-xs uppercase tracking-wider text-error/70 font-semibold">(No syllable)</span>
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
            perView: 5,
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
            perView: 5,
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
                btn.classList.add('hover:bg-primary-container', 'cursor-pointer');
            } else {
                btn.disabled = true;
                btn.classList.add('opacity-30', 'cursor-not-allowed', 'pointer-events-none');
                btn.classList.remove('hover:bg-primary-container', 'cursor-pointer');
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

// Initialize the app
setupButtons();
setupMenu();
init();