import { Module } from '@nestjs/common';
import { VersesPublicController } from './verses-public.controller';
import { VersesService } from './verses.service';

/**
 * Verses Module - 100% automatic
 * No database, no admin management
 * Just fetches verses from Bible SuperSearch API
 */
@Module({
  controllers: [
    VersesPublicController, // Public endpoint for mobile app
  ],
  providers: [VersesService],
  exports: [VersesService],
})
export class VersesModule {}
