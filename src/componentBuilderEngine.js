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
const OUTER_FRAME_GLYPHS = ['门', '門', '囗', '冂', '凵', '匚', '匸', '广', '厂', '户', '戶', '勹', '弋', '戈', '气', '辶', '⻌', '⻍', '廴', '疒'];
const ENCLOSURE_ONLY_OUTER_FRAMES = ['走', '丁'];
const INNER_CAVITY_GLYPHS = ['口', '丶', '日', '月', '木', '寸', '子', '心', '人', '小', '十', '一', '土', '王'];
const NARROW_SIDE_RADICALS = ['亻', '氵', '讠', '扌', '忄', '彳', '纟', '钅', '犭', '饣', '阝', '冫', '礻', '衤'];

/**
 * Determines whether a glyph acts as an enclosure outer frame in its current context.
 * '走' and '丁' act as outer frames ONLY in ENCLOSURE context (preserving normal '丁' in 打, etc.).
 */
export function isOuterFrameGlyph(glyph, topology = null, role = null) {
  if (role === 'outer') return true;
  if (role === 'inner') return false;
  if (OUTER_FRAME_GLYPHS.includes(glyph)) return true;
  if (topology === 'ENCLOSURE' && ENCLOSURE_ONLY_OUTER_FRAMES.includes(glyph)) return true;
  return false;
}

/**
 * Returns optical classification for radical weight harmonization.
 */
export function getComponentType(glyph, role = null, topology = null) {
  if (isOuterFrameGlyph(glyph, topology, role)) return 'outer-frame';
  if (role === 'inner' || topology === 'ENCLOSURE' || ['口', '丶'].includes(glyph)) {
    return 'inner-cavity';
  }
  return 'standard';
}

/**
 * Anisotropic visual transform matrix (scaleX, scaleY, fontWeight) keyed strictly to
 * (glyph, topology, roleHint) — zero-spoiler, zero-rotation.
 */
export function getComponentVisualTransform(glyph, topology = 'ATOMIC', roleHint = null) {
  // 1. Vertical Stacks (TOP_BOTTOM / TOP_MID_BOTTOM)
  if (topology === 'TOP_BOTTOM' || topology === 'TOP_MID_BOTTOM') {
    const scaleFactorY = topology === 'TOP_MID_BOTTOM' ? 0.78 : 1.0;

    // Flat twin/horizontal base bars: 二, 三, 一
    if (['二', '三', '一'].includes(glyph)) {
      return { scaleX: 1.10, scaleY: 0.44 * scaleFactorY, weight: '700' };
    }
    // Wide Canopy Roofs: 人, 八, 入
    if (['人', '八', '入'].includes(glyph)) {
      return { scaleX: 1.28, scaleY: 0.50 * scaleFactorY, weight: '600' };
    }
    // Broad Flat Bottoms / Tops: 心, 灬, 皿, 艹, ⺮, 宀
    if (['心', '灬', '皿', '艹', '⺮', '宀'].includes(glyph)) {
      return { scaleX: 1.06, scaleY: 0.50 * scaleFactorY, weight: '600' };
    }
    // Default vertically stacked halves / thirds
    return { scaleX: 0.98, scaleY: 0.66 * scaleFactorY, weight: '500' };
  }

  // 2. Horizontal Pairs / Triples (LEFT_RIGHT / LEFT_MID_RIGHT)
  if (topology === 'LEFT_RIGHT' || topology === 'LEFT_MID_RIGHT') {
    const widthFactor = topology === 'LEFT_MID_RIGHT' ? 0.70 : 1.0;
    if (NARROW_SIDE_RADICALS.includes(glyph)) {
      return { scaleX: 0.56 * widthFactor, scaleY: 0.95, weight: '500' };
    }
    return { scaleX: 0.64 * widthFactor, scaleY: 0.92, weight: '500' };
  }

  // 3. ENCLOSURE inner glyphs & ATOMIC preserve 1:1 aspect ratio
  if (topology === 'ENCLOSURE' && !isOuterFrameGlyph(glyph, topology, roleHint) && (roleHint === 'inner' || roleHint === null)) {
    return { scaleX: 0.92, scaleY: 0.92, weight: ['口', '丶'].includes(glyph) ? '700' : '600' };
  }

  return { scaleX: 1.0, scaleY: 1.0, weight: null };
}

/**
 * Returns appropriate font-weight preserving typography balance across structural roles.
 */
export function getComponentFontWeight(glyph, topology = 'ATOMIC', role = null) {
  const visualTransform = getComponentVisualTransform(glyph, topology, role);
  if (visualTransform && visualTransform.weight) {
    return visualTransform.weight;
  }
  const type = getComponentType(glyph, role, topology);
  if (type === 'outer-frame') return '300';
  if (type === 'inner-cavity') return '700';
  return '500';
}

/**
 * Calculates responsive component font size based on canvas dimensions, character count,
 * structural role, and topology.
 */
export function getComponentFontSize(glyph, canvasDim = 340, charCount = 1, role = null, topology = null) {
  let scale = 1.0;
  if (charCount === 2) scale = 0.58;
  if (charCount === 3) scale = 0.40;
  if (charCount >= 4) scale = 0.32;

  if (glyph === '丶') {
    return Math.round(canvasDim * 0.22 * scale);
  }
  if (isOuterFrameGlyph(glyph, topology, role)) {
    return Math.round(canvasDim * 0.62 * scale);
  }
  if (role === 'inner' || (topology === 'ENCLOSURE' && !isOuterFrameGlyph(glyph, topology, role)) || glyph === '口') {
    return Math.round(canvasDim * 0.30 * scale);
  }
  if (glyph === '亻' || glyph === '主') {
    return Math.round(canvasDim * 0.54 * scale);
  }
  return Math.round(canvasDim * 0.52 * scale);
}

// ----------------------------------------------------
// 1. RELATIVE SPATIAL TOPOLOGY (RST) EVALUATOR
// ----------------------------------------------------

function getEnclosureMargins(outerGlyph) {
  // Default closed frames (囗, 门, 門, 冂, 凵) keep strict 0.08 inward bounds on all 4 sides
  let leftMargin = 0.08;
  let rightMargin = 0.08;
  let topMargin = 0.08;
  let bottomMargin = 0.08;
  let pocketFactorX = 0.5;
  let pocketFactorY = 0.5;

  // Relax inward bounds slightly ONLY on open side(s) of directional semi-enclosures
  if (['辶', '⻌', '⻍', '廴', '走'].includes(outerGlyph)) {
    topMargin = -0.10;
    rightMargin = -0.06;
    pocketFactorX = 0.58;
    pocketFactorY = 0.42;
  } else if (['广', '厂', '户', '戶', '疒'].includes(outerGlyph)) {
    rightMargin = -0.06;
    bottomMargin = -0.06;
    pocketFactorX = 0.60;
    pocketFactorY = 0.61;
  } else if (['匚', '匸'].includes(outerGlyph)) {
    rightMargin = -0.06;
    pocketFactorX = 0.55;
    pocketFactorY = 0.50;
  } else if (['勹', '丁', '戈', '弋', '气'].includes(outerGlyph)) {
    leftMargin = -0.04;
    bottomMargin = -0.06;
    pocketFactorX = 0.45;
    pocketFactorY = 0.55;
  }

  return { leftMargin, rightMargin, topMargin, bottomMargin, pocketFactorX, pocketFactorY };
}

/**
 * Evaluates a single character's placed components against its target decomposition.
 *
 * @param {Array} placedComponents - Array of placed objects: { glyph, x, y, width, height, centerX, centerY }
 * @param {Object} targetDecomposition - Decomposition schema { char, topology, targetComponents, distractors }
 * @param {number} canvasDim - Reference canvas dimension (default: 320)
 * @param {Object|null} slotContext - Optional multi-character slot anchor { expectedCenterX, charCount }
 * @returns {Object} { success: boolean, reason: string, driftRatio?: number, driftAxis?: string }
 */
export function evaluateSingleCharacterPlacement(placedComponents, targetDecomposition, canvasDim = 320, slotContext = null) {
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
    const cx = c.centerX !== undefined ? c.centerX : ((c.x || 0) + w * 0.5);
    const cy = c.centerY !== undefined ? c.centerY : ((c.y || 0) + h * 0.5);
    const x = c.x !== undefined ? c.x : (cx - w * 0.5);
    const y = c.y !== undefined ? c.y : (cy - h * 0.5);
    return { ...c, x, y, width: w, height: h, centerX: cx, centerY: cy };
  });

  // 2. Evaluate topology
  switch (topology) {
    case 'ATOMIC': {
      // Indivisible single-root character (e.g. 日, 月, 人, 木) anchored to its horizontal reading slot
      const expectedCenterX = (slotContext && slotContext.expectedCenterX !== undefined)
        ? slotContext.expectedCenterX
        : canvasDim * 0.5;
      const expectedCenterY = canvasDim * 0.5;
      const rawDrift = Math.hypot(normalized[0].centerX - expectedCenterX, normalized[0].centerY - expectedCenterY) / canvasDim;
      // Scale so Tier-2 (> 0.15) triggers only when raw center drift exceeds 20% of canvasDim
      const driftRatio = rawDrift * (0.15 / 0.20);
      return { success: true, reason: 'OK', driftRatio, driftAxis: 'centering' };
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

      const leftRightEdge = leftComp.x + leftComp.width;
      const rightLeftEdge = rightComp.x;
      const edgeGap = Math.max(0, rightLeftEdge - leftRightEdge);
      const gapThreshold = canvasDim * 0.24;
      const gapDrift = edgeGap > gapThreshold ? (edgeGap - gapThreshold) / canvasDim : 0;

      const driftRatio = Math.max(yDelta / canvasDim, gapDrift);

      return {
        success: isLeft && isAlignedY,
        reason: (isLeft && isAlignedY) ? 'OK' : 'MISPLACED_LEFT_RIGHT',
        driftRatio,
        driftAxis: 'horizontal'
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

      const topBottomEdge = topComp.y + topComp.height;
      const bottomTopEdge = bottomComp.y;
      const verticalGap = Math.max(0, bottomTopEdge - topBottomEdge);
      const gapThreshold = canvasDim * 0.24;
      const gapDrift = verticalGap > gapThreshold ? (verticalGap - gapThreshold) / canvasDim : 0;

      const driftRatio = Math.max(xDelta / canvasDim, gapDrift);

      return {
        success: isTop && isAlignedX,
        reason: (isTop && isAlignedX) ? 'OK' : 'MISPLACED_TOP_BOTTOM',
        driftRatio,
        driftAxis: 'vertical'
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

      const maxDeltaX = Math.max(Math.abs(topComp.centerX - midComp.centerX), Math.abs(midComp.centerX - bottomComp.centerX));
      const driftRatio = maxDeltaX / canvasDim;

      return {
        success: isOrderCorrect && isAlignedX,
        reason: (isOrderCorrect && isAlignedX) ? 'OK' : 'MISPLACED_TOP_MID_BOTTOM',
        driftRatio,
        driftAxis: 'vertical'
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

      const maxDeltaY = Math.max(Math.abs(leftComp.centerY - midComp.centerY), Math.abs(midComp.centerY - rightComp.centerY));
      const driftRatio = maxDeltaY / canvasDim;

      return {
        success: isOrderCorrect && isAlignedY,
        reason: (isOrderCorrect && isAlignedY) ? 'OK' : 'MISPLACED_LEFT_MID_RIGHT',
        driftRatio,
        driftAxis: 'horizontal'
      };
    }

    case 'ENCLOSURE': {
      // Full/semi-enclosure (e.g. 问 -> 门 + 口, 国 -> 囗 + 玉, 医 -> 匚 + 矢, 店 -> 广 + 占, 过 -> 辶 + 寸)
      const outerTarget = targetComponents.find(t => t.role === 'outer') || targetComponents[0];
      const innerTarget = targetComponents.find(t => t.role === 'inner') || targetComponents[1];

      const outerComp = normalized.find(c => c.glyph === outerTarget.glyph);
      const innerComp = normalized.find(c => c.glyph === innerTarget.glyph);

      if (!outerComp || !innerComp) return { success: false, reason: 'WRONG_COMPONENTS' };

      // Strict inward containment on closed sides; slightly relaxed only on open semi-enclosure sides
      const margins = getEnclosureMargins(outerTarget.glyph);
      const isInsideX = (innerComp.centerX >= outerComp.x + outerComp.width * margins.leftMargin) &&
                        (innerComp.centerX <= outerComp.x + outerComp.width * (1 - margins.rightMargin));
      const isInsideY = (innerComp.centerY >= outerComp.y + outerComp.height * margins.topMargin) &&
                        (innerComp.centerY <= outerComp.y + outerComp.height * (1 - margins.bottomMargin));

      const pocketCenterX = outerComp.x + outerComp.width * margins.pocketFactorX;
      const pocketCenterY = outerComp.y + outerComp.height * margins.pocketFactorY;
      const driftRatio = Math.hypot(innerComp.centerX - pocketCenterX, innerComp.centerY - pocketCenterY) / canvasDim;

      return {
        success: isInsideX && isInsideY,
        reason: (isInsideX && isInsideY) ? 'OK' : 'MISPLACED_ENCLOSURE',
        driftRatio,
        driftAxis: 'enclosure'
      };
    }

    case 'CROSSING': {
      // Overlaid/marker compounds with explicit signed polarity (e.g. 太 -> 大 + 丶 [marker_lower], 本 -> 木 + 一 [marker_lower])
      const baseTarget = targetComponents.find(t => t.role === 'base') || targetComponents[0];
      const markerTarget = targetComponents.find(t => t.role && t.role.startsWith('marker')) || targetComponents[1];

      const baseComp = normalized.find(c => c.glyph === baseTarget.glyph);
      const markerComp = normalized.find(c => c.glyph === markerTarget.glyph);

      if (!baseComp || !markerComp) return { success: false, reason: 'WRONG_COMPONENTS' };

      const idealOffsetY = markerTarget.role === 'marker_lower'
        ? baseComp.height * 0.18
        : markerTarget.role === 'marker_upper'
          ? -baseComp.height * 0.22
          : 0;
      const dy = markerComp.centerY - baseComp.centerY;
      const polarityOk = markerTarget.role === 'marker_lower'
        ? dy > baseComp.height * 0.04
        : markerTarget.role === 'marker_upper'
          ? dy < -baseComp.height * 0.04
          : Math.abs(dy) <= canvasDim * 0.35;
      const isAlignedX = Math.abs(baseComp.centerX - markerComp.centerX) <= canvasDim * 0.32;
      const isAlignedY = Math.abs(dy - idealOffsetY) <= canvasDim * 0.35;

      const driftRatio = Math.max(
        Math.abs(baseComp.centerX - markerComp.centerX),
        Math.abs(dy - idealOffsetY)
      ) / canvasDim;

      return {
        success: polarityOk && isAlignedX && isAlignedY,
        reason: (polarityOk && isAlignedX && isAlignedY) ? 'OK' : 'MISPLACED_CROSSING',
        driftRatio,
        driftAxis: 'marker'
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
 * @returns {Object} { success: boolean, reason: string, maxDriftRatio?: number, maxDriftAxis?: string }
 */
export function evaluatePlacement(placedComponents, targetDecompositions, canvasDim = 320) {
  if (!placedComponents || placedComponents.length === 0) {
    return { success: false, reason: 'NO_COMPONENTS' };
  }

  const decomps = Array.isArray(targetDecompositions) ? targetDecompositions : [targetDecompositions];
  const charCount = decomps.length;

  // Single-Character Fast Path
  if (charCount === 1) {
    const r = evaluateSingleCharacterPlacement(placedComponents, decomps[0], canvasDim, {
      expectedCenterX: canvasDim * 0.5,
      charCount: 1
    });
    return {
      ...r,
      maxDriftRatio: r.driftRatio || 0,
      maxDriftAxis: r.driftAxis || null
    };
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
    const cx = c.centerX !== undefined ? c.centerX : ((c.x || 0) + w * 0.5);
    const cy = c.centerY !== undefined ? c.centerY : ((c.y || 0) + h * 0.5);
    const x = c.x !== undefined ? c.x : (cx - w * 0.5);
    const y = c.y !== undefined ? c.y : (cy - h * 0.5);
    return { ...c, x, y, width: w, height: h, centerX: cx, centerY: cy };
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

  // 5. Independently evaluate each character's topology against its horizontal reading slot
  let maxDrift = 0;
  let maxDriftAxis = null;
  for (let k = 0; k < charCount; k++) {
    const slotCenterX = canvasDim * ((k + 0.5) / charCount);
    const evalResult = evaluateSingleCharacterPlacement(charBuckets[k], decomps[k], canvasDim, {
      expectedCenterX: slotCenterX,
      charCount
    });
    if (!evalResult.success) {
      return {
        success: false,
        reason: evalResult.reason,
        charIndex: k,
        char: decomps[k].char
      };
    }
    const dRatio = evalResult.driftRatio || 0;
    if (dRatio >= maxDrift) {
      maxDrift = dRatio;
      maxDriftAxis = evalResult.driftAxis || maxDriftAxis;
    }
  }

  return { success: true, reason: 'OK', maxDriftRatio: maxDrift, maxDriftAxis };
}

const COMPONENT_GLOSSES = {
  '一': 'one', '二': 'two', '三': 'three', '十': 'ten', '千': 'thousand', '百': 'hundred',
  '万': 'ten thousand', '木': 'tree / wood', '干': 'dry / stem', '于': 'at / in',
  '上': 'up / above', '下': 'down / below', '小': 'small', '少': 'few',
  '大': 'big', '太': 'too / extreme', '天': 'sky / day', '夫': 'husband / person',
  '土': 'earth', '士': 'scholar', '王': 'king', '玉': 'jade', '主': 'main / host',
  '日': 'sun', '目': 'eye', '白': 'white', '自': 'self',
  '口': 'mouth', '囗': 'enclosure', '冂': 'down-box', '田': 'field', '甘': 'sweet',
  '申': 'extend', '由': 'from', '甲': 'armor', '回': 'return', '困': 'trapped / sleepy', '团': 'group',
  '人': 'person', '亻': 'person', '八': 'eight', '入': 'enter', '个': 'individual',
  '从': 'follow', '介': 'introduce', '工': 'work', '止': 'stop', '正': 'upright',
  '卜': 'divination', '不': 'not', '西': 'west', '水': 'water', '火': 'fire',
  '手': 'hand', '扌': 'hand', '氵': 'water', '讠': 'speech', '女': 'female',
  '艹': 'grass / plant', '宀': 'roof', '⺮': 'bamboo', '月': 'moon', '心': 'heart', '忄': 'heart',
  '子': 'child', '门': 'door', '辶': 'walk / movement', '广': 'shelter', '疒': 'illness',
  '方': 'square / direction', '力': 'power', '刀': 'knife', '七': 'seven', '又': 'again / hand',
  '文': 'writing', '公': 'public', '去': 'go', '云': 'cloud', '肉': 'meat', '内': 'inside',
  '午': 'noon', '禾': 'grain', '未': 'not yet', '末': 'end', '犬': 'dog', '矢': 'arrow',
  '失': 'lose', '父': 'father', '且': 'moreover', '此': 'this', '几': 'several / table',
  '厂': 'cliff', '斥': 'repel', '石': 'stone', '司': 'manage', '后': 'after / behind',
  '同': 'same', '贵': 'expensive', '爱': 'love', '亮': 'bright', '商': 'commerce',
  '场': 'field / venue', '妻': 'wife', '旁': 'side', '旅': 'travel', '望': 'hope'
};

function getWordMeaning(ch, corpus = []) {
  if (Array.isArray(corpus) && ch) {
    const exact = corpus.find(item => item.hanzi_simp === ch);
    if (exact && exact.english) return exact.english;
    const singleCharMatch = corpus.find(item => item.characters && item.characters.length === 1 && item.characters[0] === ch);
    if (singleCharMatch && singleCharMatch.english) return singleCharMatch.english;
  }
  return COMPONENT_GLOSSES[ch] || '';
}

function getTier2CoachingTip(decomps, driftAxis) {
  const charCount = decomps.length;
  let effectiveTopology = charCount === 1 ? (decomps[0]?.topology || 'ATOMIC') : null;

  if (!effectiveTopology) {
    if (driftAxis === 'centering') effectiveTopology = 'ATOMIC';
    else if (driftAxis === 'enclosure') effectiveTopology = 'ENCLOSURE';
    else if (driftAxis === 'marker') effectiveTopology = 'CROSSING';
    else if (driftAxis === 'vertical') effectiveTopology = 'TOP_BOTTOM';
    else if (driftAxis === 'horizontal') effectiveTopology = 'LEFT_RIGHT';
    else effectiveTopology = decomps.find(d => d && d.topology !== 'ATOMIC')?.topology || 'ATOMIC';
  }

  switch (effectiveTopology) {
    case 'LEFT_RIGHT':
    case 'LEFT_MID_RIGHT':
      return '✓ Nice! Try keeping the left and right pieces closer together.';
    case 'TOP_BOTTOM':
    case 'TOP_MID_BOTTOM':
      return '✓ Nice! Stack the top and bottom pieces straight down the center.';
    case 'ENCLOSURE':
      return '✓ Nice! Tuck the inner piece deeper inside the outer frame.';
    case 'CROSSING':
      return '✓ Nice! Place the small mark closer to the base piece.';
    case 'ATOMIC':
    default:
      if (charCount > 1) {
        return '✓ Nice! Space each character evenly from left to right.';
      }
      return '✓ Nice! Center the piece inside the square.';
  }
}

/**
 * Three-Tier Diagnostic Grading Engine for Component Builder.
 * Evaluates placed components against target character decompositions.
 *
 * Tier 1: CLEAN_PASS - Exact components, canonical topology, tight alignment (drift <= 15%).
 * Tier 2: SOFT_PASS  - Correct components & ordering, moderate kerning/centering drift (15% - 38%). Passes word!
 * Tier 3: DIAGNOSTIC_FAIL - Zero-spoiler radical confusion / missing pieces / order inversion / enclosure breach.
 *
 * @param {Array} placedComponents - Placed component objects
 * @param {Object|Array} targetDecompositions - Decomposition object(s)
 * @param {number} canvasDim - Canvas dimension in pixels
 * @param {Object} dictionary - Full character decompositions dictionary for semantic contrast
 * @param {Array} corpus - Full word corpus for semantic meanings
 * @param {number} attemptsLeft - Remaining user attempts (0 triggers reveal-only fallback if failing)
 * @returns {Object} { status: 'CLEAN_PASS'|'SOFT_PASS'|'DIAGNOSTIC_FAIL', tier: 1|2|3, success: boolean, badge: string, detail: string, reason?: string }
 */
export function gradeComponentBuilder(placedComponents, targetDecompositions, canvasDim = 320, dictionary = {}, corpus = [], attemptsLeft = 3) {
  if (!placedComponents || placedComponents.length === 0) {
    if (attemptsLeft <= 0) {
      return {
        status: 'DIAGNOSTIC_FAIL',
        tier: 3,
        success: false,
        badge: '📖 Solution Shown',
        detail: 'Out of tries. Check the highlighted pieces above before continuing.',
        isPass: false
      };
    }
    return {
      status: 'DIAGNOSTIC_FAIL',
      tier: 3,
      success: false,
      badge: '⚠️ Nothing Placed',
      detail: 'Drag pieces from the tray onto the grid.'
    };
  }

  const decomps = Array.isArray(targetDecompositions) ? targetDecompositions : [targetDecompositions];
  const evalResult = evaluatePlacement(placedComponents, decomps, canvasDim);

  if (evalResult.success) {
    const drift = evalResult.maxDriftRatio || 0;
    if (drift > 0.15) {
      return {
        status: 'SOFT_PASS',
        tier: 2,
        success: true,
        badge: '✓ Good Fit!',
        detail: getTier2CoachingTip(decomps, evalResult.maxDriftAxis),
        maxDriftRatio: drift,
        maxDriftAxis: evalResult.maxDriftAxis || null
      };
    }
    return {
      status: 'CLEAN_PASS',
      tier: 1,
      success: true,
      badge: '🎯 Clean Assembly!',
      detail: 'All pieces snapped cleanly into place.',
      maxDriftRatio: drift,
      maxDriftAxis: evalResult.maxDriftAxis || null
    };
  }

  if (attemptsLeft <= 0) {
    return {
      status: 'DIAGNOSTIC_FAIL',
      tier: 3,
      success: false,
      badge: '📖 Solution Shown',
      detail: 'Out of tries. Study the character above before continuing.',
      reason: evalResult.reason,
      isPass: false
    };
  }

  // Diagnostic Failure (Tier 3) — Zero-Spoiler Policy
  const reason = evalResult.reason;
  let badge = '⚠️ Check Placement';
  let detail = 'Some pieces are out of position on the grid.';

  if (reason === 'WRONG_COMPONENTS') {
    const allTargetGlyphs = decomps.flatMap(d => (d.targetComponents || []).map(c => c.glyph));
    const allPlacedGlyphs = placedComponents.map(c => c.glyph);

    const targetCounts = {};
    allTargetGlyphs.forEach(g => { targetCounts[g] = (targetCounts[g] || 0) + 1; });
    const placedCounts = {};
    allPlacedGlyphs.forEach(g => { placedCounts[g] = (placedCounts[g] || 0) + 1; });

    const extraGlyphs = [];
    Object.keys(placedCounts).forEach(g => {
      const extraCount = placedCounts[g] - (targetCounts[g] || 0);
      for (let i = 0; i < extraCount; i++) extraGlyphs.push(g);
    });

    if (allPlacedGlyphs.length < allTargetGlyphs.length && extraGlyphs.length === 0) {
      const deficit = allTargetGlyphs.length - allPlacedGlyphs.length;
      badge = '⚠️ Missing Piece';
      detail = `Almost! Place ${deficit} more piece${deficit > 1 ? 's' : ''} on the grid.`;
    } else if (extraGlyphs.length > 0) {
      // Dynamic semantic contrastive lookup (ZERO spoiler: never disclose target glyph or missing pieces)
      let contrastFound = false;
      if (dictionary && Object.keys(dictionary).length > 0) {
        const placedSorted = allPlacedGlyphs.slice().sort().join('');
        for (const [candidateChar, info] of Object.entries(dictionary)) {
          if (info && info.targetComponents) {
            const candSorted = info.targetComponents.map(c => c.glyph).slice().sort().join('');
            if (candSorted === placedSorted) {
              const candMeaningRaw = getWordMeaning(candidateChar, corpus);
              const candMeaningConcise = candMeaningRaw && candMeaningRaw.length > 32
                ? candMeaningRaw.split(/[;；]/)[0].trim()
                : candMeaningRaw;
              const candMeaning = candMeaningConcise ? ` (${candMeaningConcise})` : '';
              badge = '🔍 Wrong Piece';
              if (info.topology === 'ATOMIC') {
                detail = `You picked '${candidateChar}'${candMeaning}. Listen again and swap '${extraGlyphs[0]}'.`;
              } else {
                detail = `You built '${candidateChar}'${candMeaning} with '${extraGlyphs[0]}'. Listen again and swap '${extraGlyphs[0]}'.`;
              }
              contrastFound = true;
              break;
            }
          }
        }
      }
      if (!contrastFound) {
        const extraStr = extraGlyphs.join(', ');
        const extraGloss = COMPONENT_GLOSSES[extraGlyphs[0]] || '';
        const targetWord = decomps.map(d => d.char).join('');
        const targetMeaningRaw = getWordMeaning(targetWord, corpus);
        const targetMeaning = targetMeaningRaw && targetMeaningRaw.length > 32
          ? targetMeaningRaw.split(/[;；]/)[0].trim()
          : targetMeaningRaw;
        badge = '🔍 Wrong Piece';
        detail = `'${extraStr}'${extraGloss ? ` (${extraGloss})` : ''} doesn't belong here${targetMeaning ? ` (meaning: "${targetMeaning}")` : ''}. Try another piece.`;
      }
    } else {
      badge = '⚠️ Wrong Pieces';
      detail = 'Those pieces do not match this character.';
    }
  } else if (reason === 'MISPLACED_LEFT_RIGHT') {
    badge = '🔄 Swapped Sides';
    detail = 'Left and right pieces are swapped — place the side root on the left.';
  } else if (reason === 'MISPLACED_TOP_BOTTOM') {
    badge = '🔄 Swapped Top & Bottom';
    detail = 'Top and bottom pieces are swapped — move the upper piece higher.';
  } else if (reason === 'MISPLACED_ENCLOSURE') {
    badge = '📦 Outside Frame';
    detail = 'Place the inner piece inside the outer frame.';
  } else if (reason === 'MISPLACED_TOP_MID_BOTTOM') {
    badge = '🔄 Check Top-to-Bottom Order';
    detail = 'Arrange the 3 pieces in order from top to bottom.';
  } else if (reason === 'MISPLACED_LEFT_MID_RIGHT') {
    badge = '🔄 Check Left-to-Right Order';
    detail = 'Arrange the 3 pieces in order from left to right.';
  } else if (reason === 'MISPLACED_CHARACTERS') {
    badge = '↔️ Reading Order';
    detail = 'Characters read from left to right.';
  } else if (reason === 'MISPLACED_CROSSING') {
    badge = '🎯 Mark Alignment';
    detail = 'Adjust the mark position relative to the main piece.';
  }

  return {
    status: 'DIAGNOSTIC_FAIL',
    tier: 3,
    success: false,
    badge,
    detail,
    reason
  };
}

/**
 * Resolves decompositions for a target word for stepped 1-character-per-canvas assembly.
 * Because each character is assembled cleanly on its own full-size canvas with its own 1-row dock,
 * every character 1..N uses its canonical radical decomposition when available.
 *
 * @param {Object} word - Corpus word object ({ characters, hanzi_simp, ... })
 * @param {Object} decompositions - Character decompositions dictionary
 * @returns {Array} Array of resolved decomposition objects per character position
 */
export function resolveWordDecompositions(word, decompositions = {}) {
  if (!word) return [];
  const chars = word.characters || Array.from(word.hanzi_simp || '');

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
    this.activeCharIndex = 0;
    this.charPlacedItems = []; // Stored placed pieces per character: Array<Array<{id, glyph, componentType, normCx, normCy}>>
    this.charDockOrders = [];  // Deterministic dock tile list per character
    this.activePlacedComponents = [];
    this.isHintActive = false;

    // DOM references
    this.dom = {
      arena: null,
      canvas: null,
      placedLayer: null,
      dock: null,
      hintBtn: null,
      hintWatermark: null,
      undoBtn: null,
      clearBtn: null,
      prevCharBtn: null,
      nextCharBtn: null,
      charPills: null
    };

    this.isEventsBound = false;
    this.isCarouselEventsBound = false;
    this._resizeObserver = null;
    this._resizeRafId = null;
    this._lastCanvasDim = 0;
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
      hintBtn: document.getElementById('placement-hint-btn'),
      hintWatermark: document.getElementById('placement-ghost-watermark'),
      undoBtn: document.getElementById('undo-placement-btn'),
      clearBtn: document.getElementById('clear-placement-btn'),
      prevCharBtn: document.getElementById('builder-prev-char-btn'),
      nextCharBtn: document.getElementById('builder-next-char-btn'),
      charPills: document.getElementById('builder-char-pills')
    };

    this.bindControlEvents();
    this.bindCarouselEvents();
  }

  bindControlEvents() {
    if (this.isEventsBound) return;
    this.isEventsBound = true;

    // 1. Undo Button: Pop last placed piece on current character back to dock
    if (this.dom.undoBtn) {
      this.dom.undoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.undoLastPlaced();
      });
    }

    // 2. Clear Button: Wipe active character pieces and restore dock
    if (this.dom.clearBtn) {
      this.dom.clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clearActiveCharacter();
        if (typeof this.onReset === 'function') {
          this.onReset();
        } else if (typeof window !== 'undefined' && window.WordTrainerEngine && typeof window.WordTrainerEngine.updateFeedback === 'function') {
          window.WordTrainerEngine.updateFeedback('neutral', 'Pieces cleared. Place pieces on the grid.');
        }
      });
    }

    // 3. Guide Outline Button: Toggle ghost watermark (Normalized amber ON / charcoal OFF)
    if (this.dom.hintBtn) {
      this.dom.hintBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nextState = !this.isHintActive;
        this.toggleGhostHint(nextState);
        if (typeof this.onHintToggle === 'function') {
          this.onHintToggle(nextState);
        } else if (typeof window !== 'undefined' && window.WordTrainerEngine) {
          window.WordTrainerEngine.toggleScaffolding(nextState);
        }
      });
    }

    // 4. Responsive Watermark & Piece Resizing
    if (typeof ResizeObserver !== 'undefined' && this.dom.canvas && !this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(() => {
        if (this._resizeRafId) cancelAnimationFrame(this._resizeRafId);
        this._resizeRafId = requestAnimationFrame(() => {
          this._resizeRafId = null;
          this.updateWatermarkSizing();
          this.rescaleActivePlacedPieces();
        });
      });
      this._resizeObserver.observe(this.dom.canvas);
    }
  }

  bindCarouselEvents() {
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

    // Touch swipe on empty canvas area switches between characters without blocking tile drags
    if (this.dom.canvas) {
      let touchStartX = 0;
      let touchStartY = 0;
      let touchStartTime = 0;
      let startedOnTile = false;

      this.dom.canvas.addEventListener('touchstart', (e) => {
        startedOnTile = Boolean(e.target && typeof e.target.closest === 'function' && e.target.closest('.placed-component-glyph'));
        if (!startedOnTile && e.touches && e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          touchStartTime = Date.now();
        }
      }, { passive: true });

      this.dom.canvas.addEventListener('touchend', (e) => {
        if (startedOnTile || !e.changedTouches || e.changedTouches.length === 0) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        const dt = Date.now() - touchStartTime;
        if (dt < 350 && Math.abs(dx) > 70 && Math.abs(dy) < 40) {
          if (dx < -70) this.nextChar();
          else if (dx > 70) this.prevChar();
        }
      }, { passive: true });
    }
  }

  prevChar() {
    if (this.activeCharIndex > 0) {
      this.mountCharacter(this.activeCharIndex - 1);
    }
  }

  nextChar() {
    const count = Math.max(1, (this.activeDecompositions || []).length);
    if (this.activeCharIndex < count - 1) {
      this.mountCharacter(this.activeCharIndex + 1);
    }
  }

  setCharIndex(index) {
    const count = Math.max(1, (this.activeDecompositions || []).length);
    if (index >= 0 && index < count && index !== this.activeCharIndex) {
      this.mountCharacter(index);
    }
  }

  updateWatermarkSizing() {
    if (!this.dom.hintWatermark || !this.dom.canvas || !this.activeWord) return;
    const canvasDim = this.dom.canvas.clientWidth || 0;
    if (canvasDim <= 0) return;

    // Stepped 1-character-per-canvas always draws at full canonical proportion
    const fontSize = Math.max(48, Math.round(canvasDim * 0.50));
    this.dom.hintWatermark.style.fontSize = `${fontSize}px`;
  }

  rescaleActivePlacedPieces() {
    if (!this.dom.canvas || !this.dom.placedLayer) return;
    const canvasDim = this.dom.canvas.clientWidth || 0;
    if (canvasDim <= 0) return;
    if (this._lastCanvasDim > 0 && Math.abs(canvasDim - this._lastCanvasDim) <= 2) return;
    this._lastCanvasDim = canvasDim;

    const placedEls = this.dom.placedLayer.querySelectorAll('.placed-component-glyph');
    if (placedEls.length === 0) return;

    const decomp = this.activeDecompositions[this.activeCharIndex] || null;
    const contextTopology = decomp?.topology || 'ATOMIC';

    placedEls.forEach(el => {
      const glyph = el.dataset.glyph || el.textContent.trim();
      const normCx = parseFloat(el.dataset.normCx);
      const normCy = parseFloat(el.dataset.normCy);
      if (!Number.isFinite(normCx) || !Number.isFinite(normCy)) return;

      const ctx = this._resolvePlacementContext(glyph);
      const fontSize = getComponentFontSize(glyph, canvasDim, 1, ctx.role, contextTopology);
      const fontWeight = getComponentFontWeight(glyph, contextTopology, ctx.role);
      const vt = getComponentVisualTransform(glyph, contextTopology, ctx.role);

      el.style.fontSize = `${fontSize}px`;
      el.style.fontWeight = fontWeight;
      el.style.setProperty('--sx', String(vt.scaleX));
      el.style.setProperty('--sy', String(vt.scaleY));
      el.style.left = `${Math.round(normCx * canvasDim - fontSize * 0.5)}px`;
      el.style.top = `${Math.round(normCy * canvasDim - fontSize * 0.5)}px`;
    });
  }

  toggleGhostHint(forcedState) {
    this.isHintActive = (forcedState !== undefined) ? Boolean(forcedState) : !this.isHintActive;
    if (this.dom.hintWatermark) {
      this.dom.hintWatermark.classList.remove('opacity-70', 'opacity-25', 'opacity-0');
      this.dom.hintWatermark.classList.add(this.isHintActive ? 'opacity-25' : 'opacity-0');
    }
    const hintBtn = this.dom.hintBtn || (typeof document !== 'undefined' ? document.getElementById('placement-hint-btn') : null);
    if (hintBtn) {
      if (this.isHintActive) {
        hintBtn.className = 'scaffold-on flex-1 min-h-[44px] py-2 lg:py-2.5 px-2 sm:px-3 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white border-2 border-black font-mono text-[10px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm active-collapse cursor-pointer transition-all';
        hintBtn.innerHTML = '<span class="material-symbols-outlined text-sm sm:text-base shrink-0">visibility</span><span id="placement-hint-btn-text">Guide: On</span>';
      } else {
        hintBtn.className = 'scaffold-off flex-1 min-h-[44px] py-2 lg:py-2.5 px-2 sm:px-3 rounded-xl bg-[#18181b] hover:bg-[#27272a] text-white/90 border-2 border-black font-mono text-[10px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm active-collapse cursor-pointer transition-all';
        hintBtn.innerHTML = '<span class="material-symbols-outlined text-sm sm:text-base shrink-0">visibility_off</span><span id="placement-hint-btn-text">Guide: Off</span>';
      }
    }
  }

  /**
   * Mounts an active word into the Component Builder using stepped 1-char-per-canvas assembly.
   */
  mountWord(word) {
    if (!word) return;
    this.initDom();
    this.activeWord = word;
    this.activeDecompositions = resolveWordDecompositions(word, this.decompositions);

    const charCount = Math.max(1, this.activeDecompositions.length);
    this.activeCharIndex = 0;
    this.charPlacedItems = Array.from({ length: charCount }, () => []);
    this.charDockOrders = this.activeDecompositions.map((decomp, idx) => this._buildCharDockOrder(decomp, idx));
    this.activePlacedComponents = [];
    this._lastCanvasDim = this.dom.canvas ? (this.dom.canvas.clientWidth || 0) : 0;

    this.mountCharacter(0, { skipSync: true });
  }

  /**
   * Builds a deterministic 1-row tile set (targets + distractors) for one character step.
   */
  _buildCharDockOrder(decomp, charIdx) {
    if (!decomp) return [];

    const usedGlyphs = new Set();
    if (this.activeWord) {
      if (this.activeWord.hanzi_simp) {
        Array.from(this.activeWord.hanzi_simp).forEach(c => usedGlyphs.add(c));
      }
      if (Array.isArray(this.activeWord.characters)) {
        this.activeWord.characters.forEach(c => usedGlyphs.add(c));
      }
    }
    this.activeDecompositions.forEach(d => {
      if (d && d.char) usedGlyphs.add(d.char);
    });

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

    const targetItems = (decomp.targetComponents || []).map((tc, pieceIdx) => {
      usedGlyphs.add(tc.glyph);
      return {
        id: `${tc.id || tc.glyph}_${charIdx}_${pieceIdx}`,
        glyph: tc.glyph,
        role: tc.role,
        char: decomp.char,
        isTarget: true
      };
    });

    // Block visually ambiguous square pairs (囗 / 冂 vs 口) dynamically
    if (usedGlyphs.has('囗') || usedGlyphs.has('冂')) {
      usedGlyphs.add('口');
    }
    if (usedGlyphs.has('口')) {
      usedGlyphs.add('囗');
      usedGlyphs.add('冂');
    }

    const distractorCandidates = [];
    if (Array.isArray(decomp.distractorComponents)) {
      decomp.distractorComponents.forEach(d => {
        if (!usedGlyphs.has(d) && !distractorCandidates.includes(d)) {
          distractorCandidates.push(d);
        }
      });
    }

    const backupDistractors = ['禾', '日', '手', '口', '宀', '木', '土', '人', '女', '子', '心'];
    for (const bd of backupDistractors) {
      if (!usedGlyphs.has(bd) && !distractorCandidates.includes(bd)) {
        distractorCandidates.push(bd);
      }
    }

    // Keep dock concise (4-6 tiles total) so tiles always fit on 1 clean horizontal row
    const distractorCount = targetItems.length <= 2 ? 3 : 2;
    const selectedDistractors = distractorCandidates.slice(0, distractorCount).map((glyph, idx) => ({
      id: `distractor_${charIdx}_${idx}_${glyph}`,
      glyph,
      role: 'distractor',
      isTarget: false
    }));

    const dockItems = [...targetItems, ...selectedDistractors];
    for (let i = dockItems.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dockItems[i], dockItems[j]] = [dockItems[j], dockItems[i]];
    }

    return dockItems;
  }

  /**
   * Saves normalized center coordinates of pieces currently placed on the active canvas.
   */
  syncActiveCharToState() {
    if (!this.dom.placedLayer || !this.activeWord) return;
    if (!Array.isArray(this.charPlacedItems)) this.charPlacedItems = [];

    const canvasRect = this.dom.canvas ? this.dom.canvas.getBoundingClientRect() : null;
    const canvasW = (canvasRect && canvasRect.width > 0)
      ? canvasRect.width
      : (this.dom.canvas?.offsetWidth || this.dom.canvas?.clientWidth || 340);
    const canvasH = (canvasRect && canvasRect.height > 0)
      ? canvasRect.height
      : (this.dom.canvas?.offsetHeight || this.dom.canvas?.clientHeight || 340);

    const els = Array.from(this.dom.placedLayer.querySelectorAll('.placed-component-glyph'));
    const saved = els.map(el => {
      const elRect = el.getBoundingClientRect();
      let cx;
      let cy;
      if (canvasRect && canvasRect.width > 0 && elRect.width > 0) {
        cx = elRect.left - canvasRect.left + elRect.width * 0.5;
        cy = elRect.top - canvasRect.top + elRect.height * 0.5;
      } else if (Number.isFinite(parseFloat(el.dataset.normCx)) && Number.isFinite(parseFloat(el.dataset.normCy))) {
        cx = parseFloat(el.dataset.normCx) * canvasW;
        cy = parseFloat(el.dataset.normCy) * canvasH;
      } else {
        const fs = parseFloat(el.style.fontSize) || 60;
        cx = (parseFloat(el.style.left) || 0) + fs * 0.5;
        cy = (parseFloat(el.style.top) || 0) + fs * 0.5;
      }

      const normCx = canvasW > 0 ? Math.max(0.05, Math.min(0.95, cx / canvasW)) : 0.5;
      const normCy = canvasH > 0 ? Math.max(0.05, Math.min(0.95, cy / canvasH)) : 0.5;
      el.dataset.normCx = normCx.toFixed(4);
      el.dataset.normCy = normCy.toFixed(4);

      return {
        id: el.dataset.componentId || el.dataset.glyph,
        glyph: el.dataset.glyph || el.textContent.trim(),
        componentType: el.dataset.componentType || 'standard',
        normCx,
        normCy
      };
    });

    this.charPlacedItems[this.activeCharIndex] = saved;
    this.activePlacedComponents = saved;
  }

  /**
   * Renders a specific character step (0..N-1) onto the full-size square canvas and 1-row dock.
   */
  mountCharacter(index, { skipSync = false } = {}) {
    if (!this.activeWord) return;
    const decomps = this.activeDecompositions || [];
    const charCount = Math.max(1, decomps.length);
    if (index < 0 || index >= charCount) return;

    if (!skipSync) {
      this.syncActiveCharToState();
    }

    this.activeCharIndex = index;
    const activeDecomp = decomps[index] || {};
    const targetChar = activeDecomp.char || (Array.from(this.activeWord.hanzi_simp || '')[index] || '');

    // Update watermark for active single character
    if (this.dom.hintWatermark) {
      this.dom.hintWatermark.textContent = targetChar;
      this.dom.hintWatermark.classList.remove('opacity-70', 'opacity-25', 'opacity-0');
      this.dom.hintWatermark.classList.add(this.isHintActive ? 'opacity-25' : 'opacity-0');
      this.updateWatermarkSizing();
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => this.updateWatermarkSizing());
      }
    }

    // Clear canvas layer and populate active char's single-row dock
    if (this.dom.placedLayer) {
      this.dom.placedLayer.innerHTML = '';
    }
    this.populateDockForChar(index);

    // Restore placed pieces for this character
    const savedPieces = Array.isArray(this.charPlacedItems[index]) ? [...this.charPlacedItems[index]] : [];
    const canvasRect = this.dom.canvas ? this.dom.canvas.getBoundingClientRect() : null;
    const canvasDim = (canvasRect && canvasRect.width > 0)
      ? canvasRect.width
      : (this.dom.canvas?.clientWidth || this.dom.canvas?.offsetWidth || 320);
    const contextTopology = activeDecomp.topology || 'ATOMIC';

    savedPieces.forEach(item => {
      const tile = this.dom.dock
        ? this.dom.dock.querySelector(`.draggable-component-tile[data-component-id="${item.id}"]`)
        : null;
      if (tile) tile.classList.add('hidden');

      const ctx = this._resolvePlacementContext(item.glyph);
      const fontSize = getComponentFontSize(item.glyph, canvasDim, 1, ctx.role, contextTopology);
      const fontWeight = getComponentFontWeight(item.glyph, contextTopology, ctx.role);
      const compType = getComponentType(item.glyph, ctx.role, contextTopology);
      const vt = getComponentVisualTransform(item.glyph, contextTopology, ctx.role);

      const x = Math.round(item.normCx * canvasDim - fontSize * 0.5);
      const y = Math.round(item.normCy * canvasDim - fontSize * 0.5);
      const el = this.createPlacedGlyph(item.glyph, item.id, x, y, fontSize, fontWeight, compType, tile, vt);
      if (el) {
        el.dataset.normCx = Number(item.normCx).toFixed(4);
        el.dataset.normCy = Number(item.normCy).toFixed(4);
      }
    });

    this.refreshActiveCharStyles();
    this.updateCarouselUI();
    this.notifyPlacedChange();
  }

  updateCarouselUI() {
    const count = Math.max(1, (this.activeDecompositions || []).length);
    const isMulti = count > 1;
    const index = this.activeCharIndex;

    const carouselBar = (typeof document !== 'undefined') ? document.getElementById('builder-char-carousel') : null;
    if (carouselBar) {
      carouselBar.classList.toggle('hidden', !isMulti);
    }

    if (this.dom.prevCharBtn) {
      const canPrev = isMulti && index > 0;
      this.dom.prevCharBtn.disabled = !canPrev;
      this.dom.prevCharBtn.classList.toggle('opacity-30', !canPrev);
      this.dom.prevCharBtn.classList.toggle('pointer-events-none', !canPrev);
      this.dom.prevCharBtn.classList.toggle('hidden', !isMulti);
    }
    if (this.dom.nextCharBtn) {
      const canNext = isMulti && index < count - 1;
      this.dom.nextCharBtn.disabled = !canNext;
      this.dom.nextCharBtn.classList.toggle('opacity-30', !canNext);
      this.dom.nextCharBtn.classList.toggle('pointer-events-none', !canNext);
      this.dom.nextCharBtn.classList.toggle('hidden', !isMulti);
    }
    if (this.dom.charPills) {
      if (isMulti) {
        this.dom.charPills.classList.remove('hidden');
        const dots = Array.from({ length: count }, (_, i) => {
          const hasPieces = (i === this.activeCharIndex && this.dom.placedLayer)
            ? this.dom.placedLayer.querySelectorAll('.placed-component-glyph').length > 0
            : ((this.charPlacedItems[i] && this.charPlacedItems[i].length > 0) || false);
          return hasPieces ? '●' : '○';
        }).join('');
        this.dom.charPills.textContent = `Char ${index + 1} of ${count} • ${dots}`;
      } else {
        this.dom.charPills.classList.add('hidden');
      }
    }
  }

  /**
   * Populates the single-row dock for character index charIdx.
   */
  populateDockForChar(charIdx) {
    if (!this.dom.dock) return;

    const dockItems = this.charDockOrders[charIdx] || [];
    const activeDecomp = this.activeDecompositions[charIdx] || null;
    const dockTopology = activeDecomp?.topology || 'ATOMIC';

    this.dom.dock.innerHTML = '';
    dockItems.forEach(item => {
      const tile = document.createElement('div');
      tile.className = 'draggable-component-tile w-11 h-11 sm:w-12 sm:h-12 lg:w-[52px] lg:h-[52px] shrink-0 bg-white border-2 border-black rounded-xl shadow-hard-black flex items-center justify-center font-chinese font-bold text-xl sm:text-2xl lg:text-3xl text-black cursor-grab active:cursor-grabbing select-none transition-transform hover:scale-105 active:scale-95 touch-none';
      tile.dataset.componentId = item.id;
      tile.dataset.glyph = item.glyph;
      tile.dataset.componentType = getComponentType(item.glyph, null, dockTopology);
      tile.title = `${item.glyph}`;
      const glyphSpan = document.createElement('span');
      glyphSpan.className = 'component-tile-glyph';
      glyphSpan.textContent = item.glyph;
      tile.appendChild(glyphSpan);

      this.bindDockTileDrag(tile, item);
      this.dom.dock.appendChild(tile);
    });
  }

  populateDock() {
    this.populateDockForChar(this.activeCharIndex);
  }

  /**
   * Resolves (topology, role, charCount) strictly for the active single character canvas (ZERO-SPOILER).
   */
  _resolvePlacementContext(glyph) {
    const activeDecomp = (this.activeDecompositions || [])[this.activeCharIndex] || null;
    const contextTopology = activeDecomp?.topology || 'ATOMIC';
    let contextRole = null;
    if (contextTopology === 'ENCLOSURE') {
      contextRole = isOuterFrameGlyph(glyph, 'ENCLOSURE') ? 'outer' : 'inner';
    }
    return { topology: contextTopology, role: contextRole, charCount: 1 };
  }

  /**
   * Harmonizes proportions and weights whenever a piece is dropped, moved, or removed.
   */
  refreshActiveCharStyles() {
    if (!this.dom.placedLayer || !this.dom.canvas) return;

    const canvasRect = this.dom.canvas.getBoundingClientRect();
    const canvasDim = canvasRect.width || this.dom.canvas.clientWidth || 340;
    const placedEls = Array.from(this.dom.placedLayer.querySelectorAll('.placed-component-glyph'));

    placedEls.forEach(el => {
      const rect = el.getBoundingClientRect();
      const glyph = el.dataset.glyph || el.textContent.trim();
      const oldSize = parseFloat(el.style.fontSize) || rect.height || 60;
      const ctx = this._resolvePlacementContext(glyph);
      const newSize = getComponentFontSize(glyph, canvasDim, 1, ctx.role, ctx.topology);
      const newWeight = getComponentFontWeight(glyph, ctx.topology, ctx.role);
      const compType = getComponentType(glyph, ctx.role, ctx.topology);
      const vt = getComponentVisualTransform(glyph, ctx.topology, ctx.role);

      el.dataset.componentType = compType;
      el.style.fontSize = `${newSize}px`;
      el.style.fontWeight = newWeight;
      el.style.setProperty('--sx', String(vt.scaleX));
      el.style.setProperty('--sy', String(vt.scaleY));

      if (Math.abs(newSize - oldSize) > 0.5) {
        const oldLeft = parseFloat(el.style.left) || 0;
        const oldTop = parseFloat(el.style.top) || 0;
        const deltaHalf = (oldSize - newSize) * 0.5;
        el.style.left = `${Math.round(oldLeft + deltaHalf)}px`;
        el.style.top = `${Math.round(oldTop + deltaHalf)}px`;
      }
    });
  }

  getActiveCharPlacedCount() {
    if (this.dom.placedLayer) {
      return this.dom.placedLayer.querySelectorAll('.placed-component-glyph').length;
    }
    return (this.charPlacedItems[this.activeCharIndex] || []).length;
  }

  getTotalPlacedCount() {
    this.syncActiveCharToState();
    return (this.charPlacedItems || []).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
  }

  notifyPlacedChange() {
    this.updateCarouselUI();
    if (typeof this.onPlacedChange === 'function') {
      const activeCount = this.getActiveCharPlacedCount();
      const totalCount = (this.charPlacedItems || []).reduce((sum, list, idx) => (
        sum + (idx === this.activeCharIndex ? activeCount : (Array.isArray(list) ? list.length : 0))
      ), 0);
      this.onPlacedChange(activeCount, totalCount);
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
      const canvasRect = this.dom.canvas.getBoundingClientRect();
      const canvasDim = canvasRect.width || 340;
      const dragCtx = this._resolvePlacementContext(glyph);
      const compType = getComponentType(glyph, dragCtx.role, dragCtx.topology);
      const targetFontSize = getComponentFontSize(glyph, canvasDim, 1, dragCtx.role, dragCtx.topology);
      const targetFontWeight = getComponentFontWeight(glyph, dragCtx.topology, dragCtx.role);
      const visualTransform = getComponentVisualTransform(glyph, dragCtx.topology, dragCtx.role);

      // Create floating drag avatar showing pure stroke font with anisotropic proportions
      const avatar = document.createElement('div');
      avatar.className = 'fixed z-[9999] pointer-events-none font-chinese text-[#1E1B2E] leading-none flex items-center justify-center select-none';
      avatar.dataset.componentType = compType;
      avatar.style.fontSize = `${targetFontSize}px`;
      avatar.style.fontWeight = targetFontWeight;
      avatar.style.lineHeight = '0.88';
      avatar.style.transformOrigin = 'center center';
      avatar.style.transform = `scale(${visualTransform.scaleX}, ${visualTransform.scaleY})`;
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

        if (
          dropX >= cRect.left &&
          dropX <= cRect.right &&
          dropY >= cRect.top &&
          dropY <= cRect.bottom
        ) {
          tile.classList.add('hidden');

          const dropRelCenterX = dropX - cRect.left;
          const dropRelCenterY = dropY - cRect.top;
          const dropCtx = this._resolvePlacementContext(glyph);
          const dropCanvasDim = cRect.width || 340;
          const dropFontSize = getComponentFontSize(glyph, dropCanvasDim, 1, dropCtx.role, dropCtx.topology);
          const dropFontWeight = getComponentFontWeight(glyph, dropCtx.topology, dropCtx.role);
          const dropCompType = getComponentType(glyph, dropCtx.role, dropCtx.topology);
          const dropTransform = getComponentVisualTransform(glyph, dropCtx.topology, dropCtx.role);

          const relX = Math.round(dropRelCenterX - dropFontSize * 0.5);
          const relY = Math.round(dropRelCenterY - dropFontSize * 0.5);
          const clampedX = Math.max(-Math.round(dropFontSize * 0.15), Math.min(cRect.width - Math.round(dropFontSize * 0.7), relX));
          const clampedY = Math.max(-Math.round(dropFontSize * 0.15), Math.min(cRect.height - Math.round(dropFontSize * 0.7), relY));

          const placedEl = this.createPlacedGlyph(glyph, compId, clampedX, clampedY, dropFontSize, dropFontWeight, dropCompType, tile, dropTransform);
          if (placedEl && cRect.width > 0 && cRect.height > 0) {
            placedEl.dataset.normCx = ((clampedX + dropFontSize * 0.5) / cRect.width).toFixed(4);
            placedEl.dataset.normCy = ((clampedY + dropFontSize * 0.5) / cRect.height).toFixed(4);
          }
          this.refreshActiveCharStyles();
          this.syncActiveCharToState();
          this.notifyPlacedChange();
        }
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    });
  }

  /**
   * Creates a pure typography glyph element on the canvas drop surface.
   */
  createPlacedGlyph(glyph, compId, x, y, fontSize, fontWeight, compType, sourceTile, visualTransform = null) {
    if (!this.dom.placedLayer) return null;

    const vt = visualTransform || { scaleX: 1, scaleY: 1 };
    const placed = document.createElement('div');
    placed.className = 'placed-component-glyph';
    placed.dataset.componentType = compType;
    placed.style.left = `${x}px`;
    placed.style.top = `${y}px`;
    placed.style.fontSize = `${fontSize}px`;
    placed.style.fontWeight = fontWeight;
    placed.style.setProperty('--sx', String(vt.scaleX));
    placed.style.setProperty('--sy', String(vt.scaleY));
    placed.dataset.componentId = compId;
    placed.dataset.glyph = glyph;
    placed.textContent = glyph;

    let hasMoved = false;
    placed.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try { placed.setPointerCapture(e.pointerId); } catch (_) {}

      hasMoved = false;
      const activeFontSize = parseFloat(placed.style.fontSize) || fontSize;
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
        const newX = Math.max(-Math.round(activeFontSize * 0.2), Math.min(currentRect.width - Math.round(activeFontSize * 0.6), startLeft + dx));
        const newY = Math.max(-Math.round(activeFontSize * 0.2), Math.min(currentRect.height - Math.round(activeFontSize * 0.6), startTop + dy));
        placed.style.left = `${newX}px`;
        placed.style.top = `${newY}px`;
      };

      const onUp = (ue) => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        try { placed.releasePointerCapture(e.pointerId); } catch (_) {}

        const cRect = this.dom.canvas.getBoundingClientRect();
        const isOutside = (ue.clientX < cRect.left || ue.clientX > cRect.right || ue.clientY < cRect.top || ue.clientY > cRect.bottom);

        if (!hasMoved || isOutside) {
          this.returnGlyphToDock(placed, sourceTile);
        } else {
          this.refreshActiveCharStyles();
          this.syncActiveCharToState();
          this.notifyPlacedChange();
        }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });

    this.dom.placedLayer.appendChild(placed);
    return placed;
  }

  /**
   * Returns a placed component back to the dock tray.
   */
  returnGlyphToDock(placedEl, sourceTile = null) {
    const compId = placedEl ? placedEl.dataset.componentId : null;
    if (placedEl && placedEl.parentNode) {
      placedEl.parentNode.removeChild(placedEl);
    }
    const tile = sourceTile || (compId && this.dom.dock
      ? this.dom.dock.querySelector(`.draggable-component-tile[data-component-id="${compId}"]`)
      : null);
    if (tile) {
      tile.classList.remove('hidden');
    }
    this.refreshActiveCharStyles();
    this.syncActiveCharToState();
    this.notifyPlacedChange();
  }

  /**
   * Removes the most recently placed piece from the active character (Mirror Parity: Undo).
   */
  undoLastPlaced() {
    if (!this.dom.placedLayer) return;
    const placedEls = this.dom.placedLayer.querySelectorAll('.placed-component-glyph');
    if (placedEls.length === 0) {
      if (typeof this.onUndo === 'function') this.onUndo(false);
      return;
    }
    const lastEl = placedEls[placedEls.length - 1];
    this.returnGlyphToDock(lastEl);
    if (typeof this.onUndo === 'function') {
      this.onUndo(true);
    }
  }

  /**
   * Clears only the active character's placed components (Mirror Parity with Calligraphy clearCanvas).
   */
  clearActiveCharacter() {
    if (this.dom.placedLayer) {
      this.dom.placedLayer.innerHTML = '';
    }
    if (Array.isArray(this.charPlacedItems)) {
      this.charPlacedItems[this.activeCharIndex] = [];
    }
    this.activePlacedComponents = [];
    if (this.dom.dock) {
      this.dom.dock.querySelectorAll('.draggable-component-tile').forEach(t => t.classList.remove('hidden'));
    }
    this.notifyPlacedChange();
  }

  /**
   * Resets all characters in the active word back to Character 1 (used on word retry).
   */
  resetCanvas() {
    const charCount = Math.max(1, (this.activeDecompositions || []).length);
    this.charPlacedItems = Array.from({ length: charCount }, () => []);
    this.activePlacedComponents = [];
    this.activeCharIndex = 0;
    this.mountCharacter(0, { skipSync: true });
  }

  /**
   * Reads all placed components currently on the active canvas.
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
        x,
        y,
        width,
        height,
        centerX: x + width * 0.5,
        centerY: y + height * 0.5,
        element: el
      });
    });

    return list;
  }

  _buildPlacedForCharIndex(charIdx, canvasWidth) {
    if (charIdx === this.activeCharIndex && this.dom.canvas && this.dom.canvas.clientWidth > 0) {
      return this.getPlacedComponents();
    }
    const saved = (this.charPlacedItems && this.charPlacedItems[charIdx]) || [];
    const decomp = (this.activeDecompositions || [])[charIdx] || {};
    const topology = decomp.topology || 'ATOMIC';
    return saved.map(item => {
      const role = topology === 'ENCLOSURE'
        ? (isOuterFrameGlyph(item.glyph, 'ENCLOSURE') ? 'outer' : 'inner')
        : null;
      const size = getComponentFontSize(item.glyph, canvasWidth, 1, role, topology);
      const centerX = item.normCx * canvasWidth;
      const centerY = item.normCy * canvasWidth;
      return {
        id: item.id,
        glyph: item.glyph,
        x: centerX - size * 0.5,
        y: centerY - size * 0.5,
        width: size,
        height: size,
        centerX,
        centerY
      };
    });
  }

  /**
   * Runs the RST evaluation across the active word (stepped 1-char-per-canvas flow).
   */
  evaluateActivePlacement(dictionary = null, corpus = null, attemptsLeft = 3) {
    this.syncActiveCharToState();
    const canvasWidth = (this.dom.canvas && (this.dom.canvas.clientWidth || this.dom.canvas.offsetWidth)) || 340;
    const dict = dictionary || this.decompositions || {};
    const decomps = this.activeDecompositions || [];
    const charCount = Math.max(1, decomps.length);

    const charBuckets = Array.from({ length: charCount }, (_, idx) => this._buildPlacedForCharIndex(idx, canvasWidth));
    const totalPlaced = charBuckets.reduce((sum, list) => sum + list.length, 0);

    if (totalPlaced === 0) {
      return gradeComponentBuilder([], [decomps[this.activeCharIndex] || {}], canvasWidth, dict, corpus || [], attemptsLeft);
    }

    // Stepped Multi-Char Check: if active character is built & valid while another character is still empty, advance cleanly without penalty
    if (charCount > 1) {
      const activeIdx = this.activeCharIndex;
      const activeDecomp = decomps[activeIdx];
      const activePlaced = charBuckets[activeIdx] || [];
      if (activePlaced.length > 0 && activeDecomp) {
        const activeGrade = gradeComponentBuilder(activePlaced, [activeDecomp], canvasWidth, dict, corpus || [], attemptsLeft);
        if (activeGrade.success) {
          const nextEmptyIdx = charBuckets.findIndex((b, idx) => idx !== activeIdx && b.length === 0);
          if (nextEmptyIdx !== -1) {
            return {
              status: 'NEXT_CHAR',
              success: false,
              noPenalty: true,
              autoAdvanceToChar: nextEmptyIdx,
              charIndex: activeIdx,
              badge: `Part ${activeIdx + 1} Ready!`,
              detail: `Nice! Now build character ${nextEmptyIdx + 1} of ${charCount}.`
            };
          }
        } else {
          return { ...activeGrade, charIndex: activeIdx };
        }
      }
    }

    let worstTier = 1;
    let chosenDetail = 'All pieces snapped cleanly into place.';
    let chosenBadge = '🎯 Clean Assembly!';

    for (let k = 0; k < charCount; k++) {
      const res = gradeComponentBuilder(charBuckets[k], [decomps[k]], canvasWidth, dict, corpus || [], attemptsLeft);
      if (!res.success) {
        return { ...res, charIndex: k };
      }
      if (res.tier > worstTier) {
        worstTier = res.tier;
        chosenDetail = res.detail;
        chosenBadge = res.badge;
      }
    }

    return {
      status: worstTier === 2 ? 'SOFT_PASS' : 'CLEAN_PASS',
      tier: worstTier,
      success: true,
      badge: chosenBadge,
      detail: chosenDetail
    };
  }

  /**
   * Plays the crystallization animation upon successful assembly on the active 1-char canvas.
   */
  playCrystallizationAnimation(onComplete) {
    if (!this.dom.placedLayer) {
      if (onComplete) onComplete();
      return;
    }

    const glyphs = this.dom.placedLayer.querySelectorAll('.placed-component-glyph');
    glyphs.forEach(g => {
      g.classList.add('crystallize-pulse');
      g.style.transition = 'opacity 0.28s ease-out, filter 0.15s ease';
      g.style.opacity = '0.2';
      g.style.filter = 'drop-shadow(0 0 14px #10B981)';
    });

    const chars = (this.activeWord && (this.activeWord.characters || Array.from(this.activeWord.hanzi_simp || ''))) || [];
    const activeChar = chars[this.activeCharIndex] || (this.activeWord && this.activeWord.hanzi_simp) || '';
    if (activeChar) {
      const canvasWidth = this.dom.canvas ? (this.dom.canvas.clientWidth || 340) : 340;
      const overlay = document.createElement('div');
      overlay.className = 'crystallized-word-overlay crystallize-pulse';
      overlay.style.setProperty('--sx', '1');
      overlay.style.setProperty('--sy', '1');
      overlay.style.fontSize = `${Math.round(canvasWidth * 0.52)}px`;
      overlay.textContent = activeChar;
      this.dom.placedLayer.appendChild(overlay);
    }

    setTimeout(() => {
      glyphs.forEach(g => {
        g.style.filter = '';
        g.style.opacity = '0';
      });
      if (onComplete) onComplete();
    }, 420);
  }

  /**
   * Reveals canonical solution for the active character upon attempt exhaustion.
   */
  revealCanonicalSolution() {
    if (this.dom.hintWatermark) {
      this.dom.hintWatermark.classList.remove('opacity-0', 'opacity-25');
      this.dom.hintWatermark.classList.add('opacity-70');
    }
  }
}
