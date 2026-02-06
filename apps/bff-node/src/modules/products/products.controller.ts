import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('v1/products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search products' })
  async search(
    @Query('query') query: string,
    @Query('priceMax') priceMax?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const parsedPriceMax = priceMax !== undefined ? Number(priceMax) : undefined;
    const parsedPage = page !== undefined ? Number(page) : 1;
    const parsedLimit = limit !== undefined ? Number(limit) : 20;

    const searchRequest = {
      query,
      filters: Number.isFinite(parsedPriceMax) ? { priceMax: parsedPriceMax } : undefined,
      pagination: {
        page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
        limit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20,
      },
    };
    return this.productsService.search(searchRequest);
  }
}
