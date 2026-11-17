/**
 * contextLabEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Context Lab Backend Engine & Controller
 * Architecture:
 * - Recency-Weighted Cumulative Dialogue Sampler (60% Recent / 25% Intermediate / 15% Foundation)
 * - Anti-Repetition FIFO Session Buffer (Last 10 dialogues)
 * - Real-Time Number-to-Diacritic Pinyin Parser & Live Syllable Dash Binding
 * - Anti-Intersection Distractor Matrix Validator & 2x2 Randomizer
 * - Time-Synchronized Speaker Turn Highlighting (0ms drift audio playback)
 * - Zero Sound Effects (per user specification)
 */

import {
  triggerDampedShake,
  animateSpringPop,
  pressKeycap,
  swapViews,
  prefersReducedMotion,
  EASE_SNAP
} from './motion.js';

// =============================================================================
// 1. PINYIN DIACRITIC PARSER & NORMALIZATION ALGORITHMS
// =============================================================================

const VOWEL_TONE_MAP = {
  a: ['ā', 'á', 'ǎ', 'à', 'a'],
  e: ['ē', 'é', 'ě', 'è', 'e'],
  o: ['ō', 'ó', 'ǒ', 'ò', 'o'],
  i: ['ī', 'í', 'ǐ', 'ì', 'i'],
  u: ['ū', 'ú', 'ǔ', 'ù', 'u'],
  v: ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü']
};

/**
 * Converts single or multi-syllable numeric pinyin (e.g. "fa1 shao1", "lv4") into marked diacritic pinyin ("fā shāo", "lǜ").
 */
export function convertNumericToDiacritic(text) {
  if (!text) return '';
  return text.replace(/([a-zA-ZüÜ:vV]+)([1-5])/g, (match, rawSyl, toneStr) => {
    const tone = parseInt(toneStr, 10);
    if (tone < 1 || tone > 5) return rawSyl;

    let s = rawSyl.replace(/[vV]|u:/g, 'ü');
    if (tone === 5) return s;

    const toneIdx = tone - 1;
    const lower = s.toLowerCase();

    // Standard Mandarin tone mark placement rules:
    // 1. If 'a' or 'e' is present, it takes the tone mark.
    if (lower.includes('a')) {
      const idx = lower.indexOf('a');
      const isUpper = s[idx] === 'A';
      const mark = isUpper ? VOWEL_TONE_MAP.a[toneIdx].toUpperCase() : VOWEL_TONE_MAP.a[toneIdx];
      return s.slice(0, idx) + mark + s.slice(idx + 1);
    }
    if (lower.includes('e')) {
      const idx = lower.indexOf('e');
      const isUpper = s[idx] === 'E';
      const mark = isUpper ? VOWEL_TONE_MAP.e[toneIdx].toUpperCase() : VOWEL_TONE_MAP.e[toneIdx];
      return s.slice(0, idx) + mark + s.slice(idx + 1);
    }
    // 2. If 'ou' is present, 'o' takes the mark.
    if (lower.includes('ou')) {
      const idx = lower.indexOf('o');
      const isUpper = s[idx] === 'O';
      const mark = isUpper ? VOWEL_TONE_MAP.o[toneIdx].toUpperCase() : VOWEL_TONE_MAP.o[toneIdx];
      return s.slice(0, idx) + mark + s.slice(idx + 1);
    }
    // 3. Otherwise, the last vowel takes the mark (e.g. 'ui', 'iu', 'ie', etc.)
    const vowels = [...lower.matchAll(/[aeiouü]/g)];
    if (vowels.length > 0) {
      const lastVowel = vowels[vowels.length - 1];
      const idx = lastVowel.index;
      const vChar = lastVowel[0];
      const isUpper = s[idx] === s[idx].toUpperCase();
      const mapped = VOWEL_TONE_MAP[vChar] ? VOWEL_TONE_MAP[vChar][toneIdx] : vChar;
      const mark = isUpper ? mapped.toUpperCase() : mapped;
      return s.slice(0, idx) + mark + s.slice(idx + 1);
    }
    return s;
  });
}

/**
 * Normalizes pinyin string for comparison (strips punctuation, extra spaces, tone marks).
 */
export function normalizePinyinForCompare(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[,\.?!'"_\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validates raw user input against accepted variants.
 */
export function validatePinyinInput(userInput, acceptedVariants = []) {
  if (!userInput) return false;
  const cleanInput = normalizePinyinForCompare(userInput).replace(/\s+/g, '');
  const diacriticInput = normalizePinyinForCompare(convertNumericToDiacritic(userInput)).replace(/\s+/g, '');

  return acceptedVariants.some(variant => {
    const normVariant = normalizePinyinForCompare(variant).replace(/\s+/g, '');
    const diacriticVariant = normalizePinyinForCompare(convertNumericToDiacritic(variant)).replace(/\s+/g, '');
    return normVariant === cleanInput || diacriticVariant === diacriticInput || normVariant === diacriticInput;
  });
}

/**
 * Segments user input into syllables/words according to spaces and expected count.
 * Handles space-separated ("ka1 fei1", "ka1 "), continuous numeric ("ka1fei1"),
 * and diacritic variants ("kā fēi").
 */
export function segmentPinyinInput(rawVal, expectedCount = 1) {
  if (!rawVal) return [];
  const trimmedLeading = rawVal.replace(/^\s+/, '');
  if (!trimmedLeading) return [];

  // If user used spaces, split by spaces
  if (rawVal.includes(' ')) {
    const hasTrailingSpace = /\s+$/.test(rawVal);
    const tokens = trimmedLeading.split(/\s+/).filter(Boolean);
    if (hasTrailingSpace && tokens.length < expectedCount) {
      tokens.push('');
    }
    return tokens;
  }

  // If no spaces, but target has > 1 syllables, try splitting by numeric tone markers
  // e.g. "ka1fei1" -> ["ka1", "fei1"] or "ka1f" -> ["ka1", "f"]
  if (expectedCount > 1) {
    const sylTokens = [];
    let remaining = rawVal;
    const toneRegex = /^([a-zA-ZüÜ:vV]+[1-5])(.*)$/;
    while (remaining) {
      const match = remaining.match(toneRegex);
      if (match) {
        sylTokens.push(match[1]);
        remaining = match[2];
        if (sylTokens.length === expectedCount - 1 && remaining) {
          sylTokens.push(remaining);
          break;
        }
      } else {
        sylTokens.push(remaining);
        break;
      }
    }
    if (sylTokens.length > 0) {
      return sylTokens;
    }
  }

  return [rawVal];
}

// =============================================================================
// 2. ANTI-INTERSECTION MATRIX VALIDATION
// =============================================================================

/**
 * Verifies that the maximum frequency of any Hanzi character across the 4 options is <= 2.
 */
export function verifyAntiIntersectionMatrix(options) {
  if (!options || options.length !== 4) return false;
  const charCounts = {};
  for (const opt of options) {
    const chars = Array.from(opt.character || '');
    for (const char of chars) {
      charCounts[char] = (charCounts[char] || 0) + 1;
    }
  }
  const maxFreq = Math.max(...Object.values(charCounts), 0);
  return maxFreq <= 2;
}

// =============================================================================
// 3. RECENCY-WEIGHTED CUMULATIVE SAMPLING ENGINE
// =============================================================================

/**
 * Samples the next dialogue and test slot based on user syllabus progress and recency weights.
 */
export function sampleNextDialogue(db, config = {}) {
  const dialogues = (db && db.dialogues) || [];
  if (dialogues.length === 0) return null;

  const {
    maxUnit = 1,
    mode = 'cumulative',
    sessionHistory = []
  } = config;

  // 1. Single Unit Drill Mode or Foundation units (K <= 3)
  if (mode === 'single_unit' || maxUnit <= 3) {
    let pool = dialogues.filter(d => d.unit_index === maxUnit && !sessionHistory.includes(d.dialogue_id));
    if (pool.length === 0) {
      // Fallback: relax session history if pool exhausted
      pool = dialogues.filter(d => d.unit_index === maxUnit);
    }
    const selected = pool.length > 0
      ? pool[Math.floor(Math.random() * pool.length)]
      : dialogues[0];
    const slot = (selected.test_slots && selected.test_slots[0]) || null;
    return { dialogue: selected, activeSlot: slot };
  }

  // 2. Cumulative Recency-Weighted Mode:
  // - Recent Pool (60%): K-3 to K
  // - Intermediate Pool (25%): K-8 to K-4
  // - Foundation Anchor Pool (15%): 1 to K-9
  const recentMin = Math.max(1, maxUnit - 3);
  const interMin = Math.max(1, maxUnit - 8);

  const recentPool = dialogues.filter(d => d.unit_index >= recentMin && d.unit_index <= maxUnit && !sessionHistory.includes(d.dialogue_id));
  const interPool = dialogues.filter(d => d.unit_index >= interMin && d.unit_index < recentMin && !sessionHistory.includes(d.dialogue_id));
  const foundationPool = dialogues.filter(d => d.unit_index < interMin && !sessionHistory.includes(d.dialogue_id));

  const roll = Math.random();
  let candidatePool = [];

  if (roll < 0.60 && recentPool.length > 0) {
    candidatePool = recentPool;
  } else if (roll < 0.85 && interPool.length > 0) {
    candidatePool = interPool;
  } else if (foundationPool.length > 0) {
    candidatePool = foundationPool;
  } else {
    // Graceful fallback chain
    candidatePool = recentPool.length > 0
      ? recentPool
      : (interPool.length > 0 ? interPool : (foundationPool.length > 0 ? foundationPool : dialogues.filter(d => d.unit_index <= maxUnit)));
  }

  if (candidatePool.length === 0) {
    candidatePool = dialogues.slice(0, 10);
  }

  const selectedDialogue = candidatePool[Math.floor(Math.random() * candidatePool.length)];
  const slots = selectedDialogue.test_slots || [];
  const activeSlot = slots.length > 0
    ? slots[Math.floor(Math.random() * slots.length)]
    : null;

  return { dialogue: selectedDialogue, activeSlot };
}

// =============================================================================
// 4. CONTEXT LAB ENGINE CONTROLLER
// =============================================================================

export class ContextLabEngine {
  constructor() {
    this.dialogues = [];
    this.vocabUnits = [];
    this.totalUnits = 35;
    this.currentUnitIndex = typeof localStorage !== 'undefined'
      ? parseInt(localStorage.getItem('context_lab_active_unit') || '1', 10)
      : 1;
    this.samplingMode = typeof localStorage !== 'undefined'
      ? (localStorage.getItem('context_lab_sampling_mode') || 'cumulative')
      : 'cumulative';
    this.sessionHistory = []; // FIFO last 10 dialogues
    this.currentDialogue = null;
    this.activeSlot = null;
    this.shuffledDistractors = [];
    this.currentStage = 1; // 1 = pinyin, 2 = distractor, 'complete'
    this.audioInstance = null;
    this.isAudioPlaying = false;
    this.audioRafId = null;
    this.keyListenerAttached = false;
    this.activeTurnHighlightIndex = null;
    this.audioPlayCount = 0;
    this.isEnglishRevealed = false;
    this.isPinyinSolved = false;
    this.lastPlayTimestamp = 0;
    this.hasPoppedUnlock = false;
  }

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
      console.warn('ContextLab: Could not load dialogue database, using fallback sample.', e);
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
      audio_file: 'audio/duo_dialogues/d_u01_01.mp3',
      total_duration_ms: 5514,
      turns: [
        {
          turn_index: 0,
          speaker: 'A',
          speaker_role: 'Customer',
          voice: 'zh-CN-XiaoxiaoNeural',
          hanzi: '你好，这是热咖啡吗？',
          pinyin: 'Nǐ hǎo, zhè shì rè kā fēi ma?',
          english: 'Hello, is this hot coffee?',
          audio_start_ms: 0,
          audio_end_ms: 2496
        },
        {
          turn_index: 1,
          speaker: 'B',
          speaker_role: 'Barista',
          voice: 'zh-CN-YunxiNeural',
          hanzi: '对，这是热咖啡。',
          pinyin: 'Duì, zhè shì rè kā fēi.',
          english: 'Yes, this is hot coffee.',
          audio_start_ms: 2946,
          audio_end_ms: 5514
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
            { character: '咖啡', pinyin: 'kā fēi', english: 'coffee', is_correct: true, distractor_type: 'TARGET' },
            { character: '可乐', pinyin: 'kě lè', english: 'cola', is_correct: false, distractor_type: 'SHARED_HEAD' },
            { character: '咖喱', pinyin: 'kā lǐ', english: 'curry', is_correct: false, distractor_type: 'SHARED_HEAD' },
            { character: '奶茶', pinyin: 'nǎi chá', english: 'milk tea', is_correct: false, distractor_type: 'SHARED_TAIL' }
          ]
        }
      ]
    };
  }

  // =========================================================================
  // UNIT SELECTION & NAVIGATION
  // =========================================================================

  setUnit(newUnitIdx) {
    if (newUnitIdx < 1) newUnitIdx = this.totalUnits;
    if (newUnitIdx > this.totalUnits) newUnitIdx = 1;
    this.currentUnitIndex = newUnitIdx;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('context_lab_active_unit', String(newUnitIdx));
    }
    this.updateUnitDisplay();

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
    this.stopAudio();
    this.loadNextDialogue();
    this.attachKeyboardShortcuts();
  }

  loadNextDialogue() {
    this.stopAudio();
    const sampled = sampleNextDialogue(
      { dialogues: this.dialogues },
      {
        maxUnit: this.currentUnitIndex,
        mode: this.samplingMode,
        sessionHistory: this.sessionHistory
      }
    );

    if (!sampled || !sampled.dialogue) return;

    // Track session history (max 10)
    this.sessionHistory.push(sampled.dialogue.dialogue_id);
    if (this.sessionHistory.length > 10) {
      this.sessionHistory.shift();
    }

    this.setupDialogue(sampled.dialogue, sampled.activeSlot);
  }

  setupDialogue(dialogue, slot = null) {
    this.currentDialogue = dialogue;
    this.activeSlot = slot || (dialogue.test_slots && dialogue.test_slots[0]) || {
      turn_index: 0,
      char_range: [0, 2],
      word_character: '目标',
      word_pinyin: 'mù biāo',
      word_english: 'target',
      accepted_numeric_pinyin: ['mu4biao1', 'mu4 biao1', 'mù biāo'],
      distractor_options: [
        { character: '目标', pinyin: 'mù biāo', english: 'target', is_correct: true, distractor_type: 'TARGET' },
        { character: '目的', pinyin: 'mù dì', english: 'purpose', is_correct: false, distractor_type: 'SHARED_HEAD' },
        { character: '标准', pinyin: 'biāo zhǔn', english: 'standard', is_correct: false, distractor_type: 'SHARED_TAIL' },
        { character: '标志', pinyin: 'biāo zhì', english: 'sign', is_correct: false, distractor_type: 'SHARED_HEAD' }
      ]
    };

    // Shuffle distractor options (Fisher-Yates) so target isn't always Button 1
    const originalOptions = (this.activeSlot.distractor_options || []).map(opt => ({ ...opt }));
    for (let i = originalOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [originalOptions[i], originalOptions[j]] = [originalOptions[j], originalOptions[i]];
    }
    this.shuffledDistractors = originalOptions;

    this.audioPlayCount = 0;
    this.isEnglishRevealed = false;
    this.isPinyinSolved = false;
    this.lastPlayTimestamp = 0;
    this.hasPoppedUnlock = false;
    this.updateRevealEnglishBtn();

    this.currentStage = 1;
    this.renderDialogueText({ revealTarget: false, revealTranslations: false, activeTurnIndex: null });
    this.renderStage1();

    // Auto-play dialogue on load if audio exists
    if (this.currentDialogue.audio_file) {
      setTimeout(() => {
        const screen = document.getElementById('context-lab-screen');
        if (screen && !screen.classList.contains('hidden')) {
          this.playDialogueAudio({ isAutoplay: true });
        }
      }, 200);
    }
  }

  // =========================================================================
  // DOM RENDERING: DIALOGUE TEXT & TIME-SYNCHRONIZED HIGHLIGHTING
  // =========================================================================

  renderDialogueText({
    revealTarget = (this.currentStage === 'complete'),
    revealTranslations = (this.isEnglishRevealed || this.currentStage === 'complete'),
    activeTurnIndex = null,
    partialPinyin = ''
  } = {}) {
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
      const isActiveTurnPlaying = activeTurnIndex === idx;

      let hanziContent = turn.hanzi || '';
      if (isTargetTurn) {
        if (revealTarget) {
          // Highlight the resolved character in emerald badge
          const before = hanziContent.slice(0, charRange[0]);
          const after = hanziContent.slice(charRange[1]);
          hanziContent = `${before}<span class="inline-block px-2 py-0.5 bg-[#7EF1BE] text-[#064E3B] font-black rounded-lg border-2 border-[#064E3B] shadow-sm">${targetChar}</span>${after}`;
        } else {
          // Render empty boxes with colored accent/darker background instead of literal dashes
          const before = hanziContent.slice(0, charRange[0]);
          const after = hanziContent.slice(charRange[1]);
          const pinyinSegs = this.activeSlot.pinyin_segments || [this.activeSlot.word_pinyin || ''];
          const pinyinInput = document.getElementById('context-pinyin-input');
          const currentVal = pinyinInput ? pinyinInput.value : '';
          const currentTokens = segmentPinyinInput(currentVal, pinyinSegs.length);

          const dashSegments = pinyinSegs.map((seg, idx) => {
            const letterCount = Math.max(2, seg.replace(/[^a-zA-Z]/g, '').length || 2);
            const minWidthPx = Math.max(44, letterCount * 13);
            const token = currentTokens[idx];
            const hasContent = Boolean(token && token.length > 0);
            const content = hasContent ? convertNumericToDiacritic(token) : '';
            const isActive = idx === 0 && !hasContent && this.currentStage === 1;

            const boxStyle = hasContent
              ? 'border-[#064E3B] bg-white text-[#064E3B] shadow-sm'
              : (isActive
                  ? 'border-[#064E3B] bg-[#7EF1BE]/30 ring-2 ring-[#7EF1BE] ring-offset-1 text-[#064E3B]'
                  : 'border-[#064E3B]/40 bg-[#064E3B]/10 text-[#064E3B]');

            return `<span class="context-dash-slot inline-flex items-center justify-center align-middle h-7 sm:h-8 lg:h-9 px-2 mx-0.5 rounded-lg sm:rounded-xl border-2 ${boxStyle} font-mono text-base sm:text-lg font-black transition-all duration-150 select-none cursor-pointer" style="min-width: ${minWidthPx}px;" data-index="${idx}">${content}</span>`;
          }).join('');

          hanziContent = `${before}<span id="context-dash-target-wrap" class="inline-flex items-center align-middle mx-1 cursor-pointer" title="Click to type pinyin">${dashSegments}</span>${after}`;
        }
      }

      const activeGlowClass = isActiveTurnPlaying
        ? 'ring-2 ring-[#7EF1BE] bg-[#7EF1BE]/10 rounded-xl px-2 py-1 transition-all duration-200'
        : 'py-1 transition-all duration-200';

      html += `
        <div class="context-turn-line flex items-baseline gap-2.5 sm:gap-3 text-left ${activeGlowClass} ${isTargetTurn ? 'opacity-100' : 'opacity-85'}">
          <span class="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full ${speakerColor} font-mono font-black text-xs shrink-0 select-none border border-black/40">
            ${speakerTag}
          </span>
          <div class="flex-1 min-w-0">
            <p class="font-chinese text-base sm:text-xl lg:text-2xl text-[#064E3B] font-bold leading-relaxed select-text">
              ${hanziContent}
            </p>
            <p class="context-translation font-mono text-xs sm:text-sm text-[#064E3B]/75 mt-0.5 font-medium transition-all duration-300 ${revealTranslations ? 'opacity-100 visible' : 'opacity-0 invisible select-none pointer-events-none'}">
              ${turn.english || ''}
            </p>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    const dashWrap = document.getElementById('context-dash-target-wrap');
    if (dashWrap) {
      dashWrap.addEventListener('click', () => {
        const input = document.getElementById('context-pinyin-input');
        if (input && !input.disabled) {
          input.focus();
        }
      });
    }
  }

  // =========================================================================
  // STAGE 1: PINYIN INPUT (MINIMALIST & MOBILE SAFE)
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
      pinyinInput.className = 'w-full bg-white text-black font-mono text-base sm:text-lg font-black px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border-[2.5px] border-black shadow-hard-black focus:outline-none focus:ring-2 focus:ring-[#7EF1BE] transition-colors';
      setTimeout(() => {
        try { pinyinInput.focus(); } catch (_) {}
      }, 100);
    }

    if (preview) {
      preview.textContent = '';
      preview.className = 'font-mono text-xs font-bold text-[#064E3B]/70 tracking-wide';
    }

    this.updateDashSlots('');
  }

  updateDashSlots(rawVal = '') {
    if (!this.activeSlot) return;

    const pinyinSegs = this.activeSlot.pinyin_segments || [this.activeSlot.word_pinyin || ''];
    const expectedCount = pinyinSegs.length;
    const tokens = segmentPinyinInput(rawVal, expectedCount);
    const dashSlots = document.querySelectorAll('.context-dash-slot');
    if (!dashSlots || dashSlots.length === 0) return;

    // Determine which slot is actively receiving input
    let activeSlotIdx = 0;
    if (tokens.length === 0) {
      activeSlotIdx = 0;
    } else if (tokens.length < dashSlots.length) {
      activeSlotIdx = tokens[tokens.length - 1] === '' ? tokens.length - 1 : tokens.length - 1;
    } else {
      activeSlotIdx = dashSlots.length - 1;
    }

    dashSlots.forEach((slot, idx) => {
      const token = idx === dashSlots.length - 1 && tokens.length > dashSlots.length
        ? tokens.slice(idx).join(' ')
        : tokens[idx];

      const isActive = idx === activeSlotIdx && this.currentStage === 1;

      if (token && token.length > 0) {
        slot.textContent = convertNumericToDiacritic(token);
        const ringClass = isActive ? 'ring-2 ring-[#7EF1BE] ring-offset-1' : '';
        slot.className = `context-dash-slot inline-flex items-center justify-center align-middle h-7 sm:h-8 lg:h-9 px-2 mx-0.5 rounded-lg sm:rounded-xl border-2 border-[#064E3B] bg-white text-[#064E3B] shadow-sm font-mono text-base sm:text-lg font-black transition-all duration-150 select-none cursor-pointer ${ringClass}`;
      } else {
        slot.textContent = '';
        const emptyStyle = isActive
          ? 'border-[#064E3B] bg-[#7EF1BE]/30 ring-2 ring-[#7EF1BE] ring-offset-1'
          : 'border-[#064E3B]/40 bg-[#064E3B]/10';
        slot.className = `context-dash-slot inline-flex items-center justify-center align-middle h-7 sm:h-8 lg:h-9 px-2 mx-0.5 rounded-lg sm:rounded-xl border-2 ${emptyStyle} font-mono text-base sm:text-lg font-black text-[#064E3B] transition-all duration-150 select-none cursor-pointer`;
      }
    });
  }

  handlePinyinInput(rawVal) {
    if (this.currentStage !== 1 || !this.activeSlot) return;

    const diacritic = convertNumericToDiacritic(rawVal);
    const preview = document.getElementById('context-pinyin-preview');
    if (preview) {
      preview.textContent = diacritic ? `➔ ${diacritic}` : '';
    }

    // Live binding: update multi-slot proportional dashes
    this.updateDashSlots(rawVal);

    const acceptedList = this.activeSlot.accepted_numeric_pinyin || [];
    const isMatch = validatePinyinInput(rawVal, acceptedList) || validatePinyinInput(diacritic, acceptedList);

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
    const isMatch = validatePinyinInput(rawVal, acceptedList) || validatePinyinInput(diacritic, acceptedList);

    if (isMatch) {
      this.onPinyinSuccess(diacritic || this.activeSlot.word_pinyin);
    } else {
      triggerDampedShake(pinyinInput);
      pinyinInput.classList.add('bg-[#FEE2E2]', 'border-[#DC2626]');
      setTimeout(() => {
        pinyinInput.classList.remove('bg-[#FEE2E2]', 'border-[#DC2626]');
      }, 450);
    }
  }

  onPinyinSuccess(resolvedPinyin) {
    this.isPinyinSolved = true;
    this.updateRevealEnglishBtn();

    const pinyinInput = document.getElementById('context-pinyin-input');
    if (pinyinInput) {
      pinyinInput.disabled = true;
      pinyinInput.classList.remove('border-black');
      pinyinInput.classList.add('bg-[#D1FAE5]', 'border-[#059669]', 'text-[#064E3B]');
    }

    // Highlight all dash slots in emerald green success boxes
    const dashSlots = document.querySelectorAll('.context-dash-slot');
    dashSlots.forEach(slot => {
      slot.className = 'context-dash-slot inline-flex items-center justify-center align-middle h-7 sm:h-8 lg:h-9 px-2 mx-0.5 rounded-lg sm:rounded-xl border-2 border-[#059669] bg-[#D1FAE5] text-[#064E3B] shadow-sm font-mono text-base sm:text-lg font-black transition-all duration-150 select-none';
    });

    setTimeout(() => {
      this.advanceToStage2(resolvedPinyin);
    }, 240);
  }

  // =========================================================================
  // STAGE 2: SPOTLIGHT PINYIN & 2x2 DISTRACTOR GRID
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
    if (distractorGrid && this.shuffledDistractors.length > 0) {
      let gridHtml = '';
      this.shuffledDistractors.forEach((opt, idx) => {
        gridHtml += `
          <button type="button" data-index="${idx}" class="context-distractor-btn group relative w-full min-h-[58px] sm:min-h-[66px] bg-white hover:bg-[#7EF1BE] text-black border-[2.5px] border-black rounded-xl p-2.5 sm:p-3 shadow-hard-black transition-all active-collapse cursor-pointer flex items-center justify-between">
            <span class="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-black text-[#7EF1BE] font-mono font-black text-xs shrink-0 select-none">
              ${idx + 1}
            </span>
            <span class="font-chinese font-medium text-xl sm:text-2xl text-black flex-1 text-center truncate">
              ${opt.character}
            </span>
            <span class="w-6 shrink-0"></span>
          </button>
        `;
      });
      distractorGrid.innerHTML = gridHtml;

      distractorGrid.querySelectorAll('.context-distractor-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.index, 10);
          this.handleDistractorSelection(idx, btn);
        });
      });
    }

    // Clean up any lingering feedback
    this.clearDiagnosticFeedback();

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

    const opt = this.shuffledDistractors[index];
    if (!opt) return;

    if (opt.is_correct) {
      // Correct choice
      this.currentStage = 'complete';
      this.clearDiagnosticFeedback();

      if (btnElement) {
        btnElement.classList.remove('bg-white', 'hover:bg-[#7EF1BE]');
        btnElement.classList.add('bg-[#7EF1BE]', 'border-[#064E3B]');
        if (!prefersReducedMotion()) {
          animateSpringPop(btnElement);
        }
      }

      // Unmask character in speech bubble & reveal English translations
      this.renderDialogueText({
        revealTarget: true,
        revealTranslations: true,
        activeTurnIndex: this.activeTurnHighlightIndex
      });
      this.updateRevealEnglishBtn();

      // Reveal NEXT button
      const nextBtn = document.getElementById('context-next-btn');
      if (nextBtn) {
        nextBtn.classList.remove('hidden');
        if (!prefersReducedMotion()) {
          animateSpringPop(nextBtn);
        }
      }
    } else {
      // Incorrect choice: shake and disable with soft red
      if (btnElement) {
        triggerDampedShake(btnElement);
        btnElement.disabled = true;
        btnElement.classList.remove('bg-white', 'hover:bg-[#7EF1BE]');
        btnElement.classList.add('bg-[#FEE2E2]', 'border-[#DC2626]', 'opacity-60', 'cursor-not-allowed');
      }

      // Diagnostic feedback explaining the error
      this.showDiagnosticFeedback(opt);
    }
  }

  showDiagnosticFeedback(wrongOption) {
    let feedbackEl = document.getElementById('context-distractor-feedback');
    const stageDistractor = document.getElementById('context-stage-distractor');
    const distractorGrid = document.getElementById('context-distractor-grid');

    if (!feedbackEl && stageDistractor && distractorGrid) {
      feedbackEl = document.createElement('div');
      feedbackEl.id = 'context-distractor-feedback';
      feedbackEl.className = 'w-full p-2.5 bg-white border-2 border-black rounded-xl text-center shadow-hard-black font-mono text-xs sm:text-sm font-bold text-[#064E3B] transition-all';
      distractorGrid.after(feedbackEl);
    }

    if (feedbackEl) {
      const targetPinyin = this.activeSlot.word_pinyin || '';
      const wrongPinyin = wrongOption.pinyin || '';
      const wrongChar = wrongOption.character || '';
      const wrongEnglish = wrongOption.english || '';

      let message = `${wrongChar} (${wrongPinyin}): '${wrongEnglish}'. Target is ${targetPinyin}.`;
      if (wrongOption.distractor_type === 'SHARED_HEAD') {
        message = `Close sound! But ${wrongChar} is pronounced ${wrongPinyin} ('${wrongEnglish}').`;
      } else if (wrongOption.distractor_type === 'SHARED_TAIL') {
        message = `Shared vowel! But ${wrongChar} starts differently: ${wrongPinyin} ('${wrongEnglish}').`;
      }

      feedbackEl.textContent = message;
      feedbackEl.classList.remove('hidden');
      triggerDampedShake(feedbackEl);
    }
  }

  clearDiagnosticFeedback() {
    const feedbackEl = document.getElementById('context-distractor-feedback');
    if (feedbackEl) {
      feedbackEl.textContent = '';
      feedbackEl.classList.add('hidden');
    }
  }

  // =========================================================================
  // REVEAL ENGLISH CONTROLS (3-LISTEN GATED REPLAY LOGIC)
  // =========================================================================

  updateRevealEnglishBtn() {
    const btn = document.getElementById('context-reveal-english-btn');
    if (!btn) return;

    const count = this.audioPlayCount || 0;
    const isUnlocked = count >= 3 || this.isPinyinSolved || this.currentStage === 'complete';
    const textSpan = document.getElementById('context-reveal-english-text');
    const iconSpan = btn.querySelector('.material-symbols-outlined');

    if (!isUnlocked) {
      btn.disabled = true;
      btn.className = 'min-h-[38px] px-3 py-1 bg-black/5 text-[#064E3B]/40 font-mono text-xs font-black uppercase rounded-full border-2 border-black/20 flex items-center gap-1.5 cursor-not-allowed transition-all select-none';
      btn.title = `Listen to dialogue 3 times or solve Pinyin to unlock English translation (${count}/3)`;
      if (iconSpan) iconSpan.textContent = 'lock';
      if (textSpan) textSpan.textContent = `Reveal English (${count}/3)`;
    } else {
      btn.disabled = false;
      const isShowing = this.isEnglishRevealed || this.currentStage === 'complete';
      if (isShowing) {
        btn.className = 'min-h-[38px] px-3 py-1 bg-[#7EF1BE] text-[#064E3B] font-mono text-xs font-black uppercase rounded-full border-2 border-black shadow-hard-black flex items-center gap-1.5 transition-all active-collapse cursor-pointer';
        btn.title = 'Click to hide English translations';
        if (iconSpan) iconSpan.textContent = 'visibility_off';
        if (textSpan) textSpan.textContent = 'Hide English';
      } else {
        btn.className = 'min-h-[38px] px-3 py-1 bg-white hover:bg-[#7EF1BE] text-[#064E3B] font-mono text-xs font-black uppercase rounded-full border-2 border-black shadow-hard-black flex items-center gap-1.5 transition-all active-collapse cursor-pointer';
        btn.title = 'Click to reveal English translations';
        if (iconSpan) iconSpan.textContent = 'visibility';
        if (textSpan) textSpan.textContent = 'Reveal English';
      }

      // Subtle pop animation at the exact moment of unlocking
      if (isUnlocked && !this.hasPoppedUnlock && !isShowing) {
        this.hasPoppedUnlock = true;
        if (!prefersReducedMotion()) {
          animateSpringPop(btn);
        }
      }
    }
  }

  toggleEnglishReveal() {
    const isUnlocked = (this.audioPlayCount || 0) >= 3 || this.isPinyinSolved || this.currentStage === 'complete';
    if (!isUnlocked) return;

    this.isEnglishRevealed = !this.isEnglishRevealed;
    this.updateRevealEnglishBtn();
    this.renderDialogueText({
      revealTarget: this.currentStage === 'complete',
      revealTranslations: this.isEnglishRevealed || this.currentStage === 'complete',
      activeTurnIndex: this.activeTurnHighlightIndex
    });
  }

  // =========================================================================
  // AUDIO PIPELINE: TIME-SYNCHRONIZED TURN GLOW & MOBILE-SAFE PLAYBACK
  // =========================================================================

  playDialogueAudio({ isAutoplay = false } = {}) {
    if (!this.currentDialogue) return;

    if (!isAutoplay) {
      // Track user play / replay count (with 600ms debounce to prevent rapid spam clicks)
      const now = Date.now();
      if (!this.lastPlayTimestamp || now - this.lastPlayTimestamp > 600) {
        this.lastPlayTimestamp = now;
        this.audioPlayCount = (this.audioPlayCount || 0) + 1;
        this.updateRevealEnglishBtn();
      }
    }

    const playBtn = document.getElementById('context-play-audio-btn');

    // UI pulse
    if (playBtn) {
      playBtn.classList.add('scale-95', 'bg-[#7EF1BE]', 'text-[#064E3B]');
      setTimeout(() => {
        playBtn.classList.remove('scale-95');
      }, 200);
    }

    const audioPath = this.currentDialogue.audio_file;
    if (!audioPath) return;

    // Mobile Audio Session Category 'playback'
    if (typeof navigator !== 'undefined' && navigator.audioSession) {
      try {
        navigator.audioSession.type = 'playback';
      } catch (_) {}
    }

    if (typeof window !== 'undefined' && typeof window.stopGlobalAudio === 'function') {
      try { window.stopGlobalAudio(); } catch (_) {}
    }

    this.stopAudio();

    try {
      const fullUrl = `${import.meta.env.BASE_URL}${audioPath}`;
      this.audioInstance = new Audio(fullUrl);
      this.isAudioPlaying = true;

      const turns = this.currentDialogue.turns || [];

      // High-precision turn highlight synchronization loop
      const updateTurnHighlight = () => {
        if (!this.audioInstance || this.audioInstance.paused) {
          this.activeTurnHighlightIndex = null;
          this.renderDialogueText({
            revealTarget: this.currentStage === 'complete',
            revealTranslations: this.isEnglishRevealed || this.currentStage === 'complete',
            activeTurnIndex: null
          });
          return;
        }

        const currentMs = Math.round(this.audioInstance.currentTime * 1000);
        let activeIdx = null;

        for (let i = 0; i < turns.length; i++) {
          const t = turns[i];
          if (currentMs >= (t.audio_start_ms || 0) && currentMs <= (t.audio_end_ms || 999999)) {
            activeIdx = i;
            break;
          }
        }

        if (activeIdx !== this.activeTurnHighlightIndex) {
          this.activeTurnHighlightIndex = activeIdx;
          this.renderDialogueText({
            revealTarget: this.currentStage === 'complete',
            revealTranslations: this.isEnglishRevealed || this.currentStage === 'complete',
            activeTurnIndex: activeIdx
          });
        }

        this.audioRafId = requestAnimationFrame(updateTurnHighlight);
      };

      this.audioInstance.onplay = () => {
        this.isAudioPlaying = true;
        this.audioRafId = requestAnimationFrame(updateTurnHighlight);
      };

      this.audioInstance.onended = () => {
        this.isAudioPlaying = false;
        this.activeTurnHighlightIndex = null;
        if (this.audioRafId) cancelAnimationFrame(this.audioRafId);
        this.renderDialogueText({
          revealTarget: this.currentStage === 'complete',
          revealTranslations: this.isEnglishRevealed || this.currentStage === 'complete',
          activeTurnIndex: null
        });
      };

      this.audioInstance.onerror = () => {
        this.isAudioPlaying = false;
        if (this.audioRafId) cancelAnimationFrame(this.audioRafId);
      };

      this.audioInstance.play().catch(e => {
        console.warn('ContextLab: Playback note:', e);
      });
    } catch (err) {
      console.warn('ContextLab: Audio setup exception:', err);
    }
  }

  stopAudio() {
    this.isAudioPlaying = false;
    this.activeTurnHighlightIndex = null;
    if (this.audioRafId) {
      cancelAnimationFrame(this.audioRafId);
      this.audioRafId = null;
    }
    if (this.audioInstance) {
      try {
        this.audioInstance.pause();
        this.audioInstance.currentTime = 0;
      } catch (_) {}
      this.audioInstance = null;
    }
    this.renderDialogueText({
      revealTarget: this.currentStage === 'complete',
      revealTranslations: this.isEnglishRevealed || this.currentStage === 'complete',
      activeTurnIndex: null
    });
  }

  // =========================================================================
  // KEYBOARD SHORTCUTS (1-4, Enter, Space)
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
    const revealEnglishBtn = document.getElementById('context-reveal-english-btn');
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

    if (revealEnglishBtn) {
      revealEnglishBtn.addEventListener('click', () => {
        this.toggleEnglishReveal();
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
