import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateProgression, totalCoins, caseAccess, awardCase } from './progression.js';

const cases = [
  { id: 'limit', title: '극한 사건' },
  { id: 'continuity', title: '연속 사건' },
  { id: 'stationary-extremum', title: '극값 사건' },
  { id: 'integral-area', title: '넓이 사건' },
  { id: 'deep-derivative', advanced: true, prerequisite: 'stationary-extremum' },
  { id: 'deep-area', advanced: true, prerequisite: 'integral-area' },
];
const fresh = () => { const state = { completed: {}, runs: {} }; migrateProgression(state, cases); return state; };
function finish(state, c, answers = {}) {
  const run = { id: c.id, finished: true, firstAnswers: answers };
  // Same order as the UI finish handler: completion exists before rewards run.
  state.completed[c.id] = { total: 6, firstAnswers: answers };
  return awardCase(state, c, run, cases);
}

test('two basic cases are free, direct access to other/advanced cases is gated', () => {
  const state = fresh();
  assert.equal(caseAccess(state, cases[0], cases).unlocked, true);
  assert.equal(caseAccess(state, cases[1], cases).unlocked, true);
  assert.deepEqual(caseAccess(state, cases[2], cases), { unlocked: false, threshold: 60, remaining: 60, reason: '60코인 더 모으기', prerequisite: null });
  assert.equal(caseAccess(state, cases[4], cases).unlocked, false);
  assert.equal(caseAccess(state, { id: 'unknown' }, cases).unlocked, false);
});

test('completion-before-award pays 50 once, including after reload', () => {
  let state = fresh();
  const answers = { error: true, evidence: true, repair: true };
  const receipt = finish(state, cases[0], answers);
  assert.equal(receipt.totalAward, 50);
  assert.equal(receipt.previousTotal, 0);
  assert.equal(receipt.total, 50);
  assert.deepEqual(receipt.breakdown.map(item => item.awarded), [30, 10, 5, 5]);
  assert.equal(finish(state, cases[0], answers).totalAward, 0);
  state = JSON.parse(JSON.stringify(state));
  migrateProgression(state, cases);
  assert.equal(finish(state, cases[0], answers).totalAward, 0);
  assert.equal(totalCoins(state), 50);
});

test('retries pay only previously unearned components and never remove coins', () => {
  const state = fresh();
  assert.equal(finish(state, cases[0], { error: true }).totalAward, 40);
  assert.equal(finish(state, cases[0], { evidence: true, repair: true }).totalAward, 10);
  assert.equal(finish(state, cases[0], { error: false, evidence: false }).totalAward, 0);
  assert.equal(totalCoins(state), 50);
});

test('lowest-score clears unlock next chapter after two cases; no dead end', () => {
  const state = fresh();
  assert.equal(finish(state, cases[0]).totalAward, 30);
  const receipt = finish(state, cases[1]);
  assert.equal(totalCoins(state), 60);
  assert.deepEqual(receipt.newlyUnlocked, ['stationary-extremum', 'integral-area']);
  assert.equal(caseAccess(state, cases[2], cases).unlocked, true);
  assert.equal(caseAccess(state, cases[3], cases).unlocked, true);
});

test('advanced cases require 100 lifetime coins AND their prerequisite', () => {
  const state = fresh();
  finish(state, cases[0], { error: true, evidence: true, repair: true });
  finish(state, cases[1], { error: true, evidence: true, repair: true });
  assert.equal(totalCoins(state), 100);
  assert.equal(caseAccess(state, cases[4], cases).unlocked, false);
  assert.match(caseAccess(state, cases[4], cases).reason, /극값 사건/);
  const receipt = finish(state, cases[2]);
  assert.equal(caseAccess(state, cases[4], cases).unlocked, true);
  assert.ok(receipt.newlyUnlocked.includes('deep-derivative'));
  assert.equal(caseAccess(state, cases[5], cases).unlocked, false);
});

test('legacy completed and active cases retain access; migration is idempotent', () => {
  const state = { completed: { 'integral-area': { total: 6, firstCorrect: 3, firstAnswers: { error: true, repair: true } } }, runs: { 'stationary-extremum': { id: 'stationary-extremum', stage: 1, firstAnswers: { error: false }, mistakes: { error: 1 }, finished: false } } };
  migrateProgression(state, cases);
  assert.equal(totalCoins(state), 45);
  assert.equal(caseAccess(state, cases[2], cases).unlocked, true);
  assert.equal(caseAccess(state, cases[3], cases).unlocked, true);
  assert.equal(caseAccess(state, cases[4], cases).unlocked, false);
  migrateProgression(state, cases);
  assert.equal(totalCoins(state), 45);
  assert.equal(finish(state, cases[3], { error: true, evidence: true, repair: true }).totalAward, 5);
});

test('unknown old first-answer details grant only base, not inferred bonuses', () => {
  const state = { completed: { limit: { total: 6, firstCorrect: 6 } }, runs: {} };
  migrateProgression(state, cases);
  assert.equal(totalCoins(state), 30);
});

test('tutorial and unfinished runs grant no rewards', () => {
  const state = fresh();
  assert.equal(caseAccess(state, { id: 'tutorial' }, cases).unlocked, true);
  assert.equal(awardCase(state, { id: 'tutorial' }, { id: 'tutorial', finished: true }, cases).totalAward, 0);
  assert.equal(awardCase(state, cases[0], { id: 'limit', finished: false, firstAnswers: { error: true } }, cases).totalAward, 0);
  assert.equal(totalCoins(state), 0);
});

test('malformed storage values normalize to finite totals and known IDs', () => {
  const state = { completed: { limit: {}, continuity: 'done' }, runs: { 'integral-area': { stage: 99 } }, progression: { version: 1, rewards: { limit: { base: Infinity, error: 'true', evidence: true }, unknown: { base: true }, continuity: null }, unlocked: ['unknown', null, 'limit', 'limit'] } };
  migrateProgression(state, cases);
  assert.equal(totalCoins(state), 5);
  assert.deepEqual(state.progression.unlocked, ['limit', 'continuity']);
  assert.equal(caseAccess(state, cases[2], cases).remaining, 55);
  assert.equal(Number.isFinite(totalCoins({ progression: { rewards: [null, Infinity] } })), true);
});
