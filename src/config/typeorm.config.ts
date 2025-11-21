import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions, TypeOrmModuleOptions } from '@nestjs/typeorm';

export const typeOrmAsyncConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService): Promise<TypeOrmModuleOptions> => {
    const isProduction = configService.get('nodeEnv') === 'production';
    const sslEnabled = configService.get('database.ssl');
    const databaseUrl = configService.get('database.url');

    return {
      type: 'postgres',

      // Si DATABASE_URL est définie, l'utiliser en priorité
      ...(databaseUrl
        ? { url: databaseUrl }
        : {
            host: configService.get('database.host'),
            port: configService.get('database.port'),
            username: configService.get('database.username'),
            password: configService.get('database.password'),
            database: configService.get('database.database'),
          }),

      schema: configService.get('database.schema'),

      // SSL Configuration (pour Supabase en production)
      ssl: sslEnabled
        ? {
            rejectUnauthorized: false,
          }
        : false,

      // Entities
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],

      // Migrations
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      migrationsTableName: 'migrations',
      migrationsRun: false, // On exécute les migrations manuellement

      // Synchronization (uniquement en dev)
      synchronize: !isProduction, // ATTENTION: désactivé en production !

      // Logging
      logging: !isProduction ? ['query', 'error', 'warn'] : ['error'],

      // Additional options
      autoLoadEntities: true,
      retryAttempts: 3,
      retryDelay: 3000,

      // Pool configuration pour de meilleures performances
      extra: {
        max: 10, // Maximum de connexions dans le pool
        min: 2,  // Minimum de connexions dans le pool
        idleTimeoutMillis: 30000,
      },
    };
  },
};
