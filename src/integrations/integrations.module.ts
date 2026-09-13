import { Module } from '@nestjs/common';
import { CreativeAdFixtureProvider } from './ads/creative-ad-fixture.provider';
import { CreativeAdsProvider } from './ads/creative-ads.provider';
import { KeepaAmazonProvider } from './amazon/keepa.provider';
import { PipiAdsClient } from './pipiads/pipiads.client';
import { PipiAdsProvider } from './pipiads/pipiads.provider';
import { Alibaba1688SupplierProvider } from './suppliers/alibaba-1688.provider';
import { AlibabaComSupplierProvider } from './suppliers/alibaba-com.provider';
import { AlibabaSupplierProvider } from './suppliers/alibaba.provider';
import { AliExpressSupplierProvider } from './suppliers/aliexpress.provider';
import { SuppliersService } from './suppliers/suppliers.service';

@Module({
  providers: [
    PipiAdsClient,
    PipiAdsProvider,
    CreativeAdFixtureProvider,
    CreativeAdsProvider,
    KeepaAmazonProvider,
    AlibabaSupplierProvider,
    Alibaba1688SupplierProvider,
    AlibabaComSupplierProvider,
    AliExpressSupplierProvider,
    SuppliersService,
  ],
  exports: [
    PipiAdsClient,
    PipiAdsProvider,
    CreativeAdsProvider,
    KeepaAmazonProvider,
    AlibabaSupplierProvider,
    Alibaba1688SupplierProvider,
    AlibabaComSupplierProvider,
    AliExpressSupplierProvider,
    SuppliersService,
  ],
})
export class IntegrationsModule {}
