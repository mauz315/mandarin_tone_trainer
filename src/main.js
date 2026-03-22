import './style.css';
let words = [];
let currentItem = null;
let audioInstance = null;
let currentGameMode = 'tones'; // Options: 'tones', 'initials', 'endings'

function setupMenu() {
  const menuScreen = document.getElementById('menu-screen');
  const gameScreen = document.getElementById('game-screen');
  
  const startTonesBtn = document.getElementById('start-tones-btn');
  const startInitialsBtn = document.getElementById('start-initials-btn');
  const startEndingsBtn = document.getElementById('start-endings-btn');
  const backBtn = document.getElementById('back-to-menu-btn');

  // Menu Click Handlers
  startTonesBtn.addEventListener('click', () => startGame('tones'));
  startInitialsBtn.addEventListener('click', () => startGame('initials'));
  startEndingsBtn.addEventListener('click', () => startGame('endings'));

  // Return to Menu
  backBtn.addEventListener('click', () => {
    gameScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');

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
      } else if (currentGameMode === 'endings' && userGuess === currentItem.ending_correct) {
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
        <div style="font-size: 1.5rem; color: #5b403f; font-weight: normal;">___${currentItem.ending_correct}</div>
      `;
      buttons.forEach((btn, i) => {
          // If a word has no initial (like 'an' or 'ou'), it shows empty strings as options
          // Let's replace empty strings with a dash or keep it blank for clarity
          btn.innerText = currentItem.initial_options[i] === "" ? "∅" : currentItem.initial_options[i];
      });

  } else if (currentGameMode === 'endings') {
      display.innerHTML = `
        <div style="font-size: 3rem; line-height: 1; color: var(--black-accent);">${currentItem.hanzi}</div>
        <div style="font-size: 1.5rem; color: #5b403f; font-weight: normal;">${currentItem.initial}___</div>
      `;
      buttons.forEach((btn, i) => btn.innerText = currentItem.ending_options[i]);
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