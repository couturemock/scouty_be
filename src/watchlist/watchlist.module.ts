import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/product.entity';
import { ProductsModule } from '../products/products.module';
import { WatchlistItem } from './watchlist-item.entity';
import { WatchlistController } from './watchlist.controller';
import { WatchlistService } from './watchlist.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WatchlistItem, Product]),
    ProductsModule,
  ],
  controllers: [WatchlistController],
  providers: [WatchlistService],
})
export class WatchlistModule {}
