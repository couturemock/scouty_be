import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogService } from '../catalog/catalog.service';
import { amazonMarket } from '../common/amazon-markets';
import { planById } from '../common/plans';
import { ProductsService } from '../products/products.service';
import { User } from '../users/user.entity';
import { RankingEntry, RankingScope } from './ranking-entry.entity';

@Injectable()
export class RankingsService {
  constructor(
    @InjectRepository(RankingEntry)
    private readonly rankings: Repository<RankingEntry>,
    private readonly products: ProductsService,
    private readonly catalog: CatalogService,
  ) {}

  async getBoard(
    user: User,
    scope: RankingScope = 'general',
    scopeKey = '*',
  ) {
    const plan = planById(user?.plan ?? 'basic');
    const target = (user?.targetMarket || 'ES').toUpperCase();
    const weekKey = await this.catalog.assertPublished();

    if (scope === 'category' && !plan.top10ByCategory) {
      // V1: categorías visibles; Pro se comunica en UI.
    }

    const boardScopes: RankingScope[] = [
      'rising',
      'trending',
      'winners',
      'ad_winners',
      'margin',
      'profit',
    ];
    const isBoard = boardScopes.includes(scope);

    const effectiveScope: RankingScope =
      scope === 'general' ? 'country' : scope;
    const effectiveKey =
      scope === 'general'
        ? target
        : scope === 'country' && (scopeKey === '*' || !scopeKey)
          ? target
          : isBoard
            ? '*'
            : scopeKey;

    let entries = await this.rankings.find({
      where: { weekKey, scope: effectiveScope, scopeKey: effectiveKey },
      relations: { product: true },
      order: { position: 'ASC' },
      take: 40,
    });

    if (!entries.length && scope === 'general') {
      entries = await this.rankings.find({
        where: { weekKey, scope: 'general', scopeKey: '*' },
        relations: { product: true },
        order: { position: 'ASC' },
        take: 40,
      });
    }

    if (!entries.length && isBoard) {
      entries = await this.rankings.find({
        where: { weekKey, scope, scopeKey: '*' },
        relations: { product: true },
        order: { position: 'ASC' },
        take: 40,
      });
    }

    // Filtrar por mercado Amazon (ES / US / …)
    entries = entries
      .filter((e) => e.product && e.product.country === target)
      .slice(0, 10)
      .map((e, i) => ({ ...e, position: i + 1 }));

    // Rising / trending: if empty board, use growthPct from catalog
    if ((scope === 'rising' || scope === 'trending') && !entries.length) {
      const bestsellers = await this.products.listBestsellers(target, 40);
      const sorted = [...bestsellers]
        .filter((row) => (row.product.growthPct ?? 0) > 0)
        .sort(
          (a, b) => (b.product.growthPct ?? 0) - (a.product.growthPct ?? 0),
        );
      return {
        weekKey,
        scope,
        scopeKey: target,
        targetMarket: amazonMarket(target),
        items: sorted.slice(0, 10).map((row, index) => ({
          position: index + 1,
          score: row.product.growthPct,
          signalSources: row.product.sources ?? ['amazon'],
          product: row.product,
        })),
      };
    }

    if (scope === 'winners' && !entries.length) {
      const bestsellers = await this.products.listBestsellers(target, 40);
      return {
        weekKey,
        scope,
        scopeKey: target,
        targetMarket: amazonMarket(target),
        items: bestsellers.slice(0, 10).map((row, index) => ({
          position: index + 1,
          score: row.score,
          signalSources: row.product.sources ?? ['amazon'],
          product: row.product,
        })),
      };
    }

    // Margin / profit vacíos: ordenar del catálogo publicado
    if ((scope === 'margin' || scope === 'profit') && !entries.length) {
      const bestsellers = await this.products.listBestsellers(target, 40);
      const sorted = [...bestsellers].sort((a, b) => {
        if (scope === 'margin') {
          return (
            (b.product.estimatedMarginPct ?? 0) -
            (a.product.estimatedMarginPct ?? 0)
          );
        }
        return (
          (b.product.estimatedProfit ?? 0) - (a.product.estimatedProfit ?? 0)
        );
      });
      return {
        weekKey,
        scope,
        scopeKey: target,
        targetMarket: amazonMarket(target),
        items: sorted.slice(0, 10).map((row, index) => ({
          position: index + 1,
          score:
            scope === 'margin'
              ? row.product.estimatedMarginPct
              : row.product.estimatedProfit,
          signalSources: row.product.sources ?? ['amazon'],
          product: row.product,
        })),
      };
    }

    return {
      weekKey,
      scope,
      scopeKey: effectiveKey,
      targetMarket: amazonMarket(target),
      items: entries.map((e) => ({
        position: e.position,
        score: e.score != null ? Number(e.score) : null,
        signalSources: e.signalSources,
        product: this.products.serializeProduct(e.product),
      })),
    };
  }

  async listAvailable(user: User, market?: string) {
    const plan = planById(user.plan);
    const weekKey = await this.catalog.assertPublished();
    const target = amazonMarket(market || user.targetMarket);
    const allowlist = this.products.ingestCategoriesForMarket(target.code);
    // Scoped to this market's products — category scopeKeys aren't
    // market-specific in the table, so ES and US labels used to get mixed
    // into one chip list regardless of which market tab was selected.
    const fromDb = plan.top10ByCategory
      ? await this.rankings
          .createQueryBuilder('r')
          .innerJoin('r.product', 'p')
          .select('DISTINCT r.scopeKey', 'scopeKey')
          .where(
            'r.weekKey = :weekKey AND r.scope = :scope AND p.country = :country',
            { weekKey, scope: 'category', country: target.code },
          )
          .getRawMany<{ scopeKey: string }>()
      : [];
    const countries = plan.top10ByCountry
      ? await this.rankings
          .createQueryBuilder('r')
          .select('DISTINCT r.scopeKey', 'scopeKey')
          .where('r.weekKey = :weekKey AND r.scope = :scope', {
            weekKey,
            scope: 'country',
          })
          .getRawMany<{ scopeKey: string }>()
      : [];

    const categories = [
      ...new Set([
        ...allowlist,
        ...fromDb.map((c) => c.scopeKey).filter((k) => k && k !== '*'),
      ]),
    ];

    return {
      weekKey,
      general: true,
      rising: true,
      trending: true,
      winners: true,
      ad_winners: true,
      margin: true,
      profit: true,
      targetMarket: target,
      categories,
      countries: countries.map((c) => c.scopeKey),
      plan: plan.id,
    };
  }
}
