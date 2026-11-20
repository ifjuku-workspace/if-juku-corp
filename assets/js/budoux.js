// 日本語の改行位置を BudouX で整える（文節の途中で折り返さない）
import { loadDefaultJapaneseParser } from 'https://cdn.jsdelivr.net/npm/budoux@0.10.4/+esm';
const parser = loadDefaultJapaneseParser();
const sel = 'main h2, main h3, main p:not(.bubble), main li, main figcaption, main td, main th, .stat-label, .btn, .footer-sub, .bubble, .m-deck .m-h, .m-deck p, .m-deck b, .m-deck span, .m-deck dd, .m-deck li';
document.querySelectorAll(sel).forEach((el) => {
  if (el.closest('.hero-title, .hero-title2, pre, .kw-band, .ui-jobs .t, .rank-badge, .slots')) return;
  try { parser.applyToElement(el); } catch (e) {}
});
document.documentElement.classList.add('bx-ready');
