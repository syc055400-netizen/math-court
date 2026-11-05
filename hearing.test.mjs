import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureHearing, hearingPaper, hearingScene, bindHearing } from './hearing.js';

const example = () => ({
  id:'tutorial',title:'진술 검토',conditions:['주어진 조건'],claim:'검토할 주장',
  steps:['FIRST_TESTIMONY','SECOND_TESTIMONY','THIRD_TESTIMONY'],errorIndex:1,
});

// Model only the buttons emitted by hearingPaper. This verifies that rendering
// and binding agree without requiring a browser or reproducing grading logic.
function hearingHarness(c=example(),run={cleared:false,selection:null}) {
  const h={c,run,feedback:null,submissions:[],updates:0,proceeds:0,nodes:[],html:''};
  h.render=()=>{
    h.html=hearingPaper(c,run,h.feedback);
    h.nodes=[...h.html.matchAll(/<button\b([^>]*)>/g)].flatMap(([,attributes])=>{
      const action=attributes.match(/data-hearing-action="([^"]+)"/);
      const line=attributes.match(/data-hearing-line="([^"]+)"/);
      if(!action&&!line)return [];
      return [{
        dataset:action?{hearingAction:action[1]}:{hearingLine:line[1]},
        disabled:/\bdisabled\b/.test(attributes),
        addEventListener(type,handler){assert.equal(type,'click');this.handler=handler;},
      }];
    });
    const root={querySelectorAll(selector){
      return h.nodes.filter(node=>selector==='[data-hearing-action]'?'hearingAction' in node.dataset:'hearingLine' in node.dataset);
    }};
    bindHearing(root,c,run,{
      onUpdate(){h.updates++;h.feedback=null;h.render();},
      onSubmit(value){h.submissions.push(value);},
      onProceed(){h.proceeds++;},
    });
  };
  h.click=action=>{
    const button=h.nodes.find(node=>node.dataset.hearingAction===action);
    assert.ok(button,`Rendered action '${action}' is available`);
    assert.equal(button.disabled,false,`Action '${action}' is enabled`);
    button.handler();
  };
  h.revisit=line=>{
    const button=h.nodes.find(node=>node.dataset.hearingLine===String(line));
    assert.ok(button,`Testimony ${line} has been disclosed`);
    assert.equal(button.disabled,false);
    button.handler();
  };
  h.render();
  return h;
}

test('opening withholds all proof lines; testimony discloses only heard lines',()=>{
  const h=hearingHarness();
  assert.deepEqual(h.run.hearing,{phase:'opening',cursor:0,heardThrough:-1});
  for(const line of h.c.steps)assert.ok(!h.html.includes(line));
  h.click('listen');
  assert.ok(h.html.includes(h.c.steps[0]));
  assert.ok(!h.html.includes(h.c.steps[1]));
  assert.ok(!h.html.includes(h.c.steps[2]));
  h.click('continue');h.click('previous');
  assert.equal(h.run.hearing.cursor,0);
  assert.ok(h.html.includes(h.c.steps[1]),'A previously heard line remains in the transcript');
  assert.ok(!h.html.includes(h.c.steps[2]),'An unheard future line remains hidden');
  assert.equal(h.nodes.some(node=>node.dataset.hearingLine==='2'),false);
});

test('objection submits the currently displayed line, including a revisited line',()=>{
  const h=hearingHarness();
  h.click('listen');h.click('object');
  h.click('continue');h.click('object');
  h.click('continue');h.revisit(0);h.click('object');
  assert.deepEqual(h.submissions,[0,1,0]);
});

test('acceptance is offered only after the final statement has been finished',()=>{
  const h=hearingHarness();
  assert.equal(h.nodes.some(n=>n.dataset.hearingAction==='accept'),false);
  h.click('listen');h.click('continue');h.click('continue');
  assert.equal(h.run.hearing.phase,'testimony');
  assert.equal(h.nodes.some(n=>n.dataset.hearingAction==='accept'),false);
  h.click('continue');
  assert.equal(h.run.hearing.phase,'review');
  h.click('accept');
  assert.deepEqual(h.submissions,['none']);
});

test('listening past the first incorrect line and revisiting never requests a score',()=>{
  const h=hearingHarness();
  h.click('listen');h.click('continue');h.click('continue');h.click('continue');
  h.click('review');h.revisit(h.c.errorIndex);
  assert.equal(h.run.hearing.cursor,h.c.errorIndex);
  assert.deepEqual(h.submissions,[]);
  assert.ok(!('firstAnswers' in h.run),'The hearing module leaves grading to its owner');
  h.click('object');
  assert.deepEqual(h.submissions,[h.c.errorIndex]);
});

test('an unsuccessful objection preserves listening and a later objection',()=>{
  const h=hearingHarness();
  h.click('listen');h.click('object');
  h.feedback={success:false,text:'이 줄은 조건에 맞습니다.'};h.render();
  assert.match(h.html,/다시 검토해 보세요/);
  assert.match(hearingScene(h.c,h.run,h.feedback),/court-character judge[^>]+data-expression="concerned"/);
  h.click('continue');
  assert.equal(h.feedback,null);
  assert.equal(h.run.hearing.cursor,1);
  h.click('object');
  assert.deepEqual(h.submissions,[0,1]);
});

test('a restored successful objection displays its line and permits only proceeding',()=>{
  const h=hearingHarness(example(),{cleared:true,selection:1});
  assert.equal(h.run.hearing.phase,'testimony');
  assert.equal(h.run.hearing.cursor,1);
  assert.match(h.html,/SECOND_TESTIMONY/);
  assert.equal(h.nodes.some(n=>n.dataset.hearingAction==='object'),false);
  assert.equal(h.nodes.some(n=>n.dataset.hearingAction==='continue'),false);
  assert.ok(h.nodes.filter(n=>'hearingLine' in n.dataset).every(n=>n.disabled));
  h.click('proceed');assert.equal(h.proceeds,1);assert.deepEqual(h.submissions,[]);
});

test('a restored no-objection judgment retains the full reviewed transcript',()=>{
  const c={...example(),errorIndex:null};
  const h=hearingHarness(c,{cleared:true,selection:'none'});
  assert.equal(h.run.hearing.phase,'review');
  assert.equal(h.run.hearing.heardThrough,2);
  for(const line of c.steps)assert.ok(h.html.includes(line));
  assert.equal(h.nodes.some(n=>n.dataset.hearingAction==='accept'),false);
  h.click('proceed');assert.equal(h.proceeds,1);
});

test('malformed saved cursors are bounded to the available proof',()=>{
  const c=example(),run={hearing:{phase:'testimony',cursor:999,heardThrough:Infinity}};
  const h=ensureHearing(c,run);
  assert.equal(h.cursor,2);assert.equal(h.heardThrough,2);
  assert.doesNotMatch(hearingPaper(c,run,null),/undefined|NaN/);
});

test('authored and feedback text is escaped while LaTeX delimiters survive',()=>{
  const c={...example(),title:'<script>alert(1)</script>',conditions:['<img src=x onerror=alert(1)>',String.raw`\(f(x)>0\)`]};
  const h=hearingHarness(c);
  assert.ok(h.html.includes('&lt;script&gt;'));
  assert.ok(h.html.includes('&lt;img'));
  assert.ok(!h.html.includes('<script>'));
  assert.ok(!h.html.includes('<img src=x'));
  assert.ok(h.html.includes(String.raw`\(f(x)&gt;0\)`));
  h.click('listen');h.feedback={success:false,text:'<svg onload=alert(1)>'};h.render();
  assert.ok(h.html.includes('&lt;svg'));
  assert.ok(!h.html.includes('<svg onload'));
});
