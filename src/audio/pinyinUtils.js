/**
 * pinyinUtils.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Linguistic parser for Mandarin Pinyin syllables.
 *
 * Decomposes syllables into:
 *   - Initial Consonant (声母) & Category (Aspirated, Unaspirated, Fricative, Sonorant, Zero)
 *   - Final Vowel Nucleus (韵母) & Primary Acoustic Target ([a], [i], [u], [y]/ü, [e], [o])
 *   - Tone Number (1, 2, 3, 4, 5)
 */

export const INITIALS = [
  "zh", "ch", "sh",
  "b", "p", "m", "f",
  "d", "t", "n", "l",
  "g", "k", "h",
  "j", "q", "x",
  "r", "z", "c", "s",
  "y", "w"
];

export const ASPIRATED_INITIALS = new Set(["p", "t", "k", "q", "ch", "c"]);
export const UNASPIRATED_INITIALS = new Set(["b", "d", "g", "j", "zh", "z"]);
export const FRICATIVE_INITIALS = new Set(["s", "sh", "x", "f", "h"]);
export const SIBILANT_INITIALS = new Set(["s", "sh", "x"]);
export const SONORANT_INITIALS = new Set(["m", "n", "l", "r", "y", "w"]);
export const AFFRICATES = new Set(["q", "ch", "c", "j", "zh", "z"]);
export const STOPS = new Set(["p", "t", "k", "b", "d", "g"]);

export const DIACRITIC_MAP = {
  "ā": { char: "a", tone: 1 }, "á": { char: "a", tone: 2 }, "ǎ": { char: "a", tone: 3 }, "à": { char: "a", tone: 4 },
  "ē": { char: "e", tone: 1 }, "é": { char: "e", tone: 2 }, "ě": { char: "e", tone: 3 }, "è": { char: "e", tone: 4 },
  "ī": { char: "i", tone: 1 }, "í": { char: "i", tone: 2 }, "ǐ": { char: "i", tone: 3 }, "ì": { char: "i", tone: 4 },
  "ō": { char: "o", tone: 1 }, "ó": { char: "o", tone: 2 }, "ǒ": { char: "o", tone: 3 }, "ò": { char: "o", tone: 4 },
  "ū": { char: "u", tone: 1 }, "ú": { char: "u", tone: 2 }, "ǔ": { char: "u", tone: 3 }, "ù": { char: "u", tone: 4 },
  "ǖ": { char: "ü", tone: 1 }, "ǘ": { char: "ü", tone: 2 }, "ǚ": { char: "ü", tone: 3 }, "ǜ": { char: "ü", tone: 4 },
  "ü": { char: "ü", tone: 5 }, "v": { char: "ü", tone: 5 }
};

export class PinyinUtils {
  /**
   * Normalizes a diacritic pinyin syllable into plain lowercase ASCII and tone number.
   * E.g. "niú" -> { plain: "niu", tone: 2 }
   */
  static extractToneAndPlain(syllableStr) {
    if (!syllableStr) return { plain: "", tone: 5 };
    let clean = syllableStr.trim().toLowerCase();

    // Check for trailing number (e.g. "ma1")
    const numMatch = clean.match(/(\d)$/);
    let tone = numMatch ? parseInt(numMatch[1], 10) : 5;
    if (numMatch) {
      clean = clean.replace(/\d$/, "");
    }

    let plain = "";
    for (let i = 0; i < clean.length; i++) {
      const ch = clean[i];
      if (DIACRITIC_MAP[ch]) {
        plain += DIACRITIC_MAP[ch].char;
        if (!numMatch && DIACRITIC_MAP[ch].tone !== 5) {
          tone = DIACRITIC_MAP[ch].tone;
        }
      } else {
        plain += ch;
      }
    }

    // Normalize 'v' to 'ü'
    plain = plain.replace(/v/g, "ü");
    return { plain, tone };
  }

  /**
   * Deconstructs a pinyin syllable into the Phonetic Triad components.
   *
   * @param {string} syllableStr E.g. "tā", "xià", "nǚ", "ér", "zhōng"
   * @returns {{
   *   raw: string,
   *   plain: string,
   *   initial: string,
   *   final: string,
   *   tone: number,
   *   initialCategory: 'ASPIRATED_STOP' | 'UNASPIRATED_STOP' | 'FRICATIVE' | 'SONORANT' | 'ZERO',
   *   isAffricate: boolean,
   *   isStop: boolean,
   *   isFricative: boolean,
   *   vowelTarget: 'a' | 'i' | 'u' | 'y' | 'e' | 'o',
   *   isApicalI: boolean
   * }}
   */
  static decompose(syllableStr) {
    const { plain, tone } = this.extractToneAndPlain(syllableStr);

    let initial = "";
    let final = plain;

    // Match initial (ordered longest first: zh, ch, sh before z, c, s)
    for (const init of INITIALS) {
      if (plain.startsWith(init)) {
        initial = init;
        final = plain.slice(init.length);
        break;
      }
    }

    // Determine initial categorization
    let initialCategory = "ZERO";
    if (ASPIRATED_INITIALS.has(initial)) {
      initialCategory = "ASPIRATED_STOP";
    } else if (UNASPIRATED_INITIALS.has(initial)) {
      initialCategory = "UNASPIRATED_STOP";
    } else if (FRICATIVE_INITIALS.has(initial)) {
      initialCategory = "FRICATIVE";
    } else if (SONORANT_INITIALS.has(initial)) {
      initialCategory = "SONORANT";
    } else if (initial === "") {
      initialCategory = "ZERO";
    }

    // Detect phonemic [y]/ü after j, q, x, y (e.g. "ju" is phonemically [jy])
    let isRoundedFrontY = false;
    if (final.includes("ü") || final.includes("v")) {
      isRoundedFrontY = true;
    } else if (["j", "q", "x", "y"].includes(initial) && final.startsWith("u")) {
      isRoundedFrontY = true;
    }

    // Determine primary vowel formant target
    let vowelTarget = "a";
    let isApicalI = false;

    if (isRoundedFrontY) {
      vowelTarget = "y"; // [y] / ü
    } else if (final.includes("a")) {
      vowelTarget = "a"; // [a] open vowel
    } else if (final.includes("u")) {
      vowelTarget = "u"; // [u] back rounded vowel
    } else if (final.includes("i")) {
      // Check for apical vowel (dental/retroflex buzzing vowel after z, c, s, zh, ch, sh, r)
      if (["z", "c", "s", "zh", "ch", "sh", "r"].includes(initial) && (final === "i" || final === "ih")) {
        isApicalI = true;
        vowelTarget = "i";
      } else {
        vowelTarget = "i"; // [i] high front unrounded vowel
      }
    } else if (final.includes("o")) {
      vowelTarget = "o";
    } else if (final.includes("e")) {
      vowelTarget = "e";
    }

    return {
      raw: syllableStr,
      plain,
      initial,
      final,
      tone,
      initialCategory,
      isAffricate: AFFRICATES.has(initial),
      isStop: STOPS.has(initial),
      isFricative: FRICATIVE_INITIALS.has(initial),
      vowelTarget,
      isApicalI
    };
  }
}
