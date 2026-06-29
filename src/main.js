import './style.css';
let words = [];
let currentItem = null;
let audioInstance = null;
let currentGameMode = 'tones'; // Options: 'tones', 'initials', 'endings'

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

function setupMenu() {
  const menuScreen = document.getElementById('menu-screen');
  const gameScreen = document.getElementById('game-screen');
  
  // Menu Wrappers
  const mainMenu = document.getElementById('main-menu');
  const submenu = document.getElementById('submenu');
  
  // Main Menu Buttons
  const startTonesBtn = document.getElementById('start-tones-btn');
  const openSubmenuBtn = document.getElementById('open-submenu-btn');
  const closeSubmenuBtn = document.getElementById('close-submenu-btn');
  
  // Submenu Game Buttons
  const startInitialsBtn = document.getElementById('start-initials-btn');
  const startEndingsBtn = document.getElementById('start-endings-btn');
  
  const backBtn = document.getElementById('back-to-menu-btn');

  // --- Submenu Navigation ---
  openSubmenuBtn.addEventListener('click', () => {
    mainMenu.classList.add('hidden');
    submenu.classList.remove('hidden');
  });
  
  closeSubmenuBtn.addEventListener('click', () => {
    submenu.classList.add('hidden');
    mainMenu.classList.remove('hidden');
  });

  // --- Start Game Handlers ---
  startTonesBtn.addEventListener('click', () => startGame('tones'));
  startInitialsBtn.addEventListener('click', () => startGame('initials'));
  startEndingsBtn.addEventListener('click', () => startGame('endings'));

  // --- Return to Menu (from Game) ---
  backBtn.addEventListener('click', () => {
    gameScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');

    // Always reset to the main menu, not the submenu
    submenu.classList.add('hidden');
    mainMenu.classList.remove('hidden');

    // Reset the game UI
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
    const response = await fetch('./single_words.json');
    if (!response.ok) throw new Error("JSON not found in public folder");

    words = await response.json();
    console.log("App Ready. Vocabulary loaded:", words.length);
    
    // We don't automatically call nextQuestion() anymore on init
    // nextQuestion() will be called when they pick a game mode.
    
    setTimeout(() => {
      document.querySelectorAll('.tone-btn').forEach(btn => {
        btn.classList.remove('pop-up');
      });
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

  audioInstance = new Audio(`./${currentItem.audio}`);
  audioInstance.play().catch(e => console.error("Audio failed:", e));
}


function setupButtons() {
  document.querySelectorAll('.tone-btn').forEach((btn, index) => {
    btn.addEventListener('click', (e) => {
      const userGuess = btn.querySelector('.option-text').innerText;
      let isCorrect = false;

      // Check correctness based on mode
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

        // Hide options 
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

        if (currentGameMode === 'initials') {
            explanationContent = `
                <p class="text-sm text-left">
                    <strong class="font-bold text-on-surface">${currentItem.initial || '∅'}:</strong> 
                    ${currentItem.initial_explanation}
                </p>
            `;
        } else if (currentGameMode === 'endings') {
            explanationContent = `
                <p class="text-sm text-left">
                    <strong class="font-bold text-on-surface">${currentItem.ending_base}:</strong> 
                    ${currentItem.final_explanation}
                </p>
            `;
        }

        if (explanationContent) {
            explanationBox.innerHTML = explanationContent;
            explanationBox.classList.remove('hidden');
        }

        setTimeout(nextQuestion, 2500); 
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
  if (words.length === 0) return;

  // Reset UI state
  document.querySelector('.options').style.display = 'grid'; 
  const playBtn = document.getElementById('play-btn');
  playBtn.style.transform = "scale(1)"; 
  
  document.getElementById('fab-container').classList.add('hidden');
  document.getElementById('explanation-box').classList.add('hidden');

  currentItem = words[Math.floor(Math.random() * words.length)];
  const display = document.getElementById('pinyin-display');
  const buttons = document.querySelectorAll('.tone-btn');

  // Format UI based on Game Mode using Tailwind Typography
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

  // Force reflow
  buttons.forEach(btn => void btn.offsetWidth);

  document.getElementById('feedback').innerText = "";
  document.getElementById('feedback').className = "mb-2 font-label tracking-widest font-bold uppercase text-sm h-6";
  playAudio();
}

// Initialize the app
setupButtons();
setupMenu();
init();