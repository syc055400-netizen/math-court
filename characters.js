const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// A reaction follows the submitted reasoning, never the unsubmitted choice.
export function reactionFor(stage, outcome = 'idle', validProof = false) {
  if (outcome === 'verdict') return { judge:'pleased', advocate:'pleased', speaker:'판사', line:'근거가 충분합니다. 이번 사건의 심리를 마칩니다!', badge:'판결 확정', motion:'celebrate' };
  if (outcome === 'selected') return { judge:'thinking', advocate:'thinking', speaker:'판사', line:'판단을 골랐군요. 근거를 확인하고 제출해 주세요.', badge:'판단 준비', motion:'idle' };
  if (outcome === 'wrong') {
    const lines = { error:'서두르지 마세요. 조건과 각 줄을 다시 대조해 봅시다.', reason:'지목한 줄과 이 이유가 연결되는지 살펴보세요.', evidence:'이 증거가 주어진 조건을 모두 만족하나요?', counter:'반론에 새로운 가정이 숨어 있지는 않나요?', repair:'옳았던 부분까지 바꾸지는 않았는지 확인해 봅시다.', transfer:'숫자가 달라져도 판단의 기준은 같습니다.' };
    return { judge:'concerned', advocate:'thinking', speaker:'판사', line:lines[stage] || lines.error, badge:'잠깐, 다시 검토!', motion:'reconsider' };
  }
  if (outcome === 'correct') {
    const reactions = {
      error: { judge:'surprised', advocate:validProof?'pleased':'surprised', speaker:'판사', line:validProof?'타당한 풀이를 알아보았군요. 그 근거를 듣겠습니다.':'날카로운 지적입니다! 어느 조건을 놓쳤는지 밝혀 보죠.', badge:'판단 확인', motion:'insight' },
      reason: { judge:'pleased', advocate:'thinking', speaker:'판사', line:'추론의 핵심을 짚었군요. 증거를 살펴봅시다.', badge:'논점 확인', motion:'nod' },
      evidence: { judge:'confident', advocate:validProof?'pleased':'surprised', speaker:validProof?'판사':'상대 변론인', line:validProof?'조건과 결론을 연결하는 근거가 확인되었습니다.':'그 증거는… 인정합니다. 제 주장을 다시 검토하겠습니다.', badge:'증거 채택!', motion:'insight' },
      counter: { judge:'confident', advocate:'concerned', speaker:'판사', line:'반론도 근거를 따라야 합니다. 판단을 기록하겠습니다.', badge:'반론 심리 완료', motion:'nod' },
      repair: { judge:'pleased', advocate:'pleased', speaker:'상대 변론인', line:validProof?'타당한 풀이를 끝까지 확인해 주셨군요.':'이제 어떤 부분을 고쳐야 하는지 알겠습니다.', badge:'논리 정리 완료', motion:'nod' },
      transfer: { judge:'pleased', advocate:'surprised', speaker:'판사', line:'새로운 조건에서도 해냈군요! 판결을 내리겠습니다.', badge:'적용 성공!', motion:'celebrate' }
    };
    return reactions[stage] || reactions.reason;
  }
  const idle = {
    error: {judge:'thinking', advocate:'confident', speaker:'상대 변론인', line:'제 풀이를 제출합니다. 모든 추론이 타당한지 확인해 주세요.', badge:'심리 개시', motion:'idle'},
    reason: {judge:'thinking', advocate:'thinking', speaker:'판사', line:'어느 조건에서 그 판단이 나왔는지 설명해 주세요.', badge:'이유 심리', motion:'idle'},
    evidence: {judge:'thinking', advocate:'confident', speaker:'판사', line:'주장을 뒷받침할 증거를 제출해 주세요.', badge:'증거 조사', motion:'idle'},
    counter: {judge:'concerned', advocate:'confident', speaker:'상대 변론인', line:'이의 있습니다! 이 주장도 함께 검토해 주십시오.', badge:'이의 있습니다!', motion:'objection'},
    repair: {judge:'thinking', advocate:'thinking', speaker:'판사', line:'조건과 근거를 살려, 최종 풀이를 정리해 봅시다.', badge:'최종 변론', motion:'idle'},
    transfer: {judge:'confident', advocate:'thinking', speaker:'판사', line:'새로운 사건입니다. 같은 판단 기준을 적용할 수 있겠어요?', badge:'추가 심리', motion:'idle'}
  };
  return idle[stage] || idle.error;
}

const expressionNames = {idle:'차분한 표정',thinking:'생각하는 표정',pleased:'기뻐하는 표정',surprised:'놀란 표정',concerned:'신중한 표정',confident:'자신 있는 표정'};
export function portrait(character, expression, extraClass = '') {
  const name = character === 'judge' ? '판사' : '상대 변론인';
  return `<div class="court-character ${character} ${extraClass}" data-expression="${expression}"><img src="./${character}-${expression}.webp" alt="${name}: ${expressionNames[expression]}" width="256" height="256" draggable="false"><span class="character-name">${name}</span></div>`;
}
export function characterScene(stage, outcome, validProof) {
  const r = reactionFor(stage, outcome, validProof);
  return `<div class="court-scene expressive-scene reaction-${r.motion}" data-outcome="${outcome}" aria-label="캐릭터가 반응하는 법정">${portrait('judge',r.judge)}${portrait('advocate',r.advocate)}<div class="court-dialogue" aria-live="polite" aria-atomic="true"><span class="dialogue-speaker">${r.speaker}</span><p>${escape(r.line)}</p></div><span class="reaction-badge">${r.badge}</span></div>`;
}
