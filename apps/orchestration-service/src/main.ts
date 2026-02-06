import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // gRPC server for BFF (and future services) – same process as HTTP
  const protoPath = path.join(__dirname, '..', 'proto', 'orchestrator.proto');
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'commerce.ai.orchestrator',
      protoPath,
      url: process.env.ORCHESTRATOR_GRPC_URL || '0.0.0.0:50051',
      loader: {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      },
    },
  });

  const config = new DocumentBuilder()
    .setTitle('Commerce AI Orchestration Service')
    .setDescription('AI Orchestration Service for Commerce AI')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.startAllMicroservices();

  const port = process.env.ORCHESTRATOR_PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Orchestration Service HTTP on http://localhost:${port}`);
  console.log(`🔌 Orchestration Service gRPC on ${process.env.ORCHESTRATOR_GRPC_URL || '0.0.0.0:50051'}`);
  console.log(`📚 API Docs at http://localhost:${port}/api`);
}

bootstrap();
