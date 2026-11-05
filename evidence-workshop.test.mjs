import test from 'node:test';
import assert from 'node:assert/strict';
import { WORKSHOP_TICKS, evaluateCandidate, ensureWorkshop, changeCoefficient, submitCandidate, submitResponse, challengeFor, workshopPaper, workshopMathCorpus, fractionTex } from './evidence-workshop.js';
import katex from './katex.mjs';

const fresh=ticks=>({workshop:{version:1,phase:'build',ticks},firstAnswers:{},mistakes:{},cleared:false});

test('exact counterexamples satisfy both all conditions and the negation of f(1)>0',()=>{
  const accepted=WORKSHOP_TICKS.filter(t=>evaluateCandidate(t).accepted);
  assert.deepEqual(accepted,[1,2,3,4]);
  for(const ticks of WORKSHOP_TICKS){
    const c=evaluateCandidate(ticks);
    assert.equal(c.condition,ticks>0);
    assert.equal(c.refutes,ticks<=4);
    assert.equal(c.a,ticks/4);
    assert.equal(c.value,ticks/4-1);
  }
  assert.equal(evaluateCandidate(0).reason,'condition','a=0 violates the strict derivative condition');
  assert.equal(evaluateCandidate(4).accepted,true,'f(1)=0 refutes f(1)>0');
  assert.equal(evaluateCandidate(4).branch,'zero');
  assert.equal(evaluateCandidate(5).reason,'not-refuted');
  for(const bad of [NaN,Infinity,-5,9,1.2,'2',null])assert.equal(evaluateCandidate(bad).validInput,false);
});

test('malformed persisted workshop data recovers to a playable construction phase',()=>{
  for(const value of [null,[],42,{version:0},{version:1,phase:'cross',submittedTicks:0},{version:1,phase:'accepted',submittedTicks:9}]){
    const run={workshop:value};const w=ensureWorkshop(run);
    assert.equal(w.phase,'build');assert.equal(w.submittedTicks,null);assert.equal(w.ticks,6);
    assert.equal(submitCandidate(run).reason,'not-refuted');
    assert.equal(changeCoefficient(run,2),true);assert.equal(submitCandidate(run).accepted,true);
  }
  const valid={workshop:{version:1,phase:'cross',ticks:8,submittedTicks:2,selectedResponse:'zero'}};
  const w=ensureWorkshop(valid);
  assert.equal(w.ticks,2,'submitted coefficient is authoritative in a live cross-examination');
  assert.equal(w.selectedResponse,null,'foreign branch response is not retained');
});

test('invalid submissions stay editable; submitted coefficients are locked until explicitly rebuilt',()=>{
  const run=fresh(0);
  assert.deepEqual(submitCandidate(run),{accepted:false,reason:'condition'});
  assert.equal(run.workshop.phase,'build');assert.equal(run.workshop.submittedTicks,null);
  assert.equal(changeCoefficient(run,2),true);
  assert.equal(submitCandidate(run).accepted,true);
  assert.equal(changeCoefficient(run,4),false);
  assert.equal(run.workshop.submittedTicks,2);
  assert.equal(submitCandidate(run).ignored,true);
  const reloaded=JSON.parse(JSON.stringify(run));
  assert.equal(ensureWorkshop(reloaded).submittedTicks,2);
  assert.equal(challengeFor(reloaded.workshop.submittedTicks).branch,'negative');
});

test('both counterexample branches require a valid response and allow reasoned retry',()=>{
  for(const ticks of [1,2,3,4]){
    const run=fresh(ticks);assert.equal(submitCandidate(run).accepted,true);
    const challenge=challengeFor(ticks);
    assert.equal(challenge.options.filter(o=>o.correct).length,1);
    for(const option of challenge.options.filter(o=>!o.correct)){
      assert.equal(submitResponse(run,option.id).accepted,false);
      assert.equal(run.workshop.phase,'cross');
      assert.equal(run.workshop.feedback,option.feedback);
    }
    assert.equal(submitResponse(run,'unknown').ignored,true);
    const right=challenge.options.find(o=>o.correct);
    assert.equal(submitResponse(run,right.id).accepted,true);
    assert.equal(run.workshop.phase,'accepted');
    const reloaded=JSON.parse(JSON.stringify(run));
    assert.equal(ensureWorkshop(reloaded).phase,'accepted');
    assert.match(workshopPaper(reloaded),/최종 변론으로/);
    assert.equal(submitResponse(reloaded,right.id).ignored,true);
  }
});

test('equations use reduced fractions and all live states contain valid LaTeX',()=>{
  assert.equal(fractionTex(2),'\\frac{1}{2}');
  assert.equal(fractionTex(-2),'-\\frac{1}{2}');
  assert.equal(fractionTex(4),'1');assert.equal(fractionTex(0),'0');
  let count=0;
  const walk=value=>{
    if(typeof value==='string'){
      assert.doesNotMatch(value,/\\\([^]*?&(gt|lt|amp|quot);[^]*?\\\)/,'cache corpus must decode HTML entities');
      for(const match of value.matchAll(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g)){
        katex.renderToString(match[1]??match[2],{throwOnError:true,strict:'error'});count++;
      }
    }else if(value&&typeof value==='object')Object.values(value).forEach(walk);
  };
  walk(workshopMathCorpus());assert.ok(count>200);
  const construction=workshopPaper(fresh(6));
  assert.ok(construction.includes('f&#39;(x)&gt;0'));
  assert.match(construction,/type="range"/);
  assert.match(construction,/aria-describedby="workshop-slider-help"/);
});
