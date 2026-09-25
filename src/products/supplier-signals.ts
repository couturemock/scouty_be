import { SupplierOffer } from '../integrations/types';
import { Product } from './product.entity';

/**
 * Shared supplier-availability primitives. Factored out of drop-sniper.score.ts
 * so impulse-filter.ts (and callers like products.service.ts/rankings.service.ts)
 * can depend on them without a circular import back into the score module.
 */

export function liveSuppliers(p: Product): SupplierOffer[] {
  const list = (p.meta?.suppliers as SupplierOffer[] | undefined) ?? [];
  return list.filter((s) => s.kind === 'live' && s.unitPriceEur != null);
}

/** Min margin % and at least one live offer — used to gate margin/profit boards. */
export function hasViableSupplier(p: Product, minMarginPct = 8): boolean {
  const live = liveSuppliers(p);
  if (!live.length) return false;
  const salePrice = Number(p.currentPrice ?? 0);
  if (!(salePrice > 0)) return true;
  const margin = Number(p.estimatedMarginPct ?? 0);
  return Number.isFinite(margin) && margin >= minMarginPct;
}

/**
 * Sourceable at all — any live supplier offer, no margin floor. Every board
 * (general/trending/winners, not just margin/profit) requires this: every
 * product shown must be findable on AliExpress/Alibaba.
 */
export function hasAnySupplier(p: Product): boolean {
  return liveSuppliers(p).length > 0;
}
