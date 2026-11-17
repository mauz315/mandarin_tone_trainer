/**
 * contextLabEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Context Lab Engine & UI Controller
 * Integrates real-world multi-speaker spoken dialogues (duo_dialogues.json & duo_vocab.json).
 * Follows Palette Option 1 (Mint Foam & Emerald), zero-scroll mobile ergonomics,
 * and leaves open algorithm & audio stubs for the SWE agent.
 */

import {
  triggerDampedShake,
  animateSpringPop,
  pressKeycap,
  swapViews,
  navigateScreens,
  prefersReducedMotion,
  EASE_SNAP
} from './motion.js';

// Comprehensive diacritic tone rules for Pinyin numeric-to-diacritic conversion
const VOWEL_TONES = {
  a: ['ā', 'á', 'ǎ', 'à', 'a'],
  e: ['ē', 'é', 'ě', 'è', 'e'],
  o: ['ō', 'ó', 'ǒ', 'ò', 'o'],
  i: ['ī', 'í', 'ǐ', 'ì', 'i'],
  u: ['ū', 'ú', 'ǔ', 'ù', 'u'],
  v: ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü']
};

/**
 * Converts numeric pinyin syllables (e.g. "fa1 shao1", "lv4") into marked pinyin ("fā shāo", "lǜ").
 */
export function convertNumericToDiacritic(text) {
  if (!text) return '';
  return text.replace(/([a-zA-ZüÜ:vV]+)([1-5])/g, (match, syl, toneStr) => {
    const tone = parseInt(toneStr, 10);
    if (tone < 1 || tone > 5) return syl;
    if (tone === 5) return syl.replace(/[vV]|u:/g, 'ü');

    let s = syl.replace(/[vV]|u:/g, 'ü');
    const toneIdx = tone - 1;

    // Standard Mandarin tone placement rules:
    // 1. If 'a' or 'e' is present, it takes the tone mark.
    if (/[aA]/.test(s)) return s.replace(/[aA]/, ch => ch === 'A' ? VOWEL_TONES.a[toneIdx].toUpperCase() : VOWEL_TONES.a[toneIdx]);
    if (/[eE]/.test(s)) return s.replace(/[eE]/, ch => ch === 'E' ? VOWEL_TONES.e[toneIdx].toUpperCase() : VOWEL_TONES.e[toneIdx]);
    // 2. If 'ou' is present, 'o' takes the mark.
    if (/ou/i.test(s)) return s.replace(/o/i, ch => ch === 'O' ? VOWEL_TONES.o[toneIdx].toUpperCase() : VOWEL_TONES.o[toneIdx]);
    // 3. Otherwise, the last vowel takes the mark (handles 'ui', 'iu', etc.)
    const matches = [...s.matchAll(/[aeiouü]/gi)];
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const idx = lastMatch.index;
      const vChar = lastMatch[0].toLowerCase();
      const mapped = VOWEL_TONES[vChar] ? VOWEL_TONES[vChar][toneIdx] : vChar;
      const replacement = lastMatch[0] === lastMatch[0].toUpperCase() ? mapped.toUpperCase() : mapped;
      return s.slice(0, idx) + replacement + s.slice(idx + 1);
    }
    return s;
  });
}

/**
 * Normalizes pinyin string for comparison (strips punctuation, extra spaces, tone marks/numbers).
 */
export function normalizePinyinForCompare(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[,\.?!'"_\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export class ContextLabEngine {
  constructor() {
    this.dialogues = [];
    this.vocabUnits = [];
    this.totalUnits = 35;
    this.currentUnitIndex = parseInt(localStorage.getItem('context_lab_active_unit') || '1', 10);
    this.currentDialogue = null;
    this.activeSlot = null;
    this.currentStage = 1; // 1 = pinyin, 2 = distractor, 'complete'
    this.audioInstance = null;
    this.isAudioPlaying = false;
    this.keyListenerAttached = false;
    this.unitDialoguesPool = [];
    this.dialogueQueueIndex = 0;
  }

  // =========================================================================
  // INITIALIZATION & DATA LOADING
  // =========================================================================

  async init(fetchJsonFn) {
    try {
      const [dialoguesData, vocabData] = await Promise.all([
        fetchJsonFn('duo_dialogues.json').catch(() => null),
        fetchJsonFn('duo_vocab.json').catch(() => null)
      ]);

      if (dialoguesData && Array.isArray(dialoguesData.dialogues)) {
        this.dialogues = dialoguesData.dialogues;
        this.totalUnits = dialoguesData.total_units || 35;
      }
      if (vocabData && Array.isArray(vocabData.units)) {
        this.vocabUnits = vocabData.units;
      }
    } catch (e) {
      console.warn('ContextLab: Could not load local dialogue database, using fallback sample.', e);
    }

    if (!this.dialogues || this.dialogues.length === 0) {
      this.dialogues = [this.getFallbackDialogue()];
    }

    this.bindCockpitUI();
    this.updateUnitDisplay();
  }

  getFallbackDialogue() {
    return {
      dialogue_id: 'd_u01_01',
      unit_index: 1,
      unit_name: 'Food',
      situation_type: 'cafe_counter',
      title_en: 'Ordering Hot Coffee',
      audio_file: '',
      turns: [
        {
          turn_index: 0,
          speaker: 'A',
          speaker_role: 'Customer',
          voice: 'zh-CN-XiaoxiaoNeural',
          hanzi: '你好，这是热咖啡吗？',
          pinyin: 'Nǐ hǎo, zhè shì rè kā fēi ma?',
          english: 'Hello, is this hot coffee?'
        },
        {
          turn_index: 1,
          speaker: 'B',
          speaker_role: 'Barista',
          voice: 'zh-CN-YunxiNeural',
          hanzi: '对，这是热咖啡。',
          pinyin: 'Duì, zhè shì rè kā fēi.',
          english: 'Yes, this is hot coffee.'
        }
      ],
      test_slots: [
        {
          slot_id: 's_u01_01_01',
          turn_index: 0,
          char_range: [6, 8],
          word_character: '咖啡',
          word_pinyin: 'kā fēi',
          word_english: 'coffee',
          syllable_count: 2,
          pinyin_segments: ['kā', 'fēi'],
          accepted_numeric_pinyin: ['ka1fei1', 'ka1 fei1', 'kā fēi', 'kāfēi'],
          distractor_options: [
            { character: '咖啡', pinyin: 'kā fēi', english: 'coffee', is_correct: true },
            { character: '可乐', pinyin: 'kě lè', english: 'cola', is_correct: false },
            { character: '咖喱', pinyin: 'kā lǐ', english: 'curry', is_correct: false },
            { character: '奶茶', pinyin: 'nǎi chá', english: 'milk tea', is_correct: false }
          ]
        }
      ]
    };
  }

  // =========================================================================
  // UNIT SELECTION & NAVIGATION
  // =========================================================================

  getUnitTopic(unitIdx) {
    if (this.vocabUnits && this.vocabUnits.length > 0) {
      const match = this.vocabUnits.find(u => u.unit_index === unitIdx);
      if (match) return match.unit_name;
    }
    const dMatch = this.dialogues.find(d => d.unit_index === unitIdx);
    return dMatch ? dMatch.unit_name : `Unit ${unitIdx}`;
  }

  setUnit(newUnitIdx) {
    if (newUnitIdx < 1) newUnitIdx = this.totalUnits;
    if (newUnitIdx > this.totalUnits) newUnitIdx = 1;
    this.currentUnitIndex = newUnitIdx;
    localStorage.setItem('context_lab_active_unit', String(newUnitIdx));
    this.updateUnitDisplay();

    // If currently inside the exercise screen, refresh immediately with the new unit
    const screen = document.getElementById('context-lab-screen');
    if (screen && !screen.classList.contains('hidden')) {
      this.startExercise();
    }
  }

  updateUnitDisplay() {
    const headerLabel = document.getElementById('context-header-unit-label');
    if (headerLabel) {
      headerLabel.textContent = `UNIT ${this.currentUnitIndex}`;
    }
  }

  // =========================================================================
  // EXERCISE LAUNCH & STATE MACHINE
  // =========================================================================

  startExercise() {
    this.unitDialoguesPool = this.dialogues.filter(d => d.unit_index === this.currentUnitIndex);
    if (this.unitDialoguesPool.length === 0) {
      this.unitDialoguesPool = this.dialogues;
    }
    this.dialogueQueueIndex = 0;
    this.loadNextDialogue();
    this.attachKeyboardShortcuts();
  }

  loadNextDialogue() {
    if (this.unitDialoguesPool.length === 0) return;
    const dialogue = this.unitDialoguesPool[this.dialogueQueueIndex % this.unitDialoguesPool.length];
    this.dialogueQueueIndex++;
    this.setupDialogue(dialogue);
  }

  setupDialogue(dialogue) {
    this.currentDialogue = dialogue;
    this.activeSlot = (dialogue.test_slots && dialogue.test_slots[0]) || {
      turn_index: 0,
      char_range: [0, 2],
      word_character: '目标',
      word_pinyin: 'mù biāo',
      word_english: 'target',
      accepted_numeric_pinyin: ['mu4biao1', 'mu4 biao1', 'mù biāo'],
      distractor_options: [
        { character: '目标', pinyin: 'mù biāo', english: 'target', is_correct: true },
        { character: '目的', pinyin: 'mù dì', english: 'purpose', is_correct: false },
        { character: '标准', pinyin: 'biāo zhǔn', english: 'standard', is_correct: false },
        { character: '标志', pinyin: 'biāo zhì', english: 'sign', is_correct: false }
      ]
    };

    this.currentStage = 1;
    this.renderDialogueText({ revealTarget: false, revealTranslations: false });
    this.renderStage1();
  }

  // =========================================================================
  // DOM RENDERING: DIALOGUE TEXT (NO BOXES, JUST PURE TYPOGRAPHY)
  // =========================================================================

  renderDialogueText({ revealTarget = false, revealTranslations = false } = {}) {
    const container = document.getElementById('context-dialogue-lines');
    if (!container || !this.currentDialogue) return;

    const turns = this.currentDialogue.turns || [];
    const targetTurnIdx = this.activeSlot ? this.activeSlot.turn_index : 0;
    const targetChar = this.activeSlot ? this.activeSlot.word_character : '';
    const charRange = this.activeSlot ? this.activeSlot.char_range : [0, targetChar.length];

    let html = '';
    turns.forEach((turn, idx) => {
      const isTargetTurn = idx === targetTurnIdx;
      const speakerTag = turn.speaker || (idx === 0 ? 'A' : 'B');
      const isSpeakerA = speakerTag === 'A';
      const speakerColor = isSpeakerA ? 'bg-[#064E3B] text-[#7EF1BE]' : 'bg-black text-white';

      let hanziContent = turn.hanzi || '';
      if (isTargetTurn) {
        if (revealTarget) {
          // Highlight the resolved character in emerald
          const before = hanziContent.slice(0, charRange[0]);
          const after = hanziContent.slice(charRange[1]);
          hanziContent = `${before}<span class="inline-block px-1.5 py-0.5 bg-[#7EF1BE] text-[#064E3B] font-bold rounded border border-black">${targetChar}</span>${after}`;
        } else {
          // Render proportional dashes [ _ _  _ _ _ _ ]
          const before = hanziContent.slice(0, charRange[0]);
          const after = hanziContent.slice(charRange[1]);
          const pinyinSegs = this.activeSlot.pinyin_segments || [this.activeSlot.word_pinyin || ''];
          const dashSegments = pinyinSegs.map(s => {
            const letterCount = Math.max(2, s.replace(/[^a-zA-Z]/g, '').length || 2);
            return `<span class="context-dash-slot inline-block px-1 tracking-widest border-b-[2.5px] border-dashed border-[#064E3B]/70 font-mono text-sm sm:text-base font-black text-[#064E3B] mx-0.5">${'_ '.repeat(letterCount).trim()}</span>`;
          }).join(' ');

          hanziContent = `${before}<span id="context-dash-target-wrap" class="inline-flex items-center gap-1 mx-1">${dashSegments}</span>${after}`;
        }
      }

      html += `
        <div class="context-turn-line flex items-baseline gap-2.5 sm:gap-3 py-1 text-left ${isTargetTurn ? 'opacity-100' : 'opacity-85'}">
          <span class="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full ${speakerColor} font-mono font-black text-xs shrink-0 select-none border border-black/40">
            ${speakerTag}
          </span>
          <div class="flex-1 min-w-0">
            <p class="font-chinese text-base sm:text-xl lg:text-2xl text-[#064E3B] font-bold leading-relaxed select-text">
              ${hanziContent}
            </p>
            <p class="context-translation font-mono text-xs sm:text-sm text-[#064E3B]/75 mt-0.5 font-medium transition-all duration-300 ${revealTranslations ? 'block' : 'hidden'}">
              ${turn.english || ''}
            </p>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // =========================================================================
  // STAGE 1: PINYIN INPUT (MINIMALIST & KEYBOARD SAFE)
  // =========================================================================

  renderStage1() {
    this.currentStage = 1;
    const stagePinyin = document.getElementById('context-stage-pinyin');
    const stageDistractor = document.getElementById('context-stage-distractor');
    const pinyinInput = document.getElementById('context-pinyin-input');
    const preview = document.getElementById('context-pinyin-preview');

    if (stagePinyin) stagePinyin.classList.remove('hidden');
    if (stageDistractor) stageDistractor.classList.add('hidden');

    if (pinyinInput) {
      pinyinInput.value = '';
      pinyinInput.disabled = false;
      pinyinInput.className = 'w-full bg-white text-black font-mono text-lg sm:text-xl font-black px-4 py-3 rounded-xl border-[2.5px] border-black shadow-hard-black focus:outline-none focus:ring-2 focus:ring-[#7EF1BE] transition-colors';
      setTimeout(() => {
        try { pinyinInput.focus(); } catch (_) {}
      }, 80);
    }

    if (preview) {
      preview.textContent = '';
      preview.className = 'font-mono text-xs font-bold text-[#064E3B]/70 tracking-wide';
    }
  }

  handlePinyinInput(rawVal) {
    if (this.currentStage !== 1 || !this.activeSlot) return;

    const diacritic = convertNumericToDiacritic(rawVal);
    const preview = document.getElementById('context-pinyin-preview');
    if (preview) {
      preview.textContent = diacritic ? `➔ ${diacritic}` : '';
    }

    // Check if input matches any accepted variant
    const acceptedList = this.activeSlot.accepted_numeric_pinyin || [];
    const normalizedInput = normalizePinyinForCompare(rawVal).replace(/\s+/g, '');
    const normalizedDiacritic = normalizePinyinForCompare(diacritic).replace(/\s+/g, '');

    const isMatch = acceptedList.some(item => {
      const norm = normalizePinyinForCompare(item).replace(/\s+/g, '');
      const itemDiacritic = normalizePinyinForCompare(convertNumericToDiacritic(item)).replace(/\s+/g, '');
      return norm === normalizedInput || itemDiacritic === normalizedDiacritic;
    });

    if (isMatch) {
      this.onPinyinSuccess(diacritic || this.activeSlot.word_pinyin);
    }
  }

  submitPinyinInput() {
    if (this.currentStage !== 1 || !this.activeSlot) return;
    const pinyinInput = document.getElementById('context-pinyin-input');
    if (!pinyinInput) return;

    const rawVal = pinyinInput.value.trim();
    if (!rawVal) return;

    const diacritic = convertNumericToDiacritic(rawVal);
    const acceptedList = this.activeSlot.accepted_numeric_pinyin || [];
    const normalizedInput = normalizePinyinForCompare(rawVal).replace(/\s+/g, '');
    const normalizedDiacritic = normalizePinyinForCompare(diacritic).replace(/\s+/g, '');

    const isMatch = acceptedList.some(item => {
      const norm = normalizePinyinForCompare(item).replace(/\s+/g, '');
      const itemDiacritic = normalizePinyinForCompare(convertNumericToDiacritic(item)).replace(/\s+/g, '');
      return norm === normalizedInput || itemDiacritic === normalizedDiacritic;
    });

    if (isMatch) {
      this.onPinyinSuccess(diacritic || this.activeSlot.word_pinyin);
    } else {
      triggerDampedShake(pinyinInput);
      pinyinInput.classList.add('bg-[#FEE2E2]', 'border-[#DC2626]');
      setTimeout(() => {
        pinyinInput.classList.remove('bg-[#FEE2E2]', 'border-[#DC2626]');
      }, 500);
    }
  }

  onPinyinSuccess(resolvedPinyin) {
    const pinyinInput = document.getElementById('context-pinyin-input');
    if (pinyinInput) {
      pinyinInput.disabled = true;
      pinyinInput.classList.remove('border-black');
      pinyinInput.classList.add('bg-[#D1FAE5]', 'border-[#059669]', 'text-[#064E3B]');
    }

    // Short tactile pause before swapping to Stage 2
    setTimeout(() => {
      this.advanceToStage2(resolvedPinyin);
    }, 280);
  }

  // =========================================================================
  // STAGE 2: CENTERED PINYIN HERO & 2x2 DISTRACTOR GRID
  // =========================================================================

  advanceToStage2(resolvedPinyin) {
    this.currentStage = 2;
    const stagePinyin = document.getElementById('context-stage-pinyin');
    const stageDistractor = document.getElementById('context-stage-distractor');
    const heroPinyin = document.getElementById('context-hero-pinyin');
    const distractorGrid = document.getElementById('context-distractor-grid');
    const nextBtn = document.getElementById('context-next-btn');

    if (heroPinyin) {
      heroPinyin.textContent = resolvedPinyin || this.activeSlot.word_pinyin;
    }

    if (nextBtn) {
      nextBtn.classList.add('hidden');
    }

    // Render 4 Distractor Options
    if (distractorGrid && this.activeSlot && Array.isArray(this.activeSlot.distractor_options)) {
      let gridHtml = '';
      this.activeSlot.distractor_options.forEach((opt, idx) => {
        gridHtml += `
          <button type="button" data-index="${idx}" class="context-distractor-btn group relative w-full min-h-[58px] sm:min-h-[66px] bg-white hover:bg-[#7EF1BE] text-black border-[2.5px] border-black rounded-xl p-2.5 sm:p-3 shadow-hard-black transition-all active-collapse cursor-pointer flex items-center justify-between">
            <span class="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-black text-[#7EF1BE] font-mono font-black text-xs shrink-0 select-none">
              ${idx + 1}
            </span>
            <span class="font-chinese font-black text-2xl sm:text-3xl text-black flex-1 text-center truncate">
              ${opt.character}
            </span>
            <span class="w-6 shrink-0"></span>
          </button>
        `;
      });
      distractorGrid.innerHTML = gridHtml;

      // Attach click listeners to distractors
      distractorGrid.querySelectorAll('.context-distractor-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(btn.dataset.index, 10);
          this.handleDistractorSelection(idx, btn);
        });
      });
    }

    if (stagePinyin && stageDistractor) {
      swapViews([stagePinyin], [stageDistractor], {
        direction: 'forward',
        distancePx: 12,
        onAfterShow: () => {
          if (!prefersReducedMotion() && heroPinyin) {
            animateSpringPop(heroPinyin);
          }
        }
      });
    }
  }

  handleDistractorSelection(index, btnElement) {
    if (this.currentStage !== 2 || !this.activeSlot) return;

    const opt = this.activeSlot.distractor_options[index];
    if (!opt) return;

    if (opt.is_correct) {
      // Correct choice
      this.currentStage = 'complete';
      if (btnElement) {
        btnElement.classList.remove('bg-white', 'hover:bg-[#7EF1BE]');
        btnElement.classList.add('bg-[#7EF1BE]', 'border-[#064E3B]');
      }

      // Reveal Hanzi in dialogue lines and reveal translations
      this.renderDialogueText({ revealTarget: true, revealTranslations: true });

      // Reveal NEXT button
      const nextBtn = document.getElementById('context-next-btn');
      if (nextBtn) {
        nextBtn.classList.remove('hidden');
        if (!prefersReducedMotion()) {
          animateSpringPop(nextBtn);
        }
      }
    } else {
      // Incorrect choice: shake and disable
      if (btnElement) {
        triggerDampedShake(btnElement);
        btnElement.disabled = true;
        btnElement.classList.remove('bg-white', 'hover:bg-[#7EF1BE]');
        btnElement.classList.add('bg-[#FEE2E2]', 'border-[#DC2626]', 'opacity-60', 'cursor-not-allowed');
      }
    }
  }

  // =========================================================================
  // AUDIO PIPELINE (STUB FOR SWE AGENT)
  // =========================================================================

  playDialogueAudio() {
    const playBtn = document.getElementById('context-play-audio-btn');
    if (!this.currentDialogue) return;

    // Visual feedback on play button
    if (playBtn) {
      playBtn.classList.add('scale-95', 'bg-[#7EF1BE]', 'text-[#064E3B]');
      setTimeout(() => {
        playBtn.classList.remove('scale-95', 'bg-[#7EF1BE]', 'text-[#064E3B]');
      }, 250);
    }

    const audioPath = this.currentDialogue.audio_file;
    if (audioPath && typeof Audio !== 'undefined') {
      try {
        if (this.audioInstance) {
          this.audioInstance.pause();
          this.audioInstance.currentTime = 0;
        }
        this.audioInstance = new Audio(`${import.meta.env.BASE_URL}${audioPath}`);
        this.audioInstance.play().catch(() => {
          console.log('ContextLab: Audio file not found or browser blocked autoplay:', audioPath);
        });
      } catch (_) {}
    }
  }

  stopAudio() {
    if (this.audioInstance) {
      try {
        this.audioInstance.pause();
        this.audioInstance.currentTime = 0;
      } catch (_) {}
      this.audioInstance = null;
    }
  }

  // =========================================================================
  // KEYBOARD SHORTCUTS
  // =========================================================================

  attachKeyboardShortcuts() {
    if (this.keyListenerAttached) return;
    this.keyListenerAttached = true;

    window.addEventListener('keydown', (e) => {
      const screen = document.getElementById('context-lab-screen');
      if (!screen || screen.classList.contains('hidden')) return;

      if (this.currentStage === 2) {
        if (['1', '2', '3', '4'].includes(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          const btns = document.querySelectorAll('.context-distractor-btn');
          if (btns[idx] && !btns[idx].disabled) {
            pressKeycap(btns[idx]);
            this.handleDistractorSelection(idx, btns[idx]);
          }
        }
      } else if (this.currentStage === 'complete') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const nextBtn = document.getElementById('context-next-btn');
          if (nextBtn && !nextBtn.classList.contains('hidden')) {
            pressKeycap(nextBtn);
            this.loadNextDialogue();
          }
        }
      }
    });
  }

  // =========================================================================
  // DOM EVENT BINDING
  // =========================================================================

  bindCockpitUI() {
    const pinyinInput = document.getElementById('context-pinyin-input');
    const submitBtn = document.getElementById('context-pinyin-submit-btn');
    const playAudioBtn = document.getElementById('context-play-audio-btn');
    const nextBtn = document.getElementById('context-next-btn');
    const prevUnitBtn = document.getElementById('context-unit-prev-btn');
    const nextUnitBtn = document.getElementById('context-unit-next-btn');

    if (prevUnitBtn) {
      prevUnitBtn.addEventListener('click', () => {
        this.setUnit(this.currentUnitIndex - 1);
      });
    }

    if (nextUnitBtn) {
      nextUnitBtn.addEventListener('click', () => {
        this.setUnit(this.currentUnitIndex + 1);
      });
    }

    if (pinyinInput) {
      pinyinInput.addEventListener('input', (e) => {
        this.handlePinyinInput(e.target.value);
      });
      pinyinInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.submitPinyinInput();
        }
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        this.submitPinyinInput();
      });
    }

    if (playAudioBtn) {
      playAudioBtn.addEventListener('click', () => {
        this.playDialogueAudio();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.loadNextDialogue();
      });
    }
  }
}

// Global Singleton
export const contextLabEngine = new ContextLabEngine();
if (typeof window !== 'undefined') {
  window.ContextLabEngine = contextLabEngine;
}
