import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/product.entity';
import { ProductsService } from '../products/products.service';
import { User } from '../users/user.entity';
import { WatchlistItem } from './watchlist-item.entity';

@Injectable()
export class WatchlistService {
  constructor(
    @InjectRepository(WatchlistItem)
    private readonly items: Repository<WatchlistItem>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly productsService: ProductsService,
  ) {}

  async list(user: User) {
    const rows = await this.items.find({
      where: { userId: user.id },
      relations: { product: true },
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => ({
      id: row.id,
      addedAt: row.createdAt,
      product: this.productsService.serializeProduct(row.product),
    }));
  }

  async add(user: User, productId: string) {
    const product = await this.products.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    let item = await this.items.findOne({
      where: { userId: user.id, productId },
    });
    if (!item) {
      item = await this.items.save(
        this.items.create({ userId: user.id, productId }),
      );
    }
    return { id: item.id, productId };
  }

  async remove(user: User, productId: string) {
    await this.items.delete({ userId: user.id, productId });
    return { ok: true };
  }
}
