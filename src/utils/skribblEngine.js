// Skribbl Draw & Guess — core engine
// Pure helpers shared by admin controller, mobile guesser view, and projector stage.
// Design constraints: no new deps, no Cloud Functions, no composite indexes.
// The secret word NEVER travels to guessers: only a salted cyrb53 hash is published.
// Correct guesses are stored as '✓' so the word never appears in the answers collection.

// ---------------------------------------------------------------------------
// Hashing (synchronous — crypto.subtle is unavailable on LAN http origins)
// ---------------------------------------------------------------------------

// Well-known cyrb53 string hash: fast, tiny, good avalanche for short strings.
export function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

// Random base36 salt so identical words hash differently every round.
export function makeSalt() {
  return Math.random().toString(36).slice(2, 14);
}

// Collapse case/spacing/punctuation so "Iron-Man!!" matches "iron man".
export function normalizeWord(word) {
  return String(word || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

// Returns "salt:digest" — safe to broadcast to every client.
export function hashWord(word, salt = makeSalt()) {
  const stripped = normalizeWord(word);
  if (!stripped) return '';
  const seed = parseInt(salt, 36) || 0;
  return `${salt}:${cyrb53(stripped, seed)}`;
}

// Verifies a raw guess against a published hash.
export function verifyGuess(guess, wordHash) {
  if (!guess || !wordHash) return false;
  const [salt, digest] = String(wordHash).split(':');
  if (!salt || !digest) return false;
  const seed = parseInt(salt, 36) || 0;
  const candidate = cyrb53(normalizeWord(guess), seed);
  return String(candidate) === String(digest);
}

// True if a chat/guess text should be hidden from the public feed (contains the word).
export function isGuessSuspicious(text, wordHash) {
  return verifyGuess(text, wordHash);
}

// ---------------------------------------------------------------------------
// Progressive word hints
// ---------------------------------------------------------------------------

// Build the round-start mask. Masked cells NEVER carry the real character
// (what gets published must be word-free); revealed letters travel only inside
// their `reveals` entries, so at most 2 hint letters are ever broadcast.
export function buildWordHint(word) {
  const letters = String(word || '');
  const display = [];
  const letterIdx = [];
  for (let i = 0; i < letters.length; i++) {
    const ch = letters[i];
    const masked = /[a-zA-Z0-9]/.test(ch);
    display.push({ ch: masked ? '_' : ch, masked });
    if (masked) letterIdx.push(i);
  }
  // Spread the 2 reveal positions across the word (never first char — too easy).
  const reveals = [];
  if (letterIdx.length > 3) {
    const idx = letterIdx[Math.floor(letterIdx.length * 0.45)];
    reveals.push({ idx, level: 1, char: letters[idx] });
  }
  if (letterIdx.length > 5) {
    const idx = letterIdx[Math.floor(letterIdx.length * 0.75)];
    reveals.push({ idx, level: 2, char: letters[idx] });
  }
  return { display, reveals };
}

// How many hint levels should be visible at a given point in the round.
export function hintLevelForElapsed(elapsedSeconds, durationSec) {
  if (!durationSec || durationSec <= 0) return 0;
  const pct = elapsedSeconds / durationSec;
  if (pct >= 0.65) return 2;
  if (pct >= 0.38) return 1;
  return 0;
}

// Produce the display array for a hint level (reveals unmask letters).
export function applyHintLevel(display, reveals, hintLevel) {
  if (!display) return [];
  const out = display.map((cell) => ({ ...cell }));
  (reveals || []).forEach((r) => {
    if (r.level <= hintLevel && out[r.idx]) {
      out[r.idx].ch = r.char || out[r.idx].ch;
      out[r.idx].masked = false;
    }
  });
  return out;
}

// Render mask array as spaced string e.g. "C _ _ _  _ _ _ _"
export function renderHintString(display, reveals, hintLevel) {
  const cells = applyHintLevel(display, reveals, hintLevel);
  let out = '';
  cells.forEach((cell, i) => {
    if (i > 0) out += ' ';
    out += cell.masked ? '_' : cell.ch;
  });
  return out;
}

// ---------------------------------------------------------------------------
// Scoring — mirrors the platform formula used by Quiz/Terminal/Photo/Puzzle:
// 1000 base + speed bonus (up to 500) scaled by remaining time.
// ---------------------------------------------------------------------------

export function computeSkribblScore(durationSec, timeTaken) {
  const totalLimit = Number(durationSec) || 60;
  const elapsed = Math.max(0, Math.min(totalLimit, Number(timeTaken) || 0));
  const speedBonus = Math.max(0, Math.round(((totalLimit - elapsed) / totalLimit) * 500));
  return 1000 + speedBonus;
}

// Client-side aggregation for the reveal screen (no composite indexes needed).
// guesses: array of answer docs for the round. Returns top N correct guessers.
export function computeRoundStandings(guesses, topN = 5) {
  const byPin = new Map();
  (guesses || []).forEach((g) => {
    if (!g || !g.isCorrect || !g.pin) return;
    const existing = byPin.get(g.pin);
    // First correct guess of a player is their scoring attempt.
    if (!existing || (g.createdAtMs || 0) < (existing.createdAtMs || 0)) {
      byPin.set(g.pin, {
        pin: g.pin,
        name: g.name || g.playerName || 'Player',
        teamCode: g.teamCode || null,
        points: Number(g.pointsAwarded) || 0,
        createdAtMs: g.createdAtMs || 0
      });
    }
  });
  return Array.from(byPin.values())
    .sort((a, b) => b.points - a.points)
    .slice(0, topN);
}

// ---------------------------------------------------------------------------
// Stroke transport codec
// Strokes are append-only docs in events/samarambh/skribblStrokes:
//   { kind:'ops',   roundId, seq, strokeId, ops:[{m:'d'|'e', c:'#hex', s:size, p:[x0,y0,x1,y1,...]}] }
//   { kind:'undo',  roundId, seq, strokeId }
//   { kind:'clear', roundId, seq }
// Coordinates are normalized 0..1 and rounded to 4 decimals to shrink payloads.
// Appending new documents avoids Firestore's per-document write contention,
// which is what lets a single admin drawer scale to hundreds of viewers.
// ---------------------------------------------------------------------------

export function quantizeCoord(v) {
  return Math.round(Math.max(0, Math.min(1, Number(v) || 0)) * 10000) / 10000;
}

// [x, y, x, y ...] -> flat quantized array
export function encodePoints(pointList) {
  const out = [];
  (pointList || []).forEach((pt) => {
    out.push(quantizeCoord(pt.x), quantizeCoord(pt.y));
  });
  return out;
}

// Ensure a tap produces a visible dot (duplicate the single point).
export function ensureSegmentPoints(points) {
  if (points && points.length === 2) return [...points, points[0], points[1]];
  return points || [];
}

export function makeStrokeId() {
  return 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

// Rebuild an ordered, replayed segment list from raw stroke docs.
// Sorts client-side by seq so the query itself needs NO composite index
// (a bare single-field `where('roundId','==',x)` hits an automatic index).
// Handles undo (removes a strokeId) and clear (resets canvas) deterministically.
export function replayStrokeDocs(docs) {
  const sorted = [...(docs || [])].sort((a, b) => (a.seq || 0) - (b.seq || 0));
  let segments = [];
  for (const docData of sorted) {
    if (docData.kind === 'clear') {
      segments = [];
    } else if (docData.kind === 'undo') {
      segments = segments.filter((seg) => seg.strokeId !== docData.strokeId);
    } else if (docData.kind === 'ops' && Array.isArray(docData.ops)) {
      docData.ops.forEach((op) => {
        segments.push({
          strokeId: docData.strokeId || docData.id,
          mode: op.m === 'e' ? 'erase' : 'draw',
          color: op.c || '#111827',
          size: Number(op.s) || 4,
          points: op.p || []
        });
      });
    }
  }
  return segments;
}

// ---------------------------------------------------------------------------
// Round lifecycle helpers
// ---------------------------------------------------------------------------

export const SKRIBBL_SETUP_SECONDS = 5; // matches platform "Deploying" gate

// Elapsed drawing seconds derived from a Firestore Timestamp start.
export function skribblElapsedSeconds(startTime, durationSec) {
  const startMs = startTime?.toMillis ? startTime.toMillis() : Number(startTime) || Date.now();
  const raw = (Date.now() - startMs) / 1000 - SKRIBBL_SETUP_SECONDS;
  return Math.max(0, Math.min(Number(durationSec) || 60, raw));
}

// Stable round id per event run.
export function makeRoundId() {
  return 'r_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
