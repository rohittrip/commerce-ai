import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as swaggerUi from 'swagger-ui-express';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Commerce AI BFF API')
    .setDescription('Backend for Frontend with AI Orchestrator. Mobile flow: generate-otp → validate-otp (use 1234) → use JWT for sessions, chat, cart, address.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Serve Swagger UI with swagger-ui-express (chain serve + setup in one route)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(document, {
      swaggerOptions: { persistAuthorization: true },
      customSiteTitle: 'Commerce AI BFF API',
    }),
  );

  // JSON spec at /docs-json for tools
  expressApp.get('/docs-json', (_req: any, res: any) => res.json(document));

  // Redirect root to Swagger
  expressApp.get('/', (_req: any, res: any) => res.redirect(302, '/docs'));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 BFF running on http://localhost:${port}`);
  console.log(`📚 Swagger UI: http://localhost:${port}/docs`);
}

bootstrap();
