import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';
import { ProductsModule } from '../products/products.module';
import { DevUsersSeedService } from './dev-users.seed';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, User]),
    ProductsModule,
    CatalogModule,
  ],
  providers: [SeedService, DevUsersSeedService],
})
export class SeedModule {}
