import { Controller, Post, Get, Body, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { OptionalJwtAuthGuard } from '../../common/auth/optional-jwt-auth.guard';
import { ConfigService } from '../../common/config/config.service';
import { sanitizeError } from '../../common/utils/error-sanitizer';
import { ChatService } from './chat.service';

@ApiTags('chat')
@Controller('v1/chat')
@UseGuards(OptionalJwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(
    private chatService: ChatService,
    private config: ConfigService,
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
  @ApiOperation({ summary: 'Get chat history with pagination' })
  async getMessages(
    @Param('sessionId') sessionId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.chatService.getMessages(sessionId, parsedLimit, before);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Stream chat messages (SSE)' })
  async streamMessages(
    @Request() req,
    @Body() body: { sessionId: string; message: string },
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

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
      const userId = req.user?.userId || null;

      // Process message stream
      for await (const event of this.chatService.processMessage(
        body.sessionId,
        userId,
        body.message,
      )) {
        if (disconnected || res.writableEnded) {
          break;
        }
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }

      // Ensure done event is sent
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
