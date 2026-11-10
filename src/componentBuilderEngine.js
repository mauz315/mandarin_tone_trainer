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
    pocketFactorX = 0.56;
    pocketFactorY = 0.58;
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
  '失': 'lose', '父': 'father', '且': 'moreover', '此': 'this', '几': 'several / table'
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
      return '✓ Recognized! 💡 Tip: Keep the left and right components aligned and closer together.';
    case 'TOP_BOTTOM':
    case 'TOP_MID_BOTTOM':
      return '✓ Recognized! 💡 Tip: Stack components directly above one another along the center vertical axis.';
    case 'ENCLOSURE':
      return '✓ Recognized! 💡 Tip: Tuck the inner piece cleanly inside the outer frame.';
    case 'CROSSING':
      return '✓ Recognized! 💡 Tip: Anchor the marker cleanly relative to the base character.';
    case 'ATOMIC':
    default:
      if (charCount > 1) {
        return '✓ Recognized! 💡 Tip: Space each character evenly from left to right across the grid.';
      }
      return '✓ Recognized! 💡 Tip: Place the character near the center crosshairs for balanced framing.';
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
        badge: '📖 Solution Revealed',
        detail: 'All 3 attempts used. Study the canonical components above before continuing.',
        isPass: false
      };
    }
    return {
      status: 'DIAGNOSTIC_FAIL',
      tier: 3,
      success: false,
      badge: '⚠️ Incomplete',
      detail: 'Drag component pieces from the dock onto the canvas.'
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
        badge: '✨ Assembly Recognized!',
        detail: getTier2CoachingTip(decomps, evalResult.maxDriftAxis),
        maxDriftRatio: drift,
        maxDriftAxis: evalResult.maxDriftAxis || null
      };
    }
    return {
      status: 'CLEAN_PASS',
      tier: 1,
      success: true,
      badge: '🎯 Flawless Assembly!',
      detail: 'Flawless execution! Spatial assembly and radical positioning verified.',
      maxDriftRatio: drift,
      maxDriftAxis: evalResult.maxDriftAxis || null
    };
  }

  if (attemptsLeft <= 0) {
    return {
      status: 'DIAGNOSTIC_FAIL',
      tier: 3,
      success: false,
      badge: '📖 Solution Revealed',
      detail: 'All 3 attempts used. Study the canonical components above before continuing.',
      reason: evalResult.reason,
      isPass: false
    };
  }

  // Diagnostic Failure (Tier 3) — Zero-Spoiler Policy
  const reason = evalResult.reason;
  let badge = '⚠️ Alignment Error';
  let detail = 'Components are misplaced on the grid.';

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
      detail = `Almost! You need ${deficit} more component${deficit > 1 ? 's' : ''} on the grid to complete this word.`;
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
              const candMeaning = candMeaningRaw ? ` (${candMeaningRaw})` : '';
              badge = '🔍 Radical Confusion';
              if (info.topology === 'ATOMIC') {
                detail = `You selected '${candidateChar}'${candMeaning}. Check the audio prompt and try swapping '${extraGlyphs[0]}'.`;
              } else {
                detail = `You assembled '${candidateChar}'${candMeaning} with '${extraGlyphs[0]}'. Check the audio prompt and try swapping '${extraGlyphs[0]}'.`;
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
        const targetMeaning = getWordMeaning(targetWord, corpus);
        badge = '🔍 Radical Confusion';
        detail = `'${extraStr}'${extraGloss ? ` (${extraGloss})` : ''} doesn't belong here${targetMeaning ? ` (this prompt means "${targetMeaning}")` : ''}. Try swapping it for another piece.`;
      }
    } else {
      badge = '⚠️ Wrong Pieces';
      detail = 'Placed components do not match the target character.';
    }
  } else if (reason === 'MISPLACED_LEFT_RIGHT') {
    badge = '🔄 Order Inversion';
    detail = 'Invert positions: Semantic radical belongs on the left, stem belongs on the right.';
  } else if (reason === 'MISPLACED_TOP_BOTTOM') {
    badge = '🔄 Vertical Inversion';
    detail = 'Invert vertical positions: Top component belongs above the base.';
  } else if (reason === 'MISPLACED_ENCLOSURE') {
    badge = '📦 Enclosure Breach';
    detail = 'The inner component belongs inside the outer frame.';
  } else if (reason === 'MISPLACED_TOP_MID_BOTTOM') {
    badge = '🔄 Vertical Sequence';
    detail = 'Sequence mismatch: Check the positional order of the 3 components from top to bottom.';
  } else if (reason === 'MISPLACED_LEFT_MID_RIGHT') {
    badge = '🔄 Horizontal Sequence';
    detail = 'Sequence mismatch: Check the positional order of the 3 components from left to right.';
  } else if (reason === 'MISPLACED_CHARACTERS') {
    badge = '↔️ Reading Order';
    detail = 'Invert character order: Chinese reads strictly left-to-right.';
  } else if (reason === 'MISPLACED_CROSSING') {
    badge = '🎯 Marker Alignment';
    detail = 'Marker component is misaligned with the base root.';
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
    this._resizeObserver = null;
    this._resizeRafId = null;
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
        const nextState = !this.isHintActive;
        this.toggleGhostHint(nextState);
        if (typeof this.onHintToggle === 'function') {
          this.onHintToggle(nextState);
        } else if (typeof window !== 'undefined' && window.WordTrainerEngine) {
          window.WordTrainerEngine.toggleScaffolding(nextState);
        }
      });
    }

    // 3. Responsive Watermark Resizing (Decision C)
    if (typeof ResizeObserver !== 'undefined' && this.dom.canvas && !this._resizeObserver) {
      this._resizeObserver = new ResizeObserver(() => {
        if (this._resizeRafId) cancelAnimationFrame(this._resizeRafId);
        this._resizeRafId = requestAnimationFrame(() => {
          this._resizeRafId = null;
          this.updateWatermarkSizing();
        });
      });
      this._resizeObserver.observe(this.dom.canvas);
    }
  }

  updateWatermarkSizing() {
    if (!this.dom.hintWatermark || !this.dom.canvas || !this.activeWord) return;
    const canvasDim = this.dom.canvas.clientWidth || 0;
    if (canvasDim <= 0) return;

    const chars = this.activeWord.characters || Array.from(this.activeWord.hanzi_simp || '');
    const count = Math.max(1, chars.length);

    let ratio = 0.50;
    if (count === 2) ratio = 0.36;
    else if (count === 3) ratio = 0.25;
    else if (count >= 4) ratio = 0.19;

    const fontSize = Math.max(36, Math.round(canvasDim * ratio));
    this.dom.hintWatermark.style.fontSize = `${fontSize}px`;
  }

  toggleGhostHint(forcedState) {
    this.isHintActive = (forcedState !== undefined) ? forcedState : !this.isHintActive;
    if (this.dom.hintWatermark) {
      this.dom.hintWatermark.classList.remove('opacity-70', 'opacity-25', 'opacity-0');
      if (this.isHintActive) {
        this.dom.hintWatermark.classList.add('opacity-25');
      } else {
        this.dom.hintWatermark.classList.add('opacity-0');
      }
    }
    const hintBtn = this.dom.hintBtn || (typeof document !== 'undefined' ? document.getElementById('placement-hint-btn') : null);
    const textSpan = document.getElementById('placement-hint-btn-text');
    if (this.isHintActive) {
      if (hintBtn) {
        hintBtn.classList.add('bg-[#E11D48]');
        hintBtn.classList.remove('bg-[#065F46]');
      }
      if (textSpan) textSpan.textContent = 'HINT: ON';
    } else {
      if (hintBtn) {
        hintBtn.classList.remove('bg-[#E11D48]');
        hintBtn.classList.add('bg-[#065F46]');
      }
      if (textSpan) textSpan.textContent = 'HINT: OFF';
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
      this.dom.hintWatermark.classList.remove('opacity-70', 'opacity-25', 'opacity-0');
      if (this.isHintActive) {
        this.dom.hintWatermark.classList.add('opacity-25');
      } else {
        this.dom.hintWatermark.classList.add('opacity-0');
      }
      this.updateWatermarkSizing();
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => this.updateWatermarkSizing());
      }
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

    // Block visually ambiguous square pairs (囗 / 冂 vs 口) dynamically
    if (usedGlyphs.has('囗') || usedGlyphs.has('冂')) {
      usedGlyphs.add('口');
    }
    if (usedGlyphs.has('口')) {
      usedGlyphs.add('囗');
      usedGlyphs.add('冂');
    }

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
    const hasEnclosure = this._hasEnclosureInWord();
    const dockTopology = (this.activeDecompositions && this.activeDecompositions.length === 1)
      ? (this.activeDecompositions[0]?.topology || 'ATOMIC')
      : (hasEnclosure ? 'ENCLOSURE' : 'ATOMIC');
    dockItems.forEach(item => {
      const tile = document.createElement('div');
      tile.className = 'draggable-component-tile w-10 h-10 xs:w-11 xs:h-11 lg:w-14 lg:h-14 bg-white border-2 border-black rounded-xl shadow-hard-black flex items-center justify-center font-chinese font-bold text-xl xs:text-2xl lg:text-3xl text-black cursor-grab active:cursor-grabbing select-none transition-transform hover:scale-105 active:scale-95 touch-none';
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

    this.updateDockCount();
  }

  _hasEnclosureInWord() {
    return (this.activeDecompositions || []).some(d => d && d.topology === 'ENCLOSURE');
  }

  /**
   * Resolves (topology, role, charCount) strictly from activeDecompositions and placed canvas geometry.
   * ZERO-SPOILER RULE: never reads item.isTarget, ensuring target and distractor tiles morph identically.
   */
  _resolvePlacementContext(glyph, dropCenterX = null, dropCenterY = null, excludeEl = null) {
    const charCount = Math.max(1, (this.activeDecompositions || []).length);
    const hasEnclosure = this._hasEnclosureInWord();

    if (charCount === 1) {
      const contextTopology = this.activeDecompositions[0]?.topology || 'ATOMIC';
      let contextRole = null;
      if (contextTopology === 'ENCLOSURE') {
        contextRole = isOuterFrameGlyph(glyph, 'ENCLOSURE') ? 'outer' : 'inner';
      }
      return { topology: contextTopology, role: contextRole, charCount };
    }

    // Multi-character word: recognize outer frames if word contains an ENCLOSURE character
    if (isOuterFrameGlyph(glyph, hasEnclosure ? 'ENCLOSURE' : null)) {
      return { topology: 'ENCLOSURE', role: 'outer', charCount };
    }

    if (dropCenterX !== null && dropCenterY !== null && this.dom.placedLayer && this.dom.canvas) {
      const canvasRect = this.dom.canvas.getBoundingClientRect();
      const placedEls = this.dom.placedLayer.querySelectorAll('.placed-component-glyph');
      for (const el of placedEls) {
        if (el === excludeEl) continue;
        const elGlyph = el.dataset.glyph || el.textContent.trim();
        if (!isOuterFrameGlyph(elGlyph, hasEnclosure ? 'ENCLOSURE' : null)) continue;
        const elRect = el.getBoundingClientRect();
        const ex = elRect.left - canvasRect.left;
        const ey = elRect.top - canvasRect.top;
        const ew = elRect.width || parseFloat(el.style.fontSize) || 60;
        const eh = elRect.height || parseFloat(el.style.fontSize) || 60;
        const padX = ew * 0.12;
        const padY = eh * 0.12;
        if (dropCenterX >= ex - padX && dropCenterX <= ex + ew + padX &&
            dropCenterY >= ey - padY && dropCenterY <= ey + eh + padY) {
          return { topology: 'ENCLOSURE', role: 'inner', charCount };
        }
      }
    }

    return { topology: 'ATOMIC', role: null, charCount };
  }

  /**
   * Auto-rescales pieces on multi-character canvases whenever an outer frame or inner glyph
   * is dropped, repositioned, or removed. Keeps piece center pinned when size changes.
   */
  refreshMultiCharEnclosureStyles() {
    if (!this.dom.placedLayer || !this.dom.canvas) return;
    const charCount = Math.max(1, (this.activeDecompositions || []).length);
    if (charCount < 2) return;

    const canvasRect = this.dom.canvas.getBoundingClientRect();
    const canvasDim = canvasRect.width || 340;
    const placedEls = Array.from(this.dom.placedLayer.querySelectorAll('.placed-component-glyph'));

    const snapshots = placedEls.map(el => {
      const rect = el.getBoundingClientRect();
      const oldSize = parseFloat(el.style.fontSize) || rect.height || 60;
      const cx = rect.width > 0
        ? (rect.left - canvasRect.left + rect.width * 0.5)
        : ((parseFloat(el.style.left) || 0) + oldSize * 0.5);
      const cy = rect.height > 0
        ? (rect.top - canvasRect.top + rect.height * 0.5)
        : ((parseFloat(el.style.top) || 0) + oldSize * 0.5);
      return {
        el,
        glyph: el.dataset.glyph || el.textContent.trim(),
        oldSize,
        cx,
        cy
      };
    });

    for (const snap of snapshots) {
      const ctx = this._resolvePlacementContext(snap.glyph, snap.cx, snap.cy, snap.el);
      const newSize = getComponentFontSize(snap.glyph, canvasDim, charCount, ctx.role, ctx.topology);
      const newWeight = getComponentFontWeight(snap.glyph, ctx.topology, ctx.role);
      const compType = getComponentType(snap.glyph, ctx.role, ctx.topology);
      const vt = getComponentVisualTransform(snap.glyph, ctx.topology, ctx.role);

      snap.el.dataset.componentType = compType;
      snap.el.style.fontSize = `${newSize}px`;
      snap.el.style.fontWeight = newWeight;
      snap.el.style.setProperty('--sx', String(vt.scaleX));
      snap.el.style.setProperty('--sy', String(vt.scaleY));

      if (Math.abs(newSize - snap.oldSize) > 0.5) {
        const oldLeft = parseFloat(snap.el.style.left) || 0;
        const oldTop = parseFloat(snap.el.style.top) || 0;
        const deltaHalf = (snap.oldSize - newSize) * 0.5;
        snap.el.style.left = `${Math.round(oldLeft + deltaHalf)}px`;
        snap.el.style.top = `${Math.round(oldTop + deltaHalf)}px`;
      }
    }
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
      const canvasRect = this.dom.canvas.getBoundingClientRect();
      const canvasDim = canvasRect.width || 340;
      const dragCtx = this._resolvePlacementContext(glyph, null, null, null);
      const compType = getComponentType(glyph, dragCtx.role, dragCtx.topology);
      const targetFontSize = getComponentFontSize(glyph, canvasDim, dragCtx.charCount, dragCtx.role, dragCtx.topology);
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

        // Check if dropped inside canvas
        if (
          dropX >= cRect.left &&
          dropX <= cRect.right &&
          dropY >= cRect.top &&
          dropY <= cRect.bottom
        ) {
          tile.classList.add('hidden');
          this.updateDockCount();

          const dropRelCenterX = dropX - cRect.left;
          const dropRelCenterY = dropY - cRect.top;
          const dropCtx = this._resolvePlacementContext(glyph, dropRelCenterX, dropRelCenterY, null);
          const dropCanvasDim = cRect.width || 340;
          const dropFontSize = getComponentFontSize(glyph, dropCanvasDim, dropCtx.charCount, dropCtx.role, dropCtx.topology);
          const dropFontWeight = getComponentFontWeight(glyph, dropCtx.topology, dropCtx.role);
          const dropCompType = getComponentType(glyph, dropCtx.role, dropCtx.topology);
          const dropTransform = getComponentVisualTransform(glyph, dropCtx.topology, dropCtx.role);

          const relX = Math.round(dropRelCenterX - dropFontSize * 0.5);
          const relY = Math.round(dropRelCenterY - dropFontSize * 0.5);
          const clampedX = Math.max(-Math.round(dropFontSize * 0.15), Math.min(cRect.width - Math.round(dropFontSize * 0.7), relX));
          const clampedY = Math.max(-Math.round(dropFontSize * 0.15), Math.min(cRect.height - Math.round(dropFontSize * 0.7), relY));

          this.createPlacedGlyph(glyph, compId, clampedX, clampedY, dropFontSize, dropFontWeight, dropCompType, tile, dropTransform);
          this.refreshMultiCharEnclosureStyles();
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
    if (!this.dom.placedLayer) return;

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

    // Repositioning drag on canvas
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

        // If user tapped without dragging, or dragged outside canvas: return piece to dock
        const cRect = this.dom.canvas.getBoundingClientRect();
        const isOutside = (ue.clientX < cRect.left || ue.clientX > cRect.right || ue.clientY < cRect.top || ue.clientY > cRect.bottom);

        if (!hasMoved || isOutside) {
          this.returnGlyphToDock(placed, sourceTile);
        } else {
          this.refreshMultiCharEnclosureStyles();
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
    this.refreshMultiCharEnclosureStyles();
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
  evaluateActivePlacement(dictionary = null, corpus = null, attemptsLeft = 3) {
    const placed = this.getPlacedComponents();
    const canvasWidth = this.dom.canvas ? this.dom.canvas.clientWidth : 340;
    const dict = dictionary || this.decompositions || {};
    return gradeComponentBuilder(placed, this.activeDecompositions, canvasWidth, dict, corpus || [], attemptsLeft);
  }

  /**
   * Plays the crystallization animation upon successful assembly, morphing loose tiles into
   * the canonical unified character string for orthographic reinforcement.
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

    if (this.activeWord && this.activeWord.hanzi_simp) {
      const charLen = Math.max(1, Array.from(this.activeWord.hanzi_simp).length);
      const canvasWidth = this.dom.canvas ? (this.dom.canvas.clientWidth || 340) : 340;
      let overlayRatio = 0.52;
      if (charLen === 2) overlayRatio = 0.38;
      else if (charLen === 3) overlayRatio = 0.26;
      else if (charLen >= 4) overlayRatio = 0.20;

      const overlay = document.createElement('div');
      overlay.className = 'crystallized-word-overlay crystallize-pulse';
      overlay.style.setProperty('--sx', '1');
      overlay.style.setProperty('--sy', '1');
      overlay.style.fontSize = `${Math.round(canvasWidth * overlayRatio)}px`;
      overlay.textContent = this.activeWord.hanzi_simp;
      this.dom.placedLayer.appendChild(overlay);
    }

    setTimeout(() => {
      glyphs.forEach(g => {
        g.style.filter = '';
        g.style.opacity = '0';
      });
      if (onComplete) onComplete();
    }, 450);
  }

  /**
   * Reveals canonical solution upon attempt exhaustion by highlighting the watermark outline.
   * NOTE: Purely visual review aid on canvas; does NOT mutate persistent user preference or button label.
   */
  revealCanonicalSolution() {
    if (this.dom.hintWatermark) {
      this.dom.hintWatermark.classList.remove('opacity-0', 'opacity-25');
      this.dom.hintWatermark.classList.add('opacity-70');
    }
  }
}
