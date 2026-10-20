import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogService } from '../catalog/catalog.service';
import { planById } from '../common/plans';
import { ProductsService } from '../products/products.service';
import { User } from '../users/user.entity';
import { RankingEntry, RankingScope } from './ranking-entry.entity';

const BOARD_SCOPES: RankingScope[] = [
  'general',
  'rising',
  'trending',
  'winners',
  'ad_winners',
  'margin',
  'profit',
];

@Injectable()
export class RankingsService {
  constructor(
    @InjectRepository(RankingEntry)
    private readonly rankings: Repository<RankingEntry>,
    private readonly products: ProductsService,
    private readonly catalog: CatalogService,
  ) {}

  async getBoard(scope: RankingScope = 'general', scopeKey = '*') {
    const weekKey = await this.catalog.assertPublished();
    const key = BOARD_SCOPES.includes(scope) ? '*' : scopeKey;

    const entries = (
      await this.rankings.find({
        where: { weekKey, scope, scopeKey: key },
        relations: { product: true },
        order: { position: 'ASC' },
        take: 10,
      })
    ).filter((e) => e.product);

    if (!entries.length && scope !== 'category' && scope !== 'ad_winners') {
      const fallback = await this.fallbackBoard(scope);
      if (fallback) return { weekKey, scope, scopeKey: key, items: fallback };
    }

    return {
      weekKey,
      scope,
      scopeKey: key,
      items: entries.map((e, i) => ({
        position: i + 1,
        score: e.score != null ? Number(e.score) : null,
        signalSources: e.signalSources,
        product: this.products.serializeProduct(e.product),
      })),
    };
  }

  /** Empty board: rank the published catalogue directly (same supplier gate as rebuildRankings). */
  private async fallbackBoard(scope: RankingScope) {
    const rows = await this.products.listBestsellers(40, 'published', {
      requireSupplier: true,
    });
    let sorted = rows;
    let score = (row: (typeof rows)[number]): number | null => row.score;
    if (scope === 'rising' || scope === 'trending') {
      sorted = rows
        .filter((row) => (row.product.growthPct ?? 0) > 0)
        .sort((a, b) => (b.product.growthPct ?? 0) - (a.product.growthPct ?? 0));
      score = (row) => row.product.growthPct;
    } else if (scope === 'margin') {
      sorted = [...rows].sort(
        (a, b) => (b.product.estimatedMarginPct ?? 0) - (a.product.estimatedMarginPct ?? 0),
      );
      score = (row) => row.product.estimatedMarginPct;
    } else if (scope === 'profit') {
      sorted = [...rows].sort(
        (a, b) => (b.product.estimatedProfit ?? 0) - (a.product.estimatedProfit ?? 0),
      );
      score = (row) => row.product.estimatedProfit;
    } else if (scope !== 'winners' && scope !== 'general') {
      return null;
    }
    return sorted.slice(0, 10).map((row, index) => ({
      position: index + 1,
      score: score(row),
      signalSources: row.product.sources ?? ['ads'],
      product: row.product,
    }));
  }

  async listAvailable(user: User) {
    const plan = planById(user.plan);
    const weekKey = await this.catalog.assertPublished();
    const allowlist = this.products.ingestCategories();
    const fromDb = plan.top10ByCategory
      ? await this.rankings
          .createQueryBuilder('r')
          .select('DISTINCT r.scopeKey', 'scopeKey')
          .where('r.weekKey = :weekKey AND r.scope = :scope', {
            weekKey,
            scope: 'category',
          })
          .getRawMany<{ scopeKey: string }>()
      : [];

    const fromDbKeys = fromDb.map((c) => c.scopeKey).filter((k) => k && k !== '*');
    // Only categories that actually have a board this week, in canonical order.
    const categories = [
      ...new Set([
        ...allowlist.filter((c) => fromDbKeys.includes(c)),
        ...fromDbKeys,
      ]),
    ];
    // Legacy board: only weeks generated before the ads-first snapshot have it.
    const legacyAdWinners = (await this.products.weekKeysWithAdWinners([weekKey])).has(weekKey);

    return {
      weekKey,
      general: true,
      rising: true,
      trending: true,
      winners: true,
      ad_winners: legacyAdWinners,
      margin: true,
      profit: true,
      categories,
      plan: plan.id,
    };
  }
}
