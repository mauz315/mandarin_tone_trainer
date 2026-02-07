import './style.css';
let words = [];
let currentItem = null;
let audioInstance = null;

async function init() {
  try {
    // 1. Fetch the data - ensure this filename matches yours exactly
    const response = await fetch('./single_words.json');
    if (!response.ok) throw new Error("JSON not found in public folder");

    words = await response.json();
    console.log("App Ready. Vocabulary loaded:", words.length);
    nextQuestion();
  } catch (err) {
    console.error("Initialization error:", err);
  }
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
    <div style="font-size: 3rem; line-height: 1;">${currentItem.hanzi}</div>
    <div style="font-size: 1.5rem; color: #888; font-weight: normal;">${currentItem.pinyin_base}</div>
  `;

  // Update the 4 option buttons to show the tone marks (mā, má, etc.)
  const buttons = document.querySelectorAll('.tone-btn');
  buttons.forEach((btn, index) => {
    // We assume currentItem.options is ["mā", "má", "mǎ", "mà"]
    btn.innerText = currentItem.options[index];
  });

  document.getElementById('feedback').innerText = "";
  playAudio();
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
          const toneColors = ['#da291c', '#f4c300', '#005696', '#008f39']; // Your palette
          document.body.style.setProperty('--active-tone-color', toneColors[userGuess - 1]);

          // 2. Trigger the flash
          document.body.classList.add('flash-correct');

          // 3. Remove class after animation finishes so it can run again next time
          setTimeout(() => {
              document.body.classList.remove('flash-correct');
              }, 500);

        document.getElementById('feedback').innerText = "CORRECT";
        document.getElementById('feedback').style.color = "green";

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
            <div style="font-size: 2rem; color: #333;">${currentItem.pinyin_correct}</div>
        `;
        // --- MODIFIED SECTION END ---

        setTimeout(nextQuestion, 1500); // Increased time slightly to admire the result
      } else {
        document.getElementById('feedback').innerText = "TRY AGAIN";
        document.getElementById('feedback').style.color = "red";
        playAudio();
      }
    });
  });
  document.getElementById('play-btn').addEventListener('click', playAudio);
}

// Initialize the app
setupButtons();
init();