import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpException,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
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
import { SaveAddressDto, AddAddressDto, UpdateAddressDto } from './dto/address.dto';
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
    return this.authService.generateOtp(dto.phoneCountry, dto.phoneNumber);
  }

  @Post('validate-otp')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Validate OTP; returns JWT + user session. Mock: OTP = last 4 digits of phone number or 1234.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns accessToken, sessionId, userId, phoneCountry, phoneNumber; upgradedChatSessionIds if guest_id was sent and guest sessions were upgraded. Also sets auth_token cookie.',
  })
  @ApiResponse({ status: 400, description: 'Invalid OTP' })
  async validateOtp(
    @Body() dto: ValidateOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.authService.validateOtp(dto.phoneCountry, dto.phoneNumber, dto.otp, dto.guest_id);
      
      // Set JWT in HTTP-only cookie
      res.cookie('auth_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });
      
      return result;
    } catch (e) {
      throw new HttpException(
        { statusCode: 400, message: e instanceof Error ? e.message : 'Invalid OTP' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Logout and clear auth cookie' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return {
      message: 'Logged out successfully',
      data: {
        success: true,
      },
    };
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
    const result = await this.addressService.saveAddress(userId, payload);
    const { isNew, ...address } = result;
    return {
      message: isNew ? 'Address added successfully' : 'Address updated successfully',
      data: address,
    };
  }

  @Get('address')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user address (shipping + billing) - Legacy' })
  @ApiResponse({ status: 200, description: 'Address or null' })
  async getAddress(@Request() req: any) {
    const userId = req.user.userId;
    const address = await this.addressService.getAddress(userId);
    return {
      message: address ? 'Address fetched successfully' : 'No address found',
      data: address,
    };
  }

  // ==================== Multiple Addresses API ====================

  @Get('addresses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all addresses for current user' })
  @ApiResponse({ status: 200, description: 'List of addresses' })
  async getAllAddresses(@Request() req: any) {
    const userId = req.user.userId;
    const addresses = await this.addressService.getAllAddresses(userId);
    return {
      message: 'Addresses fetched successfully',
      data: addresses,
    };
  }

  @Get('addresses/:addressId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific address by ID' })
  @ApiResponse({ status: 200, description: 'Address details' })
  async getAddressById(@Param('addressId') addressId: string, @Request() req: any) {
    const userId = req.user.userId;
    const address = await this.addressService.getAddressById(userId, addressId);
    if (!address) {
      throw new HttpException('Address not found', HttpStatus.NOT_FOUND);
    }
    return {
      message: 'Address fetched successfully',
      data: address,
    };
  }

  @Post('addresses')
  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a new address' })
  @ApiResponse({ status: 201, description: 'Address added successfully' })
  async addAddress(@Body() dto: AddAddressDto, @Request() req: any) {
    const userId = req.user.userId;
    const address = await this.addressService.addAddress(userId, dto);
    return {
      message: 'Address added successfully',
      data: address,
    };
  }

  @Put('addresses/:addressId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing address' })
  @ApiResponse({ status: 200, description: 'Address updated successfully' })
  async updateAddress(
    @Param('addressId') addressId: string,
    @Body() dto: UpdateAddressDto,
    @Request() req: any,
  ) {
    const userId = req.user.userId;
    const address = await this.addressService.updateAddress(userId, addressId, dto);
    return {
      message: 'Address updated successfully',
      data: address,
    };
  }

  @Delete('addresses/:addressId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an address' })
  @ApiResponse({ status: 200, description: 'Address deleted successfully' })
  async deleteAddress(@Param('addressId') addressId: string, @Request() req: any) {
    const userId = req.user.userId;
    const result = await this.addressService.deleteAddress(userId, addressId);
    return {
      message: result.message,
      data: { success: result.success },
    };
  }

  @Post('addresses/:addressId/default')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set an address as default' })
  @ApiResponse({ status: 200, description: 'Address set as default' })
  async setDefaultAddress(@Param('addressId') addressId: string, @Request() req: any) {
    const userId = req.user.userId;
    const address = await this.addressService.setDefaultAddress(userId, addressId);
    return {
      message: 'Address set as default',
      data: address,
    };
  }
}
