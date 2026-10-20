export type CreditBucket = 'discovery' | 'detail' | 'reserve';

/**
 * Lowered from 4000: the cache/dedupe layer (`PipiAdsCacheService`) and the
 * OpenAI pre-detail filter (`DropshipPrefilterProvider`) exist specifically
 * to make a much smaller weekly ceiling still land a good snapshot — see
 * `STATUS.md`/plan notes on the ~800-1000 credit/week target.
 */
export const DEFAULT_WEEKLY_CREDITS = 1000;
/**
 * Details identify the product, so they are what turns credits into snapshot
 * products — but the OpenAI pre-filter now trims the detail queue before it
 * ever reaches `detail`, so it needs a smaller share than before.
 */
export const BUCKET_SHARES: Record<CreditBucket, number> = {
  discovery: 0.6,
  detail: 0.3,
  reserve: 0.1,
};

export type CreditBudgetReport = {
  total: number;
  spent: number;
  remaining: number;
  buckets: Record<CreditBucket, { allocated: number; spent: number }>;
  exhausted: boolean;
};

/**
 * Hard cap on PipiAds credits for one snapshot run. Callers ask `take()`
 * before each request and `spend()` with what the API actually reported;
 * a bucket that runs dry borrows from `reserve`, never beyond the total.
 */
export class CreditBudget {
  private readonly allocated: Record<CreditBucket, number>;
  private readonly spentBy: Record<CreditBucket, number> = {
    discovery: 0,
    detail: 0,
    reserve: 0,
  };

  constructor(readonly total: number) {
    const t = Math.max(0, Math.floor(total));
    const discovery = Math.floor(t * BUCKET_SHARES.discovery);
    const detail = Math.floor(t * BUCKET_SHARES.detail);
    this.allocated = { discovery, detail, reserve: t - discovery - detail };
  }

  private bucketLeft(bucket: CreditBucket) {
    return Math.max(0, this.allocated[bucket] - this.spentBy[bucket]);
  }

  get spent() {
    return this.spentBy.discovery + this.spentBy.detail + this.spentBy.reserve;
  }

  get remaining() {
    return Math.max(0, this.total - this.spent);
  }

  /** Credits usable from `bucket` right now (own allocation + what's left in reserve). */
  available(bucket: CreditBucket) {
    const own = this.bucketLeft(bucket);
    const reserve = bucket === 'reserve' ? 0 : this.bucketLeft('reserve');
    return Math.min(own + reserve, this.remaining);
  }

  /** How many credits a request may consume; 0 means stop calling. */
  take(bucket: CreditBucket, wanted: number) {
    return Math.max(0, Math.min(Math.floor(wanted), this.available(bucket)));
  }

  spend(bucket: CreditBucket, credits: number) {
    let left = Math.max(0, credits);
    const own = Math.min(left, this.bucketLeft(bucket));
    this.spentBy[bucket] += own;
    left -= own;
    if (left > 0 && bucket !== 'reserve') {
      const fromReserve = Math.min(left, this.bucketLeft('reserve'));
      this.spentBy.reserve += fromReserve;
      left -= fromReserve;
    }
    // The API may report more than we asked for; still account for it.
    if (left > 0) this.spentBy[bucket] += left;
  }

  report(): CreditBudgetReport {
    return {
      total: this.total,
      spent: this.spent,
      remaining: this.remaining,
      buckets: {
        discovery: { allocated: this.allocated.discovery, spent: this.spentBy.discovery },
        detail: { allocated: this.allocated.detail, spent: this.spentBy.detail },
        reserve: { allocated: this.allocated.reserve, spent: this.spentBy.reserve },
      },
      exhausted: this.remaining <= 0,
    };
  }
}
