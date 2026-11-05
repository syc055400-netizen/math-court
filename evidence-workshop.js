import { portrait } from './characters.js?v=20261105';
import { typesetMath } from './math.js?v=20261105-workshop';
import { workshopGraph, workshopGraphMathCorpus } from './workshop-graph.js?v=20261105-workshop';

const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const m = String.raw;
export const WORKSHOP_TICKS = Object.freeze(Array.from({length:13}, (_, i) => i - 4));
const phases = new Set(['build','cross','accepted']);
const feedbackCodes = new Set(['condition','not-refuted','negative-eventually','negative-all','zero-negative','zero-condition']);
const isTick = value => Number.isInteger(value) && value >= -4 && value <= 8;

export function fractionTex(numerator, denominator=4) {
  if (numerator === 0) return '0';
  const gcd = (a,b) => b ? gcd(b,a%b) : a;
  const divisor = gcd(Math.abs(numerator),denominator);
  const n = numerator/divisor, d = denominator/divisor;
  return d === 1 ? `${n}` : `${n<0?'-':''}\\frac{${Math.abs(n)}}{${d}}`;
}
export function evaluateCandidate(ticks) {
  if (!isTick(ticks)) return { validInput:false, accepted:false, reason:'invalid' };
  const a = ticks/4, value = a-1;
  return {validInput:true, ticks, a, value, condition:a>0, refutes:value<=0,
    accepted:a>0&&value<=0, reason:a<=0?'condition':value>0?'not-refuted':'accepted',
    branch:value===0?'zero':'negative', coefficientTex:fractionTex(ticks), valueTex:fractionTex(ticks-4)};
}
function polynomialTex(ticks) {
  if(ticks===0)return '-1';
  return `${ticks===4?'':ticks===-4?'-':fractionTex(ticks)}x-1`;
}

export function ensureWorkshop(run) {
  const previous = run.workshop && typeof run.workshop==='object' && !Array.isArray(run.workshop) ? run.workshop : {};
  const w = previous.version===1 ? previous : {};
  w.version=1;
  w.ticks=isTick(w.ticks)?w.ticks:6;
  w.phase=phases.has(w.phase)?w.phase:'build';
  w.submittedTicks=isTick(w.submittedTicks)&&evaluateCandidate(w.submittedTicks).accepted?w.submittedTicks:null;
  if(w.phase!=='build'&&w.submittedTicks===null)w.phase='build';
  if(w.phase!=='build')w.ticks=w.submittedTicks;
  if(w.phase==='build')w.submittedTicks=null;
  w.selectedResponse=['scope','eventually','all','zero','negative','condition'].includes(w.selectedResponse)?w.selectedResponse:null;
  w.feedback=feedbackCodes.has(w.feedback)?w.feedback:null;
  if(w.phase==='cross'&&!challengeFor(w.submittedTicks).options.some(option=>option.id===w.selectedResponse))w.selectedResponse=null;
  if(w.phase==='build'&&!['condition','not-refuted'].includes(w.feedback))w.feedback=null;
  if(w.phase==='accepted'){w.feedback=null;w.selectedResponse=w.submittedTicks===4?'zero':'scope';}
  run.workshop=w;
  return w;
}

export function challengeFor(ticks) {
  const candidate=evaluateCandidate(ticks);
  if(!candidate.accepted)return null;
  if(candidate.branch==='zero')return {
    branch:'zero', quote:m`\(f(1)=0\)은 음수가 아니군요. 그러니 제 주장과 모순되지 않습니다!`,
    question:m`상대의 주장은 \(f(1)>0\)입니다. 어떻게 답하겠습니까?`,
    options:[
      {id:'negative',text:m`\(0\)도 음수이므로 반례가 됩니다.`,correct:false,feedback:'zero-negative'},
      {id:'zero',text:m`\(0\)은 양수가 아닙니다. 따라서 \(f(1)>0\)이라는 주장은 성립하지 않습니다.`,correct:true},
      {id:'condition',text:m`\(f(1)=0\)이면 증가함수가 아니므로, 증거를 철회하겠습니다.`,correct:false,feedback:'zero-condition'}
    ]
  };
  return {
    branch:'negative', quote:m`지금은 음수여도, 계속 증가하면 언젠가는 양수가 되잖습니까?`,
    question:m`지금 확인해야 할 주장을 짚어 주세요.`,
    options:[
      {id:'eventually',text:m`나중에 양수가 되므로 \(f(1)>0\)이라는 주장도 맞습니다.`,correct:false,feedback:'negative-eventually'},
      {id:'all',text:m`\(f(1)<0\)이므로 모든 실수 \(x\)에서 \(f(x)<0\)입니다.`,correct:false,feedback:'negative-all'},
      {id:'scope',text:m`다른 곳의 값과 \(f(1)\)은 다릅니다. 이 함수는 조건을 만족하지만 \(f(1)<0\)입니다.`,correct:true}
    ]
  };
}

export function submitCandidate(run) {
  const w=ensureWorkshop(run);
  if(w.phase!=='build')return {accepted:false,ignored:true};
  const candidate=evaluateCandidate(w.ticks);
  if(!candidate.accepted){w.feedback=candidate.reason;return {accepted:false,reason:candidate.reason};}
  w.submittedTicks=w.ticks;w.phase='cross';w.feedback=null;w.selectedResponse=null;
  return {accepted:true,branch:candidate.branch};
}
export function submitResponse(run,id) {
  const w=ensureWorkshop(run);
  if(w.phase!=='cross')return {accepted:false,ignored:true};
  const choice=challengeFor(w.submittedTicks).options.find(option=>option.id===id);
  if(!choice)return {accepted:false,ignored:true};
  w.selectedResponse=id;
  if(!choice.correct){w.feedback=choice.feedback;return {accepted:false,reason:choice.feedback};}
  w.phase='accepted';w.feedback=null;
  return {accepted:true};
}
export function changeCoefficient(run,ticks) {
  const w=ensureWorkshop(run);
  if(w.phase!=='build'||!isTick(ticks))return false;
  w.ticks=ticks;w.feedback=null;return true;
}

const feedbackText = {
  condition:m`이 함수는 \(f'(x)>0\)이라는 조건을 만족하지 않습니다. 주장을 반박하기 전에, 문제의 조건부터 지켜야 합니다.`,
  'not-refuted':m`조건은 만족하지만 \(f(1)>0\)도 성립합니다. 이 함수로는 상대의 주장을 반박할 수 없습니다. \(x=1\)에서의 높이를 다시 살펴보세요.`,
  'negative-eventually':m`다른 \(x\)에서 양수가 되는 것과 \(x=1\)에서 양수인 것은 다릅니다. 재판에서 확인할 값을 다시 짚어 주세요.`,
  'negative-all':m`한 점에서 음수라는 사실만으로 모든 점에서 음수라고 할 수는 없습니다. 제출한 직선도 충분히 오른쪽으로 가면 양수가 됩니다.`,
  'zero-negative':m`\(0\)은 음수가 아닙니다. 다만 상대의 주장에 있는 \(>0\)을 만족하는지는 따로 판단해야 합니다.`,
  'zero-condition':m`\(f'(x)=1>0\)이므로 증가 조건을 만족합니다. 함숫값이 \(0\)인 것과 증가 여부를 구분해 주세요.`
};

function progress(w) {
  const names=['증거 작성','반대신문','증거 채택'];const active=['build','cross','accepted'].indexOf(w.phase);
  return `<ol class="workshop-progress" aria-label="증거 조사 진행">${names.map((name,i)=>`<li class="${i===active?'current':i<active?'done':''}" ${i===active?'aria-current="step"':''}><span>${i<active?'✓':String(i+1).padStart(2,'0')}</span>${name}</li>`).join('')}</ol>`;
}
function candidatePanel(ticks,locked=false) {
  const c=evaluateCandidate(ticks);
  return `<div class="workshop-candidate-head"><span class="eyebrow">${locked?'제출한 증거':'작성 중인 함수'}</span><p class="workshop-equation">${e(`\\(f(x)=${polynomialTex(ticks)}\\)`)}</p></div>${workshopGraph(ticks)}<dl class="workshop-values"><div><dt>기울기</dt><dd>${e(`\\(f'(x)=${c.coefficientTex}\\)`)}</dd></div><div><dt>주어진 함숫값</dt><dd>${e(m`\(f(0)=-1\)`)}</dd></div><div><dt>확인할 함숫값</dt><dd>${e(`\\(f(1)=${c.valueTex}\\)`)}</dd></div></dl>`;
}
function feedbackPanel(w) {
  return `<div id="workshop-feedback" class="workshop-feedback${w.feedback?' has-message':''}" role="status" aria-live="polite">${w.feedback?`<strong>${w.phase==='build'?'증거를 다시 검토해 주세요.':'반론을 다시 살펴보세요.'}</strong><p>${e(feedbackText[w.feedback])}</p>`:''}</div>`;
}
function judgeConclusion(ticks) {
  const c=evaluateCandidate(ticks);
  return `증거를 채택합니다. \\(f'(x)=${c.coefficientTex}>0\\), \\(f(0)=-1\\)이므로 조건을 모두 만족합니다. 하지만 \\(f(1)=${c.valueTex}${c.value===0?'':'<0'}\\)이므로 \\(f(1)>0\\)이라는 주장은 성립하지 않습니다.`;
}

export function workshopScene(run) {
  const w=ensureWorkshop(run);
  const character=w.phase==='cross'?'상대 변론인':'판사';
  const line=w.phase==='build'?(w.feedback?'이 증거를 조건과 주장에 비추어 다시 검토해 주세요.':'함수를 직접 구성해 보세요. 조건을 만족하면서 주장을 반박할 수 있습니까?'):w.phase==='cross'?'제출한 증거에 대해 반론이 있습니다. 제 말을 들어 주십시오.':'조건과 반박이 모두 확인되었습니다. 이 증거를 채택합니다.';
  return `<div class="court-scene expressive-scene reaction-${w.phase==='accepted'?'insight':'idle'}" aria-label="증거를 심리하는 법정">${portrait('judge',w.phase==='accepted'?'confident':w.feedback?'concerned':'thinking')}${portrait('advocate',w.phase==='accepted'?'concerned':w.phase==='cross'?'confident':'idle')}<div class="court-dialogue" aria-live="polite" aria-atomic="true"><span class="dialogue-speaker">${character}</span><p>${e(line)}</p></div><span class="reaction-badge">${w.phase==='build'?'증거 작성 중':w.phase==='cross'?'반대신문':'증거 채택'}</span></div>`;
}

export function workshopPaper(run) {
  const w=ensureWorkshop(run);
  const meta=`<div class="paper-meta"><span>연습 사건 / 증거 조사</span><span>시간 제한 없음</span></div>${progress(w)}`;
  if(w.phase==='build')return `${meta}<div class="hearing-speaker"><span class="speaker-seal">서</span><div><span>서기의 안내</span><strong>이번 증거는 직접 만들어 보세요.</strong></div></div><h2 class="question hearing-question" id="question" tabindex="-1">증가하면서, 양수가 아닌 값이 있다면?</h2><p class="workshop-conditions">${e(m`주어진 조건: 모든 실수 \(x\)에서 \(f'(x)>0\), \(f(0)=-1\).`)}</p><p class="workshop-instruction">${e(m`\(f(x)=ax-1\)의 기울기를 조절하세요. 문제의 조건을 지키면서 \(f(1)>0\)을 반박할 수 있는 함수를 제출해 주세요.`)}</p><div id="workshop-candidate">${candidatePanel(w.ticks)}</div><div class="workshop-controls"><div class="workshop-control-heading"><label for="workshop-slope">기울기 ${e(m`\(a\)`)}</label><output id="workshop-slope-value" for="workshop-slope">${e(`\\(a=${fractionTex(w.ticks)}\\)`)}</output></div><div class="workshop-slider-row"><button type="button" class="workshop-adjust" data-workshop-adjust="-1" aria-label="기울기 4분의 1 줄이기" ${w.ticks===-4?'disabled':''}>−</button><input id="workshop-slope" type="range" min="-4" max="8" step="1" value="${w.ticks}" aria-valuetext="${w.ticks/4}" aria-describedby="workshop-slider-help"><button type="button" class="workshop-adjust" data-workshop-adjust="1" aria-label="기울기 4분의 1 늘리기" ${w.ticks===8?'disabled':''}>+</button></div><div class="workshop-range-labels"><span>−1</span><span>2</span></div><p id="workshop-slider-help">막대나 − / + 버튼으로 조절할 수 있어요. 한 칸은 ¼입니다.</p></div>${feedbackPanel(w)}<div class="hearing-actions workshop-actions"><span class="workshop-action-note">조건과 반박을 모두 확인하세요.</span><button type="button" class="btn primary" data-workshop-action="submit">이 함수를 증거로 제출</button></div>`;
  if(w.phase==='cross'){
    const challenge=challengeFor(w.submittedTicks);
    return `${meta}<div class="hearing-speaker advocate-speaker"><span class="speaker-seal">변</span><div><span>상대 변론인</span><strong>그 증거에 이의를 제기합니다.</strong></div></div><h2 class="question hearing-question" id="question" tabindex="-1">상대의 반론에 답하세요.</h2><div class="workshop-submitted">${e(`제출한 함수: \\(f(x)=${polynomialTex(w.submittedTicks)}\\), \\(f(1)=${fractionTex(w.submittedTicks-4)}\\)`)}</div><blockquote class="workshop-opponent">${e(challenge.quote)}</blockquote><p class="workshop-instruction">${e(challenge.question)}</p><div class="choice-list workshop-response-list" aria-label="반대신문 답변">${challenge.options.map((option,i)=>`<button type="button" class="choice ${w.selectedResponse===option.id?'selected':''} ${w.feedback&&w.selectedResponse===option.id?'incorrect':''}" aria-pressed="${w.selectedResponse===option.id}" data-workshop-response="${option.id}"><span class="choice-number">${String(i+1).padStart(2,'0')}</span><span class="choice-body">${e(option.text)}</span><span class="choice-check" aria-hidden="true">${w.selectedResponse===option.id?'✓':''}</span></button>`).join('')}</div>${feedbackPanel(w)}<div class="hearing-actions workshop-actions"><button type="button" class="btn ghost" data-workshop-action="rebuild">증거 다시 만들기</button><button type="button" class="btn primary" data-workshop-action="answer" ${w.selectedResponse===null?'disabled':''}>반론에 답하기</button></div><details class="workshop-evidence-details"><summary>제출한 그래프 확인</summary>${candidatePanel(w.submittedTicks,true)}</details>`;
  }
  return `${meta}<div class="hearing-speaker"><span class="speaker-seal">판</span><div><span>재판장</span><strong>직접 만든 증거가 채택되었습니다.</strong></div></div><h2 class="question hearing-question" id="question" tabindex="-1">반례와 반박이 모두 확인되었습니다.</h2><div class="workshop-judgment"><span class="workshop-stamp">증거 채택</span><p>${e(judgeConclusion(w.submittedTicks))}</p></div>${candidatePanel(w.submittedTicks,true)}<div class="workshop-takeaway"><strong>이번 증거가 보여 준 것</strong><p>${e(m`원래 조건에서 보장되는 것은 \(f(1)>-1\)입니다. 이 반례가 있다고 해서 모든 가능한 함수에서 \(f(1)\)이 양수가 아니라고 단정할 수도 없습니다.`)}</p></div><div class="hearing-actions workshop-actions"><button type="button" class="btn primary" data-workshop-action="advance">최종 변론으로</button></div>`;
}

export function bindWorkshop(root,run,{onSave,onRender,onAttempt,onComplete,onAdvance}={}) {
  const rerender=()=>onRender?.();
  const update=ticks=>{
    if(!changeCoefficient(run,ticks))return;
    const w=ensureWorkshop(run);
    const panel=root.querySelector('#workshop-candidate');panel.innerHTML=candidatePanel(w.ticks);typesetMath(panel);
    const output=root.querySelector('#workshop-slope-value');output.textContent=`\\(a=${fractionTex(w.ticks)}\\)`;typesetMath(output);
    const range=root.querySelector('#workshop-slope');range.value=String(w.ticks);range.setAttribute('aria-valuetext',String(w.ticks/4));
    root.querySelector('[data-workshop-adjust="-1"]').disabled=w.ticks===-4;
    root.querySelector('[data-workshop-adjust="1"]').disabled=w.ticks===8;
    const feedback=root.querySelector('#workshop-feedback');feedback.innerHTML='';feedback.classList.remove('has-message');
    onSave?.();
  };
  root.querySelector('#workshop-slope')?.addEventListener('input',event=>update(Number(event.target.value)));
  root.querySelectorAll('[data-workshop-adjust]').forEach(button=>button.addEventListener('click',()=>update(ensureWorkshop(run).ticks+Number(button.dataset.workshopAdjust))));
  root.querySelectorAll('[data-workshop-response]').forEach(button=>button.addEventListener('click',()=>{
    const w=ensureWorkshop(run);if(w.phase!=='cross')return;
    w.selectedResponse=button.dataset.workshopResponse;w.feedback=null;
    root.querySelectorAll('[data-workshop-response]').forEach(item=>{const selected=item===button;item.classList.toggle('selected',selected);item.classList.remove('incorrect');item.setAttribute('aria-pressed',String(selected));item.querySelector('.choice-check').textContent=selected?'✓':'';});
    root.querySelector('[data-workshop-action="answer"]').disabled=false;
    const feedback=root.querySelector('#workshop-feedback');feedback.innerHTML='';feedback.classList.remove('has-message');onSave?.();
  }));
  root.querySelectorAll('[data-workshop-action]').forEach(button=>button.addEventListener('click',()=>{
    const action=button.dataset.workshopAction,w=ensureWorkshop(run);
    if(action==='submit'){
      const result=submitCandidate(run);if(result.ignored)return;
      onAttempt?.(result.accepted);rerender();
    }else if(action==='answer'){
      const result=submitResponse(run,w.selectedResponse);if(result.ignored)return;
      onAttempt?.(result.accepted);
      if(result.accepted)onComplete?.();else rerender();
    }else if(action==='rebuild'&&w.phase==='cross'){
      w.phase='build';w.submittedTicks=null;w.selectedResponse=null;w.feedback=null;rerender();
    }else if(action==='advance'&&w.phase==='accepted')onAdvance?.();
  }));
}

// Enumerate every authored state so the shared vector cache covers live slider values too.
export function workshopMathCorpus() {
  const corpus=[...Object.values(feedbackText),...workshopGraphMathCorpus()];
  for(const ticks of WORKSHOP_TICKS){
    const run={workshop:{version:1,phase:'build',ticks}};
    corpus.push(workshopPaper(run),candidatePanel(ticks),`\\(a=${fractionTex(ticks)}\\)`);
    const candidate=evaluateCandidate(ticks);
    if(candidate.accepted){
      corpus.push(challengeFor(ticks),judgeConclusion(ticks));
      run.workshop.phase='cross';run.workshop.submittedTicks=ticks;corpus.push(workshopPaper(run));
      run.workshop.phase='accepted';corpus.push(workshopPaper(run));
    }
  }
  const decode=value=>typeof value==='string'?value.replaceAll('&gt;','>').replaceAll('&lt;','<').replaceAll('&quot;','\"').replaceAll('&#39;',"'").replaceAll('&amp;','&'):Array.isArray(value)?value.map(decode):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,decode(item)])):value;
  return decode(corpus);
}
