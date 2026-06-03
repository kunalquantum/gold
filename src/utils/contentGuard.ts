/**
 * Content guard — every word entering this cosmos passes through here.
 * Catches hate, slurs, dehumanisation, threats, and demeaning language
 * at the moment of submission. No message goes to the store unchecked.
 *
 * Design: two-pass.
 *   Pass 1 — normalised word-boundary scan (catches standard spelling)
 *   Pass 2 — collapsed scan on stripped text (catches l33tspeak / spaced letters)
 */

// ─── Normalisation ────────────────────────────────────────────────────────────

/** Convert common obfuscation tricks to plain characters. */
function normalise(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/@/g, "a")
    .replace(/4/g, "a")
    .replace(/3/g, "e")
    .replace(/1/g, "i")
    .replace(/0/g, "o")
    .replace(/5/g, "s")
    .replace(/\$/g, "s")
    .replace(/7/g, "t")
    .replace(/\+/g, "t")
    .replace(/6/g, "g")
    .replace(/8/g, "b")
    .replace(/[*._\-|!]/g, "")        // strip glyph separators  (f*ck → fck)
    .replace(/(.)\1{2,}/g, "$1$1");   // collapse repeats         (fuuuck → fuuck)
}

/** Strip all non-letter characters — catches spaced letters ("f u c k"). */
function collapse(text: string): string {
  return text.replace(/[^a-z]/g, "");
}

// ─── Blocked patterns (two tiers) ─────────────────────────────────────────────

/**
 * Tier 1 — always blocked: racial, ethnic, gender, orientation, and ableist
 * slurs, severe profanity, threats, and dehumanising language.
 * Matched as whole words (word-boundary) after normalisation.
 */
const BLOCKED_WORDS: string[] = [
  // Racial / ethnic slurs
  "nigger", "nigga", "chink", "gook", "spic", "wetback", "kike", "hymie",
  "raghead", "towelhead", "camel jockey", "coon", "porch monkey",
  "jungle bunny", "beaner", "greaseball", "wop", "dago", "guinea",
  "polack", "redskin", "squaw", "injun", "zipperhead", "slant", "slope",
  "kraut", "jap", "nip", "mick", "paddy", "gypsy",

  // Homophobic / transphobic slurs
  "faggot", "fagg", "fgt", "dyke", "tranny", "shemale",

  // Sexist / misogynist slurs
  "cunt", "whore", "slut", "skank", "thot",

  // Ableist slurs
  "retard", "retarded", "spaz", "spastic", "mongoloid",

  // Severe profanity (aggressive form)
  "motherfucker", "motherfucking",

  // Dehumanising labels
  "subhuman", "vermin",
];

/**
 * Tier 2 — substring matched in the fully collapsed (no-space) text.
 * Only the shortest, unambiguous roots — catches spaced / asterisked forms.
 */
const BLOCKED_SUBSTRINGS: string[] = [
  "nigger", "nigga", "chink", "spicc", "kkk", "faggot",
  "tranny", "shemale", "cunt", "retard",
];

/**
 * Phrase patterns — multi-word constructions that are always unacceptable.
 * Matched against normalised full text.
 */
const BLOCKED_PHRASES: RegExp[] = [
  // Threats / self-harm encouragement
  /\bkill\s+your\s*self\b/,
  /\bkys\b/,
  /\bgo\s+die\b/,
  /\byou\s+should\s+die\b/,
  /\bi\s+hope\s+you\s+die\b/,
  /\bwant\s+you\s+dead\b/,
  /\bi(?:'ll| will| wanna| want to)\s+kill\b/,
  /\bgonna\s+kill\b/,
  /\bdie\s+already\b/,
  /\bwish\s+(?:you|he|she|they)\s+(?:were\s+)?dead\b/,

  // Directed insults — "you are/you're [demeaning term]"
  /\byou(?:'re| are)\s+(?:a|an\s+)?(?:idiot|moron|imbecile|imbicile|loser|worthless|pathetic|disgusting|repulsive|freak|pig|cow|whale|ugly|stupid|dumb|brain\s*dead|waste\s+of\s+space)\b/,
  /\bhe(?:'s| is)\s+(?:a|an\s+)?(?:idiot|moron|loser|worthless|pathetic|disgusting|freak|waste\s+of\s+space)\b/,
  /\bshe(?:'s| is)\s+(?:a|an\s+)?(?:idiot|moron|loser|worthless|pathetic|disgusting|freak|waste\s+of\s+space)\b/,
  /\bthey(?:'re| are)\s+(?:all\s+)?(?:idiots|morons|losers|worthless|pathetic|disgusting|freaks)\b/,

  // Body shaming directed at others
  /\b(?:you|he|she|they)(?:'re| are| is)\s+(?:so\s+)?(?:fat|ugly|disgusting|revolting|gross)\b/,

  // Mockery of illness
  /\bfake\s+(?:cancer|illness|sick|pain)\b/,
  /\bnot\s+really\s+sick\b/,
  /\bjust\s+want(?:ing)?\s+attention\b/,
  /\bpretend(?:ing)?\s+to\s+be\s+sick\b/,

  // Hateful group generalisations
  /\b(?:all|those|these)\s+\w+s?\s+(?:are|should|deserve|need to)\s+(?:die|burn|suffer|rot)\b/,

  // Encouraging self-harm
  /\bcut\s+your\s*self\b/,
  /\bhurt\s+your\s*self\b/,
  /\bend\s+(?:your|it)\s+(?:life|all)\b/,
];

// ─── Public API ───────────────────────────────────────────────────────────────

/** The message shown when content is blocked. Intentionally non-accusatory. */
export const GUARD_MESSAGE =
  "This cosmos holds only light. Please share something kind, honest, or hopeful.";

/**
 * Check a piece of user text before it enters the store.
 * Returns null when the content is acceptable.
 * Returns the GUARD_MESSAGE string when it should be blocked.
 */
export function checkContent(text: string): string | null {
  if (!text || !text.trim()) return null;

  const norm = normalise(text);
  const col = collapse(norm);

  // Pass 1 — word-boundary check on normalised text
  for (const word of BLOCKED_WORDS) {
    const escaped = word.replace(/\s+/g, "\\s+"); // handle multi-word terms
    const pattern = new RegExp(`\\b${escaped}\\b`, "i");
    if (pattern.test(norm)) return GUARD_MESSAGE;
  }

  // Pass 2 — substring check on fully collapsed text (catches spaced / punctuated forms)
  for (const sub of BLOCKED_SUBSTRINGS) {
    if (col.includes(sub)) return GUARD_MESSAGE;
  }

  // Pass 3 — phrase patterns
  for (const phrase of BLOCKED_PHRASES) {
    if (phrase.test(norm)) return GUARD_MESSAGE;
  }

  return null;
}

/**
 * Lightweight wrapper — returns true when the text is safe to save.
 */
export function isSafe(text: string): boolean {
  return checkContent(text) === null;
}
