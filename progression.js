/** Browser-local rewards. Coins are lifetime earnings, never a spendable balance. */
export const REWARD_RULES = Object.freeze([
  Object.freeze({ key: 'base', label: '사건 해결', amount: 30 }),
  Object.freeze({ key: 'error', label: '첫 판단에 오류 지목', amount: 10 }),
  Object.freeze({ key: 'evidence', label: '첫 판단에 증거 제출', amount: 5 }),
  Object.freeze({ key: 'repair', label: '첫 판단에 논리 복구', amount: 5 }),
]);

const isRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);
const regularCases = cases => (Array.isArray(cases) ? cases : []).filter(c => c && typeof c.id === 'string' && c.id !== 'tutorial');
const emptyReward = () => ({ base: false, error: false, evidence: false, repair: false });
const validCompletion = value => isRecord(value) && (isRecord(value.firstAnswers) || (Number.isInteger(value.total) && value.total > 0));
const completed = (state, id) => validCompletion(state.completed?.[id]);

function normalizeProgression(state, cases) {
  const previous = isRecord(state.progression) ? state.progression : {};
  const ids = new Set(regularCases(cases).map(c => c.id));
  const rawRewards = isRecord(previous.rewards) ? previous.rewards : {};
  const rewards = {};
  for (const id of ids) {
    const raw = rawRewards[id];
    if (!isRecord(raw)) continue;
    rewards[id] = Object.fromEntries(REWARD_RULES.map(({ key }) => [key, raw[key] === true]));
  }
  state.progression = {
    version: 1,
    rewards,
    unlocked: [...new Set((Array.isArray(previous.unlocked) ? previous.unlocked : []).filter(id => ids.has(id)))],
  };
  return state.progression;
}

function thresholdFor(c, cases) {
  if (c.id === 'tutorial') return 0;
  if (c.advanced === true) return 100;
  return regularCases(cases).filter(item => item.advanced !== true).slice(0, 2).some(item => item.id === c.id) ? 0 : 60;
}

/** Returns finite totals even when an imported local save is malformed. */
export function totalCoins(state) {
  const rewards = isRecord(state?.progression?.rewards) ? state.progression.rewards : {};
  return Object.values(rewards).reduce((sum, reward) => {
    if (!isRecord(reward)) return sum;
    return sum + REWARD_RULES.reduce((earned, rule) => earned + (reward[rule.key] === true ? rule.amount : 0), 0);
  }, 0);
}

/** Read-only access check; call it for cards, startCase, and direct hash routes. */
export function caseAccess(state, c, cases) {
  if (!c || typeof c.id !== 'string') return { unlocked: false, threshold: 0, remaining: 0, reason: '사건을 찾을 수 없어요.', prerequisite: null };
  if (c.id === 'tutorial') return { unlocked: true, threshold: 0, remaining: 0, reason: '', prerequisite: null };
  const catalog = regularCases(cases);
  if (!catalog.some(item => item.id === c.id)) return { unlocked: false, threshold: 0, remaining: 0, reason: '사건을 찾을 수 없어요.', prerequisite: null };
  const threshold = thresholdFor(c, catalog);
  const remaining = Math.max(0, threshold - totalCoins(state));
  const prerequisite = c.advanced === true && typeof c.prerequisite === 'string' ? c.prerequisite : null;
  const priorUnlock = Array.isArray(state.progression?.unlocked) && state.progression.unlocked.includes(c.id);
  const prerequisiteDone = !prerequisite || completed(state, prerequisite);
  const unlocked = priorUnlock || completed(state, c.id) || (remaining === 0 && prerequisiteDone);
  const prerequisiteTitle = catalog.find(item => item.id === prerequisite)?.title || '관련 기초 사건';
  const requirements = [];
  if (remaining > 0) requirements.push(`${remaining}코인 더 모으기`);
  if (!prerequisiteDone) requirements.push(`‘${prerequisiteTitle}’ 해결`);
  return { unlocked, threshold, remaining, reason: unlocked ? '' : requirements.join(' · '), prerequisite };
}

function retainUnlocked(state, cases) {
  const unlocked = new Set(state.progression.unlocked);
  for (const c of regularCases(cases)) if (caseAccess(state, c, cases).unlocked) unlocked.add(c.id);
  state.progression.unlocked = [...unlocked];
}

/**
 * Run once after loading state, before playing. Existing completions get their
 * earned base/known bonuses once; previously opened unfinished cases stay open.
 * Later calls normalize and retain unlocks without re-awarding new completions.
 */
export function migrateProgression(state, cases) {
  const isLegacy = state.progression?.version !== 1;
  const progression = normalizeProgression(state, cases);
  if (isLegacy) {
    for (const c of regularCases(cases)) {
      const record = state.completed?.[c.id];
      if (validCompletion(record)) {
        const reward = progression.rewards[c.id] || emptyReward();
        reward.base = true;
        for (const key of ['error', 'evidence', 'repair']) reward[key] ||= record.firstAnswers?.[key] === true;
        progression.rewards[c.id] = reward;
      }
      const run = state.runs?.[c.id];
      const wasInProgress = isRecord(run) && run.id === c.id && run.finished !== true &&
        Number.isInteger(run.stage) && run.stage >= 0 && run.stage <= 6 &&
        isRecord(run.firstAnswers) && isRecord(run.mistakes);
      if (validCompletion(record) || wasInProgress) progression.unlocked.push(c.id);
    }
  }
  progression.unlocked = [...new Set(progression.unlocked)];
  retainUnlocked(state, cases);
  return state.progression;
}

/**
 * Call after run.finished=true and state.completed[id] have been saved in memory.
 * Component-based bookkeeping pays only the difference across retries.
 */
export function awardCase(state, c, run, cases) {
  // Do not backfill completions here: finish() has just written a NEW completion.
  normalizeProgression(state, cases);
  const previousTotal = totalCoins(state);
  const beforeUnlocks = new Set(state.progression.unlocked);
  const validCase = c && regularCases(cases).some(item => item.id === c.id);
  if (!validCase || !run || run.id !== c.id || run.finished !== true) {
    return { breakdown: [], totalAward: 0, previousTotal, total: previousTotal, newlyUnlocked: [] };
  }
  const reward = state.progression.rewards[c.id] || emptyReward();
  const breakdown = REWARD_RULES.map(rule => {
    const eligible = rule.key === 'base' || run.firstAnswers?.[rule.key] === true;
    const previouslyEarned = reward[rule.key] === true;
    const awarded = eligible && !previouslyEarned ? rule.amount : 0;
    if (eligible) reward[rule.key] = true;
    return { ...rule, eligible, previouslyEarned, awarded };
  });
  state.progression.rewards[c.id] = reward;
  retainUnlocked(state, cases);
  const total = totalCoins(state);
  return {
    breakdown,
    totalAward: total - previousTotal,
    previousTotal,
    total,
    newlyUnlocked: state.progression.unlocked.filter(id => !beforeUnlocks.has(id)),
  };
}
