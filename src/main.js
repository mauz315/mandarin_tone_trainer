import './style.css';
let words = [];
let currentItem = null;
let audioInstance = null;

function setupMenu() {
  const menuScreen = document.getElementById('menu-screen');
  const gameScreen = document.getElementById('game-screen');
  const startTonesBtn = document.getElementById('start-tones-btn');
  const backBtn = document.getElementById('back-to-menu-btn');

  // 1. Go to Tone Trainer
  startTonesBtn.addEventListener('click', () => {
    menuScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
  });

  // 2. Return to Menu
  backBtn.addEventListener('click', () => {
    gameScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');

    // Optional: Reset the game UI (hide correct answer) if they quit mid-game
    document.querySelector('.options').style.display = 'flex';
    document.getElementById('play-btn').style.transform = "scale(1)";
    document.getElementById('feedback').innerText = "";
  });
}

async function init() {
  try {
    // 1. Fetch the data - ensure this filename matches yours exactly
    const response = await fetch('./single_words.json');
    if (!response.ok) throw new Error("JSON not found in public folder");

    words = await response.json();
    console.log("App Ready. Vocabulary loaded:", words.length);
    nextQuestion();
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

  // Vite serves /public at the root, so /audio/ma1.mp3 works
  audioInstance = new Audio(`./${currentItem.audio}`);
  audioInstance.play().catch(e => console.error("Audio failed:", e));
}

// 2. Setup Button Listeners
// We put this inside a function or at the bottom to ensure the buttons exist
function setupButtons() {
  document.querySelectorAll('.tone-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const userGuess = parseInt(e.target.dataset.tone);

      if (userGuess === currentItem.tone) {

          const toneColors = ['#b7102a', '#ffba27', '#485f84', '#7a5500']; // New palette colors
          document.body.style.setProperty('--active-tone-color', toneColors[userGuess - 1]);

          // 2. Trigger the flash
          document.body.classList.add('flash-correct');

          // 3. Remove class after animation finishes so it can run again next time
          setTimeout(() => {
              document.body.classList.remove('flash-correct');
              }, 500);

        document.getElementById('feedback').innerText = "CORRECT";
        document.getElementById('feedback').style.color = "green"; // consider changing this to var(--tone-4-green) if green doesn't fit

        // --- MODIFIED SECTION START ---
        // 1. Hide the options
        document.querySelector('.options').style.display = 'none';

        // 2. Transform the Blue Button (Center & Larger)
        const blueBtn = document.getElementById('play-btn');
        blueBtn.style.transition = "all 0.5s ease";
        blueBtn.style.transform = "scale(1.2)";

        // 3. Show Correct Hanzi + Full Pinyin (mā)
        document.getElementById('pinyin-display').innerHTML = `
            <div style="font-size: 4rem;">${currentItem.hanzi}</div>
            <div style="font-size: 2rem; color: #161d16;">${currentItem.pinyin_correct}</div>
        `;
        // --- MODIFIED SECTION END ---

        setTimeout(nextQuestion, 1500); // Increased time slightly to admire the result
      } else {
        document.getElementById('feedback').innerText = "TRY AGAIN";
        document.getElementById('feedback').style.color = "#b7102a"; // updated to primary red
        playAudio();
      }
    });
  });
  document.getElementById('play-btn').addEventListener('click', playAudio);
}

function nextQuestion() {
  if (words.length === 0) return;

  // Reset UI state (in case we are coming from a "Correct" state)
  document.querySelector('.options').style.display = 'flex'; // Show buttons again
  const blueBtn = document.getElementById('play-btn');
  blueBtn.style.transform = "scale(1)"; // Reset size

  currentItem = words[Math.floor(Math.random() * words.length)];

  // Show Hanzi BIG, and pinyin base (ma) small below it
  document.getElementById('pinyin-display').innerHTML = `
    <div style="font-size: 3rem; line-height: 1; color: var(--black-accent);">${currentItem.hanzi}</div>
    <div style="font-size: 1.5rem; color: #5b403f; font-weight: normal;">${currentItem.pinyin_base}</div>
  `;

  // Update the 4 option buttons to show the tone marks (mā, má, etc.)
  const buttons = document.querySelectorAll('.tone-btn');
  buttons.forEach((btn, index) => {
    // We assume currentItem.options is ["mā", "má", "mǎ", "mà"]
    btn.innerText = currentItem.options[index];

    // 2. FORCE REFLOW (The Magic Line)
    void btn.offsetWidth;
  });

  document.getElementById('feedback').innerText = "";
  playAudio();
}

const toneColors = {
  1: '#b7102a', // Primary
  2: '#ffba27', // Tertiary Fixed Dim
  3: '#485f84', // Secondary
  4: '#7a5500'  // Tertiary
};

// Initialize the app
setupButtons();
setupMenu();
init();