import { tutorial, cases } from './cases.js?v=20261030-latex';
import { evidenceGraph } from './graphs.js?v=20261030-latex';
import { enterCourt } from './entrance.js';
import { typesetMath } from './math.js';

const app = document.getElementById('app');
const dialogRoot = document.getElementById('dialog-root');
const STORAGE_KEY = 'math-court-calculus-v1';
const allCases = [tutorial, ...cases];
const stageNames = {error:'오류 지목',reason:'이유 판단',evidence:'증거 확인',counter:'반론 검토',repair:'논리 복구',transfer:'새 문제 적용'};
const stageButtons = {error:'판단 확인하기',reason:'이유 확인하기',evidence:'증거 제출하기',counter:'반론 판단하기',repair:'수정안 확정하기',transfer:'적용 결과 확인'};
const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const e = escapeHTML;
const initialState = () => ({tutorialDone:false,completed:{},runs:{},lastCase:null,sound:false});
let state = initialState();
let selectedChapter = '전체';
let feedback = null;
let toastTimer;
let audio;
try {
  const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  if (raw && typeof raw === 'object') {
    state.tutorialDone = raw.tutorialDone === true;
    state.sound = raw.sound === true;
    state.completed = raw.completed && typeof raw.completed === 'object' ? raw.completed : {};
    state.runs = raw.runs && typeof raw.runs === 'object' ? raw.runs : {};
    state.lastCase = typeof raw.lastCase === 'string' ? raw.lastCase : null;
  }
} catch { /* A missing or invalid record starts a fresh session. */ }

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { toast('지금은 기록을 저장할 수 없어요. 이 화면에서는 계속 플레이할 수 있어요.'); }
}
function toast(text) {
  const target=document.getElementById('toast');target.textContent=text;target.classList.add('visible');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>target.classList.remove('visible'),3300);
}
function playSound(success=true) {
  if(!state.sound)return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if(audio.state==='suspended')audio.resume();
    const osc=audio.createOscillator(), gain=audio.createGain();
    osc.type='triangle';osc.frequency.setValueAtTime(success?440:220,audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(success?660:180,audio.currentTime+.12);
    gain.gain.setValueAtTime(.045,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.22);
    osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+.23);
  }catch{/* Sound is optional. */}
}
function updateSound(){const b=document.getElementById('sound-button');b.textContent=state.sound?'소리 켜짐':'소리 꺼짐';b.setAttribute('aria-pressed',String(state.sound));}
document.getElementById('sound-button').addEventListener('click',()=>{state.sound=!state.sound;save();updateSound();playSound();});
document.getElementById('help-button').addEventListener('click',showHelp);

function showDialog(title,content,actions){
  const previous=document.activeElement;
  dialogRoot.innerHTML=`<div class="dialog-overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><button type="button" class="dialog-close btn ghost" aria-label="닫기">×</button><span class="eyebrow">법정 안내</span><h2 id="dialog-title">${e(title)}</h2><div class="dialog-content">${content}</div><div class="dialog-actions">${actions.map((a,i)=>`<button type="button" data-dialog-action="${i}" class="btn ${a.primary?'primary':'secondary'}">${e(a.label)}</button>`).join('')}</div></section></div>`;
  typesetMath(dialogRoot);
  const close=()=>{dialogRoot.innerHTML='';document.removeEventListener('keydown',trap);previous?.focus();};
  const trap=event=>{
    if(event.key==='Escape'){close();return;}
    if(event.key!=='Tab')return;
    const buttons=dialogRoot.querySelectorAll('button,a,input');const first=buttons[0],last=buttons[buttons.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
  document.addEventListener('keydown',trap);
  dialogRoot.querySelector('.dialog-close').addEventListener('click',close);
  dialogRoot.querySelector('.dialog-overlay').addEventListener('click',ev=>{if(ev.target.classList.contains('dialog-overlay'))close();});
  dialogRoot.querySelectorAll('[data-dialog-action]').forEach(b=>b.addEventListener('click',()=>{const a=actions[Number(b.dataset.dialogAction)];close();a.action?.();}));
  dialogRoot.querySelector('[data-dialog-action]')?.focus();
}
function showHelp(){showDialog('처음이라면, 첫 사건부터',`<p>주어진 풀이의 <strong>처음 잘못된 줄</strong>을 찾고, 그 판단을 뒷받침하는 증거를 고르는 게임이에요.</p><ol><li><strong>조건 읽기</strong> — 조건은 재판 중에도 계속 보여요.</li><li><strong>판단하기</strong> — 선택한 뒤 확인 버튼을 눌러 확정해요.</li><li><strong>증거 대조하기</strong> — 반례도 주어진 조건을 만족해야 해요.</li><li><strong>논리 복구하기</strong> — 필요한 부분을 고친 뒤 새 문제에 적용해요.</li></ol><p>올바른 풀이도 있어요. <strong>‘오류 없음’</strong>을 근거와 함께 판단해 보세요. 틀려도 감점이나 재도전 비용은 없으며, 첫 판단과 다시 확인한 단계를 나누어 기록해요.</p>`,[{label:'닫기'},{label:'튜토리얼 열기',primary:true,action:()=>startCase(tutorial.id,true)}]);}

function stagesFor(c){return c.id===tutorial.id?['error','evidence','repair']:['error','reason','evidence','counter','repair','transfer'];}
function freshRun(c){return {id:c.id,stage:0,selection:null,cleared:false,firstAnswers:{},mistakes:{},finished:false,seed:Math.floor(Math.random()*2147483647)};}
function validRun(c,run){return run && run.id===c.id && Number.isInteger(run.stage) && run.stage>=0 && run.stage<=stagesFor(c).length && typeof run.firstAnswers==='object' && run.firstAnswers!==null && typeof run.mistakes==='object' && run.mistakes!==null;}
function getRun(c){if(!validRun(c,state.runs[c.id]))state.runs[c.id]=freshRun(c);if(!Number.isInteger(state.runs[c.id].seed))state.runs[c.id].seed=Math.floor(Math.random()*2147483647);return state.runs[c.id];}
function startCase(id,restart=false){
  const c=allCases.find(x=>x.id===id);if(!c)return;
  const run=getRun(c);if(restart||run.finished)state.runs[id]=freshRun(c);
  state.lastCase=id;feedback=null;save();
  const hash=`#case/${encodeURIComponent(id)}`;
  if(location.hash!==hash)history.pushState(null,'',hash);
  renderGame(c);
  enterCourt({title:c.title,chapter:c.chapter,sound:state.sound}).then(()=>app.querySelector('.question')?.focus({preventScroll:true}));
  window.scrollTo({top:0,behavior:'instant'});
}
function home(){if(location.hash==='#home')renderHome();else location.hash='#home';window.scrollTo({top:0,behavior:'instant'});}
function completedCount(){return cases.filter(c=>state.completed[c.id]).length;}
function setScreen(name){document.body.dataset.screen=name;}
function archive(){if(location.hash==='#cases')renderArchive();else location.hash='#cases';window.scrollTo({top:0,behavior:'instant'});}
function renderHome(){
  setScreen('title');document.title='오답법정 · 미적분Ⅰ';
  const count=completedCount();
  const resume=allCases.find(c=>c.id===state.lastCase&&validRun(c,state.runs[c.id])&&!state.runs[c.id].finished);
  app.innerHTML=`<section class="title-screen" aria-labelledby="game-title"><div class="title-masthead"><small>미적분Ⅰ · 논리 추리 어드벤처</small><h1 id="game-title">오답법정</h1><p>그럴듯한 풀이, 숨겨진 모순.<br>이번 재판의 판단은 당신에게 달렸다.</p></div><div class="title-menu"><button class="btn primary" id="hero-start">${resume?'이어서 재판하기':state.tutorialDone?'다음 사건 시작':'재판 시작하기'}</button><button class="btn secondary" id="hero-tutorial">처음 배우기</button><button class="btn secondary" id="open-archive">사건 기록실 <span>${count} / ${cases.length}</span></button></div><div class="title-footer"><span>극한·연속 / 미분 / 적분</span><span>${resume?'진행 중인 재판이 저장되어 있어요.':'첫 재판은 서기와 함께하는 튜토리얼입니다.'}</span></div></section>`;
  typesetMath(app);
  document.getElementById('hero-start').onclick=()=>startCase(resume?.id||(!state.tutorialDone?tutorial.id:(cases.find(c=>!state.completed[c.id])||cases[0]).id));
  document.getElementById('hero-tutorial').onclick=()=>startCase(tutorial.id,true);
  document.getElementById('open-archive').onclick=archive;
}
function renderArchive(){
  setScreen('archive');document.title='사건 기록실 · 오답법정';
  const count=completedCount(),chapters=['전체','극한·연속','미분','적분'];
  const filtered=cases.filter(c=>selectedChapter==='전체'||c.chapter===selectedChapter);
  app.innerHTML=`<section class="archive-view"><div class="archive-top"><button class="back-link" id="back-title">← 법정으로</button><h1>사건 기록실</h1><span class="archive-count">${count} / ${cases.length} 해결</span></div><nav class="chapter-tabs" aria-label="단원 필터">${chapters.map(ch=>`<button class="tab ${ch===selectedChapter?'active':''}" data-chapter="${e(ch)}" aria-pressed="${ch===selectedChapter}">${e(ch)}</button>`).join('')}</nav><div class="case-grid">${filtered.map(c=>{
    const done=state.completed[c.id],active=validRun(c,state.runs[c.id])&&!state.runs[c.id].finished;
    return `<button class="case-card ${done?'completed':''}" data-case="${e(c.id)}"><div class="case-card-top"><span class="case-number">사건 ${String(cases.indexOf(c)+1).padStart(2,'0')}</span><span class="case-badge">${done?'해결':active?'진행 중':'◆'.repeat(c.level)}</span></div><span class="case-category">${e(c.chapter)}</span><h2 class="case-title">${e(c.title)}</h2><p class="case-description">${e(c.concept)}</p><div class="case-footer"><span>${done?`첫 판단 ${done.firstCorrect}/${done.total}`:e(c.duration)}</span><span>${done?'재심하기':active?'이어하기':'사건 열기'} →</span></div></button>`;
  }).join('')}</div><p class="archive-note">원하는 사건부터 시작해도 좋아요. 틀린 판단은 증거를 다시 살펴보고 고칠 수 있어요.</p></section>`;
  typesetMath(app);
  document.getElementById('back-title').onclick=home;
  app.querySelectorAll('[data-case]').forEach(b=>b.onclick=()=>startCase(b.dataset.case));
  app.querySelectorAll('[data-chapter]').forEach(b=>b.onclick=()=>{selectedChapter=b.dataset.chapter;renderArchive();app.querySelector(`[data-chapter="${selectedChapter}"]`)?.focus();});
}

function getStage(c,stage){
  const records={
    error:{title:'처음 잘못된 줄은 어디일까?',guide:'조건을 읽고, 논리가 처음 어긋난 줄을 골라 주세요. 모든 줄이 타당할 수도 있어요.',options:[...c.steps.map((text,i)=>({text,value:i,correct:c.errorIndex===i,feedback:i<c.errorIndex?'이 줄은 주어진 조건에서 타당해요. 이후 추론을 다시 살펴보세요.':c.errorIndex===null?'이 줄은 조건과 앞선 추론에서 따라 나와요. 실제로 논리적 오류가 있는지 다시 검토해 보세요.':'그보다 앞에서 이미 논리가 어긋났어요. 첫 오류가 어디인지 확인해 보세요.'})),{text:'오류 없음 — 모든 단계가 타당하다.',value:'none',correct:c.errorIndex===null,feedback:'주어진 조건만으로 각 결론이 정말 따라 나오는지 한 줄씩 대조해 보세요.'}]},
    reason:{title:'그 판단의 이유는 무엇일까?',guide:c.errorIndex===null?'오류가 없다고 판단한 이유를 확인해 봅시다.':`${c.errorIndex+1}번째 줄을 지목했어요. 정확히 무엇이 잘못됐는지 설명해 봅시다.`,options:c.reasonOptions},
    evidence:{title:'판단을 뒷받침할 증거는?',guide:c.errorIndex===null?'이 풀이의 논리를 확인해 주는 근거를 찾아주세요.':'반례나 근거가 주어진 조건을 만족하면서, 지목한 줄을 반박하는지 확인해 주세요.',options:c.evidenceOptions},
    counter:{title:'이 반론은 받아들일 수 있을까?',guide:'상대의 주장을 조건과 증거에 비추어 검토해 보세요.',quote:c.counterargument.text,options:c.counterargument.options},
    repair:{title:c.errorIndex===null?'풀이를 어떻게 마무리할까?':'필요한 부분만 고쳐 본다면?',guide:c.errorIndex===null?'타당한 풀이를 억지로 고칠 필요는 없어요.':'옳은 부분은 유지하고, 잘못된 결론이나 근거를 고쳐 주세요.',options:c.repairOptions},
    transfer:{title:'새로운 사건에도 적용할 수 있을까?',guide:'방금 확인한 개념을 새로운 조건에서 사용해 보세요.',quote:c.transfer.question,options:c.transfer.options}
  };
  const record=records[stage];return {...record,options:record.options.map((o,i)=>({...o,value:o.value??i}))};
}
function dossier(c,run){return `<aside class="case-dossier"><div class="dossier-tab">사건 기록</div><div class="dossier-inner"><span class="eyebrow">주어진 조건</span><ul class="condition-list">${c.conditions.map(t=>`<li class="math">${e(t)}</li>`).join('')}</ul><div class="dossier-divider"></div><span class="eyebrow">검토할 주장</span><p class="claim-text math">${e(c.claim)}</p><details class="record-steps" ${run.stage===0?'':'open'}><summary>전체 풀이 확인</summary><ol>${c.steps.map((s,i)=>`<li class="${run.stage>0&&i===c.errorIndex?'marked-step':''}">${e(s)}</li>`).join('')}</ol></details><p class="dossier-note">조건을 만족하는 증거인지 확인하세요.</p></div></aside>`;}
function renderGame(c){
  setScreen('game');
  const run=getRun(c),stages=stagesFor(c);if(run.stage>=stages.length||run.finished){finish(c,run);renderResult(c,run);return;}
  const key=stages[run.stage],s=getStage(c,key),isTutorial=c.id===tutorial.id;
  if(key!=='error'){
    let seed=(run.seed+run.stage*1013904223)>>>0;
    for(let i=s.options.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[s.options[i],s.options[j]]=[s.options[j],s.options[i]];}
  }
  document.title=`${c.title} · 오답법정`;
  if(run.cleared&&!feedback){const pick=s.options.find(o=>o.value===run.selection);feedback={success:true,text:key==='error'?successMessage(c,key):(pick?.feedback||successMessage(c,key))};}
  app.innerHTML=`<section class="game-view"><div class="game-topbar"><button type="button" class="back-link" id="back-home">← 사건 목록</button><div class="case-heading"><span class="eyebrow">${isTutorial?'첫 재판':`사건 ${String(cases.indexOf(c)+1).padStart(2,'0')}`} · ${e(c.chapter)}</span><h1>${e(c.title)}</h1></div><span class="practice-label">${isTutorial?'서기와 함께 연습':'기록 자동 저장'}</span></div><div class="court-scene" aria-label="픽셀 아트 법정"><span class="scene-label">${isTutorial?'첫 재판 · 튜토리얼':'심리 진행 중'}</span><div class="judge-speech">${run.cleared?'좋습니다. 다음 증거를 살펴보죠.':key==='error'?'그 주장은, 정말 타당합니까?':key==='evidence'?'증거는 조건을 만족해야 합니다.':'당신의 판단을 들려주세요.'}</div></div><nav class="stage-nav" aria-label="사건 진행 단계">${stages.map((k,i)=>`<span class="stage ${i===run.stage?'active':i<run.stage?'done':''}" ${i===run.stage?'aria-current="step"':''}><b>${String(i+1).padStart(2,'0')}</b> ${stageNames[k]}</span>`).join('')}</nav><div class="game-layout">${dossier(c,run)}<section class="game-paper" aria-labelledby="question"><div class="paper-meta"><span>${isTutorial?'연습 사건':'심리 기록'} / ${run.stage+1} / ${stages.length}</span><span>시간 제한 없음</span></div><div class="guide"><span class="guide-icon" aria-hidden="true">${isTutorial?'서':'안'}</span><div><span class="guide-name">${isTutorial?'서기의 안내':'판단의 실마리'}</span><p class="guide-text">${e(s.guide)}</p></div></div><h2 class="question" id="question" tabindex="-1">${e(s.title)}</h2>${s.quote?`<blockquote class="stage-quote math">${e(s.quote)}</blockquote>`:''}<div class="choice-list" aria-label="${e(stageNames[key])} 선택지">${s.options.map((o,i)=>`<button type="button" class="choice ${run.selection===o.value?'selected':''} ${run.cleared&&run.selection===o.value?'correct':''} ${feedback&&!feedback.success&&run.selection===o.value?'incorrect':''}" data-choice="${i}" aria-pressed="${run.selection===o.value}" ${run.cleared?'disabled':''}><span class="choice-number">${o.value==='none'?'✓':String(i+1).padStart(2,'0')}</span><span class="choice-body">${e(o.text)}${o.detail?`<small class="choice-detail">${e(o.detail)}</small>`:''}</span><span class="choice-check" aria-hidden="true">${run.selection===o.value?'✓':''}</span></button>`).join('')}</div><div id="stage-feedback" class="feedback ${feedback?(feedback.success?'success':'error'):''}" aria-live="polite">${feedback?`<strong>${feedback.success?'확인했어요.':'다시 살펴볼까요?'}</strong> ${e(feedback.text)}`:''}</div>${run.cleared&&key==='evidence'?evidenceGraph(c.id):''}<div class="game-actions"><span class="action-hint">${run.cleared?'근거를 확인한 뒤 다음 단계로 이동해요.':run.mistakes[key]?'다시 선택해도 감점은 없어요.':'선택한 뒤 확인 버튼을 눌러 주세요.'}</span><button type="button" class="btn primary" id="confirm-answer" ${run.selection===null&&!run.cleared?'disabled':''}>${run.cleared?(run.stage===stages.length-1?'판결 확인하기':'다음 단계로'):stageButtons[key]} <span aria-hidden="true">→</span></button></div></section></div></section>`;
  typesetMath(app);
  document.getElementById('back-home').addEventListener('click',archive);
  app.querySelectorAll('[data-choice]').forEach(b=>b.addEventListener('click',()=>{
    if(run.cleared)return;run.selection=s.options[Number(b.dataset.choice)].value;feedback=null;save();
    app.querySelectorAll('[data-choice]').forEach(el=>{const on=el===b;el.classList.toggle('selected',on);el.classList.remove('incorrect');el.setAttribute('aria-pressed',String(on));el.querySelector('.choice-check').textContent=on?'✓':'';});
    const f=document.getElementById('stage-feedback');f.className='feedback';f.textContent='';document.getElementById('confirm-answer').disabled=false;
  }));
  document.getElementById('confirm-answer').addEventListener('click',()=>{
    if(run.cleared){run.stage++;run.selection=null;run.cleared=false;feedback=null;save();renderGame(c);app.querySelector('.question,.result-card h1')?.focus({preventScroll:true});return;}
    const pick=s.options.find(o=>o.value===run.selection);if(!pick)return;
    if(!(key in run.firstAnswers))run.firstAnswers[key]=pick.correct;
    if(pick.correct){run.cleared=true;feedback={success:true,text:key==='error'?successMessage(c,key):(pick.feedback||successMessage(c,key))};playSound(true);}
    else{run.mistakes[key]=(run.mistakes[key]||0)+1;feedback={success:false,text:pick.feedback||'문제 조건과 풀이를 다시 대조해 보세요.'};playSound(false);}
    save();renderGame(c);document.getElementById('confirm-answer')?.focus({preventScroll:true});
  });
}
function successMessage(c,key){
  if(key==='error')return c.errorIndex===null?'모든 단계가 주어진 조건과 근거에서 따라 나와요.':`${c.errorIndex+1}번째 줄에서 처음 논리가 어긋났어요. 다음으로 그 이유를 확인해 봅시다.`;
  if(key==='evidence')return '조건과 증거를 함께 확인했어요. 이 근거가 판단을 뒷받침해요.';
  if(key==='repair')return c.takeaway;
  return '주어진 조건을 사용해 타당하게 판단했어요.';
}
function finish(c,run){
  if(run.finished)return;run.finished=true;
  const stages=stagesFor(c),firstCorrect=stages.filter(s=>run.firstAnswers[s]===true).length;
  if(c.id===tutorial.id)state.tutorialDone=true;
  else state.completed[c.id]={firstCorrect,total:stages.length,firstAnswers:{...run.firstAnswers},at:new Date().toISOString()};
  if(state.lastCase===c.id)state.lastCase=null;save();
}
function renderResult(c,run){
  setScreen('result');
  const stages=stagesFor(c),isTutorial=c.id===tutorial.id;
  const firstCorrect=stages.filter(s=>run.firstAnswers[s]===true).length;
  const next=cases.find(x=>!state.completed[x.id]&&x.id!==c.id)||cases[(cases.indexOf(c)+1)%cases.length]||cases[0];
  app.innerHTML=`<section class="result-view"><button type="button" class="back-link" id="back-home">← 사건 목록</button><div class="result-card"><span class="eyebrow">재판 종료 · ${isTutorial?'첫 재판':e(c.chapter)}</span><div class="verdict-stamp">${c.errorIndex===null?'타당성 확인':'논리 복구'}</div><h1 tabindex="-1">${isTutorial?'첫 재판을 마쳤습니다.':'사건을 해결했습니다.'}</h1><p class="result-subtitle">${e(c.title)}</p><div class="takeaway"><span>이번 사건에서 확인한 것</span><p>${e(c.takeaway)}</p></div><div class="result-summary"><strong>첫 판단 ${firstCorrect} / ${stages.length}</strong><span>${firstCorrect===stages.length?'모든 단계에서 처음부터 근거를 정확히 판단했어요.':`${stages.length-firstCorrect}개 단계는 근거를 다시 확인하며 해결했어요.`}</span></div><div class="skill-grid">${stages.map(s=>`<div class="skill-item ${run.firstAnswers[s]?'passed':''}"><span>${e(stageNames[s])}</span><strong>${run.firstAnswers[s]?'처음부터 정확':'다시 확인 후 해결'}</strong></div>`).join('')}</div><div class="result-actions"><button type="button" class="btn primary" id="next-case">${isTutorial?'첫 정식 사건 열기':'다음 사건 열기'} <span aria-hidden="true">→</span></button><button type="button" class="btn secondary" id="retry-case">무료로 다시 도전</button></div><button type="button" class="btn ghost" id="all-cases">모든 사건 보기</button></div></section>`;
  typesetMath(app);
  document.getElementById('back-home').addEventListener('click',archive);document.getElementById('all-cases').addEventListener('click',archive);
  document.getElementById('next-case').addEventListener('click',()=>startCase(isTutorial?cases[0].id:next.id));
  document.getElementById('retry-case').addEventListener('click',()=>startCase(c.id,true));
}
function route(){
  feedback=null;
  const path=location.hash.replace(/^#/,'');
  if(path==='cases'){renderArchive();return;}
  if(path.startsWith('case/')){let id;try{id=decodeURIComponent(path.slice(5));}catch{home();return;}const c=allCases.find(x=>x.id===id);if(c){renderGame(c);return;}}
  renderHome();
}
window.addEventListener('hashchange',route);
updateSound();route();
