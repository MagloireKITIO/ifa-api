import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthAdminService } from './auth-admin.service';
import { LoginAdminDto, RefreshTokenDto, AuthResponseDto } from './dto';
import { JwtAdminAuthGuard, JwtAdminRefreshGuard } from './guards';
import { CurrentAdmin } from './decorators';
import { Admin } from '../entities/admin.entity';

@ApiTags('Auth Admin')
@Controller('auth/admin')
export class AuthAdminController {
  constructor(private readonly authAdminService: AuthAdminService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin login',
    description: 'Authenticate admin with email and password',
  })
  @ApiBody({ type: LoginAdminDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or inactive account',
  })
  async login(
    @Body() loginAdminDto: LoginAdminDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    return this.authAdminService.login(loginAdminDto, ipAddress, userAgent);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAdminRefreshGuard)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Generate new access and refresh tokens using refresh token',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  async refresh(
    @CurrentAdmin() admin: Admin,
  ): Promise<Omit<AuthResponseDto, 'admin'>> {
    return this.authAdminService.refresh(admin);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin logout',
    description: 'Logout admin and log the activity',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async logout(
    @CurrentAdmin() admin: Admin,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    return this.authAdminService.logout(admin, ipAddress, userAgent);
  }

  @Get('me')
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current admin profile',
    description: 'Retrieve the profile of the currently authenticated admin',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin profile retrieved successfully',
    type: Admin,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getMe(@CurrentAdmin() admin: Admin): Promise<Admin> {
    return this.authAdminService.getMe(admin);
  }
}
