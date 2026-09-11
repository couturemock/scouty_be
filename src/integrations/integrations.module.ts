import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreativeAdFixtureProvider } from './ads/creative-ad-fixture.provider';
import { CreativeAdsProvider } from './ads/creative-ads.provider';
import { KeepaAmazonProvider } from './amazon/keepa.provider';
import { PipiAdsClient } from './pipiads/pipiads.client';
import { PipiAdsProvider } from './pipiads/pipiads.provider';
import { AlibabaSupplierProvider } from './suppliers/alibaba.provider';

@Module({
  providers: [
    PipiAdsClient,
    PipiAdsProvider,
    CreativeAdFixtureProvider,
    CreativeAdsProvider,
    KeepaAmazonProvider,
    AlibabaSupplierProvider,
  ],
  exports: [
    PipiAdsClient,
    PipiAdsProvider,
    CreativeAdsProvider,
    KeepaAmazonProvider,
    AlibabaSupplierProvider,
  ],
})
export class IntegrationsModule {}
