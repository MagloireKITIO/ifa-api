import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationTemplatesService } from './notification-templates.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  QueryTemplatesDto,
  RenderTemplateDto,
} from './dto';
import { JwtAdminAuthGuard, PermissionsGuard } from '../auth-admin/guards';
import { RequirePermissions, CurrentAdmin } from '../auth-admin/decorators';
import { AdminPermission } from '../common/enums';
import { Admin } from '../entities/admin.entity';

@ApiTags('Notification Templates')
@ApiBearerAuth()
@Controller('notification-templates')
@UseGuards(JwtAdminAuthGuard, PermissionsGuard)
export class NotificationTemplatesController {
  constructor(
    private readonly templatesService: NotificationTemplatesService,
  ) {}

  @Get()
  @RequirePermissions(AdminPermission.NOTIFICATIONS_READ)
  @ApiOperation({
    summary: 'Get all notification templates',
    description:
      'Retrieve all notification templates with optional filters.',
  })
  @ApiResponse({
    status: 200,
    description: 'Templates retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async findAll(@Query() queryDto: QueryTemplatesDto) {
    return this.templatesService.findAll(queryDto);
  }

  @Get('triggers')
  @RequirePermissions(AdminPermission.NOTIFICATIONS_READ)
  @ApiOperation({
    summary: 'Get all available notification triggers',
    description:
      'Get a list of all available notification triggers with their labels, descriptions, and example variables in both French and English.',
  })
  @ApiResponse({
    status: 200,
    description: 'Triggers retrieved successfully',
  })
  async getAvailableTriggers() {
    return this.templatesService.getAvailableTriggers();
  }

  @Get('variables/:category')
  @RequirePermissions(AdminPermission.NOTIFICATIONS_READ)
  @ApiOperation({
    summary: 'Get available variables for a category',
    description:
      'Get a list of all available variables that can be used in templates for a specific category.',
  })
  @ApiParam({
    name: 'category',
    description: 'Template category (donation, event, prayer, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Variables retrieved successfully',
  })
  async getAvailableVariables(@Param('category') category: string) {
    return this.templatesService.getAvailableVariables(category);
  }

  @Get(':id')
  @RequirePermissions(AdminPermission.NOTIFICATIONS_READ)
  @ApiOperation({
    summary: 'Get template by ID',
    description: 'Retrieve a specific template by its ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Template ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Template retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Get(':id/preview')
  @RequirePermissions(AdminPermission.NOTIFICATIONS_READ)
  @ApiOperation({
    summary: 'Preview template with example values',
    description:
      'Preview how the template will look with example values in both languages.',
  })
  @ApiParam({
    name: 'id',
    description: 'Template ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Preview generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async preview(@Param('id') id: string, @Query('language') language?: 'fr' | 'en') {
    const previewFr = await this.templatesService.preview(id, 'fr');
    const previewEn = await this.templatesService.preview(id, 'en');

    return {
      fr: previewFr,
      en: previewEn,
    };
  }

  @Post()
  @RequirePermissions(AdminPermission.NOTIFICATIONS_CREATE)
  @ApiOperation({
    summary: 'Create a new notification template',
    description:
      'Create a new notification template. Only accessible by admins with notifications:create permission.',
  })
  @ApiResponse({
    status: 201,
    description: 'Template created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async create(
    @Body() createTemplateDto: CreateTemplateDto,
    @CurrentAdmin() admin: Admin,
  ) {
    return this.templatesService.create(createTemplateDto, admin.id);
  }

  @Post('render')
  @RequirePermissions(AdminPermission.NOTIFICATIONS_READ)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Render a template with variables',
    description:
      'Test rendering a template with specific variables to see the final output.',
  })
  @ApiResponse({
    status: 200,
    description: 'Template rendered successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async render(@Body() renderDto: RenderTemplateDto) {
    return this.templatesService.renderTemplate(
      renderDto.trigger,
      renderDto.variables,
      renderDto.language,
    );
  }

  @Patch(':id')
  @RequirePermissions(AdminPermission.NOTIFICATIONS_UPDATE)
  @ApiOperation({
    summary: 'Update a notification template',
    description:
      'Update an existing notification template. System templates can be edited but not deleted.',
  })
  @ApiParam({
    name: 'id',
    description: 'Template ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async update(
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
    @CurrentAdmin() admin: Admin,
  ) {
    return this.templatesService.update(id, updateTemplateDto, admin.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(AdminPermission.NOTIFICATIONS_DELETE)
  @ApiOperation({
    summary: 'Delete a notification template',
    description:
      'Delete a notification template. System templates cannot be deleted.',
  })
  @ApiParam({
    name: 'id',
    description: 'Template ID',
  })
  @ApiResponse({
    status: 204,
    description: 'Template deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - cannot delete system templates',
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async delete(@Param('id') id: string) {
    await this.templatesService.delete(id);
  }
}
