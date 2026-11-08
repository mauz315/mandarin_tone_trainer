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

import { StrokeMatcher, getHanziPositioner, classifyDrawing } from './strokeMatcher.js';
import { ComponentPlacementController } from './componentBuilderEngine.js';

const STORAGE_KEY_CALLIGRAPHY = 'mandarin_trainer_word_progress_calligraphy';
const STORAGE_KEY_BUILDER = 'mandarin_trainer_word_progress_builder';
const STORAGE_KEY_LEGACY = 'mandarin_trainer_word_progress';

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
    this.selectedTones = []; // Selected tones array (e.g. [1, 4])
    this.attemptsLeft = 3;
    this.isScaffoldOn = this.state.scaffoldDefault !== undefined ? this.state.scaffoldDefault : true;

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
    } catch (e) {
      console.warn('WordTrainerEngine: Failed to save state to localStorage', e);
    }
  }

  resetAllProgress() {
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
      // Load independent progress state for the newly selected mode
      this.state = this.loadState();
      this.activePhase = this.state.activePhase || 1;
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

  setGuideMode(isOn) {
    this.isScaffoldOn = isOn;
    this.toggleScaffolding(isOn);
    if (this.componentBuilder) {
      this.componentBuilder.toggleGhostHint(isOn);
    }
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
      phaseBtns: document.querySelectorAll('.phase-btn'),
      phaseTitle: document.getElementById('phase-title'),
      overallProgressLabel: document.getElementById('overall-progress-label'),
      overallProgressBar: document.getElementById('overall-progress-bar'),
      progressBarFill: document.getElementById('progress-bar-fill'),
      batchIndicatorLabel: document.getElementById('batch-indicator-label'),
      passBadge: document.getElementById('pass-badge'),
      promptArena: document.getElementById('prompt-arena'),
      audioReplayBtn: document.getElementById('audio-replay-btn'),
      promptHint: document.getElementById('prompt-hint'),
      promptHintBox: document.getElementById('prompt-hint-box'),
      drawingCanvasWrapper: document.getElementById('drawing-canvas-wrapper'),
      canvasGhostChar: document.getElementById('canvas-ghost-char'),
      hanziTargetCanvas: document.getElementById('hanzi-target-canvas'),
      paintCanvas: document.getElementById('hanzi-paint-canvas'),
      scaffoldToggleBtn: document.getElementById('scaffold-toggle-btn'),
      undoStrokeBtn: document.getElementById('undo-stroke-btn'),
      clearCanvasBtn: document.getElementById('clear-canvas-btn'),
      demoOrderBtn: document.getElementById('canvas-demo-order-btn'),
      interactionFooter: document.getElementById('interaction-footer'),
      toneSelectorGroup: document.getElementById('tone-selector-group'),
      toneBtns: document.querySelectorAll('.tone-choice-btn'),
      toneSegmentSlots: document.getElementById('tone-segment-slots'),
      attemptPips: document.getElementById('attempt-pips'),
      submitBtn: document.getElementById('submit-word-btn'),
      resultFeedbackPanel: document.getElementById('result-feedback-panel'),
      resultHanzi: document.getElementById('result-hanzi'),
      resultPinyin: document.getElementById('result-pinyin'),
      resultToneBadge: document.getElementById('result-tone-badge'),
      resultMeaning: document.getElementById('result-meaning'),
      resultDecomposition: document.getElementById('result-decomposition'),
      resultAudioReplayBtn: document.getElementById('result-audio-replay-btn'),
      feedbackDrawingCard: document.getElementById('feedback-drawing-card'),
      drawingFeedbackIcon: document.getElementById('drawing-feedback-icon'),
      drawingTierBadge: document.getElementById('drawing-tier-badge'),
      drawingFeedbackText: document.getElementById('drawing-feedback-text'),
      resultDemoOrderBtn: document.getElementById('result-demo-order-btn'),
      feedbackToneCard: document.getElementById('feedback-tone-card'),
      toneFeedbackIcon: document.getElementById('tone-feedback-icon'),
      toneVerdictBadge: document.getElementById('tone-verdict-badge'),
      toneFeedbackText: document.getElementById('tone-feedback-text'),
      resultNextBtn: document.getElementById('result-next-btn'),
      resultNextBtnText: document.getElementById('result-next-btn-text'),
      batchProgressContainer: document.getElementById('batch-progress-container'),
      openStrokeGuideBtn: document.getElementById('open-stroke-guide-btn'),
      strokeGuideModal: document.getElementById('stroke-guide-modal'),
      closeStrokeGuideBtn: document.getElementById('close-stroke-guide-btn'),
      guideModalCloseBtn: document.getElementById('guide-modal-close-btn'),
      feedbackBanner: document.getElementById('validation-feedback-banner'),
      feedbackIcon: document.getElementById('validation-feedback-icon'),
      feedbackText: document.getElementById('validation-feedback-text'),
      prevCharBtn: document.getElementById('canvas-prev-char-btn'),
      nextCharBtn: document.getElementById('canvas-next-char-btn'),
      charPills: document.getElementById('canvas-char-pills'),
      cardRevealModal: document.getElementById('card-reveal-modal'),
      revealModalBadge: document.getElementById('reveal-modal-badge'),
      revealHanzi: document.getElementById('reveal-hanzi'),
      revealPinyin: document.getElementById('reveal-pinyin'),
      revealMeaning: document.getElementById('reveal-meaning'),
      revealDecomposition: document.getElementById('reveal-decomposition'),
      revealSentenceHanzi: document.getElementById('reveal-sentence-hanzi'),
      revealSentenceEn: document.getElementById('reveal-sentence-en'),
      modalReplayBtn: document.getElementById('modal-replay-btn'),
      modalNextBtn: document.getElementById('modal-next-btn'),
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

    const wrapper = this.dom.drawingCanvasWrapper;
    if (wrapper) {
      if (!this.dom.prevCharBtn) {
        const prevBtn = document.createElement('button');
        prevBtn.id = 'canvas-prev-char-btn';
        prevBtn.type = 'button';
        prevBtn.className = 'hidden absolute left-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center cursor-pointer transition-all active:scale-90 shadow-md select-none';
        prevBtn.innerHTML = '<span class="material-symbols-outlined text-lg">chevron_left</span>';
        prevBtn.title = 'Previous character';
        prevBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.prevChar();
        });
        wrapper.appendChild(prevBtn);
        this.dom.prevCharBtn = prevBtn;
      }

      if (!this.dom.nextCharBtn) {
        const nextBtn = document.createElement('button');
        nextBtn.id = 'canvas-next-char-btn';
        nextBtn.type = 'button';
        nextBtn.className = 'hidden absolute right-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center cursor-pointer transition-all active:scale-90 shadow-md select-none';
        nextBtn.innerHTML = '<span class="material-symbols-outlined text-lg">chevron_right</span>';
        nextBtn.title = 'Next character';
        nextBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.nextChar();
        });
        wrapper.appendChild(nextBtn);
        this.dom.nextCharBtn = nextBtn;
      }

      if (!this.dom.charPills) {
        const pills = document.createElement('div');
        pills.id = 'canvas-char-pills';
        pills.className = 'hidden absolute top-2 right-2 z-30 flex items-center gap-1 font-mono text-[10px] font-bold bg-white/90 border border-black/30 px-2.5 py-0.5 rounded-full shadow-xs select-none';
        wrapper.appendChild(pills);
        this.dom.charPills = pills;
      }

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

    if (this.dom.toneBtns) {
      this.dom.toneBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const t = parseInt(btn.getAttribute('data-tone'), 10);
          this.handleToneSelection(t);
        });
      });
    }

    if (this.dom.phaseBtns) {
      this.dom.phaseBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const p = parseInt(btn.getAttribute('data-phase'), 10);
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

    if (this.dom.resultAudioReplayBtn) {
      this.dom.resultAudioReplayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.playActiveWordAudio();
      });
    }

    if (this.dom.resultDemoOrderBtn) {
      this.dom.resultDemoOrderBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.demoStrokeOrder();
      });
    }

    if (this.dom.openStrokeGuideBtn) {
      this.dom.openStrokeGuideBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openStrokeGuideModal();
      });
    }

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

    if (this.dom.modalNextBtn) {
      this.dom.modalNextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.dom.cardRevealModal) this.dom.cardRevealModal.classList.add('hidden');
        this.advanceToNextWord();
      });
    }

    if (this.dom.modalReplayBtn) {
      this.dom.modalReplayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.playActiveWordAudio();
      });
    }

    if (this.dom.advancePhaseBtn) {
      this.dom.advancePhaseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.dom.phaseCompleteModal) this.dom.phaseCompleteModal.classList.add('hidden');
        this.advanceToNextPhase();
      });
    }

    if (this.dom.stayPhaseBtn) {
      this.dom.stayPhaseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.dom.phaseCompleteModal) this.dom.phaseCompleteModal.classList.add('hidden');
      });
    }
  }

  openStrokeGuideModal() {
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

    this.syncCanvasDimensions();
    window.addEventListener('resize', () => {
      this.syncCanvasDimensions();
    });

    const getCoords = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      return [clientX - rect.left, clientY - rect.top];
    };

    let isDrawing = false;
    let strokePts = [];

    const startDraw = (e) => {
      if (e.target !== canvas) return;
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
      this.updateFeedback('neutral', 'Draw the character and select its tone to verify.');
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
    if (!this.dom.drawingCanvasWrapper) return;
    const matcher = this.charMatchers[this.activeCharIndex];
    const size = this.getCanvasSize();
    const padding = Math.round(size * 0.08);

    // Toggle demo order button visibility
    if (this.dom.demoOrderBtn) {
      if (this.isScaffoldOn) {
        this.dom.demoOrderBtn.classList.remove('hidden');
      } else {
        this.dom.demoOrderBtn.classList.add('hidden');
      }
    }

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
    if (this.isScaffoldOn && !this.charRecognized[this.activeCharIndex]) {
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

  demoStrokeOrder() {
    if (this.activeWriter) {
      try {
        this.activeWriter.animateCharacter();
        this.updateFeedback('neutral', 'Demonstrating canonical stroke order...');
      } catch (e) {
        console.warn('WordTrainerEngine: demoStrokeOrder notice', e);
      }
    }
  }

  undoLastStroke() {
    if (this.userDrawnStrokes.length > 0) {
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
    this.updateFeedback('neutral', 'Undid stroke.');
  }

  // ----------------------------------------------------
  // 3. PHASE & BATCH MANAGEMENT
  // ----------------------------------------------------
  switchPhase(phaseId) {
    if (phaseId < 1 || phaseId > 5) phaseId = 1;
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

      btn.classList.remove('phase-active', 'bg-[#4C1D95]', 'text-white', 'shadow-hard-black',
        'phase-completed', 'phase-available', 'bg-white', 'text-black', 'shadow-sm');

      if (isCur) {
        btn.classList.add('phase-active', 'bg-[#4C1D95]', 'text-white', 'shadow-hard-black');
      } else if (isComp) {
        btn.classList.add('phase-completed', 'bg-emerald-100', 'text-emerald-900', 'border-emerald-600');
      } else {
        btn.classList.add('phase-available', 'bg-white', 'text-black', 'shadow-sm');
      }
    });

    const phaseMeta = {
      1: { title: 'Phase 1: Elemental Atoms', count: 55 },
      2: { title: 'Phase 2: Compound Characters', count: 80 },
      3: { title: 'Phase 3: Core Binary Compounds', count: 115 },
      4: { title: 'Phase 4: Semantic Networks', count: 120 },
      5: { title: 'Phase 5: Idiomatic & Poly-Syllabic', count: 127 },
    }[this.activePhase] || { title: 'Phase 1: Elemental Atoms', count: 55 };

    if (this.dom.phaseTitle) this.dom.phaseTitle.textContent = phaseMeta.title;
    this.updateProgressBar();
  }

  updateProgressBar() {
    const pData = this.state.phases[this.activePhase] || { completedWordIds: [] };
    const completedCount = pData.completedWordIds ? pData.completedWordIds.length : 0;
    const totalWords = (this.phaseWordsMap[this.activePhase] || []).length || 55;

    if (this.dom.overallProgressLabel) {
      this.dom.overallProgressLabel.textContent = `Progress: ${completedCount} / ${totalWords} Words`;
    }

    const pct = Math.min(100, Math.round((completedCount / totalWords) * 100));
    if (this.dom.progressBarFill) {
      this.dom.progressBarFill.style.width = `${pct}%`;
    }
  }

  loadBatchForActivePhase() {
    const pData = this.state.phases[this.activePhase];
    const words = this.phaseWordsMap[this.activePhase] || [];
    const completedSet = new Set(pData.completedWordIds || []);
    const unmastered = words.filter(w => !completedSet.has(w.id));

    if (unmastered.length === 0) {
      pData.status = 'completed';
      this.saveState();
      this.updatePhaseStepperUI();
      this.triggerPhaseCompleteModal();
      return;
    }

    // Fisher-Yates shuffle unmastered words to guarantee varied selection
    const shuffled = [...unmastered];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
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
    this.activeWord = word;
    this.activeCharIndex = 0;
    this.attemptsLeft = 3;
    this.flashingStrokeIndex = null;

    // Toggle guide mode: strictly forced ON on first introduction, strictly forced OFF on delayed reappearance
    const shouldGuideBeOn = !this.isReappearanceStage;
    this.setGuideMode(shouldGuideBeOn);

    const chars = word.characters || Array.from(word.hanzi_simp || '');
    const charCount = chars.length;
    this.charMatchers = new Array(charCount).fill(null);
    this.charRecognized = new Array(charCount).fill(false);
    this.charSpatialDrift = new Array(charCount).fill(null);
    this.selectedTones = new Array(charCount).fill(null);
    this.userDrawnStrokes = [];
    this.charUserStrokes = new Array(charCount).fill(null).map(() => []);

    // Pre-fetch stroke data for all characters in the word
    for (let i = 0; i < charCount; i++) {
      this.fetchCharacterData(chars[i]).then(data => {
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

    // Update Header labels
    this.updateBatchLabels();
    this.updateAttemptPips();
    this.renderToneSlots();
    this.mountCharacter(0);

    // Update Component Builder multi-character layout if active
    if (typeof window.setupComponentBuilderCharacters === 'function') {
      window.setupComponentBuilderCharacters(chars);
    }

    // Mount Component Builder if mode is 'builder'
    if (this.getMode() === 'builder' && this.componentBuilder) {
      this.componentBuilder.mountWord(word);
      this.componentBuilder.toggleGhostHint(shouldGuideBeOn);
    }

    // Context disambiguation hint
    if (this.dom.promptHint) {
      if (word.characterCount === 1) {
        this.dom.promptHint.textContent = `Context Hint: "${word.english}"`;
        if (this.dom.promptHintBox) this.dom.promptHintBox.classList.remove('opacity-0');
      } else {
        this.dom.promptHint.textContent = `Context Hint: "[compound] ${word.characterCount} characters"`;
      }
    }

    if (this.getMode() === 'builder') {
      this.updateFeedback('neutral', 'Drag components to assemble the character, then select its tone.');
    } else {
      this.updateFeedback('neutral', 'Draw the character and select its tone to verify.');
    }

    // Reset panels: Show exercise inputs, hide result panel
    if (this.dom.promptArena) this.dom.promptArena.classList.remove('hidden');
    if (this.dom.interactionFooter) this.dom.interactionFooter.classList.remove('hidden');
    if (this.dom.resultFeedbackPanel) this.dom.resultFeedbackPanel.classList.add('hidden');
    if (this.dom.drawingCanvasWrapper) this.dom.drawingCanvasWrapper.style.boxShadow = '';

    // Scroll back to top on mobile
    if (window.innerWidth < 1024 && this.dom.screen) {
      this.dom.screen.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Auto-play TTS native audio on initial load
    this.playActiveWordAudio();
  }

  updateBatchLabels() {
    const pData = this.state.phases[this.activePhase];
    const words = this.phaseWordsMap[this.activePhase] || [];
    const completedCount = (pData && pData.completedWordIds) ? pData.completedWordIds.length : 0;
    const totalWords = words.length || 55;

    // Keep badge uniform with zero visual hint of test or reappearance
    if (this.dom.passBadge) {
      this.dom.passBadge.className = 'px-2 py-0.5 rounded-full bg-[#4C1D95] text-[#FDE68A] border border-black uppercase font-black text-[9px] shadow-xs';
      this.dom.passBadge.textContent = 'Practice';
    }

    if (this.dom.batchIndicatorLabel) {
      this.dom.batchIndicatorLabel.textContent = `Phase ${this.activePhase} • Mastered ${completedCount}/${totalWords} Words`;
    }
  }

  async mountCharacter(index) {
    if (!this.activeWord) return;
    const chars = this.activeWord.characters || Array.from(this.activeWord.hanzi_simp || '');
    if (index < 0 || index >= chars.length) return;

    // Save previous character's handwriting
    if (this.charUserStrokes) {
      this.charUserStrokes[this.activeCharIndex] = [...this.userDrawnStrokes];
    }

    this.activeCharIndex = index;
    const targetChar = chars[index];
    this.flashingStrokeIndex = null;
    this.userDrawnStrokes = [...(this.charUserStrokes[index] || [])];

    // Ensure matcher is loaded for this character
    if (!this.charMatchers[index]) {
      const charData = await this.fetchCharacterData(targetChar);
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

    // Carousel Navigation visibility
    const isMulti = chars.length > 1;
    if (this.dom.prevCharBtn) {
      if (isMulti && index > 0) {
        this.dom.prevCharBtn.classList.remove('hidden');
      } else {
        this.dom.prevCharBtn.classList.add('hidden');
      }
    }
    if (this.dom.nextCharBtn) {
      if (isMulti && index < chars.length - 1) {
        this.dom.nextCharBtn.classList.remove('hidden');
      } else {
        this.dom.nextCharBtn.classList.add('hidden');
      }
    }
    if (this.dom.charPills) {
      if (isMulti) {
        this.dom.charPills.classList.remove('hidden');
        this.dom.charPills.textContent = `Char ${index + 1} of ${chars.length}: ${targetChar}`;
      } else {
        this.dom.charPills.classList.add('hidden');
      }
    }

    // 6. Update Tone selector slot active state
    this.updateActiveToneSlotUI();
  }

  mountHanziWriterQuiz(targetChar, index) {
    if (!window.HanziWriter || !this.dom.hanziTargetCanvas) return;
    const targetEl = this.dom.hanziTargetCanvas;
    targetEl.innerHTML = '';
    targetEl.className = 'absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-150 z-[15]';
    targetEl.style.zIndex = '15';
    targetEl.style.opacity = this.isScaffoldOn ? '1' : '0';
    targetEl.style.visibility = this.isScaffoldOn ? 'visible' : 'hidden';

    const size = this.getCanvasSize();
    try {
      this.activeWriter = window.HanziWriter.create(targetEl, targetChar, {
        width: size,
        height: size,
        padding: Math.round(size * 0.08),
        showOutline: this.isScaffoldOn,
        showCharacter: false,
        strokeAnimationSpeed: 1.5,
        delayBetweenStrokes: 120,
        radicalColor: '#D97706',
        strokeColor: '#1E1B2E',
        outlineColor: 'rgba(76, 29, 149, 0.18)',
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
  // 5. TONE SELECTION & DYNAMIC SLOTS
  // ----------------------------------------------------
  renderToneSlots() {
    const container = this.dom.toneSegmentSlots;
    if (!container || !this.activeWord) return;

    const count = this.activeWord.characterCount || this.activeWord.hanzi_simp.length;
    if (count <= 1) {
      container.classList.add('hidden');
      return;
    }

    container.classList.remove('hidden');
    container.innerHTML = '<span class="font-bold text-black/60 text-[10px] uppercase">SLOTS:</span>';

    const chars = this.activeWord.characters || Array.from(this.activeWord.hanzi_simp || '');
    chars.forEach((ch, idx) => {
      const slotEl = document.createElement('div');
      slotEl.className = `tone-slot px-3 py-1 rounded-lg border-2 font-bold cursor-pointer transition-all ${
        idx === this.activeCharIndex ? 'border-black bg-white text-black shadow-xs active' : 'border-black/30 bg-white/70 text-black/60'
      }`;
      slotEl.setAttribute('data-slot', idx);
      const val = this.selectedTones[idx] !== null ? `T${this.selectedTones[idx]}` : '_';
      slotEl.innerHTML = `${ch} (${idx + 1}): <span class="tone-slot-val font-black ${
        idx === this.activeCharIndex ? 'text-[#D97706]' : 'text-black'
      }">${val}</span>`;

      slotEl.addEventListener('click', () => {
        this.setCharIndex(idx);
      });
      container.appendChild(slotEl);
    });
  }

  updateActiveToneSlotUI() {
    const container = this.dom.toneSegmentSlots;
    if (!container || !this.activeWord) return;

    const slots = container.querySelectorAll('.tone-slot');
    slots.forEach((s, idx) => {
      const isCur = (idx === this.activeCharIndex);
      s.className = `tone-slot px-3 py-1 rounded-lg border-2 font-bold cursor-pointer transition-all ${
        isCur ? 'border-black bg-white text-black shadow-xs active' : 'border-black/30 bg-white/70 text-black/60'
      }`;
      const valEl = s.querySelector('.tone-slot-val');
      if (valEl) {
        valEl.className = `tone-slot-val font-black ${isCur ? 'text-[#D97706]' : 'text-black'}`;
      }
    });

    const curTone = this.selectedTones[this.activeCharIndex];
    if (this.dom.toneBtns) {
      this.dom.toneBtns.forEach(b => {
        const t = parseInt(b.getAttribute('data-tone'), 10);
        if (curTone !== null && t === curTone) {
          b.classList.add('tone-selected');
        } else {
          b.classList.remove('tone-selected');
        }
      });
    }
  }

  handleToneSelection(toneIndex) {
    if (!this.activeWord) return;
    this.selectedTones[this.activeCharIndex] = toneIndex;

    const container = this.dom.toneSegmentSlots;
    if (container) {
      const slotVal = container.querySelector(`.tone-slot[data-slot="${this.activeCharIndex}"] .tone-slot-val`);
      if (slotVal) slotVal.textContent = `T${toneIndex}`;
    }

    if (this.dom.toneBtns) {
      this.dom.toneBtns.forEach(b => {
        const t = parseInt(b.getAttribute('data-tone'), 10);
        if (t === toneIndex) {
          b.classList.add('tone-selected');
        } else {
          b.classList.remove('tone-selected');
        }
      });
    }

    const count = this.activeWord.characterCount || this.activeWord.hanzi_simp.length;
    if (count > 1 && this.activeCharIndex < count - 1) {
      setTimeout(() => {
        this.nextChar();
      }, 220);
    }
  }

  // ----------------------------------------------------
  // 6. SCAFFOLDING & CANVAS CONTROLS
  // ----------------------------------------------------
  toggleScaffolding(forcedState) {
    this.isScaffoldOn = (forcedState !== undefined) ? forcedState : !this.isScaffoldOn;
    this.updateScaffoldBtnUI();

    if (this.dom.hanziTargetCanvas) {
      this.dom.hanziTargetCanvas.style.opacity = this.isScaffoldOn ? '1' : '0';
      this.dom.hanziTargetCanvas.style.visibility = this.isScaffoldOn ? 'visible' : 'hidden';
    }

    if (this.activeWriter) {
      if (this.isScaffoldOn) {
        try { this.activeWriter.showOutline(); } catch (_) {}
      } else {
        try { this.activeWriter.hideOutline(); } catch (_) {}
      }
    }

    this.renderCanvasLayers();
    this.saveState();
  }

  updateScaffoldBtnUI() {
    const btn = this.dom.scaffoldToggleBtn;
    if (!btn) return;
    if (this.isScaffoldOn) {
      btn.className = 'scaffold-on flex-1 py-2 sm:py-2.5 px-2.5 sm:px-3 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white border-2 border-black font-mono text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active-collapse cursor-pointer transition-all';
      btn.innerHTML = '<span class="material-symbols-outlined text-base">visibility</span><span>GUIDE: ON</span>';
    } else {
      btn.className = 'scaffold-off flex-1 py-2 sm:py-2.5 px-2.5 sm:px-3 rounded-xl bg-[#18181b] hover:bg-[#27272a] text-white/80 border-2 border-black font-mono text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active-collapse cursor-pointer transition-all';
      btn.innerHTML = '<span class="material-symbols-outlined text-base">visibility_off</span><span>GUIDE: OFF</span>';
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
    this.updateFeedback('neutral', 'Canvas cleared. Draw strokes and select tone.');
  }

  // ----------------------------------------------------
  // 7. 3-ATTEMPT SHIELD & SUBMISSION VALIDATION
  // ----------------------------------------------------
  validateSubmission() {
    if (!this.activeWord) return;

    if (this.getMode() === 'builder') {
      this.validateBuilderSubmission();
      return;
    }

    const count = this.activeWord.characterCount || this.activeWord.hanzi_simp.length;
    const targetTones = this.activeWord.tones || [1];
    const chars = this.activeWord.characters || Array.from(this.activeWord.hanzi_simp || '');

    // 1. Full Character Evaluation with Virtual Spatial Normalization
    const canvasSize = this.getCanvasSize();
    let incompleteCharIdx = -1;

    for (let i = 0; i < count; i++) {
      const matcher = this.charMatchers[i];
      if (!matcher) continue;

      const userStrokes = this.charUserStrokes[i] || [];
      const evalRes = matcher.evaluateFullDrawing(userStrokes, canvasSize);

      if (evalRes.isComplete) {
        this.charRecognized[i] = true;
        this.charSpatialDrift[i] = evalRes.spatialDrift;
      } else {
        this.charRecognized[i] = false;
        if (incompleteCharIdx === -1) {
          incompleteCharIdx = i;
        }
      }
    }

    if (incompleteCharIdx !== -1) {
      // Incomplete Drawing Protocol (Spec §4)
      if (incompleteCharIdx !== this.activeCharIndex) {
        this.setCharIndex(incompleteCharIdx);
      }
      const matcher = this.charMatchers[incompleteCharIdx];
      const missingStroke = matcher ? matcher.getFirstUnclaimedStroke() : null;
      this.flashingStrokeIndex = missingStroke ? missingStroke.index : null;
      this.renderCanvasLayers();
      this.redrawUserStrokes();

      this.attemptsLeft = Math.max(0, this.attemptsLeft - 1);
      this.updateAttemptPips();
      this.shakeElement('drawing-canvas-wrapper');
      this.playActiveWordAudio();

      if (this.attemptsLeft > 0) {
        this.updateFeedback('hanzi-error', `⚠️ Incomplete Drawing: Missing strokes for '${chars[incompleteCharIdx]}'. Draw the highlighted stroke to complete. Tries left: ${this.attemptsLeft}`);
      } else {
        // Attempts exhausted: Graceful Reveal & Re-queue word
        this.updateFeedback('hanzi-error', '❌ Attempts exhausted! Revealing full card solution for review.');
        this.charRecognized[this.activeCharIndex] = true;
        this.snapCharacterToCalligraphy();
        if (this.isReappearanceStage && this.anchorWord) {
          if (!this.hasRetriedAnchor) {
            this.hasRetriedAnchor = true;
            this.reappearanceRetryQueue.push(this.anchorWord);
          }
        }
        setTimeout(() => {
          this.showResultFeedbackPanel(false);
        }, 400);
      }
      return;
    }

    // 2. Verify Tone selection for all characters
    let missingToneIdx = -1;
    for (let i = 0; i < count; i++) {
      if (this.selectedTones[i] === null) {
        missingToneIdx = i;
        break;
      }
    }

    if (missingToneIdx !== -1) {
      this.updateFeedback('tone-error', `⚠️ Tone Missing: Select tone for character ${missingToneIdx + 1} (${chars[missingToneIdx] || ''}).`);
      this.shakeElement('interaction-footer');
      this.setCharIndex(missingToneIdx);
      return;
    }

    // 3. Check Tone Correctness
    let allTonesCorrect = true;
    for (let i = 0; i < count; i++) {
      if (this.selectedTones[i] !== targetTones[i]) {
        allTonesCorrect = false;
        break;
      }
    }

    if (!allTonesCorrect) {
      this.attemptsLeft = Math.max(0, this.attemptsLeft - 1);
      this.updateAttemptPips();
      this.shakeElement('interaction-footer');
      this.playActiveWordAudio();

      if (this.attemptsLeft > 0) {
        this.updateFeedback('tone-error', `❌ Tone Mismatch: Hanzi drawing accepted, but pitch contour is incorrect. Tries left: ${this.attemptsLeft}`);
      } else {
        // Attempts exhausted: Graceful Reveal & Re-queue word
        this.updateFeedback('tone-error', '❌ Attempts exhausted! Revealing full card solution for review.');
        this.charRecognized[this.activeCharIndex] = true;
        this.snapCharacterToCalligraphy();
        if (this.isReappearanceStage && this.anchorWord) {
          if (!this.hasRetriedAnchor) {
            this.hasRetriedAnchor = true;
            this.reappearanceRetryQueue.push(this.anchorWord);
          }
        }
        setTimeout(() => {
          this.showResultFeedbackPanel(false);
        }, 400);
      }
      return;
    }

    // 4. MASTERED (Both Drawing Complete and All Tones Correct!)
    this.updateFeedback('correct', `🎉 Correct! Verified character strokes and confirmed tone (${targetTones.join(', ')}).`);
    this.charRecognized[this.activeCharIndex] = true;
    this.snapCharacterToCalligraphy();

    if (this.isReappearanceStage && this.anchorWord) {
      const pData = this.state.phases[this.activePhase];
      if (!pData.completedWordIds.includes(this.anchorWord.id)) {
        pData.completedWordIds.push(this.anchorWord.id);
        this.saveState();
        this.updateProgressBar();
      }
    }

    setTimeout(() => {
      this.showResultFeedbackPanel(true);
    }, 350);
  }

  validateBuilderSubmission() {
    if (!this.activeWord) return;

    const count = this.activeWord.characterCount || this.activeWord.hanzi_simp.length;
    const targetTones = this.activeWord.tones || [1];
    const chars = this.activeWord.characters || Array.from(this.activeWord.hanzi_simp || '');

    // 1. Evaluate Component Placement via Relative Spatial Topology
    const evalResult = this.componentBuilder ? this.componentBuilder.evaluateActivePlacement() : { success: false, reason: 'ENGINE_NOT_READY' };

    if (!evalResult.success) {
      this.attemptsLeft = Math.max(0, this.attemptsLeft - 1);
      this.updateAttemptPips();
      this.shakeElement('open-placement-canvas');
      this.playActiveWordAudio();

      if (this.attemptsLeft > 0) {
        if (evalResult.reason === 'NO_COMPONENTS') {
          this.updateFeedback('hanzi-error', `⚠️ Place components on the canvas to build the character. Tries left: ${this.attemptsLeft}`);
        } else if (evalResult.reason === 'WRONG_COMPONENTS') {
          this.updateFeedback('hanzi-error', `⚠️ Check the components: select the correct parts needed for this word. Tries left: ${this.attemptsLeft}`);
        } else if (evalResult.reason === 'MISPLACED_CHARACTERS') {
          this.updateFeedback('hanzi-error', `⚠️ Character order: arrange the characters in reading order from left to right. Tries left: ${this.attemptsLeft}`);
        } else {
          this.updateFeedback('hanzi-error', `⚠️ Components misplaced: adjust their positions according to the character structure. Tries left: ${this.attemptsLeft}`);
        }
      } else {
        // Attempts exhausted: Graceful Reveal & Re-queue word
        this.updateFeedback('hanzi-error', '❌ Attempts exhausted! Revealing full card solution for review.');
        if (this.isReappearanceStage && this.anchorWord) {
          if (!this.hasRetriedAnchor) {
            this.hasRetriedAnchor = true;
            this.reappearanceRetryQueue.push(this.anchorWord);
          }
        }
        setTimeout(() => {
          this.showResultFeedbackPanel(false);
        }, 400);
      }
      return;
    }

    // 2. Verify Tone selection for all characters
    let missingToneIdx = -1;
    for (let i = 0; i < count; i++) {
      if (this.selectedTones[i] === null) {
        missingToneIdx = i;
        break;
      }
    }

    if (missingToneIdx !== -1) {
      this.updateFeedback('tone-error', `⚠️ Tone Missing: Select tone for character ${missingToneIdx + 1} (${chars[missingToneIdx] || ''}).`);
      this.shakeElement('interaction-footer');
      this.setCharIndex(missingToneIdx);
      return;
    }

    // 3. Check Tone Correctness
    let allTonesCorrect = true;
    for (let i = 0; i < count; i++) {
      if (this.selectedTones[i] !== targetTones[i]) {
        allTonesCorrect = false;
        break;
      }
    }

    if (!allTonesCorrect) {
      this.attemptsLeft = Math.max(0, this.attemptsLeft - 1);
      this.updateAttemptPips();
      this.shakeElement('interaction-footer');
      this.playActiveWordAudio();

      if (this.attemptsLeft > 0) {
        this.updateFeedback('tone-error', `❌ Tone Mismatch: Components correctly assembled, but pitch contour is incorrect. Tries left: ${this.attemptsLeft}`);
      } else {
        // Attempts exhausted: Graceful Reveal & Re-queue word
        this.updateFeedback('tone-error', '❌ Attempts exhausted! Revealing full card solution for review.');
        if (this.isReappearanceStage && this.anchorWord) {
          if (!this.hasRetriedAnchor) {
            this.hasRetriedAnchor = true;
            this.reappearanceRetryQueue.push(this.anchorWord);
          }
        }
        setTimeout(() => {
          this.showResultFeedbackPanel(false);
        }, 400);
      }
      return;
    }

    // 4. MASTERED (Both Component Assembly and All Tones Correct!)
    this.updateFeedback('correct', `🎉 Correct! Verified component assembly and confirmed tone (${targetTones.join(', ')}).`);

    if (this.isReappearanceStage && this.anchorWord) {
      const pData = this.state.phases[this.activePhase];
      if (!pData.completedWordIds.includes(this.anchorWord.id)) {
        pData.completedWordIds.push(this.anchorWord.id);
        this.saveState();
        this.updateProgressBar();
      }
    }

    if (this.componentBuilder) {
      this.componentBuilder.playCrystallizationAnimation(() => {
        this.showResultFeedbackPanel(true);
      });
    } else {
      setTimeout(() => {
        this.showResultFeedbackPanel(true);
      }, 350);
    }
  }

  showResultFeedbackPanel(isMastered) {
    if (!this.activeWord) return;

    const targetTones = this.activeWord.tones || [1];
    const matcher = this.charMatchers[this.activeCharIndex] || this.charMatchers[0];
    const userStrokes = this.charUserStrokes[this.activeCharIndex] || this.userDrawnStrokes || [];
    const spatialDrift = (this.charSpatialDrift && this.charSpatialDrift[this.activeCharIndex]) || null;
    const classification = classifyDrawing(matcher, userStrokes, spatialDrift);

    // 1. Populate Word Result Header
    if (this.dom.resultHanzi) this.dom.resultHanzi.textContent = this.activeWord.hanzi_simp;
    if (this.dom.resultPinyin) this.dom.resultPinyin.textContent = this.activeWord.pinyin;
    if (this.dom.resultToneBadge) {
      this.dom.resultToneBadge.textContent = 'Tone ' + targetTones.join(', ');
    }
    if (this.dom.resultMeaning) this.dom.resultMeaning.textContent = this.activeWord.english;
    if (this.dom.resultDecomposition) {
      this.dom.resultDecomposition.textContent = this.activeWord.radical_decomposition || 'Indivisible root';
    }

    // 2. Populate Drawing / Assembly Feedback (FIRST)
    if (this.dom.drawingTierBadge && this.dom.drawingFeedbackText && this.dom.feedbackDrawingCard) {
      if (this.getMode() === 'builder') {
        if (isMastered) {
          this.dom.drawingTierBadge.className = 'px-2 py-0.5 rounded-full font-black text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-600';
          this.dom.drawingTierBadge.textContent = '🎯 Perfect Assembly!';
          this.dom.feedbackDrawingCard.className = 'w-full rounded-xl p-3 border-2 transition-all font-mono text-xs shadow-xs bg-emerald-50 border-emerald-500 text-emerald-950 flex flex-col gap-1.5';
          if (this.dom.drawingFeedbackIcon) {
            this.dom.drawingFeedbackIcon.className = 'material-symbols-outlined text-emerald-600 text-base';
            this.dom.drawingFeedbackIcon.textContent = 'verified';
          }
          this.dom.drawingFeedbackText.textContent = 'All components placed in exact topological positions.';
          if (this.dom.resultDemoOrderBtn) this.dom.resultDemoOrderBtn.classList.add('hidden');
        } else {
          this.dom.drawingTierBadge.className = 'px-2 py-0.5 rounded-full font-black text-[10px] bg-amber-100 text-amber-900 border border-amber-600';
          this.dom.drawingTierBadge.textContent = '📖 Review Mode';
          this.dom.feedbackDrawingCard.className = 'w-full rounded-xl p-3 border-2 transition-all font-mono text-xs shadow-xs bg-amber-50 border-amber-500 text-amber-950 flex flex-col gap-1.5';
          if (this.dom.drawingFeedbackIcon) {
            this.dom.drawingFeedbackIcon.className = 'material-symbols-outlined text-amber-600 text-base';
            this.dom.drawingFeedbackIcon.textContent = 'auto_stories';
          }
          this.dom.drawingFeedbackText.textContent = 'All 3 attempts used. Take note of the component structure shown above.';
          if (this.dom.resultDemoOrderBtn) this.dom.resultDemoOrderBtn.classList.add('hidden');
        }
      } else if (isMastered) {
        if (classification.tier === 'TIER_1_CLEAN_PASS') {
          this.dom.drawingTierBadge.className = 'px-2 py-0.5 rounded-full font-black text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-600';
          this.dom.drawingTierBadge.textContent = '🎯 Perfect Form!';
          this.dom.feedbackDrawingCard.className = 'w-full rounded-xl p-3 border-2 transition-all font-mono text-xs shadow-xs bg-emerald-50 border-emerald-500 text-emerald-950 flex flex-col gap-1.5';
          if (this.dom.drawingFeedbackIcon) {
            this.dom.drawingFeedbackIcon.className = 'material-symbols-outlined text-emerald-600 text-base';
            this.dom.drawingFeedbackIcon.textContent = 'verified';
          }
          this.dom.drawingFeedbackText.textContent = classification.detail;
          if (this.dom.resultDemoOrderBtn) this.dom.resultDemoOrderBtn.classList.add('hidden');

          // Tier 1 Radiant green perimeter pulse
          if (this.dom.drawingCanvasWrapper) {
            this.dom.drawingCanvasWrapper.style.boxShadow = '0 0 16px rgba(34, 197, 94, 0.45)';
            setTimeout(() => {
              if (this.dom.drawingCanvasWrapper) this.dom.drawingCanvasWrapper.style.boxShadow = '';
            }, 1800);
          }
        } else {
          // Tier 2 Soft Pass (order drift or tolerance)
          this.dom.drawingTierBadge.className = 'px-2 py-0.5 rounded-full font-black text-[10px] bg-blue-100 text-blue-800 border border-blue-500';
          this.dom.drawingTierBadge.textContent = classification.badge;
          this.dom.feedbackDrawingCard.className = 'w-full rounded-xl p-3 border-2 transition-all font-mono text-xs shadow-xs bg-blue-50 border-blue-400 text-blue-950 flex flex-col gap-1.5';
          if (this.dom.drawingFeedbackIcon) {
            this.dom.drawingFeedbackIcon.className = 'material-symbols-outlined text-blue-600 text-base';
            this.dom.drawingFeedbackIcon.textContent = 'lightbulb';
          }
          this.dom.drawingFeedbackText.textContent = classification.detail;
          if (this.dom.resultDemoOrderBtn) {
            if (classification.showOrderReplay) {
              this.dom.resultDemoOrderBtn.classList.remove('hidden');
            } else {
              this.dom.resultDemoOrderBtn.classList.add('hidden');
            }
          }
        }
      } else {
        // Failed / Attempts exhausted
        this.dom.drawingTierBadge.className = 'px-2 py-0.5 rounded-full font-black text-[10px] bg-amber-100 text-amber-900 border border-amber-600';
        this.dom.drawingTierBadge.textContent = '📖 Review Mode';
        this.dom.feedbackDrawingCard.className = 'w-full rounded-xl p-3 border-2 transition-all font-mono text-xs shadow-xs bg-amber-50 border-amber-500 text-amber-950 flex flex-col gap-1.5';
        if (this.dom.drawingFeedbackIcon) {
          this.dom.drawingFeedbackIcon.className = 'material-symbols-outlined text-amber-600 text-base';
          this.dom.drawingFeedbackIcon.textContent = 'auto_stories';
        }
        this.dom.drawingFeedbackText.textContent = 'All 3 attempts used. Take note of the idealized stroke order shown above.';
        if (this.dom.resultDemoOrderBtn) this.dom.resultDemoOrderBtn.classList.remove('hidden');
      }
    }

    // 3. Populate Tone Feedback (BELOW DRAWING)
    if (this.dom.toneVerdictBadge && this.dom.toneFeedbackText && this.dom.feedbackToneCard) {
      const toneContours = {
        1: '1st Tone (55 High Flat)',
        2: '2nd Tone (35 Rising)',
        3: '3rd Tone (214 Dipping)',
        4: '4th Tone (51 Falling)',
        5: 'Neutral Tone'
      };

      let toneMatched = true;
      for (let i = 0; i < targetTones.length; i++) {
        if (this.selectedTones[i] !== targetTones[i]) {
          toneMatched = false;
          break;
        }
      }

      if (toneMatched) {
        this.dom.toneVerdictBadge.className = 'px-2 py-0.5 rounded-full font-black text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-600';
        this.dom.toneVerdictBadge.textContent = '✓ Tone Correct';
        this.dom.feedbackToneCard.className = 'w-full rounded-xl p-3 border-2 transition-all font-mono text-xs shadow-xs bg-emerald-50 border-emerald-500 text-emerald-950 flex flex-col gap-1.5';
        if (this.dom.toneFeedbackIcon) {
          this.dom.toneFeedbackIcon.className = 'material-symbols-outlined text-emerald-600 text-base';
          this.dom.toneFeedbackIcon.textContent = 'check_circle';
        }
        const desc = targetTones.map(t => toneContours[t] || `Tone ${t}`).join(' • ');
        this.dom.toneFeedbackText.textContent = `${desc} confirmed.`;
      } else {
        this.dom.toneVerdictBadge.className = 'px-2 py-0.5 rounded-full font-black text-[10px] bg-rose-100 text-rose-900 border border-rose-600';
        this.dom.toneVerdictBadge.textContent = '✗ Tone Mismatch';
        this.dom.feedbackToneCard.className = 'w-full rounded-xl p-3 border-2 transition-all font-mono text-xs shadow-xs bg-rose-50 border-rose-500 text-rose-950 flex flex-col gap-1.5';
        if (this.dom.toneFeedbackIcon) {
          this.dom.toneFeedbackIcon.className = 'material-symbols-outlined text-rose-600 text-base';
          this.dom.toneFeedbackIcon.textContent = 'error';
        }
        const userTones = this.selectedTones.map(t => t !== null ? `T${t}` : '?').join(', ');
        const expTones = targetTones.map(t => `T${t} (${toneContours[t] || ''})`).join(', ');
        this.dom.toneFeedbackText.textContent = `Selected: ${userTones} — Expected: ${expTones}`;
      }
    }

    // 4. Update Next Word Button label
    if (this.dom.resultNextBtnText) {
      this.dom.resultNextBtnText.textContent = isMastered ? 'NEXT WORD' : 'NEXT WORD (REVIEW LATER)';
    }

    // 5. Hide Exercise Input Panels, Show Result Panel
    if (this.dom.promptArena) this.dom.promptArena.classList.add('hidden');
    if (this.dom.interactionFooter) this.dom.interactionFooter.classList.add('hidden');
    if (this.dom.resultFeedbackPanel) this.dom.resultFeedbackPanel.classList.remove('hidden');

    // 6. Mobile viewport auto-scroll: smoothly center/focus the feedback
    if (window.innerWidth < 1024 && this.dom.resultFeedbackPanel) {
      setTimeout(() => {
        this.dom.resultFeedbackPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
    }
  }

  shakeElement(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('shake-error');
    void el.offsetWidth;
    el.classList.add('shake-error');
  }

  updateAttemptPips() {
    const pipsEl = this.dom.attemptPips;
    if (!pipsEl) return;
    if (this.attemptsLeft === 3) {
      pipsEl.innerHTML = '<span class="pip text-[#D97706]">●</span><span class="pip text-[#D97706]">●</span><span class="pip text-[#D97706]">●</span>';
    } else if (this.attemptsLeft === 2) {
      pipsEl.innerHTML = '<span class="pip text-[#D97706]">●</span><span class="pip text-[#D97706]">●</span><span class="pip text-black/30">○</span>';
    } else if (this.attemptsLeft === 1) {
      pipsEl.innerHTML = '<span class="pip text-red-500 animate-pulse">●</span><span class="pip text-black/30">○</span><span class="pip text-black/30">○</span>';
    } else {
      pipsEl.innerHTML = '<span class="pip text-black/30">○</span><span class="pip text-black/30">○</span><span class="pip text-black/30">○</span>';
    }
  }

  updateFeedback(status, message) {
    const banner = this.dom.feedbackBanner;
    const text = this.dom.feedbackText;
    const icon = this.dom.feedbackIcon;
    if (!banner || !text) return;

    text.textContent = message;
    banner.className = 'order-3 lg:order-3 w-full rounded-xl p-2.5 sm:p-3 border-2 transition-all font-mono text-xs font-bold shadow-xs flex items-center gap-2.5';

    if (status === 'hanzi-error') {
      banner.classList.add('bg-amber-50', 'border-amber-500', 'text-amber-950');
      if (icon) {
        icon.className = 'material-symbols-outlined text-amber-600 text-lg shrink-0';
        icon.textContent = 'draw';
      }
    } else if (status === 'tone-error') {
      banner.classList.add('bg-rose-50', 'border-rose-500', 'text-rose-950');
      if (icon) {
        icon.className = 'material-symbols-outlined text-rose-600 text-lg shrink-0';
        icon.textContent = 'music_off';
      }
    } else if (status === 'correct') {
      banner.classList.add('bg-emerald-50', 'border-emerald-600', 'text-emerald-950');
      if (icon) {
        icon.className = 'material-symbols-outlined text-emerald-600 text-lg shrink-0';
        icon.textContent = 'check_circle';
      }
    } else {
      banner.classList.add('bg-white', 'border-black/20', 'text-black/70');
      if (icon) {
        icon.className = 'material-symbols-outlined text-black/50 text-lg shrink-0';
        icon.textContent = 'lightbulb';
      }
    }
  }

  // ----------------------------------------------------
  // 8. MODAL CONTROLLERS & QUEUE ADVANCEMENT
  // ----------------------------------------------------
  openRevealModal(isMastered) {
    const modal = this.dom.cardRevealModal;
    const word = this.activeWord;
    if (!modal || !word) return;

    if (this.dom.revealModalBadge) {
      if (isMastered) {
        this.dom.revealModalBadge.className = 'font-mono text-xs font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-600 px-2.5 py-0.5 rounded-full flex items-center gap-1';
        this.dom.revealModalBadge.innerHTML = '🎉 正确 (CORRECT!)';
      } else {
        this.dom.revealModalBadge.className = 'font-mono text-xs font-black uppercase bg-amber-100 text-amber-900 border border-amber-600 px-2.5 py-0.5 rounded-full flex items-center gap-1';
        this.dom.revealModalBadge.innerHTML = '📖 答案解析 (REVIEW)';
      }
    }

    if (this.dom.revealHanzi) this.dom.revealHanzi.textContent = word.hanzi_simp;
    if (this.dom.revealPinyin) {
      const toneDesc = (word.tones || []).map(t => `Tone ${t}`).join(', ');
      this.dom.revealPinyin.textContent = `${word.pinyin} (${toneDesc})`;
    }
    if (this.dom.revealMeaning) this.dom.revealMeaning.textContent = word.english;
    if (this.dom.revealDecomposition) this.dom.revealDecomposition.textContent = word.radical_decomposition || 'Indivisible root';
    if (this.dom.revealSentenceHanzi) this.dom.revealSentenceHanzi.textContent = word.sentence_hanzi || '';
    if (this.dom.revealSentenceEn) this.dom.revealSentenceEn.textContent = word.sentence_english ? `"${word.sentence_english}"` : '';

    modal.classList.remove('hidden');
  }

  advanceToNextWord() {
    if (this.isReappearanceStage) {
      // Reappearance stage completed
      if (this.reappearanceRetryQueue && this.reappearanceRetryQueue.length > 0) {
        const retryWord = this.reappearanceRetryQueue.shift();
        this.anchorWord = retryWord;
        this.isReappearanceStage = true;
        this.loadWord(this.anchorWord);
      } else {
        // Cemented anchor word! Begin next cycle
        this.isReappearanceStage = false;
        this.loadBatchForActivePhase();
      }
    } else {
      // Introductory stage
      this.wordsSinceAnchor++;
      this.cycleIndex++;
      if (this.cycleIndex < this.cycleWords.length) {
        this.loadWord(this.cycleWords[this.cycleIndex]);
      } else {
        // Cycle introductory pass finished -> delayed reappearance of anchor word with Guide OFF
        this.isReappearanceStage = true;
        this.loadWord(this.anchorWord);
      }
    }
  }

  triggerPhaseCompleteModal() {
    const modal = this.dom.phaseCompleteModal;
    if (!modal) return;

    const words = this.phaseWordsMap[this.activePhase] || [];
    if (this.dom.phaseCompleteTitle) {
      this.dom.phaseCompleteTitle.textContent = `🎉 Phase ${this.activePhase} Complete!`;
    }
    if (this.dom.phaseCompleteSummary) {
      this.dom.phaseCompleteSummary.textContent = `You have mastered all ${words.length} vocabulary words in this phase.`;
    }
    if (this.dom.advancePhaseBtn) {
      if (this.activePhase < 5) {
        this.dom.advancePhaseBtn.innerHTML = `<span>Advance to Phase ${this.activePhase + 1}</span><span class="material-symbols-outlined text-base">arrow_forward</span>`;
        this.dom.advancePhaseBtn.classList.remove('hidden');
      } else {
        this.dom.advancePhaseBtn.classList.add('hidden');
      }
    }
    modal.classList.remove('hidden');
  }

  advanceToNextPhase() {
    if (this.activePhase < 5) {
      this.switchPhase(this.activePhase + 1);
    }
  }

  playActiveWordAudio() {
    if (!this.activeWord || !this.activeWord.audio) return;
    try {
      // Cease any currently playing audio track before starting a new one
      this.stopAudio();

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
  }
}

// Export singleton instance and mount on window
export const WordTrainerEngine = new WordTrainerEngineController();
if (typeof window !== 'undefined') {
  window.WordTrainerEngine = WordTrainerEngine;
}
