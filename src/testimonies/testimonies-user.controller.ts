import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { TestimoniesService } from './testimonies.service';
import { JwtUserAuthGuard } from '../auth-user/guards';
import { CurrentUser } from '../auth-user/decorators';
import {
  CreateTestimonyDto,
  TestimonyUserResponseDto,
} from './dto';
import { Testimony } from '../entities/testimony.entity';

/**
 * Controller pour les endpoints user des témoignages (mobile app)
 * Toutes les routes sont protégées par JwtUserAuthGuard
 *
 * LOGIQUE :
 * - POST /testimonies : Soumettre un témoignage (créé avec status PENDING)
 * - GET /testimonies/my-testimonies : Voir mes témoignages et leur statut
 * - DELETE /testimonies/:id : Supprimer un témoignage non approuvé
 */
@ApiTags('Testimonies User (Mobile)')
@Controller('user/testimonies')
@UseGuards(JwtUserAuthGuard)
@ApiBearerAuth()
export class TestimoniesUserController {
  constructor(private readonly testimoniesService: TestimoniesService) {}

  /**
   * POST /user/testimonies/upload-audio
   * Uploader un fichier audio pour témoignage (USER AUTH)
   * Style WhatsApp : max 5 min, upload avant de créer le témoignage
   */
  @Post('upload-audio')
  @UseInterceptors(FileInterceptor('audio'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Uploader un audio pour témoignage',
    description: 'Upload un fichier audio (max 10MB, 5 min). Retourne l\'URL à utiliser dans CreateTestimonyDto.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        audio: {
          type: 'string',
          format: 'binary',
        },
        duration: {
          type: 'number',
          description: 'Durée en secondes (max 300)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Audio uploadé avec succès',
    schema: {
      type: 'object',
      properties: {
        audioUrl: { type: 'string', example: 'https://xxx.supabase.co/storage/v1/object/public/ifa-testimonies/testimonies/abc.mp3' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Fichier invalide ou trop long',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async uploadAudio(
    @UploadedFile() file: Express.Multer.File,
    @Body('duration') duration?: string,
  ): Promise<{ audioUrl: string }> {
    if (!file) {
      throw new BadRequestException('No audio file provided');
    }

    const audioDuration = duration ? parseInt(duration, 10) : undefined;

    const audioUrl = await this.testimoniesService.uploadAudio(
      file.buffer,
      file.mimetype,
      audioDuration,
    );

    return { audioUrl };
  }

  /**
   * POST /user/testimonies
   * Soumettre un témoignage (USER AUTH)
   */
  @Post()
  @ApiOperation({
    summary: 'Soumettre un témoignage',
    description: 'Permet à un utilisateur connecté de soumettre un témoignage (texte, audio, ou les deux)',
  })
  @ApiResponse({
    status: 201,
    description: 'Témoignage soumis avec succès',
    type: TestimonyUserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Données invalides',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() createTestimonyDto: CreateTestimonyDto,
  ): Promise<TestimonyUserResponseDto> {
    const testimony = await this.testimoniesService.create(
      userId,
      createTestimonyDto,
    );
    return this.mapToUserResponse(testimony);
  }

  /**
   * GET /testimonies/my-testimonies
   * Récupérer mes témoignages (USER AUTH)
   */
  @Get('my-testimonies')
  @ApiOperation({
    summary: 'Mes témoignages',
    description: 'Récupère tous les témoignages soumis par l\'utilisateur connecté (tous statuts)',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste de mes témoignages',
    type: [TestimonyUserResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  async getMyTestimonies(
    @CurrentUser('sub') userId: string,
  ): Promise<TestimonyUserResponseDto[]> {
    const testimonies = await this.testimoniesService.findMyTestimonies(userId);
    return testimonies.map((testimony) => this.mapToUserResponse(testimony));
  }

  /**
   * DELETE /testimonies/:id
   * Supprimer mon témoignage (USER AUTH)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Supprimer mon témoignage',
    description: 'Permet de supprimer un témoignage non approuvé (PENDING ou REJECTED uniquement)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID du témoignage',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Témoignage supprimé avec succès',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Testimony deleted successfully' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifié',
  })
  @ApiResponse({
    status: 403,
    description: 'Vous ne pouvez supprimer que vos propres témoignages non approuvés',
  })
  @ApiResponse({
    status: 404,
    description: 'Témoignage non trouvé',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ message: string }> {
    await this.testimoniesService.removeByUser(id, userId);
    return { message: 'Testimony deleted successfully' };
  }

  /**
   * Helper: Mapper Testimony entity vers TestimonyUserResponseDto
   */
  private mapToUserResponse(testimony: Testimony): TestimonyUserResponseDto {
    return {
      id: testimony.id,
      content: testimony.content,
      audioUrl: testimony.audioUrl,
      audioDuration: testimony.audioDuration,
      isAnonymous: testimony.isAnonymous,
      language: testimony.language,
      submittedAt: testimony.submittedAt,
      createdAt: testimony.createdAt,
      updatedAt: testimony.updatedAt,
    };
  }
}
