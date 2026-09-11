import {
  Controller,
  Get,
} from '@nestjs/common';
import { Public } from '../common/decorators';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogPublicController {
  constructor(private readonly catalog: CatalogService) {}

  /** Estado público: si hay catálogo publicado (sin datos de producto). */
  @Public()
  @Get('status')
  status() {
    return this.catalog.status();
  }
}
