import renderMathInElement from './auto-render.mjs';
import { EXAM_MATH } from './exam-math-cache.js?v=20261105-exam';

// Call after each screen update so choices, feedback and SVG labels stay typeset.
export function typesetMath(root) {
  renderMathInElement(root, {
    delimiters: [
      { left: '\\[', right: '\\]', display: true },
      { left: '\\(', right: '\\)', display: false },
    ],
    throwOnError: false,
    strict: 'error',
    trust: false,
    output: 'htmlAndMathml',
  });

  // TeX produces the visual formula with a coherent Times-compatible math font.
  // Keep KaTeX's semantic MathML, and keep its visual output as a safe fallback
  // for any newly authored expression until the vector cache is rebuilt.
  root.querySelectorAll('.katex:not([data-exam-math])').forEach(formula => {
    const annotation = formula.querySelector('annotation[encoding="application/x-tex"]');
    const visual = formula.querySelector('.katex-html');
    if (!annotation || !visual) return;
    const display = !!formula.closest('.katex-display');
    const entry = EXAM_MATH[`${display ? 'D' : 'I'}:${annotation.textContent}`];
    if (!entry) return;
    const image = document.createElement('img');
    image.className = 'exam-math-svg';
    image.alt = '';
    image.setAttribute('aria-hidden', 'true');
    image.draggable = false;
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(entry.svg)}`;
    image.style.width = `${entry.width}em`;
    image.style.height = `${entry.height}em`;
    image.style.verticalAlign = `${-entry.depth}em`;
    image.style.maxWidth = 'none';
    visual.replaceChildren(image);
    formula.dataset.examMath = 'times';
  });
}
