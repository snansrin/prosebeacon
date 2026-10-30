// Word-level diff shared by the server and the browser.
// Tokens tile the text exactly, so both sides can be rebuilt character for
// character and the two panes can be mapped onto each other for selection sync.

const TOKEN_RE = /[\p{L}\p{N}]+(?:['’ʼ][\p{L}\p{N}]+)*|\s+|[^\s\p{L}\p{N}]+/gu;
const SMALL = 420;

export function lex(text) {
  TOKEN_RE.lastIndex = 0;
  const tokens = [];
  for (const match of text.matchAll(TOKEN_RE)) tokens.push({ value: match[0], start: match.index, end: match.index + match[0].length });
  return tokens;
}

/**
 * Diff two arrays of token strings.
 * @returns {Array<{type:'equal'|'del'|'ins', aStart:number|null, aEnd:number|null, bStart:number|null, bEnd:number|null}>}
 *          token-index ranges, end exclusive, in document order.
 */
export function diffTokenArrays(a, b) {
  const out = [];
  diffRegion(a, 0, a.length, b, 0, b.length, out, 0);
  return merge(out);
}


/**
 * Anchors on unique fixed-size token chunks. Repetitive documents (tables,
 * boilerplate rows) defeat line-level patience anchors; a 12-token window that
 * occurs exactly once on each side still localises the edit in O(n).
 */
function chunkAnchors(a, aLo, aHi, b, bLo, bHi, window = 12) {
  const hashOf = (tokens, from) => {
    let hash = 5381;
    for (let index = from; index < from + window; index++) {
      const value = tokens[index];
      for (let char = 0; char < value.length; char++) hash = ((hash * 33) ^ value.charCodeAt(char)) | 0;
    }
    return hash;
  };
  const left = new Map();
  for (let index = aLo; index + window <= aHi; index++) {
    const hash = hashOf(a, index);
    const seen = left.get(hash);
    if (seen === undefined) left.set(hash, index);
    else if (seen !== null) left.set(hash, null);
  }
  const right = new Map();
  for (let index = bLo; index + window <= bHi; index++) {
    const hash = hashOf(b, index);
    const seen = right.get(hash);
    if (seen === undefined) right.set(hash, index);
    else if (seen !== null) right.set(hash, null);
  }
  const pairs = [];
  for (const [hash, ai] of left) {
    if (ai === null) continue;
    const bi = right.get(hash);
    if (bi === null || bi === undefined) continue;
    pairs.push([ai, bi]);
  }
  pairs.sort((x, y) => x[0] - y[0]);
  const anchors = [];
  let lastB = -1;
  for (const [ai, bi] of pairs) {
    if (bi <= lastB) continue;
    // verify the windows really match (hash collisions are possible)
    let same = true;
    for (let index = 0; index < window; index++) if (a[ai + index] !== b[bi + index]) { same = false; break; }
    if (!same) continue;
    anchors.push([ai, bi]);
    lastB = bi + window;
  }
  return anchors;
}

function midpoint(tokens, lo, hi) {
  const centre = (lo + hi) >> 1;
  for (let index = centre; index < hi; index++) if (tokens[index].includes('\n')) return index + 1;
  for (let index = centre; index > lo; index--) if (tokens[index - 1].includes('\n')) return index;
  return null;
}

function diffRegion(a, aLo, aHi, b, bLo, bHi, out, depth) {
  while (aLo < aHi && bLo < bHi && a[aLo] === b[bLo]) { out.push({ type: 'equal', aLo, bLo }); aLo++; bLo++; }
  const suffix = [];
  while (aLo < aHi && bLo < bHi && a[aHi - 1] === b[bHi - 1]) { aHi--; bHi--; suffix.push({ type: 'equal', aLo: aHi, bLo: bHi }); }
  const aLen = aHi - aLo, bLen = bHi - bLo;
  if (aLen === 0 && bLen === 0) { out.push(...suffix.reverse()); return; }
  if (aLen === 0) out.push({ type: 'ins', bLo, bHi });
  else if (bLen === 0) out.push({ type: 'del', aLo, aHi });
  else if (depth > 24 || (aLen <= SMALL && bLen <= SMALL)) lcs(a, aLo, aHi, b, bLo, bHi, out);
  else {
    let anchors = patienceAnchors(a, aLo, aHi, b, bLo, bHi);
    if (!anchors.length) anchors = chunkAnchors(a, aLo, aHi, b, bLo, bHi);
    if (!anchors.length) {
      // Repetitive regions (tables, repeated rows) have no unique anchors:
      // fall back to a newline midpoint so the diff stays local and linear.
      const aMid = midpoint(a, aLo, aHi);
      const bMid = midpoint(b, bLo, bHi);
      if (aMid !== null && bMid !== null && aHi - aLo > SMALL * 2 && bHi - bLo > SMALL * 2) {
        diffRegion(a, aLo, aMid, b, bLo, bMid, out, depth + 1);
        diffRegion(a, aMid, aHi, b, bMid, bHi, out, depth + 1);
      } else { out.push({ type: 'del', aLo, aHi }); out.push({ type: 'ins', bLo, bHi }); }
    }
    else {
      let previousA = aLo, previousB = bLo;
      for (const [ai, bi] of anchors) {
        diffRegion(a, previousA, ai, b, previousB, bi, out, depth + 1);
        out.push({ type: 'equal', aLo: ai, bLo: bi });
        previousA = ai + 1; previousB = bi + 1;
      }
      diffRegion(a, previousA, aHi, b, previousB, bHi, out, depth + 1);
    }
  }
  for (let index = suffix.length - 1; index >= 0; index--) out.push(suffix[index]);
}

// Unique tokens present exactly once in both regions, ordered by an increasing subsequence.
function patienceAnchors(a, aLo, aHi, b, bLo, bHi) {
  const countA = new Map(), countB = new Map(), posB = new Map();
  for (let i = aLo; i < aHi; i++) countA.set(a[i], (countA.get(a[i]) || 0) + 1);
  for (let j = bLo; j < bHi; j++) { countB.set(b[j], (countB.get(b[j]) || 0) + 1); posB.set(b[j], j); }
  const pairs = [];
  for (let i = aLo; i < aHi; i++) {
    const token = a[i];
    if (countA.get(token) === 1 && countB.get(token) === 1 && !/^\s/.test(token)) pairs.push([i, posB.get(token)]);
  }
  if (!pairs.length) return [];
  const tails = [], tailsIndex = [], previous = new Array(pairs.length).fill(-1);
  for (let index = 0; index < pairs.length; index++) {
    const value = pairs[index][1];
    let low = 0, high = tails.length;
    while (low < high) { const middle = (low + high) >> 1; if (tails[middle] < value) low = middle + 1; else high = middle; }
    tails[low] = value; tailsIndex[low] = index;
    previous[index] = low > 0 ? tailsIndex[low - 1] : -1;
  }
  const result = [];
  for (let index = tailsIndex[tails.length - 1]; index >= 0; index = previous[index]) result.unshift(pairs[index]);
  return result;
}

function lcs(a, aLo, aHi, b, bLo, bHi, out) {
  const rows = aHi - aLo + 1, cols = bHi - bLo + 1;
  const table = new Uint32Array(rows * cols);
  for (let i = rows - 2; i >= 0; i--) {
    for (let j = cols - 2; j >= 0; j--) {
      table[i * cols + j] = a[aLo + i] === b[bLo + j]
        ? table[(i + 1) * cols + j + 1] + 1
        : Math.max(table[(i + 1) * cols + j], table[i * cols + j + 1]);
    }
  }
  let i = 0, j = 0;
  while (i < rows - 1 && j < cols - 1) {
    if (a[aLo + i] === b[bLo + j]) { out.push({ type: 'equal', aLo: aLo + i, bLo: bLo + j }); i++; j++; }
    else if (table[(i + 1) * cols + j] >= table[i * cols + j + 1]) { out.push({ type: 'del', aLo: aLo + i, aHi: aLo + i + 1 }); i++; }
    else { out.push({ type: 'ins', bLo: bLo + j, bHi: bLo + j + 1 }); j++; }
  }
  while (i < rows - 1) { out.push({ type: 'del', aLo: aLo + i, aHi: aLo + i + 1 }); i++; }
  while (j < cols - 1) { out.push({ type: 'ins', bLo: bLo + j, bHi: bLo + j + 1 }); j++; }
}

function merge(out) {
  const merged = [];
  for (const op of out) {
    const last = merged.at(-1);
    const aStart = op.aLo ?? null;
    const aEnd = op.aHi ?? (op.aLo === undefined ? null : op.aLo + 1);
    const bStart = op.bLo ?? null;
    const bEnd = op.bHi ?? (op.bLo === undefined ? null : op.bLo + 1);
    if (last && last.type === op.type &&
        ((op.type === 'equal' && last.aEnd === aStart && last.bEnd === bStart) ||
         (op.type === 'del' && last.aEnd === aStart) ||
         (op.type === 'ins' && last.bEnd === bStart))) {
      last.aEnd = aEnd; last.bEnd = bEnd;
      continue;
    }
    merged.push({ type: op.type, aStart, aEnd, bStart, bEnd });
  }
  return merged;
}

export function diffText(original, revised) {
  const a = lex(original), b = lex(revised);
  const ops = diffTokenArrays(a.map(token => token.value), b.map(token => token.value)).map(op => ({
    type: op.type,
    aStart: op.aStart, aEnd: op.aEnd, bStart: op.bStart, bEnd: op.bEnd,
    left: op.aStart === null ? '' : original.slice(a[op.aStart].start, a[op.aEnd - 1].end),
    right: op.bStart === null ? '' : revised.slice(b[op.bStart].start, b[op.bEnd - 1].end),
    leftFrom: op.aStart === null ? null : a[op.aStart].start,
    leftTo: op.aEnd === null ? null : a[op.aEnd - 1].end,
    rightFrom: op.bStart === null ? null : b[op.bStart].start,
    rightTo: op.bEnd === null ? null : b[op.bEnd - 1].end
  }));
  const changes = ops.filter(op => op.type !== 'equal');
  const changedCharacters = changes.reduce((total, op) => total + (op.left?.length || 0) + (op.right?.length || 0), 0);
  return {
    engine: 'prosebeacon-word-diff-v3',
    ops,
    deletions: changes.filter(op => op.type === 'del').length,
    insertions: changes.filter(op => op.type === 'ins').length,
    changedCharacters,
    similarity: Math.round((1 - changedCharacters / Math.max(1, original.length + revised.length)) * 1000) / 10,
    left: original, right: revised,
    leftTokens: a.length, rightTokens: b.length
  };
}

export function diffStats(original, revised) {
  const { deletions, insertions, changedCharacters, similarity } = diffText(original, revised);
  return { changes: deletions + insertions, deletions, insertions, changedCharacters, similarity };
}
