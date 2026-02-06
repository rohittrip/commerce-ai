import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CartService } from './cart.service';

@ApiTags('cart')
@Controller('v1/cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get user cart' })
  async getCart(@Request() req) {
    return this.cartService.getCart(req.user.userId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  async addItem(
    @Request() req,
    @Body() body: { productId: string; provider: string; quantity: number },
  ) {
    return this.cartService.addItem(
      req.user.userId,
      body.productId,
      body.provider,
      body.quantity,
    );
  }

  @Patch('items/:productId')
  @ApiOperation({ summary: 'Update item quantity' })
  async updateItem(
    @Request() req,
    @Param('productId') productId: string,
    @Body() body: { quantity: number },
  ) {
    return this.cartService.updateItemQty(req.user.userId, productId, body.quantity);
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeItem(@Request() req, @Param('productId') productId: string) {
    return this.cartService.removeItem(req.user.userId, productId);
  }
}
