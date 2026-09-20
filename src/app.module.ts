import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AccountModule } from './account/account.module';
import { AnalysisModule } from './analysis/analysis.module';
import { Analysis } from './analysis/analysis.entity';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { BillingModule } from './billing/billing.module';
import { CalculatorModule } from './calculator/calculator.module';
import { CatalogModule } from './catalog/catalog.module';
import { CatalogState } from './catalog/catalog-state.entity';
import { CatalogSnapshot } from './catalog/catalog-snapshot.entity';
import { CreativeModule } from './creative/creative.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { JobsModule } from './jobs/jobs.module';
import { MailModule } from './mail/mail.module';
import { Product } from './products/product.entity';
import { ProductsModule } from './products/products.module';
import { RankingEntry } from './rankings/ranking-entry.entity';
import { RankingsModule } from './rankings/rankings.module';
import { SeedModule } from './seed/seed.module';
import { ProductSnapshot } from './snapshots/product-snapshot.entity';
import { UsageCounter } from './usage/usage-counter.entity';
import { UsageModule } from './usage/usage.module';
import { User } from './users/user.entity';
import { WatchlistItem } from './watchlist/watchlist-item.entity';
import { WatchlistModule } from './watchlist/watchlist.module';
import { WaitlistEntry } from './waitlist/waitlist-entry.entity';
import { WaitlistModule } from './waitlist/waitlist.module';
import { WaitlistSettings } from './waitlist/waitlist-settings.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => {
        const entities = [
          User,
          UsageCounter,
          Product,
          ProductSnapshot,
          RankingEntry,
          WatchlistItem,
          Analysis,
          CatalogState,
          CatalogSnapshot,
          WaitlistSettings,
          WaitlistEntry,
        ];
        const synchronize =
          config.get<string>('DATABASE_SYNC', 'true') === 'true';
        const databaseUrl = config.get<string>('DATABASE_URL')?.trim();
        const sslEnabled =
          config.get<string>('DATABASE_SSL', '') === 'true' ||
          Boolean(databaseUrl?.includes('sslmode=require'));
        const ssl = sslEnabled ? { rejectUnauthorized: false } : undefined;

        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            entities,
            synchronize,
            ssl,
          };
        }

        return {
          type: 'postgres',
          host: String(config.get<string>('DATABASE_HOST') ?? 'localhost'),
          port: Number(config.get<string>('DATABASE_PORT') ?? 5432),
          username: String(config.get<string>('DATABASE_USER') ?? 'scoutly'),
          password: String(
            config.get<string>('DATABASE_PASSWORD') ?? 'scoutly',
          ),
          database: String(config.get<string>('DATABASE_NAME') ?? 'scoutly'),
          entities,
          synchronize,
          ssl,
        };
      },
    }),
    MailModule,
    AuthModule,
    BillingModule,
    UsageModule,
    AccountModule,
    IntegrationsModule,
    CatalogModule,
    ProductsModule,
    RankingsModule,
    AnalysisModule,
    CalculatorModule,
    CreativeModule,
    WatchlistModule,
    WaitlistModule,
    JobsModule,
    SeedModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
