import renderMathInElement from './auto-render.mjs';

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
}
