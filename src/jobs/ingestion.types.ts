import { KeepaIngestProgress } from '../integrations/amazon/keepa.provider';

export type IngestionJobData = {
  markets?: string[];
  productsPerCategory?: number;
  ciTopN?: number;
};

export type IngestionJobResult = {
  weekKey: string;
  count: number;
  creativeIntelligence?: { enriched: number; totalCredits: number };
  adWinners?: { ranked: number; credits: number };
};

export type IngestionJobProgress = KeepaIngestProgress;
