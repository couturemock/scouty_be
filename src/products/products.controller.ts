import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SubscriptionGuard } from '../auth/subscription.guard';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(SubscriptionGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get('bestsellers')
  bestsellers(
    @Query('market') market?: string,
    @Query('limit') limit?: string,
  ) {
    return this.products.listBestsellers(
      market,
      limit ? Number(limit) : 40,
    );
  }

  @Get()
  list(@Query('market') market?: string) {
    return this.products.listAll(market);
  }

  @Get('risers/weekly')
  risers(@Query('market') market?: string) {
    return this.products.listRisers(market);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.products.getProductDetail(id);
  }
}
