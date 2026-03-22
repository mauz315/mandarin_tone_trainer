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
    document.querySelector('.options').style.display = 'flex';
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
      const userGuess = e.target.innerText;
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
          const toneColors = ['#b7102a', '#ffba27', '#485f84', '#7a5500']; 
          // Use index to pick a color so it flashes different colors for the 4 buttons
          document.body.style.setProperty('--active-tone-color', toneColors[index]);

          document.body.classList.add('flash-correct');

          setTimeout(() => {
              document.body.classList.remove('flash-correct');
          }, 500);

        document.getElementById('feedback').innerText = "CORRECT";
        document.getElementById('feedback').style.color = "green"; 

        // Hide options & Transform listen button
        document.querySelector('.options').style.display = 'none';
        const blueBtn = document.getElementById('play-btn');
        blueBtn.style.transition = "all 0.5s ease";
        blueBtn.style.transform = "scale(1.2)";

        // Show Correct Hanzi + Full Pinyin
        document.getElementById('pinyin-display').innerHTML = `
            <div style="font-size: 4rem;">${currentItem.hanzi}</div>
            <div style="font-size: 2rem; color: #161d16;">${currentItem.pinyin_correct}</div>
        `;

        setTimeout(nextQuestion, 1500); 
      } else {
        document.getElementById('feedback').innerText = "TRY AGAIN";
        document.getElementById('feedback').style.color = "#b7102a"; 
        playAudio();
      }
    });
  });
  document.getElementById('play-btn').addEventListener('click', playAudio);
}

function nextQuestion() {
  if (words.length === 0) return;

  // Reset UI state
  document.querySelector('.options').style.display = 'flex'; 
  const playBtn = document.getElementById('play-btn');
  playBtn.style.transform = "scale(1)"; 

  currentItem = words[Math.floor(Math.random() * words.length)];
  const display = document.getElementById('pinyin-display');
  const buttons = document.querySelectorAll('.tone-btn');

  // Format UI based on Game Mode
  if (currentGameMode === 'tones') {
      display.innerHTML = `
        <div style="font-size: 3rem; line-height: 1; color: var(--black-accent);">${currentItem.hanzi}</div>
        <div style="font-size: 1.5rem; color: #5b403f; font-weight: normal;">${currentItem.pinyin_base}</div>
      `;
      buttons.forEach((btn, i) => btn.innerText = currentItem.tone_options[i]);

  } else if (currentGameMode === 'initials') {
      display.innerHTML = `
        <div style="font-size: 3rem; line-height: 1; color: var(--black-accent);">${currentItem.hanzi}</div>
        <div style="font-size: 1.5rem; color: #5b403f; font-weight: normal; display: flex; align-items: flex-end; justify-content: center; gap: 2px;">
          <span style="display:inline-block; width: 1.5rem; border-bottom: 3px solid currentColor; margin-bottom: 0.3rem;"></span>${currentItem.ending_correct}
        </div>
      `;
      buttons.forEach((btn, i) => {
          btn.innerText = currentItem.initial_options[i] === "" ? "∅" : currentItem.initial_options[i];
      });

  } else if (currentGameMode === 'endings') {
      display.innerHTML = `
        <div style="font-size: 3rem; line-height: 1; color: var(--black-accent);">${currentItem.hanzi}</div>
        <div style="font-size: 1.5rem; color: #5b403f; font-weight: normal; display: flex; align-items: flex-end; justify-content: center; gap: 2px;">
          ${currentItem.initial}<span style="display:inline-block; width: 2rem; border-bottom: 3px solid currentColor; margin-bottom: 0.3rem;"></span>
        </div>
      `;
      buttons.forEach((btn, i) => {
          btn.innerText = removeTones(currentItem.ending_options[i]);
      });
  }

  // Force reflow
  buttons.forEach(btn => void btn.offsetWidth);

  document.getElementById('feedback').innerText = "";
  playAudio();
}

const toneColors = {
  1: '#b7102a', 
  2: '#ffba27', 
  3: '#485f84', 
  4: '#7a5500'
};

// Initialize the app
setupButtons();
setupMenu();
init();