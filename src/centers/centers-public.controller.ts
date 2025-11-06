import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CentersService } from './centers.service';
import {
  CenterPublicResponseDto,
  QueryPublicCentersDto,
} from './dto';

/**
 * Public controller for centers (mobile app)
 * No authentication required
 */
@ApiTags('Centers - Public')
@Controller('centers/public')
export class CentersPublicController {
  constructor(private readonly centersService: CentersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all active centers (Public)',
    description:
      'Retrieve all active IFA centers. Can filter by city, country, or sort by proximity if user location is provided. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Active centers retrieved successfully',
    type: [CenterPublicResponseDto],
  })
  async getPublicCenters(
    @Query() queryDto: QueryPublicCentersDto,
  ): Promise<CenterPublicResponseDto[]> {
    const centers = await this.centersService.findPublicCenters(queryDto);

    // Map to response DTO
    return centers.map((center) => ({
      id: center.id,
      nameFr: center.nameFr,
      nameEn: center.nameEn,
      address: center.address,
      city: center.city,
      country: center.country,
      latitude: center.latitude,
      longitude: center.longitude,
      phoneNumber: center.phoneNumber,
      email: center.email,
      descriptionFr: center.descriptionFr,
      descriptionEn: center.descriptionEn,
      schedules: center.schedules,
      coverImage: center.coverImage,
      createdAt: center.createdAt,
    }));
  }

  @Get('nearby')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get nearby centers (Public)',
    description:
      'Retrieve active centers near a specific location, sorted by distance. Requires latitude and longitude parameters. No authentication required.',
  })
  @ApiQuery({
    name: 'latitude',
    description: 'User latitude',
    example: 3.8667,
    required: true,
  })
  @ApiQuery({
    name: 'longitude',
    description: 'User longitude',
    example: 11.5167,
    required: true,
  })
  @ApiQuery({
    name: 'radius',
    description: 'Search radius in kilometers',
    example: 50,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Nearby centers retrieved successfully',
    type: [CenterPublicResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - missing latitude or longitude',
  })
  async getNearbyCenters(
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('radius') radius?: number,
  ): Promise<CenterPublicResponseDto[]> {
    const centers = await this.centersService.findNearbyCenters(
      Number(latitude),
      Number(longitude),
      radius ? Number(radius) : 50,
    );

    // Map to response DTO
    return centers.map((center) => ({
      id: center.id,
      nameFr: center.nameFr,
      nameEn: center.nameEn,
      address: center.address,
      city: center.city,
      country: center.country,
      latitude: center.latitude,
      longitude: center.longitude,
      phoneNumber: center.phoneNumber,
      email: center.email,
      descriptionFr: center.descriptionFr,
      descriptionEn: center.descriptionEn,
      schedules: center.schedules,
      coverImage: center.coverImage,
      createdAt: center.createdAt,
    }));
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get active center by ID (Public)',
    description:
      'Retrieve details of a specific active center by its ID. No authentication required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Center ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Center retrieved successfully',
    type: CenterPublicResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Active center not found',
  })
  async getPublicCenterById(
    @Param('id') id: string,
  ): Promise<CenterPublicResponseDto> {
    const center = await this.centersService.findPublicCenterById(id);

    // Map to response DTO
    return {
      id: center.id,
      nameFr: center.nameFr,
      nameEn: center.nameEn,
      address: center.address,
      city: center.city,
      country: center.country,
      latitude: center.latitude,
      longitude: center.longitude,
      phoneNumber: center.phoneNumber,
      email: center.email,
      descriptionFr: center.descriptionFr,
      descriptionEn: center.descriptionEn,
      schedules: center.schedules,
      coverImage: center.coverImage,
      createdAt: center.createdAt,
    };
  }
}
