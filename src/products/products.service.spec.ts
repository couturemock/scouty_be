import { ProductsService } from './products.service';
import { Product } from './product.entity';

type FakeRankingRow = { scope: string; scopeKey: string; productId: string };

function makeProduct(
  id: string,
  overrides: Partial<Product> & { meta?: Record<string, unknown> } = {},
): Product {
  return {
    id,
    slug: id,
    title: `Product ${id}`,
    category: 'home_kitchen',
    country: 'ES',
    sources: ['amazon'],
    currentPrice: '30',
    estimatedMarginPct: '25',
    estimatedSales: '80',
    currentRank: 4000,
    growthPct: '10',
    rating: '4.3',
    reviewCount: 100,
    catalogWeekKey: 'W1',
    meta: {
      keepa: { growthPct7: 15, growthPct30: 10 },
      ...(overrides.meta ?? {}),
    },
    ...overrides,
  } as Product;
}

describe('ProductsService.rebuildRankings — supplier gate', () => {
  it('only includes sourceable products (live supplier offer) in general/trending/winners boards', async () => {
    const sourceable = makeProduct('sourceable', {
      meta: {
        suppliers: [
          { source: 'aliexpress', name: 'x', listingUrl: 'https://ae', unitPriceEur: 5, kind: 'live' },
        ],
      },
    });
    const notSourceable = makeProduct('not-sourceable', {
      meta: { suppliers: [] },
    });

    const products = [sourceable, notSourceable];
    const rankingRows: FakeRankingRow[] = [];

    const productsRepo = {
      find: jest.fn().mockResolvedValue(products),
      save: jest.fn().mockImplementation((p: Product) => Promise.resolve(p)),
    };

    const deleteBuilder = {
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const rankingsRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(deleteBuilder),
      create: jest.fn().mockImplementation((data: FakeRankingRow) => data),
      save: jest.fn().mockImplementation((row: FakeRankingRow) => {
        rankingRows.push(row);
        return Promise.resolve(row);
      }),
    };

    const amazon = { ingestCategoryLabels: jest.fn().mockReturnValue([]) };

    const service = new ProductsService(
      productsRepo as never,
      {} as never,
      rankingsRepo as never,
      amazon as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await service.rebuildRankings('W1');

    const generalProductIds = rankingRows
      .filter((r) => r.scope === 'general')
      .map((r) => r.productId);

    expect(generalProductIds).toContain('sourceable');
    expect(generalProductIds).not.toContain('not-sourceable');
  });
});
