import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthUserService } from './auth-user.service';
import {
  GoogleAuthDto,
  PhoneSendOtpDto,
  PhoneVerifyOtpDto,
  CompleteProfileDto,
  RefreshTokenDto,
  AuthUserResponseDto,
} from './dto';
import { JwtUserAuthGuard, JwtUserRefreshGuard } from './guards';
import { CurrentUser } from './decorators';
import { User } from '../entities/user.entity';

@ApiTags('Auth User')
@Controller('auth/user')
export class AuthUserController {
  constructor(private readonly authUserService: AuthUserService) {}

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Google OAuth authentication',
    description:
      'Authenticate user with Google ID token from Supabase/Firebase',
  })
  @ApiBody({ type: GoogleAuthDto })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful',
    type: AuthUserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid Google token',
  })
  async googleAuth(
    @Body() googleAuthDto: GoogleAuthDto,
  ): Promise<AuthUserResponseDto> {
    return this.authUserService.googleAuth(googleAuthDto);
  }

  @Post('phone/send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send OTP to phone number',
    description: 'Send a 6-digit OTP code to the provided phone number via SMS',
  })
  @ApiBody({ type: PhoneSendOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid phone number or failed to send OTP',
  })
  async sendPhoneOtp(
    @Body() phoneSendOtpDto: PhoneSendOtpDto,
  ): Promise<{ message: string }> {
    return this.authUserService.sendPhoneOtp(phoneSendOtpDto);
  }

  @Post('phone/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP and authenticate',
    description:
      'Verify the OTP code and authenticate the user (create account if new user)',
  })
  @ApiBody({ type: PhoneVerifyOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP verified and user authenticated',
    type: AuthUserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired OTP',
  })
  async verifyPhoneOtp(
    @Body() phoneVerifyOtpDto: PhoneVerifyOtpDto,
  ): Promise<AuthUserResponseDto> {
    return this.authUserService.verifyPhoneOtp(phoneVerifyOtpDto);
  }

  @Post('complete-profile')
  @UseGuards(JwtUserAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete user profile',
    description:
      'Complete user profile after first login (name, location, center, language, etc.)',
  })
  @ApiBody({ type: CompleteProfileDto })
  @ApiResponse({
    status: 200,
    description: 'Profile completed successfully',
    type: User,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async completeProfile(
    @CurrentUser() user: User,
    @Body() completeProfileDto: CompleteProfileDto,
  ): Promise<User> {
    return this.authUserService.completeProfile(user.id, completeProfileDto);
  }

  @Post('refresh')
  @UseGuards(JwtUserRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Generate new access and refresh tokens using the refresh token',
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
    @CurrentUser() user: User,
  ): Promise<Omit<AuthUserResponseDto, 'user' | 'needsProfileCompletion'>> {
    return this.authUserService.refresh(user);
  }

  @Post('logout')
  @UseGuards(JwtUserAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout user',
    description:
      'Logout user and optionally remove FCM token for push notifications',
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
    @CurrentUser() user: User,
    @Query('fcmToken') fcmToken?: string,
  ): Promise<{ message: string }> {
    return this.authUserService.logout(user.id, fcmToken);
  }

  @Get('me')
  @UseGuards(JwtUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Retrieve the profile of the currently authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: User,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getMe(@CurrentUser() user: User): Promise<User> {
    return this.authUserService.getMe(user.id);
  }
}
