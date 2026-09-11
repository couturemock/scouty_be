import { IsOptional, IsString, Matches } from 'class-validator';

export class PublishCatalogDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-W\d{2}$/, {
    message: 'weekKey debe tener formato YYYY-Www (ej. 2026-W37)',
  })
  weekKey?: string;
}
