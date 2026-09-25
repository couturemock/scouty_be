import { hasViableSupplier, liveSuppliers } from './supplier-signals';
import { HEAVY_FRAGILE_KEYWORD } from '../integrations/amazon/product-filters';
import { wordBoundary } from '../integrations/shared/brand-denylist';
import { Product } from './product.entity';

/**
 * "Impulse product" quality read — informational only, never a hard gate.
 *
 * Of the spec's 8 qualitative questions, only two have a real data-backed
 * signal today: margin (`hasMargin`, via `hasViableSupplier`) and supplier
 * count (`hasMultipleSuppliers`, via `liveSuppliers`). Both are already
 * covered by scoring/board-gating elsewhere — this module doesn't duplicate
 * their effect, just surfaces them alongside the rest for the UI.
 *
 * The other five (differentiated, demonstrable, wow factor, solves a
 * problem, heavy/fragile) have no real signal available from Keepa/supplier
 * data — no weight/dimensions field exists anywhere in this codebase, and
 * "looks demonstrable in a short video" isn't derivable from title text with
 * any real confidence. These are weak keyword heuristics, always reported at
 * `confidence: 'low'`, and must never exclude a product on their own — a
 * real product missing a keyword match is a false negative, not evidence of
 * a bad product.
 */

const DIFFERENTIATED_GENERIC = wordBoundary(
  'usb[- ]?c?\\s*cable|cable\\s+usb|phone\\s+case|funda\\s+(?:para\\s+)?(?:m[oó]vil|iphone|samsung)|screen\\s+protector|protector\\s+de\\s+pantalla|hdmi\\s+cable|charging\\s+cable|cable\\s+de\\s+carga|generic\\s+part|pieza\\s+gen[eé]rica',
);

const DEMONSTRABLE_WOW_HINT = wordBoundary(
  'automatic|autom[aá]tic[oa]|led|wireless|inal[aá]mbric[oa]|foldable|plegable|adjustable|ajustable|magnetic|magn[eé]tic[oa]|portable|port[aá]til|rotating|giratori[oa]|multi[- ]?function|multifunci[oó]n|self[- ]?clean|autolimpiante',
);

const SOLVES_PROBLEM_HINT = wordBoundary(
  'anti[- ]?|stop|fix|arregla|soluciona|relief|alivio|organizer|organizador|holder|soporte|stand|repelente|repellent',
);

export type ImpulseSignal = {
  /** 0-100, informational — small contribution to score, never a gate. */
  score: number;
  differentiated: boolean;
  demonstrable: boolean;
  wowFactor: boolean;
  solvesProblem: boolean;
  heavyOrFragile: boolean;
  hasMargin: boolean;
  hasMultipleSuppliers: boolean;
  confidence: 'low' | 'medium';
};

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

export function computeImpulseSignal(p: Product): ImpulseSignal {
  const title = p.title ?? '';

  const differentiated = !DIFFERENTIATED_GENERIC.test(title);
  const demonstrable = DEMONSTRABLE_WOW_HINT.test(title);
  const wowFactor = demonstrable; // same weak keyword family, no separate signal today
  const solvesProblem = SOLVES_PROBLEM_HINT.test(title);
  const heavyOrFragile = HEAVY_FRAGILE_KEYWORD.test(title);

  const hasMargin = hasViableSupplier(p);
  const hasMultipleSuppliers = liveSuppliers(p).length >= 2;

  let score = 0;
  if (differentiated) score += 15;
  if (demonstrable) score += 15;
  if (solvesProblem) score += 10;
  if (hasMargin) score += 30;
  if (hasMultipleSuppliers) score += 20;
  if (heavyOrFragile) score -= 25;

  return {
    score: Number(clamp(score).toFixed(2)),
    differentiated,
    demonstrable,
    wowFactor,
    solvesProblem,
    heavyOrFragile,
    hasMargin,
    hasMultipleSuppliers,
    // Real signals (margin/suppliers) exist, but keyword heuristics drive
    // most of the score — never claim more than low confidence overall.
    confidence: 'low',
  };
}
