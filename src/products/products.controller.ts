import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SubscriptionGuard } from '../auth/subscription.guard';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(SubscriptionGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get('bestsellers')
  bestsellers(@Query('limit') limit?: string) {
    return this.products.listBestsellers(limit ? Number(limit) : 40);
  }

  @Get()
  list() {
    return this.products.listAll();
  }

  @Get('risers/weekly')
  risers() {
    return this.products.listRisers();
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.products.getProductDetail(id);
  }
}
