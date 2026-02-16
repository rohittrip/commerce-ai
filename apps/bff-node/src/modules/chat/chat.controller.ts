import { Controller, Post, Get, Body, Param, Query, UseGuards, Request, Res, HttpException, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response, Request as ExpressRequest } from 'express';
import { OptionalJwtAuthGuard } from '../../common/auth/optional-jwt-auth.guard';
import { ConfigService } from '../../common/config/config.service';
import { sanitizeError } from '../../common/utils/error-sanitizer';
import { ChatService } from './chat.service';
import { OtpAuthService } from '../otp-auth/otp-auth.service';

@ApiTags('chat')
@Controller('v1/chat')
@UseGuards(OptionalJwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(
    private chatService: ChatService,
    private config: ConfigService,
    private otpAuthService: OtpAuthService,
  ) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Create new chat session (authenticated or guest)' })
  async createSession(
    @Request() req,
    @Body() body: { locale?: string; deviceId?: string },
  ) {
    const userId = req.user?.userId || null;
    const isGuest = !userId;
    // For guests, use deviceId from client to track across sessions
    // If no deviceId provided, generate one (but client should store and reuse it)
    const deviceId = isGuest ? (body.deviceId || null) : null;
    
    const result = await this.chatService.createSession(userId, body.locale, isGuest, deviceId);
    return result;
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get chat session' })
  async getSession(@Param('sessionId') sessionId: string) {
    return this.chatService.getSession(sessionId);
  }

  @Post('guest/sessions')
  @ApiOperation({ summary: 'Get all sessions for a guest device' })
  async getGuestSessions(@Body() body: { deviceId: string }) {
    if (!body.deviceId) {
      return { sessions: [] };
    }
    const sessions = await this.chatService.getGuestSessions(body.deviceId);
    return { sessions };
  }

  @Get('sessions/:sessionId/messages')
  @ApiOperation({ summary: 'Get chat history with pagination. Guest sessions are public, user sessions require auth.' })
  async getMessages(
    @Param('sessionId') sessionId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
    @Req() req: ExpressRequest,
  ) {
    // Get the session to check ownership
    const session = await this.chatService.getSession(sessionId);
    
    if (!session) {
      throw new HttpException(
        { error: 'Session not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    // If session belongs to a guest (has guest_id, no user_id) - allow access
    if (session.guest_id && !session.user_id) {
      const parsedLimit = limit ? parseInt(limit, 10) : 10;
      return this.chatService.getMessages(sessionId, parsedLimit, before);
    }

    // Session belongs to a user - require authentication
    // Try to get auth token from cookie or Authorization header
    let authToken = req.cookies?.auth_token;
    
    if (!authToken) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        authToken = authHeader.substring(7);
      }
    }

    if (!authToken) {
      throw new HttpException(
        { error: 'Authentication required' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Validate token
    const tokenResult = await this.otpAuthService.validateToken(authToken);
    
    if (!tokenResult) {
      throw new HttpException(
        { error: 'Invalid or expired token' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Check if the authenticated user owns this session
    if (session.user_id !== tokenResult.user.userId) {
      throw new HttpException(
        { error: 'Access denied - session belongs to another user' },
        HttpStatus.FORBIDDEN,
      );
    }

    // User is authenticated and owns the session
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.chatService.getMessages(sessionId, parsedLimit, before);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Stream chat messages (SSE). Guest sessions are public, user sessions require auth.' })
  async streamMessages(
    @Request() req,
    @Body() body: { sessionId: string; message: string },
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Helper to send SSE error and close
    const sendError = (error: string) => {
      res.write(`data: ${JSON.stringify({ type: 'error', error })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
    };

    // Get session to check ownership
    const session = await this.chatService.getSession(body.sessionId);
    
    if (!session) {
      sendError('Session not found');
      return;
    }

    // If session belongs to a user (not guest), require authentication
    if (session.user_id && !session.guest_id) {
      // Try to get auth token from cookie or Authorization header
      let authToken = req.cookies?.auth_token;
      
      if (!authToken) {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          authToken = authHeader.substring(7);
        }
      }

      if (!authToken) {
        sendError('Authentication required');
        return;
      }

      // Validate token
      const tokenResult = await this.otpAuthService.validateToken(authToken);
      
      if (!tokenResult) {
        sendError('Invalid or expired token');
        return;
      }

      // Check if the authenticated user owns this session
      if (session.user_id !== tokenResult.user.userId) {
        sendError('Access denied - session belongs to another user');
        return;
      }
    }

    let disconnected = false;
    let heartbeatInterval: NodeJS.Timeout | null = null;

    // Handle client disconnect
    req.on('close', () => {
      disconnected = true;
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      console.log(`Client disconnected for session ${body.sessionId}`);
    });

    try {
      // Send initial ack
      res.write(`data: ${JSON.stringify({ type: 'ack' })}\n\n`);

      // Start heartbeat (every 15 seconds)
      heartbeatInterval = setInterval(() => {
        if (!disconnected && !res.writableEnded) {
          res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
        }
      }, 15000);

      // Get userId from authenticated user or use session's guest_id
      const userId = req.user?.userId || session.user_id || null;

      // Process message stream
      for await (const event of this.chatService.processMessage(
        body.sessionId,
        userId,
        body.message,
      )) {
        if (disconnected || res.writableEnded) {
          break;
        }
        // Skip 'done' events from orchestrator - we'll send our own single 'done' at the end
        if (event.type === 'done') {
          continue;
        }
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }

      // Send single 'done' event at the end
      if (!disconnected && !res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      }
    } catch (error) {
      console.error('Stream error:', error);
      if (!disconnected && !res.writableEnded) {
        // Send error in the format UI expects
        const debugMode = this.config.debugMode || this.config.nodeEnv === 'development';
        const errorMessage = sanitizeError(error, debugMode);
        res.write(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      }
    } finally {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      if (!res.writableEnded) {
        res.end();
      }
    }
  }

  @Post('sessions/:sessionId/feedback')
  @ApiOperation({ summary: 'Submit message feedback' })
  async submitFeedback(
    @Param('sessionId') sessionId: string,
    @Body() body: { messageId: string; rating: number; reason?: string },
  ) {
    await this.chatService.submitFeedback(
      sessionId,
      body.messageId,
      body.rating,
      body.reason,
    );
    return { status: 'submitted' };
  }

  @Post('sessions/:sessionId/end')
  @ApiOperation({ summary: 'End a chat session' })
  async endSession(@Param('sessionId') sessionId: string) {
    return this.chatService.endSession(sessionId);
  }
}
