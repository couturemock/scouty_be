import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogSnapshot } from './catalog-snapshot.entity';
import { CatalogState } from './catalog-state.entity';

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(CatalogState)
    private readonly repo: Repository<CatalogState>,
    @InjectRepository(CatalogSnapshot)
    private readonly snapshots: Repository<CatalogSnapshot>,
  ) {}

  async getState(): Promise<CatalogState> {
    let row = await this.repo.findOne({ where: {} });
    if (!row) {
      row = await this.repo.save(
        this.repo.create({
          publishedWeekKey: null,
          draftWeekKey: null,
          draftMarkets: [],
          draftProductCount: 0,
        }),
      );
    }
    return row;
  }

  async publishedWeekKey(): Promise<string | null> {
    return (await this.getState()).publishedWeekKey;
  }

  requirePublishedWeekKey(): string {
    throw new NotFoundException(
      'No hay catálogo publicado. Un administrador debe publicar un snapshot.',
    );
  }

  async assertPublished(): Promise<string> {
    const key = await this.publishedWeekKey();
    if (!key) this.requirePublishedWeekKey();
    return key!;
  }

  async markIngested(
    weekKey: string,
    markets: string[],
    productCount: number,
    note?: string,
  ) {
    const now = new Date();
    const state = await this.getState();
    state.draftWeekKey = weekKey;
    state.draftMarkets = markets;
    state.draftProductCount = productCount;
    state.lastIngestAt = now;
    state.lastIngestNote = note ?? null;
    await this.repo.save(state);

    let snap = await this.snapshots.findOne({ where: { weekKey } });
    if (!snap) {
      snap = this.snapshots.create({
        weekKey,
        markets,
        productCount,
        status: 'draft',
        ingestedAt: now,
        note: note ?? null,
      });
    } else {
      snap.markets = markets;
      snap.productCount = productCount;
      snap.ingestedAt = now;
      snap.note = note ?? null;
      if (snap.status !== 'published') snap.status = 'draft';
    }
    await this.snapshots.save(snap);

    return state;
  }

  async publish(weekKey: string | undefined, adminEmail: string) {
    const state = await this.getState();
    const target = weekKey ?? state.draftWeekKey;
    if (!target) {
      throw new ForbiddenException(
        'No hay snapshot borrador. Ejecuta una ingesta Keepa primero.',
      );
    }

    let snap = await this.snapshots.findOne({ where: { weekKey: target } });
    if (!snap) {
      snap = this.snapshots.create({
        weekKey: target,
        markets: state.draftMarkets ?? [],
        productCount: state.draftProductCount ?? 0,
        status: 'draft',
        ingestedAt: state.lastIngestAt ?? new Date(),
        note: state.lastIngestNote,
      });
    }

    const now = new Date();

    await this.snapshots
      .createQueryBuilder()
      .update(CatalogSnapshot)
      .set({ status: 'superseded' })
      .where('status = :status', { status: 'published' })
      .andWhere('weekKey != :weekKey', { weekKey: target })
      .execute();

    snap.status = 'published';
    snap.publishedAt = now;
    snap.publishedBy = adminEmail;
    await this.snapshots.save(snap);

    state.publishedWeekKey = target;
    state.lastPublishedAt = now;
    state.lastPublishedBy = adminEmail;
    return this.repo.save(state);
  }

  async listSnapshots() {
    const state = await this.getState();

    // Backfill from catalog_state if we have a draft/published week but no rows yet
    if (
      state.draftWeekKey &&
      !(await this.snapshots.findOne({ where: { weekKey: state.draftWeekKey } }))
    ) {
      await this.snapshots.save(
        this.snapshots.create({
          weekKey: state.draftWeekKey,
          markets: state.draftMarkets ?? [],
          productCount: state.draftProductCount ?? 0,
          status:
            state.draftWeekKey === state.publishedWeekKey
              ? 'published'
              : 'draft',
          ingestedAt: state.lastIngestAt ?? new Date(),
          publishedAt:
            state.draftWeekKey === state.publishedWeekKey
              ? state.lastPublishedAt
              : null,
          publishedBy:
            state.draftWeekKey === state.publishedWeekKey
              ? state.lastPublishedBy
              : null,
          note: state.lastIngestNote,
        }),
      );
    }
    if (
      state.publishedWeekKey &&
      state.publishedWeekKey !== state.draftWeekKey &&
      !(await this.snapshots.findOne({
        where: { weekKey: state.publishedWeekKey },
      }))
    ) {
      await this.snapshots.save(
        this.snapshots.create({
          weekKey: state.publishedWeekKey,
          markets: [],
          productCount: 0,
          status: 'published',
          ingestedAt: state.lastPublishedAt ?? new Date(),
          publishedAt: state.lastPublishedAt,
          publishedBy: state.lastPublishedBy,
        }),
      );
    }

    const rows = await this.snapshots.find({
      order: { ingestedAt: 'DESC' },
    });

    return rows.map((row) => ({
      id: row.id,
      weekKey: row.weekKey,
      markets: row.markets,
      productCount: row.productCount,
      status: row.status,
      ingestedAt: row.ingestedAt,
      publishedAt: row.publishedAt,
      publishedBy: row.publishedBy,
      note: row.note,
      active: row.weekKey === state.publishedWeekKey,
    }));
  }

  async status() {
    const s = await this.getState();
    return {
      publishedWeekKey: s.publishedWeekKey,
      draftWeekKey: s.draftWeekKey,
      draftMarkets: s.draftMarkets,
      draftProductCount: s.draftProductCount,
      lastIngestAt: s.lastIngestAt,
      lastPublishedAt: s.lastPublishedAt,
      lastPublishedBy: s.lastPublishedBy,
      lastIngestNote: s.lastIngestNote,
      hasPublishedCatalog: Boolean(s.publishedWeekKey),
    };
  }
}
