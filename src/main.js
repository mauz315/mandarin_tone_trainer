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
      // Get text from the nested span, not the whole button text which might include empty space
      const userGuess = btn.querySelector('.option-text').innerText;
      let isCorrect = false;

      // Check correctness based on mode
      if (currentGameMode === 'tones' && userGuess === currentItem.pinyin_correct) {
          isCorrect = true;
      } else if (currentGameMode === 'initials' && userGuess === currentItem.initial) {
          isCorrect = true;
      } else if (currentGameMode === 'endings' && userGuess === currentItem.ending_base) {
          isCorrect = true;
      }

      if (isCorrect) {
          // Tailwind Color Classes to add dynamically instead of CSS custom properties
          const flashColors = ['bg-secondary', 'bg-primary', 'bg-tertiary-fixed-dim', 'bg-tertiary'];
          
          const dot = btn.querySelector('div');
          dot.classList.add(flashColors[index]);

          setTimeout(() => {
              dot.classList.remove(flashColors[index]);
          }, 500);

        document.getElementById('feedback').innerText = "CORRECT";
        document.getElementById('feedback').className = "mb-2 font-label tracking-widest font-bold uppercase text-sm h-6 text-tertiary text-center";

        // Hide options 
        document.querySelector('.options').style.display = 'none';
        
        // --- NEW: Inject the Blue Checkmark FAB ---
        const fabContainer = document.getElementById('fab-container');
        fabContainer.innerHTML = `
          <button class="w-14 h-14 rounded-full bg-secondary text-on-secondary shadow-xl flex items-center justify-center animate-[pop-up_0.3s_ease-out]">
            <span class="material-symbols-outlined text-2xl">check</span>
          </button>
        `;
        fabContainer.classList.remove('hidden');

        // Show Correct Hanzi + Full Pinyin (Tailwind Classes)
        document.getElementById('pinyin-display').innerHTML = `
            <div class="font-headline text-8xl font-black text-on-surface tracking-tighter mb-4">${currentItem.hanzi}</div>
            <div class="font-body text-on-surface-variant text-3xl font-medium">${currentItem.pinyin_correct}</div>
        `;

        setTimeout(nextQuestion, 1500); 
      } else {
        document.getElementById('feedback').innerText = "TRY AGAIN";
        document.getElementById('feedback').className = "mb-2 font-label tracking-widest font-bold uppercase text-sm h-6 text-tertiary-fixed-dim text-center"; 
        
        // --- NEW: Inject the Yellow X FAB (Temporary) ---
        const fabContainer = document.getElementById('fab-container');
        fabContainer.innerHTML = `
          <button class="w-14 h-14 rounded-full bg-tertiary-fixed-dim text-on-tertiary-fixed shadow-xl flex items-center justify-center animate-[pop-up_0.3s_ease-out]">
            <span class="material-symbols-outlined text-2xl">close</span>
          </button>
        `;
        fabContainer.classList.remove('hidden');
        
        // Hide the error FAB after 1 second so they can keep guessing
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
  
  // NEW: Hide the FAB
  document.getElementById('fab-container').classList.add('hidden');

  currentItem = words[Math.floor(Math.random() * words.length)];
  const display = document.getElementById('pinyin-display');
  const buttons = document.querySelectorAll('.tone-btn');

  // Format UI based on Game Mode using Tailwind Typography
  if (currentGameMode === 'tones') {
      display.innerHTML = `
        <div class="font-headline text-8xl font-black text-on-surface tracking-tighter mb-4">${currentItem.hanzi}</div>
        <div class="font-body text-on-surface-variant text-3xl font-medium">${currentItem.pinyin_base}</div>
      `;
      buttons.forEach((btn, i) => {
          btn.querySelector('.option-text').innerText = currentItem.tone_options[i]
      });

  } else if (currentGameMode === 'initials') {
      display.innerHTML = `
        <div class="font-headline text-8xl font-black text-on-surface tracking-tighter mb-4">${currentItem.hanzi}</div>
        <div class="font-body text-on-surface-variant text-3xl font-medium flex items-end justify-center gap-1">
          <span class="inline-block w-8 border-b-4 border-on-surface-variant mb-1"></span>${currentItem.ending_correct}
        </div>
      `;
      buttons.forEach((btn, i) => {
          btn.querySelector('.option-text').innerText = currentItem.initial_options[i] === "" ? "∅" : currentItem.initial_options[i];
      });

  } else if (currentGameMode === 'endings') {
      display.innerHTML = `
        <div class="font-headline text-8xl font-black text-on-surface tracking-tighter mb-4">${currentItem.hanzi}</div>
        <div class="font-body text-on-surface-variant text-3xl font-medium flex items-end justify-center gap-1">
          ${currentItem.initial}<span class="inline-block w-12 border-b-4 border-on-surface-variant mb-1"></span>
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