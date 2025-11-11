import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get ConfigService
  const configService = app.get(ConfigService);

  // Global prefix (ex: /api)
  const apiPrefix = configService.get('apiPrefix');
  if (apiPrefix) {
    app.setGlobalPrefix(apiPrefix);
  }

  // CORS Configuration
  app.enableCors({
    origin: true, // Les origines seront gérées depuis la BD (AppSettings)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Retire les propriétés non déclarées dans les DTOs
      forbidNonWhitelisted: true, // Lève une erreur si des propriétés non déclarées sont envoyées
      transform: true, // Transforme automatiquement les payloads en instances de DTO
      transformOptions: {
        enableImplicitConversion: true, // Conversion automatique des types
      },
    }),
  );

  // Get port from config
  const port = configService.get('port');

  // Start server on all network interfaces (0.0.0.0)
  await app.listen(port, '0.0.0.0');

  console.log(`
  🚀 Application IFA API is running on: http://localhost:${port}/${apiPrefix}
  🌐 Network: http://192.168.6.119:${port}/${apiPrefix}
  📝 Environment: ${configService.get('nodeEnv')}
  🗄️  Database: ${configService.get('database.host')}:${configService.get('database.port')}
  `);
}

bootstrap();
