import { Injectable } from '@nestjs/common';
import { CreativeIntelligenceService } from './creative-intelligence.service';
import { User } from '../users/user.entity';

@Injectable()
export class CreativeService {
  constructor(private readonly ci: CreativeIntelligenceService) {}

  analyzeProduct(
    user: User,
    productTitle: string,
    productId?: string,
    country?: string,
  ) {
    return this.ci.analyzeOnDemand(user, productTitle, productId, country);
  }
}
