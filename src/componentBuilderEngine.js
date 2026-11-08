/**
 * componentBuilderEngine.js
 * Core Engine & Evaluation Algorithms for the Word Trainer Component Builder Mode ("拼字 / 构").
 *
 * Implements:
 * - Alternative A: Multi-tier Radical Decomposition (indivisible ATOMIC, binary compounds,
 *   and 3-tier stacks: TOP_MID_BOTTOM like 茶, and LEFT_MID_RIGHT like 谢).
 * - Relative Spatial Topology (RST) Grading strictly evaluated upon user submission.
 * - Single-canvas multi-character word flow: zero visible divider lines, spatial clustering along X-axis,
 *   left-to-right character reading order validation.
 * - Freeform Drag-and-Drop state machine via Pointer Events with pure typography glyph rendering.
 * - Dock population with active word targets + balanced distractors.
 * - Crystallization animation upon verified assembly.
 */

// Optical Stroke Harmonization Glyph Lists (Matching UI Engineer's CSS)
const OUTER_FRAME_GLYPHS = ['门', '門', '囗', '冂', '凵', '匚', '匸', '广', '厂', '户', '戶', '勹', '弋', '戈', '气', '辶', '⻌', '⻍', '廴'];
const INNER_CAVITY_GLYPHS = ['口', '丶', '日', '月', '木', '寸', '子', '心', '人', '小', '十', '一', '土', '王'];

/**
 * Returns optical classification for radical weight harmonization.
 */
export function getComponentType(glyph) {
  if (OUTER_FRAME_GLYPHS.includes(glyph)) return 'outer-frame';
  if (['口', '丶'].includes(glyph)) return 'inner-cavity';
  return 'standard';
}

/**
 * Returns appropriate font-weight preserving typography balance.
 */
export function getComponentFontWeight(glyph) {
  const type = getComponentType(glyph);
  if (type === 'outer-frame') return '300';
  if (type === 'inner-cavity') return '700';
  return '500';
}

/**
 * Calculates responsive component font size based on canvas dimensions and character count.
 */
export function getComponentFontSize(glyph, canvasDim = 340, charCount = 1) {
  let scale = 1.0;
  if (charCount === 2) scale = 0.58;
  if (charCount === 3) scale = 0.40;
  if (charCount >= 4) scale = 0.32;

  if (glyph === '口') {
    return Math.round(canvasDim * 0.28 * scale);
  }
  if (glyph === '丶') {
    return Math.round(canvasDim * 0.20 * scale);
  }
  if (OUTER_FRAME_GLYPHS.includes(glyph)) {
    return Math.round(canvasDim * 0.58 * scale);
  }
  if (glyph === '亻' || glyph === '主') {
    return Math.round(canvasDim * 0.54 * scale);
  }
  return Math.round(canvasDim * 0.52 * scale);
}

// ----------------------------------------------------
// 1. RELATIVE SPATIAL TOPOLOGY (RST) EVALUATOR
// ----------------------------------------------------

/**
 * Evaluates a single character's placed components against its target decomposition.
 *
 * @param {Array} placedComponents - Array of placed objects: { glyph, x, y, width, height, centerX, centerY }
 * @param {Object} targetDecomposition - Decomposition schema { char, topology, targetComponents, distractors }
 * @param {number} canvasDim - Reference canvas dimension (default: 320)
 * @returns {Object} { success: boolean, reason: string }
 */
export function evaluateSingleCharacterPlacement(placedComponents, targetDecomposition, canvasDim = 320) {
  if (!targetDecomposition || !targetDecomposition.targetComponents) {
    return { success: false, reason: 'INVALID_DECOMPOSITION' };
  }

  const { topology, targetComponents } = targetDecomposition;

  // 1. Verify component count & exact multiset match of glyphs
  const targetGlyphs = targetComponents.map(c => c.glyph).slice().sort();
  const placedGlyphs = placedComponents.map(c => c.glyph).slice().sort();

  if (targetGlyphs.length !== placedGlyphs.length) {
    return { success: false, reason: 'WRONG_COMPONENTS' };
  }

  for (let i = 0; i < targetGlyphs.length; i++) {
    if (targetGlyphs[i] !== placedGlyphs[i]) {
      return { success: false, reason: 'WRONG_COMPONENTS' };
    }
  }

  // Helper to normalize geometry properties
  const normalized = placedComponents.map(c => {
    const w = c.width || 60;
    const h = c.height || 60;
    const cx = c.centerX !== undefined ? c.centerX : (c.x + w * 0.5);
    const cy = c.centerY !== undefined ? c.centerY : (c.y + h * 0.5);
    return { ...c, width: w, height: h, centerX: cx, centerY: cy };
  });

  // 2. Evaluate topology
  switch (topology) {
    case 'ATOMIC': {
      // Indivisible single-root character (e.g. 日, 月, 人, 木)
      return { success: true, reason: 'OK' };
    }

    case 'LEFT_RIGHT': {
      // Binary horizontal compound (e.g. 住 -> 亻 + 主, 妈 -> 女 + 马)
      const leftTarget = targetComponents.find(t => t.role === 'left') || targetComponents[0];
      const rightTarget = targetComponents.find(t => t.role === 'right') || targetComponents[1];

      let leftComp, rightComp;
      if (leftTarget.glyph === rightTarget.glyph) {
        // Duplicate glyphs (e.g. 林 -> 木 + 木): sort by centerX
        const sorted = normalized.slice().sort((a, b) => a.centerX - b.centerX);
        leftComp = sorted[0];
        rightComp = sorted[1];
      } else {
        leftComp = normalized.find(c => c.glyph === leftTarget.glyph);
        rightComp = normalized.find(c => c.glyph === rightTarget.glyph);
      }

      if (!leftComp || !rightComp) return { success: false, reason: 'WRONG_COMPONENTS' };

      const isLeft = leftComp.centerX < rightComp.centerX;
      const yDelta = Math.abs(leftComp.centerY - rightComp.centerY);
      const isAlignedY = yDelta <= canvasDim * 0.38; // Generous 38% vertical drift tolerance

      return {
        success: isLeft && isAlignedY,
        reason: (isLeft && isAlignedY) ? 'OK' : 'MISPLACED_LEFT_RIGHT'
      };
    }

    case 'TOP_BOTTOM': {
      // Binary vertical compound (e.g. 早 -> 日 + 十, 字 -> 宀 + 子)
      const topTarget = targetComponents.find(t => t.role === 'top') || targetComponents[0];
      const bottomTarget = targetComponents.find(t => t.role === 'bottom') || targetComponents[1];

      let topComp, bottomComp;
      if (topTarget.glyph === bottomTarget.glyph) {
        // Duplicate glyphs (e.g. 多 -> 夕 + 夕): sort by centerY
        const sorted = normalized.slice().sort((a, b) => a.centerY - b.centerY);
        topComp = sorted[0];
        bottomComp = sorted[1];
      } else {
        topComp = normalized.find(c => c.glyph === topTarget.glyph);
        bottomComp = normalized.find(c => c.glyph === bottomTarget.glyph);
      }

      if (!topComp || !bottomComp) return { success: false, reason: 'WRONG_COMPONENTS' };

      const isTop = topComp.centerY < bottomComp.centerY;
      const xDelta = Math.abs(topComp.centerX - bottomComp.centerX);
      const isAlignedX = xDelta <= canvasDim * 0.38;

      return {
        success: isTop && isAlignedX,
        reason: (isTop && isAlignedX) ? 'OK' : 'MISPLACED_TOP_BOTTOM'
      };
    }

    case 'TOP_MID_BOTTOM': {
      // Alternative A: 3-tier vertical stack (e.g. 茶 -> 艹 + 人 + 木, 桌 -> 卜 + 日 + 木, 意 -> 立 + 日 + 心)
      const topTarget = targetComponents.find(t => t.role === 'top');
      const midTarget = targetComponents.find(t => t.role === 'mid');
      const bottomTarget = targetComponents.find(t => t.role === 'bottom');

      const topComp = normalized.find(c => c.glyph === topTarget.glyph);
      const midComp = normalized.find(c => c.glyph === midTarget.glyph);
      const bottomComp = normalized.find(c => c.glyph === bottomTarget.glyph);

      if (!topComp || !midComp || !bottomComp) return { success: false, reason: 'WRONG_COMPONENTS' };

      const isOrderCorrect = (topComp.centerY < midComp.centerY) && (midComp.centerY < bottomComp.centerY);
      const isAlignedX = (Math.abs(topComp.centerX - midComp.centerX) <= canvasDim * 0.38) &&
                         (Math.abs(midComp.centerX - bottomComp.centerX) <= canvasDim * 0.38) &&
                         (Math.abs(topComp.centerX - bottomComp.centerX) <= canvasDim * 0.42);

      return {
        success: isOrderCorrect && isAlignedX,
        reason: (isOrderCorrect && isAlignedX) ? 'OK' : 'MISPLACED_TOP_MID_BOTTOM'
      };
    }

    case 'LEFT_MID_RIGHT': {
      // Alternative A: 3-tier horizontal stack (e.g. 谢 -> 讠 + 身 + 寸, 做 -> 亻 + 古 + 攵, 树 -> 木 + 又 + 寸)
      const leftTarget = targetComponents.find(t => t.role === 'left');
      const midTarget = targetComponents.find(t => t.role === 'mid');
      const rightTarget = targetComponents.find(t => t.role === 'right');

      let leftComp, midComp, rightComp;
      if (leftTarget.glyph === rightTarget.glyph) {
        // e.g. 班 -> 王 + 刀 + 王: sort 王 by centerX
        const wangComps = normalized.filter(c => c.glyph === leftTarget.glyph).sort((a, b) => a.centerX - b.centerX);
        leftComp = wangComps[0];
        rightComp = wangComps[1];
        midComp = normalized.find(c => c.glyph === midTarget.glyph);
      } else {
        leftComp = normalized.find(c => c.glyph === leftTarget.glyph);
        midComp = normalized.find(c => c.glyph === midTarget.glyph);
        rightComp = normalized.find(c => c.glyph === rightTarget.glyph);
      }

      if (!leftComp || !midComp || !rightComp) return { success: false, reason: 'WRONG_COMPONENTS' };

      const isOrderCorrect = (leftComp.centerX < midComp.centerX) && (midComp.centerX < rightComp.centerX);
      const isAlignedY = (Math.abs(leftComp.centerY - midComp.centerY) <= canvasDim * 0.38) &&
                         (Math.abs(midComp.centerY - rightComp.centerY) <= canvasDim * 0.38) &&
                         (Math.abs(leftComp.centerY - rightComp.centerY) <= canvasDim * 0.42);

      return {
        success: isOrderCorrect && isAlignedY,
        reason: (isOrderCorrect && isAlignedY) ? 'OK' : 'MISPLACED_LEFT_MID_RIGHT'
      };
    }

    case 'ENCLOSURE': {
      // Full/semi-enclosure (e.g. 问 -> 门 + 口, 国 -> 囗 + 玉, 医 -> 匚 + 矢, 店 -> 广 + 占, 过 -> 辶 + 寸)
      const outerTarget = targetComponents.find(t => t.role === 'outer') || targetComponents[0];
      const innerTarget = targetComponents.find(t => t.role === 'inner') || targetComponents[1];

      const outerComp = normalized.find(c => c.glyph === outerTarget.glyph);
      const innerComp = normalized.find(c => c.glyph === innerTarget.glyph);

      if (!outerComp || !innerComp) return { success: false, reason: 'WRONG_COMPONENTS' };

      // Inner component sits within cavity of outer component with generous boundary margins
      const isInsideX = (innerComp.centerX >= outerComp.x - 30) &&
                        (innerComp.centerX <= outerComp.x + outerComp.width + 30);
      const isInsideY = (innerComp.centerY >= outerComp.y - 15) &&
                        (innerComp.centerY <= outerComp.y + outerComp.height + 40);

      return {
        success: isInsideX && isInsideY,
        reason: (isInsideX && isInsideY) ? 'OK' : 'MISPLACED_ENCLOSURE'
      };
    }

    case 'CROSSING': {
      // Overlaid/marker compounds (e.g. 太 -> 大 + 丶, 本 -> 木 + 一, 天 -> 一 + 大)
      const baseTarget = targetComponents.find(t => t.role === 'base') || targetComponents[0];
      const markerTarget = targetComponents.find(t => t.role === 'marker') || targetComponents[1];

      const baseComp = normalized.find(c => c.glyph === baseTarget.glyph);
      const markerComp = normalized.find(c => c.glyph === markerTarget.glyph);

      if (!baseComp || !markerComp) return { success: false, reason: 'WRONG_COMPONENTS' };

      const isAlignedX = Math.abs(baseComp.centerX - markerComp.centerX) <= canvasDim * 0.40;
      const isAlignedY = Math.abs(baseComp.centerY - markerComp.centerY) <= canvasDim * 0.45;

      return {
        success: isAlignedX && isAlignedY,
        reason: (isAlignedX && isAlignedY) ? 'OK' : 'MISPLACED_CROSSING'
      };
    }

    default:
      return { success: false, reason: 'UNKNOWN_TOPOLOGY' };
  }
}

/**
 * Universal Relative Spatial Topology Evaluator.
 * Supports both single-character and multi-character words on a single unified canvas
 * without visible dividers.
 *
 * @param {Array} placedComponents - Array of placed objects
 * @param {Object|Array} targetDecompositions - Single decomposition or array of decompositions per character
 * @param {number} canvasDim - Canvas dimension in pixels
 * @returns {Object} { success: boolean, reason: string, details?: Array }
 */
export function evaluatePlacement(placedComponents, targetDecompositions, canvasDim = 320) {
  if (!placedComponents || placedComponents.length === 0) {
    return { success: false, reason: 'NO_COMPONENTS' };
  }

  const decomps = Array.isArray(targetDecompositions) ? targetDecompositions : [targetDecompositions];
  const charCount = decomps.length;

  // Single-Character Fast Path
  if (charCount === 1) {
    return evaluateSingleCharacterPlacement(placedComponents, decomps[0], canvasDim);
  }

  // Multi-Character Word on Single Canvas:
  // 1. Verify total expected components across all characters
  const totalExpected = decomps.reduce((sum, d) => sum + d.targetComponents.length, 0);
  if (placedComponents.length !== totalExpected) {
    return { success: false, reason: 'WRONG_COMPONENTS' };
  }

  // 2. Multiset match across all targets vs placed
  const allTargetGlyphs = decomps.flatMap(d => d.targetComponents.map(c => c.glyph)).sort();
  const allPlacedGlyphs = placedComponents.map(c => c.glyph).slice().sort();

  for (let i = 0; i < allTargetGlyphs.length; i++) {
    if (allTargetGlyphs[i] !== allPlacedGlyphs[i]) {
      return { success: false, reason: 'WRONG_COMPONENTS' };
    }
  }

  // 3. Normalized coordinates
  const normalized = placedComponents.map(c => {
    const w = c.width || 60;
    const h = c.height || 60;
    const cx = c.centerX !== undefined ? c.centerX : (c.x + w * 0.5);
    const cy = c.centerY !== undefined ? c.centerY : (c.y + h * 0.5);
    return { ...c, width: w, height: h, centerX: cx, centerY: cy };
  });

  // 4. Cluster placed components into K character groups along the X-axis
  // Chinese text reads strictly Left-to-Right: Char 1 mean(X) < Char 2 mean(X) < ...
  // Sort all components by centerX ascending
  const sortedByX = normalized.slice().sort((a, b) => a.centerX - b.centerX);

  // Strategy: Group components by partitioning sortedByX according to each character's component count
  const charBuckets = [];
  let cursor = 0;
  for (let k = 0; k < charCount; k++) {
    const count = decomps[k].targetComponents.length;
    charBuckets.push(sortedByX.slice(cursor, cursor + count));
    cursor += count;
  }

  // Check if partition matches each character's target glyph set
  let partitionValid = true;
  for (let k = 0; k < charCount; k++) {
    const expected = decomps[k].targetComponents.map(c => c.glyph).sort();
    const actual = charBuckets[k].map(c => c.glyph).sort();
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      partitionValid = false;
      break;
    }
  }

  // If simple count split failed, attempt optimal set assignment based on target glyphs
  if (!partitionValid) {
    // Attempt assignment where Char 1 targets are matched from leftmost candidates
    // Check if user inverted characters (e.g. placed Char 2 on left, Char 1 on right)
    const reversed = decomps.slice().reverse();
    let reversedMatch = true;
    let revCursor = 0;
    for (let k = 0; k < charCount; k++) {
      const expected = reversed[k].targetComponents.map(c => c.glyph).sort();
      const actual = sortedByX.slice(revCursor, revCursor + expected.length).map(c => c.glyph).sort();
      if (JSON.stringify(expected) !== JSON.stringify(actual)) {
        reversedMatch = false;
        break;
      }
      revCursor += expected.length;
    }

    if (reversedMatch) {
      return { success: false, reason: 'MISPLACED_CHARACTERS' };
    }

    // Try finding each character's pieces by glyph matching
    const assignedBuckets = Array.from({ length: charCount }, () => []);
    const unassigned = normalized.slice();

    for (let k = 0; k < charCount; k++) {
      const targetGlyphsCopy = decomps[k].targetComponents.map(c => c.glyph);
      for (const tg of targetGlyphsCopy) {
        const foundIdx = unassigned.findIndex(c => c.glyph === tg);
        if (foundIdx !== -1) {
          assignedBuckets[k].push(unassigned.splice(foundIdx, 1)[0]);
        }
      }
    }

    // Check reading order: mean(X) of Char k must be strictly less than mean(X) of Char k+1
    for (let k = 0; k < charCount - 1; k++) {
      const meanX1 = assignedBuckets[k].reduce((s, c) => s + c.centerX, 0) / Math.max(1, assignedBuckets[k].length);
      const meanX2 = assignedBuckets[k + 1].reduce((s, c) => s + c.centerX, 0) / Math.max(1, assignedBuckets[k + 1].length);
      if (meanX1 >= meanX2) {
        return { success: false, reason: 'MISPLACED_CHARACTERS' };
      }
    }

    // Use assigned buckets
    for (let k = 0; k < charCount; k++) {
      charBuckets[k] = assignedBuckets[k];
    }
  } else {
    // Partition matched by simple count; ensure strict horizontal ordering
    for (let k = 0; k < charCount - 1; k++) {
      const meanX1 = charBuckets[k].reduce((s, c) => s + c.centerX, 0) / charBuckets[k].length;
      const meanX2 = charBuckets[k + 1].reduce((s, c) => s + c.centerX, 0) / charBuckets[k + 1].length;
      if (meanX1 >= meanX2) {
        return { success: false, reason: 'MISPLACED_CHARACTERS' };
      }
    }
  }

  // 5. Independently evaluate each character's topology
  for (let k = 0; k < charCount; k++) {
    const evalResult = evaluateSingleCharacterPlacement(charBuckets[k], decomps[k], canvasDim);
    if (!evalResult.success) {
      return {
        success: false,
        reason: evalResult.reason,
        charIndex: k,
        char: decomps[k].char
      };
    }
  }

  return { success: true, reason: 'OK' };
}

/**
 * Resolves decompositions for a target word, applying Adaptive Multi-Character Decomposition:
 * - Single/2-character words: full radical decomposition for all characters.
 * - 3-character words (e.g. 出租车): decompose the single most complex character (租 -> [禾, 且]),
 *   while keeping the simpler characters whole ([出], [车]) to maintain a strict dock budget.
 * - 4-character words (e.g. 不好意思): present each character as a whole morpheme tile.
 *
 * @param {Object} word - Corpus word object ({ characters, hanzi_simp, ... })
 * @param {Object} decompositions - Character decompositions dictionary
 * @returns {Array} Array of resolved decomposition objects per character position
 */
export function resolveWordDecompositions(word, decompositions = {}) {
  if (!word) return [];
  const chars = word.characters || Array.from(word.hanzi_simp || '');

  // 4+ character words (e.g. 不好意思):
  // Present at character morpheme level (1 tile per character)
  if (chars.length >= 4) {
    return chars.map(ch => ({
      char: ch,
      strokeCount: decompositions[ch]?.strokeCount || 1,
      topology: 'ATOMIC',
      targetComponents: [{ id: `comp_${ch}`, glyph: ch, role: 'base' }],
      distractorComponents: decompositions[ch]?.distractorComponents || ['一', '日', '木', '口']
    }));
  }

  // 3-character words (e.g. 出租车):
  // Decompose the most complex character, keep the other 2 as whole morpheme tiles
  if (chars.length === 3) {
    let bestIdx = 0;
    let maxScore = -1;

    chars.forEach((ch, idx) => {
      const decomp = decompositions[ch];
      const isAtomic = !decomp || decomp.topology === 'ATOMIC';
      const strokeCount = decomp?.strokeCount || 1;
      const targetLen = decomp?.targetComponents?.length || 1;
      // Compound characters get heavy priority; then rank by stroke count and target components
      const score = isAtomic ? 0 : (strokeCount * 10 + targetLen);
      if (score > maxScore) {
        maxScore = score;
        bestIdx = idx;
      }
    });

    return chars.map((ch, idx) => {
      if (idx === bestIdx && decompositions[ch] && decompositions[ch].topology !== 'ATOMIC') {
        return decompositions[ch];
      }
      return {
        char: ch,
        strokeCount: decompositions[ch]?.strokeCount || 1,
        topology: 'ATOMIC',
        targetComponents: [{ id: `comp_${ch}`, glyph: ch, role: 'base' }],
        distractorComponents: decompositions[ch]?.distractorComponents || ['一', '日', '木', '口']
      };
    });
  }

  // 1 or 2 character words: full canonical decomposition
  return chars.map(ch => {
    if (decompositions[ch]) {
      return decompositions[ch];
    }
    return {
      char: ch,
      strokeCount: 1,
      topology: 'ATOMIC',
      targetComponents: [{ id: `comp_${ch}`, glyph: ch, role: 'base' }],
      distractorComponents: ['一', '日', '木', '口']
    };
  });
}

// ----------------------------------------------------
// 2. COMPONENT PLACEMENT CONTROLLER
// ----------------------------------------------------

export class ComponentPlacementController {
  constructor(decompositions = null) {
    this.decompositions = decompositions || {};
    this.activeWord = null;
    this.activeDecompositions = [];
    this.activePlacedComponents = []; // In-memory state of placed items
    this.isHintActive = false;

    // DOM references
    this.dom = {
      arena: null,
      canvas: null,
      placedLayer: null,
      dock: null,
      dockCountBadge: null,
      hintBtn: null,
      hintWatermark: null,
      clearBtn: null,
      multiGrid: null
    };

    this.isEventsBound = false;
  }

  setDecompositions(dict) {
    this.decompositions = dict || {};
  }

  initDom() {
    this.dom = {
      arena: document.getElementById('open-placement-arena'),
      canvas: document.getElementById('open-placement-canvas'),
      placedLayer: document.getElementById('placed-components-layer'),
      dock: document.getElementById('component-dock'),
      dockCountBadge: document.getElementById('dock-count-badge'),
      hintBtn: document.getElementById('placement-hint-btn'),
      hintWatermark: document.getElementById('placement-ghost-watermark'),
      clearBtn: document.getElementById('clear-placement-btn'),
      multiGrid: document.getElementById('multi-character-grid')
    };

    this.bindControlEvents();
  }

  bindControlEvents() {
    if (this.isEventsBound) return;
    this.isEventsBound = true;

    // 1. Clear Button: Wipe canvas pieces and restore dock
    if (this.dom.clearBtn) {
      this.dom.clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resetCanvas();
      });
    }

    // 2. Hint Outline Button: Toggle ghost watermark
    if (this.dom.hintBtn) {
      this.dom.hintBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleGhostHint();
      });
    }
  }

  toggleGhostHint(forcedState) {
    this.isHintActive = (forcedState !== undefined) ? forcedState : !this.isHintActive;
    if (this.dom.hintWatermark) {
      if (this.isHintActive) {
        this.dom.hintWatermark.classList.remove('opacity-0');
        this.dom.hintWatermark.classList.add('opacity-25');
        if (this.dom.hintBtn) {
          this.dom.hintBtn.classList.add('bg-[#E11D48]');
          this.dom.hintBtn.classList.remove('bg-[#065F46]');
        }
        const textSpan = document.getElementById('placement-hint-btn-text');
        if (textSpan) textSpan.textContent = 'HINT: ON';
      } else {
        this.dom.hintWatermark.classList.remove('opacity-25');
        this.dom.hintWatermark.classList.add('opacity-0');
        if (this.dom.hintBtn) {
          this.dom.hintBtn.classList.remove('bg-[#E11D48]');
          this.dom.hintBtn.classList.add('bg-[#065F46]');
        }
        const textSpan = document.getElementById('placement-hint-btn-text');
        if (textSpan) textSpan.textContent = 'HINT OUTLINE';
      }
    }
  }

  /**
   * Mounts an active word into the Component Builder.
   * Clears existing state, populates the dock with targets + distractors,
   * sets watermark, and configures canvas.
   */
  mountWord(word) {
    if (!word) return;
    this.initDom();
    this.activeWord = word;
    this.activePlacedComponents = [];

    const chars = word.characters || Array.from(word.hanzi_simp || '');
    this.activeDecompositions = resolveWordDecompositions(word, this.decompositions);

    // Reset watermark
    if (this.dom.hintWatermark) {
      this.dom.hintWatermark.textContent = chars.join('');
    }

    // Ensure multi-character grid divider lines are NEVER shown as visible borders
    if (this.dom.multiGrid) {
      this.dom.multiGrid.classList.add('hidden');
      this.dom.multiGrid.innerHTML = '';
    }

    // Reset placed layer
    if (this.dom.placedLayer) {
      this.dom.placedLayer.innerHTML = '';
    }

    // Populate dock
    this.populateDock();
  }

  /**
   * Populates the dock dynamically with target components and 2-3 balanced distractors.
   */
  populateDock() {
    if (!this.dom.dock) return;

    // Collect all targets
    const targetItems = [];
    const usedGlyphs = new Set();

    // 1. Proactively block the full word and all its constituent characters from ever appearing as distractors
    if (this.activeWord) {
      if (this.activeWord.hanzi_simp) {
        Array.from(this.activeWord.hanzi_simp).forEach(c => usedGlyphs.add(c));
      }
      if (Array.isArray(this.activeWord.characters)) {
        this.activeWord.characters.forEach(c => usedGlyphs.add(c));
      }
    }
    this.activeDecompositions.forEach(decomp => {
      if (decomp.char) usedGlyphs.add(decomp.char);
    });

    // Proactively block any character from appearing as a distractor if it contains any active target character as a component
    if (this.decompositions) {
      const activeCharSet = new Set(this.activeDecompositions.map(d => d.char));
      Object.entries(this.decompositions).forEach(([compoundChar, info]) => {
        if (info && info.targetComponents) {
          info.targetComponents.forEach(tc => {
            if (activeCharSet.has(tc.glyph)) {
              usedGlyphs.add(compoundChar);
            }
          });
        }
      });
    }

    // 2. Add all target component glyphs
    this.activeDecompositions.forEach((decomp, charIdx) => {
      decomp.targetComponents.forEach(tc => {
        targetItems.push({
          id: `${tc.id}_${charIdx}`,
          glyph: tc.glyph,
          role: tc.role,
          char: decomp.char,
          isTarget: true
        });
        usedGlyphs.add(tc.glyph);
      });
    });

    // Collect 2-3 distractors that do not clash with targets
    const distractorCandidates = [];
    this.activeDecompositions.forEach(decomp => {
      if (decomp.distractorComponents) {
        decomp.distractorComponents.forEach(d => {
          if (!usedGlyphs.has(d) && !distractorCandidates.includes(d)) {
            distractorCandidates.push(d);
          }
        });
      }
    });

    // Default backup distractors if needed
    const backupDistractors = ['禾', '日', '手', '口', '宀', '木', '土', '人', '女', '子', '心'];
    for (const bd of backupDistractors) {
      if (!usedGlyphs.has(bd) && !distractorCandidates.includes(bd)) {
        distractorCandidates.push(bd);
      }
    }

    const distractorCount = targetItems.length <= 2 ? 3 : 2;
    const selectedDistractors = distractorCandidates.slice(0, distractorCount).map((glyph, idx) => ({
      id: `distractor_${idx}_${glyph}`,
      glyph: glyph,
      role: 'distractor',
      isTarget: false
    }));

    // Merge and shuffle dock items
    const dockItems = [...targetItems, ...selectedDistractors];
    for (let i = dockItems.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dockItems[i], dockItems[j]] = [dockItems[j], dockItems[i]];
    }

    // Render tactile tiles in dock
    this.dom.dock.innerHTML = '';
    dockItems.forEach(item => {
      const tile = document.createElement('div');
      tile.className = 'draggable-component-tile w-12 h-12 sm:w-14 sm:h-14 bg-white border-2 border-black rounded-xl shadow-hard-black flex items-center justify-center font-chinese font-bold text-2xl sm:text-3xl text-black cursor-grab active:cursor-grabbing select-none transition-transform hover:scale-105 active:scale-95 touch-none';
      tile.dataset.componentId = item.id;
      tile.dataset.glyph = item.glyph;
      tile.dataset.componentType = getComponentType(item.glyph);
      tile.title = `${item.glyph}`;
      tile.textContent = item.glyph;

      this.bindDockTileDrag(tile, item);
      this.dom.dock.appendChild(tile);
    });

    this.updateDockCount();
  }

  updateDockCount() {
    if (!this.dom.dock) return;
    const visibleTiles = this.dom.dock.querySelectorAll('.draggable-component-tile:not(.hidden)');
    if (this.dom.dockCountBadge) {
      this.dom.dockCountBadge.textContent = `${visibleTiles.length} PIECES`;
    }
  }

  /**
   * Binds pointer drag-and-drop to a dock tile.
   */
  bindDockTileDrag(tile, item) {
    tile.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { tile.setPointerCapture(e.pointerId); } catch (_) {}

      const glyph = item.glyph;
      const compId = item.id;
      const compType = getComponentType(glyph);
      const canvasRect = this.dom.canvas.getBoundingClientRect();
      const charCount = this.activeDecompositions.length;
      const targetFontSize = getComponentFontSize(glyph, canvasRect.width || 340, charCount);
      const targetFontWeight = getComponentFontWeight(glyph);

      // Create floating drag avatar showing pure stroke font
      const avatar = document.createElement('div');
      avatar.className = 'fixed z-[9999] pointer-events-none font-chinese text-[#1E1B2E] leading-none flex items-center justify-center select-none';
      avatar.dataset.componentType = compType;
      avatar.style.fontSize = `${targetFontSize}px`;
      avatar.style.fontWeight = targetFontWeight;
      avatar.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.35))';
      avatar.textContent = glyph;
      document.body.appendChild(avatar);

      const moveAvatar = (clientX, clientY) => {
        avatar.style.left = `${clientX - Math.round(targetFontSize * 0.5)}px`;
        avatar.style.top = `${clientY - Math.round(targetFontSize * 0.5)}px`;
      };
      moveAvatar(e.clientX, e.clientY);

      tile.classList.add('dragging-ghost');

      const onPointerMove = (me) => {
        moveAvatar(me.clientX, me.clientY);
      };

      const onPointerUp = (ue) => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        try { tile.releasePointerCapture(e.pointerId); } catch (_) {}

        if (avatar.parentNode) avatar.parentNode.removeChild(avatar);
        tile.classList.remove('dragging-ghost');

        const cRect = this.dom.canvas.getBoundingClientRect();
        const dropX = ue.clientX;
        const dropY = ue.clientY;

        // Check if dropped inside canvas
        if (
          dropX >= cRect.left &&
          dropX <= cRect.right &&
          dropY >= cRect.top &&
          dropY <= cRect.bottom
        ) {
          tile.classList.add('hidden');
          this.updateDockCount();

          const relX = Math.round(dropX - cRect.left - targetFontSize * 0.5);
          const relY = Math.round(dropY - cRect.top - targetFontSize * 0.5);
          const clampedX = Math.max(-Math.round(targetFontSize * 0.15), Math.min(cRect.width - Math.round(targetFontSize * 0.7), relX));
          const clampedY = Math.max(-Math.round(targetFontSize * 0.15), Math.min(cRect.height - Math.round(targetFontSize * 0.7), relY));

          this.createPlacedGlyph(glyph, compId, clampedX, clampedY, targetFontSize, targetFontWeight, compType, tile);
        }
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    });
  }

  /**
   * Creates a pure typography glyph element on the canvas drop surface.
   */
  createPlacedGlyph(glyph, compId, x, y, fontSize, fontWeight, compType, sourceTile) {
    if (!this.dom.placedLayer) return;

    const placed = document.createElement('div');
    placed.className = 'placed-component-glyph';
    placed.dataset.componentType = compType;
    placed.style.left = `${x}px`;
    placed.style.top = `${y}px`;
    placed.style.fontSize = `${fontSize}px`;
    placed.style.fontWeight = fontWeight;
    placed.dataset.componentId = compId;
    placed.dataset.glyph = glyph;
    placed.textContent = glyph;

    // Repositioning drag on canvas
    let hasMoved = false;
    placed.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try { placed.setPointerCapture(e.pointerId); } catch (_) {}

      hasMoved = false;
      const startLeft = parseFloat(placed.style.left) || 0;
      const startTop = parseFloat(placed.style.top) || 0;
      const startPointerX = e.clientX;
      const startPointerY = e.clientY;

      const onMove = (me) => {
        const dx = me.clientX - startPointerX;
        const dy = me.clientY - startPointerY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          hasMoved = true;
        }

        const currentRect = this.dom.canvas.getBoundingClientRect();
        const newX = Math.max(-Math.round(fontSize * 0.2), Math.min(currentRect.width - Math.round(fontSize * 0.6), startLeft + dx));
        const newY = Math.max(-Math.round(fontSize * 0.2), Math.min(currentRect.height - Math.round(fontSize * 0.6), startTop + dy));
        placed.style.left = `${newX}px`;
        placed.style.top = `${newY}px`;
      };

      const onUp = (ue) => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        try { placed.releasePointerCapture(e.pointerId); } catch (_) {}

        // If user tapped without dragging, or dragged outside canvas: return piece to dock
        const cRect = this.dom.canvas.getBoundingClientRect();
        const isOutside = (ue.clientX < cRect.left || ue.clientX > cRect.right || ue.clientY < cRect.top || ue.clientY > cRect.bottom);

        if (!hasMoved || isOutside) {
          this.returnGlyphToDock(placed, sourceTile);
        }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });

    this.dom.placedLayer.appendChild(placed);
  }

  /**
   * Returns a placed component back to the dock tray.
   */
  returnGlyphToDock(placedEl, sourceTile) {
    if (placedEl && placedEl.parentNode) {
      placedEl.parentNode.removeChild(placedEl);
    }
    if (sourceTile) {
      sourceTile.classList.remove('hidden');
    }
    this.updateDockCount();
  }

  /**
   * Resets all placed components back to the dock.
   */
  resetCanvas() {
    if (this.dom.placedLayer) {
      this.dom.placedLayer.innerHTML = '';
    }
    if (this.dom.dock) {
      const tiles = this.dom.dock.querySelectorAll('.draggable-component-tile');
      tiles.forEach(t => t.classList.remove('hidden'));
    }
    this.updateDockCount();
  }

  /**
   * Reads all placed components currently on the canvas.
   */
  getPlacedComponents() {
    if (!this.dom.placedLayer) return [];
    const elements = this.dom.placedLayer.querySelectorAll('.placed-component-glyph');
    const list = [];

    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const canvasRect = this.dom.canvas ? this.dom.canvas.getBoundingClientRect() : { left: 0, top: 0, width: 340, height: 340 };
      const x = rect.left - canvasRect.left;
      const y = rect.top - canvasRect.top;
      const width = rect.width;
      const height = rect.height;

      list.push({
        id: el.dataset.componentId || el.dataset.glyph,
        glyph: el.dataset.glyph || el.textContent.trim(),
        x: x,
        y: y,
        width: width,
        height: height,
        centerX: x + width * 0.5,
        centerY: y + height * 0.5,
        element: el
      });
    });

    return list;
  }

  /**
   * Runs the RST evaluation on the current canvas state.
   */
  evaluateActivePlacement() {
    const placed = this.getPlacedComponents();
    const canvasWidth = this.dom.canvas ? this.dom.canvas.clientWidth : 340;
    return evaluatePlacement(placed, this.activeDecompositions, canvasWidth);
  }

  /**
   * Plays the crystallization animation upon successful assembly.
   */
  playCrystallizationAnimation(onComplete) {
    if (!this.dom.placedLayer) {
      if (onComplete) onComplete();
      return;
    }

    const glyphs = this.dom.placedLayer.querySelectorAll('.placed-component-glyph');
    glyphs.forEach(g => {
      g.classList.add('crystallize-pulse');
      g.style.filter = 'drop-shadow(0 0 14px #10B981)';
    });

    setTimeout(() => {
      glyphs.forEach(g => {
        g.style.filter = '';
      });
      if (onComplete) onComplete();
    }, 450);
  }
}
