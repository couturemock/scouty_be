import { Module } from '@nestjs/common';
import { CreativeAdFixtureProvider } from './ads/creative-ad-fixture.provider';
import { CreativeAdsProvider } from './ads/creative-ads.provider';
import { KeepaAmazonProvider } from './amazon/keepa.provider';
import { DropshipPrefilterProvider } from './openai/dropship-prefilter.provider';
import { OpenAiClient } from './openai/openai.client';
import { PipiAdsCacheService } from './pipiads/pipiads-cache.service';
import { PipiAdsClient } from './pipiads/pipiads.client';
import { PipiAdsProvider } from './pipiads/pipiads.provider';
import { AliExpressSupplierProvider } from './suppliers/aliexpress.provider';
import { CjSupplierProvider } from './suppliers/cj.provider';
import { SuppliersService } from './suppliers/suppliers.service';
import { SupabaseStorageProvider } from './storage/supabase-storage.provider';
import { ShopifyStoreClient } from './stores/shopify-store.client';

@Module({
  providers: [
    PipiAdsCacheService,
    PipiAdsClient,
    PipiAdsProvider,
    CreativeAdFixtureProvider,
    CreativeAdsProvider,
    KeepaAmazonProvider,
    OpenAiClient,
    DropshipPrefilterProvider,
    AliExpressSupplierProvider,
    CjSupplierProvider,
    SuppliersService,
    SupabaseStorageProvider,
    ShopifyStoreClient,
  ],
  exports: [
    PipiAdsCacheService,
    PipiAdsClient,
    PipiAdsProvider,
    CreativeAdsProvider,
    KeepaAmazonProvider,
    OpenAiClient,
    DropshipPrefilterProvider,
    AliExpressSupplierProvider,
    CjSupplierProvider,
    SuppliersService,
    SupabaseStorageProvider,
    ShopifyStoreClient,
  ],
})
export class IntegrationsModule {}
