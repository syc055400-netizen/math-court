import { characterScene, portrait } from './characters.js?v=20261105';

const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const phases = new Set(['opening','testimony','review']);
const bounded = (value,min,max) => Math.max(min,Math.min(max,Number.isInteger(value)?value:min));

/** Listening does not count as a scored answer. Only an objection/acceptance does. */
export function ensureHearing(c,run) {
  const last = c.steps.length-1;
  if (!run.hearing || !phases.has(run.hearing.phase)) run.hearing={phase:'opening',cursor:0,heardThrough:-1};
  const h=run.hearing;
  h.cursor=bounded(h.cursor,0,last);
  h.heardThrough=bounded(h.heardThrough,-1,last);
  if(h.phase==='testimony')h.heardThrough=Math.max(h.heardThrough,h.cursor);
  if(h.phase==='review')h.heardThrough=last;
  // Existing saved judgments retain their conclusion when the new hearing UI loads.
  if(run.cleared){
    if(run.selection==='none'){h.phase='review';h.heardThrough=last;}
    else if(Number.isInteger(run.selection)){h.phase='testimony';h.cursor=bounded(run.selection,0,last);h.heardThrough=Math.max(h.heardThrough,h.cursor);}
  }
  return h;
}

export function hearingScene(c,run,feedback) {
  const h=ensureHearing(c,run);
  if(run.cleared||feedback)return characterScene('error',run.cleared||feedback?.success?'correct':'wrong',c.errorIndex===null);
  const opening=h.phase==='opening',review=h.phase==='review';
  const speaker=opening||review?'판사':'상대 변론인';
  const line=opening?'지금부터 재판을 시작합니다. 사건의 조건과 주장을 확인해 주세요.':review?'진술이 끝났습니다. 이의가 없다면 풀이의 타당성을 인정해 주세요.':`${h.cursor+1}번째 진술입니다. 제 풀이를 한 줄씩 설명하겠습니다.`;
  return `<div class="court-scene expressive-scene hearing-scene reaction-idle" data-outcome="${h.phase}" aria-label="진술을 듣는 법정">${portrait('judge',opening?'confident':review?'thinking':'idle')}${portrait('advocate',opening?'idle':review?'thinking':'confident')}<div class="court-dialogue" aria-live="polite" aria-atomic="true"><span class="dialogue-speaker">${speaker}</span><p>${e(line)}</p></div><span class="reaction-badge">${opening?'개정 · 사건 소개':review?'최종 판단':`진술 ${h.cursor+1} / ${c.steps.length}`}</span></div>`;
}

function feedbackMarkup(feedback,cleared) {
  return `<div id="stage-feedback" class="feedback ${feedback||cleared?(cleared?'success':'error'):''}" role="status" aria-live="polite">${feedback?`<strong>${cleared?'판단을 기록합니다.':'이의 제기를 다시 검토해 보세요.'}</strong>${e(feedback.text)}`:cleared?'<strong>판단을 기록합니다.</strong>이제 그 판단을 뒷받침하는 근거를 제시해 주세요.':''}</div>`;
}

function transcript(c,h,cleared,expanded=false) {
  if(h.heardThrough<0)return '';
  return `<details class="hearing-transcript" ${expanded?'open':''}><summary>지금까지의 진술 기록 <span>${h.heardThrough+1}줄</span></summary><ol>${c.steps.slice(0,h.heardThrough+1).map((step,i)=>`<li><button type="button" data-hearing-line="${i}" ${cleared?'disabled':''} ${h.phase==='testimony'&&h.cursor===i?'aria-current="true"':''}><span class="transcript-number">${String(i+1).padStart(2,'0')}</span><span class="math">${e(step)}</span><span class="transcript-revisit">다시 듣기</span></button></li>`).join('')}</ol></details>`;
}

export function hearingPaper(c,run,feedback) {
  const h=ensureHearing(c,run),isTutorial=c.id==='tutorial';
  const meta=`<div class="paper-meta"><span>${isTutorial?'첫 재판 · 연습':'본 재판'} / 진술 청취</span><span>시간 제한 없음</span></div>`;
  if(h.phase==='opening'&&!run.cleared){
    return `${meta}<div class="hearing-speaker"><span class="speaker-seal">판</span><div><span>재판장</span><strong>사건을 소개하겠습니다.</strong></div></div><h2 id="question" class="question hearing-question" tabindex="-1">${e(c.title)}</h2><div class="opening-statement"><span class="eyebrow">이 사건의 조건</span><ul>${c.conditions.map(condition=>`<li class="math">${e(condition)}</li>`).join('')}</ul><div class="opening-claim"><span class="eyebrow">확인할 주장</span><p class="math">${e(c.claim)}</p></div></div><p class="hearing-tip">${isTutorial?'상대가 풀이를 한 줄씩 설명해요. 처음 잘못된 줄에서 ‘이의 있습니다!’를 눌러 보세요.':'상대의 설명을 듣고, 처음 논리가 어긋나는 줄에서 이의를 제기하세요.'} 모든 줄이 타당하면 끝까지 듣고 ‘이의 없음’을 선택하세요.</p><div class="hearing-actions opening-actions"><button type="button" class="btn primary" data-hearing-action="listen">상대측 설명 듣기 <span aria-hidden="true">→</span></button></div>`;
  }
  if(h.phase==='review'){
    return `${meta}<div class="hearing-speaker"><span class="speaker-seal">판</span><div><span>재판장</span><strong>모든 진술을 들었습니다.</strong></div></div><h2 id="question" class="question hearing-question" tabindex="-1">이 풀이를 받아들일 수 있습니까?</h2><p class="hearing-tip">모든 추론이 타당하면 ‘이의 없음’을 선택하세요. 오류를 놓쳤다면 기록에서 그 줄을 다시 듣고 이의를 제기할 수 있어요.</p>${transcript(c,h,run.cleared,true)}${feedbackMarkup(feedback,run.cleared)}<div class="hearing-actions">${run.cleared?'<button type="button" class="btn primary" data-hearing-action="proceed">근거 제시하기 <span aria-hidden="true">→</span></button>':'<button type="button" class="btn secondary" data-hearing-action="review">첫 진술부터 다시 듣기</button><button type="button" class="btn primary" data-hearing-action="accept">이의 없음 — 풀이가 타당합니다</button>'}</div>`;
  }
  return `${meta}<div class="hearing-speaker advocate-speaker"><span class="speaker-seal">변</span><div><span>상대 변론인</span><strong>진술 ${h.cursor+1} / ${c.steps.length}</strong></div><span class="hearing-progress">${c.steps.map((_,i)=>`<i class="${i<=h.heardThrough?'heard':''} ${i===h.cursor?'current':''}"></i>`).join('')}</span></div><h2 id="question" class="question hearing-question" tabindex="-1">${run.cleared?'이 진술에 대한 판단을 기록합니다.':'제 풀이를 설명하겠습니다.'}</h2><blockquote class="testimony-line math"><span class="testimony-order">${String(h.cursor+1).padStart(2,'0')}</span><p>${e(c.steps[h.cursor])}</p></blockquote>${feedbackMarkup(feedback,run.cleared)}${!run.cleared?`<p class="hearing-tip">${isTutorial?'이 줄이 옳다면 계속 듣고, 처음 잘못된 줄이라면 이의를 제기하세요.':'조건에서 이 결론이 따라 나오는지 확인하세요.'}</p>`:''}<div class="hearing-actions">${run.cleared?'<button type="button" class="btn primary" data-hearing-action="proceed">근거 제시하기 <span aria-hidden="true">→</span></button>':`<button type="button" class="btn primary objection-button" data-hearing-action="object"><span aria-hidden="true">!</span> 이의 있습니다!</button><button type="button" class="btn secondary" data-hearing-action="continue">${h.cursor===c.steps.length-1?'진술 마치기':'계속 듣기'} <span aria-hidden="true">→</span></button>`}</div>${!run.cleared&&h.cursor>0?'<button type="button" class="hearing-back" data-hearing-action="previous">← 이전 진술 다시 듣기</button>':''}${transcript(c,h,run.cleared)}`;
}

export function bindHearing(root,c,run,{onUpdate,onSubmit,onProceed}) {
  const h=ensureHearing(c,run);
  const update=()=>onUpdate?.();
  root.querySelectorAll('[data-hearing-action]').forEach(button=>button.addEventListener('click',()=>{
    const action=button.dataset.hearingAction;
    if(action==='proceed'){if(run.cleared)onProceed?.();return;}
    if(run.cleared)return;
    if(action==='listen'){h.phase='testimony';h.cursor=0;h.heardThrough=Math.max(0,h.heardThrough);update();}
    else if(action==='object'&&h.phase==='testimony')onSubmit?.(h.cursor);
    else if(action==='continue'&&h.phase==='testimony'){
      if(h.cursor===c.steps.length-1)h.phase='review';
      else {h.cursor++;h.heardThrough=Math.max(h.heardThrough,h.cursor);}
      update();
    }
    else if(action==='previous'&&h.phase==='testimony'&&h.cursor>0){h.cursor--;update();}
    else if(action==='review'&&h.phase==='review'){h.phase='testimony';h.cursor=0;update();}
    else if(action==='accept'&&h.phase==='review'&&h.heardThrough===c.steps.length-1)onSubmit?.('none');
  }));
  root.querySelectorAll('[data-hearing-line]').forEach(button=>button.addEventListener('click',()=>{
    if(run.cleared)return;
    const cursor=Number(button.dataset.hearingLine);
    if(!Number.isInteger(cursor)||cursor<0||cursor>h.heardThrough)return;
    h.cursor=cursor;h.phase='testimony';update();
  }));
}
