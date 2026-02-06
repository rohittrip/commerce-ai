import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { MobileAuthService } from './mobile-auth.service';
import { MobileSessionsService } from './mobile-sessions.service';
import { MobileChatService } from './mobile-chat.service';
import { MobileCartService } from './mobile-cart.service';
import { MobileAddressService } from './mobile-address.service';
import { GenerateOtpDto, ValidateOtpDto } from './dto/mobile-auth.dto';
import { SaveAddressDto } from './dto/address.dto';
import { SaveCartDto } from './dto/cart.dto';
import { SendMessageDto } from './dto/chat.dto';

@ApiTags('mobile')
@Controller('v1/mobile')
export class MobileController {
  constructor(
    private authService: MobileAuthService,
    private sessionsService: MobileSessionsService,
    private chatService: MobileChatService,
    private cartService: MobileCartService,
    private addressService: MobileAddressService,
  ) {}

  @Post('generate-otp')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate OTP (dummy – always succeeds)' })
  @ApiResponse({ status: 200, description: 'OTP sent (use 1234 for testing)' })
  async generateOtp(@Body() dto: GenerateOtpDto) {
    return this.authService.generateOtp(dto.mobile);
  }

  @Post('validate-otp')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Validate OTP; returns JWT + user session. Mock: OTP = last 4 digits of mobile or 1234.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns accessToken, sessionId, userId, mobile; upgradedChatSessionIds if guest_id was sent and guest sessions were upgraded.',
  })
  @ApiResponse({ status: 400, description: 'Invalid OTP' })
  async validateOtp(@Body() dto: ValidateOtpDto) {
    try {
      return await this.authService.validateOtp(dto.mobile, dto.otp, dto.guest_id);
    } catch (e) {
      throw new HttpException(
        { statusCode: 400, message: e instanceof Error ? e.message : 'Invalid OTP' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all sessions for the current user (by JWT)' })
  @ApiResponse({ status: 200, description: 'List of { sessionId, createdAt }' })
  async getSessions(@Request() req: any) {
    const userId = req.user.userId;
    return this.sessionsService.findAllByUserId(userId);
  }

  @Get('sessions/:sessionId/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all chat messages for a session' })
  @ApiResponse({ status: 200, description: 'List of { role, content, createdAt }' })
  async getChatMessages(@Param('sessionId') sessionId: string, @Request() req: any) {
    const userId = req.user.userId;
    return this.chatService.getMessages(sessionId, userId);
  }

  @Post('sessions/:sessionId/messages')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a message; saves user + assistant reply (dummy reply for now)' })
  @ApiResponse({ status: 200, description: 'User message and assistant message saved; returns assistant reply' })
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Body() body: SendMessageDto,
    @Request() req: any,
  ) {
    const userId = req.user.userId;
    await this.chatService.addMessage(sessionId, userId, 'user', body.message);
    // Dummy assistant response (replace with orchestrator call later)
    const dummyReply = `Thanks for your message: "${body.message}". This is a placeholder response.`;
    await this.chatService.addMessage(sessionId, userId, 'assistant', dummyReply);
    return { role: 'assistant', content: dummyReply };
  }

  @Post('cart')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save cart for current user' })
  @ApiResponse({ status: 200, description: 'Saved cart with items' })
  async saveCart(@Body() dto: SaveCartDto, @Request() req: any) {
    const userId = req.user.userId;
    return this.cartService.saveCart(userId, dto.items);
  }

  @Get('cart')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user cart' })
  @ApiResponse({ status: 200, description: 'Cart with items or null' })
  async getCart(@Request() req: any) {
    const userId = req.user.userId;
    const cart = await this.cartService.getCart(userId);
    return cart ?? { userId: req.user.userId, items: [] };
  }

  @Post('address')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save shipping and billing address' })
  @ApiResponse({ status: 200, description: 'Saved shipping and billing' })
  async saveAddress(@Body() dto: SaveAddressDto, @Request() req: any) {
    const userId = req.user.userId;
    const payload = {
      shipping: dto.shipping,
      billing: dto.billing,
      billingSameAsShipping: dto.billingSameAsShipping ?? true,
    };
    return this.addressService.saveAddress(userId, payload);
  }

  @Get('address')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user address (shipping + billing)' })
  @ApiResponse({ status: 200, description: 'Address or null' })
  async getAddress(@Request() req: any) {
    const userId = req.user.userId;
    return this.addressService.getAddress(userId);
  }
}
