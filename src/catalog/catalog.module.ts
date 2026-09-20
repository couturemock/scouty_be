import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminGuard } from '../auth/admin.guard';
import { IntegrationsModule } from '../integrations/integrations.module';
import { JobsModule } from '../jobs/jobs.module';
import { ProductsModule } from '../products/products.module';
import { AdminCatalogController } from './admin-catalog.controller';
import { CatalogPublicController } from './catalog-public.controller';
import { CatalogSnapshot } from './catalog-snapshot.entity';
import { CatalogState } from './catalog-state.entity';
import { CatalogService } from './catalog.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CatalogState, CatalogSnapshot]),
    forwardRef(() => ProductsModule),
    IntegrationsModule,
    JobsModule,
  ],
  controllers: [AdminCatalogController, CatalogPublicController],
  providers: [CatalogService, AdminGuard],
  exports: [CatalogService],
})
export class CatalogModule {}
