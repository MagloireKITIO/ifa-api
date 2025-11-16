import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VersesService } from './verses.service';

@ApiTags('Verses (Public)')
@Controller('verses')
export class VersesPublicController {
  constructor(private readonly versesService: VersesService) {}

  @Get('daily')
  @ApiOperation({
    summary: 'Get verse of the day',
    description:
      'Get the verse of the day with intelligent rotation based on seasons, priorities, and display history. Public endpoint for mobile app.',
  })
  @ApiResponse({
    status: 200,
    description: 'Verse of the day retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'No active verses available',
  })
  async getDaily() {
    return this.versesService.getVerseOfTheDay();
  }
}
