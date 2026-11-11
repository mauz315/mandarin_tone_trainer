/**
 * wordTrainerEngine.js
 * Core Engine & State Machine for the Mandarin Word Trainer Module.
 * Features:
 * - Cumulative 5-Phase Architecture (55, 80, 115, 120, 127 words = 497 total)
 * - 5-Word Micro-Batch Queue (Pass 1 Guided Imprint -> Pass 2 Retrieval Test)
 * - True Character Stroke Recognition & Grading (via HanziWriter Quiz + Native Stroke Geometry)
 * - 3-Attempt Shield with Shake, Audio Replay, and Graceful Answer Reveal
 * - Multi-Character Swipe/Arrow Carousel with Preserved Canvas State per Character
 * - Dynamic Multi-Tone Slot Selector with Auto-Advance
 * - LocalStorage Persistence under 'mandarin_trainer_word_progress'
 * - High-Fidelity TTS Audio Database Integration
 */

import { StrokeMatcher, getHanziPositioner, classifyDrawing, gradeCalligraphyDrawing } from './strokeMatcher.js';
import { ComponentPlacementController, gradeComponentBuilder, resolveWordDecompositions } from './componentBuilderEngine.js';

const STORAGE_KEY_CALLIGRAPHY = 'mandarin_trainer_word_progress_calligraphy';
const STORAGE_KEY_BUILDER = 'mandarin_trainer_word_progress_builder';
const STORAGE_KEY_LEGACY = 'mandarin_trainer_word_progress';

const GUIDE_KEY_CALLIGRAPHY = 'mandarin_trainer_guide_calligraphy';
const GUIDE_KEY_BUILDER = 'mandarin_trainer_guide_builder';
const GUIDE_KEY_LEGACY = 'mandarin_trainer_guide_mode';

const PHASE_META_MAP = {
  1: { title: 'Phase 1: Roots', mobileTitle: 'Roots', short: 'Roots', count: 55 },
  2: { title: 'Phase 2: Compounds', mobileTitle: 'Compounds', short: 'Compounds', count: 80 },
  3: { title: 'Phase 3: Word Pairs', mobileTitle: 'Word Pairs', short: 'Word Pairs', count: 115 },
  4: { title: 'Phase 4: Topics', mobileTitle: 'Topics', short: 'Topics', count: 120 },
  5: { title: 'Phase 5: Phrases', mobileTitle: 'Phrases', short: 'Phrases', count: 127 },
};

export const CONCISE_ENGLISH_OVERRIDES = {
  '了': 'completed action (particle)',
  '个': 'general classifier',
  '的': 'possessive / modifier',
  '吗': 'yes/no question particle',
  '吧': 'suggestion particle',
  '呢': 'follow-up question',
  '地': 'adverbial marker (de)',
  '得': 'degree/result particle',
  '第': 'ordinal prefix (1st, 2nd…)',
  '些': 'some; a few',
  '和': 'and',
  '最': 'most; highest degree',
  '过': 'past experience (particle)',
  '他': 'he; him',
  '她': 'she; her',
  '它': 'it',
  '他们': 'they; them (people)',
  '她们': 'they; them (females)',
  '它们': 'they; them (things)',
  '你': 'you (informal)',
  '您': 'you (courteous)',
  '超市': 'supermarket',
  '面': 'side; surface; noodles'
};

const KEEP_CONCISE_PARENS = new Set(['(plural)', '(side)', '(s)']);

export function getConciseEnglish(word) {
  if (!word) return '';
  if (typeof word.english_concise === 'string' && word.english_concise.trim()) {
    return word.english_concise.trim();
  }
  const hanzi = word.hanzi_simp || '';
  if (hanzi && Object.prototype.hasOwnProperty.call(CONCISE_ENGLISH_OVERRIDES, hanzi)) {
    return CONCISE_ENGLISH_OVERRIDES[hanzi];
  }
  const raw = String(word.english || '').trim();
  if (!raw) return '';

  // Strip [pinyin] tags
  let cleaned = raw.replace(/\[[^\]]*\]/g, '');
  // Iteratively strip parenthetical notes except compact semantic disambiguators
  let prev;
  do {
    prev = cleaned;
    cleaned = cleaned.replace(/\([^()]*\)/g, (m) => (
      KEEP_CONCISE_PARENS.has(m.toLowerCase()) ? m : ''
    ));
  } while (cleaned !== prev);

  // Strip embedded CJK substrings and collapse whitespace
  cleaned = cleaned.replace(/[\u4e00-\u9fff]+/g, '').replace(/\s+/g, ' ');

  const trimClauseEdges = (str) => str
    .replace(/\s*\.{2,}$/, '')
    .replace(/^[\s;:,-]+|[\s;:,-]+$/g, '');

  const clauses = cleaned
    .split(';')
    .map(trimClauseEdges)
    .filter(Boolean);

  if (clauses.length === 0) {
    return raw.replace(/[\u4e00-\u9fff]+/g, '').replace(/^[\s;:,\-()[\]]+|[\s;:,\-()[\]]+$/g, '').slice(0, 26).trim();
  }

  let out = clauses[0];
  for (let i = 1; i < clauses.length; i++) {
    const candidate = `${out}; ${clauses[i]}`;
    if (candidate.length <= 26) {
      out = candidate;
    } else {
      break;
    }
  }

  if (out.length > 26) {
    const commaParts = out.split(',').map((p) => p.trim()).filter(Boolean);
    if (commaParts.length > 1 && commaParts[0].length <= 26) {
      let cur = commaParts[0];
      for (let i = 1; i < commaParts.length; i++) {
        const cand = `${cur}, ${commaParts[i]}`;
        if (cand.length <= 26) {
          cur = cand;
        } else {
          break;
        }
      }
      out = cur;
    } else {
      const slice = out.slice(0, 25);
      const lastSpace = slice.lastIndexOf(' ');
      const cut = (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).replace(/[,;:]+$/, '');
      out = `${cut || slice}…`;
    }
  }

  return out;
}

export function getModeMasteryCounts() {
  const countFromKey = (primaryKey, fallbackKey = null) => {
    try {
      if (typeof localStorage === 'undefined') return 0;
      let raw = localStorage.getItem(primaryKey);
      if (!raw && fallbackKey) raw = localStorage.getItem(fallbackKey);
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.phases) return 0;
      const seen = new Set();
      Object.values(parsed.phases).forEach(phaseObj => {
        if (phaseObj && Array.isArray(phaseObj.completedWordIds)) {
          phaseObj.completedWordIds.forEach(id => seen.add(id));
        }
      });
      return seen.size;
    } catch (_) {
      return 0;
    }
  };
  const totalWords = (typeof window !== 'undefined' && window.WordTrainerEngine && Array.isArray(window.WordTrainerEngine.corpus) && window.WordTrainerEngine.corpus.length > 0)
    ? window.WordTrainerEngine.corpus.length
    : 497;
  return {
    builder: { mastered: countFromKey(STORAGE_KEY_BUILDER), total: totalWords },
    calligraphy: { mastered: countFromKey(STORAGE_KEY_CALLIGRAPHY, STORAGE_KEY_LEGACY), total: totalWords }
  };
}

export class WordTrainerEngineController {
  constructor() {
    this.corpus = [];
    this.decompositions = {};
    this.componentBuilder = null;
    this.phaseWordsMap = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    this.audioCache = new Map();

    // Mode-specific persistent state
    this.state = this.loadState();
    this.isInitialized = false;
    this.initPromise = null;
    this.currentAudio = null;

    // Anchor-Spaced Consolidation Queue (Option C)
    this.activePhase = this.state.activePhase || 1;
    this.anchorWord = null;              // Remembered initial random word
    this.wordsSinceAnchor = 0;           // Number of completed words since anchor introduction
    this.isReappearanceStage = false;    // True when anchor reappears for delayed recall (Guide OFF)
    this.cycleWords = [];                // All words in current consolidation cycle
    this.cycleIndex = 0;                 // Current index within cycleWords
    this.reappearanceRetryQueue = [];    // Retry queue if learner fails delayed recall
    this.hasRetriedAnchor = false;

    // Active word & multi-character state
    this.activeWord = null;
    this.activeCharIndex = 0;
    this.charDrawings = []; // Stored ImageData for each character slot
    this.charStrokes = []; // Stroke counts for each character slot
    this.charLengths = []; // Drawn lengths for each character slot
    this.charRecognized = []; // True character recognition flags per character
    this.charSpatialDrift = []; // Spatial translation drift per character slot
    this.attemptsLeft = 3;
    this.isScaffoldOn = this.readSavedGuidePreference(this.getMode(), true);
    this.effectiveGuideOn = this.isScaffoldOn;
    this.usedGuideInAttempt = Boolean(this.effectiveGuideOn);

    // Order-Agnostic Geometric Stroke Matchers & Handwriting Persistence
    this.charMatchers = [];
    this.charDataCache = new Map();
    this.userDrawnStrokes = []; // User's natural strokes for current character
    this.charUserStrokes = []; // Handwriting strokes per character slot
    this.flashingStrokeIndex = null;
    this.isDrawingEventsBound = false;
    this.isControlsBound = false;
    this.isCarouselEventsBound = false;

    // Active HanziWriter instance for stroke-by-stroke grading
    this.activeWriter = null;
    this.resultShowcaseWriters = [];
    this._showcaseToken = 0;
    this._wordSessionToken = 0;
    this._completedModalPhase = null;
    this._lastWriterSize = 0;
    this._lastCanvasCssSize = 0;
    this._canvasResizeObserver = null;
    this._resizeRafId = null;

    // DOM references cached on init
    this.dom = {};
  }

  // ----------------------------------------------------
  // 1. STATE PERSISTENCE & INDEPENDENT MODE STORAGE
  // ----------------------------------------------------
  getStorageKey() {
    const mode = this.getMode();
    return (mode === 'builder') ? STORAGE_KEY_BUILDER : STORAGE_KEY_CALLIGRAPHY;
  }

  getGuideStorageKey(mode = this.getMode()) {
    return (mode === 'builder') ? GUIDE_KEY_BUILDER : GUIDE_KEY_CALLIGRAPHY;
  }

  readSavedGuidePreference(mode = this.getMode(), fallbackDefault = true) {
    try {
      if (typeof localStorage === 'undefined') {
        return (this.state && this.state.scaffoldDefault !== undefined) ? Boolean(this.state.scaffoldDefault) : fallbackDefault;
      }
      const modeKey = this.getGuideStorageKey(mode);
      let saved = localStorage.getItem(modeKey);
      if (saved === null) {
        const legacy = localStorage.getItem(GUIDE_KEY_LEGACY);
        if (legacy === 'on' || legacy === 'off') {
          saved = legacy;
          localStorage.setItem(modeKey, legacy);
        }
      }
      if (saved === 'on') return true;
      if (saved === 'off') return false;
      if (this.state && this.state.scaffoldDefault !== undefined) {
        return Boolean(this.state.scaffoldDefault);
      }
    } catch (_) {}
    return fallbackDefault;
  }

  getDefaultState() {
    return {
      version: 2,
      activePhase: 1,
      scaffoldDefault: true,
      phases: {
        1: { status: 'in_progress', completedWordIds: [] },
        2: { status: 'not_started', completedWordIds: [] },
        3: { status: 'not_started', completedWordIds: [] },
        4: { status: 'not_started', completedWordIds: [] },
        5: { status: 'not_started', completedWordIds: [] }
      }
    };
  }

  loadState() {
    try {
      const key = this.getStorageKey();
      let raw = localStorage.getItem(key);
      // Migration: if calligraphy state is uninitialized, inherit from legacy key if present
      if (!raw && this.getMode() !== 'builder') {
        const legacy = localStorage.getItem(STORAGE_KEY_LEGACY);
        if (legacy) {
          raw = legacy;
          localStorage.setItem(key, legacy);
        }
      }
      if (!raw) return this.getDefaultState();
      const parsed = JSON.parse(raw);
      if (parsed && parsed.phases) {
        return parsed;
      }
    } catch (e) {
      console.warn('WordTrainerEngine: Failed to load state from localStorage', e);
    }
    return this.getDefaultState();
  }

  saveState() {
    try {
      this.state.activePhase = this.activePhase;
      this.state.scaffoldDefault = this.isScaffoldOn;
      const key = this.getStorageKey();
      localStorage.setItem(key, JSON.stringify(this.state));
      localStorage.setItem(this.getGuideStorageKey(), this.isScaffoldOn ? 'on' : 'off');
    } catch (e) {
      console.warn('WordTrainerEngine: Failed to save state to localStorage', e);
    }
  }

  resetAllProgress() {
    this.hidePhaseCompleteModal();
    this._completedModalPhase = null;
    this.state = this.getDefaultState();
    this.saveState();
    this.switchPhase(1);
  }

  getMode() {
    try {
      return localStorage.getItem('mandarin_trainer_selected_mode') || 'calligraphy';
    } catch (_) {
      return 'calligraphy';
    }
  }

  switchMode(mode) {
    try {
      this.saveState();
      localStorage.setItem('mandarin_trainer_selected_mode', mode);
      if (!this.isInitialized) {
        // Mode registered; init() will load batch once data is fully ready
        return;
      }
      // Load independent progress & guide preferences for the newly selected mode
      this.closeMobilePhaseBar();
      this.hidePhaseCompleteModal();
      this._completedModalPhase = null;
      this.clearResultShowcase();
      if (this.dom.screen) {
        this.dom.screen.classList.remove('mobile-result-active', 'mobile-result-peek');
      }
      this.state = this.loadState();
      this.activePhase = this.state.activePhase || 1;
      this.isScaffoldOn = this.readSavedGuidePreference(mode, true);
      this.setGuideMode(this.isScaffoldOn);
      this.updatePhaseStepperUI();
      this.updateProgressBar();
      this.loadBatchForActivePhase();
      if (mode === 'calligraphy') {
        this.syncCanvasDimensions();
      }
    } catch (e) {
      console.warn('WordTrainerEngine: switchMode error', e);
    }
  }

  getIntervalForPhase(phaseNum) {
    // Option C: Adaptive 5 words for Phase 1 & 2; 10 words for Phases 3, 4, 5
    return (phaseNum <= 2) ? 5 : 10;
  }

  setGuideMode(isOn, persistState = true) {
    const effectiveOn = Boolean(isOn);
    this.effectiveGuideOn = effectiveOn;
    if (effectiveOn) {
      // One-way per-attempt latch: seeing the guide disqualifies this attempt from cementing progress
      this.usedGuideInAttempt = true;
    }
    if (persistState) {
      this.isScaffoldOn = effectiveOn;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(this.getGuideStorageKey(), effectiveOn ? 'on' : 'off');
        }
      } catch (_) {}
    }
    this.updateScaffoldBtnUI();
    if (this.dom.hanziTargetCanvas) {
      this.dom.hanziTargetCanvas.style.opacity = effectiveOn ? '1' : '0';
      this.dom.hanziTargetCanvas.style.visibility = effectiveOn ? 'visible' : 'hidden';
    }
    if (this.activeWriter) {
      if (effectiveOn) {
        try { this.activeWriter.showOutline(); } catch (_) {}
      } else {
        try { this.activeWriter.hideOutline(); } catch (_) {}
      }
    }
    if (this.componentBuilder) {
      this.componentBuilder.toggleGhostHint(effectiveOn);
    }
    this.updatePromptDisplay(effectiveOn);
    this.renderCanvasLayers();
  }

  // ----------------------------------------------------
  // 2. INITIALIZATION & DATA LOADING
  // ----------------------------------------------------
  async init() {
    if (this.isInitialized) {
      this.syncCanvasDimensions();
      return;
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      this.cacheDomElements();
      this.setupCarouselEvents();
      this.setupCanvasDrawingEvents();
      this.setupControlsEvents();
      await Promise.all([this.loadCorpus(), this.loadDecompositions()]);
      if (!this.componentBuilder) {
        this.componentBuilder = new ComponentPlacementController(this.decompositions);
      } else {
        this.componentBuilder.setDecompositions(this.decompositions);
      }
      this.componentBuilder.onHintToggle = (isActive) => {
        this.toggleScaffolding(isActive);
      };
      this.componentBuilder.onReset = () => {
        this.updateFeedback('neutral', 'Pieces cleared. Place pieces on the grid.');
        this.updateSubmitIdleState();
      };
      this.componentBuilder.onUndo = (didUndo) => {
        this.updateFeedback('neutral', didUndo ? 'Removed last piece.' : 'Nothing to undo.');
        this.updateSubmitIdleState();
      };
      this.componentBuilder.onPlacedChange = () => {
        this.updateSubmitIdleState();
      };
      this.componentBuilder.initDom();
      this.isInitialized = true;
      this.switchMode(this.getMode());
    })();

    return this.initPromise;
  }

  async loadDecompositions() {
    const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL)
      ? import.meta.env.BASE_URL
      : './';
    const cleanBase = base.endsWith('/') ? base : base + '/';

    const urls = [
      `${cleanBase}character_decompositions.json`,
      './character_decompositions.json',
      '/character_decompositions.json',
      'character_decompositions.json'
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          this.decompositions = await res.json();
          break;
        }
      } catch (_) {}
    }

    if (!this.decompositions || typeof this.decompositions !== 'object') {
      this.decompositions = {};
    }
  }

  cacheDomElements() {
    this.dom = {
      screen: document.getElementById('word-trainer-screen'),
      phaseDockWrapper: document.getElementById('phase-dock-wrapper'),
      phaseStepper: document.getElementById('phase-stepper'),
      mobilePhaseScrim: document.getElementById('mobile-phase-scrim'),
      mobilePhaseTrigger: document.getElementById('mobile-phase-trigger'),
      mobilePhaseTriggerSub: document.getElementById('mobile-phase-trigger-sub'),
      mobilePhaseTriggerName: document.getElementById('mobile-phase-trigger-name'),
      mobilePhaseChevron: document.getElementById('mobile-phase-chevron'),
      mobilePhaseTitle: document.getElementById('mobile-phase-title'),
      mobileProgressLabel: document.getElementById('mobile-progress-label'),
      mobileProgressFill: document.getElementById('mobile-progress-fill'),
      phaseBtns: document.querySelectorAll('.phase-btn'),
      phaseTitle: document.getElementById('phase-title'),
      overallProgressLabel: document.getElementById('overall-progress-label'),
      overallProgressBar: document.getElementById('overall-progress-bar'),
      progressBarFill: document.getElementById('progress-bar-fill'),
      promptArena: document.getElementById('prompt-arena'),
      audioReplayBtn: document.getElementById('audio-replay-btn'),
      promptLexicalBox: document.getElementById('prompt-lexical-box'),
      promptPinyin: document.getElementById('prompt-pinyin-line'),
      promptMeaning: document.getElementById('prompt-meaning-line'),
      drawingCanvasWrapper: document.getElementById('drawing-canvas-wrapper'),
      canvasCharCarousel: document.getElementById('canvas-char-carousel'),
      hanziTargetCanvas: document.getElementById('hanzi-target-canvas'),
      paintCanvas: document.getElementById('hanzi-paint-canvas'),
      scaffoldToggleBtn: document.getElementById('scaffold-toggle-btn'),
      undoStrokeBtn: document.getElementById('undo-stroke-btn'),
      clearCanvasBtn: document.getElementById('clear-canvas-btn'),
      demoOrderBtn: document.getElementById('canvas-demo-order-btn'),
      interactionFooter: document.getElementById('interaction-footer'),
      attemptPips: document.getElementById('attempt-pips'),
      submitBtn: document.getElementById('submit-word-btn'),
      feedbackToast: document.getElementById('drawing-feedback-toast'),
      toastFeedbackIcon: document.getElementById('toast-feedback-icon'),
      toastFeedbackText: document.getElementById('toast-feedback-text'),
      resultFeedbackPanel: document.getElementById('result-feedback-panel'),
      resultShowcaseGrid: document.getElementById('result-showcase-grid'),
      resultHanzi: document.getElementById('result-hanzi'),
      resultPinyin: document.getElementById('result-pinyin'),
      resultMeaning: document.getElementById('result-meaning'),
      resultMoreNotesBtn: document.getElementById('result-more-notes-btn'),
      resultFullNotes: document.getElementById('result-full-notes'),
      resultDecomposition: document.getElementById('result-decomposition'),
      resultAudioReplayBtn: document.getElementById('result-audio-replay-btn'),
      resultPeekCanvasBtn: document.getElementById('result-peek-canvas-btn'),
      resultBackFromPeekBtn: document.getElementById('result-back-from-peek-btn'),
      feedbackDrawingCard: document.getElementById('feedback-drawing-card'),
      resultFeedbackIcon: document.getElementById('result-feedback-icon'),
      drawingTierBadge: document.getElementById('drawing-tier-badge'),
      resultFeedbackText: document.getElementById('result-feedback-text'),
      resultTryAgainBtn: document.getElementById('result-try-again-btn'),
      resultNextBtn: document.getElementById('result-next-btn'),
      resultNextBtnText: document.getElementById('result-next-btn-text'),
      batchProgressContainer: document.getElementById('batch-progress-container'),
      openStrokeGuideBtn: document.getElementById('open-stroke-guide-btn'),
      strokeGuideTriggers: document.querySelectorAll('.open-stroke-guide-trigger'),
      strokeGuideModal: document.getElementById('stroke-guide-modal'),
      closeStrokeGuideBtn: document.getElementById('close-stroke-guide-btn'),
      guideModalCloseBtn: document.getElementById('guide-modal-close-btn'),
      guideModalBadgeChar: document.getElementById('guide-modal-badge-char'),
      guideModalTitle: document.getElementById('guide-modal-title'),
      guideModalSubtitle: document.getElementById('guide-modal-subtitle'),
      guideCalligraphyContent: document.getElementById('guide-calligraphy-content'),
      guideBuilderContent: document.getElementById('guide-builder-content'),
      prevCharBtn: document.getElementById('canvas-prev-char-btn'),
      nextCharBtn: document.getElementById('canvas-next-char-btn'),
      charPills: document.getElementById('canvas-char-pills'),
      phaseCompleteModal: document.getElementById('phase-complete-modal'),
      phaseCompleteTitle: document.getElementById('phase-complete-title'),
      phaseCompleteSummary: document.getElementById('phase-complete-summary'),
      advancePhaseBtn: document.getElementById('advance-phase-btn'),
      stayPhaseBtn: document.getElementById('stay-phase-btn')
    };
  }

  async loadCorpus() {
    const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL)
      ? import.meta.env.BASE_URL
      : './';
    const cleanBase = base.endsWith('/') ? base : base + '/';

    const urls = [
      `${cleanBase}word_trainer_corpus.json`,
      './word_trainer_corpus.json',
      '/word_trainer_corpus.json',
      'word_trainer_corpus.json'
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          this.corpus = await res.json();
          break;
        }
      } catch (_) {}
    }

    if (!this.corpus || this.corpus.length === 0) {
      console.warn('WordTrainerEngine: Could not fetch word_trainer_corpus.json, falling back to minimal mock.');
      this.corpus = [];
    }

    // Partition into phases and apply randomized order per phase
    this.phaseWordsMap = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    const rawPhaseMap = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    for (const item of this.corpus) {
      const p = item.phase || 1;
      if (rawPhaseMap[p]) {
        rawPhaseMap[p].push(item);
      }
    }

    for (const p in rawPhaseMap) {
      const phaseNum = parseInt(p, 10);
      const rawWords = rawPhaseMap[phaseNum];
      this.phaseWordsMap[phaseNum] = rawWords;
      if (!this.state.phases[phaseNum]) {
        this.state.phases[phaseNum] = { status: (phaseNum === 1 ? 'in_progress' : 'not_started'), completedWordIds: [] };
      }
    }
    this.saveState();
  }

  setupCarouselEvents() {
    if (this.isCarouselEventsBound) return;
    this.isCarouselEventsBound = true;

    if (this.dom.prevCharBtn) {
      this.dom.prevCharBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.prevChar();
      });
    }

    if (this.dom.nextCharBtn) {
      this.dom.nextCharBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.nextChar();
      });
    }

    const wrapper = this.dom.drawingCanvasWrapper;
    if (wrapper) {
      // Touch swipe detection for mobile character carousel
      let touchStartX = 0;
      let touchStartY = 0;
      let touchStartTime = 0;

      wrapper.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          touchStartTime = Date.now();
        }
      }, { passive: true });

      wrapper.addEventListener('touchend', (e) => {
        if (!e.changedTouches || e.changedTouches.length === 0) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        const dt = Date.now() - touchStartTime;

        // Quick horizontal swipe with minimal vertical movement
        if (dt < 350 && Math.abs(dx) > 70 && Math.abs(dy) < 40) {
          if (dx < -70) {
            this.nextChar();
          } else if (dx > 70) {
            this.prevChar();
          }
        }
      }, { passive: true });
    }
  }

  getCanvasSize() {
    const wrapper = this.dom.drawingCanvasWrapper;
    if (!wrapper) return 320;
    const rect = wrapper.getBoundingClientRect();
    return Math.round(rect.width) || 320;
  }

  setupControlsEvents() {
    if (this.isControlsBound) return;
    this.isControlsBound = true;

    if (this.dom.undoStrokeBtn) {
      this.dom.undoStrokeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.undoLastStroke();
      });
    }

    if (this.dom.clearCanvasBtn) {
      this.dom.clearCanvasBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clearCanvas();
      });
    }

    if (this.dom.demoOrderBtn) {
      this.dom.demoOrderBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.demoStrokeOrder();
      });
    }

    if (this.dom.scaffoldToggleBtn) {
      this.dom.scaffoldToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleScaffolding();
      });
    }

    if (this.dom.submitBtn) {
      this.dom.submitBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.validateSubmission();
      });
    }



    if (this.dom.mobilePhaseTrigger) {
      this.dom.mobilePhaseTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMobilePhaseBar();
      });
    }

    if (this.dom.mobilePhaseScrim) {
      this.dom.mobilePhaseScrim.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeMobilePhaseBar();
      });
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeMobilePhaseBar();
          if (this.dom.strokeGuideModal && !this.dom.strokeGuideModal.classList.contains('hidden')) {
            this.closeStrokeGuideModal();
          }
          if (this.dom.phaseCompleteModal && !this.dom.phaseCompleteModal.classList.contains('hidden')) {
            this.stayInCompletedPhase();
          }
          this.setMobileResultPeek(false);
        }
      });
      document.addEventListener('click', (e) => {
        const screen = this.dom && this.dom.screen;
        if (!screen || !screen.classList || !screen.classList.contains('mobile-phase-open')) return;
        const target = e.target;
        const clickedTrigger = this.dom.mobilePhaseTrigger && typeof this.dom.mobilePhaseTrigger.contains === 'function'
          ? this.dom.mobilePhaseTrigger.contains(target)
          : false;
        const clickedStepper = this.dom.phaseStepper && typeof this.dom.phaseStepper.contains === 'function'
          ? this.dom.phaseStepper.contains(target)
          : false;
        if (!clickedTrigger && !clickedStepper) {
          this.closeMobilePhaseBar();
        }
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
          this.closeMobilePhaseBar();
        }
      });
    }

    if (this.dom.phaseBtns) {
      this.dom.phaseBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const p = parseInt(btn.getAttribute('data-phase'), 10);
          this.closeMobilePhaseBar();
          this.switchPhase(p);
        });
      });
    }

    if (this.dom.audioReplayBtn) {
      this.dom.audioReplayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.playActiveWordAudio();
      });
    }

    if (this.dom.resultNextBtn) {
      this.dom.resultNextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.advanceToNextWord();
      });
    }

    if (this.dom.resultTryAgainBtn) {
      this.dom.resultTryAgainBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.retryCurrentWord();
      });
    }

    if (this.dom.resultAudioReplayBtn) {
      this.dom.resultAudioReplayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.playActiveWordAudio();
      });
    }

    if (this.dom.resultPeekCanvasBtn) {
      this.dom.resultPeekCanvasBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setMobileResultPeek(true);
      });
    }

    if (this.dom.resultBackFromPeekBtn) {
      this.dom.resultBackFromPeekBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setMobileResultPeek(false);
      });
    }

    if (this.dom.resultMoreNotesBtn) {
      this.dom.resultMoreNotesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!this.dom.resultFullNotes) return;
        const isCurrentlyHidden = this.dom.resultFullNotes.classList.contains('hidden');
        this.dom.resultFullNotes.classList.toggle('hidden', !isCurrentlyHidden);
        this.dom.resultMoreNotesBtn.textContent = isCurrentlyHidden ? 'Hide notes ⌄' : 'More notes ›';
        this.dom.resultMoreNotesBtn.setAttribute('aria-expanded', isCurrentlyHidden ? 'true' : 'false');
      });
    }

    const guideBtns = (this.dom.strokeGuideTriggers && this.dom.strokeGuideTriggers.length > 0)
      ? Array.from(this.dom.strokeGuideTriggers)
      : (this.dom.openStrokeGuideBtn ? [this.dom.openStrokeGuideBtn] : []);
    guideBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openStrokeGuideModal();
      });
    });

    if (this.dom.closeStrokeGuideBtn) {
      this.dom.closeStrokeGuideBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeStrokeGuideModal();
      });
    }

    if (this.dom.guideModalCloseBtn) {
      this.dom.guideModalCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeStrokeGuideModal();
      });
    }

    if (this.dom.strokeGuideModal) {
      this.dom.strokeGuideModal.addEventListener('click', (e) => {
        if (e.target === this.dom.strokeGuideModal) {
          this.closeStrokeGuideModal();
        }
      });
    }

    if (this.dom.advancePhaseBtn) {
      this.dom.advancePhaseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.advanceToNextPhase();
      });
    }

    if (this.dom.stayPhaseBtn) {
      this.dom.stayPhaseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.stayInCompletedPhase();
      });
    }
  }

  setMobileResultPeek(isPeek) {
    const screen = this.dom && this.dom.screen;
    if (!screen || !screen.classList) return;
    screen.classList.toggle('mobile-result-peek', Boolean(isPeek));
  }

  setMobilePhaseBarOpen(isOpen) {
    const screen = this.dom && this.dom.screen;
    const nextOpen = Boolean(isOpen);
    if (screen && screen.classList) {
      screen.classList.toggle('mobile-phase-open', nextOpen);
    }
    if (this.dom && this.dom.mobilePhaseTrigger && typeof this.dom.mobilePhaseTrigger.setAttribute === 'function') {
      this.dom.mobilePhaseTrigger.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
    }
  }

  toggleMobilePhaseBar(forcedState) {
    const screen = this.dom && this.dom.screen;
    const currentlyOpen = Boolean(screen && screen.classList && screen.classList.contains('mobile-phase-open'));
    const nextState = (forcedState !== undefined) ? Boolean(forcedState) : !currentlyOpen;
    this.setMobilePhaseBarOpen(nextState);
  }

  closeMobilePhaseBar() {
    this.setMobilePhaseBarOpen(false);
  }

  openStrokeGuideModal() {
    this.closeMobilePhaseBar();
    const isBuilder = this.getMode() === 'builder';
    if (this.dom.guideCalligraphyContent) {
      this.dom.guideCalligraphyContent.classList.toggle('hidden', isBuilder);
    }
    if (this.dom.guideBuilderContent) {
      this.dom.guideBuilderContent.classList.toggle('hidden', !isBuilder);
    }
    if (this.dom.guideModalBadgeChar) {
      this.dom.guideModalBadgeChar.textContent = isBuilder ? '构' : '永';
    }
    if (this.dom.guideModalTitle) {
      this.dom.guideModalTitle.textContent = isBuilder ? 'Character Structure Guide' : 'Chinese Stroke Guide';
    }
    if (this.dom.guideModalSubtitle) {
      this.dom.guideModalSubtitle.textContent = isBuilder
        ? 'Layouts • Radicals • Scaling Tips'
        : '8 Strokes • Compound Forms • 7 Rules';
    }
    if (this.dom.guideModalCloseBtn) {
      this.dom.guideModalCloseBtn.textContent = 'Close Guide';
    }
    if (this.dom.strokeGuideModal) {
      this.dom.strokeGuideModal.classList.remove('hidden');
    }
  }

  closeStrokeGuideModal() {
    if (this.dom.strokeGuideModal) {
      this.dom.strokeGuideModal.classList.add('hidden');
    }
  }

  async fetchCharacterData(char) {
    if (!char) return null;
    if (this.charDataCache.has(char)) {
      return this.charDataCache.get(char);
    }

    const enc = encodeURIComponent(char);
    const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL)
      ? import.meta.env.BASE_URL
      : './';
    const cleanBase = base.endsWith('/') ? base : base + '/';

    const urls = [
      `${cleanBase}hanzi_data/${enc}.json`,
      `${cleanBase}hanzi_data/${char}.json`,
      `./hanzi_data/${enc}.json`,
      `./hanzi_data/${char}.json`,
      `/hanzi_data/${enc}.json`,
      `/hanzi_data/${char}.json`,
      `hanzi_data/${enc}.json`,
      `hanzi_data/${char}.json`
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          this.charDataCache.set(char, data);
          return data;
        }
      } catch (_) {}
    }

    // Fallback to jsDelivr CDN
    for (const target of [enc, char]) {
      try {
        const cdnUrl = `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${target}.json`;
        const res = await fetch(cdnUrl);
        if (res.ok) {
          const data = await res.json();
          this.charDataCache.set(char, data);
          return data;
        }
      } catch (_) {}
    }

    return null;
  }

  getUserStrokeWidth() {
    const size = this.getCanvasSize();
    // Proportional thickness: ~12px on mobile (310px-340px) up to ~15-16px on desktop (410px-440px)
    return Math.max(12, Math.round(size * 0.035));
  }

  syncCanvasDimensions() {
    const canvas = this.dom.paintCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.round(rect.width);
    const cssH = Math.round(rect.height);

    // Rescale any live hand-drawn strokes proportionally if the responsive container changed size
    if (this._lastCanvasCssSize > 0 && Math.abs(cssW - this._lastCanvasCssSize) > 2) {
      const scale = cssW / this._lastCanvasCssSize;
      if (Array.isArray(this.charUserStrokes)) {
        this.charUserStrokes = this.charUserStrokes.map(charStrokes =>
          Array.isArray(charStrokes)
            ? charStrokes.map(stroke => stroke.map(([x, y]) => [x * scale, y * scale]))
            : charStrokes
        );
      }
      if (Array.isArray(this.userDrawnStrokes)) {
        this.userDrawnStrokes = this.userDrawnStrokes.map(stroke =>
          stroke.map(([x, y]) => [x * scale, y * scale])
        );
      }
    }
    this._lastCanvasCssSize = cssW;

    const targetW = Math.round(cssW * dpr);
    const targetH = Math.round(cssH * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    // Always restore the DPR scale transform so stroke coordinates match 1:1 with CSS logical pixels
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    this.redrawUserStrokes();
  }

  setupCanvasDrawingEvents() {
    if (this.isDrawingEventsBound) return;
    const canvas = this.dom.paintCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.isDrawingEventsBound = true;

    const handleCanvasResize = () => {
      if (this._resizeRafId) cancelAnimationFrame(this._resizeRafId);
      this._resizeRafId = requestAnimationFrame(() => {
        this._resizeRafId = null;
        const wrapper = this.dom.drawingCanvasWrapper;
        if (!wrapper) return;
        const rect = wrapper.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        this.syncCanvasDimensions();
        const newSize = Math.round(rect.width);
        if (Math.abs(newSize - (this._lastWriterSize || 0)) > 2) {
          this._lastWriterSize = newSize;
          this.renderCanvasLayers();
          if (this.activeWord && this.getMode() !== 'builder') {
            const chars = this.activeWord.characters || Array.from(this.activeWord.hanzi_simp || '');
            const targetChar = chars[this.activeCharIndex];
            if (targetChar) {
              this.mountHanziWriterQuiz(targetChar, this.activeCharIndex);
            }
          }
        }
      });
    };

    this.syncCanvasDimensions();
    const initialWrapperRect = this.dom.drawingCanvasWrapper ? this.dom.drawingCanvasWrapper.getBoundingClientRect() : null;
    this._lastWriterSize = (initialWrapperRect && initialWrapperRect.width > 0) ? Math.round(initialWrapperRect.width) : 0;

    window.addEventListener('resize', handleCanvasResize);
    if (typeof ResizeObserver !== 'undefined' && this.dom.drawingCanvasWrapper && !this._canvasResizeObserver) {
      this._canvasResizeObserver = new ResizeObserver(handleCanvasResize);
      this._canvasResizeObserver.observe(this.dom.drawingCanvasWrapper);
    }

    const getCoords = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      const rawX = clientX - rect.left;
      const rawY = clientY - rect.top;
      const dpr = window.devicePixelRatio || 1;
      const scaleX = rect.width > 0 ? (canvas.width / dpr) / rect.width : 1;
      const scaleY = rect.height > 0 ? (canvas.height / dpr) / rect.height : 1;
      return [rawX * scaleX, rawY * scaleY];
    };

    let isDrawing = false;
    let strokePts = [];

    const startDraw = (e) => {
      if (e.target !== canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
        this.syncCanvasDimensions();
      }
      isDrawing = true;
      const pt = getCoords(e);
      strokePts = [pt];

      if (this.flashingStrokeIndex !== null) {
        this.flashingStrokeIndex = null;
        this.renderCanvasLayers();
      }

      const strokeWidth = this.getUserStrokeWidth();
      ctx.beginPath();
      ctx.fillStyle = '#1E1B2E';
      ctx.arc(pt[0], pt[1], strokeWidth / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(pt[0], pt[1]);
      ctx.strokeStyle = '#1E1B2E';
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    const moveDraw = (e) => {
      if (!isDrawing) return;
      const pt = getCoords(e);
      strokePts.push(pt);
      ctx.lineTo(pt[0], pt[1]);
      ctx.stroke();
    };

    const endDraw = () => {
      if (!isDrawing) return;
      isDrawing = false;
      ctx.closePath();

      if (strokePts.length < 2) return;

      // Keep user's hand-drawn stroke on the canvas naturally!
      this.userDrawnStrokes.push([...strokePts]);
      if (this.charUserStrokes && this.charUserStrokes[this.activeCharIndex]) {
        this.charUserStrokes[this.activeCharIndex] = [...this.userDrawnStrokes];
      }

      // No intrusive error or premature feedback while drawing.
      // Full evaluation with spatial normalization is performed upon submission.
      this.updateCharCarouselDots();
      this.updateFeedback('neutral', 'Trace or draw the character.');
      this.updateSubmitIdleState();
    };

    // Modern Pointer Events handle mouse, trackpad, pen, and touch with sub-pixel pointer capture
    canvas.addEventListener('pointerdown', (e) => {
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      startDraw(e);
    });
    canvas.addEventListener('pointermove', moveDraw);
    canvas.addEventListener('pointerup', (e) => {
      endDraw();
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    });
    canvas.addEventListener('pointercancel', (e) => {
      endDraw();
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    });

    // Fallback only if PointerEvent is unsupported to avoid double-firing startDraw
    if (typeof window !== 'undefined' && !window.PointerEvent) {
      canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          e.preventDefault();
          startDraw(e);
        }
      }, { passive: false });
      canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
          e.preventDefault();
          moveDraw(e);
        }
      }, { passive: false });
      canvas.addEventListener('touchend', () => {
        endDraw();
      });
    }
  }

  redrawUserStrokes() {
    const canvas = this.dom.paintCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Buffer-safe physical canvas clear
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    if (this.charRecognized[this.activeCharIndex]) return;

    const strokeWidth = this.getUserStrokeWidth();
    ctx.strokeStyle = '#1E1B2E';
    ctx.fillStyle = '#1E1B2E';
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of this.userDrawnStrokes) {
      if (!stroke || stroke.length === 0) continue;
      if (stroke.length === 1) {
        ctx.beginPath();
        ctx.arc(stroke[0][0], stroke[0][1], strokeWidth / 2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(stroke[0][0], stroke[0][1]);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i][0], stroke[i][1]);
      }
      ctx.stroke();
      ctx.closePath();
    }
  }

  snapCharacterToCalligraphy() {
    const canvas = this.dom.paintCanvas;
    if (canvas) {
      canvas.style.transition = 'opacity 200ms ease-out';
      canvas.style.opacity = '0';
    }

    setTimeout(() => {
      this.renderCanvasLayers();
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        if (ctx) ctx.clearRect(0, 0, rect.width, rect.height);
        canvas.style.opacity = '1';
        canvas.style.transition = '';
      }
    }, 200);
  }

  renderCanvasLayers() {
    const isGuideActive = (this.effectiveGuideOn !== undefined) ? Boolean(this.effectiveGuideOn) : Boolean(this.isScaffoldOn);

    // Toggle demo order button visibility (lives in bottom utility strip when Guide ON)
    if (this.dom.demoOrderBtn) {
      this.dom.demoOrderBtn.classList.toggle('hidden', !isGuideActive);
    }

    if (!this.dom.drawingCanvasWrapper) return;
    const matcher = this.charMatchers[this.activeCharIndex];
    const size = this.getCanvasSize();
    const padding = Math.round(size * 0.08);

    let overlaySvg = document.getElementById('hanzi-custom-overlay-svg');
    if (!overlaySvg) {
      overlaySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      overlaySvg.id = 'hanzi-custom-overlay-svg';
      this.dom.drawingCanvasWrapper.appendChild(overlaySvg);
    }
    overlaySvg.setAttribute('class', 'absolute inset-0 w-full h-full pointer-events-none z-[25]');
    overlaySvg.style.zIndex = '25';
    overlaySvg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    overlaySvg.innerHTML = '';

    if (!matcher || !matcher.charData) return;

    if (matcher.canvasSize !== size || matcher.padding !== padding) {
      matcher.setCharacter(matcher.charData, size, padding);
    }

    // Use exact HanziWriter positioner transform matching the guide outline 100%
    const pos = getHanziPositioner(size, size, padding);
    const transformStr = pos.transform;

    // 1. Group for Snapped Calligraphy (rendered in #1E1B2E once answer is submitted and recognized!)
    if (this.charRecognized[this.activeCharIndex]) {
      const snappedGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      snappedGroup.setAttribute('transform', transformStr);

      for (let i = 0; i < matcher.targetStrokes.length; i++) {
        const stroke = matcher.targetStrokes[i];
        if (stroke) {
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', stroke.path);
          path.setAttribute('fill', '#1E1B2E');
          path.setAttribute('class', 'transition-opacity duration-200');
          snappedGroup.appendChild(path);
        }
      }
      overlaySvg.appendChild(snappedGroup);
    }

    // 2. Group for Missing Stroke Flash (when user submits with incomplete drawing)
    if (this.flashingStrokeIndex !== null) {
      const flashStroke = matcher.targetStrokes[this.flashingStrokeIndex];
      if (flashStroke) {
        const flashGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        flashGroup.setAttribute('transform', transformStr);
        const flashPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        flashPath.setAttribute('d', flashStroke.path);
        flashPath.setAttribute('fill', 'rgba(217, 119, 6, 0.35)');
        flashPath.setAttribute('stroke', '#D97706');
        flashPath.setAttribute('stroke-width', '4');
        flashPath.setAttribute('stroke-dasharray', '8,4');
        flashPath.setAttribute('class', 'missing-stroke-flash');
        flashGroup.appendChild(flashPath);
        overlaySvg.appendChild(flashGroup);
      }
    }

    // 3. Group for Numbered Starting Badges (Mode A: Guided Scaffolding)
    if (isGuideActive && !this.charRecognized[this.activeCharIndex]) {
      const badgesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      badgesGroup.setAttribute('id', 'scaffold-badges-group');
      const badges = matcher.getStrokeOriginBadges();

      for (const b of badges) {
        if (!b.isClaimed) {
          const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          g.setAttribute('transform', `translate(${b.x}, ${b.y})`);

          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('r', '10');
          circle.setAttribute('fill', '#D97706');
          circle.setAttribute('stroke', '#000000');
          circle.setAttribute('stroke-width', '2');
          g.appendChild(circle);

          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('dominant-baseline', 'central');
          text.setAttribute('fill', '#ffffff');
          text.setAttribute('font-family', 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace');
          text.setAttribute('font-size', '10');
          text.setAttribute('font-weight', '900');
          text.textContent = String(b.badgeNumber);
          g.appendChild(text);

          badgesGroup.appendChild(g);
        }
      }
      overlaySvg.appendChild(badgesGroup);
    }
  }

  clearResultShowcase() {
    this._showcaseToken++;
    this.resultShowcaseWriters = [];
    if (this.dom.resultShowcaseGrid) {
      this.dom.resultShowcaseGrid.innerHTML = '';
    }
  }

  renderResultShowcase(word, mode = 'calligraphy') {
    this.clearResultShowcase();
    const grid = this.dom.resultShowcaseGrid;
    if (!grid || !word) return;

    const chars = word.characters || Array.from(word.hanzi_simp || '');
    if (chars.length === 0) return;

    // Builder View B: render structural radical equation / decomposition chips with NO stroke animation (Mirror Bug #11 fix)
    if (mode === 'builder') {
      grid.className = 'flex flex-wrap items-center justify-center gap-2 py-0.5 shrink-0';
      const decomps = resolveWordDecompositions(word, this.decompositions);

      decomps.forEach((d) => {
        const card = document.createElement('div');
        card.className = 'bg-slate-50 border border-black/15 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 font-chinese text-sm sm:text-base font-bold text-[#1E1B2E]';
        const pieces = Array.isArray(d.targetComponents) ? d.targetComponents.map(tc => tc.glyph).filter(Boolean) : [];
        if (pieces.length > 1) {
          pieces.forEach((g, idx) => {
            const pSpan = document.createElement('span');
            pSpan.className = 'inline-flex items-center justify-center min-w-[26px] h-[26px] px-1 rounded-lg bg-white border border-black/15 font-chinese font-bold text-base leading-none';
            pSpan.textContent = g;
            card.appendChild(pSpan);
            if (idx < pieces.length - 1) {
              const plus = document.createElement('span');
              plus.className = 'font-mono text-xs font-bold text-black/45';
              plus.textContent = '+';
              card.appendChild(plus);
            }
          });
          const eq = document.createElement('span');
          eq.className = 'font-mono text-xs font-bold text-black/45';
          eq.textContent = '=';
          card.appendChild(eq);
          const out = document.createElement('span');
          out.className = 'inline-flex items-center justify-center min-w-[30px] h-[30px] px-1.5 rounded-lg font-chinese font-black text-lg leading-none wt-accent-text';
          out.style.backgroundColor = 'var(--wt-accent-tint)';
          out.textContent = d.char || '';
          card.appendChild(out);
        } else {
          const out = document.createElement('span');
          out.className = 'font-chinese font-black text-lg leading-none wt-accent-text';
          out.textContent = d.char || '';
          const tag = document.createElement('span');
          tag.className = 'font-mono text-[11px] font-bold text-black/60';
          tag.textContent = '• Root';
          card.appendChild(out);
          card.appendChild(tag);
        }
        grid.appendChild(card);
      });
      return;
    }

    // Calligraphy View B: compact replayable Mi Zi Ge boxes on mobile (strokes play cleanly on tap)
    grid.className = 'flex lg:hidden items-center justify-center gap-2 py-0.5 shrink-0';

    let boxSize = 84;
    if (chars.length === 2) boxSize = 74;
    else if (chars.length === 3) boxSize = 64;
    else if (chars.length >= 4) boxSize = 56;

    const padding = Math.max(4, Math.round(boxSize * 0.08));
    let gridStrokeColor = 'rgba(76, 29, 149, 0.18)';
    let innerRectColor = 'rgba(76, 29, 149, 0.12)';
    let accentColor = '#4C1D95';
    if (typeof window !== 'undefined' && this.dom.screen) {
      const cs = window.getComputedStyle(this.dom.screen);
      gridStrokeColor = cs.getPropertyValue('--wt-grid-stroke').trim() || gridStrokeColor;
      innerRectColor = cs.getPropertyValue('--wt-grid-inner').trim() || innerRectColor;
      accentColor = cs.getPropertyValue('--wt-accent').trim() || accentColor;
    }

    chars.forEach((ch) => {
      const box = document.createElement('button');
      box.type = 'button';
      box.className = 'result-showcase-box relative bg-[#fffdf9] border-2 border-black/25 rounded-xl flex items-center justify-center overflow-hidden select-none cursor-pointer active:scale-95 transition-transform shrink-0';
      box.style.width = `${boxSize}px`;
      box.style.height = `${boxSize}px`;
      box.title = `Play strokes for ${ch}`;
      box.setAttribute('aria-label', `Play strokes for ${ch}`);

      const gridSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      gridSvg.setAttribute('class', 'absolute inset-0 w-full h-full pointer-events-none');
      gridSvg.setAttribute('viewBox', '0 0 100 100');
      gridSvg.setAttribute('preserveAspectRatio', 'none');
      gridSvg.innerHTML = `
        <line x1="50" y1="0" x2="50" y2="100" stroke="${gridStrokeColor}" stroke-width="1.5" stroke-dasharray="3,3" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="${gridStrokeColor}" stroke-width="1.5" stroke-dasharray="3,3" />
        <line x1="0" y1="0" x2="100" y2="100" stroke="${gridStrokeColor}" stroke-width="1.5" stroke-dasharray="3,3" />
        <line x1="0" y1="100" x2="100" y2="0" stroke="${gridStrokeColor}" stroke-width="1.5" stroke-dasharray="3,3" />
        <rect x="5" y="5" width="90" height="90" fill="none" stroke="${innerRectColor}" stroke-width="1" />
      `;
      box.appendChild(gridSvg);

      const fallback = document.createElement('span');
      fallback.className = 'font-chinese font-bold text-[#1E1B2E] leading-none pointer-events-none relative z-[5]';
      fallback.style.fontSize = `${Math.round(boxSize * 0.68)}px`;
      fallback.textContent = ch;
      box.appendChild(fallback);

      const targetDiv = document.createElement('div');
      targetDiv.className = 'absolute inset-0 w-full h-full pointer-events-none z-10';
      box.appendChild(targetDiv);

      const playBadge = document.createElement('span');
      playBadge.className = 'absolute bottom-1 right-1 z-20 w-5 h-5 rounded-full bg-white/95 border border-black/20 flex items-center justify-center pointer-events-none';
      playBadge.innerHTML = `<span class="material-symbols-outlined text-[13px] leading-none" style="color: ${accentColor}">play_arrow</span>`;
      box.appendChild(playBadge);

      grid.appendChild(box);

      if (typeof window !== 'undefined' && window.HanziWriter) {
        try {
          const writer = window.HanziWriter.create(targetDiv, ch, {
            width: boxSize,
            height: boxSize,
            padding,
            showOutline: false,
            showCharacter: true,
            strokeAnimationSpeed: 1.5,
            delayBetweenStrokes: 100,
            strokeColor: '#1E1B2E',
            radicalColor: accentColor,
            outlineColor: gridStrokeColor,
            charDataLoader: (char, onComplete, onFail) => {
              this.fetchCharacterData(char).then(data => {
                if (data) {
                  if (fallback.parentNode) fallback.style.display = 'none';
                  onComplete(data);
                } else if (onFail) {
                  onFail(new Error('Character data missing'));
                }
              });
            }
          });
          this.resultShowcaseWriters.push(writer);
          box.addEventListener('click', (e) => {
            e.stopPropagation();
            try {
              writer.animateCharacter();
            } catch (_) {}
          });
        } catch (err) {
          console.warn('WordTrainerEngine: Showcase HanziWriter notice', err);
        }
      }
    });
  }

  demoStrokeOrder() {
    const isResultOpen = this.dom.resultFeedbackPanel && !this.dom.resultFeedbackPanel.classList.contains('hidden');
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

    if (isMobile && isResultOpen && this.resultShowcaseWriters && this.resultShowcaseWriters.length > 0) {
      const token = ++this._showcaseToken;
      const writers = this.resultShowcaseWriters;
      const animateAt = (idx) => {
        if (this._showcaseToken !== token || idx >= writers.length) return;
        try {
          writers[idx].animateCharacter({
            onComplete: () => {
              if (this._showcaseToken === token) {
                setTimeout(() => animateAt(idx + 1), 160);
              }
            }
          });
        } catch (e) {
          console.warn('WordTrainerEngine: showcase animate notice', e);
        }
      };
      animateAt(0);
      return;
    }

    if (this.activeWriter) {
      try {
        this.usedGuideInAttempt = true;
        this.activeWriter.animateCharacter();
        this.updateFeedback('neutral', 'Playing stroke order…');
      } catch (e) {
        console.warn('WordTrainerEngine: demoStrokeOrder notice', e);
      }
    }
  }

  undoLastStroke() {
    const hadStroke = this.userDrawnStrokes.length > 0;
    if (hadStroke) {
      this.userDrawnStrokes.pop();
    }
    if (this.charUserStrokes && this.charUserStrokes[this.activeCharIndex]) {
      this.charUserStrokes[this.activeCharIndex] = [...this.userDrawnStrokes];
    }
    this.charRecognized[this.activeCharIndex] = false;
    this.flashingStrokeIndex = null;

    const matcher = this.charMatchers[this.activeCharIndex];
    if (matcher) {
      matcher.reset();
    }

    this.redrawUserStrokes();
    this.renderCanvasLayers();
    this.updateCharCarouselDots();
    this.updateFeedback('neutral', hadStroke ? 'Removed last stroke.' : 'Nothing to undo.');
    this.updateSubmitIdleState();
  }

  updateCharCarouselDots() {
    if (!this.activeWord || !this.dom.charPills) return;
    const chars = this.activeWord.characters || Array.from(this.activeWord.hanzi_simp || '');
    const isMulti = chars.length > 1;
    if (!isMulti) {
      this.dom.charPills.classList.add('hidden');
      return;
    }
    const index = this.activeCharIndex;
    this.dom.charPills.classList.remove('hidden');
    const dots = chars.map((_, i) => {
      const hasWork = (i === index
        ? this.userDrawnStrokes.length > 0
        : (this.charUserStrokes[i] && this.charUserStrokes[i].length > 0))
        || Boolean(this.charRecognized[i]);
      return hasWork ? '●' : '○';
    }).join('');
    this.dom.charPills.textContent = `Char ${index + 1} of ${chars.length} • ${dots}`;
  }

  // ----------------------------------------------------
  // 3. PHASE & BATCH MANAGEMENT
  // ----------------------------------------------------
  switchPhase(phaseId) {
    if (phaseId < 1 || phaseId > 5) phaseId = 1;
    this.hidePhaseCompleteModal();
    this.setMobileResultPeek(false);
    this._completedModalPhase = null;
    this.activePhase = phaseId;

    if (!this.state.phases[phaseId]) {
      this.state.phases[phaseId] = { status: 'in_progress', currentBatchIndex: 1, completedWordIds: [] };
    }
    if (this.state.phases[phaseId].status === 'not_started') {
      this.state.phases[phaseId].status = 'in_progress';
    }

    this.saveState();
    this.updatePhaseStepperUI();
    this.loadBatchForActivePhase();
  }

  updatePhaseStepperUI() {
    if (!this.dom.phaseBtns) return;
    this.dom.phaseBtns.forEach(btn => {
      const p = parseInt(btn.getAttribute('data-phase'), 10);
      const isCur = (p === this.activePhase);
      const pData = this.state.phases[p];
      const isComp = pData && pData.status === 'completed';

      btn.classList.remove('phase-active', 'phase-completed', 'phase-available', 'bg-white', 'text-black', 'shadow-sm');

      if (isCur) {
        btn.classList.add('phase-active');
      } else if (isComp) {
        btn.classList.add('phase-completed');
      } else {
        btn.classList.add('phase-available', 'bg-white', 'text-black', 'shadow-sm');
      }
    });

    const phaseMeta = PHASE_META_MAP[this.activePhase] || PHASE_META_MAP[1];
    const mappedTotal = (this.phaseWordsMap && this.phaseWordsMap[this.activePhase])
      ? this.phaseWordsMap[this.activePhase].length
      : 0;
    const displayTotal = mappedTotal > 0 ? mappedTotal : phaseMeta.count;

    if (this.dom.phaseTitle) this.dom.phaseTitle.textContent = phaseMeta.title;
    if (this.dom.mobilePhaseTitle) this.dom.mobilePhaseTitle.textContent = `Phase ${this.activePhase} • ${phaseMeta.short}`;
    if (this.dom.mobilePhaseTriggerSub) this.dom.mobilePhaseTriggerSub.textContent = `${displayTotal} Words`;
    if (this.dom.mobilePhaseTriggerName) this.dom.mobilePhaseTriggerName.textContent = phaseMeta.short;
    this.updateProgressBar();
  }

  updateProgressBar() {
    const pData = this.state.phases[this.activePhase] || { completedWordIds: [] };
    const completedCount = pData.completedWordIds ? pData.completedWordIds.length : 0;
    const totalWords = (this.phaseWordsMap[this.activePhase] || []).length || 55;

    if (this.dom.overallProgressLabel) {
      this.dom.overallProgressLabel.textContent = `${completedCount} / ${totalWords} Mastered`;
    }
    if (this.dom.mobileProgressLabel) {
      this.dom.mobileProgressLabel.textContent = `${completedCount} / ${totalWords}`;
    }

    const pct = Math.min(100, Math.round((completedCount / totalWords) * 100));
    if (this.dom.progressBarFill) {
      this.dom.progressBarFill.style.width = `${pct}%`;
    }
    if (this.dom.mobileProgressFill) {
      this.dom.mobileProgressFill.style.width = `${pct}%`;
    }
  }

  updateSubmitIdleState() {
    if (!this.dom.submitBtn) return;
    const mode = this.getMode();
    let hasWork = false;
    if (mode === 'builder') {
      hasWork = Boolean(this.componentBuilder && this.componentBuilder.getTotalPlacedCount() > 0);
    } else {
      hasWork = (this.userDrawnStrokes && this.userDrawnStrokes.length > 0)
        || (this.charUserStrokes || []).some(list => Array.isArray(list) && list.length > 0)
        || (this.charRecognized || []).some(Boolean);
    }
    this.dom.submitBtn.classList.toggle('opacity-65', !hasWork);
  }

  loadBatchForActivePhase() {
    const pData = this.state.phases[this.activePhase];
    const words = this.phaseWordsMap[this.activePhase] || [];
    if (words.length === 0) return;

    const completedSet = new Set((pData && pData.completedWordIds) || []);
    const unmastered = words.filter(w => !completedSet.has(w.id));

    if (unmastered.length === 0 && pData && pData.status !== 'completed') {
      pData.status = 'completed';
      this.saveState();
      this.updatePhaseStepperUI();
    }

    // Practice pool: unmastered words while progressing, or all phase words when revisiting a completed phase
    const practicePool = unmastered.length > 0 ? unmastered : words;

    // Fisher-Yates shuffle practice pool to guarantee varied selection
    const shuffled = [...practicePool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    if (shuffled.length > 1 && this.activeWord && shuffled[0].id === this.activeWord.id) {
      [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }

    // Adaptive interval K: Phase 1 & 2 = 5 words; Phase 3, 4, 5 = 10 words
    const targetInterval = this.getIntervalForPhase(this.activePhase);
    const k = Math.min(targetInterval, shuffled.length);

    this.cycleWords = shuffled.slice(0, k);
    this.anchorWord = this.cycleWords[0];
    this.cycleIndex = 0;
    this.wordsSinceAnchor = 0;
    this.isReappearanceStage = false;
    this.reappearanceRetryQueue = [];
    this.hasRetriedAnchor = false;

    // Pre-buffer TTS audio tracks for active cycle
    this.preBufferAudio(this.cycleWords);

    this.loadWord(this.anchorWord);
  }

  preBufferAudio(words) {
    if (!words) return;
    for (const w of words) {
      if (w.audio && !this.audioCache.has(w.audio)) {
        try {
          const a = new Audio(w.audio);
          a.preload = 'auto';
          this.audioCache.set(w.audio, a);
        } catch (_) {}
      }
    }
  }

  // ----------------------------------------------------
  // 4. ACTIVE WORD & MULTI-CHARACTER CANVAS CONTROLLER
  // ----------------------------------------------------
  loadWord(word) {
    if (!word) return;
    this._wordSessionToken = (this._wordSessionToken || 0) + 1;
    const sessionToken = this._wordSessionToken;
    this.activeWord = word;
    this.activeCharIndex = 0;
    this.attemptsLeft = 3;
    this.flashingStrokeIndex = null;

    // Toggle guide mode: strictly forced OFF on delayed reappearance; otherwise honor mode-specific saved preference
    this.isScaffoldOn = this.readSavedGuidePreference(this.getMode(), true);
    const shouldGuideBeOn = this.isReappearanceStage ? false : this.isScaffoldOn;
    this.usedGuideInAttempt = Boolean(shouldGuideBeOn);
    this.setGuideMode(shouldGuideBeOn, !this.isReappearanceStage);

    const chars = word.characters || Array.from(word.hanzi_simp || '');
    const charCount = chars.length;
    this.charMatchers = new Array(charCount).fill(null);
    this.charRecognized = new Array(charCount).fill(false);
    this.charSpatialDrift = new Array(charCount).fill(null);
    this.userDrawnStrokes = [];
    this.charUserStrokes = new Array(charCount).fill(null).map(() => []);

    // Pre-fetch stroke data for all characters in the word
    for (let i = 0; i < charCount; i++) {
      this.fetchCharacterData(chars[i]).then(data => {
        if (this._wordSessionToken !== sessionToken) return;
        if (data && !this.charMatchers[i]) {
          const m = new StrokeMatcher();
          const size = this.getCanvasSize();
          m.setCharacter(data, size, Math.round(size * 0.08));
          this.charMatchers[i] = m;
          if (i === this.activeCharIndex) {
            this.renderCanvasLayers();
          }
        }
      });
    }

    // Update prompt display, attempt pips & character slot
    this.updatePromptDisplay(shouldGuideBeOn);
    this.updateAttemptPips();
    this.mountCharacter(0);

    // Mount Component Builder if mode is 'builder' (stepped 1-char-per-canvas assembly)
    if (this.getMode() === 'builder' && this.componentBuilder) {
      this.componentBuilder.mountWord(word);
      this.componentBuilder.toggleGhostHint(shouldGuideBeOn);
    }

    if (this.getMode() === 'builder') {
      this.updateFeedback('neutral', 'Place pieces on the grid.');
    } else {
      this.updateFeedback('neutral', 'Trace or draw the character.');
    }

    // Reset panels: Switch back to View A on mobile, close phase tray, show exercise inputs, hide result panel
    this.closeMobilePhaseBar();
    this.setMobileResultPeek(false);
    this.clearResultShowcase();
    if (this.dom.screen) this.dom.screen.classList.remove('mobile-result-active', 'mobile-result-peek');
    if (this.dom.promptArena) this.dom.promptArena.classList.remove('hidden');
    if (this.dom.interactionFooter) this.dom.interactionFooter.classList.remove('hidden');
    if (this.dom.resultFeedbackPanel) this.dom.resultFeedbackPanel.classList.add('hidden');
    if (this.dom.drawingCanvasWrapper) this.dom.drawingCanvasWrapper.style.boxShadow = '';
    const placementCanvas = (typeof document !== 'undefined') ? document.getElementById('open-placement-canvas') : null;
    if (placementCanvas) placementCanvas.style.boxShadow = '';

    this.updateSubmitIdleState();

    if (this.getMode() !== 'builder' && typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => this.syncCanvasDimensions());
    }

    // Auto-play TTS native audio on initial load
    this.playActiveWordAudio();
  }

  updatePromptDisplay(isGuideVisible = this.effectiveGuideOn) {
    const word = this.activeWord;
    if (!word) return;

    const showPinyin = Boolean(isGuideVisible);
    if (this.dom.promptPinyin) {
      this.dom.promptPinyin.textContent = word.pinyin || '';
      if (this.dom.promptPinyin.classList) {
        this.dom.promptPinyin.classList.toggle('hidden', !showPinyin);
      }
    }

    if (this.dom.promptMeaning) {
      this.dom.promptMeaning.textContent = getConciseEnglish(word);
      if (this.dom.promptMeaning.classList) {
        this.dom.promptMeaning.classList.remove('hidden');
      }
    }
  }

  async mountCharacter(index) {
    if (!this.activeWord) return;
    const chars = this.activeWord.characters || Array.from(this.activeWord.hanzi_simp || '');
    if (index < 0 || index >= chars.length) return;

    // Save previous character's handwriting
    if (this.charUserStrokes && this.activeCharIndex >= 0 && this.activeCharIndex < this.charUserStrokes.length) {
      this.charUserStrokes[this.activeCharIndex] = [...this.userDrawnStrokes];
    }

    this.activeCharIndex = index;
    const targetChar = chars[index];
    this.flashingStrokeIndex = null;
    this.userDrawnStrokes = [...(this.charUserStrokes[index] || [])];

    // Ensure matcher is loaded for this character
    const sessionToken = this._wordSessionToken;
    if (!this.charMatchers[index]) {
      const charData = await this.fetchCharacterData(targetChar);
      if (this._wordSessionToken !== sessionToken) return;
      if (charData) {
        const m = new StrokeMatcher();
        const size = this.getCanvasSize();
        m.setCharacter(charData, size, Math.round(size * 0.08));
        this.charMatchers[index] = m;
      }
    }

    // Mount HanziWriter for background outline and animation
    this.mountHanziWriterQuiz(targetChar, index);

    // Sync canvas sizing & DPR transform for current character
    this.syncCanvasDimensions();

    // If character is already complete, show snapped calligraphy. Otherwise, redraw handwriting!
    if (this.charRecognized[index]) {
      const paintCanvas = this.dom.paintCanvas;
      if (paintCanvas) {
        const ctx = paintCanvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
          ctx.restore();
        }
      }
    } else {
      this.redrawUserStrokes();
    }

    // Render SVG layers (calligraphy if complete, or badges if guide ON)
    this.renderCanvasLayers();

    // Carousel Navigation visibility (Mirrored outside Mi Zi Ge square)
    const isMulti = chars.length > 1;
    if (this.dom.canvasCharCarousel) {
      this.dom.canvasCharCarousel.classList.toggle('hidden', !isMulti);
    }
    if (this.dom.prevCharBtn) {
      const canPrev = isMulti && index > 0;
      this.dom.prevCharBtn.disabled = !canPrev;
      this.dom.prevCharBtn.classList.toggle('opacity-30', !canPrev);
      this.dom.prevCharBtn.classList.toggle('pointer-events-none', !canPrev);
      this.dom.prevCharBtn.classList.toggle('hidden', !isMulti);
    }
    if (this.dom.nextCharBtn) {
      const canNext = isMulti && index < chars.length - 1;
      this.dom.nextCharBtn.disabled = !canNext;
      this.dom.nextCharBtn.classList.toggle('opacity-30', !canNext);
      this.dom.nextCharBtn.classList.toggle('pointer-events-none', !canNext);
      this.dom.nextCharBtn.classList.toggle('hidden', !isMulti);
    }
    this.updateCharCarouselDots();
    this.updateSubmitIdleState();
  }

  mountHanziWriterQuiz(targetChar, index) {
    if (!window.HanziWriter || !this.dom.hanziTargetCanvas) return;
    const targetEl = this.dom.hanziTargetCanvas;
    targetEl.innerHTML = '';
    targetEl.className = 'absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-150 z-[15]';
    targetEl.style.zIndex = '15';
    const isGuideActive = (this.effectiveGuideOn !== undefined) ? Boolean(this.effectiveGuideOn) : Boolean(this.isScaffoldOn);
    targetEl.style.opacity = isGuideActive ? '1' : '0';
    targetEl.style.visibility = isGuideActive ? 'visible' : 'hidden';

    let highlightColor = '#D97706';
    let outlineColor = 'rgba(76, 29, 149, 0.18)';
    if (typeof window !== 'undefined' && this.dom.screen) {
      const cs = window.getComputedStyle(this.dom.screen);
      highlightColor = cs.getPropertyValue('--wt-highlight').trim() || highlightColor;
      outlineColor = cs.getPropertyValue('--wt-grid-stroke').trim() || outlineColor;
    }

    const rect = this.dom.drawingCanvasWrapper ? this.dom.drawingCanvasWrapper.getBoundingClientRect() : null;
    const actualW = rect ? Math.round(rect.width) : 0;
    const size = actualW > 0 ? actualW : 320;
    this._lastWriterSize = actualW;
    try {
      this.activeWriter = window.HanziWriter.create(targetEl, targetChar, {
        width: size,
        height: size,
        padding: Math.round(size * 0.08),
        showOutline: isGuideActive,
        showCharacter: false,
        strokeAnimationSpeed: 1.5,
        delayBetweenStrokes: 120,
        radicalColor: highlightColor,
        strokeColor: '#1E1B2E',
        outlineColor,
        charDataLoader: (char, onComplete, onFail) => {
          this.fetchCharacterData(char).then(data => {
            if (data) onComplete(data);
            else if (onFail) onFail(new Error('Character data missing'));
          });
        }
      });
    } catch (e) {
      console.warn('WordTrainerEngine: HanziWriter init notice', e);
    }
  }

  nextChar() {
    if (!this.activeWord) return;
    const count = this.activeWord.characterCount || this.activeWord.hanzi_simp.length;
    if (this.activeCharIndex < count - 1) {
      this.mountCharacter(this.activeCharIndex + 1);
    }
  }

  prevChar() {
    if (!this.activeWord) return;
    if (this.activeCharIndex > 0) {
      this.mountCharacter(this.activeCharIndex - 1);
    }
  }

  setCharIndex(index) {
    if (!this.activeWord) return;
    const count = this.activeWord.characterCount || this.activeWord.hanzi_simp.length;
    if (index >= 0 && index < count && index !== this.activeCharIndex) {
      this.mountCharacter(index);
    }
  }

  // ----------------------------------------------------
  // 6. SCAFFOLDING & CANVAS CONTROLS
  // ----------------------------------------------------
  toggleScaffolding(forcedState) {
    const currentEffective = (this.effectiveGuideOn !== undefined) ? Boolean(this.effectiveGuideOn) : Boolean(this.isScaffoldOn);
    const nextState = (forcedState !== undefined) ? Boolean(forcedState) : !currentEffective;
    this.isScaffoldOn = nextState;
    this.effectiveGuideOn = nextState;
    if (nextState) {
      this.usedGuideInAttempt = true;
    }
    this.state.scaffoldDefault = nextState;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.getGuideStorageKey(), nextState ? 'on' : 'off');
      }
    } catch (_) {}
    this.updateScaffoldBtnUI();

    if (this.dom.hanziTargetCanvas) {
      this.dom.hanziTargetCanvas.style.opacity = nextState ? '1' : '0';
      this.dom.hanziTargetCanvas.style.visibility = nextState ? 'visible' : 'hidden';
    }

    if (this.activeWriter) {
      if (nextState) {
        try { this.activeWriter.showOutline(); } catch (_) {}
      } else {
        try { this.activeWriter.hideOutline(); } catch (_) {}
      }
    }

    if (this.componentBuilder) {
      this.componentBuilder.toggleGhostHint(nextState);
    }

    this.updatePromptDisplay(nextState);
    this.renderCanvasLayers();
    this.saveState();
  }

  updateScaffoldBtnUI() {
    const btn = this.dom.scaffoldToggleBtn;
    if (!btn) return;
    const isGuideActive = (this.effectiveGuideOn !== undefined) ? Boolean(this.effectiveGuideOn) : Boolean(this.isScaffoldOn);
    if (isGuideActive) {
      btn.className = 'scaffold-on flex-1 min-h-[44px] py-2 lg:py-2.5 px-2 sm:px-3 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white border-2 border-black font-mono text-[10px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm active-collapse cursor-pointer transition-all';
      btn.innerHTML = '<span class="material-symbols-outlined text-sm sm:text-base shrink-0">visibility</span><span>Guide: On</span>';
    } else {
      btn.className = 'scaffold-off flex-1 min-h-[44px] py-2 lg:py-2.5 px-2 sm:px-3 rounded-xl bg-[#18181b] hover:bg-[#27272a] text-white/90 border-2 border-black font-mono text-[10px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm active-collapse cursor-pointer transition-all';
      btn.innerHTML = '<span class="material-symbols-outlined text-sm sm:text-base shrink-0">visibility_off</span><span>Guide: Off</span>';
    }
  }

  clearCanvas() {
    const matcher = this.charMatchers[this.activeCharIndex];
    if (matcher) {
      matcher.reset();
    }
    this.userDrawnStrokes = [];
    if (this.charUserStrokes && this.charUserStrokes[this.activeCharIndex]) {
      this.charUserStrokes[this.activeCharIndex] = [];
    }
    this.charRecognized[this.activeCharIndex] = false;
    this.flashingStrokeIndex = null;

    const paintCanvas = this.dom.paintCanvas;
    if (paintCanvas) {
      const ctx = paintCanvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
        ctx.restore();
      }
    }
    this.renderCanvasLayers();
    this.updateCharCarouselDots();
    this.updateFeedback('neutral', 'Canvas cleared. Trace or draw the character.');
    this.updateSubmitIdleState();
  }

  humanizeGradeResult(grade, mode = this.getMode()) {
    if (!grade) {
      return {
        status: 'CLEAN_PASS',
        tier: 1,
        badge: mode === 'builder' ? '🎯 Clean Assembly!' : '🎯 Perfect Form!',
        detail: mode === 'builder'
          ? 'All pieces snapped cleanly into place.'
          : 'Clean strokes and accurate order.',
        isPass: true
      };
    }

    const tierNum = typeof grade.tier === 'number' ? grade.tier : (grade.success ? 1 : 3);
    const tierName = grade.tierName || (typeof grade.tier === 'string' ? grade.tier : '');

    if (mode === 'builder') {
      if (tierNum === 1 || grade.status === 'CLEAN_PASS') {
        return {
          ...grade,
          tier: 1,
          badge: '🎯 Clean Assembly!',
          detail: 'All pieces snapped cleanly into place.',
          isPass: true
        };
      }
      if (tierNum === 2 || grade.status === 'SOFT_PASS') {
        return {
          ...grade,
          tier: 2,
          badge: grade.badge || '✓ Recognized!',
          detail: (grade.detail || 'Good placement! Center pieces neatly inside the square.').replace(/^💡\s*(Pro Tip|Tip):\s*/i, ''),
          isPass: true
        };
      }
      const cleanFail = String(grade.detail || 'Check the pieces on the grid and try again.')
        .replace(/No components placed yet\.?/i, 'Place at least one piece on the grid first.')
        .replace(/^📖\s*/, '');
      return {
        ...grade,
        tier: 3,
        badge: grade.badge || '⚠️ Almost There!',
        detail: cleanFail,
        isPass: false
      };
    }

    // Calligraphy plain-English mapping
    if (tierName === 'TIER_1_CLEAN_PASS' || (tierNum === 1 && grade.success)) {
      return {
        ...grade,
        tier: 1,
        badge: '🎯 Perfect Form!',
        detail: 'Clean strokes and accurate order.',
        isPass: true
      };
    }
    if (tierName === 'TIER_2_SOFT_PASS_ORDER') {
      return {
        ...grade,
        tier: 2,
        badge: '✓ Recognized!',
        detail: 'Good shape! Next time start top-to-bottom, left-to-right.',
        isPass: true
      };
    }
    if (tierName === 'TIER_2_SOFT_PASS_KERNING') {
      return {
        ...grade,
        tier: 2,
        badge: '✓ Recognized!',
        detail: 'Good shape! Keep the left and right sides closer together.',
        isPass: true
      };
    }
    if (tierName === 'TIER_2_SOFT_PASS_CURSIVE') {
      return {
        ...grade,
        tier: 2,
        badge: '✓ Recognized!',
        detail: 'Good flow! Split corners into separate horizontal and vertical strokes for standard writing.',
        isPass: true
      };
    }
    if (tierName === 'TIER_2_SOFT_PASS_CENTERING') {
      return {
        ...grade,
        tier: 2,
        badge: '✓ Recognized!',
        detail: 'Good shape! Center the character inside the grid.',
        isPass: true
      };
    }
    if (tierName === 'TIER_2_SOFT_PASS_TOLERANCE' || (tierNum === 2 && grade.success)) {
      const rawDetail = String(grade.detail || '');
      const detail = rawDetail.includes('filling more of the grid')
        ? 'Good shape! Draw slightly larger to fill the grid.'
        : 'Good shape! Keep lines straight and steady inside the grid.';
      return {
        ...grade,
        tier: 2,
        badge: '✓ Recognized!',
        detail,
        isPass: true
      };
    }
    if (tierName === 'TIER_3_EXTRA_STROKE') {
      return {
        ...grade,
        tier: 3,
        badge: '⚠️ Extra Stroke',
        detail: String(grade.detail || 'Too many strokes. Use Undo to remove extras.').replace('Target has', 'Needs'),
        isPass: false
      };
    }
    if (tierName === 'TIER_3_WRONG_ANGLE') {
      return {
        ...grade,
        tier: 3,
        badge: '⚠️ Check Stroke Angle',
        detail: 'One stroke went the wrong direction. Turn on Guide to check the starting numbers.',
        isPass: false
      };
    }
    if (tierName === 'TIER_3_MISSING_STROKE') {
      const cleanMissing = String(grade.detail || 'A stroke is missing.')
        .replace(/\(highlighted in orange above\)/gi, '(shown in amber on the grid)')
        .replace(/\(highlighted above\)/gi, '(shown on the grid)');
      return {
        ...grade,
        tier: 3,
        badge: '⚠️ Missing Stroke',
        detail: cleanMissing,
        isPass: false
      };
    }
    return {
      ...grade,
      tier: 3,
      badge: '❓ Shape Unclear',
      detail: 'Turn on Guide: On to trace the strokes step by step.',
      isPass: false
    };
  }

  // ----------------------------------------------------
  // 7. 3-ATTEMPT SHIELD & THREE-TIER SUBMISSION VALIDATION
  // ----------------------------------------------------
  validateSubmission() {
    if (!this.activeWord) return;
    if (this.getMode() === 'builder') {
      this.validateBuilderSubmission();
    } else {
      this.validateCalligraphySubmission();
    }
  }

  /**
   * Queues an unassisted/reappearance failed word for delayed recall retry.
   */
  queueUnassistedFailure() {
    const failedWord = this.isReappearanceStage ? this.anchorWord : this.activeWord;
    if ((!this.usedGuideInAttempt || this.isReappearanceStage) && failedWord) {
      if (!this.reappearanceRetryQueue.some(w => w.id === failedWord.id)) {
        this.reappearanceRetryQueue.push(failedWord);
      }
    }
  }

  /**
   * Cements phase mastery ONLY if the guide was never used at any point during this attempt.
   * Returns true if the attempt was purely unassisted and eligible for mastery.
   */
  cementWordIfUnassisted() {
    const isPureUnassisted = !this.usedGuideInAttempt && !this.effectiveGuideOn;
    if (!isPureUnassisted) {
      if (this.isReappearanceStage && this.anchorWord && !this.reappearanceRetryQueue.some(w => w.id === this.anchorWord.id)) {
        this.reappearanceRetryQueue.push(this.anchorWord);
      }
      return false;
    }

    const wordToCement = this.isReappearanceStage ? (this.anchorWord || this.activeWord) : this.activeWord;
    if (!wordToCement) return false;

    if (Array.isArray(this.reappearanceRetryQueue)) {
      this.reappearanceRetryQueue = this.reappearanceRetryQueue.filter(w => w.id !== wordToCement.id);
    }
    const pData = this.state.phases[this.activePhase];
    if (pData && !pData.completedWordIds.includes(wordToCement.id)) {
      pData.completedWordIds.push(wordToCement.id);
      this.saveState();
      this.updateProgressBar();
      const totalPhaseWords = (this.phaseWordsMap[this.activePhase] || []).length;
      if (pData.completedWordIds.length >= totalPhaseWords && totalPhaseWords > 0) {
        pData.status = 'completed';
        this.saveState();
        this.updatePhaseStepperUI();
        this.triggerPhaseCompleteModal(this.activePhase);
      }
    }
    return true;
  }

  validateCalligraphySubmission() {
    if (!this.activeWord) return;

    const count = this.activeWord.characterCount || this.activeWord.hanzi_simp.length;

    // Grade each character using gradeCalligraphyDrawing
    let allPassed = true;
    let worstGrade = null;
    let firstIncompleteIdx = -1;
    const perCharGrades = [];
    const perCharStrokeCounts = [];

    for (let i = 0; i < count; i++) {
      const matcher = this.charMatchers[i];
      const userStrokes = this.charUserStrokes[i] || (i === this.activeCharIndex ? this.userDrawnStrokes : []);
      perCharStrokeCounts.push(Array.isArray(userStrokes) ? userStrokes.length : 0);
      const spatialDrift = (this.charSpatialDrift && this.charSpatialDrift[i]) || null;
      const grade = gradeCalligraphyDrawing(matcher, userStrokes, spatialDrift, this.getCanvasSize());
      perCharGrades.push(grade);

      if (!grade.success) {
        allPassed = false;
        if (firstIncompleteIdx === -1) {
          firstIncompleteIdx = i;
          worstGrade = grade;
        }
      } else if (!worstGrade || (grade.tier > worstGrade.tier)) {
        worstGrade = grade;
      }
    }

    // Stepped multi-char advance without consuming an attempt (mirrors Builder auto-advance)
    if (!allPassed && count > 1 && perCharGrades[this.activeCharIndex] && perCharGrades[this.activeCharIndex].success) {
      const nextEmptyIdx = perCharStrokeCounts.findIndex((len, idx) => idx !== this.activeCharIndex && len === 0);
      if (nextEmptyIdx !== -1) {
        this.flashElement('drawing-canvas-wrapper', 'success');
        this.mountCharacter(nextEmptyIdx);
        this.updateFeedback('neutral', `Nice! Now draw character ${nextEmptyIdx + 1} of ${count}.`);
        this.updateSubmitIdleState();
        return;
      }
    }

    if (!allPassed) {
      this.attemptsLeft = Math.max(0, this.attemptsLeft - 1);
      this.updateAttemptPips();

      // Flashes & Shakes
      this.shakeElement('drawing-canvas-wrapper');
      this.flashElement('drawing-canvas-wrapper', 'error');

      // Highlight missing stroke if applicable
      if (firstIncompleteIdx !== -1 && firstIncompleteIdx !== this.activeCharIndex) {
        this.mountCharacter(firstIncompleteIdx);
      }
      const matcher = this.charMatchers[this.activeCharIndex];
      const missingStroke = matcher ? matcher.getFirstUnclaimedStroke() : null;
      this.flashingStrokeIndex = missingStroke ? missingStroke.index : null;
      this.renderCanvasLayers();
      this.redrawUserStrokes();

      const humanizedFail = this.humanizeGradeResult(worstGrade, 'calligraphy');
      this.playActiveWordAudio();
      this.updateFeedback('error', `${humanizedFail.detail} Tries left: ${this.attemptsLeft}`);

      if (this.attemptsLeft === 0) {
        this.charRecognized[this.activeCharIndex] = true;
        this.snapCharacterToCalligraphy();
        this.queueUnassistedFailure();
        const sessionToken = this._wordSessionToken;
        setTimeout(() => {
          if (this._wordSessionToken !== sessionToken) return;
          this.showResultFeedbackPanel(false, {
            status: 'DIAGNOSTIC_FAIL',
            tier: 3,
            badge: '📖 Solution Shown',
            detail: 'Out of tries. Review the character above before continuing.',
            isPass: false
          });
        }, 400);
      }
      return;
    }

    // Pass! (Tier 1 Clean Pass or Tier 2 Soft Pass)
    const passGrade = this.humanizeGradeResult(worstGrade, 'calligraphy');
    this.charRecognized[this.activeCharIndex] = true;
    this.updateCharCarouselDots();
    this.snapCharacterToCalligraphy();
    this.flashElement('drawing-canvas-wrapper', 'success');

    // Cement progress ONLY if completed purely unassisted (guide never active during this attempt)
    const wasCemented = this.cementWordIfUnassisted();
    const practiceNote = (!wasCemented && !this.effectiveGuideOn && this.usedGuideInAttempt)
      ? '(Practice only — guide was used on this word.)'
      : '';
    const feedbackGrade = practiceNote ? { ...passGrade, practiceNote } : passGrade;
    this.updateFeedback('success', practiceNote ? `${passGrade.detail} ${practiceNote}` : passGrade.detail);

    const sessionToken = this._wordSessionToken;
    setTimeout(() => {
      if (this._wordSessionToken !== sessionToken) return;
      this.showResultFeedbackPanel(true, feedbackGrade);
    }, 400);
  }

  validateBuilderSubmission() {
    if (!this.activeWord) return;

    // 1. Evaluate Component Placement via stepped 1-char-per-canvas grading
    const gradeResult = this.componentBuilder
      ? this.componentBuilder.evaluateActivePlacement(this.decompositions, this.corpus, this.attemptsLeft)
      : { status: 'DIAGNOSTIC_FAIL', tier: 3, success: false, badge: '⚠️ Not Ready', detail: 'Place pieces on the grid first.' };

    // Stepped multi-char advance without consuming an attempt
    if (gradeResult && gradeResult.noPenalty && gradeResult.autoAdvanceToChar !== undefined) {
      this.flashElement('open-placement-canvas', 'success');
      if (this.componentBuilder) {
        this.componentBuilder.mountCharacter(gradeResult.autoAdvanceToChar);
      }
      this.updateFeedback('neutral', gradeResult.detail || `Nice! Now build character ${gradeResult.autoAdvanceToChar + 1}.`);
      this.updateSubmitIdleState();
      return;
    }

    if (!gradeResult.success) {
      this.attemptsLeft = Math.max(0, this.attemptsLeft - 1);
      this.updateAttemptPips();
      if (gradeResult.charIndex !== undefined && this.componentBuilder && this.componentBuilder.activeCharIndex !== gradeResult.charIndex) {
        this.componentBuilder.mountCharacter(gradeResult.charIndex);
      }
      this.shakeElement('open-placement-canvas');
      this.flashElement('open-placement-canvas', 'error');
      this.playActiveWordAudio();

      if (this.attemptsLeft === 0) {
        const failMsg = 'Out of tries. Review the character above before continuing.';
        this.updateFeedback('error', failMsg);

        if (this.componentBuilder && typeof this.componentBuilder.revealCanonicalSolution === 'function') {
          this.componentBuilder.revealCanonicalSolution();
        }
        this.queueUnassistedFailure();
        const sessionToken = this._wordSessionToken;
        setTimeout(() => {
          if (this._wordSessionToken !== sessionToken) return;
          this.showResultFeedbackPanel(false, {
            status: 'DIAGNOSTIC_FAIL',
            tier: 3,
            badge: '📖 Solution Shown',
            detail: failMsg,
            isPass: false
          });
        }, 400);
      } else {
        const humanizedFail = this.humanizeGradeResult(gradeResult, 'builder');
        this.updateFeedback('error', `${humanizedFail.detail} Tries left: ${this.attemptsLeft}`);
      }
      return;
    }

    // Pass!
    const humanizedPass = this.humanizeGradeResult(gradeResult, 'builder');
    this.flashElement('open-placement-canvas', 'success');

    // Cement progress ONLY if completed purely unassisted (guide never active during this attempt)
    const wasCemented = this.cementWordIfUnassisted();
    const practiceNote = (!wasCemented && !this.effectiveGuideOn && this.usedGuideInAttempt)
      ? '(Practice only — guide was used on this word.)'
      : '';
    const feedbackGrade = practiceNote ? { ...humanizedPass, practiceNote } : humanizedPass;
    this.updateFeedback('success', practiceNote ? `${humanizedPass.detail} ${practiceNote}` : humanizedPass.detail);

    const sessionToken = this._wordSessionToken;
    if (this.componentBuilder) {
      this.componentBuilder.playCrystallizationAnimation(() => {
        if (this._wordSessionToken !== sessionToken) return;
        this.showResultFeedbackPanel(true, feedbackGrade);
      });
    } else {
      setTimeout(() => {
        if (this._wordSessionToken !== sessionToken) return;
        this.showResultFeedbackPanel(true, feedbackGrade);
      }, 400);
    }
  }

  showResultFeedbackPanel(isMastered, gradeResult = null) {
    if (!this.activeWord) return;

    const mode = this.getMode();
    const conciseMeaning = getConciseEnglish(this.activeWord);
    const rawMeaning = String(this.activeWord.english || '').trim();
    const showMoreNotes = Boolean(rawMeaning && rawMeaning !== conciseMeaning && rawMeaning.length > 35);

    // 1. Populate Unified Word Result Header & Showcase
    if (this.dom.resultHanzi) this.dom.resultHanzi.textContent = this.activeWord.hanzi_simp;
    if (this.dom.resultPinyin) this.dom.resultPinyin.textContent = this.activeWord.pinyin;
    if (this.dom.resultMeaning) this.dom.resultMeaning.textContent = conciseMeaning;
    if (this.dom.resultFullNotes) {
      this.dom.resultFullNotes.textContent = rawMeaning;
      this.dom.resultFullNotes.classList.add('hidden');
    }
    if (this.dom.resultMoreNotesBtn) {
      this.dom.resultMoreNotesBtn.classList.toggle('hidden', !showMoreNotes);
      this.dom.resultMoreNotesBtn.textContent = 'More notes ›';
      this.dom.resultMoreNotesBtn.setAttribute('aria-expanded', 'false');
    }
    if (this.dom.resultDecomposition) {
      const rawDecomp = this.activeWord.radical_decomposition ? String(this.activeWord.radical_decomposition).trim() : '';
      this.dom.resultDecomposition.textContent = rawDecomp ? `Roots: ${rawDecomp}` : 'Single root';
    }
    this.renderResultShowcase(this.activeWord, mode);

    // 2. Normalize feedback into plain learner-friendly copy
    let grade;
    if (!isMastered) {
      grade = {
        status: 'DIAGNOSTIC_FAIL',
        tier: 3,
        badge: '📖 Solution Shown',
        detail: 'Out of tries. Review the character above before continuing.',
        isPass: false
      };
    } else {
      grade = this.humanizeGradeResult(gradeResult, mode);
      if (gradeResult && gradeResult.practiceNote) {
        grade = { ...grade, detail: `${grade.detail} ${gradeResult.practiceNote}` };
      }
    }

    if (this.dom.drawingTierBadge && this.dom.resultFeedbackText && this.dom.feedbackDrawingCard) {
      this.dom.drawingTierBadge.textContent = grade.badge;
      this.dom.resultFeedbackText.textContent = grade.detail;

      if (isMastered) {
        if (grade.tier === 1) {
          this.dom.drawingTierBadge.className = 'font-black text-xs sm:text-[13px] leading-tight text-emerald-900';
          this.dom.feedbackDrawingCard.className = 'w-full rounded-xl p-2.5 sm:p-3 border transition-all font-mono text-xs bg-emerald-50 border-emerald-400 text-emerald-950 flex flex-col gap-1 min-w-0 shrink-0';
          if (this.dom.resultFeedbackIcon) {
            this.dom.resultFeedbackIcon.className = 'material-symbols-outlined text-emerald-600 text-base shrink-0';
            this.dom.resultFeedbackIcon.textContent = 'verified';
          }
        } else {
          this.dom.drawingTierBadge.className = 'font-black text-xs sm:text-[13px] leading-tight text-teal-900';
          this.dom.feedbackDrawingCard.className = 'w-full rounded-xl p-2.5 sm:p-3 border transition-all font-mono text-xs bg-teal-50 border-teal-400 text-teal-950 flex flex-col gap-1 min-w-0 shrink-0';
          if (this.dom.resultFeedbackIcon) {
            this.dom.resultFeedbackIcon.className = 'material-symbols-outlined text-teal-600 text-base shrink-0';
            this.dom.resultFeedbackIcon.textContent = 'lightbulb';
          }
        }
      } else {
        this.dom.drawingTierBadge.className = 'font-black text-xs sm:text-[13px] leading-tight text-amber-900';
        this.dom.feedbackDrawingCard.className = 'w-full rounded-xl p-2.5 sm:p-3 border transition-all font-mono text-xs bg-amber-50 border-amber-400 text-amber-950 flex flex-col gap-1 min-w-0 shrink-0';
        if (this.dom.resultFeedbackIcon) {
          this.dom.resultFeedbackIcon.className = 'material-symbols-outlined text-amber-600 text-base shrink-0';
          this.dom.resultFeedbackIcon.textContent = 'auto_stories';
        }
      }
    }

    // 3. Concise stationary CTA label
    if (this.dom.resultNextBtnText) {
      this.dom.resultNextBtnText.textContent = 'Continue';
    }

    // 4. Desktop & Mobile View B Deduplication: Prompt collapses so Pinyin, English & Speaker appear strictly once
    this.closeMobilePhaseBar();
    this.setMobileResultPeek(false);
    if (this.dom.promptArena) this.dom.promptArena.classList.add('hidden');
    if (this.dom.interactionFooter) this.dom.interactionFooter.classList.add('hidden');
    if (this.dom.resultFeedbackPanel) this.dom.resultFeedbackPanel.classList.remove('hidden');
    if (this.dom.screen) this.dom.screen.classList.add('mobile-result-active');
  }

  retryCurrentWord() {
    if (!this.activeWord) return;
    this._wordSessionToken = (this._wordSessionToken || 0) + 1;

    this.closeMobilePhaseBar();
    this.setMobileResultPeek(false);
    this.clearResultShowcase();
    this.attemptsLeft = 3;
    this.flashingStrokeIndex = null;
    this.updateAttemptPips();

    // Return to View A on Mobile and restore Prompt + Canvas/Builder + Footer
    if (this.dom.screen) this.dom.screen.classList.remove('mobile-result-active', 'mobile-result-peek');
    if (this.dom.promptArena) this.dom.promptArena.classList.remove('hidden');
    if (this.dom.interactionFooter) this.dom.interactionFooter.classList.remove('hidden');
    if (this.dom.resultFeedbackPanel) this.dom.resultFeedbackPanel.classList.add('hidden');
    if (this.dom.drawingCanvasWrapper) this.dom.drawingCanvasWrapper.style.boxShadow = '';
    const placementCanvas = (typeof document !== 'undefined') ? document.getElementById('open-placement-canvas') : null;
    if (placementCanvas) placementCanvas.style.boxShadow = '';

    // Strict mastery gate: View B already revealed the character/solution, so retrying stays practice-only
    this.usedGuideInAttempt = true;
    this.isScaffoldOn = this.readSavedGuidePreference(this.getMode(), true);
    const shouldGuideBeOn = this.isReappearanceStage ? false : this.isScaffoldOn;
    this.setGuideMode(shouldGuideBeOn, !this.isReappearanceStage);
    const mode = this.getMode();

    if (mode === 'builder') {
      if (this.componentBuilder) {
        this.componentBuilder.resetCanvas();
        this.componentBuilder.toggleGhostHint(shouldGuideBeOn);
        if (typeof requestAnimationFrame === 'function') {
          requestAnimationFrame(() => this.componentBuilder.updateWatermarkSizing());
        }
      }
      this.updateFeedback('neutral', 'Place pieces on the grid.');
    } else {
      const chars = this.activeWord.characters || Array.from(this.activeWord.hanzi_simp || '');
      const charCount = chars.length;
      this.charRecognized = new Array(charCount).fill(false);
      this.charSpatialDrift = new Array(charCount).fill(null);
      this.charUserStrokes = new Array(charCount).fill(null).map(() => []);
      this.userDrawnStrokes = [];
      for (const m of this.charMatchers) {
        if (m) m.reset();
      }
      this.activeCharIndex = 0;
      this.mountCharacter(0);
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => this.syncCanvasDimensions());
      }
      this.updateFeedback('neutral', 'Trace or draw the character.');
    }

    this.updateSubmitIdleState();
    this.playActiveWordAudio();
  }

  shakeElement(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('shake-error');
    void el.offsetWidth;
    el.classList.add('shake-error');
  }

  flashElement(id, type = 'success') {
    const el = typeof id === 'string' ? document.getElementById(id) : id;
    if (!el) return;
    const cls = type === 'success' ? 'flash-success' : 'flash-error';
    el.classList.remove('flash-success', 'flash-error');
    void el.offsetWidth;
    el.classList.add(cls);
  }

  updateAttemptPips() {
    const pipsEl = this.dom.attemptPips;
    if (!pipsEl) return;
    if (this.attemptsLeft === 3) {
      pipsEl.innerHTML = '<span class="pip pip-active">●</span><span class="pip pip-active">●</span><span class="pip pip-active">●</span>';
    } else if (this.attemptsLeft === 2) {
      pipsEl.innerHTML = '<span class="pip pip-active">●</span><span class="pip pip-active">●</span><span class="pip pip-spent text-black/25">○</span>';
    } else if (this.attemptsLeft === 1) {
      pipsEl.innerHTML = '<span class="pip pip-danger text-rose-600 animate-pulse">●</span><span class="pip pip-spent text-black/25">○</span><span class="pip pip-spent text-black/25">○</span>';
    } else {
      pipsEl.innerHTML = '<span class="pip pip-spent text-black/25">○</span><span class="pip pip-spent text-black/25">○</span><span class="pip pip-spent text-black/25">○</span>';
    }
  }

  updateFeedback(status, message) {
    const banner = this.dom.feedbackToast || document.getElementById('drawing-feedback-toast');
    const text = this.dom.toastFeedbackText || document.getElementById('toast-feedback-text');
    const icon = this.dom.toastFeedbackIcon || document.getElementById('toast-feedback-icon');
    if (!banner || !text) return;

    text.textContent = message;
    banner.classList.remove(
      'shake-subtle', 'toast-idle-compact',
      'bg-slate-50', 'bg-white', 'border-black/15', 'border-black/20', 'text-black/70', 'text-black/75', 'text-black/80',
      'bg-emerald-50', 'border-emerald-400', 'border-emerald-500', 'border-emerald-600', 'text-emerald-950',
      'bg-amber-50', 'border-amber-400', 'border-amber-500', 'border-amber-600', 'text-amber-950',
      'bg-rose-50', 'border-rose-500', 'border-rose-600', 'text-rose-950'
    );

    if (status === 'correct' || status === 'success') {
      banner.classList.add('bg-emerald-50', 'border-emerald-400', 'text-emerald-950');
      if (icon) {
        icon.className = 'material-symbols-outlined text-emerald-600 text-base lg:text-lg leading-none shrink-0';
        icon.textContent = 'verified';
      }
    } else if (status === 'error' || status === 'hanzi-error' || status === 'tone-error' || status === 'both-error') {
      banner.classList.add('bg-amber-50', 'border-amber-400', 'text-amber-950');
      void banner.offsetWidth;
      banner.classList.add('shake-subtle');
      if (icon) {
        icon.className = 'material-symbols-outlined text-amber-600 text-base lg:text-lg leading-none shrink-0';
        icon.textContent = 'warning';
      }
    } else {
      banner.classList.add('toast-idle-compact', 'bg-slate-50', 'border-black/15', 'text-black/75');
      if (icon) {
        icon.className = 'material-symbols-outlined text-black/45 text-base lg:text-lg leading-none shrink-0';
        icon.textContent = 'info';
      }
    }
  }

  // ----------------------------------------------------
  // 8. MODAL CONTROLLERS & QUEUE ADVANCEMENT
  // ----------------------------------------------------
  advanceToNextWord() {
    const pData = this.state.phases[this.activePhase];
    const completedSet = new Set((pData && pData.completedWordIds) || []);

    if (this.isReappearanceStage) {
      // Reappearance stage completed
      if (this.reappearanceRetryQueue && this.reappearanceRetryQueue.length > 0) {
        const retryWord = this.reappearanceRetryQueue.shift();
        this.anchorWord = retryWord;
        this.isReappearanceStage = true;
        this.loadWord(this.anchorWord);
      } else {
        // Cemented anchor word / retry words! Begin next cycle
        this.isReappearanceStage = false;
        this.loadBatchForActivePhase();
      }
    } else {
      // Introductory or unassisted recall stage
      this.wordsSinceAnchor++;
      this.cycleIndex++;
      if (this.cycleIndex < this.cycleWords.length) {
        this.loadWord(this.cycleWords[this.cycleIndex]);
      } else {
        // Cycle finished
        if (this.reappearanceRetryQueue && this.reappearanceRetryQueue.length > 0) {
          this.isReappearanceStage = true;
          const retryWord = this.reappearanceRetryQueue.shift();
          this.anchorWord = retryWord;
          this.loadWord(this.anchorWord);
        } else if (this.anchorWord && !completedSet.has(this.anchorWord.id)) {
          // Delayed reappearance of unmastered anchor word with Guide OFF
          this.isReappearanceStage = true;
          this.loadWord(this.anchorWord);
        } else {
          // Anchor word already mastered (e.g. passed with Guide OFF) & retry queue clear -> next batch!
          this.isReappearanceStage = false;
          this.loadBatchForActivePhase();
        }
      }
    }
  }

  triggerPhaseCompleteModal(phaseId = this.activePhase) {
    this.closeMobilePhaseBar();
    const modal = this.dom.phaseCompleteModal;
    if (!modal) return;

    const targetPhase = (phaseId >= 1 && phaseId <= 5) ? phaseId : (this.activePhase || 1);
    this._completedModalPhase = targetPhase;

    const words = this.phaseWordsMap[targetPhase] || [];
    const phaseMeta = PHASE_META_MAP[targetPhase] || PHASE_META_MAP[1];
    const nextMeta = PHASE_META_MAP[targetPhase + 1] || null;
    if (this.dom.phaseCompleteTitle) {
      this.dom.phaseCompleteTitle.textContent = `🎉 Phase ${targetPhase} Complete!`;
    }
    if (this.dom.phaseCompleteSummary) {
      this.dom.phaseCompleteSummary.textContent = `You mastered all ${words.length} words in ${phaseMeta.title}!`;
    }
    if (this.dom.advancePhaseBtn) {
      if (targetPhase < 5 && nextMeta) {
        this.dom.advancePhaseBtn.innerHTML = `<span>Advance to Phase ${targetPhase + 1}: ${nextMeta.short}</span><span class="material-symbols-outlined text-base">arrow_forward</span>`;
        this.dom.advancePhaseBtn.classList.remove('hidden');
      } else {
        this.dom.advancePhaseBtn.classList.add('hidden');
      }
    }
    if (this.dom.stayPhaseBtn) {
      this.dom.stayPhaseBtn.textContent = `Stay & Practice Phase ${targetPhase}`;
    }
    modal.classList.remove('hidden');
  }

  hidePhaseCompleteModal() {
    if (this.dom && this.dom.phaseCompleteModal) {
      this.dom.phaseCompleteModal.classList.add('hidden');
    }
  }

  stayInCompletedPhase() {
    const targetPhase = (this._completedModalPhase >= 1 && this._completedModalPhase <= 5)
      ? this._completedModalPhase
      : (this.activePhase || 1);
    this._completedModalPhase = null;
    this.hidePhaseCompleteModal();
    this.switchPhase(targetPhase);
  }

  advanceToNextPhase() {
    const sourcePhase = (this._completedModalPhase >= 1 && this._completedModalPhase <= 5)
      ? this._completedModalPhase
      : (this.activePhase || 1);
    this._completedModalPhase = null;
    this.hidePhaseCompleteModal();
    if (sourcePhase < 5) {
      this.switchPhase(sourcePhase + 1);
    }
  }

  playActiveWordAudio() {
    if (!this.activeWord || !this.activeWord.audio) return;
    try {
      // 1. Cease any currently playing audio track before starting a new one
      this.stopAudio();

      // 2. Cease any global engine/drill audio instances
      if (typeof window.stopGlobalAudio === 'function') {
        try { window.stopGlobalAudio(); } catch (_) {}
      }

      let audio = this.audioCache.get(this.activeWord.audio);
      if (!audio) {
        audio = new Audio(this.activeWord.audio);
        this.audioCache.set(this.activeWord.audio, audio);
      }
      audio.currentTime = 0;
      this.currentAudio = audio;
      audio.play().catch(e => {
        console.warn('WordTrainerEngine: Audio playback notice', e);
      });
    } catch (e) {
      console.warn('WordTrainerEngine: Audio error', e);
    }
  }

  stopAudio() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (_) {}
      this.currentAudio = null;
    }
    if (this.audioCache) {
      this.audioCache.forEach(a => {
        try {
          if (a && !a.paused) {
            a.pause();
            a.currentTime = 0;
          }
        } catch (_) {}
      });
    }
    if (typeof window.stopGlobalAudio === 'function') {
      try { window.stopGlobalAudio(); } catch (_) {}
    }
  }
}

// Export singleton instance and mount on window
export const WordTrainerEngine = new WordTrainerEngineController();
if (typeof window !== 'undefined') {
  window.WordTrainerEngine = WordTrainerEngine;
}
