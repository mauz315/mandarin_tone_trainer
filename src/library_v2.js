let words = [];
let audioInstance = null;
let selectedInitial = null;
let selectedFinal = null;
let selectedTone = null;

function pinyin_to_tone(pinyin_with_number) {
    const base_clean = pinyin_with_number.replace('uu', 'ü').replace('v', 'ü').replace('lue', 'lüe').replace('nue', 'nüe');
    const tones = {'a': 'āáǎà', 'e': 'ēéěè', 'i': 'īíǐì', 'o': 'ōóǒò', 'u': 'ūúǔù', 'v': 'ǖǘǚǜ', 'ü': 'ǖǘǚǜ'};
    if (!base_clean[-1].isdigit()) return base_clean;
    try { 
        const tone_num = parseInt(base_clean[-1]);
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

async function init() {
  try {
    const response = await fetch('./single_words.json');
    if (!response.ok) throw new Error("JSON not found");
    words = await response.json();
    setupAudioLibrary();
  } catch (err) {
    console.error("Initialization error:", err);
  }
}

function setupAudioLibrary() {
    const initialsScroller = document.getElementById('initials-scroller');
    const finalsScroller = document.getElementById('finals-scroller');
    const initialsList = document.getElementById('initials-list');
    const finalsList = document.getElementById('finals-list');
    const toneSelector = document.getElementById('tone-selector');
    const libraryPlaybackUI = document.getElementById('library-playback-ui');
    const libraryScrollers = document.getElementById('library-scrollers');
    const pinyinDisplay = document.getElementById('library-pinyin-display');
    const playBtn = document.getElementById('library-play-btn');

    const allInitials = [...new Set(words.map(w => w.initial))].sort();
    const allFinals = [...new Set(words.map(w => w.ending_base))].sort();

    const populateList = (listEl, items, type) => {
        listEl.innerHTML = '';
        const padding = document.createElement('li');
        padding.className = 'h-[45%] shrink-0';
        listEl.appendChild(padding.cloneNode());
        items.forEach(item => {
            const li = document.createElement('li');
            li.className = "font-headline text-2xl text-center text-on-surface-variant/50 p-2 rounded-lg scroll-snap-align-center transition-all duration-200 shrink-0";
            li.textContent = item === "" ? "∅" : item;
            li.dataset[type] = item;
            listEl.appendChild(li);
        });
        listEl.appendChild(padding.cloneNode());
    };

    populateList(initialsList, allInitials, 'initial');
    populateList(finalsList, allFinals, 'final');

    const createObserver = (scroller, list, callback) => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        [...list.children].forEach(child => child.classList.remove('text-3xl', 'font-bold', 'text-on-surface'));
                        entry.target.classList.add('text-3xl', 'font-bold', 'text-on-surface');
                        callback(entry.target.dataset);
                    }
                });
            },
            { root: scroller, threshold: 0.8 }
        );
        list.querySelectorAll('li[data-initial], li[data-final]').forEach(li => observer.observe(li));
    };

    createObserver(initialsScroller, initialsList, (data) => {
        selectedInitial = data.initial;
        updateLibraryUI();
    });

    createObserver(finalsScroller, finalsList, (data) => {
        selectedFinal = data.final;
        updateLibraryUI();
    });

    toneSelector.addEventListener('click', e => {
        if (e.target.matches('.tone-select-btn')) {
            selectedTone = e.target.dataset.tone;
            [...toneSelector.children].forEach(btn => btn.classList.remove('bg-primary-container', 'text-on-primary-container'));
            e.target.classList.add('bg-primary-container', 'text-on-primary-container');
            updateLibraryUI();
        }
    });

    function updateLibraryUI() {
        if (selectedInitial !== null && selectedFinal !== null) {
            toneSelector.classList.remove('hidden');
        }
        if (selectedInitial !== null && selectedFinal !== null && selectedTone !== null) {
            libraryScrollers.classList.add('opacity-0', 'pointer-events-none');
            libraryPlaybackUI.classList.remove('hidden');
            libraryPlaybackUI.classList.add('flex');
            const pinyin = (selectedInitial === '∅' ? '' : selectedInitial) + selectedFinal + selectedTone;
            pinyinDisplay.textContent = pinyin_to_tone(pinyin);
            playBtn.disabled = false;
        }
    }

    playBtn.addEventListener('click', () => {
        const pinyin = (selectedInitial === '∅' ? '' : selectedInitial) + selectedFinal;
        const audioFile = `${pinyin}${selectedTone}.mp3`;
        const word = words.find(w => w.audio === `audio/${audioFile}`);
        if (word) {
            if (audioInstance) audioInstance.pause();
            audioInstance = new Audio(`./${word.audio}`);
            audioInstance.play().catch(e => console.error("Audio failed:", e));
        } else {
            pinyinDisplay.textContent = "N/A";
            console.error(`Audio for ${audioFile} not found.`);
        }
    });
}

init();
