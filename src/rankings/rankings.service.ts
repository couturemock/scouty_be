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

    const boardScopes: RankingScope[] = ['rising', 'margin', 'profit'];
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

    // Rising: si no hay board precomputado, calcular al vuelo desde snapshots
    if (scope === 'rising' && !entries.length) {
      const risers = await this.products.listRisers(target, 'published');
      return {
        weekKey,
        scope,
        scopeKey: target,
        targetMarket: amazonMarket(target),
        items: risers.map((row, index) => ({
          position: index + 1,
          score: row.rankDelta,
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

  async listAvailable(user: User) {
    const plan = planById(user.plan);
    const weekKey = await this.catalog.assertPublished();
    const target = amazonMarket(user.targetMarket);
    const categories = plan.top10ByCategory
      ? await this.rankings
          .createQueryBuilder('r')
          .select('DISTINCT r.scopeKey', 'scopeKey')
          .where('r.weekKey = :weekKey AND r.scope = :scope', {
            weekKey,
            scope: 'category',
          })
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

    return {
      weekKey,
      general: true,
      rising: true,
      margin: true,
      profit: true,
      targetMarket: target,
      categories: categories.map((c) => c.scopeKey),
      countries: countries.map((c) => c.scopeKey),
      plan: plan.id,
    };
  }
}
