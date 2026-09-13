import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { CurrentUser } from '../common/decorators';
import { SubscriptionGuard } from '../auth/subscription.guard';
import { CatalogService } from '../catalog/catalog.service';
import { ProductsService } from '../products/products.service';
import { User } from '../users/user.entity';
import { CreativeIntelligenceService } from './creative-intelligence.service';
import { CreativeService } from './creative.service';

class CreativeDto {
  @IsString()
  @MinLength(2)
  productTitle!: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsString()
  country?: string;
}

@Controller('creative')
@UseGuards(SubscriptionGuard)
export class CreativeController {
  constructor(
    private readonly creative: CreativeService,
    private readonly creativeIntelligence: CreativeIntelligenceService,
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
        const stored = this.creativeIntelligence.getStored(row.product);
        if (!stored?.ads?.length) return null;
        return {
          product: row.product,
          creativeIntelligence: {
            ...stored,
            paused: false,
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
      body.country,
    );
  }
}
