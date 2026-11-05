// Exam-style mathematical evidence diagrams. All curves use exact math coordinates.
// Monochrome axes, sparse labels, and only the auxiliary lines needed by the proof.
const INK = '#181818';
const PAPER = '#ffffff';
const m = String.raw;
const e = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const n = value => Number(value.toFixed(3));

function plot(xMin,xMax,yMin,yMax,{left=88,right=430,top=30,bottom=204}={}) {
  return {left,right,top,bottom,xMin,xMax,yMin,yMax,
    X:x=>left+(x-xMin)/(xMax-xMin)*(right-left),
    Y:y=>bottom-(y-yMin)/(yMax-yMin)*(bottom-top)};
}
function line(x1,y1,x2,y2,{dashed=false,width=1}={}) {
  return `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${INK}" stroke-width="${width}"${dashed?' stroke-dasharray="4 4"':''}/>`;
}
// Labels stay real LaTeX, shared with the problem renderer, rather than pixel text.
function label(x,y,formula,anchor='start',width=120,size=17) {
  const left=anchor==='middle'?x-width/2:anchor==='end'?x-width:x;
  const align=anchor==='middle'?'center':anchor==='end'?'right':'left';
  return `<foreignObject x="${n(left)}" y="${n(y-20)}" width="${width}" height="42" style="overflow:visible"><div xmlns="http://www.w3.org/1999/xhtml" class="graph-math" style="color:${INK};font-family:'STIX Two Text','Times New Roman',serif;font-size:${size}px;line-height:1.45;text-align:${align};white-space:nowrap">${e(formula)}</div></foreignObject>`;
}
function tickFormula(value) {return `\\(${String(value).replace('-','-')}\\)`;}
function axes(p,xTicks=[],yTicks=[]) {
  const x0=p.X(0),y0=p.Y(0),right=p.right+10,top=p.top-9;
  let out=line(p.left-3,y0,right,y0)+line(x0,p.bottom+5,x0,top);
  out+=`<path d="M ${n(right-6)} ${n(y0-3)} L ${n(right)} ${n(y0)} L ${n(right-6)} ${n(y0+3)} M ${n(x0-3)} ${n(top+6)} L ${n(x0)} ${n(top)} L ${n(x0+3)} ${n(top+6)}" fill="none" stroke="${INK}" stroke-width="1"/>`;
  out+=label(right+9,y0+7,m`\(x\)`,'start',25,17)+label(x0+10,top+3,m`\(y\)`,'start',25,17)+label(x0-9,y0+22,m`\(O\)`,'end',30,16);
  for(const tick of xTicks){const [value,formula]=Array.isArray(tick)?tick:[tick,tickFormula(tick)];if(value===0)continue;const x=p.X(value);out+=line(x,y0-3,x,y0+3)+label(x,y0+24,formula,'middle',62,16);}
  for(const tick of yTicks){const [value,formula]=Array.isArray(tick)?tick:[tick,tickFormula(tick)];if(value===0)continue;const y=p.Y(value);out+=line(x0-3,y,x0+3,y)+label(x0-10,y+8,formula,'end',65,16);}
  return out;
}
function curve(p,fn,start,end,segments=180) {
  const points=[];
  for(let i=0;i<=segments;i++){const x=start+(end-start)*i/segments;points.push(`${i?'L':'M'} ${n(p.X(x))} ${n(p.Y(fn(x)))}`);}
  return `<path d="${points.join(' ')}" fill="none" stroke="${INK}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function point(p,x,y,open=false) {
  return `<circle cx="${n(p.X(x))}" cy="${n(p.Y(y))}" r="${open?4.4:3}" fill="${open?PAPER:INK}" stroke="${INK}" stroke-width="1.5"/>`;
}
function guide(p,x,y,{horizontal=true,vertical=true}={}) {
  return (vertical?line(p.X(x),p.Y(0),p.X(x),p.Y(y),{dashed:true}):'')+(horizontal?line(p.X(0),p.Y(y),p.X(x),p.Y(y),{dashed:true}):'');
}
function wrap(id,title,description,body,caption) {
  return `<figure class="evidence-graph exam-graph" style="margin:20px 0 2px;padding:20px 16px 14px;border:1px solid #c6c6c6;border-radius:0;background:${PAPER}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 240" width="100%" role="img" aria-labelledby="graph-title-${id} graph-desc-${id}" style="display:block;width:100%;height:auto;max-height:320px;background:${PAPER};color:${INK};overflow:visible"><title id="graph-title-${id}">${e(title)}</title><desc id="graph-desc-${id}">${e(description)}</desc>${body}</svg><figcaption style="margin:12px 4px 0;padding-top:12px;border-top:1px solid #dedede;color:#333;font-family:var(--exam-body,'Noto Serif CJK KR',serif);font-size:14px;line-height:1.85">${e(caption)}</figcaption></figure>`;
}

export function evidenceGraph(id) {
  if(id==='tutorial'){
    const p=plot(-.6,3,-1.5,1.2);
    const body=guide(p,1,-.5)+axes(p,[1,2],[-1,[-.5,m`\(-\frac12\)`]])+curve(p,x=>.5*x-1,-.5,2.9)+point(p,0,-1)+point(p,1,-.5)+label(295,42,m`\(y=\frac12x-1\)`,'start',170,18);
    return wrap(id,'양의 기울기와 음수인 함숫값','기울기 1/2인 직선. x=1에서 점선으로 확인한 함숫값은 −1/2이다.',body,m`그래프는 증가하지만 \(f(1)=-\frac12<0\)이다. 증가한다는 사실만으로 함숫값이 양수라고 판단할 수 없다.`);
  }
  if(id==='limit-value'){
    const p=plot(-.6,2.6,-.7,4.8);
    const body=guide(p,1,4)+guide(p,1,2,{vertical:false})+axes(p,[1],[2,4])+curve(p,x=>x+1,-.5,2.45)+point(p,1,2,true)+point(p,1,4)+label(348,51,m`\(y=f(x)\)`,'start',130,18);
    return wrap(id,'극한값과 함숫값','직선 y=x+1의 점 (1,2)는 빈 점, 점 (1,4)는 채운 점이다. 점선으로 두 높이와 x=1을 구분한다.',body,m`빈 점의 높이에서 \(\displaystyle\lim_{x\to1}f(x)=2\), 채운 점에서 \(f(1)=4\)를 확인한다. 두 값은 서로 다르다.`);
  }
  if(id==='continuity-differentiability'){
    const p=plot(-2.5,2.5,-.65,2.8,{left:100,right:420});
    const body=guide(p,-1,1)+guide(p,1,1)+axes(p,[-1,1],[1])+curve(p,x=>Math.abs(x),-2.15,2.15)+label(355,48,m`\(y=|x|\)`,'start',130,18);
    return wrap(id,'연속이지만 미분 불가능한 함수','절댓값 함수의 V자 곡선은 원점에서 연결된다. 양쪽 가지의 기울기는 각각 −1과 1이다.',body,m`원점에서 그래프가 이어지지만 좌미분계수는 \(-1\), 우미분계수는 \(1\)이다. 두 값이 달라 0에서 미분 불가능하다.`);
  }
  if(id==='stationary-extremum'){
    const p=plot(-1.6,1.6,-3.9,3.9,{left:112,right:408});
    const body=axes(p)+curve(p,x=>x*x*x,-1.5,1.5)+label(344,42,m`\(y=x^3\)`,'start',120,18)+label(330,151,m`\(y=0\)`,'start',85,16);
    return wrap(id,'수평 접선이 있지만 극값이 없는 함수','삼차함수 y=x³은 원점에서 수평인 x축에 접한다. 원점 왼쪽에서는 음수, 오른쪽에서는 양수이며 계속 증가한다.',body,m`원점에서 접선은 \(y=0\)이다. \(f'(0)=0\)이지만, 양옆에서 계속 증가하므로 0에서 극값을 갖지 않는다.`);
  }
  if(id==='increasing-sign'){
    const p=plot(-1.1,7,-4.7,1.1);
    const body=guide(p,2,-3)+guide(p,5,-1.5)+axes(p,[2,5],[-3,[-1.5,m`\(-\frac32\)`]])+curve(p,x=>.5*x-4,-.6,6.8)+point(p,2,-3)+point(p,5,-1.5)+label(292,36,m`\(y=\frac12x-4\)`,'start',185,18);
    return wrap(id,'증가함수의 반례','양의 기울기를 가진 직선이 (2,−3), (5,−3/2)를 지난다. 두 점 모두 x축 아래에 있다.',body,m`\(f(5)=-\frac32\)는 \(f(2)=-3\)보다 크지만 음수다. 조건에서 확실히 얻는 결론은 \(f(5)>-3\)이다.`);
  }
  if(id==='integral-area'){
    const p=plot(-1.6,1.6,-1.5,1.5,{left:104,right:416});
    const points=items=>items.map(([x,y])=>`${n(p.X(x))},${n(p.Y(y))}`).join(' ');
    const regions=`<polygon points="${points([[-1,0],[-1,-1],[0,0]])}" fill="#e6e6e6" stroke="none"/><polygon points="${points([[0,0],[1,1],[1,0]])}" fill="#e6e6e6" stroke="none"/>`;
    const body=regions+guide(p,-1,-1,{horizontal:false})+guide(p,1,1,{horizontal:false})+axes(p,[-1,1])+curve(p,x=>x,-1.35,1.35)+label(390,33,m`\(y=x\)`,'start',100,18)+label(p.X(-.68),p.Y(-.40)+6,m`\(\frac12\)`,'middle',60,17)+label(p.X(.68),p.Y(.33)+6,m`\(\frac12\)`,'middle',60,17);
    return wrap(id,'정적분과 도형의 넓이','x축 아래 왼쪽 삼각형과 x축 위 오른쪽 삼각형의 넓이는 각각 1/2이다. 두 영역은 같은 옅은 회색으로 표시된다.',body,m`정적분은 \(-\frac12+\frac12=0\)이지만 전체 넓이는 \(\frac12+\frac12=1\)이다. \(x\)축 아래의 넓이도 양수로 더한다.`);
  }
  return '';
}
