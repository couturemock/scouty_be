import { KeepaIngestProgress } from '../integrations/amazon/keepa.provider';

export type IngestionJobData = {
  markets?: string[];
  productsPerCategory?: number;
  ciTopN?: number;
};

export type IngestionJobResult = {
  weekKey: string;
  count: number;
};

export type IngestionJobProgress = KeepaIngestProgress;
