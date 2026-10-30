// Exact, dependency-free SVGs for the evidence reveal.
// The only exported API returns trusted, locally authored HTML.
const INK = '#355e45';
const GRID = '#d0c7b4';
const TEXT = '#4f594a';
const PAPER = '#fffcf5';

const escapeText = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const n = (value) => Number(value.toFixed(3));

function makePlot(xMin, xMax, yMin, yMax) {
  const left = 58;
  const right = 480;
  const top = 38;
  const bottom = 204;
  return {
    left, right, top, bottom, xMin, xMax, yMin, yMax,
    X: (x) => left + (x - xMin) / (xMax - xMin) * (right - left),
    Y: (y) => bottom - (y - yMin) / (yMax - yMin) * (bottom - top)
  };
}

function text(x, y, value, extra = '') {
  return `<text x="${n(x)}" y="${n(y)}" fill="${TEXT}" style="font-family:inherit;font-size:14px" ${extra}>${escapeText(value)}</text>`;
}

// HTML inside foreignObject lets the shared LaTeX renderer typeset labels,
// while the underlying SVG coordinates and curves stay exact and unchanged.
function mathText(x, y, value, anchor = 'start', width = 150, size = 14) {
  const left = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  const align = anchor === 'middle' ? 'center' : anchor === 'end' ? 'right' : 'left';
  return `<foreignObject x="${n(left)}" y="${n(y - 19)}" width="${width}" height="42" style="overflow:visible"><div xmlns="http://www.w3.org/1999/xhtml" class="graph-math" style="color:${TEXT};font-size:${size}px;line-height:1.45;text-align:${align};white-space:nowrap">${escapeText(value)}</div></foreignObject>`;
}

function line(x1, y1, x2, y2, extra = '') {
  return `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${GRID}" stroke-width="1.2" ${extra}/>`;
}

function axes(p, xTicks, yTicks) {
  const xZero = p.X(0);
  const yZero = p.Y(0);
  let content = '';
  for (const value of yTicks) {
    if (value === 0) continue;
    const y = p.Y(value);
    content += line(p.left, y, p.right, y, 'opacity="0.35"');
    content += line(xZero - 4, y, xZero + 4, y);
    content += text(xZero - 9, y + 4, String(value).replace('-', '−'), 'text-anchor="end"');
  }
  for (const value of xTicks) {
    const x = p.X(value);
    content += line(x, yZero - 4, x, yZero + 4);
    if (value !== 0) content += text(x, yZero + 19, String(value).replace('-', '−'), 'text-anchor="middle"');
  }
  content += line(p.left, yZero, p.right + 9, yZero);
  content += line(xZero, p.bottom + 4, xZero, p.top - 7);
  content += `<path d="M ${n(p.right + 4)} ${n(yZero - 4)} L ${n(p.right + 9)} ${n(yZero)} L ${n(p.right + 4)} ${n(yZero + 4)} M ${n(xZero - 4)} ${n(p.top - 2)} L ${n(xZero)} ${n(p.top - 7)} L ${n(xZero + 4)} ${n(p.top - 2)}" fill="none" stroke="${GRID}" stroke-width="1.2"/>`;
  content += text(p.right + 15, yZero + 5, 'x', 'font-style="italic"');
  content += text(xZero + 9, p.top - 5, 'y', 'font-style="italic"');
  content += text(xZero - 8, yZero + 18, '0', 'text-anchor="end"');
  return content;
}

// Sampling happens in mathematical coordinates before mapping to SVG pixels.
function curve(p, fn, start, end, segments = 160) {
  const points = [];
  for (let i = 0; i <= segments; i += 1) {
    const x = start + (end - start) * i / segments;
    const y = fn(x);
    points.push(`${i === 0 ? 'M' : 'L'} ${n(p.X(x))} ${n(p.Y(y))}`);
  }
  return `<path d="${points.join(' ')}" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function point(p, x, y, open = false) {
  return `<circle cx="${n(p.X(x))}" cy="${n(p.Y(y))}" r="${open ? 5.5 : 4.5}" fill="${open ? PAPER : INK}" stroke="${INK}" stroke-width="2"/>`;
}

function guide(p, x, y) {
  return line(p.X(x), p.Y(0), p.X(x), p.Y(y), 'stroke-dasharray="4 4"') +
    line(p.X(0), p.Y(y), p.X(x), p.Y(y), 'stroke-dasharray="4 4"');
}

function wrap(id, label, description, body, caption, mathLabel = label) {
  return `<figure style="margin:18px 0 2px;padding:12px 12px 10px;border:1px solid ${GRID};border-radius:14px;background:${PAPER}">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 240" width="100%" role="img" aria-labelledby="graph-title-${id} graph-desc-${id}" style="display:block;width:100%;height:auto;max-height:320px;color:${TEXT};overflow:visible">
      <title id="graph-title-${id}">${escapeText(label)}</title>
      <desc id="graph-desc-${id}">${escapeText(description)}</desc>
      ${mathText(16, 20, mathLabel, 'start', 488, 16)}
      ${body}
    </svg>
    <figcaption style="margin:0 4px;color:${TEXT};font-size:13px;line-height:1.65">${escapeText(caption)}</figcaption>
  </figure>`;
}

export function evidenceGraph(caseId) {
  if (caseId === 'tutorial') {
    const p = makePlot(-0.4, 3, -1.4, 1);
    const body = axes(p, [0, 1, 2], [-1, 1]) +
      guide(p, 1, -0.5) + curve(p, (x) => 0.5 * x - 1, -0.35, 2.9) +
      point(p, 0, -1) + point(p, 1, -0.5) +
      mathText(p.X(0) + 11, p.Y(-1) + 19, String.raw`\((0,-1)\)`) +
      mathText(p.X(1) + 12, p.Y(-0.5) + 21, String.raw`\((1,-\frac{1}{2})\)`);
    return wrap(caseId, 'y = ½x − 1',
      '기울기 1/2인 직선이다. 0에서의 값은 −1이며, 1에서의 값 −1/2도 음수이다.',
      body, String.raw`그래프는 증가하지만 \(f(1)=-\frac{1}{2}\)은 여전히 음수다. 증가한다는 사실과 함숫값이 양수라는 사실은 다르다.`, String.raw`\(y=\frac{1}{2}x-1\)`);
  }

  if (caseId === 'limit-value') {
    const p = makePlot(-0.5, 2.5, -0.5, 4.8);
    const body = axes(p, [0, 1, 2], [2, 4]) +
      line(p.X(1), p.Y(0), p.X(1), p.Y(4), 'stroke-dasharray="4 4"') +
      curve(p, (x) => x + 1, -0.45, 2.4) +
      point(p, 1, 2, true) + point(p, 1, 4) +
      mathText(p.X(1) + 12, p.Y(2) + 22, String.raw`빈 점 \((1,2)\)`) +
      mathText(p.X(1) + 12, p.Y(4) - 9, String.raw`함숫값 \((1,4)\)`);
    return wrap(caseId, 'x ≠ 1에서 y = x + 1,  f(1) = 4',
      '직선 y=x+1의 점 (1,2)는 뚫려 있고 점 (1,4)가 채워져 있다. 1에서의 극한은 2지만 함숫값은 4이다.',
      body, String.raw`\(x\)가 1의 양쪽에서 가까워지면 함숫값은 2에 가까워진다. 따로 정한 \(f(1)=4\)는 주변에서의 극한값을 바꾸지 않는다.`, String.raw`\(x\ne1\)에서 \(y=x+1,\quad f(1)=4\)`);
  }

  if (caseId === 'continuity-differentiability') {
    const p = makePlot(-2.4, 2.4, -0.6, 2.6);
    const body = axes(p, [-2, -1, 0, 1, 2], [1, 2]) +
      curve(p, (x) => Math.abs(x), -2.2, 2.2) +
      point(p, 0, 0) +
      mathText(p.X(-1.55), p.Y(2.18), String.raw`왼쪽 기울기 \(-1\)`, 'middle') +
      mathText(p.X(1.55), p.Y(2.18), String.raw`오른쪽 기울기 \(1\)`, 'middle');
    return wrap(caseId, 'y = |x|',
      'V자 그래프가 원점에서 이어져 있다. 원점 왼쪽 기울기는 −1이고 오른쪽 기울기는 1이다.',
      body, String.raw`0에서 그래프는 이어지지만 좌미분계수 \(-1\)과 우미분계수 \(1\)은 다르다. 연속이어도 미분 불가능할 수 있다.`, String.raw`\(y=\lvert x\rvert\)`);
  }

  if (caseId === 'stationary-extremum') {
    const p = makePlot(-1.55, 1.55, -3.9, 3.9);
    const body = axes(p, [-1, 0, 1], [-3, 3]) +
      `<line x1="${n(p.X(-1.2))}" y1="${n(p.Y(0))}" x2="${n(p.X(1.2))}" y2="${n(p.Y(0))}" stroke="${INK}" stroke-width="2" stroke-dasharray="6 5" opacity="0.65"/>` +
      curve(p, (x) => x * x * x, -1.5, 1.5, 180) +
      point(p, 0, 0) + point(p, -0.8, -0.512) + point(p, 0.8, 0.512) +
      mathText(p.X(-0.85), p.Y(-1.8), String.raw`\(f(x)<0\)`, 'middle') +
      mathText(p.X(0.85), p.Y(1.75), String.raw`\(f(x)>0\)`, 'middle') +
      text(p.X(0), p.Y(0) + 49, '0에서 수평 접선', 'text-anchor="middle"');
    return wrap(caseId, 'y = x³',
      '삼차함수 x³이 원점을 통과하며 계속 증가한다. 0에서의 접선은 수평이지만 왼쪽 함숫값은 0보다 작고 오른쪽은 0보다 크다.',
      body, String.raw`\(f'(0)=0\)이지만 0의 왼쪽에는 더 작은 값, 오른쪽에는 더 큰 값이 있다. 수평 접선만으로 극값을 판단할 수 없다.`, String.raw`\(y=x^3\)`);
  }

  if (caseId === 'increasing-sign') {
    const p = makePlot(-0.25, 7, -4.65, 0.7);
    const body = axes(p, [0, 2, 5], [-4, -3, -1]) +
      guide(p, 2, -3) + guide(p, 5, -1.5) +
      curve(p, (x) => 0.5 * x - 4, 0, 6.8) +
      point(p, 2, -3) + point(p, 5, -1.5) +
      mathText(p.X(2) + 10, p.Y(-3) + 23, String.raw`\((2,-3)\)`) +
      mathText(p.X(5) + 11, p.Y(-1.5) + 23, String.raw`\((5,-\frac{3}{2})\)`);
    return wrap(caseId, 'y = ½x − 4',
      '양의 기울기를 가진 직선이 (2,−3)과 (5,−3/2)를 지난다. 5에서의 함숫값도 x축 아래에 있다.',
      body, String.raw`\(f(5)\)는 \(f(2)=-3\)보다 크지만 여전히 음수일 수 있다. 조건에서 확실히 얻는 결론은 \(f(5)>-3\)이다.`, String.raw`\(y=\frac{1}{2}x-4\)`);
  }

  if (caseId === 'integral-area') {
    const p = makePlot(-1.5, 1.5, -1.4, 1.4);
    const points = (items) => items.map(([x, y]) => `${n(p.X(x))},${n(p.Y(y))}`).join(' ');
    const negativeTriangle = `<polygon points="${points([[-1, 0], [-1, -1], [0, 0]])}" fill="${GRID}" fill-opacity="0.7" stroke="${GRID}" stroke-width="1"/>`;
    const positiveTriangle = `<polygon points="${points([[0, 0], [1, 1], [1, 0]])}" fill="${INK}" fill-opacity="0.18" stroke="${INK}" stroke-opacity="0.35" stroke-width="1"/>`;
    const body = negativeTriangle + positiveTriangle + axes(p, [-1, 0, 1], [-1, 1]) +
      curve(p, (x) => x, -1.25, 1.25) +
      point(p, -1, -1) + point(p, 1, 1) +
      mathText(p.X(-2 / 3), p.Y(-1 / 3) + 5, String.raw`넓이 \(\frac{1}{2}\)`, 'middle') +
      mathText(p.X(2 / 3), p.Y(1 / 3) + 5, String.raw`넓이 \(\frac{1}{2}\)`, 'middle');
    return wrap(caseId, 'y = x,  −1 ≤ x ≤ 1',
      'x축 아래 왼쪽 삼각형과 x축 위 오른쪽 삼각형의 넓이는 각각 1/2이다. 두 삼각형은 서로 다른 색으로 표시되어 있다.',
      body, String.raw`정적분은 \(-\frac{1}{2}+\frac{1}{2}=0\)이지만, 전체 넓이는 \(\frac{1}{2}+\frac{1}{2}=1\)이다. \(x\)축 아래 부분도 양의 넓이로 더한다.`, String.raw`\(y=x,\quad -1\le x\le1\)`);
  }

  return '';
}
