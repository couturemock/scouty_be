import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { CurrentUser } from '../common/decorators';
import { SubscriptionGuard } from '../auth/subscription.guard';
import { CatalogService } from '../catalog/catalog.service';
import {
  sortAdsByEngagement,
  summarizeWinningFormats,
} from '../integrations/ads/ad-engagement';
import { CreativeAd } from '../integrations/types';
import { ProductsService } from '../products/products.service';
import { User } from '../users/user.entity';
import { CreativeService } from './creative.service';

class CreativeDto {
  @IsString()
  @MinLength(2)
  productTitle!: string;

  @IsOptional()
  @IsUUID()
  productId?: string;
}

@Controller('creative')
@UseGuards(SubscriptionGuard)
export class CreativeController {
  constructor(
    private readonly creative: CreativeService,
    private readonly products: ProductsService,
    private readonly catalog: CatalogService,
  ) {}

  /** Productos del snapshot publicado que ya tienen creatividades (Top N del ingest). */
  @Get('catalog')
  async listCatalog(@Query('market') market?: string) {
    await this.catalog.assertPublished();
    const rows = await this.products.listBestsellers(market, 50);
    return rows
      .map((row) => {
        const meta = row.product.meta as Record<string, unknown> | undefined;
        const stored = meta?.creativeIntelligence as
          | {
              ads?: CreativeAd[];
              provider?: string;
              fromSnapshot?: boolean;
              disclaimer?: string;
              winningFormats?: unknown;
            }
          | undefined;
        if (!stored?.ads?.length) return null;
        const ads = sortAdsByEngagement(stored.ads);
        return {
          product: row.product,
          creativeIntelligence: {
            ...stored,
            ads,
            winningFormats: summarizeWinningFormats(ads),
            paused: false,
            disclaimer:
              stored.disclaimer ||
              'Anuncios similares ordenados por vistas e interacciones públicas (PipiAds). No son CTR, CPA ni ROAS de Meta o TikTok Ads Manager.',
          },
        };
      })
      .filter(Boolean);
  }

  @Post('analyze')
  analyze(@CurrentUser() user: User, @Body() body: CreativeDto) {
    return this.creative.analyzeProduct(
      user,
      body.productTitle,
      body.productId,
    );
  }
}
