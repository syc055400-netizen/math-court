// Live evidence drawing. The same fixed axes are used for every candidate.
const ink = '#181818';
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const round = value => Number(value.toFixed(3));
const gcd = (a,b) => b ? gcd(b,a%b) : a;
function fraction(ticks) {
  if (!ticks) return '0';
  const divisor = gcd(Math.abs(ticks),4), numerator = Math.abs(ticks)/divisor, denominator = 4/divisor;
  return `${ticks<0?'-':''}${denominator===1?numerator:`\\frac{${numerator}}{${denominator}}`}`;
}
function plainFraction(ticks) {
  if (!ticks) return '0';
  const divisor = gcd(Math.abs(ticks),4), numerator = ticks/divisor, denominator = 4/divisor;
  return denominator===1?String(numerator):`${numerator}/${denominator}`;
}
function label(x,y,tex,width=90,align='left',size=17) {
  return `<foreignObject x="${round(x)}" y="${round(y)}" width="${width}" height="42" style="overflow:visible"><div xmlns="http://www.w3.org/1999/xhtml" class="graph-math" style="font-size:${size}px;line-height:1.4;text-align:${align};white-space:nowrap;color:${ink}">${esc(`\\(${tex}\\)`)}</div></foreignObject>`;
}
function line(x1,y1,x2,y2,dashed=false,width=1) {
  return `<line x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}" stroke="${ink}" stroke-width="${width}"${dashed?' stroke-dasharray="4 4"':''}/>`;
}

export function workshopGraph(rawTicks) {
  const ticks = Number.isInteger(rawTicks)&&rawTicks>=-4&&rawTicks<=8?rawTicks:6;
  const a = ticks/4, value = a-1;
  const bounds = {left:72,right:445,top:45,bottom:240,xMin:-.65,xMax:2.15,yMin:-2.7,yMax:2.7};
  const X=x=>bounds.left+(x-bounds.xMin)/(bounds.xMax-bounds.xMin)*(bounds.right-bounds.left);
  const Y=y=>bounds.bottom-(y-bounds.yMin)/(bounds.yMax-bounds.yMin)*(bounds.bottom-bounds.top);
  const x0=X(0), y0=Y(0), x1=X(1), pointY=Y(value);
  const curveFormula = ticks===0?'y=-1':`y=${ticks===4?'':ticks===-4?'-':fraction(ticks)}x-1`;
  const clipId=`workshop-clip-${ticks+4}`;
  const clip=`<defs><clipPath id="${clipId}"><rect x="${bounds.left}" y="${bounds.top}" width="${bounds.right-bounds.left}" height="${bounds.bottom-bounds.top}"/></clipPath></defs>`;
  const axes=line(bounds.left-5,y0,bounds.right+12,y0)+line(x0,bounds.bottom+7,x0,bounds.top-10)+`<path d="M ${bounds.right+6} ${round(y0-3)} L ${bounds.right+12} ${round(y0)} L ${bounds.right+6} ${round(y0+3)} M ${round(x0-3)} ${bounds.top-4} L ${round(x0)} ${bounds.top-10} L ${round(x0+3)} ${bounds.top-4}" fill="none" stroke="${ink}" stroke-width="1"/>`;
  const ticksDrawing=line(x1,y0-3,x1,y0+3)+line(x0-3,Y(-1),x0+3,Y(-1));
  // Keep the x=1 label on the opposite side of the axis from its marked point.
  // All candidates cross y=-1 at x=0, so the origin label sits safely above-left.
  const xOneLabelY=value<=0?y0-35:y0+8;
  const minusOneLabelY=a>0?Y(-1)-32:Y(-1)+8;
  const axisLabels=label(bounds.right+20,y0-12,'x',25)+label(x0+10,bounds.top-25,'y',25)+label(x0-39,y0-31,'O',28,'right',16)+label(x1-21,xOneLabelY,'1',42,'center',16)+label(x0-51,minusOneLabelY,'-1',40,'right',16);
  const guides=line(x1,y0,x1,pointY,true)+line(x0,pointY,x1,pointY,true);
  const curve=`<g clip-path="url(#${clipId})">${line(X(bounds.xMin),Y(a*bounds.xMin-1),X(bounds.xMax),Y(a*bounds.xMax-1),false,1.9)}</g>`;
  const dots=`<circle cx="${round(x0)}" cy="${round(Y(-1))}" r="3.3" fill="${ink}"/><circle cx="${round(x1)}" cy="${round(pointY)}" r="4" fill="${ink}"/>`;
  const title=`기울기가 ${plainFraction(ticks)}인 직선 그래프`;
  const desc=`직선은 (0, -1)을 지나며, x=1에서의 함숫값은 ${plainFraction(ticks-4)}이다. 검은 점과 점선으로 해당 값을 표시한다.`;
  return `<figure class="exam-graph workshop-graph" data-coefficient-ticks="${ticks}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 275" role="img" aria-labelledby="workshop-graph-title workshop-graph-desc" style="display:block;width:100%;height:auto;background:white;overflow:visible"><title id="workshop-graph-title">${esc(title)}</title><desc id="workshop-graph-desc">${esc(desc)}</desc>${clip}${guides}${axes}${ticksDrawing}${curve}${dots}${axisLabels}${label(285,4,curveFormula,190,'left',19)}</svg><figcaption>${esc(`\\(x=1\\)에서의 함숫값: \\(f(1)=${fraction(ticks-4)}\\)`)}<span class="workshop-graph-hint">그래프는 좌우로 밀어 볼 수 있어요.</span></figcaption></figure>`;
}

export function workshopGraphMathCorpus() {
  return Array.from({length:13},(_,index)=>workshopGraph(index-4));
}
