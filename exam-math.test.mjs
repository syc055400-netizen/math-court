import test from 'node:test';
import assert from 'node:assert/strict';
import { tutorial, cases } from './cases.js';
import { advancedCases } from './advanced-cases.js';
import { evidenceGraph } from './graphs.js';
import { EXAM_MATH } from './exam-math-cache.js';

test('every authored formula and graph label has exam-style vector output', () => {
  let count = 0;
  function check(value) {
    if (typeof value === 'string') {
      for (const match of value.matchAll(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g)) {
        const display = match[2] !== undefined;
        const tex = match[1] ?? match[2];
        assert.ok(EXAM_MATH[`${display ? 'D' : 'I'}:${tex}`], `Rebuild exam math for: ${tex}`);
        count++;
      }
    } else if (value && typeof value === 'object') Object.values(value).forEach(check);
  }
  const all = [tutorial, ...cases, ...advancedCases];
  check(all);
  for (const c of all) check(evidenceGraph(c.id).replaceAll('&gt;', '>').replaceAll('&lt;', '<').replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"'));
  assert.ok(count >= 429, 'The complete authored math corpus is checked');
});

test('formula artwork has valid metrics and no external resources', () => {
  for (const [key, entry] of Object.entries(EXAM_MATH)) {
    assert.ok(Number.isFinite(entry.width) && entry.width > 0, key);
    assert.ok(Number.isFinite(entry.height) && entry.height > 0, key);
    assert.ok(Number.isFinite(entry.depth) && entry.depth >= 0 && entry.depth < entry.height, key);
    assert.match(entry.svg, /^<svg\b/);
    assert.match(entry.svg, /<\/svg>$/);
    assert.doesNotMatch(entry.svg, /<script|<foreignObject|<image|https?:\/\/(?!www\.w3\.org\/)/i);
    const ids = new Set([...entry.svg.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
    for (const match of entry.svg.matchAll(/(?:xlink:)?href="#([^"]+)"/g)) assert.ok(ids.has(match[1]), `${key}: local glyph reference`);
  }
});
