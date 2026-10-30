import assert from 'node:assert/strict';
import { tutorial, cases } from './cases.js';
import { evidenceGraph } from './graphs.js';

// This manifest records the manually reviewed scope and first invalid inference.
// A content change must deliberately update the review, not silently add a topic.
const reviewed = new Map([
  ['tutorial', ['미분', 2]],
  ['limit-value', ['극한·연속', 1]],
  ['continuity-differentiability', ['극한·연속', 3]],
  ['stationary-extremum', ['미분', 2]],
  ['increasing-sign', ['미분', 2]],
  ['integral-area', ['적분', 2]],
  ['integral-proof-valid', ['적분', null]],
]);
const all = [tutorial, ...cases];
assert.equal(cases.length, 6, 'Six regular cases are required');
assert.equal(new Set(all.map(c => c.id)).size, all.length, 'Case IDs must be unique');
assert.deepEqual(new Set(all.map(c => c.id)), new Set(reviewed.keys()));
assert.equal(cases.filter(c => c.errorIndex === null).length, 1, 'Include a valid proof');

let groups = 0;
for (const c of all) {
  const [chapter, errorIndex] = reviewed.get(c.id);
  assert.equal(c.chapter, chapter, `${c.id}: reviewed Calculus I chapter`);
  assert.equal(c.errorIndex, errorIndex, `${c.id}: reviewed first incorrect line`);
  assert.ok(Number.isInteger(c.level) && c.level >= 1 && c.level <= 3);
  for (const key of ['title', 'concept', 'claim', 'takeaway', 'duration']) {
    assert.ok(typeof c[key] === 'string' && c[key].trim(), `${c.id}.${key}`);
  }
  for (const key of ['conditions', 'steps']) {
    assert.ok(Array.isArray(c[key]) && c[key].length >= 2, `${c.id}.${key}`);
    assert.ok(c[key].every(s => typeof s === 'string' && s.trim()));
  }
  assert.ok(c.errorIndex === null ||
    (Number.isInteger(c.errorIndex) && c.errorIndex >= 0 && c.errorIndex < c.steps.length));
  assert.ok(c.counterargument.text?.trim());
  assert.ok(c.transfer.question?.trim());
  const options = {
    reason: c.reasonOptions,
    evidence: c.evidenceOptions,
    counter: c.counterargument.options,
    repair: c.repairOptions,
    transfer: c.transfer.options,
  };
  for (const [stage, choices] of Object.entries(options)) {
    groups++;
    assert.ok(Array.isArray(choices) && choices.length >= 3, `${c.id}/${stage}: alternatives`);
    assert.equal(choices.filter(o => o.correct === true).length, 1,
      `${c.id}/${stage}: exactly one correct answer`);
    assert.equal(new Set(choices.map(o => o.text.trim())).size, choices.length,
      `${c.id}/${stage}: no duplicate choices`);
    for (const o of choices) {
      assert.equal(typeof o.correct, 'boolean');
      assert.ok(o.text?.trim() && o.feedback?.trim(), `${c.id}/${stage}: explanatory feedback`);
    }
  }
}

// Check the small, authored SVG vocabulary without a browser or third-party parser.
// This catches unbalanced markup, duplicate labels and nonfinite plotted coordinates.
let graphCount = 0;
for (const c of all) {
  const html = evidenceGraph(c.id);
  if (c.id === 'integral-proof-valid') {
    assert.equal(html, '', 'The valid algebraic proof does not require a graph');
    continue;
  }
  graphCount++;
  assert.ok(html.startsWith('<figure') && html.trim().endsWith('</figure>'));
  assert.equal((html.match(/<svg\b/g) || []).length, 1);
  assert.match(html, /viewBox="0 0 520 240"/);
  assert.match(html, /<figcaption[^>]*>[^<]+<\/figcaption>/);
  assert.doesNotMatch(html, /NaN|Infinity|undefined|<script|\bon\w+=/);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  const labelledBy = html.match(/aria-labelledby="([^"]+)"/)[1].split(' ');
  assert.ok(labelledBy.every(id => ids.includes(id)));
  const stack = [];
  for (const match of html.matchAll(/<(\/?)([a-zA-Z][\w:-]*)\b[^>]*?(\/?)>/g)) {
    const [, close, tag, selfClose] = match;
    if (close) assert.equal(stack.pop(), tag, `${c.id}: balanced ${tag}`);
    else if (!selfClose) stack.push(tag);
  }
  assert.deepEqual(stack, [], `${c.id}: all SVG/figure tags closed`);
  for (const match of html.matchAll(/\b(?:x|y|x1|x2|y1|y2|cx|cy|r)="([^"]+)"/g)) {
    assert.ok(Number.isFinite(Number(match[1])), `${c.id}: finite coordinate`);
  }
}
assert.equal(evidenceGraph('unknown-case'), '');
console.log(`PASS: ${all.length} reviewed Calculus I cases, ${groups} single-answer groups, ${graphCount} accessible SVG evidence graphs.`);
