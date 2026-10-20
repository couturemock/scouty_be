import { KeepaIngestProgress } from '../integrations/amazon/keepa.provider';

export type IngestionJobData = {
  /** Products kept in the snapshot. */
  productsTarget?: number;
  /** PipiAds credits for the whole run. */
  creditBudget?: number;
};

export type IngestionJobResult = {
  weekKey: string;
  count: number;
  discovery?: {
    credits: number;
    saved: number;
    withSupplier: number;
    pipiadsRemaining: number | null;
  };
};

/** `callsDone` carries PipiAds credits spent so far; `categoriesDone/Total` the current step's progress. */
export type IngestionJobProgress = KeepaIngestProgress;
